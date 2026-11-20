// «Физпрактикум»: полное прохождение ЛР 1 и ЛР 2 в программе (компьютер). Как студент: допуск по одному вопросу,
// подготовка (массы/шкив, отсчёты по лупе и штангенциркулю), опыты (выстрелы / пуски с анимацией), обработка,
// выводы и защита, сводка перед отчётом, отчёт 4 листа, файл работы с подписью и с номером работы.
// Отсчёты, которые студент снимает глазами, тест берёт из состояния установки (как в тесте ЛР 3).
// Запуск: python3 lw3-desktop/build.py; сервер на 127.0.0.1:4180 (папка lw3-desktop/dist); node lw3-desktop/tests/e2e-labs.mjs
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { leDriver } from './le-drivers.mjs';
const BASE = process.env.BASE || 'http://127.0.0.1:4180/';
const SHOTS = process.env.SHOTS || '';
const shot = async (p, n) => { if (SHOTS) await p.screenshot({ path: path.join(SHOTS, `fz-${n}.png`) }); };
const must = (ok, msg) => { if (!ok) throw new Error(msg); };
const b = await chromium.launch();
const page = await b.newPage({ viewport: { width: 1440, height: 900 }, acceptDownloads: true });
const errors = []; page.on('pageerror', e => errors.push(e.message)); page.on('console', m => m.type() === 'error' && errors.push(m.text()));
const E = (fn, a) => page.evaluate(fn, a);
const W = ms => page.waitForTimeout(ms);
const fmt = (v, d) => v.toFixed(d).replace('.', ',');
const st = () => E(() => curLab().steps[curLab().S().step][0]);

await page.goto(BASE, { waitUntil: 'networkidle' });
await page.fill('#np-fio', 'Смирнова Алина'); await page.fill('#np-group', '103'); await page.fill('#np-pw', '1234'); await page.fill('#np-pw2', '1234'); await page.click('[data-d="register"]'); await page.click('[data-d="intro-skip"]');
await page.click('[data-d="page"][data-v="labs"]');
must(await page.locator('.fz-card').count() === 8, 'на главном экране не 8 работ'); await shot(page, 'labs');

async function admitAndCq(act, key) {
  const list = await E(k => curLab()[k].map(([, a]) => a), key);
  for (let i = 0; i < list.length; i++) {
    await E(([k, i]) => { if (k === 'admit') AQ = i; else CQI = i; render(); }, [key, i]);
    await page.click(`.qs-opts [data-q="${i}"][data-v="${list[i].replace(/"/g, '\\"')}"]`); await W(320);
  }
  await E(([k, n]) => { if (k === 'admit') AQ = n; else CQI = n; render(); }, [key, list.length]);
  await page.click(`[data-${act}="${key}Check"]`); await W(150);
  must(await E(k => curLab().S()[k === 'admit' ? 'admitOk' : 'cqOk'], key), key + ' не сдан');
  await page.click(`[data-${act}="next"]`); await W(250);
}
async function procFill(act, keys, tables, vals) {
  for (const k of keys) await page.fill(`[data-${act === 'lw' ? 'k' : 'k2'}="p_${k}"]`, vals[k]);
  for (const t of tables) { await page.click(`[data-${act}="pcheck"][data-v="${t}"]`); await W(120); }
}
async function finish(n, act) {
  await page.locator('#modal .sum').waitFor(); await shot(page, `l${n}-summary`);
  must(await page.locator('#modal .sum').innerText().then(t => t.length > 300), `ЛР ${n}: сводка пустая`); await page.keyboard.press('Escape');
  must(await page.locator('#d-paper .lwp').count() === 4 && await page.locator('#printroot .lwp').count() === 4, `ЛР ${n}: в отчёте не 4 листа`);
  must((await page.locator('#d-paper').innerText()).includes('Лаборатория кафедры физики и общетехнических дисциплин'), `ЛР ${n}: в шапке не та кафедра`);
  await shot(page, `l${n}-report`);
  const [dl] = await Promise.all([page.waitForEvent('download'), page.keyboard.press('Control+s')]);
  const f = path.join(SHOTS || '/tmp', `lab${n}.lw3`); await dl.saveAs(f);
  const d = JSON.parse(fs.readFileSync(f, 'utf8')); must(d.lab === n && d.state.done && d.sig && d.summary, `ЛР ${n}: файл работы неполный`);
  must(await E(t => { const r = unpackResult(t); return r.ok && r.d.lab; }, fs.readFileSync(f, 'utf8')) === n, `ЛР ${n}: подпись файла не проходит`);
  await page.click('[data-d="labs"]'); await W(200);
  return f;
}

