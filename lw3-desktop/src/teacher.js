/* =====================================================================
   Режим преподавателя (под паролем): открыть файлы работ (.lw3) группы, сводная таблица,
   проверка подлинности, отчёт любого курсанта, выгрузка в Excel (CSV).
   ===================================================================== */
const TKEY = 'lw3d-teacher';
let TROWS = store.get(TKEY, []);          // [{ name, ok, d }] — работы всех лабораторных; d.lab — номер работы
let TLAB = 'home', TLASTLAB = 3, TVIEW = [];   // раздел кабинета (home, 1…8, exam, journal, acc, files) и строки раздела
const tSave = () => store.set(TKEY, TROWS);
const nf = (v, d) => Number.isFinite(v) ? v.toFixed(d).replace('.', ',') : '';

function tRow(r) {
  const S = r.d.state, done = !!S.done, runs = S.runs || [];
  let o = null; if (runs.length === L3.N) { const keep = L3S; L3S = S; try { o = l3Calc(); } finally { L3S = keep; } }
  // проверка: γ из таблицы совпадает с записанной сводкой
  const consistent = !o || !r.d.summary || Math.abs(o.gm - r.d.summary.gm) < 1e-9;
  const demo = !!(S.demo || (S.dx && S.dx.demo));   // демо-прохождение — не работа курсанта
  const stage = demo ? 'демо' : done ? 'защищена' : L3.steps[Math.min(S.max || 0, L3.steps.length - 1)][1].toLowerCase();
  const adm = qCount(3, S, 'admit'), cq = qCount(3, S, 'cq');
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
    const kf = x => (x.d.state.fio || '') + '|' + (x.d.state.group || '') + '|' + (x.d.lab || 3) + (x.d.kind === 'exam' ? '|' + x.d.state.exam.id : ''), key = kf(r);
    TROWS = TROWS.filter(x => kf(x) !== key); TLAB = r.d.lab || 3;   // повторный файл того же курсанта (той же попытки экзамена) заменяет прежний
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
  if (!IS_TAURI) return `<section class="card mt folder"><b>${ic('layers')} Папка класса для сдачи работ</b><p class="mute small">Доступно в программе для Windows: курсанты сдают работу в общую папку, а вы загружаете все работы одной кнопкой.</p></section>`;
  return `<section class="card mt folder"><div class="folder-row"><div><b>${ic('layers')} Папка класса для сдачи работ</b>
      <p class="mute small">${FOLDER ? esc(FOLDER) : 'Не выбрана. Выберите общую сетевую папку класса — после защиты работа курсанта сама сохранится туда.'}${FOLDER_FIXED ? ' · задана в файле adiabata.json рядом с программой' : ''}</p></div>
      ${FOLDER ? `<button class="btn" data-t="folder-load">${ic('rotate-cw')} Загрузить работы из папки</button>` : ''}
      ${FOLDER_FIXED ? '' : `<button class="btn line" data-t="folder-pick">${ic('layers')} ${FOLDER ? 'Другая папка' : 'Выбрать папку'}</button>${FOLDER ? `<button class="btn ghost" data-t="folder-clear">${ic('x')}</button>` : ''}`}</div>
    <p class="mute small">Папка запоминается на этом компьютере. Чтобы задать её сразу для всех компьютеров класса, положите рядом с программой файл <b>adiabata.json</b> с текстом <code>{"folder": "\\\\сервер\\папка"}</code>.</p></section>`;
}
/* совпадающие измерения у разных курсантов: ≥ 2 одинаковых пары h₁/h₂ из 3 → вероятно, списано */
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
  document.body.classList.add('noside', 'fzapp'); ui.side.innerHTML = '';
  if (typeof TLAB === 'number') TLASTLAB = TLAB;
  TVIEW = TROWS.filter(r => (r.d.lab || 3) === TLAB);
  ({ home: vTeacherHome, journal: vTeacherJournal, files: vTeacherFiles, exam: vTeacherExam, acc: vTeacherAcc })[TLAB] ? ({ home: vTeacherHome, journal: vTeacherJournal, files: vTeacherFiles, exam: vTeacherExam, acc: vTeacherAcc })[TLAB]()
    : TLAB !== 3 ? vTeacherLab() : vTeacher3();
  ui.main.innerHTML = tShell(ui.main.innerHTML);
}
function vTeacher3() {
  const rows = TVIEW.map(tRow), fin = rows.filter(r => r.o), gms = fin.map(r => r.o.gm), dups = tDups(rows);
  const mean = gms.length ? gms.reduce((s, x) => s + x, 0) / gms.length : NaN, fake = rows.filter((r, i) => !r.auth || dups[i].length).length;
  ui.main.innerHTML = `<div class="head">${tTitle()}<div class="sp"></div>
      <button class="btn line" data-t="demo">${ic('graduation-cap')} Демо-прохождение</button>
      <button class="btn line" data-t="csv" ${rows.length ? '' : 'disabled'}>${ic('grid-3x3')} В Excel (CSV)</button>
      <button class="btn line" data-t="clear" ${rows.length ? '' : 'disabled'}>${ic('trash-2')} Очистить</button>
      <button class="btn" data-t="add">${ic('plus')} Добавить файлы</button></div>
    <div class="stats">
      <div class="stat"><small>Работ</small><b>${rows.length}</b></div>
      <div class="stat"><small>Защищено</small><b style="color:var(--ok)">${rows.filter(r => r.done).length}</b></div>
      <div class="stat"><small>Средний ⟨γ⟩ группы</small><b>${gms.length ? nf(mean, 3) : '—'}</b></div>
      <div class="stat"><small>Подлинность</small><b style="color:${fake ? 'var(--bad)' : 'var(--ok)'}">${rows.length ? (fake ? `${fake} под вопросом` : 'всё в порядке') : '—'}</b></div></div>
    ${gms.length ? `<section class="card"><h2>${ic('target')} ⟨γ⟩ по студентам <span class="pill">теория γ = 1,40</span></h2>${tStrip(fin)}</section>` : ''}
    <section class="card mt" style="padding:0; overflow:hidden">${rows.length ? `<table class="tt"><tr><th>Курсант</th><th>Класс</th><th>Дата</th><th>Этап</th><th>Допуск</th><th>h₁ / h₂, мм</th><th>⟨γ⟩ ± ⟨Δγ⟩</th><th>ε, %</th><th>Защита</th><th>Попытки<br>доп. / обр. / защ.</th><th>Файл</th></tr>
      ${rows.map((r, i) => `<tr class="r" data-t="open" data-v="${i}"><td><div style="display:flex; gap:10px; align-items:center">${ava(r.fio)}<div><b>${esc(r.fio)}</b>${r.dx.device === 'android' ? ' <span class="pill">с телефона</span>' : r.dx.device === 'ios' ? ' <span class="pill">с iPhone</span>' : ''}${dups[i].length ? `<small class="dup">${ic('circle-x')} измерения совпадают: ${esc(dups[i].join(', '))}</small>` : ''}</div></div></td><td>${esc(r.group)}</td><td>${esc(r.date)}</td>
        <td><span class="pill ${r.done ? 'ok' : 'warn'}">${esc(r.stage)}</span></td><td class="n">${r.adm}/8</td>
        <td>${r.runs.map(x => `${x.h1}/${x.h2}`).join(' · ') || '—'}</td><td class="n"><b>${r.o ? esc(l3Res(r.o)) : '—'}</b></td><td class="n">${r.o ? nf(r.o.e, 1) : '—'}</td>
        <td class="n">${r.done ? `${r.cq}/8` : '—'}</td><td class="n">${r.dx.admitTries || 0} / ${r.dx.procTries || 0} / ${r.dx.cqTries || 0}</td>
        <td>${r.demo ? `<span class="pill warn">демо</span>` : r.auth ? `<span class="pill ok">${ic('circle-check')} подлинный</span>` : `<span class="pill bad">${ic('circle-x')} изменён</span>`}</td></tr>`).join('')}</table>`
      : '<p class="mute center" style="padding:30px">Пока пусто. Попроси курсантов сохранить работу (кнопка «Сохранить файл для преподавателя» или Ctrl+S) и собери файлы на флешку или в общую папку.</p>'}</section>
    <p class="mute small mt">Цифровая подпись защищает результат от ручной правки. Файлы хранятся только на этом компьютере, пока вы не очистите список.</p>`;
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
  const r = TVIEW[i]; if (!r) return; if (r.d.lab === 'exam') return tOpenExam(r); if ((r.d.lab || 3) !== 3) return tOpenLab(r); const row = tRow(r);
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
  const qa = (list, ans) => list.map(([q, a], i) => `<li class="${ans && qEq(ans[i], a) ? 'ok' : 'bad'}">${ans && qEq(ans[i], a) ? '✓' : '✗'} ${esc(q)}${ans && ans[i] && !qEq(ans[i], a) ? `<small>ответ: ${esc(ans[i])}</small>` : ''}</li>`).join('');
  const pk = dx.pk || {}, pkTxt = Object.keys(pk).length ? Object.entries(pk).map(([k, n]) => `${PK_NAME[k] || k} — ${n}`).join(', ') : 'нет';
  return `<section class="tdet"><div class="tdet-row">${times}<span class="pill">всего: ${dur(end - at('admit'))}</span></div>
    <div class="tdet-row mute small">Попытки: допуск — ${dx.admitTries || 0}${dx.fails && dx.fails.admit ? ` (неудачных — ${dx.fails.admit})` : ''}, обработка — ${dx.procTries || 0}, защита — ${dx.cqTries || 0}${dx.fails && dx.fails.cq ? ` (неудачных — ${dx.fails.cq})` : ''}. Ошибки в ячейках обработки: ${esc(pkTxt)}.</div>
    <div class="grid2 even"><div><b>Допуск</b><ul class="tqa">${qa(S.admitSet ? qList(n, Object.assign({}, S), 'admit') : QORIG[n].admit, S.admit)}</ul></div><div><b>Защита</b><ul class="tqa">${S.cqOk || Object.keys(S.cq || {}).length ? qa(S.cqSet ? qList(n, Object.assign({}, S), 'cq') : QORIG[n].cq, S.cq) : '<li class="mute">ещё не проходил</li>'}</ul></div></div></section>`;
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
/* ---------- вход преподавателя ----------
   Пароль кафедры задаётся при сборке программы (секрет FZ_TEACHER_PASS в настройках репозитория) — в программе только
   его хеш PBKDF2-SHA256 (TEACHER_PW, подставляет build.py). Создать или сбросить пароль на компьютере нельзя.
   После 5 неверных попыток подряд вход блокируется на 1 минуту. */
const hexBytes = h => new Uint8Array(h.match(/../g).map(x => parseInt(x, 16)));
async function teacherCheck(pw) {
  try {
    const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(pw), 'PBKDF2', false, ['deriveBits']);
    const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: hexBytes(TEACHER_PW.salt), iterations: TEACHER_PW.it, hash: 'SHA-256' }, key, 256);
    return hex(new Uint8Array(bits)) === TEACHER_PW.hash;
  } catch (e) { return false; }
}
const TLOCK = { fails: 0, until: 0 };
function vLock() {
  document.body.classList.add('noside'); ui.side.innerHTML = '';
  ui.main.innerHTML = `<div class="lock"><div class="login-brand">${LOGO}<h1 style="font-size:24px">Кабинет преподавателя</h1>
      <p>Введите пароль кафедры</p></div>
    <div class="card"><label class="field">Пароль<input type="password" id="tp" autocomplete="off"></label>
      <button class="btn wide big mt" data-t="unlock">Войти ${kbd('Enter')}</button>
      <p class="lw-msg bad" id="tp-msg"></p><p class="mute small">Пароль выдаёт кафедра. Создать или сбросить его в программе нельзя.</p></div>
    <div class="row mt"><button class="btn ghost" data-t="back">${ic('chevron-left')} Назад</button></div></div>`;
  setTimeout(() => { const f = $('#tp'); if (f) f.focus(); }, 0);
}
const lockMsg = t => { const m = $('#tp-msg'); if (m) m.textContent = t; };
document.addEventListener('click', async e => {
  const b = e.target.closest && e.target.closest('[data-t]'); if (!b || SCREEN !== 'lock') return;
  switch (b.dataset.t) {
    case 'back': SCREEN = 'home'; render(); break;
    case 'unlock': {
      if (Date.now() < TLOCK.until) { lockMsg(`Слишком много неверных попыток. Подождите ${Math.ceil((TLOCK.until - Date.now()) / 1000)} с.`); break; }
      const v = $('#tp').value; b.disabled = true;
      const ok = await teacherCheck(v); b.disabled = false;
      if (ok) { TLOCK.fails = 0; TLAB = 'home'; SCREEN = 'teacher'; render(); break; }
      TLOCK.fails++; if (TLOCK.fails >= 5) { TLOCK.fails = 0; TLOCK.until = Date.now() + 60000; }
      lockMsg('Неверный пароль.'); const f = $('#tp'); if (f) f.select(); break;
    }
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
    case 'pdf': savePdf(`Отчёт_ЛР3_${safeName(TPDF) || 'курсант'}.pdf`); break;
    case 'folder-pick': tauri('pick_folder').then(d => { if (d) { FOLDER = d; store.set('lw3d-folder', d); render(); folderLoad(); } }).catch(e => toast(esc(String(e)), 'bad')); break;
    case 'folder-load': folderLoad(); break;
    case 'folder-clear': FOLDER = ''; store.set('lw3d-folder', ''); render(); break;
    case 'tlab': TLAB = d.v === 'labs' ? TLASTLAB : /^\d+$/.test(d.v) ? +d.v : d.v; render(); ui.main.scrollTop = 0; break;
    case 'tlab-open': TLAB = /^\d+$/.test(d.v) ? +d.v : d.v; render(); setTimeout(() => tOpen(+d.i), 0); break;
    case 'theme': setTheme(isLight() ? 'dark' : 'light'); break;
    case 'navmini': NAVMINI = !NAVMINI; lsSet('fz-nav-mini', NAVMINI ? '1' : '0'); render(); break;
    case 'jcsv': saveFile(`Журнал_${new Date().toLocaleDateString('ru-RU').replace(/\./g, '-')}.csv`, tCsvJournal(), 'csv', 'Таблица для Excel'); break;
    case 'jgroup': TJG = d.v; render(); break;
    case 'pwreset': { const p = profiles().find(x => x.id === d.v); if (p && confirm(`Сбросить пароль курсанта «${p.fio}»? При следующем входе он задаст новый пароль. Работы и результаты сохранятся.`)) { acctResetPw(p.id); render(); toast('Пароль сброшен'); } break; }
    case 'csv': if (TLAB === 'exam') { saveFile(`Экзамены_результаты_${new Date().toLocaleDateString('ru-RU').replace(/\./g, '-')}.csv`, tCsvExam(), 'csv', 'Таблица для Excel'); break; }
      if (TLAB !== 3) { saveFile(`ЛР${TLAB}_результаты_${new Date().toLocaleDateString('ru-RU').replace(/\./g, '-')}.csv`, tCsvLab(), 'csv', 'Таблица для Excel'); break; } saveFile(`Адиабата_результаты_${new Date().toLocaleDateString('ru-RU').replace(/\./g, '-')}.csv`, tCsv(), 'csv', 'Таблица для Excel'); break;
    case 'clear': if (confirm('Убрать все загруженные работы из списка? Сами файлы останутся на диске.')) { TROWS = []; tSave(); render(); } break;
  }
});
document.addEventListener('dragenter', e => { const z = $('.drop'); if (z && SCREEN === 'teacher') z.classList.add('over'); });
document.addEventListener('dragleave', e => { const z = $('.drop'); if (z && !e.relatedTarget) z.classList.remove('over'); });
document.addEventListener('drop', () => { const z = $('.drop'); if (z) z.classList.remove('over'); });

