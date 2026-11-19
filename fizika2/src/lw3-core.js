/* =====================================================================
   ЛР № 3 — ядро работы, общее для сайта (labwork3.js) и программы для Windows
   (lw3-desktop/): модель установки, сцена, вопросы, расчёты и проверки, действия
   (data-l3 / data-k3), отчёт. Экраны каждая оболочка рисует сама.
   Ждёт от оболочки: $, esc, f1, ic, toast, render, ui.main, addXP, lwMsg, lwNum, lwGauss, lwShuf, LW_LIST.

   ЛР № 3. Определение показателя адиабаты (метод Клемана — Дезорма).
   Как на занятии: допуск → подготовка (питание секундомера, краны) → 3 опыта
   (накачка до 210–220 мм, 1 мин, h₁; выпуск через K₀ и закрытие, 1 мин, h₂)
   → обработка (γ = h₁/(h₁ − h₂), ⟨γ⟩ ± ⟨Δγ⟩, сравнение с γ_T) → выводы → отчёт (PDF).
   Модель газа в баллоне: масса m, относительная температура θ, давление p (мм вод. ст.);
   сжатие и выпуск — адиабатно, теплообмен со стенками — с постоянной времени τ.
   ===================================================================== */

const L3 = {
  steps: [['admit', 'Допуск'], ['prep', 'Подготовка'], ['exp', 'Опыты'], ['proc', 'Обработка'], ['concl', 'Выводы'], ['report', 'Отчёт']],
  N: 3, P0: 10330, g: 1.4, tauH: 9, tauO: .11, pump: 46, wait: 60, speed: 12
};
let L3_KEY = 'f2-lw3';   // десктоп подставляет ключ своего профиля
let L3S = null;
/* Параметры установки у каждого студента свои (случайные при начале работы, хранятся в его работе),
   чтобы h₁, h₂ и ⟨γ⟩ у соседей отличались и списать было нельзя:
   g — «истинный» показатель адиабаты воздуха в баллоне (влажность, примеси), kH — теплообмен со стенками, kO — скорость выпуска. */
const l3Par = () => ({ g: +(1.372 + Math.random() * .046).toFixed(3), kH: +(.8 + Math.random() * .5).toFixed(2), kO: +(.8 + Math.random() * .5).toFixed(2) });
function l3Fresh() {
  return { v: 1, par: l3Par(), step: 0, max: 0, admit: {}, admitOk: false, power: false, kOpen: false, k0Open: true, prepOk: false,
    zero: 200 + Math.round((Math.random() - .5) * 6), runs: [], proc: {}, procOk: {}, concl: '', cq: {}, cqOk: false,
    fio: '', group: '', date: new Date().toLocaleDateString('ru-RU'), done: false };
}
function l3Load() { if (L3S) return L3S; try { L3S = JSON.parse(localStorage.getItem(L3_KEY) || 'null'); } catch (e) { L3S = null; } if (!L3S || L3S.v !== 1) L3S = l3Fresh(); if (!L3S.par) L3S.par = l3Par(); return L3S; }
function l3Save() { try { localStorage.setItem(L3_KEY, JSON.stringify(L3S)); } catch (e) {} }
const l3St = () => L3.steps[l3Load().step][0];
const l3Fix = (v, d) => Number.isFinite(v) ? v.toFixed(d).replace('.', ',') : '—';
const l3Res = o => o.dg < .01 ? `${l3Fix(o.gm, 3)} ± ${l3Fix(o.dg, 3)}` : `${l3Fix(o.gm, 2)} ± ${l3Fix(o.dg, 2)}`;

/* ---------- модель (не сохраняется: незаконченный опыт начинается заново) ---------- */
let L3V = { tH: L3.tauH, tO: L3.tauO, m: 1, th: 0, p: 0, pump: false, raf: 0, last: 0, sw: 0, swOn: false, speed: 1, phase: 'ready', cur: {}, k0t: 0, hiss: 0 };
function l3Vary() { const P = (L3S && L3S.par) || {}; L3V.tH = L3.tauH * (P.kH || 1) * (1 + .14 * lwGauss()); L3V.tO = L3.tauO * (P.kO || 1) * (1 + .25 * Math.abs(lwGauss())); }
function l3Reset() { l3Vary(); Object.assign(L3V, { m: 1, th: 0, p: 0, pump: false, sw: 0, swOn: false, speed: 1, phase: 'ready', cur: {}, hiss: 0 }); }
function l3Step(dt) {
  const S = L3S, P0 = L3.P0, G = (S.par && S.par.g) || L3.g, k = (G - 1) / G, V = L3V;
  const pFrom = () => P0 * (V.m * (1 + V.th) - 1);
  if (V.pump && S.kOpen && !S.k0Open) { const p0 = V.p; V.m += L3.pump / P0 * dt * (1 - V.p / 900); V.p = pFrom(); V.th += k * (V.p - p0) / P0; }
  if (S.k0Open) {                       // выпуск в атмосферу: быстро до P0, остаток расширяется адиабатно
    const dp = -V.p * (1 - Math.exp(-dt / L3V.tO)); V.th += k * dp / P0; V.th -= V.th * (1 - Math.exp(-dt / L3V.tH));
    V.p += dp; V.m = (1 + V.p / P0) / (1 + V.th); V.hiss = Math.max(0, Math.abs(dp) / dt / 400);
  } else { V.th -= V.th * (1 - Math.exp(-dt / L3V.tH)); V.p = pFrom(); V.hiss = 0; }
  if (V.swOn) V.sw += dt;
}
function l3Loop(now) {
  const cv = $('#l3-cv'); if (!cv) { L3V.raf = 0; return; }
  const dt = Math.min(.05, (now - (L3V.last || now)) / 1000); L3V.last = now;
  const n = Math.max(1, Math.round(L3V.speed)); for (let i = 0; i < n; i++) l3Step(dt);
  if (L3V.speed > 1 && L3V.sw >= L3.wait) { L3V.speed = 1; L3V.swOn = false; L3V.sw = L3.wait; l3Phase(L3V.phase === 'wait1' ? 'read1' : 'read2'); }
  l3Draw(); L3V.raf = requestAnimationFrame(l3Loop);
}
function l3Run() { if (!L3V.raf) { L3V.last = 0; L3V.raf = requestAnimationFrame(l3Loop); } }
const l3Levels = () => { const z = L3S.zero, h = L3V.p; return [z - h / 2, z + h / 2]; };   // левое и правое колено, мм по шкале

/* ---------- сцена ---------- */
/* Оформление сцены: фон-картинка (программа для Windows подставляет Image; null — рисованный фон),
   анимация — молекулы воздуха в баллоне (скорость по температуре, число по массе газа), струя при выпуске,
   плавный поворот ручек кранов. На модель и отсчёты не влияет. */
