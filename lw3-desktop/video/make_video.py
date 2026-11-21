# Видеоуроки «Физпрактикума»: сценарий (lessons/t<n>.txt) → слайды (Playwright + KaTeX) + озвучка (ElevenLabs) → MP4 (ffmpeg).
# Запуск: python3 lw3-desktop/video/make_video.py 1 [2 …]   (нужны собранный lw3-desktop/dist, playwright, ffmpeg, доступ к api.elevenlabs.io)
# Результат: lw3-desktop/assets/video/t<n>.mp4 — сборка программы копирует его в dist/video, конспект темы показывает плеер.
#
# Формат сценария:
#   # Заголовок урока                       — первая строка; титульный слайд
#   ## Заголовок слайда                     — слайд со списком
#   ## = Заголовок слайда                   — слайд с формулами (строки «$$ формула $$ — подпись»)
#   - пункт списка (можно с $формулой$)
#   > текст диктора (несколько строк «>» подряд — один абзац)
# Озвучка каждого слайда кешируется (cache/<хеш>.mp3): повторный запуск не тратит символы.
import hashlib, html, json, os, re, subprocess, sys, urllib.request

D = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.normpath(os.path.join(D, '..'))
DIST = os.path.join(ROOT, 'dist')
OUT = os.path.join(ROOT, 'assets', 'video')
CACHE = os.path.join(D, 'cache')
WORK = os.path.join(D, 'work')
VOICE = os.environ.get('FZ_VOICE', 'onwK4e9ZLuTAKqWW03F9')
MODEL = 'eleven_multilingual_v2'


def parse(path):
    lines = open(path, encoding='utf-8').read().replace('\r', '').split('\n')
    title = lines[0][2:].strip()
    slides, cur = [], {'kind': 'cover', 'title': title, 'items': [], 'say': []}
    for ln in lines[1:]:
        st = ln.strip()
        if not st:
            continue
        if st.startswith('## '):
            slides.append(cur)
            h = st[3:].strip()
            kind = 'law' if h.startswith('=') else 'pts'
            cur = {'kind': kind, 'title': h.lstrip('= ').strip(), 'items': [], 'say': []}
        elif st.startswith('>'):
            cur['say'].append(st[1:].strip())
        elif st.startswith('- ') or st.startswith('$$'):
            cur['items'].append(st[2:].strip() if st.startswith('- ') else st)
    slides.append(cur)
    for s in slides:
        s['say'] = ' '.join(s['say'])
    return title, slides


def inline(s):
    out, pos = [], 0
    for m in re.finditer(r'\$([^$]+)\$', s):
        out.append(html.escape(s[pos:m.start()]))
        out.append('<span class="tx" data-t="%s"></span>' % html.escape(m.group(1), quote=True))
        pos = m.end()
    out.append(html.escape(s[pos:]))
    return re.sub(r'\*\*(.+?)\*\*', r'<b>\1</b>', ''.join(out))


