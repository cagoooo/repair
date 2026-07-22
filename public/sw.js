// Service Worker — 快取策略：Network First + 靜態資源快取
const BUILD_VERSION = '0.11.0';
const CACHE_NAME = `repair-v${BUILD_VERSION}`;
const STATIC_ASSETS = [
    './',
    './index.html'
];

// 安裝：預快取核心資源
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(STATIC_ASSETS);
        })
    );
    // 不在這裡 skipWaiting：保留 waiting 狀態，讓使用者決定何時套用新版。
});

// 啟動：清除舊版快取
self.addEventListener('activate', (event) => {
    event.waitUntil(
        (async () => {
            const keys = await caches.keys();
            await Promise.all(
                keys
                    .filter(key => key.startsWith('repair-v') && key !== CACHE_NAME)
                    .map(key => caches.delete(key))
            );
            await self.clients.claim();
            const clients = await self.clients.matchAll({ type: 'window' });
            clients.forEach(client => client.postMessage({
                type: 'SW_ACTIVATED',
                version: BUILD_VERSION
            }));
        })()
    );
});

// 使用者按下「立即更新」後，才讓 waiting SW 接管頁面。
self.addEventListener('message', (event) => {
    if (event.data?.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});

// 攔截請求：Network First 策略
self.addEventListener('fetch', (event) => {
    // 跳過非 GET 請求和跨域請求
    if (event.request.method !== 'GET') return;

    // API / Firestore / Auth 請求不快取
    const url = new URL(event.request.url);
    if (url.origin !== self.location.origin) return;

    // 版本檔永遠向網路取最新版，不進入一般快取流程。
    if (url.pathname.endsWith('/version.json')) {
        event.respondWith(fetch(event.request, { cache: 'no-store' }));
        return;
    }

    if (url.hostname.includes('firestore') ||
        url.hostname.includes('googleapis') ||
        url.hostname.includes('firebase') ||
        url.hostname.includes('gstatic')) {
        return;
    }
    event.respondWith(
        fetch(event.request)
            .then((response) => {
                // 成功取得網路回應 → 更新快取
                if (response.status === 200) {
                    const responseClone = response.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        try {
                            if (event.request.url.startsWith('http')) {
                                cache.put(event.request, responseClone);
                            }
                        } catch (err) {
                            console.warn('Failed to cache:', event.request.url, err);
                        }
                    });
                }
                return response;
            })
            .catch(() => {
                // 離線時 → 從快取讀取
                return caches.match(event.request).then((cached) => {
                    if (cached) return cached;
                    // 如果是導航請求，回傳 index.html（SPA fallback）
                    if (event.request.mode === 'navigate') {
                        return caches.match('./index.html');
                    }
                    return new Response('Offline', { status: 503 });
                });
            })
    );
});
