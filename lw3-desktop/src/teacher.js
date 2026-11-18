/* =====================================================================
   Режим преподавателя: открыть файлы результатов (.lw3) группы, сводная таблица,
   проверка подлинности, отчёт любого студента, выгрузка в Excel (CSV).
   ===================================================================== */
const TKEY = 'lw3d-teacher';
let TROWS = store.get(TKEY, []);          // [{ name, ok, d }]
const tSave = () => store.set(TKEY, TROWS);
const nf = (v, d) => Number.isFinite(v) ? v.toFixed(d).replace('.', ',') : '';

function tRow(r) {
  const S = r.d.state, done = !!S.done, runs = S.runs || [];
  let o = null; if (runs.length === L3.N) { const keep = L3S; L3S = S; try { o = l3Calc(); } finally { L3S = keep; } }
  // проверка: γ из таблицы совпадает с записанной сводкой
  const consistent = !o || !r.d.summary || Math.abs(o.gm - r.d.summary.gm) < 1e-9;
  const stage = done ? 'защищена' : L3.steps[Math.min(S.max || 0, L3.steps.length - 1)][1].toLowerCase();
  const adm = L3_ADMIT.filter(([, a], i) => S.admit && S.admit[i] === a).length, cq = L3_CQ.filter(([, a], i) => S.cq && S.cq[i] === a).length;
  return { fio: S.fio || r.d.student.fio || '—', group: S.group || r.d.student.group || '', date: S.date || '', stage, done, runs, o, adm, cq, dx: S.dx || {}, auth: r.ok && consistent, saved: r.d.saved };
}
async function teacherAdd(files) {
  let added = 0, bad = 0;
  for (const f of files) {
    const r = unpackResult(await readFile(f));
    if (r.err) { bad++; continue; }
    const key = (r.d.state.fio || '') + '|' + (r.d.state.group || '');
    TROWS = TROWS.filter(x => ((x.d.state.fio || '') + '|' + (x.d.state.group || '')) !== key);   // повторный файл того же студента заменяет прежний
    TROWS.push({ name: f.name, ok: r.ok, d: r.d }); added++;
  }
  TROWS.sort((a, b) => String(a.d.state.fio).localeCompare(String(b.d.state.fio), 'ru'));
  tSave(); render();
  toast(`Добавлено работ: ${added}${bad ? ` · не распознано файлов: ${bad}` : ''}`, bad && !added ? 'bad' : '');
}
function vTeacher() {
  document.body.classList.add('noside'); ui.side.innerHTML = '';
  const rows = TROWS.map(tRow), fin = rows.filter(r => r.o), gms = fin.map(r => r.o.gm);
  const mean = gms.length ? gms.reduce((s, x) => s + x, 0) / gms.length : NaN, fake = rows.filter(r => !r.auth).length;
  ui.main.innerHTML = `<div class="head"><div><div class="kick">Режим преподавателя</div><h1>Результаты группы · ЛР № 3</h1></div><div class="sp"></div>
      <button class="btn line" data-t="back">${ic('chevron-left')} На главную</button>
      <button class="btn line" data-t="csv" ${rows.length ? '' : 'disabled'}>${ic('grid-3x3')} В Excel (CSV)</button>
      <button class="btn line" data-t="clear" ${rows.length ? '' : 'disabled'}>${ic('trash-2')} Очистить</button>
      <button class="btn" data-t="add">${ic('plus')} Добавить файлы</button></div>
    <div class="drop" data-t="add">${ic('file-text')} Перетащи сюда файлы <b>.lw3</b>, которые сохранили студенты, или нажми, чтобы выбрать.</div>
    <div class="stats">
      <div class="stat"><small>Работ</small><b>${rows.length}</b></div>
      <div class="stat"><small>Защищено</small><b style="color:var(--green)">${rows.filter(r => r.done).length}</b></div>
      <div class="stat"><small>Средний ⟨γ⟩ группы</small><b>${gms.length ? nf(mean, 3) : '—'}</b></div>
      <div class="stat"><small>Подлинность</small><b style="color:${fake ? 'var(--red)' : 'var(--green)'}">${rows.length ? (fake ? `${fake} под вопросом` : 'всё в порядке') : '—'}</b></div></div>
    ${gms.length ? `<section class="card"><h2>${ic('target')} ⟨γ⟩ по студентам <span class="pill">теория γ = 1,40</span></h2>${tStrip(fin)}</section>` : ''}
    <section class="card mt" style="padding:0; overflow:hidden">${rows.length ? `<table class="tt"><tr><th>Студент</th><th>Класс</th><th>Дата</th><th>Этап</th><th>Допуск</th><th>h₁ / h₂, мм</th><th>⟨γ⟩ ± ⟨Δγ⟩</th><th>ε, %</th><th>Защита</th><th>Попытки<br>доп. / обр. / защ.</th><th>Файл</th></tr>
      ${rows.map((r, i) => `<tr class="r" data-t="open" data-v="${i}"><td><div style="display:flex; gap:10px; align-items:center">${ava(r.fio)}<b>${esc(r.fio)}</b></div></td><td>${esc(r.group)}</td><td>${esc(r.date)}</td>
        <td><span class="pill ${r.done ? 'ok' : 'warn'}">${esc(r.stage)}</span></td><td class="n">${r.adm}/8</td>
        <td>${r.runs.map(x => `${x.h1}/${x.h2}`).join(' · ') || '—'}</td><td class="n"><b>${r.o ? esc(l3Res(r.o)) : '—'}</b></td><td class="n">${r.o ? nf(r.o.e, 1) : '—'}</td>
        <td class="n">${r.done ? `${r.cq}/8` : '—'}</td><td class="n">${r.dx.admitTries || 0} / ${r.dx.procTries || 0} / ${r.dx.cqTries || 0}</td>
        <td>${r.auth ? `<span class="pill ok">${ic('circle-check')} подлинный</span>` : `<span class="pill bad">${ic('circle-x')} изменён</span>`}</td></tr>`).join('')}</table>`
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
  const r = TROWS[i]; if (!r) return; const row = tRow(r);
  const keep = L3S; L3S = r.d.state; let html; try { html = row.runs.length === L3.N && r.d.state.concl ? l3ReportHtml() : ''; } finally { L3S = keep; }
  $('#printroot').innerHTML = html;
  modal(`${esc(row.fio)} · ${esc(row.group)}`, `${row.auth ? '' : `<p class="pill bad" style="margin-bottom:12px">${ic('circle-x')} Файл изменён после сохранения в программе — результат не подтверждён</p>`}
    ${html ? `<div class="paper" style="max-height:none">${html}</div>` : `<p class="mute">Работа не доведена до отчёта: этап — ${esc(row.stage)}. Опытов выполнено: ${row.runs.length} из ${L3.N}.</p>`}`,
    html ? `<button class="btn" data-t="print">${ic('printer')} Печать / PDF</button>` : '');
}
function tCsv() {
  const q = v => { const s = String(v ?? ''); return /[;"\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
  const head = ['ФИО', 'Класс', 'Дата', 'Этап', 'Допуск (верно из 8)', 'h1 опыт 1', 'h2 опыт 1', 'h1 опыт 2', 'h2 опыт 2', 'h1 опыт 3', 'h2 опыт 3', '<γ>', '<Δγ>', 'εγ, %', 'ε, %', 'Защита (верно из 8)', 'Попыток допуска', 'Попыток обработки', 'Попыток защиты', 'Подлинность'];
  const lines = TROWS.map(tRow).map(r => [r.fio, r.group, r.date, r.stage, r.adm, ...[0, 1, 2].flatMap(i => r.runs[i] ? [r.runs[i].h1, r.runs[i].h2] : ['', '']),
    r.o ? nf(r.o.gm, 3) : '', r.o ? nf(r.o.dg, 3) : '', r.o ? nf(r.o.eg, 1) : '', r.o ? nf(r.o.e, 1) : '', r.done ? r.cq : '',
    r.dx.admitTries || 0, r.dx.procTries || 0, r.dx.cqTries || 0, r.auth ? 'подлинный' : 'ИЗМЕНЁН'].map(q).join(';'));
  return '﻿' + [head.map(q).join(';'), ...lines].join('\r\n');
}
document.addEventListener('click', e => {
  const b = e.target.closest && e.target.closest('[data-t]'); if (!b || SCREEN !== 'teacher') return; const d = b.dataset;
  switch (d.t) {
    case 'back': SCREEN = 'home'; render(); break;
    case 'add': pickFiles('teacher'); break;
    case 'open': tOpen(+d.v); break;
    case 'print': window.print(); break;
    case 'csv': saveFile(`ЛР3_результаты_${new Date().toLocaleDateString('ru-RU').replace(/\./g, '-')}.csv`, tCsv(), 'csv', 'Таблица для Excel'); break;
    case 'clear': if (confirm('Убрать все загруженные работы из списка? Сами файлы останутся на диске.')) { TROWS = []; tSave(); render(); } break;
  }
});
document.addEventListener('dragenter', e => { const z = $('.drop'); if (z && SCREEN === 'teacher') z.classList.add('over'); });
document.addEventListener('dragleave', e => { const z = $('.drop'); if (z && !e.relatedTarget) z.classList.remove('over'); });
document.addEventListener('drop', () => { const z = $('.drop'); if (z) z.classList.remove('over'); });

render();
