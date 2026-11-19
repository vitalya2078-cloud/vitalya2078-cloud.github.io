/* =====================================================================
   «Что рассказать на защите»: краткая сводка по работе студента (открыто, видна всем).
   Показывается сама один раз при переходе к отчёту, потом — кнопкой на шаге «Отчёт».
   Демо-прохождение для преподавателя (под паролем): программа сама выполняет работу
   на модели установки и показывает сводку и готовый отчёт. Демо помечено и в список группы не попадает.
   ===================================================================== */
const fx = (v, d = 3) => Number.isFinite(v) ? v.toFixed(d).replace('.', ',') : '—';
function withState(S, fn) { const keep = L3S; L3S = S; try { return fn(); } finally { L3S = keep; } }

function l3SummaryHtml(S) {
  const o = withState(S, l3Calc), hi = o.gm > o.gT, agree = Math.abs(o.gm - o.gT) <= 2 * o.dg;
  const qa = [L3_CQ[0], L3_CQ[2], L3_ADMIT[4], L3_CQ[6], L3_CQ[7]];
  return `<div class="sum">
    ${S.demo ? `<p class="pill warn">${ic('circle-x')} Демо-прохождение: выполнено программой автоматически, не работа студента</p>` : ''}
    <section><h3>${ic('target')} Что делали</h3>
      <p>Методом Клемана — Дезорма определяли показатель адиабаты воздуха γ = C<sub>p</sub>/C<sub>v</sub>.
      Накачали воздух в баллон и подождали минуту, пока он остынет до комнатной температуры, — записали <b>h₁</b>.
      Быстро выпустили воздух через кран K₀: газ адиабатно расширился и охладился. Закрыли кран, подождали минуту, пока газ нагреется от стенок, — записали <b>h₂</b>.</p></section>
    <section><h3>${ic('grid-3x3')} ${S.demo ? 'Измерения' : 'Мои измерения'}</h3>
      <table class="tt sum-t"><tr><th>Опыт</th><th>h₁, мм</th><th>h₂, мм</th><th>γ = h₁ / (h₁ − h₂)</th></tr>
        ${o.a.map((r, i) => `<tr><td>${i + 1}</td><td class="n">${r.h1}</td><td class="n">${r.h2}</td><td class="n"><b>${fx(r.g)}</b></td></tr>`).join('')}</table></section>
    <section><h3>${ic('circle-check')} Результат</h3>
      <p>⟨γ⟩ = <b>${l3Res(o)}</b>, относительная погрешность ε<sub>γ</sub> = ${fx(o.eg, 1)} %.
      Теория для двухатомного газа (i = 5): γ<sub>T</sub> = (i + 2)/i = <b>1,40</b>. Расхождение ε = <b>${fx(o.e, 1)} %</b> —
      ${agree ? 'в пределах погрешности опыта, результат согласуется с теорией.' : o.e <= 4 ? 'небольшое, результат близок к теории.' : 'заметное, объяснить причину (ниже).'}</p></section>
    <section><h3>${ic('rotate-cw')} Почему γ = h₁ / (h₁ − h₂)</h3>
      <p>При быстром выпуске теплообмен не успевает произойти, поэтому давление и температура связаны уравнением Пуассона (адиабата).
      После закрытия крана газ нагревается при постоянном объёме до комнатной температуры, а начальное и конечное состояния при одной температуре связывает закон Бойля — Мариотта.
      Давления малы по сравнению с атмосферным, и из этих двух уравнений получается γ = h₁ / (h₁ − h₂).</p></section>
    <section><h3>${ic('file-text')} Почему результат ${hi ? 'больше' : 'меньше'} 1,40</h3>
      <p>${hi ? 'Скорее всего, кран K₀ закрыли чуть раньше, чем давление сравнялось с атмосферным: h₂ получилось больше, и γ завышено.'
        : 'Скорее всего, кран K₀ закрыли чуть позже: газ успел нагреться от стенок и часть его вышла, h₂ получилось меньше, и γ занижено.'}
      Кроме того, расширение не строго адиабатно — газ немного обменивается теплом со стенками баллона, и уровни читаются с точностью до 1 мм.</p></section>
    <section><h3>${ic('graduation-cap')} Могут спросить</h3>
      <ul class="sum-qa">${qa.map(([q, a]) => `<li><b>${esc(q)}</b><span>${esc(a)}</span></li>`).join('')}</ul></section>
  </div>`;
}

/* ---------- студент: сводка перед отчётом ---------- */
function openSummary() {
  const S = l3Load(); if (!S || (S.runs || []).length !== L3.N) return;
  modal(`${ic('graduation-cap')} Что рассказать на защите`, l3SummaryHtml(S), `<button class="btn" data-d="mclose">${ic('file-text')} К отчёту</button>`);
  S.dx = S.dx || {}; if (!S.dx.sumSeen) { S.dx.sumSeen = new Date().toISOString(); l3Save(); }
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