let L3_BG = null;
const L3_SPR = {};   // картинки приборов (compressor, valve, cork, stopwatch): оболочка кладёт сюда Image; нет картинки — прибор рисуется кодом
const l3Spr = k => { const im = L3_SPR[k]; return im && im.complete && im.naturalWidth ? im : null; };
let L3_THEME = 'dark';   // программа переключает на 'light' (светлая тема); сайт — всегда тёмная
const L3PAL = {
  dark: { bg0: '#16263C', bg1: '#0E1A2B', grid: 'rgba(255,255,255,.025)', tb: ['#6A5A47', '#4A3D30', '#251E18'], tbEdge: 'rgba(255,230,200,.18)', vign: .35,
    lab: '#E7EDF6', lab2: '#C9D4E3', mol: 'rgba(215,232,250,.8)', glass: 'rgba(210,230,250,.8)', air: '220,235,255', ok: '#5AD3A0', bad: '#F2727E' },
  light: { bg0: '#F2F5F9', bg1: '#DCE3EC', grid: 'rgba(20,40,70,.05)', tb: ['#D2B48C', '#B08D63', '#86663F'], tbEdge: 'rgba(255,255,255,.6)', vign: .1,
    lab: '#1C2430', lab2: '#4A5566', mol: 'rgba(60,92,135,.85)', glass: 'rgba(50,85,130,.7)', air: '80,110,150', ok: '#138A55', bad: '#C9303F', veil: 'rgba(242,245,249,.45)' }
};
const L3D = { last: 0, mol: null, jet: [], ak: null, ak0: null };
const l3BalloonPath = c => { c.beginPath(); c.moveTo(214, 128); c.lineTo(258, 128); c.lineTo(258, 146); c.bezierCurveTo(330, 160, 336, 200, 332, 410); c.lineTo(140, 410); c.bezierCurveTo(136, 200, 142, 160, 214, 146); c.closePath(); };
const l3Inside = (x, y) => y > 152 && y < 404 && Math.abs(x - 236) < (y < 222 ? 18 + (y - 146) * .9 : 86);
function l3Anim(S, V) {
  const now = (typeof performance !== 'undefined' ? performance.now() : Date.now()) / 1000, dt = Math.min(.05, Math.max(0, now - (L3D.last || now))); L3D.last = now;
  if (!L3D.mol) { L3D.mol = []; for (let i = 0; i < 72; i++) { let x, y; do { x = 150 + Math.random() * 172; y = 156 + Math.random() * 246; } while (!l3Inside(x, y)); L3D.mol.push({ x, y, a: Math.random() * 6.283, s: .6 + Math.random() * .8 }); } }
  const f = Math.max(.25, Math.min(2.2, 1 + (Number.isFinite(V.th) ? V.th : 0) / .006 * .9));
  for (const p of L3D.mol) {
    p.a += (Math.random() - .5) * dt * 5; const v = 34 * p.s * f, nx = p.x + Math.cos(p.a) * v * dt, ny = p.y + Math.sin(p.a) * v * dt;
    if (l3Inside(nx, ny)) { p.x = nx; p.y = ny; } else p.a += Math.PI * (.6 + Math.random() * .8);
  }
  const hiss = Number.isFinite(V.hiss) ? V.hiss : 0;
  if (S.k0Open && hiss > .05) for (let i = 0, n = Math.min(6, 1 + hiss * 4); i < n; i++) L3D.jet.push({ x: 46 + (Math.random() - .5) * 6, y: 84, vx: (Math.random() - .5) * 50, vy: -70 - Math.random() * 90 * Math.min(1.5, hiss), life: .7 });
  L3D.jet = L3D.jet.filter(j => (j.life -= dt) > 0); for (const j of L3D.jet) { j.x += j.vx * dt; j.y += j.vy * dt; j.vx *= .97; }
  const turn = (cur, open, horizOpen) => { const tg = open === horizOpen ? 0 : Math.PI / 2; return cur == null ? tg : cur + (tg - cur) * Math.min(1, dt * 14); };
  L3D.ak = turn(L3D.ak, S.kOpen, true); L3D.ak0 = turn(L3D.ak0, S.k0Open, false);
  return now;
}
function l3Draw() {
  const cv = $('#l3-cv'); if (!cv) return; const S = L3S, V = L3V;
  const box = cv.getBoundingClientRect(), cssW = box.width || 600, dpr = Math.min(2.5, devicePixelRatio || 1), k = cssW / 580, cssH = 452 * k;
  if (cv.width !== Math.round(cssW * dpr)) { cv.width = Math.round(cssW * dpr); cv.height = Math.round(cssH * dpr); }
  const c = cv.getContext('2d'); c.setTransform(dpr * k, 0, 0, dpr * k, 0, 0);
  const now = l3Anim(S, V), pumping = V.pump && S.kOpen && !S.k0Open, P = L3PAL[L3_THEME] || L3PAL.dark;
  // фон и стол
  let g;
  const bg = L3_BG && L3_BG.complete && L3_BG.naturalWidth ? L3_BG : null;
  if (bg) {   // картинка во всю ширину; её кромка стола (доля высоты edge) — на основании приборов, y = 419
    const h = bg.naturalHeight * 580 / bg.naturalWidth, y0 = 419 - (L3_BG.edge ?? 1) * h;
    c.fillStyle = L3_BG.top || '#0F2237'; c.fillRect(0, 0, 580, 452);
    const top = L3_BG.top || '#0F2237', tr = top.length === 7 ? `rgba(${parseInt(top.slice(1, 3), 16)},${parseInt(top.slice(3, 5), 16)},${parseInt(top.slice(5, 7), 16)},0)` : 'rgba(0,0,0,0)';
    if (y0 > 0) { g = c.createLinearGradient(0, y0 - 1, 0, y0 + 24); g.addColorStop(0, top); g.addColorStop(1, tr); }
    c.drawImage(bg, 0, y0, 580, h);
    if (y0 > 0) { c.fillStyle = g; c.fillRect(0, y0 - 1, 580, 25); }
    if (P.veil) { c.fillStyle = P.veil; c.fillRect(0, 0, 580, 418); }   // светлый фон чуть бледнее, чтобы не спорил с подписями
  } else {
    g = c.createLinearGradient(0, 0, 0, 452); g.addColorStop(0, P.bg0); g.addColorStop(1, P.bg1); c.fillStyle = g; c.fillRect(0, 0, 580, 452);
    c.fillStyle = P.grid; for (let x = 0; x < 580; x += 24) c.fillRect(x, 0, 1, 452);
    g = c.createLinearGradient(0, 418, 0, 452); g.addColorStop(0, P.tb[0]); g.addColorStop(.12, P.tb[1]); g.addColorStop(1, P.tb[2]); c.fillStyle = g; c.fillRect(0, 418, 580, 34);
    c.fillStyle = P.tbEdge; c.fillRect(0, 418, 580, 1.5);
  }
  g = c.createRadialGradient(290, 240, 160, 290, 240, 420); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, `rgba(0,0,0,${P.vign})`); c.fillStyle = g; c.fillRect(0, 0, 580, 452);
  const shadow = (x, w) => { g = c.createRadialGradient(x, 419, 2, x, 419, w); g.addColorStop(0, 'rgba(0,0,0,.55)'); g.addColorStop(1, 'rgba(0,0,0,0)'); c.save(); c.translate(x, 419); c.scale(1, .12); c.translate(-x, -419); c.fillStyle = g; c.beginPath(); c.arc(x, 419, w, 0, 7); c.fill(); c.restore(); };
  shadow(236, 120); shadow(110, 52); shadow(485, 48);
  // трубки (металл)
  // трубки (металл): отрезки с объёмным бликом; фитинги — после приборов, поверх стыков
  const metal = (vert, a, b) => { g = vert ? c.createLinearGradient(a, 0, b, 0) : c.createLinearGradient(0, a, 0, b);   /* поперёк трубы */
    [[0, '#4A5565'], [.22, '#AEBACA'], [.42, '#EEF3F9'], [.68, '#8C9AAD'], [1, '#424D5C']].forEach(([o, col]) => g.addColorStop(o, col)); return g; };
  const seg = (x1, y1, x2, y2, w = 7) => { const v = x1 === x2, x = Math.min(x1, x2), y = Math.min(y1, y2);
    c.fillStyle = v ? metal(true, x1 - w / 2, x1 + w / 2) : metal(false, y1 - w / 2, y1 + w / 2); v ? c.fillRect(x1 - w / 2, y, w, Math.abs(y2 - y1)) : c.fillRect(x, y1 - w / 2, Math.abs(x2 - x1), w);
    c.fillStyle = 'rgba(20,28,40,.35)'; v ? (c.fillRect(x1 - w / 2 - .6, y, .8, Math.abs(y2 - y1)), c.fillRect(x1 + w / 2 - .2, y, .8, Math.abs(y2 - y1))) : (c.fillRect(x, y1 - w / 2 - .6, Math.abs(x2 - x1), .8), c.fillRect(x, y1 + w / 2 - .2, Math.abs(x2 - x1), .8)); };
  seg(46, 96, 470, 96); seg(470, 96, 470, 122); seg(110, 96, 110, 300); seg(236, 96, 236, 128);
  const sleeve = (x, y, vert, len = 10, w = 11) => { c.save(); c.translate(x, y); if (vert) c.rotate(Math.PI / 2);
    c.fillStyle = metal(false, -w / 2, w / 2); c.beginPath(); c.roundRect ? c.roundRect(-len / 2, -w / 2, len, w, 2) : c.rect(-len / 2, -w / 2, len, w); c.fill();
    c.fillStyle = 'rgba(25,32,45,.55)'; c.fillRect(-len / 2, -w / 2, 1.4, w); c.fillRect(len / 2 - 1.4, -w / 2, 1.4, w); c.strokeStyle = 'rgba(20,28,40,.5)'; c.lineWidth = .8; c.strokeRect(-len / 2, -w / 2, len, w); c.restore(); };
  const fittings = () => {
    sleeve(110, 99, true, 9, 11); sleeve(110, 96, false, 18, 12);            // тройник к крану K
    sleeve(236, 99, true, 8, 11); sleeve(236, 96, false, 18, 12);            // тройник к пробке
    g = c.createRadialGradient(468, 94, 1, 470, 96, 9); g.addColorStop(0, '#EEF3F9'); g.addColorStop(.6, '#9AA8BA'); g.addColorStop(1, '#4A5565');
    c.fillStyle = g; c.beginPath(); c.arc(470, 96, 7.5, 0, 7); c.fill(); c.strokeStyle = 'rgba(20,28,40,.5)'; c.lineWidth = .8; c.stroke();   // уголок к манометру
    sleeve(110, 284, true, 9, 11);                                            // муфта у компрессора
    const clamp = (x, y, vert) => { c.save(); c.translate(x, y); if (vert) c.rotate(-Math.PI / 2);   // хомут, крепление к стене
      c.fillStyle = '#2B3442'; c.fillRect(-2, -14, 4, 9); c.fillRect(-2.6, -6.5, 5.2, 13); c.fillStyle = '#7D8A9C'; c.beginPath(); c.arc(0, -13, 2.2, 0, 7); c.fill(); c.restore(); };
    clamp(170, 96); clamp(360, 96); clamp(110, 160, true);
  };
  // баллон Б: стекло, оттенок по температуре, молекулы воздуха
  const t = Math.max(-1, Math.min(1, V.th / .006));
  c.save(); l3BalloonPath(c);
  g = c.createLinearGradient(140, 0, 332, 0); g.addColorStop(0, 'rgba(170,205,235,.10)'); g.addColorStop(.3, 'rgba(225,240,255,.07)'); g.addColorStop(.7, 'rgba(200,225,250,.04)'); g.addColorStop(1, 'rgba(140,175,210,.10)');   /* стекло почти прозрачное: фон виден сквозь баллон */ c.fillStyle = g; c.fill();
  if (Math.abs(t) > .02) { c.fillStyle = t > 0 ? `rgba(255,120,70,${.26 * t})` : `rgba(90,170,255,${-.3 * t})`; c.fill(); }
  c.clip();
  const n = Math.max(24, Math.min(L3D.mol.length, Math.round(48 * (1 + ((V.m || 1) - 1) * 30))));
  const mc = t > .05 ? `rgba(255,${Math.round(205 - 90 * t)},${Math.round(170 - 110 * t)},.85)` : t < -.05 ? `rgba(${Math.round(190 + 80 * t)},${Math.round(220 + 20 * t)},255,.85)` : P.mol;
  c.fillStyle = mc; for (let i = 0; i < n; i++) { const p = L3D.mol[i]; c.beginPath(); c.arc(p.x, p.y, 2.1, 0, 7); c.fill(); }
  g = c.createLinearGradient(150, 0, 190, 0); g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(.5, 'rgba(255,255,255,.22)'); g.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = g; c.fillRect(150, 170, 40, 230);
  g = c.createLinearGradient(300, 0, 318, 0); g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(.5, 'rgba(255,255,255,.12)'); g.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = g; c.fillRect(300, 200, 18, 190);
  c.fillStyle = 'rgba(255,255,255,.07)'; c.fillRect(140, 400, 192, 10);
  c.restore();
  l3BalloonPath(c); c.strokeStyle = P.glass; c.lineWidth = 2; c.stroke();
  c.strokeStyle = 'rgba(255,255,255,.35)'; c.lineWidth = 1; c.beginPath(); c.moveTo(170, 175); c.quadraticCurveTo(156, 220, 158, 300); c.stroke();
  const sc = l3Spr('cork');
  if (sc) { const w = 58, h = w * sc.naturalHeight / sc.naturalWidth; c.save(); c.beginPath(); c.rect(0, 99, 580, 80); c.clip(); c.drawImage(sc, 236 - w / 2, 160 - h, w, h); c.restore(); }   // трубка уходит под магистраль, пробка — в горлышко
  else { g = c.createLinearGradient(208, 0, 264, 0); g.addColorStop(0, '#5A4630'); g.addColorStop(.45, '#8C7150'); g.addColorStop(1, '#4E3D29'); c.fillStyle = g; c.fillRect(208, 118, 56, 14);
    c.fillStyle = 'rgba(255,255,255,.18)'; c.fillRect(208, 118, 56, 2); }
  c.fillStyle = P.lab; c.font = '800 20px "Golos UI", system-ui'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('Б', 236, 380);
  c.font = '600 10px "Golos UI", system-ui'; c.fillStyle = P.lab2; c.fillText(t > .15 ? 'воздух нагрет' : t < -.15 ? 'воздух охладился' : 'комнатная температура', 236, 396);
  // компрессор Н (дрожит, пока работает)
  const jx = pumping ? Math.sin(now * 95) * .9 : 0;
  c.save(); c.translate(jx, 0);
  const sh = l3Spr('compressor');
  if (sh) { const w = 76, h = w * sh.naturalHeight / sh.naturalWidth; c.drawImage(sh, 110 - w / 2, 280, w, h);
    c.fillStyle = pumping ? '#5AD3A0' : '#1A2230'; c.beginPath(); c.arc(110 - w / 2 + w * .874, 280 + h * .349, 3.4, 0, 7); c.fill();
    if (pumping) { c.fillStyle = 'rgba(90,211,160,.3)'; c.beginPath(); c.arc(110 - w / 2 + w * .874, 280 + h * .349, 8, 0, 7); c.fill(); }
  } else {
  g = c.createLinearGradient(74, 300, 146, 364); g.addColorStop(0, '#56657C'); g.addColorStop(1, '#2F3A4B'); c.fillStyle = g; c.beginPath(); c.roundRect ? c.roundRect(74, 300, 72, 64, 6) : c.rect(74, 300, 72, 64); c.fill();
  c.strokeStyle = 'rgba(255,255,255,.14)'; c.lineWidth = 1; c.stroke();
  c.strokeStyle = 'rgba(0,0,0,.35)'; c.lineWidth = 2; for (let y = 350; y <= 358; y += 4) { c.beginPath(); c.moveTo(82, y); c.lineTo(104, y); c.stroke(); }
  c.fillStyle = '#E7EDF6'; c.font = '800 18px "Golos UI", system-ui'; c.textAlign = 'center'; c.fillText('Н', 110, 334);
  c.fillStyle = pumping ? '#5AD3A0' : '#2A3443'; c.beginPath(); c.arc(136, 310, 5, 0, 7); c.fill();
  if (pumping) { c.fillStyle = 'rgba(90,211,160,.25)'; c.beginPath(); c.arc(136, 310, 10, 0, 7); c.fill(); }
  }
  c.restore();
  fittings();
  c.font = '600 9px "Golos UI", system-ui'; c.fillStyle = P.lab2; c.textAlign = 'center'; c.fillText('компрессор', 110, sh ? 384 : 376);
  // краны: K — открыт горизонтально; K₀ — закрыт горизонтально (ручка поворачивается плавно)
  const sv = l3Spr('valve');
  const valve = (x, y, open, ang, name, vert) => {
    if (sv) { const w = 55, h = w * sv.naturalHeight / sv.naturalWidth; c.save(); c.translate(x, y); if (vert) c.rotate(Math.PI / 2); c.drawImage(sv, -w / 2, -h / 2, w, h); c.restore(); }
    else { g = c.createRadialGradient(x - 3, y - 3, 1, x, y, 11); g.addColorStop(0, '#C3CCD8'); g.addColorStop(1, '#5F6B7B'); c.fillStyle = g; c.beginPath(); c.arc(x, y, 10, 0, 7); c.fill(); }
    c.save(); c.translate(x, y); c.rotate(ang); c.fillStyle = 'rgba(0,0,0,.35)'; c.fillRect(-17, -2, 34, 7);
    g = c.createLinearGradient(0, -4, 0, 4); g.addColorStop(0, open ? '#8CF0C4' : '#FF8A90'); g.addColorStop(1, open ? '#2FA678' : '#B8323A'); c.fillStyle = g;
    c.beginPath(); c.roundRect ? c.roundRect(-17, -3.5, 34, 7, 3.5) : c.rect(-17, -3.5, 34, 7); c.fill(); c.restore();
    c.fillStyle = P.lab; c.beginPath(); c.arc(x, y, 3, 0, 7); c.fill();
    c.font = '800 13px "Golos UI", system-ui'; const lf = sv && vert; c.textAlign = lf ? 'right' : 'left'; const lx = lf ? x - 18 : x + (sv ? 17 : 14), ly = sv ? 19 : 16;   /* у K подпись слева — справа баллон */ c.fillText(name, lx, y - ly); c.font = '600 9px "Golos UI", system-ui'; c.fillStyle = open ? P.ok : P.bad; c.fillText(open ? 'открыт' : 'закрыт', lx, y + ly + 4); };
  valve(110, 220, S.kOpen, L3D.ak, 'K', true); valve(46, 96, S.k0Open, L3D.ak0, 'K₀');
  if (V.hiss > .05) { c.strokeStyle = `rgba(${P.air},${Math.min(.9, V.hiss)})`; c.lineWidth = 1.5; for (let i = 0; i < 4; i++) { c.beginPath(); c.arc(46, 70 - i * 9, 6 + i * 4, Math.PI * 1.15, Math.PI * 1.85); c.stroke(); } }
  for (const j of L3D.jet) { c.fillStyle = `rgba(${P.air},${(j.life / .7) * .8})`; c.beginPath(); c.arc(j.x, j.y, 1.8, 0, 7); c.fill(); }
  // манометр М: U-трубка со шкалой 0…400 мм
  const Y = mm => 404 - mm * .72, [hl, hr] = l3Levels();
  g = c.createLinearGradient(444, 0, 526, 0); g.addColorStop(0, '#6B4F31'); g.addColorStop(.5, '#8A6A45'); g.addColorStop(1, '#5C432A'); c.fillStyle = g; c.fillRect(444, Y(400) - 12, 82, Y(0) - Y(400) + 34);
  c.fillStyle = '#F3E9C8'; c.fillRect(450, Y(400) - 6, 70, Y(0) - Y(400) + 12);
  c.strokeStyle = '#3A2F17'; c.fillStyle = '#3A2F17'; c.font = '600 8px "Golos UI", system-ui'; c.textAlign = 'right';
  for (let mm = 0; mm <= 400; mm += 10) { const y = Y(mm); c.lineWidth = mm % 50 ? .6 : 1.2; c.beginPath(); c.moveTo(485 - (mm % 50 ? 4 : 8), y); c.lineTo(485 + (mm % 50 ? 4 : 8), y); c.stroke(); if (mm % 50 === 0) c.fillText(mm, 516, y); }
  const tube = (x, lvl) => { c.fillStyle = 'rgba(220,235,250,.35)'; c.fillRect(x - 5, Y(400), 10, Y(0) - Y(400));
    const yt = Y(lvl); g = c.createLinearGradient(x - 4, 0, x + 4, 0); g.addColorStop(0, '#2C6FB8'); g.addColorStop(.5, '#4FA0F0'); g.addColorStop(1, '#2C6FB8'); c.fillStyle = g;
    c.beginPath(); c.moveTo(x - 4, yt - 1.6); c.quadraticCurveTo(x, yt + 1.6, x + 4, yt - 1.6); c.lineTo(x + 4, Y(0) + 8); c.lineTo(x - 4, Y(0) + 8); c.closePath(); c.fill();
    c.fillStyle = 'rgba(255,255,255,.55)'; c.fillRect(x - 3.5, Y(400), 1.2, Y(0) - Y(400)); };
  tube(470, hl); tube(500, hr); c.fillStyle = '#3E8EE0'; c.fillRect(466, Y(0), 38, 8);
  c.fillStyle = P.lab; c.font = '800 14px "Golos UI", system-ui'; c.textAlign = 'center'; c.fillText('М', 485, 440 - 4);
  // секундомер
  const ss = l3Spr('stopwatch');
  if (ss) { const w = 150, h = w * ss.naturalHeight / ss.naturalWidth, x0 = 296, y0 = 16; c.drawImage(ss, x0, y0, w, h);
    c.fillStyle = S.power ? '#7CF29B' : '#24402C'; c.font = '700 19px "Golos UI", ui-monospace, monospace'; c.textAlign = 'right'; c.textBaseline = 'middle'; c.fillText(S.power ? l3Fix(V.sw, 1) : '', x0 + w * .77, y0 + h * .46);
    c.fillStyle = S.power ? '#5AD3A0' : '#5B2A2E'; c.beginPath(); c.arc(x0 + w * .916, y0 + h * .463, 3.2, 0, 7); c.fill();
    if (S.power) { c.fillStyle = 'rgba(90,211,160,.3)'; c.beginPath(); c.arc(x0 + w * .916, y0 + h * .463, 7, 0, 7); c.fill(); }
    c.textAlign = 'left';
  } else {
  g = c.createLinearGradient(0, 16, 0, 70); g.addColorStop(0, '#2A3445'); g.addColorStop(1, '#1A2230'); c.fillStyle = g; c.fillRect(300, 18, 140, 52);
  c.fillStyle = '#0B1A10'; c.fillRect(308, 25, 92, 30); c.fillStyle = S.power ? '#7CF29B' : '#24402C'; c.font = '700 20px "Golos UI", ui-monospace, monospace'; c.textAlign = 'right'; c.fillText(S.power ? l3Fix(V.sw, 1) : '', 396, 41);
  c.fillStyle = '#9FB1C8'; c.font = '600 8px "Golos UI", system-ui'; c.textAlign = 'left'; c.fillText('СЕКУНДОМЕР, с', 308, 64); c.fillStyle = S.power ? '#5AD3A0' : '#5B2A2E'; c.beginPath(); c.arc(424, 38, 6, 0, 7); c.fill();
  }
  if (V.speed > 1) { c.fillStyle = '#F2B544'; c.font = '700 10px "Golos UI", system-ui'; c.fillText(`ожидание ускорено ×${L3.speed}`, 300, 84); }
  // лупа: оба колена манометра (на чтении h₁ и h₂)
  if (V.phase === 'read1' || V.phase === 'read2') {
    const lens = (X0, lvl, title) => { const W = 136, H = 118, Z = 8, Y0 = 300, yz = mm => Y0 + H / 2 - (mm - lvl) * Z;
      c.save(); c.beginPath(); c.rect(X0, Y0, W, H); c.clip(); c.fillStyle = '#F3E9C8'; c.fillRect(X0, Y0, W, H);
      c.fillStyle = 'rgba(62,142,224,.85)'; c.fillRect(X0 + 84, yz(lvl), 26, H); c.fillStyle = 'rgba(220,235,250,.6)'; c.fillRect(X0 + 84, Y0, 26, yz(lvl) - Y0);
      c.strokeStyle = '#3A2F17'; c.fillStyle = '#3A2F17'; c.textAlign = 'right'; c.textBaseline = 'middle';
      for (let mm = Math.floor(lvl - 8); mm <= lvl + 8; mm++) { const y = yz(mm), L = mm % 10 ? (mm % 5 ? 10 : 16) : 22; c.lineWidth = mm % 5 ? 1.2 : 2; c.beginPath(); c.moveTo(X0 + 82, y); c.lineTo(X0 + 82 - L, y); c.stroke(); if (mm % 5 === 0) { c.font = '800 16px "Golos UI", system-ui'; c.fillText(mm, X0 + 56, y); } }
      c.restore(); c.strokeStyle = '#F2B544'; c.lineWidth = 2; c.strokeRect(X0, Y0, W, H); c.fillStyle = 'rgba(11,21,36,.85)'; c.fillRect(X0, Y0 - 18, W, 18); c.fillStyle = '#F2B544'; c.font = '700 11px "Golos UI", system-ui'; c.textAlign = 'left'; c.textBaseline = 'middle'; c.fillText(title, X0 + 6, Y0 - 9); };
    lens(150, hl, 'левое колено, мм'); lens(296, hr, 'правое колено, мм');
  }
}


