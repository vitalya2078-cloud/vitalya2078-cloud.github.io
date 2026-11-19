// Полное прохождение «Показатель адиабаты» для Android в эмуляции телефона (Pixel 7, касания):
// вход → знакомство → допуск по одному вопросу → подготовка → 3 опыта (накачка удержанием, лупы, выпуск через K₀) →
// обработка с подсказкой → выводы и защита → сводка → отчёт → файл работы (подпись совместима с программой преподавателя).
// Запуск: python3 lw3-mobile/build.py; сервер на 127.0.0.1:4190 (папка lw3-mobile/www); node lw3-mobile/tests/e2e.mjs
import { chromium, devices } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
const BASE = process.env.BASE || 'http://127.0.0.1:4190/';
const SHOTS = process.env.SHOTS || '';
const shot = async (p, n) => { if (SHOTS) await p.screenshot({ path: path.join(SHOTS, `m-${n}.png`) }); };
const must = (ok, msg) => { if (!ok) throw new Error(msg); };
const b = await chromium.launch();
const ctx = await b.newContext({ ...devices['Pixel 7'], acceptDownloads: true });
const page = await ctx.newPage();
const errors = []; page.on('pageerror', e => errors.push(e.message)); page.on('console', m => m.type() === 'error' && errors.push(m.text()));
const E = (fn, a) => page.evaluate(fn, a);
const tap = async sel => { await page.locator(sel).first().scrollIntoViewIfNeeded(); await page.locator(sel).first().tap(); await page.waitForTimeout(120); };
const step = () => E(() => L3.steps[L3S.step][0]);
const noOverflow = async name => must(await E(() => document.documentElement.scrollWidth <= innerWidth + 1), `${name}: страница шире экрана`);

await page.goto(BASE, { waitUntil: 'networkidle' }); await shot(page, 'home'); await noOverflow('вход');
must(await E(() => document.documentElement.dataset.theme === 'light'), 'по умолчанию не светлая тема');
await page.fill('#np-fio', 'Петрова Анна Сергеевна'); await page.fill('#np-group', '11 Б'); await tap('[data-m="new"]');
must(await page.locator('#sheet .slide').isVisible(), 'нет знакомства'); await shot(page, 'intro');
for (let i = 0; i < 3; i++) await tap('[data-m="intro-next"]');
must(await page.locator('#sheet').isHidden(), 'знакомство не закрылось');

// 1. допуск: вопросы по одному, после ответа — сам следующий
const A = await E(() => L3_ADMIT.map(([, a]) => a)); await shot(page, 'admit');
await tap('[data-m="theory"]'); must(await page.locator('#sheet .txt').isVisible(), 'нет теории'); await shot(page, 'theory'); await tap('[data-m="sclose"]');
for (let i = 0; i < 8; i++) { must(await E(() => AQ) === i, `допуск: ожидался вопрос ${i + 1}`); await tap(`.opt[data-q="${i}"][data-v="${A[i].replace(/"/g, '\\"')}"]`); await page.waitForTimeout(320); }
await tap('[data-l3="admitCheck"]'); must(await E(() => L3S.admitOk), 'допуск не сдан'); await shot(page, 'admit-ok');
await tap('[data-l3="next"]'); must(await step() === 'prep', 'нет подготовки');

// 2. подготовка
await shot(page, 'prep'); await noOverflow('подготовка');
await tap('[data-l3="power"]'); await tap('[data-l3="kv"]'); await tap('[data-l3="k0"]');
await tap('[data-l3="next"]'); must(await step() === 'exp', 'нет опытов');

// 3. опыты: накачка удержанием, минута, h₁ по лупам, выпуск K₀, минута, h₂
async function hold() { const bx = await page.locator('#l3-pump').boundingBox(); await page.mouse.move(bx.x + bx.width / 2, bx.y + bx.height / 2); await page.mouse.down();
  await page.waitForFunction(() => L3V.p >= 214, null, { timeout: 30000 }); await page.mouse.up(); }
async function readH(rec, name) { await page.waitForTimeout(300); if (name) { must(await page.locator('#m-scene.zoom').count() === 1, 'лупы не крупно'); await shot(page, name); }
  const h = await E(() => { const [l, r] = l3Levels(); return Math.round(r - l); }); await page.fill('[data-k3="ch"]', String(h)); await tap(`[data-l3="${rec}"]`); }
for (let k = 0; k < 3; k++) {
  if (k) { must(await E(() => L3V.phase) === 'ready', 'опыт не готов'); await tap('[data-l3="k0"]'); }
  must(await E(() => L3V.phase) === 'pump', 'нет накачки'); if (!k) await shot(page, 'pump');
  await hold(); await tap('[data-l3="closeK"]'); must(await E(() => L3V.phase) === 'wait1', 'K не закрыт');
  await tap('[data-l3="waitMin"]'); await page.waitForFunction(() => L3V.phase === 'read1', null, { timeout: 30000 });
  await readH('rec1', k ? '' : 'read'); must(await E(() => L3V.phase) === 'vent', 'h₁ не записан');
  await tap('[data-l3="k0open"]'); await page.waitForFunction(() => L3V.hiss < .05 && Math.abs(L3V.p) < 2, null, { timeout: 15000 }); await page.waitForTimeout(200);
  if (!k) await shot(page, 'vent');
  await tap('[data-l3="k0close"]'); await tap('[data-l3="startSw"]'); await page.waitForTimeout(200);
  await tap('[data-l3="waitMin"]'); await page.waitForFunction(() => L3V.phase === 'read2', null, { timeout: 30000 });
  await readH('rec2'); must(await E(() => L3S.runs.length) === k + 1, `опыт ${k + 1} не записан`);
}
await shot(page, 'exp-done'); await tap('[data-l3="next"]'); must(await step() === 'proc', 'нет обработки');

