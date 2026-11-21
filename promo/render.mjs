// Рендер ролика: кадры compose.html → JPEG. node render.mjs <папка сцены> <папка кадров> <fps> [t1,t2,... для пробных кадров]
import { chromium } from 'playwright'; import fs from 'node:fs'; import path from 'node:path';
const [dir, out, fpsS, only] = process.argv.slice(2); const fps = +fpsS, DUR = 56.0;
fs.mkdirSync(out, { recursive: true });
const b = await chromium.launch(); const page = await b.newPage({ viewport: { width: 1920, height: 1080 } });
await page.goto('file://' + path.resolve(dir, 'compose.html')); await page.evaluate(() => document.fonts.ready);
// предзагрузка всех кадров опыта и экранов
await page.evaluate(async () => { const srcs = [...Array(64).keys()].map(i => `cap/exp/${String(i).padStart(3, '0')}.png`).concat([1, 2, 4, 5, 6, 7, 8].map(n => `cap/lab${n}.png`));
  window._pre = await Promise.all(srcs.map(s => new Promise(r => { const i = new Image(); i.onload = () => r(i); i.src = s; }))); });
const times = only ? only.split(',').map(Number) : [...Array(Math.round(DUR * fps)).keys()].map(i => i / fps);
for (const [i, t] of times.entries()) {
  await page.evaluate(async t => { draw(t); await Promise.all([...document.images].map(im => im.complete ? 0 : im.decode().catch(() => 0))); }, t);
  await page.screenshot({ path: path.join(out, only ? `p${String(t).replace('.', '_')}.jpg` : `f${String(i).padStart(5, '0')}.jpg`), type: 'jpeg', quality: 92 });
}
await b.close(); console.log('кадров:', times.length);
