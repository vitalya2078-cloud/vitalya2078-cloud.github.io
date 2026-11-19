// «Физпрактикум», ЛР 4–8: прохождение подготовки, опытов и обработки как студент — кнопками установки
// и полями ввода. Отсчёты, которые студент снимает глазами с приборов, тест берёт из модели (как в тестах ЛР 1–3).
// Общий для теста программы на компьютере (e2e-labs.mjs) и на телефоне (lw3-mobile/tests/e2e-labs.mjs).
const fmt = (v, d) => (+v).toFixed(d).replace('.', ',');
const sig = v => (Math.abs(v) >= 1e6 || (Math.abs(v) < 1e-3 && v !== 0) ? (+v).toExponential(5) : String(+(+v).toPrecision(6))).replace('.', ',');
export function leDriver(page, must, shot = async () => {}) {
  const E = (fn, a) => page.evaluate(fn, a), W = ms => page.waitForTimeout(ms);
  const st = () => E(() => curLab().steps[LES.step][0]);
  const click = async sel => { const l = page.locator(sel).first(); await l.scrollIntoViewIfNeeded(); await l.click(); await W(40); };
  const ctl = (c, v = '') => click(`[data-le="ctl"][data-c="${c}"][data-v="${v}"]`);
  // ручка с шагами: от текущего значения к целевому (жадно: крупные шаги, потом мелкие)
  async function knob(c, from, to, steps) {
    let rem = +(to - from).toFixed(6);
    for (const s of [...steps].sort((a, b) => b - a)) { const n = Math.floor(Math.abs(rem) / s + 1e-6), sg = rem < 0 ? -1 : 1;
      for (let i = 0; i < n; i++) await ctl(c, String(sg * s)); rem = +(rem - sg * n * s).toFixed(6); }
  }
  const fill = async (k, v) => { const l = page.locator(`[data-ke="${k}"]`).first(); await l.scrollIntoViewIfNeeded(); await l.fill(String(v)); };
  async function record(id, vals) { for (const [k, v] of Object.entries(vals)) await fill(`r_${id}_${k}`, v); await click(`[data-le="record"][data-v="${id}"]`); await W(60);
    const n = await E(i => (LES.rows[i] || []).length, id); if (n === 1) await shot(page, `le-${id}`); return n; }
  const truth = id => E(i => LE[LES.n].exps.find(e => e.id === i).truth(LES), id);
  async function prepCheck(n) { await click('[data-le="prepCheck"]'); must(await E(() => LES.prepOk), `ЛР ${n}: подготовка не принята — ${(await page.locator('#lw-msg').innerText().catch(() => ''))}`); await click('[data-le="next"]'); await W(150); }
  async function next(n, what) { must(await page.locator('[data-le="next"]').count() > 0, `ЛР ${n}: нет перехода после «${what}»: ${(await page.locator('#lw-msg').first().innerText().catch(() => ''))}`); await click('[data-le="next"]'); await W(150); }
  async function proc(n, pre) {
    must(await st() === 'proc', `ЛР ${n}: нет обработки`);
    const tables = await E(() => LE[LES.n].tables);
    for (const t of Object.keys(tables)) {
      if (pre) await pre(t);
      const o = await E(() => { const o = LE[LES.n].calc(LES), r = {}; for (const k of Object.keys(o)) if (typeof o[k] === 'number') r[k] = o[k]; r.mat = o.mat; return r; });
      for (const k of tables[t]) { if (k === 'mat') { await click(`[data-le="pick"][data-k="mat"][data-v="${o.mat}"]`); continue; } if (n === 7 && k === 'Ic') continue; await fill('p_' + k, sig(o[k])); }
      await click(`[data-le="pcheck"][data-v="${t}"]`); await W(80);
      const bad = await E(ks => ks.filter(k => LES.procOk[k] !== true), tables[t]); must(!bad.length, `ЛР ${n}: таблица ${t} не принята: ${bad.join(', ')}`);
    }
    await click('[data-le="next"]'); await W(150);
  }
  const L = {
    async 4() {
      await ctl('power'); await knob('U', 0, 3.47, [1, .1, .01]); await fill('pCe', '1,00'); await fill('pU', '3,47'); await prepCheck(4);
      for (const id of ['ce', 'cx', 'cp', 'cs']) {
        must(await st() === id, `ЛР 4: нет опыта ${id}`);
        if (id !== 'ce') await ctl('conn', id);
        for (let i = 0; i < 3; i++) {
          const R = await E(() => LES.rig); if (!R.rst) await ctl('rst'); if (R.sw === 'B') await ctl('sw');      // зарядка: «Сброс» + «А»
          await ctl('rst'); await ctl('sw');                                                                       // разомкнуть и «В»
          const t = await truth(id); must(await record(id, { ui: fmt(t.ui, 2) }) === i + 1, `ЛР 4: запись ${id} ${i + 1} не принята`);
        }
        if (id === 'cx') { await ctl('cm'); const v = await E(() => (LES.p.Cx * LES.p.cmk).toFixed(3)); await fill('cm', v.replace('.', ',')); await click('[data-le="extra"][data-v="cx"]'); must(await E(() => LES.extra.cm != null), 'ЛР 4: Cизм не принято'); }
        await next(4, id);
      }
      await proc(4);
    },
    async 5() {
      await click('[data-le="ctl"][data-c="len"][data-v="0.8"]'); await fill('pl', '0,8'); await fill('pd', '0,2'); await fill('pS', '0,03142'); await prepCheck(5);
      await ctl('power');
      for (const I of [10, 20, 30]) {
        const { E0, Et } = await E(I => { const S = LES, R = S.p.rho * S.rig.L / (Math.PI * S.p.d ** 2 / 4) + 9.2; return { E0: S.rig.E, Et: +(I / 1000 * R).toFixed(2) }; }, I);
        await knob('E', E0, Et, [1, .1, .01]); const t = await truth('tech'); await record('tech', { I: fmt(t.I, 1), U: fmt(t.U, 2) });
      }
      must(await E(() => LES.rows.tech.length) === 3, 'ЛР 5: не 3 измерения'); await next(5, 'tech');
      await ctl('ohm'); const t = await truth('ohm'); await record('ohm', { R: fmt(t.R, 1) }); await next(5, 'ohm');
      await proc(5);
    },
    async 6() {
      const rot = await E(() => LES.rig.rot); await knob('rot', rot, rot - Math.round(rot), [5, 1]);
      await fill('pR', '0,15'); await fill('pN', '320'); await fill('pL', '0,19'); await prepCheck(6);
      await ctl('power');
      for (const I of [.1, .2, .3]) {
        const I0 = await E(() => LES.rig.I); await knob('I', I0, I, [.1, .01]); await ctl('pol');
        const t = await truth('meas'); await record('meas', { I: fmt(t.I, 2), fr: String(Math.round(t.fr)), fl: String(Math.round(t.fl)) });
      }
      must(await E(() => LES.rows.meas.length) === 3, 'ЛР 6: не 3 опыта'); await next(6, 'meas');
      await proc(6);
    },
    async 7() {
      const N = await E(() => LES.p.N); await fill('pd', '37'); await fill('pl', '36'); await fill('pr', '3'); await fill('pU', '15'); await fill('pN', String(N)); await prepCheck(7);
      await ctl('power'); let cur = 0;
      for (const I of [110, 120, 130, 140, 150, 160, 170, 180]) { await knob('I', cur, I, [10, 1]); cur = I; const t = await truth('curve'); await record('curve', { I: String(t.I), ia: fmt(t.ia, 3) }); }
      must(await E(() => LES.rows.curve.length) === 8, 'ЛР 7: не 8 точек'); await next(7, 'curve');
      await proc(7, async t => { if (t === '2') { const ic = await E(() => LE[7].calc(LES).Icm); await fill('p_Ic', String(ic)); } });
    },
    async 8() {
      const solveE = async (I, core) => E(([I, core]) => { const S = LES, p = S.p, w = 2 * Math.PI * 2000, Lof = i => (core ? p.L0 * (p.mu0 + p.mu1 * i) : p.L0);
        let best = 0, bd = 1e9; for (let e = 0; e <= 15; e = +(e + .01).toFixed(2)) { let i = 0; for (let k = 0; k < 6; k++) i = e / Math.hypot(470 + p.Rc, w * Lof(i)) * 1000; if (Math.abs(i - I) < bd) { bd = Math.abs(i - I); best = e; } } return best; }, [I, core]);
      await ctl('power'); await knob('f', 1, 2, [1, .1]); await prepCheck(8);
      for (const [id, core] of [['nocore', false], ['core', true]]) {
        if (core) { await ctl('core'); await knob('f', 1, 2, [1, .1]); }
        for (const I of [1, 5, 10]) { const E0 = await E(() => LES.rig.E), Et = await solveE(I, core); await knob('E', E0, Et, [1, .1, .01]); const t = await truth(id); await record(id, { I: fmt(t.I, 2), U: String(t.U) }); }
        must(await E(i => LES.rows[i].length, id) === 3, `ЛР 8: ${id} не 3 опыта`); await next(8, id);
      }
      await proc(8);
    }
  };
  return { run: n => L[n](), st };
}
