const CACHE = 'snaproll-cache-v3';
const OFFLINE_URLS = ['/','/manifest.json','/icon.svg','/maskable.svg'];
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(OFFLINE_URLS)).then(self.skipWaiting())
  );
});
self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});
self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);

  // Never cache cross-origin (e.g., API) requests
  if (url.origin !== self.location.origin) {
    event.respondWith(fetch(request));
    return;
  }

  // For navigations (HTML pages), use network-first to avoid stale pages
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(request, copy));
          return response;
        })
        .catch(async () => (await caches.match(request)) || (await caches.match('/')))
    );
    return;
  }

  // For static assets, use cache-first
  const isStatic = ['style', 'script', 'image', 'font'].includes(request.destination);
  if (isStatic || OFFLINE_URLS.includes(url.pathname)) {
    event.respondWith(
      caches.match(request).then((cached) =>
        cached || fetch(request).then((response) => {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(request, copy));
          return response;
        })
      )
    );
    return;
  }

  // Default: network-first, but do not cache JSON/API responses
  event.respondWith(
    fetch(request)
      .then((response) => {
        const isJson = (response.headers.get('content-type') || '').includes('application/json');
        if (!isJson) {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(request, copy));
        }
        return response;
      })
      .catch(async () => await caches.match(request))
  );
});