// 4. обработка: ошибка → подсказка, затем верно
const o = await E(() => { const o = l3Calc(); return { g: o.a.map(x => x.g), gm: o.gm, dg: o.dg, eg: o.eg, e: o.e }; });
const f = (v, d = 3) => v.toFixed(d).replace('.', ',');
for (let i = 0; i < 3; i++) await page.fill(`[data-k3="p_g${i + 1}"]`, f(o.g[i]));
await page.fill('[data-k3="p_gm"]', f(o.g[0] + o.g[1] + o.g[2])); await tap('[data-l3="pcheck"]');
must((await page.locator('.pv .hint').first().innerText()).includes('разделить на N'), 'нет подсказки'); await shot(page, 'proc-hint');
await page.fill('[data-k3="p_gm"]', f(o.gm)); await page.fill('[data-k3="p_dg"]', f(o.dg)); await page.fill('[data-k3="p_eg"]', f(o.eg, 1)); await page.fill('[data-k3="p_gT"]', '1,400'); await page.fill('[data-k3="p_e"]', f(o.e, 1));
await tap('[data-l3="pcheck"]'); must(await E(() => L3_KEYS.every(k => L3S.procOk[k])), 'обработка не принята'); await shot(page, 'proc-ok'); await noOverflow('обработка');
await tap('[data-l3="next"]'); must(await step() === 'concl', 'нет выводов');

// 5. выводы и защита
must((await page.locator('[data-k3="concl"]').inputValue()).includes('γ ='), 'черновик выводов пуст'); await shot(page, 'concl');
await tap('[data-m="ctab"][data-v="cq"]');
const C = await E(() => L3_CQ.map(([, a]) => a));
for (let i = 0; i < 8; i++) { await tap(`.opt[data-q="${i}"][data-v="${C[i].replace(/"/g, '\\"')}"]`); await page.waitForTimeout(320); }
await shot(page, 'cq'); await tap('[data-l3="cqCheck"]'); must(await E(() => L3S.cqOk && L3S.done), 'защита не принята');
await tap('[data-l3="next"]'); must(await step() === 'report', 'нет отчёта');

// 6. сводка (сама, один раз) и отчёт
await page.locator('#sheet .sum').waitFor(); await shot(page, 'summary');
must(await page.locator('#sheet .sum-t tr').count() === 4, 'в сводке нет измерений'); await tap('#sheet [data-m="sclose"]');
await page.waitForTimeout(200); await shot(page, 'report'); await noOverflow('отчёт');
must(await page.locator('#m-paper .lwp').count() === 4 && await page.locator('#printroot .lwp').count() === 4, 'в отчёте не 4 листа');
await tap('[data-m="summary"]'); must(await page.locator('#sheet .sum').isVisible(), 'кнопка сводки не работает'); await tap('#sheet [data-m="sclose"]');

// файл работы: подпись проверяется так же, как в программе преподавателя
const [dl] = await Promise.all([page.waitForEvent('download'), tap('[data-m="send"]')]);
const file = path.join(SHOTS || '/tmp', 'lw3-mobile.lw3'); await dl.saveAs(file);
const saved = JSON.parse(fs.readFileSync(file, 'utf8'));
must(saved.format === 'lw3-result' && saved.state.done && saved.sig && Math.abs(saved.summary.gm - o.gm) < 1e-9 && saved.state.dx.device === 'android', 'файл работы неполный');
must(await E(t => unpackResult(t).ok, fs.readFileSync(file, 'utf8')), 'подпись файла не проходит проверку');

// меню, ход работы, тёмная тема
await tap('[data-m="menu"]'); await shot(page, 'menu'); await tap('#sheet [data-m="hod"]'); must(await page.locator('#sheet .hod li').count() === 13, 'в ходе работы не 13 пунктов'); await shot(page, 'hod'); await tap('[data-m="sclose"]');
await tap('[data-m="menu"]'); await tap('#sheet [data-m="theme"]'); must(await E(() => document.documentElement.dataset.theme === 'dark' && L3_THEME === 'dark'), 'тёмная тема не включилась');
await tap('[data-l3="go"][data-v="2"]'); await page.waitForTimeout(400); await shot(page, 'dark-exp');

// продолжение по файлу на «другом телефоне»
const ctx2 = await b.newContext({ ...devices['Pixel 7'] }); const p2 = await ctx2.newPage(); p2.on('pageerror', e => errors.push(e.message));
await p2.goto(BASE, { waitUntil: 'networkidle' }); await p2.setInputFiles('#file-in', file); await p2.waitForFunction(() => SCREEN === 'work');
must(await p2.evaluate(() => L3S.done && L3.steps[L3S.step][0] === 'report'), 'работа из файла не восстановилась'); await ctx2.close();

if (errors.length) throw new Error('ошибки в браузере: ' + errors.join(' | '));
console.log(`⟨γ⟩ = ${o.gm.toFixed(3)} ± ${o.dg.toFixed(3)}, ε = ${o.e.toFixed(1)} %`);
console.log('PASS: Android — вход, знакомство, допуск, подготовка, 3 опыта, обработка, защита, сводка, отчёт, файл работы, меню, тема, продолжение из файла.');
await b.close();
