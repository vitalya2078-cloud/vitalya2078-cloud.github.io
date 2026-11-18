// ЛР № 3 на сайте: полное прохождение и отчёт. Запуск: сервер на 127.0.0.1:4173 (папка fizika2), затем node fizika2/tests/lw3-site.mjs
import { chromium } from 'playwright';
import { runLw3 } from './lw3-flow.mjs';
const BASE = process.env.BASE || 'http://127.0.0.1:4173/';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const errors = [];
page.on('pageerror', e => errors.push(e.message));
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
page.on('dialog', d => d.accept());
try {
  await page.goto(BASE + '#lw-3', { waitUntil: 'networkidle' });
  await runLw3(page, { log: t => console.log('  ' + t) });
  await page.goto(BASE + '#lw-3-report', { waitUntil: 'domcontentloaded' });
  await page.locator('.lwr .lwp').first().waitFor();
  const text = await page.locator('.lwr').innerText();
  for (const s of ['ОТЧЕТ', 'Определение показателя адиабаты', '⟨γ⟩ =', 'ВЫВОДЫ']) if (!text.includes(s)) throw new Error('в отчёте нет: ' + s);
  if (await page.locator('.lwr .lwp').count() !== 4) throw new Error('в отчёте не 4 листа');
  if (errors.length) throw new Error('ошибки в браузере: ' + errors.join(' | '));
  console.log('PASS: ЛР № 3 на сайте — допуск, подготовка, 3 опыта, обработка, защита, отчёт.');
} finally { await browser.close(); }
