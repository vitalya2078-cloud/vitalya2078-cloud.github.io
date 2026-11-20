#!/usr/bin/env python3
"""«Физпрактикум» для iPhone и iPad: веб-приложение (PWA) с экрана «Домой».

Тот же интерфейс под телефон, что в APK для Android (lw3-mobile/www, собирает build.py), плюс:
manifest, значки, service worker (работа без интернета), метатеги iOS. Результат — папка fizpraktikum/
в корне репозитория; GitHub Pages публикует её по адресу https://vitalya2078-cloud.github.io/fizpraktikum/
Установка на iPhone: открыть адрес в Safari → «Поделиться» → «На экран „Домой“».

Почему не приложение из App Store: для этого нужна платная программа разработчиков Apple (99 $ в год)
и Mac или облачная сборка с сертификатами; веб-приложение бесплатно и обновляется само.

Запуск: python3 lw3-mobile/build_ios.py
"""
import hashlib, json, os, re, shutil, subprocess, sys

try:
    sys.stdout.reconfigure(encoding='utf-8')
except Exception:
    pass

D = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.normpath(os.path.join(D, '..'))
WWW = os.path.join(D, 'www')
OUT = os.path.join(ROOT, 'fizpraktikum')

subprocess.run([sys.executable, os.path.join(D, 'build.py')], check=True, stdout=subprocess.DEVNULL)
version = json.load(open(os.path.join(D, 'package.json'), encoding='utf-8'))['version']

html = open(os.path.join(WWW, 'index.html'), encoding='utf-8').read()
assert html.count('const PWA = false;') == 1, 'нет флага PWA в сборке'
html = html.replace('const PWA = false;', 'const PWA = true;')
HEAD = '''<link rel="manifest" href="manifest.webmanifest">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="default">
<meta name="apple-mobile-web-app-title" content="Физпрактикум">
<meta name="format-detection" content="telephone=no">
<meta name="theme-color" content="#F3F5F9" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#0E1A2B" media="(prefers-color-scheme: dark)">
<link rel="apple-touch-icon" href="icons/apple-touch-icon.png">
<link rel="icon" type="image/png" sizes="192x192" href="icons/icon-192.png">
'''
m = re.search(r'<meta name="viewport"[^>]*>\n', html)
assert m, 'нет viewport'
html = html[:m.end()] + HEAD + html[m.end():]

if os.path.exists(OUT):
    shutil.rmtree(OUT)
os.makedirs(os.path.join(OUT, 'icons'))
for sub in ('img', 'fonts', 'bank'):
    if os.path.isdir(os.path.join(WWW, sub)):
        shutil.copytree(os.path.join(WWW, sub), os.path.join(OUT, sub))
with open(os.path.join(OUT, 'index.html'), 'w', encoding='utf-8') as f:
    f.write(html)

# значки: квадрат без прозрачности (скругление iOS делает сама)
from PIL import Image
src = Image.open(os.path.join(D, 'icon-ios-1024.png')).convert('RGB')
for name, size in (('apple-touch-icon.png', 180), ('icon-192.png', 192), ('icon-512.png', 512)):
    src.resize((size, size), Image.LANCZOS).save(os.path.join(OUT, 'icons', name), optimize=True)

manifest = {
    'name': 'Физпрактикум', 'short_name': 'Физпрактикум', 'lang': 'ru', 'dir': 'ltr',
    'description': 'Виртуальный лабораторный практикум по физике: 8 лабораторных работ по методичке кафедры.',
    'start_url': './', 'scope': './', 'display': 'standalone', 'orientation': 'portrait',
    'background_color': '#F3F5F9', 'theme_color': '#F3F5F9',
    'icons': [{'src': 'icons/icon-192.png', 'sizes': '192x192', 'type': 'image/png', 'purpose': 'any'},
              {'src': 'icons/icon-512.png', 'sizes': '512x512', 'type': 'image/png', 'purpose': 'any'},
              {'src': 'icons/icon-512.png', 'sizes': '512x512', 'type': 'image/png', 'purpose': 'maskable'}]
}
with open(os.path.join(OUT, 'manifest.webmanifest'), 'w', encoding='utf-8') as f:
    json.dump(manifest, f, ensure_ascii=False, indent=1)

# service worker: всё приложение кэшируется при установке; страница — сначала из сети (обновления), без сети — из кэша
files = []
for base, _, names in os.walk(OUT):
    for n in sorted(names):
        rel = os.path.relpath(os.path.join(base, n), OUT).replace(os.sep, '/')
        if rel not in ('sw.js',) and not rel.startswith('fonts/LICENSE'):
            files.append(rel)
files.sort()
h = hashlib.sha256()
for rel in files:
    h.update(rel.encode()); h.update(open(os.path.join(OUT, rel), 'rb').read())
cache = 'fizpraktikum-%s-%s' % (version, h.hexdigest()[:10])
sw = '''/* «Физпрактикум» для iPhone: работа без интернета. Собирается lw3-mobile/build_ios.py — не править вручную. */
const CACHE = %s;
const FILES = %s;
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
''' % (json.dumps(cache), json.dumps(files, ensure_ascii=False))
with open(os.path.join(OUT, 'sw.js'), 'w', encoding='utf-8') as f:
    f.write(sw)

size = sum(os.path.getsize(os.path.join(OUT, x)) for x in files) // 1024
print('fizpraktikum/: %d файлов, %d КБ, версия %s, кэш %s' % (len(files) + 1, size, version, cache))
