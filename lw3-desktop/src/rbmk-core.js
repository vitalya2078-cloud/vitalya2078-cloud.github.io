/* =====================================================================
   Тренажёр «Пульт РБМК-1000»: физическая модель реактора (без интерфейса).
   Точечная кинетика с 6 группами запаздывающих нейтронов, цепочка ¹³⁵I → ¹³⁵Xe,
   паровой (пустотный) эффект, эффект Доплера, концевой эффект стержней (графитовые вытеснители),
   главные циркуляционные насосы, барабаны-сепараторы, турбогенераторы, аварийная защита.
   Модель учебная: числа подобраны так, чтобы качественно и по порядку величин повторять РБМК-1000
   образца 1986 г. (положительный паровой коэффициент, концевой эффект, неустойчивость на малой мощности).
   Реактивность — в долях β (1 β ≈ 0,0065 Δk/k). Мощность — в долях номинала 3200 МВт (тепл.).
   ===================================================================== */
const RB = (() => {
  const NOM = 3200;                                           // МВт тепловых
  const BETA = [0.000215, 0.001424, 0.001274, 0.002568, 0.000748, 0.000273], B = BETA.reduce((a, b) => a + b, 0);
  const LAM = [0.0124, 0.0305, 0.111, 0.301, 1.14, 3.01];     // 1/с
  const GEN = 1e-3;                                           // время жизни поколения мгновенных нейтронов, с
  const L_I = Math.LN2 / (6.57 * 3600), L_X = Math.LN2 / (9.14 * 3600);   // ¹³⁵I и ¹³⁵Xe, 1/с
  const XE_BURN = 3.0 * L_X;                                  // выгорание ксенона в номинальном потоке (80 % убыли — выгорание)
  const XE_W = 5.0;                                           // отравление при номинале, β
  const W_ROD = 0.075;                                        // «эквивалентный стержень» ОЗР, β
  const A_VOID = 4.2;                                         // паровой эффект: β на 100 % пара
  const A_DOP = 2.6 / 650;                                    // Доплер: β на °C топлива
  const R_SLIP = 0.075;                                       // ρпар/ρвода × скольжение при 7 МПа
  const GROUPS = { RR: 130, AR: 12, USP: 24 };                // РР — ручные, АР — автоматические, УСП — укороченные (снизу)
  const H = 7;                                                // высота активной зоны, м
  const AZ_SPEED = 0.4 / H;                                   // АЗ-5: 0,4 м/с → доля высоты в секунду
  const TIME_ACC = 60;                                        // ксенон, иод и часы смены идут в 60 раз быстрее (1 с = 1 мин)

  // интегральная характеристика стержня: доля веса при погружении h (0…1); b — «провал» потока вверху зоны
  const Fs = h => { h = Math.max(0, Math.min(1, h)); return h - Math.sin(2 * Math.PI * h) / (2 * Math.PI); };
  const Fr = (h, b) => Math.pow(Fs(h), 1 + 2.5 * b);        // поток прижат к низу → верх зоны «стоит» мало
  // доля пара в канале по массовому паросодержанию x (гомогенная модель со скольжением)
  const voidOf = x => x <= 0 ? 0 : x / (x + (1 - x) * R_SLIP);

  function fresh(o = {}) {
    const S = {
      t: 0, clock: o.clock || 8 * 3600,                       // секунды модели; часы смены (секунды суток)
      P: o.P == null ? 1 : o.P, C: [], rho: 0, period: Infinity,
      I: 0, X: 0, Tf: 0, phi: 0, x: 0,
      rods: { RR: o.RR == null ? 0.36 : o.RR, AR: 0.5, USP: o.USP == null ? 0.35 : o.USP }, rodCmd: { RR: 0, USP: 0, AR: 0 },
      az: false, azT: 0, azFrom: null, tip: 0, axial: 0.2,
      ar: { on: o.ar !== false, set: o.P == null ? 1 : o.P },
      pumps: Array.from({ length: 8 }, (_, i) => ({ on: i !== 3 && i !== 7, spin: i !== 3 && i !== 7 ? 1 : 0, vib: 10 + Math.random() * 8, coast: false, cav: 0 })),
      G: 1, sub: 0.12,
      p: 7.0, lvl: 0, fw: 1, fwAuto: true, fwPumps: [true, true, false], bru: 0,
      tg: [{ on: true, load: 0.5 }, { on: true, load: 0.5 }], tgAuto: true,
      eccs: true, prot: { period: true, power: true, press: true, level: true, tg: true },
      pressLim: 8.0, broken: null, why: [], ev: [], hist: [], comp: {},
      excess: 0, maxP: 0,
    };
    return init(S, o);
  }
  // равновесие при мощности P: предшественники, иод/ксенон, температура, пар; запас реактивности подбирается так, чтобы ρ = 0
  function init(S, o) {
    const P = S.P;
    S.C = BETA.map((b, i) => b / (LAM[i] * GEN) * P);
    const xe = o.xe == null ? xeEq(P) : o.xe; S.I = xe[0]; S.X = xe[1];
    S.Tf = 270 + 650 * P; S.G = flow(S); S.sub = 0.12 * P / Math.max(0.1, S.G); S.x = quality(S); S.phi = voidOf(S.x);
    S.axial = axialTarget(S);
    const r = parts(S); S.excess = -(r.rods + r.void + r.dop + r.xe); S.rho = 0; S.period = Infinity;
    S.lvl = 0; S.p = 7.0; S.fw = P;
    return S;
  }
  // равновесные иод и ксенон (в долях номинальных)
  function xeEq(P) { const I = P, X = (0.95 * (L_X + XE_BURN) * I + 0.05 * (L_X + XE_BURN) * P) / (L_X + XE_BURN * P); return [I, X]; }
  const flow = S => S.pumps.reduce((a, q) => a + q.spin * (1 - 0.5 * q.cav), 0) / 6;
  const quality = S => Math.max(0, (S.P - S.G * S.sub) / (12.6 * Math.max(0.05, S.G)));
  function axialTarget(S) {   // форма поля: при малой мощности, сильном ксеноне и выведенных стержнях поток прижимается к низу
    const out = 1 - S.rods.RR;                     // выведенность ручных стержней
    return Math.max(0, Math.min(1, 0.12 + 0.55 * Math.max(0, 0.5 - S.P) + 0.25 * Math.max(0, S.X - 1) + 0.35 * Math.max(0, out - 0.75) * 4 - 0.2 * S.rods.USP));
  }
  // составляющие реактивности, β
  function parts(S) {
    const b = S.axial, rr = GROUPS.RR * Fr(S.rods.RR, b), ar = GROUPS.AR * Fr(S.rods.AR, b), usp = GROUPS.USP * Fs(S.rods.USP);
    let rods = -W_ROD * (rr + ar + usp);
    if (S.az && S.azFrom) {   // АЗ-5: поглотители входят в верх зоны, где поток мал, — прирост их веса запаздывает
      const s = S.azT * 0.4, L = 0.9 + 2.4 * S.azFrom.axial, g = Math.min(1, (s / L) * (s / L));
      rods = S.azFrom.rods + (rods - S.azFrom.rods) * g;
    }
    return { rods, void: A_VOID * S.phi, dop: -A_DOP * (S.Tf - 270), xe: -XE_W * S.X, tip: S.tip };
  }
  // ОЗР: эквивалент полностью погружённых стержней (для оператора)
  const ozr = S => { const b = S.axial; return GROUPS.RR * Fr(S.rods.RR, b) + GROUPS.AR * Fr(S.rods.AR, b) + GROUPS.USP * Fs(S.rods.USP); };

  function log(S, kind, text) { S.ev.push({ t: S.t, clock: S.clock, kind, text }); if (S.ev.length > 200) S.ev.shift(); }
  function scram(S, why) {
    if (S.az) return; S.az = true; S.azT = 0; S.azFrom = { RR: S.rods.RR, AR: S.rods.AR, ozr: ozr(S), axial: S.axial, P: S.P, rods: parts(S).rods };
    S.ar.on = false; log(S, 'bad', 'АЗ-5: ' + why); S.why.push({ t: S.t, text: 'АЗ-5: ' + why, ozr: ozr(S), P: S.P });
  }
  // концевой эффект: стержень из верхнего положения сначала вытесняет воду графитом внизу зоны (+ρ), потом входит поглотитель
  function tipEffect(S) {
    if (!S.az || !S.azFrom) return 0;
    const s = S.azT * 0.4;                                    // пройдено, м
    // чем меньше ОЗР, тем больше стержней стоит у верхнего концевика и тем сильнее поток прижат к низу зоны
    const amp = 1.6 * Math.pow(Math.max(0, Math.min(1, (26 - S.azFrom.ozr) / 20)), 1.5) * (0.5 + S.azFrom.axial);
    const shape = s < 1.25 ? Math.sin(Math.PI * s / 2.5) : Math.max(0, 1 - (s - 1.25) / 1.0);   // нарастает до 1,25 м, затем гаснет
    return amp * shape;
  }

  // один шаг модели: dt — секунды реального времени
  function step(S, dt) {
    if (S.broken) return S;
    const sub = Math.max(1, Math.ceil(dt / 0.002)), h = dt / sub;
    // органы регулирования
    if (S.az) { S.azT += dt; const d = AZ_SPEED * dt; S.rods.RR = Math.min(1, S.rods.RR + d); S.rods.AR = Math.min(1, S.rods.AR + d); S.rods.USP = Math.min(1, S.rods.USP + d * 0.5); }
    else {
      S.rods.RR = Math.max(0, Math.min(1, S.rods.RR + S.rodCmd.RR * dt)); S.rods.USP = Math.max(0, Math.min(1, S.rods.USP + S.rodCmd.USP * dt));
      if (!S.ar.on && S.rodCmd.AR) S.rods.AR = Math.max(0, Math.min(1, S.rods.AR + S.rodCmd.AR * dt));   // АР отключён — группа двигается вручную
      if (S.ar.on) {      // автоматический регулятор держит мощность: двигает группу АР, при выходе на край — отключается
        if (S.ar.cur == null) S.ar.cur = S.P; S.ar.cur += Math.max(-0.008 * dt, Math.min(0.008 * dt, S.ar.set - S.ar.cur));   // уставка меняется плавно: ≤ 0,8 % номинала в секунду
        const err = (S.P - S.ar.cur) / Math.max(0.05, S.ar.cur), v = Math.max(-0.03, Math.min(0.03, err * 0.35 + (isFinite(S.period) ? 6 / S.period : 0) * 0.02));
        S.rods.AR = Math.max(0, Math.min(1, S.rods.AR + v * dt));
        if (S.rods.AR <= 0.001 || S.rods.AR >= 0.999) { S.ar.on = false; log(S, 'warn', 'АР отключился: стержни АР в крайнем положении. Переведите стержни РР вручную.'); }
        if (S.P < 0.05) { S.ar.on = false; log(S, 'warn', 'АР отключился: мощность ниже рабочего диапазона регулятора (5 %).'); }
      }
    }
    // насосы: выбег, вибрация, кавитация
    S.pumps.forEach((q, i) => {
      const tgt = q.on ? 1 : 0; q.spin += (tgt - q.spin) * (q.coast ? 0.008 : 0.5) * dt; if (q.spin < 0.005 && !q.on) q.spin = 0;
      const near = S.sub < 0.02 && S.G > 1.15 && q.on;           // всас почти на линии насыщения при большом расходе
      q.cav += ((near ? 0.6 : 0) - q.cav) * 0.3 * dt;
    });
    S.G = Math.max(0.02, flow(S));
    // ксенон, иод, часы (ускоренно)
    const xdt = dt * (S.acc || TIME_ACC);
    S.clock = (S.clock + xdt) % 86400;
    const Pn = Math.max(0, S.P);
    S.I += L_I * (Pn - S.I) * xdt;
    S.X += ((L_X + XE_BURN) * (0.95 * S.I + 0.05 * Pn) - L_X * S.X - XE_BURN * Math.min(Pn, 3) * S.X) * xdt;
    S.X = Math.max(0, S.X);
    // форма поля и концевой эффект
    S.axial += (axialTarget(S) - S.axial) * 0.02 * xdt / 60 + (axialTarget(S) - S.axial) * 0.05 * dt;
    S.tip = tipEffect(S);
    // кинетика (мелкие шаги)
    for (let k = 0; k < sub; k++) {
      S.Tf += (270 + 650 * S.P - S.Tf) / 4.0 * h;
      S.sub += (0.12 * Math.min(S.fw, 1.5) / Math.max(0.1, S.G) - S.sub) / 3 * h;
      S.x = quality(S); S.phi += (voidOf(S.x) - S.phi) / 0.9 * h;
      const r = parts(S); S.comp = r; S.rho = S.excess + r.rods + r.void + r.dop + r.xe + r.tip;
      const rk = S.rho * B; let src = 0; for (let i = 0; i < 6; i++) src += LAM[i] * S.C[i];
      const dP = ((rk - B) / GEN) * S.P + src;
      S.P = Math.max(1e-7, S.P + dP * h);
      for (let i = 0; i < 6; i++) S.C[i] += (BETA[i] / GEN * S.P - LAM[i] * S.C[i]) * h;
    }
    // период по скорости роста мощности
    const prev = S._pp || S.P; S._pp = S.P; const g = Math.log(S.P / prev) / dt; S.gr = (S.gr || 0) + (g - (S.gr || 0)) * Math.min(1, dt / 1.5); S.period = Math.abs(S.gr) < 1e-3 ? Infinity : 1 / S.gr;   // периодомер с фильтром ~1,5 с
    S.maxP = Math.max(S.maxP, S.P);
    // пар, давление, уровень в барабанах-сепараторах
    const steam = Math.max(0, S.P - S.G * S.sub * 0.6);
    if (S.tgAuto) S.tg.forEach(t => { if (t.on) t.load += ((Math.min(steam, 1.05) / 2 + (S.p - 7.0) * 0.4) - t.load) * 0.6 * dt; });
    const out = S.tg.reduce((a, t) => a + (t.on ? Math.max(0, t.load) : 0), 0) * (S.p / 7) + S.bru * 0.6 + (S.p > 7.6 ? (S.p - 7.6) * 4 : 0);   // + главные предохранительные клапаны
    S.p += (steam - out) * 0.35 * dt + (S.P > 1.4 ? (S.P - 1.4) * 2.5 * dt : 0);
    if (S.fwAuto) S.fw += ((steam + S.lvl * -0.004) * (S.fwPumps.filter(Boolean).length >= 2 ? 1 : 0.55) - S.fw) * 0.8 * dt;
    else S.fw *= S.fwPumps.filter(Boolean).length >= 1 ? 1 : 0.9;
    S.fw = Math.max(0, S.fw);
    S.lvl += (S.fw - steam) * 260 * dt;                        // мм
    S.lvl = Math.max(-1500, Math.min(900, S.lvl));
    // защиты
    if (!S.az) {
      if (S.prot.power && S.P > 1.1) scram(S, 'мощность выше 110 % номинала');
      else if (S.prot.period && S.P > 0.003 && S.period > 0 && S.period < 15) scram(S, `период разгона ${S.period.toFixed(0)} с меньше 15 с`);
      else if (S.prot.press && S.p > S.pressLim) scram(S, `давление в барабанах-сепараторах ${S.p.toFixed(2)} МПа`);
      else if (S.prot.level && S.lvl < -600) scram(S, 'уровень в барабанах-сепараторах ниже −600 мм');
      else if (S.prot.tg && S.P > 0.02 && !S.tg.some(t => t.on)) scram(S, 'отключены оба турбогенератора');
    }
    // разрушение
    if (S.P > 3 || S.Tf > 2600) breakdown(S, 'reactor');
    else if (S.p > 10.5) breakdown(S, 'drum');
    else if (S.lvl < -1400 && S.P > 0.15) breakdown(S, 'dryout');
    S.t += dt;
    if (!S._ht || S.t - S._ht >= 0.25) { S._ht = S.t; S.hist.push({ t: S.t, P: S.P, rho: S.rho, ...S.comp, ozr: ozr(S), p: S.p, G: S.G, phi: S.phi }); if (S.hist.length > 720) S.hist.shift(); }
    return S;
  }
  function breakdown(S, kind) { S.broken = { kind, t: S.t, P: S.maxP }; log(S, 'bad', { reactor: 'Разгон на мгновенных нейтронах: разрушение активной зоны', drum: 'Разрыв барабана-сепаратора', dryout: 'Осушение каналов: пережог твэлов' }[kind]); }

  // разбор аварии: какие эффекты внесли вклад за последние секунды
  function analyse(S) {
    const h = S.hist.slice(-80), first = h[0] || {}, last = h[h.length - 1] || {}, az = S.why.find(w => w.text.startsWith('АЗ-5')) || null;
    const d = k => (last[k] || 0) - (first[k] || 0);
    const peakTip = Math.max(0, ...h.map(q => q.tip || 0));
    return { az, ozrAz: az ? az.ozr : null, PAz: az ? az.P : null, peakTip, dVoid: d('void'), dDop: d('dop'), dRods: d('rods'), dXe: d('xe'), maxP: S.maxP, prot: { ...S.prot }, pumps: S.pumps.filter(q => q.on).length, eccs: S.eccs };
  }
  return { NOM, B, TIME_ACC, GROUPS, W_ROD, fresh, step, scram, ozr, parts, xeEq, log, analyse, axialTarget, init, voidOf };
})();
if (typeof module !== 'undefined') module.exports = RB;
