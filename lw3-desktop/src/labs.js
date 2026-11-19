/* =====================================================================
   «Физпрактикум»: несколько лабораторных работ в одной программе.
   Каждая работа — модуль сайта (fizika2/src: labwork.js — ЛР 1, labwork2.js — ЛР 2, lw3-core.js — ЛР 3)
   со своими действиями (data-lw / data-l2 / data-l3) и хранением. Здесь — реестр работ, экран выбора,
   общие экраны (допуск по одному вопросу, выводы и защита, отчёт, сводка) для ЛР 1 и ЛР 2.
   ЛР 3 идёт своими экранами (desktop.js, layout2.js) — как раньше.
   ===================================================================== */
let LAB = 3;
const LABS = {
  1: { no: 1, act: 'lw', short: 'Закон сохранения импульса', icon: 'target', steps: LW1.steps, live: ['prep', 'free', 'coll2', 'coll3'],
    key: id => 'lw3d-w-' + id + '-1', setKey(k) { LW_KEY = k; LWS = null; }, S: () => LWS, load: lwLoad, save: lwSave, swap(S) { const k = LWS; LWS = S; return () => { LWS = k; }; },
    admit: LW_ADMIT, cq: LW_CQ, text: LW_TEXT, hod: LW1_HOD, scheme: () => lwSchemeSvg(), report: () => lwReportHtml(),
    inp: (k, v, ph) => `<input class="lwi txt inp" data-k="${k}" value="${esc(v || '')}" placeholder="${ph}" autocomplete="off">`,
    ta: v => `<textarea class="lw-ta inp" data-k="concl" rows="14">${esc(v)}</textarea>`, autoConcl: () => lwAutoConcl(lwCalcAll()),
    view: { prep: lwPrep, free: lwFreeStep, coll2: () => lwCollStep(2), coll3: () => lwCollStep(3), proc: lwProc },
    after(st) { if (this.live.includes(st)) { LWV.pos = null; lwDraw(); } },
    result() { const O = lwCalcAll(); return `p: ${f1(O[2].px0, 3)} → ${f1(O[2].px1, 3)}; k₂ = ${f1(O[2].k, 2)}, k₃ = ${f1(O[3].k, 2)}`; },
    nums() { const O = lwCalcAll(); return { px0: O[2].px0, px1: O[2].px1, px13: O[3].px1, k2: O[2].k, k3: O[3].k }; },
    sig: S => (S.free || []).map(r => r.r).join(';') },
  2: { no: 2, act: 'l2', short: 'Момент инерции (маятник Обербека)', icon: 'rotate-cw', steps: L2.steps, live: ['prep', 'exp1', 'exp2'],
    key: id => 'lw3d-w-' + id + '-2', setKey(k) { L2_KEY = k; L2S = null; }, S: () => L2S, load: l2Load, save: l2Save, swap(S) { const k = L2S; L2S = S; return () => { L2S = k; }; },
    admit: L2_ADMIT, cq: L2_CQ, text: L2_TEXT, hod: L2_HOD, scheme: () => l2SchemeSvg(), report: () => l2ReportHtml(),
    inp: (k, v, ph) => `<input class="lwi l2i txt inp" data-k2="${k}" value="${esc(v || '')}" placeholder="${ph}" autocomplete="off">`,
    ta: v => `<textarea class="lw-ta l2i inp" data-k2="concl" rows="14">${esc(v)}</textarea>`, autoConcl: () => l2AutoConcl(l2Calc()),
    view: { prep: l2Prep, exp1: () => l2Exp(1), exp2: () => l2Exp(2), proc: l2Proc },
    after(st) { if (this.live.includes(st)) { if (!L2V.anim) { L2V.s = (st === 'prep' || L2S.wound) ? 0 : 1; L2V.tShow = L2S.cur ? L2S.cur.t : null; } l2Draw(); l2DrawCal(); } },
    result() { const o = l2Calc(); return `J = ${l2Sig(o.Jm, 3)} ± ${l2Sig(o.dJ, 1)} кг·м² (δ = ${f1(o.dl, 1)} %)`; },
    nums() { const o = l2Calc(); return { Jm: o.Jm, dJ: o.dJ, dl: o.dl, J4: o.J4 }; },
    sig: S => (S.runs || []).map(r => r.rt).join(';') },
  3: { no: 3, act: 'l3', short: 'Показатель адиабаты', icon: 'gauge', steps: L3.steps,
    key: id => 'lw3d-w-' + id, setKey(k) { L3_KEY = k; L3S = null; }, S: () => L3S, load: l3Load, save: l3Save, swap(S) { const k = L3S; L3S = S; return () => { L3S = k; }; },
    admit: L3_ADMIT, cq: L3_CQ, text: L3_TEXT, hod: HOD, scheme: () => l3SchemeSvg(), report: () => l3ReportHtml(),
    result() { return l3Res(l3Calc()); }, nums() { const o = l3Calc(); return { gm: o.gm, dg: o.dg, eg: o.eg, e: o.e }; },
    sig: S => (S.runs || []).map(r => r.h1 + '/' + r.h2).join(';') }
};
const curLab = () => LABS[LAB];
const labTitle = n => (LW_LIST.find(w => w.id === n) || {}).title || LABS[n].short;
const labAim = n => (LW_LIST.find(w => w.id === n) || {}).aim || '';
const labDone = (L, S) => S && L.steps[S.max || 0] && L.steps[S.max || 0][0] === 'report';
/* вычисление по чужому состоянию (файл студента, демо) */
function withLabState(n, S, fn) { const back = LABS[n].swap(S); try { return fn(); } finally { back(); } }
function labState(n, id) { return store.get(LABS[n].key(id), null); }
function labStatus(n, S) { const L = LABS[n]; if (!S) return 'не начата'; if (S.done) return 'защищена'; return 'шаг ' + ((S.max || 0) + 1) + ' из ' + L.steps.length + ': ' + L.steps[Math.min(S.max || 0, L.steps.length - 1)][1].toLowerCase(); }

