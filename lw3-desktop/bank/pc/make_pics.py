# Картинки к вопросам банка, у которых в исходном docx не было рисунка (только для программы Windows).
# Стиль как у картинок банка: светло-жёлтый фон, красно-коричневые линии, варианты пронумерованы 1–4.
# Правильный вариант стоит под номером из ключа ответа. Включаются в банк только после проверки преподавателем
# (pc-fix.json, "approved": true). Запуск: python3 lw3-desktop/bank/pc/make_pics.py (нужны node + playwright).
import json, os, subprocess

D = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(D, 'img')
KX = os.path.normpath(os.path.join(D, '..', '..', 'vendor', 'katex'))
BG, LN, TX = '#FFF3B0', '#B3261E', '#1A1A1A'


def page(body, w=1000, h=300):
    return f'''<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="file://{KX}/katex.min.css"><script src="file://{KX}/katex.min.js"></script>
<style>html,body{{margin:0}} #c{{width:{w}px; height:{h}px; background:{BG}; font:600 26px Arial, sans-serif; color:{TX}; position:relative; overflow:hidden}}
.g{{display:grid; grid-template-columns:repeat(4,1fr); height:100%}} .g>div{{position:relative; display:flex; align-items:center; justify-content:center; border-left:2px dashed #E3C766}} .g>div:first-child{{border-left:0}}
.n{{position:absolute; left:14px; top:10px; font:700 26px Arial}} .f{{font-size:30px}} .row{{display:flex; height:100%; align-items:center; justify-content:center; gap:60px}}
svg text{{font:italic 700 22px "Times New Roman", serif; fill:{TX}}}</style></head><body><div id="c">{body}</div>
<script>document.querySelectorAll('[data-t]').forEach(e => katex.render(e.dataset.t, e, {{displayMode: false, throwOnError: true}}));</script></body></html>'''


def four(cells, h=300):
    return page('<div class="g">' + ''.join(f'<div><span class="n">{i + 1}.</span>{c}</div>' for i, c in enumerate(cells)) + '</div>', 1000, h)


tex = lambda t: f'<span class="f" data-t="{t.replace(chr(34), "&quot;")}"></span>'


def graph(kind):
    """График I(t) 200×200: rise — нарастание с насыщением, fall — экспоненциальный спад, lin+/lin- — прямая, step — скачок, const — постоянный."""
    ax = f'<line x1="30" y1="170" x2="190" y2="170" stroke="{TX}" stroke-width="2"/><line x1="30" y1="170" x2="30" y2="20" stroke="{TX}" stroke-width="2"/>' \
         f'<polygon points="190,170 180,165 180,175" fill="{TX}"/><polygon points="30,20 25,30 35,30" fill="{TX}"/><text x="10" y="32">I</text><text x="180" y="192">t</text>'
    pts = {'rise': ' '.join(f'{30 + x},{170 - 120 * (1 - 2.71828 ** (-x / 30))}' for x in range(0, 151, 5)),
           'fall': ' '.join(f'{30 + x},{170 - 120 * 2.71828 ** (-x / 30)}' for x in range(0, 151, 5)),
           'lin+': '30,170 180,50', 'lin-': '30,50 180,170', 'step': '30,170 30,50 180,50', 'const': '30,90 180,90'}[kind]
    return f'<svg width="210" height="200">{ax}<polyline points="{pts}" fill="none" stroke="{LN}" stroke-width="4"/></svg>'


def frame(angle):
    """Рамка в однородном поле B (линии слева направо); angle — угол между плоскостью рамки и линиями индукции (вид сверху)."""
    import math
    lines = ''.join(f'<line x1="10" y1="{y}" x2="200" y2="{y}" stroke="#7A9CC6" stroke-width="2"/><polygon points="200,{y} 190,{y - 5} 190,{y + 5}" fill="#7A9CC6"/>' for y in (40, 80, 120, 160))
    a = math.radians(angle); dx, dy = 70 * math.cos(a), 70 * math.sin(a)
    return f'<svg width="210" height="200">{lines}<text x="176" y="30">B</text><line x1="{105 - dx}" y1="{100 + dy}" x2="{105 + dx}" y2="{100 - dy}" stroke="{LN}" stroke-width="9" stroke-linecap="round"/><circle cx="105" cy="100" r="6" fill="{TX}"/><text x="60" y="194" style="font:600 18px Arial">{angle}°</text></svg>'


