/* =====================================================================
   ЛР № 2. Определение момента инерции абсолютно твёрдого тела (маятник Обербека).
   Как на занятии: допуск → подготовка (штангенциркуль, цилиндры, высота h по линейке)
   → опыт 1 (3 пуска с растущей массой груза, один шкив) → опыт 2 (цилиндры переставлены, 1 пуск)
   → обработка (табл. 1, 2; ⟨J⟩ ± ⟨ΔJ⟩) → выводы и контрольные вопросы → отчёт (PDF).
   Модель: (J + m r²) ε = m g r − M_тр; приборы показывают величины с реальным разбросом,
   ученик снимает их сам; программа только проверяет записи и расчёты.
   ===================================================================== */

const L2 = {
  steps: [['admit', 'Допуск'], ['prep', 'Подготовка'], ['exp1', 'Опыт 1'], ['exp2', 'Опыт 2'], ['proc', 'Обработка'], ['concl', 'Выводы'], ['report', 'Отчёт']],
  N: 3,                // пусков в опыте 1
  g: 9.81,
  hanger: .050,        // подвес, кг
  plate: .050,         // накладной груз, кг
  maxPlates: 4,
  lMin: 8, lMax: 22,   // положения цилиндров, см (от оси до центра)
  K: 330               // масштаб колонны с линейкой, px/м
};

/* ход работы — методичка, ЛР № 2, раздел 5 */
const L2_HOD = [
  'Определить массу грузов m, установить центры подвижных цилиндров m₀ на одинаковом расстоянии l от оси вращения и измерить радиус шкива r. Результаты записать в табл. 1.',
  'Прикрепить к нити один из грузов m. Вращая маятник, намотать нить на шкив в один слой и включить электромагнит красной кнопкой, расположенной в верхней части установки. Записать расстояние h, проходимое грузом при падении. Убедиться, что нить и груз во время движения не задевают неподвижные части установки или другие предметы. Устранить качание груза и нажать кнопку «Пуск» секундомера. Записать время t движения груза до нижней точки.',
  'С тем же шкивом, увеличивая массу груза m (не менее 3-х раз), записать время t движения груза на пути h. Все результаты по мере их получения записать в табл. 1.',
  'Изменить распределение масс, т. е. положение цилиндров на крестовине маятника Обербека, таким образом, чтобы был изменён момент инерции всей системы.',
  'Повторить действия по п. 2 один раз. Полученный результат записать в табл. 2.',
  'Вычислить значения ε и M в каждом опыте по формулам (10) и (13).',
  'Рассчитать относительную и абсолютную погрешности момента инерции по формулам.',
  'Сделать выводы.'
];
/* ---------- состояние ---------- */
let L2_KEY = 'f2-lw2';   // программа подставляет ключ своего профиля
let L2S = null;
function l2Fresh() {
  const r = Math.random, d1 = +(41.6 + r() * .8).toFixed(1), d2 = +(83.4 + r() * 1.2).toFixed(1);
  return {
    v: 1, step: 0, max: 0, admit: {}, admitOk: false,
    // параметры установки (ученику не показываются — он их измеряет)
    d: [d1, d2], h: +(.775 + r() * .06).toFixed(4), J0: +(.0019 + r() * .0004).toFixed(5), m0: +(.192 + r() * .012).toFixed(4), mtr: +(.0007 + r() * .0003).toFixed(5),
    pul: 2, rd: '', rr: '', l1: 18, rl1: '', rh: '', prepOk: false,
    plates: 0, wound: false, runs: [], cur: null,
    l2: 11, rl2: '', ex2: [],
    proc: {}, procOk: {}, concl: '', cq: {}, cqOk: false,
    fio: '', group: '', date: new Date().toLocaleDateString('ru-RU'), done: false
  };
}
function l2Load() { if (L2S) return L2S; try { L2S = JSON.parse(localStorage.getItem(L2_KEY) || 'null'); } catch (e) { L2S = null; } if (!L2S || L2S.v !== 1) L2S = l2Fresh(); return L2S; }
function l2Save() { try { localStorage.setItem(L2_KEY, JSON.stringify(L2S)); } catch (e) {} }
const l2St = () => L2.steps[l2Load().step][0];
const l2Fix = (v, d) => Number.isFinite(v) ? v.toFixed(d).replace('.', ',') : '—';
const l2Sig = (v, n = 4) => Number.isFinite(v) ? (+v.toPrecision(n)).toString().replace('.', ',') : '—';
const l2Mass = plates => +(L2.hanger + plates * L2.plate).toFixed(3);
const l2R = S => S.d[S.pul - 1] / 2000;                     // истинный радиус выбранного шкива, м
const l2Jtrue = (S, lcm) => S.J0 + 4 * S.m0 * (lcm / 100) ** 2;
function l2Run(S, plates, lcm) {                            // один пуск: время опускания груза на h
  const m = l2Mass(plates), r = l2R(S), J = l2Jtrue(S, lcm);
  const eps = (m * L2.g * r - S.mtr * (1 + .05 * lwGauss())) / (J + m * r * r), a = eps * r;
  const t = Math.sqrt(2 * S.h / a) * (1 + .0025 * lwGauss());
  return { m, t: +t.toFixed(3), a: 2 * S.h / (t * t) };
}