/* ---------- выбор работы ---------- */
function vLabs() {
  document.body.classList.add('noside'); document.body.classList.remove('full'); ui.side.innerHTML = '';
  const p = PROFILE, cards = [1, 2, 3].map(n => { const L = LABS[n], S = labState(n, p.id), n2 = L.steps.length, at = S ? Math.min((S.max || 0) + (S.done ? 1 : 0), n2) : 0;
    let res = ''; if (S && S.done) { try { res = withLabState(n, S, () => L.result()); } catch (e) { res = ''; } }
    return `<button class="labc ${S && S.done ? 'done' : ''}" data-d="lab" data-v="${n}"><span class="labc-n">ЛР ${n}</span><span class="labc-ic">${ic(L.icon)}</span>
      <b>${esc(labTitle(n))}</b><small>${esc(labStatus(n, S))}</small>${res ? `<em>${esc(res)}</em>` : ''}
      <span class="labc-bar"><i style="width:${Math.round(at / n2 * 100)}%"></i></span></button>`; }).join('');
  ui.main.innerHTML = `<div class="labs">
    <header class="labs-h"><span class="logo">γ</span><div><h1>Физпрактикум</h1><p>${esc(p.fio)}${p.group ? ' · ' + esc(p.group) : ''}</p></div><span class="sp"></span>
      ${themeBtn()}<button class="btn ghost" data-d="help">${ic('book-open')} Как проходит работа</button><button class="btn line" data-d="home">${ic('chevron-left')} Сменить студента</button></header>
    <p class="labs-t">Лабораторные работы</p><div class="labs-g">${cards}</div>
    <p class="mute small labs-f">Каждая работа сохраняется отдельно — можно выполнять в любом порядке и продолжать позже.</p></div>`;
}
function openLab(n) {
  LAB = n; const L = curLab(); L.setKey(L.key(PROFILE.id));
  const S = L.load(); ensureMeta(S); L.save(); if (n === 3) l3Reset();
  AQ = 0; CQI = 0; SCREEN = 'work'; render(); ui.main.scrollTop = 0;
}

