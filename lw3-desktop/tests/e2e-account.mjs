// Удаление учётной записи: с окна входа и из настроек профиля, подтверждение паролем, данные других курсантов не трогаются.
// Запуск: сервер на 127.0.0.1:4180 (lw3-desktop/dist); node lw3-desktop/tests/e2e-account.mjs
import { chromium } from 'playwright';
const BASE = process.env.BASE || 'http://127.0.0.1:4180/';
const b = await chromium.launch(process.env.FZ_CHROME ? { executablePath: process.env.FZ_CHROME } : {}); const page = await b.newPage({ viewport: { width: 1440, height: 900 } });
const errors = []; page.on('pageerror', e => errors.push(e.message)); page.on('console', m => m.type() === 'error' && errors.push(m.text()));
const must = (c, m) => { if (!c) { console.error('FAIL:', m); process.exit(1); } };
const W = ms => page.waitForTimeout(ms);
const SHOTS = process.env.SHOTS;
await page.goto(BASE, { waitUntil: 'networkidle' });

async function register(fio, group, pw) {
  if (await page.locator('[data-d="atab"][data-v="up"]').count()) await page.click('[data-d="atab"][data-v="up"]');
  await W(100); await page.fill('#np-fio', fio); await page.fill('#np-group', group); await page.fill('#np-pw', pw); await page.fill('#np-pw2', pw);
  await page.check('#np-eula'); await page.click('[data-d="register"]'); await W(400); await page.keyboard.press('Escape'); await W(300);
}
const ids = () => page.evaluate(() => profiles().map(p => p.fio));
const keysOf = fio => page.evaluate(f => { const p = profiles().find(x => x.fio === f); return p ? Object.keys(localStorage).filter(k => k.includes(p.id)).length : -1; }, fio);

// три курсанта; у первого есть сохранённая работа
await register('Первый Пётр Петрович', '101', '1111');
await page.evaluate(() => { store.set(LABS[1].key(PROFILE.id), { step: 2, max: 2 }); store.set(testKey(PROFILE.id), { x: 1 }); });
await page.click('[data-d="home"]'); await W(300);
await register('Второй Иван Иванович', '102', '2222'); await page.click('[data-d="home"]'); await W(300);
await register('Третий Сидор Сидорович', '103', '3333'); await page.click('[data-d="home"]'); await W(300);
must((await ids()).length === 3, 'не зарегистрированы три курсанта');
const firstId = await page.evaluate(() => profiles().find(p => p.fio.startsWith('Первый')).id);
must(await page.evaluate(id => Object.keys(localStorage).filter(k => k.includes(id)).length, firstId) >= 2, 'у первого нет сохранённых данных');

// 1. окно входа: без выбранной записи ссылки нет, после выбора — есть
await page.click('[data-d="atab"][data-v="in"]'); await W(150);
must(await page.locator('[data-d="acc-del"]').count() === 0, 'ссылка удаления видна без выбранной учётной записи');
await page.click(`[data-d="acc"][data-v="${firstId}"]`); await W(150);
must(await page.locator('[data-d="acc-del"]').count() === 1, 'на окне входа нет «Удалить эту учётную запись»');
if (SHOTS) await page.screenshot({ path: SHOTS + '/acc-login.png' });
await page.click('[data-d="acc-del"]'); await W(200);
must(await page.locator('#modal:not([hidden]) #del-pw').count() === 1, 'нет окна подтверждения с паролем');
if (SHOTS) await page.screenshot({ path: SHOTS + '/acc-del-modal.png' });
// отмена ничего не удаляет
await page.click('.fz-delact [data-d="mclose"]'); await W(150); must((await ids()).length === 3, 'отмена удалила учётную запись');
// неверный пароль
await page.click('[data-d="acc-del"]'); await W(200); await page.fill('#del-pw', '9999'); await page.click('[data-d="acc-del-ok"]'); await W(200);
must((await ids()).length === 3 && /Неверный пароль/.test(await page.textContent('#del-msg')), 'удаление с неверным паролем');
// чужой пароль тоже не подходит
await page.fill('#del-pw', '2222'); await page.keyboard.press('Enter'); await W(200); must((await ids()).length === 3, 'удаление с паролем другого курсанта');
// верный пароль, Enter
await page.fill('#del-pw', '1111'); await page.keyboard.press('Enter'); await W(400);
must(!(await ids()).some(f => f.startsWith('Первый')) && (await ids()).length === 2, 'учётная запись не удалена с окна входа');
must(await page.evaluate(id => Object.keys(localStorage).filter(k => k.includes(id)).length, firstId) === 0, 'после удаления остались данные курсанта');
must(await page.locator('#modal').isHidden(), 'окно подтверждения не закрылось');
must(await keysOf('Второй Иван Иванович') >= 0, 'пострадала чужая учётная запись');

// 2. настройки профиля
const secId = await page.evaluate(() => profiles().find(p => p.fio.startsWith('Второй')).id);
await page.click(`[data-d="acc"][data-v="${secId}"]`); await W(150); await page.fill('#au-pw', '2222'); await page.click('[data-d="login"]'); await W(500); await page.keyboard.press('Escape'); await W(200);
await page.click('[data-d="page"][data-v="profile"]'); await W(300);
must(await page.locator('.fz-dangert [data-d="acc-del"]').count() === 1, 'в настройках профиля нет карточки удаления');
await page.locator('.fz-dangert').scrollIntoViewIfNeeded(); if (SHOTS) await page.screenshot({ path: SHOTS + '/acc-profile.png' });
await page.click('.fz-dangert [data-d="acc-del"]'); await W(200); await page.fill('#del-pw', '1'); await page.click('[data-d="acc-del-ok"]'); await W(200);
must((await ids()).length === 2 && await page.evaluate(() => PROFILE && SCREEN !== 'home'), 'удаление из профиля с неверным паролем');
await page.fill('#del-pw', '2222'); await page.click('[data-d="acc-del-ok"]'); await W(500);
must((await ids()).length === 1 && await page.evaluate(() => !PROFILE && SCREEN === 'home'), 'после удаления из профиля нет выхода на окно входа');

// 3. запись без пароля (пароль сброшен преподавателем): удаляется после подтверждения без пароля
const thirdId = await page.evaluate(() => profiles()[0].id);
await page.evaluate(id => acctResetPw(id), thirdId); await page.evaluate(() => render()); await W(150);
await page.click(`[data-d="acc"][data-v="${thirdId}"]`); await W(150); await page.click('[data-d="acc-del"]'); await W(200);
must(await page.locator('#del-pw').count() === 0, 'у записи без пароля спрашивается пароль');
await page.click('[data-d="acc-del-ok"]'); await W(400);
must((await ids()).length === 0 && await page.locator('#np-fio').count() === 1, 'последняя запись не удалена или нет регистрации');

must(errors.length === 0, 'ошибки на странице: ' + errors.join(' | '));
console.log('PASS: удаление учётной записи — окно входа и профиль, пароль, Enter, отмена, данные удаляются только у своей записи.');
await b.close();
