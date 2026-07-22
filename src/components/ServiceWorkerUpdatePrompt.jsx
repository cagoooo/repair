import { useEffect, useRef, useState } from 'react';
import packageInfo from '../../package.json';
import {
  activateWaitingServiceWorker,
  waitForServiceWorkerCandidate,
  watchForServiceWorkerUpdate
} from '../services/serviceWorkerService';
import './ServiceWorkerUpdatePrompt.css';

const APP_VERSION = packageInfo.version;
const BASE_URL = import.meta.env.BASE_URL || '/';
const SW_URL = `${BASE_URL}sw.js`;
const VERSION_URL = `${BASE_URL}version.json`;
const RELOAD_GUARD_KEY = 'repair_sw_reload_guard';

function ServiceWorkerUpdatePrompt() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [availableVersion, setAvailableVersion] = useState('');
  const [isApplying, setIsApplying] = useState(false);
  const registrationRef = useRef(null);
  const dismissedRef = useRef(false);
  const reloadingRef = useRef(false);
  const updateRequestedRef = useRef(false);
  const fallbackReloadRef = useRef(null);

  useEffect(() => {
    if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return undefined;

    let disposed = false;
    let stopWatching = () => {};
    let initialCheckTimer;
    let updateInterval;
    let versionInterval;

    try {
      sessionStorage.removeItem(RELOAD_GUARD_KEY);
    } catch {
      // 隱私模式下 sessionStorage 可能無法使用，不影響更新流程。
    }

    const announceUpdate = (version = '') => {
      if (disposed || dismissedRef.current) return;
      if (version) setAvailableVersion(version);
      setUpdateAvailable(true);
    };

    const checkRemoteVersion = async () => {
      try {
        const response = await fetch(`${VERSION_URL}?t=${Date.now()}`, { cache: 'no-store' });
        if (!response.ok) return;
        const data = await response.json();
        if (data.version && data.version !== APP_VERSION) {
          const registration = registrationRef.current;
          if (!registration) return;
          const candidatePromise = waitForServiceWorkerCandidate(registration);
          await registration.update();
          const candidate = registration.waiting || registration.installing || await candidatePromise;
          if (candidate) announceUpdate(data.version);
        }
      } catch {
        // 離線或 CDN 尚未更新時靜默略過，下次 focus/online 會再檢查。
      }
    };

    const handleControllerChange = () => {
      // 首次安裝也可能觸發 controllerchange；只有使用者要求套用更新時才重新載入。
      if (!updateRequestedRef.current || reloadingRef.current) return;
      reloadingRef.current = true;

      try {
        if (sessionStorage.getItem(RELOAD_GUARD_KEY)) return;
        sessionStorage.setItem(RELOAD_GUARD_KEY, '1');
      } catch {
        // sessionStorage 不可用時仍以 ref 防止同頁重複載入。
      }

      window.location.reload();
    };

    navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);

    navigator.serviceWorker.register(SW_URL, { updateViaCache: 'none' })
      .then((registration) => {
        if (disposed) return;
        registrationRef.current = registration;
        stopWatching = watchForServiceWorkerUpdate(
          registration,
          () => Boolean(navigator.serviceWorker.controller),
          () => announceUpdate()
        );

        registration.update().catch(() => {});
        updateInterval = window.setInterval(() => {
          registration.update().catch(() => {});
        }, 60_000);

        initialCheckTimer = window.setTimeout(checkRemoteVersion, 5_000);
        versionInterval = window.setInterval(checkRemoteVersion, 180_000);
      })
      .catch((error) => console.warn('SW registration failed:', error));

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') checkRemoteVersion();
    };
    window.addEventListener('focus', checkRemoteVersion);
    window.addEventListener('online', checkRemoteVersion);
    window.addEventListener('pageshow', checkRemoteVersion);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      disposed = true;
      stopWatching();
      navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
      window.removeEventListener('focus', checkRemoteVersion);
      window.removeEventListener('online', checkRemoteVersion);
      window.removeEventListener('pageshow', checkRemoteVersion);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.clearTimeout(initialCheckTimer);
      window.clearInterval(updateInterval);
      window.clearInterval(versionInterval);
      window.clearTimeout(fallbackReloadRef.current);
    };
  }, []);

  const handleApplyUpdate = async () => {
    if (isApplying) return;
    setIsApplying(true);
    updateRequestedRef.current = true;

    try {
      const activated = await activateWaitingServiceWorker(registrationRef.current);
      if (!activated) {
        window.location.reload();
        return;
      }

      // controllerchange 是主要重載路徑；此計時器僅作瀏覽器未送事件時的保底。
      fallbackReloadRef.current = window.setTimeout(() => window.location.reload(), 3000);
    } catch (error) {
      console.warn('套用 SW 更新失敗，改用一般重新整理：', error);
      window.location.reload();
    }
  };

  const handleDismiss = () => {
    dismissedRef.current = true;
    setUpdateAvailable(false);
  };

  if (!updateAvailable) return null;

  return (
    <aside className="sw-update-prompt" role="status" aria-live="assertive">
      <div className="sw-update-icon" aria-hidden="true">✨</div>
      <div className="sw-update-copy">
        <strong>網站有新版本</strong>
        <span>
          {availableVersion ? `v${availableVersion} 已準備完成` : '新功能已準備完成'}
        </span>
      </div>
      <div className="sw-update-actions">
        <button
          type="button"
          className="sw-update-now"
          onClick={handleApplyUpdate}
          disabled={isApplying}
        >
          {isApplying ? '更新中…' : '立即更新'}
        </button>
        <button
          type="button"
          className="sw-update-later"
          onClick={handleDismiss}
          disabled={isApplying}
        >
          稍後
        </button>
      </div>
    </aside>
  );
}

export default ServiceWorkerUpdatePrompt;
