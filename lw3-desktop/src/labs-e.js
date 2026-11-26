/* =====================================================================
   «Физпрактикум»: ЛР 4–8 (электричество и магнетизм) — общий движок.
   Как в ЛР 1–3: допуск → подготовка установки → опыты (курсант сам настраивает приборы,
   читает показания и записывает их; программа сверяет записи с тем, что показывали приборы)
   → обработка (таблицы проверяются) → выводы и защита → отчёт по бланку кафедры.
   Описания работ по методичке — labs-e-defs.js (LE[4] … LE[8]).
   Общий для программы на компьютере и на телефоне. Действия — data-le, поля ввода — .lei[data-ke].
   ===================================================================== */
const LE = {};                 // n → описание работы
const LE_KEYS = {};            // n → ключ хранения (подставляет оболочка через setKey)
let LES = null;                // состояние открытой работы 4–8
const leFix = (v, d) => Number.isFinite(v) ? v.toFixed(d).replace('.', ',') : '—';
const leSig = (v, n = 4) => Number.isFinite(v) ? (+v.toPrecision(n)).toString().replace('.', ',') : '—';
const leSteps = D => [['admit', 'Допуск'], ['prep', 'Подготовка'], ...D.exps.map(e => [e.id, e.tab]), ['proc', 'Обработка'], ['concl', 'Выводы'], ['report', 'Отчёт']];

/* ---------- состояние ---------- */
function leFresh(n) {
  const D = LE[n];
  return { v: 1, n, step: 0, max: 0, admit: {}, admitOk: false, cq: {}, cqOk: false,
    p: D.hidden(), rig: D.rig0 ? D.rig0() : {}, inp: {}, prepOk: false, rows: {}, extra: {},
    proc: {}, procOk: {}, concl: '', fio: '', group: '', date: new Date().toLocaleDateString('ru-RU'), done: false };
}
function leLoad(n) {
  if (LES && LES.n === n && LES._k === LE_KEYS[n]) return LES;
  let S = null; try { S = JSON.parse(localStorage.getItem(LE_KEYS[n]) || 'null'); } catch (e) { S = null; }
  if (!S || S.v !== 1 || S.n !== n) S = leFresh(n);
  S._k = LE_KEYS[n]; LES = S; return S;
}
function leSave() { if (!LES) return; try { localStorage.setItem(LES._k || LE_KEYS[LES.n], JSON.stringify(LES)); } catch (e) {} }
const leSt = (S = LES) => LE[S.n].steps[S.step][0];
const leRows = (S, id) => S.rows[id] || (S.rows[id] = []);
const leIn = (k, val, ph = '', cls = '') => `<input class="lwi lei ${cls}" data-ke="${k}" inputmode="decimal" autocomplete="off" value="${esc(val ?? '')}" placeholder="${ph}">`;
const leNext = (label = 'Дальше') => `<button class="btn wide mt" data-le="next">${label} ${ic('chevron-right')}</button>`;
const leB = (c, label, v = '', cls = 'line', dis = false) => `<button class="btn ${cls}" data-le="ctl" data-c="${c}" data-v="${v}" ${dis ? 'disabled' : ''}>${label}</button>`;
const leKnob = (c, label, val, steps, dis = false) => `<div class="lw-screw le-knob"><span>${label}</span>${steps.map(s => `<button class="lp-btn" data-le="ctl" data-c="${c}" data-v="${-s}" ${dis ? 'disabled' : ''}>−${String(s).replace('.', ',')}</button>`).reverse().join('')}<b>${val}</b>${steps.map(s => `<button class="lp-btn" data-le="ctl" data-c="${c}" data-v="${s}" ${dis ? 'disabled' : ''}>+${String(s).replace('.', ',')}</button>`).join('')}</div>`;
const leField = (ctl = '') => `<section class="lw-stage"><canvas id="le-cv" aria-label="Лабораторная установка"></canvas>${ctl ? `<div class="lw-ctl">${ctl}</div>` : ''}</section>`;
const leCard = (title, body) => `<section class="card"><b class="h">${title}</b>${body}</section>`;