/* 1. Допуск */
const L3_ADMIT = [
  ['Как записывается первый закон термодинамики?', 'Q = ΔU + A', ['Q = ΔU − A', 'A = Q + ΔU', 'Q = A']],
  ['Что называют показателем адиабаты γ?', 'Отношение молярных теплоёмкостей при постоянном давлении и при постоянном объёме: γ = Cₘₚ/Cₘᵥ', ['Отношение давлений до и после опыта', 'Число степеней свободы молекулы', 'Отношение Cₘᵥ к Cₘₚ']],
  ['По какой формуле в работе находят γ?', 'γ = h₁/(h₁ − h₂)', ['γ = h₂/(h₁ − h₂)', 'γ = (h₁ − h₂)/h₁', 'γ = h₁/h₂']],
  ['Какой процесс происходит при быстром выпуске воздуха через кран K₀?', 'Адиабатное расширение — газ охлаждается', ['Изотермическое расширение', 'Изохорное нагревание', 'Изобарное сжатие']],
  ['Зачем после накачки и после выпуска ждут 1 минуту?', 'Чтобы температура газа в баллоне сравнялась с комнатной и давление установилось', ['Чтобы остыл компрессор', 'Чтобы жидкость в манометре испарилась', 'Так быстрее']],
  ['До какого избыточного давления накачивают воздух?', '210…220 мм по манометру', ['50…60 мм', '400…500 мм', 'До атмосферного']],
  ['Что будет, если закрыть кран K₀ слишком рано?', 'h₂ получится больше, и γ окажется завышенным', ['h₂ получится меньше, γ занижен', 'Ничего не изменится', 'Баллон лопнет']],
  ['Чему равно теоретическое значение γ для воздуха (двухатомный газ, i = 5)?', '1,4', ['1,67', '1,33', '1']]
];
/* Тексты допуска: теория, установка, ТБ (HTML) */
const L3_TEXT = {
  theory: `<p><b>Первый закон термодинамики:</b> Q = ΔU + A. Молярные теплоёмкости идеального газа: Cₘᵥ = iR/2, Cₘₚ = (i + 2)R/2 (уравнение Майера: Cₘₚ − Cₘᵥ = R).</p>
    <p><b>Показатель адиабаты</b> γ = Cₘₚ/Cₘᵥ = (i + 2)/i. Для воздуха (двухатомные молекулы, i = 5) γ = 1,4. Адиабата: PVᵞ = const — теплообмена нет, работа идёт за счёт внутренней энергии.</p>
    <p><b>Метод.</b> В баллон накачивают воздух и ждут, пока он остынет до комнатной температуры: избыточное давление h₁. Быстро выпускают воздух до атмосферного давления (адиабатное расширение — газ охлаждается), закрывают кран и ждут: газ нагревается обратно, давление растёт до h₂. Из уравнения Пуассона и закона Бойля — Мариотта: γ = h₁/(h₁ − h₂).</p>`,
  equip: `<p>Б — большой стеклянный баллон; K — кран, соединяющий баллон с компрессором Н; K₀ — кран, соединяющий баллон с атмосферой; М — U-образный жидкостный манометр (избыточное давление — разность уровней в коленах, мм); секундомер. Кран K открыт в горизонтальном положении ручки, K₀ — в вертикальном.</p>`,
  safety: `<p>Работу начинают с разрешения преподавателя. Компрессор и секундомер питаются от сети: не касайся проводов и токоведущих частей, при неисправности отключи питание и сообщи преподавателю. Баллон стеклянный — не накачивай выше 220 мм по манометру, не ставь на него предметы и не перемещай. Компрессор работает, пока нажата кнопка: не оставляй его включённым.</p>`
};
const L3_AIM = () => LW_LIST[2].aim;

