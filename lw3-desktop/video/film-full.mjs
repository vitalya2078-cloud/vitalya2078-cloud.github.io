// Видео «Полное прохождение ЛР № 3» с дикторским текстом (full.json, озвучка — по сценам).
// Как снять: python3 lw3-desktop/build.py; cp lw3-desktop/video/video.html lw3-desktop/dist/; сервер на 4180 (папка lw3-desktop/dist);
// node lw3-desktop/video/film-full.mjs <папка> <durations.json>  → кадры + stamps.json + scenes.json (начало каждой сцены).
import { chromium } from 'playwright';
import fs from 'node:fs';
const [OUT, DURF] = process.argv.slice(2); fs.mkdirSync(OUT + '/frames', { recursive: true });
const DUR = JSON.parse(fs.readFileSync(DURF, 'utf8'));
const b = await chromium.launch({ args: ['--force-device-scale-factor=1'] });
const page = await b.newPage({ viewport: { width: 1920, height: 1080 } });
await page.goto('http://127.0.0.1:4180/video.html', { waitUntil: 'networkidle' });
const app = page.frame({ name: 'app' }); await app.waitForSelector('#np-fio');
const W = ms => page.waitForTimeout(ms);
const cap = (t, s = '') => page.evaluate(([a, c]) => window.cap(a, c), [t, s]);
const card = html => page.evaluate(h => window.card(h), html);
const E = (fn, arg) => app.evaluate(fn, arg);
async function aim(sel) { const l = app.locator(sel).first(); await l.scrollIntoViewIfNeeded(); await W(150); const bx = await l.boundingBox(); const x = bx.x + bx.width / 2, y = bx.y + bx.height / 2;
  await page.evaluate(([x, y]) => window.cursor(x, y), [x, y]); await W(550); return [x, y]; }
async function click(sel, pause = 400) { const [x, y] = await aim(sel); await page.evaluate(([x, y]) => window.ripple(x, y), [x, y]); await page.mouse.click(x, y); await W(pause); }
async function type(sel, text) { await click(sel, 120); await app.locator(sel).first().pressSequentially(text, { delay: 75 }); await W(250); }

/* сцены: начало каждой — время для звуковой дорожки; следующая сцена ждёт, пока доиграет фраза предыдущей */
const scenes = []; let cur = null;
async function sc(key, t, s) {
  if (cur) { const left = cur.t + (DUR[cur.key] || 0) * 1000 + 350 - Date.now(); if (left > 0) await W(left); }
  cur = { key, t: Date.now() }; scenes.push({ key, at: Date.now() / 1000 });
  if (t !== undefined) await cap(t, s);
}

const cdp = await page.context().newCDPSession(page); let n = 0; const stamps = [];
cdp.on('Page.screencastFrame', async f => { const i = n++; fs.writeFileSync(`${OUT}/frames/${String(i).padStart(6, '0')}.jpg`, Buffer.from(f.data, 'base64')); stamps.push(f.metadata.timestamp); try { await cdp.send('Page.screencastFrameAck', { sessionId: f.sessionId }); } catch (e) {} });

/* ---------- заставка ---------- */
await card(`<div class="logo">γ</div><div class="k">Лабораторная работа № 3</div><div class="h">Показатель адиабаты</div><div class="s">Полное прохождение работы в программе</div>`);
await W(700);
await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 90, maxWidth: 1920, maxHeight: 1080, everyNthFrame: 1 });
const t0 = Date.now() / 1000; await W(600);
await sc('intro'); await W(500);
await sc('login', 'Вход', 'фамилия и класс — работа сохраняется сама'); await card(''); await W(500);
await type('#np-fio', 'Иванова Мария'); await type('#np-group', '11 А'); await click('[data-d="new"]', 800);
await sc('tour', 'Знакомство', 'можно пролистать — потом откроется клавишей F1');
await click('[data-d="intro-next"]', 1200); await click('[data-d="intro-skip"]', 500);

/* ---------- допуск ---------- */
await sc('admit', 'Шаг 1. Допуск', '8 вопросов, нужно 6 верных');
const A = await E(() => L3_ADMIT.map(([, a]) => a));
for (let i = 0; i < 8; i++) {
  await sc('q' + (i + 1), `Допуск · вопрос ${i + 1} из 8`, '');
  await E(q => { if (AQ !== q) { AQ = q; render(); } }, i); await W(1400);
  await click(`[data-l3="admit"][data-q="${i}"][data-v="${A[i].replace(/"/g, '\\"')}"]`, 300);
}
await sc('admitOk', 'Допуск сдан', '8 из 8'); await E(() => { AQ = 8; render(); }); await W(300);
await click('[data-l3="admitCheck"]', 1600); await click('[data-l3="next"]', 400);

/* ---------- подготовка ---------- */
await sc('prep', 'Шаг 2. Подготовка установки', 'питание, кран K — открыть, кран K₀ — закрыть');
await W(1500); await click('[data-l3="power"]', 900); await click('[data-l3="kv"]', 1000); await click('[data-l3="k0"]', 1200);

