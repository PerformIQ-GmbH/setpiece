// Public static assets only. Never persist team, player, auth or billing data.
const STATIC_CACHE = 'setpiece-static-v4';
const BASE_PATH = new URL(self.registration.scope).pathname;
const OFFLINE_PAGE = BASE_PATH + 'offline.html';
const PUBLIC_FILES = new Set([
  OFFLINE_PAGE,
  BASE_PATH + 'manifest.json',
  BASE_PATH + 'icons/icon-192.svg',
  BASE_PATH + 'icons/icon-192.png',
]);

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(STATIC_CACHE).then((cache) => cache.addAll([...PUBLIC_FILES])));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((key) => key.startsWith('setpiece-') && key !== STATIC_CACHE).map((key) => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener('message', (event) => {
  if (event.data?.type !== 'CLEAR_APP_CACHES') return;
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((key) => key.startsWith('setpiece-')).map((key) => caches.delete(key)));
    event.ports?.[0]?.postMessage({ cleared: true });
  })());
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== self.location.origin) return;
  if (url.pathname.startsWith(BASE_PATH + 'api/') || url.pathname.startsWith('/api/')) return;

  const isBuildAsset = url.pathname.startsWith(BASE_PATH + 'assets/') &&
    /-[\w-]{6,}\.(?:js|css|woff2?|svg|png|jpe?g|webp)$/.test(url.pathname);
  const isPublicFile = PUBLIC_FILES.has(url.pathname) && !url.search;
  if (isBuildAsset || isPublicFile) {
    event.respondWith((async () => {
      const cache = await caches.open(STATIC_CACHE);
      const cached = await cache.match(event.request);
      if (cached) return cached;
      const response = await fetch(event.request);
      if (response.ok && response.type !== 'opaque') await cache.put(event.request, response.clone());
      return response;
    })());
    return;
  }

  if (event.request.mode === 'navigate') {
    event.respondWith(fetch(event.request).catch(async () =>
      (await caches.match(OFFLINE_PAGE)) || new Response('Für Team- und Spielerdaten ist eine Internetverbindung erforderlich.', {
        status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      })
    ));
  }
});
