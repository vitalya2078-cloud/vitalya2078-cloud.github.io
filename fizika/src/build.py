#!/usr/bin/env python3
"""Сборка fizika/index.html из исходников src/ (один файл: данные, рисунки, шрифты, код).
Запуск: python3 fizika/src/build.py"""
import base64, json, os
D = os.path.dirname(os.path.abspath(__file__))
rd = lambda n, m='r': open(os.path.join(D, n), m, **({} if 'b' in m else {'encoding': 'utf-8'})).read()
safe = lambda s: s.replace('</', '<\\/')  # нельзя закрыть <script> изнутри данных
# Какие темы попадают в приложение (номера тем). Пока только «Механика»; добавить тему — дописать номер.
TOPICS = [1]
topics = [t for t in json.loads(rd('data.json')) if t['id'] in TOPICS]
used = {q['p'] for t in topics for q in t['q'] if q['p']}
data = json.dumps(topics, ensure_ascii=False, separators=(',', ':'))
pics = json.dumps({k: v for k, v in json.loads(rd('pics.json')).items() if k in used}, separators=(',', ':'))
html = rd('shell.html')
for w in ('400', '600', '700'):
    html = html.replace('{{F%s}}' % w, base64.b64encode(rd('g%s.woff2' % w, 'rb')).decode())
html = html.replace('{{DATA}}', f'<script id="data" type="application/json">{safe(data)}</script>\n<script id="pics" type="application/json">{safe(pics)}</script>\n')
html = html.replace('{{JS}}', rd('app.js'))
assert '{{' not in html
out = os.path.join(D, '..', 'index.html')
open(out, 'w', encoding='utf-8').write(html)
print('index.html:', len(html.encode()) // 1024, 'КБ')