/* ---------- сцена: маятник Обербека, колонна с линейкой, секундомер ---------- */
let L2V = { s: 1, raf: 0, anim: null, tShow: null };
let L2_BG = null;   // фон лаборатории (программа подставляет картинку по теме: Image с полями edge, top)
const l2Spr = k => (typeof l3Spr === 'function' ? l3Spr(k) : null);
const l2Tx = () => (typeof L3_THEME !== 'undefined' && L3_THEME === 'light') ? '#3B4656' : '#C9D4E3';        // s — доля пройденного пути (0 — груз вверху)
function l2Draw() {
  const cv = $('#l2-cv'); if (!cv) return; const S = L2S;
  const box = cv.getBoundingClientRect(), cssW = box.width || 600, dpr = Math.min(2.5, devicePixelRatio || 1), k = cssW / 580, cssH = 452 * k;
  if (cv.width !== Math.round(cssW * dpr)) { cv.width = Math.round(cssW * dpr); cv.height = Math.round(cssH * dpr); }
  const c = cv.getContext('2d'); c.setTransform(dpr * k, 0, 0, dpr * k, 0, 0);
  const st = l2St(), lcm = st === 'exp2' ? S.l2 : S.l1, r = l2R(S), h = S.h, sm = L2V.s * h;
  // фон — стена лаборатории
  let g; const bgi = L2_BG && L2_BG.complete && L2_BG.naturalWidth ? L2_BG : null;
  if (bgi) { const hh = bgi.naturalHeight * 580 / bgi.naturalWidth, y0 = 432 - (bgi.edge ?? 1) * hh; c.fillStyle = bgi.top || '#0F2237'; c.fillRect(0, 0, 580, 452); c.drawImage(bgi, 0, y0, 580, hh); }
  else { g = c.createLinearGradient(0, 0, 0, 452); g.addColorStop(0, '#16263C'); g.addColorStop(1, '#0E1A2B'); c.fillStyle = g; c.fillRect(0, 0, 580, 452);
  c.fillStyle = 'rgba(255,255,255,.025)'; for (let x = 0; x < 580; x += 24) c.fillRect(x, 0, 1, 452); }
  // основание с винтами
  g = c.createLinearGradient(0, 410, 0, 446); g.addColorStop(0, '#5B6B80'); g.addColorStop(1, '#2C3747'); c.fillStyle = g; c.fillRect(20, 412, 540, 30);
  c.fillStyle = '#1E2733'; [40, 540].forEach(x => { c.fillRect(x - 8, 442, 16, 6); });
  // колонна
  const CX = 440, Ys = 398, yAt = hm => Ys - hm * L2.K, top = yAt(1.0) - 6;
  g = c.createLinearGradient(CX - 14, 0, CX + 14, 0); g.addColorStop(0, '#8D9AAC'); g.addColorStop(.5, '#D5DDE7'); g.addColorStop(1, '#6E7B8E'); c.fillStyle = g; c.fillRect(CX - 12, top, 24, Ys - top + 14);
  // линейка на колонне
  c.fillStyle = '#F3E9C8'; c.fillRect(CX + 14, yAt(1.0), 30, L2.K * 1.0 + 1);
  c.strokeStyle = '#3A2F17'; c.fillStyle = '#3A2F17'; c.font = '600 9px "Golos UI", system-ui'; c.textAlign = 'left'; c.textBaseline = 'middle';
  for (let cm = 0; cm <= 100; cm++) { const y = yAt(cm / 100); c.lineWidth = cm % 10 ? .6 : 1.1; c.beginPath(); c.moveTo(CX + 14, y); c.lineTo(CX + 14 + (cm % 10 ? (cm % 5 ? 5 : 8) : 12), y); c.stroke(); if (cm % 10 === 0) c.fillText(cm, CX + 28, y); }
  c.fillStyle = l2Tx(); c.font = '700 10px "Golos UI", system-ui'; c.fillText('h, см', CX + 12, top - 8);
  // датчик (кольцо) внизу
  c.strokeStyle = '#E5484D'; c.lineWidth = 3; c.beginPath(); c.ellipse(CX - 30, Ys + 4, 14, 4, 0, 0, 7); c.stroke();
  // кронштейн и блок 4
  const BX = CX - 40, BY = top + 2, br = 9, spP = l2Spr('pulley');
  if (spP) { const w = 64, h = w * spP.naturalHeight / spP.naturalWidth; c.drawImage(spP, BX - w * .25, BY - h * .53, w, h); }   // блок на кронштейне — картинка
  else { c.fillStyle = '#7A889C'; c.fillRect(CX - 40, top - 4, 46, 8); g = c.createRadialGradient(BX - 3, BY - 3, 2, BX, BY, br); g.addColorStop(0, '#E9EEF4'); g.addColorStop(1, '#5E6B7E'); c.fillStyle = g; c.beginPath(); c.arc(BX, BY, br, 0, 7); c.fill(); }
  // крестовина
  const OX = 170, OY = 175, SC = 520, rp = [14, 24], rv = rp[S.pul - 1], phi = Math.PI / 4 + sm / r;
  // нить: со шкива (верх) к блоку, вниз к грузу
  const plates = (L2V.anim && L2V.anim.plates != null) ? L2V.anim.plates : S.plates, wy = yAt(h - sm), wTop = wy - 26 - plates * 5;
  c.strokeStyle = '#F2E6C9'; c.lineWidth = 1.4; c.beginPath(); c.moveTo(OX, OY - rv); c.lineTo(BX, BY - br); c.stroke();
  c.beginPath(); c.moveTo(BX + br, BY); c.lineTo(BX + br, wTop - 6); c.stroke();
  // стойка крестовины
  g = c.createLinearGradient(OX - 8, 0, OX + 8, 0); g.addColorStop(0, '#6E7B8E'); g.addColorStop(.5, '#C7D0DC'); g.addColorStop(1, '#55627A'); c.fillStyle = g; c.fillRect(OX - 7, OY, 14, 412 - OY);
  c.save(); c.translate(OX, OY); c.rotate(phi);
  const spX = l2Spr('cross'), spC = l2Spr('cyl');
  if (spX) { c.save(); c.rotate(-Math.PI / 4); const w = 2 * (.25 * SC + 10) / 1.36; c.drawImage(spX, -w / 2, -w * spX.naturalHeight / spX.naturalWidth / 2, w, w * spX.naturalHeight / spX.naturalWidth); c.restore(); }   // крестовина — картинка
  for (let i = 0; i < 4 && (spX && spC); i++) { c.save(); c.rotate(i * Math.PI / 2); const cxm = lcm / 100 * SC, cw = 30, chh = cw * spC.naturalHeight / spC.naturalWidth; c.drawImage(spC, cxm - cw / 2, -chh / 2 - 2, cw, chh); c.restore(); }
  for (let i = 0; i < 4 && !(spX && spC); i++) {
    c.save(); c.rotate(i * Math.PI / 2);
    g = c.createLinearGradient(0, -3, 0, 3); g.addColorStop(0, '#E1E7EF'); g.addColorStop(1, '#6B788B'); c.fillStyle = g; c.fillRect(10, -3, .25 * SC, 6);
    for (let cm = 5; cm <= 25; cm += 5) { c.fillStyle = '#2B3442'; c.fillRect(cm / 100 * SC - .5, -3, 1, 6); }
    const cxm = lcm / 100 * SC; g = c.createLinearGradient(0, -12, 0, 12); g.addColorStop(0, '#F5D58B'); g.addColorStop(.5, '#B98A2E'); g.addColorStop(1, '#6E4F12'); c.fillStyle = g;
    c.fillRect(cxm - 13, -11, 26, 22); c.fillStyle = 'rgba(0,0,0,.35)'; c.fillRect(cxm + 9, -11, 4, 22); c.fillStyle = '#3A2A08'; c.beginPath(); c.arc(cxm, -13, 2.5, 0, 7); c.fill();
    c.restore();
  }
  [[rp[1], '#9AA7B8', '#4C586B'], [rp[0], '#C9D2DE', '#5F6C80']].forEach(([rr, a, b], i) => { g = c.createRadialGradient(-rr * .3, -rr * .3, 2, 0, 0, rr); g.addColorStop(0, a); g.addColorStop(1, b); c.fillStyle = g; c.beginPath(); c.arc(0, 0, rr, 0, 7); c.fill(); c.strokeStyle = 'rgba(0,0,0,.35)'; c.lineWidth = 1; c.stroke(); });
  c.strokeStyle = 'rgba(255,255,255,.5)'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(0, 0); c.lineTo(rp[1] - 3, 0); c.stroke();
  c.restore();
  c.fillStyle = '#2A3443'; c.beginPath(); c.arc(OX, OY, 4, 0, 7); c.fill();
  c.fillStyle = l2Tx(); c.font = '600 10px "Golos UI", system-ui'; c.textAlign = 'center'; c.fillText(`шкив ${S.pul} · l = ${lcm} см`, OX, OY + 150);
  // электромагнит
  const spM = l2Spr('magnet'); if (spM) { const w = 26, h = w * spM.naturalHeight / spM.naturalWidth; c.drawImage(spM, OX - 34, OY - 72, w, h); }
  c.fillStyle = S.wound && !L2V.anim ? '#E5484D' : '#5B2A2E'; if (spM) { c.beginPath(); c.arc(OX - 21, OY - 75, 4, 0, 7); c.fill(); } else c.fillRect(OX - 22, OY - 60, 14, 10); c.fillStyle = l2Tx(); c.font = '600 9px "Golos UI", system-ui'; c.textAlign = 'left'; c.fillText('электромагнит', OX - 6, OY - 55);
  // груз: подвес + накладные
  const gx = BX + br;
  c.fillStyle = '#2B3442'; c.fillRect(gx - 1, wTop - 6, 2, 6);
  const drawPl = (y, hgt, col) => { const gg = c.createLinearGradient(gx - 13, 0, gx + 13, 0); gg.addColorStop(0, col[0]); gg.addColorStop(.5, col[1]); gg.addColorStop(1, col[0]); c.fillStyle = gg; c.fillRect(gx - 13, y, 26, hgt); c.strokeStyle = 'rgba(0,0,0,.4)'; c.lineWidth = .8; c.strokeRect(gx - 13, y, 26, hgt); };
  const wb = wTop + plates * 5 + 26, spH = l2Spr('hanger'), spPl = l2Spr('plate');
  if (spH && spPl) { const hw = 22, top0 = wTop - 6; c.drawImage(spH, gx - hw / 2, top0, hw, wb - top0);   // подвес и накладные грузы — картинки
    for (let i = 0; i < plates; i++) { c.save(); c.translate(gx, wb - 6 - (i + .5) * 5.4); c.rotate(Math.PI / 2); c.drawImage(spPl, -2.9, -13, 5.8, 26); c.restore(); } }
  else { for (let i = 0; i < plates; i++) drawPl(wTop + i * 5, 5, ['#6B4A12', '#E3B65A']);
  drawPl(wTop + plates * 5, 26, ['#4B5568', '#B9C4D2']); }                         // нижний край груза
  c.fillStyle = l2Tx(); c.font = '600 9px "Golos UI", system-ui'; c.textAlign = 'right'; c.fillText(`m = ${f1(l2Mass(plates) * 1000, 0)} г`, gx - 17, wb - 10);
  // секундомер
  g = c.createLinearGradient(0, 340, 0, 400); g.addColorStop(0, '#2A3445'); g.addColorStop(1, '#1A2230'); c.fillStyle = g; c.fillRect(20, 344, 170, 58);
  c.fillStyle = '#0B1A10'; c.fillRect(30, 352, 112, 30); c.fillStyle = '#7CF29B'; c.font = '700 22px "Golos UI", ui-monospace, monospace'; c.textAlign = 'right'; c.textBaseline = 'middle';
  c.fillText(L2V.tShow == null ? '0,000' : l2Fix(L2V.tShow, 3), 138, 368); c.font = '600 9px "Golos UI", system-ui'; c.fillStyle = '#9FB1C8'; c.textAlign = 'left'; c.fillText('СЕКУНДОМЕР, с', 30, 393);
  c.fillStyle = '#3FA35A'; c.beginPath(); c.arc(166, 362, 9, 0, 7); c.fill(); c.fillStyle = '#E5484D'; c.beginPath(); c.arc(166, 386, 6, 0, 7); c.fill(); c.fillStyle = '#C9D4E3'; c.font = '700 8px "Golos UI", system-ui'; c.textAlign = 'center'; c.fillText('ПУСК', 166, 349);
  if (L2V.anim && L2V.anim.k > 1.05) { c.fillStyle = '#F2B544'; c.font = '700 10px "Golos UI", system-ui'; c.textAlign = 'left'; c.fillText(`ускорено ×${f1(L2V.anim.k, 1)}`, 30, 336); }
  // лупа у линейки: на подготовке — уровень нижнего края груза в верхнем положении
  if (st === 'prep') {
    const X0 = 296, Y0 = 200, W = 124, H = 120, Z = 1700, hc = h;
    c.save(); c.beginPath(); c.rect(X0, Y0, W, H); c.clip(); c.fillStyle = '#F3E9C8'; c.fillRect(X0, Y0, W, H);
    const yz = hm => Y0 + H / 2 - (hm - hc) * Z;
    c.strokeStyle = '#3A2F17'; c.fillStyle = '#3A2F17'; c.textAlign = 'left'; c.textBaseline = 'middle';
    for (let mm = Math.floor((hc - .04) * 1000); mm <= (hc + .04) * 1000; mm++) { const y = yz(mm / 1000); if (y < Y0 - 2 || y > Y0 + H + 2) continue;
      const len = mm % 10 ? (mm % 5 ? 14 : 22) : 34; c.lineWidth = mm % 10 ? 1 : 1.8; c.beginPath(); c.moveTo(X0, y); c.lineTo(X0 + len, y); c.stroke();
      if (mm % 10 === 0) { c.font = '700 14px "Golos UI", system-ui'; c.fillText(mm / 10, X0 + 40, y); } }
    c.fillStyle = 'rgba(75,85,104,.85)'; c.fillRect(X0 + W - 40, Y0, 40, H / 2); c.strokeStyle = '#F2B544'; c.lineWidth = 2; c.beginPath(); c.moveTo(X0, Y0 + H / 2); c.lineTo(X0 + W, Y0 + H / 2); c.stroke();
    c.restore(); c.strokeStyle = '#F2B544'; c.lineWidth = 2; c.strokeRect(X0, Y0, W, H); c.fillStyle = '#F2B544'; c.font = '700 10px "Golos UI", system-ui'; c.textAlign = 'left'; c.fillText('Лупа: линейка, см', X0, Y0 - 18); c.fillText('1 деление = 1 мм', X0, Y0 - 6);
    c.fillStyle = '#C9D4E3'; c.font = '600 9px "Golos UI", system-ui'; c.fillText('груз', X0 + W - 36, Y0 + H / 2 - 8);
    c.strokeStyle = 'rgba(242,181,68,.6)'; c.setLineDash([4, 3]); c.beginPath(); c.moveTo(X0 + W, Y0 + H / 2); c.lineTo(gx - 13, yAt(h)); c.stroke(); c.setLineDash([]);
  }
}
/* штангенциркуль: основная шкала (мм) и нониус 0,1 мм — крупно, чтобы читалось на телефоне */
function l2DrawCal() {
  const cv = $('#l2-cal'); if (!cv) return; const S = L2S, d = S.d[S.pul - 1];
  const box = cv.getBoundingClientRect(), cssW = box.width || 580, dpr = Math.min(2.5, devicePixelRatio || 1), cssH = cssW * 200 / 580;
  if (cv.width !== Math.round(cssW * dpr)) { cv.width = Math.round(cssW * dpr); cv.height = Math.round(cssH * dpr); }
  const c = cv.getContext('2d'), k = cssW / 580; c.setTransform(dpr * k, 0, 0, dpr * k, 0, 0);
  c.fillStyle = '#0E1A2B'; c.fillRect(0, 0, 580, 200);
  const PX = 26, X = mm => 150 + (mm - d) * PX;          // окно ≈ 22 мм вокруг d
  let g = c.createLinearGradient(0, 40, 0, 110); g.addColorStop(0, '#EEF2F6'); g.addColorStop(1, '#A3AEBD'); c.fillStyle = g; c.fillRect(0, 44, 580, 66);
  c.strokeStyle = '#1D2633'; c.fillStyle = '#1D2633'; c.textAlign = 'center'; c.textBaseline = 'bottom';
  for (let mm = Math.floor(d) - 7; mm <= Math.ceil(d) + 17; mm++) { const x = X(mm); if (x < -2 || x > 582) continue;
    const len = mm % 10 ? (mm % 5 ? 14 : 22) : 32; c.lineWidth = mm % 10 ? 1.4 : 2.4; c.beginPath(); c.moveTo(x, 110); c.lineTo(x, 110 - len); c.stroke();
    c.font = mm % 10 ? '600 12px "Golos UI", system-ui' : '800 20px "Golos UI", system-ui'; if (mm % 10 === 0) c.fillText(mm / 10, x, 110 - 34); }
  c.fillStyle = '#C9D4E3'; c.font = '700 12px "Golos UI", system-ui'; c.textAlign = 'right'; c.textBaseline = 'middle'; c.fillText('деление 1 мм, цифры — сантиметры', 574, 26);
  // рамка с нониусом: ноль нониуса — на отметке d
  g = c.createLinearGradient(0, 110, 0, 170); g.addColorStop(0, '#D3DAE3'); g.addColorStop(1, '#838FA0'); c.fillStyle = g; c.fillRect(X(d) - 26, 110, 10 * .9 * PX + 52, 56);
  c.strokeStyle = '#1D2633'; c.fillStyle = '#1D2633'; c.textBaseline = 'top'; c.textAlign = 'center';
  for (let i = 0; i <= 10; i++) { const x = X(d) + i * .9 * PX; c.lineWidth = i % 5 ? 1.4 : 2.4; c.beginPath(); c.moveTo(x, 110); c.lineTo(x, 110 + (i % 5 ? 16 : 24)); c.stroke(); c.font = i % 5 ? '600 11px "Golos UI", system-ui' : '800 15px "Golos UI", system-ui'; c.fillText(i, x, 136); }
  c.font = '600 11px "Golos UI", system-ui'; c.fillText('нониус, 0,1 мм', X(d) + 4.5 * .9 * PX, 153);
  // подвижная губка и шкив
  c.fillStyle = '#8E9AAB'; c.fillRect(X(d) - 12, 4, 12, 44);
  c.fillStyle = '#5E6B7E'; c.beginPath(); c.arc(X(d) - 12 - 60, 26, 60, -.6, .6); c.lineTo(X(d) - 12 - 60, 26); c.fill();
  c.fillStyle = '#C9D4E3'; c.font = '600 12px "Golos UI", system-ui'; c.textAlign = 'right'; c.textBaseline = 'middle'; c.fillText(`шкив ${S.pul}`, X(d) - 76, 26);
  c.fillStyle = '#F2B544'; c.textAlign = 'left'; c.fillText('↑ ноль нониуса', X(d) - 6, 184);
}
function l2Animate(run, done) {
  cancelAnimationFrame(L2V.raf); const S = L2S, real = run.t, dur = Math.min(real, 5.5), k = real / dur, t0 = performance.now();
  L2V.anim = { k, plates: S.plates };
  const step = now => { const tau = Math.min(1, (now - t0) / 1000 / dur); L2V.s = tau * tau; L2V.tShow = tau * real; l2Draw();
    if (tau < 1) L2V.raf = requestAnimationFrame(step); else { L2V.anim = null; L2V.s = 1; L2V.tShow = real; l2Draw(); done(); } };
  L2V.raf = requestAnimationFrame(step);
}

