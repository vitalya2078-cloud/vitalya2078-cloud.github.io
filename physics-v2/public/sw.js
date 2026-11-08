const CACHE_NAME = 'physics-shell-v2';
const APP_SCOPE = self.registration.scope;
const APP_SHELL = [
  APP_SCOPE,
  `${APP_SCOPE}index.html`,
  `${APP_SCOPE}manifest.webmanifest`,
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)),
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys
        .filter((key) => key.startsWith('physics-shell-') && key !== CACHE_NAME)
        .map((key) => caches.delete(key)),
    )),
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const requestUrl = new URL(request.url);

  if (request.method !== 'GET' || requestUrl.origin !== self.location.origin) {
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            event.waitUntil(
              caches.open(CACHE_NAME).then((cache) =>
                cache.put(`${APP_SCOPE}index.html`, copy),
              ),
            );
          }
          return response;
        })
        .catch(async () => {
          const cachedPage = await caches.match(`${APP_SCOPE}index.html`);
          return cachedPage || caches.match(APP_SCOPE);
        }),
    );
    return;
  }

  if (requestUrl.pathname.startsWith(new URL(APP_SCOPE).pathname)) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;

        return fetch(request).then((response) => {
          if (response.ok) {
            const copy = response.clone();
            event.waitUntil(
              caches.open(CACHE_NAME).then((cache) => cache.put(request, copy)),
            );
          }
          return response;
        });
      }),
    );
  }
});
