// «Физпрактикум» для iPhone (веб-приложение с экрана «Домой», папка fizpraktikum/).
// Проверяет: manifest и значки, service worker и запуск без интернета, полное прохождение ЛР 5 в раскладке iPhone,
// файл работы с пометкой «iPhone», отчёт файлом (.html) в режиме приложения с экрана «Домой».
// Браузер — Chromium с параметрами iPhone 13 (WebKit в среде тестов не установлен; на реальном iPhone — проверить вручную).
// Запуск: python3 lw3-mobile/build_ios.py; сервер на 127.0.0.1:4200 (корень репозитория); node lw3-mobile/tests/ios-pwa.mjs
import { chromium, devices } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { leDriver } from '../../lw3-desktop/tests/le-drivers.mjs';
const BASE = process.env.BASE || 'http://127.0.0.1:4200/fizpraktikum/';
const must = (ok, msg) => { if (!ok) throw new Error(msg); };
const b = await chromium.launch();
const ctx = await b.newContext({ ...devices['iPhone 13'], acceptDownloads: true });
await ctx.addInitScript(() => { Object.defineProperty(navigator, 'standalone', { get: () => true }); });   // как запуск с экрана «Домой»
const page = await ctx.newPage();
const errors = []; page.on('pageerror', e => errors.push(e.message)); page.on('console', m => m.type() === 'error' && errors.push(m.text()));
const E = (fn, a) => page.evaluate(fn, a), W = ms => page.waitForTimeout(ms);

// manifest, значки, метатеги iOS
await page.goto(BASE, { waitUntil: 'networkidle' });
const head = await E(() => ({ man: document.querySelector('link[rel="manifest"]')?.getAttribute('href'), touch: document.querySelector('link[rel="apple-touch-icon"]')?.getAttribute('href'),
  cap: document.querySelector('meta[name="apple-mobile-web-app-capable"]')?.content, ios: IOS, pwa: PWA, st: STANDALONE }));
must(head.man && head.touch && head.cap === 'yes' && head.ios && head.pwa && head.st, 'нет метатегов iOS / флага PWA: ' + JSON.stringify(head));
const man = await (await page.request.get(new URL(head.man, BASE).href)).json();
must(man.name === 'Физпрактикум' && man.display === 'standalone' && man.icons.length >= 2, 'manifest неполный');
for (const u of [head.touch, ...man.icons.map(i => i.src)]) must((await page.request.get(new URL(u, BASE).href)).ok(), 'нет значка ' + u);

// service worker: установлен, страница под его управлением, без интернета открывается
await page.waitForFunction(() => navigator.serviceWorker && navigator.serviceWorker.controller || false, null, { timeout: 15000 }).catch(async () => { await page.reload({ waitUntil: 'networkidle' }); });
await page.waitForFunction(() => !!navigator.serviceWorker.controller, null, { timeout: 15000 });
await ctx.setOffline(true); await page.reload({ waitUntil: 'domcontentloaded' }); await W(400);
must(await page.locator('#np-fio').count() === 1, 'без интернета приложение не открылось');
must(await E(() => getComputedStyle(document.body).fontFamily.length > 0 && !!document.querySelector('#main')), 'без интернета пустая страница');
await ctx.setOffline(false);

// ЛР 5 целиком (без интернета приложению он и не нужен; включён обратно, чтобы скачивания шли как обычно)
await page.fill('#np-fio', 'Котова Ирина'); await page.fill('#np-group', '11 А'); await page.click('[data-m="new"]'); await page.click('#sheet [data-m="sclose"]');
must(await page.locator('.labm').count() === 8, 'на главном экране не 8 работ');
await page.click('[data-m="lab"][data-v="5"]'); await W(200);
async function quiz(key) {
  const list = await E(k => curLab()[k].map(([, a]) => a), key);
  for (let i = 0; i < list.length; i++) { await E(([k, i]) => { if (k === 'admit') AQ = i; else CQ = i; render(); }, [key, i]); await page.click(`.opts [data-q="${i}"][data-v="${list[i].replace(/"/g, '\\"')}"]`); await W(300); }
  await page.locator(`#dock [data-le="${key}Check"]`).first().click(); await W(150);
  must(await E(k => LES[k === 'admit' ? 'admitOk' : 'cqOk'], key), key + ' не сдан'); await page.click('[data-le="next"]'); await W(250);
}
await quiz('admit');
await leDriver(page, must).run(5);
await page.click('[data-m="ctab"][data-v="cq"]'); await W(150); await quiz('cq');
must(await E(() => curLab().steps[LES.step][0]) === 'report', 'ЛР 5: нет отчёта');
await page.locator('#sheet .sum').waitFor(); await page.click('#sheet [data-m="sclose"]');
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'fz-ios-'));
// файл работы для преподавателя: пометка «iPhone», подпись проходит
{ const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#dock [data-m="send"]')]); const f = path.join(dir, dl.suggestedFilename()); await dl.saveAs(f);
  const d = JSON.parse(fs.readFileSync(f, 'utf8')); must(d.lab === 5 && d.state.done && d.state.dx.device === 'ios', 'файл работы: нет пометки iPhone');
  must(await E(t => unpackResult(t).ok, fs.readFileSync(f, 'utf8')), 'подпись файла не проходит'); }
// отчёт: в режиме с экрана «Домой» — файлом .html (4 листа, шапка кафедры)
{ const [dl] = await Promise.all([page.waitForEvent('download'), page.click('[data-m="pdf"]')]); const name = dl.suggestedFilename(), f = path.join(dir, 'report.html'); await dl.saveAs(f);
  const t = fs.readFileSync(f, 'utf8'); must(t.startsWith('<!doctype html>') && (t.match(/class="lwp"/g) || []).length === 4 && t.includes('Лаборатория кафедры физики и общетехнических дисциплин'), 'отчёт файлом неполный: ' + name);
  const p2 = await ctx.newPage(); await p2.goto('file://' + f); must(await p2.locator('.lwp').count() === 4, 'отчёт файлом не открывается'); await p2.close(); }
if (errors.length) throw new Error('ошибки в браузере: ' + errors.join(' | '));
console.log('PASS: Физпрактикум для iPhone — manifest и значки, работа без интернета, ЛР 5 целиком, файл работы («iPhone»), отчёт файлом с экрана «Домой».');
await b.close();
