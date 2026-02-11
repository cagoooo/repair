/**
 * XSS 防護工具
 * HTML Entity 轉義 + URL 白名單驗證
 */

/**
 * HTML Entity 轉義
 * 將特殊字元轉為 HTML Entity，防止 XSS 注入
 * @param {string} str - 使用者輸入的原始字串
 * @returns {string} 轉義後的安全字串
 */
export const sanitizeText = (str) => {
    if (typeof str !== 'string') return '';
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;');
};

/**
 * 驗證圖片 URL 是否來自合法來源
 * 僅允許 Firebase Storage URL
 * @param {string} url - 圖片的 URL
 * @returns {boolean} 是否為合法 URL
 */
export const isValidImageUrl = (url) => {
    if (!url || typeof url !== 'string') return false;

    // 允許 data URI (base64 圖片，向下兼容)
    if (url.startsWith('data:image/')) return true;

    try {
        const parsed = new URL(url);
        // 白名單：Firebase Storage 域名
        const allowedHosts = [
            'firebasestorage.googleapis.com',
            'storage.googleapis.com'
        ];
        return allowedHosts.some(host => parsed.hostname === host || parsed.hostname.endsWith('.' + host));
    } catch {
        return false;
    }
};

/**
 * 清理物件中的所有字串欄位
 * @param {Object} obj - 原始物件
 * @param {string[]} fields - 需要清理的欄位名稱
 * @returns {Object} 清理後的物件副本
 */
export const sanitizeFields = (obj, fields) => {
    const cleaned = { ...obj };
    for (const field of fields) {
        if (typeof cleaned[field] === 'string') {
            cleaned[field] = sanitizeText(cleaned[field]);
        }
    }
    return cleaned;
};