/* ---------- экраны ---------- */
const l2In = (k, val, ph = '', cls = '') => `<input class="lwi l2i ${cls}" data-k2="${k}" inputmode="decimal" autocomplete="off" value="${esc(val ?? '')}" placeholder="${ph}">`;
const l2Next = (label = 'Дальше') => `<button class="btn wide mt" data-l2="next">${label} ${ic('chevron-right')}</button>`;
const l2CtlIn = (k, lab, val, ph) => `<label>${lab}${l2In(k, val, ph)}</label>`;
const l2Field = (ctl = '') => `<section class="lw-stage"><canvas id="l2-cv" aria-label="Маятник Обербека"></canvas>${ctl ? `<div class="lw-ctl">${ctl}</div>` : ''}</section>`;
function vLabWork2() {
  const S = l2Load(), st = L2.steps[S.step][0];
  frame('ЛР № 2 · Момент инерции', { back: true, sub: L2.steps[S.step][1] });
  const chips = `<div class="lw-steps">${L2.steps.map(([k, t], i) => `<button data-l2="go" data-v="${i}" class="${i === S.step ? 'on' : ''}${i < S.max || (i === S.max && st === 'report') ? ' ok' : ''}" ${i > S.max ? 'disabled' : ''}><b>${i + 1}</b><span>${t}</span></button>`).join('')}</div>`;
  const body = ({ admit: l2Admit, prep: l2Prep, exp1: () => l2Exp(1), exp2: () => l2Exp(2), proc: l2Proc, concl: l2Concl, report: l2ReportStep })[st]();
  setMain(`<div class="lw">${chips}${body}</div>`);
  if (['prep', 'exp1', 'exp2'].includes(st)) {
    if (!L2V.anim) { L2V.s = (st === 'prep' || S.wound) ? 0 : 1; L2V.tShow = S.cur ? S.cur.t : null; }
    l2Draw(); l2DrawCal();
    if (!l2Draw.ro && 'ResizeObserver' in window) l2Draw.ro = new ResizeObserver(() => { l2Draw(); l2DrawCal(); });
    if (l2Draw.ro) { l2Draw.ro.disconnect(); l2Draw.ro.observe($('#l2-cv')); }
  }
}