function l3Phase(ph) { L3V.phase = ph; render(); }

/* ---------- обработка ---------- */
function l3Calc() {
  const S = L3S, a = S.runs.map(r => ({ h1: r.h1, h2: r.h2, g: r.h1 / (r.h1 - r.h2) })), N = a.length, gm = a.reduce((s, x) => s + x.g, 0) / N;
  const dg = a.reduce((s, x) => s + Math.abs(gm - x.g), 0) / Math.sqrt(N * (N - 1)), gT = 1.4;
  const o = { a, gm, dg, eg: dg / gm * 100, gT, e: Math.abs(gT - gm) / gT * 100 }; a.forEach((x, i) => { o['g' + (i + 1)] = x.g; }); return o;
}
const L3_KEYS = ['g1', 'g2', 'g3', 'gm', 'dg', 'eg', 'gT', 'e'];
function l3Ok(k, u, o) { const e = o[k]; if (!Number.isFinite(u)) return false;
  if (k === 'eg' || k === 'e') return Math.abs(u - e) <= Math.max(.25, e * .08);
  if (k === 'dg') return Math.abs(u - e) <= Math.max(.003, e * .1);
  return Math.abs(u - e) <= .006; }

/* 5. Выводы и контрольные вопросы */
const L3_CQ = [
  ['Как формулируется первый закон термодинамики?', 'Количество теплоты, сообщённое системе, идёт на изменение её внутренней энергии и на работу против внешних сил: Q = ΔU + A', ['Энергия системы всегда убывает', 'Теплота не может перейти от холодного тела к горячему', 'Работа равна изменению импульса']],
  ['Как записывается первый закон для изотермического процесса?', 'Q = A (ΔU = 0)', ['Q = ΔU', 'A = −ΔU', 'Q = 0']],
  ['Как записывается первый закон для адиабатного процесса?', 'A = −ΔU (Q = 0)', ['Q = A', 'Q = ΔU', 'ΔU = 0']],
  ['Какие процессы протекают в баллоне в опыте?', 'Сжатие при накачке, изохорное охлаждение, адиабатное расширение, изохорное нагревание', ['Только изотермические', 'Только адиабатные', 'Изобарное нагревание и изотермическое сжатие']],
  ['Почему газ при сжатии нагревается, а при расширении охлаждается?', 'При адиабатном сжатии работа внешних сил увеличивает внутреннюю энергию, при расширении газ совершает работу за счёт внутренней энергии', ['Из-за трения о стенки', 'Из-за испарения жидкости манометра', 'Из-за работы компрессора']],
  ['Запишите уравнение Майера.', 'Cₘₚ = Cₘᵥ + R', ['Cₘₚ = Cₘᵥ − R', 'Cₘₚ = γ·R', 'Cₘᵥ = (i + 2)R/2']],
  ['Почему Cₘₚ больше Cₘᵥ?', 'При постоянном давлении часть теплоты идёт на работу расширения; разница равна R', ['Потому что объём больше', 'Они равны', 'При постоянном объёме газ совершает больше работы']],
  ['Как теоретически вычислить показатель адиабаты?', 'γ = (i + 2)/i, где i — число степеней свободы молекулы', ['γ = i/(i + 2)', 'γ = R/Cₘᵥ', 'γ = h₁/h₂']]
];
function l3AutoConcl(o) {
  const hi = o.gm > o.gT;
  return `Изучены основные положения термодинамики и методом Клемана — Дезорма определён показатель адиабаты воздуха: γ = ${l3Res(o)} (относительная погрешность ε_γ = ${f1(o.eg, 1)} %). ` +
    `Теоретическое значение для двухатомного газа (i = 5) γ_T = (i + 2)/i = 1,40; расхождение ε = ${f1(o.e, 1)} %. ` +
    (Math.abs(o.gm - o.gT) <= 2 * o.dg ? 'Экспериментальное значение согласуется с теоретическим в пределах погрешности опыта. ' : o.e <= 4 ? 'Экспериментальное значение близко к теоретическому. ' : '') +
    `Отличие ⟨γ⟩ ${hi ? 'в большую' : 'в меньшую'} сторону объясняется в первую очередь моментом закрытия крана K₀: ${hi ? 'при раннем закрытии давление не успевает сравняться с атмосферным и h₂ получается больше' : 'при позднем закрытии воздух успевает нагреться от стенок и выйти, и h₂ получается меньше'}; кроме того, расширение не строго адиабатно из-за теплообмена со стенками баллона.`;
}

