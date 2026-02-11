// 石門國小教室配置圖預設模板
// 這是根據 114 學年度石門國小教室平面圖預先分析的座標
// 最後更新：2026-02-10 (校正版 V2)

export const SHIMEN_ELEMENTARY_TEMPLATE = {
    name: '114學年度石門國小教室平面圖',
    version: '114/08/01 (v3)',
    rooms: [
        // ==========================================
        // 上方橫排建築 (Top Block)
        // ==========================================
        // Grid System: X Start=4. Unit=4.5. Gap=0.2.

        // --- 三樓 (Row 1) Y=10 ---
        // --- 三樓 (Row 1) Y=10 ---
        { id: 'W301', code: 'W301', name: '廁所', bounds: { x: 4, y: 10, width: 3, height: 4 }, category: 'utility' },

        { id: 'C301', code: 'C301', name: '圖書館', bounds: { x: 7.2, y: 10, width: 9.2, height: 4 }, category: 'special' }, // 涵蓋 C201+C202
        { id: 'C303', code: 'C303', name: '一般教室', bounds: { x: 16.6, y: 10, width: 4.5, height: 4 }, category: 'classroom' }, // C203 上方
        { id: 'C304', code: 'C304', name: '一般教室', bounds: { x: 21.3, y: 10, width: 4.5, height: 4 }, category: 'classroom' }, // C204 上方

        { id: 'C302', code: 'C302', name: '圖書館', bounds: { x: 26, y: 10, width: 4.5, height: 4 }, category: 'special' }, // C205 上方
        { id: 'C305', code: 'C305', name: '圖書館(閱讀)', bounds: { x: 30.7, y: 10, width: 4.5, height: 4 }, category: 'special' }, // C206 上方

        { id: 'C303_S', code: 'C303', name: '視聽器材', bounds: { x: 35.4, y: 10, width: 4.5, height: 4 }, category: 'special' }, // C207 上方
        { id: 'C304_S', code: 'C304', name: '智慧教室', bounds: { x: 40.1, y: 10, width: 4.5, height: 4 }, category: 'special' }, // C208 上方
        { id: 'C305_S', code: 'C305', name: '音樂一', bounds: { x: 44.8, y: 10, width: 4.5, height: 4 }, category: 'special' }, // C209 上方

        { id: 'C306', code: 'C306', name: '桌球室', bounds: { x: 49.5, y: 10, width: 9.2, height: 4 }, category: 'special' }, // C210 上方 (大格)

        { id: 'W302', code: 'W302', name: '廁所', bounds: { x: 58.9, y: 10, width: 3, height: 4 }, category: 'utility' },

        // --- 二樓 (Row 2) Y=14.2 ---
        { id: 'C201', code: 'C201', name: '律動教室', bounds: { x: 7.2, y: 14.2, width: 4.5, height: 4 }, category: 'special' },
        { id: 'C202', code: 'C202', name: '人事會計', bounds: { x: 11.9, y: 14.2, width: 4.5, height: 4 }, category: 'office' },
        { id: 'C203', code: 'C203', name: '輔導室', bounds: { x: 16.6, y: 14.2, width: 4.5, height: 4 }, category: 'office' },
        { id: 'C204', code: 'C204', name: '總務處', bounds: { x: 21.3, y: 14.2, width: 4.5, height: 4 }, category: 'office' },
        { id: 'C205', code: 'C205', name: '校長室', bounds: { x: 26, y: 14.2, width: 4.5, height: 4 }, category: 'office' },
        { id: 'C206', code: 'C206', name: '學務處', bounds: { x: 30.7, y: 14.2, width: 4.5, height: 4 }, category: 'office' },
        { id: 'C207', code: 'C207', name: '電視台', bounds: { x: 35.4, y: 14.2, width: 4.5, height: 4 }, category: 'special' },
        { id: 'C208', code: 'C208', name: '教務處', bounds: { x: 40.1, y: 14.2, width: 4.5, height: 4 }, category: 'office' },
        { id: 'C209', code: 'C209', name: '資料室', bounds: { x: 44.8, y: 14.2, width: 4.5, height: 4 }, category: 'office' },

        // C210 大辦公室 (涵蓋 2 格)
        { id: 'C210', code: 'C210', name: '大辦公室', bounds: { x: 49.5, y: 14.2, width: 9.2, height: 4 }, category: 'office' },

        { id: 'W202_2', code: 'W202', name: '廁所', bounds: { x: 58.9, y: 14.2, width: 3, height: 4 }, category: 'utility' },

        // --- 一樓 (Row 3) Y=18.4 ---
        { id: 'W101', code: 'W101', name: '廁所', bounds: { x: 4, y: 18.4, width: 3, height: 4 }, category: 'utility' },
        { id: 'C101', code: 'C101', name: '體育室', bounds: { x: 7.2, y: 18.4, width: 4.5, height: 4 }, category: 'office' },
        { id: 'C102', code: 'C102', name: '一年1班', bounds: { x: 11.9, y: 18.4, width: 4.5, height: 4 }, category: 'classroom' },
        { id: 'C103', code: 'C103', name: '一年2班', bounds: { x: 16.6, y: 18.4, width: 4.5, height: 4 }, category: 'classroom' },
        { id: 'C104', code: 'C104', name: '一年3班', bounds: { x: 21.3, y: 18.4, width: 4.5, height: 4 }, category: 'classroom' },
        { id: 'C105', code: 'C105', name: '一年4班', bounds: { x: 26, y: 18.4, width: 4.5, height: 4 }, category: 'classroom' },
        { id: 'C106', code: 'C106', name: '一年5班', bounds: { x: 30.7, y: 18.4, width: 4.5, height: 4 }, category: 'classroom' },
        { id: 'C107', code: 'C107', name: '川堂', bounds: { x: 35.4, y: 18.4, width: 4.5, height: 4 }, category: 'utility' },
        { id: 'C108', code: 'C108', name: '一年1A', bounds: { x: 40.1, y: 18.4, width: 4.5, height: 4 }, category: 'classroom' }, // 圖片顯示 C108
        { id: 'C109', code: 'C109', name: '二年2班', bounds: { x: 44.8, y: 18.4, width: 4.5, height: 4 }, category: 'classroom' },

        // C110 國樂室 (涵蓋 2 格)
        { id: 'C110', code: 'C110', name: '國樂室', bounds: { x: 49.5, y: 18.4, width: 9.2, height: 4 }, category: 'special' },

        { id: 'W102', code: 'W102', name: '廁所', bounds: { x: 58.9, y: 18.4, width: 3, height: 4 }, category: 'utility' },

        // ==========================================
        //  右側垂直建築 (Right Vertical Block)
        // ==========================================
        // X Start =~ 63 (Moved right due to wider top block), Y Start =~ 25

        { id: 'C111', code: 'C111', name: '二年3班', bounds: { x: 63, y: 25, width: 5, height: 3.5 }, category: 'classroom' },
        { id: 'C211', code: 'C211', name: '檔案室', bounds: { x: 68.2, y: 25, width: 5, height: 3.5 }, category: 'office' },
        { id: 'C307', code: 'C307', name: '六年1班', bounds: { x: 73.4, y: 25, width: 5, height: 3.5 }, category: 'classroom' },

        { id: 'C112', code: 'C112', name: '二年4班', bounds: { x: 63, y: 28.7, width: 5, height: 3.5 }, category: 'classroom' },
        { id: 'C212', code: 'C212', name: '電腦教室', bounds: { x: 68.2, y: 28.7, width: 5, height: 3.5 }, category: 'special' },
        { id: 'C308', code: 'C308', name: '六年2班', bounds: { x: 73.4, y: 28.7, width: 5, height: 3.5 }, category: 'classroom' },

        { id: 'C113', code: 'C113', name: '二年5班', bounds: { x: 63, y: 32.4, width: 5, height: 3.5 }, category: 'classroom' },
        { id: 'C213', code: 'C213', name: '電腦教室', bounds: { x: 68.2, y: 32.4, width: 5, height: 3.5 }, category: 'special' },
        { id: 'C309', code: 'C309', name: '六年3班', bounds: { x: 73.4, y: 32.4, width: 5, height: 3.5 }, category: 'classroom' },

        { id: 'C114', code: 'C114', name: '課照班1B', bounds: { x: 63, y: 36.1, width: 5, height: 3.5 }, category: 'classroom' },
        { id: 'C214', code: 'C214', name: '校史室', bounds: { x: 68.2, y: 36.1, width: 5, height: 3.5 }, category: 'special' },
        { id: 'C310', code: 'C310', name: '六年4班', bounds: { x: 73.4, y: 36.1, width: 5, height: 3.5 }, category: 'classroom' },

        { id: 'C115', code: 'C115', name: '教室', bounds: { x: 63, y: 39.8, width: 5, height: 3.5 }, category: 'classroom' },
        { id: 'C215', code: 'C215', name: '教室', bounds: { x: 68.2, y: 39.8, width: 5, height: 3.5 }, category: 'classroom' },
        { id: 'C311', code: 'C311', name: '教室', bounds: { x: 73.4, y: 39.8, width: 5, height: 3.5 }, category: 'classroom' },

        // 學習中心區 (下方)
        { id: 'C116', code: 'C116', name: '學習中心', bounds: { x: 63, y: 45, width: 5, height: 3.5 }, category: 'special' },
        { id: 'C216', code: 'C216', name: '研習中心', bounds: { x: 68.2, y: 45, width: 5, height: 3.5 }, category: 'special' },
        { id: 'C312', code: 'C312', name: '自然一', bounds: { x: 73.4, y: 45, width: 5, height: 3.5 }, category: 'special' },

        { id: 'C117', code: 'C117', name: '知動教室', bounds: { x: 63, y: 48.7, width: 5, height: 3.5 }, category: 'special' },
        { id: 'C217', code: 'C217', name: '桌實驗', bounds: { x: 68.2, y: 48.7, width: 5, height: 3.5 }, category: 'special' },
        { id: 'C313', code: 'C313', name: '六年5班', bounds: { x: 73.4, y: 48.7, width: 5, height: 3.5 }, category: 'classroom' },

        { id: 'C118', code: 'C118', name: '學習中心', bounds: { x: 63, y: 52.4, width: 5, height: 3.5 }, category: 'special' },
        { id: 'C218', code: 'C218', name: '保健教室', bounds: { x: 68.2, y: 52.4, width: 5, height: 3.5 }, category: 'special' },
        { id: 'C314', code: 'C314', name: '六年6班', bounds: { x: 73.4, y: 52.4, width: 5, height: 3.5 }, category: 'classroom' },

        // ==========================================
        //  左側垂直建築 (Left Vertical Block)
        // ==========================================
        // X Start =~ 14, Y Start =~ 58

        { id: 'W105', code: 'W105', name: '廁所', bounds: { x: 14, y: 58, width: 3, height: 3 }, category: 'utility' },
        { id: 'W205', code: 'W205', name: '廁所', bounds: { x: 18, y: 58, width: 3, height: 3 }, category: 'utility' },

        { id: 'C134', code: 'C134', name: '保健室', bounds: { x: 14, y: 61.2, width: 4.5, height: 3.5 }, category: 'office' },
        { id: 'C234', code: 'C234', name: '課照班2A', bounds: { x: 19, y: 61.2, width: 4.5, height: 3.5 }, category: 'classroom' },

        { id: 'C133', code: 'C133', name: '四年1班', bounds: { x: 14, y: 64.9, width: 4.5, height: 3.5 }, category: 'classroom' },
        { id: 'C233', code: 'C233', name: '課照班2B', bounds: { x: 19, y: 64.9, width: 4.5, height: 3.5 }, category: 'classroom' },

        { id: 'C132', code: 'C132', name: '四年2班', bounds: { x: 14, y: 68.6, width: 4.5, height: 3.5 }, category: 'classroom' },
        { id: 'C232', code: 'C232', name: '課照班3A', bounds: { x: 19, y: 68.6, width: 4.5, height: 3.5 }, category: 'classroom' },

        { id: 'C131', code: 'C131', name: '書法教室', bounds: { x: 14, y: 72.3, width: 4.5, height: 3.5 }, category: 'special' },
        { id: 'C231', code: 'C231', name: '美勞一', bounds: { x: 19, y: 72.3, width: 4.5, height: 3.5 }, category: 'special' },

        { id: 'C130', code: 'C130', name: '四年3班', bounds: { x: 14, y: 76, width: 4.5, height: 3.5 }, category: 'classroom' },
        { id: 'C230', code: 'C230', name: '美勞二', bounds: { x: 19, y: 76, width: 4.5, height: 3.5 }, category: 'special' },

        { id: 'C129', code: 'C129', name: '四年4班', bounds: { x: 14, y: 79.7, width: 4.5, height: 3.5 }, category: 'classroom' },
        { id: 'C229', code: 'C229', name: '英語一', bounds: { x: 19, y: 79.7, width: 4.5, height: 3.5 }, category: 'special' },

        { id: 'C128', code: 'C128', name: '四年5班', bounds: { x: 14, y: 83.4, width: 4.5, height: 3.5 }, category: 'classroom' },
        { id: 'C228', code: 'C228', name: '英語二', bounds: { x: 19, y: 83.4, width: 4.5, height: 3.5 }, category: 'special' },

        { id: 'C127', code: 'C127', name: '棒球教室', bounds: { x: 14, y: 87.1, width: 4.5, height: 3.5 }, category: 'special' },
        { id: 'C227', code: 'C227', name: '英語三', bounds: { x: 19, y: 87.1, width: 4.5, height: 3.5 }, category: 'special' },

        // ==========================================
        //  中間垂直建築 (Middle Vertical Block)
        // ==========================================
        // X Start =~ 38, Y Start =~ 58

        { id: 'W103', code: 'W103', name: '廁所', bounds: { x: 38, y: 58, width: 3, height: 3 }, category: 'utility' },
        { id: 'W203', code: 'W203', name: '廁所', bounds: { x: 42, y: 58, width: 3, height: 3 }, category: 'utility' },

        { id: 'C219', code: 'C219', name: '教師研習', bounds: { x: 38, y: 61.2, width: 7.5, height: 3.5 }, category: 'office' },

        { id: 'C119', code: 'C119', name: '自然二', bounds: { x: 38, y: 64.9, width: 4.5, height: 3.5 }, category: 'special' },
        { id: 'C220', code: 'C220', name: '五年2班', bounds: { x: 43, y: 64.9, width: 4.5, height: 3.5 }, category: 'classroom' },

        { id: 'C120', code: 'C120', name: '三年1班', bounds: { x: 38, y: 68.6, width: 4.5, height: 3.5 }, category: 'classroom' },
        { id: 'C221', code: 'C221', name: '五年3班', bounds: { x: 43, y: 68.6, width: 4.5, height: 3.5 }, category: 'classroom' },

        { id: 'C121', code: 'C121', name: '三年2班', bounds: { x: 38, y: 72.3, width: 4.5, height: 3.5 }, category: 'classroom' },
        { id: 'C222', code: 'C222', name: '自然二', bounds: { x: 43, y: 72.3, width: 4.5, height: 3.5 }, category: 'special' },

        { id: 'C122', code: 'C122', name: '三年3班', bounds: { x: 38, y: 76, width: 4.5, height: 3.5 }, category: 'classroom' },
        { id: 'C223', code: 'C223', name: '五年4班', bounds: { x: 43, y: 76, width: 4.5, height: 3.5 }, category: 'classroom' },

        { id: 'C123', code: 'C123', name: '三年4班', bounds: { x: 38, y: 79.7, width: 4.5, height: 3.5 }, category: 'classroom' },
        { id: 'C224', code: 'C224', name: '五年5班', bounds: { x: 43, y: 79.7, width: 4.5, height: 3.5 }, category: 'classroom' },

        { id: 'C124', code: 'C124', name: '三年5班', bounds: { x: 38, y: 83.4, width: 4.5, height: 3.5 }, category: 'classroom' },
        { id: 'C225', code: 'C225', name: '五年6班', bounds: { x: 43, y: 83.4, width: 4.5, height: 3.5 }, category: 'classroom' },

        { id: 'C125', code: 'C125', name: '五年1班', bounds: { x: 38, y: 87.1, width: 4.5, height: 3.5 }, category: 'classroom' },
        { id: 'C226', code: 'C226', name: '音樂二', bounds: { x: 43, y: 87.1, width: 4.5, height: 3.5 }, category: 'special' },

        // 其他散落建築
        { id: 'C126', code: 'C126', name: '廚房', bounds: { x: 48, y: 87.1, width: 5, height: 7 }, category: 'utility' },
        { id: 'C135', code: 'C135', name: '禮堂', bounds: { x: 4, y: 30, width: 8, height: 10 }, category: 'special' },
        { id: 'C136', code: 'C136', name: '特色餐', bounds: { x: 41, y: 30, width: 6, height: 5 }, category: 'special' },
        { id: 'SIDE_DOOR', code: '側門', name: '側門', bounds: { x: 75, y: 70, width: 3, height: 5 }, category: 'utility' }
    ]
};

