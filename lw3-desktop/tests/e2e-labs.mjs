// «Физпрактикум»: полное прохождение ЛР 1 и ЛР 2 в программе (компьютер). Как студент: допуск по одному вопросу,
// подготовка (массы/шкив, отсчёты по лупе и штангенциркулю), опыты (выстрелы / пуски с анимацией), обработка,
// выводы и защита, сводка перед отчётом, отчёт 4 листа, файл работы с подписью и с номером работы.
// Отсчёты, которые студент снимает глазами, тест берёт из состояния установки (как в тесте ЛР 3).
// Запуск: python3 lw3-desktop/build.py; сервер на 127.0.0.1:4180 (папка lw3-desktop/dist); node lw3-desktop/tests/e2e-labs.mjs
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
const BASE = process.env.BASE || 'http://127.0.0.1:4180/';
const SHOTS = process.env.SHOTS || '';
const shot = async (p, n) => { if (SHOTS) await p.screenshot({ path: path.join(SHOTS, `fz-${n}.png`) }); };
const must = (ok, msg) => { if (!ok) throw new Error(msg); };
const b = await chromium.launch();
const page = await b.newPage({ viewport: { width: 1440, height: 900 }, acceptDownloads: true });
const errors = []; page.on('pageerror', e => errors.push(e.message)); page.on('console', m => m.type() === 'error' && errors.push(m.text()));
const E = (fn, a) => page.evaluate(fn, a);
const W = ms => page.waitForTimeout(ms);
const fmt = (v, d) => v.toFixed(d).replace('.', ',');
const st = () => E(() => curLab().steps[curLab().S().step][0]);

await page.goto(BASE, { waitUntil: 'networkidle' });
await page.fill('#np-fio', 'Смирнова Алина'); await page.fill('#np-group', '11 В'); await page.click('[data-d="new"]'); await page.click('[data-d="intro-skip"]');
must(await page.locator('.labc').count() === 3, 'на главном экране не 3 работы'); await shot(page, 'labs');

async function admitAndCq(act, key) {
  const list = await E(k => curLab()[k].map(([, a]) => a), key);
  for (let i = 0; i < list.length; i++) {
    await E(([k, i]) => { if (k === 'admit') AQ = i; else CQI = i; render(); }, [key, i]);
    await page.click(`.qs-opts [data-q="${i}"][data-v="${list[i].replace(/"/g, '\\"')}"]`); await W(320);
  }
  await E(([k, n]) => { if (k === 'admit') AQ = n; else CQI = n; render(); }, [key, list.length]);
  await page.click(`[data-${act}="${key}Check"]`); await W(150);
  must(await E(k => curLab().S()[k === 'admit' ? 'admitOk' : 'cqOk'], key), key + ' не сдан');
  await page.click(`[data-${act}="next"]`); await W(250);
}
async function procFill(act, keys, tables, vals) {
  for (const k of keys) await page.fill(`[data-${act === 'lw' ? 'k' : 'k2'}="p_${k}"]`, vals[k]);
  for (const t of tables) { await page.click(`[data-${act}="pcheck"][data-v="${t}"]`); await W(120); }
}
async function finish(n, act) {
  await page.locator('#modal .sum').waitFor(); await shot(page, `l${n}-summary`);
  must(await page.locator('#modal .sum').innerText().then(t => t.length > 300), `ЛР ${n}: сводка пустая`); await page.keyboard.press('Escape');
  must(await page.locator('#d-paper .lwp').count() === 4 && await page.locator('#printroot .lwp').count() === 4, `ЛР ${n}: в отчёте не 4 листа`);
  must((await page.locator('#d-paper').innerText()).includes('Лаборатория кафедры физики и общетехнических дисциплин'), `ЛР ${n}: в шапке не та кафедра`);
  await shot(page, `l${n}-report`);
  const [dl] = await Promise.all([page.waitForEvent('download'), page.keyboard.press('Control+s')]);
  const f = path.join(SHOTS || '/tmp', `lab${n}.lw3`); await dl.saveAs(f);
  const d = JSON.parse(fs.readFileSync(f, 'utf8')); must(d.lab === n && d.state.done && d.sig && d.summary, `ЛР ${n}: файл работы неполный`);
  must(await E(t => { const r = unpackResult(t); return r.ok && r.d.lab; }, fs.readFileSync(f, 'utf8')) === n, `ЛР ${n}: подпись файла не проходит`);
  await page.click('[data-d="labs"]'); await W(200);
  return f;
}

