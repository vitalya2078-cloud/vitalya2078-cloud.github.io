/* =====================================================================
   Раскладка программы: верхняя полоса шагов, «тренажёр» для подготовки и опытов,
   «пошагово» для допуска (обработка, выводы и отчёт — в desktop.js под той же полосой).
   Работа та же: кнопки и поля с теми же data-l3 / data-k3 и id, что ждёт ядро.
   ===================================================================== */
let AQ = 0;                   // текущий вопрос допуска в пошаговом виде

function topbar(S) {
  const fin = L3.steps[S.max][0] === 'report';
  return `<header class="tb">
    <div class="tb-brand"><button class="tb-ic" data-d="labs" title="К списку работ">${ic('chevron-left')}</button>${LOGO}<b>ЛР 3<small>Показатель адиабаты</small></b></div>
    <nav class="tb-steps">${L3.steps.map(([, t], i) => { const ok = i < S.max || (i === S.max && fin && S.done), on = i === S.step;
      return `<button data-l3="go" data-v="${i}" class="${on ? 'on' : ''}${ok ? ' ok' : ''}" ${i > S.max ? 'disabled' : ''}><i>${ok && !on ? '✓' : i + 1}</i><span>${t}</span></button>`; }).join('<s></s>')}</nav>
    <div class="tb-act">
      <button class="btn line" data-d="lnote" title="Конспект работы рядом с установкой">${ic('notebook-pen')} Конспект</button>
      <button class="btn line tb-hod" data-d="hod" title="Ход работы (H)">${ic('clipboard-list')} Ход работы ${kbd('H')}</button>
      <span class="tb-who">${ava(S.fio || PROFILE.fio)}<span>${esc(S.fio || PROFILE.fio)}</span></span>
      <button class="tb-ic" data-d="save" title="Сохранить файл работы (Ctrl+S)">${ic('file-text')}</button>
      <button class="tb-ic" data-d="help" title="Подсказка (F1)">${ic('book-open')}</button>
      <button class="tb-ic" data-d="theme" title="Тема">${ic('sparkles')}</button>
      <button class="tb-ic" data-d="sound" title="Звук">${ic(SND.on ? 'volume-2' : 'volume-x')}</button>
    </div></header>`;
}

