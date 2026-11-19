// Как снять заново: python3 lw3-desktop/build.py; cp lw3-desktop/video/video.html lw3-desktop/dist/;
// сервер на 4180 (папка lw3-desktop/dist); node lw3-desktop/video/film.mjs <папка>; затем кадры → MP4 по stamps.json (ffmpeg concat).
// Съёмка ролика о программе: «режиссёр» video.html + программа во фрейме, запись CDP screencast в кадры.
import { chromium } from 'playwright';
import fs from 'node:fs';
const OUT = process.argv[2]; fs.mkdirSync(OUT + '/frames', { recursive: true });
const B = 'http://127.0.0.1:4180/';
const b = await chromium.launch({ args: ['--force-device-scale-factor=1'] });
const page = await b.newPage({ viewport: { width: 1920, height: 1080 } });
await page.goto(B + 'video.html', { waitUntil: 'networkidle' });
const app = page.frame({ name: 'app' }); await app.waitForSelector('#np-fio');
const W = ms => page.waitForTimeout(ms);
const cap = (t, s = '') => page.evaluate(([a, c]) => window.cap(a, c), [t, s]);
const card = html => page.evaluate(h => window.card(h), html);
const E = (fn, arg) => app.evaluate(fn, arg);
async function aim(sel, dx = .5, dy = .5) { await app.locator(sel).first().scrollIntoViewIfNeeded(); await W(150); const bx = await app.locator(sel).first().boundingBox(); const x = bx.x + bx.width * dx, y = bx.y + bx.height * dy;
  await page.evaluate(([x, y]) => window.cursor(x, y), [x, y]); await W(600); return [x, y]; }
async function click(sel, pause = 450) { const [x, y] = await aim(sel); await page.evaluate(([x, y]) => window.ripple(x, y), [x, y]); await page.mouse.click(x, y); await W(pause); }
async function type(sel, text) { await click(sel, 150); await app.locator(sel).first().pressSequentially(text, { delay: 70 }); await W(300); }

// запись
const cdp = await page.context().newCDPSession(page); let n = 0; const stamps = [];
cdp.on('Page.screencastFrame', async f => { const i = n++; fs.writeFileSync(`${OUT}/frames/${String(i).padStart(6, '0')}.jpg`, Buffer.from(f.data, 'base64')); stamps.push(f.metadata.timestamp); try { await cdp.send('Page.screencastFrameAck', { sessionId: f.sessionId }); } catch (e) {} });

/* ---------- 0. заставка ---------- */
await card(`<div class="logo">γ</div><div class="k">Лабораторная работа № 3</div><div class="h">Показатель адиабаты</div><div class="s">Метод Клемана — Дезорма. Теперь — на компьютере</div>`);
await W(700);
await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 92, maxWidth: 1920, maxHeight: 1080, everyNthFrame: 1 });
await W(4200);
await card(''); await W(700);