/* ---------- экраны шагов ---------- */
function lePrepView() {
  const S = LES, D = LE[S.n];
  return D.prep.view(S) + leField(`${D.prep.ctl(S)}<p class="lw-msg" id="lw-msg">${S.prepOk ? 'Подготовка выполнена.' : ''}</p>
    <button class="btn wide" data-le="prepCheck">${ic('circle-check')} Проверить</button>${S.prepOk ? leNext(`К опыту: ${D.exps[0].tab.toLowerCase()}`) : ''}`);
}
function leExpView(id) {
  const S = LES, D = LE[S.n], E = D.exps.find(e => e.id === id), rows = leRows(S, id), need = E.need, k = rows.length, full = k >= need;
  const done = full && (!E.extra || E.extra.ok(S));
  const ready = !full && E.ready ? E.ready(S) : null;              // null — можно записывать, строка — подсказка
  const inputs = E.cols.map(c => `<label>${c.label}${leIn('r_' + id + '_' + c.k, S.inp['r_' + id + '_' + c.k], c.ph)}</label>`).join('');
  const rec = full ? '' : `<div class="lw-ctl-row le-rec">${inputs}<button class="btn" data-le="record" data-v="${id}" ${ready ? 'disabled' : ''}>${ic('pencil')} Записать</button></div>`;
  const idx = D.exps.indexOf(E), nextLab = idx < D.exps.length - 1 ? `К опыту: ${D.exps[idx + 1].tab.toLowerCase()}` : 'К обработке';
  const ctl = (full ? '' : E.ctl(S)) + rec + `<p class="lw-msg" id="lw-msg">${full ? (done ? 'Измерения выполнены.' : '') : esc(ready || E.hint(S, k) || '')}</p>` + (done ? leNext(nextLab) : '');
  const rl = i => (E.rowLabel ? E.rowLabel(i) : i + 1);
  const tbl = `<table class="lw-tbl"><tr><th>${E.rowHead || '№'}</th>${E.cols.map(c => `<th>${c.th || c.label}</th>`).join('')}</tr>${Array.from({ length: need }, (_, i) => rows[i]
    ? `<tr><td>${rl(i)}</td>${E.cols.map(c => `<td>${leFix(rows[i][c.k], c.d)}</td>`).join('')}</tr>`
    : `<tr class="${i === k ? 'now' : ''}"><td>${rl(i)}</td>${E.cols.map(() => '<td></td>').join('')}</tr>`).join('')}</table>`;
  return `<section class="card lw-cond"><b class="h">${E.title}</b><p class="mute small">${E.desc(S)}</p></section>` + leField(ctl)
    + `<section class="card"><b class="h">${E.tableTitle || 'Записи'}</b><div class="lw-scroll">${tbl}</div></section>`
    + (full && E.extra ? leCard(E.extra.title, E.extra.view(S) + `<p class="lw-msg" id="lw-msg2"></p>`) : '');
}
function leOk(D, key, u, o) {
  const e = o[key]; if (!Number.isFinite(u) || !Number.isFinite(e)) return false;
  const t = (D.tol && D.tol(key, o)) || {}; const rel = t.rel ?? .012, abs = t.abs ?? 0;
  return Math.abs(u - e) <= Math.max(abs, Math.abs(e) * rel);
}
function leProcView() {
  const S = LES, D = LE[S.n], o = D.calc(S), P = S.proc;
  const cls = k => S.procOk[k] === true ? 'ok' : S.procOk[k] === false ? 'bad' : '', I = (k, ph = '') => leIn('p_' + k, P[k], ph, cls(k));
  const all = Object.keys(D.tables).every(t => D.tables[t].every(k => S.procOk[k] === true));
  return D.procView(S, o, I) + `<p class="lw-msg" id="lw-msg"></p>${all ? leNext('К выводам') : '<p class="mute small center">Когда все таблицы будут верны, откроются выводы.</p>'}`;
}
const lePCheck = t => `<button class="btn line wide mt" data-le="pcheck" data-v="${t}">${ic('circle-check')} Проверить таблицу ${t}</button>`;
function leView(n) {
  const D = LE[n], v = { prep: lePrepView, proc: leProcView };
  D.exps.forEach(e => { v[e.id] = () => leExpView(e.id); });
  return v;
}

