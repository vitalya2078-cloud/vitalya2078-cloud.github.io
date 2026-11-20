# Конспекты «Физпрактикума»: notes/*.md → notes.json (HTML + оглавление + указатель для поиска).
# Разметка: «# Заголовок» (первая строка), «## Раздел», «### Подраздел», абзацы, списки «- » и «1. »,
# таблицы «| … |», врезки «> » (определение, важно), формулы $…$ и $$…$$ (рисует KaTeX в программе),
# **термин** — жирный и попадает в указатель терминов, *курсив*.
# Файлы: t1…t9.md — темы курса (номер темы банка вопросов), l1…l8.md — лабораторные работы.
import html, json, os, re

INLINE = re.compile(r'\$([^$]+)\$')


def esc(s):
    return html.escape(s, quote=False)


def inline(s, terms):
    out, pos = [], 0
    for m in INLINE.finditer(s):
        out.append(('t', s[pos:m.start()]))
        out.append(('m', m.group(1)))
        pos = m.end()
    out.append(('t', s[pos:]))
    res = []
    for kind, v in out:
        if kind == 'm':
            res.append('<span class="tx" data-t="%s">%s</span>' % (html.escape(v.strip(), quote=True), esc(v.strip())))
            continue
        v = esc(v)

        def bold(m):
            terms.append(re.sub(r'<[^>]+>', '', m.group(1)))
            return '<b>%s</b>' % m.group(1)
        v = re.sub(r'\*\*(.+?)\*\*', bold, v)
        v = re.sub(r'(?<![\w*])\*(?!\s)(.+?)(?<!\s)\*(?![\w*])', r'<i>\1</i>', v)
        res.append(v)
    return ''.join(res)


def plain(s):
    s = re.sub(r'\$\$?([^$]+)\$\$?', lambda m: ' ' + re.sub(r'\\[a-zA-Z]+|[{}^_\\]', ' ', m.group(1)) + ' ', s)
    s = re.sub(r'[*>|#]', ' ', s)
    return re.sub(r'\s+', ' ', s).strip()


BOX = {'Определение': 'def', 'Закон': 'law', 'Важно': 'warn', 'Пример': 'ex', 'Запомни': 'warn'}


def parse(path, nid):
    lines = open(path, encoding='utf-8').read().replace('\r', '').split('\n')
    assert lines[0].startswith('# '), path + ': первая строка — «# Заголовок»'
    title = lines[0][2:].strip()
    terms, secs, idx = [], [], []
    out, i, n = [], 1, len(lines)
    cur = {'id': '', 'h': title, 'text': []}

    def flush_sec():
        if cur['text']:
            idx.append({'s': cur['id'], 'h': cur['h'], 't': plain(' '.join(cur['text']))[:4000]})

    while i < n:
        ln = lines[i]
        st = ln.strip()
        if not st:
            i += 1
            continue
        if st.startswith('## ') or st.startswith('### '):
            lvl = 2 if st.startswith('## ') else 3
            h = st[lvl + 1:].strip()
            sid = '%s-%d' % (nid, len(secs) + 1)
            secs.append({'id': sid, 'h': h, 'l': lvl})
            if lvl == 2:
                flush_sec()
                cur = {'id': sid, 'h': h, 'text': []}
            else:
                cur['text'].append(h)
            out.append('<h%d id="%s">%s</h%d>' % (lvl, sid, inline(h, terms), lvl))
            i += 1
            continue
        if st.startswith('$$'):
            body = st[2:]
            if body.endswith('$$') and len(body) >= 2:
                tex = body[:-2]
                i += 1
            else:
                buf = [body]
                i += 1
                while i < n and not lines[i].strip().endswith('$$'):
                    buf.append(lines[i])
                    i += 1
                buf.append(lines[i].strip()[:-2])
                i += 1
                tex = '\n'.join(buf)
            tex = tex.strip()
            cur['text'].append('$' + tex + '$')
            out.append('<div class="tx d" data-t="%s">%s</div>' % (html.escape(tex, quote=True), esc(tex)))
            continue
        if st.startswith('>'):
            buf = []
            while i < n and lines[i].strip().startswith('>'):
                buf.append(lines[i].strip()[1:].strip())
                i += 1
            text = ' '.join(buf)
            m = re.match(r'\*\*([А-ЯЁа-яё]+)', text)
            cls = BOX.get(m.group(1), 'def') if m else 'def'
            cur['text'].append(text)
            out.append('<div class="nb %s"><p>%s</p></div>' % (cls, inline(text, terms)))
            continue
        if re.match(r'^(- |\d+\. )', st):
            ordered = bool(re.match(r'^\d+\. ', st))
            items = []
            while i < n and re.match(r'^(- |\d+\. )', lines[i].strip()):
                t = re.sub(r'^(- |\d+\. )', '', lines[i].strip())
                i += 1
                while i < n and lines[i].startswith('  ') and lines[i].strip() and not re.match(r'^(- |\d+\. )', lines[i].strip()):
                    t += ' ' + lines[i].strip()
                    i += 1
                items.append(t)
            cur['text'].extend(items)
            tag = 'ol' if ordered else 'ul'
            out.append('<%s>%s</%s>' % (tag, ''.join('<li>%s</li>' % inline(t, terms) for t in items), tag))
            continue
        if st.startswith('|'):
            rows = []
            while i < n and lines[i].strip().startswith('|'):
                rows.append([c.strip() for c in lines[i].strip().strip('|').split('|')])
                i += 1
            head, body = rows[0], [r for r in rows[1:] if not all(re.match(r'^:?-+:?$', c) for c in r)]
            cur['text'].append(' '.join(' '.join(r) for r in rows))
            out.append('<div class="ntbl"><table><tr>%s</tr>%s</table></div>' % (
                ''.join('<th>%s</th>' % inline(c, terms) for c in head),
                ''.join('<tr>%s</tr>' % ''.join('<td>%s</td>' % inline(c, terms) for c in r) for r in body)))
            continue
        buf = []
        while i < n and lines[i].strip() and not re.match(r'^(#{2,3} |\$\$|>|- |\d+\. |\|)', lines[i].strip()):
            buf.append(lines[i].strip())
            i += 1
        text = ' '.join(buf)
        cur['text'].append(text)
        out.append('<p>%s</p>' % inline(text, terms))
    flush_sec()
    words = len(plain(' '.join(x['t'] for x in idx)).split())
    seen, tl = set(), []
    for t in terms:
        k = t.lower()
        if k not in seen and len(t) < 80:
            seen.add(k)
            tl.append(t)
    return {'id': nid, 'title': title, 'html': '\n'.join(out), 'secs': secs, 'idx': idx, 'terms': tl, 'words': words}


def build(src_dir):
    notes = []
    for kind, pre, cnt in (('topic', 't', 9), ('lab', 'l', 8)):
        for k in range(1, cnt + 1):
            p = os.path.join(src_dir, '%s%d.md' % (pre, k))
            if os.path.exists(p):
                d = parse(p, '%s%d' % (pre, k))
                d.update({'kind': kind, 'n': k})
                notes.append(d)
    return {'notes': notes}


if __name__ == '__main__':
    import sys
    r = build(sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(os.path.abspath(__file__)), 'notes'))
    for x in r['notes']:
        print(x['id'], x['words'], 'слов,', len(x['secs']), 'разделов,', len(x['terms']), 'терминов —', x['title'])
