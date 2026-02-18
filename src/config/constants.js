/**
 * 系統全域設定與常數
 */

// 管理員 Email 清單
export const SUPER_ADMIN = 'ipad@mail2.smes.tyc.edu.tw';

// 管理員 Email 清單 (已廢棄，改用動態管理)
export const ADMIN_EMAILS = [
    SUPER_ADMIN
];

// 檢查是否為管理員
export const checkIsAdmin = (email) => {
    return ADMIN_EMAILS.includes(email);
};

// Line Notify 預設 Proxy
export const DEFAULT_GAS_PROXY = 'https://us-central1-smes-e1dc3.cloudfunctions.net/sendLineNotification';

// 報修單提交冷卻時間 (毫秒)
export const SUBMIT_COOLDOWN_MS = 30000;
