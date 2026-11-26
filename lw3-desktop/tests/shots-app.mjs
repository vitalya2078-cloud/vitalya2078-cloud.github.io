// Снимки новых экранов «Физпрактикума» (вход, разделы, тесты, «О программе») для просмотра оформления.
// Запуск: сервер на 127.0.0.1:4180 (lw3-desktop/dist); SHOTS=папка node lw3-desktop/tests/shots-app.mjs
import { chromium } from 'playwright';
import path from 'node:path';
const BASE = process.env.BASE || 'http://127.0.0.1:4180/', SHOTS = process.env.SHOTS || '/tmp';
const b = await chromium.launch(process.env.FZ_CHROME ? { executablePath: process.env.FZ_CHROME } : {});
const page = await b.newPage({ viewport: { width: 1440, height: 900 } });
const errors = []; page.on('pageerror', e => errors.push(e.message)); page.on('console', m => m.type() === 'error' && errors.push(m.text()));
const shot = n => page.screenshot({ path: path.join(SHOTS, `app-${n}.png`) });
const W = ms => page.waitForTimeout(ms);
await page.goto(BASE, { waitUntil: 'networkidle' }); await shot('1-register');
await page.fill('#np-fio', 'Кравченко Виктор Андреевич'); await page.fill('#np-group', '103'); await page.fill('#np-pw', '1234'); await page.fill('#np-pw2', '1234'); await page.check('#np-eula');
await page.click('[data-d="register"]'); await W(300); await page.keyboard.press('Escape'); await W(200); await shot('2-main');
for (const p of ['labs', 'tests', 'results', 'profile', 'about']) { await page.click(`[data-d="page"][data-v="${p}"]`); await W(400); await shot('3-' + p); }
await page.click('[data-fz="devs"]'); await W(200); await shot('4-devs'); await page.keyboard.press('Escape');
await page.click('[data-d="page"][data-v="tests"]'); await page.click('[data-fz="self"][data-v="2"]'); await W(300); await shot('5-self');
await page.locator('.fz-opt').first().click(); await W(200); await shot('6-self-answered');
page.on('dialog', d => d.accept());
await page.click('[data-fz="quit"]'); await W(200); await page.click('[data-fz="back"]').catch(() => {}); await W(200);
await page.click('[data-fz="exam"][data-v="3"]'); await W(400); await shot('7-exam');
await page.evaluate(() => { for (let i = 0; i < 30; i++) { const q = tCur(); tAnswer(i % 3 ? q.a : q.x[0]); } }); await W(300); await shot('8-exam-result');
await page.click('[data-fz="back"]'); await page.click('[data-d="home"]'); await W(300); await page.click('[data-d="acc"]'); await W(200); await shot('9-login');
console.log(errors.length ? 'ОШИБКИ: ' + errors.join(' | ') : 'без ошибок');
await b.close();
