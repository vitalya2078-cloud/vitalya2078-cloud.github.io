// Офлайн-кэш сайта. Интерфейс и вопросы — сначала из сети (всегда свежие), без сети — из кэша. Рисунки — из кэша.
const CACHE = '__CACHE__';
const FILES = __FILES__;
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin || url.pathname.endsWith('.apk') || url.pathname.endsWith('version.json')) return;
  if (url.pathname.includes('/pics/') || /\.png$/.test(url.pathname)) {
    e.respondWith(caches.match(e.request, { ignoreSearch: true }).then(r => r || fetch(e.request).then(res => { if (res.ok) { const c = res.clone(); caches.open(CACHE).then(k => k.put(e.request, c)); } return res; })));
    return;
  }
  e.respondWith(fetch(e.request).then(res => { if (res.ok) { const c = res.clone(); caches.open(CACHE).then(k => k.put(e.request, c)); } return res; })
    .catch(() => caches.match(e.request, { ignoreSearch: true }).then(r => r || caches.match('index.html'))));
});
