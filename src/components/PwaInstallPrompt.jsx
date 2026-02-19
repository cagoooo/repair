import { useState, useEffect } from 'react';
import './PwaInstallPrompt.css';

function PwaInstallPrompt() {
    const [deferredPrompt, setDeferredPrompt] = useState(null);
    const [showPrompt, setShowPrompt] = useState(false);
    const [isIOS, setIsIOS] = useState(false);
    const [isStandalone, setIsStandalone] = useState(false);

    useEffect(() => {
        // 監聽自定義事件以開啟安裝提示 (從 Footer 或其他地方觸發)
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

        // Android / Chrome: 攔截 beforeinstallprompt 事件
        const handleBeforeInstallPrompt = (e) => {
            e.preventDefault();
            setDeferredPrompt(e);
            // 延遲顯示，避免干擾使用者初次進入
            setTimeout(() => {
                setShowPrompt(true);
            }, 3000);
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

        // iOS: 如果是 iOS 且未安裝，也延遲顯示提示
        if (ios && !isStandaloneMode) {
            setTimeout(() => {
                // 檢查是否有點擊過「不再顯示」 (可存在 localStorage)
                const dontShow = localStorage.getItem('pwa_prompt_dismissed');
                if (!dontShow) {
                    setShowPrompt(true);
                }
            }, 3000);
        }

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        };
    }, []);

    const handleInstallClick = async () => {
        if (!deferredPrompt) return; // Should not happen for Android button

        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;

        if (outcome === 'accepted') {
            console.log('User accepted the install prompt');
        } else {
            console.log('User dismissed the install prompt');
        }
        setDeferredPrompt(null);
        setShowPrompt(false);
    };

    const handleDismiss = () => {
        setShowPrompt(false);
        // 記錄使用者關閉，短期內不再顯示 (例如 7 天，這裡簡化為永久或 Session)
        localStorage.setItem('pwa_prompt_dismissed', 'true');
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
