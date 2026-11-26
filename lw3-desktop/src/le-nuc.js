/* =====================================================================
   Раздел «Физика атомного ядра»: общая установка «счётчик Гейгера – Мюллера + блок счётный»
   (ЛР 10, 11, 13). Приборы — картинки (assets/parts: counter-unit, stand, gm-tube, kcl-dish, source),
   поверх — табло, пульт (ручки «Грубо» / «Точно», «Пуск», «Сброс», время счёта, «Сеть»),
   лавины разряда в окне счётчика, треки частиц, щелчки. Время на установке ускорено.
   Модель счётчика (параметры в S.p): порог Us, подъём wB, плато wP с наклоном sl %/100 В, фон bg имп/с,
   мёртвое время tau; скорость от источника задаёт работа (cfg.src). Наблюдаемая скорость m = n/(1 + nτ).
   Состояние установки — S.rig: on, warm, U, T, run {U, T, t, N, src, speed}, last {U, T, N, src}, src.
   ===================================================================== */
function gmRig(cfg) {
  const SPEED = cfg.speed || 20, TIMES = cfg.times || [10, 30, 60, 100], V = { fl: [], tr: [], glow: 0 };
  const NAMES = Object.assign({ kcl: 'соль KCl', none: 'без источника', empty: 'пустая чашка (фон)', A: 'источник 1', B: 'источник 2', AB: 'источники 1 и 2', G: 'источник' }, cfg.names || {});
  const srcName = s => NAMES[s] || s;
  function eff(p, U) {                                   // эффективность счёта: 0 до порога, подъём, плато, резкий рост
    if (U < p.Us) return 0;
    const UB = p.Us + p.wB, UC = UB + p.wP;
    if (U < UB) return Math.pow((U - p.Us) / p.wB, 1.6);
    if (U <= UC) return 1 + p.sl / 100 * (U - UB) / 100;
    return (1 + p.sl / 100 * p.wP / 100) * Math.exp((U - UC) / 25);
  }
  const disch = (p, U) => U > p.Us + p.wB + p.wP + 90;
  const trueRate = (p, U, src) => { const e = eff(p, U); if (!e) return 0; if (disch(p, U)) return 2.4e4; return (cfg.src(p, src) + p.bg) * e; };
  const obsRate = (p, U, src) => { const n = trueRate(p, U, src); return n / (1 + n * p.tau); };
  const rd = S => S.rig;
  const G = {
    V, SPEED, TIMES, eff, disch, trueRate, obsRate, srcName,
    rig0: (U = 250, src = 'none') => ({ on: false, warm: 0, U, T: cfg.T0 || 60, run: null, last: null, src, over: 0 }),
    stateMsg(S) { const R = rd(S); if (!R.on) return 'Включи «Сеть».'; if (R.warm > 0) return 'Счётчик прогревается - подожди.'; if (R.run) return 'Идёт счёт импульсов…'; return null; },
    lastOk(S, T, src) { const R = rd(S), L = R.last; if (!L) return `Нажми «Пуск»: счёт ${T} с.`; if (L.U !== R.U) return 'Напряжение изменено после счёта - нажми «Пуск» ещё раз.';
      if (L.T !== T) return `Время счёта должно быть ${T} с - выбери ${T} с и нажми «Пуск».`; if (L.src !== src) return `Под счётчиком должно быть: ${srcName(src)}.`; return null; },
    start(S, speed) { const R = rd(S); R.run = { U: R.U, T: R.T, t: 0, N: 0, src: R.src, speed: speed || SPEED }; R.last = null; leSndInit(); },
    act(S, c, v) {
      const R = rd(S);
      if (c === 'snd') { leMuteToggle(); return LEA.mute ? 'Звук выключен.' : 'Звук включён: щелчки счётчика.'; }
      if (c === 'power') { R.on = !R.on; R.run = null; R.last = null; if (R.on) { R.warm = 6; R.U = cfg.U0 || 250; leSndInit(); return 'Блок включён. Счётчик прогревается (на занятии - 10–15 минут).'; } R.warm = 0; return; }
      if (!R.on) return 'Сначала включи «Сеть».';
      if (c === 'U') { if (R.run) return 'Идёт счёт: дождись конца или нажми «Сброс».'; R.U = Math.max(250, Math.min(700, R.U + +v)); if (disch(S.p, R.U)) return 'Непрерывный разряд! Немедленно снизь напряжение - рабочая смесь счётчика портится.'; return; }
      if (c === 'T') { if (R.run) return 'Идёт счёт: дождись конца или нажми «Сброс».'; R.T = +v; return; }
      if (c === 'start') { if (R.warm > 0) return 'Счётчик ещё прогревается.'; if (R.run) return; G.start(S); return; }
      if (c === 'reset') { R.run = null; R.last = null; if (cfg.onReset) cfg.onReset(S); return; }
      if (c === 'src') { if (R.run) return 'Идёт счёт: дождись конца или нажми «Сброс».'; R.src = v; R.last = null; return; }
    },
    tick(S, dt) {
      const R = rd(S), p = S.p; let ret;
      if (R.warm > 0) { R.warm = Math.max(0, R.warm - dt); if (!R.warm) { leSnd.beep(990, .1); ret = 'render'; } }
      V.glow = R.on && !R.warm && disch(p, R.U) ? Math.min(1, V.glow + dt * 4) : Math.max(0, V.glow - dt * 3);
      if (V.glow > .5) R.over = (R.over || 0) + dt;
      let budget = dt * (R.run ? R.run.speed : SPEED);
      while (R.run && budget > 1e-12) {
        const run = R.run, d = Math.min(budget, run.T - run.t), m = obsRate(p, run.U, run.src), k = lePoisson(m * d);
        run.N += k; run.t += d; budget -= d;
        const show = LEA.lite ? Math.min(k, 2) : Math.min(k, 6), vol = m * (run.speed / SPEED) > 200 ? .1 : .45;
        for (let i = 0; i < show; i++) {
          V.fl.push({ y: .08 + Math.random() * .84, a: 0 });
          const tot = trueRate(p, run.U, run.src) / Math.max(eff(p, run.U), 1e-9);
          if (!LEA.lite && run.src !== 'none' && run.src !== 'empty' && Math.random() < (tot - p.bg) / tot) V.tr.push({ x: (run.src === 'B' ? 24 : run.src === 'A' ? -24 : 0) + (Math.random() - .5) * 30, dx: (Math.random() - .5) * 36, a: 0 });
          leSnd.click(vol, Math.random() * dt);
        }
        if (run.t >= run.T - 1e-9) {
          R.last = { U: run.U, T: run.T, N: run.N, src: run.src }; R.run = null;
          const r = cfg.onDone ? cfg.onDone(S, R.last) : null;
          if (r === 'again') { G.start(S, run.speed); R.last = null; } else { leSnd.beep(880, .14); ret = 'render'; }
        }
      }
      V.fl = V.fl.filter(f => (f.a += dt) < .16).slice(-40); V.tr = V.tr.filter(t => (t.a += dt) < .14).slice(-20);
      return ret;
    },
    knobs: S => (cfg.fixedU ? [] : [{ c: 'U', x: 44, y: 236, r: 18, step: 10 }, { c: 'U', x: 94, y: 236, r: 13, step: 1 }]),
    hits: S => [{ c: 'power', v: '', x: 132, y: 270, w: 76, h: 24 }, { c: 'start', v: '', x: 132, y: 206, w: 56, h: 24 }, { c: 'reset', v: '', x: 194, y: 206, w: 56, h: 24 },
      ...TIMES.map((t, i) => ({ c: 'T', v: String(t), x: 132 + i * 44, y: 238, w: 40, h: 22 })), { c: 'snd', v: '', x: 256, y: 206, w: 50, h: 24 }],
    /* панель под установкой: те же органы, что на приборе (и для клавиатуры) */
    ctl(S, srcRow = '', extra = '') {
      const R = rd(S), run = !!R.run;
      const p1 = `<div class="lw-ctl-row">${leB('power', R.on ? `${ic('circle-check')} «Сеть»: ${R.warm > 0 ? 'прогрев…' : 'включено'}` : 'Включить «Сеть»', '', R.on ? '' : 'line')}${leB('snd', LEA.mute ? `${ic('volume-x')} Звук выключен` : `${ic('volume-2')} Звук`, '', 'line')}</div>`;
      const kn = cfg.fixedU ? '' : `<div class="lw-screw le-knob"><span>Напряжение</span>${leB('U', '−10', '-10', 'lp-btn', !R.on || run)}${leB('U', '−1', '-1', 'lp-btn', !R.on || run)}<b>${R.U} В</b>${leB('U', '+1', '1', 'lp-btn', !R.on || run)}${leB('U', '+10', '10', 'lp-btn', !R.on || run)}</div>`;
      const tm = `<div class="lw-ctl-row"><span class="mute small">Время счёта:</span>${TIMES.map(t => leB('T', `${t} с`, t, R.T === t ? '' : 'line', run)).join('')}</div>`;
      const go = `<div class="lw-ctl-row">${leB('start', `${ic('play')} Пуск`, '', '', !R.on || R.warm > 0 || run)}${leB('reset', `${ic('rotate-ccw')} Сброс`, '', 'line', !R.on)}</div>`;
      return p1 + kn + tm + go + extra + srcRow;
    },
    srcRow: (S, list, label = 'Под счётчиком:') => `<div class="lw-ctl-row"><span class="mute small">${label}</span>${list.map(([k, t]) => leB('src', t, k, rd(S).src === k ? '' : 'line', !!rd(S).run)).join('')}</div>`,
    /* установка: 1 — блок счётный, 2 — счётчик в зажиме штатива, 3 — источник под окном; возвращает точки для подписей */
    draw(c, S) {
      const R = rd(S), run = R.run, L = R.last, on = R.on;
      const N = run ? run.N : L ? L.N : 0, t = run ? Math.floor(run.t) : L ? L.T : 0, T = run ? run.T : R.T;
      const bx = 12, by = 48, bw = 300, bh = leImg(c, 'counter-unit', bx, by, bw, .47);
      const dL = [bx + .087 * bw, by + .277 * bh, .386 * bw, .326 * bh], dR = [bx + .52 * bw, by + .277 * bh, .392 * bw, .326 * bh];
      leLcd(c, dL[0] + 3, dL[1] + 3, dL[2] - 6, dL[3] - 6, on ? String(N) : '', 'имп', on && !R.warm);
      leLcd(c, dR[0] + 3, dR[1] + 3, dR[2] - 6, dR[3] - 6, on ? (R.warm > 0 ? '----' : String(R.U)) : '', 'В', on);
      leText(c, '1 - блок счётный', bx + bw / 2, by - 9, { size: 9.5 });
      if (run) { c.fillStyle = '#E5484D'; c.beginPath(); c.arc(dL[0] + 10, dL[1] - 7, 3.5 + Math.sin(performance.now() / 120), 0, 7); c.fill(); leText(c, cfg.runLabel ? cfg.runLabel(S) : 'идёт счёт', dL[0] + 18, dL[1] - 7, { size: 8.5, align: 'left', weight: 700 }); }
      c.fillStyle = '#D3D9E2'; leRR(c, bx + 4, 198, bw - 8, 104, 10); c.fill(); c.strokeStyle = '#1D2A3E'; c.lineWidth = 2; c.stroke();
      const ang = U => -Math.PI / 2 + (U - 250) / 450 * Math.PI * 1.5;
      leDrawKnob(c, { x: 44, y: 236, r: 18 }, ang(Math.round(R.U / 10) * 10)); leDrawKnob(c, { x: 94, y: 236, r: 13 }, -Math.PI / 2 + (R.U % 10) / 10 * Math.PI * 2);
      leText(c, 'ГРУБО', 44, 264, { size: 8, color: '#2A3342', weight: 800 }); leText(c, 'ТОЧНО', 94, 264, { size: 8, color: '#2A3342', weight: 800 });
      leDrawBtn(c, { x: 132, y: 206, w: 56, h: 24 }, 'ПУСК', !!run); leDrawBtn(c, { x: 194, y: 206, w: 56, h: 24 }, 'СБРОС'); leDrawBtn(c, { x: 256, y: 206, w: 50, h: 24 }, LEA.mute ? 'зв. ✕' : 'звук');
      TIMES.forEach((tt, i) => leDrawBtn(c, { x: 132 + i * 44, y: 238, w: 40, h: 22 }, tt + ' с', R.T === tt, '#3A4556'));
      leDrawBtn(c, { x: 132, y: 270, w: 76, h: 24 }, on ? 'СЕТЬ ВКЛ' : 'СЕТЬ', on, '#5A2A2E');
      c.fillStyle = !on ? '#4A2025' : R.warm > 0 ? (Math.sin(performance.now() / 160) > 0 ? '#F2B544' : '#6B4A14') : '#3FD27F'; c.beginPath(); c.arc(120, 282, 4.5, 0, 7); c.fill();
      leLcd(c, 216, 270, 90, 24, on && !R.warm ? `${t}/${T}` : '', 'с', on); leText(c, `время ×${run ? run.speed : SPEED}`, 70, 288, { size: 8, color: '#5A6576' });
      // счётчик в кольце зажима штатива; основание штатива — на столе (верх стола — y 312)
      const sw = 180, sh = sw * 1.485, sx = 330, sy = 318 - .992 * sh; leImg(c, 'stand', sx, sy, sw, 1.485);
      const rx = sx + .853 * sw, ry = sy + .28 * sh, baseTop = sy + .9 * sh;
      const tw = 34, th = tw * 3.83, tx = rx - tw / 2, ty = ry - .12 * th + (cfg.lift ? cfg.lift(S) : 0); leImg(c, 'gm-tube', tx, ty, tw, 3.83);   // счётчик можно поднять или опустить в зажиме
      const ringIm = leSprite('stand');
      if (ringIm) { const k = ringIm.naturalWidth / sw, x0 = rx - .14 * sw, y0 = ry, w0 = .28 * sw, h0 = .1 * sh; c.drawImage(ringIm, (x0 - sx) * k, (y0 - sy) * k, w0 * k, h0 * k, x0, y0, w0, h0); }
      const win = [tx + .327 * tw, ty + .349 * th, .397 * tw, .417 * th], wx = win[0] + win[2] / 2, wy0 = win[1] + 4, wy1 = win[1] + win[3] - 4;
      c.save(); leRR(c, win[0], win[1], win[2], win[3], win[2] / 2); c.clip();
      c.fillStyle = '#0D1522'; c.fillRect(win[0], win[1], win[2], win[3]);
      if (V.glow > 0) { c.fillStyle = `rgba(190,140,255,${.75 * V.glow * (.75 + .25 * Math.random())})`; c.fillRect(win[0], win[1], win[2], win[3]); }
      V.fl.forEach(f => { const k = 1 - f.a / .16, y = wy0 + f.y * (wy1 - wy0), spread = (wy1 - wy0) * Math.min(1, f.a / .05);
        const gg = c.createLinearGradient(0, y - spread, 0, y + spread); gg.addColorStop(0, 'rgba(120,220,255,0)'); gg.addColorStop(.5, `rgba(170,240,255,${.9 * k})`); gg.addColorStop(1, 'rgba(120,220,255,0)');
        c.strokeStyle = gg; c.lineWidth = 6; c.beginPath(); c.moveTo(wx, y - spread); c.lineTo(wx, y + spread); c.stroke();
        if (!LEA.lite) { c.fillStyle = `rgba(220,252,255,${.95 * k})`; c.beginPath(); c.arc(wx, y, 2 + 4 * k, 0, 7); c.fill(); } });
      c.strokeStyle = 'rgba(232,238,246,.9)'; c.lineWidth = 1.1; c.beginPath(); c.moveTo(wx, wy0); c.lineTo(wx, wy1); c.stroke(); c.restore();
      leText(c, '2 - счётчик СБТ-13', rx, sy - 8, { size: 9.5 });
      const tb = ty + th * .99, dishH = 66 * .42, srcH = 24 * 1.13, under = R.src;
      V.tr.forEach(q => { const k = 1 - q.a / .14, y0 = under === 'kcl' ? baseTop - dishH + 6 : baseTop - srcH + 4; c.strokeStyle = `rgba(255,200,90,${.95 * k})`; c.lineWidth = 1.6; c.beginPath(); c.moveTo(wx + q.x * .55, y0); c.lineTo(wx + q.x * .2 + q.dx * .15, tb + 1); c.stroke(); });
      const dish = (x, y, salt = true) => { if (salt) leImg(c, 'kcl-dish', x, y, 66, .42); else { leImg(c, 'kcl-dish', x, y, 66, .42); c.fillStyle = '#C9D0DA'; leRR(c, x + 6, y + 2, 54, 9, 4); c.fill(); } },
        disk = (x, y, lab) => { leImg(c, 'source', x - 12, y, 24, 1.13); leText(c, lab, x, y - 6, { size: 9, weight: 800, color: leAcc() }); };
      const items = cfg.items || ['kcl', 'A', 'B'];
      if (items.includes('kcl')) { if (under === 'kcl') { dish(wx - 33, baseTop - dishH); leText(c, '3 - KCl', wx - 44, baseTop - 12, { size: 9.5, align: 'right' }); } else if (under !== 'empty') dish(352, 322); }
      if (items.includes('empty') && under === 'empty') { dish(wx - 33, baseTop - dishH, false); leText(c, 'пустая чашка', wx - 44, baseTop - 12, { size: 9.5, align: 'right' }); }
      if (items.includes('A')) { const a = under === 'A' || under === 'AB', b = under === 'B' || under === 'AB';
        disk(a ? wx - 13 : 440, a ? baseTop - srcH : 324, '1'); disk(b ? wx + 13 : 470, b ? baseTop - srcH : 324, '2'); }
      if (items.includes('G')) { const g = under === 'G'; disk(g ? wx : 450, g ? baseTop - srcH : 324, cfg.gLabel || 'γ'); }
      leWire(c, [[rx, ty + 2], [bx + bw - 4, by + bh * .5]], '#3E7BFA');
      if (V.glow > .3) leText(c, 'НЕПРЕРЫВНЫЙ РАЗРЯД - снизь напряжение!', 450, 30, { size: 10.5, color: '#FF6B6B', weight: 800 });
      return { wx, tb, baseTop };
    },
    /* панель графика на столе (слева внизу) */
    panel(c, title, xl) {
      const lt = typeof L3_THEME !== 'undefined' && L3_THEME === 'light';
      c.fillStyle = lt ? 'rgba(255,255,255,.9)' : 'rgba(12,20,32,.88)'; leRR(c, 12, 322, 320, 122, 8); c.fill();
      leText(c, title, 34, 333, { size: 8.5, align: 'left', color: lt ? '#2A3342' : '#C9D4E3' }); leText(c, xl, 320, 434, { size: 8.5, align: 'right', color: lt ? '#2A3342' : '#C9D4E3' });
      c.strokeStyle = lt ? '#9AA6B6' : '#3A4659'; c.lineWidth = 1; c.beginPath(); c.moveTo(34, 340); c.lineTo(34, 428); c.lineTo(318, 428); c.stroke();
      return lt;
    }
  };
  return G;
}