def slide_html(n, title, s, k, total):
    if s['kind'] == 'cover':
        body = '<div class="cover"><span class="tag">Тема %d · видеоурок</span><h1>%s</h1><p>Физпрактикум · ЧВВМУ им. П.С. Нахимова<br>Кафедра физики и общетехнических дисциплин</p></div>' % (n, html.escape(title))
    elif s['kind'] == 'law':
        rows = []
        for it in s['items']:
            m = re.match(r'\$\$(.+?)\$\$\s*(?:—\s*(.*))?$', it)
            if m:
                rows.append('<div class="law"><div class="tx d" data-t="%s"></div>%s</div>' % (html.escape(m.group(1).strip(), quote=True), '<p>%s</p>' % inline(m.group(2)) if m.group(2) else ''))
            else:
                rows.append('<p class="note">%s</p>' % inline(it))
        body = '<h2>%s</h2><div class="laws n%d">%s</div>' % (inline(s['title']), min(len(rows), 4), ''.join(rows))
    else:
        body = '<h2>%s</h2><ul>%s</ul>' % (inline(s['title']), ''.join('<li>%s</li>' % inline(i) for i in s['items']))
    foot = '' if s['kind'] == 'cover' else '<div class="foot"><span>Тема %d. %s</span><span>%d / %d</span></div>' % (n, html.escape(title), k, total - 1)
    return '''<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="katex/katex.min.css"><script src="katex/katex.min.js"></script><style>
@font-face{font-family:G; src:url(fonts/golos-400.woff2)} @font-face{font-family:G; font-weight:600; src:url(fonts/golos-600.woff2)} @font-face{font-family:G; font-weight:700; src:url(fonts/golos-700.woff2)}
@font-face{font-family:G; font-weight:800; src:url(fonts/golos-cyrillic-800.woff2)}
html,body{margin:0; width:1920px; height:1080px; overflow:hidden}
body{background:#0E1013 url(img/bg/dark.webp) center/cover; color:#EEF1F6; font:400 40px/1.45 G, sans-serif; position:relative}
.wrap{position:absolute; inset:70px 110px 110px; display:flex; flex-direction:column; justify-content:center}
h2{margin:0 0 40px; font:800 66px/1.15 G; letter-spacing:-1px} h2::before{content:''; display:block; width:90px; height:8px; border-radius:4px; background:#FF7A45; margin-bottom:28px}
ul{margin:0; padding:0; list-style:none; display:grid; gap:30px} li{position:relative; padding:26px 34px 26px 74px; border-radius:26px; background:rgba(24,27,32,.88); border:2px solid #2A2F37}
li::before{content:''; position:absolute; left:32px; top:48px; width:16px; height:16px; border-radius:50%%; background:#FF7A45}
b{color:#FFB08C; font-weight:700}
.laws{display:grid; gap:34px} .laws.n3, .laws.n4{gap:20px} .laws.n3 .law, .laws.n4 .law{padding:16px 30px} .laws.n1 .law, .laws.n2 .law{padding:40px} .law{padding:26px 34px; border-radius:26px; background:rgba(24,27,32,.9); border:2px solid #2A2F37; text-align:center}
.law .katex{font-size:1.5em} .laws.n3 .katex, .laws.n4 .katex{font-size:1.12em} .law p{margin:14px 0 0; color:#B9C2CF; font-size:34px} .laws.n3 .law p, .laws.n4 .law p{margin-top:4px; font-size:30px}
.note{margin:0; text-align:center; color:#B9C2CF}
.cover{display:flex; flex-direction:column; align-items:flex-start; gap:30px} .cover h1{margin:0; font:800 110px/1.05 G; letter-spacing:-2px; max-width:1500px}
.tag{padding:12px 30px; border-radius:999px; background:#FF7A45; color:#1C0C04; font:700 36px G} .cover p{margin:10px 0 0; color:#B9C2CF; font-size:36px}
.logo{position:absolute; right:110px; top:70px; width:110px; height:110px; border-radius:30px; display:grid; place-items:center; background:linear-gradient(135deg,#4F8BFF,#FF7A45); font:italic 700 74px serif; color:#fff}
.foot{position:absolute; left:110px; right:110px; bottom:44px; display:flex; justify-content:space-between; color:#7C8798; font:600 28px G}
</style></head><body>%s<div class="wrap">%s</div>%s<script>
document.querySelectorAll('.tx').forEach(e => katex.render(e.dataset.t, e, {displayMode: e.classList.contains('d'), throwOnError: false, strict: false}));
</script></body></html>''' % ('<div class="logo">γ</div>' if s['kind'] == 'cover' else '', body, foot)


TTS = os.environ.get('FZ_TTS', 'piper')   # piper — бесплатный офлайн-синтез (голос ru_RU-irina-medium: лучшая разборчивость; лицензия данных голоса не указана — голоса с CC0: ru_RU-denis-medium, ru_RU-dmitri-medium); eleven — ElevenLabs (платная квота)
PIPER_VOICE = os.environ.get('FZ_PIPER_VOICE', 'ru_RU-irina-medium')
LSCALE = os.environ.get('FZ_PIPER_SCALE', '0.95')
PIPER_URL = 'https://huggingface.co/rhasspy/piper-voices/resolve/main/ru/ru_RU/%s/medium/%s'


def tts_piper(text):
    os.makedirs(CACHE, exist_ok=True)
    vdir = os.path.join(D, 'voices')
    os.makedirs(vdir, exist_ok=True)
    model = os.path.join(vdir, PIPER_VOICE + '.onnx')
    for ext in ('.onnx', '.onnx.json'):
        f = os.path.join(vdir, PIPER_VOICE + ext)
        if not os.path.exists(f):
            urllib.request.urlretrieve(PIPER_URL % (PIPER_VOICE.split('-')[1], PIPER_VOICE + ext), f)
    h = hashlib.sha1(('piper' + PIPER_VOICE + LSCALE + text).encode('utf-8')).hexdigest()[:16]
    p = os.path.join(CACHE, h + '.wav')
    if not (os.path.exists(p) and os.path.getsize(p) > 1000):
        subprocess.run([sys.executable, '-m', 'piper', '-m', model, '-f', p, '--length-scale', LSCALE, '--sentence-silence', '0.35'],
                       input=text.encode('utf-8'), check=True, stderr=subprocess.DEVNULL)
    return p, 0


