// Service Worker — 快取策略：Network First + 靜態資源快取
const CACHE_NAME = 'repair-v2.3';
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
    self.skipWaiting();
});

// 啟動：清除舊版快取
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
            );
        })
    );
    self.clients.claim();
});

// 攔截請求：Network First 策略
self.addEventListener('fetch', (event) => {
    // 跳過非 GET 請求和跨域請求
    if (event.request.method !== 'GET') return;

    // API / Firestore / Auth 請求不快取
    const url = new URL(event.request.url);
    if (url.hostname.includes('firestore') ||
        url.hostname.includes('googleapis') ||
        url.hostname.includes('firebase') ||
        url.hostname.includes('gstatic')) {
        return;
    }
    // 忽略非 http/https 請求 (例如 chrome-extension://)
    if (!url.protocol.startsWith('http')) return;

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
