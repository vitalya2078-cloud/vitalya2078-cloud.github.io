// «Физпрактикум» для Windows: меню, конспекты (формулы KaTeX), поиск Ctrl+K, полезные блоки, профиль, «О программе».
// Запуск: сервер на 127.0.0.1:4180 (lw3-desktop/dist); node lw3-desktop/tests/e2e-ui.mjs
import { chromium } from 'playwright';
const BASE = process.env.BASE || 'http://127.0.0.1:4180/';
const b = await chromium.launch(process.env.FZ_CHROME ? { executablePath: process.env.FZ_CHROME } : {}); const page = await b.newPage({ viewport: { width: 1440, height: 900 } });
const errors = []; page.on('pageerror', e => errors.push(e.message)); page.on('console', m => m.type() === 'error' && errors.push(m.text()));
const must = (c, m) => { if (!c) { console.error('FAIL:', m); process.exit(1); } };
const W = ms => page.waitForTimeout(ms);
await page.goto(BASE, { waitUntil: 'networkidle' });
must(await page.locator('.fz-lfeat > div').count() === 4, 'на экране входа нет блока о программе');
await page.fill('#np-fio', 'Проверкин Пётр Петрович'); await page.fill('#np-group', '103'); await page.fill('#np-pw', '1234'); await page.fill('#np-pw2', '1234');
await page.click('[data-d="register"]'); await W(200); must(await page.evaluate(() => SCREEN === 'home' && !profiles().length), 'регистрация прошла без согласия с лицензионным соглашением');
await page.click('.fz-eula-ok [data-fz="eula"]'); await W(200); must((await page.locator('.fz-eula h4').count()) >= 8, 'нет текста лицензионного соглашения'); await page.keyboard.press('Escape'); await W(150);
await page.check('#np-eula'); await page.click('[data-d="register"]'); await W(400); await page.keyboard.press('Escape'); await W(800);
// главная: блоки, вопрос дня, перевод единиц
must(await page.locator('.fz-widgets .fz-w').count() >= 2, 'на главной нет блоков «Вопрос дня» и «Что повторить»');
await page.click('.fz-wqo button >> nth=0'); await W(200); must(await page.locator('.fz-wq .fz-verdict').count() === 1, 'вопрос дня не проверяется');
must(await page.locator('.fz-mlabs .fz-ml').count() === await page.evaluate(() => labNums().length), 'на главной нет карточек работ');
await page.click('[data-d="page"][data-v="ref"]'); await W(300); must(await page.locator('.fz-refg .fz-w').count() >= 8, 'справочник пуст');
await page.click('[data-d="uc-cat"][data-v="Скорость"]'); await page.selectOption('#uc-a', '1'); await page.selectOption('#uc-b', '0'); await page.fill('#uc-v', '36'); await W(100);
must((await page.textContent('#uc-r')).trim() === '10', 'перевод 36 км/ч → м/с неверен: ' + await page.textContent('#uc-r')); await page.click('[data-d="page"][data-v="main"]'); await W(300);
// меню: свернуть и развернуть
await page.keyboard.press('Control+b'); await W(200); must(await page.locator('.fz-app.mini').count() === 1, 'Ctrl+B не свернул меню');
await page.click('[data-d="navmini"]'); await W(200); must(await page.locator('.fz-app.mini').count() === 0, 'меню не развернулось');
// «Что нового» и клик по названию
await page.click('[data-d="page"][data-v="profile"]'); await W(200); must(await page.locator('.fz-pstats .fz-pst').count() === 4, 'профиль без статистики');
await page.click('[data-d="brand"]'); await W(200); must(await page.evaluate(() => PAGE === 'main'), 'клик по названию не ведёт на главную');
must(await page.locator('.fz-new, [data-d="news"]').count() === 0, 'остался блок «Что нового»');
must(await page.evaluate(() => profiles()[0].eula && profiles()[0].eula.v === '1.0'), 'не записано принятие соглашения');
// конспекты: 17 штук, формулы рисуются, оглавление
await page.click('[data-d="page"][data-v="notes"]'); await W(400);
must(await page.locator('.fz-ncard').count() === await page.evaluate(() => NOTES.notes.length) && await page.evaluate(() => NOTES.notes.length) >= 18, 'показаны не все конспекты');
await page.click('[data-d="note"][data-v="t2"]'); await page.waitForFunction(() => document.querySelectorAll('.fz-note .katex').length > 50, null, { timeout: 8000 });
must(await page.locator('.fz-note .tx:not(.ok)').count() === 0, 'не все формулы нарисованы');
must(await page.locator('.fz-ntoc .fz-tl').count() > 8, 'нет оглавления');
must(await page.evaluate(async () => { const v = document.querySelector('.fz-video video'); if (!v) return false; if (!v.canPlayType('video/mp4; codecs="avc1.640028"')) return true; /* открытый Chromium без H.264: сам файл не проверить */ if (v.readyState < 1) await new Promise(r => { v.onloadedmetadata = r; v.onerror = r; }); return v.duration > 240 && v.duration < 400 && !!v.poster; }), 'видеоурок темы не загружается');
// поиск
await page.keyboard.press('Control+k'); await W(200); must(await page.locator('#fz-sr:not([hidden])').count() === 1, 'Ctrl+K не открыл поиск');
await page.keyboard.type('закон джоуля'); await W(300); must(await page.locator('.fz-sri').count() > 0, 'поиск ничего не нашёл');
await page.keyboard.press('Enter'); await W(800); must(await page.evaluate(() => PAGE === 'notes' && NOTE === 't2'), 'результат поиска не открыл конспект');
await page.keyboard.press('Control+k'); await page.keyboard.type('момент инерции'); await W(300); await page.keyboard.press('Escape'); await W(100);
must(await page.locator('#fz-sr[hidden]').count() === 1, 'Esc не закрыл поиск');
// тесты → конспект темы, «О программе» → правовая информация
await page.click('[data-d="page"][data-v="tests"]'); await W(300); await page.click('[data-d="note"][data-v="t5"]'); await W(500); must(await page.evaluate(() => NOTE === 't5'), 'кнопка «Конспект» в тестах не работает');
await page.click('[data-d="page"][data-v="about"]'); await W(200); await page.click('[data-fz="legal"]'); await W(200); must(await page.locator('.fz-legal').count() === 1, 'нет правовой информации'); await page.keyboard.press('Escape');
must(!errors.length, 'ошибки в консоли: ' + errors.join(' | '));
console.log('PASS: интерфейс — вход, меню (Ctrl+B), главная (работы, вопрос дня), справочник (перевод единиц), без «Что нового», профиль, конспекты с формулами, поиск Ctrl+K, правовая информация.');
await b.close();
