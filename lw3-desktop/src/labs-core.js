/* =====================================================================
   «Физпрактикум»: реестр лабораторных работ — общий для программы на компьютере и на телефоне.
   Работа — модуль сайта (fizika2/src: labwork.js — ЛР 1, labwork2.js — ЛР 2, lw3-core.js — ЛР 3)
   или работа на общем движке labs-e.js (ЛР 4–8, le4.js … le8.js) со своими действиями (data-lw / data-l2 / data-l3 / data-le), хранением и отчётом. Ждёт от оболочки: workKey, store.
   ===================================================================== */
let LAB = 3;
const LABS = {
  1: { no: 1, act: 'lw', short: 'Закон сохранения импульса', icon: 'target', steps: LW1.steps, live: ['prep', 'free', 'coll2'],
    key: id => workKey(id) + '-1', setKey(k) { LW_KEY = k; LWS = null; }, S: () => LWS, load: lwLoad, save: lwSave, swap(S) { const k = LWS; LWS = S; return () => { LWS = k; }; },
    admit: LW_ADMIT, cq: LW_CQ, text: LW_TEXT, hod: LW1_HOD, scheme: () => lwSchemeSvg(), report: () => lwReportHtml(),
    inp: (k, v, ph) => `<input class="lwi txt inp" data-k="${k}" value="${esc(v || '')}" placeholder="${ph}" autocomplete="off">`,
    ta: v => `<textarea class="lw-ta inp" data-k="concl" rows="14">${esc(v)}</textarea>`, autoConcl: () => lwAutoConcl(lwCalcAll()),
    view: { prep: lwPrep, free: lwFreeStep, coll2: () => lwCollStep(2), proc: lwProc },
    after(st) { if (this.live.includes(st)) { LWV.pos = null; lwDraw(); } },
    result() { const O = lwCalcAll(); return `p: ${f1(O[2].px0, 3)} → ${f1(O[2].px1, 3)} кг·мм^½; k = ${f1(O[2].k, 2)}`; },
    nums() { const O = lwCalcAll(); return { px0: O[2].px0, px1: O[2].px1, py1: O[2].py1, k: O[2].k }; },
    sig: S => (S.free || []).map(r => r.r).join(';') },
  2: { no: 2, act: 'l2', short: 'Момент инерции (маятник Обербека)', icon: 'rotate-cw', steps: L2.steps, live: ['prep', 'exp1', 'exp2'],
    key: id => workKey(id) + '-2', setKey(k) { L2_KEY = k; L2S = null; }, S: () => L2S, load: l2Load, save: l2Save, swap(S) { const k = L2S; L2S = S; return () => { L2S = k; }; },
    admit: L2_ADMIT, cq: L2_CQ, text: L2_TEXT, hod: L2_HOD, scheme: () => l2SchemeSvg(), report: () => l2ReportHtml(),
    inp: (k, v, ph) => `<input class="lwi l2i txt inp" data-k2="${k}" value="${esc(v || '')}" placeholder="${ph}" autocomplete="off">`,
    ta: v => `<textarea class="lw-ta l2i inp" data-k2="concl" rows="14">${esc(v)}</textarea>`, autoConcl: () => l2AutoConcl(l2Calc()),
    view: { prep: l2Prep, exp1: () => l2Exp(1), exp2: () => l2Exp(2), proc: l2Proc },
    after(st) { if (this.live.includes(st)) { if (!L2V.anim) { L2V.s = (st === 'prep' || L2S.wound) ? 0 : 1; L2V.tShow = L2S.cur ? L2S.cur.t : null; } l2Draw(); l2DrawCal(); } },
    result() { const o = l2Calc(); return `J = ${l2Sig(o.Jm, 3)} ± ${l2Sig(o.dJ, 1)} кг·м² (δ = ${f1(o.dl, 1)} %)`; },
    nums() { const o = l2Calc(); return { Jm: o.Jm, dJ: o.dJ, dl: o.dl, J4: o.J4 }; },
    sig: S => (S.runs || []).map(r => r.rt).join(';') },
  3: { no: 3, act: 'l3', short: 'Показатель адиабаты', icon: 'gauge', steps: L3.steps,
    key: id => workKey(id), setKey(k) { L3_KEY = k; L3S = null; }, S: () => L3S, load: l3Load, save: l3Save, swap(S) { const k = L3S; L3S = S; return () => { L3S = k; }; },
    admit: L3_ADMIT, cq: L3_CQ, text: L3_TEXT, hod: HOD, scheme: () => l3SchemeSvg(), report: () => l3ReportHtml(),
    result() { return l3Res(l3Calc()); }, nums() { const o = l3Calc(); return { gm: o.gm, dg: o.dg, eg: o.eg, e: o.e }; },
    sig: S => (S.runs || []).map(r => r.h1 + '/' + r.h2).join(';') }
};
const curLab = () => LABS[LAB];
const labTitle = n => LABS[n].title || (LW_LIST.find(w => w.id === n) || {}).title || LABS[n].short;
const labAim = n => LABS[n].aim || (LW_LIST.find(w => w.id === n) || {}).aim || '';
const labNums = () => Object.keys(LABS).map(Number).sort((a, b) => a - b);
const labDone = (L, S) => S && L.steps[S.max || 0] && L.steps[S.max || 0][0] === 'report';
/* вычисление по чужому состоянию (файл студента, демо) */
function withLabState(n, S, fn) { const back = LABS[n].swap(S); try { return fn(); } finally { back(); } }
function labState(n, id) { return store.get(LABS[n].key(id), null); }
function labStatus(n, S) { const L = LABS[n]; if (!S) return 'не начата'; if (S.done) return 'защищена'; return 'шаг ' + ((S.max || 0) + 1) + ' из ' + L.steps.length + ': ' + L.steps[Math.min(S.max || 0, L.steps.length - 1)][1].toLowerCase(); }


/* ЛР 1 и ЛР 2: текущий пункт хода работы по шагу и записям */
function hodNowLab() {
  const L = curLab(), S = L.S(); if (!S) return 0; const st = L.steps[S.step][0];
  if (LAB >= 4) return leHodNow(S, st);
  if (LAB === 1) return ({ prep: 1, free: S.free.length ? 3 : 2, coll2: (S.ex[2].rows.length ? 5 : 4), proc: S.procOk.px0 ? 8 : 6, concl: 9 })[st] || 0;
  return ({ prep: 1, exp1: S.runs.length ? 3 : 2, exp2: S.ex2.length ? 5 : 4, proc: 6, concl: 8 })[st] || 0;
}
