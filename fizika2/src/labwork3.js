/* ЛР № 3 на сайте: экраны. Модель, вопросы, расчёты, действия и отчёт — в lw3-core.js. */
/* ---------- экраны ---------- */
const l3In = (k, val, ph = '', cls = '') => `<input class="lwi l3i ${cls}" data-k3="${k}" inputmode="decimal" autocomplete="off" value="${esc(val ?? '')}" placeholder="${ph}">`;
const l3Next = (label = 'Дальше') => `<button class="btn wide mt" data-l3="next">${label} ${ic('chevron-right')}</button>`;
function vLabWork3() {
  const S = l3Load(), st = L3.steps[S.step][0];
  frame('ЛР № 3 · Показатель адиабаты', { back: true, sub: L3.steps[S.step][1] });
  const chips = `<div class="lw-steps">${L3.steps.map(([k, t], i) => `<button data-l3="go" data-v="${i}" class="${i === S.step ? 'on' : ''}${i < S.max || (i === S.max && st === 'report') ? ' ok' : ''}" ${i > S.max ? 'disabled' : ''}><b>${i + 1}</b><span>${t}</span></button>`).join('')}</div>`;
  const body = ({ admit: l3Admit, prep: l3Prep, exp: l3Exp, proc: l3Proc, concl: l3Concl, report: l3ReportStep })[st]();
  setMain(`<div class="lw">${chips}${body}</div>`);
  if (st === 'prep' || st === 'exp') { l3Draw(); l3Run(); }
}

function l3Admit() {
  const S = L3S, qs = L3_ADMIT.map(([q, a, x], i) => { const opts = lwShuf(i + 80, [a, ...x]), ch = S.admit[i];
    return `<div class="lw-q"><b>${i + 1}. ${esc(q)}</b>${opts.map(o => `<button data-l3="admit" data-q="${i}" data-v="${esc(o)}" class="${ch === o ? (S.admitChecked ? (o === a ? 'ok' : 'bad') : 'pick') : ''}">${esc(o)}</button>`).join('')}</div>`; }).join('');
  return `<section class="card lw-intro"><b class="h">Цель работы</b><p>${esc(LW_LIST[2].aim)}</p>
    <details><summary>Кратко из теории</summary>
    ${L3_TEXT.theory}</details>
    <details><summary>Оборудование и установка</summary>${L3_TEXT.equip}</details>
    <details><summary>Техника безопасности</summary>${L3_TEXT.safety}</details></section>
    <section class="card"><b class="h">Допуск к работе</b><p class="mute">Ответь на вопросы. Нужно не меньше 6 верных из 8.</p>${qs}
    <button class="btn wide mt" data-l3="admitCheck">${ic('circle-check')} Сдать допуск</button>${S.admitOk ? l3Next('К подготовке') : ''}</section>`;
}


