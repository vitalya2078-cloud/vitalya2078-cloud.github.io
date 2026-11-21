# Раскадровка промо-ролика «Физпрактикум»: ключевые кадры 1920×1080 (HTML → PNG через Playwright).
import os, sys
D = os.path.dirname(os.path.abspath(__file__))
SH = sys.argv[1]; OUT = sys.argv[2]
DIST = os.path.normpath(os.path.join(D, '..', 'lw3-desktop', 'dist'))
CSS = f'''@font-face{{font-family:G; font-weight:400; src:url(file://{DIST}/fonts/golos-400.woff2)}} @font-face{{font-family:G; font-weight:600; src:url(file://{DIST}/fonts/golos-600.woff2)}}
@font-face{{font-family:G; font-weight:800; src:url(file://{DIST}/fonts/golos-cyrillic-800.woff2)}}
html,body{{margin:0; width:1920px; height:1080px; overflow:hidden; background:#000; color:#F5F5F7; font-family:G, sans-serif}}
.c{{position:absolute; inset:0; display:flex; flex-direction:column; align-items:center; justify-content:center; text-align:center}}
h1{{margin:0; font-weight:800; font-size:120px; letter-spacing:-4px; line-height:1.02}}
h2{{margin:0; font-weight:800; font-size:88px; letter-spacing:-3px; line-height:1.05}}
p{{margin:18px 0 0; font-weight:400; font-size:34px; color:#86868B}}
.gr{{background:linear-gradient(90deg,#4F8BFF,#B36BFF 45%,#FF7A45); -webkit-background-clip:text; color:transparent}}
.dim{{color:#48484D}}
.scr{{border-radius:22px; box-shadow:0 0 0 1px rgba(255,255,255,.08), 0 60px 160px rgba(79,139,255,.18), 0 40px 90px rgba(0,0,0,.8); overflow:hidden}}
.scr img{{display:block; width:100%}}
.glow{{position:absolute; width:900px; height:900px; border-radius:50%; background:radial-gradient(circle, rgba(79,139,255,.28), rgba(255,122,69,.10) 45%, transparent 70%); filter:blur(20px)}}
'''
def page(body): return f'<!doctype html><meta charset="utf-8"><style>{CSS}</style>{body}'
img = lambda f: f'file://{SH}/{f}'
icon = f'file://{DIST}/img/brand/icon-1024.png'
F = {
 '1': f'<div class="c"><div class="glow"></div><img src="{icon}" style="width:260px; position:relative; filter:drop-shadow(0 30px 80px rgba(79,139,255,.45))"><h1 style="margin-top:60px; position:relative">Физика. <span class="gr">По-новому.</span></h1></div>',
 '2': '<div class="c"><h2 class="dim">Лаборатория открыта<br>два часа в неделю.</h2><h2 style="margin-top:50px">Теперь <span class="gr">всегда.</span></h2></div>',
 '3': f'<div class="c" style="justify-content:flex-start; padding-top:110px"><h2>8 лабораторных работ.</h2><p>По методическим указаниям кафедры.</p><div class="scr" style="width:1380px; margin-top:70px; transform:perspective(2400px) rotateX(14deg); transform-origin:top"><img src="{img("lw3d-exp.png")}"></div></div>',
 '4': f'<div class="c" style="flex-direction:row; gap:90px"><div style="text-align:left; width:640px"><h2>У каждого<br>свои данные.</h2><p style="font-size:38px">Списать не выйдет.<br>Подделку видно сразу.</p></div><div class="scr" style="width:1000px; transform:perspective(2400px) rotateY(-16deg)"><img src="{img("lw3d-teacher.png")}"></div></div>',
 '5': f'<div class="c" style="justify-content:flex-start; padding-top:100px"><h2>Теория <span class="gr">рядом с опытом.</span></h2><p>Конспекты и видеоуроки по 9 темам курса.</p><div style="position:relative; width:1500px; height:700px; margin-top:60px"><div class="scr" style="position:absolute; left:0; top:40px; width:900px; transform:rotate(-3deg)"><img src="{img("c-dark.png")}"></div><div class="scr" style="position:absolute; right:0; top:0; width:900px; transform:rotate(3deg)"><img src="{img("v-board.png")}"></div></div></div>',
 '6': '<div class="c"><h1 style="font-size:300px; letter-spacing:-12px" class="gr">900</h1><h2 style="margin-top:-10px">вопросов.</h2><p>Самопроверка. Экзамены на время. 100-балльная шкала.</p></div>',
 '7': f'<div class="c"><img src="{icon}" style="width:170px"><h1 style="margin-top:44px; font-size:104px">Физпрактикум</h1><p style="font-size:30px; color:#A1A1A6">ЧВВМУ им. П.С. Нахимова · Кафедра физики и общетехнических дисциплин</p></div>',
}
os.makedirs(os.path.join(OUT, 'html'), exist_ok=True)
for k, b in F.items(): open(os.path.join(OUT, 'html', f'f{k}.html'), 'w', encoding='utf-8').write(page(b))
print('ok')
