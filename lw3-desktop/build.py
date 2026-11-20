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
# ЛР 1 и ЛР 2 — модули сайта целиком (там же LW_LIST, lwNum, lwGauss, lwShuf, lwMsg, LAB_DEPT)
helpers = '\n'.join([take(app_js, n) for n in ('$', 'esc', 'f1')] + [lab_js, rd(os.path.join(SITE, 'labwork2.js'))])
icons = rd(os.path.join(SITE, 'icons.js'))
core = rd(os.path.join(SITE, 'lw3-core.js'))
# стили бланка отчёта — те же, что на сайте (правила .lwp / .lwr)
report_css = '\n'.join(l for l in shell.split('\n') if re.match(r'\.lw(p|r)\b', l))
# экраны ЛР 1 и ЛР 2 (подготовка, опыты, обработка) — стили сайта; цвета берутся из темы программы
LAB_CSS_RE = r'(\.lw-(pucks|row|ta|hint|screw|scroll|tbl|res|aim|arrows|ctl|ctl-row|who|stage|cond|intro)\b|\.lwi\b|\.lp-btn\b|\.seg\b|\.l2-cal\b|#lw-cv\b|#l2-cv\b)'
report_css += '\n' + '\n'.join(l for l in shell.split('\n') if re.match(LAB_CSS_RE, l))

meta = json.loads(rd(os.path.join(D, 'src-tauri', 'tauri.conf.json')))
version = meta['version']
# фон установки (необязательно): assets/lab-bg.(webp|jpg|png) → dist/img/; без файла сцена рисует фон сама
bg = next((f for f in ('lab-bg.webp', 'lab-bg.jpg', 'lab-bg.png') if os.path.exists(os.path.join(D, 'assets', f))), None)
bgl = next((f for f in ('lab-bg-light.webp', 'lab-bg-light.jpg', 'lab-bg-light.png') if os.path.exists(os.path.join(D, 'assets', f))), None)
def bg_cfg(f, meta):
    m = os.path.join(D, 'assets', meta)
    return dict(json.loads(rd(m)) if os.path.exists(m) else {}, src='img/' + f) if f else None
js = '\n'.join(['const APP_VER = %s;' % json.dumps(version), 'const LAB_BG = %s;' % json.dumps(bg_cfg(bg, 'lab-bg.json'), ensure_ascii=False),
                'const LAB_BG_LIGHT = %s;' % json.dumps(bg_cfg(bgl, 'lab-bg-light.json'), ensure_ascii=False),
                'const LAB_BG2 = %s;' % json.dumps(bg_cfg('lab-bg2.webp', 'lab-bg2.json'), ensure_ascii=False),
                'const LAB_BG2_LIGHT = %s;' % json.dumps(bg_cfg('lab-bg2-light.webp', 'lab-bg2-light.json'), ensure_ascii=False), helpers, icons, core] +
               [rd(os.path.join(D, 'src', f)) for f in ('sha256.js', 'result.js', 'hints.js', 'summary-core.js', 'desktop.js', 'layout2.js', 'hod.js', 'extras.js', 'summary.js', 'labs-core.js', 'labs-e.js', 'le4.js', 'le5.js', 'le6.js', 'le7.js', 'le8.js', 'app-core.js', 'labs.js', 'teacher.js')])
html = rd(os.path.join(D, 'src', 'shell.html')).replace('/*{{REPORT_CSS}}*/', report_css + '\n' + rd(os.path.join(D, 'src', 'app.css'))).replace('{{JS}}', js.replace('</script', '<\\/script'))
assert not re.search(r'\{\{[A-Z_]+\}\}', html), 'остались незаполненные метки'

if os.path.exists(DIST):
    shutil.rmtree(DIST)
os.makedirs(os.path.join(DIST, 'fonts'))
for w in ('400', '600', '700'):
    shutil.copy2(os.path.join(OLD, 'g%s.woff2' % w), os.path.join(DIST, 'fonts', 'golos-%s.woff2' % w))
for f in os.listdir(os.path.join(SITE, 'fonts')):
    if f.endswith('.woff2') or f.startswith('LICENSE'):
        shutil.copy2(os.path.join(SITE, 'fonts', f), os.path.join(DIST, 'fonts', f))
for f in (bg, bgl, 'lab-bg2.webp', 'lab-bg2-light.webp'):
    if f:
        os.makedirs(os.path.join(DIST, 'img'), exist_ok=True)
        shutil.copy2(os.path.join(D, 'assets', f), os.path.join(DIST, 'img', f))
# приборы установки (необязательно): assets/parts/*.webp → dist/img/parts/; без файла прибор рисуется кодом
# обложки лабораторных (assets/covers) и банк вопросов (bank/bank.json + bank/img) — в dist
COV = os.path.join(D, 'assets', 'covers')
if os.path.isdir(COV):
    shutil.copytree(COV, os.path.join(DIST, 'img', 'covers'), dirs_exist_ok=True)
BANK_DIR = os.path.join(D, 'bank')
shutil.rmtree(os.path.join(DIST, 'bank'), ignore_errors=True)
os.makedirs(os.path.join(DIST, 'bank'))
shutil.copy2(os.path.join(BANK_DIR, 'bank.json'), os.path.join(DIST, 'bank', 'bank.json'))
shutil.copytree(os.path.join(BANK_DIR, 'img'), os.path.join(DIST, 'bank', 'img'))
PARTS = os.path.join(D, 'assets', 'parts')
if os.path.isdir(PARTS):
    os.makedirs(os.path.join(DIST, 'img', 'parts'), exist_ok=True)
    for f in os.listdir(PARTS):
        if f.endswith('.webp'): shutil.copy2(os.path.join(PARTS, f), os.path.join(DIST, 'img', 'parts', f))
with open(os.path.join(DIST, 'index.html'), 'w', encoding='utf-8') as f:
    f.write(html)
print('dist/index.html %d КБ, версия %s, фон: %s / %s' % (len(html.encode()) // 1024, version, bg or 'рисованный', bgl or 'рисованный'))