/* 1. Допуск */
const L2_TEXT = {
  theory: `<p><b>Основной закон динамики вращательного движения:</b> M = Jε. Угловое ускорение тем больше, чем больше момент силы и чем меньше момент инерции.</p>
    <p><b>Момент инерции</b> — мера инертности тела при вращении. Для точки J = mr², для тела J = Σmᵢrᵢ². Он зависит от того, как масса распределена относительно оси: сдвинув цилиндры дальше от оси, мы увеличиваем J.</p>
    <p><b>Метод.</b> Груз m опускается равноускоренно: a = 2h/t², ε = a/r = 2h/(rt²). Момент силы натяжения нити M = Tr, T = m(g − a). Отсюда J = mr²(gt²/(2h) − 1).</p>`,
  equip: `<p>Маятник Обербека: крестовина с четырьмя стержнями, по которым перемещаются цилиндры массой m₀; на оси — два шкива разного радиуса. Нить, намотанная на шкив, перекинута через блок, на ней — груз (подвес и накладные грузы). Маятник удерживает электромагнит; при нажатии «Пуск» груз начинает опускаться и включается секундомер, датчик внизу его останавливает. Высоту h читают по линейке на колонне. Также нужны штангенциркуль и линейка.</p>`,
  safety: `<p>Работу начинают с разрешения преподавателя. Установка включается в сеть (электромагнит и секундомер): не касайся токоведущих частей и проводов; при неисправности отключи установку и сообщи преподавателю. Следи, чтобы груз не падал на пол и на ноги, а нить не задевала неподвижных частей. Не раскручивай крестовину рукой с большой скоростью — на стержнях тяжёлые цилиндры.</p>`
};
const L2_ADMIT = [
  ['Как записывается основной закон динамики вращательного движения?', 'M = Jε', ['F = ma', 'M = Jω', 'L = Jε']],
  ['Что измеряют секундомером в этой работе?', 'Время опускания груза на расстояние h', ['Период колебаний маятника', 'Время одного оборота крестовины', 'Время намотки нити']],
  ['По какой формуле находят угловое ускорение маятника?', 'ε = 2h/(r·t²)', ['ε = h/(r·t)', 'ε = 2h·r/t²', 'ε = g/r']],
  ['Как в этой работе изменяют момент инерции маятника?', 'Перемещают цилиндры по стержням крестовины', ['Меняют массу груза', 'Меняют шкив', 'Меняют высоту h']],
  ['Почему силу натяжения нити можно считать T ≈ mg?', 'Ускорение груза намного меньше g', ['Нить невесома', 'Блок невесом', 'Трения в оси нет']],
  ['Чем измеряют радиус шкива?', 'Штангенциркулем: измеряют диаметр и делят пополам', ['Линейкой на колонне', 'Секундомером', 'Динамометром']],
  ['Что нужно сделать перед нажатием «Пуск»?', 'Намотать нить на шкив в один слой, включить электромагнит и устранить качание груза', ['Снять груз', 'Раскрутить маятник рукой', 'Ничего, сразу нажать «Пуск»']],
  ['В каких единицах измеряют момент инерции?', 'кг·м²', ['Н·м', 'кг·м/с', 'рад/с²']]
];
function l2Admit() {
  const S = L2S, qs = L2_ADMIT.map(([q, a, x], i) => { const opts = lwShuf(i + 40, [a, ...x]), ch = S.admit[i];
    return `<div class="lw-q"><b>${i + 1}. ${esc(q)}</b>${opts.map(o => `<button data-l2="admit" data-q="${i}" data-v="${esc(o)}" class="${ch === o ? (S.admitChecked ? (o === a ? 'ok' : 'bad') : 'pick') : ''}">${esc(o)}</button>`).join('')}</div>`; }).join('');
  return `<section class="card lw-intro"><b class="h">Цель работы</b><p>${esc(LW_LIST[1].aim)}</p>
    <details><summary>Кратко из теории</summary>${L2_TEXT.theory}</details>
    <details><summary>Оборудование и установка</summary>${L2_TEXT.equip}</details>
    <details><summary>Техника безопасности</summary>${L2_TEXT.safety}</details></section>
    <section class="card"><b class="h">Допуск к работе</b><p class="mute">Ответь на вопросы. Нужно не меньше 6 верных из 8.</p>${qs}
    <button class="btn wide mt" data-l2="admitCheck">${ic('circle-check')} Сдать допуск</button>${S.admitOk ? l2Next('К подготовке') : ''}</section>`;
}

/* 2. Подготовка: шкив (штангенциркуль), цилиндры, высота h */
function l2Prep() {
  const S = L2S;
  return `<section class="card"><b class="h">1. Шкив и его радиус</b><p class="mute small">Выбери шкив, на который будешь наматывать нить, и измерь его диаметр штангенциркулем с точностью 0,1 мм. Радиус r = d/2 запиши в метрах.</p>
    <div class="seg">${[1, 2].map(p => `<button type="button" data-l2="pul" data-v="${p}" aria-pressed="${S.pul === p}">Шкив ${p} — ${p === 1 ? 'малый' : 'большой'}</button>`).join('')}</div>
    <canvas id="l2-cal" class="l2-cal" aria-label="Штангенциркуль"></canvas>
    <p class="mute small">Как читать: целые миллиметры — последний штрих основной шкалы перед нулём нониуса; десятые доли — номер штриха нониуса, который точно совпал со штрихом основной шкалы.</p>
    <div class="lw-row"><label>d, мм ${l2In('rd', S.rd, '0,0')}</label><label>r, м ${l2In('rr', S.rr, '0,0000')}</label></div></section>
    <section class="card"><b class="h">2. Цилиндры на крестовине</b><p class="mute small">Установи центры всех четырёх цилиндров на одинаковом расстоянии l от оси (шкала на стержнях — через 1 см) и запиши l в метрах.</p>
    <div class="lw-screw"><span>Расстояние l, см</span><button class="lp-btn" data-l2="l1" data-d="-1">−</button><b>${S.l1}</b><button class="lp-btn" data-l2="l1" data-d="1">+</button></div>
    <div class="lw-row"><label>l, м ${l2In('rl1', S.rl1, '0,00')}</label></div></section>
    <section class="card"><b class="h">3. Высота h</b><p class="mute small">Груз поднят к верхнему положению. По лупе у линейки на колонне прочитай, на какой высоте над датчиком находится нижний край груза, — это путь h. Запиши h в метрах с точностью до 1 мм.</p></section>
    ${l2Field(`<div class="lw-ctl-row">${l2CtlIn('rh', 'h, м', S.rh, '0,000')}<button class="btn" data-l2="prepCheck">${ic('circle-check')} Проверить</button></div><p class="lw-msg" id="lw-msg"></p>${S.prepOk ? l2Next('К опыту 1') : ''}`)}`;
}