/* Отчёт по бланку кафедры (4 листа А4): HTML без рамки приложения */
function l3ReportHtml() {
  const S = l3Load();
  const o = l3Calc(), ln = v => `<span class="ul">${esc(v || '')}</span>`, [dd, mon, yy] = String(S.date || '').split('.');
  const MON = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
  const equip = [['Большой стеклянный баллон Б', '—', '—'], ['Краны K (к компрессору) и K₀ (к атмосфере)', '—', '—'], ['Компрессор Н', '—', '—'], ['Манометр М U-образный жидкостный', '0–400 мм', '1 мм'], ['Секундомер', '—', '0,1 с']];
  const p1 = `<section class="lwp"><p class="c b">Лаборатория кафедры физики</p><hr>
    <p class="row">Оценка ${ln('')} Подпись преподавателя ${ln('')}</p>
    <p class="row">Курсант (студент) ${ln(S.fio)} Класс <span class="ul s">${esc(S.group || '')}</span></p>
    <p class="row">Дата выполнения «<span class="ul s">${esc(dd || '')}</span>» <span class="ul m">${MON[(+mon || 1) - 1]}</span> 20<span class="ul s">${esc((yy || '').slice(2))}</span> г.</p>
    <p class="c mt2">ОТЧЕТ<br>по лабораторной работе № <span class="ul s">3</span></p>
    <p class="row">Наименование ${ln('Определение показателя адиабаты')}</p>
    <p class="row">Цель ${ln(LW_LIST[2].aim)}</p>
    <p class="c b mt2">ОБОРУДОВАНИЕ И ПРИБОРЫ</p>
    <table><tr><th>№ п.п.</th><th>Наименование</th><th>Предел измерения</th><th>Погрешность измерения</th></tr>
    ${Array.from({ length: 10 }, (_, i) => `<tr><td>${equip[i] ? i + 1 : ''}</td><td class="l">${equip[i] ? esc(equip[i][0]) : '&nbsp;'}</td><td>${equip[i] ? esc(equip[i][1]) : ''}</td><td>${equip[i] ? esc(equip[i][2]) : ''}</td></tr>`).join('')}</table></section>`;
  const p2 = `<section class="lwp"><p class="c b">СХЕМА УСТАНОВКИ</p>${l3SchemeSvg()}
    <p class="small">Б — баллон; K — кран к компрессору Н; K₀ — кран к атмосфере; М — U-образный манометр; h — разность уровней в коленах (избыточное давление).</p><hr>
    <p class="c b">РЕЗУЛЬТАТЫ ИЗМЕРЕНИЙ</p>
    <p class="small">Таблица 1</p><table><tr><th>№ изм.</th><th>h₁, мм</th><th>h₂, мм</th><th>γ</th></tr>
    ${o.a.map((x, i) => `<tr><td>${i + 1}</td><td>${x.h1}</td><td>${x.h2}</td><td>${l3Fix(x.g, 3)}</td></tr>`).join('')}
    <tr><td colspan="3">Среднее значение</td><td>⟨γ⟩ = ${l3Fix(o.gm, 3)}</td></tr></table>
    <p class="row sign">Подпись зав. кабинетом ${ln('')}</p></section>`;
  const p3 = `<section class="lwp"><p class="c b">РАСЧЕТНЫЕ ФОРМУЛЫ ИСКОМЫХ ВЕЛИЧИН И ПОГРЕШНОСТЕЙ</p>
    <div class="fm"><p>γ = h₁/(h₁ − h₂) &nbsp; (19); &nbsp; ⟨γ⟩ = Σγᵢ/N</p><p>⟨Δγ⟩ = Σ|⟨γ⟩ − γᵢ| / √(N(N − 1)); &nbsp; ε_γ = ⟨Δγ⟩/⟨γ⟩·100 %</p><p>γ_T = Cₘₚ/Cₘᵥ = (i + 2)/i; &nbsp; ε = |γ_T − ⟨γ⟩|/γ_T·100 %</p></div><hr>
    <p class="c b">ВЫЧИСЛЕНИЕ РЕЗУЛЬТАТОВ ИЗМЕРЕНИЯ И ПОГРЕШНОСТЕЙ</p>
    ${o.a.map((x, i) => `<p class="small">γ${'₁₂₃'[i]} = ${x.h1}/(${x.h1} − ${x.h2}) = ${l3Fix(x.g, 3)}</p>`).join('')}
    <p class="small">⟨γ⟩ = ${l3Fix(o.gm, 3)}; &nbsp; ⟨Δγ⟩ = ${l3Fix(o.dg, 3)}; &nbsp; ε_γ = ${f1(o.eg, 1)} %</p>
    <p class="small"><b>γ = ${l3Res(o)}</b></p>
    <p class="small">γ_T = (5 + 2)/5 = 1,40 (воздух — двухатомный газ, i = 5); &nbsp; ε = |1,40 − ${l3Fix(o.gm, 3)}|/1,40·100 % = ${f1(o.e, 1)} %</p></section>`;
  const p4 = `<section class="lwp"><p class="c b">ПОСТРОЕНИЕ ГРАФИКОВ</p>${l3GraphSvg(o)}
    <p class="small c">Процессы в баллоне на (P, Vₘ)-диаграмме для опыта 1 (в окрестности P₀): 2–3 — адиабатное расширение, 3–4 — изохорное нагревание, 2–4 — изотерма. Наклон адиабаты в γ раз больше наклона изотермы.</p>
    <p class="c b mt2">ВЫВОДЫ ПО ПРОДЕЛАННОЙ РАБОТЕ</p><p class="concl">${esc(S.concl).replace(/\n/g, '<br>')}</p>
    <p class="row sign">Подпись исполнителя ${ln('')}</p></section>`;
  return `<article class="lwr">${p1}${p2}${p3}${p4}</article>`;
}
function l3GraphSvg(o) {
  const x = o.a[0], h1 = x.h1, h2 = x.h2, dx = h1 - h2, X = v => 70 + v / (dx * 1.6) * 420, Y = p => 260 - p / (h1 * 1.15) * 230;
  return `<svg class="lwr-svg" viewBox="0 0 540 300"><line x1="70" y1="260" x2="520" y2="260" stroke="#000"/><line x1="70" y1="260" x2="70" y2="15" stroke="#000"/>
    <text x="516" y="278" font-size="12" text-anchor="end">Vₘ</text><text x="76" y="20" font-size="12">P</text>
    <text x="64" y="${Y(0) + 4}" font-size="11" text-anchor="end">P₀</text><text x="64" y="${Y(h2) + 4}" font-size="11" text-anchor="end">P₀ + ΔP₂</text><text x="64" y="${Y(h1) + 4}" font-size="11" text-anchor="end">P₀ + ΔP₁</text>
    ${[h1, h2].map(p => `<line x1="70" y1="${Y(p)}" x2="${X(p === h1 ? 0 : dx)}" y2="${Y(p)}" stroke="#999" stroke-dasharray="3 3"/>`).join('')}
    <line x1="${X(0)}" y1="${Y(h1)}" x2="${X(dx)}" y2="${Y(0)}" stroke="#1f4fd8" stroke-width="2.2"/><line x1="${X(0)}" y1="${Y(h1)}" x2="${X(dx)}" y2="${Y(h2)}" stroke="#555" stroke-width="1.6" stroke-dasharray="6 4"/>
    <line x1="${X(dx)}" y1="${Y(0)}" x2="${X(dx)}" y2="${Y(h2)}" stroke="#c0392b" stroke-width="2.2"/><line x1="${X(0)}" y1="${Y(h1)}" x2="${X(0)}" y2="${Y(h1) - 26}" stroke="#c0392b" stroke-width="2.2"/>
    ${[[0, h1, '2'], [dx, 0, '3'], [dx, h2, '4']].map(([v, p, t]) => `<circle cx="${X(v)}" cy="${Y(p)}" r="4" fill="#000"/><text x="${X(v) + 7}" y="${Y(p) - 6}" font-size="13" font-weight="700">${t}</text>`).join('')}
    <text x="${X(0) + 6}" y="${Y(h1) - 18}" font-size="11" fill="#c0392b">1 (изохора 1–2)</text>
    <text x="${X(dx * .45)}" y="${Y(h1 * .45) + 22}" font-size="11" fill="#1f4fd8">адиабата</text><text x="${X(dx * .5) + 4}" y="${Y((h1 + h2) / 2) - 8}" font-size="11" fill="#555">изотерма</text><text x="${X(dx) + 6}" y="${Y(h2 / 2)}" font-size="11" fill="#c0392b">изохора</text>
    <line x1="${X(dx)}" y1="260" x2="${X(dx)}" y2="264" stroke="#000"/><text x="${X(0)}" y="276" font-size="11" text-anchor="middle">Vₘ₁</text><text x="${X(dx)}" y="276" font-size="11" text-anchor="middle">Vₘ₂</text></svg>`;
}
function l3SchemeSvg() {
  return `<svg class="lwr-svg scheme" viewBox="0 0 520 240" aria-hidden="true">
    <path d="M30 30 H400 V60" fill="none" stroke="#000" stroke-width="3"/><path d="M90 30 V170" fill="none" stroke="#000" stroke-width="3"/><path d="M215 30 V55" fill="none" stroke="#000" stroke-width="3"/>
    <rect x="18" y="20" width="22" height="20" fill="#fff" stroke="#000"/><text x="16" y="14" font-size="13" font-weight="700">K₀</text>
    <rect x="80" y="100" width="20" height="18" fill="#fff" stroke="#000"/><text x="106" y="114" font-size="13" font-weight="700">K</text>
    <rect x="68" y="170" width="44" height="40" fill="#fff" stroke="#000"/><text x="90" y="196" font-size="14" text-anchor="middle" font-weight="700">Н</text>
    <path d="M195 55 H235 V68 C290 76 296 110 292 220 H138 C134 110 140 76 195 68 Z" fill="#fff" stroke="#000"/><text x="215" y="200" font-size="15" text-anchor="middle" font-weight="700">Б</text>
    <path d="M394 60 V210 Q394 222 406 222 Q418 222 418 210 V60" fill="none" stroke="#000" stroke-width="2"/><path d="M398 140 V210 Q398 218 406 218 Q414 218 414 210 V100" fill="none" stroke="#3E8EE0" stroke-width="4"/>
    <line x1="430" y1="100" x2="430" y2="140" stroke="#000"/><text x="435" y="124" font-size="12">h</text><text x="400" y="238" font-size="13" font-weight="700">М</text></svg>`;
}