/* ===================== ЛР 2 ===================== */
await page.click('[data-d="lab"][data-v="2"]'); await admitAndCq('l2', 'admit');
must(await st() === 'prep', 'ЛР 2: нет подготовки');
{ const v = await E(() => { const S = L2S, d = S.d[S.pul - 1]; return { d: d.toFixed(1), r: (d / 2000).toFixed(5), l: (S.l1 / 100).toFixed(2), h: S.h.toFixed(3) }; });
  await page.fill('[data-k2="rd"]', v.d.replace('.', ',')); await page.fill('[data-k2="rr"]', v.r.replace('.', ',')); await page.fill('[data-k2="rl1"]', v.l.replace('.', ',')); await page.fill('[data-k2="rh"]', v.h.replace('.', ','));
  await shot(page, 'l2-prep'); await page.click('[data-l2="prepCheck"]'); must(await E(() => L2S.prepOk), 'ЛР 2: подготовка не принята'); await page.click('[data-l2="next"]'); }
async function l2Launch() {
  await page.click('[data-l2="wind"]'); await page.click('[data-l2="go1"]');
  await page.waitForFunction(() => L2S.cur, null, { timeout: 15000 });
  const c = await E(() => L2S.cur); await page.fill('[data-k2="cm"]', fmt(c.m, 3)); await page.fill('[data-k2="ct"]', fmt(c.t, 3)); await page.click('[data-l2="record"]'); await W(100);
}
for (let i = 0; i < 3; i++) { await l2Launch(); if (!i) await shot(page, 'l2-exp1'); }
must(await E(() => L2S.runs.length) === 3, 'ЛР 2: не 3 пуска'); await page.click('[data-l2="next"]');
for (let i = 0; i < 7; i++) await page.click('[data-l2="l2"][data-d="-1"]');
await page.fill('[data-k2="rl2"]', await E(() => (L2S.l2 / 100).toFixed(2).replace('.', ','))); await l2Launch();
must(await E(() => L2S.ex2.length) === 1, 'ЛР 2: нет опыта 2'); await page.click('[data-l2="next"]');
must(await st() === 'proc', 'ЛР 2: нет обработки');
{ const keys = await E(() => [...L2_TABLES[1], ...L2_TABLES[2]]), vals = await E(ks => { const o = l2Calc(); return Object.fromEntries(ks.map(k => [k, String(+o[k].toPrecision(5)).replace('.', ',')])); }, keys);
  await procFill('l2', keys, [1, 2], vals); await shot(page, 'l2-proc');
  must(await E(ks => ks.every(k => L2S.procOk[k]), keys), 'ЛР 2: обработка не принята'); await page.click('[data-l2="next"]'); }
must(await st() === 'concl', 'ЛР 2: нет выводов'); await shot(page, 'l2-concl');
await admitAndCq('l2', 'cq'); must(await st() === 'report', 'ЛР 2: нет отчёта');
const f2 = await finish(2, 'l2');

/* ===================== ЛР 1 ===================== */
await page.click('[data-d="lab"][data-v="1"]'); await admitAndCq('lw', 'admit');
must(await st() === 'prep', 'ЛР 1: нет подготовки');
for (const id of ['А', 'Б', 'Д']) await page.click(`[data-lw="puck"][data-v="${id}"]`);
{ const v = await E(() => { const S = LWS; return { m: [1, 2, 3].map(j => lwPuck(S['p' + j]).m.toFixed(4)), x: String(Math.round(S.x01 + LW1.R)), y: String(Math.round(S.y01)) }; });
  for (let j = 1; j <= 3; j++) await page.fill(`[data-k="m${j}"]`, v.m[j - 1].replace('.', ','));
  await page.fill('[data-k="rx01"]', v.x); await page.fill('[data-k="ry01"]', v.y); await page.click('[data-lw="aim"]').catch(() => {});
  await page.click('[data-aim="p1"]'); await shot(page, 'l1-prep'); await page.click('[data-lw="prepCheck"]'); must(await E(() => LWS.prepOk), 'ЛР 1: подготовка не принята'); await page.click('[data-lw="next"]'); }
