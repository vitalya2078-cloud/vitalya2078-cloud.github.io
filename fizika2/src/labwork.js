/* =====================================================================
   Практикум: лабораторные работы «как на занятии».
   ЛР № 1. Изучение закона сохранения импульса (шайбы на горизонтальном поле).
   Как на занятии: одна основная шайба (тело 1, ударяющее) и две шайбы-мишени разной массы (тела 2 и 3).
   Шаги: допуск → подготовка → опыт 1 (свободное движение) → опыт 2 (удар по телу 2) → опыт 3 (удар по телу 3)
         → обработка (таблицы 1а, 1б, 2–4) → выводы и контрольные вопросы → отчёт (PDF).
   Координаты ученик считывает сам по сетке и лупе; приложение их только проверяет.
   ===================================================================== */

const LW_LIST = [
  { id: 1, title: 'Изучение закона сохранения импульса', aim: 'Исследовать соударение тел, проверить выполнение законов сохранения импульса и энергии, оценить погрешность опытов.', topic: 'Механика · гл. 2–3 учебника', ready: true },
  { id: 2, title: 'Определение момента инерции абсолютно твёрдого тела', aim: 'Изучить законы динамики вращательного движения; получить экспериментальную зависимость углового ускорения от момента силы и определить момент инерции маятника динамическим методом.', topic: 'Механика · гл. 4 учебника (маятник Обербека)', ready: true },
  { id: 3, title: 'Определение показателя адиабаты', aim: 'Изучить основные положения термодинамики, экспериментально определить показатель адиабаты для воздуха и сравнить полученные значения с теоретическими.', topic: 'Термодинамика · гл. 9 учебника (метод Клемана — Дезорма)', ready: true }
];

const LW1 = {
  pucks: [{ id: 'А', m: .0186 }, { id: 'Б', m: .0201 }, { id: 'В', m: .0212 }, { id: 'Г', m: .0228 }, { id: 'Д', m: .0247 }],
  R: 15,                         // радиус шайбы, мм
  field: { w: 500, h: 400 },     // рабочее поле, мм
  circles: [[75, 189], [78, 200], [75, 211]], // шайба 2 почти вплотную к шайбе 1 (как на установке) // «закрашенные круги» для тела 2
  lNom: [150, 185, 220, 255, 290],            // номинальный путь до остановки при положениях винта 1…5, мм
  N: 7,                          // выстрелов в серии
  steps: [['admit', 'Допуск'], ['prep', 'Подготовка'], ['free', 'Опыт 1'], ['coll2', 'Опыт 2'], ['coll3', 'Опыт 3'], ['proc', 'Обработка'], ['concl', 'Выводы'], ['report', 'Отчёт']]
};

