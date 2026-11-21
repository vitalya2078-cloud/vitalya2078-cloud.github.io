# Иконка «Физпрактикума» для Windows из исходника icon-src-2000.png (пурпурный фон вырезается):
#   src-tauri/icons/*.png, icon.ico (16…256), assets/brand/icon-*.png для интерфейса.
# Для 16 и 24 px — упрощённый вариант: якорь крупнее и контрастнее, без фактуры мела и без электронов.
# Запуск: python3 lw3-desktop/assets/design/make_icons.py
import os
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

D = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.normpath(os.path.join(D, '..', '..'))
ICONS = os.path.join(ROOT, 'src-tauri', 'icons')
BRAND = os.path.join(ROOT, 'assets', 'brand')


def cut(path):
    a = np.array(Image.open(path).convert('RGB')).astype(float)
    d = np.sqrt((a[..., 0] - 255) ** 2 + a[..., 1] ** 2 + (a[..., 2] - 255) ** 2)
    alpha = np.clip((d - 60) / 80, 0, 1)
    # убрать пурпурный оттенок на полупрозрачном краю
    m = alpha < 1
    for c in (0, 2):
        a[..., c] = np.where(m, np.minimum(a[..., c], a[..., 1] + 60), a[..., c])
    im = Image.fromarray(np.dstack([a, alpha * 255]).astype(np.uint8), 'RGBA')
    bb = im.getchannel('A').point(lambda v: 255 if v > 8 else 0).getbbox()
    im = im.crop(bb)
    s = max(im.size)
    sq = Image.new('RGBA', (s, s), (0, 0, 0, 0))
    sq.paste(im, ((s - im.size[0]) // 2, (s - im.size[1]) // 2))
    return sq.resize((1024, 1024), Image.LANCZOS)


def small(sz):
    """Упрощённая иконка для 16/24 px: дубовая рамка, тёмная доска, две цветные орбиты, крупный белый якорь."""
    S = 256
    def orbit(color, ang):
        o = Image.new('RGBA', (S, S), (0, 0, 0, 0))
        ImageDraw.Draw(o).ellipse((34, 94, 222, 162), outline=color, width=16)
        return o.rotate(ang, center=(128, 128), resample=Image.BICUBIC)
    im = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    dr = ImageDraw.Draw(im)
    dr.rounded_rectangle((4, 4, S - 5, S - 5), 56, fill=(214, 150, 78, 255))
    dr.rounded_rectangle((28, 28, S - 29, S - 29), 36, fill=(30, 34, 38, 255))
    im.alpha_composite(orbit((255, 122, 69, 255), -32))
    im.alpha_composite(orbit((79, 139, 255, 255), 32))
    w = (248, 248, 248, 255)
    dr = ImageDraw.Draw(im)
    dr.ellipse((104, 40, 152, 88), outline=w, width=16)            # кольцо
    dr.rectangle((119, 84, 137, 210), fill=w)                      # веретено
    dr.rectangle((82, 100, 174, 118), fill=w)                      # шток
    dr.arc((62, 116, 194, 220), 15, 165, fill=w, width=18)         # рога
    dr.polygon([(52, 150), (92, 146), (66, 186)], fill=w)          # лапы
    dr.polygon([(204, 150), (164, 146), (190, 186)], fill=w)
    return im.resize((sz, sz), Image.LANCZOS)


def main():
    os.makedirs(BRAND, exist_ok=True)
    big = cut(os.path.join(D, 'icon-src-2000.png'))
    big.save(os.path.join(BRAND, 'icon-1024.png'))
    for sz in (256, 128, 64):
        big.resize((sz, sz), Image.LANCZOS).save(os.path.join(BRAND, 'icon-%d.png' % sz))
    big.resize((32, 32), Image.LANCZOS).save(os.path.join(ICONS, '32x32.png'))
    big.resize((128, 128), Image.LANCZOS).save(os.path.join(ICONS, '128x128.png'))
    big.resize((256, 256), Image.LANCZOS).save(os.path.join(ICONS, '128x128@2x.png'))
    big.resize((512, 512), Image.LANCZOS).save(os.path.join(ICONS, 'icon.png'))
    sizes = {s: (small(s) if s <= 24 else big.resize((s, s), Image.LANCZOS)) for s in (16, 24, 32, 48, 64, 128, 256)}
    sizes[256].save(os.path.join(ICONS, 'icon.ico'), format='ICO', sizes=[(s, s) for s in sizes], append_images=[sizes[s] for s in sizes if s != 256])
    # превью для проверки
    P = Image.new('RGBA', (560, 140), (30, 32, 36, 255))
    x = 8
    for s in (128, 64, 48, 32, 24, 16):
        P.alpha_composite(sizes[s] if s in sizes else big.resize((s, s)), (x, 6)); x += s + 14
    P.save(os.path.join(D, 'icon-preview.png'))
    print('ok')


if __name__ == '__main__':
    main()