/* ---------- общие экраны ЛР 1 и ЛР 2 ---------- */
let CQI = 0;   // текущий вопрос защиты (по одному)
function gTop(S, L) {
  const fin = L.steps[S.max][0] === 'report';
  return `<header class="tb">
    <div class="tb-brand"><button class="tb-ic" data-d="labs" title="К списку работ">${ic('chevron-left')}</button><span class="logo">γ</span><b>ЛР ${L.no}<small>${esc(L.short)}</small></b></div>
    <nav class="tb-steps">${L.steps.map(([, t], i) => { const ok = i < S.max || (i === S.max && fin && S.done), on = i === S.step;
      return `<button data-${L.act}="go" data-v="${i}" class="${on ? 'on' : ''}${ok ? ' ok' : ''}" ${i > S.max ? 'disabled' : ''}><i>${ok && !on ? '✓' : i + 1}</i><span>${t}</span></button>`; }).join('<s></s>')}</nav>
    <div class="tb-act">
      <button class="btn line tb-hod" data-d="hod" title="Ход работы (H)">${ic('clipboard-list')} Ход работы ${kbd('H')}</button>
      <span class="tb-who">${ava(S.fio || PROFILE.fio)}<span>${esc(S.fio || PROFILE.fio)}</span></span>
      <button class="tb-ic" data-d="save" title="Сохранить файл работы (Ctrl+S)">${ic('file-text')}</button>
      <button class="tb-ic" data-d="theory" title="Теория и установка">${ic('book-open')}</button>
      <button class="tb-ic" data-d="theme" title="Тема">${ic('sparkles')}</button>
    </div></header>`;
}
function gQuestion(list, S, key, i, act, seed, checked) {
  const [q, a, x] = list[i], opts = lwShuf(i + seed, [a, ...x]), ch = S[key][i];
  return `<div class="qs-n">Вопрос ${i + 1} из ${list.length}</div><h2 class="qs-q">${esc(q)}</h2>
    <div class="qs-opts">${opts.map((o, j) => `<button data-${act}="${key}" data-q="${i}" data-v="${esc(o)}" class="${ch === o ? (checked ? (o === a ? 'ok' : 'bad') : 'pick') : ''}"><span class="lt">${j + 1}</span><span>${esc(o)}</span></button>`).join('')}</div>`;
}
function gDots(list, S, key, cur, checked, nav) {
  return `<div class="qs-dots">${list.map(([, a], i) => { const ch = S[key][i]; const cls = i === cur ? 'on' : ch ? (checked ? (ch === a ? 'ok' : 'bad') : 'ans') : '';
    return `<button data-d="${nav}" data-v="${i}" class="${cls}">${i + 1}</button>`; }).join('')}<button data-d="${nav}" data-v="${list.length}" class="fin ${cur === list.length ? 'on' : ''}" title="Сдать">${ic('flag')}</button></div>`;
}
function gTheorySide(L) {
  return `<aside class="qs-side card"><div class="tabs">${[['theory', 'Теория и установка'], ['safety', 'Безопасность']].map(([k, t]) => `<button data-d="stab" data-v="${k}" class="${(TAB === 'safety' ? 'safety' : 'theory') === k ? 'on' : ''}">${t}</button>`).join('')}</div>
    <div class="read">${TAB === 'safety' ? L.text.safety : `${L.text.theory}<div class="paper-mini">${L.scheme()}</div>${L.text.equip}`}</div></aside>`;
}
function gAdmit(S, L) {
  const list = L.admit, N = list.length, answered = Object.keys(S.admit).length; AQ = Math.max(0, Math.min(N, AQ));
  const body = AQ < N
    ? gQuestion(list, S, 'admit', AQ, L.act, 40 + L.no * 20, S.admitChecked) + `<div class="qs-nav"><button class="btn ghost" data-d="aq" data-v="${AQ - 1}" ${AQ ? '' : 'disabled'}>${ic('chevron-left')} Назад</button><span class="mute small">1–4 — выбрать ответ</span>
      <button class="btn ${S.admit[AQ] ? '' : 'line'}" data-d="aq" data-v="${AQ + 1}" data-primary>${AQ === N - 1 ? 'К сдаче' : 'Дальше'} ${kbd('Enter')}</button></div>`
    : `<div class="qs-n">Сдача допуска</div><h2 class="qs-q">${S.admitOk ? 'Допуск сдан' : `Отвечено ${answered} из ${N}`}</h2>
      <p class="mute">${S.admitOk ? 'Можно переходить к подготовке установки.' : 'Нужно не меньше 6 верных ответов из 8. Вернуться к любому вопросу — кнопки с номерами вверху.'}</p>
      <div class="qs-nav"><button class="btn ghost" data-d="aq" data-v="${N - 1}">${ic('chevron-left')} Назад</button><span></span>
      ${S.admitOk ? `<button class="btn" data-${L.act}="next" data-primary>К подготовке ${kbd('Enter')}</button>` : `<button class="btn" data-${L.act}="admitCheck" data-primary ${answered ? '' : 'disabled'}>${ic('circle-check')} Сдать допуск ${kbd('Enter')}</button>`}</div>`;
  return gTop(S, L) + `<div class="qs"><div class="qs-main"><div class="qs-aim"><span class="kicker">Цель работы</span>${esc(labAim(L.no))}</div>${gDots(list, S, 'admit', AQ, S.admitChecked, 'aq')}<section class="qs-card">${body}</section></div>${gTheorySide(L)}</div>`;
}
function gConcl(S, L) {
  if (!S.concl) { S.concl = L.autoConcl(); L.save(); }
  const list = L.cq, N = list.length, answered = Object.keys(S.cq).length; CQI = Math.max(0, Math.min(N, CQI));
  const q = CQI < N
    ? gQuestion(list, S, 'cq', CQI, L.act, 70 + L.no * 20, S.cqChecked) + `<div class="qs-nav"><button class="btn ghost" data-d="cqi" data-v="${CQI - 1}" ${CQI ? '' : 'disabled'}>${ic('chevron-left')} Назад</button><span></span>
      <button class="btn ${S.cq[CQI] ? '' : 'line'}" data-d="cqi" data-v="${CQI + 1}">${CQI === N - 1 ? 'К сдаче' : 'Дальше'}</button></div>`
    : `<div class="qs-n">Защита</div><h2 class="qs-q">${S.cqOk ? 'Защита принята' : `Отвечено ${answered} из ${N}`}</h2><p class="mute">${S.cqOk ? 'Отчёт готов.' : `Нужно не меньше 6 верных ответов из ${N}.`}</p>
      <div class="qs-nav"><button class="btn ghost" data-d="cqi" data-v="${N - 1}">${ic('chevron-left')} Назад</button><span></span>
      ${S.cqOk ? `<button class="btn" data-${L.act}="next" data-primary>К отчёту ${kbd('Enter')}</button>` : `<button class="btn" data-${L.act}="cqCheck" data-primary ${answered ? '' : 'disabled'}>${ic('circle-check')} Проверить ответы ${kbd('Enter')}</button>`}</div>`;
  return gTop(S, L) + `<div class="pg"><div class="grid2 even">
    <section class="card sticky"><h2>${ic('pencil')} Выводы</h2><p class="mute small">Черновик собран по твоим результатам. Проверь и допиши своими словами — он попадёт в отчёт.</p>
      ${L.ta(S.concl)}<button class="btn line wide mt" data-${L.act}="reconcl">${ic('rotate-ccw')} Собрать черновик заново</button></section>
    <section class="card"><h2>${ic('graduation-cap')} Контрольные вопросы <span class="pill ${S.cqOk ? 'ok' : ''}">${answered} из ${N}</span></h2>${gDots(list, S, 'cq', CQI, S.cqChecked, 'cqi')}<div class="qs-card flat">${q}</div></section></div></div>`;
}
function gReport(S, L) {
  let res = ''; try { res = L.result(); } catch (e) {}
  const sent = S.dx && S.dx.submitted;
  if (!(S.dx && S.dx.sumSeen)) setTimeout(() => { if (SCREEN === 'work' && LAB === L.no && L.steps[L.S().step][0] === 'report' && $('#modal').hidden) openSummary(); }, 0);
  return gTop(S, L) + `<div class="pg"><div class="rep"><div class="sticky">
    <section class="card"><div class="done-badge">${ic('trophy')}<div><b>Работа выполнена</b><span class="mute small">${esc(res)}</span></div></div>
      <div style="display:grid; gap:10px"><label class="field">ФИО${L.inp('fio', S.fio, 'Иванов И. И.')}</label><label class="field">Класс / группа${L.inp('group', S.group, '')}</label><label class="field">Дата${L.inp('date', S.date, 'дд.мм.гггг')}</label></div>
      ${sent ? `<p class="pill ok mt">${ic('circle-check')} Работа сдана ${new Date(sent).toLocaleString('ru-RU', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}</p>` : ''}
      <button class="btn wide big mt" data-d="submit" ${sent ? '' : 'data-primary'}>${ic('graduation-cap')} ${IS_TAURI && FOLDER ? 'Сдать работу в папку класса' : 'Сохранить файл для преподавателя'}</button>
      <div class="row mt"><button class="btn line" data-d="pdf">${ic('file-text')} Сохранить PDF</button><button class="btn line" data-${L.act}="print">${ic('printer')} Печать ${kbd('Ctrl+P')}</button></div>
      <button class="btn line wide mt" data-d="summary">${ic('graduation-cap')} Что рассказать на защите</button>
      <button class="btn line wide mt" data-${L.act}="restart">${ic('rotate-ccw')} Выполнить работу заново</button></section></div>
    <div class="paper" id="d-paper"><div class="lwr">${L.report()}</div></div></div></div>`;
}
function gWork(S, L) {
  const st = L.steps[S.step][0];
  if (st === 'admit') return gAdmit(S, L);
  if (st === 'concl') return gConcl(S, L);
  if (st === 'report') return gReport(S, L);
  return gTop(S, L) + `<div class="pg"><div class="slab ${L.live.includes(st) ? 'live' : ''}">${L.view[st]()}</div></div>`;
}
function vWorkLab() {
  document.body.classList.add('noside', 'full'); ui.side.innerHTML = '';
  const L = curLab(), S = L.load(); ensureMeta(S);
  const st = L.steps[S.step][0];
  S.dx.t = S.dx.t || {}; if (!S.dx.t[st]) { S.dx.t[st] = new Date().toISOString(); L.save(); }
  ui.main.innerHTML = gWork(S, L);
  $('#printroot').innerHTML = st === 'report' ? L.report() : '';
  L.after(st);
}
function showTheoryLab() {
  const L = curLab();
  modal('Теория и установка', `<div class="tabs">${[['theory', 'Теория'], ['equip', 'Установка'], ['safety', 'Безопасность']].map(([k, t]) => `<button data-d="ttab" data-v="${k}" class="${TAB === k ? 'on' : ''}">${t}</button>`).join('')}</div>
    <div class="read">${TAB === 'equip' ? `<div class="paper-mini">${L.scheme()}</div>` : ''}${L.text[TAB] || L.text.theory}</div>`);
}

/* ---------- события ---------- */
document.addEventListener('click', e => {
  const b = e.target.closest && e.target.closest('[data-d]'); if (!b) return; const d = b.dataset;
  if (d.d === 'lab') openLab(+d.v);
  if (d.d === 'labs' && PROFILE) { closeModal(); SCREEN = 'labs'; render(); }
  if (d.d === 'cqi') { CQI = +d.v; render(); }
});
// ответ выбран — следующий вопрос без ответа (ЛР 1 и ЛР 2)
document.addEventListener('click', e => {
  const b = e.target.closest && e.target.closest('[data-lw="admit"],[data-l2="admit"],[data-lw="cq"],[data-l2="cq"]'); if (!b || LAB === 3) return;
  const L = curLab(), S = L.S(), adm = (b.dataset.lw || b.dataset.l2) === 'admit', list = adm ? L.admit : L.cq;
  if (!S || (adm ? S.admitChecked : S.cqChecked)) return;
  setTimeout(() => { const ans = adm ? S.admit : S.cq, cur = adm ? AQ : CQI; let nx = list.findIndex((_, j) => j > cur && !ans[j]); if (nx < 0) nx = list.findIndex((_, j) => !ans[j]); if (nx < 0) nx = list.length;
    if (adm) AQ = nx; else CQI = nx; render(); }, 260);
});
// учёт попыток и времени — как у ЛР 3 (для преподавателя)
document.addEventListener('click', e => {
  const b = e.target.closest && e.target.closest('[data-lw],[data-l2]'); if (!b || LAB === 3) return;
  const L = curLab(), S = L.S(); if (!S || !S.dx) return; const a = b.dataset.lw || b.dataset.l2;
  const k = { admitCheck: 'admitTries', pcheck: 'procTries', cqCheck: 'cqTries' }[a]; if (k) S.dx[k] = (S.dx[k] || 0) + 1;
  if (a === 'cqCheck') setTimeout(() => { if (S.done && !S.dx.finished) { S.dx.finished = new Date().toISOString(); L.save(); } if (S.done && !S.dx.submitted && FOLDER && IS_TAURI) submitWork(true); }, 50);
  if (a === 'next' || a === 'go') { AQ = 0; CQI = 0; }
}, true);
