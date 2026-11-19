/* =====================================================================
   Режим преподавателя (под паролем): открыть файлы работ (.lw3) группы, сводная таблица,
   проверка подлинности, отчёт любого студента, выгрузка в Excel (CSV).
   ===================================================================== */
const TKEY = 'lw3d-teacher';
let TROWS = store.get(TKEY, []);          // [{ name, ok, d }] — работы всех лабораторных; d.lab — номер работы
let TLAB = 3, TVIEW = [];                  // вкладка «ЛР n» и её строки
const tSave = () => store.set(TKEY, TROWS);
const nf = (v, d) => Number.isFinite(v) ? v.toFixed(d).replace('.', ',') : '';

function tRow(r) {
  const S = r.d.state, done = !!S.done, runs = S.runs || [];
  let o = null; if (runs.length === L3.N) { const keep = L3S; L3S = S; try { o = l3Calc(); } finally { L3S = keep; } }
  // проверка: γ из таблицы совпадает с записанной сводкой
  const consistent = !o || !r.d.summary || Math.abs(o.gm - r.d.summary.gm) < 1e-9;
  const demo = !!(S.demo || (S.dx && S.dx.demo));   // демо-прохождение — не работа студента
  const stage = demo ? 'демо' : done ? 'защищена' : L3.steps[Math.min(S.max || 0, L3.steps.length - 1)][1].toLowerCase();
  const adm = L3_ADMIT.filter(([, a], i) => S.admit && S.admit[i] === a).length, cq = L3_CQ.filter(([, a], i) => S.cq && S.cq[i] === a).length;
  return { fio: S.fio || r.d.student.fio || '—', group: S.group || r.d.student.group || '', date: S.date || '', stage, done, runs, o, adm, cq, dx: S.dx || {}, auth: r.ok && consistent && !demo, demo, saved: r.d.saved };
}
async function teacherAdd(files) {
  const list = []; for (const f of files) list.push({ name: f.name, text: await readFile(f) });
  teacherAddTexts(list);
}
function teacherAddTexts(list, quiet) {
  let added = 0, bad = 0;
  for (const { name, text } of list) {
    const r = unpackResult(text);
    if (r.err) { bad++; continue; }
    const kf = x => (x.d.state.fio || '') + '|' + (x.d.state.group || '') + '|' + (x.d.lab || 3), key = kf(r);
    TROWS = TROWS.filter(x => kf(x) !== key); TLAB = r.d.lab || 3;   // повторный файл того же студента заменяет прежний
    TROWS.push({ name, ok: r.ok, d: r.d }); added++;
  }
  TROWS.sort((a, b) => String(a.d.state.fio).localeCompare(String(b.d.state.fio), 'ru'));
  tSave(); render();
  if (!quiet || bad) toast(`Загружено работ: ${added}${bad ? ` · не распознано файлов: ${bad}` : ''}`, bad && !added ? 'bad' : '');
}
async function folderLoad() {
  if (!IS_TAURI || !FOLDER) return;
  try { const list = await tauri('read_lw3_dir', { dir: FOLDER }); teacherAddTexts(list.map(([name, text]) => ({ name, text }))); }
  catch (e) { toast(`Папка недоступна: ${esc(String(e))}`, 'bad'); }
}
function folderCard() {
  if (!IS_TAURI) return `<section class="card mt folder"><b>${ic('layers')} Папка класса для сдачи работ</b><p class="mute small">Доступно в программе для Windows: студенты сдают работу в общую папку, а вы загружаете все работы одной кнопкой.</p></section>`;
  return `<section class="card mt folder"><div class="folder-row"><div><b>${ic('layers')} Папка класса для сдачи работ</b>
      <p class="mute small">${FOLDER ? esc(FOLDER) : 'Не выбрана. Выберите общую сетевую папку класса — после защиты работа студента сама сохранится туда.'}${FOLDER_FIXED ? ' · задана в файле adiabata.json рядом с программой' : ''}</p></div>
      ${FOLDER ? `<button class="btn" data-t="folder-load">${ic('rotate-cw')} Загрузить работы из папки</button>` : ''}
      ${FOLDER_FIXED ? '' : `<button class="btn line" data-t="folder-pick">${ic('layers')} ${FOLDER ? 'Другая папка' : 'Выбрать папку'}</button>${FOLDER ? `<button class="btn ghost" data-t="folder-clear">${ic('x')}</button>` : ''}`}</div>
    <p class="mute small">Папка запоминается на этом компьютере. Чтобы задать её сразу для всех компьютеров класса, положите рядом с программой файл <b>adiabata.json</b> с текстом <code>{"folder": "\\\\сервер\\папка"}</code>.</p></section>`;
}
/* совпадающие измерения у разных студентов: ≥ 2 одинаковых пары h₁/h₂ из 3 → вероятно, списано */
function tDups(rows) {
  const d = rows.map(() => []);
  for (let i = 0; i < rows.length; i++) for (let j = i + 1; j < rows.length; j++) {
    const a = rows[i].runs, b = rows[j].runs; if (!a.length || !b.length) continue;
    const same = a.filter(x => b.some(y => y.h1 === x.h1 && y.h2 === x.h2)).length;
    if (same >= 2 || (same >= 1 && Math.min(a.length, b.length) === 1)) { d[i].push(rows[j].fio); d[j].push(rows[i].fio); }
  }
  return d;
}
function vTeacher() {
  document.body.classList.add('noside'); ui.side.innerHTML = '';
  TVIEW = TROWS.filter(r => (r.d.lab || 3) === TLAB);
  if (TLAB !== 3) return vTeacherLab();
  const rows = TVIEW.map(tRow), fin = rows.filter(r => r.o), gms = fin.map(r => r.o.gm), dups = tDups(rows);
  const mean = gms.length ? gms.reduce((s, x) => s + x, 0) / gms.length : NaN, fake = rows.filter((r, i) => !r.auth || dups[i].length).length;
  ui.main.innerHTML = `<div class="head"><h1>Результаты группы</h1>${tTabs()}<div class="sp"></div>${themeBtn()}
      <button class="btn line" data-t="back">${ic('chevron-left')} Выйти</button>
      <button class="btn line" data-t="demo">${ic('graduation-cap')} Демо-прохождение</button>
      <button class="btn line" data-t="csv" ${rows.length ? '' : 'disabled'}>${ic('grid-3x3')} В Excel (CSV)</button>
      <button class="btn line" data-t="clear" ${rows.length ? '' : 'disabled'}>${ic('trash-2')} Очистить</button>
      <button class="btn" data-t="add">${ic('plus')} Добавить файлы</button></div>
    ${folderCard()}
    <div class="drop mt" data-t="add">${ic('file-text')} Перетащи сюда файлы <b>.lw3</b>, которые сохранили студенты, или нажми, чтобы выбрать.</div>
    <div class="stats">
      <div class="stat"><small>Работ</small><b>${rows.length}</b></div>
      <div class="stat"><small>Защищено</small><b style="color:var(--ok)">${rows.filter(r => r.done).length}</b></div>
      <div class="stat"><small>Средний ⟨γ⟩ группы</small><b>${gms.length ? nf(mean, 3) : '—'}</b></div>
      <div class="stat"><small>Подлинность</small><b style="color:${fake ? 'var(--bad)' : 'var(--ok)'}">${rows.length ? (fake ? `${fake} под вопросом` : 'всё в порядке') : '—'}</b></div></div>
    ${gms.length ? `<section class="card"><h2>${ic('target')} ⟨γ⟩ по студентам <span class="pill">теория γ = 1,40</span></h2>${tStrip(fin)}</section>` : ''}
    <section class="card mt" style="padding:0; overflow:hidden">${rows.length ? `<table class="tt"><tr><th>Студент</th><th>Класс</th><th>Дата</th><th>Этап</th><th>Допуск</th><th>h₁ / h₂, мм</th><th>⟨γ⟩ ± ⟨Δγ⟩</th><th>ε, %</th><th>Защита</th><th>Попытки<br>доп. / обр. / защ.</th><th>Файл</th></tr>
      ${rows.map((r, i) => `<tr class="r" data-t="open" data-v="${i}"><td><div style="display:flex; gap:10px; align-items:center">${ava(r.fio)}<div><b>${esc(r.fio)}</b>${r.dx.device === 'android' ? ' <span class="pill">с телефона</span>' : ''}${dups[i].length ? `<small class="dup">${ic('circle-x')} измерения совпадают: ${esc(dups[i].join(', '))}</small>` : ''}</div></div></td><td>${esc(r.group)}</td><td>${esc(r.date)}</td>
        <td><span class="pill ${r.done ? 'ok' : 'warn'}">${esc(r.stage)}</span></td><td class="n">${r.adm}/8</td>
        <td>${r.runs.map(x => `${x.h1}/${x.h2}`).join(' · ') || '—'}</td><td class="n"><b>${r.o ? esc(l3Res(r.o)) : '—'}</b></td><td class="n">${r.o ? nf(r.o.e, 1) : '—'}</td>
        <td class="n">${r.done ? `${r.cq}/8` : '—'}</td><td class="n">${r.dx.admitTries || 0} / ${r.dx.procTries || 0} / ${r.dx.cqTries || 0}</td>
        <td>${r.demo ? `<span class="pill warn">демо</span>` : r.auth ? `<span class="pill ok">${ic('circle-check')} подлинный</span>` : `<span class="pill bad">${ic('circle-x')} изменён</span>`}</td></tr>`).join('')}</table>`
      : '<p class="mute center" style="padding:30px">Пока пусто. Попроси студентов сохранить работу (кнопка «Сохранить файл для преподавателя» или Ctrl+S) и собери файлы на флешку или в общую папку.</p>'}</section>
    <p class="mute small mt">Подпись файла защищает от правки результата вручную (в Блокноте и т. п.). Файлы хранятся только на этом компьютере, пока ты их не очистишь.</p>`;
}
function tStrip(fin) {
  const W = 1000, H = 120, lo = 1.25, hi = 1.55, X = g => 40 + (Math.max(lo, Math.min(hi, g)) - lo) / (hi - lo) * (W - 80);
  const ticks = [1.25, 1.3, 1.35, 1.4, 1.45, 1.5, 1.55];
  return `<svg viewBox="0 0 ${W} ${H}" style="width:100%; height:auto; display:block">
    <line x1="40" x2="${W - 40}" y1="70" y2="70" stroke="#2E3F63" stroke-width="2"/>
    ${ticks.map(t => `<line x1="${X(t)}" x2="${X(t)}" y1="64" y2="76" stroke="#2E3F63"/><text x="${X(t)}" y="96" fill="#7C8BA6" font-size="13" text-anchor="middle" font-family="Golos UI">${nf(t, 2)}</text>`).join('')}
    <rect x="${X(1.4) - 1.5}" y="20" width="3" height="60" fill="#5AD3A0"/><text x="${X(1.4)}" y="14" fill="#5AD3A0" font-size="12" font-weight="700" text-anchor="middle" font-family="Golos UI">γ = 1,40</text>
    ${fin.map((r, i) => { const x = X(r.o.gm), y = 52 - (i % 3) * 12, dx = Math.max(2, r.o.dg / (hi - lo) * (W - 80));
      return `<g><title>${esc(r.fio)}: ${esc(l3Res(r.o))}</title><line x1="${x - dx}" x2="${x + dx}" y1="${y}" y2="${y}" stroke="#6FB3FF" stroke-width="2" opacity=".6"/><circle cx="${x}" cy="${y}" r="6" fill="${r.auth ? '#6FB3FF' : '#F2727E'}" stroke="#0B1020" stroke-width="2"/></g>`; }).join('')}
  </svg>`;
}
function tOpen(i) {
  const r = TVIEW[i]; if (!r) return; if ((r.d.lab || 3) !== 3) return tOpenLab(r); const row = tRow(r);
  const keep = L3S; L3S = r.d.state; let html; try { html = row.runs.length === L3.N && r.d.state.concl ? l3ReportHtml() : ''; } finally { L3S = keep; }
  $('#printroot').innerHTML = html; TPDF = row.fio;
  modal(`${esc(row.fio)} · ${esc(row.group)}`, `${row.auth ? '' : `<p class="pill bad" style="margin-bottom:12px">${ic('circle-x')} Файл изменён после сохранения в программе — результат не подтверждён</p>`}
    ${tDetails(r.d.state)}
    ${html ? `<div class="paper" style="max-height:none">${html}</div>` : `<p class="mute">Работа не доведена до отчёта: этап — ${esc(row.stage)}. Опытов выполнено: ${row.runs.length} из ${L3.N}.</p>`}`,
    html ? `<button class="btn" data-t="pdf">${ic('file-text')} Сохранить PDF</button><button class="btn line" data-t="print">${ic('printer')} Печать</button>` : '');
}
let TPDF = '';
/* подробности: ответы допуска и защиты, время по шагам, попытки */
function tDetails(S, n = 3) {
  const LL = LABS[n], dx = S.dx || {}, t = dx.t || {}, keys = LL.steps.map(([k]) => k), NS = keys.length - 1;
  const at = k => t[k] ? new Date(t[k]).getTime() : NaN, end = dx.finished ? new Date(dx.finished).getTime() : NaN;
  const dur = ms => !Number.isFinite(ms) || ms < 0 ? '—' : ms < 60000 ? '< 1 мин' : ms < 3600000 ? `${Math.round(ms / 60000)} мин` : `${Math.floor(ms / 3600000)} ч ${Math.round(ms % 3600000 / 60000)} мин`;
  const times = keys.slice(0, NS).map((k, i) => `<span class="pill">${LL.steps[i][1]}: ${dur((i < NS - 1 ? at(keys[i + 1]) : end) - at(k))}</span>`).join(' ');
  const qa = (list, ans) => list.map(([q, a], i) => `<li class="${ans && ans[i] === a ? 'ok' : 'bad'}">${ans && ans[i] === a ? '✓' : '✗'} ${esc(q)}${ans && ans[i] && ans[i] !== a ? `<small>ответ: ${esc(ans[i])}</small>` : ''}</li>`).join('');
  const pk = dx.pk || {}, pkTxt = Object.keys(pk).length ? Object.entries(pk).map(([k, n]) => `${PK_NAME[k] || k} — ${n}`).join(', ') : 'нет';
  return `<section class="tdet"><div class="tdet-row">${times}<span class="pill">всего: ${dur(end - at('admit'))}</span></div>
    <div class="tdet-row mute small">Попытки: допуск — ${dx.admitTries || 0}, обработка — ${dx.procTries || 0}, защита — ${dx.cqTries || 0}. Ошибки в ячейках обработки: ${esc(pkTxt)}.</div>
    <div class="grid2 even"><div><b>Допуск</b><ul class="tqa">${qa(LL.admit, S.admit)}</ul></div><div><b>Защита</b><ul class="tqa">${S.cqOk || Object.keys(S.cq || {}).length ? qa(LL.cq, S.cq) : '<li class="mute">ещё не проходил</li>'}</ul></div></div></section>`;
}
function tCsv() {
  const q = v => { const s = String(v ?? ''); return /[;"\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
  const head = ['ФИО', 'Класс', 'Дата', 'Этап', 'Допуск (верно из 8)', 'h1 опыт 1', 'h2 опыт 1', 'h1 опыт 2', 'h2 опыт 2', 'h1 опыт 3', 'h2 опыт 3', '<γ>', '<Δγ>', 'εγ, %', 'ε, %', 'Защита (верно из 8)', 'Попыток допуска', 'Попыток обработки', 'Попыток защиты', 'Подлинность', 'Измерения совпадают с'];
  const all = TVIEW.map(tRow), dd = tDups(all);
  const lines = all.map((r, k) => [r.fio, r.group, r.date, r.stage, r.adm, ...[0, 1, 2].flatMap(i => r.runs[i] ? [r.runs[i].h1, r.runs[i].h2] : ['', '']),
    r.o ? nf(r.o.gm, 3) : '', r.o ? nf(r.o.dg, 3) : '', r.o ? nf(r.o.eg, 1) : '', r.o ? nf(r.o.e, 1) : '', r.done ? r.cq : '',
    r.dx.admitTries || 0, r.dx.procTries || 0, r.dx.cqTries || 0, r.demo ? 'ДЕМО' : r.auth ? 'подлинный' : 'ИЗМЕНЁН', dd[k].join(', ')].map(q).join(';'));
  return '﻿' + [head.map(q).join(';'), ...lines].join('\r\n');
}
/* ---------- пароль ---------- */
const PASS_KEY = 'lw3d-tpass';
const passHash = (salt, pwd) => sha256(salt + '|' + pwd);
function vLock() {
  document.body.classList.add('noside'); ui.side.innerHTML = '';
  const has = !!store.get(PASS_KEY, null);
  ui.main.innerHTML = `<div class="lock"><div class="login-brand">${LOGO}<h1 style="font-size:24px">Режим преподавателя</h1>
      <p>${has ? 'Введите пароль' : 'Придумайте пароль — он понадобится при каждом входе'}</p></div>
    <div class="card">${has ? `<label class="field">Пароль<input type="password" id="tp" autocomplete="off"></label>
        <button class="btn wide big mt" data-t="unlock">Войти ${kbd('Enter')}</button>`
      : `<label class="field">Пароль<input type="password" id="tp1" autocomplete="off"></label><label class="field" style="margin-top:12px">Ещё раз<input type="password" id="tp2" autocomplete="off"></label>
        <button class="btn wide big mt" data-t="setpass">Сохранить пароль ${kbd('Enter')}</button>`}
      <p class="lw-msg bad" id="tp-msg"></p></div>
    <div class="row mt"><button class="btn ghost" data-t="back">${ic('chevron-left')} Назад</button>${has ? '<span style="flex:1"></span><button class="btn ghost" data-t="forgot">Забыли пароль?</button>' : ''}</div></div>`;
  setTimeout(() => { const f = $('#tp') || $('#tp1'); if (f) f.focus(); }, 0);
}
const lockMsg = t => { const m = $('#tp-msg'); if (m) m.textContent = t; };
document.addEventListener('click', e => {
  const b = e.target.closest && e.target.closest('[data-t]'); if (!b || SCREEN !== 'lock') return;
  switch (b.dataset.t) {
    case 'back': SCREEN = 'home'; render(); break;
    case 'setpass': { const a = $('#tp1').value, c = $('#tp2').value;
      if (a.length < 4) { lockMsg('Пароль — не короче 4 символов.'); break; }
      if (a !== c) { lockMsg('Пароли не совпадают.'); break; }
      const salt = Math.random().toString(36).slice(2); store.set(PASS_KEY, { salt, hash: passHash(salt, a) }); SCREEN = 'teacher'; render(); toast('Пароль сохранён'); break; }
    case 'unlock': { const pw = store.get(PASS_KEY, null), v = $('#tp').value;
      if (pw && passHash(pw.salt, v) === pw.hash) { SCREEN = 'teacher'; render(); } else { lockMsg('Неверный пароль.'); $('#tp').select(); } break; }
    case 'forgot': if (confirm('Сбросить пароль? Список загруженных работ тоже очистится (сами файлы на диске останутся).')) { store.del(PASS_KEY); TROWS = []; tSave(); render(); } break;
  }
});
document.addEventListener('click', e => {
  const b = e.target.closest && e.target.closest('[data-t]'); if (!b || SCREEN !== 'teacher') return; const d = b.dataset;
  switch (d.t) {
    case 'back': SCREEN = 'home'; render(); break;
    case 'add': pickFiles('teacher'); break;
    case 'open': tOpen(+d.v); break;
    case 'demo': teacherDemo(); break;
    case 'print': window.print(); break;
    case 'pdf': savePdf(`Отчёт_адиабата_${safeName(TPDF) || 'студент'}.pdf`); break;
    case 'folder-pick': tauri('pick_folder').then(d => { if (d) { FOLDER = d; store.set('lw3d-folder', d); render(); folderLoad(); } }).catch(e => toast(esc(String(e)), 'bad')); break;
    case 'folder-load': folderLoad(); break;
    case 'folder-clear': FOLDER = ''; store.set('lw3d-folder', ''); render(); break;
    case 'tlab': TLAB = +d.v; render(); break;
    case 'csv': if (TLAB !== 3) { saveFile(`ЛР${TLAB}_результаты_${new Date().toLocaleDateString('ru-RU').replace(/\./g, '-')}.csv`, tCsvLab(), 'csv', 'Таблица для Excel'); break; } saveFile(`Адиабата_результаты_${new Date().toLocaleDateString('ru-RU').replace(/\./g, '-')}.csv`, tCsv(), 'csv', 'Таблица для Excel'); break;
    case 'clear': if (confirm('Убрать все загруженные работы из списка? Сами файлы останутся на диске.')) { TROWS = []; tSave(); render(); } break;
  }
});
document.addEventListener('dragenter', e => { const z = $('.drop'); if (z && SCREEN === 'teacher') z.classList.add('over'); });
document.addEventListener('dragleave', e => { const z = $('.drop'); if (z && !e.relatedTarget) z.classList.remove('over'); });
document.addEventListener('drop', () => { const z = $('.drop'); if (z) z.classList.remove('over'); });

render();

/* ---------- ЛР 1 и ЛР 2 ---------- */
function tTabs() {
  return `<div class="ttabs">${[1, 2, 3].map(n => { const k = TROWS.filter(r => (r.d.lab || 3) === n).length;
    return `<button data-t="tlab" data-v="${n}" class="${TLAB === n ? 'on' : ''}">ЛР ${n}${k ? ` <small>${k}</small>` : ''}</button>`; }).join('')}</div>`;
}
function tRowLab(r) {
  const n = r.d.lab, L = LABS[n], S = r.d.state, demo = !!(S.demo || (S.dx && S.dx.demo)), done = !!S.done;
  let res = ''; if (done) { try { res = withLabState(n, S, () => L.result()); } catch (e) { res = ''; } }
  const adm = L.admit.filter(([, a], i) => S.admit && S.admit[i] === a).length, cq = L.cq.filter(([, a], i) => S.cq && S.cq[i] === a).length;
  const stage = demo ? 'демо' : done ? 'защищена' : L.steps[Math.min(S.max || 0, L.steps.length - 1)][1].toLowerCase();
  return { fio: S.fio || r.d.student.fio || '—', group: S.group || r.d.student.group || '', date: S.date || '', stage, done, res, adm, cq, dx: S.dx || {}, auth: r.ok && !demo, demo, sig: L.sig(S), n };
}
function vTeacherLab() {
  const rows = TVIEW.map(tRowLab), dups = rows.map((r, i) => rows.filter((x, j) => j !== i && r.sig && x.sig === r.sig).map(x => x.fio)), fake = rows.filter((r, i) => !r.auth || dups[i].length).length;
  ui.main.innerHTML = `<div class="head"><h1>Результаты группы</h1>${tTabs()}<div class="sp"></div>${themeBtn()}
      <button class="btn line" data-t="back">${ic('chevron-left')} Выйти</button>
      <button class="btn line" data-t="csv" ${rows.length ? '' : 'disabled'}>${ic('grid-3x3')} В Excel (CSV)</button>
      <button class="btn" data-t="add">${ic('plus')} Добавить файлы</button></div>
    ${folderCard()}
    <div class="drop mt" data-t="add">${ic('file-text')} Перетащи сюда файлы работ, которые сохранили студенты, или нажми, чтобы выбрать.</div>
    <div class="stats"><div class="stat"><small>Работ — ЛР ${TLAB}</small><b>${rows.length}</b></div><div class="stat"><small>Защищено</small><b style="color:var(--ok)">${rows.filter(r => r.done).length}</b></div>
      <div class="stat"><small>Подлинность</small><b style="color:${fake ? 'var(--bad)' : 'var(--ok)'}">${rows.length ? (fake ? `${fake} под вопросом` : 'всё в порядке') : '—'}</b></div></div>
    <section class="card mt" style="padding:0; overflow:hidden">${rows.length ? `<table class="tt"><tr><th>Студент</th><th>Класс</th><th>Дата</th><th>Этап</th><th>Допуск</th><th>Результат</th><th>Защита</th><th>Попытки<br>доп. / обр. / защ.</th><th>Файл</th></tr>
      ${rows.map((r, i) => `<tr class="r" data-t="open" data-v="${i}"><td><div style="display:flex; gap:10px; align-items:center">${ava(r.fio)}<div><b>${esc(r.fio)}</b>${r.dx.device === 'android' ? ' <span class="pill">с телефона</span>' : ''}${dups[i].length ? `<small class="dup">${ic('circle-x')} измерения совпадают: ${esc(dups[i].join(', '))}</small>` : ''}</div></div></td><td>${esc(r.group)}</td><td>${esc(r.date)}</td>
        <td><span class="pill ${r.done ? 'ok' : 'warn'}">${esc(r.stage)}</span></td><td class="n">${r.adm}/8</td><td><b>${esc(r.res || '—')}</b></td><td class="n">${r.done ? `${r.cq}/${LABS[r.n].cq.length}` : '—'}</td>
        <td class="n">${r.dx.admitTries || 0} / ${r.dx.procTries || 0} / ${r.dx.cqTries || 0}</td><td>${r.demo ? '<span class="pill warn">демо</span>' : r.auth ? `<span class="pill ok">${ic('circle-check')} подлинный</span>` : `<span class="pill bad">${ic('circle-x')} изменён</span>`}</td></tr>`).join('')}</table>`
      : `<p class="mute center" style="padding:30px">Работ по ЛР ${TLAB} пока нет.</p>`}</section>`;
}
function tOpenLab(r) {
  const n = r.d.lab, L = LABS[n], row = tRowLab(r), S = r.d.state;
  let html = ''; if (S.done) { try { html = withLabState(n, S, () => L.report()); } catch (e) { html = ''; } }
  $('#printroot').innerHTML = html; TPDF = row.fio;
  modal(`${esc(row.fio)} · ${esc(row.group)} · ЛР ${n}`, `${row.auth || row.demo ? '' : `<p class="pill bad" style="margin-bottom:12px">${ic('circle-x')} Файл изменён после сохранения в программе — результат не подтверждён</p>`}
    ${tDetails(S, n)}${html ? `<div class="paper" style="max-height:none"><div class="lwr">${html}</div></div>` : `<p class="mute">Работа не доведена до отчёта: этап — ${esc(row.stage)}.</p>`}`,
    html ? `<button class="btn" data-t="pdf">${ic('file-text')} Сохранить PDF</button><button class="btn line" data-t="print">${ic('printer')} Печать</button>` : '');
}
function tCsvLab() {
  const q = v => { const s = String(v ?? ''); return /[;"\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
  const head = ['ФИО', 'Класс', 'Дата', 'Этап', 'Допуск (верно из 8)', 'Результат', 'Защита (верно)', 'Попыток допуска', 'Попыток обработки', 'Попыток защиты', 'Подлинность'];
  const lines = TVIEW.map(tRowLab).map(r => [r.fio, r.group, r.date, r.stage, r.adm, r.res, r.done ? r.cq : '', r.dx.admitTries || 0, r.dx.procTries || 0, r.dx.cqTries || 0, r.demo ? 'ДЕМО' : r.auth ? 'подлинный' : 'ИЗМЕНЁН'].map(q).join(';'));
  return '﻿' + [head.map(q).join(';'), ...lines].join('\r\n');
}
