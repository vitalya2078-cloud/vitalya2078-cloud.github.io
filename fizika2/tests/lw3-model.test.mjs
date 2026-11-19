// Проверка физики ЛР № 3 без интерфейса: модель из lw3-core.js (та же, что на сайте и в программе для Windows).
// Метод Клемана — Дезорма должен давать γ ≈ 1,4 при правильном выпуске, завышать γ при раннем закрытии K₀
// и занижать при позднем; расчёты обработки и допуски проверки должны совпадать с формулами методички.
// Запуск: node fizika2/tests/lw3-model.test.mjs
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SRC = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'src');
const rd = f => fs.readFileSync(path.join(SRC, f), 'utf8');
const line = (src, name) => { const m = src.match(new RegExp(`^(?:const ${name.replace('$', '\\$')} = .*|function ${name}\\(.*)$`, 'm')); if (!m) throw new Error('нет ' + name); return m[0]; };
const app = rd('app.js'), lab = rd('labwork.js');
const code = [line(app, '$'), line(app, 'esc'), line(app, 'f1'), lab.match(/^const LW_LIST = \[.*?^\];/ms)[0],
  line(lab, 'lwNum'), line(lab, 'lwGauss'), line(lab, 'lwShuf'), line(lab, 'lwMsg'), rd('lw3-core.js'),
  'globalThis.T = { L3, L3V, l3Fresh, l3Reset, l3Calc, l3Ok, L3_KEYS, l3AutoConcl, l3ReportHtml, setS: s => { L3S = s; }, step: dt => l3Step(dt) };'].join('\n');
const noop = () => {};
const ctx = { console, Math, JSON, Number, String, Array, Object, Date, isFinite, parseFloat,
  document: { addEventListener: noop, querySelector: () => null }, localStorage: { getItem: () => null, setItem: noop },
  setInterval: noop, requestAnimationFrame: noop, performance: { now: () => 0 }, devicePixelRatio: 1, ic: () => '', toast: noop, render: noop, addXP: noop, ui: { main: {} } };
vm.createContext(ctx); vm.runInContext(code, ctx);
const { L3, L3V, l3Fresh, l3Reset, l3Calc, l3Ok, L3_KEYS, l3AutoConcl, l3ReportHtml, setS, step } = ctx.T;

let fails = 0;
const check = (ok, msg) => { console.log((ok ? '  ok   ' : '  FAIL ') + msg); if (!ok) fails++; };
const run = (S, sec, dt = .01) => { for (let t = 0; t < sec; t += dt) step(dt); };
const levels = S => Math.round(L3V.p);       // разность уровней, мм (как читает студент по лупам)

// один опыт строго по методичке; tc — сколько секунд K₀ открыт
function experiment(tc) {
  const S = l3Fresh(); S.power = true; setS(S); l3Reset();
  S.kOpen = true; S.k0Open = false; L3V.pump = true;
  let guard = 0; while (L3V.p < 215 && guard++ < 1e5) step(.01);
  L3V.pump = false; S.kOpen = false; run(S, 60);
  const h1 = levels(S);
  S.k0Open = true; run(S, tc, .002); S.k0Open = false; run(S, 60);
  const h2 = levels(S);
  return { h1, h2, g: h1 / (h1 - h2) };
}
const mean = a => a.reduce((s, x) => s + x, 0) / a.length;
const series = tc => Array.from({ length: 40 }, () => experiment(tc));

const good = series(.6), early = series(.12), late = series(3.5);
const gGood = mean(good.map(x => x.g)), gEarly = mean(early.map(x => x.g)), gLate = mean(late.map(x => x.g));
console.log(`γ: вовремя ${gGood.toFixed(3)}, рано ${gEarly.toFixed(3)}, поздно ${gLate.toFixed(3)}; h₁ ≈ ${mean(good.map(x => x.h1)).toFixed(0)}, h₂ ≈ ${mean(good.map(x => x.h2)).toFixed(0)} мм`);
check(gGood > 1.32 && gGood < 1.45, `при правильном выпуске ⟨γ⟩ = ${gGood.toFixed(3)} близко к 1,4`);
check(gEarly > gGood + .01, 'раннее закрытие K₀ завышает γ');
check(gLate < gGood - .01, 'позднее закрытие K₀ занижает γ');
check(good.every(x => x.h1 > 150 && x.h1 < 220 && x.h2 > 20 && x.h2 < 80), 'h₁ и h₂ в пределах шкалы и методички');
check(new Set(good.map(x => x.g.toFixed(3))).size > 5, 'опыты различаются (есть разброс)');

