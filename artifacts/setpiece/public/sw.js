const CACHE_NAME = 'setpiece-v1';

const BASE_PATH = new URL(self.registration.scope).pathname;

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll([
      BASE_PATH,
      BASE_PATH + 'manifest.json',
      BASE_PATH + 'icons/icon-192.svg'
    ]))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  if (event.request.method !== 'GET') return;
  if (url.pathname.startsWith('/api/')) return;

  const isPlayerRoute = url.pathname.includes('/p/');
  const isNavigationRequest = event.request.mode === 'navigate';

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.ok && (isPlayerRoute || isNavigationRequest)) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => {
        return caches.match(event.request).then((cached) => {
          if (cached) return cached;
          if (isNavigationRequest) {
            return caches.match(BASE_PATH);
          }
          return new Response('Offline', { status: 503 });
        });
      })
  );
});
