#!/usr/bin/env python3
"""Сборка интерфейса программы «ЛР № 3» для Windows: dist/index.html + dist/fonts/.

Сама работа (модель установки, вопросы, расчёты и проверки, действия, отчёт) берётся без
изменений из fizika2/src/lw3-core.js — того же файла, что и на сайте. Общие помощники
($, esc, f1, lwNum, lwGauss, lwShuf, lwMsg, LW_LIST, значки) вырезаются из исходников сайта,
чтобы не держать копий. Оболочка программы — src/shell.html и src/*.js.

Запуск: python3 lw3-desktop/build.py
"""
import json, os, re, shutil
import sys

try:   # консоль Windows в CI (cp1252) не печатает кириллицу
    sys.stdout.reconfigure(encoding='utf-8')
except Exception:
    pass

D = os.path.dirname(os.path.abspath(__file__))
SITE = os.path.normpath(os.path.join(D, '..', 'fizika2', 'src'))
OLD = os.path.normpath(os.path.join(D, '..', 'fizika', 'src'))
DIST = os.path.join(D, 'dist')


def rd(path):
    with open(path, encoding='utf-8') as f:
        return f.read()


def take(src, name):
    """Однострочное объявление `const name = …` / `function name(…) {…}` из исходника сайта."""
    m = re.search(r'^(?:const %s = .*|function %s\(.*)$' % (re.escape(name), re.escape(name)), src, re.M)
    if not m:
        raise SystemExit('не найдено объявление %s' % name)
    return m.group(0)


app_js, lab_js, shell = rd(os.path.join(SITE, 'app.js')), rd(os.path.join(SITE, 'labwork.js')), rd(os.path.join(SITE, 'shell.html'))
lw_list = re.search(r'^const LW_LIST = \[.*?^\];', lab_js, re.M | re.S).group(0)
helpers = '\n'.join([take(app_js, n) for n in ('$', 'esc', 'f1')] + [lw_list] + [take(lab_js, n) for n in ('lwNum', 'lwGauss', 'lwShuf', 'lwMsg')])
icons = rd(os.path.join(SITE, 'icons.js'))
core = rd(os.path.join(SITE, 'lw3-core.js'))
# стили бланка отчёта — те же, что на сайте (правила .lwp / .lwr)
report_css = '\n'.join(l for l in shell.split('\n') if re.match(r'\.lw(p|r)\b', l))

meta = json.loads(rd(os.path.join(D, 'src-tauri', 'tauri.conf.json')))
version = meta['version']
# фон установки (необязательно): assets/lab-bg.(webp|jpg|png) → dist/img/; без файла сцена рисует фон сама
bg = next((f for f in ('lab-bg.webp', 'lab-bg.jpg', 'lab-bg.png') if os.path.exists(os.path.join(D, 'assets', f))), None)
js = '\n'.join(['const APP_VER = %s;' % json.dumps(version), 'const LAB_BG = %s;' % json.dumps(dict(json.loads(rd(os.path.join(D, 'assets', 'lab-bg.json'))) if os.path.exists(os.path.join(D, 'assets', 'lab-bg.json')) else {}, src='img/' + bg) if bg else None, ensure_ascii=False), helpers, icons, core] +
               [rd(os.path.join(D, 'src', f)) for f in ('sha256.js', 'desktop.js', 'teacher.js')])
html = rd(os.path.join(D, 'src', 'shell.html')).replace('/*{{REPORT_CSS}}*/', report_css).replace('{{JS}}', js.replace('</script', '<\\/script'))
assert not re.search(r'\{\{[A-Z_]+\}\}', html), 'остались незаполненные метки'

if os.path.exists(DIST):
    shutil.rmtree(DIST)
os.makedirs(os.path.join(DIST, 'fonts'))
for w in ('400', '600', '700'):
    shutil.copy2(os.path.join(OLD, 'g%s.woff2' % w), os.path.join(DIST, 'fonts', 'golos-%s.woff2' % w))
for f in os.listdir(os.path.join(SITE, 'fonts')):
    if f.endswith('.woff2') or f.startswith('LICENSE'):
        shutil.copy2(os.path.join(SITE, 'fonts', f), os.path.join(DIST, 'fonts', f))
if bg:
    os.makedirs(os.path.join(DIST, 'img'))
    shutil.copy2(os.path.join(D, 'assets', bg), os.path.join(DIST, 'img', bg))
with open(os.path.join(DIST, 'index.html'), 'w', encoding='utf-8') as f:
    f.write(html)
print('dist/index.html %d КБ, версия %s, фон: %s' % (len(html.encode()) // 1024, version, bg or 'рисованный'))