/* ===================== ЛР 2 ===================== */
await page.click('[data-d="lab"][data-v="2"]'); await admitAndCq('l2', 'admit');
must(await st() === 'prep', 'ЛР 2: нет подготовки');
{ const v = await E(() => { const S = L2S, d = S.d[S.pul - 1]; return { d: d.toFixed(1), r: (d / 2000).toFixed(5), l: (S.l1 / 100).toFixed(2), h: S.h.toFixed(3) }; });
  await page.fill('[data-k2="rd"]', v.d.replace('.', ',')); await page.fill('[data-k2="rr"]', v.r.replace('.', ',')); await page.fill('[data-k2="rl1"]', v.l.replace('.', ',')); await page.fill('[data-k2="rh"]', v.h.replace('.', ','));
  await shot(page, 'l2-prep'); await page.click('[data-l2="prepCheck"]'); must(await E(() => L2S.prepOk), 'ЛР 2: подготовка не принята'); await page.click('[data-l2="next"]'); }
async function l2Launch() {
  await page.click('[data-l2="wind"]'); await page.click('[data-l2="go1"]');
  await page.waitForFunction(() => L2S.cur, null, { timeout: 15000 });
  const c = await E(() => L2S.cur); await page.fill('[data-k2="cm"]', fmt(c.m, 3)); await page.fill('[data-k2="ct"]', fmt(c.t, 3)); await page.click('[data-l2="record"]'); await W(100);
}
for (let i = 0; i < 3; i++) { await l2Launch(); if (!i) await shot(page, 'l2-exp1'); }
must(await E(() => L2S.runs.length) === 3, 'ЛР 2: не 3 пуска'); await page.click('[data-l2="next"]');
for (let i = 0; i < 7; i++) await page.click('[data-l2="l2"][data-d="-1"]');
await page.fill('[data-k2="rl2"]', await E(() => (L2S.l2 / 100).toFixed(2).replace('.', ','))); await l2Launch();
must(await E(() => L2S.ex2.length) === 1, 'ЛР 2: нет опыта 2'); await page.click('[data-l2="next"]');
must(await st() === 'proc', 'ЛР 2: нет обработки');
{ const keys = await E(() => [...L2_TABLES[1], ...L2_TABLES[2]]), vals = await E(ks => { const o = l2Calc(); return Object.fromEntries(ks.map(k => [k, String(+o[k].toPrecision(5)).replace('.', ',')])); }, keys);
  await procFill('l2', keys, [1, 2], vals); await shot(page, 'l2-proc');
  must(await E(ks => ks.every(k => L2S.procOk[k]), keys), 'ЛР 2: обработка не принята'); await page.click('[data-l2="next"]'); }
must(await st() === 'concl', 'ЛР 2: нет выводов'); await shot(page, 'l2-concl');
await admitAndCq('l2', 'cq'); must(await st() === 'report', 'ЛР 2: нет отчёта');
const f2 = await finish(2, 'l2');

/* ===================== ЛР 1 ===================== */
await page.click('[data-d="lab"][data-v="1"]'); await admitAndCq('lw', 'admit');
must(await st() === 'prep', 'ЛР 1: нет подготовки');
for (const id of ['А', 'Б']) await page.click(`[data-lw="puck"][data-v="${id}"]`);
{ const v = await E(() => { const S = LWS; return { m: [1, 2].map(j => lwPuck(S['p' + j]).m.toFixed(4)), x: String(Math.round(S.x01 + LW1.R)), y: String(Math.round(S.y01)) }; });
  for (let j = 1; j <= 2; j++) await page.fill(`[data-k="m${j}"]`, v.m[j - 1].replace('.', ','));
  await page.fill('[data-k="rx01"]', v.x); await page.fill('[data-k="ry01"]', v.y); await page.click('[data-lw="aim"]').catch(() => {});
  await page.click('[data-aim="p1"]'); await shot(page, 'l1-prep'); await page.click('[data-lw="prepCheck"]'); must(await E(() => LWS.prepOk), 'ЛР 1: подготовка не принята'); await page.click('[data-lw="next"]'); }
