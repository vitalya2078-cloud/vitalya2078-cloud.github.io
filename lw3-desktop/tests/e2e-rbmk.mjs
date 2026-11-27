// Тренажёр «Пульт РБМК-1000»: раздел, свободная смена, карьера (смена 1 открывает смену 2), «Ночь 26 апреля» — оба исхода.
// Запуск: сервер на 127.0.0.1:4180 (lw3-desktop/dist); node lw3-desktop/tests/e2e-rbmk.mjs   (SHOTS=папка — снимки)
import { chromium } from 'playwright';
const BASE = process.env.BASE || 'http://127.0.0.1:4180/', SHOTS = process.env.SHOTS;
const b = await chromium.launch(process.env.FZ_CHROME ? { executablePath: process.env.FZ_CHROME } : {}); const page = await b.newPage({ viewport: { width: 1366, height: 768 } });
const errors = []; page.on('pageerror', e => errors.push(e.message)); page.on('console', m => m.type() === 'error' && errors.push(m.text()));
const must = (c, m) => { if (!c) { console.error('FAIL:', m); process.exit(1); } };
const W = ms => page.waitForTimeout(ms);
const shot = async n => { if (SHOTS) await page.screenshot({ path: `${SHOTS}/rbmk-${n}.png` }); };
const G = () => page.evaluate(() => { const g = window.__rb.G; if (!g) return null; const S = g.S; return { P: S.P, ozr: window.__rb.RB.ozr(S), az: S.az, broken: S.broken && S.broken.kind, done: g.done, step: g.hist && g.hist.step, t: g.t }; });
const tick = (sec, step = 1) => page.evaluate(([s, d]) => { for (let i = 0; i < s / d; i++) window.__rb.tick(d); }, [sec, step]);
const rec = () => page.evaluate(() => store.get(workKey(PROFILE.id) + '-rbmk', null));

await page.goto(BASE, { waitUntil: 'networkidle' });
await page.fill('#np-fio', 'Проверкин Пётр Петрович'); await page.fill('#np-group', '103'); await page.fill('#np-pw', '1234'); await page.fill('#np-pw2', '1234');
await page.check('#np-eula'); await page.click('[data-d="register"]'); await W(400); await page.keyboard.press('Escape'); await W(400);

// раздел
await page.click('[data-d="page"][data-v="rbmk"]'); await W(300);
must(await page.locator('.rb-mode').count() === 3, 'нет режимов тренажёра');
must(await page.locator('.rb-shc').count() === 7 && await page.locator('.rb-shc:disabled').count() === 6, 'карьера: должна быть открыта только смена 1');
await page.click('.rb-mode.help'); await W(200); must(await page.locator('#modal .rb-help > div').count() >= 6, 'нет справки о РБМК'); await page.keyboard.press('Escape'); await W(150);
await shot('land');

// 1. свободная смена: пульт, ход времени, АЗ-5 под крышкой
await page.click('[data-rb="start"][data-m="free"]'); await W(300);
must(await page.locator('#rb-ov .rb-dlg').count() === 1, 'нет вводного окна смены');
await page.keyboard.press('Enter'); await W(300);
for (const id of ['rb-core', 'rb-chart', 'rb-axial', 'rb-press']) must(await page.locator('#' + id).count() === 1, 'на пульте нет ' + id);
must(await page.locator('.rb-pump').count() === 8, 'на пульте не 8 ГЦН');
await tick(90); await W(300);
let g = await G(); must(!g.az && g.P > 0.85 && g.P < 1.1 && !g.broken, 'свободная смена: реактор не держит мощность с АР ' + JSON.stringify(g));
must((await page.textContent('#rb-pt')).replace(/\s/g, '').length >= 3, 'не показывается мощность');
// клавиши: W выводит стержни РР
await page.evaluate(() => { const G = window.__rb.G; G.stuck = 0; G.nextFault = 999; });
const rr0 = await page.evaluate(() => window.__rb.G.S.rods.RR); await page.keyboard.down('w'); await W(1200); await page.keyboard.up('w'); const rr1 = await page.evaluate(() => window.__rb.G.S.rods.RR);
must(rr1 < rr0, 'клавиша W не выводит стержни РР');
await shot('free');
await page.dispatchEvent('[data-rb="az"]', 'click'); await W(150); must(!(await G()).az, 'АЗ-5 нажалась без открытой крышки');
await page.click('[data-rb="cover"]'); await W(400); await page.click('[data-rb="az"]'); await W(100);
must((await G()).az, 'АЗ-5 не сработала'); await tick(25, 0.25); await W(400);
must(await page.locator('#rb-ov .rb-dlg h2').textContent() === 'Реактор заглушен защитой', 'нет итога после АЗ-5 в свободной смене');
must(((await rec()) || {}).free > 60, 'не сохранён рекорд свободной смены');
await page.click('#rb-ov [data-rb="exit"]'); await W(300);

