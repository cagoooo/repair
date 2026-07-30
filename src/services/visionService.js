import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebase';

/**
 * 使用 Google Vision API 辨識圖片中的文字，並轉換為教室區塊
 * @param {string} base64Image - 圖片的 Base64 字串 (不含 Data URL header)
 * @returns {Promise<Array>} - 辨識出的教室列表
 */
export const detectRoomsFromImage = async (base64Image) => {
    if (!functions) throw new Error('Firebase Functions 尚未初始化');

    try {
        const detectMapRooms = httpsCallable(functions, 'repair_detectMapRooms');
        const response = await detectMapRooms({ base64Image });
        return parseVisionAnnotations(response.data?.textAnnotations || []);
    } catch (error) {
        console.error('Vision API Error:', error);
        throw new Error(error.message || 'AI 辨識服務暫時無法使用');
    }
};

export const parseVisionAnnotations = (annotations = []) => {
        if (annotations.length === 0) return [];

        // 第一個 annotation 是完整文字，後續是個別單字/區塊
        const blocks = annotations.slice(1).map((ann) => {
            const text = ann.description.trim();
            const vertices = ann.boundingPoly.vertices;
            const x = Math.min(...vertices.map(v => v.x || 0));
            const y = Math.min(...vertices.map(v => v.y || 0));
            const xMax = Math.max(...vertices.map(v => v.x || 0));
            const yMax = Math.max(...vertices.map(v => v.y || 0));

            return {
                text,
                confidence: Number.isFinite(ann.confidence) ? Number(ann.confidence) : null,
                pixelBounds: { x, y, width: xMax - x, height: yMax - y },
                used: false
            };
        });

        // --- 預處理：垂直編號整合 (Vertical Code Repair) ---
        // 處理如上方 W, 下方 301 分開辨識的情況
        const letterRegex = /^[A-Z]$/;
        const numberRegex = /^\d{2,3}$/;

        for (let i = 0; i < blocks.length; i++) {
            const b1 = blocks[i];
            if (b1.used || !letterRegex.test(b1.text)) continue;

            const b2 = blocks.find(b => {
                if (b.used || !numberRegex.test(b.text)) return false;

                // 檢查是否在下方：
                // 1. x 座標接近
                // 2. y 座標在下方不遠處
                const dx = Math.abs(b.pixelBounds.x - b1.pixelBounds.x);
                const dy = b.pixelBounds.y - (b1.pixelBounds.y + b1.pixelBounds.height);

                // 門檻：橫向位移放寬到字母寬度的 1.5 倍，縱向距離大幅放寬到 4.5 倍 (強力找回 W301)
                return dx < b1.pixelBounds.width * 1.5 && dy > -5 && dy < b1.pixelBounds.height * 4.5;
            });

            if (b2) {
                b1.text = b1.text + b2.text;
                const newX = Math.min(b1.pixelBounds.x, b2.pixelBounds.x);
                const newY = Math.min(b1.pixelBounds.y, b2.pixelBounds.y);
                const newXMax = Math.max(b1.pixelBounds.x + b1.pixelBounds.width, b2.pixelBounds.x + b2.pixelBounds.width);
                const newYMax = Math.max(b1.pixelBounds.y + b1.pixelBounds.height, b2.pixelBounds.y + b2.pixelBounds.height);

                b1.pixelBounds = {
                    x: newX,
                    y: newY,
                    width: newXMax - newX,
                    height: newYMax - newY
                };
                b2.used = true; // 標記數字區塊已合併
            }
        }

        // 智能聚合演算法
        const roomRegex = /^[A-Z]\d{2,3}$/; // 匹配 C101 或 W10 等
        const anchors = blocks.filter(b => !b.used && roomRegex.test(b.text));
        const others = blocks.filter(b => !b.used && !roomRegex.test(b.text));

        // --- 教室欄位推算 (Cell Estimation) ---
        // 舊版用「文字開頭不能離代碼開頭超過半個代碼寬」來避免跨房間誤併（如「檔案室六年」），
        // 但這條同時擋掉了同一行右側的班號（「一年」「1」「班」只拿到「一年」），
        // 也讓第二行以下的名稱抓不到（「視聽器材室」只拿到「視聽器」）。
        // 改為由同一橫列相鄰編號的間距推算每個編號所屬的欄位左右界，邊界落在兩個編號的中線，
        // 既能吃到整個名稱，又能靠中線把隔壁教室的名稱擋在外面。
        const centerY = block => block.pixelBounds.y + block.pixelBounds.height / 2;
        const anchorCells = new Map();
        anchors.forEach(anchor => {
            const { x, width, height } = anchor.pixelBounds;
            const sameRow = anchors.filter(other =>
                other !== anchor && Math.abs(centerY(other) - centerY(anchor)) <= height);
            const leftGaps = sameRow
                .filter(other => other.pixelBounds.x < x)
                .map(other => x - other.pixelBounds.x);
            const rightGaps = sameRow
                .filter(other => other.pixelBounds.x > x)
                .map(other => other.pixelBounds.x - x);

            anchorCells.set(anchor, {
                left: x - (leftGaps.length ? Math.min(...leftGaps) / 2 : width * 1.5),
                right: x + (rightGaps.length ? Math.min(...rightGaps) / 2 : width * 1.5)
            });
        });

        // --- 名稱指派 ---
        // 每個文字塊只歸屬於「同一欄、位於正下方且垂直距離最近」的編號。
        // 名稱一律排在編號下方（含同一視覺行但基線略低的班號），所以不接受位於編號上方的文字。
        // 依閱讀順序處理，讓同一行的後續片段可以延續前一片段的歸屬。
        const neighborsByAnchor = new Map(anchors.map(anchor => [anchor, []]));
        const sortedOthers = [...others].sort((a, b) =>
            a.pixelBounds.y - b.pixelBounds.y || a.pixelBounds.x - b.pixelBounds.x);

        sortedOthers.forEach(block => {
            const blockLeft = block.pixelBounds.x;
            let best = null;
            let bestDy = Infinity;

            anchors.forEach(anchor => {
                const cell = anchorCells.get(anchor);
                // 以「文字左緣」判斷歸屬。中文名稱常被切成多塊（「一年」+「1」+「班」、
                // 「課照班」+「6B」），尾段的中心點可能越過欄位中線，但左緣仍在本欄內。
                if (blockLeft < cell.left || blockLeft >= cell.right) return;

                const anchorHeight = anchor.pixelBounds.height;
                const dy = block.pixelBounds.y - anchor.pixelBounds.y;

                // 名稱一律排在編號下方。下限排除與編號同一行的無關文字
                // （例如夾在兩間教室之間、沒有編號的「川堂」）；
                // 上限約三行，足以涵蓋兩行以上的名稱，又不會把下一個區塊的文字
                // （例如「交材室」）吸進來。
                const isBelow = dy >= anchorHeight * 0.8 && dy <= anchorHeight * 3.2;

                // 例外：OCR 也可能把名稱切在與編號同一行的右側（如「C112 二年甲班」），
                // 此時只接受緊鄰右側的文字，避免吃到隔壁教室。
                const gapFromAnchor = blockLeft - (anchor.pixelBounds.x + anchor.pixelBounds.width);
                const isInlineRight = Math.abs(dy) < anchorHeight * 0.8 &&
                    gapFromAnchor > -anchorHeight && gapFromAnchor < anchorHeight * 1.5;

                if (!isBelow && !isInlineRight) return;

                if (dy < bestDy) {
                    best = anchor;
                    bestDy = dy;
                }
            });

            if (best) {
                block.used = true;
                neighborsByAnchor.get(best).push(block);
            }
        });

        const finalRooms = [];

        anchors.forEach(anchor => {
            anchor.used = true;

            const neighbors = neighborsByAnchor.get(anchor) || [];

            // 合併鄰近文字
            let combinedName = anchor.text;
            let finalBounds = { ...anchor.pixelBounds };

            if (neighbors.length > 0) {
                neighbors.sort((a, b) => a.pixelBounds.y - b.pixelBounds.y || a.pixelBounds.x - b.pixelBounds.x);
                let extraName = neighbors.map(n => {
                    n.used = true;
                    return n.text;
                }).join('').trim();

                // 去重：如果 extraName 本身就包含 code，或是 code 是其首碼，則清理重複
                if (extraName.startsWith(anchor.text)) {
                    combinedName = extraName;
                } else if (extraName.includes(anchor.text)) {
                    combinedName = extraName;
                } else {
                    combinedName = `${anchor.text} ${extraName}`;
                }

                // 擴展 Bounds
                const allX = [anchor.pixelBounds.x, ...neighbors.map(n => n.pixelBounds.x)];
                const allY = [anchor.pixelBounds.y, ...neighbors.map(n => n.pixelBounds.y)];
                const allXMax = [anchor.pixelBounds.x + anchor.pixelBounds.width, ...neighbors.map(n => n.pixelBounds.x + n.pixelBounds.width)];
                const allYMax = [anchor.pixelBounds.y + anchor.pixelBounds.height, ...neighbors.map(n => n.pixelBounds.y + n.pixelBounds.height)];

                finalBounds = {
                    x: Math.min(...allX),
                    y: Math.min(...allY),
                    width: Math.max(...allXMax) - Math.min(...allX),
                    height: Math.max(...allYMax) - Math.min(...allY)
                };
            }

            // 智能分類
            let category = 'classroom';
            const textLower = combinedName.toLowerCase();
            // W 系列為廁所、S 系列為樓梯間，皆屬公共設施而非教室
            if (/^[WS]/.test(anchor.text) || textLower.includes('廁') || textLower.includes('衛') || textLower.includes('樓梯')) category = 'utility';
            else if (textLower.includes('辦公') || textLower.includes('處') || textLower.includes('室')) category = 'office';
            else if (textLower.includes('圖書') || textLower.includes('音') || textLower.includes('藝') || textLower.includes('禮堂') || textLower.includes('器材')) category = 'special';

            finalRooms.push({
                id: `vision_${Date.now()}_${finalRooms.length}`,
                code: anchor.text,
                name: combinedName,
                category,
                confidence: Math.min(
                    ...[anchor, ...neighbors]
                        .map(item => item.confidence)
                        .filter(Number.isFinite),
                    1
                ),
                pixelBounds: finalBounds
            });
        });

        // --- 後處理：重疊區塊合併 (Overlap Merging / NMS) ---
        // 解決同一個地方辨識出多個重疊格子的問題 (例如鬼影區塊)
        const calculateIoU = (r1, r2) => {
            const x1 = Math.max(r1.pixelBounds.x, r2.pixelBounds.x);
            const y1 = Math.max(r1.pixelBounds.y, r2.pixelBounds.y);
            const x2 = Math.min(r1.pixelBounds.x + r1.pixelBounds.width, r2.pixelBounds.x + r2.pixelBounds.width);
            const y2 = Math.min(r1.pixelBounds.y + r1.pixelBounds.height, r2.pixelBounds.y + r2.pixelBounds.height);

            if (x2 <= x1 || y2 <= y1) return 0;
            const intersection = (x2 - x1) * (y2 - y1);
            const area1 = r1.pixelBounds.width * r1.pixelBounds.height;
            const area2 = r2.pixelBounds.width * r2.pixelBounds.height;
            return intersection / Math.min(area1, area2);
        };

        const mergedRooms = [];
        const sortedRoomsByArea = [...finalRooms].sort((a, b) =>
            (b.pixelBounds.width * b.pixelBounds.height) - (a.pixelBounds.width * a.pixelBounds.height)
        );

        for (const room of sortedRoomsByArea) {
            let absorbed = false;
            for (const existing of mergedRooms) {
                // 如果重疊率高於 40%，視為同一個房間 (消除鬼影)
                if (calculateIoU(room, existing) > 0.4) {
                    if (!existing.name && room.name) existing.name = room.name;
                    absorbed = true;
                    break;
                }
            }
            if (!absorbed) mergedRooms.push(room);
        }

        return mergedRooms;
};

/**
 * 將像素座標轉換為百分比座標
 * @param {Array} rooms - 含有 pixelBounds 的教室列表
 * @param {number} imgWidth - 圖片原始寬度
 * @param {number} imgHeight - 圖片原始高度
 * @returns {Array} - 轉換後的教室列表
 */
export const convertPixelToPercent = (rooms, imgWidth, imgHeight) => {
    return rooms.map(room => {
        const { pixelBounds, ...rest } = room;
        return {
            ...rest,
            bounds: {
                x: (pixelBounds.x / imgWidth) * 100,
                y: (pixelBounds.y / imgHeight) * 100,
                width: (pixelBounds.width / imgWidth) * 100,
                height: (pixelBounds.height / imgHeight) * 100
            }
        };
    });
};
