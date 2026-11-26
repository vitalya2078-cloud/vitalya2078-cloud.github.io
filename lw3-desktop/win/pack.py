"""Упаковка интерфейса (lw3-desktop/dist) в app.pak — он встраивается в Fizpraktikum.exe ресурсом.
Формат: b'FZPK', число файлов (u32), для каждого: длина имени (u16), имя UTF-8, смещение (u32), размер (u32); затем данные.
Запуск: python pack.py ../dist app.pak"""
import os, struct, sys
src, out = sys.argv[1], sys.argv[2]
files = []
for root, _, names in os.walk(src):
    for n in sorted(names):
        p = os.path.join(root, n)
        files.append((os.path.relpath(p, src).replace(os.sep, '/'), p))
files.sort()
head, data, off = [b'FZPK', struct.pack('<I', len(files))], [], 0
for name, p in files:
    b = open(p, 'rb').read(); nb = name.encode('utf-8')
    head.append(struct.pack('<H', len(nb)) + nb + struct.pack('<II', off, len(b))); data.append(b); off += len(b)
with open(out, 'wb') as f:
    f.write(b''.join(head)); f.writelines(data)
print(f'{out}: {len(files)} файлов, {off / 1048576:.1f} МБ')