async function l1Shoot(kind, j) {
  for (let tries = 0; tries < 6; tries++) {
    await page.click(`[data-lw="shoot"]`); await page.waitForFunction(() => !LWV.anim, null, { timeout: 20000 }); await W(80);
    if (await E(() => !!LWS.cur)) break;
  }
  const t = await E(() => LWS.cur.t);
  if (kind === 'free') await page.fill('[data-k="cx"]', String(Math.round(t)));
  else for (const k of ['x1', 'y1', 'x2', 'y2']) await page.fill(`[data-k="c${k}"]`, String(Math.round(t[k])));
  await page.click('[data-lw="record"]'); await W(80);
}
for (let i = 0; i < 3; i++) { await l1Shoot('free'); if (!i) await shot(page, 'l1-free'); }
must(await E(() => LWS.free.length) === 3, 'ЛР 1: не 3 выстрела'); await page.click('[data-lw="next"]');
for (const j of [2]) {
  const c = await E(j => LW1.circles[LWS.ex[j].circle - 1], j);
  await page.fill(`[data-k="rx0${j}"]`, String(c[0] + 15)); await page.fill(`[data-k="ry0${j}"]`, String(c[1])); await page.click(`[data-lw="placeCheck"]`);
  must(await E(j => LWS.ex[j].placeOk, j), `ЛР 1: тело ${j} не установлено`);
  for (let i = 0; i < 3; i++) { await l1Shoot('coll', j); if (!i && j === 2) await shot(page, 'l1-coll'); }
  must(await E(j => LWS.ex[j].rows.length, j) === 3, `ЛР 1: опыт ${j} — не 3 выстрела`); await page.click('[data-lw="next"]');
}
must(await st() === 'proc', 'ЛР 1: нет обработки');
{ const keys = await E(() => Object.values(LW_TABLES).flat()), vals = await E(ks => { const O = lwCalcAll(); return Object.fromEntries(ks.map(k => { const [key, j] = k.split('@'), v = O[+j || 2][key]; return [k, (Math.abs(v) < 10 ? v.toFixed(4) : v.toFixed(2)).replace('.', ',')]; })); }, keys);
  await procFill('lw', keys, Object.keys(await E(() => LW_TABLES)), vals); await shot(page, 'l1-proc');
  const bad = await E(ks => ks.filter(k => !LWS.procOk[k]), keys); must(!bad.length, 'ЛР 1: обработка не принята: ' + bad.join(', ')); await page.click('[data-lw="next"]'); }
must(await st() === 'concl', 'ЛР 1: нет выводов');
await admitAndCq('lw', 'cq'); must(await st() === 'report', 'ЛР 1: нет отчёта');
const f1 = await finish(1, 'lw');