/* 3–4. Опыты: 1 — три пуска с растущей массой, 2 — цилиндры переставлены, один пуск */
function l2Exp(n) {
  const S = L2S, rows = n === 1 ? S.runs : S.ex2, need = n === 1 ? L2.N : 1, k = rows.length, cur = S.cur && S.cur.exp === n, busy = !!L2V.anim;
  const minPl = n === 1 && k ? rows[k - 1].plates + 1 : 0;
  const head = n === 1
    ? `<section class="card lw-cond"><b class="h">Опыт 1. Зависимость ε от M</b><p class="mute small">Шкив ${S.pul}, цилиндры на l = ${S.l1} см. Сделай ${L2.N} пуска, каждый раз увеличивая массу груза. После пуска запиши m (кг) и время t по секундомеру.</p>`
    : `<section class="card lw-cond"><b class="h">Опыт 2. Другое распределение масс</b><p class="mute small">Передвинь цилиндры, чтобы изменился момент инерции (не меньше чем на 3 см от прежних ${S.l1} см), запиши новое l. Затем один пуск с тем же шкивом ${S.pul}.</p>
      <div class="lw-screw"><span>Новое l, см</span><button class="lp-btn" data-l2="l2" data-d="-1" ${k || S.wound ? 'disabled' : ''}>−</button><b>${S.l2}</b><button class="lp-btn" data-l2="l2" data-d="1" ${k || S.wound ? 'disabled' : ''}>+</button></div>
      <div class="lw-row"><label>l, м ${l2In('rl2', S.rl2, '0,00')}</label></div>`;
  const massRow = k < need && !cur ? `<div class="lw-screw"><span>Груз: подвес 50 г + накладные по 50 г</span><button class="lp-btn" data-l2="pl" data-d="-1" ${S.wound || S.plates <= minPl ? 'disabled' : ''}>−</button><b>${S.plates}</b><button class="lp-btn" data-l2="pl" data-d="1" ${S.wound || S.plates >= L2.maxPlates ? 'disabled' : ''}>+</button></div><p class="mute small">Масса указана на грузах: подвес — 50 г, каждый накладной — 50 г.</p>` : '';
  const ctl = (cur ? `<div class="lw-ctl-row">${l2CtlIn('cm', 'm, кг', S.cur.rm, '0,000')}${l2CtlIn('ct', 't, с', S.cur.rt, '0,000')}<button class="btn" data-l2="record">${ic('pencil')} Записать</button></div>`
      : k < need ? (S.wound ? `<button class="btn wide" data-l2="go1" ${busy ? 'disabled' : ''}>${ic('play')} Пуск</button>` : `<button class="btn wide line" data-l2="wind">${ic('rotate-ccw')} Намотать нить и включить электромагнит</button>`)
      : l2Next(n === 1 ? 'К опыту 2' : 'К обработке')) + `<p class="lw-msg" id="lw-msg">${cur ? 'Груз дошёл до датчика. Запиши его массу и время с секундомера.' : S.wound && k < need ? 'Нить намотана в один слой, груз не качается. Нажми «Пуск».' : ''}</p>`;
  const tbl = `<table class="lw-tbl"><tr><th>№</th><th>r, м</th><th>m, кг</th><th>h, м</th><th>t, с</th></tr>${Array.from({ length: need }, (_, i) => rows[i] ? `<tr><td>${i + 1}</td><td>${S.rr}</td><td>${l2Fix(rows[i].m, 3)}</td><td>${S.rh}</td><td>${l2Fix(rows[i].rt, 3)}</td></tr>` : `<tr class="${i === k && cur ? 'now' : ''}"><td>${i + 1}</td><td></td><td></td><td></td><td>${i === k && cur ? '…' : ''}</td></tr>`).join('')}</table>`;
  return head + massRow + '</section>' + l2Field(ctl) + `<section class="card"><b class="h">Таблица ${n} (измерения)</b><div class="lw-scroll">${tbl}</div></section>`;
}

/* ---------- обработка ---------- */
function l2Calc() {
  const S = L2S, r = lwNum(S.rr), h = lwNum(S.rh), g = L2.g;
  const one = row => { const m = row.m, t = row.rt, e = 2 * h / (r * t * t), J = m * r * r * (g * t * t / (2 * h) - 1); return { m, t, e, J, M: J * e }; };
  const a = S.runs.map(one), b = S.ex2.map(one)[0], N = a.length, mean = f => a.reduce((s, x) => s + x[f], 0) / N;
  const o = { r, h, a, b, em: mean('e'), Jm: mean('J'), Mm: mean('M') };
  o.dJ = Math.sqrt(a.reduce((s, x) => s + (o.Jm - x.J) ** 2, 0) / (N * (N - 1))); o.dl = o.dJ / o.Jm * 100;
  a.forEach((x, i) => { o['e' + (i + 1)] = x.e; o['J' + (i + 1)] = x.J; o['M' + (i + 1)] = x.M; });
  if (b) { o.e4 = b.e; o.J4 = b.J; o.M4 = b.M; }
  return o;
}
const L2_TABLES = { 1: ['e1', 'J1', 'M1', 'e2', 'J2', 'M2', 'e3', 'J3', 'M3', 'em', 'Jm', 'Mm', 'dJ', 'dl'], 2: ['e4', 'J4', 'M4'] };
function l2Ok(key, u, o) {
  const e = o[key]; if (!Number.isFinite(u) || !Number.isFinite(e)) return false;
  if (key === 'dl') return Math.abs(u - e) <= Math.max(.3, e * .1);
  if (key === 'dJ') return Math.abs(u - e) <= Math.max(e * .1, 2e-6);
  return Math.abs(u - e) <= Math.abs(e) * .012;
}
function l2Proc() {
  const S = L2S, o = l2Calc(), P = S.proc, cls = k => S.procOk[k] === true ? 'ok' : S.procOk[k] === false ? 'bad' : '', I = k => l2In('p_' + k, P[k], '', cls(k));
  const t1 = `<section class="card"><b class="h">Таблица 1. Вычисления (опыт 1)</b><p class="mute small">r = ${S.rr} м, h = ${S.rh} м, g = 9,81 м/с². ε = 2h/(rt²); J = mr²(gt²/(2h) − 1); M = Jε. Числа — не меньше трёх значащих цифр (например 0,0331).</p>
    <div class="lw-scroll"><table class="lw-tbl wide"><tr><th>№</th><th>m, кг</th><th>t, с</th><th>ε, рад/с²</th><th>J, кг·м²</th><th>M, Н·м</th></tr>
    ${o.a.map((x, i) => `<tr><td>${i + 1}</td><td>${l2Fix(x.m, 3)}</td><td>${l2Fix(x.t, 3)}</td><td>${I('e' + (i + 1))}</td><td>${I('J' + (i + 1))}</td><td>${I('M' + (i + 1))}</td></tr>`).join('')}
    <tr class="sum"><td colspan="3">Средние значения</td><td>⟨ε⟩ ${I('em')}</td><td>⟨J⟩ ${I('Jm')}</td><td>⟨M⟩ ${I('Mm')}</td></tr></table></div>
    <div class="lw-row"><label>Средняя квадратичная погрешность ⟨ΔJ⟩ = √(Σ(⟨J⟩ − Jᵢ)²/(N(N − 1))), кг·м² ${I('dJ')}</label><label>Относительная δ = ⟨ΔJ⟩/⟨J⟩·100, % ${I('dl')}</label></div>
    <button class="btn line wide mt" data-l2="pcheck" data-v="1">${ic('circle-check')} Проверить таблицу 1</button>
    ${['Jm', 'dJ'].every(k => S.procOk[k]) ? `<p class="lw-res">J = ${l2Sig(o.Jm, 3)} ± ${l2Sig(o.dJ, 1)} кг·м²</p>` : ''}</section>`;
  const t2 = `<section class="card"><b class="h">Таблица 2. Вычисления (опыт 2, l = ${S.rl2} м)</b>
    <div class="lw-scroll"><table class="lw-tbl wide"><tr><th>m, кг</th><th>t, с</th><th>ε, рад/с²</th><th>J, кг·м²</th><th>M, Н·м</th></tr>
    <tr><td>${l2Fix(o.b.m, 3)}</td><td>${l2Fix(o.b.t, 3)}</td><td>${I('e4')}</td><td>${I('J4')}</td><td>${I('M4')}</td></tr></table></div>
    <button class="btn line wide mt" data-l2="pcheck" data-v="2">${ic('circle-check')} Проверить таблицу 2</button></section>`;
  const all = [1, 2].every(t => L2_TABLES[t].every(k => S.procOk[k] === true));
  return t1 + t2 + `<p class="lw-msg" id="lw-msg"></p>${all ? l2Next('К выводам') : '<p class="mute small center">Когда обе таблицы будут верны, откроются выводы.</p>'}`;
}