/* ---------- рисование установки ---------- */
function leDraw() {
  const cv = $('#le-cv'); if (!cv || !LES) return; const D = LE[LES.n];
  const box = cv.getBoundingClientRect(), cssW = box.width || 580, dpr = Math.min(2.5, devicePixelRatio || 1), k = cssW / 580;
  if (cv.width !== Math.round(cssW * dpr)) { cv.width = Math.round(cssW * dpr); cv.height = Math.round(452 * k * dpr); }
  const c = cv.getContext('2d'); c.setTransform(dpr * k, 0, 0, dpr * k, 0, 0);
  let g; const bgi = typeof L2_BG !== 'undefined' && L2_BG && L2_BG.complete && L2_BG.naturalWidth ? L2_BG : null;
  if (bgi) { const hh = bgi.naturalHeight * 580 / bgi.naturalWidth, y0 = 432 - (bgi.edge ?? 1) * hh; c.fillStyle = bgi.top || '#0F2237'; c.fillRect(0, 0, 580, 452); c.drawImage(bgi, 0, y0, 580, hh); }
  else { g = c.createLinearGradient(0, 0, 0, 452); g.addColorStop(0, '#16263C'); g.addColorStop(1, '#0E1A2B'); c.fillStyle = g; c.fillRect(0, 0, 580, 452); }
  // стол
  const lt = typeof L3_THEME !== 'undefined' && L3_THEME === 'light';
  g = c.createLinearGradient(0, 300, 0, 452); g.addColorStop(0, lt ? 'rgba(214,222,232,.85)' : 'rgba(70,82,100,.55)'); g.addColorStop(1, lt ? 'rgba(186,197,211,.92)' : 'rgba(30,38,50,.75)'); c.fillStyle = g; c.fillRect(0, 312, 580, 140);
  c.fillStyle = 'rgba(255,255,255,.12)'; c.fillRect(0, 312, 580, 2);
  D.draw(c, LES, leSt());
}
const leTx = () => (typeof l2Tx === 'function' ? l2Tx() : '#C9D4E3');
const leAcc = () => (typeof L3_THEME !== 'undefined' && L3_THEME === 'light' ? '#A35F00' : '#F2B544');   // подписи-подсказки на сцене
const leSprite = k => (typeof l3Spr === 'function' ? l3Spr(k) : null);
function leRR(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
function leImg(c, k, x, y, w, fallback) {                         // картинка прибора; без неё — простой корпус
  const im = leSprite(k); if (im) { const h = w * im.naturalHeight / im.naturalWidth; c.drawImage(im, x, y, w, h); return h; }
  const h = w * (fallback || .6); const g = c.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, '#C7D0DC'); g.addColorStop(1, '#7D8A9C'); c.fillStyle = g; leRR(c, x, y, w, h, 8); c.fill();
  c.strokeStyle = 'rgba(0,0,0,.35)'; c.lineWidth = 1; c.stroke(); return h;
}
function leLcd(c, x, y, w, h, txt, unit = '', on = true) {
  c.fillStyle = '#0A1610'; leRR(c, x, y, w, h, 4); c.fill(); c.strokeStyle = 'rgba(0,0,0,.6)'; c.lineWidth = 1; c.stroke();
  if (!on) return; const uw = unit ? Math.max(14, unit.length * h * .26 + 4) : 0;
  c.fillStyle = '#7CF29B'; c.font = `700 ${Math.round(h * .62)}px ui-monospace, "Golos UI", monospace`; c.textAlign = 'right'; c.textBaseline = 'middle'; c.fillText(txt, x + w - 5 - uw, y + h / 2 + 1);
  if (unit) { c.fillStyle = '#9FE7B4'; c.font = `600 ${Math.round(h * .34)}px "Golos UI", system-ui`; c.textAlign = 'left'; c.fillText(unit, x + w - uw - 1, y + h / 2 + 2); }
}
function leText(c, t, x, y, { size = 10, align = 'center', color, weight = 600 } = {}) { c.fillStyle = color || leTx(); c.font = `${weight} ${size}px "Golos UI", system-ui`; c.textAlign = align; c.textBaseline = 'middle'; c.fillText(t, x, y); }
function leWire(c, pts, col = '#E5484D') {                        // провод через точки
  c.strokeStyle = 'rgba(0,0,0,.35)'; c.lineWidth = 4; c.lineCap = 'round'; c.lineJoin = 'round';
  const path = () => { c.beginPath(); c.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) { const [x0, y0] = pts[i - 1], [x1, y1] = pts[i]; c.bezierCurveTo(x0, (y0 + y1) / 2 + 18, x1, (y0 + y1) / 2 + 18, x1, y1); } };
  path(); c.stroke(); c.strokeStyle = col; c.lineWidth = 2.2; path(); c.stroke();
  c.fillStyle = col; [pts[0], pts[pts.length - 1]].forEach(([x, y]) => { c.beginPath(); c.arc(x, y, 3, 0, 7); c.fill(); });
}
/* мультиметр: картинка и табло; возвращает точки гнёзд */
function leMM(c, x, y, w, txt, unit, label, on = true, mode = '') {
  const h = leImg(c, 'multimeter', x, y, w, 1.66);
  leLcd(c, x + w * .1, y + h * .06, w * .8, h * .18, on ? txt : '', unit, on);
  if (mode) leText(c, mode, x + w / 2, y + h * .3, { size: 8.5, color: '#E8EEF6' });
  if (label) leText(c, label, x + w / 2, y + h + 9, { size: 10, weight: 700 });
  return { a: [x + w * .3, y + h * .86], b: [x + w * .7, y + h * .86] };
}
/* миниблок с надписью */
function leBlock(c, x, y, w, lines, label) {
  const h = leImg(c, 'miniblock', x, y, w, .65);
  lines.forEach((t, i) => leText(c, t, x + w * .47, y + h * (.36 + i * .15), { size: 10, color: '#1D2633', weight: i ? 600 : 800 }));
  if (label) leText(c, label, x + w / 2, y + h + 8, { size: 9.5 });
  return { a: [x + w * .06, y + h * .33], b: [x + w * .95, y + h * .33], h };
}