/* ---------- опыты ---------- */
async function pump() { const [x, y] = await aim('#l3-pump'); await page.mouse.move(x, y); await page.mouse.down(); await app.waitForFunction(() => L3V.p >= 214, null, { timeout: 30000 }); await page.mouse.up(); await W(300); }
async function readH(rec) { await W(900); const h = await E(() => { const [l, r] = l3Levels(); return Math.round(r - l); }); await type('[data-k3="ch"]', String(h)); await click(`[data-l3="${rec}"]`, 500); }
async function vent() { await click('[data-l3="k0open"]', 100); await app.waitForFunction(() => L3V.hiss < .05 && Math.abs(L3V.p) < 2, null, { timeout: 15000 }); await W(350); await click('[data-l3="k0close"]', 600); }
async function waitMin(ph) { await click('[data-l3="waitMin"]'); await app.waitForFunction(p => L3V.phase === p, ph, { timeout: 30000 }); }
await click('[data-l3="next"]', 400);
await sc('pump1', 'Шаг 3. Опыт 1 из 3 — накачка', 'держим компрессор до 210…220 мм');
await W(1200); await pump(); await click('[data-l3="closeK"]', 600);
await sc('wait1', 'Минута ожидания', 'закрыли K, секундомер идёт — газ остывает'); await W(2500); await waitMin('read1');
await sc('read1', 'Отсчёт h₁', 'разность уровней в коленах манометра'); await readH('rec1');
await sc('vent1', 'Выпуск через K₀', 'адиабатное расширение — газ охлаждается'); await W(1500); await vent();
await sc('wait2', 'Вторая минута', 'газ нагревается — давление растёт'); await click('[data-l3="startSw"]', 500); await waitMin('read2');
await sc('read2', 'Отсчёт h₂', 'опыт 1 записан'); await readH('rec2');
await sc('hod', 'Ход работы', 'клавиша H — порядок по методичке'); await W(500); await page.keyboard.press('h'); await W(3200); await page.keyboard.press('h'); await W(300);
for (const k of [2, 3]) {
  await sc('run' + k, `Опыт ${k} из 3`, k === 2 ? 'всё так же' : 'значения у каждого студента свои');
  await click('[data-l3="k0"]', 500); await pump(); await click('[data-l3="closeK"]', 300); await waitMin('read1'); await readH('rec1');
  await vent(); await click('[data-l3="startSw"]', 300); await waitMin('read2'); await readH('rec2');
}
await W(800); await click('[data-l3="next"]', 400);

/* ---------- обработка ---------- */
const o = await E(() => { const o = l3Calc(); return { g: o.a.map(x => x.g), gm: o.gm, dg: o.dg, eg: o.eg, e: o.e }; });
const f = (v, d = 3) => v.toFixed(d).replace('.', ',');
await sc('proc', 'Шаг 4. Обработка', 'γᵢ = h₁ / (h₁ − h₂)');
for (let i = 0; i < 3; i++) await type(`[data-k3="p_g${i + 1}"]`, f(o.g[i]));
await sc('procMean', 'Среднее ⟨γ⟩', 'ошибка — и подсказка'); await type('[data-k3="p_gm"]', f(o.g[0] + o.g[1] + o.g[2])); await click('[data-l3="pcheck"]', 2600);
await app.locator('[data-k3="p_gm"]').fill(''); await type('[data-k3="p_gm"]', f(o.gm));
await sc('procErr', 'Погрешности и сравнение с теорией', '⟨Δγ⟩, ε_γ, γ_T = 1,40, ε');
await type('[data-k3="p_dg"]', f(o.dg)); await type('[data-k3="p_eg"]', f(o.eg, 1)); await type('[data-k3="p_gT"]', '1,400'); await type('[data-k3="p_e"]', f(o.e, 1));
await sc('procOk', 'Всё верно', ''); await click('[data-l3="pcheck"]', 1800); await click('[data-l3="next"]', 400);

/* ---------- выводы и защита ---------- */
await sc('concl', 'Шаг 5. Выводы', 'черновик — по нашим результатам'); await W(1200);
await E(() => { const t = document.querySelector('[data-k3="concl"]'); if (t) t.scrollTop = 0; });
await sc('cq', 'Защита', '8 контрольных вопросов');
const CQ = await E(() => L3_CQ.map(([, a]) => a));
for (let i = 0; i < 8; i++) { await sc('c' + (i + 1), `Защита · вопрос ${i + 1} из 8`, ''); await W(900); await click(`[data-l3="cq"][data-q="${i}"][data-v="${CQ[i].replace(/"/g, '\\"')}"]`, 300); }
await sc('cqOk', 'Защита принята', ''); await click('[data-l3="cqCheck"]', 1500); await click('[data-l3="next"]', 500);

/* ---------- отчёт ---------- */
await sc('report', 'Шаг 6. Отчёт', 'бланк кафедры — 4 листа А4');
await W(1500); await E(() => { const p = document.querySelector('#d-paper'); p.style.scrollBehavior = 'smooth'; p.scrollTo({ top: 1700 }); }); await W(3200);
await E(() => document.querySelector('#d-paper').scrollTo({ top: 3500 })); await W(2500);
await sc('save', 'Сдаём работу', 'файл для преподавателя и PDF'); await E(() => document.querySelector('#d-paper').scrollTo({ top: 0 })); await W(800);
await aim('[data-d="submit"]'); await W(1800); await aim('[data-d="pdf"]'); await W(1500);
await sc('end'); await cap('');
await card(`<div class="logo">γ</div><div class="h">Работа выполнена</div><div class="s">Лабораторная работа № 3 · Показатель адиабаты</div>`); await W(4500);

await cdp.send('Page.stopScreencast'); await W(300);
fs.writeFileSync(OUT + '/stamps.json', JSON.stringify(stamps));
fs.writeFileSync(OUT + '/scenes.json', JSON.stringify({ t0, first: stamps[0], scenes }));
console.log('frames', n, 'duration', (stamps[stamps.length - 1] - stamps[0]).toFixed(1), 'clock skew', (stamps[0] - t0).toFixed(2));
await b.close();
