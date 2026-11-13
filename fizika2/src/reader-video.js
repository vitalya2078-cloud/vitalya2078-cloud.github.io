/* =====================================================================
   Видео-конспекты.
   Ролик собирается из материала главы (конспект читателя) или урока (карточки):
   каждая сцена — заголовок, формула и живая модель из лаборатории.
   Озвучка — голос устройства (Web Speech API), если он есть; иначе — субтитры.
   ===================================================================== */

/* Какая модель лаборатории иллюстрирует фрагмент текста. Порядок важен: сначала частные случаи. */
const RV_MODELS = [
  [/свободн\w* паден/i, 'freefall'], [/под углом к горизонту|брошен\w* под углом/i, 'projectile'],
  [/окружност|центростремит|углов\w* скорост|вращени/i, 'circular'],
  [/равноускорен|равнопеременн|ускорени/i, 'accelerated'], [/наклонн\w* плоскост/i, 'incline'],
  [/трени/i, 'friction'], [/Гук|упруг\w* деформ|жёсткост/i, 'elasticity'], [/момент\w* сил|рычаг|плеч/i, 'torque'],
  [/второй закон|закон\w* Ньютон|сила и ускорение|F = ma/i, 'newton'],
  [/Архимед|выталкивающ/i, 'buoyancy'], [/Паскал/i, 'pascal'], [/Бернулли|неразрывност|течени/i, 'bernoulli'],
  [/гидростат|давлени\w* жидкост|давлени\w* в покоящейся/i, 'pressure'],
  [/Карно|теплов\w* машин|КПД/i, 'heatengine'], [/первое начало|первый закон термодинам/i, 'firstlaw'],
  [/теплопровод/i, 'conduction'], [/теплоёмк|количеств\w* теплоты/i, 'calorimetry'],
  [/Клапейрон|Менделеев|уравнени\w* состояния/i, 'idealgas'], [/идеальн\w* газ|молекул|давлени\w* газа/i, 'gaspressure'],
  [/Лоренц|движущ\w* заряд/i, 'magnetic'],
  [/параллельн/i, 'parallel'], [/Джоул\w*.Ленц|мощност\w* тока/i, 'power'], [/закон\w* Ома|сопротивлени\w* проводник|сила тока/i, 'ohm'], [/электромагнитн\w* индукц|Фараде|ЭДС индукц|правил\w* Ленца/i, 'induction'],
  [/резонанс|вынужденн/i, 'resonance'], [/маятник/i, 'pendulum'], [/пружин|гармоническ|колебани/i, 'spring'],
  [/звук/i, 'sound'], [/интерференц|Юнг|когерентн/i, 'interference'], [/линз/i, 'lens'], [/зеркал/i, 'mirror'],
  [/преломлени/i, 'refraction'], [/отражени/i, 'reflection'], [/волн/i, 'wave'],
  [/скорост|перемещени|путь/i, 'uniform']
];
/* В каких главах учебника модель уместна — чтобы «колебания» в оптике не превратились в пружину. */
const RV_RANGE = { uniform: [1, 5], accelerated: [1, 5], freefall: [1, 5], projectile: [1, 5], circular: [1, 5, 14], newton: [2, 4], friction: [2, 4], incline: [2, 4], elasticity: [2, 4], torque: [4, 4],
  pressure: [6, 6], buoyancy: [6, 6], pascal: [6, 6], bernoulli: [6, 6], gaspressure: [8, 10], idealgas: [8, 10], firstlaw: [9, 10], heatengine: [9, 10], calorimetry: [9, 10], conduction: [9, 10],
  ohm: [12, 13], parallel: [12, 13], power: [12, 13], magnetic: [14, 14], induction: [15, 17], spring: [3, 3, 18], pendulum: [18, 18], resonance: [18, 18], wave: [19, 20, 23], sound: [19, 19],
  reflection: [21, 21, 24], refraction: [21, 21, 24], lens: [21, 21], mirror: [21, 21], interference: [22, 23] };
function rvModelFor(text, ch) {
  for (const [re, m] of RV_MODELS) {
    if (!re.test(text)) continue;
    const r = RV_RANGE[m]; if (!ch || !r || (ch >= r[0] && ch <= r[1]) || r.slice(2).includes(ch)) return m;
  }
  return null;
}
const rvFirstSentence = s => (String(s || '').match(/^.+?[.!?](?=\s|$)/) || [String(s || '')])[0];