/* 2. Подготовка: питание, краны (п. 1–3 порядка выполнения) */
function l3Prep() {
  const S = L3S, ok = S.power && S.kOpen && !S.k0Open;
  return `<section class="card"><b class="h">Подготовка установки</b><p class="mute small">По порядку выполнения: 1) подай питание на секундомер (переключатель на задней панели); 2) открой кран K (ручка горизонтально); 3) закрой кран K₀ (ручка горизонтально). Краны показаны на схеме — зелёная ручка открыта, красная закрыта.</p></section>
    <section class="lw-stage"><canvas id="l3-cv" aria-label="Установка Клемана — Дезорма"></canvas><div class="lw-ctl">${l3Controls('prep')}
    <p class="lw-msg" id="lw-msg">${ok ? 'Установка готова к опыту.' : ''}</p>${ok ? l3Next('К опытам') : ''}</div></section>`;
}
function l3Controls(mode) {
  const S = L3S, V = L3V, ph = V.phase;
  const tog = (k, lab, on) => `<button class="btn ${on ? '' : 'line'}" data-l3="${k}">${lab}</button>`;
  if (mode === 'prep') return `<div class="l3-row">${tog('power', S.power ? 'Питание: вкл' : 'Подать питание', S.power)}${tog('kv', S.kOpen ? 'Кран K: открыт' : 'Кран K: закрыт', S.kOpen)}${tog('k0', S.k0Open ? 'Кран K₀: открыт' : 'Кран K₀: закрыт', !S.k0Open)}</div>`;
  if (ph === 'ready' && S.kOpen && !S.k0Open) { V.phase = 'pump'; return l3Controls(mode); }
  const n = S.runs.length + 1;
  if (ph === 'ready') return `<p class="l3-step">Опыт ${n}. Открой кран K и закрой K₀.</p><div class="l3-row">${tog('kv', S.kOpen ? 'Кран K: открыт' : 'Открыть кран K', S.kOpen)}${tog('k0', S.k0Open ? 'Закрыть кран K₀' : 'Кран K₀: закрыт', !S.k0Open)}</div>`;
  if (ph === 'pump') return `<p class="l3-step">Держи кнопку компрессора, пока уровень в правом колене не поднимется на 210…220 мм (разность уровней). Сейчас: <b id="l3-h">${Math.round(V.p)}</b> мм</p><div class="l3-row"><button class="btn" id="l3-pump" data-l3="nop">${ic('zap')} Компрессор — держи</button><button class="btn line" data-l3="closeK">Закрыть K и пустить секундомер</button></div>`;
  if (ph === 'wait1' || ph === 'wait2') return `<p class="l3-step">Секундомер идёт. Выжди 1 минуту, пока установится постоянное давление.</p><button class="btn wide" data-l3="waitMin" ${V.speed > 1 ? 'disabled' : ''}>${ic('timer')} Ждать 1 мин (ускоренно)</button>`;
  if (ph === 'read1' || ph === 'read2') { const j = ph === 'read1' ? 1 : 2; return `<p class="l3-step">Секундомер остановлен. По лупам прочитай уровни в обоих коленах и запиши h${j === 1 ? '₁' : '₂'} — разность уровней, мм.</p><div class="lw-ctl-row"><label>h${j === 1 ? '₁' : '₂'}, мм${l3In('ch', V.cur['r' + j] || '', 'мм')}</label><button class="btn" data-l3="rec${j}">${ic('pencil')} Записать</button></div>`; }
  if (ph === 'vent') return `<p class="l3-step">h₁ = ${l3Fix(V.cur.h1, 0)} мм записано, секундомер сброшен. Открой кран K₀ и закрой его, как только давление сравняется с атмосферным (уровни в коленах выровняются, шипение прекратится).</p><div class="l3-row"><button class="btn" data-l3="k0open" ${S.k0Open ? 'disabled' : ''}>Открыть K₀</button><button class="btn line" data-l3="k0close" ${S.k0Open ? '' : 'disabled'}>Закрыть K₀</button></div>`;
  if (ph === 'vented') return `<p class="l3-step">Кран K₀ закрыт. Запусти секундомер и выжди 1 минуту, пока газ нагреется до комнатной температуры.</p><button class="btn wide" data-l3="startSw">${ic('timer')} Пуск секундомера</button>`;
  return '';
}
/* 3. Опыты */
function l3Exp() {
  const S = L3S, n = S.runs.length, done = n >= L3.N;
  const tbl = `<table class="lw-tbl"><tr><th>№</th><th>h₁, мм</th><th>h₂, мм</th></tr>${Array.from({ length: L3.N }, (_, i) => `<tr class="${i === n ? 'now' : ''}"><td>${i + 1}</td><td>${S.runs[i] ? S.runs[i].h1 : i === n && L3V.cur.h1 != null ? L3V.cur.h1 : ''}</td><td>${S.runs[i] ? S.runs[i].h2 : ''}</td></tr>`).join('')}</table>`;
  return `<section class="card lw-cond"><b class="h">Опыты (п. 3–12)</b><p class="mute small">Повтори измерение h₁ и h₂ три раза. Точность опыта зависит от момента закрытия крана K₀: закроешь раньше — h₂ больше и γ завышен, позже — h₂ меньше и γ занижен.</p></section>
    <section class="lw-stage"><canvas id="l3-cv" aria-label="Установка Клемана — Дезорма"></canvas><div class="lw-ctl">${done ? l3Next('К обработке') : l3Controls('exp')}<p class="lw-msg" id="lw-msg"></p></div></section>
    <section class="card"><b class="h">Таблица 1 (измерения)</b>${tbl}</section>`;
}