/* ===================== ЛР 4–8 (электричество и магнетизм) ===================== */
const drv = leDriver(page, must, shot), fE = {};
for (const n of [4, 5, 6, 7, 8]) {
  await page.click(`[data-d="lab"][data-v="${n}"]`);
  if (n === 4) {   // неудачный допуск: ответы не раскрываются, набор вопросов меняется, пауза 2 минуты
    const before = await E(() => LES.admitSet.join(','));
    const wrong = await E(() => curLab().admit.map(([, , x]) => x[0]));
    for (let i = 0; i < wrong.length; i++) { await E(i => { AQ = i; render(); }, i); await page.click(`.qs-opts [data-q="${i}"][data-v="${wrong[i].replace(/"/g, '\\"')}"]`); await W(300); }
    await E(n => { AQ = n; render(); }, wrong.length); await page.click('[data-le="admitCheck"]'); await W(200);
    must(await E(() => !LES.admitChecked && !Object.keys(LES.admit).length && LES.admitWait > Date.now()), 'допуск: после неудачи ответы не сброшены или нет паузы');
    must(await page.locator('.qs-dots .bad, .qs-opts .bad, .qs-opts .ok').count() === 0, 'допуск: после неудачи видно, какие ответы неверные');
    must(await page.locator('#q-wait').count() === 1, 'допуск: нет таймера паузы'); await shot(page, 'l4-admit-wait');
    must(await E(b => LES.admitSet.join(',') !== b, before), 'допуск: набор вопросов не сменился');
    await page.click('[data-d="aq"][data-v="8"]').catch(() => {}); await E(n => { AQ = n; render(); }, 8);
    await page.click('[data-le="admitCheck"]', { force: true }).catch(() => {}); await W(150);
    must(await E(() => !LES.admitChecked), 'допуск: во время паузы можно сдавать');
    await E(() => { LES.admitWait = 0; leSave(); render(); });
  }
  await admitAndCq('le', 'admit');
  must(await st() === 'prep', `ЛР ${n}: нет подготовки`); await shot(page, `l${n}-prep`);
  await drv.run(n);
  must(await st() === 'concl', `ЛР ${n}: нет выводов`); await shot(page, `l${n}-concl`);
  await admitAndCq('le', 'cq'); must(await st() === 'report', `ЛР ${n}: нет отчёта`);
  fE[n] = await finish(n, 'le');
}

/* главный экран: обе работы защищены, ЛР 3 не тронута; файл ЛР 2 открывается для продолжения на «другом компьютере» */
must((await page.locator('.fz-card.done').count()) === 7, 'на главном экране не отмечены защищённые работы'); await shot(page, 'labs-done');
const ctx2 = await b.newContext({ viewport: { width: 1366, height: 768 } }); const p2 = await ctx2.newPage(); p2.on('pageerror', e => errors.push(e.message));
await p2.goto(BASE, { waitUntil: 'networkidle' }); await p2.setInputFiles('#file-in', f2); await p2.waitForFunction(() => SCREEN === 'work');
must(await p2.evaluate(() => LAB === 2 && L2S.done && L2.steps[L2S.step][0] === 'report'), 'ЛР 2 из файла не восстановилась'); await ctx2.close();

/* ===================== тесты: самопроверка и экзамен ===================== */
const clickOpt = async v => { const i = await E(v => [...document.querySelectorAll('.fz-opt')].findIndex(b => b.dataset.v === v), v); must(i >= 0, 'нет варианта ' + v); await page.locator('.fz-opt').nth(i).click(); };
page.on('dialog', d => d.accept());
await page.click('[data-d="page"][data-v="tests"]'); await page.waitForSelector('.fz-topic'); await shot(page, 'tests');
must(await page.locator('.fz-topic').count() === 9, 'в тестах не 9 тем');
await page.click('[data-fz="self"][data-v="4"]'); await page.waitForSelector('.fz-opt');
for (let i = 0; i < 3; i++) { const a = await E(() => tCur().a); await clickOpt(a); must(await page.locator('.fz-verdict.ok').count() === 1, 'самопроверка: верный ответ не засчитан'); await page.click('[data-fz="next"]'); }
{ const q = await E(() => ({ a: tCur().a, x: tCur().x[0] })); await clickOpt(q.x); must(await page.locator('.fz-verdict.bad').count() === 1, 'самопроверка: неверный ответ не отмечен'); }
await page.click('[data-fz="quit"]'); await page.waitForSelector('.fz-res'); await page.click('[data-fz="back"]');
must(await page.locator('[data-fz="selfw"][data-v="4"]').count() === 1, 'нет режима «Ошибки» после неверного ответа');
await page.click('[data-fz="exam"][data-v="2"]'); await page.waitForSelector('#fz-timer'); await shot(page, 'exam');
must(await E(() => TQ.ids.length === 30 && new Set(TQ.ids).size === 30 && TQ.ids.every(id => id.startsWith('2.'))), 'экзамен: не 30 разных вопросов темы');
// время на вопрос вышло — вопрос не засчитан, сам переходит к следующему
await E(() => { TQ.deadline = Date.now() - 1; }); await page.waitForFunction(() => TQ.i === 1, null, { timeout: 5000 });
must(await E(() => TQ.ans[TQ.ids[0]].late && !TQ.ans[TQ.ids[0]].ok), 'экзамен: просроченный вопрос засчитан');
for (let i = 1; i < 30; i++) { const a = await E(() => (TQ.i % 4 ? tCur().a : tCur().x[0])); await clickOpt(a); }
await page.waitForSelector('.fz-res'); await shot(page, 'exam-result');
const ex = await E(() => tsLoad().att[0]); must(ex.n === 30 && ex.right === 22 && ex.score === 73 && ex.grade === 3, `экзамен: неверный подсчёт (${ex.right} верно, ${ex.score} баллов, «${ex.grade}»)`);
const [dlx] = await Promise.all([page.waitForEvent('download'), page.click('[data-fz="examfile"]')]); const fx = path.join(SHOTS || '/tmp', 'exam.lw3'); await dlx.saveAs(fx);
must(JSON.parse(fs.readFileSync(fx, 'utf8')).kind === 'exam', 'файл экзамена неверный');
await page.click('[data-fz="back"]'); await page.click('[data-d="page"][data-v="results"]'); must((await page.locator('.fz-tbl').nth(1).innerText()).includes("73"), 'экзамен не попал в «Мои результаты»');

