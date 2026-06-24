import { useState, useEffect } from 'react';
import './PwaInstallPrompt.css';

// === 自動提示的頻率控制 ===
// 漸進式冷卻：每按一次「關閉」，下次自動跳出的間隔就拉長，避免擾人。
const SNOOZE_KEY = 'pwa_prompt_snooze_until'; // 在這個時間點之前不自動跳
const DISMISS_COUNT_KEY = 'pwa_prompt_dismiss_count'; // 累計關閉次數
const INSTALLED_KEY = 'pwa_prompt_installed'; // 已安裝 → 永久不跳
const DAY = 24 * 60 * 60 * 1000;
// 第 1 次關 → 7 天、第 2 次 → 30 天、第 3 次(含)以上 → 不再自動跳
const COOLDOWN_BY_COUNT = [7 * DAY, 30 * DAY];
const SHOW_DELAY_MS = 6000; // 初次延遲，避免干擾剛進入的操作

// 桌面端：安裝 PWA 需求低、全螢幕提示又最擾人 → 一律不自動跳，只保留 Footer 手動觸發。
// 用 UA 判斷是否為行動裝置（手機 / 平板）。
function isMobileDevice() {
    const ua = (navigator.userAgent || '').toLowerCase();
    if (/iphone|ipad|ipod|android|mobile|phone|tablet|silk|kindle/.test(ua)) return true;
    // iPadOS 13+ 會偽裝成桌面 Mac，補一個觸控判斷
    if (/macintosh/.test(ua) && navigator.maxTouchPoints > 1) return true;
    return false;
}

// 是否允許「自動」跳出提示（手動從 Footer 觸發不受此限制）
function canAutoShow() {
    try {
        if (localStorage.getItem(INSTALLED_KEY)) return false;
        const snoozeUntil = Number(localStorage.getItem(SNOOZE_KEY) || 0);
        if (snoozeUntil === -1) return false; // 永久關閉
        if (snoozeUntil && Date.now() < snoozeUntil) return false;
        return true;
    } catch {
        return true;
    }
}

// 記錄一次關閉，並依累計次數設定下次可再自動跳的時間
function recordDismiss() {
    try {
        const count = Number(localStorage.getItem(DISMISS_COUNT_KEY) || 0) + 1;
        localStorage.setItem(DISMISS_COUNT_KEY, String(count));
        if (count >= COOLDOWN_BY_COUNT.length + 1) {
            localStorage.setItem(SNOOZE_KEY, '-1'); // 第 3 次以後永久不自動跳
        } else {
            localStorage.setItem(SNOOZE_KEY, String(Date.now() + COOLDOWN_BY_COUNT[count - 1]));
        }
    } catch {
        // 忽略 localStorage 失敗（隱私模式等）
    }
}