// 2. карьера: смена 1 (АР заблокирован) — держим мощность, смена сдаётся, открывается смена 2
await page.click('[data-rb="start"][data-m="career"][data-k="0"]'); await W(300); await page.keyboard.press('Enter'); await W(200);
must(await page.locator('#rb-arbtn').isDisabled(), 'в смене 1 АР должен быть заблокирован');
await tick(160); await W(300); g = await G();
must(g.done === 'done', 'смена 1 не закончилась ' + JSON.stringify(g));
must(/Смена сдана/.test(await page.textContent('#rb-ov h2')), 'нет итога смены 1');
await page.click('#rb-ov [data-rb="exit"]'); await W(300);
must(await page.locator('.rb-shc.done').count() === 1 && !(await page.locator('.rb-shc[data-k="1"]').isDisabled()), 'после смены 1 не открылась смена 2');

// 3. «Ночь 26 апреля»: правильное решение — заглушить реактор
await page.click('[data-rb="start"][data-m="history"]'); await W(300); await page.keyboard.press('Enter'); await W(200);
await page.evaluate(() => { window.__rb.G.S.ar.set = 0.25; }); for (let i = 0; i < 20 && (await G()).step === 'reduce'; i++) await tick(10);
must((await G()).step === 'drop' && await page.locator('[data-rb="hchoice"]').count() === 2, 'нет выбора после провала мощности');
await shot('choice');
await page.click('[data-rb="hchoice"][data-v="stop"]'); await W(1800); await tick(5); await W(300);
g = await G(); must(g.done === 'safe' && !g.broken, 'решение «заглушить» не привело к безопасному исходу ' + JSON.stringify(g));
must(/регламенту/.test(await page.textContent('#rb-ov')), 'нет объяснения правильного решения');
await page.click('#rb-ov [data-rb="again"]'); await W(300);

// 4. «Ночь 26 апреля» как в 1986 г.: малый ОЗР, 8 ГЦН, защиты заблокированы, выбег, АЗ-5 → разгон
await page.keyboard.press('Enter'); await W(200);
await page.evaluate(() => { window.__rb.G.S.ar.set = 0.25; }); for (let i = 0; i < 20 && (await G()).step === 'reduce'; i++) await tick(10);
await page.click('[data-rb="hchoice"][data-v="raise"]'); await W(200);
// оператор поднимает мощность до ~200 МВт, выводя стержни (по показаниям реактивности)
const hold = (target, sec) => page.evaluate(([t, sec]) => { const G = window.__rb.G, S = G.S; for (let i = 0; i < sec * 40; i++) { if (G.done) break;
  const rt = Math.max(-0.15, Math.min(0.12, Math.log(t / Math.max(1e-6, S.P)) * 0.08)), v = Math.max(-0.006, Math.min(0.006, (S.rho - rt) * 0.05)) * 0.025;
  S.rods.RR = Math.max(0, Math.min(1, S.rods.RR + v)); if (S.rods.RR <= 0 && v < 0) { S.rods.USP = Math.max(0, S.rods.USP + v); if (S.rods.USP <= 0) S.rods.AR = Math.max(0, S.rods.AR + v); } window.__rb.tick(0.025); } }, [target, sec]);
for (let i = 0; i < 12 && (await G()).step === 'raise'; i++) await hold(0.065, 15);
must((await G()).step === 'pumps', 'не удалось поднять мощность до 200 МВт ' + JSON.stringify(await G()));
await page.locator('#rb-pump3').scrollIntoViewIfNeeded(); await page.click('#rb-pump3'); await page.click('#rb-pump7'); await W(100); await hold(0.065, 2);
must((await G()).step === 'prot', 'после включения 8 ГЦН нет шага защит');
for (const k of ['tg', 'level', 'press']) await page.click('#rb-prot-' + k);
must(await page.locator('#rb-htest').isDisabled() === await page.evaluate(() => rbHistEarly()), 'кнопка испытания не следует времени 01:23');
for (let i = 0; i < 30 && await page.locator('#rb-htest').isDisabled(); i++) { await hold(0.065, 10); await W(50); }
g = await G(); must(g.ozr < 15, 'к 01:23 ОЗР не снизился ниже 15: ' + g.ozr.toFixed(1));
await page.click('#rb-htest'); await W(100); for (let i = 0; i < 37 && (await G()).step === 'test'; i++) await tick(1, 0.05);
must((await G()).step === 'az', 'испытание не закончилось');
await shot('test');
await page.click('[data-rb="cover"]'); await W(400); await page.click('[data-rb="az"]'); await tick(8, 0.02); await W(500);
g = await G(); must(g.broken === 'reactor' && g.done === 'crash', 'АЗ-5 при малом ОЗР не привела к разгону: ' + JSON.stringify(g));
must(await page.locator('#rb-ov .rb-why li').count() >= 2 && /концевой эффект/.test(await page.textContent('#rb-ov .rb-why')), 'нет разбора причин аварии');
await shot('crash');
const R = await rec(); must(R.history.played === 2 && R.history.safe === 1 && R.history.crash === 1, 'статистика «Ночи 26 апреля» не сохранена ' + JSON.stringify(R.history));
await page.click('#rb-ov [data-rb="exit"]'); await W(300);
must(await page.evaluate(() => SCREEN === 'labs' && PAGE === 'rbmk'), 'выход из тренажёра не вернул в раздел');
must(errors.length === 0, 'ошибки на странице: ' + errors.join(' | '));
console.log('PASS: тренажёр РБМК — раздел, свободная смена (клавиши, АЗ-5 под крышкой), смена 1 → смена 2, «Ночь 26 апреля»: по регламенту — без аварии, как в 1986 г. — разгон и разбор.');
await b.close();