/* 6. Выводы и контрольные вопросы */
const L2_CQ = [
  ['Какое движение называется вращательным?', 'Все точки тела описывают окружности, центры которых лежат на одной прямой — оси вращения', ['Все точки тела движутся по параллельным прямым', 'Тело движется по окружности вокруг другого тела', 'Тело колеблется около положения равновесия']],
  ['Что называют угловым ускорением?', 'Величину, равную изменению угловой скорости за единицу времени: ε = dω/dt', ['Изменение угла поворота за единицу времени', 'Ускорение точки на ободе тела', 'Произведение ω на радиус']],
  ['Что называют моментом силы относительно точки O?', 'Векторное произведение радиуса-вектора точки приложения силы на силу: M = [R F]', ['Произведение силы на путь', 'Произведение массы на скорость', 'Отношение силы к расстоянию до оси']],
  ['Что такое плечо силы?', 'Длина перпендикуляра, опущенного из точки O (оси) на линию действия силы', ['Расстояние от оси до центра масс', 'Длина стержня крестовины', 'Радиус шкива']],
  ['Чему равен момент инерции материальной точки?', 'J = mr², где r — расстояние до оси вращения', ['J = mr', 'J = mv²/2', 'J = mωr']],
  ['Что такое момент импульса тела, вращающегося вокруг оси?', 'L = Jω', ['L = mv', 'L = Jε', 'L = Mt²']],
  ['В каких единицах измеряют ε, M, J?', 'рад/с², Н·м, кг·м²', ['рад/с, Н, кг·м', 'м/с², Дж, кг·м²/с', 'рад, Н·м, кг']],
  ['От чего зависит угловое ускорение маятника в этой работе?', 'От момента силы натяжения нити (массы груза, радиуса шкива) и от момента инерции маятника', ['Только от высоты h', 'Только от массы груза', 'Ни от чего — оно постоянно']]
];
function l2AutoConcl(o) {
  const S = L2S, a = o.a, inc = a.every((x, i) => !i || x.e > a[i - 1].e), dJrel = (o.J4 - o.Jm) / o.Jm * 100, far = S.l2 > S.l1;
  const jDrop = a[0].J > a[a.length - 1].J;
  return `Изучен закон динамики вращательного движения на маятнике Обербека. При увеличении массы груза с ${l2Fix(a[0].m, 3)} до ${l2Fix(a[a.length - 1].m, 3)} кг момент силы вырос с ${l2Sig(a[0].M, 3)} до ${l2Sig(a[a.length - 1].M, 3)} Н·м, ` +
    `а угловое ускорение — с ${l2Sig(a[0].e, 3)} до ${l2Sig(a[a.length - 1].e, 3)} рад/с²${inc ? ': ε растёт пропорционально M, что подтверждает закон M = Jε' : ''}. ` +
    `Момент инерции маятника при l = ${S.rl1} м: J = ${l2Sig(o.Jm, 3)} ± ${l2Sig(o.dJ, 1)} кг·м² (δ = ${f1(o.dl, 1)} %).${jDrop ? ' Небольшое уменьшение J с ростом массы груза объясняется трением в оси: формула (14) его не учитывает, и при малом ε вклад трения заметнее.' : ''} ` +
    `После перемещения цилиндров ${far ? 'дальше от оси' : 'ближе к оси'} (l = ${S.rl2} м) момент инерции ${dJrel > 0 ? 'увеличился' : 'уменьшился'} до ${l2Sig(o.J4, 3)} кг·м² (на ${f1(Math.abs(dJrel), 0)} %): момент инерции зависит от распределения массы относительно оси вращения.`;
}
function l2Concl() {
  const S = L2S; if (!S.concl) { S.concl = l2AutoConcl(l2Calc()); l2Save(); }
  const qs = L2_CQ.map(([q, a, x], i) => { const opts = lwShuf(i + 60, [a, ...x]), ch = S.cq[i];
    return `<div class="lw-q"><b>${i + 1}. ${esc(q)}</b>${opts.map(op => `<button data-l2="cq" data-q="${i}" data-v="${esc(op)}" class="${ch === op ? (S.cqChecked ? (op === a ? 'ok' : 'bad') : 'pick') : ''}">${esc(op)}</button>`).join('')}</div>`; }).join('');
  return `<section class="card"><b class="h">Выводы</b><p class="mute small">Черновик собран по твоим результатам. Проверь и допиши своими словами.</p>
    <textarea class="lw-ta l2i" data-k2="concl" rows="9">${esc(S.concl)}</textarea>
    <button class="btn line wide mt" data-l2="reconcl">${ic('rotate-ccw')} Собрать черновик заново</button></section>
    <section class="card"><b class="h">Контрольные вопросы (защита)</b>${qs}<button class="btn wide mt" data-l2="cqCheck">${ic('circle-check')} Проверить ответы</button>${S.cqOk ? l2Next('К отчёту') : ''}</section>`;
}

