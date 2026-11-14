/* =====================================================================
   Практикум: лабораторные работы «как на занятии».
   ЛР № 1. Изучение закона сохранения импульса (шайбы на горизонтальном поле).
   Шаги: допуск → подготовка → опыт 1 (свободное движение) → опыт 2 (соударение)
         → обработка (таблицы 1–4) → выводы и контрольные вопросы → отчёт (PDF).
   Координаты ученик считывает сам по сетке и лупе; приложение их только проверяет.
   ===================================================================== */

const LW_LIST = [
  { id: 1, title: 'Изучение закона сохранения импульса', aim: 'Исследовать соударение тел, проверить выполнение законов сохранения импульса и энергии, оценить погрешность опытов.', topic: 'Механика · гл. 2–3 учебника', ready: true }
];

const LW1 = {
  pucks: [{ id: 'А', m: .0186 }, { id: 'Б', m: .0201 }, { id: 'В', m: .0212 }, { id: 'Г', m: .0228 }, { id: 'Д', m: .0247 }],
  R: 15,                         // радиус шайбы, мм
  field: { w: 500, h: 400 },     // рабочее поле, мм
  circles: [[75, 189], [78, 200], [75, 211]], // шайба 2 почти вплотную к шайбе 1 (как на установке) // «закрашенные круги» для тела 2
  lNom: [150, 185, 220, 255, 290],            // номинальный путь до остановки при положениях винта 1…5, мм
  N: 7,                          // выстрелов в серии
  steps: [['admit', 'Допуск'], ['prep', 'Подготовка'], ['free', 'Опыт 1'], ['coll', 'Опыт 2'], ['proc', 'Обработка'], ['concl', 'Выводы'], ['report', 'Отчёт']]
};