render();

/* ---------- ЛР 1 и ЛР 2 ---------- */
/* ---------- экзамены (файлы результата из раздела «Тесты») ---------- */
function tRowExam(r) {
  const a = r.d.state.exam || {}, S = r.d.state;
  return { fio: S.fio || r.d.student.fio || '—', group: S.group || r.d.student.group || '', a, auth: r.ok && !!r.d.summary && r.d.summary.score === a.score };
}
function vTeacherExam() {
  const rows = TVIEW.map(tRowExam), fake = rows.filter(r => !r.auth).length;
  const avg = rows.length ? Math.round(rows.reduce((s, r) => s + (r.a.score || 0), 0) / rows.length) : 0;
  ui.main.innerHTML = `<div class="head">${tTitle()}<div class="sp"></div>
      <button class="btn line" data-t="csv" ${rows.length ? '' : 'disabled'}>${ic('grid-3x3')} В Excel (CSV)</button>
      <button class="btn" data-t="add">${ic('plus')} Добавить файлы</button></div>
    <div class="stats"><div class="stat"><small>Экзаменов</small><b>${rows.length}</b></div><div class="stat"><small>Средний балл</small><b>${rows.length ? avg : '—'}</b></div>
      <div class="stat"><small>Подлинность</small><b style="color:${fake ? 'var(--bad)' : 'var(--ok)'}">${rows.length ? (fake ? `${fake} под вопросом` : 'всё в порядке') : '—'}</b></div></div>
    <section class="card mt" style="padding:0; overflow:hidden">${rows.length ? `<table class="tt"><tr><th>Курсант</th><th>Класс</th><th>Экзамен</th><th>Дата</th><th>Верно</th><th>Баллы</th><th>Оценка</th><th>Время</th><th>Подлинность</th></tr>
      ${rows.map((r, i) => `<tr class="r" data-t="open" data-v="${i}"><td><div style="display:flex; gap:10px; align-items:center">${ava(r.fio)}<b>${esc(r.fio)}</b></div></td><td>${esc(r.group)}</td>
        <td>${esc(topicName(r.a.topic))}${r.a.no > 1 ? ` <span class="pill warn">попытка ${r.a.no}</span>` : ''}${r.a.aborted ? ' <span class="pill bad">прерван</span>' : ''}</td><td>${r.a.date ? new Date(r.a.date).toLocaleString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : ''}</td>
        <td class="n">${r.a.right} из ${r.a.n}</td><td class="n"><b>${r.a.score}</b></td><td><span class="fz-best g${r.a.grade}">«${r.a.grade}»</span></td><td class="n">${Math.floor((r.a.spent || 0) / 60)} мин</td>
        <td>${r.auth ? `<span class="pill ok">${ic('circle-check')} подлинный</span>` : `<span class="pill bad">${ic('circle-x')} изменён</span>`}</td></tr>`).join('')}</table>`
      : '<p class="mute center" style="padding:30px">Файлов экзаменов пока нет.</p>'}</section>`;
}
function tOpenExam(r) {
  const row = tRowExam(r), a = row.a;
  const items = (a.items || []).map((x, k) => { const q = BANK && BANK.byId[x.id];
    return `<tr><td class="n">${k + 1}</td><td>№ ${esc(x.id)}</td><td>${q ? esc(q.t.slice(0, 120)) + (q.t.length > 120 ? '…' : '') : ''}</td><td>${x.v == null ? '<span class="mute">нет ответа</span>' : esc(x.v)}</td><td>${x.ok ? `<span class="pill ok">верно</span>` : `<span class="pill bad">неверно</span>`}</td><td class="n">${x.t != null ? x.t + ' с' : ''}</td></tr>`; }).join('');
  modal(`${esc(row.fio)} · ${esc(row.group)} · ${esc(topicName(a.topic))}`, `${row.auth ? '' : `<p class="pill bad" style="margin-bottom:12px">${ic('circle-x')} Файл изменён после сохранения в программе — результат не подтверждён</p>`}
    <div class="stats"><div class="stat"><small>Баллы</small><b>${a.score}</b></div><div class="stat"><small>Оценка</small><b>«${a.grade}» ${GRADE_T[a.grade] || ''}</b></div><div class="stat"><small>Верно</small><b>${a.right} из ${a.n}</b></div></div>
    <table class="tt mt"><tr><th>№</th><th>Вопрос</th><th>Текст</th><th>Ответ курсанта</th><th></th><th>Время</th></tr>${items}</table>`);
}
function tCsvExam() {
  const q = v => { const s = String(v ?? ''); return /[;"\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
  const head = ['ФИО', 'Класс', 'Экзамен', 'Дата', 'Верно', 'Вопросов', 'Баллы', 'Оценка', 'Время, мин', 'Подлинность'];
  const lines = TVIEW.map(tRowExam).map(r => [r.fio, r.group, topicName(r.a.topic), r.a.date ? new Date(r.a.date).toLocaleString('ru-RU') : '', r.a.right, r.a.n, r.a.score, r.a.grade, Math.round((r.a.spent || 0) / 60), r.auth ? 'подлинный' : 'ИЗМЕНЁН'].map(q).join(';'));
  return '\ufeff' + [head.map(q).join(';'), ...lines].join('\r\n');
}
/* ---------- курсанты на этом компьютере: сброс пароля ---------- */
function vTeacherAcc() {
  const ps = profiles();
  ui.main.innerHTML = `<div class="head"><div><h1>Курсанты на этом компьютере</h1><p class="mute">Учётные записи, созданные в программе на этом компьютере.</p></div></div>
    <p class="mute">Учётные записи хранятся только на этом компьютере. Если курсант забыл пароль — сбросьте его: при следующем входе курсант задаст новый. Работы и результаты при этом сохраняются.</p>
    <section class="card mt" style="padding:0; overflow:hidden">${ps.length ? `<table class="tt"><tr><th>Курсант</th><th>Класс</th><th>Зарегистрирован</th><th>Пароль</th><th></th></tr>
      ${ps.map(p => `<tr><td><div style="display:flex; gap:10px; align-items:center">${ava(p.fio)}<b>${esc(p.fio)}</b></div></td><td>${esc(p.group || '')}</td><td>${p.created ? new Date(p.created).toLocaleDateString('ru-RU') : ''}</td>
        <td>${acctHasPw(p) ? '<span class="pill ok">задан</span>' : `<span class="pill warn">${p.pwReset ? 'сброшен' : 'не задан'}</span>`}</td><td>${acctHasPw(p) ? `<button class="btn line" data-t="pwreset" data-v="${p.id}">${ic('rotate-ccw')} Сбросить пароль</button>` : ''}</td></tr>`).join('')}</table>`
      : '<p class="mute center" style="padding:30px">На этом компьютере нет учётных записей курсантов.</p>'}</section>`;
}
function tRowLab(r) {
  const n = r.d.lab, L = LABS[n], S = r.d.state, demo = !!(S.demo || (S.dx && S.dx.demo)), done = !!S.done;
  let res = ''; if (done) { try { res = withLabState(n, S, () => L.result()); } catch (e) { res = ''; } }
  const adm = qCount(n, S, 'admit'), cq = qCount(n, S, 'cq');
  const stage = demo ? 'демо' : done ? 'защищена' : L.steps[Math.min(S.max || 0, L.steps.length - 1)][1].toLowerCase();
  return { fio: S.fio || r.d.student.fio || '—', group: S.group || r.d.student.group || '', date: S.date || '', stage, done, res, adm, cq, dx: S.dx || {}, auth: r.ok && !demo, demo, sig: L.sig(S), n };
}
function vTeacherLab() {
  const rows = TVIEW.map(tRowLab), dups = rows.map((r, i) => rows.filter((x, j) => j !== i && r.sig && x.sig === r.sig).map(x => x.fio)), fake = rows.filter((r, i) => !r.auth || dups[i].length).length;
  ui.main.innerHTML = `<div class="head">${tTitle()}<div class="sp"></div>
      <button class="btn line" data-t="csv" ${rows.length ? '' : 'disabled'}>${ic('grid-3x3')} В Excel (CSV)</button>
      <button class="btn" data-t="add">${ic('plus')} Добавить файлы</button></div>
    <div class="stats"><div class="stat"><small>Работ — ЛР ${TLAB}</small><b>${rows.length}</b></div><div class="stat"><small>Защищено</small><b style="color:var(--ok)">${rows.filter(r => r.done).length}</b></div>
      <div class="stat"><small>Подлинность</small><b style="color:${fake ? 'var(--bad)' : 'var(--ok)'}">${rows.length ? (fake ? `${fake} под вопросом` : 'всё в порядке') : '—'}</b></div></div>
    <section class="card mt" style="padding:0; overflow:hidden">${rows.length ? `<table class="tt"><tr><th>Курсант</th><th>Класс</th><th>Дата</th><th>Этап</th><th>Допуск</th><th>Результат</th><th>Защита</th><th>Попытки<br>доп. / обр. / защ.</th><th>Файл</th></tr>
      ${rows.map((r, i) => `<tr class="r" data-t="open" data-v="${i}"><td><div style="display:flex; gap:10px; align-items:center">${ava(r.fio)}<div><b>${esc(r.fio)}</b>${r.dx.device === 'android' ? ' <span class="pill">с телефона</span>' : r.dx.device === 'ios' ? ' <span class="pill">с iPhone</span>' : ''}${dups[i].length ? `<small class="dup">${ic('circle-x')} измерения совпадают: ${esc(dups[i].join(', '))}</small>` : ''}</div></div></td><td>${esc(r.group)}</td><td>${esc(r.date)}</td>
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

/* ---------- кабинет преподавателя: меню слева и разделы ----------
   Обзор (сводка по всем загруженным файлам), Лабораторные работы (ЛР 1–8), Экзамены, Журнал (курсанты × работы + комментарии),
   Курсанты (учётные записи на этом компьютере), Файлы и папка (загрузка, папка класса, демо, очистка). */
const TNAV = [['home', 'Обзор', 'house'], ['labs', 'Работы курсантов', 'flask-conical'], ['exam', 'Экзамены', 'graduation-cap'], ['journal', 'Журнал', 'clipboard-list'], ['acc', 'Курсанты', 'users'], ['files', 'Файлы и папка', 'inbox']];
const tLabRows = n => TROWS.filter(r => (r.d.lab || 3) === n);
const tKey = (fio, group) => `${String(fio || '').trim()}|${String(group || '').trim()}`;
const TNKEY = 'lw3d-tnotes';
let TJG = '';
function tShell(inner) {
  const cur = typeof TLAB === 'number' ? 'labs' : TLAB, tip = t => NAVMINI ? ` title="${t}"` : '';
  const cnt = { labs: TROWS.filter(r => r.d.lab !== 'exam').length, exam: tLabRows('exam').length, acc: profiles().length };
  return `<div class="fz-app tch ${NAVMINI ? 'mini' : ''}"><nav class="fz-nav">
      <div class="fz-brand">${LOGO}<span class="fz-bt"><b>Физпрактикум</b><small>Кабинет преподавателя</small></span></div>
      ${TNAV.map(([k, t, i]) => `<button class="fz-ni ${cur === k ? 'on' : ''}" data-t="tlab" data-v="${k}"${tip(t)}>${ic(i)}<span>${t}</span>${cnt[k] ? `<em class="fz-cnt-b">${cnt[k]}</em>` : ''}</button>`).join('')}
      <span class="fz-sp"></span>
      <button class="fz-ni" data-t="theme"${tip(isLight() ? 'Тёмная тема' : 'Светлая тема')}>${ic(isLight() ? 'moon' : 'sun')}<span>${isLight() ? 'Тёмная тема' : 'Светлая тема'}</span></button>
      <button class="fz-ni" data-t="navmini" title="${NAVMINI ? 'Развернуть меню' : 'Свернуть меню'}">${ic(NAVMINI ? 'panel-left-open' : 'panel-left-close')}<span>Свернуть меню</span></button>
      <button class="fz-ni" data-t="back"${tip('Выйти')}>${ic('log-out')}<span>Выйти из кабинета</span></button>
    </nav><main class="fz-page tpage">${inner}</main></div>`;
}
function tTitle() {
  if (typeof TLAB === 'number') return `<div><span class="fz-n">Лабораторная работа № ${TLAB}</span><h1>${esc(labTitle(TLAB))}</h1>
    <div class="ttabs">${labNums().map(n => { const k = tLabRows(n).length; return `<button data-t="tlab" data-v="${n}" class="${TLAB === n ? 'on' : ''}">ЛР ${n}${k ? ` <small>${k}</small>` : ''}</button>`; }).join('')}</div></div>`;
  if (TLAB === 'exam') return `<div><h1>Экзамены</h1><p class="mute">Файлы результатов экзаменов по темам и итогового экзамена.</p></div>`;
  return '<div><h1>Результаты группы</h1></div>';
}
/* сводка по одному файлу работы: этап, защищена ли, подлинность */
function tLabInfo(r) { const n = r.d.lab || 3; try { const x = n === 3 ? tRow(r) : tRowLab(r); return { n, fio: x.fio, group: x.group, done: x.done, stage: x.stage, auth: x.auth, demo: x.demo, res: n === 3 ? (x.o ? l3Res(x.o) : '') : x.res }; } catch (e) { return { n, fio: r.d.state.fio || '—', group: r.d.state.group || '', done: false, stage: '?', auth: false, demo: false, res: '' }; } }
function vTeacherHome() {
  const labs = TROWS.filter(r => r.d.lab !== 'exam'), ex = tLabRows('exam').map(tRowExam), li = labs.map(tLabInfo).filter(x => !x.demo);
  const studs = new Set([...li.map(x => tKey(x.fio, x.group)), ...ex.map(x => tKey(x.fio, x.group))]);
  const avg = ex.length ? Math.round(ex.reduce((s, x) => s + (x.a.score || 0), 0) / ex.length) : null;
  const issues = [];
  labNums().forEach(n => tLabRows(n).forEach((r, i) => { const x = tLabInfo(r); if (!x.auth && !x.demo) issues.push({ n, i, fio: x.fio, t: `ЛР ${n}: файл изменён после сохранения` }); }));
  tLabRows('exam').forEach((r, i) => { const x = tRowExam(r); if (!x.auth) issues.push({ n: 'exam', i, fio: x.fio, t: 'экзамен: файл изменён' }); else if (x.a.aborted) issues.push({ n: 'exam', i, fio: x.fio, t: `экзамен прерван (${topicName(x.a.topic)})` }); });
  const recent = TROWS.slice().sort((a, b) => String(b.d.saved || '').localeCompare(String(a.d.saved || ''))).slice(0, 6);
  if (!TROWS.length) ui.main.innerHTML = `<div class="head"><div><h1>Обзор</h1><p class="mute">Загрузите файлы, которые сохранили курсанты: работы (.lw3) и результаты экзаменов.</p></div></div>
    <div class="drop" data-t="add">${ic('file-text')} Перетащите сюда файлы <b>.lw3</b> или нажмите, чтобы выбрать.</div>${folderCard()}
    <div class="th-steps">${[['users', 'Курсанты выполняют работу', 'После защиты работа сохраняется в файл (Ctrl+S) или сразу в папку класса.'], ['inbox', 'Вы загружаете файлы', 'С флешки, перетаскиванием или одной кнопкой из папки класса.'], ['shield-check', 'Программа проверяет', 'Подпись файла показывает, менялся ли результат; совпадающие измерения отмечаются.'], ['clipboard-list', 'Журнал и отчёты', 'Сводный журнал, отчёт любого курсанта, выгрузка в Excel.']].map(([i, t, d], k) => `<div class="fz-tile"><span class="th-no">${k + 1}</span>${ic(i)}<b>${t}</b><p>${d}</p></div>`).join('')}</div>`;
  else ui.main.innerHTML = `<div class="head"><div><h1>Обзор</h1><p class="mute">Сводка по всем загруженным файлам.</p></div><div class="sp"></div><button class="btn line" data-t="tlab" data-v="journal">${ic('clipboard-list')} Журнал</button><button class="btn" data-t="add">${ic('plus')} Добавить файлы</button></div>
    <div class="fz-pstats"><div class="fz-pst">${ic('users')}<b>${studs.size}</b><span>курсантов в файлах</span></div><div class="fz-pst">${ic('flask-conical')}<b>${li.filter(x => x.done).length}<small> / ${li.length}</small></b><span>работ защищено</span></div>
      <div class="fz-pst">${ic('graduation-cap')}<b>${ex.length}</b><span>${avg == null ? 'экзаменов' : `экзаменов, средний балл ${avg}`}</span></div><div class="fz-pst">${ic('shield-check')}<b style="color:${issues.length ? 'var(--bad)' : 'var(--ok)'}">${issues.length}</b><span>${issues.length ? 'требуют внимания' : 'замечаний нет'}</span></div></div>
    <p class="fz-h">Лабораторные работы</p><div class="th-labs">${labNums().map(n => { const rs = tLabRows(n).map(tLabInfo).filter(x => !x.demo), d = rs.filter(x => x.done).length;
      return `<button class="th-lab" data-t="tlab" data-v="${n}"><img src="${cover(n)}" alt=""><span><small>ЛР № ${n}</small><b>${esc(labTitle(n))}</b><i>${rs.length ? `${d} защищено из ${rs.length}` : 'файлов нет'}</i><span class="fz-bar"><i style="width:${rs.length ? Math.round(d / rs.length * 100) : 0}%"></i></span></span></button>`; }).join('')}</div>
    <div class="fz-pgrid mt"><section class="fz-tile"><h2>${ic('circle-x')} Требуют внимания</h2>${issues.length ? issues.slice(0, 10).map(x => `<button class="th-row" data-t="tlab-open" data-v="${x.n}" data-i="${x.i}">${ava(x.fio)}<span><b>${esc(x.fio)}</b><small>${esc(x.t)}</small></span>${ic('chevron-right')}</button>`).join('') : '<p>Все файлы подлинные, прерванных экзаменов нет.</p>'}</section>
      <section class="fz-tile"><h2>${ic('history')} Последние файлы</h2>${recent.map(r => { const isEx = r.d.lab === 'exam', x = isEx ? tRowExam(r) : tLabInfo(r), lab = r.d.lab || 3, i = tLabRows(lab).indexOf(r);
        return `<button class="th-row" data-t="tlab-open" data-v="${lab}" data-i="${i}">${ava(x.fio)}<span><b>${esc(x.fio)}</b><small>${isEx ? `${esc(topicName(x.a.topic))} — ${x.a.score} баллов, «${x.a.grade}»` : `ЛР ${lab} — ${esc(x.stage)}${x.res ? ', ' + esc(x.res) : ''}`}</small></span>${ic('chevron-right')}</button>`; }).join('')}</section></div>`;
}
/* журнал: курсанты × работы, экзамены, комментарий преподавателя */
function tJournal() {
  const M = new Map(), get = (fio, group) => { const k = tKey(fio, group); if (!M.has(k)) M.set(k, { k, fio, group, labs: {}, ex: [] }); return M.get(k); };
  TROWS.forEach(r => { if (r.d.lab === 'exam') { const x = tRowExam(r); get(x.fio, x.group).ex.push(x); return; }
    const x = tLabInfo(r); if (x.demo) return; const st = get(x.fio, x.group), prev = st.labs[x.n]; if (!prev || (x.done && !prev.done)) st.labs[x.n] = x; });
  return [...M.values()].sort((a, b) => String(a.group).localeCompare(String(b.group), 'ru') || String(a.fio).localeCompare(String(b.fio), 'ru'));
}
function vTeacherJournal() {
  const all = tJournal(), groups = [...new Set(all.map(x => x.group).filter(Boolean))], rows = TJG ? all.filter(x => x.group === TJG) : all, notes = store.get(TNKEY, {});
  const cell = x => !x ? '<td class="tj-c none">—</td>' : `<td class="tj-c ${x.done ? 'ok' : 'go'}${x.auth ? '' : ' bad'}" title="${esc(x.stage)}${x.res ? ': ' + esc(x.res) : ''}${x.auth ? '' : ' — файл изменён'}">${x.done ? ic('check') : esc(x.stage.slice(0, 5))}${x.auth ? '' : ' !'}</td>`;
  const best = ex => ex.reduce((m, a) => (!m || a.a.score > m.a.score ? a : m), null);
  ui.main.innerHTML = `<div class="head"><div><h1>Журнал</h1><p class="mute">Курсанты из загруженных файлов: работы, экзамены и ваши комментарии. Комментарии хранятся только на этом компьютере.</p></div><div class="sp"></div>
      <button class="btn line" data-t="jcsv" ${rows.length ? '' : 'disabled'}>${ic('download')} В Excel (CSV)</button></div>
    ${groups.length > 1 ? `<div class="ttabs mb"><button data-t="jgroup" data-v="" class="${TJG ? '' : 'on'}">Все классы</button>${groups.map(g => `<button data-t="jgroup" data-v="${esc(g)}" class="${TJG === g ? 'on' : ''}">${esc(g)}</button>`).join('')}</div>` : ''}
    <section class="card" style="padding:0; overflow:auto">${rows.length ? `<table class="tt tj"><tr><th>Курсант</th><th>Класс</th>${labNums().map(n => `<th class="c" title="${esc(labTitle(n))}">ЛР ${n}</th>`).join('')}<th>Экзамены</th><th>Итоговый</th><th>Комментарий</th></tr>
      ${rows.map(x => { const b = best(x.ex.filter(e => e.a.topic !== 'final')), f = best(x.ex.filter(e => e.a.topic === 'final'));
        return `<tr><td><div style="display:flex; gap:10px; align-items:center">${ava(x.fio)}<b>${esc(x.fio)}</b></div></td><td>${esc(x.group)}</td>${labNums().map(n => cell(x.labs[n])).join('')}
        <td>${x.ex.filter(e => e.a.topic !== 'final').length ? `${x.ex.filter(e => e.a.topic !== 'final').length} · лучший ${b.a.score}` : '—'}</td><td>${f ? `<span class="fz-best g${f.a.grade}">${f.a.score} · «${f.a.grade}»</span>` : '—'}</td>
        <td><input class="tj-note" data-k="${esc(x.k)}" value="${esc(notes[x.k] || '')}" placeholder="заметка…" autocomplete="off"></td></tr>`; }).join('')}</table>`
      : '<p class="mute center" style="padding:30px">Журнал пуст: загрузите файлы работ и экзаменов.</p>'}</section>
    <p class="mute small mt">${ic('check')} — работа защищена; сокращение — этап, на котором остановился курсант; «!» — файл изменён после сохранения.</p>`;
}
document.addEventListener('change', e => { const t = e.target; if (!t.classList || !t.classList.contains('tj-note')) return; const n = store.get(TNKEY, {}); n[t.dataset.k] = t.value.trim(); if (!n[t.dataset.k]) delete n[t.dataset.k]; store.set(TNKEY, n); toast('Комментарий сохранён'); });
function tCsvJournal() {
  const q = v => { const s = String(v ?? ''); return /[;"\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; }, notes = store.get(TNKEY, {});
  const rows = TJG ? tJournal().filter(x => x.group === TJG) : tJournal();
  const head = ['ФИО', 'Класс', ...labNums().map(n => `ЛР ${n}`), 'Экзаменов по темам', 'Лучший балл по темам', 'Итоговый экзамен', 'Комментарий'];
  const lines = rows.map(x => { const t = x.ex.filter(e => e.a.topic !== 'final'), f = x.ex.filter(e => e.a.topic === 'final').sort((a, b) => b.a.score - a.a.score)[0];
    return [x.fio, x.group, ...labNums().map(n => x.labs[n] ? (x.labs[n].done ? 'защищена' : x.labs[n].stage) + (x.labs[n].auth ? '' : ' (ИЗМЕНЁН)') : ''), t.length, t.length ? Math.max(...t.map(e => e.a.score)) : '', f ? `${f.a.score} («${f.a.grade}»)` : '', notes[x.k] || ''].map(q).join(';'); });
  return '﻿' + [head.map(q).join(';'), ...lines].join('\r\n');
}
function vTeacherFiles() {
  const by = labNums().map(n => [n, tLabRows(n).length]).filter(x => x[1]), ne = tLabRows('exam').length;
  ui.main.innerHTML = `<div class="head"><div><h1>Файлы и папка</h1><p class="mute">Загрузка файлов курсантов, общая папка класса, демонстрация работы.</p></div><div class="sp"></div>
      <button class="btn line" data-t="clear" ${TROWS.length ? '' : 'disabled'}>${ic('trash-2')} Очистить список</button><button class="btn" data-t="add">${ic('plus')} Добавить файлы</button></div>
    <div class="drop" data-t="add">${ic('file-text')} Перетащите сюда файлы <b>.lw3</b>, которые сохранили курсанты, или нажмите, чтобы выбрать.</div>
    ${folderCard()}
    <div class="fz-pgrid mt"><section class="fz-tile"><h2>${ic('layers')} Загружено</h2>${TROWS.length ? `<div class="th-files">${by.map(([n, k]) => `<button data-t="tlab" data-v="${n}"><b>${k}</b><span>ЛР ${n}</span></button>`).join('')}${ne ? `<button data-t="tlab" data-v="exam"><b>${ne}</b><span>экзаменов</span></button>` : ''}</div>` : '<p>Файлов пока нет.</p>'}
        <p>Файлы хранятся только на этом компьютере, пока вы не очистите список. Повторный файл того же курсанта заменяет прежний.</p></section>
      <section class="fz-tile"><h2>${ic('graduation-cap')} Демонстрация</h2><p>Программа сама выполняет ЛР 3 и показывает сводку и отчёт. В список группы это не попадает: удобно показать курсантам, как оформляется работа.</p><button class="btn line" data-t="demo">${ic('play')} Демо-прохождение ЛР 3</button></section></div>`;
}
