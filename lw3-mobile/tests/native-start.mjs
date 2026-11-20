// Запуск «как на телефоне»: на Android Capacitor подкладывает странице свой мост (window.Capacitor с isNativePlatform),
// но без registerPlugin — его даёт встроенный capacitor.js. Проверка: приложение не падает при старте, рисует вход
// и проходит в работу; вызовы нативных плагинов без настоящего Android не ломают интерфейс.
// Запуск: сервер на 127.0.0.1:4190 (папка lw3-mobile/www); node lw3-mobile/tests/native-start.mjs
import { chromium, devices } from 'playwright';
const BASE = process.env.BASE || 'http://127.0.0.1:4190/';
const b = await chromium.launch();
const ctx = await b.newContext({ ...devices['Pixel 7'] });
await ctx.addInitScript(() => {   // как native-bridge.js: платформа android, нативных вызовов нет
  window.androidBridge = { postMessage: () => {} };   // по нему capacitor.js узнаёт Android
  window.Capacitor = { isNativePlatform: () => true, getPlatform: () => 'android', isPluginAvailable: () => false, Plugins: {}, PluginHeaders: [],
    nativeCallback: () => {}, nativePromise: () => Promise.reject(new Error('нет Android')), triggerEvent: () => {}, handleError: () => {} };
});
const p = await ctx.newPage(); const errors = [];
p.on('pageerror', e => errors.push(e.message));
await p.goto(BASE, { waitUntil: 'networkidle' });
const ok = await p.locator('#np-fio').isVisible().catch(() => false);
if (!ok) throw new Error('экран входа не появился (белый экран). Ошибки: ' + errors.join(' | '));
if (!(await p.evaluate(() => NATIVE && typeof window.capacitorExports === 'object' && typeof capacitorExports.registerPlugin === 'function'))) throw new Error('нет моста к нативным плагинам (capacitor.js)');
await p.fill('#np-fio', 'Проверка Запуска'); await p.fill('#np-group', '103'); await p.fill('#np-pw', '1234'); await p.fill('#np-pw2', '1234'); await p.click('[data-m="register"]'); await p.waitForTimeout(300);
if (!(await p.evaluate(() => SCREEN === 'labs'))) throw new Error('не открылся выбор работы');
await p.click('#sheet [data-m="sclose"]'); await p.click('#dock [data-m="page"][data-v="labs"]'); await p.click('[data-m="lab"][data-v="2"]'); await p.waitForTimeout(300);
if (!(await p.evaluate(() => SCREEN === 'work' && LAB === 2))) throw new Error('не открылась ЛР 2');
if (errors.length) throw new Error('ошибки при запуске: ' + errors.join(' | '));
console.log('PASS: запуск как на Android — вход, выбор работы и начало ЛР 2 без ошибок');
await b.close();