function l3Proc() {
  const S = L3S, o = l3Calc(), P = S.proc, cls = k => S.procOk[k] === true ? 'ok' : S.procOk[k] === false ? 'bad' : '', I = k => l3In('p_' + k, P[k], '', cls(k));
  const all = L3_KEYS.every(k => S.procOk[k] === true);
  return `<section class="card"><b class="h">Таблица 1. Показатель адиабаты</b><p class="mute small">γᵢ = h₁/(h₁ − h₂), с точностью до 0,001.</p>
    <table class="lw-tbl"><tr><th>№</th><th>h₁, мм</th><th>h₂, мм</th><th>γ</th></tr>${o.a.map((x, i) => `<tr><td>${i + 1}</td><td>${x.h1}</td><td>${x.h2}</td><td>${I('g' + (i + 1))}</td></tr>`).join('')}
    <tr class="sum"><td colspan="3">Среднее значение ⟨γ⟩ = Σγᵢ/N</td><td>${I('gm')}</td></tr></table></section>
    <section class="card"><b class="h">Погрешности и сравнение с теорией</b>
    <div class="lw-row"><label>⟨Δγ⟩ = Σ|⟨γ⟩ − γᵢ| / √(N(N − 1)) ${I('dg')}</label><label>ε_γ = ⟨Δγ⟩/⟨γ⟩·100, % ${I('eg')}</label></div>
    <div class="lw-row"><label>γ_T = (i + 2)/i для воздуха (i = 5) ${I('gT')}</label><label>ε = |γ_T − ⟨γ⟩|/γ_T·100, % ${I('e')}</label></div>
    <button class="btn line wide mt" data-l3="pcheck">${ic('circle-check')} Проверить</button>
    ${['gm', 'dg'].every(k => S.procOk[k]) ? `<p class="lw-res">γ = ${l3Res(o)}</p>` : ''}</section>
    <p class="lw-msg" id="lw-msg"></p>${all ? l3Next('К выводам') : '<p class="mute small center">Когда все значения будут верны, откроются выводы.</p>'}`;
}


function l3Concl() {
  const S = L3S; if (!S.concl) { S.concl = l3AutoConcl(l3Calc()); l3Save(); }
  const qs = L3_CQ.map(([q, a, x], i) => { const opts = lwShuf(i + 90, [a, ...x]), ch = S.cq[i];
    return `<div class="lw-q"><b>${i + 1}. ${esc(q)}</b>${opts.map(op => `<button data-l3="cq" data-q="${i}" data-v="${esc(op)}" class="${ch === op ? (S.cqChecked ? (op === a ? 'ok' : 'bad') : 'pick') : ''}">${esc(op)}</button>`).join('')}</div>`; }).join('');
  return `<section class="card"><b class="h">Выводы</b><p class="mute small">Черновик собран по твоим результатам. Проверь и допиши своими словами.</p>
    <textarea class="lw-ta l3i" data-k3="concl" rows="9">${esc(S.concl)}</textarea>
    <button class="btn line wide mt" data-l3="reconcl">${ic('rotate-ccw')} Собрать черновик заново</button></section>
    <section class="card"><b class="h">Контрольные вопросы (защита)</b>${qs}<button class="btn wide mt" data-l3="cqCheck">${ic('circle-check')} Проверить ответы</button>${S.cqOk ? l3Next('К отчёту') : ''}</section>`;
}

/* 6. Отчёт */
function l3ReportStep() {
  const S = L3S;
  return `<section class="card"><b class="h">Отчёт готов</b><p class="mute">Отчёт оформлен по бланку кафедры (4 листа А4). Заполни шапку и сохрани PDF: в окне печати выбери «Сохранить как PDF».</p>
    <div class="lw-row"><label>ФИО ${l3In('fio', S.fio, 'Иванов И. И.', 'txt')}</label><label>Класс ${l3In('group', S.group, '', 'txt')}</label><label>Дата ${l3In('date', S.date, '', 'txt')}</label></div>
    <a class="btn wide mt" href="#lw-3-report">${ic('file-text')} Открыть отчёт</a>
    <button class="btn line wide mt" data-l3="restart">${ic('rotate-ccw')} Выполнить работу заново</button></section>`;
}
function vLabWork3Report() {
  const S = l3Load(); if (L3.steps[S.max][0] !== 'report') { location.hash = 'lw-3'; return; }
  frame('Отчёт · ЛР № 3', { back: true });
  setMain(`<div class="lwr-tools"><button class="btn" data-l3="print">${ic('printer')} Сохранить PDF / печать</button><a class="btn line" href="#lw-3">${ic('chevron-left')} К работе</a></div>${l3ReportHtml()}`);
}
