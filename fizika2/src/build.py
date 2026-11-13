#!/usr/bin/env python3
"""Сборка пилота fizika2/: index.html (всё в одном файле), content.json и pics/ (база вопросов экзамена из ../fizika),
audio/ (озвучка роликов), sw.js (офлайн), manifest. Запуск: python3 fizika2/src/build.py"""
import base64, json, os, re, shutil
D = os.path.dirname(os.path.abspath(__file__)); OUT = os.path.normpath(os.path.join(D, '..')); OLD = os.path.normpath(os.path.join(OUT, '..', 'fizika'))
rd = lambda p, b=False: open(os.path.join(D, p), 'rb' if b else 'r', **({} if b else {'encoding': 'utf-8'})).read()
html = rd('shell.html')
for w in ('400', '600', '700'): html = html.replace('{{F%s}}' % w, base64.b64encode(open(os.path.join(OLD, 'src', 'g%s.woff2' % w), 'rb').read()).decode())
icons = json.loads(re.search(r'const ICONS = (\{.*?\});', rd('icons.js')).group(1))
html = re.sub(r'\{\{I_([\w-]+)\}\}', lambda m: '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true">%s</svg>' % icons[m.group(1)], html)
voice = json.load(open(os.path.join(D, 'voice.json'), encoding='utf-8')) if os.path.exists(os.path.join(D, 'voice.json')) else {}
js = 'const F2_BUILD = __F2_BUILD__;\nconst F2_IN_APP = /FizikaApp/.test(navigator.userAgent);\nconst VOICE = %s;\n' % json.dumps(voice) + '\n'.join([rd('book.js')] + [rd(os.path.join('content', f)) for f in sorted(os.listdir(os.path.join(D, 'content'))) if f.endswith('.js')] + [rd(f) for f in ('scenes.js', 'icons.js', 'lab-data.js', 'app.js', 'tests.js', 'bridge-game.js', 'sandbox.js')])
probe = html.replace('{{JS}}', js)
meta_path = os.path.join(D, 'meta.json')
meta = json.load(open(meta_path, encoding='utf-8')) if os.path.exists(meta_path) else {'build': 1, 'app_hash': ''}
app_hash = __import__('hashlib').sha256(probe.encode()).hexdigest()[:16]
if not meta.get('app_hash'):
    meta['app_hash'] = app_hash
elif app_hash != meta.get('app_hash'):
    meta['build'] = int(meta.get('build', 0)) + 1
    meta['app_hash'] = app_hash
app = probe.replace('__F2_BUILD__', str(meta['build']))
assert not re.search(r'\{\{(F\d+|JS|I_[\w-]+)\}\}', app) and '__F2_BUILD__' not in app
open(os.path.join(OUT, 'index.html'), 'w', encoding='utf-8').write(app)
# база вопросов экзамена и рисунки к ним — из основного приложения
shutil.copy2(os.path.join(OLD, 'content.json'), OUT)
if os.path.exists(os.path.join(OUT, 'pics')): shutil.rmtree(os.path.join(OUT, 'pics'))
shutil.copytree(os.path.join(OLD, 'pics'), os.path.join(OUT, 'pics'))
os.makedirs(os.path.join(OUT, 'audio'), exist_ok=True)
shutil.copy2(os.path.join(OUT, '..', 'fizika-android', 'app', 'src', 'main', 'res', 'mipmap-xxxhdpi', 'ic_launcher.png'), os.path.join(OUT, 'icon-192.png'))
json.dump({'name': 'Физика: курс по учебнику', 'short_name': 'Физика', 'start_url': './', 'scope': './', 'display': 'standalone', 'background_color': '#0B1020', 'theme_color': '#0E1424', 'lang': 'ru',
           'icons': [{'src': 'icon-192.png', 'sizes': '192x192', 'type': 'image/png'}]}, open(os.path.join(OUT, 'manifest.webmanifest'), 'w', encoding='utf-8'), ensure_ascii=False)
ver = __import__('hashlib').sha256(app.encode()).hexdigest()[:10]
open(os.path.join(OUT, 'sw.js'), 'w').write("""const C='f2-%s';
self.addEventListener('install',e=>{e.waitUntil(caches.open(C).then(c=>c.addAll(['./','index.html','content.json'])).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==C).map(x=>caches.delete(x)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',e=>{const u=new URL(e.request.url);if(e.request.method!=='GET'||u.origin!==location.origin)return;
 if(/\\/(pics|audio)\\//.test(u.pathname)){e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request).then(res=>{if(res.ok){const c=res.clone();caches.open(C).then(k=>k.put(e.request,c))}return res})));return}
 e.respondWith(fetch(e.request).then(res=>{if(res.ok){const c=res.clone();caches.open(C).then(k=>k.put(e.request,c))}return res}).catch(()=>caches.match(e.request).then(r=>r||caches.match('index.html'))))});
""" % ver)
data_version = json.load(open(os.path.join(OUT, 'content.json'), encoding='utf-8')).get('v', 0)
json.dump({'build': meta['build'], 'data': data_version}, open(os.path.join(OUT, 'version.json'), 'w', encoding='utf-8'), ensure_ascii=False)
json.dump(meta, open(meta_path, 'w', encoding='utf-8'), ensure_ascii=False)
print('index.html', len(app.encode()) // 1024, 'КБ; сборка:', meta['build'], '; данные:', data_version, '; озвучка:', ', '.join(sorted(voice)) or 'нет')
