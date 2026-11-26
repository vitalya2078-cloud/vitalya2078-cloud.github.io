// «Физпрактикум», раздел «Физика атомного ядра и элементарных частиц»: полное прохождение лабораторных
// как курсант — кнопками и ручками установки, со счётом импульсов в реальном (ускоренном) времени,
// обработка, выводы, защита, сводка, отчёт 4 листа, файл работы с подписью.
// Запуск: python3 lw3-desktop/build.py; сервер на 127.0.0.1:4180 (lw3-desktop/dist); node lw3-desktop/tests/e2e-nuc.mjs
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
const BASE = process.env.BASE || 'http://127.0.0.1:4180/';
const SHOTS = process.env.SHOTS || '';
const ONLY = (process.env.LABS || '10').split(',').map(Number);
const shot = async (p, n) => { if (SHOTS) await p.screenshot({ path: path.join(SHOTS, `nuc-${n}.png`) }); };
const must = (ok, msg) => { if (!ok) throw new Error(msg); };
const mustL = async (ok, f) => { if (!ok) throw new Error(await f()); };
const b = await chromium.launch(process.env.FZ_CHROME ? { executablePath: process.env.FZ_CHROME } : {});
const page = await b.newPage({ viewport: { width: 1440, height: 900 }, acceptDownloads: true });
const errors = []; page.on('pageerror', e => errors.push(e.message)); page.on('console', m => m.type() === 'error' && errors.push(m.text()));
const E = (fn, a) => page.evaluate(fn, a), W = ms => page.waitForTimeout(ms);
const st = () => E(() => curLab().steps[LES.step][0]);
const sig = v => (Math.abs(v) >= 1e6 || (Math.abs(v) < 1e-3 && v !== 0) ? (+v).toExponential(5) : String(+(+v).toPrecision(6))).replace('.', ',');
const click = async sel => { const l = page.locator(sel).first(); await l.scrollIntoViewIfNeeded(); await l.click(); await W(40); };
const ctl = (c, v = '') => click(`[data-le="ctl"][data-c="${c}"][data-v="${v}"]`);
const fill = async (k, v) => { const l = page.locator(`[data-ke="${k}"]`).first(); await l.scrollIntoViewIfNeeded(); await l.fill(String(v)); };
const ready = id => E(i => LE[LES.n].exps.find(e => e.id === i).ready(LES), id);
const truth = id => E(i => LE[LES.n].exps.find(e => e.id === i).truth(LES), id);
async function record(id) { const t = await truth(id); for (const [k, v] of Object.entries(t)) await fill(`r_${id}_${k}`, String(v).replace('.', ',')); await click(`[data-le="record"][data-v="${id}"]`); await W(60); return E(i => (LES.rows[i] || []).length, id); }
async function count() { await ctl('start'); await page.waitForFunction(() => !LES.rig.run, null, { timeout: 30000 }); await W(80); }
async function setU(to) { let U = await E(() => LES.rig.U); while (U !== to) { const d = to - U, s = Math.abs(d) >= 10 ? 10 * Math.sign(d) : Math.sign(d); await ctl('U', String(s)); U = await E(() => LES.rig.U); } }

await page.goto(BASE, { waitUntil: 'networkidle' });
await page.fill('#np-fio', 'Ядернов Иван'); await page.fill('#np-group', '105'); await page.fill('#np-pw', '1234'); await page.fill('#np-pw2', '1234'); await page.check('#np-eula'); await page.click('[data-d="register"]'); await page.click('[data-d="intro-skip"]');
await page.click('[data-d="page"][data-v="labs"]'); await W(200); await shot(page, 'labs');

async function admitAndCq(key) {
  const list = await E(k => curLab()[k].map(([, a]) => a), key);
  for (let i = 0; i < list.length; i++) { await E(([k, i]) => { if (k === 'admit') AQ = i; else CQI = i; render(); }, [key, i]); await page.click(`.qs-opts [data-q="${i}"][data-v="${list[i].replace(/"/g, '\\"')}"]`); await W(300); }
  await E(([k, n]) => { if (k === 'admit') AQ = n; else CQI = n; render(); }, [key, list.length]);
  await page.click(`[data-le="${key}Check"]`); await W(150); must(await E(k => LES[k === 'admit' ? 'admitOk' : 'cqOk'], key), key + ' не сдан');
  await page.click('[data-le="next"]'); await W(250);
}
async function finish(n) {
  await page.locator('#modal .sum').waitFor(); await shot(page, `l${n}-summary`); await page.keyboard.press('Escape');
  must(await page.locator('#d-paper .lwp').count() === 4, `ЛР ${n}: в отчёте не 4 листа`); await shot(page, `l${n}-report`);
  const [dl] = await Promise.all([page.waitForEvent('download'), page.keyboard.press('Control+s')]);
  const f = path.join(SHOTS || '/tmp', `lab${n}.lw3`); await dl.saveAs(f); const d = JSON.parse(fs.readFileSync(f, 'utf8'));
  must(d.lab === n && d.state.done && d.sig && d.summary, `ЛР ${n}: файл работы неполный`);
  await page.click('[data-d="labs"]'); await W(200);
}
async function proc(n, picks = async () => {}) {
  must(await st() === 'proc', `ЛР ${n}: нет обработки`); await shot(page, `l${n}-proc`);
  const tables = await E(() => LE[LES.n].tables);
  for (const t of Object.keys(tables)) {
    await picks(t);
    const o = await E(() => { const o = LE[LES.n].calc(LES), r = {}; for (const k of Object.keys(o)) if (typeof o[k] === 'number') r[k] = o[k]; return r; });
    for (const k of tables[t]) { if (await page.locator(`[data-ke="p_${k}"]`).count()) await fill('p_' + k, sig(o[k])); }
    await click(`[data-le="pcheck"][data-v="${t}"]`); await W(80);
    const bad = await E(ks => ks.filter(k => LES.procOk[k] !== true), tables[t]); must(!bad.length, `ЛР ${n}: таблица ${t} не принята: ${bad.join(', ')}`);
  }
  await click('[data-le="next"]'); await W(150);
}