async function l1Shoot(kind, j) {
  for (let tries = 0; tries < 6; tries++) {
    await page.click(`[data-lw="shoot"]`); await page.waitForFunction(() => !LWV.anim, null, { timeout: 20000 }); await W(80);
    if (await E(() => !!LWS.cur)) break;
  }
  const t = await E(() => LWS.cur.t);
  if (kind === 'free') await page.fill('[data-k="cx"]', String(Math.round(t)));
  else for (const k of ['x1', 'y1', 'x2', 'y2']) await page.fill(`[data-k="c${k}"]`, String(Math.round(t[k])));
  await page.click('[data-lw="record"]'); await W(80);
}
for (let i = 0; i < 7; i++) { await l1Shoot('free'); if (!i) await shot(page, 'l1-free'); }
must(await E(() => LWS.free.length) === 7, 'ЛР 1: не 7 выстрелов'); await page.click('[data-lw="next"]');
for (const j of [2, 3]) {
  const c = await E(j => LW1.circles[LWS.ex[j].circle - 1], j);
  await page.fill(`[data-k="rx0${j}"]`, String(c[0] + 15)); await page.fill(`[data-k="ry0${j}"]`, String(c[1])); await page.click(`[data-lw="placeCheck"]`);
  must(await E(j => LWS.ex[j].placeOk, j), `ЛР 1: тело ${j} не установлено`);
  for (let i = 0; i < 7; i++) { await l1Shoot('coll', j); if (!i && j === 2) await shot(page, 'l1-coll'); }
  must(await E(j => LWS.ex[j].rows.length, j) === 7, `ЛР 1: опыт ${j} — не 7 выстрелов`); await page.click('[data-lw="next"]');
}
must(await st() === 'proc', 'ЛР 1: нет обработки');
{ const keys = await E(() => Object.values(LW_TABLES).flat()), vals = await E(ks => { const O = lwCalcAll(); return Object.fromEntries(ks.map(k => { const [key, j] = k.split('@'), v = O[+j || 2][key]; return [k, (Math.abs(v) < 10 ? v.toFixed(4) : v.toFixed(2)).replace('.', ',')]; })); }, keys);
  await procFill('lw', keys, Object.keys(await E(() => LW_TABLES)), vals); await shot(page, 'l1-proc');
  const bad = await E(ks => ks.filter(k => !LWS.procOk[k]), keys); must(!bad.length, 'ЛР 1: обработка не принята: ' + bad.join(', ')); await page.click('[data-lw="next"]'); }
must(await st() === 'concl', 'ЛР 1: нет выводов');
await admitAndCq('lw', 'cq'); must(await st() === 'report', 'ЛР 1: нет отчёта');
const f1 = await finish(1, 'lw');

/* главный экран: обе работы защищены, ЛР 3 не тронута; файл ЛР 2 открывается для продолжения на «другом компьютере» */
must((await page.locator('.labc.done').count()) === 2, 'на главном экране не отмечены защищённые работы'); await shot(page, 'labs-done');
const ctx2 = await b.newContext({ viewport: { width: 1366, height: 768 } }); const p2 = await ctx2.newPage(); p2.on('pageerror', e => errors.push(e.message));
await p2.goto(BASE, { waitUntil: 'networkidle' }); await p2.setInputFiles('#file-in', f2); await p2.waitForFunction(() => SCREEN === 'work');
must(await p2.evaluate(() => LAB === 2 && L2S.done && L2.steps[L2S.step][0] === 'report'), 'ЛР 2 из файла не восстановилась'); await ctx2.close();

// преподаватель: вкладки ЛР 1 / ЛР 2, подлинность, отчёт
await page.click('[data-d="home"]'); await page.click('[data-d="teacher"]'); await page.fill('#tp1', '2026'); await page.fill('#tp2', '2026'); await page.click('[data-t="setpass"]');
await page.setInputFiles('#file-in', [f1, f2]); await page.waitForFunction(() => TROWS.length === 2);
for (const n of [1, 2]) {
  await page.click(`[data-t="tlab"][data-v="${n}"]`); await W(150);
  must((await page.locator('table.tt tr.r').count()) === 1 && (await page.locator('table.tt').innerText()).includes('подлинный'), `преподаватель: нет работы ЛР ${n}`);
  await page.click('table.tt tr.r'); await page.locator('#modal .lwp').first().waitFor(); must(await page.locator('#modal .lwp').count() === 4, `преподаватель: отчёт ЛР ${n}`);
  await shot(page, `teacher-l${n}`); await page.keyboard.press('Escape');
}
if (errors.length) throw new Error('ошибки в браузере: ' + errors.join(' | '));
console.log('PASS: Физпрактикум — выбор работы, ЛР 1 и ЛР 2 целиком: допуск, подготовка, опыты, обработка, защита, сводка, отчёт, файл работы, продолжение из файла, режим преподавателя по работам.');
await b.close();
