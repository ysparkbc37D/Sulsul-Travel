// Sulsul-Travel Service Worker
const V = 'st-shell-v1.9.5';
const CACHE_NAME = V;
const CACHE_PREFIX = 'st-shell-';

const PRECACHE_ASSETS = [
  './',
  './index.html',
  './css/utilities.css?v=1.9.5',
  './css/companion.css?v=1.9.5',
  './css/companion-refresh.css?v=1.9.5',
  './css/moment-journal.css?v=1.9.5',
  './js/domain/trip-adapter.js?v=1.9.5',
  './js/domain/ai-draft-validation.js?v=1.9.5',
  './js/domain/travel-story.js?v=1.9.5',
  './js/infrastructure/storage/media-repository.js?v=1.9.5',
  './js/presentation/moment-journal.js?v=1.9.5',
  './js/presentation/travel-story-ui.js?v=1.9.5',
  './js/infrastructure/collaboration/supabase-travel-service.js?v=1.9.5',
  './js/config/collaboration-config.js?v=1.9.5',
  './js/presentation/collaboration-ui.js?v=1.9.5',
  './js/presentation/collaboration-review.js?v=1.9.5',
  './js/presentation/companion-ui.js?v=1.9.5',
  './js/domain/trip-transfer.js?v=1.9.5',
  './js/domain/travel-backup.js?v=1.9.5',
  './js/presentation/travel-backup-ui.js?v=1.9.5',
  './js/presentation/trip-transfer-ui.js?v=1.9.5',
  './js/presentation/activity-journal.js?v=1.9.5',
  './js/presentation/expense-editor.js?v=1.9.5',
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
  './manifest.webmanifest?v=1.9.5',
  './kb-travel.js?v=1.9.5',
  './js/destinations/destination-registry.js',
  './js/destinations/pack-default.js',
  './js/destinations/pack-south-america.js?v=1.9.5',
  './js/destinations/pack-yunnan.js',
  './js/infrastructure/storage/legacy-trip-repository.js?v=1.9.5',
  './js/infrastructure/storage/settings-repository.js?v=1.9.5',
  './js/infrastructure/storage/journal-overflow-repository.js?v=1.9.5',
  './js/application/orchestration.mjs?v=1.9.5',
  './js/domain/replan.mjs?v=1.9.5',
  './icons/sulsul_bear_mascot.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-192.png',
  './icons/icon-maskable-512.png',
  './icons/apple-touch-icon.png',
  './icons/icon-192-v115.png?v=1.9.5',
  './icons/icon-512-v115.png',
  './icons/icon-maskable-192-v115.png',
  './icons/icon-maskable-512-v115.png',
  './icons/apple-touch-icon-v115.png?v=1.9.5',
  './favicon.png?v=1.9.5',
  './favicon.ico'
];

// 공개 앱 자산만 저장한다. API·외부 응답 및 다른 버전의 URL은 캐시하지 않는다.
const SHELL_URL = new URL('./index.html', self.registration.scope).href;
const ASSET_URLS = new Set(PRECACHE_ASSETS.map(asset => new URL(asset, self.registration.scope).href));
const APP_ORIGIN = new URL(self.registration.scope).origin;
const APP_VERSION = V.replace('st-shell-v', '');
const CORE_ASSETS = new Set(PRECACHE_ASSETS.filter(asset => asset === './' || /\.(?:html|css|js|mjs)(?:\?|$)/.test(asset)));

function hasPrivateHeaders(request) {
  return ['authorization', 'apikey', 'x-goog-api-key'].some(name => request.headers.has(name));
}

function cacheableResponse(response) {
  return response && response.status === 200 && response.type !== 'opaque' && !response.redirected &&
    !/(?:no-store|private)/i.test(response.headers.get('Cache-Control') || '');
}

