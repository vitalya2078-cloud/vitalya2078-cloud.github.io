#!/usr/bin/env python3
"""Сборка сайта fizika/ из исходников src/.
Результат: index.html (загрузчик), app.html (интерфейс), content.json (вопросы), pics/ (рисунки),
version.json (номера версий для онлайн-обновлений), sw.js (офлайн-кэш).
Номера сборки и данных увеличиваются сами, если интерфейс или вопросы изменились.
Запуск: python3 fizika/src/build.py"""
import base64, hashlib, json, os, re
D = os.path.dirname(os.path.abspath(__file__)); OUT = os.path.normpath(os.path.join(D, '..'))
rd = lambda n, b=False: open(os.path.join(D, n), 'rb' if b else 'r', **({} if b else {'encoding': 'utf-8'})).read()
h8 = lambda s: hashlib.sha256(s.encode() if isinstance(s, str) else s).hexdigest()[:16]
meta = json.loads(rd('meta.json'))

# вопросы и рисунки
topics = json.loads(rd('data.json'))
_ai = os.path.join(OUT, 'audio', 'index.json')
AUDIO = json.load(open(_ai, encoding='utf-8')) if os.path.exists(_ai) else {}
# обучение: конспект, пары, утверждения для игр — src/learn/<номер темы>.json
for t in topics:
    f = os.path.join(D, 'learn', '%d.json' % t['id'])
    if os.path.exists(f):
        L = json.load(open(f, encoding='utf-8'))
        for n in L['notes']:  # озвучка лекции, если файл сгенерирован (src/tts.py)
            a = AUDIO.get('%d-%s.mp3' % (t['id'], n['id']))
            if a: n['audio'] = {'file': '%d-%s.mp3' % (t['id'], n['id']), 'dur': a['dur']}
        t['learn'] = L
pics = json.loads(rd('pics.json'))
used = sorted({q['p'] for t in topics for q in t['q'] if q.get('p')})
os.makedirs(os.path.join(OUT, 'pics'), exist_ok=True)
for name in used:
    open(os.path.join(OUT, 'pics', name), 'wb').write(base64.b64decode(pics[name].split(',', 1)[1]))
for f in os.listdir(os.path.join(OUT, 'pics')):
    if f not in used: os.remove(os.path.join(OUT, 'pics', f))
body = json.dumps(topics, ensure_ascii=False, separators=(',', ':'), sort_keys=True)
if h8(body) != meta['data_hash']: meta['data'] += 1; meta['data_hash'] = h8(body)
content = {'v': meta['data'], 'topics': topics}
open(os.path.join(OUT, 'content.json'), 'w', encoding='utf-8').write(json.dumps(content, ensure_ascii=False, separators=(',', ':')))

# интерфейс
html = rd('shell.html')
for w in ('400', '600', '700'): html = html.replace('{{F%s}}' % w, base64.b64encode(rd('g%s.woff2' % w, True)).decode())
js = rd('app.js') + '\n' + rd('learn.js') + '\n' + rd('lucide.js') + '\n' + rd('ui.js')
# картинки интерфейса (src/ui/*.webp) — вшиваются в сборку, чтобы работать без интернета и приходить обновлением
UI = {f[:-5]: 'data:image/webp;base64,' + base64.b64encode(rd(os.path.join('ui', f), True)).decode() for f in sorted(os.listdir(os.path.join(D, 'ui'))) if f.endswith('.webp')}
js = js.replace('{{UI}}', json.dumps(UI, separators=(',', ':')))
probe = html.replace('{{JS}}', js)
if h8(probe) != meta['app_hash']: meta['build'] += 1; meta['app_hash'] = h8(probe)
app = probe.replace('const APP_BUILD = __BUILD__;', 'const APP_BUILD = %d;' % meta['build'])
assert not re.search(r'\{\{(F\d+|JS)\}\}', app) and '__BUILD__' not in app
open(os.path.join(OUT, 'app.html'), 'w', encoding='utf-8').write(app)
open(os.path.join(OUT, 'index.html'), 'w', encoding='utf-8').write(rd('boot.html').replace('__BUILD__', str(meta['build'])))

# версия Android-приложения — из fizika-android/app/build.gradle
g = open(os.path.join(OUT, '..', 'fizika-android', 'app', 'build.gradle'), encoding='utf-8').read()
apk = {'code': int(re.search(r'versionCode (\d+)', g).group(1)), 'name': re.search(r"versionName '([^']+)'", g).group(1),
       'url': 'https://fizika.gitverse.site/fizika.apk'}  # GitVerse открывается в России без VPN
json.dump({'build': meta['build'], 'data': meta['data'], 'apk': apk, 'notes': meta.get('notes', '')}, open(os.path.join(OUT, 'version.json'), 'w'), ensure_ascii=False)

# офлайн-кэш для сайта
files = ['./', 'index.html', 'app.html', 'content.json', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png', 'icon-maskable-512.png', 'apple-touch-icon.png'] + ['pics/' + p for p in used]
sw = rd('sw.template.js').replace('__CACHE__', 'fizika-%d-%d' % (meta['build'], meta['data'])).replace('__FILES__', json.dumps(files, ensure_ascii=False))
open(os.path.join(OUT, 'sw.js'), 'w', encoding='utf-8').write(sw)
json.dump(meta, open(os.path.join(D, 'meta.json'), 'w'))
print('сборка', meta['build'], '| вопросы', meta['data'], '| app.html', len(app.encode()) // 1024, 'КБ | content.json', os.path.getsize(os.path.join(OUT, 'content.json')) // 1024, 'КБ | рисунков', len(used))
