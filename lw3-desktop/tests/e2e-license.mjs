// Окно активации и показ срока лицензии (в браузере ответы программы подменяются: FZ_LIC_MOCK).
// Проверку ключей (подпись, код компьютера, срок) проверяет cargo test в src-tauri.
import { chromium } from 'playwright';
const BASE = process.env.BASE || 'http://127.0.0.1:4180/', SHOTS = process.env.SHOTS || '';
const must = (c, m) => { if (!c) { console.error('FAIL:', m); process.exit(1); } };
const b = await chromium.launch(process.env.FZ_CHROME ? { executablePath: process.env.FZ_CHROME } : {}); const page = await b.newPage({ viewport: { width: 1440, height: 900 } });
const errors = []; page.on('pageerror', e => errors.push(e.message));
await page.addInitScript(() => {
  window.FZ_LIC_MOCK = { enforced: true, state: 'none', code: 'FZ-PM2E-7KCE-GCJ3-GR1B', expires: '', days_left: 0 };
  window.FZ_LIC_MOCK_ACTIVATE = t => { if (!t.includes('FZK-GOOD')) throw new Error('Ключ не подходит к этому компьютеру.'); return { enforced: true, state: 'ok', code: 'FZ-PM2E-7KCE-GCJ3-GR1B', expires: '2026-12-21', days_left: 21 }; };
});
await page.goto(BASE, { waitUntil: 'networkidle' }); await page.waitForTimeout(300);
must((await page.locator('.fz-lcode').innerText()).replace(/\s+/g, '') === 'FZPM2E7KCEGCJ3GR1B', 'нет окна активации с кодом компьютера');
must(await page.locator('#np-fio').count() === 0, 'без лицензии доступен вход');
if (SHOTS) await page.screenshot({ path: SHOTS + '/lic-activate.png' });
await page.fill('#lic-key', 'FZK-BAD'); await page.click('[data-d="lic-go"]'); await page.waitForTimeout(200);
must((await page.locator('#lic-msg').innerText()).includes('не подходит'), 'чужой ключ принят');
await page.fill('#lic-key', 'FZK-GOOD'); await page.click('[data-d="lic-go"]'); await page.waitForTimeout(400);
must(await page.locator('#np-fio').count() === 1, 'после активации нет входа');
must((await page.locator('.corner.bl .fz-licchip').innerText()).includes('21 день'), 'на экране входа нет срока лицензии');
await page.fill('#np-fio', 'Проверкин Пётр Петрович'); await page.fill('#np-group', '103'); await page.fill('#np-pw', '1234'); await page.fill('#np-pw2', '1234'); await page.check('#np-eula');
await page.click('[data-d="register"]'); await page.waitForTimeout(400); await page.keyboard.press('Escape'); await page.waitForTimeout(300);
must(await page.locator('.fz-nav .fz-licchip.soon').count() === 1 && await page.locator('.fz-licwarn').count() === 0, 'срок в меню не показан или есть баннер');
if (SHOTS) await page.screenshot({ path: SHOTS + '/lic-main.png' });
await page.click('[data-d="page"][data-v="about"]'); await page.waitForTimeout(300);
must((await page.locator('.fz-ver-s').innerText()).includes('лицензия до 21 декабря 2026'), 'в «О программе» нет срока лицензии');
// срок истёк — снова окно активации с причиной
await page.evaluate(() => { LIC = { enforced: true, state: 'expired', code: 'FZ-PM2E-7KCE-GCJ3-GR1B', expires: '2026-11-01', days_left: 0 }; render(); });
must((await page.locator('.fz-lbrand p').innerText()).includes('закончился'), 'истёкший ключ не блокирует программу');
must(!errors.length, 'ошибки: ' + errors.join(' | '));
console.log('PASS: лицензия — окно активации с кодом компьютера, чужой ключ отклонён, срок и остаток дней в углу экрана входа, под меню и в «О программе», блокировка по истечении.');
await b.close();
