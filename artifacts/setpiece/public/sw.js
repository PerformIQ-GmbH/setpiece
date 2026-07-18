// Offline strategy, tuned for matchday at pitches with bad reception:
// - hashed build assets (/assets/*): cache-first (immutable)
// - navigations & other static files: network-first, cache fallback
// - GET /api/*: network-first with cached fallback, so the player PWA and
//   coach views still show the last-loaded data offline
const STATIC_CACHE = 'setpiece-static-v2';
const DATA_CACHE = 'setpiece-data-v2';
const KNOWN_CACHES = [STATIC_CACHE, DATA_CACHE];

const BASE_PATH = new URL(self.registration.scope).pathname;

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll([
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
      Promise.all(keys.filter((k) => !KNOWN_CACHES.includes(k)).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== self.location.origin) return;

  // Hashed, immutable build assets: cache-first.
  if (url.pathname.includes('/assets/')) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached;
        return fetch(event.request).then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(STATIC_CACHE).then((cache) => cache.put(event.request, clone));
          }
          return response;
        });
      })
    );
    return;
  }

  // API data: network-first so it's always fresh online, cached copy offline.
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(DATA_CACHE).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => caches.match(event.request).then((cached) =>
          cached || new Response(JSON.stringify({ error: 'offline' }), {
            status: 503,
            headers: { 'Content-Type': 'application/json' },
          })
        ))
    );
    return;
  }

  const isNavigationRequest = event.request.mode === 'navigate';
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(STATIC_CACHE).then((cache) => cache.put(event.request, clone));
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
