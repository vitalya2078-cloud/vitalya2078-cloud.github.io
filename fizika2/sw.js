const C='f2-5a454aa882';
self.addEventListener('install',e=>{e.waitUntil(caches.open(C).then(c=>c.addAll(['./','index.html','content.json'])).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==C).map(x=>caches.delete(x)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',e=>{const u=new URL(e.request.url);if(e.request.method!=='GET'||u.origin!==location.origin)return;
 if(/\/(pics|audio)\//.test(u.pathname)){e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request).then(res=>{if(res.ok){const c=res.clone();caches.open(C).then(k=>k.put(e.request,c))}return res})));return}
 e.respondWith(fetch(e.request).then(res=>{if(res.ok){const c=res.clone();caches.open(C).then(k=>k.put(e.request,c))}return res}).catch(()=>caches.match(e.request).then(r=>r||caches.match('index.html'))))});
