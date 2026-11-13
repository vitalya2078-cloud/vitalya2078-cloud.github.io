#!/usr/bin/env python3
"""Публикация сайта на зеркало GitVerse Pages (https://fizika.gitverse.site/).
Копирует в клон репозитория gitverse.ru/fizika/fizika только файлы сайта — без исходников
(GitVerse Pages запрещает .py, .zip, .exe), добавляет .nojekyll, коммитит и отправляет.
Запуск: python3 fizika/src/publish.py путь/к/клону-gitverse"""
import os, shutil, subprocess, sys
SITE = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
DST = os.path.abspath(sys.argv[1])
FILES = ['index.html', 'app.html', 'content.json', 'version.json', 'sw.js', 'manifest.webmanifest',
         'icon-192.png', 'icon-512.png', 'icon-maskable-512.png', 'apple-touch-icon.png', 'fizika.apk']
DIRS = ['pics', 'audio']
# убрать старые файлы сайта (кроме .git), затем скопировать свежие
for n in os.listdir(DST):
    if n == '.git': continue
    p = os.path.join(DST, n); shutil.rmtree(p) if os.path.isdir(p) else os.remove(p)
for f in FILES:
    if os.path.exists(os.path.join(SITE, f)): shutil.copy2(os.path.join(SITE, f), DST)
for d in DIRS:
    shutil.copytree(os.path.join(SITE, d), os.path.join(DST, d))
# пилот нового приложения по учебнику — в папку v2 (без исходников: GitVerse Pages запрещает .py)
F2 = os.path.normpath(os.path.join(SITE, '..', 'fizika2'))
if os.path.isdir(F2): shutil.copytree(F2, os.path.join(DST, 'v2'), ignore=shutil.ignore_patterns('src'))
# GitVerse не отдаёт большой index.html как главную страницу папки (/v2/ → «Страница не найдена»).
# Поэтому, как и в корне сайта: приложение — v2/app.html, а v2/index.html — маленький загрузчик.
V2 = os.path.join(DST, 'v2')
if os.path.isdir(V2):
    os.replace(os.path.join(V2, 'index.html'), os.path.join(V2, 'app.html'))
    open(os.path.join(V2, 'index.html'), 'w', encoding='utf-8').write("""<!doctype html>
<html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="theme-color" content="#0B1020"><title>Физика: курс по учебнику</title><link rel="manifest" href="manifest.webmanifest"><link rel="icon" href="icon-192.png">
<style>html,body{margin:0;height:100%;background:#0B1020;color:#8D97B5;font:16px system-ui,sans-serif}p{text-align:center;padding:40vh 24px 0}</style>
<script>
/* Загрузчик: открывает приложение app.html (свежее с сервера, без сети — из офлайн-кеша). */
(function () {
  function show(h) { document.open(); document.write(h); document.close(); }
  function fail() { document.body.innerHTML = '<p>Не удалось открыть приложение. Проверь интернет и попробуй ещё раз.</p>'; }
  function cached() { return window.caches ? caches.match('app.html').then(function (r) { if (!r) throw 0; return r.text(); }) : Promise.reject(); }
  addEventListener('DOMContentLoaded', function () {
    fetch('app.html', { cache: 'no-cache' }).then(function (r) { if (!r.ok) throw 0; return r.text(); }).catch(cached).then(show).catch(fail);
  });
})();
</script></head><body><p>Загрузка…</p></body></html>
""")
open(os.path.join(DST, '.nojekyll'), 'w').close()
open(os.path.join(DST, 'README.md'), 'w', encoding='utf-8').write(
    '# Физика: ответы и тесты\n\nЗеркало сайта https://fizika.gitverse.site/ (доступно из России без VPN).\n'
    'Исходники: https://github.com/vitalya2078-cloud/vitalya2078-cloud.github.io (папка fizika).\n')
bad = [os.path.join(r, f) for r, _, fs in os.walk(DST) if '.git' not in r for f in fs if f.endswith(('.py', '.zip', '.exe'))]
assert not bad, bad
run = lambda *a: subprocess.run(a, cwd=DST, check=True)
run('git', 'add', '-A')
if subprocess.run(['git', 'diff', '--cached', '--quiet'], cwd=DST).returncode:
    v = open(os.path.join(SITE, 'version.json'), encoding='utf-8').read()
    run('git', '-c', 'user.name=fizika', '-c', 'user.email=fizika@users.noreply.gitverse.ru', 'commit', '-q', '-m', 'Публикация сайта: ' + v[:80])
    for i in range(4):
        if subprocess.run(['git', 'push', '-q', 'origin', 'HEAD'], cwd=DST, env={**os.environ, 'GIT_TERMINAL_PROMPT': '0'}).returncode == 0:
            print('опубликовано на GitVerse'); break
        import time; time.sleep(2 ** (i + 1))
    else: sys.exit('не удалось отправить на GitVerse')
else:
    print('изменений нет')