/* ---------- ввод и действия ---------- */
document.addEventListener('input', e => {
  const el = e.target.closest && e.target.closest('.l3i'); if (!el || !L3S) return; const k = el.dataset.k3;
  if (k.startsWith('p_')) { L3S.proc[k.slice(2)] = el.value; delete L3S.procOk[k.slice(2)]; el.classList.remove('ok', 'bad'); }
  else if (k === 'ch') L3V.cur[L3V.phase === 'read1' ? 'r1' : 'r2'] = el.value;
  else L3S[k] = el.value;
  l3Save();
});
// компрессор работает, пока нажата кнопка
document.addEventListener('pointerdown', e => { if (e.target.closest && e.target.closest('#l3-pump')) { L3V.pump = true; e.preventDefault(); } });
['pointerup', 'pointercancel', 'pointerleave'].forEach(t => document.addEventListener(t, e => { if (L3V.pump && (t !== 'pointerleave' || (e.target.closest && e.target.closest('#l3-pump')))) { L3V.pump = false; const el = $('#l3-h'); if (el) el.textContent = Math.round(L3V.p); } }, true));
setInterval(() => { const el = $('#l3-h'); if (el && L3V.phase === 'pump') el.textContent = Math.round(L3V.p); }, 120);
function l3Go(i) { L3S.step = Math.max(0, Math.min(i, L3S.max)); l3Save(); l3Reset(); render(); ui.main.scrollTop = 0; }
document.addEventListener('click', e => {
  const b = e.target.closest && e.target.closest('[data-l3]'); if (!b) return; const S = l3Load(), d = b.dataset, V = L3V;
  switch (d.l3) {
    case 'go': l3Go(+d.v); break;
    case 'next': S.max = Math.max(S.max, S.step + 1); S.step++; l3Save(); l3Reset(); render(); ui.main.scrollTop = 0; break;
    case 'admit': S.admit[d.q] = d.v; S.admitChecked = false; l3Save(); render(); break;
    case 'admitCheck': { const n = L3_ADMIT.filter(([, a], i) => S.admit[i] === a).length; S.admitChecked = true; S.admitOk = n >= 6; l3Save(); render();
      toast(S.admitOk ? `Допуск сдан: ${n} из 8` : `Верно ${n} из 8 — нужно 6. Перечитай теорию и попробуй снова.`, S.admitOk ? '' : 'bad'); break; }
    case 'power': S.power = !S.power; l3Save(); render(); break;
    case 'kv': S.kOpen = !S.kOpen; l3Save(); if (l3St() === 'exp' && V.phase === 'ready' && S.kOpen && !S.k0Open) V.phase = 'pump'; render(); break;
    case 'k0': S.k0Open = !S.k0Open; l3Save(); if (l3St() === 'exp' && V.phase === 'ready' && S.kOpen && !S.k0Open) V.phase = 'pump'; render(); break;
    case 'closeK': {
      if (V.p < 205) { lwMsg(`Мало: ${Math.round(V.p)} мм. Накачай до 210…220 мм.`, 1); break; }
      if (V.p > 228) { lwMsg(`Перекачано: ${Math.round(V.p)} мм. Открой K₀, выпусти воздух и начни опыт заново.`, 1); S.k0Open = true; S.kOpen = true; l3Save(); V.phase = 'ready'; setTimeout(render, 900); break; }
      S.kOpen = false; V.sw = 0; V.swOn = true; V.th += .0001 * lwGauss(); l3Save(); l3Phase('wait1'); break;
    }
    case 'waitMin': V.speed = L3.speed; V.swOn = true; render(); break;
    case 'rec1': case 'rec2': {
      const j = d.l3 === 'rec1' ? 1 : 2, [hl, hr] = l3Levels(), h = hr - hl, u = lwNum(V.cur['r' + j]);
      if (!(Math.abs(u - h) <= 1.5)) { V.cur.tries = (V.cur.tries || 0) + 1; lwMsg(V.cur.tries >= 3 ? `Подсказка: правое колено ≈ ${Math.round(hr)} мм, левое ≈ ${Math.round(hl)} мм — h = разность.` : 'Не совпадает. h — разность уровней: отсчёт по правому колену минус отсчёт по левому.', 1); break; }
      V.cur['h' + j] = Math.round(u); V.cur.tries = 0;
      if (j === 1) { V.sw = 0; l3Phase('vent'); }
      else { S.runs.push({ h1: V.cur.h1, h2: V.cur.h2, tc: +V.cur.tc.toFixed(2) }); l3Vary(); S.k0Open = true; S.kOpen = true; l3Save(); toast(`Опыт ${S.runs.length}: h₁ = ${V.cur.h1}, h₂ = ${V.cur.h2} мм`); V.cur = {}; V.sw = 0; V.phase = 'ready'; render(); }
      break;
    }
    case 'k0open': S.k0Open = true; V.k0t = performance.now(); l3Save(); render(); break;
    case 'k0close': { S.k0Open = false; V.cur.tc = (performance.now() - V.k0t) / 1000; V.th += .00016 * lwGauss(); l3Save();  // колебания температуры в комнате ≈ ±1,5 мм
      if (V.cur.tc < .25) toast('Слишком рано: давление не успело сравняться с атмосферным — γ получится завышенным.', 'bad'); else if (V.cur.tc > 3) toast('Поздновато: газ успел нагреться от стенок — γ получится заниженным.', 'bad');
      l3Phase('vented'); break; }
    case 'startSw': V.sw = 0; V.swOn = true; l3Phase('wait2'); break;
    case 'pcheck': { const o = l3Calc(); let bad = 0; L3_KEYS.forEach(k => { const ok = l3Ok(k, lwNum(S.proc[k]), o); S.procOk[k] = ok; if (!ok) bad++; }); l3Save(); render();
      toast(bad ? `Ошибок — ${bad}. Красные ячейки пересчитай.` : 'Все значения верны', bad ? 'bad' : ''); break; }
    case 'reconcl': S.concl = l3AutoConcl(l3Calc()); l3Save(); render(); break;
    case 'cq': S.cq[d.q] = d.v; S.cqChecked = false; l3Save(); render(); break;
    case 'cqCheck': { const n = L3_CQ.filter(([, a], i) => S.cq[i] === a).length; S.cqChecked = true; S.cqOk = n >= 6; l3Save(); render();
      toast(S.cqOk ? `Защита: ${n} из ${L3_CQ.length}` : `Верно ${n} из ${L3_CQ.length} — нужно 6.`, S.cqOk ? '' : 'bad');
      if (S.cqOk && !S.done) { S.done = true; l3Save(); addXP(100, 'Лабораторная работа'); } break; }
    case 'print': window.print(); break;
    case 'restart': if (confirm('Начать лабораторную работу № 3 заново? Записи и таблицы будут очищены.')) { L3S = l3Fresh(); l3Save(); l3Reset(); location.hash = 'lw-3'; render(); } break;
  }
});