def bands(kind):
    """Зонная диаграмма: зона проводимости сверху, валентная снизу; intrinsic, donor, acceptor, metal."""
    s = f'<rect x="30" y="20" width="150" height="40" fill="#F4C6C0" stroke="{LN}" stroke-width="2"/><rect x="30" y="140" width="150" height="40" fill="#C9D9F0" stroke="#2F5D9A" stroke-width="2"/>'
    if kind == 'metal':
        s = f'<rect x="30" y="20" width="150" height="90" fill="#F4C6C0" stroke="{LN}" stroke-width="2"/><rect x="30" y="90" width="150" height="90" fill="#C9D9F0" fill-opacity=".8" stroke="#2F5D9A" stroke-width="2"/>'
        return f'<svg width="210" height="200">{s}<text x="105" y="104" text-anchor="middle" style="font:600 15px Arial">зоны</text><text x="105" y="122" text-anchor="middle" style="font:600 15px Arial">перекрываются</text></svg>'
    e = lambda x, y: f'<circle cx="{x}" cy="{y}" r="7" fill="{TX}"/>'
    h = lambda x, y: f'<circle cx="{x}" cy="{y}" r="7" fill="#fff" stroke="{TX}" stroke-width="2"/>'
    if kind == 'intrinsic':
        s += e(70, 45) + e(140, 45) + h(70, 160) + h(140, 160) + f'<line x1="70" y1="150" x2="70" y2="58" stroke="{TX}" stroke-width="2" stroke-dasharray="5 4"/><line x1="140" y1="150" x2="140" y2="58" stroke="{TX}" stroke-width="2" stroke-dasharray="5 4"/>'
    elif kind == 'donor':
        s += ''.join(f'<line x1="{x}" y1="78" x2="{x + 18}" y2="78" stroke="{LN}" stroke-width="3"/>' for x in (40, 80, 120, 155)) + e(60, 45) + e(105, 45) + e(150, 45)
    elif kind == 'acceptor':
        s += ''.join(f'<line x1="{x}" y1="122" x2="{x + 18}" y2="122" stroke="#2F5D9A" stroke-width="3"/>' for x in (40, 80, 120, 155)) + h(60, 160) + h(105, 160) + h(150, 160)
    return f'<svg width="210" height="200">{s}</svg>'


PICS = {
    'pc3_11': four([frame(90), frame(60), frame(30), frame(0)]),
    'pc3_38': four([tex(r'\Phi = \dfrac{B}{S}'), tex(r'\Phi = BS^2'), tex(r'\Phi = Blv'), tex(r'\Phi = BS\cos\alpha')]),
    'pc3_44': four([tex(r'\Phi = \dfrac{Bv}{l}'), tex(r'\Phi = Blvt'), tex(r'\Phi = IBl'), tex(r'\Phi = \dfrac{Bl}{vt}')]),
    'pc3_56': four([graph('rise'), graph('lin-'), graph('fall'), graph('const')]),
    'pc3_58': four([graph('fall'), graph('rise'), graph('lin+'), graph('step')]),
    'pc5_8': four([tex(r'\pi'), tex(r'\dfrac{\pi}{2}'), tex(r'2\pi'), tex(r'\dfrac{3\pi}{2}')], 220),
    'pc5_44': four([tex('0'), tex(r'\pi'), tex(r'\dfrac{\pi}{2}'), tex(r'\dfrac{\pi}{4}')], 220),
    'pc5_60': four([tex(r'\pi'), tex(r'\dfrac{\pi}{4}'), tex(r'\dfrac{\pi}{2}'), tex(r'2\pi')], 220),
    'pc8_93': four([bands('donor'), bands('intrinsic'), bands('acceptor'), bands('metal')]),
    'pc8_94': four([bands('intrinsic'), bands('acceptor'), bands('metal'), bands('donor')]),
    'pc5_71': page(f'<div class="row">{tex(r"x = 2\sin(50\pi t)\ \text{м}")}</div>', 1000, 160),
    'pc5_98': page(f'<div class="row">{tex(r"x = 0{,}1\sin(\pi t)\ \text{м}")}</div>', 1000, 160),
    'pc7_16': page(f'<div class="row"><span>1)&nbsp;{tex(r"p = \dfrac{h}{\lambda}")}</span><span>2)&nbsp;{tex(r"p = \dfrac{h\nu}{c}")}</span><span>3)&nbsp;{tex(r"p = \dfrac{E}{c}")}</span></div>', 1000, 180),
    'pc9_31': page(f'<div class="row">{tex(r"{}^{226}_{\ 88}\text{Ra} \rightarrow {}^{222}_{\ 86}\text{Rn} + \,?")}</div>', 1000, 170),
}
# вопрос → картинка; 5.48 и 9.92 полные без рисунка (расчёт сходится с ключом)
FIX = {'3.11': 'pc3_11', '3.38': 'pc3_38', '3.44': 'pc3_44', '3.56': 'pc3_56', '3.58': 'pc3_58', '5.8': 'pc5_8', '5.44': 'pc5_44', '5.60': 'pc5_60',
       '8.93': 'pc8_93', '8.94': 'pc8_94', '5.71': 'pc5_71', '5.98': 'pc5_98', '7.16': 'pc7_16', '9.31': 'pc9_31', '5.48': None, '9.92': None}

if __name__ == '__main__':
    os.makedirs(OUT, exist_ok=True)
    tmp = os.path.join(D, '_html'); os.makedirs(tmp, exist_ok=True)
    for k, h in PICS.items():
        open(os.path.join(tmp, k + '.html'), 'w', encoding='utf-8').write(h)
    subprocess.check_call(['node', os.path.join(D, 'shoot.mjs'), tmp, OUT])
    for f in os.listdir(tmp): os.remove(os.path.join(tmp, f))
    os.rmdir(tmp)
    fix_path = os.path.join(D, 'pc-fix.json')
    old = json.load(open(fix_path, encoding='utf-8')) if os.path.exists(fix_path) else {}
    json.dump({'approved': old.get('approved', False), 'note': 'Картинки к вопросам без рисунка. В банк ПК-версии попадают только при approved: true (после проверки преподавателем).',
               'q': {i: ({'p': [k + '.png']} if k else {}) for i, k in FIX.items()}}, open(fix_path, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print('ok', len(PICS))
