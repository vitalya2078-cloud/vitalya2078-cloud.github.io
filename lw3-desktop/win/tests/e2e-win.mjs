// Проверка настоящей программы Windows (Fizpraktikum.exe на C++ + WebView2 109) на сервере сборки.
// Запускает проверочную сборку (FZ_TEST) с портом отладки, подключается к её окну и проверяет:
// интерфейс открылся из встроенного app.pak, команды программы (лицензия, файлы работ, сохранение, PDF, масштаб),
// видео с перемоткой (Range) и воспроизведение H.264, регистрация, конспект с формулами, лабораторная работа.
// Запуск (Windows): FZ_EXE=путь\Fizpraktikum.exe node lw3-desktop/win/tests/e2e-win.mjs
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const EXE = process.env.FZ_EXE, PORT = 9333;
const must = (c, m) => { if (!c) { console.error('FAIL:', m); finish(1); } };
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'fz-'));
const appdata = path.join(tmp, 'appdata'), saves = path.join(tmp, 'saves'); fs.mkdirSync(appdata); fs.mkdirSync(saves);
const proc = spawn(EXE, [], { env: { ...process.env, FZ_CDP_PORT: String(PORT), FZ_TEST_SAVE_DIR: saves, LOCALAPPDATA: appdata }, stdio: 'ignore' });
let browser;
function finish(code) { try { proc.kill(); } catch (e) {} process.exit(code); }
proc.on('exit', c => { console.error('FAIL: программа закрылась, код', c); process.exit(1); });

for (let i = 0; i < 60 && !browser; i++) {
  await new Promise(r => setTimeout(r, 1000));
  try { browser = await chromium.connectOverCDP(`http://127.0.0.1:${PORT}`); } catch (e) {}
}
must(browser, 'не удалось подключиться к окну программы');
let page;
for (let i = 0; i < 30 && !page; i++) { page = browser.contexts().flatMap(c => c.pages()).find(p => p.url().startsWith('http://tauri.localhost/')); if (!page) await new Promise(r => setTimeout(r, 500)); }
must(page, 'интерфейс не открылся по адресу http://tauri.localhost/');
const errors = []; page.on('pageerror', e => errors.push(e.message));
await page.waitForFunction(() => document.querySelector('#np-fio, .fz-lfeat'), null, { timeout: 30000 });
const W = ms => page.waitForTimeout(ms);
const inv = (cmd, args) => page.evaluate(([c, a]) => window.__TAURI__.core.invoke(c, a).then(v => ({ ok: true, v }), e => ({ ok: false, e: String(e) })), [cmd, args]);

// движок
const ua = await page.evaluate(() => navigator.userAgent); console.log('движок:', ua);
must(/Chrome\/109\./.test(ua), 'в программе не WebView2 109');
must(await page.evaluate(() => IS_TAURI === true), 'интерфейс не видит программу (мост invoke)');

// команды
let r = await inv('app_info', {}); must(r.ok && r.v.host === 'win32', 'нет команды app_info');
r = await inv('license_status', { folders: [] }); must(r.ok && typeof r.v.code === 'string' && /^FZ-[0-9A-Z]{4}(-[0-9A-Z]{4}){3}$/.test(r.v.code) && r.v.state === 'ok', 'license_status: ' + JSON.stringify(r));
console.log('код компьютера:', r.v.code);
r = await inv('license_activate', { text: 'FZK-0000' }); must(!r.ok && /не подходит/.test(r.e), 'неверный ключ не отклонён');
r = await inv('app_config', {}); must(r.ok && r.v === null, 'app_config без файла должен вернуть null');
r = await inv('nope', {}); must(!r.ok, 'неизвестная команда принята');
r = await inv('pick_folder', {}); must(r.ok && r.v === saves, 'pick_folder: ' + JSON.stringify(r));
r = await inv('write_lw3', { dir: saves, name: 'Иванов И.И. ЛР1.lw3', contents: '{"кириллица":"да ✓"}' }); must(r.ok, 'write_lw3: ' + JSON.stringify(r));
r = await inv('write_lw3', { dir: saves, name: '..\\x.lw3', contents: '' }); must(!r.ok, 'опасное имя файла принято');
fs.writeFileSync(path.join(saves, 'чужой.txt'), 'x');
r = await inv('read_lw3_dir', { dir: saves }); must(r.ok && r.v.length === 1 && r.v[0][0] === 'Иванов И.И. ЛР1.lw3' && r.v[0][1] === '{"кириллица":"да ✓"}', 'read_lw3_dir: ' + JSON.stringify(r));
r = await inv('save_file', { name: 'Результаты', contents: 'строка;1\n', ext: 'csv', label: 'Таблица' }); must(r.ok && fs.readFileSync(r.v, 'utf8') === 'строка;1\n', 'save_file: ' + JSON.stringify(r));
r = await inv('save_pdf', { name: 'Отчёт' }); must(r.ok && fs.existsSync(r.v) && fs.readFileSync(r.v).subarray(0, 4).toString() === '%PDF', 'save_pdf: ' + JSON.stringify(r));
r = await inv('set_zoom', { scale: 1.25 }); must(r.ok, 'set_zoom'); await inv('set_zoom', { scale: 1 });

