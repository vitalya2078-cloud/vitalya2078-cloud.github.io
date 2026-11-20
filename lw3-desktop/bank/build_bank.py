#!/usr/bin/env python3
"""Банк вопросов «Физпрактикума» (9 тем × 100 вопросов) → lw3-desktop/bank/bank.json + bank/img/.

Источник истины — «Вопросы и ответы.docx» (кафедральная версия: заменённые и исправленные вопросы).
Пояснения к старым вопросам и их варианты ответов берутся из базы сайта (fizika2/content.json), если вопрос
в документе не изменился. Недостающие варианты ответов и время на вопрос — в extra.json (составлены отдельно,
проверяются преподавателем по таблице «Банк вопросов — проверка.xlsx», которую тоже собирает этот скрипт).
Засчитывается ответ из ключа документа; спорные ключи отмечены (поле disp), в самопроверке выводится пояснение.

Запуск: python3 lw3-desktop/bank/build_bank.py
"""
import json, os, re, shutil, sys, zipfile
try:
    sys.stdout.reconfigure(encoding='utf-8')
except Exception:
    pass
import docx
from docx.oxml.ns import qn

D = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.normpath(os.path.join(D, '..', '..'))
SRC = os.path.join(D, 'Вопросы и ответы.docx')
SITE = json.load(open(os.path.join(ROOT, 'fizika2', 'content.json'), encoding='utf-8'))
EXTRA = json.load(open(os.path.join(D, 'extra.json'), encoding='utf-8')) if os.path.exists(os.path.join(D, 'extra.json')) else {}
TITLES = {t['id']: t['title'] for t in SITE['topics']}

norm = lambda s: re.sub(r'\s+', ' ', (s or '').replace(' ', ' ').replace('⁠', '').replace('\xa0', ' ')).strip()
key = lambda s: norm(s).lower().replace('ё', 'е')

# ---------- разбор документа ----------
doc = docx.Document(SRC)
rels = {r.rId: r.target_ref for r in doc.part.rels.values() if 'image' in r.reltype}
Q, cur, mode, topic = {}, None, None, 0
TOPIC_RE = re.compile(r'^([1-9])\.\s+(%s)\s*$' % '|'.join(re.escape(t) for t in TITLES.values()))
for p in doc.paragraphs:
    t = norm(p.text)
    imgs = [rels[b.get(qn('r:embed'))] for b in p._p.iter(qn('a:blip')) if b.get(qn('r:embed')) in rels]
    mt = TOPIC_RE.match(t)
    if mt:
        topic = int(mt.group(1)); cur = None; continue
    m = re.match(r'^(\d)\.(\d{1,3})\s+(.*)$', t)
    if topic and m and int(m.group(1)) == topic and 1 <= int(m.group(2)) <= 100:
        cur = {'id': f'{topic}.{int(m.group(2))}', 't': [m.group(3)], 'opts': [], 'bare': [], 'a': '', 'note': '', 'img': list(imgs)}
        Q[cur['id']] = cur; mode = 'q'; continue
    if cur is None:
        continue
    cur['img'] += imgs
    if t.startswith('Ответ:'):
        cur['a'] = t[6:].strip(); mode = 'a'; continue
    if t.startswith('//'):
        cur['note'] += t[2:].strip(); continue
    if not t:
        continue
    if mode in ('q', 'o'):
        mo = re.match(r'^(?:Варианты:\s*)?([1-9])\)\s*(.+)$', t)
        if mo:
            cur['opts'].append(mo.group(2)); mode = 'o'; continue
        if re.match(r'^[1-9]\.\s', t):                       # утверждения «1. …» — часть условия
            cur['t'].append(t); continue
        cur['bare'].append(t); continue
    if mode == 'a':
        cur['a'] += ' ' + t

def finish(q):
    bare = q.pop('bare')
    # короткие строки подряд перед ответом — варианты ответа без номеров (1,3 Н / 3,6 Н / …)
    if not q['opts'] and len(bare) >= 2 and all(len(b) <= 60 for b in bare):
        q['opts'] = bare
    else:
        q['t'] += bare
    a = q['a']
    q['broken'] = bool(re.search(r'рисунок[^)]*повреж', a))
    q['disp'] = bool(re.search(r'⚠\s*см\. спорные', a))
    a = re.sub(r'\(рисунок[^)]*\)', '', a); a = re.sub(r'⚠.*$', '', a)
    a = re.sub(r'\((?:ответ )?восстановлен[^)]*\)', '', a)
    q['a'] = norm(a)
    q['t'] = '\n'.join(norm(x) for x in q['t'])
    return q
