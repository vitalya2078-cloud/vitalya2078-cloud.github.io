/* =====================================================================
   «Что рассказать на защите»: краткая сводка по работе студента (открыто, видна всем).
   Показывается сама один раз при переходе к отчёту, потом — кнопкой на шаге «Отчёт».
   Демо-прохождение для преподавателя (под паролем): программа сама выполняет работу
   на модели установки и показывает сводку и готовый отчёт. Демо помечено и в список группы не попадает.
   ===================================================================== */
/* fx, withState, l3SummaryHtml — в summary-core.js (общий с Android) */

/* ---------- студент: сводка перед отчётом ---------- */
function openSummary() {
  const L = curLab(), S = L.load(); if (!S || !S.cqOk && LAB !== 3) return; if (LAB === 3 && (S.runs || []).length !== L3.N) return;
  modal(`${ic('graduation-cap')} Что рассказать на защите`, labSummaryHtml(LAB, S), `<button class="btn" data-d="mclose">${ic('file-text')} К отчёту</button>`);
  S.dx = S.dx || {}; if (!S.dx.sumSeen) { S.dx.sumSeen = new Date().toISOString(); L.save(); }
}
const _wReportS = wReport;
wReport = function (S) {
  const h = _wReportS(S), btn = `<button class="btn line wide mt" data-d="summary">${ic('graduation-cap')} Что рассказать на защите</button>`, i = h.indexOf('<button class="btn line wide mt" data-l3="restart">');
  if (!(S.dx && S.dx.sumSeen)) setTimeout(() => { if (SCREEN === 'work' && l3St() === 'report' && $('#modal').hidden) openSummary(); }, 0);   // один раз — сразу при переходе к отчёту
  return i < 0 ? h : h.slice(0, i) + btn + h.slice(i);
};
document.addEventListener('click', e => { const b = e.target.closest && e.target.closest('[data-d="summary"]'); if (b) openSummary(); });

/* ---------- преподаватель: демо-прохождение на модели установки ---------- */
function l3DemoState() {
  const keepS = L3S, keepV = Object.assign({}, L3V), S = l3Fresh(), r = (a, b) => a + Math.random() * (b - a);
  Object.assign(S, { fio: 'Демо-прохождение', group: 'демо', demo: true, power: true });
  const run = (sec, dt = .01) => { for (let t = 0; t < sec; t += dt) l3Step(dt); };
  L3S = S;
  try {
    for (let i = 0; i < L3.N; i++) {                 // как по методичке: накачка до 210…220, минута, h₁, выпуск через K₀, минута, h₂
      l3Reset(); S.kOpen = true; S.k0Open = false; L3V.pump = true;
      const top = r(212, 218); let guard = 0; while (L3V.p < top && guard++ < 1e5) l3Step(.01);
      L3V.pump = false; S.kOpen = false; run(L3.wait); const h1 = Math.round(L3V.p);
      S.k0Open = true; run(r(.5, .7), .002); S.k0Open = false; run(L3.wait); const h2 = Math.round(L3V.p);
      S.runs.push({ h1, h2 });
    }
    const o = l3Calc(), dig = { g1: 3, g2: 3, g3: 3, gm: 3, dg: 3, eg: 1, gT: 3, e: 1 };
    L3_KEYS.forEach(k => { S.proc[k] = fx(o[k], dig[k]); S.procOk[k] = true; });
    L3_ADMIT.forEach(([, a], i) => { S.admit[i] = a; }); L3_CQ.forEach(([, a], i) => { S.cq[i] = a; });
    Object.assign(S, { admitOk: true, prepOk: true, kOpen: false, k0Open: false, cqOk: true, done: true, step: 5, max: 5, concl: l3AutoConcl(o), dx: { demo: true } });
  } finally { L3S = keepS; Object.assign(L3V, keepV); }
  return S;
}
function teacherDemo() {
  const S = l3DemoState(), html = withState(S, l3ReportHtml);
  $('#printroot').innerHTML = html; TPDF = 'демо';
  modal(`${ic('graduation-cap')} Демо-прохождение`, `<p class="mute">Программа выполнила работу сама — на той же модели установки, что у студентов (свои случайные значения при каждом запуске). Сначала — сводка, которую студент видит перед отчётом, ниже — готовый отчёт.</p>
    ${l3SummaryHtml(S)}<h2 class="mt">${ic('file-text')} Отчёт</h2><div class="paper" style="max-height:none">${html}</div>`,
    `<button class="btn" data-t="pdf">${ic('file-text')} Сохранить PDF</button><button class="btn line" data-t="print">${ic('printer')} Печать</button>`);
}