/* ---------- отчёт по бланку кафедры: 4 листа А4 ---------- */
function leReportHtml(n) {
  const S = LES, D = LE[n], o = D.calc(S), ln = v => `<span class="ul">${esc(v || '')}</span>`, [dd, mon, yy] = String(S.date || '').split('.');
  const MON = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
  const equip = D.equip(S);
  const p1 = `<section class="lwp"><p class="c b">${LAB_DEPT}</p><hr>
    <p class="row">Оценка ${ln('')} Подпись преподавателя ${ln('')}</p>
    <p class="row">Курсант (курсант) ${ln(S.fio)} Класс <span class="ul s">${esc(S.group || '')}</span></p>
    <p class="row">Дата выполнения «<span class="ul s">${esc(dd || '')}</span>» <span class="ul m">${MON[(+mon || 1) - 1]}</span> 20<span class="ul s">${esc((yy || '').slice(2))}</span> г.</p>
    <p class="c mt2">ОТЧЕТ<br>по лабораторной работе № <span class="ul s">${n}</span></p>
    <p class="row">Наименование ${ln(D.title)}</p>
    <p class="row">Цель ${ln(D.aim)}</p>
    <p class="c b mt2">ОБОРУДОВАНИЕ И ПРИБОРЫ</p>
    <table><tr><th>№ п.п.</th><th>Наименование</th><th>Предел измерения</th><th>Погрешность измерения</th></tr>
    ${Array.from({ length: Math.max(8, equip.length) }, (_, i) => `<tr><td>${equip[i] ? i + 1 : ''}</td><td class="l">${equip[i] ? esc(equip[i][0]) : '&nbsp;'}</td><td>${equip[i] ? esc(equip[i][1]) : ''}</td><td>${equip[i] ? esc(equip[i][2]) : ''}</td></tr>`).join('')}</table></section>`;
  const p2 = `<section class="lwp"><p class="c b">СХЕМА УСТАНОВКИ</p>${D.scheme()}<p class="small">${D.schemeCap}</p><hr>
    <p class="c b">РЕЗУЛЬТАТЫ ИЗМЕРЕНИЯ</p>${D.results(S, o)}
    <p class="row sign">Подпись зав. кабинетом ${ln('')}</p></section>`;
  const p3 = `<section class="lwp"><p class="c b">РАСЧЕТНЫЕ ФОРМУЛЫ ИСКОМЫХ ВЕЛИЧИН И ПОГРЕШНОСТЕЙ</p><div class="fm">${D.formulas}</div><hr>
    <p class="c b">ВЫЧИСЛЕНИЕ РЕЗУЛЬТАТОВ ИЗМЕРЕНИЯ И ПОГРЕШНОСТЕЙ</p>${D.calcText(S, o)}</section>`;
  const p4 = `<section class="lwp"><p class="c b">ПОСТРОЕНИЕ ГРАФИКОВ</p>${D.graph(S, o)}<p class="small c">${D.graphCap}</p>
    <p class="c b mt2">ВЫВОДЫ ПО ПРОДЕЛАННОЙ РАБОТЕ</p><p class="concl">${esc(S.concl).replace(/\n/g, '<br>')}</p>
    <p class="row sign">Подпись исполнителя ${ln('')}</p></section>`;
  return p1 + p2 + p3 + p4;
}
/* график: точки и линии в осях; series: [{pts:[[x,y]], col, line:true|false, dash, mark:'c'|'s', name}] */
function leGraphSvg({ series, xl, yl, x0 = 0, y0 = 0, xmax, ymax, xmin, ymin }) {
  const all = series.flatMap(s => s.pts); const Xmax = xmax ?? Math.max(...all.map(p => p[0])) * 1.1, Ymax = ymax ?? Math.max(...all.map(p => p[1])) * 1.15;
  const Xmin = xmin ?? x0, Ymin = ymin ?? y0;
  const X = v => 56 + (v - Xmin) / (Xmax - Xmin) * 454, Y = v => 270 - (v - Ymin) / (Ymax - Ymin) * 250;
  const grid = Array.from({ length: 24 }, (_, i) => `<line x1="${56 + i * 19.7}" y1="20" x2="${56 + i * 19.7}" y2="270" stroke="#bbb" stroke-width=".5"/>`).join('') + Array.from({ length: 13 }, (_, i) => `<line x1="56" y1="${30 + i * 20}" x2="510" y2="${30 + i * 20}" stroke="#bbb" stroke-width=".5"/>`).join('');
  const ticks = [0, .25, .5, .75, 1].map(f => `<text x="${X(Xmin + (Xmax - Xmin) * f)}" y="286" font-size="10" text-anchor="middle">${leSig(Xmin + (Xmax - Xmin) * f, 3)}</text><text x="50" y="${Y(Ymin + (Ymax - Ymin) * f) + 3}" font-size="10" text-anchor="end">${leSig(Ymin + (Ymax - Ymin) * f, 3)}</text>`).join('');
  const body = series.map(s => {
    const line = s.line ? `<polyline points="${s.pts.map(p => `${X(p[0])},${Y(p[1])}`).join(' ')}" fill="none" stroke="${s.col}" stroke-width="1.6" ${s.dash ? 'stroke-dasharray="6 4"' : ''}/>` : '';
    const marks = s.mark === 'none' ? '' : s.pts.map(([x, y]) => s.mark === 's' ? `<rect x="${X(x) - 4}" y="${Y(y) - 4}" width="8" height="8" fill="${s.col}"/>` : `<circle cx="${X(x)}" cy="${Y(y)}" r="4" fill="${s.col}"/>`).join('');
    return line + marks; }).join('');
  const legend = series.filter(s => s.name).map((s, i) => `<rect x="${330}" y="${26 + i * 16}" width="10" height="10" fill="${s.col}"/><text x="346" y="${35 + i * 16}" font-size="11">${esc(s.name)}</text>`).join('');
  return `<svg class="lwr-svg" viewBox="0 0 540 300">${grid}<line x1="56" y1="270" x2="515" y2="270" stroke="#000"/><line x1="56" y1="270" x2="56" y2="15" stroke="#000"/>${ticks}
    <text x="515" y="262" font-size="12" text-anchor="end">${xl}</text><text x="62" y="18" font-size="12">${yl}</text>${body}${legend}</svg>`;
}
const leTbl = (head, rows, cls = 'tight') => `<table class="${cls}"><tr>${head.map(h => `<th>${h}</th>`).join('')}</tr>${rows.map(r => `<tr>${r.map(v => `<td>${v}</td>`).join('')}</tr>`).join('')}</table>`;