// 根據上傳的圖片自動辨識教室的函式
// 這個版本使用預設模板比對
export function autoDetectRooms(imageUrl) {
    // 在實際應用中，這裡可以使用 AI/OCR API 來辨識
    // 目前返回石門國小的預設模板
    return SHIMEN_ELEMENTARY_TEMPLATE.rooms;
}

// 簡化版的教室模板（只包含主要教室）
export const SHIMEN_ELEMENTARY_SIMPLE = {
    name: '石門國小教室配置圖（簡化版）',
    rooms: SHIMEN_ELEMENTARY_TEMPLATE.rooms.filter(room =>
        room.category === 'classroom' || room.category === 'special' || room.category === 'office'
    )
};

// 石門國小幼兒園教室配置圖預設模板
export const SHIMEN_KINDERGARTEN_TEMPLATE = {
    name: '石門國小幼兒園教室配置圖',
    rooms: [
        // 左側建築 (由上而下)
        { id: 'K_KITCHEN', code: 'K001', name: '廚房', bounds: { x: 12, y: 22, width: 20, height: 7 }, category: 'utility' },
        { id: 'K_DINING', code: 'K002', name: '餐廳', bounds: { x: 12, y: 29, width: 20, height: 11 }, category: 'special' },

        { id: 'K_BUBBLE', code: 'K101', name: '泡泡班', bounds: { x: 12, y: 40, width: 14.5, height: 9 }, category: 'classroom' },
        { id: 'K_OFFICE', code: 'K_OFFICE', name: '辦公室', bounds: { x: 12, y: 49, width: 14.5, height: 11 }, category: 'office' },
        { id: 'K_RAINBOW', code: 'K102', name: '彩虹班', bounds: { x: 12, y: 60, width: 14.5, height: 9 }, category: 'classroom' },
        { id: 'K_TOILET', code: 'K_WC', name: '廁所', bounds: { x: 12, y: 69, width: 14.5, height: 6 }, category: 'utility' },

        { id: 'K_CORRIDOR', code: 'CORR', name: '走廊', bounds: { x: 26.5, y: 40, width: 5.5, height: 35 }, category: 'utility' },

        // 區域
        { id: 'K_PLAY', code: 'PLAY', name: '遊戲區', bounds: { x: 32, y: 20, width: 16, height: 55 }, category: 'special' },

        // 出入口
        { id: 'K_MAIN_DOOR', code: 'MAIN', name: '大門', bounds: { x: 48, y: 45, width: 3, height: 12 }, category: 'utility' },
        { id: 'K_SIDE_DOOR', code: 'SIDE', name: '側門', bounds: { x: 32.5, y: 75, width: 7, height: 5 }, category: 'utility' }
    ]
};

// 取得所有可用模板
export const AVAILABLE_TEMPLATES = [
    SHIMEN_ELEMENTARY_TEMPLATE,
    SHIMEN_KINDERGARTEN_TEMPLATE
];