/* ---------- тренажёр: подготовка и опыты ---------- */
// три опыта: выполненный — с результатами, текущий — что делать сейчас, следующий — впереди
function runList(S, at) {
  return Array.from({ length: L3.N }, (_, i) => { const r = S.runs[i];
    if (r) return `<li class="done">Опыт ${i + 1}<small>h₁ = ${r.h1}, h₂ = ${r.h2} мм · γ = ${l3Fix(r.h1 / (r.h1 - r.h2), 3)}</small></li>`;
    if (i === S.runs.length && at >= 0) return `<li class="cur">Опыт ${i + 1}<small>сейчас: ${PLAN[at].charAt(0).toLowerCase() + PLAN[at].slice(1)}</small></li>`;
    return `<li>Опыт ${i + 1}<small>впереди</small></li>`; }).join('');
}
function trainerTable(S) {
  const n = S.runs.length;
  return `<table class="t"><tr><th>№</th><th>h₁, мм</th><th>h₂, мм</th><th>γ</th></tr>${Array.from({ length: L3.N }, (_, i) => { const r = S.runs[i];
    return `<tr class="${i === n && n < L3.N ? 'now' : ''}"><td>${i + 1}</td><td>${r ? r.h1 : i === n && L3V.cur.h1 != null ? L3V.cur.h1 : '—'}</td><td>${r ? r.h2 : '—'}</td><td class="mute">${r ? l3Fix(r.h1 / (r.h1 - r.h2), 3) : ''}</td></tr>`; }).join('')}</table>`;
}
function vTrainer(S, st) {
  const n = S.runs.length, done = st === 'exp' && n >= L3.N;
  let title, sub, plan, dock;
  if (st === 'prep') {
    const ok = S.power && S.kOpen && !S.k0Open;
    title = 'Подготовка'; sub = 'установка к опыту';
    plan = [[S.power, 'Подать питание на секундомер'], [S.kOpen, 'Открыть кран K — к компрессору'], [!S.k0Open, 'Закрыть кран K₀ — к атмосфере']]
      .map(([d, t]) => `<li class="${d ? 'done' : ''}">${t}</li>`).join('');
    dock = `<p class="say">${ok ? 'Установка готова к опыту.' : 'Зелёная ручка — кран открыт, красная — закрыт.'}</p><div class="ctl">
      <button class="btn ${S.power ? 'on' : 'line'}" data-l3="power" data-key="P">${ic('zap')} Питание ${kbd('P')}</button>
      <button class="btn ${S.kOpen ? 'on' : 'off'}" data-l3="kv" data-key="K">Кран K: ${S.kOpen ? 'открыт' : 'закрыт'} ${kbd('K')}</button>
      <button class="btn ${!S.k0Open ? 'on' : 'off'}" data-l3="k0" data-key="O">Кран K₀: ${S.k0Open ? 'открыт' : 'закрыт'} ${kbd('O')}</button>
      ${ok ? `<button class="btn" data-l3="next" data-primary>К опытам ${kbd('Enter')}</button>` : ''}</div>`;
  } else if (done) {
    title = 'Опыты завершены'; sub = `${L3.N} из ${L3.N}`;
    plan = runList(S, -1);
    dock = `<p class="say">Переходи к обработке результатов.</p><div class="ctl"><button class="btn" data-l3="next" data-primary>К обработке ${kbd('Enter')}</button></div>`;
  } else {
    const ctl = expControls(S), at = PLAN_AT[L3V.phase] ?? 0;
    title = `Опыт ${n + 1} из ${L3.N}`; sub = `выполнено ${n} из ${L3.N}`;
    plan = runList(S, at);
    dock = ctl;
  }
  return topbar(S) + `<div class="tr">
    <aside class="tr-l">
      <section class="card"><div class="tr-h"><b>${title}</b><span>${sub}</span></div>
        <ol class="plan">${plan}</ol></section>
      <section class="card meters"><div class="meter"><small>Δh, мм</small><b id="d-h">0</b></div><div class="meter"><small>Секундомер</small><b id="d-sw">—</b></div><div class="meter proc"><small>Процесс в баллоне</small><b id="d-proc">—</b></div></section>
      <section class="card tr-tip">${ic('target')}<span>Раньше закроешь K₀ — h₂ больше и γ завышен; позже — h₂ меньше и γ занижен.</span></section>
    </aside>
    <div class="tr-c"><div class="tr-stage"><canvas id="l3-cv" aria-label="Установка Клемана — Дезорма"></canvas></div>
      <div class="tr-dock">${dock}<p class="lw-msg" id="lw-msg"></p></div></div>
    <aside class="tr-r">
      <section class="card"><h2>${ic('grid-3x3')} Таблица 1</h2>${trainerTable(S)}</section>
      <section class="card tr-chart"><h2>${ic('target')} Давление h(t)</h2><div class="chart-h"><span><i style="background:var(--cold)"></i>h, мм</span><span><i style="background:var(--acc)"></i>температура газа</span></div><canvas id="d-chart"></canvas></section>
    </aside>
  </div>`;
}

