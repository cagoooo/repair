/**
 * 系統全域設定與常數
 */

// 管理員 Email 清單
export const ADMIN_EMAILS = [
    'ipad@mail2.smes.tyc.edu.tw',
    // 可以在此新增其他管理員 Email
];

// 檢查是否為管理員
export const checkIsAdmin = (email) => {
    return ADMIN_EMAILS.includes(email);
};

// Line Notify 預設 Proxy
export const DEFAULT_GAS_PROXY = 'https://us-central1-smes-e1dc3.cloudfunctions.net/sendLineNotification';

// 報修單提交冷卻時間 (毫秒)
export const SUBMIT_COOLDOWN_MS = 30000;