/* 7. Отчёт */
function l2ReportStep() {
  const S = L2S;
  return `<section class="card"><b class="h">Отчёт готов</b><p class="mute">Отчёт оформлен по бланку кафедры (4 листа А4). Заполни шапку и сохрани PDF: в окне печати выбери «Сохранить как PDF».</p>
    <div class="lw-row"><label>ФИО ${l2In('fio', S.fio, 'Иванов И. И.', 'txt')}</label><label>Класс ${l2In('group', S.group, '', 'txt')}</label><label>Дата ${l2In('date', S.date, '', 'txt')}</label></div>
    <a class="btn wide mt" href="#lw-2-report">${ic('file-text')} Открыть отчёт</a>
    <button class="btn line wide mt" data-l2="restart">${ic('rotate-ccw')} Выполнить работу заново</button></section>`;
}
function vLabWork2Report() {
  const S = l2Load(); if (L2.steps[S.max][0] !== 'report') { location.hash = 'lw-2'; return; }
  frame('Отчёт · ЛР № 2', { back: true });
  setMain(`<div class="lwr-tools"><button class="btn" data-l2="print">${ic('printer')} Сохранить PDF / печать</button><a class="btn line" href="#lw-2">${ic('chevron-left')} К работе</a></div><article class="lwr">${l2ReportHtml()}</article>`);
}
/* отчёт по бланку кафедры: 4 листа А4 */
function l2ReportHtml() {
  const S = l2Load(), o = l2Calc(), ln = v => `<span class="ul">${esc(v || '')}</span>`, [dd, mon, yy] = String(S.date || '').split('.');
  const MON = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
  const equip = [['Маятник Обербека (крестовина, шкивы, блок, электромагнит)', '—', '—'], ['Секундомер электронный', '0–99,999 с', '0,001 с'], ['Штангенциркуль', '0–125 мм', '0,1 мм'], ['Линейка на колонне установки', '0–1000 мм', '1 мм'], ['Набор грузов (подвес и накладные грузы)', `${f1(L2.hanger * 1000, 0)}–${f1(l2Mass(L2.maxPlates) * 1000, 0)} г`, 'указана на грузах']];
  const p1 = `<section class="lwp"><p class="c b">${LAB_DEPT}</p><hr>
    <p class="row">Оценка ${ln('')} Подпись преподавателя ${ln('')}</p>
    <p class="row">Курсант (студент) ${ln(S.fio)} Класс <span class="ul s">${esc(S.group || '')}</span></p>
    <p class="row">Дата выполнения «<span class="ul s">${esc(dd || '')}</span>» <span class="ul m">${MON[(+mon || 1) - 1]}</span> 20<span class="ul s">${esc((yy || '').slice(2))}</span> г.</p>
    <p class="c mt2">ОТЧЕТ<br>по лабораторной работе № <span class="ul s">2</span></p>
    <p class="row">Наименование ${ln('Определение момента инерции абсолютно твёрдого тела')}</p>
    <p class="row">Цель ${ln(LW_LIST[1].aim)}</p>
    <p class="c b mt2">ОБОРУДОВАНИЕ И ПРИБОРЫ</p>
    <table><tr><th>№ п.п.</th><th>Наименование</th><th>Предел измерения</th><th>Погрешность измерения</th></tr>
    ${Array.from({ length: 10 }, (_, i) => `<tr><td>${equip[i] ? i + 1 : ''}</td><td class="l">${equip[i] ? esc(equip[i][0]) : '&nbsp;'}</td><td>${equip[i] ? esc(equip[i][1]) : ''}</td><td>${equip[i] ? esc(equip[i][2]) : ''}</td></tr>`).join('')}</table></section>`;
  const row = (x, i) => `<tr><td>${i}</td><td>${S.rr}</td><td>${l2Fix(x.m, 3)}</td><td>${S.rh}</td><td>${l2Fix(x.t, 3)}</td><td>${l2Sig(x.e, 4)}</td><td>${l2Sig(x.J, 4)}</td><td>${l2Sig(x.M, 4)}</td></tr>`;
  const head = `<tr><th rowspan="2">№ изм.</th><th colspan="4">Измерения</th><th colspan="3">Вычисления</th></tr><tr><th>r, м</th><th>m, кг</th><th>h, м</th><th>t, с</th><th>ε, рад/с²</th><th>J, кг·м²</th><th>M, Н·м</th></tr>`;
  const p2 = `<section class="lwp"><p class="c b">СХЕМА УСТАНОВКИ</p>${l2SchemeSvg()}
    <p class="small">1, 2 — шкивы; 3 — подвижные цилиндры массой m₀; 4 — блок; 5 — груз массой m; h — путь груза (линейка на колонне). Нить намотана на шкив ${S.pul}.</p><hr>
    <p class="c b">РЕЗУЛЬТАТЫ ИЗМЕРЕНИЙ</p>
    <p class="small">Таблица 1. Цилиндры на расстоянии l = ${S.rl1} м от оси</p>
    <table class="tight">${head}${o.a.map((x, i) => row(x, i + 1)).join('')}<tr><td colspan="5">Средние значения</td><td>⟨ε⟩ = ${l2Sig(o.em, 4)}</td><td>⟨J⟩ = ${l2Sig(o.Jm, 4)}</td><td>⟨M⟩ = ${l2Sig(o.Mm, 4)}</td></tr></table>
    <p class="small">Таблица 2. Цилиндры на расстоянии l = ${S.rl2} м от оси</p>
    <table class="tight">${head}${row(o.b, 1)}</table>
    <p class="row sign">Подпись зав. кабинетом ${ln('')}</p></section>`;
  const p3 = `<section class="lwp"><p class="c b">РАСЧЕТНЫЕ ФОРМУЛЫ ИСКОМЫХ ВЕЛИЧИН И ПОГРЕШНОСТЕЙ</p>
    <div class="fm"><p>a = 2h/t²; &nbsp; ε = a/r = 2h/(rt²)</p><p>J = mr²(gt²/(2h) − 1); &nbsp; M = Jε</p>
    <p>⟨J⟩ = ΣJᵢ/N; &nbsp; ⟨ΔJ⟩ = √(Σ(⟨J⟩ − Jᵢ)²/(N(N − 1))); &nbsp; δ = ⟨ΔJ⟩/⟨J⟩·100</p></div><hr>
    <p class="c b">ВЫЧИСЛЕНИЕ РЕЗУЛЬТАТОВ ИЗМЕРЕНИЯ И ПОГРЕШНОСТЕЙ</p>
    ${o.a.map((x, i) => `<p class="small">Опыт ${i + 1}: ε = 2·${S.rh}/(${S.rr}·${l2Fix(x.t, 3)}²) = ${l2Sig(x.e, 4)} рад/с²; J = ${l2Fix(x.m, 3)}·${S.rr}²·(9,81·${l2Fix(x.t, 3)}²/(2·${S.rh}) − 1) = ${l2Sig(x.J, 4)} кг·м²; M = ${l2Sig(x.M, 4)} Н·м</p>`).join('')}
    <p class="small">⟨J⟩ = ${l2Sig(o.Jm, 4)} кг·м²; ⟨ΔJ⟩ = ${l2Sig(o.dJ, 2)} кг·м²; δ = ${f1(o.dl, 1)} %.</p>
    <p class="small"><b>J = (${l2Sig(o.Jm, 3)} ± ${l2Sig(o.dJ, 1)}) кг·м²</b> при l = ${S.rl1} м.</p>
    <p class="small">Опыт 2 (l = ${S.rl2} м): ε = ${l2Sig(o.b.e, 4)} рад/с²; J = ${l2Sig(o.b.J, 4)} кг·м²; M = ${l2Sig(o.b.M, 4)} Н·м.</p></section>`;
  const p4 = `<section class="lwp"><p class="c b">ПОСТРОЕНИЕ ГРАФИКОВ</p>${l2GraphSvg(o)}
    <p class="small c">Зависимость углового ускорения ε от момента силы M. Синие точки и прямая ε = M/⟨J⟩ — опыт 1; красная точка и штриховая прямая ε = M/J — опыт 2 (цилиндры ближе или дальше от оси — другой наклон).</p>
    <p class="c b mt2">ВЫВОДЫ ПО ПРОДЕЛАННОЙ РАБОТЕ</p><p class="concl">${esc(S.concl).replace(/\n/g, '<br>')}</p>
    <p class="row sign">Подпись исполнителя ${ln('')}</p></section>`;
  return p1 + p2 + p3 + p4;
}
function l2GraphSvg(o) {
  const pts = o.a.map(x => [x.M, x.e]), all = pts.concat([[o.b.M, o.b.e]]), Mx = Math.max(...all.map(p => p[0])) * 1.15, Ex = Math.max(...all.map(p => p[1])) * 1.15;
  const X = M => 50 + M / Mx * 460, Y = e => 270 - e / Ex * 250;
  const grid = Array.from({ length: 24 }, (_, i) => `<line x1="${50 + i * 20}" y1="20" x2="${50 + i * 20}" y2="270" stroke="#bbb" stroke-width=".5"/>`).join('') + Array.from({ length: 13 }, (_, i) => `<line x1="50" y1="${30 + i * 20}" x2="510" y2="${30 + i * 20}" stroke="#bbb" stroke-width=".5"/>`).join('');
  const ticks = [0, .25, .5, .75, 1].map(f => `<text x="${X(Mx * f)}" y="286" font-size="10" text-anchor="middle">${l2Sig(Mx * f, 2)}</text><text x="44" y="${Y(Ex * f) + 3}" font-size="10" text-anchor="end">${l2Sig(Ex * f, 2)}</text>`).join('');
  return `<svg class="lwr-svg" viewBox="0 0 540 300">${grid}<line x1="50" y1="270" x2="515" y2="270" stroke="#000"/><line x1="50" y1="270" x2="50" y2="15" stroke="#000"/>${ticks}
    <text x="515" y="262" font-size="12" text-anchor="end">M, Н·м</text><text x="56" y="18" font-size="12">ε, рад/с²</text>
    <line x1="${X(0)}" y1="${Y(0)}" x2="${X(Mx)}" y2="${Y(Mx / o.Jm)}" stroke="#1f4fd8" stroke-width="1.6"/>
    ${pts.map(([M, e], i) => `<circle cx="${X(M)}" cy="${Y(e)}" r="4.5" fill="#1f4fd8"/><text x="${X(M) + 7}" y="${Y(e) + 14}" font-size="11">${i + 1}</text>`).join('')}
    <line x1="${X(0)}" y1="${Y(0)}" x2="${X(Math.min(Mx, Ex * o.b.J))}" y2="${Y(Math.min(Mx, Ex * o.b.J) / o.b.J)}" stroke="#c0392b" stroke-width="1.4" stroke-dasharray="6 4"/><rect x="${X(o.b.M) - 4.5}" y="${Y(o.b.e) - 4.5}" width="9" height="9" fill="#c0392b"/><text x="${X(o.b.M) + 8}" y="${Y(o.b.e) - 6}" font-size="11" fill="#c0392b">опыт 2</text></svg>`;
}
function l2SchemeSvg() {
  const rod = a => { const c = Math.cos(a), s = Math.sin(a); return `<line x1="${120 + 14 * c}" y1="${90 + 14 * s}" x2="${120 + 70 * c}" y2="${90 + 70 * s}" stroke="#000" stroke-width="3"/><rect x="${120 + 52 * c - 8}" y="${90 + 52 * s - 8}" width="16" height="16" fill="#ddd" stroke="#000" transform="rotate(${a * 180 / Math.PI} ${120 + 52 * c} ${90 + 52 * s})"/>`; };
  return `<svg class="lwr-svg scheme" viewBox="0 0 520 230" aria-hidden="true">${[1, 3, 5, 7].map(i => rod(i * Math.PI / 4)).join('')}
    <circle cx="120" cy="90" r="16" fill="#fff" stroke="#000"/><circle cx="120" cy="90" r="9" fill="#fff" stroke="#000"/><circle cx="120" cy="90" r="2" fill="#000"/>
    <line x1="120" y1="74" x2="330" y2="74" stroke="#000"/><circle cx="336" cy="80" r="7" fill="#fff" stroke="#000"/><line x1="343" y1="80" x2="343" y2="150" stroke="#000"/>
    <rect x="333" y="150" width="20" height="26" fill="#ccc" stroke="#000"/><line x1="343" y1="176" x2="343" y2="205" stroke="#000" stroke-dasharray="3 3"/>
    <rect x="380" y="70" width="14" height="140" fill="#f4f4f4" stroke="#000"/>${Array.from({ length: 14 }, (_, i) => `<line x1="380" y1="${80 + i * 10}" x2="388" y2="${80 + i * 10}" stroke="#000" stroke-width=".7"/>`).join('')}
    <line x1="40" y1="212" x2="480" y2="212" stroke="#000" stroke-width="1.5"/>
    <line x1="410" y1="176" x2="410" y2="212" stroke="#000"/><text x="414" y="198" font-size="11">h</text>
    <text x="101" y="70" font-size="11">1</text><text x="140" y="104" font-size="11">2</text><text x="64" y="40" font-size="11">3</text><text x="336" y="66" font-size="11">4</text><text x="358" y="168" font-size="11">5 (m)</text><text x="104" y="124" font-size="11">O</text><text x="400" y="64" font-size="10">линейка</text></svg>`;
}