/* ---------- сводка «что рассказать на защите» ---------- */
function leSummaryHtml(n, S) {
  const D = LE[n], keep = LES; LES = S; let o, s; try { o = D.calc(S); s = D.sum(S, o); } finally { LES = keep; }
  return `<div class="sum">${S.demo ? `<p class="pill warn">${ic('circle-x')} Демо-прохождение: выполнено программой автоматически, не работа курсанта</p>` : ''}
    ${sumBox('target', 'Что делали', `<p>${s.what}</p>`)}
    ${sumBox('grid-3x3', 'Мои результаты', s.res)}
    ${sumBox('circle-check', 'Вывод', `<p>${s.concl}</p>`)}
    ${sumBox('rotate-cw', s.whyT || 'Откуда формула', `<p>${s.why}</p>`)}
    ${sumBox('file-text', 'Откуда расхождение', `<p>${s.err}</p>`)}
    ${sumBox('graduation-cap', 'Могут спросить', sumQa(s.qs.map(i => i < 0 ? D.admit[-i - 1] : D.cq[i]).filter(Boolean)))}</div>`;
}

/* ---------- регистрация в реестре работ ---------- */
function leRegister(n, D) {
  LE[n] = D; D.no = n; D.steps = leSteps(D);
  LABS[n] = { no: n, act: 'le', short: D.short, title: D.title, aim: D.aim, icon: D.icon, steps: D.steps, live: ['prep', ...D.exps.map(e => e.id)],
    key: id => workKey(id) + '-' + n, setKey(k) { LE_KEYS[n] = k; if (LES && LES.n === n) LES = null; },
    S: () => (LES && LES.n === n ? LES : null), load: () => leLoad(n), save: leSave, swap(S) { const k = LES; LES = S; return () => { LES = k; }; },
    admit: D.admit, cq: D.cq, text: D.text, hod: D.hod, scheme: () => D.scheme(), report: () => leReportHtml(n),
    inp: (k, v, ph) => `<input class="lwi lei txt inp" data-ke="${k}" value="${esc(v || '')}" placeholder="${ph}" autocomplete="off">`,
    ta: v => `<textarea class="lw-ta lei inp" data-ke="concl" rows="14">${esc(v)}</textarea>`, autoConcl: () => D.concl(LES, D.calc(LES)),
    view: leView(n), after(st) { if (this.live.includes(st)) { leDraw(); if (!leDraw.ro && 'ResizeObserver' in window) leDraw.ro = new ResizeObserver(() => leDraw()); const cv = $('#le-cv'); if (leDraw.ro && cv) { leDraw.ro.disconnect(); leDraw.ro.observe(cv); } leLive(); } },
    result: () => D.result(D.calc(LES)), nums: () => D.nums(D.calc(LES)),
    sig: S => Object.values(S.rows || {}).flat().map(r => Object.values(r).join('/')).join(';') };
}
const leHodNow = (S, st) => (LE[S.n].hodNow && LE[S.n].hodNow(S, st)) || 0;

