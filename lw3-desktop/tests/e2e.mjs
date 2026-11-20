// Программа «ЛР № 3» в браузере (тот же интерфейс, что в окне Windows): профиль студента, полное прохождение
// работы общим сценарием сайта, клавиши, файл результата, режим преподавателя, продолжение из файла.
// Запуск: python3 lw3-desktop/build.py; сервер на 127.0.0.1:4180 (папка lw3-desktop/dist); node lw3-desktop/tests/e2e.mjs
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { runLw3 } from '../../fizika2/tests/lw3-flow.mjs';

const BASE = process.env.BASE || 'http://127.0.0.1:4180/';
const SHOTS = process.env.SHOTS || '';
const browser = await chromium.launch();
const errors = [];
const watch = p => { p.on('pageerror', e => errors.push(e.message)); p.on('console', m => { if (m.type() === 'error') errors.push(m.text()); }); p.on('dialog', d => d.accept()); };
const shot = async (p, name) => { if (SHOTS) await p.screenshot({ path: path.join(SHOTS, `lw3d-${name}.png`) }); };
const must = (cond, msg) => { if (!cond) throw new Error(msg); };
try {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, acceptDownloads: true });
  const page = await ctx.newPage(); watch(page);
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await shot(page, '0-home');
  // пустое ФИО не принимается
  await page.click('[data-d="register"]'); must(await page.evaluate(() => SCREEN === 'home'), 'учётная запись создана без ФИО');
  await page.fill('#np-fio', 'Сидорова Анна Викторовна'); await page.fill('#np-group', '11 Б'); await page.fill('#np-pw', '1234'); await page.fill('#np-pw2', '4321'); await page.click('[data-d="register"]');
  must(await page.evaluate(() => SCREEN === 'home'), 'принят пароль, не совпавший с повтором');
  await page.fill('#np-pw2', '1234'); await page.press('#np-pw2', 'Enter');
  must(await page.evaluate(() => SCREEN === 'labs' && PROFILE.fio === 'Сидорова Анна Викторовна'), 'после входа нет выбора работы');
  // знакомство: 4 слайда, листается Enter, закрывается на последнем
  must(await page.locator('#modal [data-intro]').isVisible(), 'нет знакомства после входа');
  await shot(page, 'intro-1');
  await page.keyboard.press('Enter'); await page.keyboard.press('Enter');   // слайд «Клавиши»: список не вылезает из своей области
  must(await page.evaluate(() => document.querySelector('.keys').getBoundingClientRect().bottom <= document.querySelector('.intro-art').getBoundingClientRect().bottom + 1), 'клавиши вылезают за область слайда');
  for (let i = 0; i < 2; i++) await page.keyboard.press('Enter');
  must(await page.locator('#modal').isHidden(), 'знакомство не закрылось');
  await page.click('[data-d="page"][data-v="labs"]'); await page.click('[data-d="lab"][data-v="3"]');
  must(await page.evaluate(() => SCREEN === 'work' && LAB === 3 && L3S.fio === 'Сидорова Анна Викторовна' && L3S.group === '11 Б'), 'ЛР 3 не открылась');
  await page.keyboard.press('F1'); must(await page.locator('#modal [data-intro]').isVisible(), 'F1 не открывает знакомство');
  await page.click('[data-d="intro-skip"]'); must(await page.locator('#modal').isHidden(), '«Пропустить» не закрывает');
  // по умолчанию — светлая тема; тёмная переключается и запоминается
  must(await page.evaluate(() => document.documentElement.dataset.theme === 'light' && L3_THEME === 'light'), 'по умолчанию не светлая тема');
  await shot(page, 'light');
  await page.click('.tb [data-d="theme"]'); must(await page.evaluate(() => document.documentElement.dataset.theme === 'dark' && localStorage.getItem('lw3d-theme') === 'dark' && L3_THEME === 'dark'), 'тёмная тема не включилась');
  await page.click('.tb [data-d="theme"]');

  const o = await runLw3(page, {
    log: t => console.log('  ' + t),
    reveal: async (kind, i) => { await page.waitForTimeout(300); await page.evaluate(q => { AQ = q; render(); }, kind === 'admit' ? i : 8); },
    beforeStep: async st => {
      await page.waitForTimeout(250); await shot(page, st);
      if (st === 'prep') {             // клавиши P, K, O переключают то же, что кнопки; вернуть как было
        for (const k of ['p', 'k', 'o']) await page.keyboard.press(k);
        must(await page.evaluate(() => L3S.power && L3S.kOpen && !L3S.k0Open), 'клавиши P/K/O не сработали');
        for (const k of ['p', 'k', 'o']) await page.keyboard.press(k);
        must(await page.evaluate(() => !L3S.power && !L3S.kOpen && L3S.k0Open), 'клавиши P/K/O не вернули краны');
      }
      if (st === 'exp') {              // компрессор пробелом: давление растёт, пока клавиша нажата
        await page.waitForFunction(() => L3V.phase === 'pump');
        await page.keyboard.down('Space'); await page.waitForTimeout(700); await page.keyboard.up('Space');
        const p1 = await page.evaluate(() => L3V.p); must(p1 > 10, 'пробел не включает компрессор: ' + p1);
        await page.waitForTimeout(300); must(await page.evaluate(() => !L3V.pump), 'компрессор не выключился');
        must(await page.locator('#d-chart').count() === 1 && await page.locator('.tb-steps button').count() === 6, 'нет графика или шагов');
        // ход работы: 13 пунктов методички, на накачке подсвечен п. 4, открывается и закрывается клавишей H
        await page.keyboard.press('h'); await page.waitForTimeout(300);
        must(await page.locator('#hod.open li').count() === 13, 'ход работы не открылся');
        must((await page.locator('#hod li.cur i').innerText()) === '4', 'в ходе работы не подсвечен п. 4');
        await shot(page, 'hod'); await page.keyboard.press('h'); await page.waitForTimeout(300);
        must(!(await page.locator('#hod').getAttribute('class')).includes('open'), 'ход работы не закрылся');
      }
    }
  });
  // перед отчётом — сводка «Что рассказать на защите» (один раз сама, потом кнопкой)
  await page.locator('#modal .sum').waitFor(); await shot(page, 'summary');
  must(await page.locator('#modal .sum-t tr').count() === 4 && (await page.locator('#modal .sum').innerText()).includes('1,40'), 'в сводке нет измерений или теории');
  await page.keyboard.press('Escape'); must(await page.locator('#modal').isHidden(), 'сводка не закрылась');
  await page.click('[data-d="summary"]'); must(await page.locator('#modal .sum').isVisible(), 'кнопка сводки не работает'); await page.keyboard.press('Escape');
  await page.waitForTimeout(300); await shot(page, 'report-step');
  must(await page.locator('#d-paper .lwp').count() === 4, 'в отчёте не 4 листа');
  must(await page.locator('#printroot .lwp').count() === 4, 'отчёт не подготовлен к печати');
  await page.fill('[data-k3="fio"]', 'Сидорова А. В.'); await page.waitForTimeout(400);
  must((await page.locator('#d-paper').innerText()).includes('Сидорова А. В.'), 'шапка отчёта не обновилась');
  // масштаб: Ctrl + и Ctrl 0
  await page.keyboard.press('Control+Equal'); must(await page.evaluate(() => document.documentElement.style.zoom === '1.1'), 'Ctrl + не увеличивает');
  await page.keyboard.press('Control+Digit0'); must(await page.evaluate(() => document.documentElement.style.zoom === ''), 'Ctrl 0 не сбрасывает масштаб');
  // подсказка в обработке: сумма вместо среднего → «разделить на N»
  await page.click('[data-l3="go"][data-v="3"]');
  const [sum, gmOk] = await page.evaluate(() => { const o = l3Calc(); return [o.a.reduce((a, x) => a + x.g, 0).toFixed(3).replace('.', ','), o.gm.toFixed(3).replace('.', ',')]; });
  await page.locator('[data-k3="p_gm"]').fill(sum); await page.click('[data-l3="pcheck"]'); await page.waitForTimeout(200);
  must((await page.locator('.hints').innerText()).includes('разделить на N'), 'нет подсказки в обработке');
  await shot(page, 'hint');
  await page.locator('[data-k3="p_gm"]').fill(gmOk); await page.click('[data-l3="pcheck"]'); await page.waitForTimeout(200);
  must(await page.locator('.hints').count() === 0, 'подсказка не исчезла после исправления');
  await page.click('[data-l3="go"][data-v="5"]');

  // файл результата
  const [dl] = await Promise.all([page.waitForEvent('download'), page.keyboard.press('Control+s')]);
  const file = path.join(SHOTS || '/tmp', 'lw3-test.lw3'); await dl.saveAs(file);
  const saved = JSON.parse(fs.readFileSync(file, 'utf8'));
  must(saved.format === 'lw3-result' && saved.state.done && saved.sig && Math.abs(saved.summary.gm - o.gm) < 1e-9, 'файл результата неполный');
  const forged = JSON.parse(JSON.stringify(saved)); forged.state.runs[0].h2 -= 5; forged.summary.gm = 1.4;
  const fake = path.join(SHOTS || '/tmp', 'lw3-fake.lw3'); fs.writeFileSync(fake, JSON.stringify(forged));

  // режим преподавателя: подлинный и подделанный файлы
  await page.click('[data-d="labs"]'); await page.click('[data-d="home"]'); await page.click('[data-d="teacher"]');
  // пароль преподавателя: задать, выйти, войти с неверным и верным
  await page.fill('#tp1', '4321'); await page.fill('#tp2', '1234'); await page.click('[data-t="setpass"]');
  must(await page.evaluate(() => SCREEN === 'lock'), 'принят пароль, не совпавший с повтором');
  await page.fill('#tp1', '4321'); await page.fill('#tp2', '4321'); await page.press('#tp2', 'Enter');
  must(await page.evaluate(() => SCREEN === 'teacher'), 'пароль не сохранился');
  await page.click('[data-t="back"]'); await page.click('[data-d="teacher"]');
  await page.fill('#tp', '0000'); await page.click('[data-t="unlock"]'); must(await page.evaluate(() => SCREEN === 'lock'), 'вход с неверным паролем');
  await page.fill('#tp', '4321'); await page.press('#tp', 'Enter'); must(await page.evaluate(() => SCREEN === 'teacher'), 'вход с верным паролем не сработал');
  await page.setInputFiles('#file-in', [file]);
  await page.waitForFunction(() => TROWS.length === 1);
  const t1 = await page.locator('table.tt').innerText();
  must(t1.includes('Сидорова А. В.') && t1.includes('подлинный') && t1.includes('защищена'), 'подлинный файл не принят');
  const forged2 = JSON.parse(JSON.stringify(saved)); forged2.state.fio = 'Другой Студент'; forged2.state.runs[0].h2 -= 5; forged2.summary.gm = 1.4;
  fs.writeFileSync(fake, JSON.stringify(forged2));
  await page.setInputFiles('#file-in', [fake]);
  await page.waitForFunction(() => TROWS.length === 2);
  must((await page.locator('table.tt').innerText()).includes('изменён'), 'подделка не распознана');
  must(await page.locator('table.tt .dup').count() === 2, 'не отмечены совпадающие измерения у двух студентов');
  await shot(page, 'teacher');
  await page.click('tr.r >> nth=0'); await page.locator('#modal .lwp').first().waitFor(); await shot(page, 'teacher-report');
  must(await page.locator('#modal .tdet .tqa li').count() === 16, 'нет подробностей по вопросам у преподавателя');
  await page.keyboard.press('Escape');
  // демо-прохождение: работа выполнена моделью, сводка и 4 листа отчёта; в список группы не попадает
  await page.click('[data-t="demo"]'); await page.locator('#modal .sum').waitFor();
  must(await page.locator('#modal .lwp').count() === 4 && await page.locator('#modal .sum-t tr').count() === 4 && (await page.locator('#modal .sum').innerText()).includes('Демо'), 'демо-прохождение неполное');
  must(await page.evaluate(() => TROWS.length === 2 && SCREEN === 'teacher'), 'демо попало в список группы');
  await shot(page, 'teacher-demo'); await page.keyboard.press('Escape');
  const [csv] = await Promise.all([page.waitForEvent('download'), page.click('[data-t="csv"]')]);
  const csvText = fs.readFileSync(await csv.path(), 'utf8');
  must(csvText.startsWith('﻿ФИО;') && csvText.split('\r\n').length === 3, 'CSV неверный');

  // продолжение из файла на «другом компьютере»
  const ctx2 = await browser.newContext({ viewport: { width: 1366, height: 768 } });
  const p2 = await ctx2.newPage(); watch(p2);
  await p2.goto(BASE, { waitUntil: 'networkidle' });
  await p2.setInputFiles('#file-in', [fake]);
  await p2.waitForTimeout(300); must(await p2.evaluate(() => SCREEN === 'home'), 'подделанный файл открылся для продолжения');
  await p2.setInputFiles('#file-in', [file]);
  await p2.waitForFunction(() => SCREEN === 'work');
  must(await p2.evaluate(() => L3S.done && L3.steps[L3S.step][0] === 'report'), 'работа из файла не восстановилась');
  await shot(p2, 'continue-1366');
  await ctx2.close();

  if (errors.length) throw new Error('ошибки в браузере: ' + errors.join(' | '));
  console.log('PASS: программа — вход, знакомство, тема, клавиши, полное прохождение, отчёт, файл работы, пароль и режим преподавателя, продолжение из файла.');
} finally { await browser.close(); }