const RUN = {
  async 11() {
    await ctl('power'); await page.waitForFunction(() => LES.rig.warm === 0, null, { timeout: 15000 });
    await setU(await E(() => LES.p.Up)); await shot(page, 'l11-prep');
    await click('[data-le="prepCheck"]'); must(await E(() => LES.prepOk), 'ЛР 11: подготовка не принята'); await click('[data-le="next"]'); await W(150);
    for (const [id, src, T] of [['bg', 'none', 3], ['src', 'G', 3], ['long', 'G', 30]]) {
      must(await st() === id, `ЛР 11: нет опыта ${id}`);
      await ctl('src', src); await ctl('T', String(T)); await ctl('series', id);
      if (id === 'src') { await W(3000); await shot(page, 'l11-series'); if (process.env.COVERS) await page.locator('#le-cv').screenshot({ path: path.join(process.env.COVERS, 'cov11.png') }); }
      await page.waitForFunction(i => LES.extra.ser && LES.extra.ser[i], id, { timeout: 60000 }); await W(200);
      if (id === 'src') await shot(page, 'l11-hist');
      await mustL(await record(id) === 1, async () => `ЛР 11: ${id}: ${await ready(id)}`); await click('[data-le="next"]'); await W(150);
    }
    await proc(11);
  },
  async 10() {
    await ctl('power'); await page.waitForFunction(() => LES.rig.warm === 0, null, { timeout: 15000 });
    await setU(290); await ctl('src', 'kcl'); await shot(page, 'l10-prep');
    await click('[data-le="prepCheck"]'); must(await E(() => LES.prepOk), 'ЛР 10: подготовка не принята'); await click('[data-le="next"]'); await W(150);
    // опыт 1: порог
    must(await st() === 'thr', 'ЛР 10: нет опыта «порог»');
    for (let i = 0; i < 12; i++) { await count(); const r = await ready('thr'); if (!r) break; if (/понизь/.test(r)) await ctl('U', '-10'); else await ctl('U', '10'); }
    await shot(page, 'l10-thr'); await mustL(await record('thr') === 1, async () => 'ЛР 10: порог не записан: ' + await ready('thr')); await click('[data-le="next"]'); await W(150);
    // опыт 2: характеристика
    must(await st() === 'char', 'ЛР 10: нет опыта «характеристика»');
    const U0 = await E(() => LES.rows.thr[0].U);
    for (let k = 0; k < 12; k++) { await setU(U0 + 20 * k); await count(); if (k === 6) { await shot(page, 'l10-char'); if (process.env.COVERS) await page.locator('#le-cv').screenshot({ path: path.join(process.env.COVERS, 'cov10.png') }); } await mustL(await record('char') === k + 1, async () => `ЛР 10: точка ${k + 1}: ${await ready('char')}`); }
    await click('[data-le="next"]'); await W(150);
    // опыт 3: мёртвое время
    must(await st() === 'dead', 'ЛР 10: нет опыта «мёртвое время»');
    const Up = await E(() => { const p = LES.p; return Math.round(p.Us + p.wB + p.wP / 2); }); await setU(Up);
    for (const [i, s] of ['none', 'A', 'AB', 'B'].entries()) { await ctl('src', s); await count(); if (i === 2) await shot(page, 'l10-dead'); await mustL(await record('dead') === i + 1, async () => `ЛР 10: мёртвое время, ${s}: ${await ready('dead')}`); }
    await click('[data-le="next"]'); await W(150);
    await proc(10, async t => { if (t !== '1') return;
      const [ub, uc] = await E(() => { const p = LES.p, UB = p.Us + p.wB, UC = UB + p.wP, U = LES.rows.char.map(r => r.U); return [U.find(u => u >= UB - 12 && u <= UB + 30), [...U].reverse().find(u => u <= UC + 12 && u >= UC - 32)]; });
      await click(`[data-le="pick"][data-k="UB"][data-v="${ub}"]`); await click(`[data-le="pick"][data-k="UC"][data-v="${uc}"]`); });
  }
};

for (const n of ONLY) {
  await page.click(`[data-d="lab"][data-v="${n}"]`); await W(200);
  await admitAndCq('admit'); must(await st() === 'prep', `ЛР ${n}: нет подготовки`);
  await RUN[n]();
  must(await st() === 'concl', `ЛР ${n}: нет выводов`); await shot(page, `l${n}-concl`);
  await admitAndCq('cq'); must(await st() === 'report', `ЛР ${n}: нет отчёта`);
  await finish(n);
}
must(!errors.length, 'ошибки на странице: ' + errors.join(' | '));
console.log(`PASS: раздел «Ядерная физика» — ЛР ${ONLY.join(', ')} целиком: допуск, подготовка, опыты со счётом импульсов, обработка, выводы, защита, отчёт, файл работы.`);
await b.close();