/* ---------- ввод и действия ---------- */
document.addEventListener('input', e => {
  const el = e.target.closest && e.target.closest('.lei'); if (!el || !LES) return;
  const k = el.dataset.ke;
  if (k.startsWith('p_')) { LES.proc[k.slice(2)] = el.value; delete LES.procOk[k.slice(2)]; el.classList.remove('ok', 'bad'); }
  else if (['fio', 'group', 'date', 'concl'].includes(k)) LES[k] = el.value;
  else LES.inp[k] = el.value;
  leSave();
});
function leGo(i) { LES.step = Math.max(0, Math.min(i, LES.max)); leSave(); render(); if (ui.main) ui.main.scrollTop = 0; }
function leAdvance() { LES.max = Math.max(LES.max, LES.step + 1); LES.step++; leSave(); render(); if (ui.main) ui.main.scrollTop = 0; }
document.addEventListener('click', e => {
  const b = e.target.closest && e.target.closest('[data-le]'); if (!b || !LE[LAB]) return; const n = LAB, D = LE[n], S = leLoad(n), d = b.dataset;
  switch (d.le) {
    case 'go': leGo(+d.v); break;
    case 'next': leAdvance(); break;
    case 'admit': S.admit[d.q] = d.v; S.admitChecked = false; leSave(); render(); break;
    case 'admitCheck': { const n2 = D.admit.filter(([, a], i) => S.admit[i] === a).length; S.admitChecked = true; S.admitOk = n2 >= 6; leSave(); render();
      toast(S.admitOk ? `Допуск сдан: ${n2} из ${D.admit.length}` : `Верно ${n2} из ${D.admit.length} — нужно 6. Перечитай теорию и попробуй снова.`, S.admitOk ? '' : 'bad'); break; }
    case 'ctl': { const st = leSt(S), msg = D.act(S, d.c, d.v, st); leSave(); render(); if (msg) lwMsg(msg, 1); break; }
    case 'prepCheck': { const bad = D.prep.check(S); if (bad.length) { S.prepOk = false; leSave(); render(); lwMsg('Не совпадает: ' + bad.join('; ') + '.', 1); break; }
      S.prepOk = true; leSave(); render(); toast('Подготовка выполнена'); break; }
    case 'record': {
      const id = d.v, E = D.exps.find(x => x.id === id), rows = leRows(S, id), why = E.ready ? E.ready(S) : null; if (why) { lwMsg(why, 1); break; }
      const tru = E.truth(S), bad = [], row = {};
      E.cols.forEach(c => { const u = lwNum(S.inp['r_' + id + '_' + c.k]); row[c.k] = u;
        if (!(Math.abs(u - tru[c.k]) <= c.tol + 1e-9)) bad.push(c.err || `${c.label.replace(/,.*$/, '')} — перепиши показание прибора`); });
      if (!bad.length && E.check) { const m = E.check(S, rows, row); if (m) bad.push(m); }
      if (bad.length) { lwMsg('Не совпадает: ' + bad.join('; ') + '.', 1); break; }
      rows.push(row); E.cols.forEach(c => { delete S.inp['r_' + id + '_' + c.k]; }); if (E.onRecord) E.onRecord(S, row);
      leSave(); render(); toast('Записано'); break;
    }
    case 'extra': { const E = D.exps.find(x => x.id === d.v), m = E.extra.check(S); leSave(); render();
      if (m) { const el = $('#lw-msg2'); if (el) { el.textContent = 'Не совпадает: ' + m + '.'; el.className = 'lw-msg bad'; } } else toast('Записано'); break; }
    case 'pick': S.proc[d.k] = d.v; delete S.procOk[d.k]; leSave(); render(); break;
    case 'pcheck': { const o = D.calc(S), keys = D.tables[d.v]; let bad = 0;
      keys.forEach(k => { const ok = D.check && D.check(k, S, o) !== undefined ? D.check(k, S, o) : leOk(D, k, lwNum(S.proc[k]), o); S.procOk[k] = ok; if (!ok) bad++; }); leSave(); render();
      toast(bad ? `Таблица ${d.v}: ошибок — ${bad}. Красные ячейки пересчитай.` : `Таблица ${d.v} заполнена верно`, bad ? 'bad' : ''); break; }
    case 'reconcl': S.concl = D.concl(S, D.calc(S)); leSave(); render(); break;
    case 'cq': S.cq[d.q] = d.v; S.cqChecked = false; leSave(); render(); break;
    case 'cqCheck': { const n2 = D.cq.filter(([, a], i) => S.cq[i] === a).length; S.cqChecked = true; S.cqOk = n2 >= 6; leSave(); render();
      toast(S.cqOk ? `Защита: ${n2} из ${D.cq.length}` : `Верно ${n2} из ${D.cq.length} — нужно 6.`, S.cqOk ? '' : 'bad');
      if (S.cqOk && !S.done) { S.done = true; leSave(); addXP(100, 'Лабораторная работа'); } break; }
    case 'print': window.print(); break;
    case 'restart': if (confirm(`Начать лабораторную работу № ${n} заново? Записи и таблицы будут очищены.`)) { const keep = { dx: S.dx, fio: S.fio, group: S.group }; LES = Object.assign(leFresh(n), { _k: LE_KEYS[n] }, keep); if (LES.dx) LES.dx = { t: {} }; leSave(); render(); } break;
  }
});