/** Сцены ролика по конспекту главы. */
function rvChapterScenes(ch) {
  const c = CHAPTERS[ch - 1], n = READER_NOTES[ch]; if (!c || !n) return [];
  const chapterModel = rvModelFor(c.title + ' ' + n.sections.map(x => x.h + ' ' + x.p).join(' '), ch);
  const out = [{ kind: 'title', h: c.title, sub: 'Глава ' + c.n + ' · § ' + c.a + '–' + c.b, text: 'Глава ' + c.n + '. ' + c.title + '. ' + n.lead }];
  n.sections.forEach((x, i) => {
    const model = rvModelFor(x.h + ' ' + x.p + ' ' + (x.formula || ''), ch);
    const text = x.p + (x.note ? ' Важно: ' + x.note : '');
    if (model) out.push({ kind: 'model', h: x.h, text, model, formula: x.formula });
    else if (x.formula) out.push({ kind: 'formula', h: x.h, text, formula: x.formula, model: chapterModel });
    else out.push({ kind: 'idea', h: x.h, text, key: rvFirstSentence(x.p), num: i + 1 });
  });
  out.push({ kind: 'summary', h: 'Главное в главе', text: n.summary });
  return out;
}
/** Сцены ролика по карточкам урока (для уроков без собственного ролика). */
function rvLessonScenes(ch, L) {
  const c = CHAPTERS[ch - 1], lessonModel = rvModelFor(L.title + ' ' + L.cards.map(k => k.h + ' ' + (k.f || '') + ' ' + k.t).join(' '), ch);
  const out = [{ kind: 'title', h: L.title, sub: 'Глава ' + c.n + ' · ' + L.par, text: L.title + '. ' + L.lead }];
  L.cards.forEach((k, i) => {
    const model = rvModelFor(k.h + ' ' + (k.f || '') + ' ' + k.t, ch);
    const say = k.k === 'trap' ? 'Частая ошибка. ' + k.t : k.k === 'ex' ? 'Пример. ' + k.t : k.h + '. ' + k.t;
    if (k.f) out.push({ kind: model ? 'model' : 'formula', h: k.h, text: say, formula: k.f, model: model || lessonModel });
    else out.push({ kind: k.k === 'trap' ? 'trap' : 'idea', h: k.h, text: say, key: k.t, num: i + 1 });
  });
  out.push({ kind: 'summary', h: 'Итог урока', text: 'Мы разобрали: ' + L.cards.filter(k => k.k !== 'trap' && k.k !== 'ex').map(k => k.h.toLowerCase()).join(', ') + '. Закрепи материал в практике и проверке.' });
  return out;
}

