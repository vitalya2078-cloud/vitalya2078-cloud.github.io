#!/usr/bin/env python3
"""Озвучка лекций: src/learn/<тема>.say.json → fizika/audio/<тема>-<лекция>.mp3 (голос Piper, офлайн, бесплатно).
Перегенерирует только изменившиеся лекции. Нужны: pip install piper-tts, ffmpeg и модель голоса.
Запуск: python3 fizika/src/tts.py путь/к/ru_RU-irina-medium.onnx"""
import hashlib, json, os, subprocess, sys, tempfile
D = os.path.dirname(os.path.abspath(__file__)); OUT = os.path.join(D, '..', 'audio')
MODEL = sys.argv[1]; VOICE = os.path.basename(MODEL).replace('.onnx', '')
# словарь произношения: так голос читает слово чище (проверено распознаванием речи)
PRON = [('инерц', 'инэрц'), ('Инерц', 'Инэрц'), ('инертн', 'инэртн')]
def speak(t):
    for a, b in PRON: t = t.replace(a, b)
    return t
idx_f = os.path.join(OUT, 'index.json')
idx = json.load(open(idx_f)) if os.path.exists(idx_f) else {}
os.makedirs(OUT, exist_ok=True)
for f in sorted(os.listdir(os.path.join(D, 'learn'))):
    if not f.endswith('.say.json'): continue
    tid = f.split('.')[0]
    for nid, paras in json.load(open(os.path.join(D, 'learn', f), encoding='utf-8')).items():
        name = f'{tid}-{nid}.mp3'; h = hashlib.sha256((VOICE + str(PRON) + '\n'.join(paras)).encode()).hexdigest()[:16]
        if idx.get(name, {}).get('hash') == h and os.path.exists(os.path.join(OUT, name)): continue
        with tempfile.TemporaryDirectory() as tmp:
            wav = os.path.join(tmp, 'a.wav')
            # абзацы — отдельными строками: Piper делает паузу между ними
            subprocess.run([sys.executable, '-m', 'piper', '-m', MODEL, '-f', wav, '--sentence-silence', '0.45', '--length-scale', '1.06'],
                           input='\n'.join(speak(x) for x in paras).encode(), check=True, capture_output=True)
            subprocess.run(['ffmpeg', '-y', '-v', 'error', '-i', wav, '-af', 'loudnorm=I=-16:TP=-1.5', '-ac', '1', '-ar', '24000',
                            '-c:a', 'libmp3lame', '-b:a', '48k', os.path.join(OUT, name)], check=True)
        dur = float(subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', os.path.join(OUT, name)], capture_output=True, text=True).stdout)
        idx[name] = {'hash': h, 'dur': round(dur, 1), 'voice': VOICE}
        print('озвучено', name, round(dur), 'с')
json.dump(idx, open(idx_f, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
