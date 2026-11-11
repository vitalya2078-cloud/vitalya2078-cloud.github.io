import { chromium } from 'playwright';
import assert from 'node:assert/strict';

const browser = await chromium.launch({ headless: true });
const errors = [];
try {
  const html = await (await fetch('http://127.0.0.1:4173/')).text();
  const scripts = [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)];
  for (let i = 0; i < scripts.length; i++) {
    try { new Function(scripts[i][1]); }
    catch (error) { throw new Error('Inline script #' + (i + 1) + ' syntax error: ' + error.message + '; excerpt=' + scripts[i][1].slice(0, 500)); }
  }
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
  page.on('pageerror', error => errors.push(error.stack || error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  await page.goto('http://127.0.0.1:4173/', { waitUntil: 'networkidle' });
  await page.waitForSelector('#main');

  // Основная навигация.
  for (const [hash, view, title] of [
    ['#book', 'book', 'Учебник'],
    ['#train', 'train', 'Тренировка'],
    ['#lab', 'lab', 'Лаборатория'],
    ['#profile', 'profile', 'Профиль'],
    ['', 'home', 'Физика']
  ]) {
    // Каждый раздел открываем отдельной навигацией браузера: проверяем инициализацию
    // маршрута на прямой ссылке, а не полагаемся на состояние предыдущего экрана.
    await page.goto('http://127.0.0.1:4173/' + hash, { waitUntil: 'networkidle' });
    try {
      await page.waitForFunction(expected => document.body.dataset.view === expected, view, { timeout: 10000 });
    } catch (error) {
      throw new Error('Не запустился маршрут ' + hash + '; URL=' + page.url() +
        '; view=' + await page.locator('body').getAttribute('data-view') +
        '; JS errors=' + errors.join(' | ') + '; cause=' + error.message);
    }
    await page.waitForFunction(() => document.querySelector('#ttl')?.textContent.trim().length > 0);
    assert.ok((await page.locator('#ttl').innerText()).includes(title), 'Заголовок раздела не обновился: ' + title);
  }

  // Урок: переходы между всеми четырьмя этапами и прохождение проверки.
  await page.goto('http://127.0.0.1:4173/#l1-1', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('[data-act="step"][data-v="cards"]');
  await page.locator('.steps [data-act="step"][data-v="cards"]').click();
  await page.waitForSelector('[data-act="step"][data-v="sim"]');
  await page.locator('.steps [data-act="step"][data-v="sim"]').click();
  await page.waitForSelector('[data-act="step"][data-v="quiz"]');
  await page.locator('.steps [data-act="step"][data-v="quiz"]').click();
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

  // Свободная лаборатория: категории, добавление, перетаскивание, вращение, физические параметры и запуск.
  await page.goto('http://127.0.0.1:4173/#sandbox', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#sb-canvas');
  await page.locator('[data-sb="drawer"]').click();
  await page.locator('.sb-cat, #sb-cats button').filter({ hasText: 'Механика' }).first().click();
  await page.locator('.sb-item').filter({ hasText: 'Брусок' }).click();
  const placeBounds = await page.locator('#sb-canvas').boundingBox();
  await page.mouse.click(placeBounds.x + placeBounds.width * 0.52, placeBounds.y + placeBounds.height * 0.52);
  await page.locator('[data-sb="properties"]').click();
  await page.waitForSelector('.sb-picked');
  await page.locator('[data-sb="mode"][data-v="orbit"]').click();
  const scene = page.locator('#sb-canvas');
  const bounds = await scene.boundingBox();
  await page.mouse.move(bounds.x + bounds.width * 0.88, bounds.y + bounds.height * 0.15);
  await page.mouse.down();
  await page.mouse.move(bounds.x + bounds.width * 0.75, bounds.y + bounds.height * 0.22, { steps: 5 });
  await page.mouse.up();
  await page.locator('[data-sb="mode"][data-v="rotate"]').click();
  await page.mouse.move(bounds.x + bounds.width * 0.5, bounds.y + bounds.height * 0.55);
  await page.mouse.down();
  await page.mouse.move(bounds.x + bounds.width * 0.62, bounds.y + bounds.height * 0.42, { steps: 8 });
  await page.mouse.up();
  await page.locator('[data-sbr="g"]').evaluate(el => { el.value = '4.9'; el.dispatchEvent(new Event('input', { bubbles: true })); });
  await page.locator('[data-sb="run"]').first().click();
  await page.waitForTimeout(180);
  await page.locator('[data-sb="run"]').first().click();
  await page.locator('[data-sb="duplicate"]').click();
  await page.locator('[data-sb="delete"]').click();
  for (const [label, item] of [['Силы', 'Балка'], ['Жидкости', 'Резервуар'], ['Колебания', 'Волна'], ['Термодинамика', 'Нагреватель'], ['Электричество', 'Батарея'], ['Оптика', 'Зеркало']]) {
    await page.locator('#sb-cats button').filter({ hasText: label }).click();
    await page.locator('.sb-item').filter({ hasText: item }).click();
  }
  await page.locator('[data-sb="cat"][data-v="electric"]').click().catch(async () => {
    await page.locator('[data-sb="drawer"]').click();
    await page.locator('#sb-cats button').filter({ hasText: 'Электричество' }).click();
  });
  await page.locator('.sb-item').filter({ hasText: 'Батарея' }).click();
  await page.locator('[data-sb="clear"]').click();


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