/* ---------- Рисование сцен (координаты 720×400, как в лаборатории) ---------- */
function rvWrap(d, s, maxW, size, bold) {
  d.c.font = (bold ? '700 ' : '500 ') + Math.round(size * d.fs) + 'px "Golos UI", system-ui, sans-serif';
  const lines = []; let line = '';
  for (const w of String(s).split(/\s+/)) { const t = line ? line + ' ' + w : w; if (d.c.measureText(t).width > maxW && line) { lines.push(line); line = w; } else line = t; }
  if (line) lines.push(line); return lines;
}
function rvLines(d, s, x, y, maxW, size, opts = {}) {
  const lines = rvWrap(d, s, maxW, size, opts.bold).slice(0, opts.max || 6), lh = size * d.fs * 1.32;
  lines.forEach((l, i) => d.text(i === (opts.max || 6) - 1 && rvWrap(d, s, maxW, size, opts.bold).length > lines.length ? l + '…' : l, x, y + i * lh, Object.assign({ size }, opts)));
  return lines.length * lh;
}
function rvHeader(d, h, p, col = LC.gold) {
  d.c.globalAlpha = clamp(p * 6, 0, 1);
  d.rect(0, 0, LAB_W, 46, 'rgba(11,16,32,.9)', null, 0, 0); d.line(0, 46, LAB_W * clamp(p * 3, 0, 1), 46, col, 2.5);
  d.text(h, 20, 24, { col: LC.text, size: 15, bold: true }); d.c.globalAlpha = 1;
}
const RV_ART = {};
function rvArt(ch) {
  if (RV_ART[ch] !== undefined) return RV_ART[ch];
  const c = CHAPTERS[ch - 1]; RV_ART[ch] = null; if (!c || typeof chapterArt !== 'function') return null;
  const img = new Image(); img.onload = () => { RV_ART[ch] = img; }; img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(chapterArt(c, 640, 360).replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"'));
  return null;
}
function rvDrawModel(d, m, t, ab) {
  const x = Object.values(LABS).find(e => e.model === m), M = LAB_MODELS[m]; if (!x || !M) return;
  const a = ab ? ab[0] : x.a0, b = ab ? ab[1] : x.b0;
  const dur = M.dur(a, b), T = Number.isFinite(dur) ? dur + 1.5 : 6;
  d.quiet = true; M.draw(d, a, b, Math.min(t % T, Number.isFinite(dur) ? dur : t)); d.quiet = false;
}
function rvDraw(d, sc, p, lt, ch) {
  if (typeof vsDrawExtra === 'function' && ['list', 'cmp', 'graph', 'vs'].includes(sc.kind)) { d.clear(); vsDrawExtra(d, sc, p, lt); return; }
  d.clear(); const ease2 = q => 1 - (1 - clamp(q, 0, 1)) ** 3;
  if (sc.kind === 'title') {
    const art = rvArt(ch); if (art) { d.c.globalAlpha = .22 + .06 * Math.sin(lt); d.c.drawImage(art, 330, 150, 390, 219); d.c.globalAlpha = 1; }
    const k = ease2(p * 4);
    d.c.globalAlpha = k; d.tag(sc.sub.toUpperCase(), 120, 90, LC.blue, 13);
    const hh = rvLines(d, sc.h, 30 + (1 - k) * -30, 150, 560, 30, { col: LC.text, bold: true, max: 3 });
    const uy = 150 + hh - 6; d.line(30, uy, 30 + 220 * ease2(p * 3), uy, LC.coral, 5); d.c.globalAlpha = 1;
    d.text('видео-конспект', 30, uy + 30, { col: LC.mute, size: 14 });
  } else if (sc.kind === 'model') {
    rvDrawModel(d, sc.model, lt, sc.ab); rvHeader(d, sc.h, p, LC.mint);
    if (sc.formula) { const f = String(sc.formula).split('\n')[0]; d.c.globalAlpha = ease2((p - .1) * 5); d.tag(f, 560, 76, LC.gold, 16); d.c.globalAlpha = 1; }
  } else if (sc.kind === 'formula') {
    if (sc.model) { d.c.globalAlpha = .18; rvDrawModel(d, sc.model, lt); d.c.globalAlpha = 1; d.rect(0, 0, LAB_W, LAB_H, 'rgba(14,20,36,.55)', null, 0, 0); }
    rvHeader(d, sc.h, p, LC.gold);
    const lines = String(sc.formula).split('\n').filter(Boolean), n = lines.length, step = Math.min(70, 280 / n);
    lines.forEach((l, i) => {
      const q = ease2((p - .08 - i * .55 / n) * 5); if (q <= 0) return;
      d.c.globalAlpha = q; const y = 200 - (n - 1) * step / 2 + i * step;
      const sz = Math.min(26, (step - 8) / (1.8 * d.fs)); d.rect(60, y - sz * d.fs * .9, 600, sz * d.fs * 1.8, 'rgba(255,194,75,.07)', 'rgba(255,194,75,.35)', 1.5, 12);
      d.text(l, 360 + (1 - q) * 30, y, { col: LC.gold, size: sz, bold: true, align: 'center' }); d.c.globalAlpha = 1;
    });
  } else if (sc.kind === 'idea' || sc.kind === 'trap') {
    rvHeader(d, sc.h, p, sc.kind === 'trap' ? LC.coral : LC.violet);
    const col = sc.kind === 'trap' ? LC.coral : LC.violet, r = 34 + 4 * Math.sin(lt * 2);
    d.circle(80, 150, r, sc.kind === 'trap' ? 'rgba(255,122,89,.15)' : 'rgba(180,140,255,.15)', col, 3);
    d.text(sc.kind === 'trap' ? '!' : String(sc.num || '•'), 80, 151, { col, size: 26, bold: true, align: 'center' });
    d.c.globalAlpha = ease2((p - .05) * 4); rvLines(d, sc.key, 140, 130, 540, 21, { col: LC.text, bold: true, max: 7 }); d.c.globalAlpha = 1;
  } else if (sc.kind === 'summary') {
    rvHeader(d, sc.h, p, LC.mint);
    d.c.globalAlpha = ease2(p * 4); rvLines(d, rvFirstSentence(sc.text), 40, 110, 640, 22, { col: LC.text, bold: true, max: 6 }); d.c.globalAlpha = 1;
    d.c.globalAlpha = ease2((p - .5) * 4); d.tag('Дальше — проверь себя в разделе «Тесты»', 360, 350, LC.mint, 14); d.c.globalAlpha = 1;
  }
}

/* ---------- Плеер ---------- */
let RV = null;
const rvVoiceOK = () => typeof speechSynthesis !== 'undefined' && typeof SpeechSynthesisUtterance !== 'undefined';
function rvVoiceOn() { try { return localStorage.getItem('f2-rv-voice') !== '0'; } catch (e) { return true; } }
/** Разметка плеера. */
function rvBox(title) {
  return `<section class="vid rv"><div class="vwrap"><canvas id="rvc" aria-label="${esc(title)}"></canvas><button class="vplay" data-act="rvToggle" aria-label="Смотреть">${ic('play')}</button></div>
    <div class="vctl"><button class="vb" data-act="rvToggle" id="rvpp" aria-label="Пауза/смотреть">${ic('play')}</button><div class="vseek" id="rvseek"><i></i></div><span id="rvtime">0:00</span>
    ${rvVoiceOK() ? `<button class="vb" data-act="rvVoice" id="rvvoice" aria-label="Озвучка">${ic(rvVoiceOn() ? 'volume-2' : 'volume-x')}</button>` : ''}</div>
    <p class="vsub" id="rvsub"></p></section>`;
}
/** Запуск плеера: scenes — сцены, onEnd — вызов по окончании (например, отметить шаг урока). */
function rvInit(scenes, ch, onEnd) {
  rvStop();
  const lens = scenes.map(s => Math.max(5, s.text.length / 13.5)), starts = []; let t = 0; lens.forEach(l => { starts.push(t); t += l; });
  RV = { scenes, ch, onEnd, starts, dur: t, t: 0, playing: false, last: 0, raf: 0, seg: -1, speaking: false, utt: null };
  rvArt(ch); rvFrame(); setTimeout(() => { if (RV && !RV.playing) rvFrame(); }, 120); // обложка главы подгружается асинхронно
  if (!rvDraw.ro && 'ResizeObserver' in window) rvDraw.ro = new ResizeObserver(() => { if (RV && !RV.playing) rvFrame(); });
  if (rvDraw.ro && $('#rvc')) { rvDraw.ro.disconnect(); rvDraw.ro.observe($('#rvc')); }
}
function rvSeg(t) { let i = 0; while (i + 1 < RV.starts.length && t >= RV.starts[i + 1]) i++; const a = RV.starts[i], b = i + 1 < RV.starts.length ? RV.starts[i + 1] : RV.dur; return { i, p: clamp((t - a) / (b - a), 0, 1), lt: t - a, end: b }; }
function rvFrame() {
  const cv = $('#rvc'); if (!cv || !RV) return;
  const { i, p, lt } = rvSeg(RV.t), d = labPainter(cv);
  // до запуска показываем обложку — титр полностью проявлен
  const poster = !RV.playing && RV.t === 0;
  try { rvDraw(d, RV.scenes[i], poster ? .6 : p, poster ? 1 : lt, RV.ch); } catch (e) { console.error('rv draw', e); }
  const sub = $('#rvsub'); if (sub && sub.dataset.i !== String(i)) { sub.textContent = RV.scenes[i].text; sub.dataset.i = i; }
  const bar = $('#rvseek i'); if (bar) bar.style.width = (100 * RV.t / RV.dur) + '%';
  const tm = $('#rvtime'); if (tm) tm.textContent = mmss(RV.t) + ' / ' + mmss(RV.dur);
}
function rvSpeak(i) {
  if (!rvVoiceOK() || !rvVoiceOn()) return;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(RV.scenes[i].text.replace(/[⃗]/g, '').replace(/·/g, ' на ').replace(/\//g, ' делить на '));
  u.lang = 'ru-RU'; u.rate = 1.02;
  const v = speechSynthesis.getVoices().find(x => /^ru/i.test(x.lang)); if (v) u.voice = v;
  u.onend = u.onerror = () => { if (RV && RV.utt === u) RV.speaking = false; };
  RV.utt = u; RV.speaking = true; speechSynthesis.speak(u);
}
function rvLoop(now) {
  if (!RV || !RV.playing) return;
  const dt = (now - RV.last) / 1000; RV.last = now;
  const s = rvSeg(RV.t);
  if (s.i !== RV.seg) { RV.seg = s.i; rvSpeak(s.i); }
  // пока голос дочитывает фрагмент, сцена ждёт на последнем кадре
  const next = RV.t + dt;
  if (RV.speaking && next >= s.end - .05) RV.t = s.end - .05; else RV.t = next;
  if (RV.t >= RV.dur) { RV.t = RV.dur; rvFrame(); return rvEnd(); }
  rvFrame(); RV.raf = requestAnimationFrame(rvLoop);
}
function rvToggle() {
  if (!RV) return;
  RV.playing = !RV.playing;
  if (RV.playing) {
    if (RV.t >= RV.dur - .05) RV.t = 0;
    RV.t = RV.starts[rvSeg(RV.t).i]; RV.seg = -1; RV.last = performance.now(); RV.raf = requestAnimationFrame(rvLoop);
  } else { cancelAnimationFrame(RV.raf); if (rvVoiceOK()) speechSynthesis.cancel(); RV.speaking = false; }
  const pl = $('.rv .vplay'); if (pl) pl.hidden = RV.playing; const pp = $('#rvpp'); if (pp) pp.innerHTML = ic(RV.playing ? 'pause' : 'play');
}
function rvEnd() {
  if (!RV) return; RV.playing = false; RV.speaking = false;
  const pl = $('.rv .vplay'); if (pl) pl.hidden = false; const pp = $('#rvpp'); if (pp) pp.innerHTML = ic('rotate-ccw');
  if (RV.onEnd) RV.onEnd();
}
function rvStop() { if (!RV) return; RV.playing = false; cancelAnimationFrame(RV.raf); if (rvVoiceOK()) speechSynthesis.cancel(); RV = null; }
function rvSeek(e) {
  const b = $('#rvseek'); if (!b || !RV) return;
  const r = b.getBoundingClientRect(); RV.t = clamp((e.clientX - r.left) / r.width, 0, 1) * RV.dur; RV.seg = -1;
  if (rvVoiceOK()) speechSynthesis.cancel(); RV.speaking = false; rvFrame();
}
document.addEventListener('pointerdown', e => { if (e.target.closest('#rvseek')) rvSeek(e); });
function rvAction(act) {
  if (act === 'rvToggle') rvToggle();
  else if (act === 'rvVoice') {
    const on = !rvVoiceOn(); try { localStorage.setItem('f2-rv-voice', on ? '1' : '0'); } catch (e) {}
    const b = $('#rvvoice'); if (b) b.innerHTML = ic(on ? 'volume-2' : 'volume-x');
    if (!on && rvVoiceOK()) { speechSynthesis.cancel(); if (RV) RV.speaking = false; } else if (RV && RV.playing) rvSpeak(rvSeg(RV.t).i);
    toast(on ? 'Озвучка включена (голос устройства)' : 'Озвучка выключена — остаются субтитры');
  }
}

/* ---------- Иллюстрации к карточкам уроков ----------
   Если у карточки нет своего рисунка, показываем подходящую модель лаборатории (кадр опыта).
   Одна модель — не больше одного раза за урок, чтобы картинки не повторялись. */
function cardFigSlot(L, i) {
  if (!L._figs) {
    const used = new Set(), ch = +(Object.keys(CONTENT).find(n => CONTENT[n].lessons.includes(L)) || 0);
    L._figs = L.cards.map(k => { if (k.fig) return null; const m = rvModelFor(k.h + ' ' + (k.f || '') + ' ' + k.t, ch); if (!m || used.has(m)) return null; used.add(m); return m; });
  }
  const m = L._figs[i];
  return m ? `<canvas class="kfig" data-model="${m}" aria-hidden="true"></canvas>` : '';
}
function cardFigsDraw() {
  document.querySelectorAll('canvas.kfig').forEach(cv => {
    const m = cv.dataset.model, x = Object.values(LABS).find(e => e.model === m), M = LAB_MODELS[m]; if (!x || !M) return;
    const d = labPainter(cv), dur = M.dur(x.a0, x.b0);
    d.clear(); d.quiet = true;
    try { M.draw(d, x.a0, x.b0, Number.isFinite(dur) ? dur * .65 : 1); } catch (e) { console.error('card fig', e); }
    d.quiet = false;
  });
}

/** Ролик урока по сценарию L.video (для глав 2–33). Глава 1 использует свои сцены SCENES. */
function rvVideoScenes(ch, L) {
  const c = CHAPTERS[ch - 1];
  return L.video.map(it => { const sc = vsParse(it); if (sc.kind === 'title') { sc.h = L.title; sc.sub = 'Глава ' + c.n + ' · ' + L.par; } return sc; });
}
const isScriptVideo = L => !!(L.video && L.video.length && !(L.video[0].s in SCENES));
