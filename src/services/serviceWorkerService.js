const INSTALLED_STATES = new Set(['installed', 'activated']);

/**
 * 監聽既有 waiting worker 與後續 updatefound 事件。
 * 首次安裝時沒有 controller，不應誤顯示「有新版本」。
 */
export function watchForServiceWorkerUpdate(registration, hasController, onUpdate) {
  const workerCleanups = [];

  const announceIfUpdated = (worker) => {
    if (worker?.state === 'installed' && hasController()) {
      onUpdate(registration);
    }
  };

  const watchWorker = (worker) => {
    if (!worker) return;
    const handleStateChange = () => announceIfUpdated(worker);
    worker.addEventListener('statechange', handleStateChange);
    workerCleanups.push(() => worker.removeEventListener('statechange', handleStateChange));
    announceIfUpdated(worker);
  };

  if (registration.waiting && hasController()) {
    onUpdate(registration);
  }

  const handleUpdateFound = () => watchWorker(registration.installing);
  registration.addEventListener('updatefound', handleUpdateFound);

  return () => {
    registration.removeEventListener('updatefound', handleUpdateFound);
    workerCleanups.forEach(cleanup => cleanup());
  };
}

function waitForWorkerInstall(worker, timeoutMs) {
  if (!worker || INSTALLED_STATES.has(worker.state)) return Promise.resolve();

  return new Promise((resolve) => {
    let timeoutId;
    const finish = () => {
      clearTimeout(timeoutId);
      worker.removeEventListener('statechange', handleStateChange);
      resolve();
    };
    const handleStateChange = () => {
      if (INSTALLED_STATES.has(worker.state) || worker.state === 'redundant') finish();
    };

    worker.addEventListener('statechange', handleStateChange);
    timeoutId = setTimeout(finish, timeoutMs);
  });
}

/**
 * 等待 registration 真正出現 waiting/installing worker。
 * version.json 可能比 sw.js 更早通過 CDN，不能只看到版本不同就直接顯示更新按鈕。
 */
export function waitForServiceWorkerCandidate(registration, timeoutMs = 8000) {
  const currentWorker = registration?.waiting || registration?.installing;
  if (currentWorker) return Promise.resolve(currentWorker);
  if (!registration) return Promise.resolve(null);

  return new Promise((resolve) => {
    let timeoutId;
    const finish = (worker = null) => {
      clearTimeout(timeoutId);
      registration.removeEventListener('updatefound', handleUpdateFound);
      resolve(worker);
    };
    const handleUpdateFound = () => finish(registration.waiting || registration.installing);

    registration.addEventListener('updatefound', handleUpdateFound);
    timeoutId = setTimeout(() => finish(registration.waiting || registration.installing), timeoutMs);
  });
}

/**
 * 點擊更新時才取得最新 waiting worker 並要求接管，避免固定住過期的 worker 參照。
 */
export async function activateWaitingServiceWorker(registration, timeoutMs = 8000) {
  if (!registration) return false;

  let worker = registration.waiting;
  if (!worker) {
    const candidatePromise = waitForServiceWorkerCandidate(registration, timeoutMs);
    await registration.update();
    worker = registration.waiting || registration.installing || await candidatePromise;
  }

  await waitForWorkerInstall(worker, timeoutMs);
  worker = registration.waiting || worker;

  if (!worker || worker.state === 'redundant' || worker.state === 'activated') return false;
  worker.postMessage({ type: 'SKIP_WAITING' });
  return true;
}