// преподаватель: вкладки ЛР, экзамены, подлинность, отчёт; сброс пароля курсанта
await page.click('[data-d="home"]'); await page.click('[data-d="acc"]'); await page.fill('#au-pw', '0000'); await page.click('[data-d="login"]');
must(await E(() => SCREEN === 'home'), 'вход с неверным паролем');
await page.click('[data-d="teacher"]'); await page.fill('#tp', 'test-teacher'); await page.click('[data-t="unlock"]'); await page.waitForFunction(() => SCREEN === 'teacher');
await page.setInputFiles('#file-in', [f1, f2, ...Object.values(fE), fx]); await page.waitForFunction(() => TROWS.length === 8);
await page.click('[data-t="tlab"][data-v="exam"]'); await W(150);
must((await page.locator('table.tt tr.r').count()) === 1 && (await page.locator('table.tt').innerText()).includes('подлинный'), 'преподаватель: нет экзамена');
await page.click('table.tt tr.r'); await W(150); must(await page.locator('#modal table.tt tr').count() === 31, 'преподаватель: нет разбора экзамена'); await shot(page, 'teacher-exam'); await page.keyboard.press('Escape');
await page.click('[data-t="tlab"][data-v="acc"]'); await W(150); await page.click('[data-t="pwreset"]'); await W(150);
must(await E(() => !acctHasPw(profiles()[0])), 'пароль не сброшен');
await page.click('[data-t="back"]'); await page.click('[data-d="acc"]'); await page.fill('#au-n1', '5678'); await page.fill('#au-n2', '5678'); await page.click('[data-d="setpw"]');
must(await E(() => SCREEN === 'labs' && acctCheck(PROFILE, '5678')), 'после сброса не задаётся новый пароль');
await page.click('[data-d="home"]'); await page.click('[data-d="teacher"]'); await page.fill('#tp', 'test-teacher'); await page.click('[data-t="unlock"]'); await page.waitForFunction(() => SCREEN === 'teacher');
for (const n of [1, 2, 4, 5, 6, 7, 8]) {
  await page.click(`[data-t="tlab"][data-v="${n}"]`); await W(150);
  must((await page.locator('table.tt tr.r').count()) === 1 && (await page.locator('table.tt').innerText()).includes('подлинный'), `преподаватель: нет работы ЛР ${n}`);
  await page.click('table.tt tr.r'); await page.locator('#modal .lwp').first().waitFor(); must(await page.locator('#modal .lwp').count() === 4, `преподаватель: отчёт ЛР ${n}`);
  await shot(page, `teacher-l${n}`); await page.keyboard.press('Escape');
}
if (errors.length) throw new Error('ошибки в браузере: ' + errors.join(' | '));
console.log('PASS: Физпрактикум — выбор работы, ЛР 1, 2, 4–8 целиком, тесты (самопроверка, экзамен с таймером), учётные записи с паролем: допуск, подготовка, опыты, обработка, защита, сводка, отчёт, файл работы, продолжение из файла, режим преподавателя по работам.');
await b.close();