async function currentShell(response) {
  if (!response || response.status !== 200) return false;
  const html = await response.clone().text();
  return html.match(/\bconst\s+APP_VER\s*=\s*['"]([^'"]+)['"]/)?.[1] === APP_VERSION;
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // 필수 셸이 완성되기 전에는 새 워커를 활성화하지 않아 이전 오프라인 앱을 보존한다.
      return Promise.all(PRECACHE_ASSETS.map(async asset => {
        try {
          await cache.add(asset);
          if ((asset === './' || asset === './index.html') && !await currentShell(await cache.match(new URL(asset, self.registration.scope).href))) {
            throw new Error('APP_SHELL_VERSION_MISMATCH');
          }
        } catch (error) {
          if (CORE_ASSETS.has(asset)) throw error;
          console.warn('[SW] Optional precache asset unavailable:', asset, error);
        }
      }));
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
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== APP_ORIGIN || hasPrivateHeaders(req)) return;

  // 앱 진입은 네트워크를 먼저 확인하고 오프라인일 때 현재 버전의 앱 셸을 사용한다.
  if (req.mode === 'navigate') {
    const shellPath = new URL(SHELL_URL).pathname;
    if (url.pathname !== shellPath && url.pathname !== new URL('./', self.registration.scope).pathname) return;
    let updatePromise;
    const navigation = fetch(req)
        .then(async (networkResponse) => {
          if (cacheableResponse(networkResponse) && await currentShell(networkResponse)) {
            try { await (await caches.open(CACHE_NAME)).put(SHELL_URL, networkResponse.clone()); }
            catch (_) { /* 저장 공간 부족은 온라인 화면 진입을 막지 않는다. */ }
          } else if (networkResponse.status === 200 && self.registration.update) {
            // 구 워커가 새 HTML을 받았을 때 자기 캐시를 섞지 않고 새 워커 설치를 요청한다.
            try { updatePromise = self.registration.update().catch(() => {}); } catch (_) {}
          }
          return networkResponse;
        })
        .catch(async () => {
          const cache = await caches.open(CACHE_NAME);
          const cachedIndex = await cache.match(SHELL_URL) || await cache.match(new URL('./', self.registration.scope).href);
          if (cachedIndex) return cachedIndex;

          // 최초 설치 전에 오프라인이 되어도 빈 화면 대신 재시도 안내를 표시한다.
          return new Response(
            '<!DOCTYPE html><html lang="ko"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>술술트래블</title><style>body{font-family:system-ui,-apple-system,sans-serif;background:#F7F5F0;color:#1E2B24;display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;margin:0;padding:20px;box-sizing:border-box;text-align:center;}h1{font-size:20px;margin-bottom:8px;}p{font-size:13px;color:#6B5E51;margin-bottom:24px;}button{padding:12px 28px;border-radius:16px;background:#a2601b;color:#fff;border:none;font-weight:bold;font-size:14px;cursor:pointer;box-shadow:0 4px 12px rgba(162,96,27,0.3);}</style></head><body><h1>술술트래블 오프라인 연결</h1><p>저장된 여행 데이터를 불러오기 위해 앱을 다시 시작합니다.</p><button onclick="location.reload()">새로고침</button></body></html>',
            { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
          );
        });
    event.respondWith(navigation);
    event.waitUntil(navigation.then(() => updatePromise));
    return;
  }

  // 설치한 버전의 자산은 고정한다. 다음 배포의 같은 경로 내용으로 이전 캐시를 덮지 않는다.
  if (!ASSET_URLS.has(url.href)) return;
  const cachePromise = caches.open(CACHE_NAME);
  event.respondWith(cachePromise.then(async cache => {
    const cached = await cache.match(req);
    if (cached) return cached;
    try {
      const networkResponse = await fetch(req);
      const shellRequest = url.href === SHELL_URL || url.href === new URL('./', self.registration.scope).href;
      if (cacheableResponse(networkResponse) && (!shellRequest || await currentShell(networkResponse))) {
        try { await cache.put(req, networkResponse.clone()); }
        catch (_) { /* 캐시 실패가 실제 응답을 가리지 않도록 한다. */ }
      }
      return networkResponse;
    } catch (_) { return new Response('', {status:408,statusText:'Offline'}); }
  }));
});