// файлы интерфейса и видео с перемоткой
const v = await page.evaluate(async () => {
  const get = async (u, o) => { try { const r = await fetch(u, o); return { st: r.status, cr: r.headers.get('content-range'), len: (await r.arrayBuffer()).byteLength }; } catch (e) { return { st: 'ошибка ' + u + ': ' + e }; } };
  const a = await get('video/t1.mp4', { headers: { Range: 'bytes=100-199' } });   /* перемотка: тот же разбор Range, что у fzv */
  const b = await get('http://fzv.localhost/index.html');   /* с адреса видео отдаются только ролики */
  const c = await get('notes/notes.json');
  return { st: a.st, cr: a.cr, len: a.len, bad: b.st, notes: c.st };
});
must(v.st === 206 && /^bytes 100-199\/\d+$/.test(v.cr) && v.len === 100, 'видео: нет перемотки (Range) ' + JSON.stringify(v));
must(v.bad === 404 && v.notes === 200, 'отдача файлов: ' + JSON.stringify(v));

// регистрация и интерфейс
if (await page.locator('#np-fio').count()) {
  await page.fill('#np-fio', 'Проверкин Пётр Петрович'); await page.fill('#np-group', '103'); await page.fill('#np-pw', '1234'); await page.fill('#np-pw2', '1234');
  await page.check('#np-eula'); await page.click('[data-d="register"]'); await W(600); await page.keyboard.press('Escape'); await W(600);
}
must(await page.locator('.fz-mlabs .fz-ml').count() === 8, 'главная не открылась после регистрации');
await page.click('[data-d="page"][data-v="notes"]'); await W(400);
await page.click('[data-d="note"][data-v="t2"]');
await page.waitForFunction(() => document.querySelectorAll('.fz-note .katex').length > 50, null, { timeout: 15000 });
const vid = await page.evaluate(async () => {
  const el = document.querySelector('.fz-video video'); if (!el) return 'нет плеера';
  if (el.readyState < 1) await new Promise(r => { el.onloadedmetadata = r; el.onerror = r; setTimeout(r, 15000); });
  if (!(el.duration > 240)) return 'метаданные: ' + el.duration + ' ' + (el.error && el.error.code);
  el.muted = true; el.currentTime = 120; await new Promise(r => { el.onseeked = r; setTimeout(r, 10000); });
  try { await el.play(); } catch (e) { return 'play: ' + e; }
  await new Promise(r => setTimeout(r, 1500)); el.pause();
  return el.currentTime > 120.5 ? 'ok' : 'не играет: ' + el.currentTime;
});
must(vid === 'ok', 'видеоурок: ' + vid);
await page.screenshot({ path: path.join(process.env.SHOTS || tmp, 'win-notes.png') });
await page.click('[data-d="page"][data-v="main"]'); await W(300);
await page.click('.fz-mlabs .fz-ml >> nth=0'); await W(800);
await page.screenshot({ path: path.join(process.env.SHOTS || tmp, 'win-lab.png') });
must(errors.length === 0, 'ошибки на странице: ' + errors.join(' | '));
console.log('PASS: программа Windows (C++ + WebView2 109) — запуск, команды, файлы работ, сохранение и PDF, видео с перемоткой, регистрация, конспект, работа.');
await browser.close().catch(() => {});
proc.removeAllListeners('exit'); finish(0);