/* ---------- пошагово: допуск ---------- */
function vAdmitStep(S) {
  const N = L3_ADMIT.length, answered = Object.keys(S.admit).length;
  AQ = Math.max(0, Math.min(N, AQ));
  const dots = `<div class="qs-dots">${L3_ADMIT.map(([, a], i) => { const ch = S.admit[i]; const cls = i === AQ ? 'on' : ch ? (S.admitChecked ? (ch === a ? 'ok' : 'bad') : 'ans') : '';
    return `<button data-d="aq" data-v="${i}" class="${cls}">${i + 1}</button>`; }).join('')}<button data-d="aq" data-v="${N}" class="fin ${AQ === N ? 'on' : ''}" title="Сдать допуск">${ic('flag')}</button></div>`;
  let body;
  if (AQ < N) {
    const [q, a, x] = L3_ADMIT[AQ], opts = lwShuf(AQ + 80, [a, ...x]), ch = S.admit[AQ];
    body = `<div class="qs-n">Вопрос ${AQ + 1} из ${N}</div><h2 class="qs-q">${esc(q)}</h2>
      <div class="qs-opts">${opts.map((o, j) => `<button data-l3="admit" data-q="${AQ}" data-v="${esc(o)}" class="${ch === o ? (S.admitChecked ? (o === a ? 'ok' : 'bad') : 'pick') : ''}"><span class="lt">${j + 1}</span><span>${esc(o)}</span></button>`).join('')}</div>
      <div class="qs-nav"><button class="btn ghost" data-d="aq" data-v="${AQ - 1}" ${AQ ? '' : 'disabled'}>${ic('chevron-left')} Назад</button><span class="mute small">1–4 — выбрать ответ</span>
      <button class="btn ${ch ? '' : 'line'}" data-d="aq" data-v="${AQ + 1}" data-primary>${AQ === N - 1 ? 'К сдаче' : 'Дальше'} ${kbd('Enter')}</button></div>`;
  } else {
    body = `<div class="qs-n">Сдача допуска</div><h2 class="qs-q">${S.admitOk ? 'Допуск сдан' : `Отвечено ${answered} из ${N}`}</h2>
      <p class="mute">${S.admitOk ? 'Можно переходить к подготовке установки.' : 'Нужно не меньше 6 верных ответов из 8. Вернуться к любому вопросу — кнопки с номерами вверху.'}</p>
      <div class="qs-nav"><button class="btn ghost" data-d="aq" data-v="${N - 1}">${ic('chevron-left')} Назад</button><span></span>
      ${S.admitOk ? `<button class="btn" data-l3="next" data-primary>К подготовке ${kbd('Enter')}</button>` : `<button class="btn" data-l3="admitCheck" data-primary ${answered ? '' : 'disabled'}>${ic('circle-check')} Сдать допуск ${kbd('Enter')}</button>`}</div>`;
  }
  return topbar(S) + `<div class="qs">
    <div class="qs-main"><div class="qs-aim"><span class="kicker">Цель работы</span>${esc(L3_AIM())}</div>${qWaitBox(S, 'admit')}${dots}<section class="qs-card">${body}</section></div>
    <aside class="qs-side card"><div class="tabs">${[['theory', 'Теория и установка'], ['safety', 'Безопасность']].map(([k, t]) => `<button data-d="stab" data-v="${k}" class="${(TAB === 'safety' ? 'safety' : 'theory') === k ? 'on' : ''}">${t}</button>`).join('')}</div>
      <div class="read">${TAB === 'safety' ? L3_TEXT.safety : `${L3_TEXT.theory}<div class="paper-mini">${l3SchemeSvg()}</div>${L3_TEXT.equip}`}</div></aside>
  </div>`;
}
function showTheory() {
  modal('Теория и установка', `<div class="tabs">${[['theory', 'Теория'], ['equip', 'Установка'], ['safety', 'Безопасность']].map(([k, t]) => `<button data-d="ttab" data-v="${k}" class="${TAB === k ? 'on' : ''}">${t}</button>`).join('')}</div>
    <div class="read">${TAB === 'equip' ? `<div class="paper-mini">${l3SchemeSvg()}</div>` : ''}${L3_TEXT[TAB]}</div>`);
}

/* ---------- события новой раскладки ---------- */
document.addEventListener('click', e => {
  const b = e.target.closest && e.target.closest('[data-d]'); if (!b) return; const d = b.dataset;
  if (d.d === 'aq') { AQ = +d.v; render(); }
  if (d.d === 'theory') (LAB === 3 ? showTheory : showTheoryLab)();
  if (d.d === 'ttab') { TAB = d.v; (LAB === 3 ? showTheory : showTheoryLab)(); }
  if (d.d === 'stab') { TAB = d.v; render(); }
});
// после выбора ответа — короткая пауза и следующий вопрос (если ответ ещё не проверялся)
document.addEventListener('click', e => {
  const b = e.target.closest && e.target.closest('[data-l3="admit"]'); if (!b) return;
  if (LAB === 3 && L3S && !L3S.admitChecked) setTimeout(() => { if (SCREEN === 'work' && l3St() === 'admit' && +b.dataset.q === AQ && AQ < L3_ADMIT.length) { AQ++; render(); } }, 260);
});
document.addEventListener('keydown', e => {
  if (SCREEN !== 'work' || !$('#modal').hidden || e.ctrlKey || e.altKey) return;
  const tag = e.target.tagName || ''; if (tag === 'INPUT' || tag === 'TEXTAREA') return;
  const L = curLab(), S0 = L.S(); if (!S0) return; const st = L.steps[S0.step][0];
  if (st === 'admit' || (st === 'concl' && LAB !== 3)) {
    const k = { Digit1: 0, Digit2: 1, Digit3: 2, Digit4: 3, Numpad1: 0, Numpad2: 1, Numpad3: 2, Numpad4: 3 }[e.code];
    const opts = document.querySelectorAll('.qs-opts button'); if (k != null && opts[k]) { e.preventDefault(); opts[k].click(); }
    if (st === 'admit') { if (e.key === 'ArrowRight' && AQ < L.admit.length) { AQ++; render(); } if (e.key === 'ArrowLeft' && AQ > 0) { AQ--; render(); } }
  }
});
