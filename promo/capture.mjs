// Съёмка экранов «Физпрактикума» для промо-ролика (тёмная тема, 1600×1000 при масштабе 1.5).
// node promo/capture.mjs <папка для кадров> <папка с файлами .lw3 для кабинета преподавателя>
import { chromium } from 'playwright'; import fs from 'node:fs'; import path from 'node:path';
import { runLw3 } from '../fizika2/tests/lw3-flow.mjs';
const [OUT, LW3] = process.argv.slice(2).map(p => path.resolve(p)); fs.mkdirSync(path.join(OUT, 'exp'), { recursive: true });
const BASE = 'http://127.0.0.1:4180/';
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 1.5 });
await ctx.addInitScript(() => { try { localStorage.setItem('lw3d-theme', 'dark'); } catch (e) {} });
const page = await ctx.newPage(); page.on('dialog', d => d.accept());
const W = ms => page.waitForTimeout(ms); const shot = n => page.screenshot({ path: path.join(OUT, n + '.png') });
await page.goto(BASE, { waitUntil: 'networkidle' });
await page.fill('#np-fio', 'Кравченко Виталий Артурович'); await page.fill('#np-group', '103'); await page.fill('#np-pw', '1234'); await page.fill('#np-pw2', '1234'); await page.check('#np-eula');
await page.click('[data-d="register"]'); await W(400); await page.keyboard.press('Escape'); await W(900);
await shot('main');
// главные экраны программы
await page.evaluate(() => openNote('t2', 't2-6')); await W(1800); await shot('note');
await page.evaluate(() => openNote('t3')); await W(1500); await page.evaluate(() => { ui.main.scrollTop = 90; }); await W(400); await shot('board');
await page.click('[data-d="page"][data-v="ref"]'); await W(500); await shot('ref');
// установки работ: шаг подготовки
for (const n of [1, 2, 4, 5, 6, 7, 8]) {
  await page.evaluate(n => { openLab(n); }, n); await W(500); await page.click('[data-d="intro-skip"]').catch(() => {});
  await page.evaluate(() => { const L = curLab(), S = L.S(); S.admitOk = true; S.max = Math.max(S.max || 0, 1); S.step = 1; L.save(); render(); }); await W(900);
  await shot('lab' + n); await page.evaluate(() => { SCREEN = 'labs'; PAGE = 'main'; render(); }); await W(200);
}
// экзамен
await page.evaluate(() => { tStart('exam', 3); }); await W(1200); await shot('exam');
await page.evaluate(() => { clearInterval(tTimer.h); TQ = null; SCREEN = 'labs'; PAGE = 'main'; render(); }); await W(300);
// ЛР 3: опыт вживую — компрессор накачивает воздух
await page.evaluate(() => openLab(3)); await W(500); await page.click('[data-d="intro-skip"]').catch(() => {});
try {
  await runLw3(page, { beforeStep: async st => {
    if (st !== 'exp') return;
    await page.waitForFunction(() => L3V.phase === 'pump'); await W(600);
    await page.keyboard.down('Space');
    for (let i = 0; i < 64; i++) { await page.screenshot({ path: path.join(OUT, 'exp', String(i).padStart(3, '0') + '.png') }); await W(40); }
    await page.keyboard.up('Space'); throw new Error('STOP');
  } });
} catch (e) { if (e.message !== 'STOP') throw e; }
// кабинет преподавателя: подлинные и изменённые файлы
await page.evaluate(() => { PROFILE = null; SCREEN = 'lock'; render(); }); await W(300);
await page.fill('#tp', 'test-teacher'); await page.click('[data-t="unlock"]'); await page.waitForFunction(() => SCREEN === 'teacher');
await page.setInputFiles('#file-in', fs.readdirSync(LW3).filter(f => f.endsWith('.lw3')).map(f => path.join(LW3, f))); await W(1000);
await page.evaluate(() => { TLAB = 3; render(); }); await W(500); await shot('teacher');
await page.evaluate(() => { TLAB = 'journal'; render(); }); await W(500); await shot('journal');
await b.close(); console.log('ok');