/* =====================================================================
   Живая установка (ЛР 9–14): непрерывная анимация, звук и управление мышью на самой установке.
   Работа описывает D.live = { tick(S, dt, st) → 'render' | undefined, knobs(S, st) → [{c, x, y, r, step, fine}],
   hits(S, st) → [{c, v, x, y, w, h}] }. Ручки крутятся перетаскиванием вверх-вниз и колесом мыши,
   кнопки на приборах нажимаются щелчком. Всё — через D.act, как кнопки под установкой.
   ===================================================================== */
const LEA = { raf: 0, last: 0, drag: null, wheelT: 0, ac: null, mute: false, lite: false, slow: 0 };
try { LEA.mute = localStorage.getItem('fz-mute') === '1'; } catch (e) {}
function leLive() {
  const D = LE[LAB]; if (!D || !D.live || !LES) return;
  if (LEA.raf) return;                                   // цикл уже идёт: подхватит новый холст сам
  const step = t => {
    const cv = $('#le-cv'), D2 = LE[LAB];
    if (!cv || !LES || !D2 || !D2.live || SCREEN !== 'work') { LEA.raf = 0; LEA.last = 0; return; }
    const dt = LEA.last ? Math.min(.1, (t - LEA.last) / 1000) : 0; LEA.last = t;
    if (dt > .045) { if (++LEA.slow > 40) LEA.lite = true; } else LEA.slow = Math.max(0, LEA.slow - 1);   // слабый компьютер — облегчённый режим
    let r; try { r = D2.live.tick ? D2.live.tick(LES, dt, leSt()) : undefined; } catch (e) { r = undefined; }
    leLiveBind(cv); leDraw();
    if (r === 'render' && !LEA.drag) { leSave(); render(); }
    LEA.raf = requestAnimationFrame(step);
  };
  LEA.raf = requestAnimationFrame(step);
}
/* координаты указателя в системе установки (ширина 580) */
function lePt(cv, e) { const b = cv.getBoundingClientRect(), k = 580 / b.width; return [(e.clientX - b.left) * k, (e.clientY - b.top) * k]; }
function leHit(S, x, y) {
  const D = LE[LAB], st = leSt(S);
  const kn = (D.live.knobs ? D.live.knobs(S, st) : []).find(o => Math.hypot(x - o.x, y - o.y) <= o.r + 4);
  if (kn) return { kind: 'knob', o: kn };
  const ht = (D.live.hits ? D.live.hits(S, st) : []).find(o => x >= o.x && x <= o.x + o.w && y >= o.y && y <= o.y + o.h);
  return ht ? { kind: 'hit', o: ht } : null;
}
function leLiveAct(c, v) { const D = LE[LAB], S = LES; const m = D.act(S, c, v, leSt(S)); leSave(); return m; }
function leLiveBind(cv) {
  if (cv._live) return; cv._live = true; cv.style.touchAction = 'none';
  cv.addEventListener('pointermove', e => {
    if (!LES || !LE[LAB] || !LE[LAB].live) return; const [x, y] = lePt(cv, e);
    if (LEA.drag) { const d = LEA.drag, n = Math.trunc((d.y0 - y) / 7); if (n !== d.n) { const k = n - d.n; d.n = n; for (let i = 0; i < Math.abs(k); i++) { const m = leLiveAct(d.o.c, String(Math.sign(k) * d.o.step)); if (m) d.msg = m; } } return; }
    const h = leHit(LES, x, y); cv.style.cursor = h ? (h.kind === 'knob' ? 'ns-resize' : 'pointer') : '';
  });
  cv.addEventListener('pointerdown', e => {
    if (!LES || !LE[LAB] || !LE[LAB].live) return; leSndInit(); const [x, y] = lePt(cv, e), h = leHit(LES, x, y); if (!h) return;
    e.preventDefault();
    if (h.kind === 'knob') { LEA.drag = { o: h.o, y0: y, n: 0 }; try { cv.setPointerCapture(e.pointerId); } catch (er) {} return; }
    const m = leLiveAct(h.o.c, h.o.v ?? ''); leSnd.tick(); render(); if (m) lwMsg(m, 1);
  });
  const up = () => { if (!LEA.drag) return; const m = LEA.drag.msg; LEA.drag = null; render(); if (m) lwMsg(m, 1); };
  cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
  cv.addEventListener('wheel', e => {
    if (!LES || !LE[LAB] || !LE[LAB].live) return; const [x, y] = lePt(cv, e), h = leHit(LES, x, y); if (!h || h.kind !== 'knob') return;
    e.preventDefault(); const m = leLiveAct(h.o.c, String((e.deltaY < 0 ? 1 : -1) * h.o.step)); leSnd.tick(.25);
    clearTimeout(LEA.wheelT); LEA.wheelT = setTimeout(() => { render(); if (m) lwMsg(m, 1); }, 350);
  }, { passive: false });
}
/* ручка прибора на холсте: корпус, риска, подпись */
function leDrawKnob(c, o, ang, label) {
  const { x, y, r } = o, g = c.createRadialGradient(x - r * .3, y - r * .3, r * .1, x, y, r);
  g.addColorStop(0, '#5B6577'); g.addColorStop(1, '#1D232E'); c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, 7); c.fill();
  c.strokeStyle = 'rgba(255,255,255,.18)'; c.lineWidth = 1; c.stroke();
  for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2; c.strokeStyle = 'rgba(0,0,0,.45)'; c.beginPath(); c.moveTo(x + Math.cos(a) * r * .82, y + Math.sin(a) * r * .82); c.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); c.stroke(); }
  c.strokeStyle = '#F2B544'; c.lineWidth = 2.4; c.lineCap = 'round'; c.beginPath(); c.moveTo(x + Math.cos(ang) * r * .2, y + Math.sin(ang) * r * .2); c.lineTo(x + Math.cos(ang) * r * .78, y + Math.sin(ang) * r * .78); c.stroke();
  if (label) leText(c, label, x, y + r + 10, { size: 9, color: '#C9D4E3' });
}
/* кнопка на панели прибора */
function leDrawBtn(c, o, label, on = false, col = '#2B3443') {
  c.fillStyle = on ? '#3FD27F' : col; leRR(c, o.x, o.y, o.w, o.h, 5); c.fill(); c.strokeStyle = 'rgba(0,0,0,.5)'; c.lineWidth = 1; c.stroke();
  leText(c, label, o.x + o.w / 2, o.y + o.h / 2 + .5, { size: 9, color: on ? '#0B1F12' : '#E8EEF6', weight: 700 });
}
/* звук установки: щелчки счётчика и кнопок — синтез в программе, файлы не нужны */
function leSndInit() { if (LEA.ac || LEA.mute) return; try { const A = window.AudioContext || window.webkitAudioContext; if (A) LEA.ac = new A(); } catch (e) {} }
const leSnd = {
  click(vol = .5, when = 0) {                            // щелчок счётчика Гейгера: короткий шумовой импульс
    const ac = LEA.ac; if (!ac || LEA.mute) return; const t = ac.currentTime + when, n = Math.floor(ac.sampleRate * .004);
    if (!leSnd.buf || leSnd.buf.sampleRate !== ac.sampleRate) { leSnd.buf = ac.createBuffer(1, n, ac.sampleRate); const d = leSnd.buf.getChannelData(0); for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 3); }
    const s = ac.createBufferSource(), g = ac.createGain(), f = ac.createBiquadFilter(); s.buffer = leSnd.buf; f.type = 'highpass'; f.frequency.value = 900;
    g.gain.value = vol; s.connect(f); f.connect(g); g.connect(ac.destination); s.start(t);
  },
  tick(vol = .15) {                                      // щелчок кнопки или ручки
    const ac = LEA.ac; if (!ac || LEA.mute) return; const o = ac.createOscillator(), g = ac.createGain(), t = ac.currentTime;
    o.frequency.value = 1800; g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.001, t + .03); o.connect(g); g.connect(ac.destination); o.start(t); o.stop(t + .04);
  },
  beep(freq = 880, dur = .12, vol = .12) {
    const ac = LEA.ac; if (!ac || LEA.mute) return; const o = ac.createOscillator(), g = ac.createGain(), t = ac.currentTime;
    o.frequency.value = freq; g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.001, t + dur); o.connect(g); g.connect(ac.destination); o.start(t); o.stop(t + dur + .02);
  }
};
function leMuteToggle() { LEA.mute = !LEA.mute; try { localStorage.setItem('fz-mute', LEA.mute ? '1' : '0'); } catch (e) {} if (!LEA.mute) leSndInit(); }
/* случайное число событий Пуассона со средним m (для больших m — нормальное приближение) */
function lePoisson(m) {
  if (!(m > 0)) return 0;
  if (m > 40) return Math.max(0, Math.round(m + Math.sqrt(m) * lwGauss()));
  const L = Math.exp(-m); let k = 0, p = 1; do { k++; p *= Math.random(); } while (p > L); return k - 1;
}