/* ---------- состояние (сохраняется в браузере) ---------- */
const LW_KEY = 'f2-lw1';
let LWS = null;
function lwFresh() {
  const r = Math.random;
  return {
    v: 3, step: 0, max: 0,
    x01: +(44 + r() * 2).toFixed(2), y01: +(199.2 + r() * 1.6).toFixed(2), mu: +(.105 + r() * .03).toFixed(4),
    admit: {}, admitOk: false,
    p1: null, p2: null, p3: null, m1: '', m2: '', m3: '', rx01: '', ry01: '', prepOk: false,
    screw: 3, free: [], cur: null,
    ex: { 2: lwEx(), 3: lwEx() },        // опыты с телом 2 и с телом 3
    proc: {}, procOk: {},
    concl: '', cq: {}, cqOk: false,
    fio: '', group: '', date: new Date().toLocaleDateString('ru-RU'), done: false
  };
}
const lwEx = () => ({ circle: 2, place: null, rx: '', ry: '', placeOk: false, rows: [] });
/* номер тела-мишени на текущем шаге: 2 или 3 (0 — мишени нет) */
function lwTargetJ() { const st = LW1.steps[(LWS || lwLoad()).step][0]; return st === 'coll3' ? 3 : st === 'coll2' ? 2 : 0; }
const LW_SUB = { 1: '₁', 2: '₂', 3: '₃' };
function lwLoad() { if (LWS) return LWS; try { LWS = JSON.parse(localStorage.getItem(LW_KEY) || 'null'); } catch (e) { LWS = null; } if (!LWS || LWS.v !== 3) LWS = lwFresh(); return LWS; }
function lwSave() { try { localStorage.setItem(LW_KEY, JSON.stringify(LWS)); } catch (e) {} }
const lwNum = s => { const v = parseFloat(String(s).replace(',', '.').replace(/\s/g, '')); return Number.isFinite(v) ? v : NaN; };
const lwGauss = () => { let u = 0, v = 0; while (!u) u = Math.random(); while (!v) v = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
const lwF = (v, d = 2) => Number.isFinite(v) ? f1(v, d) : '—';
const lwPuck = id => LW1.pucks.find(p => p.id === id);

/* ---------- физика выстрела ---------- */
const LW_G = 9.81;
function lwShot(kind, j = 2) {
  const S = LWS, a = S.mu * (1 + .02 * lwGauss()) * LW_G * 1000;       // замедление, мм/с²
  const v0 = Math.sqrt(2 * S.mu * LW_G * 1000 * LW1.lNom[S.screw - 1]) * (1 + .022 * lwGauss()); // мм/с
  const th = .004 * lwGauss(), d = [Math.cos(th), Math.sin(th)], p1 = [S.x01, S.y01];
  const sAt = (v, t) => { t = Math.max(0, Math.min(t, v / a)); return v * t - a * t * t / 2; }, stopT = v => v / a;
  if (kind === 'free') {
    const T = stopT(v0);
    return { kind, T, at: t => ({ p1: [p1[0] + d[0] * sAt(v0, t), p1[1] + d[1] * sAt(v0, t)] }) };
  }
  // тело 2 ставят в круг рукой — небольшой разброс положения
  const E = S.ex[j], c2 = [E.place[0] + .25 * lwGauss(), E.place[1] + .25 * lwGauss()], R2 = 2 * LW1.R;
  // путь до касания: |p1 + d·s − c2| = 2R
  const w = [p1[0] - c2[0], p1[1] - c2[1]], B = 2 * (d[0] * w[0] + d[1] * w[1]), C = w[0] ** 2 + w[1] ** 2 - R2 * R2, D = B * B - 4 * C;
  const sc = D >= 0 ? (-B - Math.sqrt(D)) / 2 : Infinity;
  if (!(sc >= 0) || sc >= v0 * v0 / (2 * a)) return lwShotFreeWith(p1, d, v0, a, c2);
  const tc = (v0 - Math.sqrt(v0 * v0 - 2 * a * sc)) / a, vc = Math.sqrt(v0 * v0 - 2 * a * sc);
  const q1 = [p1[0] + d[0] * sc, p1[1] + d[1] * sc], nx = (c2[0] - q1[0]) / R2, ny = (c2[1] - q1[1]) / R2;
  const m1 = lwPuck(S.p1).m, m2 = lwPuck(S['p' + j]).m, e = Math.max(.75, Math.min(.95, .85 + .02 * lwGauss()));
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
    const L = Math.min(cssW * (cssW < 500 ? .4 : .36), 200), [qx] = map(LWV.lens[0], LWV.lens[1]), X0 = qx > cssW * .55 ? 8 : cssW - L - 8, Y0 = 8, Z = 9 * Math.max(1, 600 / cssW) * k, [lx, ly] = LWV.lens;
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
  LW1.circles.forEach(([x, y], i) => { const [a, b] = P(x, y), r = R * s, on = lwTargetJ() && i + 1 === S.ex[lwTargetJ()].circle;
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
  const puck = (p, kind) => { if (!p) return; const [a, b] = P(p[0], p[1]), r = R * s, m = lwPuck(S['p' + kind]);
    c.save(); c.shadowColor = 'rgba(10,20,30,.45)'; c.shadowBlur = 4 * s; c.shadowOffsetX = 1.2 * s; c.shadowOffsetY = 1.6 * s;
    const g = c.createRadialGradient(a - r * .35, b - r * .4, r * .1, a, b, r);
    if (kind === 1) { g.addColorStop(0, '#F4F7FB'); g.addColorStop(.55, '#AEB9C8'); g.addColorStop(1, '#5D6A7D'); } else if (kind === 3) { g.addColorStop(0, '#FFD9C7'); g.addColorStop(.55, '#C46A45'); g.addColorStop(1, '#6E2E17'); } else { g.addColorStop(0, '#FFF0C2'); g.addColorStop(.55, '#D6A54A'); g.addColorStop(1, '#7E5A1A'); }
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
  puck(pos.p2, lwTargetJ() || 2); puck(pos.p1, 1);
}
/* в покое: тело 1 в направляющих; мишень — в выбранном круге (видна и пока ученик снимает её координаты) */
function lwRestPos() { const S = LWS, j = lwTargetJ(), E = j && S.ex[j]; return { p1: [S.x01, S.y01], p2: E ? (E.place || LW1.circles[E.circle - 1]).slice() : null }; }

/* лупа: касание ставит перекрестье, протяжка пальцем двигает его в 4 раза медленнее пальца (точная наводка);
   мышью перекрестье просто следует за курсором; кнопки под полем — наведение на метку шайбы и шаг 0,5 мм */
const lwClampLens = () => { const F = LW1.field; LWV.lens = [Math.max(-20, Math.min(F.w + 5, LWV.lens[0])), Math.max(-5, Math.min(F.h + 5, LWV.lens[1]))]; };
document.addEventListener('pointerdown', e => {
  const cv = e.target.closest && e.target.closest('#lw-cv'); if (!cv) return;
  const touch = e.pointerType !== 'mouse', b0 = cv.getBoundingClientRect(), k0 = b0.width / 580;
  const at = ev => [(ev.clientX - b0.left) / k0 - 60, 422 - (ev.clientY - b0.top) / k0];
  const x0 = e.clientX, y0 = e.clientY, start = LWV.lens ? LWV.lens.slice() : null; let drag = false;
  if (!touch || !start) { LWV.lens = at(e); lwClampLens(); lwDraw(); }
  try { cv.setPointerCapture(e.pointerId); } catch (_) {}
  const mv = ev => {
    if (!touch) { LWV.lens = at(ev); lwClampLens(); lwDraw(); return; }
    const dx = ev.clientX - x0, dy = ev.clientY - y0; if (!drag && Math.hypot(dx, dy) < 6) return; drag = true;
    const base = start || at(e), f = .25 / k0; LWV.lens = [base[0] + dx * f, base[1] - dy * f]; lwClampLens(); lwDraw();
  };
  const up = () => { if (touch && start && !drag) { LWV.lens = at(e); lwClampLens(); lwDraw(); }
    cv.removeEventListener('pointermove', mv); cv.removeEventListener('pointerup', up); cv.removeEventListener('pointercancel', up); };
  cv.addEventListener('pointermove', mv); cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
});
document.addEventListener('click', e => {
  const btn = e.target.closest && e.target.closest('[data-aim]'); if (!btn || !$('#lw-cv')) return;
  const v = btn.dataset.aim, pos = LWV.pos || lwRestPos();
  if (v === 'p1' || v === 'p2') { const p = pos[v]; if (!p) { toast('Шайбы-мишени на этом шаге на поле нет'); return; } LWV.lens = [p[0] + LW1.R, p[1]]; }
  else { if (!LWV.lens) { const p = pos.p1; LWV.lens = [p[0] + LW1.R, p[1]]; } const d = { l: [-.5, 0], r: [.5, 0], u: [0, .5], dn: [0, -.5] }[v]; LWV.lens = [LWV.lens[0] + d[0], LWV.lens[1] + d[1]]; lwClampLens(); }
  lwDraw();
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
    LW_LIST.map(w => { const T = w.id === 1 ? S : w.id === 2 ? l2Load() : l3Load(), n = (w.id === 1 ? LW1 : w.id === 2 ? L2 : L3).steps.length, pr = T.done ? 'выполнена' : T.max ? `шаг ${T.max + 1} из ${n}` : 'не начата';
      return `<a class="lw-card" href="#lw-${w.id}"><span class="lw-num">№ ${w.id}</span><span class="lw-copy"><b>${esc(w.title)}</b><small>${esc(w.aim)}</small><span class="lw-meta">${esc(w.topic)} · <i class="${T.done ? 'mint' : ''}">${pr}</i></span></span>${ic('chevron-right')}</a>`; }).join('') +
    `<p class="mute small lw-more">Остальные работы методички добавим следующими.</p>`);
}

function vLabWork() {
  const S = lwLoad(); const st = LW1.steps[S.step][0];
  frame('ЛР № 1 · Закон сохранения импульса', { back: true, sub: LW1.steps[S.step][1] });
  const chips = `<div class="lw-steps">${LW1.steps.map(([k, t], i) => `<button data-lw="go" data-v="${i}" class="${i === S.step ? 'on' : ''}${i < S.max || (i === S.max && st === 'report') ? ' ok' : ''}" ${i > S.max ? 'disabled' : ''}><b>${i + 1}</b><span>${t}</span></button>`).join('')}</div>`;
  const body = ({ admit: lwAdmit, prep: lwPrep, free: lwFreeStep, coll2: () => lwCollStep(2), coll3: () => lwCollStep(3), proc: lwProc, concl: lwConcl, report: lwReportStep })[st]();
  setMain(`<div class="lw">${chips}${body}</div>`);
  if (['prep', 'free', 'coll2', 'coll3'].includes(st)) { LWV.pos = null; lwDraw(); if (!lwDraw.ro && 'ResizeObserver' in window) lwDraw.ro = new ResizeObserver(() => lwDraw()); if (lwDraw.ro) { lwDraw.ro.disconnect(); lwDraw.ro.observe($('#lw-cv')); } }
}
const lwField = (hint, ctl = '') => `<section class="lw-stage"><canvas id="lw-cv" aria-label="Рабочее поле установки"></canvas>
  <div class="lw-aim" role="group" aria-label="Наведение лупы"><button data-aim="p1">${ic('crosshair')}Шайба 1</button>${lwTargetJ() ? `<button data-aim="p2">${ic('crosshair')}Шайба ${lwTargetJ()}</button>` : ''}
  <span class="lw-arrows"><button data-aim="l" aria-label="Влево на 0,5 мм">${ic('chevron-left')}</button><button data-aim="u" aria-label="Вверх на 0,5 мм">${ic('chevron-up')}</button><button data-aim="dn" aria-label="Вниз на 0,5 мм">${ic('chevron-down')}</button><button data-aim="r" aria-label="Вправо на 0,5 мм">${ic('chevron-right')}</button></span></div>
  ${ctl ? `<div class="lw-ctl">${ctl}</div>` : ''}</section>
  <p class="lw-hint">${ic('search')} ${hint || 'Кнопка «Шайба» наводит лупу на красную метку крайней точки, стрелки сдвигают перекрестье на 0,5 мм. Пальцем: коснись поля и веди — перекрестье идёт в 4 раза медленнее пальца.'}</p>`;
/* компактное поле ввода в панели под установкой */
const lwCtlIn = (k, lab, val) => `<label>${lab}${lwIn(k, val, 'мм')}</label>`;
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
  ['Что нужно проверить перед каждым выстрелом?', 'Шайба 1 стоит в направляющих, а руки и посторонние предметы убраны с поля', ['Что винт затянут до упора', 'Что тело 2 снято с круга', 'Ничего, можно сразу стрелять']],
  ['Зачем в пределах одной серии не трогают винт ударного механизма?', 'Чтобы скорость тела 1 перед ударом во всех выстрелах была одинаковой', ['Чтобы не сломать пружину', 'Чтобы шайба не перевернулась', 'Так требует закон Гука']],
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
    <details><summary>Оборудование и установка</summary><p>Горизонтальное поле с координатной сеткой, набор шайб с указанной массой, ударный пружинный механизм с винтом для изменения силы удара, направляющие для шайбы 1, закрашенные круги для установки шайбы-мишени. Основная шайба (тело 1) по очереди ударяет две шайбы-мишени разной массы — тело 2 и тело 3.</p></details>
    <details><summary>Техника безопасности</summary><p>Работу начинают только с разрешения преподавателя. Перед выстрелом убедись, что шайба стоит в направляющих, а руки и посторонние предметы убраны с поля. Винт ударного механизма вращают плавно, не затягивая до упора. Шайбы не бросают и не толкают руками по полю — только ударным механизмом. При неисправности установки прекрати опыт и сообщи преподавателю.</p></details></section>
    <section class="card"><b class="h">Допуск к работе</b><p class="mute">Ответь на вопросы. Нужно не меньше 6 верных из 8.</p>${qs}
    <button class="btn wide mt" data-lw="admitCheck">${ic('circle-check')} Сдать допуск</button>${S.admitOk ? lwNext('К подготовке') : ''}</section>`;
}
function lwShuf(seed, arr) { const a = arr.slice(); let s = seed * 9301 + 49297; for (let i = a.length - 1; i > 0; i--) { s = (s * 9301 + 49297) % 233280; const j = Math.floor(s / 233280 * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }

/* 2. Подготовка */
function lwPrep() {
  const S = LWS, role = id => S.p1 === id ? 1 : S.p2 === id ? 2 : S.p3 === id ? 3 : 0;
  const pk = LW1.pucks.map(p => { const r = role(p.id); return `<button data-lw="puck" data-v="${p.id}" class="${r ? 'p' + r : ''}"><b>${p.id}</b><small>${f1(p.m * 1000, 1)} г</small>${r ? `<i>тело ${r}</i>` : ''}</button>`; }).join('');
  return `<section class="card"><b class="h">1. Выбери три шайбы</b><p class="mute small">Первое касание — основная шайба (тело 1, ударяющее). Второе и третье — шайбы-мишени разной массы (тела 2 и 3): с ними проведёшь опыты 2 и 3. Масса указана на шайбе. Чтобы разница была заметнее, бери мишени с непохожими массами.</p><div class="lw-pucks">${pk}</div>
    <div class="lw-row three">${[1, 2, 3].map(j => { const pk = lwPuck(S['p' + j]); return `<label>m${LW_SUB[j]}, кг <small class="lw-who">${pk ? `тело ${j} — шайба ${pk.id}, ${f1(pk.m * 1000, 1)} г` : `тело ${j} — не выбрано`}</small>${lwIn('m' + j, S['m' + j], '0,0000')}</label>`; }).join('')}</div></section>
    <section class="card"><b class="h">2. Начальные координаты тела 1</b><p class="mute small">Шайба 1 стоит в направляющих. Нажми «Шайба 1» под полем — лупа наведётся на красную метку её крайней точки (справа, по ходу движения). Запиши координаты с точностью до 1 мм в поля под установкой и нажми «Проверить».</p></section>
    ${lwField('', `<div class="lw-ctl-row">${lwCtlIn('rx01', 'x₀₁', S.rx01)}${lwCtlIn('ry01', 'y₀₁', S.ry01)}<button class="btn" data-lw="prepCheck">${ic('circle-check')} Проверить</button></div><p class="lw-msg" id="lw-msg"></p>${S.prepOk ? lwNext('К опыту 1') : ''}`)}`;
}

/* 3. Опыт 1 — свободное движение */
function lwFreeStep() {
  const S = LWS, rows = S.free, n = rows.length, cur = S.cur && S.cur.kind === 'free';
  const tbl = `<table class="lw-tbl"><tr><th>№</th><th>x, мм</th></tr>${Array.from({ length: LW1.N }, (_, i) => `<tr class="${i === n && cur ? 'now' : ''}"><td>${i + 1}</td><td>${rows[i] ? f1(rows[i].r, 1) : i === n && cur ? '…' : ''}</td></tr>`).join('')}</table>`;
  return `<section class="card lw-cond"><b class="h">Опыт 1. Свободное движение тела 1</b><p class="mute small">Тела 2 на поле нет. Сделай ${LW1.N} выстрелов при одном положении винта, после каждого запиши координату x остановки шайбы 1.</p>
    <div class="lw-screw"><span>Винт ударного механизма</span><button class="lp-btn" data-lw="screw" data-d="-1" ${n ? 'disabled' : ''}>−</button><b>${S.screw}</b><button class="lp-btn" data-lw="screw" data-d="1" ${n ? 'disabled' : ''}>+</button></div>
    ${n ? '<p class="mute small">Положение винта зафиксировано: все выстрелы — «при тех же условиях».</p>' : ''}</section>
    ${lwField('', (cur ? `<div class="lw-ctl-row">${lwCtlIn('cx', `x (выстрел ${n + 1})`, S.cur.r ?? '')}<button class="btn" data-lw="record">${ic('pencil')} Записать</button></div>`
      : n < LW1.N ? `<button class="btn wide" data-lw="shoot" data-v="free">${ic('target')} Выстрел ${n + 1} из ${LW1.N}</button>` : lwNext('К опыту 2')) +
      `<p class="lw-msg" id="lw-msg">${cur ? 'Шайба остановилась. Нажми «Шайба 1» и сними x красной метки.' : ''}</p>`)}
    <section class="card"><b class="h">Записи опыта 1</b>${tbl}</section>`;
}

/* 4–5. Опыты 2 и 3 — соударение тела 1 с телом-мишенью j (2 или 3) */
function lwCollStep(j) {
  const S = LWS, E = S.ex[j], rows = E.rows, n = rows.length, cur = S.cur && S.cur.kind === 'coll' && S.cur.j === j, sj = LW_SUB[j], mj = lwPuck(S['p' + j]);
  const head = `Опыт ${j}. Соударение с телом ${j}`;
  if (!E.placeOk) {
    return `<section class="card"><b class="h">${head}: установка тела ${j}</b><p class="mute small">Шайба ${j} (${mj ? f1(mj.m * 1000, 1) + ' г' : ''}). Выбери один из закрашенных кругов (смещённый даёт нецентральный удар), поставь в него шайбу ${j} и запиши координаты её крайней точки.</p>
      <div class="seg">${LW1.circles.map((c, i) => `<button type="button" data-lw="circle" data-j="${j}" data-v="${i + 1}" aria-pressed="${E.circle === i + 1}">${['Нижний', 'Центр', 'Верхний'][i]}</button>`).join('')}</div></section>
      ${lwField('', `<div class="lw-ctl-row">${lwCtlIn('rx0' + j, 'x₀' + sj, E.rx)}${lwCtlIn('ry0' + j, 'y₀' + sj, E.ry)}<button class="btn" data-lw="placeCheck" data-j="${j}">${ic('circle-check')} Проверить</button></div><p class="lw-msg" id="lw-msg"></p>`)}`;
  }
  const cell = (i, k) => rows[i] ? f1(rows[i].r[k], 1) : i === n && cur ? '…' : '';
  const tbl = `<table class="lw-tbl"><tr><th>№</th><th>x₁</th><th>y₁</th><th>x${sj}</th><th>y${sj}</th></tr>${Array.from({ length: LW1.N }, (_, i) => `<tr class="${i === n && cur ? 'now' : ''}"><td>${i + 1}</td>${['x1', 'y1', 'x2', 'y2'].map(k => `<td>${cell(i, k)}</td>`).join('')}</tr>`).join('')}</table>`;
  return `<section class="card lw-cond"><b class="h">${head}</b><p class="mute small">Тело ${j} — в круге (x₀${sj} = ${f1(lwNum(E.rx), 1)}, y₀${sj} = ${f1(lwNum(E.ry), 1)} мм), m${sj} = ${f1(mj.m, 4)} кг. Тело 1 и винт (${S.screw}) — те же, что в опыте 1. Сделай ${LW1.N} выстрелов; после каждого запиши координаты обеих шайб (мм).</p></section>
    ${lwField('', (cur ? `<div class="lw-ctl-row four">${['x1', 'y1', 'x2', 'y2'].map(k => lwCtlIn('c' + k, k[0] + (k[1] === '1' ? '₁' : sj), (S.cur.r || {})[k] ?? '')).join('')}</div><button class="btn wide" data-lw="record">${ic('pencil')} Записать выстрел ${n + 1}</button>`
      : n < LW1.N ? `<button class="btn wide" data-lw="shoot" data-v="coll" data-j="${j}">${ic('target')} Выстрел ${n + 1} из ${LW1.N}</button>` : lwNext(j === 2 ? 'К опыту 3' : 'К обработке')) +
      `<p class="lw-msg" id="lw-msg">${cur ? `Шайбы остановились. Кнопками «Шайба 1» и «Шайба ${j}» наведи лупу и сними координаты меток.` : ''}</p>`)}
    <section class="card"><b class="h">Записи опыта ${j}</b><div class="lw-scroll">${tbl}</div></section>`;
}

/* ---------- обработка: ожидаемые значения из записей ученика ---------- */
/* расчёт для пары «тело 1 + тело-мишень j»; величины мишени названы x2, y2, m2, l2 (в таблицах — с индексом j) */
function lwCalc(j = 2) {
  const S = LWS, E = S.ex[j], m1 = lwPuck(S.p1).m, m2 = lwPuck(S['p' + j]).m, x01 = lwNum(S.rx01), y01 = lwNum(S.ry01), x02 = lwNum(E.rx), y02 = lwNum(E.ry);
  const mean = a => a.reduce((s, v) => s + v, 0) / a.length, col = k => E.rows.map(r => r.r[k]);
  const fx = S.free.map(r => r.r), X = { x: fx, x1: col('x1'), y1: col('y1'), x2: col('x2'), y2: col('y2') };
  const o = { j, m1, m2, x01, y01, x02, y02 };
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
const lwCalcAll = () => ({ 2: lwCalc(2), 3: lwCalc(3) });
/* ключ «x1m@3» — величина пары с телом 3; без «@» — пары с телом 2 (или общая для опыта 1) */
const LW_TABLES = {
  '1а': ['xm', 'x1m', 'y1m', 'x2m', 'y2m', 'dx', 'dx1', 'dy1', 'dx2', 'dy2', 'l0', 'l1', 'l2'],
  '1б': ['x1m@3', 'y1m@3', 'x2m@3', 'y2m@3', 'dx1@3', 'dy1@3', 'dx2@3', 'dy2@3', 'l1@3', 'l2@3'],
  2: ['px0', 'px1', 'py1', 'px1@3', 'py1@3'],
  3: ['e0', 'e1', 'k', 'e1@3', 'k@3'],
  4: ['r_x1', 'r_y1', 'r_x2', 'r_y2', 'd_x01', 'd_y01', 'd_x02', 'd_y02', 'd_x1', 'd_y1', 'd_x2', 'd_y2', 'rel_x01', 'rel_y01', 'rel_x02', 'rel_y02', 'rel_x1', 'rel_y1', 'rel_x2', 'rel_y2', 'P']
};
function lwOk(full, user, O) {
  const [key, j] = full.split('@'), e = O[+j || 2][key]; if (!Number.isFinite(user)) return false;
  if (key === 'py1') return Math.abs(Math.abs(user) - Math.abs(e)) <= Math.max(.003, Math.abs(e) * .05); // знак Δy — как в методичке или со знаком
  if (key === 'k') return Math.abs(user - e) <= .015;
  if (key === 'P') return Math.abs(user - e) <= .3 || Math.abs(user * 100 - e) <= .3;
  if (key.startsWith('rel_')) return Math.abs(user - e) <= Math.max(.06, e * .04);
  if (/^(px|py|e0|e1)/.test(key)) return Math.abs(user - e) <= Math.abs(e) * .015 + .0006;
  return Math.abs(user - e) <= Math.max(.11, Math.abs(e) * .002);
}
function lwProc() {
  const S = LWS, O = lwCalcAll(), o = O[2], o3 = O[3], P = S.proc, cls = k => S.procOk[k] === true ? 'ok' : S.procOk[k] === false ? 'bad' : '';
  const I = k => lwIn('p_' + k, P[k], '', cls(k)), mm = v => f1(v, 1), chk = t => `<button class="btn line wide mt" data-lw="pcheck" data-v="${t}">${ic('circle-check')} Проверить таблицу ${t}</button>`;
  const t1 = `<section class="card"><b class="h">Таблица 1а. Свободное движение и удар по телу 2</b>
    <p class="mute small">m₁ = ${f1(o.m1, 4)} кг, m₂ = ${f1(o.m2, 4)} кг; x₀₁ = ${mm(o.x01)}, y₀₁ = ${mm(o.y01)}, x₀₂ = ${mm(o.x02)}, y₀₂ = ${mm(o.y02)} мм. Ответы — с точностью до 0,1 мм.</p>
    <div class="lw-scroll"><table class="lw-tbl wide"><tr><th></th><th>своб. движение</th><th>x₁</th><th>y₁</th><th>x₂</th><th>y₂</th></tr>
    ${Array.from({ length: LW1.N }, (_, i) => `<tr><td>${i + 1}</td><td>${mm(o.X.x[i])}</td><td>${mm(o.X.x1[i])}</td><td>${mm(o.X.y1[i])}</td><td>${mm(o.X.x2[i])}</td><td>${mm(o.X.y2[i])}</td></tr>`).join('')}
    <tr class="sum"><td>Среднее</td><td>x̄ ${I('xm')}</td><td>x̄₁ ${I('x1m')}</td><td>ȳ₁ ${I('y1m')}</td><td>x̄₂ ${I('x2m')}</td><td>ȳ₂ ${I('y2m')}</td></tr>
    <tr class="sum"><td>Приращение Δ</td><td>Δx = x̄ − x₀₁ ${I('dx')}</td><td>Δx₁ = x̄₁ − x₀₁ ${I('dx1')}</td><td>Δy₁ = ȳ₁ − y₀₁ ${I('dy1')}</td><td>Δx₂ = x̄₂ − x₀₂ ${I('dx2')}</td><td>Δy₂ = ȳ₂ − y₀₂ ${I('dy2')}</td></tr>
    <tr class="sum"><td>Расстояние</td><td>l₀ = Δx ${I('l0')}</td><td colspan="2">l₁ = √(Δx₁² + Δy₁²) ${I('l1')}</td><td colspan="2">l₂ = √(Δx₂² + Δy₂²) ${I('l2')}</td></tr></table></div>${chk('1а')}</section>`;
  const t1b = `<section class="card"><b class="h">Таблица 1б. Удар по телу 3</b>
    <p class="mute small">m₃ = ${f1(o3.m2, 4)} кг; x₀₃ = ${mm(o3.x02)}, y₀₃ = ${mm(o3.y02)} мм. Начальные координаты тела 1 и путь l₀ — те же, что в таблице 1а.</p>
    <div class="lw-scroll"><table class="lw-tbl wide"><tr><th></th><th>x₁</th><th>y₁</th><th>x₃</th><th>y₃</th></tr>
    ${Array.from({ length: LW1.N }, (_, i) => `<tr><td>${i + 1}</td><td>${mm(o3.X.x1[i])}</td><td>${mm(o3.X.y1[i])}</td><td>${mm(o3.X.x2[i])}</td><td>${mm(o3.X.y2[i])}</td></tr>`).join('')}
    <tr class="sum"><td>Среднее</td><td>x̄₁ ${I('x1m@3')}</td><td>ȳ₁ ${I('y1m@3')}</td><td>x̄₃ ${I('x2m@3')}</td><td>ȳ₃ ${I('y2m@3')}</td></tr>
    <tr class="sum"><td>Приращение Δ</td><td>Δx₁ = x̄₁ − x₀₁ ${I('dx1@3')}</td><td>Δy₁ = ȳ₁ − y₀₁ ${I('dy1@3')}</td><td>Δx₃ = x̄₃ − x₀₃ ${I('dx2@3')}</td><td>Δy₃ = ȳ₃ − y₀₃ ${I('dy2@3')}</td></tr>
    <tr class="sum"><td>Расстояние</td><td colspan="2">l₁ = √(Δx₁² + Δy₁²) ${I('l1@3')}</td><td colspan="2">l₃ = √(Δx₃² + Δy₃²) ${I('l2@3')}</td></tr></table></div>${chk('1б')}</section>`;
  const t2 = `<section class="card"><b class="h">Таблица 2. Импульс (кг·мм^½)</b><p class="mute small">Импульс пропорционален m√l, его проекции — mΔx/√l и mΔy/√l. Δy бери со знаком: шайбы разлетаются в разные стороны, и сумма проекций по Y должна быть близка к нулю. До удара импульс один и тот же — тело 1 и винт не меняли.</p>
    <div class="lw-scroll"><table class="lw-tbl wide"><tr><th></th><th>До удара</th><th>После удара по телу 2</th><th>После удара по телу 3</th></tr>
    <tr><td>Вдоль X</td><td>m₁√l₀ ${I('px0')}</td><td>m₁Δx₁/√l₁ + m₂Δx₂/√l₂ ${I('px1')}</td><td>m₁Δx₁/√l₁ + m₃Δx₃/√l₃ ${I('px1@3')}</td></tr>
    <tr><td>Вдоль Y</td><td>0</td><td>m₁Δy₁/√l₁ + m₂Δy₂/√l₂ ${I('py1')}</td><td>m₁Δy₁/√l₁ + m₃Δy₃/√l₃ ${I('py1@3')}</td></tr></table></div>${chk(2)}</section>`;
  const t3 = `<section class="card"><b class="h">Таблица 3. Энергия (кг·мм) и коэффициент восстановления</b><p class="mute small">Кинетическая энергия пропорциональна m·l (E = μmgl).</p>
    <div class="lw-scroll"><table class="lw-tbl wide"><tr><th></th><th>До удара</th><th>После удара по телу 2</th><th>После удара по телу 3</th></tr>
    <tr><td>Энергия</td><td>m₁l₀ ${I('e0')}</td><td>m₁l₁ + m₂l₂ ${I('e1')}</td><td>m₁l₁ + m₃l₃ ${I('e1@3')}</td></tr>
    <tr><td>k</td><td>—</td><td>k₂ = (m₁l₁ + m₂l₂)/(m₁l₀) ${I('k')}</td><td>k₃ = (m₁l₁ + m₃l₃)/(m₁l₀) ${I('k@3')}</td></tr></table></div>${chk(3)}</section>`;
  const rows4 = ['x01', 'y01', 'x02', 'y02', 'x1', 'y1', 'x2', 'y2'], lab = { x01: 'x₀₁', y01: 'y₀₁', x02: 'x₀₂', y02: 'y₀₂', x1: 'x₁', y1: 'y₁', x2: 'x₂', y2: 'y₂' };
  const t4 = `<section class="card"><b class="h">Таблица 4. Погрешности (опыт 2, удар по телу 2)</b><p class="mute small">По методичке погрешности оценивают для одного из упражнений. Систематическая Δs — цена деления, 1 мм. Случайная Δ = (x_max − x_min)/2 по серии из ${LW1.N} измерений (для однократных измерений — нет). Наибольшая Δ — бо́льшая из них; относительная δ = Δ/x̄·100 %.</p>
    <div class="lw-scroll"><table class="lw-tbl wide"><tr><th>Величина</th><th>Значение</th><th>Δs</th><th>Δ случ.</th><th>Δ наиб.</th><th>δ, %</th></tr>
    ${rows4.map(q => `<tr><td>${lab[q]}, мм</td><td>${mm(o.vals[q])}</td><td>1</td><td>${q.length === 2 ? I('r_' + q) : '—'}</td><td>${I('d_' + q)}</td><td>${I('rel_' + q)}</td></tr>`).join('')}</table></div>
    <div class="lw-row"><label>Доверительная вероятность P = 1 − (½)^(N−1), % ${I('P')}</label></div>${chk(4)}</section>`;
  const all = Object.keys(LW_TABLES).every(t => LW_TABLES[t].every(k => S.procOk[k] === true));
  return t1 + t1b + t2 + t3 + t4 + `<p class="lw-msg" id="lw-msg"></p>${all ? lwNext('К выводам') : '<p class="mute small center">Когда все таблицы будут верны, откроются выводы.</p>'}`;
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
function lwAutoConcl(O) {
  const o = O[2], o3 = O[3], dP = q => Math.abs(q.px1 - q.px0) / q.px0 * 100;
  const relMax = Math.max(...['x01', 'y01', 'x02', 'y02', 'x1', 'y1', 'x2', 'y2'].map(q => o['rel_' + q]));
  // по методичке: погрешность импульса — не выше относительной погрешности наименее точно измеренной величины (табл. 4)
  const okP = q => dP(q) <= relMax * 1.5;
  const heavy = o3.m2 > o.m2 ? o3 : o, light = heavy === o ? o3 : o, g = v => f1(v * 1000, 1);
  const cmp = heavy.l2 < light.l2
    ? `Более тяжёлая мишень (тело ${heavy.j}, ${g(heavy.m2)} г) после удара прошла ${lwF(heavy.l2, 1)} мм, более лёгкая (тело ${light.j}, ${g(light.m2)} г) — ${lwF(light.l2, 1)} мм: при одном и том же импульсе тела 1 более массивная мишень получает меньшую скорость (путь пропорционален квадрату скорости).`
    : `Мишени разной массы (${g(o.m2)} г и ${g(o.m2 === heavy.m2 ? light.m2 : heavy.m2)} г) прошли после удара ${lwF(o.l2, 1)} и ${lwF(o3.l2, 1)} мм; на результат заметно повлиял выбор круга (нецентральный удар).`;
  return `Цель работы — проверить выполнение законов сохранения импульса и энергии при соударении шайб. Основная шайба (тело 1) ударяла по очереди две шайбы-мишени разной массы. ` +
    `Проекция импульса на ось X до удара m₁√l₀ = ${lwF(o.px0, 3)} кг·мм^½; после удара по телу 2 — ${lwF(o.px1, 3)} (расхождение ${lwF(dP(o), 1)} %), после удара по телу 3 — ${lwF(o3.px1, 3)} (расхождение ${lwF(dP(o3), 1)} %). ` +
    `Проекция на ось Y после удара ${lwF(o.py1, 3)} и ${lwF(o3.py1, 3)} кг·мм^½ при нуле до удара. ` +
    `С учётом погрешности измерений (≈ ${lwF(relMax, 1)} %) закон сохранения импульса ${okP(o) && okP(o3) ? 'выполняется в обоих опытах' : 'выполняется хуже ожидаемого — вероятно, мешает трение во время удара и разброс силы удара'}. ` +
    `Коэффициенты восстановления энергии k₂ = ${lwF(o.k, 2)}, k₃ = ${lwF(o3.k, 2)} < 1: удары не абсолютно упругие, часть кинетической энергии перешла во внутреннюю (деформация, нагрев). ${cmp} ` +
    `Наибольшая относительная погрешность измерения координат — ${lwF(relMax, 1)} %; точнее всего нужно измерять пути после удара (короткие отрезки), а точность начальных координат можно не повышать.`;
}
function lwConcl() {
  const S = LWS; if (!S.concl) { S.concl = lwAutoConcl(lwCalcAll()); lwSave(); }
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
  const O = lwCalcAll(), o = O[2], o3 = O[3], mm = v => f1(v, 1), f3 = v => f1(v, 3), f4 = v => f1(v, 4), lab = { x01: 'x₀₁', y01: 'y₀₁', x02: 'x₀₂', y02: 'y₀₂', x1: 'x₁', y1: 'y₁', x2: 'x₂', y2: 'y₂' };
  const ln = v => `<span class="ul">${esc(v || '')}</span>`;
  const [dd, mon, yy] = String(S.date || '').split('.');
  const MON = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
  const equip = [['Лабораторная установка (горизонтальное поле с координатной сеткой, ударный пружинный механизм)', '0–500 мм', '1 мм (цена деления)'], ['Набор тел (шайб) с указанной массой: тело 1 — основное, тела 2 и 3 — мишени', `${f1(o.m1 * 1000, 1)} г; ${f1(o.m2 * 1000, 1)} г; ${f1(o3.m2 * 1000, 1)} г`, '0,1 г']];
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
  // 2 лист — схема и результаты измерений (таблица 1а — тело 2, таблица 1б — тело 3)
  const p2 = `<section class="lwp"><p class="c b">СХЕМА УСТАНОВКИ</p>${lwSchemeSvg()}
    <p class="small">1 — основная шайба (ударяющее тело), 2, 3 — шайбы-мишени (по очереди в закрашенном круге); ударный пружинный механизм с винтом, направляющие; поле с координатной сеткой (цена деления 1 мм). Положение винта — ${S.screw}; тело 2 — в ${['нижнем', 'центральном', 'верхнем'][S.ex[2].circle - 1]} круге, тело 3 — в ${['нижнем', 'центральном', 'верхнем'][S.ex[3].circle - 1]}.</p><hr>
    <p class="c b">РЕЗУЛЬТАТЫ ИЗМЕРЕНИЯ</p>
    <p class="small">Таблица 1а. m₁ = ${f4(o.m1)} кг; m₂ = ${f4(o.m2)} кг; x₀₁ = ${mm(o.x01)} мм; y₀₁ = ${mm(o.y01)} мм; x₀₂ = ${mm(o.x02)} мм; y₀₂ = ${mm(o.y02)} мм</p>
    <table class="tight"><tr><th>№</th><th>x, мм<br><small>своб. движение</small></th><th>x₁, мм</th><th>y₁, мм</th><th>x₂, мм</th><th>y₂, мм</th></tr>
      ${Array.from({ length: LW1.N }, (_, i) => `<tr><td>${i + 1}</td><td>${mm(o.X.x[i])}</td><td>${mm(o.X.x1[i])}</td><td>${mm(o.X.y1[i])}</td><td>${mm(o.X.x2[i])}</td><td>${mm(o.X.y2[i])}</td></tr>`).join('')}
      <tr><td>Среднее</td><td>x̄ = ${mm(o.xm)}</td><td>x̄₁ = ${mm(o.x1m)}</td><td>ȳ₁ = ${mm(o.y1m)}</td><td>x̄₂ = ${mm(o.x2m)}</td><td>ȳ₂ = ${mm(o.y2m)}</td></tr>
      <tr><td>Приращение</td><td>Δx = ${mm(o.dx)}</td><td>Δx₁ = ${mm(o.dx1)}</td><td>Δy₁ = ${mm(o.dy1)}</td><td>Δx₂ = ${mm(o.dx2)}</td><td>Δy₂ = ${mm(o.dy2)}</td></tr>
      <tr><td>Расстояние</td><td>l₀ = ${mm(o.l0)}</td><td colspan="2">l₁ = ${mm(o.l1)}</td><td colspan="2">l₂ = ${mm(o.l2)}</td></tr></table>
    <p class="small">Таблица 1б. m₃ = ${f4(o3.m2)} кг; x₀₃ = ${mm(o3.x02)} мм; y₀₃ = ${mm(o3.y02)} мм (тело 1 и l₀ — как в табл. 1а)</p>
    <table class="tight"><tr><th>№</th><th>x₁, мм</th><th>y₁, мм</th><th>x₃, мм</th><th>y₃, мм</th></tr>
      ${Array.from({ length: LW1.N }, (_, i) => `<tr><td>${i + 1}</td><td>${mm(o3.X.x1[i])}</td><td>${mm(o3.X.y1[i])}</td><td>${mm(o3.X.x2[i])}</td><td>${mm(o3.X.y2[i])}</td></tr>`).join('')}
      <tr><td>Среднее</td><td>x̄₁ = ${mm(o3.x1m)}</td><td>ȳ₁ = ${mm(o3.y1m)}</td><td>x̄₃ = ${mm(o3.x2m)}</td><td>ȳ₃ = ${mm(o3.y2m)}</td></tr>
      <tr><td>Приращение</td><td>Δx₁ = ${mm(o3.dx1)}</td><td>Δy₁ = ${mm(o3.dy1)}</td><td>Δx₃ = ${mm(o3.dx2)}</td><td>Δy₃ = ${mm(o3.dy2)}</td></tr>
      <tr><td>Расстояние</td><td colspan="2">l₁ = ${mm(o3.l1)}</td><td colspan="2">l₃ = ${mm(o3.l2)}</td></tr></table>
    <p class="row sign">Подпись зав. кабинетом ${ln('', '40%')}</p></section>`;
  // 3 лист — формулы и вычисления
  const p3 = `<section class="lwp"><p class="c b">РАСЧЕТНЫЕ ФОРМУЛЫ ИСКОМЫХ ВЕЛИЧИН И ПОГРЕШНОСТЕЙ</p>
    <div class="fm"><p>v = √(2μgl) &nbsp;⇒&nbsp; p ∝ m√l; &nbsp; E = μmgl ∝ m·l</p>
    <p>l₀ = x̄ − x₀₁; &nbsp; l₁ = √(Δx₁² + Δy₁²); &nbsp; l₂ = √(Δx₂² + Δy₂²)</p>
    <p>X: m₁√l₀ = m₁Δx₁/√l₁ + mⱼΔxⱼ/√lⱼ; &nbsp; Y: 0 = m₁Δy₁/√l₁ + mⱼΔyⱼ/√lⱼ &nbsp; (j = 2, 3 — тело-мишень)</p>
    <p>kⱼ = (m₁l₁ + mⱼlⱼ) / (m₁l₀)</p>
    <p>Δ<sub>случ</sub> = (x<sub>max</sub> − x<sub>min</sub>)/2; &nbsp; Δ<sub>сист</sub> = цена деления; &nbsp; δ = Δ/x̄·100 %; &nbsp; P = 1 − (½)<sup>N−1</sup></p></div><hr>
    <p class="c b">ВЫЧИСЛЕНИЕ РЕЗУЛЬТАТОВ ИЗМЕРЕНИЯ И ПОГРЕШНОСТЕЙ</p>
    <table><tr><th>Импульс, кг·мм^½</th><th>До удара</th><th>После удара по телу 2</th><th>После удара по телу 3</th></tr><tr><td>Вдоль X</td><td>m₁√l₀ = ${f4(o.m1)}·√${mm(o.l0)} = ${f3(o.px0)}</td><td>${f3(o.px1)}</td><td>${f3(o3.px1)}</td></tr><tr><td>Вдоль Y</td><td>0</td><td>${f3(o.py1)}</td><td>${f3(o3.py1)}</td></tr></table>
    <table><tr><th>Энергия, кг·мм</th><th>До удара</th><th>После удара по телу 2</th><th>После удара по телу 3</th></tr><tr><td>m·l</td><td>${f3(o.e0)}</td><td>${f3(o.e1)}</td><td>${f3(o3.e1)}</td></tr><tr><td>Коэффициент восстановления</td><td>—</td><td>k₂ = ${f3(o.e1)} / ${f3(o.e0)} = ${f1(o.k, 2)}</td><td>k₃ = ${f3(o3.e1)} / ${f3(o3.e0)} = ${f1(o3.k, 2)}</td></tr></table>
    <p class="small">Погрешности (табл. 4) — для опыта 2 (удар по телу 2).</p>
    <table><tr><th>Величина</th><th>Значение</th><th>Δ сист.</th><th>Δ случ.</th><th>Δ наиб.</th><th>δ, %</th></tr>
      ${Object.keys(lab).map(q => `<tr><td>${lab[q]}, мм</td><td>${mm(o.vals[q])}</td><td>1</td><td>${q.length === 2 ? mm(o['r_' + q]) : '—'}</td><td>${mm(o['d_' + q])}</td><td>${f1(o['rel_' + q], 2)}</td></tr>`).join('')}</table>
    <p class="small">Доверительная вероятность при N = ${LW1.N}: P = 1 − (½)^${LW1.N - 1} = ${f1(o.P, 1)} %.</p></section>`;
  // 4 лист — график и выводы
  const p4 = `<section class="lwp"><p class="c b">ПОСТРОЕНИЕ ГРАФИКОВ</p>${lwGraphSvg(o, o3)}
    <p class="small c">Перемещения шайб (средние по ${LW1.N} опытам): l₀ — тело 1 без мишени; l₁, l₂ — удар по телу 2; l₁′, l₃ — удар по телу 3.</p>
    <p class="c b mt2">ВЫВОДЫ ПО ПРОДЕЛАННОЙ РАБОТЕ</p><p class="concl">${esc(S.concl).replace(/\n/g, '<br>')}</p>
    <p class="row sign">Подпись исполнителя ${ln('', '45%')}</p></section>`;
  setMain(`<div class="lwr-tools"><button class="btn" data-lw="print">${ic('printer')} Сохранить PDF / печать</button><a class="btn line" href="#lw-1">${ic('chevron-left')} К работе</a></div><article class="lwr">${p1}${p2}${p3}${p4}</article>`);
}
/* График на миллиметровке бланка: векторы перемещений шайб */
function lwGraphSvg(o, o3) {
  const W = 520, x0 = 30, y0 = 150, mx = Math.max(o.l0, o.dx1, o.dx2, o3.dx1, o3.dx2, 1), my = Math.max(Math.abs(o.dy1), Math.abs(o.dy2), Math.abs(o3.dy1), Math.abs(o3.dy2), 1);
  const sc = Math.min((W - 50) / mx, 120 / my);
  const grid = Array.from({ length: 27 }, (_, i) => `<line x1="${10 + i * 20}" y1="10" x2="${10 + i * 20}" y2="290" stroke="#999" stroke-width=".5"/>`).join('') + Array.from({ length: 15 }, (_, i) => `<line x1="10" y1="${10 + i * 20}" x2="530" y2="${10 + i * 20}" stroke="#999" stroke-width=".5"/>`).join('');
  const arr = (dx, dy, col, t, dash) => { const X = x0 + dx * sc, Y = y0 - dy * sc; return `<line x1="${x0}" y1="${y0}" x2="${X}" y2="${Y}" stroke="${col}" stroke-width="2.4" ${dash ? 'stroke-dasharray="7 4"' : ''}/><circle cx="${X}" cy="${Y}" r="3.5" fill="${col}"/><text x="${X + 6}" y="${Y + (dy >= 0 ? -6 : 14)}" font-size="13" font-weight="700" fill="${col}">${t}</text>`; };
  const legend = [['#000', 'l₀ — тело 1 без мишени', 1], ['#1f4fd8', 'l₁ — тело 1 (удар по 2)'], ['#c0392b', 'l₂ — тело 2'], ['#6b3fa0', 'l₁′ — тело 1 (удар по 3)'], ['#d68910', 'l₃ — тело 3']]
    .map(([c, t, d], i) => `<line x1="${40 + (i % 3) * 165}" y1="${308 + Math.floor(i / 3) * 16}" x2="${62 + (i % 3) * 165}" y2="${308 + Math.floor(i / 3) * 16}" stroke="${c}" stroke-width="2.4" ${d ? 'stroke-dasharray="6 3"' : ''}/><text x="${67 + (i % 3) * 165}" y="${312 + Math.floor(i / 3) * 16}" font-size="11">${t}</text>`).join('');
  return `<svg class="lwr-svg" viewBox="0 0 540 340">${grid}<line x1="${x0}" y1="${y0}" x2="530" y2="${y0}" stroke="#666" stroke-width=".8"/><line x1="${x0}" y1="10" x2="${x0}" y2="290" stroke="#000"/><text x="515" y="${y0 + 16}" font-size="12">x</text><text x="${x0 + 6}" y="22" font-size="12">y</text>
    ${arr(o.l0, 0, '#000', 'l₀', true)}${arr(o.dx1, o.dy1, '#1f4fd8', 'l₁')}${arr(o.dx2, o.dy2, '#c0392b', 'l₂')}${arr(o3.dx1, o3.dy1, '#6b3fa0', 'l₁′')}${arr(o3.dx2, o3.dy2, '#d68910', 'l₃')}${legend}</svg>`;
}
function lwSchemeSvg() {
  return `<svg class="lwr-svg scheme" viewBox="0 0 520 220" aria-hidden="true"><rect x="70" y="10" width="440" height="200" fill="none" stroke="#000"/>${Array.from({ length: 21 }, (_, i) => `<line x1="${70 + i * 22}" y1="10" x2="${70 + i * 22}" y2="210" stroke="#bbb" stroke-width=".6"/>`).join('')}${Array.from({ length: 10 }, (_, i) => `<line x1="70" y1="${10 + i * 22}" x2="510" y2="${10 + i * 22}" stroke="#bbb" stroke-width=".6"/>`).join('')}
  <rect x="8" y="96" width="70" height="4" fill="#555"/><rect x="8" y="120" width="70" height="4" fill="#555"/><rect x="10" y="104" width="50" height="12" fill="#888"/><rect x="22" y="90" width="8" height="40" fill="#444"/>
  <circle cx="92" cy="110" r="12" fill="#fff" stroke="#000"/><text x="92" y="114" font-size="11" text-anchor="middle">1</text><circle cx="120" cy="104" r="12" fill="#ddd" stroke="#000"/><text x="120" y="108" font-size="10" text-anchor="middle">2, 3</text>
  <text x="30" y="150" font-size="10">ударный механизм</text><text x="26" y="86" font-size="10">винт</text><text x="440" y="206" font-size="10">x, мм</text><text x="74" y="22" font-size="10">y, мм</text></svg>`;
}

/* ---------- действия ---------- */
function lwMsg(t, bad) { const m = $('#lw-msg'); if (m) { m.textContent = t; m.className = 'lw-msg ' + (bad ? 'bad' : 'good'); } }
function lwGo(i) { LWS.step = Math.max(0, Math.min(i, LWS.max)); lwSave(); render(); ui.main.scrollTop = 0; }
function lwAdvance() { LWS.max = Math.max(LWS.max, LWS.step + 1); LWS.step = LWS.step + 1; lwSave(); render(); ui.main.scrollTop = 0; }
document.addEventListener('input', e => {
  const el = e.target.closest && e.target.closest('.lwi:not(.l2i):not(.l3i), .lw-ta:not(.l2i):not(.l3i)'); if (!el || !LWS) return;
  const k = el.dataset.k;
  if (k.startsWith('p_')) { LWS.proc[k.slice(2)] = el.value; delete LWS.procOk[k.slice(2)]; el.classList.remove('ok', 'bad'); }
  else if (/^r[xy]0[23]$/.test(k)) LWS.ex[k[3]][k[1] === 'x' ? 'rx' : 'ry'] = el.value;
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
    case 'puck': {
      const ks = ['p1', 'p2', 'p3'], has = ks.find(k => S[k] === d.v);
      if (has) S[has] = null; else { const free = ks.find(k => !S[k]); if (free) S[free] = d.v; else { S.p1 = d.v; S.p2 = S.p3 = null; } }
      S.prepOk = false; lwSave(); render(); break;
    }
    case 'prepCheck': {
      if (!S.p1 || !S.p2 || !S.p3) { lwMsg('Выбери три шайбы: основную (тело 1) и две мишени (тела 2 и 3).', 1); break; }
      const ms = [1, 2, 3].map(j => lwPuck(S['p' + j]).m);
      if (Math.abs(ms[1] - ms[2]) < .0009) { lwMsg('Шайбы-мишени должны быть разной массы.', 1); break; }
      const badM = [1, 2, 3].filter(j => Math.abs(lwNum(S['m' + j]) - ms[j - 1]) > .00006);
      if (badM.length) { lwMsg('Неверно записано: ' + badM.map(j => { const pk = lwPuck(S['p' + j]); return `m${LW_SUB[j]} (тело ${j} — шайба ${pk.id}, ${f1(pk.m * 1000, 1)} г)`; }).join('; ') + '. Масса в килограммах: граммы ÷ 1000, например 20,1 г = 0,0201 кг.', 1); break; }
      if (!(Math.abs(lwNum(S.rx01) - (S.x01 + LW1.R)) <= 1.2 && Math.abs(lwNum(S.ry01) - S.y01) <= 1.2)) { S.prepTries = (S.prepTries || 0) + 1; lwSave();
        lwMsg(S.prepTries >= 3 ? `Не совпадает. Подсказка: x₀₁ ≈ ${Math.round(S.x01 + LW1.R)} мм, y₀₁ ≈ ${Math.round(S.y01)} мм — найди это место в лупе.` : 'Координаты не совпадают с установкой. Наведи лупу на красную метку крайней точки шайбы 1 и посчитай миллиметровые деления.', 1); break; }
      S.prepOk = true; lwSave(); render(); toast('Подготовка выполнена'); break;
    }
    case 'screw': if (!S.free.length) { S.screw = Math.max(1, Math.min(5, S.screw + +d.d)); lwSave(); render(); } break;
    case 'circle': { const E = S.ex[d.j]; E.circle = +d.v; E.place = null; lwSave(); render(); break; }
    case 'placeCheck': {
      const E = S.ex[d.j], c = LW1.circles[E.circle - 1];
      if (!(Math.abs(lwNum(E.rx) - (c[0] + LW1.R)) <= 1.2 && Math.abs(lwNum(E.ry) - c[1]) <= 1.2)) { E.tries = (E.tries || 0) + 1; lwSave();
        lwMsg(E.tries >= 3 ? `Подсказка: x₀${LW_SUB[d.j]} ≈ ${c[0] + LW1.R} мм, y₀${LW_SUB[d.j]} ≈ ${c[1]} мм.` : `Координаты шайбы ${d.j} не совпадают. Нажми «Шайба ${d.j}» под полем или наведи лупу на красную метку её крайней точки.`, 1); break; }
      E.place = c.slice(); E.placeOk = true; lwSave(); render(); break;
    }
    case 'shoot': {
      if (LWV.anim) break;
      const j = +d.j || 2, E = S.ex[j];
      if (d.v === 'coll' && !E.place) E.place = LW1.circles[E.circle - 1].slice();
      const shot = lwShot(d.v, j);
      b.disabled = true; lwMsg('Выстрел…');
      lwAnimate(shot, () => {
        const fin = shot.at(shot.T);
        if (!lwInField(fin.p1) || (fin.p2 && !lwInField(fin.p2))) { LWV.pos = null; lwDraw(); lwMsg('Шайба ушла за край поля — опыт не засчитан. Повтори выстрел' + (S.free.length ? '.' : ' или уменьши силу удара винтом.'), 1); b.disabled = false; return; }
        if (shot.miss) { LWV.pos = null; lwDraw(); lwMsg(`Шайба 1 прошла мимо шайбы ${j} — опыт не засчитан, повтори выстрел.`, 1); b.disabled = false; return; }
        S.cur = d.v === 'free' ? { kind: 'free', t: fin.p1[0] + LW1.R, r: '' } : { kind: 'coll', j, t: { x1: fin.p1[0] + LW1.R, y1: fin.p1[1], x2: fin.p2[0] + LW1.R, y2: fin.p2[1] }, r: {} };
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
        const nm = k => k.replace('2', cur.j);
        if (bad.length) { cur.tries = (cur.tries || 0) + 1; lwSave(); lwMsg(cur.tries >= 3 ? 'Подсказка: ' + bad.map(k => `${nm(k)} ≈ ${Math.round(cur.t[k])}`).join(', ') + ' мм.' : 'Не совпадает: ' + bad.map(nm).join(', ') + `. Снимай по красной метке крайней точки (1 — стальная шайба, ${cur.j} — ${cur.j === 3 ? 'медная' : 'латунная'}).`, 1); break; }
        S.ex[cur.j || 2].rows.push({ r: Object.fromEntries(ks.map(k => [k, lwNum(cur.r[k])])), t: cur.t });
      }
      S.cur = null; S.curPos = null; lwSave(); render(); toast('Записано'); break;
    }
    case 'pcheck': {
      const O = lwCalcAll(), keys = LW_TABLES[d.v]; let bad = 0;
      keys.forEach(k => { const ok = lwOk(k, lwNum(S.proc[k]), O); S.procOk[k] = ok; if (!ok) bad++; });
      lwSave(); render();
      toast(bad ? `Таблица ${d.v}: ошибок — ${bad}. Красные ячейки пересчитай.` : `Таблица ${d.v} заполнена верно`, bad ? 'bad' : ''); break;
    }
    case 'reconcl': S.concl = lwAutoConcl(lwCalcAll()); lwSave(); render(); break;
    case 'cq': S.cq[d.q] = d.v; S.cqChecked = false; lwSave(); render(); break;
    case 'cqCheck': { const n = LW_CQ.filter(([, a], i) => S.cq[i] === a).length; S.cqChecked = true; S.cqOk = n >= 6; lwSave(); render();
      toast(S.cqOk ? `Защита: ${n} из ${LW_CQ.length}` : `Верно ${n} из ${LW_CQ.length} — нужно 6.`, S.cqOk ? '' : 'bad');
      if (S.cqOk && !S.done) { S.done = true; lwSave(); addXP(100, 'Лабораторная работа'); } break; }
    case 'print': window.print(); break;
    case 'restart': if (confirm('Начать лабораторную работу заново? Записи и таблицы будут очищены.')) { LWS = lwFresh(); lwSave(); location.hash = 'lw-1'; render(); } break;
  }
});