def tts(text):
    if TTS == 'piper':
        return tts_piper(text)
    os.makedirs(CACHE, exist_ok=True)
    h = hashlib.sha1((VOICE + MODEL + text).encode('utf-8')).hexdigest()[:16]
    p = os.path.join(CACHE, h + '.mp3')
    if os.path.exists(p) and os.path.getsize(p) > 1000:
        return p, 0
    body = json.dumps({'text': text, 'model_id': MODEL, 'voice_settings': {'stability': 0.55, 'similarity_boost': 0.75, 'style': 0.15, 'use_speaker_boost': True}}).encode('utf-8')
    req = urllib.request.Request('https://api.elevenlabs.io/v1/text-to-speech/%s?output_format=mp3_44100_128' % VOICE, data=body, method='POST',
                                 headers={'Content-Type': 'application/json', 'xi-api-key': 'placeholder'})
    with urllib.request.urlopen(req, timeout=180) as r:
        data = r.read()
        cost = int(r.headers.get('character-cost') or len(text))
    open(p, 'wb').write(data)
    return p, cost


def dur(p):
    return float(subprocess.check_output(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', p]).decode().strip())


def make(n):
    title, slides = parse(os.path.join(D, 'lessons', 't%d.txt' % n))
    wd = os.path.join(WORK, 't%d' % n)
    os.makedirs(wd, exist_ok=True)
    os.makedirs(OUT, exist_ok=True)
    sd = os.path.join(DIST, '_slides')   # слайды кладутся в dist, чтобы подхватить шрифты, фон и KaTeX сборки
    os.makedirs(sd, exist_ok=True)
    for f in os.listdir(sd):
        os.remove(os.path.join(sd, f))
    for k, s in enumerate(slides):
        open(os.path.join(sd, 's%02d.html' % k), 'w', encoding='utf-8').write(slide_html(n, title, s, k, len(slides)).replace('href="katex/', 'href="../katex/').replace('src="katex/', 'src="../katex/').replace('url(fonts/', 'url(../fonts/').replace('url(img/', 'url(../img/'))
    subprocess.check_call(['node', os.path.join(D, 'shoot.mjs'), sd])
    pngs = []
    for k in range(len(slides)):
        png = os.path.join(wd, 's%02d.png' % k)
        os.replace(os.path.join(sd, 's%02d.png' % k), png)
        pngs.append(png)
    import shutil
    shutil.rmtree(sd)
    segs, spent, total = [], 0, 0.0
    for k, s in enumerate(slides):
        assert s['say'], 'нет текста диктора: слайд %d «%s»' % (k, s['title'])
        mp3, cost = tts(s['say'])
        spent += cost
        d = dur(mp3)
        pad = 0.6
        seg = os.path.join(wd, 'v%02d.mp4' % k)
        L = d + pad
        subprocess.check_call(['ffmpeg', '-y', '-v', 'error', '-loop', '1', '-framerate', '24', '-i', pngs[k], '-i', mp3,
                               '-filter_complex', '[0:v]scale=1280:720,format=yuv420p,fade=t=in:st=0:d=0.35,fade=t=out:st=%.2f:d=0.35[v];[1:a]adelay=300|300,apad=pad_dur=%.2f[a]' % (L - 0.35, pad),
                               '-map', '[v]', '-map', '[a]', '-t', '%.2f' % (L + 0.3), '-c:v', 'libx264', '-preset', 'slow', '-tune', 'stillimage', '-crf', '30', '-r', '24',
                               '-c:a', 'aac', '-b:a', '80k', '-ar', '44100', '-ac', '1', seg])
        segs.append(seg)
        total += L + 0.3
    lst = os.path.join(wd, 'list.txt')
    open(lst, 'w').write(''.join("file '%s'\n" % s for s in segs))
    out = os.path.join(OUT, 't%d.mp4' % n)
    from PIL import Image   # обложка плеера — титульный слайд
    Image.open(pngs[0]).convert('RGB').resize((1280, 720), Image.LANCZOS).save(os.path.join(OUT, 't%d.jpg' % n), quality=82)
    subprocess.check_call(['ffmpeg', '-y', '-v', 'error', '-f', 'concat', '-safe', '0', '-i', lst, '-c', 'copy', '-movflags', '+faststart', out])
    print('t%d: %d слайдов, %.0f с (%.1f мин), %.1f МБ, символов озвучки израсходовано: %d' % (n, len(slides), total, total / 60, os.path.getsize(out) / 1e6, spent))


if __name__ == '__main__':
    for a in sys.argv[1:]:
        make(int(a))
