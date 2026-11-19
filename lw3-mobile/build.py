#!/usr/bin/env python3
"""Сборка интерфейса «Показатель адиабаты» для Android: www/index.html + шрифты + картинки.

Работа (модель, вопросы, расчёты, отчёт) — fizika2/src/lw3-core.js, тот же файл, что на сайте и
в программе для Windows/Linux. Файл работы с подписью, подсказки и сводка для защиты — общие
файлы из lw3-desktop/src. Шрифты и картинки установки берутся из сборки программы для компьютера
(сначала запускается lw3-desktop/build.py). Оболочка под телефон — src/mobile.html и src/mobile.js.

Версия — общая со всеми программами (lw3-desktop/src-tauri/tauri.conf.json); она же
записывается в android/app/build.gradle (versionName, versionCode).

Запуск: python3 lw3-mobile/build.py
"""
import json, os, re, shutil, subprocess, sys

try:
    sys.stdout.reconfigure(encoding='utf-8')
except Exception:
    pass

D = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.normpath(os.path.join(D, '..'))
SITE = os.path.join(ROOT, 'fizika2', 'src')
DESK = os.path.join(ROOT, 'lw3-desktop')
WWW = os.path.join(D, 'www')


def rd(path):
    with open(path, encoding='utf-8') as f:
        return f.read()


def take(src, name):
    m = re.search(r'^(?:const %s = .*|function %s\(.*)$' % (re.escape(name), re.escape(name)), src, re.M)
    if not m:
        raise SystemExit('не найдено объявление %s' % name)
    return m.group(0)


subprocess.run([sys.executable, os.path.join(DESK, 'build.py')], check=True, stdout=subprocess.DEVNULL)

app_js, lab_js, site_shell = rd(os.path.join(SITE, 'app.js')), rd(os.path.join(SITE, 'labwork.js')), rd(os.path.join(SITE, 'shell.html'))
lw_list = re.search(r'^const LW_LIST = \[.*?^\];', lab_js, re.M | re.S).group(0)
helpers = '\n'.join([take(app_js, n) for n in ('$', 'esc', 'f1')] + [lw_list] + [take(lab_js, n) for n in ('lwNum', 'lwGauss', 'lwShuf', 'lwMsg')])
report_css = '\n'.join(l for l in site_shell.split('\n') if re.match(r'\.lw(p|r)\b', l))
desk_shell = rd(os.path.join(DESK, 'src', 'shell.html'))
fonts = '\n'.join(l for l in desk_shell.split('\n') if l.startswith('@font-face'))
hod = re.search(r'^const HOD = \[.*?^\];', rd(os.path.join(DESK, 'src', 'hod.js')), re.M | re.S).group(0)

version = json.loads(rd(os.path.join(DESK, 'src-tauri', 'tauri.conf.json')))['version']


def bg_cfg(f, meta):
    if not os.path.exists(os.path.join(DESK, 'assets', f)):
        return None
    m = os.path.join(DESK, 'assets', meta)
    return dict(json.loads(rd(m)) if os.path.exists(m) else {}, src='img/' + f)


js = '\n'.join(['const APP_VER = %s;' % json.dumps(version),
                'const LAB_BG = %s;' % json.dumps(bg_cfg('lab-bg.webp', 'lab-bg.json'), ensure_ascii=False),
                'const LAB_BG_LIGHT = %s;' % json.dumps(bg_cfg('lab-bg-light.webp', 'lab-bg-light.json'), ensure_ascii=False),
                helpers, rd(os.path.join(SITE, 'icons.js')), rd(os.path.join(SITE, 'lw3-core.js')), hod] +
               [rd(os.path.join(DESK, 'src', f)) for f in ('sha256.js', 'result.js', 'hints.js', 'summary-core.js')] +
               [rd(os.path.join(D, 'src', 'mobile.js'))])
html = (rd(os.path.join(D, 'src', 'mobile.html')).replace('/*{{FONTS}}*/', fonts).replace('/*{{REPORT_CSS}}*/', report_css)
        .replace('{{JS}}', js.replace('</script', '<\\/script')))
assert not re.search(r'\{\{[A-Z_]+\}\}', html), 'остались незаполненные метки'

if os.path.exists(WWW):
    shutil.rmtree(WWW)
os.makedirs(WWW)
with open(os.path.join(WWW, 'index.html'), 'w', encoding='utf-8') as f:
    f.write(html)
for sub in ('fonts', 'img'):
    src = os.path.join(DESK, 'dist', sub)
    if os.path.isdir(src):
        shutil.copytree(src, os.path.join(WWW, sub))

# версия приложения Android: 1.6.0 → versionName "1.6.0", versionCode 10600
gradle = os.path.join(D, 'android', 'app', 'build.gradle')
if os.path.exists(gradle):
    a, b, c = (int(x) for x in version.split('.'))
    g = rd(gradle)
    g2 = re.sub(r'versionCode \d+', 'versionCode %d' % (a * 10000 + b * 100 + c), g)
    g2 = re.sub(r'versionName "[^"]*"', 'versionName "%s"' % version, g2)
    if g2 != g:
        with open(gradle, 'w', encoding='utf-8') as f:
            f.write(g2)

print('www/index.html %d КБ, версия %s' % (len(html.encode('utf-8')) // 1024, version))
