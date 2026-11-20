/* «Физпрактикум» для iPhone: работа без интернета. Собирается lw3-mobile/build_ios.py — не править вручную. */
const CACHE = "fizpraktikum-2.1.0-223c5161d8";
const FILES = ["fonts/golos-400.woff2", "fonts/golos-600.woff2", "fonts/golos-700.woff2", "fonts/golos-cyrillic-800.woff2", "fonts/golos-latin-800.woff2", "fonts/stix-cyrillic-600.woff2", "fonts/stix-cyrillic-600i.woff2", "fonts/stix-greek-600.woff2", "fonts/stix-greek-600i.woff2", "fonts/stix-latin-600.woff2", "fonts/stix-latin-600i.woff2", "icons/apple-touch-icon.png", "icons/icon-192.png", "icons/icon-512.png", "img/lab-bg-light.webp", "img/lab-bg.webp", "img/lab-bg2-light.webp", "img/lab-bg2.webp", "img/parts/base.webp", "img/parts/bottle.webp", "img/parts/coil.webp", "img/parts/compass.webp", "img/parts/compressor.webp", "img/parts/cork.webp", "img/parts/cross.webp", "img/parts/cyl.webp", "img/parts/generator.webp", "img/parts/hanger.webp", "img/parts/helmholtz.webp", "img/parts/launcher.webp", "img/parts/lens.webp", "img/parts/magnet.webp", "img/parts/magnetron.webp", "img/parts/manometer.webp", "img/parts/miniblock.webp", "img/parts/multimeter.webp", "img/parts/plate.webp", "img/parts/psu.webp", "img/parts/puck-brass.webp", "img/parts/puck-steel.webp", "img/parts/pulley.webp", "img/parts/stopwatch.webp", "img/parts/valve.webp", "index.html", "manifest.webmanifest"];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(['./', ...FILES])).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith('fizpraktikum-') && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const r = e.request; if (r.method !== 'GET' || new URL(r.url).origin !== location.origin) return;
  if (r.mode === 'navigate') {
    const net = fetch(r).then(res => { if (res.ok) { const cp = res.clone(); caches.open(CACHE).then(c => c.put('./', cp)); } return res; });
    const late = new Promise(ok => setTimeout(ok, 3000)).then(() => caches.match('./'));
    e.respondWith(Promise.race([net.catch(() => caches.match('./')), late.then(c => c || net)]).then(res => res || caches.match('index.html')));
    return;
  }
  e.respondWith(caches.match(r, { ignoreSearch: true }).then(c => c || fetch(r)));
});