for q in Q.values():
    finish(q)

# спорные ключи (таблицы в начале документа): № → как правильно
DISP = {}
for tb in doc.tables:
    for r in tb.rows[1:]:
        c = [norm(x.text) for x in r.cells]
        if re.match(r'^\d\.\d+$', c[0]):
            DISP[c[0]] = c[3]

# ---------- сведение с базой сайта ----------
def resolve(ans, opts):
    ka = key(ans)
    for o in opts:
        if key(o) == ka: return o
    if re.fullmatch(r'\d', ans) and 1 <= int(ans) <= len(opts): return opts[int(ans) - 1]
    for o in opts:
        if key(o).startswith(ka + ' '): return o
    return None

IMG_OUT = os.path.join(D, 'img'); shutil.rmtree(IMG_OUT, ignore_errors=True); os.makedirs(IMG_OUT)
zf = zipfile.ZipFile(SRC)
bank, report = [], []
for t in SITE['topics']:
    tid = t['id']
    for j, s in enumerate(t['q']):
        qid = f'{tid}.{j + 1}'; q = Q.get(qid)
        if not q: raise SystemExit('нет вопроса %s в документе' % qid)
        same = key(q['t'])[:70] == key(s['t'])[:70]
        ex = EXTRA.get(qid, {})
        src_opts = 'документ'
        if q['opts']:
            right = resolve(q['a'], q['opts'])
            if right is None: raise SystemExit('%s: ответ «%s» не найден среди вариантов %s' % (qid, q['a'], q['opts']))
            wrong = [o for o in q['opts'] if o != right]
        elif same and s.get('x') and key(q['a']) == key(s['a']):
            right, wrong, src_opts = s['a'], list(s['x']), 'база сайта'
        elif re.fullmatch(r'Вариант \d', q['a']):
            right = q['a']; wrong = [f'Вариант {i}' for i in range(1, 5) if f'Вариант {i}' != right]; src_opts = 'рисунок'
        else:
            right, wrong, src_opts = q['a'], [], ''
        if q['note'] and 'те же варианты' in q['note']:                       # «оставить те же варианты, как в моём тесте»
            base = ['не отклонится', 'отклонится вперёд', 'отклонится назад', 'отклонится перпендикулярно направлению движения']
            right = next(o for o in base if key(o) == key(q['a'])); wrong = [o for o in base if o != right]; src_opts = 'документ (как в тесте)'
        if ex.get('pic'):                                                       # варианты нарисованы на рисунке с номерами
            right = f"Вариант {ex['pic']}"; wrong = [f'Вариант {i}' for i in range(1, ex.get('n', 4) + 1) if i != ex['pic']]; src_opts = 'рисунок (номер проверен по рисунку)'
        elif ex.get('a'):
            right = ex['a']
        if ex.get('x') and len(wrong) < 3:
            wrong = (wrong + [x for x in ex['x'] if key(x) != key(right) and x not in wrong])[:max(3, len(wrong))]
            src_opts = (src_opts + ' + ' if src_opts else '') + 'составлены'
        # картинки: для неизменённых вопросов — из базы сайта, иначе — из документа
        pics = []
        if same and s.get('p') and os.path.exists(os.path.join(ROOT, 'fizika2', 'pics', s['p'])):
            ext = os.path.splitext(s['p'])[1]; name = f'q{tid}_{j + 1}{ext}'
            shutil.copy2(os.path.join(ROOT, 'fizika2', 'pics', s['p']), os.path.join(IMG_OUT, name)); pics.append(name)
        else:
            for i, m in enumerate(dict.fromkeys(q['img'])):
                ext = os.path.splitext(m)[1].lower(); name = f'q{tid}_{j + 1}{"_%d" % (i + 1) if i else ""}{ext}'
                with open(os.path.join(IMG_OUT, name), 'wb') as f: f.write(zf.read('word/' + m))
                pics.append(name)
        e = s.get('e') if same and key(q['a']) == key(s['a']) else None
        item = {'id': qid, 't': q['t'], 'a': right, 'x': wrong, 'p': pics, 'time': ex.get('time') or 0}
        if e: item['e'] = e
        if qid in DISP or q['disp']: item['disp'] = DISP.get(qid, '')
        if q['broken'] and not pics: item['broken'] = True
        bank.append(item)
        report.append({'id': qid, 'topic': TITLES[tid], 'changed': not same, 'src': src_opts, 'q': item})