/* ---------- 1. вход ---------- */
await cap('Вход — по фамилии и классу', 'работа сохраняется сама, можно продолжить в любой момент');
await type('#np-fio', 'Иванова Мария'); await type('#np-group', '11 А'); await click('[data-d="new"]', 900);
/* ---------- 2. знакомство ---------- */
await cap('Короткое знакомство', 'шаги работы, установка, клавиши, как сдать работу');
await W(1300); await click('[data-d="intro-next"]', 1500); await click('[data-d="intro-next"]', 1500); await click('[data-d="intro-skip"]', 700);
/* ---------- 3. допуск ---------- */
await cap('Допуск: вопросы по одному', 'теория и схема установки — всегда рядом');
const A = await E(() => L3_ADMIT.map(([q, a]) => a));
for (let i = 0; i < 3; i++) { await E(q => { AQ = q; render(); }, i); await W(250); await click(`[data-l3="admit"][data-q="${i}"][data-v="${A[i].replace(/"/g, '\\"')}"]`, 650); }
await E(a => { a.forEach((v, i) => { L3S.admit[i] = v; }); l3Save(); AQ = 8; render(); }, A); await W(500);
await click('[data-l3="admitCheck"]', 1300);
await click('[data-l3="next"]', 700);
/* ---------- 4. подготовка ---------- */
await cap('Подготовка установки', 'питание секундомера, кран K открыть, кран K₀ закрыть');
await click('[data-l3="power"]', 700); await click('[data-l3="kv"]', 800); await click('[data-l3="k0"]', 1000);
await click('[data-l3="next"]', 700);
/* ---------- 5. опыт ---------- */
await cap('Накачиваем воздух компрессором', 'газ сжимается и нагревается — молекулы становятся «горячими»');
{ const [x, y] = await aim('#l3-pump'); await page.mouse.move(x, y); await page.mouse.down(); await app.waitForFunction(() => L3V.p >= 214, null, { timeout: 30000 }); await page.mouse.up(); }
await W(400); await click('[data-l3="closeK"]', 600);
await cap('Минута ожидания', 'газ остывает до комнатной температуры — на графике видно, как падает давление');
await click('[data-l3="waitMin"]'); await app.waitForFunction(() => L3V.phase === 'read1', null, { timeout: 30000 }); await W(400);
await cap('Отсчёт по лупам', 'h₁ — разность уровней в коленах манометра');
await W(1200); const h1 = await E(() => { const [l, r] = l3Levels(); return Math.round(r - l); });
await type('[data-k3="ch"]', String(h1)); await click('[data-l3="rec1"]', 700);
await cap('Выпуск через кран K₀', 'адиабатное расширение: газ охлаждается — молекулы «синеют»');
await click('[data-l3="k0open"]', 150); await app.waitForFunction(() => L3V.hiss < .05 && Math.abs(L3V.p) < 2, null, { timeout: 15000 }); await W(500);
await click('[data-l3="k0close"]', 900);
await cap('Ход работы — из методички', 'клавиша H: все 13 пунктов, текущий подсвечен');
await page.keyboard.press('h'); await W(2600); await page.keyboard.press('h'); await W(400);
/* остальные опыты — за кадром */
await E(() => { L3S.runs = [{ h1: 176, h2: 47 }, { h1: 182, h2: 49 }, { h1: 184, h2: 49 }]; L3S.step = 3; L3S.max = 3; l3Save(); l3Reset(); render(); });
/* ---------- 6. обработка ---------- */
await cap('Расчёты проверяются сразу', 'если ошибся — программа подскажет, в чём именно');
const o = await E(() => { const o = l3Calc(); return { g1: o.g1, g2: o.g2, g3: o.g3, gm: o.gm, dg: o.dg, eg: o.eg, e: o.e, sum: o.g1 + o.g2 + o.g3 }; });
const f = (v, d = 3) => v.toFixed(d).replace('.', ',');
await type('[data-k3="p_g1"]', f(o.g1)); await type('[data-k3="p_g2"]', f(o.g2)); await type('[data-k3="p_g3"]', f(o.g3));
await E(v => { Object.assign(L3S.proc, v); l3Save(); render(); }, { dg: f(o.dg), eg: f(o.eg, 2), gT: '1,400', e: f(o.e, 2) }); await W(300);
await type('[data-k3="p_gm"]', f(o.sum)); await click('[data-l3="pcheck"]', 3000);
await E(v => { const P = L3S.proc; Object.assign(P, v); l3Save(); render(); }, { gm: f(o.gm), dg: f(o.dg), eg: f(o.eg, 2), gT: '1,400', e: f(o.e, 2) });
await W(500); await click('[data-l3="pcheck"]', 1500); console.log('procOk', JSON.stringify(await E(() => [L3S.procOk, L3S.proc])));
await click('[data-l3="next"]', 600);
/* ---------- 7. выводы и защита ---------- */
await cap('Черновик выводов — по результатам студента', 'и защита: 8 контрольных вопросов');
await W(1500); const CQ = await E(() => L3_CQ.map(([, a]) => a));
await E(a => { a.forEach((v, i) => { L3S.cq[i] = v; }); l3Save(); render(); }, CQ); await W(400);
await click('[data-l3="cqCheck"]', 1500); await click('[data-l3="next"]', 700);
/* ---------- 8. отчёт ---------- */
await cap('Отчёт по бланку кафедры', '4 листа А4 — печать или PDF одной кнопкой');
await W(800); await E(() => { const p = document.querySelector('#d-paper'); p.style.scrollBehavior = 'smooth'; p.scrollTo({ top: 1500 }); }); await W(2400);
await E(() => { document.querySelector('#d-paper').scrollTo({ top: 3400 }); }); await W(2200);
await cap('Светлая тема — для проектора', 'переключается одной кнопкой');
await click('.tb [data-d="theme"]', 2000);
await click('[data-l3="go"][data-v="2"]', 2600);
/* ---------- 9. преподаватель ---------- */
await card(`<div class="ch">Для преподавателя</div><div class="ch-h">Вся группа — на одном экране</div>`); await W(2300);
await cap(''); await E(() => setTheme('dark'));   // под титром — обратно в тёмную тему
await E(() => {      // работы группы — как будто студенты сдали их в папку класса
  const ppl = [['Иванова Мария', '11 А', [[176, 47], [182, 49], [184, 49]]], ['Петров Артём', '11 А', [[211, 60], [205, 57], [215, 61]]], ['Смирнова Алина', '11 А', [[190, 52], [198, 55], [193, 53]]], ['Кузнецов Даниил', '11 А', [[214, 66], [209, 63], [212, 64]]], ['Соколова Вера', '11 А', [[186, 51], [180, 49], [189, 52]]]];
  const keep = L3S, texts = [];
  ppl.forEach(([fio, group, runs], k) => { const S = l3Fresh(); Object.assign(S, { fio, group, runs: runs.map(([h1, h2]) => ({ h1, h2 })), step: 5, max: 5, admitOk: true, cqOk: true, done: true });
    L3_ADMIT.forEach(([, a, x], i) => { S.admit[i] = (k === 1 && i === 6) ? x[0] : a; }); L3_CQ.forEach(([, a], i) => { S.cq[i] = a; });
    S.dx = { started: new Date(Date.now() - 3600e3).toISOString(), admitTries: 1 + (k % 2), procTries: 1 + k % 3, cqTries: 1, finished: new Date().toISOString(), t: {} };
    L3S = S; S.concl = l3AutoConcl(l3Calc()); texts.push({ name: fio + '.lw3', text: packResult() }); });
  L3S = keep; window.__texts = texts;
});
await card(''); await click('.tb [data-d="home"]', 900);
await cap('Режим преподавателя', 'под паролем');
await click('[data-d="teacher"]', 600); await type('#tp1', '2026'); await type('#tp2', '2026'); await click('[data-t="setpass"]', 600);
await E(() => teacherAddTexts(window.__texts)); await W(400);
await cap('Работы приходят в папку класса сами', 'подлинность файла, разброс γ по группе, выгрузка в Excel');
await W(3000);
await click('tr.r >> nth=1', 1000);
await cap('Подробности по каждому студенту', 'ответы, время на каждом шаге, ошибки в расчётах, отчёт');
await W(3200); await cap('');
/* ---------- финал ---------- */
await card(`<div class="logo">γ</div><div class="h">Показатель адиабаты</div><div class="chips"><span>Работает без интернета</span><span>Без прав администратора</span><span>Проверка и отчёт — автоматически</span></div><div class="s">Лабораторная работа № 3 · Кафедра физики</div>`);
await W(5000);
await cdp.send('Page.stopScreencast'); await W(300);
fs.writeFileSync(OUT + '/stamps.json', JSON.stringify(stamps));
console.log('frames', n, 'duration', (stamps[stamps.length - 1] - stamps[0]).toFixed(1));
await b.close();