// у каждого студента свои параметры: при одинаковых действиях ⟨γ⟩ заметно разный, но физически верный
function student() {   // 3 опыта одного студента (одна и та же установка)
  const S0 = l3Fresh(), res = [];
  for (let i = 0; i < 3; i++) { const S = l3Fresh(); S.par = S0.par; S.power = true; setS(S); l3Reset();
    S.kOpen = true; S.k0Open = false; L3V.pump = true; let guard = 0; while (L3V.p < 215 && guard++ < 1e5) step(.01);
    L3V.pump = false; S.kOpen = false; run(S, 60); const h1 = levels(S); S.k0Open = true; run(S, .6, .002); S.k0Open = false; run(S, 60); const h2 = levels(S);
    res.push({ h1, h2 }); }
  return { par: S0.par, runs: res, gm: mean(res.map(r => r.h1 / (r.h1 - r.h2))) };
}
const studs = Array.from({ length: 30 }, student), gms = studs.map(x => x.gm);
const sd = Math.sqrt(mean(gms.map(g => (g - mean(gms)) ** 2)));
console.log(`30 студентов: ⟨γ⟩ от ${Math.min(...gms).toFixed(3)} до ${Math.max(...gms).toFixed(3)}, разброс σ = ${sd.toFixed(3)}`);
// верхний край: γ установки до 1,418 плюс разброс отсчётов даёт изредка ⟨γ⟩ ≈ 1,461 (ε ≈ 4 %) — физически допустимо
check(gms.every(g => g > 1.33 && g < 1.47), 'у каждого студента ⟨γ⟩ в пределах 1,33…1,47');
check(sd > .01, 'у разных студентов ⟨γ⟩ заметно различается');
const sigs = new Set(studs.map(x => x.runs.map(r => r.h1 + '/' + r.h2).join(' ')));
// в тесте все «студенты» действуют идеально одинаково (накачка ровно до 215, выпуск ровно 0,6 с), а h — целые мм,
// поэтому редкое совпадение одной пары возможно; у живых студентов действия различаются гораздо сильнее
check(sigs.size >= studs.length - 1, `наборы измерений h₁/h₂ у студентов разные (${sigs.size} из ${studs.length})`);
check(studs.every(x => x.par && x.par.g >= 1.372 && x.par.g <= 1.418), 'параметры установки сохраняются в работе студента');

// обработка: формулы методички
const S = l3Fresh(); S.runs = [{ h1: 180, h2: 50 }, { h1: 184, h2: 52 }, { h1: 178, h2: 48 }]; setS(S);
const o = l3Calc(), gs = S.runs.map(r => r.h1 / (r.h1 - r.h2)), gm = mean(gs), dg = gs.reduce((s, x) => s + Math.abs(gm - x), 0) / Math.sqrt(6);
check(Math.abs(o.gm - gm) < 1e-12 && Math.abs(o.dg - dg) < 1e-12 && Math.abs(o.eg - dg / gm * 100) < 1e-9 && o.gT === 1.4 && Math.abs(o.e - Math.abs(1.4 - gm) / 1.4 * 100) < 1e-9, 'l3Calc: ⟨γ⟩, ⟨Δγ⟩, ε_γ, γ_T, ε по формулам');
check(L3_KEYS.every(k => l3Ok(k, +o[k].toFixed(k === 'eg' || k === 'e' ? 1 : 3), o)), 'проверка принимает значения, округлённые как в задании');
check(!l3Ok('gm', o.gm + .02, o) && !l3Ok('g1', NaN, o) && !l3Ok('e', o.e + 3, o), 'проверка отклоняет неверные значения');
check(/γ = 1,3\d+ ± 0,0\d+/.test(l3AutoConcl(o)), 'черновик выводов содержит результат');
S.concl = 'Вывод'; S.fio = 'Тест'; S.date = '18.11.2026';
const rep = l3ReportHtml();
check((rep.match(/class="lwp"/g) || []).length === 4 && rep.includes('ОТЧЕТ') && rep.includes('Тест'), 'отчёт: 4 листа, шапка');
check(L3.N === 3 && L3.steps.length === 6, 'структура работы: 6 шагов, 3 опыта');

if (fails) { console.error(`FAIL: ${fails}`); process.exit(1); }
console.log('PASS: модель и расчёты ЛР № 3');