# время на вопрос (мин): если не задано вручную — по виду вопроса
def auto_time(it):
    t = it['t'] + ' ' + it['a']
    calc = bool(re.search(r'\d+[.,]?\d*\s*(?:м|см|мм|км|с|мс|кг|г|Н|кН|Дж|кДж|МДж|Вт|кВт|В|кВ|мВ|А|мА|Ом|Тл|Гц|кГц|К|°|нм|мкм|эВ|МэВ|Па|кПа|атм|л)\b', t))
    if calc and re.search(r'определите|найдите|чему равн|рассчитайте|вычислите|какова|каков|сколько|во сколько', t, re.I): return 4 if len(it['t']) < 260 else 5
    if it['p'] or re.search(r'[=²³√∫·/]', it['a']) or len(it['t']) > 220: return 2 if len(it['t']) < 160 else 3
    return 1
for it in bank:
    if not it['time']: it['time'] = auto_time(it)
    it['time'] = max(1, min(5, int(it['time'])))

out = {'v': 1, 'source': os.path.basename(SRC), 'topics': [{'id': t['id'], 'title': t['title']} for t in SITE['topics']], 'q': bank}
json.dump(out, open(os.path.join(D, 'bank.json'), 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))

noopt = [it['id'] for it in bank if len(it['x']) < 2 and not it.get('broken')]
print('вопросов %d; изменено в документе %d; без вариантов %d; рисунков %d; спорных ключей %d; повреждённых рисунков %d'
      % (len(bank), sum(r['changed'] for r in report), len(noopt), len(os.listdir(IMG_OUT)), sum('disp' in b for b in bank), sum('broken' in b for b in bank)))

# ---------- таблица для проверки преподавателем ----------
from openpyxl import Workbook
from openpyxl.styles import Alignment, Font, PatternFill
wb = Workbook(); ws = wb.active; ws.title = 'Банк вопросов'
head = ['№', 'Тема', 'Вопрос', 'Правильный ответ (ключ)', 'Неверный 1', 'Неверный 2', 'Неверный 3', 'Время, мин', 'Варианты взяты', 'Рисунок', 'Пометки']
ws.append(head)
for c in ws[1]: c.font = Font(bold=True, color='FFFFFF'); c.fill = PatternFill('solid', fgColor='1B2A4A'); c.alignment = Alignment(wrap_text=True, vertical='center')
yellow = PatternFill('solid', fgColor='FFF4CC'); red = PatternFill('solid', fgColor='FBE3E1')
for r in report:
    it = r['q']; notes = []
    if r['changed']: notes.append('вопрос заменён в документе')
    if 'disp' in it: notes.append('спорный ключ' + (': правильно — ' + it['disp'] if it['disp'] else ''))
    if it.get('broken'): notes.append('рисунок повреждён — в тесты не попадает')
    ws.append([it['id'], r['topic'], it['t'], it['a'], *(it['x'] + ['', '', ''])[:3], it['time'], r['src'] or '—', ', '.join(it['p']) or '', '; '.join(notes)])
    row = ws.max_row
    if 'составлены' in (r['src'] or '') or 'рисунок' in (r['src'] or ''):
        for c in ws[row][4:7]: c.fill = yellow
    if it.get('broken') or 'disp' in it:
        ws[row][10].fill = red
for col, w in zip('ABCDEFGHIJK', [7, 22, 70, 32, 26, 26, 26, 10, 22, 14, 40]):
    ws.column_dimensions[col].width = w
for row in ws.iter_rows(min_row=2):
    for c in row: c.alignment = Alignment(wrap_text=True, vertical='top')
ws.freeze_panes = 'C2'; ws.auto_filter.ref = ws.dimensions
info = wb.create_sheet('Как проверять')
for line in ['Банк вопросов «Физпрактикума»: 9 тем × 100 вопросов (источник — «Вопросы и ответы.docx»).',
             'Жёлтым отмечены варианты, которые составлены при подготовке программы или взяты с рисунка (номер варианта на рисунке проверен вручную). Их нужно проверить.',
             'Красным — спорные ключи (засчитывается ответ ключа) и вопросы с повреждёнными рисунками (в тесты не попадают, пока рисунок не восстановлен).',
             '«Время, мин» — время на вопрос в экзамене (1–5 минут), расставлено по виду вопроса; можно исправить.',
             'Исправления присылайте этой же таблицей: программа пересобирает банк из документа и этих правок.']:
    info.append([line])
info.column_dimensions['A'].width = 140
wb.save(os.path.join(D, 'Банк вопросов — проверка.xlsx'))
print('таблица на проверку: Банк вопросов — проверка.xlsx')
