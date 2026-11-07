#!/usr/bin/env python3
"""Иконки: синяя «чернильная» плитка с сеткой миллиметровки и буквой Ф. Запуск: python3 icons.py путь/к/Golos-Bold.ttf"""
import sys, os
from PIL import Image, ImageDraw, ImageFont
D = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
FONT = sys.argv[1]
INK, GRID, GRIDM, WHITE, MARK = (30, 63, 160), (52, 82, 178), (70, 100, 192), (255, 255, 255), (255, 228, 92)

def make(size, pad=0.0, round_=True):
    S = 1024
    im = Image.new('RGB', (S, S), INK); d = ImageDraw.Draw(im)
    for i in range(0, S, 32): d.line([(i, 0), (i, S)], fill=GRID, width=2); d.line([(0, i), (S, i)], fill=GRID, width=2)
    for i in range(0, S, 160): d.line([(i, 0), (i, S)], fill=GRIDM, width=4); d.line([(0, i), (S, i)], fill=GRIDM, width=4)
    scale = 1 - 2 * pad
    f = ImageFont.truetype(FONT, int(660 * scale))
    box = d.textbbox((0, 0), 'Ф', font=f); w, h = box[2] - box[0], box[3] - box[1]
    x, y = (S - w) / 2 - box[0], (S - h) / 2 - box[1] - 20 * scale
    d.text((x, y), 'Ф', font=f, fill=WHITE)
    # «маркер» — жёлтая черта под буквой, как выделение в тетради
    y2 = y + box[3] + 40 * scale
    d.rounded_rectangle([S / 2 - 210 * scale, y2, S / 2 + 210 * scale, y2 + 44 * scale], radius=int(22 * scale), fill=MARK)
    return im.resize((size, size), Image.LANCZOS)

make(512).save(os.path.join(D, 'icon-512.png'))
make(192).save(os.path.join(D, 'icon-192.png'))
make(512, pad=0.12).save(os.path.join(D, 'icon-maskable-512.png'))  # безопасная зона для адаптивных иконок Android
make(180).save(os.path.join(D, 'apple-touch-icon.png'))
fg = os.path.join(D, 'android-res')
os.makedirs(fg, exist_ok=True)
for name, px in {'mdpi': 48, 'hdpi': 72, 'xhdpi': 96, 'xxhdpi': 144, 'xxxhdpi': 192}.items():
    make(px).save(os.path.join(fg, f'ic_launcher-{name}.png'))
print('ok')