/* ---------- ввод и действия ---------- */
document.addEventListener('input', e => {
  const el = e.target.closest && e.target.closest('.l2i'); if (!el || !L2S) return;
  const k = el.dataset.k2;
  if (k.startsWith('p_')) { L2S.proc[k.slice(2)] = el.value; delete L2S.procOk[k.slice(2)]; el.classList.remove('ok', 'bad'); }
  else if (k === 'cm') L2S.cur.rm = el.value; else if (k === 'ct') L2S.cur.rt = el.value;
  else L2S[k] = el.value;
  l2Save();
});
function l2Go(i) { L2S.step = Math.max(0, Math.min(i, L2S.max)); l2Save(); render(); ui.main.scrollTop = 0; }
function l2Advance() { L2S.max = Math.max(L2S.max, L2S.step + 1); L2S.step++; L2S.wound = false; l2Save(); render(); ui.main.scrollTop = 0; }
document.addEventListener('click', e => {
  const b = e.target.closest && e.target.closest('[data-l2]'); if (!b) return; const S = l2Load(), d = b.dataset;
  switch (d.l2) {
    case 'go': l2Go(+d.v); break;
    case 'next': l2Advance(); break;
    case 'admit': S.admit[d.q] = d.v; S.admitChecked = false; l2Save(); render(); break;
    case 'admitCheck': { const n = L2_ADMIT.filter(([, a], i) => S.admit[i] === a).length; S.admitChecked = true; S.admitOk = n >= 6; l2Save(); render();
      toast(S.admitOk ? `Допуск сдан: ${n} из 8` : `Верно ${n} из 8 — нужно 6. Перечитай теорию и попробуй снова.`, S.admitOk ? '' : 'bad'); break; }
    case 'pul': S.pul = +d.v; S.prepOk = false; l2Save(); render(); break;
    case 'l1': S.l1 = Math.max(L2.lMin, Math.min(L2.lMax, S.l1 + +d.d)); S.prepOk = false; l2Save(); render(); break;
    case 'prepCheck': {
      const dTrue = S.d[S.pul - 1], bad = [];
      if (!(Math.abs(lwNum(S.rd) - dTrue) <= .051)) bad.push('диаметр d — прочитай по штангенциркулю: целые миллиметры до нуля нониуса, десятые — по совпавшему штриху');
      else if (!(Math.abs(lwNum(S.rr) - dTrue / 2000) <= .00006)) bad.push('радиус r — это половина диаметра, переведённая в метры');
      if (!(Math.abs(lwNum(S.rl1) - S.l1 / 100) <= .0006)) bad.push(`l — ${S.l1} см нужно записать в метрах`);
      if (!(Math.abs(lwNum(S.rh) - S.h) <= .0011)) { S.hTries = (S.hTries || 0) + 1; bad.push(S.hTries >= 3 ? `h — подсказка: около ${l2Fix(Math.round(S.h * 1000) / 1000, 3)} м` : 'h — посмотри в лупу, где жёлтая линия (низ груза) пересекает шкалу; 1 деление = 1 мм'); }
      if (bad.length) { l2Save(); lwMsg('Не совпадает: ' + bad.join('; ') + '.', 1); break; }
      S.prepOk = true; S.wound = false; S.plates = 0; l2Save(); render(); toast('Подготовка выполнена'); break;
    }
    case 'pl': if (!S.wound) { S.plates = Math.max(0, Math.min(L2.maxPlates, S.plates + +d.d)); l2Save(); render(); } break;
    case 'l2': if (!S.wound && !S.ex2.length) { S.l2 = Math.max(L2.lMin, Math.min(L2.lMax, S.l2 + +d.d)); l2Save(); render(); } break;
    case 'wind': {
      const st = l2St();
      if (st === 'exp1' && S.runs.length && S.plates <= S.runs[S.runs.length - 1].plates) { lwMsg('Увеличь массу груза: в каждом следующем пуске она должна быть больше.', 1); break; }
      if (st === 'exp2') {
        if (Math.abs(S.l2 - S.l1) < 3) { lwMsg(`Передвинь цилиндры хотя бы на 3 см от прежних ${S.l1} см — иначе момент инерции почти не изменится.`, 1); break; }
        if (!(Math.abs(lwNum(S.rl2) - S.l2 / 100) <= .0006)) { lwMsg(`Запиши новое l в метрах: ${S.l2} см = ? м.`, 1); break; }
      }
      S.wound = true; L2V.s = 0; L2V.tShow = null; l2Save(); render(); break;
    }
    case 'go1': {
      if (!S.wound || L2V.anim) break; const st = l2St(), run = l2Run(S, S.plates, st === 'exp2' ? S.l2 : S.l1);
      b.disabled = true; lwMsg('Груз опускается…');
      l2Animate(run, () => { S.wound = false; S.cur = { exp: st === 'exp2' ? 2 : 1, m: run.m, t: run.t, plates: S.plates, rm: '', rt: '' }; l2Save(); render(); });
      break;
    }
    case 'record': {
      const cur = S.cur; if (!cur) break; const bad = [];
      if (!(Math.abs(lwNum(cur.rm) - cur.m) <= .0005)) bad.push(`m — масса груза ${f1(cur.m * 1000, 0)} г в килограммах`);
      if (!(Math.abs(lwNum(cur.rt) - cur.t) <= .0015)) bad.push('t — перепиши показание секундомера (три знака после запятой)');
      if (bad.length) { lwMsg('Не совпадает: ' + bad.join('; ') + '.', 1); break; }
      (cur.exp === 2 ? S.ex2 : S.runs).push({ m: cur.m, rt: lwNum(cur.rt), plates: cur.plates });
      S.cur = null; if (cur.exp === 1 && S.plates < L2.maxPlates) S.plates++; l2Save(); render(); toast('Записано'); break;
    }
    case 'pcheck': { const o = l2Calc(), keys = L2_TABLES[d.v]; let bad = 0;
      keys.forEach(k => { const ok = l2Ok(k, lwNum(S.proc[k]), o); S.procOk[k] = ok; if (!ok) bad++; }); l2Save(); render();
      toast(bad ? `Таблица ${d.v}: ошибок — ${bad}. Красные ячейки пересчитай.` : `Таблица ${d.v} заполнена верно`, bad ? 'bad' : ''); break; }
    case 'reconcl': S.concl = l2AutoConcl(l2Calc()); l2Save(); render(); break;
    case 'cq': S.cq[d.q] = d.v; S.cqChecked = false; l2Save(); render(); break;
    case 'cqCheck': { const n = L2_CQ.filter(([, a], i) => S.cq[i] === a).length; S.cqChecked = true; S.cqOk = n >= 6; l2Save(); render();
      toast(S.cqOk ? `Защита: ${n} из ${L2_CQ.length}` : `Верно ${n} из ${L2_CQ.length} — нужно 6.`, S.cqOk ? '' : 'bad');
      if (S.cqOk && !S.done) { S.done = true; l2Save(); addXP(100, 'Лабораторная работа'); } break; }
    case 'print': window.print(); break;
    case 'restart': if (confirm('Начать лабораторную работу № 2 заново? Записи и таблицы будут очищены.')) { L2S = l2Fresh(); l2Save(); location.hash = 'lw-2'; render(); } break;
  }
});
