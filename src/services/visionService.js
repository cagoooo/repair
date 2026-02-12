import axios from 'axios';

const VISION_API_URL = 'https://vision.googleapis.com/v1/images:annotate';
const API_KEY = import.meta.env.VITE_GOOGLE_VISION_API_KEY;

/**
 * 使用 Google Vision API 辨識圖片中的文字，並轉換為教室區塊
 * @param {string} base64Image - 圖片的 Base64 字串 (不含 Data URL header)
 * @returns {Promise<Array>} - 辨識出的教室列表
 */
export const detectRoomsFromImage = async (base64Image) => {
    if (!API_KEY) {
        throw new Error('Google Vision API Key 未設定');
    }

    try {
        const response = await axios.post(`${VISION_API_URL}?key=${API_KEY}`, {
            requests: [
                {
                    image: { content: base64Image },
                    features: [{ type: 'TEXT_DETECTION' }]
                }
            ]
        });

        const annotations = response.data.responses[0]?.textAnnotations;
        if (!annotations || annotations.length === 0) {
            return [];
        }

        // 第一個 annotation 是完整文字，後續是個別單字/區塊
        const blocks = annotations.slice(1).map((ann, index) => {
            const text = ann.description.trim();
            const vertices = ann.boundingPoly.vertices;
            const x = Math.min(...vertices.map(v => v.x || 0));
            const y = Math.min(...vertices.map(v => v.y || 0));
            const xMax = Math.max(...vertices.map(v => v.x || 0));
            const yMax = Math.max(...vertices.map(v => v.y || 0));

            return {
                text,
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

        const finalRooms = [];

        anchors.forEach(anchor => {
            anchor.used = true;

            // 定義搜尋範圍：寬度嚴格限縮，避免跨房間誤併
            const thresholdY = anchor.pixelBounds.height * 1.5;
            const thresholdX = anchor.pixelBounds.width * 1.2;

            // 尋找鄰近文字（主要在下方或正右方）
            const neighbors = others.filter(other => {
                if (other.used) return false;

                // 鐵律：如果文字本身符合房間編號格式，絕對不能被當作別人的「名稱」
                if (roomRegex.test(other.text)) return false;

                const dy = other.pixelBounds.y - (anchor.pixelBounds.y + anchor.pixelBounds.height);
                const dx = Math.abs(other.pixelBounds.x - anchor.pixelBounds.x);

                // 鐵律 2：限定水平對齊誤差，文字開頭不能離代碼開頭太遠 (解決「檔案室六年」)
                if (dx > anchor.pixelBounds.width * 0.5) return false;
                const isBelow = dy > -5 && dy < thresholdY && dx < thresholdX;

                const dxRight = other.pixelBounds.x - (anchor.pixelBounds.x + anchor.pixelBounds.width);
                const dyRight = Math.abs(other.pixelBounds.y - anchor.pixelBounds.y);
                const isRight = dxRight > -5 && dxRight < thresholdX && dyRight < anchor.pixelBounds.height;

                return isBelow || isRight;
            });

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
            if (anchor.text.startsWith('W') || textLower.includes('廁') || textLower.includes('衛')) category = 'utility';
            else if (textLower.includes('辦公') || textLower.includes('處') || textLower.includes('室')) category = 'office';
            else if (textLower.includes('圖書') || textLower.includes('音') || textLower.includes('藝') || textLower.includes('禮堂') || textLower.includes('器材')) category = 'special';

            finalRooms.push({
                id: `vision_${Date.now()}_${finalRooms.length}`,
                code: anchor.text,
                name: combinedName,
                category,
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
    } catch (error) {
        console.error('Vision API Error:', error);
        throw error;
    }
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
