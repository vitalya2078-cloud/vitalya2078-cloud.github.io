// Снимки новых экранов «Физпрактикума» на телефоне (вход, разделы, тесты, «О программе»).
// Запуск: сервер на 127.0.0.1:4190 (lw3-mobile/www); SHOTS=папка node lw3-mobile/tests/shots-app.mjs
import { chromium, devices } from 'playwright';
import path from 'node:path';
const BASE = process.env.BASE || 'http://127.0.0.1:4190/', SHOTS = process.env.SHOTS || '/tmp';
const b = await chromium.launch();
const page = await (await b.newContext({ ...devices['iPhone 13'] })).newPage();
const errors = []; page.on('pageerror', e => errors.push(e.message)); page.on('console', m => m.type() === 'error' && errors.push(m.text()));
page.on('dialog', d => d.accept());
const shot = n => page.screenshot({ path: path.join(SHOTS, `m-${n}.png`) });
const W = ms => page.waitForTimeout(ms);
await page.goto(BASE, { waitUntil: 'networkidle' }); await shot('1-register');
await page.fill('#np-fio', 'Соколов Владимир Викторович'); await page.fill('#np-group', '103'); await page.fill('#np-pw', '1234'); await page.fill('#np-pw2', '1234');
await page.click('[data-m="register"]'); await W(300); await page.click('#sheet [data-m="sclose"]').catch(() => {}); await W(200); await shot('2-main');
for (const p of ['labs', 'tests', 'results', 'more']) { await page.click(`#dock [data-m="page"][data-v="${p}"]`); await W(400); await shot('3-' + p); }
await page.click('[data-m="page"][data-v="about"]'); await W(300); await shot('4-about');
await page.click('[data-fz="devs"]'); await W(300); await shot('5-devs'); await page.click('#sheet [data-m="sclose"]');
await page.click('[data-m="page"][data-v="profile"]').catch(async () => { await page.click('#dock [data-m="page"][data-v="more"]'); await page.click('[data-m="page"][data-v="profile"]'); }); await W(300); await shot('6-profile');
await page.click('#dock [data-m="page"][data-v="tests"]'); await page.click('[data-fz="self"][data-v="1"]'); await W(400); await shot('7-self');
await page.locator('.fz-opt').first().click(); await W(200); await shot('8-self-ans');
await page.click('[data-fz="quit"]'); await W(200); await page.click('[data-fz="back"]').catch(() => {}); await W(200);
await page.click('[data-fz="exam"][data-v="final"]'); await W(400); await shot('9-exam');
console.log(errors.length ? 'ОШИБКИ: ' + errors.join(' | ') : 'без ошибок');
await b.close();
