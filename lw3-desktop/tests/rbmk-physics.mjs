// Физическая модель тренажёра РБМК (без браузера): равновесие, АЗ-5 при нормальном и малом ОЗР, йодная яма, коэффициенты.
// Запуск: node lw3-desktop/tests/rbmk-physics.mjs
import { createRequire } from 'node:module'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const RB = createRequire(import.meta.url)(path.join(path.dirname(fileURLToPath(import.meta.url)), '../src/rbmk-core.js'));
const must = (c, m) => { if (!c) { console.error('FAIL:', m); process.exit(1); } };
const run = (S, sec, f) => { for (let i = 0; i < sec * 60 && !S.broken; i++) { RB.step(S, 1 / 60); f && f(S); } return S; };
// 1. номинал: АР держит 3200 МВт, ОЗР в норме
let S = run(RB.fresh(), 120); must(Math.abs(S.P - 1) < 0.02 && RB.ozr(S) > 25 && !S.az, 'номинал не держится: P=' + S.P);
// 2. АЗ-5 из номинала: за 15 с мощность ниже 5 %, без концевого всплеска
S = RB.fresh(); RB.scram(S, 'тест'); let tip = 0; run(S, 15, s => { tip = Math.max(tip, s.tip); }); must(S.P < 0.05 && tip < 0.05 && !S.broken, 'АЗ-5 из номинала: P=' + S.P + ' tip=' + tip);
// 3. йодная яма: максимум ксенона после останова через 5–10 ч, в 1,3–2 раза выше равновесного
S = RB.fresh(); RB.scram(S, 'останов'); let mx = 0, tm = 0; run(S, 1500, s => { if (s.X > mx) { mx = s.X; tm = s.t; } });
const h = tm * RB.TIME_ACC / 3600; must(h > 5 && h < 10 && mx > 1.3 && mx < 2.1, `йодная яма: максимум ${mx.toFixed(2)} через ${h.toFixed(1)} ч`);
// 4. мощностной коэффициент: на номинале отрицательный, на малой мощности положительный
const coef = P => { const A = RB.fresh({ P }), r0 = RB.parts(A); A.P *= 1.02; A.Tf = 270 + 650 * A.P; A.phi = RB.voidOf(Math.max(0, (A.P - A.G * A.sub) / (12.6 * A.G))); const r1 = RB.parts(A); return (r1.void + r1.dop - r0.void - r0.dop) / (0.02 * P); };
must(coef(1) < 0 && coef(0.0625) > 0, `мощностной коэффициент: номинал ${coef(1).toFixed(2)}, 200 МВт ${coef(0.0625).toFixed(2)}`);
// 5. АЗ-5 на 200 МВт: при ОЗР 30 — безопасно; при ОЗР 6 после выбега 4 ГЦН — разгон
function az(ozrT) {
  let lo = 0, hi = 0.6, A; const xe = [0.45, 1.4];
  for (let k = 0; k < 30; k++) { const m = (lo + hi) / 2; A = RB.fresh({ P: 0.0625, RR: m, USP: Math.min(0.35, m * 0.8), xe }); A.pumps.forEach(q => { q.on = true; q.spin = 1; }); RB.init(A, { xe }); if (RB.ozr(A) > ozrT) hi = m; else lo = m; }
  A.ar.on = false; run(A, 10); A.prot = { period: false, power: false, press: false, level: false, tg: false };
  A.tg[1].on = false; [4, 5, 6, 7].forEach(i => { A.pumps[i].on = false; A.pumps[i].coast = true; }); run(A, 36); RB.scram(A, 'кнопка'); run(A, 20); return A;
}
const safe = az(30), bad = az(6);
must(!safe.broken && safe.P < 0.02, 'АЗ-5 при ОЗР 30 привела к аварии'); must(bad.broken && bad.broken.kind === 'reactor', 'АЗ-5 при ОЗР 6 не привела к разгону');
console.log(`PASS: физика РБМК — номинал, АЗ-5 из номинала, йодная яма (${mx.toFixed(2)} через ${h.toFixed(1)} ч), коэффициент мощности (${coef(1).toFixed(2)} / +${coef(0.0625).toFixed(2)} β), АЗ-5 при ОЗР 30 безопасна, при ОЗР 6 — разгон до ${Math.round(bad.maxP * 3200)} МВт.`);
