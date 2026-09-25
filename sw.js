// Sulsul-Travel Service Worker
const V = 'st-shell-v1.8.4';
const CACHE_NAME = V;
const CACHE_PREFIX = 'st-shell-';

const PRECACHE_ASSETS = [
  './',
  './index.html',
  './css/utilities.css?v=1.8.4',
  './css/companion.css?v=1.8.4',
  './js/presentation/companion-ui.js?v=1.8.4',
  './js/domain/trip-transfer.js?v=1.8.4',
  './js/presentation/trip-transfer-ui.js?v=1.8.4',
  './js/presentation/activity-journal.js?v=1.8.4',
  './js/presentation/expense-editor.js?v=1.8.4',
  './donate-qr.png',
  './vendor/fontawesome/css/all.min.css',
  './vendor/fontawesome/webfonts/fa-solid-900.woff2',
  './vendor/fontawesome/webfonts/fa-regular-400.woff2',
  './vendor/fontawesome/webfonts/fa-brands-400.woff2',
  './vendor/leaflet/leaflet.css',
  './vendor/leaflet/leaflet.js',
  './vendor/leaflet/images/marker-icon.png',
  './vendor/leaflet/images/marker-icon-2x.png',
  './vendor/leaflet/images/marker-shadow.png',
  './vendor/leaflet/images/layers.png',
  './vendor/leaflet/images/layers-2x.png',
  './vendor/lz-string/lz-string.min.js',
  './manifest.webmanifest',
  './kb-travel.js',
  './js/destinations/destination-registry.js',
  './js/destinations/pack-default.js',
  './js/destinations/pack-south-america.js',
  './js/destinations/pack-yunnan.js',
  './js/infrastructure/storage/legacy-trip-repository.js',
  './js/infrastructure/storage/journal-overflow-repository.js',
  './js/application/orchestration.mjs',
  './js/domain/replan.mjs',
  './south_america_illustrated_map.jpg',
  './icons/sulsul_bear_mascot.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-192.png',
  './icons/icon-maskable-512.png',
  './icons/apple-touch-icon.png',
  './icons/icon-192-v115.png',
  './icons/icon-512-v115.png',
  './icons/icon-maskable-192-v115.png',
  './icons/icon-maskable-512-v115.png',
  './icons/apple-touch-icon-v115.png',
  './favicon.png',
  './favicon.ico'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // Use Promise.allSettled so one failed asset never aborts the whole precache
      return Promise.allSettled(
        PRECACHE_ASSETS.map((asset) =>
          cache.add(asset).catch((err) => {
            console.warn('[SW] Precache asset individual failure (will cache dynamically):', asset, err);
          })
        )
      );
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((name) => {
          if (name.startsWith(CACHE_PREFIX) && name !== CACHE_NAME) {
            return caches.delete(name);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  // Never cache Gemini AI API calls or GitHub PAT API calls
  if (req.url.includes('generativelanguage.googleapis.com') || req.url.includes('api.github.com')) {
    return;
  }

  // 1. Navigation requests (req.mode === 'navigate') -> Network-First with guaranteed AppShell fallback
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const resClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, resClone));
          }
          return networkResponse;
        })
        .catch(async () => {
          // Offline or network error: return cached app shell
          const cachedDirect = await caches.match(req);
          if (cachedDirect) return cachedDirect;
          const cachedIndex = await caches.match('./index.html') || await caches.match('./');
          if (cachedIndex) return cachedIndex;

          // Fail-safe offline response to prevent iOS WebKit blank white screens
          return new Response(
            '<!DOCTYPE html><html lang="ko"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>술술트래블</title><style>body{font-family:system-ui,-apple-system,sans-serif;background:#F7F5F0;color:#1E2B24;display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;margin:0;padding:20px;box-sizing:border-box;text-align:center;}h1{font-size:20px;margin-bottom:8px;}p{font-size:13px;color:#6B5E51;margin-bottom:24px;}button{padding:12px 28px;border-radius:16px;background:#a2601b;color:#fff;border:none;font-weight:bold;font-size:14px;cursor:pointer;box-shadow:0 4px 12px rgba(162,96,27,0.3);}</style></head><body><h1>술술트래블 오프라인 연결</h1><p>저장된 여행 데이터를 불러오기 위해 앱을 다시 시작합니다.</p><button onclick="location.reload()">새로고침</button></body></html>',
            { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
          );
        })
    );
    return;
  }

  // 2. Static assets (scripts, styles, images, fonts) -> Stale-While-Revalidate with ignoreSearch matching
  event.respondWith(
    caches.match(req, { ignoreSearch: true }).then((cachedResponse) => {
      const fetchPromise = fetch(req).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const resClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, resClone));
        }
        return networkResponse;
      }).catch(() => {
        if (cachedResponse) return cachedResponse;
        return new Response('', { status: 408, statusText: 'Offline' });
      });

      return cachedResponse || fetchPromise;
    })
  );
});