function PwaInstallPrompt() {
    const [deferredPrompt, setDeferredPrompt] = useState(null);
    const [showPrompt, setShowPrompt] = useState(false);
    const [isIOS, setIsIOS] = useState(false);
    const [isStandalone, setIsStandalone] = useState(false);

    useEffect(() => {
        // 監聽自定義事件以開啟安裝提示 (從 Footer 或其他地方觸發)
        // 手動觸發 → 一律顯示，不受冷卻限制
        const handleOpenPrompt = () => {
            // 如果是 iOS 或有 deferredPrompt，就顯示
            if (isIOS || deferredPrompt) {
                setShowPrompt(true);
            } else {
                // 如果沒有 deferredPrompt (可能是電腦版或已安裝)，顯示一般提示或是教學
                // 這裡簡單顯示提示
                alert('若您的裝置支援，請使用瀏覽器選單中的「安裝應用程式」或「加入主畫面」。');
            }
        };
        window.addEventListener('open-install-prompt', handleOpenPrompt);
        return () => window.removeEventListener('open-install-prompt', handleOpenPrompt);
    }, [isIOS, deferredPrompt]);

    useEffect(() => {
        // 檢查是否已經安裝 (Standalone mode)
        const isStandaloneMode = window.matchMedia('(display-mode: standalone)').matches ||
            window.navigator.standalone ||
            document.referrer.includes('android-app://');

        setIsStandalone(isStandaloneMode);

        // 如果已經安裝，就不顯示自動提示 (但手動觸發仍可開啟)
        if (isStandaloneMode) return;

        // 偵測 iOS
        const userAgent = window.navigator.userAgent.toLowerCase();
        const ios = /iphone|ipad|ipod/.test(userAgent);
        setIsIOS(ios);

        // 攔截 beforeinstallprompt 事件（Android Chrome 與桌面 Chrome/Edge 都會觸發）
        // 一律保留 deferredPrompt 供 Footer 手動安裝按鈕使用；
        // 但「自動跳出」只在行動裝置且通過冷卻檢查時才做，桌面端永不自動跳。
        const handleBeforeInstallPrompt = (e) => {
            e.preventDefault();
            setDeferredPrompt(e);
            if (!isMobileDevice()) return; // 桌面端：不自動跳，只靠 Footer 手動觸發
            setTimeout(() => {
                if (canAutoShow()) setShowPrompt(true);
            }, SHOW_DELAY_MS);
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

        // 安裝成功 → 永久記錄，不再自動跳
        const handleAppInstalled = () => {
            try { localStorage.setItem(INSTALLED_KEY, 'true'); } catch { /* ignore */ }
            setShowPrompt(false);
        };
        window.addEventListener('appinstalled', handleAppInstalled);

        // iOS: 如果是 iOS 且未安裝，也延遲顯示提示（同樣套用冷卻檢查）
        if (ios && !isStandaloneMode) {
            setTimeout(() => {
                if (canAutoShow()) setShowPrompt(true);
            }, SHOW_DELAY_MS);
        }

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
            window.removeEventListener('appinstalled', handleAppInstalled);
        };
    }, []);

    const handleInstallClick = async () => {
        if (!deferredPrompt) return; // Should not happen for Android button

        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;

        if (outcome === 'accepted') {
            console.log('User accepted the install prompt');
            try { localStorage.setItem(INSTALLED_KEY, 'true'); } catch { /* ignore */ }
        } else {
            console.log('User dismissed the install prompt');
            recordDismiss(); // 按了系統提示的取消，也算一次關閉 → 延長冷卻
        }
        setDeferredPrompt(null);
        setShowPrompt(false);
    };

    const handleDismiss = () => {
        setShowPrompt(false);
        // 記錄使用者關閉 → 依累計次數漸進拉長下次自動跳出的間隔
        recordDismiss();
    };

    if (!showPrompt) return null;

    return (
        <div className="pwa-prompt-overlay animate-fadeIn">
            <div className="pwa-prompt-card">
                <div className="pwa-icon">
                    <img src="/repair/icons/icon-512x512.png" alt="App Icon" />
                </div>
                <div className="pwa-content">
                    <h3 className="text-gradient">安裝校園報修 App</h3>
                    <p>將應用程式加入主畫面，享受更流暢的離線體驗與全螢幕操作。</p>

                    {isIOS ? (
                        <div className="ios-instruction">
                            <p>1. 點擊瀏覽器下方的 <span className="icon-share">分享按鈕</span></p>
                            <p>2. 往下滑找到 <span className="highlight">加入主畫面</span></p>
                        </div>
                    ) : (
                        <div className="android-action">
                            {/* Android 只有在捕捉到 event 時才顯示安裝按鈕 */}
                            {deferredPrompt && (
                                <button className="btn-install" onClick={handleInstallClick}>
                                    立即安裝
                                </button>
                            )}
                        </div>
                    )}
                </div>
                <button className="close-btn" onClick={handleDismiss}>✕</button>
            </div>
        </div>
    );
}

export default PwaInstallPrompt;
