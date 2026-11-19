/* =====================================================================
   «Физпрактикум» на телефоне: выбор работы и ЛР 1, ЛР 2 в раскладке телефона.
   Реестр работ — labs-core.js (общий с программой для компьютера). ЛР 3 — свои экраны (mobile.js).
   Подготовка, опыты и обработка ЛР 1 и ЛР 2 — экраны модулей сайта (они уже сделаны под палец);
   допуск и защита — по одному вопросу, отчёт и сводка — как у ЛР 3.
   ===================================================================== */
function mLabs() {
  const p = PROFILE; ui.bar.innerHTML = ''; dock('');
  ui.main.innerHTML = `<div class="labs-m">
    <div class="labs-mh"><span class="logo sm">γ</span><div><h1>Физпрактикум</h1><p>${esc(p.fio)}${p.group ? ' · ' + esc(p.group) : ''}</p></div><button class="ib" data-m="home" aria-label="Сменить студента">${ic('chevron-left')}</button></div>
    ${labNums().map(n => { const L = LABS[n], S = labState(n, p.id), at = S ? Math.min((S.max || 0) + (S.done ? 1 : 0), L.steps.length) : 0;
      let res = ''; if (S && S.done) { try { res = withLabState(n, S, () => L.result()); } catch (e) {} }
      return `<button class="labm ${S && S.done ? 'done' : ''}" data-m="lab" data-v="${n}"><span class="labm-ic">${ic(L.icon)}</span><div><small>ЛР ${n}</small><b>${esc(labTitle(n))}</b><span>${esc(labStatus(n, S))}</span>${res ? `<em>${esc(res)}</em>` : ''}
        <i class="labm-bar"><i style="width:${Math.round(at / L.steps.length * 100)}%"></i></i></div></button>`; }).join('')}
    <p class="mute small center" style="margin-top:14px">Каждая работа сохраняется отдельно.</p></div>`;
}
function mOpenLab(n) {
  LAB = n; const L = curLab(); L.setKey(L.key(PROFILE.id));
  const S = L.load(); ensureMeta(S); L.save(); if (n === 3) l3Reset();
  AQ = firstOpen(L.admit, S.admit); CQ = firstOpen(L.cq, S.cq); CTAB = S.cqOk ? 'cq' : 'concl';
  SCREEN = 'work'; render(); scrollTo(0, 0);
}
function mTop(S, L) {
  const i = S.step;
  ui.bar.innerHTML = `<div class="bar"><button class="ib" data-m="labs" aria-label="К списку работ">${ic('chevron-left')}</button>
      <h1>${L.steps[i][1]}<small>ЛР ${L.no} · шаг ${i + 1} из ${L.steps.length}</small></h1>
      <button class="ib" data-m="hod" aria-label="Ход работы">${ic('clipboard-list')}</button>
      <button class="ib" data-m="menu" aria-label="Меню">${ic('sliders-horizontal')}</button></div>
    <div class="steps" style="grid-template-columns:repeat(${L.steps.length},1fr)">${L.steps.map((_, j) => `<button data-${L.act}="go" data-v="${j}" class="${j === i ? 'cur' : j <= S.max ? 'done' : ''}" ${j <= S.max ? '' : 'disabled'} aria-label="${L.steps[j][1]}"></button>`).join('')}</div>`;
}
function mWorkLab() {
  const L = curLab(), S = L.load(); ensureMeta(S);
  const st = L.steps[S.step][0];
  S.dx.t = S.dx.t || {}; if (!S.dx.t[st]) { S.dx.t[st] = new Date().toISOString(); L.save(); }
  mTop(S, L);
  if (st === 'admit') mAdmitLab(S, L);
  else if (st === 'concl') mConclLab(S, L);
  else if (st === 'report') mReportLab(S, L);
  else { ui.main.innerHTML = `<div class="slab">${L.view[st]()}</div>`; dock(''); L.after(st); }
  $('#printroot').innerHTML = st === 'report' ? L.report() : '';
}
function mAdmitLab(S, L) {
  const all = L.admit.every((_, i) => S.admit[i]);
  if (S.admitChecked && S.admitOk) { ui.main.innerHTML = qResult(L.admit, S.admit, true, 'Допуск'); return dock(`<button class="btn" data-${L.act}="next">К подготовке ${ic('chevron-right')}</button>`); }
  ui.main.innerHTML = (S.admitChecked ? qResult(L.admit, S.admit, false, 'Допуск') : '') + qCard(L.admit, S.admit, S.admitChecked, AQ, 'admit', 40 + L.no * 20, L.admit.length, L.act)
    + `<button class="btn soft" data-m="theory">${ic('book-open')} Теория и схема установки</button>`;
  dock(`<div class="row"><button class="btn line" data-m="aq" data-v="${AQ - 1}" ${AQ ? '' : 'disabled'}>${ic('chevron-left')}</button>
    ${AQ < L.admit.length - 1 ? `<button class="btn ${S.admit[AQ] ? '' : 'line'}" data-m="aq" data-v="${AQ + 1}" style="flex:3">Дальше ${ic('chevron-right')}</button>`
      : `<button class="btn" data-${L.act}="admitCheck" ${all ? '' : 'disabled'} style="flex:3">${ic('circle-check')} Проверить допуск</button>`}</div>
    ${AQ < L.admit.length - 1 && all && !S.admitChecked ? `<button class="btn ok" data-${L.act}="admitCheck">${ic('circle-check')} Проверить допуск</button>` : ''}`);
}
function mConclLab(S, L) {
  if (!S.concl) { S.concl = L.autoConcl(); L.save(); }
  const N = L.cq.length, tabs = `<div class="tabs"><button class="${CTAB === 'concl' ? 'on' : ''}" data-m="ctab" data-v="concl">${ic('pencil')} Выводы</button><button class="${CTAB === 'cq' ? 'on' : ''}" data-m="ctab" data-v="cq">${ic('graduation-cap')} Защита ${S.cqOk ? '✓' : `${Object.keys(S.cq).length}/${N}`}</button></div>`;
  if (CTAB === 'concl') {
    ui.main.innerHTML = tabs + `<section class="card"><h2>${ic('pencil')} Выводы</h2><p class="lead" style="margin-bottom:10px">Черновик собран по твоим результатам. Проверь и допиши своими словами — он попадёт в отчёт.</p>
      ${L.ta(S.concl)}<button class="lnk" data-${L.act}="reconcl">${ic('rotate-ccw')} Собрать черновик заново</button></section>`;
    return dock(S.cqOk ? `<button class="btn" data-${L.act}="next">К отчёту ${ic('chevron-right')}</button>` : `<button class="btn" data-m="ctab" data-v="cq">К защите: ${N} вопросов ${ic('chevron-right')}</button>`);
  }
  const all = L.cq.every((_, i) => S.cq[i]);
  if (S.cqChecked && S.cqOk) { ui.main.innerHTML = tabs + qResult(L.cq, S.cq, true, 'Защита'); return dock(`<button class="btn" data-${L.act}="next">К отчёту ${ic('chevron-right')}</button>`); }
  CQ = Math.min(CQ, N - 1);
  ui.main.innerHTML = tabs + (S.cqChecked ? qResult(L.cq, S.cq, false, 'Защита') : '') + qCard(L.cq, S.cq, S.cqChecked, CQ, 'cq', 70 + L.no * 20, N, L.act);
  dock(`<div class="row"><button class="btn line" data-m="cqq" data-v="${CQ - 1}" ${CQ ? '' : 'disabled'}>${ic('chevron-left')}</button>
    ${CQ < N - 1 ? `<button class="btn ${S.cq[CQ] ? '' : 'line'}" data-m="cqq" data-v="${CQ + 1}" style="flex:3">Дальше ${ic('chevron-right')}</button>`
      : `<button class="btn" data-${L.act}="cqCheck" ${all ? '' : 'disabled'} style="flex:3">${ic('circle-check')} Проверить ответы</button>`}</div>
    ${CQ < N - 1 && all && !S.cqChecked ? `<button class="btn ok" data-${L.act}="cqCheck">${ic('circle-check')} Проверить ответы</button>` : ''}`);
}
function mReportLab(S, L) {
  let res = ''; try { res = L.result(); } catch (e) {}
  const sent = S.dx && S.dx.submitted;
  ui.main.innerHTML = `<section class="card hero">${ic('trophy')}<h2>Работа выполнена</h2><p>${esc(res)}</p></section>
    <button class="btn soft" data-m="summary" style="margin-bottom:12px">${ic('graduation-cap')} Что рассказать на защите</button>
    <section class="card"><h2>${ic('user')} Шапка отчёта</h2><label class="field">ФИО${L.inp('fio', S.fio, 'Иванов И. И.')}</label><label class="field">Класс / группа${L.inp('group', S.group, '11 А')}</label><label class="field">Дата${L.inp('date', S.date, 'дд.мм.гггг')}</label></section>
    <section class="card"><h2>${ic('file-text')} Отчёт <span class="tag">4 листа А4</span></h2><div class="paper-wrap" id="m-paper"><div class="lwr">${L.report()}</div></div></section>
    <div class="stack"><button class="btn line" data-m="pdf">${ic('printer')} PDF или печать</button><button class="btn line" data-${L.act}="restart">${ic('rotate-ccw')} Выполнить работу заново</button></div>`;
  dock(`${sent ? `<p class="say center">${ic('circle-check')} Файл отправлен ${new Date(sent).toLocaleString('ru-RU', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}</p>` : ''}
    <button class="btn ${sent ? 'line' : ''}" data-m="send">${ic('graduation-cap')} Отправить работу преподавателю</button>`);
  fitPaper();
  if (!(S.dx && S.dx.sumSeen)) setTimeout(() => { if (SCREEN === 'work' && LAB === L.no && $('#sheet').hidden) openSummary(); }, 0);
}

/* ---------- события ЛР 1 и ЛР 2 ---------- */
document.addEventListener('click', e => {
  const b = e.target.closest && e.target.closest('[data-m]'); if (!b) return; const d = b.dataset;
  if (d.m === 'lab') mOpenLab(+d.v);
  if (d.m === 'labs' && PROFILE) { closeSheet(); SCREEN = 'labs'; render(); scrollTo(0, 0); }
});
// ответ выбран — следующий вопрос без ответа
document.addEventListener('click', e => {
  const b = e.target.closest && e.target.closest('[data-lw="admit"],[data-l2="admit"],[data-le="admit"],[data-lw="cq"],[data-l2="cq"],[data-le="cq"]'); if (!b || LAB === 3) return;
  const L = curLab(), adm = (b.dataset.lw || b.dataset.l2 || b.dataset.le) === 'admit', list = adm ? L.admit : L.cq;
  setTimeout(() => { const S = L.S(); if (!S) return; const ans = adm ? S.admit : S.cq, cur = adm ? AQ : CQ;
    let nx = list.findIndex((_, j) => j > cur && !ans[j]); if (nx < 0) nx = list.findIndex((_, j) => !ans[j]);
    if (nx >= 0 && nx !== cur) { if (adm) AQ = nx; else CQ = nx; render(); scrollTo(0, 0); } }, 260);
});
// попытки, время, переходы — как у ЛР 3
document.addEventListener('click', e => {
  const b = e.target.closest && e.target.closest('[data-lw],[data-l2],[data-le]'); if (!b || LAB === 3) return;
  const L = curLab(), S = L.S(); if (!S || !S.dx) return; const a = b.dataset.lw || b.dataset.l2 || b.dataset.le;
  const k = { admitCheck: 'admitTries', pcheck: 'procTries', cqCheck: 'cqTries' }[a]; if (k) S.dx[k] = (S.dx[k] || 0) + 1;
  if (a === 'cqCheck') setTimeout(() => { if (S.done && !S.dx.finished) { S.dx.finished = new Date().toISOString(); L.save(); } }, 0);
  if (['admitCheck', 'cqCheck', 'next', 'go', 'restart'].includes(a)) setTimeout(() => scrollTo(0, 0), 0);
}, true);
// шапка отчёта ЛР 1 / ЛР 2 — обновить лист
document.addEventListener('input', e => {
  const t = e.target; if (LAB === 3 || !t.classList || !t.classList.contains('txt')) return; const k = t.dataset.k || t.dataset.k2 || t.dataset.ke; if (!['fio', 'group', 'date'].includes(k)) return;
  clearTimeout(window.__rep2); window.__rep2 = setTimeout(() => { const html = curLab().report(), p = $('#m-paper .lwr'); if (p) { p.innerHTML = html; fitPaper(); } $('#printroot').innerHTML = html; }, 300);
});
