import { chromium } from 'playwright';
import assert from 'node:assert/strict';

const browser = await chromium.launch({ headless: true });
const errors = [];
try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  await page.goto('http://127.0.0.1:4173/', { waitUntil: 'networkidle' });
  await page.waitForSelector('#main');

  // Основная навигация.
  for (const [hash, title] of [['#book', 'Учебник'], ['#train', 'Тренировка'], ['#lab', 'Лаборатория'], ['#profile', 'Профиль'], ['', 'Физика']]) {
    await page.locator('#tabs a[href="' + (hash || '#') + '"]').click();
    await page.waitForFunction(expected => document.querySelector('#ttl')?.textContent.includes(expected), title);
  }

  // Урок: переходы между всеми четырьмя этапами и прохождение проверки.
  await page.goto('http://127.0.0.1:4173/#l1-1', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('[data-act="step"][data-v="cards"]');
  await page.locator('[data-act="step"][data-v="cards"]').click();
  await page.waitForSelector('[data-act="step"][data-v="sim"]');
  await page.locator('[data-act="step"][data-v="sim"]').click();
  await page.waitForSelector('[data-act="step"][data-v="quiz"]');
  await page.locator('[data-act="step"][data-v="quiz"]').click();
  await page.waitForSelector('[data-act="lessonQuiz"]');
  await page.locator('[data-act="lessonQuiz"]').click();
  await page.waitForSelector('.opt');
  for (let i = 0; i < 12 && await page.locator('.opt').count(); i++) {
    await page.locator('.opt').first().click();
    const next = page.locator('[data-act="qNext"]');
    if (await next.count()) await next.click();
    else break;
  }
  await page.waitForSelector('[data-act="qDone"], [data-act="qAgain"]', { timeout: 5000 });
  if (await page.locator('[data-act="qDone"]').count()) await page.locator('[data-act="qDone"]').click();

  // Лаборатория: выбор опыта, изменение параметров, запуск, пауза и сброс.
  await page.goto('http://127.0.0.1:4173/#lab-ch-1', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.lab-topic-card');
  await page.locator('.lab-topic-card').first().click();
  await page.waitForSelector('.lab-experiment-card');
  await page.locator('.lab-experiment-card').first().click();
  await page.waitForSelector('[data-act="labAdjust"]');
  await page.locator('[data-act="labAdjust"][data-delta="1"]').first().click();
  await page.locator('[data-act="labAdjust"][data-delta="-1"]').first().click();
  await page.locator('[data-act="labStart"]').click();
  await page.locator('[data-act="labPause"]').click();
  await page.locator('[data-act="labReset"]').click();

  // Полный успешный сценарий «Инженера катастроф».
  await page.goto('http://127.0.0.1:4173/#lab-games', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.bridge-lobby-cta');
  await page.locator('.bridge-lobby-cta').click();
  await page.waitForSelector('.b3-hotspot');
  for (const id of ['joint', 'deck', 'pier']) {
    await page.locator('.b3-hotspot[data-v="' + id + '"]').click();
  }
  await page.waitForSelector('.b3-choice[data-v="brace"]');
  await page.locator('.b3-choice[data-v="brace"]').click();
  await page.waitForSelector('.b3-repair-card[data-v="brace"]');
  await page.locator('.b3-repair-card[data-v="brace"]').click();
  for (const step of ['0', '1', '2']) {
    await page.locator('.b3-work-step[data-v="' + step + '"]').click();
  }
  await page.waitForSelector('.b3-run');
  await page.locator('.b3-load[data-v="12"]').click();
  await page.locator('.b3-run').click();
  await page.waitForSelector('.b3-result.passed', { timeout: 15000 });
  await page.locator('[data-act="bridgeReset"]').click();
  await page.waitForSelector('.b3-hotspot');

  assert.deepEqual(errors, [], 'В браузере не должно быть JavaScript ошибок');
  console.log('PASS: navigation, lesson quiz, lab controls, bridge mission, reset; no browser errors.');
} finally {
  await browser.close();
}