/* ---------- состояние (сохраняется в браузере) ---------- */
const LW_KEY = 'f2-lw1';
let LWS = null;
function lwFresh() {
  const r = Math.random;
  return {
    v: 2, step: 0, max: 0,
    x01: +(44 + r() * 2).toFixed(2), y01: +(199.2 + r() * 1.6).toFixed(2), mu: +(.105 + r() * .03).toFixed(4),
    admit: {}, admitOk: false,
    p1: null, p2: null, m1: '', m2: '', rx01: '', ry01: '', prepOk: false,
    screw: 3, free: [], cur: null,
    circle: 2, place: null, rx02: '', ry02: '', placeOk: false, coll: [],
    proc: {}, procOk: {},
    concl: '', cq: {}, cqOk: false,
    fio: '', group: '', date: new Date().toLocaleDateString('ru-RU'), done: false
  };
}
function lwLoad() { if (LWS) return LWS; try { LWS = JSON.parse(localStorage.getItem(LW_KEY) || 'null'); } catch (e) { LWS = null; } if (!LWS || LWS.v !== 2) LWS = lwFresh(); return LWS; }
function lwSave() { try { localStorage.setItem(LW_KEY, JSON.stringify(LWS)); } catch (e) {} }
const lwNum = s => { const v = parseFloat(String(s).replace(',', '.').replace(/\s/g, '')); return Number.isFinite(v) ? v : NaN; };
const lwGauss = () => { let u = 0, v = 0; while (!u) u = Math.random(); while (!v) v = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
const lwF = (v, d = 2) => Number.isFinite(v) ? f1(v, d) : '—';
const lwPuck = id => LW1.pucks.find(p => p.id === id);

/* ---------- физика выстрела ---------- */
const LW_G = 9.81;
function lwShot(kind) {
  const S = LWS, a = S.mu * (1 + .02 * lwGauss()) * LW_G * 1000;       // замедление, мм/с²
  const v0 = Math.sqrt(2 * S.mu * LW_G * 1000 * LW1.lNom[S.screw - 1]) * (1 + .022 * lwGauss()); // мм/с
  const th = .004 * lwGauss(), d = [Math.cos(th), Math.sin(th)], p1 = [S.x01, S.y01];
  const sAt = (v, t) => { t = Math.max(0, Math.min(t, v / a)); return v * t - a * t * t / 2; }, stopT = v => v / a;
  if (kind === 'free') {
    const T = stopT(v0);
    return { kind, T, at: t => ({ p1: [p1[0] + d[0] * sAt(v0, t), p1[1] + d[1] * sAt(v0, t)] }) };
  }
  // тело 2 ставят в круг рукой — небольшой разброс положения
  const c2 = [S.place[0] + .25 * lwGauss(), S.place[1] + .25 * lwGauss()], R2 = 2 * LW1.R;
  // путь до касания: |p1 + d·s − c2| = 2R
  const w = [p1[0] - c2[0], p1[1] - c2[1]], B = 2 * (d[0] * w[0] + d[1] * w[1]), C = w[0] ** 2 + w[1] ** 2 - R2 * R2, D = B * B - 4 * C;
  const sc = D >= 0 ? (-B - Math.sqrt(D)) / 2 : Infinity;
  if (!(sc >= 0) || sc >= v0 * v0 / (2 * a)) return lwShotFreeWith(p1, d, v0, a, c2);
  const tc = (v0 - Math.sqrt(v0 * v0 - 2 * a * sc)) / a, vc = Math.sqrt(v0 * v0 - 2 * a * sc);
  const q1 = [p1[0] + d[0] * sc, p1[1] + d[1] * sc], nx = (c2[0] - q1[0]) / R2, ny = (c2[1] - q1[1]) / R2;
  const m1 = lwPuck(S.p1).m, m2 = lwPuck(S.p2).m, e = Math.max(.75, Math.min(.95, .85 + .02 * lwGauss()));
  const u = [vc * d[0], vc * d[1]], un = u[0] * nx + u[1] * ny;
  const un1 = (m1 - e * m2) * un / (m1 + m2), un2 = (1 + e) * m1 * un / (m1 + m2);
  const v1 = [u[0] - nx * un + nx * un1, u[1] - ny * un + ny * un1], v2 = [nx * un2, ny * un2];
  const s1 = Math.hypot(v1[0], v1[1]), s2 = Math.hypot(v2[0], v2[1]);
  const e1 = s1 ? [v1[0] / s1, v1[1] / s1] : [1, 0], e2 = [nx, ny];
  const T = tc + Math.max(stopT(s1), stopT(s2));
  return {
    kind, T, c2,
    at: t => t < tc ? { p1: [p1[0] + d[0] * sAt(v0, t), p1[1] + d[1] * sAt(v0, t)], p2: c2 }
      : { p1: [q1[0] + e1[0] * sAt(s1, t - tc), q1[1] + e1[1] * sAt(s1, t - tc)], p2: [c2[0] + e2[0] * sAt(s2, t - tc), c2[1] + e2[1] * sAt(s2, t - tc)] }
  };
}
function lwShotFreeWith(p1, d, v0, a, c2) { // промах: тело 1 проехало мимо
  const sAt = (v, t) => { t = Math.max(0, Math.min(t, v / a)); return v * t - a * t * t / 2; };
  return { kind: 'coll', miss: true, T: v0 / a, c2, at: t => ({ p1: [p1[0] + d[0] * sAt(v0, t), p1[1] + d[1] * sAt(v0, t)], p2: c2 }) };
}
const lwInField = p => p && p[0] > LW1.R && p[0] < LW1.field.w - LW1.R && p[1] > LW1.R && p[1] < LW1.field.h - LW1.R;

/* ---------- рисование поля ---------- */
let LWV = { anim: null, raf: 0, lens: null, pos: null };
function lwDraw() {
  const cv = $('#lw-cv'); if (!cv) return;
  const box = cv.getBoundingClientRect(), cssW = box.width || 600, dpr = Math.min(2.5, devicePixelRatio || 1);
  const VW = 580, VH = 452, k = cssW / VW, cssH = VH * k;
  if (cv.width !== Math.round(cssW * dpr)) { cv.width = Math.round(cssW * dpr); cv.height = Math.round(cssH * dpr); }
  const c = cv.getContext('2d'); c.setTransform(dpr, 0, 0, dpr, 0, 0);
  c.fillStyle = '#0B1020'; c.fillRect(0, 0, cssW, cssH);
  const map = (x, y) => [(x + 60) * k, (422 - y) * k];
  lwScene(c, map, k, false);
  // лупа: увеличенный фрагмент поля в углу
  if (LWV.lens) {
    const L = Math.min(cssW * .42, 230), X0 = cssW - L - 8, Y0 = 8, Z = 9 * Math.max(1, 600 / cssW) * k, [lx, ly] = LWV.lens;
    c.save(); c.beginPath(); c.roundRect ? c.roundRect(X0, Y0, L, L, 14) : c.rect(X0, Y0, L, L); c.clip();
    c.fillStyle = '#0B1020'; c.fillRect(X0, Y0, L, L);
    const mapZ = (x, y) => [X0 + L / 2 + (x - lx) * Z, Y0 + L / 2 - (y - ly) * Z];
    lwScene(c, mapZ, Z, true);
    c.strokeStyle = 'rgba(255,194,75,.9)'; c.lineWidth = 1; c.beginPath(); c.moveTo(X0 + L / 2, Y0); c.lineTo(X0 + L / 2, Y0 + L); c.moveTo(X0, Y0 + L / 2); c.lineTo(X0 + L, Y0 + L / 2); c.stroke();
    c.restore(); c.strokeStyle = '#FFC24B'; c.lineWidth = 2; c.strokeRect(X0, Y0, L, L);
    c.font = '700 11px "Golos UI", system-ui'; c.textAlign = 'left'; c.textBaseline = 'alphabetic'; c.fillStyle = 'rgba(11,21,36,.82)'; c.fillRect(X0 + 1, Y0 + L - 24, L - 2, 23); c.fillStyle = '#F2B544'; c.fillText('ЛУПА · 1 деление = 1 мм', X0 + 8, Y0 + L - 8);
    const [px, py] = map(lx, ly); c.strokeStyle = '#FFC24B'; c.lineWidth = 1.5; c.strokeRect(px - 9 * k, py - 9 * k, 18 * k, 18 * k);
  }
}
/* Векторные «текстуры» установки: миллиметровка в алюминиевой раме, ударный механизм с пружиной и винтом,
   металлические шайбы с накаткой и меткой крайней точки. */
function lwScene(c, map, s, fine) {
  const F = LW1.field, S = LWS, R = LW1.R;
  const P = (x, y) => map(x, y), rect = (x1, y1, x2, y2) => { const [a, b] = P(x1, y2), [p, q] = P(x2, y1); return [a, b, p - a, q - b]; };
  const line = (x1, y1, x2, y2, col, w) => { const [a, b] = P(x1, y1), [p, q] = P(x2, y2); c.strokeStyle = col; c.lineWidth = w; c.beginPath(); c.moveTo(a, b); c.lineTo(p, q); c.stroke(); };
  // рама стола (анодированный алюминий) с винтами по углам
  { const [x, y, w, h] = rect(-10, -10, F.w + 10, F.h + 10), g = c.createLinearGradient(x, y, x, y + h);
    g.addColorStop(0, '#56677E'); g.addColorStop(.5, '#3A4A60'); g.addColorStop(1, '#2A3647'); c.fillStyle = g; c.fillRect(x, y, w, h);
    c.strokeStyle = 'rgba(255,255,255,.18)'; c.lineWidth = 1; c.strokeRect(x + .5, y + .5, w - 1, h - 1);
    [[-5, -5], [F.w + 5, -5], [-5, F.h + 5], [F.w + 5, F.h + 5]].forEach(([bx, by]) => { const [a, b] = P(bx, by), r = 2.4 * s, gb = c.createRadialGradient(a - r * .3, b - r * .3, r * .1, a, b, r);
      gb.addColorStop(0, '#E4EAF2'); gb.addColorStop(1, '#6B7A8F'); c.fillStyle = gb; c.beginPath(); c.arc(a, b, r, 0, 7); c.fill(); c.strokeStyle = '#2A3647'; c.lineWidth = Math.max(1, s * .4); c.beginPath(); c.moveTo(a - r * .7, b); c.lineTo(a + r * .7, b); c.stroke(); }); }
  // миллиметровая бумага
  { const [x, y, w, h] = rect(0, 0, F.w, F.h); c.fillStyle = '#E9EFF1'; c.fillRect(x, y, w, h);
    const g = c.createLinearGradient(x, y, x + w, y + h); g.addColorStop(0, 'rgba(255,255,255,.35)'); g.addColorStop(1, 'rgba(120,140,160,.12)'); c.fillStyle = g; c.fillRect(x, y, w, h); }
  const lw = fine ? Math.max(.6, s * .06) : 1, lx0 = fine ? Math.max(0, Math.floor(LWV.lens[0] - 40)) : 0, lx1 = fine ? Math.min(F.w, Math.ceil(LWV.lens[0] + 40)) : F.w;
  const ly0 = fine ? Math.max(0, Math.floor(LWV.lens[1] - 40)) : 0, ly1 = fine ? Math.min(F.h, Math.ceil(LWV.lens[1] + 40)) : F.h;
  const gcol = v => v % 50 === 0 ? ['rgba(30,96,120,.85)', 1.6] : v % 10 === 0 ? ['rgba(40,110,135,.55)', 1.1] : v % 5 === 0 ? ['rgba(60,130,155,.38)', .8] : ['rgba(80,150,175,.24)', .6];
  const stp = fine ? 1 : (s > 1.6 ? 5 : 10);
  for (let x = Math.ceil(lx0 / stp) * stp; x <= lx1; x += stp) { const [col, k] = gcol(x); line(x, ly0, x, ly1, col, k * lw); }
  for (let y = Math.ceil(ly0 / stp) * stp; y <= ly1; y += stp) { const [col, k] = gcol(y); line(lx0, y, lx1, y, col, k * lw); }
  // подписи шкал
  c.font = `600 ${fine ? 12 : Math.max(9, Math.min(12.5, s * 9))}px "Golos UI", system-ui`;
  if (fine) { c.fillStyle = 'rgba(20,70,90,.9)'; c.textBaseline = 'top'; c.textAlign = 'left';
    for (let x = Math.ceil(lx0 / 10) * 10; x <= lx1; x += 10) for (let y = Math.ceil(ly0 / 10) * 10; y <= ly1; y += 10) { const [a, b] = P(x, y); c.fillText(x + '; ' + y, a + 3, b + 2); } }
  else { c.fillStyle = '#C9D4E3'; c.textAlign = 'center'; c.textBaseline = 'top';
    for (let x = 0; x < F.w; x += 50) { const [a, b] = P(x, -10); c.fillText(x, a, b + 4); }
    { const [a, b] = P(F.w, -10); c.fillStyle = '#F2B544'; c.fillText('x, мм', a - 6, b + 4); c.fillStyle = '#C9D4E3'; }
    c.textAlign = 'right'; c.textBaseline = 'middle'; for (let y = 0; y < F.h; y += 50) { const [a, b] = P(-10, y); c.fillText(y, a - 4, b); }
    { const [a, b] = P(-10, F.h); c.fillStyle = '#F2B544'; c.fillText('y, мм', a - 3, b); } }
  // закрашенные (заштрихованные) круги для тела 2
  LW1.circles.forEach(([x, y], i) => { const [a, b] = P(x, y), r = R * s, on = i + 1 === S.circle;
    c.save(); c.beginPath(); c.arc(a, b, r, 0, 7); c.clip(); c.fillStyle = on ? 'rgba(210,90,60,.18)' : 'rgba(60,80,100,.12)'; c.fillRect(a - r, b - r, 2 * r, 2 * r);
    c.strokeStyle = on ? 'rgba(190,80,50,.55)' : 'rgba(60,80,100,.35)'; c.lineWidth = Math.max(.7, s * .25);
    for (let k = -2 * r; k < 2 * r; k += Math.max(3, 2.2 * s)) { c.beginPath(); c.moveTo(a + k, b + r); c.lineTo(a + k + 2 * r, b - r); c.stroke(); } c.restore();
    c.beginPath(); c.arc(a, b, r, 0, 7); c.strokeStyle = on ? 'rgba(190,80,50,.8)' : 'rgba(60,80,100,.5)'; c.lineWidth = Math.max(1, s * .3); c.stroke(); });
  // ударный механизм: основание, направляющие, корпус с пружиной, боёк, винт
  const pos = LWV.pos || lwRestPos(), y0 = S.y01, back = S.x01 - R;
  const steel = (x1, y1, x2, y2, vertical) => { const [x, y, w, h] = rect(x1, y1, x2, y2), g = vertical ? c.createLinearGradient(x, y, x + w, y) : c.createLinearGradient(x, y, x, y + h);
    g.addColorStop(0, '#C9D3DF'); g.addColorStop(.45, '#8C99AA'); g.addColorStop(1, '#4E5B6D'); c.fillStyle = g; c.fillRect(x, y, w, h); c.strokeStyle = 'rgba(20,28,40,.6)'; c.lineWidth = Math.max(.6, s * .2); c.strokeRect(x, y, w, h); };
  steel(-58, y0 - 26, -14, y0 + 26);                                   // основание механизма
  steel(-58, y0 + R + 1, back + 6, y0 + R + 4); steel(-58, y0 - R - 4, back + 6, y0 - R - 1); // направляющие
  { const [x, y, w, h] = rect(-43, y0 - 9, -18, y0 + 9), g = c.createLinearGradient(x, y, x, y + h);             // корпус
    g.addColorStop(0, '#2B3445'); g.addColorStop(.5, '#46536A'); g.addColorStop(1, '#232B39'); c.fillStyle = g; c.fillRect(x, y, w, h);
    c.strokeStyle = 'rgba(220,230,240,.55)'; c.lineWidth = Math.max(.8, s * .35); c.beginPath();                    // витки пружины в прорези
    const sp = LWV.anim && LWV.anim.t < .06 ? 1.25 : 1; for (let k = 0; k <= 12; k++) { const [a] = P(-41 + k * 1.8 * sp, 0); const [, t] = P(0, y0 + 5), [, bt] = P(0, y0 - 5); c.moveTo(a, t); c.lineTo(a + 1.3 * s, bt); } c.stroke(); }
  const strike = LWV.anim && LWV.anim.t < .06 ? 3 : 0;
  steel(-18, y0 - 2.5, back - 1 + strike, y0 + 2.5);                   // боёк
  { const [a, b] = P(-50, y0), r = 6 * s, g = c.createRadialGradient(a - r * .3, b - r * .3, r * .2, a, b, r);       // винт с накаткой
    g.addColorStop(0, '#F3D17A'); g.addColorStop(1, '#8E6A1E'); c.fillStyle = g; c.beginPath(); c.arc(a, b, r, 0, 7); c.fill();
    c.strokeStyle = 'rgba(60,40,10,.6)'; c.lineWidth = Math.max(.6, s * .25); for (let k = 0; k < 18; k++) { const q = k / 18 * Math.PI * 2; c.beginPath(); c.moveTo(a + r * .78 * Math.cos(q), b + r * .78 * Math.sin(q)); c.lineTo(a + r * Math.cos(q), b + r * Math.sin(q)); c.stroke(); }
    if (!fine) { c.fillStyle = '#C9D4E3'; c.font = `700 ${Math.max(9, 4.6 * s)}px "Golos UI", system-ui`; c.textAlign = 'left'; c.textBaseline = 'top'; c.fillText('винт ' + S.screw, P(-58, 0)[0], P(0, y0 - 26)[1] + 3); } }
  // шайбы
  const puck = (p, kind) => { if (!p) return; const [a, b] = P(p[0], p[1]), r = R * s, m = lwPuck(kind === 1 ? S.p1 : S.p2);
    c.save(); c.shadowColor = 'rgba(10,20,30,.45)'; c.shadowBlur = 4 * s; c.shadowOffsetX = 1.2 * s; c.shadowOffsetY = 1.6 * s;
    const g = c.createRadialGradient(a - r * .35, b - r * .4, r * .1, a, b, r);
    if (kind === 1) { g.addColorStop(0, '#F4F7FB'); g.addColorStop(.55, '#AEB9C8'); g.addColorStop(1, '#5D6A7D'); } else { g.addColorStop(0, '#FFF0C2'); g.addColorStop(.55, '#D6A54A'); g.addColorStop(1, '#7E5A1A'); }
    c.fillStyle = g; c.beginPath(); c.arc(a, b, r, 0, 7); c.fill(); c.restore();
    c.strokeStyle = kind === 1 ? 'rgba(40,52,70,.55)' : 'rgba(90,60,15,.6)'; c.lineWidth = Math.max(.5, s * .2);             // накатка по ободу
    for (let k = 0; k < 48; k++) { const q = k / 48 * Math.PI * 2; c.beginPath(); c.moveTo(a + r * .9 * Math.cos(q), b + r * .9 * Math.sin(q)); c.lineTo(a + r * Math.cos(q), b + r * Math.sin(q)); c.stroke(); }
    c.beginPath(); c.arc(a, b, r * .62, 0, 7); c.strokeStyle = kind === 1 ? 'rgba(40,52,70,.35)' : 'rgba(90,60,15,.35)'; c.lineWidth = Math.max(.6, s * .3); c.stroke();
    c.fillStyle = kind === 1 ? '#2D3848' : '#4E3608'; c.textAlign = 'center'; c.textBaseline = 'middle';                    // гравировка
    c.font = `800 ${r * .55}px "Golos UI", system-ui`; c.fillText(kind, a, b - r * .12);
    if (m) { c.font = `600 ${r * .24}px "Golos UI", system-ui`; c.fillText(f1(m.m * 1000, 1) + ' г', a, b + r * .38); }
    // метка крайней точки (передняя по оси X) — по ней снимают координаты
    const [ma, mb] = P(p[0] + R, p[1]), mr = fine ? 3 : Math.max(1.6, 1.1 * s); c.fillStyle = '#D7262E'; c.beginPath(); c.arc(ma, mb, mr, 0, 7); c.fill();
    if (fine) { c.strokeStyle = '#D7262E'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(ma - 12, mb); c.lineTo(ma + 12, mb); c.moveTo(ma, mb - 12); c.lineTo(ma, mb + 12); c.stroke(); } };
  puck(pos.p2, 2); puck(pos.p1, 1);
}
function lwRestPos() { const S = LWS, st = LW1.steps[S.step][0]; return { p1: [S.x01, S.y01], p2: (st === 'coll' && S.place) ? S.place : null }; }

/* лупа: коснись поля и веди пальцем */
document.addEventListener('pointerdown', e => {
  const cv = e.target.closest && e.target.closest('#lw-cv'); if (!cv) return;
  const move = ev => { const b = cv.getBoundingClientRect(), k = b.width / 580; LWV.lens = [(ev.clientX - b.left) / k - 60, 422 - (ev.clientY - b.top) / k]; lwDraw(); };
  move(e); cv.setPointerCapture && cv.setPointerCapture(e.pointerId);
  const mv = ev => move(ev), up = () => { cv.removeEventListener('pointermove', mv); cv.removeEventListener('pointerup', up); cv.removeEventListener('pointercancel', up); };
  cv.addEventListener('pointermove', mv); cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
});

function lwAnimate(shot, done) {
  cancelAnimationFrame(LWV.raf); const t0 = performance.now(), slow = .55;
  LWV.anim = { t: 0 };
  const tick = now => {
    const t = (now - t0) / 1000 * slow; LWV.anim.t = t; LWV.pos = shot.at(Math.min(t, shot.T)); lwDraw();
    if (t < shot.T) LWV.raf = requestAnimationFrame(tick); else { LWV.anim = null; done(); }
  };
  LWV.raf = requestAnimationFrame(tick);
}

/* ---------- экраны ---------- */
function vLabWorks() {
  frame('Практикум', { sub: 'Лабораторные работы, опыты и игры' });
  const S = lwLoad();
  setMain(labTabs('works') + `<section class="lab-intro"><b class="h">Лабораторные работы</b><p class="mute">Как на занятии: допуск, опыт на установке, таблицы измерений, расчёт погрешностей, выводы и отчёт в PDF.</p></section>` +
    LW_LIST.map(w => { const pr = w.id === 1 ? (S.done ? 'выполнена' : S.max ? `шаг ${S.max + 1} из ${LW1.steps.length}` : 'не начата') : 'скоро';
      return `<a class="lw-card" href="#lw-${w.id}"><span class="lw-num">№ ${w.id}</span><span class="lw-copy"><b>${esc(w.title)}</b><small>${esc(w.aim)}</small><span class="lw-meta">${esc(w.topic)} · <i class="${S.done ? 'mint' : ''}">${pr}</i></span></span>${ic('chevron-right')}</a>`; }).join('') +
    `<p class="mute small lw-more">Остальные работы методички добавим следующими.</p>`);
}

function vLabWork() {
  const S = lwLoad(); const st = LW1.steps[S.step][0];
  frame('ЛР № 1 · Закон сохранения импульса', { back: true, sub: LW1.steps[S.step][1] });
  const chips = `<div class="lw-steps">${LW1.steps.map(([k, t], i) => `<button data-lw="go" data-v="${i}" class="${i === S.step ? 'on' : ''}${i < S.max || (i === S.max && st === 'report') ? ' ok' : ''}" ${i > S.max ? 'disabled' : ''}><b>${i + 1}</b><span>${t}</span></button>`).join('')}</div>`;
  const body = ({ admit: lwAdmit, prep: lwPrep, free: lwFreeStep, coll: lwCollStep, proc: lwProc, concl: lwConcl, report: lwReportStep })[st]();
  setMain(`<div class="lw">${chips}${body}</div>`);
  if (['prep', 'free', 'coll'].includes(st)) { LWV.pos = null; lwDraw(); if (!lwDraw.ro && 'ResizeObserver' in window) lwDraw.ro = new ResizeObserver(() => lwDraw()); if (lwDraw.ro) { lwDraw.ro.disconnect(); lwDraw.ro.observe($('#lw-cv')); } }
}
const lwField = hint => `<section class="lw-stage"><canvas id="lw-cv" aria-label="Рабочее поле установки"></canvas><p class="lw-hint">${ic('search')} ${hint || 'Коснись поля и веди пальцем — в углу появится лупа с миллиметровой сеткой. По ней снимай координаты красной метки — крайней (передней) точки шайбы.'}</p></section>`;
const lwIn = (k, val, ph = '', cls = '') => `<input class="lwi ${cls}" data-k="${k}" inputmode="decimal" autocomplete="off" value="${esc(val ?? '')}" placeholder="${ph}">`;
const lwNext = (label = 'Дальше') => `<button class="btn wide mt" data-lw="next">${label} ${ic('chevron-right')}</button>`;

/* 1. Допуск */
const LW_ADMIT = [
  ['Что называют импульсом тела?', 'Произведение массы тела на его скорость', ['Произведение силы на путь', 'Половину произведения массы на квадрат скорости', 'Отношение силы к массе']],
  ['При каком условии сохраняется импульс системы тел?', 'Система замкнута: сумма внешних сил равна нулю', ['Только при упругом ударе', 'Только при неупругом ударе', 'Если тела одинаковой массы']],
  ['Почему в этой работе импульс шайбы пропорционален m√l?', 'Шайба тормозится трением, и её скорость v = √(2μgl)', ['Так записан закон Гука', 'Путь пропорционален квадрату массы', 'Скорость шайбы постоянна']],
  ['Какие величины в работе измеряют напрямую?', 'Координаты шайб до и после удара', ['Скорости шайб', 'Импульсы шайб', 'Силу удара']],
  ['Чему равен коэффициент восстановления энергии при абсолютно упругом ударе?', '1', ['0', '0,5', 'Больше 1']],
  ['Сколько выстрелов нужно в каждой серии измерений?', '7', ['1', '3', '20']],
  ['Когда можно включать установку под напряжение?', 'После проверки схемы преподавателем и с его разрешения', ['Сразу после сборки', 'Когда все ушли', 'В любой момент']],
  ['Что делать, если человека поразило током?', 'Немедленно отключить установку от сети и доложить преподавателю', ['Продолжать опыт', 'Взять пострадавшего за руку голыми руками', 'Переключить щит лаборатории']]
];
function lwAdmit() {
  const S = LWS;
  const qs = LW_ADMIT.map(([q, a, x], i) => { const opts = lwShuf(i, [a, ...x]); const ch = S.admit[i];
    return `<div class="lw-q"><b>${i + 1}. ${esc(q)}</b>${opts.map(o => `<button data-lw="admit" data-q="${i}" data-v="${esc(o)}" class="${ch === o ? (S.admitChecked ? (o === a ? 'ok' : 'bad') : 'pick') : ''}">${esc(o)}</button>`).join('')}</div>`; }).join('');
  return `<section class="card lw-intro"><b class="h">Цель работы</b><p>${esc(LW_LIST[0].aim)}</p>
    <details><summary>Кратко из теории</summary>
    <p><b>Импульс</b> тела p = m·v. В замкнутой системе (сумма внешних сил равна нулю) суммарный импульс сохраняется: Σmᵢvᵢ = const.</p>
    <p>Если внешние силы есть, но их сумма в каком-то направлении равна нулю, сохраняется проекция импульса на это направление. Сила трения за короткое время удара мала по сравнению с силой взаимодействия, поэтому во время удара шайбы можно считать замкнутой системой.</p>
    <p><b>Упругий удар:</b> сохраняются импульс и кинетическая энергия. <b>Неупругий:</b> импульс сохраняется, часть энергии уходит на деформацию и нагрев. Коэффициент восстановления энергии k = E_кон/E_нач.</p>
    <p><b>Как измерить скорость без секундомера.</b> Шайба тормозится трением: работа силы трения равна изменению кинетической энергии, μmgl = mv²/2, откуда v = √(2μgl). Значит, импульс ∝ m√l, энергия ∝ m·l, а направление движения даёт отношение Δx/l, Δy/l.</p>
    </details>
    <details><summary>Оборудование и установка</summary><p>Горизонтальное поле с координатной сеткой, набор шайб с указанной массой, ударный пружинный механизм с винтом для изменения силы удара, направляющие для шайбы 1, закрашенные круги для установки шайбы 2.</p></details>
    <details><summary>Техника безопасности</summary><p>Установку включают только с разрешения преподавателя. Переключения — одной рукой, не касаясь токоведущих частей. При неисправности или поражении током — немедленно отключить установку от сети и доложить преподавателю.</p></details></section>
    <section class="card"><b class="h">Допуск к работе</b><p class="mute">Ответь на вопросы. Нужно не меньше 6 верных из 8.</p>${qs}
    <button class="btn wide mt" data-lw="admitCheck">${ic('circle-check')} Сдать допуск</button>${S.admitOk ? lwNext('К подготовке') : ''}</section>`;
}
function lwShuf(seed, arr) { const a = arr.slice(); let s = seed * 9301 + 49297; for (let i = a.length - 1; i > 0; i--) { s = (s * 9301 + 49297) % 233280; const j = Math.floor(s / 233280 * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }

/* 2. Подготовка */
function lwPrep() {
  const S = LWS;
  const pk = LW1.pucks.map(p => `<button data-lw="puck" data-v="${p.id}" class="${S.p1 === p.id ? 'p1' : S.p2 === p.id ? 'p2' : ''}"><b>${p.id}</b><small>${f1(p.m * 1000, 1)} г</small>${S.p1 === p.id ? '<i>тело 1</i>' : S.p2 === p.id ? '<i>тело 2</i>' : ''}</button>`).join('');
  return `<section class="card"><b class="h">1. Выбери два тела примерно одинаковой массы</b><p class="mute small">Масса указана на шайбе. Первое касание — тело 1 (ударяющее), второе — тело 2.</p><div class="lw-pucks">${pk}</div>
    <div class="lw-row"><label>m₁, кг ${lwIn('m1', S.m1, '0,0000')}</label><label>m₂, кг ${lwIn('m2', S.m2, '0,0000')}</label></div></section>
    ${lwField()}
    <section class="card"><b class="h">2. Начальные координаты тела 1</b><p class="mute small">Шайба 1 стоит в направляющих. Наведи лупу на красную метку её крайней точки (справа, по ходу движения) и запиши координаты с точностью до 1 мм.</p>
    <div class="lw-row"><label>x₀₁, мм ${lwIn('rx01', S.rx01, 'мм')}</label><label>y₀₁, мм ${lwIn('ry01', S.ry01, 'мм')}</label></div>
    <button class="btn wide mt" data-lw="prepCheck">${ic('circle-check')} Проверить</button><p class="lw-msg" id="lw-msg"></p>${S.prepOk ? lwNext('К опыту 1') : ''}</section>`;
}

/* 3. Опыт 1 — свободное движение */
function lwFreeStep() {
  const S = LWS, rows = S.free, n = rows.length, cur = S.cur && S.cur.kind === 'free';
  const tbl = `<table class="lw-tbl"><tr><th>№</th><th>x, мм</th></tr>${Array.from({ length: LW1.N }, (_, i) => `<tr class="${i === n && cur ? 'now' : ''}"><td>${i + 1}</td><td>${rows[i] ? f1(rows[i].r, 1) : i === n && cur ? lwIn('cx', S.cur.r ?? '', 'мм') : ''}</td></tr>`).join('')}</table>`;
  return `<section class="card lw-cond"><b class="h">Опыт 1. Свободное движение тела 1</b><p class="mute small">Тела 2 на поле нет. Сделай ${LW1.N} выстрелов при одном положении винта, после каждого запиши координату x остановки шайбы 1.</p>
    <div class="lw-screw"><span>Винт ударного механизма</span><button class="lp-btn" data-lw="screw" data-d="-1" ${n ? 'disabled' : ''}>−</button><b>${S.screw}</b><button class="lp-btn" data-lw="screw" data-d="1" ${n ? 'disabled' : ''}>+</button></div>
    ${n ? '<p class="mute small">Положение винта зафиксировано: все выстрелы — «при тех же условиях».</p>' : ''}</section>
    ${lwField()}
    <section class="card"><div class="lw-bar">${cur ? `<button class="btn wide" data-lw="record">${ic('pencil')} Записать x</button>` : n < LW1.N ? `<button class="btn wide" data-lw="shoot" data-v="free">${ic('target')} Выстрел ${n + 1} из ${LW1.N}</button>` : ''}</div>
    <p class="lw-msg" id="lw-msg">${cur ? 'Шайба остановилась. Сними координату x её крайней точки (красная метка) по лупе.' : ''}</p>${tbl}${n >= LW1.N ? lwNext('К опыту 2') : ''}</section>`;
}

/* 4. Опыт 2 — соударение */
function lwCollStep() {
  const S = LWS, rows = S.coll, n = rows.length, cur = S.cur && S.cur.kind === 'coll';
  if (!S.placeOk) {
    return `<section class="card"><b class="h">Опыт 2. Установка тела 2</b><p class="mute small">Выбери один из закрашенных кругов (смещённый даёт нецентральный удар), поставь в него шайбу 2 и запиши её начальные координаты.</p>
      <div class="seg">${LW1.circles.map((c, i) => `<button type="button" data-lw="circle" data-v="${i + 1}" aria-pressed="${S.circle === i + 1}">${['Нижний', 'Центр', 'Верхний'][i]}</button>`).join('')}</div></section>
      ${lwField()}
      <section class="card"><div class="lw-row"><label>x₀₂, мм ${lwIn('rx02', S.rx02, 'мм')}</label><label>y₀₂, мм ${lwIn('ry02', S.ry02, 'мм')}</label></div>
      <button class="btn wide mt" data-lw="placeCheck">${ic('circle-check')} Проверить</button><p class="lw-msg" id="lw-msg"></p></section>`;
  }
  const cell = (i, k) => rows[i] ? f1(rows[i].r[k], 1) : i === n && cur ? lwIn('c' + k, (S.cur.r || {})[k] ?? '', 'мм') : '';
  const tbl = `<table class="lw-tbl"><tr><th>№</th><th>x₁</th><th>y₁</th><th>x₂</th><th>y₂</th></tr>${Array.from({ length: LW1.N }, (_, i) => `<tr class="${i === n && cur ? 'now' : ''}"><td>${i + 1}</td>${['x1', 'y1', 'x2', 'y2'].map(k => `<td>${cell(i, k)}</td>`).join('')}</tr>`).join('')}</table>`;
  return `<section class="card lw-cond"><b class="h">Опыт 2. Соударение тел</b><p class="mute small">Тело 2 — в круге (x₀₂ = ${f1(lwNum(S.rx02), 1)}, y₀₂ = ${f1(lwNum(S.ry02), 1)} мм). Винт — ${S.screw}, как в опыте 1. Сделай ${LW1.N} выстрелов; после каждого запиши координаты обеих шайб (мм).</p></section>
    ${lwField()}
    <section class="card"><div class="lw-bar">${cur ? `<button class="btn wide" data-lw="record">${ic('pencil')} Записать координаты</button>` : n < LW1.N ? `<button class="btn wide" data-lw="shoot" data-v="coll">${ic('target')} Выстрел ${n + 1} из ${LW1.N}</button>` : ''}</div>
    <p class="lw-msg" id="lw-msg">${cur ? 'Шайбы остановились. Сними координаты меток обеих шайб.' : ''}</p><div class="lw-scroll">${tbl}</div>${n >= LW1.N ? lwNext('К обработке') : ''}</section>`;
}

/* ---------- обработка: ожидаемые значения из записей ученика ---------- */
function lwCalc() {
  const S = LWS, m1 = lwPuck(S.p1).m, m2 = lwPuck(S.p2).m, x01 = lwNum(S.rx01), y01 = lwNum(S.ry01), x02 = lwNum(S.rx02), y02 = lwNum(S.ry02);
  const mean = a => a.reduce((s, v) => s + v, 0) / a.length, col = k => S.coll.map(r => r.r[k]);
  const fx = S.free.map(r => r.r), X = { x: fx, x1: col('x1'), y1: col('y1'), x2: col('x2'), y2: col('y2') };
  const o = { m1, m2, x01, y01, x02, y02 };
  o.xm = mean(fx); o.x1m = mean(X.x1); o.y1m = mean(X.y1); o.x2m = mean(X.x2); o.y2m = mean(X.y2);
  o.dx = o.xm - x01; o.dx1 = o.x1m - x01; o.dy1 = o.y1m - y01; o.dx2 = o.x2m - x02; o.dy2 = o.y2m - y02;
  o.l0 = o.dx; o.l1 = Math.hypot(o.dx1, o.dy1); o.l2 = Math.hypot(o.dx2, o.dy2);
  o.px0 = m1 * Math.sqrt(o.l0); o.px1 = m1 * o.dx1 / Math.sqrt(o.l1) + m2 * o.dx2 / Math.sqrt(o.l2); o.py1 = m1 * o.dy1 / Math.sqrt(o.l1) + m2 * o.dy2 / Math.sqrt(o.l2);
  o.e0 = m1 * o.l0; o.e1 = m1 * o.l1 + m2 * o.l2; o.k = o.e1 / o.e0;
  o.P = (1 - Math.pow(.5, LW1.N - 1)) * 100;
  const vals = { x01, y01, x02, y02, x1: o.x1m, y1: o.y1m, x2: o.x2m, y2: o.y2m };
  ['x1', 'y1', 'x2', 'y2'].forEach(q => { o['r_' + q] = (Math.max(...X[q]) - Math.min(...X[q])) / 2; });
  Object.keys(vals).forEach(q => { const d = Math.max(1, o['r_' + q] || 0); o['d_' + q] = d; o['rel_' + q] = d / Math.abs(vals[q]) * 100; });
  o.vals = vals; o.X = X;
  return o;
}
const LW_TABLES = {
  1: ['xm', 'x1m', 'y1m', 'x2m', 'y2m', 'dx', 'dx1', 'dy1', 'dx2', 'dy2', 'l0', 'l1', 'l2'],
  2: ['px0', 'px1', 'py1'],
  3: ['e0', 'e1', 'k'],
  4: ['r_x1', 'r_y1', 'r_x2', 'r_y2', 'd_x01', 'd_y01', 'd_x02', 'd_y02', 'd_x1', 'd_y1', 'd_x2', 'd_y2', 'rel_x01', 'rel_y01', 'rel_x02', 'rel_y02', 'rel_x1', 'rel_y1', 'rel_x2', 'rel_y2', 'P']
};
function lwOk(key, user, o) {
  const e = o[key]; if (!Number.isFinite(user)) return false;
  if (key === 'py1') return Math.abs(Math.abs(user) - Math.abs(e)) <= Math.max(.003, Math.abs(e) * .05); // знак Δy — как в методичке или со знаком
  if (key === 'k') return Math.abs(user - e) <= .015;
  if (key === 'P') return Math.abs(user - e) <= .3 || Math.abs(user * 100 - e) <= .3;
  if (key.startsWith('rel_')) return Math.abs(user - e) <= Math.max(.06, e * .04);
  if (/^(px|py|e0|e1)/.test(key)) return Math.abs(user - e) <= Math.abs(e) * .015 + .0006;
  return Math.abs(user - e) <= Math.max(.11, Math.abs(e) * .002);
}
function lwProc() {
  const S = LWS, o = lwCalc(), P = S.proc, cls = k => S.procOk[k] === true ? 'ok' : S.procOk[k] === false ? 'bad' : '';
  const I = k => lwIn('p_' + k, P[k], '', cls(k)), mm = v => f1(v, 1);
  const t1 = `<section class="card"><b class="h">Таблица 1. Средние значения, приращения, пути</b>
    <p class="mute small">Тела: m₁ = ${f1(o.m1, 4)} кг, m₂ = ${f1(o.m2, 4)} кг; x₀₁ = ${mm(o.x01)}, y₀₁ = ${mm(o.y01)}, x₀₂ = ${mm(o.x02)}, y₀₂ = ${mm(o.y02)} мм. Ответы — с точностью до 0,1 мм.</p>
    <div class="lw-scroll"><table class="lw-tbl wide"><tr><th></th><th>своб. движение</th><th>x₁</th><th>y₁</th><th>x₂</th><th>y₂</th></tr>
    ${Array.from({ length: LW1.N }, (_, i) => `<tr><td>${i + 1}</td><td>${mm(o.X.x[i])}</td><td>${mm(o.X.x1[i])}</td><td>${mm(o.X.y1[i])}</td><td>${mm(o.X.x2[i])}</td><td>${mm(o.X.y2[i])}</td></tr>`).join('')}
    <tr class="sum"><td>Среднее</td><td>x̄ ${I('xm')}</td><td>x̄₁ ${I('x1m')}</td><td>ȳ₁ ${I('y1m')}</td><td>x̄₂ ${I('x2m')}</td><td>ȳ₂ ${I('y2m')}</td></tr>
    <tr class="sum"><td>Приращение Δ</td><td>Δx = x̄ − x₀₁ ${I('dx')}</td><td>Δx₁ = x̄₁ − x₀₁ ${I('dx1')}</td><td>Δy₁ = ȳ₁ − y₀₁ ${I('dy1')}</td><td>Δx₂ = x̄₂ − x₀₂ ${I('dx2')}</td><td>Δy₂ = ȳ₂ − y₀₂ ${I('dy2')}</td></tr>
    <tr class="sum"><td>Расстояние</td><td>l₀ = Δx ${I('l0')}</td><td colspan="2">l₁ = √(Δx₁² + Δy₁²) ${I('l1')}</td><td colspan="2">l₂ = √(Δx₂² + Δy₂²) ${I('l2')}</td></tr></table></div>
    <button class="btn line wide mt" data-lw="pcheck" data-v="1">${ic('circle-check')} Проверить таблицу 1</button></section>`;
  const t2 = `<section class="card"><b class="h">Таблица 2. Импульс (кг·мм^½)</b><p class="mute small">Импульс пропорционален m√l, его проекции — mΔx/√l и mΔy/√l. Δy бери со знаком: шайбы разлетаются в разные стороны, и сумма проекций по Y должна быть близка к нулю.</p>
    <table class="lw-tbl"><tr><th></th><th>До удара</th><th>После удара</th></tr>
    <tr><td>Вдоль X</td><td>m₁√l₀ ${I('px0')}</td><td>m₁Δx₁/√l₁ + m₂Δx₂/√l₂ ${I('px1')}</td></tr>
    <tr><td>Вдоль Y</td><td>0</td><td>m₁Δy₁/√l₁ + m₂Δy₂/√l₂ ${I('py1')}</td></tr></table>
    <button class="btn line wide mt" data-lw="pcheck" data-v="2">${ic('circle-check')} Проверить таблицу 2</button></section>`;
  const t3 = `<section class="card"><b class="h">Таблица 3. Энергия (кг·мм) и коэффициент восстановления</b><p class="mute small">Кинетическая энергия пропорциональна m·l (E = μmgl).</p>
    <table class="lw-tbl"><tr><th></th><th>До удара</th><th>После удара</th></tr><tr><td>Энергия</td><td>m₁l₀ ${I('e0')}</td><td>m₁l₁ + m₂l₂ ${I('e1')}</td></tr>
    <tr><td>k</td><td colspan="2">k = (m₁l₁ + m₂l₂)/(m₁l₀) ${I('k')}</td></tr></table>
    <button class="btn line wide mt" data-lw="pcheck" data-v="3">${ic('circle-check')} Проверить таблицу 3</button></section>`;
  const rows4 = ['x01', 'y01', 'x02', 'y02', 'x1', 'y1', 'x2', 'y2'], lab = { x01: 'x₀₁', y01: 'y₀₁', x02: 'x₀₂', y02: 'y₀₂', x1: 'x₁', y1: 'y₁', x2: 'x₂', y2: 'y₂' };
  const t4 = `<section class="card"><b class="h">Таблица 4. Погрешности</b><p class="mute small">Систематическая Δs — цена деления, 1 мм. Случайная Δ = (x_max − x_min)/2 по серии из ${LW1.N} измерений (для однократных измерений — нет). Наибольшая Δ — бо́льшая из них; относительная δ = Δ/x̄·100 %.</p>
    <div class="lw-scroll"><table class="lw-tbl wide"><tr><th>Величина</th><th>Значение</th><th>Δs</th><th>Δ случ.</th><th>Δ наиб.</th><th>δ, %</th></tr>
    ${rows4.map(q => `<tr><td>${lab[q]}, мм</td><td>${mm(o.vals[q])}</td><td>1</td><td>${q.length === 2 ? I('r_' + q) : '—'}</td><td>${I('d_' + q)}</td><td>${I('rel_' + q)}</td></tr>`).join('')}</table></div>
    <div class="lw-row"><label>Доверительная вероятность P = 1 − (½)^(N−1), % ${I('P')}</label></div>
    <button class="btn line wide mt" data-lw="pcheck" data-v="4">${ic('circle-check')} Проверить таблицу 4</button></section>`;
  const all = [1, 2, 3, 4].every(t => LW_TABLES[t].every(k => S.procOk[k] === true));
  return t1 + t2 + t3 + t4 + `<p class="lw-msg" id="lw-msg"></p>${all ? lwNext('К выводам') : '<p class="mute small center">Когда все таблицы будут верны, откроются выводы.</p>'}`;
}

/* 6. Выводы и контрольные вопросы */
const LW_CQ = [
  ['Как записывают закон сохранения импульса при неупругом центральном ударе двух тел?', 'm₁v₁ + m₂v₂ = (m₁ + m₂)u', ['m₁v₁ + m₂v₂ = m₁u₁ − m₂u₂', 'm₁v₁² = m₂v₂²', 'm₁v₁ = m₂v₂']],
  ['В каких ударах сохраняется механическая энергия?', 'Только в абсолютно упругих', ['Только в неупругих', 'В любых', 'Ни в каких']],
  ['В каких ударах сохраняется импульс замкнутой системы?', 'И в упругих, и в неупругих', ['Только в упругих', 'Только в неупругих', 'Ни в каких']],
  ['Почему соударяющиеся шайбы можно считать замкнутой системой?', 'Сила тяжести уравновешена реакцией стола, а трение за короткое время удара мало по сравнению с силой удара', ['На шайбы не действует сила тяжести', 'Шайбы одинаковой массы', 'Поле горизонтальное и гладкое без трения']],
  ['Какие прямые измерения нужны для проверки закона сохранения импульса?', 'Масс тел и координат шайб до и после удара', ['Скоростей шайб секундомером', 'Силы удара динамометром', 'Только масс тел']],
  ['Какой удар называют центральным?', 'Скорости тел направлены вдоль прямой, соединяющей их центры масс', ['Удар в центр поля', 'Удар тел одинаковой массы', 'Удар, после которого тела слипаются']],
  ['От чего зависит направление движения тел после нецентрального удара?', 'От смещения линии удара относительно центров (прицельного расстояния) и масс тел', ['Только от цвета шайб', 'Только от силы удара', 'Ни от чего — всегда вдоль оси X']]
];
function lwAutoConcl(o) {
  const dP = Math.abs(o.px1 - o.px0) / o.px0 * 100, relMax = Math.max(...['x01', 'y01', 'x02', 'y02', 'x1', 'y1', 'x2', 'y2'].map(q => o['rel_' + q]));
  // по методичке: погрешность импульса — не выше относительной погрешности наименее точно измеренной величины (табл. 4)
  const errP = relMax;
  const okP = dP <= errP * 1.5;
  return `Цель работы — проверить выполнение законов сохранения импульса и энергии при соударении шайб. ` +
    `Проекция импульса на ось X до удара m₁√l₀ = ${lwF(o.px0, 3)} кг·мм^½, после удара ${lwF(o.px1, 3)} кг·мм^½; расхождение ${lwF(dP, 1)} %. ` +
    `Проекция на ось Y после удара ${lwF(o.py1, 3)} кг·мм^½ при нуле до удара. ` +
    `С учётом погрешности измерений (≈ ${lwF(errP, 1)} %) закон сохранения импульса ${okP ? 'выполняется' : 'выполняется хуже ожидаемого — вероятно, мешает трение во время удара и разброс силы удара'}. ` +
    `Коэффициент восстановления энергии k = ${lwF(o.k, 2)} < 1: удар не абсолютно упругий, часть кинетической энергии перешла во внутреннюю (деформация, нагрев). ` +
    `Наибольшая относительная погрешность измерения координат — ${lwF(relMax, 1)} %; точнее всего нужно измерять пути после удара (короткие отрезки l₁, l₂), а точность начальных координат можно не повышать.`;
}
function lwConcl() {
  const S = LWS, o = lwCalc(); if (!S.concl) { S.concl = lwAutoConcl(o); lwSave(); }
  const qs = LW_CQ.map(([q, a, x], i) => { const opts = lwShuf(i + 20, [a, ...x]); const ch = S.cq[i];
    return `<div class="lw-q"><b>${i + 1}. ${esc(q)}</b>${opts.map(op => `<button data-lw="cq" data-q="${i}" data-v="${esc(op)}" class="${ch === op ? (S.cqChecked ? (op === a ? 'ok' : 'bad') : 'pick') : ''}">${esc(op)}</button>`).join('')}</div>`; }).join('');
  return `<section class="card"><b class="h">Выводы</b><p class="mute small">Черновик собран по твоим результатам. Проверь его и допиши своими словами — так выводы и защищают.</p>
    <textarea class="lw-ta" data-k="concl" rows="9">${esc(S.concl)}</textarea>
    <button class="btn line wide mt" data-lw="reconcl">${ic('rotate-ccw')} Собрать черновик заново</button></section>
    <section class="card"><b class="h">Контрольные вопросы (защита)</b>${qs}<button class="btn wide mt" data-lw="cqCheck">${ic('circle-check')} Проверить ответы</button>${S.cqOk ? lwNext('К отчёту') : ''}</section>`;
}

/* 7. Отчёт */
function lwReportStep() {
  const S = LWS;
  return `<section class="card"><b class="h">Отчёт готов</b><p class="mute">Отчёт оформлен по бланку кафедры (4 листа А4). Заполни шапку и сохрани PDF: в окне печати выбери «Сохранить как PDF».</p>
    <div class="lw-row"><label>ФИО ${lwIn('fio', S.fio, 'Иванов И. И.', 'txt')}</label><label>Класс ${lwIn('group', S.group, '', 'txt')}</label><label>Дата ${lwIn('date', S.date, '', 'txt')}</label></div>
    <a class="btn wide mt" href="#lw-1-report">${ic('file-text')} Открыть отчёт</a>
    <button class="btn line wide mt" data-lw="restart">${ic('rotate-ccw')} Выполнить работу заново</button></section>`;
}
function vLabWorkReport() {
  const S = lwLoad(); if (LW1.steps[S.max][0] !== 'report') { location.hash = 'lw-1'; return; }
  frame('Отчёт · ЛР № 1', { back: true });
  const o = lwCalc(), mm = v => f1(v, 1), f3 = v => f1(v, 3), f4 = v => f1(v, 4), lab = { x01: 'x₀₁', y01: 'y₀₁', x02: 'x₀₂', y02: 'y₀₂', x1: 'x₁', y1: 'y₁', x2: 'x₂', y2: 'y₂' };
  const ln = v => `<span class="ul">${esc(v || '')}</span>`;
  const [dd, mon, yy] = String(S.date || '').split('.');
  const MON = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
  const equip = [['Лабораторная установка (горизонтальное поле с координатной сеткой, ударный пружинный механизм)', '0–500 мм', '1 мм (цена деления)'], ['Набор тел (шайб) с указанной массой', `${f1(o.m1 * 1000, 1)} г; ${f1(o.m2 * 1000, 1)} г`, '0,1 г']];
  // 1 лист — титул и оборудование
  const p1 = `<section class="lwp"><p class="c b">Лаборатория кафедры физики</p><hr>
    <p class="row">Оценка ${ln('', '38%')} Подпись преподавателя ${ln('', '30%')}</p>
    <p class="row">Курсант (студент) ${ln(S.fio)} Класс <span class="ul s">${esc(S.group || '')}</span></p>
    <p class="row">Дата выполнения «<span class="ul s">${esc(dd || '')}</span>» <span class="ul m">${MON[(+mon || 1) - 1]}</span> 20<span class="ul s">${esc((yy || '').slice(2))}</span> г.</p>
    <p class="c mt2">ОТЧЕТ<br>по лабораторной работе № <span class="ul s">1</span></p>
    <p class="row">Наименование ${ln('Изучение закона сохранения импульса', '78%')}</p>
    <p class="row">Цель ${ln(LW_LIST[0].aim, '88%')}</p>
    <p class="c b mt2">ОБОРУДОВАНИЕ И ПРИБОРЫ</p>
    <table><tr><th>№ п.п.</th><th>Наименование</th><th>Предел измерения</th><th>Погрешность измерения</th></tr>
    ${Array.from({ length: 10 }, (_, i) => `<tr><td>${equip[i] ? i + 1 : ''}</td><td class="l">${equip[i] ? esc(equip[i][0]) : '&nbsp;'}</td><td>${equip[i] ? esc(equip[i][1]) : ''}</td><td>${equip[i] ? esc(equip[i][2]) : ''}</td></tr>`).join('')}</table></section>`;
  // 2 лист — схема и результаты измерений
  const p2 = `<section class="lwp"><p class="c b">СХЕМА УСТАНОВКИ</p>${lwSchemeSvg()}
    <p class="small">1, 2 — шайбы (тела); ударный пружинный механизм с винтом, направляющие; поле с координатной сеткой (цена деления 1 мм). Положение винта — ${S.screw}; тело 2 — в ${['нижнем', 'центральном', 'верхнем'][S.circle - 1]} круге.</p><hr>
    <p class="c b">РЕЗУЛЬТАТЫ ИЗМЕРЕНИЯ</p>
    <p class="small">Таблица 1. m₁ = ${f4(o.m1)} кг; m₂ = ${f4(o.m2)} кг; x₀₁ = ${mm(o.x01)} мм; y₀₁ = ${mm(o.y01)} мм; x₀₂ = ${mm(o.x02)} мм; y₀₂ = ${mm(o.y02)} мм</p>
    <table><tr><th>№ п.п.</th><th>x, мм<br><small>свободное движение</small></th><th>x₁, мм</th><th>y₁, мм</th><th>x₂, мм</th><th>y₂, мм</th></tr>
      ${Array.from({ length: LW1.N }, (_, i) => `<tr><td>${i + 1}</td><td>${mm(o.X.x[i])}</td><td>${mm(o.X.x1[i])}</td><td>${mm(o.X.y1[i])}</td><td>${mm(o.X.x2[i])}</td><td>${mm(o.X.y2[i])}</td></tr>`).join('')}
      <tr><td>Среднее</td><td>x̄ = ${mm(o.xm)}</td><td>x̄₁ = ${mm(o.x1m)}</td><td>ȳ₁ = ${mm(o.y1m)}</td><td>x̄₂ = ${mm(o.x2m)}</td><td>ȳ₂ = ${mm(o.y2m)}</td></tr>
      <tr><td>Приращение</td><td>Δx = ${mm(o.dx)}</td><td>Δx₁ = ${mm(o.dx1)}</td><td>Δy₁ = ${mm(o.dy1)}</td><td>Δx₂ = ${mm(o.dx2)}</td><td>Δy₂ = ${mm(o.dy2)}</td></tr>
      <tr><td>Расстояние</td><td>l₀ = ${mm(o.l0)}</td><td colspan="2">l₁ = ${mm(o.l1)}</td><td colspan="2">l₂ = ${mm(o.l2)}</td></tr></table>
    <p class="row sign">Подпись зав. кабинетом ${ln('', '40%')}</p></section>`;
  // 3 лист — формулы и вычисления
  const p3 = `<section class="lwp"><p class="c b">РАСЧЕТНЫЕ ФОРМУЛЫ ИСКОМЫХ ВЕЛИЧИН И ПОГРЕШНОСТЕЙ</p>
    <div class="fm"><p>v = √(2μgl) &nbsp;⇒&nbsp; p ∝ m√l; &nbsp; E = μmgl ∝ m·l</p>
    <p>l₀ = x̄ − x₀₁; &nbsp; l₁ = √(Δx₁² + Δy₁²); &nbsp; l₂ = √(Δx₂² + Δy₂²)</p>
    <p>X: m₁√l₀ = m₁Δx₁/√l₁ + m₂Δx₂/√l₂; &nbsp; Y: 0 = m₁Δy₁/√l₁ + m₂Δy₂/√l₂</p>
    <p>k = (m₁l₁ + m₂l₂) / (m₁l₀)</p>
    <p>Δ<sub>случ</sub> = (x<sub>max</sub> − x<sub>min</sub>)/2; &nbsp; Δ<sub>сист</sub> = цена деления; &nbsp; δ = Δ/x̄·100 %; &nbsp; P = 1 − (½)<sup>N−1</sup></p></div><hr>
    <p class="c b">ВЫЧИСЛЕНИЕ РЕЗУЛЬТАТОВ ИЗМЕРЕНИЯ И ПОГРЕШНОСТЕЙ</p>
    <table><tr><th>Импульс, кг·мм^½</th><th>До удара</th><th>После удара</th></tr><tr><td>Вдоль X</td><td>m₁√l₀ = ${f4(o.m1)}·√${mm(o.l0)} = ${f3(o.px0)}</td><td>${f3(o.px1)}</td></tr><tr><td>Вдоль Y</td><td>0</td><td>${f3(o.py1)}</td></tr></table>
    <table><tr><th>Энергия, кг·мм</th><th>До удара</th><th>После удара</th></tr><tr><td>m·l</td><td>${f3(o.e0)}</td><td>${f3(o.e1)}</td></tr><tr><td>Коэффициент восстановления</td><td colspan="2">k = ${f3(o.e1)} / ${f3(o.e0)} = ${f1(o.k, 2)}</td></tr></table>
    <table><tr><th>Величина</th><th>Значение</th><th>Δ сист.</th><th>Δ случ.</th><th>Δ наиб.</th><th>δ, %</th></tr>
      ${Object.keys(lab).map(q => `<tr><td>${lab[q]}, мм</td><td>${mm(o.vals[q])}</td><td>1</td><td>${q.length === 2 ? mm(o['r_' + q]) : '—'}</td><td>${mm(o['d_' + q])}</td><td>${f1(o['rel_' + q], 2)}</td></tr>`).join('')}</table>
    <p class="small">Доверительная вероятность при N = ${LW1.N}: P = 1 − (½)^${LW1.N - 1} = ${f1(o.P, 1)} %.</p></section>`;
  // 4 лист — график и выводы
  const p4 = `<section class="lwp"><p class="c b">ПОСТРОЕНИЕ ГРАФИКОВ</p>${lwGraphSvg(o)}
    <p class="small c">Перемещения шайб на поле: до удара — l₀ (тело 1 без тела 2), после удара — l₁, l₂ (средние по ${LW1.N} опытам).</p>
    <p class="c b mt2">ВЫВОДЫ ПО ПРОДЕЛАННОЙ РАБОТЕ</p><p class="concl">${esc(S.concl).replace(/\n/g, '<br>')}</p>
    <p class="row sign">Подпись исполнителя ${ln('', '45%')}</p></section>`;
  setMain(`<div class="lwr-tools"><button class="btn" data-lw="print">${ic('printer')} Сохранить PDF / печать</button><a class="btn line" href="#lw-1">${ic('chevron-left')} К работе</a></div><article class="lwr">${p1}${p2}${p3}${p4}</article>`);
}
/* График на миллиметровке бланка: векторы перемещений шайб */
function lwGraphSvg(o) {
  const W = 520, H = 300, x0 = 30, y0 = 150, sc = Math.min((W - 50) / Math.max(o.l0, o.dx1, o.dx2, 1), 120 / Math.max(Math.abs(o.dy1), Math.abs(o.dy2), 1));
  const grid = Array.from({ length: 27 }, (_, i) => `<line x1="${10 + i * 20}" y1="10" x2="${10 + i * 20}" y2="290" stroke="#999" stroke-width=".5"/>`).join('') + Array.from({ length: 15 }, (_, i) => `<line x1="10" y1="${10 + i * 20}" x2="530" y2="${10 + i * 20}" stroke="#999" stroke-width=".5"/>`).join('');
  const arr = (dx, dy, col, t, dash) => { const X = x0 + dx * sc, Y = y0 - dy * sc; return `<line x1="${x0}" y1="${y0}" x2="${X}" y2="${Y}" stroke="${col}" stroke-width="2.6" ${dash ? 'stroke-dasharray="7 4"' : ''}/><circle cx="${X}" cy="${Y}" r="3.5" fill="${col}"/><text x="${X > 380 ? X - 6 : X + 6}" y="${Y - 7}" font-size="12" fill="${col}" text-anchor="${X > 380 ? 'end' : 'start'}">${t}</text>`; };
  return `<svg class="lwr-svg" viewBox="0 0 540 300">${grid}<line x1="${x0}" y1="${y0}" x2="530" y2="${y0}" stroke="#666" stroke-width=".8"/><line x1="${x0}" y1="10" x2="${x0}" y2="290" stroke="#000"/><text x="505" y="${y0 + 16}" font-size="12">x</text><text x="${x0 + 6}" y="22" font-size="12">y</text>
    ${arr(o.l0, 0, '#000', 'l₀ (тело 1, без тела 2)', true)}${arr(o.dx1, o.dy1, '#1f4fd8', 'l₁ (тело 1)')}${arr(o.dx2, o.dy2, '#c0392b', 'l₂ (тело 2)')}</svg>`;
}
function lwSchemeSvg() {
  return `<svg class="lwr-svg" viewBox="0 0 520 220" aria-hidden="true"><rect x="70" y="10" width="440" height="200" fill="none" stroke="#000"/>${Array.from({ length: 21 }, (_, i) => `<line x1="${70 + i * 22}" y1="10" x2="${70 + i * 22}" y2="210" stroke="#bbb" stroke-width=".6"/>`).join('')}${Array.from({ length: 10 }, (_, i) => `<line x1="70" y1="${10 + i * 22}" x2="510" y2="${10 + i * 22}" stroke="#bbb" stroke-width=".6"/>`).join('')}
  <rect x="8" y="96" width="70" height="4" fill="#555"/><rect x="8" y="120" width="70" height="4" fill="#555"/><rect x="10" y="104" width="50" height="12" fill="#888"/><rect x="22" y="90" width="8" height="40" fill="#444"/>
  <circle cx="92" cy="110" r="12" fill="#fff" stroke="#000"/><text x="92" y="114" font-size="11" text-anchor="middle">1</text><circle cx="120" cy="104" r="12" fill="#ddd" stroke="#000"/><text x="120" y="108" font-size="11" text-anchor="middle">2</text>
  <text x="30" y="150" font-size="10">ударный механизм</text><text x="26" y="86" font-size="10">винт</text><text x="440" y="206" font-size="10">x, мм</text><text x="74" y="22" font-size="10">y, мм</text></svg>`;
}

/* ---------- действия ---------- */
function lwMsg(t, bad) { const m = $('#lw-msg'); if (m) { m.textContent = t; m.className = 'lw-msg ' + (bad ? 'bad' : 'good'); } }
function lwGo(i) { LWS.step = Math.max(0, Math.min(i, LWS.max)); lwSave(); render(); ui.main.scrollTop = 0; }
function lwAdvance() { LWS.max = Math.max(LWS.max, LWS.step + 1); LWS.step = LWS.step + 1; lwSave(); render(); ui.main.scrollTop = 0; }
document.addEventListener('input', e => {
  const el = e.target.closest && e.target.closest('.lwi, .lw-ta'); if (!el || !LWS) return;
  const k = el.dataset.k;
  if (k.startsWith('p_')) { LWS.proc[k.slice(2)] = el.value; delete LWS.procOk[k.slice(2)]; el.classList.remove('ok', 'bad'); }
  else if (k === 'cx') LWS.cur.r = el.value;
  else if (/^c(x1|y1|x2|y2)$/.test(k)) { LWS.cur.r = LWS.cur.r || {}; LWS.cur.r[k.slice(1)] = el.value; }
  else LWS[k] = el.value;
  lwSave();
});
document.addEventListener('click', e => {
  const b = e.target.closest('[data-lw]'); if (!b) return; const S = lwLoad(), d = b.dataset;
  switch (d.lw) {
    case 'go': lwGo(+d.v); break;
    case 'next': lwAdvance(); break;
    case 'admit': S.admit[d.q] = d.v; S.admitChecked = false; lwSave(); render(); break;
    case 'admitCheck': { const n = LW_ADMIT.filter(([, a], i) => S.admit[i] === a).length; S.admitChecked = true; S.admitOk = n >= 6; lwSave(); render();
      toast(S.admitOk ? `Допуск сдан: ${n} из 8` : `Верно ${n} из 8 — нужно 6. Перечитай теорию и попробуй снова.`, S.admitOk ? '' : 'bad'); break; }
    case 'puck': if (S.p1 === d.v) S.p1 = null; else if (S.p2 === d.v) S.p2 = null; else if (!S.p1) S.p1 = d.v; else if (!S.p2) S.p2 = d.v; else { S.p1 = d.v; S.p2 = null; } S.prepOk = false; lwSave(); render(); break;
    case 'prepCheck': {
      if (!S.p1 || !S.p2) { lwMsg('Выбери два тела.', 1); break; }
      const m1 = lwPuck(S.p1).m, m2 = lwPuck(S.p2).m;
      if (Math.abs(m1 - m2) / Math.min(m1, m2) > .12) { lwMsg('Массы тел должны быть примерно одинаковыми — выбери шайбы с близкими массами.', 1); break; }
      if (Math.abs(lwNum(S.m1) - m1) > .00006 || Math.abs(lwNum(S.m2) - m2) > .00006) { lwMsg('Массы записаны неверно. Переведи граммы в килограммы: 20,1 г = 0,0201 кг.', 1); break; }
      if (!(Math.abs(lwNum(S.rx01) - (S.x01 + LW1.R)) <= 1.2 && Math.abs(lwNum(S.ry01) - S.y01) <= 1.2)) { S.prepTries = (S.prepTries || 0) + 1; lwSave();
        lwMsg(S.prepTries >= 3 ? `Не совпадает. Подсказка: x₀₁ ≈ ${Math.round(S.x01 + LW1.R)} мм, y₀₁ ≈ ${Math.round(S.y01)} мм — найди это место в лупе.` : 'Координаты не совпадают с установкой. Наведи лупу на красную метку крайней точки шайбы 1 и посчитай миллиметровые деления.', 1); break; }
      S.prepOk = true; lwSave(); render(); toast('Подготовка выполнена'); break;
    }
    case 'screw': if (!S.free.length) { S.screw = Math.max(1, Math.min(5, S.screw + +d.d)); lwSave(); render(); } break;
    case 'circle': S.circle = +d.v; S.place = null; lwSave(); render(); break;
    case 'placeCheck': {
      const c = LW1.circles[S.circle - 1];
      if (!(Math.abs(lwNum(S.rx02) - (c[0] + LW1.R)) <= 1.2 && Math.abs(lwNum(S.ry02) - c[1]) <= 1.2)) { lwMsg('Координаты шайбы 2 не совпадают. Наведи лупу на красную метку её крайней точки.', 1); break; }
      S.place = c.slice(); S.placeOk = true; lwSave(); render(); break;
    }
    case 'shoot': {
      if (LWV.anim) break;
      if (d.v === 'coll' && !S.place) S.place = LW1.circles[S.circle - 1].slice();
      const shot = lwShot(d.v);
      b.disabled = true; lwMsg('Выстрел…');
      lwAnimate(shot, () => {
        const fin = shot.at(shot.T);
        if (!lwInField(fin.p1) || (fin.p2 && !lwInField(fin.p2))) { LWV.pos = null; lwDraw(); lwMsg('Шайба ушла за край поля — опыт не засчитан. Повтори выстрел' + (S.free.length ? '.' : ' или уменьши силу удара винтом.'), 1); b.disabled = false; return; }
        if (shot.miss) { LWV.pos = null; lwDraw(); lwMsg('Шайба 1 прошла мимо шайбы 2 — опыт не засчитан, повтори выстрел.', 1); b.disabled = false; return; }
        S.cur = d.v === 'free' ? { kind: 'free', t: fin.p1[0] + LW1.R, r: '' } : { kind: 'coll', t: { x1: fin.p1[0] + LW1.R, y1: fin.p1[1], x2: fin.p2[0] + LW1.R, y2: fin.p2[1] }, r: {} };
        S.curPos = fin; lwSave(); render(); LWV.pos = fin; lwDraw();
      });
      break;
    }
    case 'record': {
      const cur = S.cur; if (!cur) break;
      if (cur.kind === 'free') {
        const v = lwNum(cur.r); if (!(Math.abs(v - cur.t) <= 1.2)) { cur.tries = (cur.tries || 0) + 1; lwSave(); lwMsg(cur.tries >= 3 ? `Подсказка: x ≈ ${Math.round(cur.t)} мм.` : 'Отсчёт не совпадает. Наведи лупу на красную метку крайней точки шайбы 1.', 1); break; }
        S.free.push({ r: v, t: cur.t });
      } else {
        const ks = ['x1', 'y1', 'x2', 'y2'], bad = ks.filter(k => !(Math.abs(lwNum(cur.r[k]) - cur.t[k]) <= 1.2));
        if (bad.length) { cur.tries = (cur.tries || 0) + 1; lwSave(); lwMsg(cur.tries >= 3 ? 'Подсказка: ' + bad.map(k => `${k} ≈ ${Math.round(cur.t[k])}`).join(', ') + ' мм.' : 'Не совпадает: ' + bad.join(', ') + '. Снимай по красной метке крайней точки (1 — стальная шайба, 2 — латунная).', 1); break; }
        S.coll.push({ r: Object.fromEntries(ks.map(k => [k, lwNum(cur.r[k])])), t: cur.t });
      }
      S.cur = null; S.curPos = null; lwSave(); render(); toast('Записано'); break;
    }
    case 'pcheck': {
      const o = lwCalc(), keys = LW_TABLES[d.v]; let bad = 0;
      keys.forEach(k => { const ok = lwOk(k, lwNum(S.proc[k]), o); S.procOk[k] = ok; if (!ok) bad++; });
      lwSave(); render();
      toast(bad ? `Таблица ${d.v}: ошибок — ${bad}. Красные ячейки пересчитай.` : `Таблица ${d.v} заполнена верно`, bad ? 'bad' : ''); break;
    }
    case 'reconcl': S.concl = lwAutoConcl(lwCalc()); lwSave(); render(); break;
    case 'cq': S.cq[d.q] = d.v; S.cqChecked = false; lwSave(); render(); break;
    case 'cqCheck': { const n = LW_CQ.filter(([, a], i) => S.cq[i] === a).length; S.cqChecked = true; S.cqOk = n >= 6; lwSave(); render();
      toast(S.cqOk ? `Защита: ${n} из ${LW_CQ.length}` : `Верно ${n} из ${LW_CQ.length} — нужно 6.`, S.cqOk ? '' : 'bad');
      if (S.cqOk && !S.done) { S.done = true; lwSave(); addXP(100, 'Лабораторная работа'); } break; }
    case 'print': window.print(); break;
    case 'restart': if (confirm('Начать лабораторную работу заново? Записи и таблицы будут очищены.')) { LWS = lwFresh(); lwSave(); location.hash = 'lw-1'; render(); } break;
  }
});
