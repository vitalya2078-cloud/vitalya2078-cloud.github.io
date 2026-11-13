/* =====================================================================
   Сцены роликов для глав 2–33 (координаты 720×400, рисуются через labPainter).
   В уроке ролик задаётся сценарием: video: [{ s: 'тип:параметры', t: 'текст диктора' }, …]
   Типы:  title | lab:модель[:a,b] | f:формула\nформула | key:мысль | list:а;б;в | cmp:Заголовок;текст|Заголовок;текст
          graph:выражение от x|xmin|xmax|подпись  и иллюстрации (VS ниже).
   p — доля сцены 0…1, t — секунды от начала сцены.
   ===================================================================== */
const VS_E = q => 1 - (1 - clamp(q, 0, 1)) ** 3;
const VS = {
  /* ----- молекулярная физика и термодинамика ----- */
  gas(d, a, p, t) {
    const hot = a[0] === 'hot', x = 160, y = 70, w = 400, h = 260;
    d.rect(x, y, w, h, 'rgba(108,140,255,.06)', LC.mute, 3, 10);
    d.c.save(); d.c.beginPath(); d.c.rect(x + 3, y + 3, w - 6, h - 6); d.c.clip(); gasDots(d, x + 3, y + 3, w - 6, h - 6, 40, hot ? 2.4 : 1.2, t, 7); d.c.restore();
    for (let i = 0; i < 6; i++) { const yy = y + 30 + i * 40, hit = (t * 2 + i * .37) % 1 < .15; if (hit) d.arrow(x + w + 4, yy, x + w + 34, yy, LC.coral, 3); }
    d.tag('давление — удары молекул о стенки', 360, 360, LC.gold);
  },
  maxwell(d, a, p, t) {
    const gx = 90, gy = 330, gw = 560, gh = 240, f = (v, T) => v * v * Math.exp(-v * v / T) / T ** 1.5;
    d.line(gx, gy, gx + gw, gy, LC.mute, 2); d.line(gx, gy, gx, gy - gh, LC.mute, 2); d.text('υ', gx + gw + 10, gy, { size: 14 }); d.text('f(υ)', gx - 6, gy - gh - 14, { size: 13 });
    [[1, LC.blue, 'T₁'], [2.6, LC.coral, 'T₂ > T₁']].forEach(([T, col, lab], k) => {
      const q = VS_E((p - k * .3) * 2.2); if (q <= 0) return; const pts = [];
      for (let i = 0; i <= 120 * q; i++) { const v = i / 120 * 4; pts.push([gx + v / 4 * gw, gy - f(v, T) * gh * 1.15]); }
      d.path(pts, col, 3.5); const vp = Math.sqrt(T); if (q > .9) { d.line(gx + vp / 4 * gw, gy, gx + vp / 4 * gw, gy - f(vp, T) * gh * 1.15, col, 1.5, [5, 5]); d.tag(lab, gx + vp / 4 * gw + 40, gy - f(vp, T) * gh * 1.15 - 18, col); }
    });
    if (p > .7) d.tag('при нагреве максимум смещается вправо и опускается', 420, 75, LC.text);
  },
  pv(d, a, p, t) {
    const kind = a[0] || 'iso', gx = 110, gy = 330, gw = 470, gh = 250;
    d.line(gx, gy, gx + gw, gy, LC.mute, 2); d.line(gx, gy, gx, gy - gh, LC.mute, 2); d.text('V', gx + gw + 10, gy, { size: 14 }); d.text('p', gx - 16, gy - gh, { size: 14 });
    const X = v => gx + v * gw, Y = q => gy - q * gh, curve = (fn, v0, v1, col, lab, k) => {
      const q = VS_E((p - k * .22) * 3); if (q <= 0) return; const pts = []; for (let i = 0; i <= 60 * q; i++) { const v = v0 + (v1 - v0) * i / 60; pts.push([X(v), Y(fn(v))]); }
      d.path(pts, col, 3.5); if (q > .95 && lab) d.tag(lab, X((v0 + v1) / 2) + 30, Y(fn((v0 + v1) / 2)) - 18, col);
    };
    if (kind === 'iso') {
      curve(v => .08 / v, .12, .9, LC.mint, 'изотерма pV = const', 0);
      curve(() => .7, .15, .7, LC.gold, 'изобара', 1);
      curve(v => v < .55 ? .2 : .2, .55, .55, null, '', 2); if (p > .45) { const q = VS_E((p - .45) * 3); d.line(X(.85), Y(.2), X(.85), Y(.2 + .55 * q), LC.coral, 3.5); if (q > .9) d.tag('изохора', X(.85) + 40, Y(.5), LC.coral); }
      if (p > .7) curve(v => .045 / v ** 1.4, .14, .9, LC.violet, 'адиабата (круче изотермы)', 3);
    } else {
      // цикл Карно: две изотермы и две адиабаты
      // точки цикла: 1→2 изотерма T₁, 2→3 адиабата, 3→4 изотерма T₂, 4→1 адиабата (TV^(γ−1) = const)
      // схема: показатель адиабаты увеличен, чтобы изотермы и адиабаты были хорошо различимы
      const T1 = .16, T2 = .06, g = 2.2, k = (T1 / T2) ** (1 / (g - 1)), va = .18, vb = .33, vc = vb * k, vd = va * k;
      const pts = []; const seg = (fn, v0, v1) => { for (let i = 0; i <= 30; i++) { const v = v0 + (v1 - v0) * i / 30; pts.push([X(v), Y(fn(v))]); } };
      seg(v => T1 / v, va, vb); seg(v => T1 / vb * (vb / v) ** g, vb, vc); seg(v => T2 / v, vc, vd); seg(v => T1 / va * (va / v) ** g, vd, va);
      const n = Math.floor(pts.length * VS_E(p * 1.4)); d.path(pts.slice(0, Math.max(2, n)), LC.gold, 3.5);
      if (p > .75) { d.path(pts, null, 0, 'rgba(255,194,75,.12)'); d.tag('площадь цикла = работа за цикл', 360, 50, LC.gold); d.tag('T₁', X(va) + 30, Y(T1 / va) - 10, LC.coral); d.tag('T₂', X(vd) + 40, Y(T2 / vd) + 20, LC.blue); }
    }
  },
  phase(d, a, p, t) {
    const gx = 110, gy = 330, gw = 480, gh = 250, X = u => gx + u * gw, Y = u => gy - u * gh;
    d.line(gx, gy, gx + gw, gy, LC.mute, 2); d.line(gx, gy, gx, gy - gh, LC.mute, 2); d.text('T', gx + gw + 10, gy, { size: 14 }); d.text('p', gx - 16, gy - gh, { size: 14 });
    const tp = [.35, .25], q = VS_E(p * 2);
    d.path([[X(.1), Y(.02)], [X(tp[0]), Y(tp[1])]].map((pt, i) => i ? [X(.1 + (tp[0] - .1) * q), Y(.02 + (tp[1] - .02) * q)] : pt), LC.blue, 3.5);
    if (p > .25) { const r = VS_E((p - .25) * 2); d.path([[X(tp[0]), Y(tp[1])], [X(tp[0] + .45 * r), Y(tp[1] + .55 * r)]], LC.coral, 3.5); }
    if (p > .45) { const r = VS_E((p - .45) * 2); d.path([[X(tp[0]), Y(tp[1])], [X(tp[0] + .08 * r), Y(tp[1] + .72 * r)]], LC.mint, 3.5); }
    if (p > .65) { d.circle(X(tp[0]), Y(tp[1]), 8, LC.gold); d.tag('тройная точка', X(tp[0]) + 70, Y(tp[1]) + 20, LC.gold); d.tag('твёрдое', X(.2), Y(.7), LC.text); d.tag('жидкость', X(.55), Y(.75), LC.text); d.tag('газ', X(.7), Y(.2), LC.text); }
  },
  surface(d, a, p, t) {
    // капилляр: подъём жидкости в узкой трубке
    const wy = 300; d.rect(80, wy, 560, 70, null, null); d.c.fillStyle = LC.water; d.c.fillRect(80, wy, 560, 70); d.line(80, wy, 640, wy, LC.waterTop, 3);
    [[200, 40, 1], [360, 24, 1.7], [500, 14, 2.9]].forEach(([x, w, k]) => {
      const hgt = 60 * k * VS_E(p * 1.6);
      d.rect(x - w / 2, 80, w, 260, 'rgba(232,236,246,.06)', LC.mute, 2, 3);
      d.c.fillStyle = LC.waterTop; d.c.fillRect(x - w / 2 + 2, wy - hgt, w - 4, hgt);
      d.c.strokeStyle = LC.waterTop; d.c.lineWidth = 2.5; d.c.beginPath(); d.c.moveTo(x - w / 2 + 2, wy - hgt - 6); d.c.quadraticCurveTo(x, wy - hgt + 4, x + w / 2 - 2, wy - hgt - 6); d.c.stroke();
    });
    if (p > .6) d.tag('чем уже трубка, тем выше поднимается жидкость: h = 2σ/(ρgr)', 360, 72, LC.gold);
  },
  /* ----- электричество и магнетизм ----- */
  efield(d, a, p, t) {
    const like = a[0] === '++', q1 = [250, 200], q2 = [470, 200], q = VS_E(p * 1.5);
    for (let i = 0; i < 14; i++) {
      const ang = i / 14 * Math.PI * 2, pts = []; let x = q1[0] + 18 * Math.cos(ang), y = q1[1] + 18 * Math.sin(ang);
      for (let s = 0; s < 160 * q; s++) {
        const r1 = Math.hypot(x - q1[0], y - q1[1]), r2 = Math.hypot(x - q2[0], y - q2[1]); if (r2 < 16 || x < 20 || x > 700 || y < 20 || y > 380) break;
        let ex = (x - q1[0]) / r1 ** 3 + (like ? 1 : -1) * (x - q2[0]) / r2 ** 3, ey = (y - q1[1]) / r1 ** 3 + (like ? 1 : -1) * (y - q2[1]) / r2 ** 3; const m = Math.hypot(ex, ey);
        x += ex / m * 3; y += ey / m * 3; pts.push([x, y]);
      }
      d.path(pts, 'rgba(255,194,75,.6)', 2);
    }
    d.circle(q1[0], q1[1], 22, LC.coral); d.text('+', q1[0], q1[1] + 1, { col: '#fff', size: 20, align: 'center', bold: true });
    d.circle(q2[0], q2[1], 22, like ? LC.coral : LC.blue); d.text(like ? '+' : '−', q2[0], q2[1] + 1, { col: '#fff', size: 20, align: 'center', bold: true });
    if (p > .6) d.tag(like ? 'одноимённые заряды отталкиваются' : 'линии идут от «+» к «−»', 360, 360, LC.gold);
  },
  cap(d, a, p, t) {
    const q = VS_E(p * 1.6), x1 = 270, x2 = 450;
    d.rect(x1 - 14, 90, 14, 220, LC.coral, null, 0, 3); d.rect(x2, 90, 14, 220, LC.blue, null, 0, 3);
    for (let i = 0; i < 8; i++) { const y = 105 + i * 27; d.text('+', x1 - 26, y, { col: LC.coral, size: 16, bold: true, align: 'center' }); d.text('−', x2 + 28, y, { col: LC.blue, size: 16, bold: true, align: 'center' }); if (q > i / 8) d.arrow(x1 + 6, y, x1 + 6 + (x2 - x1 - 12) * Math.min(1, q * 1.2), y, LC.gold, 2.5); }
    if (p > .6) { d.tag('E = σ/(εε₀) — поле однородно', 360, 70, LC.gold); d.tag('C = εε₀S/d', 360, 350, LC.mint); }
  },
  bfield(d, a, p, t) {
    const cx = 360, cy = 200;
    for (let r = 40; r <= 170; r += 32) { const q = VS_E((p - r / 400) * 2); if (q <= 0) continue; d.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + 2 * Math.PI * q, 'rgba(108,140,255,.8)', 2.5); const ang = t * 1.2 + r; d.arrow(cx + r * Math.cos(ang), cy + r * Math.sin(ang), cx + r * Math.cos(ang + .15), cy + r * Math.sin(ang + .15), LC.blue, 2.5); }
    d.circle(cx, cy, 18, LC.gold); d.circle(cx, cy, 5, '#1b2542', null);
    if (p > .5) { d.tag('ток к нам — линии B против часовой стрелки', 360, 70, LC.gold); d.tag('B = μ₀I/(2πr)', 600, 360, LC.mint); }
  },
  ac(d, a, p, t) {
    const gx = 70, gy = 200, gw = 590, A = 110, ph = (a[0] ? +a[0] : 90) * RAD, n = VS_E(p * 1.4);
    d.line(gx, gy, gx + gw, gy, LC.mute, 1.5); d.line(gx, gy - 140, gx, gy + 140, LC.mute, 1.5);
    const draw = (sh, col, amp) => { const pts = []; for (let i = 0; i <= 200 * n; i++) { const x = i / 200; pts.push([gx + x * gw, gy - amp * Math.sin(x * 4 * Math.PI - sh + t * 2)]); } d.path(pts, col, 3.5); };
    draw(0, LC.gold, A); if (p > .3) draw(ph, LC.mint, A * .7);
    if (p > .6) { d.tag('U', gx + 30, gy - A - 10, LC.gold); d.tag('I', gx + 70, gy - A * .7 - 10, LC.mint); d.tag('сдвиг фаз φ = ' + n_(ph / RAD) + '°', 520, 360, LC.text); }
  },
  pn(d, a, p, t) {
    const x0 = 140, x1 = 580, mid = 360, y0 = 110, h = 180;
    d.rect(x0, y0, mid - x0, h, 'rgba(255,122,89,.12)', LC.coral, 2, 8); d.rect(mid, y0, x1 - mid, h, 'rgba(108,140,255,.12)', LC.blue, 2, 8);
    d.text('p', (x0 + mid) / 2, y0 - 18, { col: LC.coral, size: 18, bold: true, align: 'center' }); d.text('n', (mid + x1) / 2, y0 - 18, { col: LC.blue, size: 18, bold: true, align: 'center' });
    for (let i = 0; i < 24; i++) {
      const fx = (i * 37 % 100) / 100, fy = (i * 53 % 100) / 100, j = (Math.sin(t * 2 + i) + 1) * 6;
      const hx = x0 + 15 + fx * (mid - x0 - 60), ex = mid + 45 + fx * (x1 - mid - 60), yy = y0 + 15 + fy * (h - 30);
      d.circle(hx + j, yy, 7, null, LC.coral, 2.5); d.circle(ex - j, yy, 6, LC.blue, null);
    }
    d.rect(mid - 22, y0, 44, h, 'rgba(255,194,75,.12)', null, 0, 0); if (p > .4) d.tag('запирающий слой', mid, y0 + h + 24, LC.gold);
    if (p > .65) d.tag('○ дырки   ● электроны', 360, 360, LC.text);
  },
  domain(d, a, p, t) {
    // ферромагнетик: домены с хаотичными моментами выстраиваются по внешнему полю
    const H = VS_E((p - .25) * 2);
    for (let i = 0; i < 6; i++) for (let j = 0; j < 4; j++) {
      const x = 100 + i * 90, y = 80 + j * 72, r0 = Math.sin(i * 12.9 + j * 7.3) * Math.PI, ang = r0 * (1 - H);
      d.rect(x, y, 84, 66, 'rgba(180,140,255,.08)', LC.line, 1.5, 6);
      d.arrow(x + 42 - 26 * Math.cos(ang), y + 33 - 26 * Math.sin(ang), x + 42 + 26 * Math.cos(ang), y + 33 + 26 * Math.sin(ang), LC.violet, 3);
    }
    if (H > 0) { d.arrow(120, 375, 120 + 480 * H, 375, LC.gold, 3.5, 'H'); }
    if (p > .7) d.tag('во внешнем поле домены выстраиваются', 360, 52, LC.gold);
  },
  hyst(d, a, p, t) {
    const gx = 360, gy = 210, sx = 230, sy = 140; d.line(gx - sx - 20, gy, gx + sx + 20, gy, LC.mute, 2); d.line(gx, gy - sy - 20, gx, gy + sy + 20, LC.mute, 2);
    d.text('H', gx + sx + 26, gy, { size: 14 }); d.text('B', gx + 10, gy - sy - 22, { size: 14 });
    const up = [], dn = []; for (let i = 0; i <= 80; i++) { const h = -1 + 2 * i / 80; up.push([gx + h * sx, gy - Math.tanh(4 * (h - .25)) * sy]); dn.push([gx - h * sx, gy - Math.tanh(4 * (-h + .25)) * sy]); }
    const loop = up.concat(dn), n = Math.floor(loop.length * VS_E(p * 1.3)); d.path(loop.slice(0, Math.max(2, n)), LC.violet, 3.5);
    if (p > .7) { d.circle(gx, gy - Math.tanh(4 * .25) * sy, 6, LC.gold); d.tag('Bᵣ — остаточная индукция', gx + 140, gy - Math.tanh(1) * sy - 26, LC.gold); d.circle(gx + .25 * sx, gy, 6, LC.coral); d.tag('H_c', gx + .25 * sx + 30, gy + 22, LC.coral); }
  },
  /* ----- колебания и волны ----- */
  standing(d, a, p, t) {
    const x0 = 80, x1 = 640, y = 200, L = x1 - x0, k = 3;
    // огибающая (крайние положения струны) и мгновенная форма
    [-1, 1].forEach(s => { const pts = []; for (let x = 0; x <= L; x += 4) pts.push([x0 + x, y - 90 * s * Math.sin(k * Math.PI * x / L)]); d.path(pts, 'rgba(61,214,195,.22)', 1.5, null, [5, 5]); });
    { const pts = []; for (let x = 0; x <= L; x += 4) pts.push([x0 + x, y - 90 * Math.sin(k * Math.PI * x / L) * Math.cos(t * 4)]); d.path(pts, LC.cyan, 3.5); }
    for (let i = 0; i <= k; i++) { const x = x0 + i * L / k; d.circle(x, y, 7, LC.gold); if (p > .4) d.text('узел', x, y + 28, { col: LC.gold, size: 11, align: 'center' }); }
    if (p > .6) d.tag('расстояние между узлами = λ/2', 360, 72, LC.gold);
  },
  doppler(d, a, p, t) {
    const v = 1.1, sx = 200 + (t * 40) % 300;
    for (let i = 0; i < 9; i++) { const age = (t * 1.5 + i * .6) % 5.4, cx = sx - v * 40 * age / 1.5, r = age * 45; d.c.globalAlpha = Math.max(0, 1 - age / 5.4); d.arc(cx, 200, r, 0, Math.PI * 2, LC.cyan, 2.5); d.c.globalAlpha = 1; }
    d.circle(sx, 200, 14, LC.coral); d.arrow(sx + 18, 200, sx + 70, 200, LC.mint, 3, 'υ');
    if (p > .4) { d.tag('впереди волны сжаты — частота выше', 560, 70, LC.gold); d.tag('сзади растянуты — ниже', 160, 340, LC.blue); }
  },
  emwave(d, a, p, t) {
    const x0 = 60, x1 = 660, y = 210, lam = 200, n = VS_E(p * 1.5), ph = t * 3;
    const E = [], B = []; for (let x = 0; x <= (x1 - x0) * n; x += 4) { const s = Math.sin(x / lam * 2 * Math.PI - ph); E.push([x0 + x, y - 100 * s]); B.push([x0 + x + 40 * s * .5, y + 40 * s * .5]); }
    d.line(x0, y, x1, y, LC.mute, 1.5); d.path(E, LC.gold, 3.5); d.path(B, LC.blue, 3);
    for (let x = 0; x <= (x1 - x0) * n; x += 40) { const s = Math.sin(x / lam * 2 * Math.PI - ph); d.line(x0 + x, y, x0 + x, y - 100 * s, 'rgba(255,194,75,.35)', 1.5); }
    if (p > .5) { d.tag('E', x0 + 50, y - 120, LC.gold); d.tag('B', x0 + 90, y + 60, LC.blue); d.tag('E ⊥ B ⊥ направлению, υ = c', 520, 360, LC.text); }
  },
  /* ----- оптика ----- */
  huygens(d, a, p, t) {
    const sx = 300; d.rect(sx - 6, 40, 12, 140, LC.mute, null, 0, 2); d.rect(sx - 6, 220, 12, 140, LC.mute, null, 0, 2);
    for (let i = 0; i < 6; i++) { const x = 60 + ((t * 50 + i * 40) % 240); d.line(x, 60, x, 340, 'rgba(61,214,195,.6)', 2.5); }
    for (let i = 0; i < 6; i++) { const r = (t * 50 + i * 40) % 260; if (r > 5) d.arc(sx, 200, r, -Math.PI / 2, Math.PI / 2, 'rgba(61,214,195,' + (1 - r / 280).toFixed(2) + ')', 2.5); }
    if (p > .5) d.tag('каждая точка волнового фронта — источник вторичных волн', 360, 375, LC.gold);
  },
  polar(d, a, p, t) {
    const ang = (a[0] ? +a[0] : 60 * Math.sin(t * .6) + 30) * RAD;
    const pol = (x, rot, lab) => { d.rect(x - 8, 90, 16, 220, 'rgba(232,236,246,.08)', LC.mute, 2, 4); for (let i = 0; i < 9; i++) { const y = 110 + i * 22; d.line(x - 6 * Math.sin(rot), y - 8 * Math.cos(rot), x + 6 * Math.sin(rot), y + 8 * Math.cos(rot), LC.mute, 1.5); } d.text(lab, x, 330, { size: 12, align: 'center' }); };
    for (let i = 0; i < 6; i++) { const q = i / 6 * Math.PI; d.line(110 - 30 * Math.cos(q), 200 - 30 * Math.sin(q), 110 + 30 * Math.cos(q), 200 + 30 * Math.sin(q), LC.gold, 2.5); }
    d.text('естественный', 110, 250, { size: 12, align: 'center' });
    pol(250, 0, 'поляризатор'); d.line(330, 165, 330, 235, LC.gold, 3.5); pol(450, ang, 'анализатор');
    const I = Math.cos(ang) ** 2; d.line(560, 200 - 35 * Math.sqrt(I), 560, 200 + 35 * Math.sqrt(I), LC.gold, 3.5); d.c.globalAlpha = .2 + .8 * I; d.circle(640, 200, 30, LC.gold, null); d.c.globalAlpha = 1;
    d.tag('I = I₀cos²α, α = ' + n_(Math.abs(ang / RAD)) + '°', 520, 360, LC.gold);
  },
  prism(d, a, p, t) {
    d.path([[300, 300], [380, 90], [460, 300]], LC.text, 2.5, 'rgba(180,200,255,.1)'); d.line(60, 220, 340, 200, '#fff', 3.5);
    ['#FF4D6D', '#FF9F43', '#FFD93D', '#3DD6A0', '#4D9BFF', '#9B6BFF'].forEach((c, i) => { const q = VS_E((p - .1) * 2); d.line(410, 205, 410 + 250 * q, 170 + i * 26 * q + 10, c, 3); });
    if (p > .6) d.tag('n зависит от λ: фиолетовый преломляется сильнее', 360, 360, LC.gold);
  },
  /* ----- квантовая физика ----- */
  photo(d, a, p, t) {
    d.rect(420, 80, 24, 240, '#9aa7c7', null, 0, 3); d.text('металл', 432, 340, { size: 12, align: 'center' });
    for (let i = 0; i < 4; i++) { const ph = (t * .8 + i * .25) % 1, x0 = 60 + ph * 360, y = 120 + i * 50; const pts = []; for (let x = 0; x < 70; x += 3) pts.push([x0 + x - 70, y - 9 * Math.sin(x / 9)]); if (x0 < 420) d.path(pts, LC.violet, 3); else d.arrow(444, y, 444 + (ph - .99) * 0 + 40 + ((t * .8 + i * .25) % 1) * 180, y - 30, LC.mint, 3); }
    d.tag('hν = A + mυ²/2', 220, 50, LC.gold); if (p > .5) d.tag('электрон вылетает, только если hν ≥ A', 560, 360, LC.mint);
  },
  atom(d, a, p, t) {
    const cx = 300, cy = 200, R = [50, 95, 145]; d.circle(cx, cy, 16, LC.coral);
    R.forEach((r, i) => { d.arc(cx, cy, r, 0, Math.PI * 2, 'rgba(61,214,160,.55)', 2); d.text('n = ' + (i + 1), cx + r + 6, cy - 6, { size: 11, col: LC.mint }); });
    const jump = p > .45, r = jump ? R[0] + (R[2] - R[0]) * Math.max(0, 1 - (p - .45) * 6) : R[2], ang = t * (jump ? 3 : 1.5);
    d.circle(cx + r * Math.cos(ang), cy + r * Math.sin(ang), 8, LC.blue);
    if (jump) { const s = (p - .45) * 900; const pts = []; for (let x = 0; x < 120; x += 3) pts.push([cx + 160 + s * .3 + x, cy - 60 - 10 * Math.sin(x / 8)]); d.path(pts, LC.gold, 3); d.tag('hν = E₃ − E₁', 600, 90, LC.gold); }
    d.tag('электрон на разрешённой орбите не излучает', 360, 370, LC.text);
  },
  spectrum(d, a, p, t) {
    const x0 = 80, x1 = 640; const g = d.c.createLinearGradient(x0, 0, x1, 0); ['#8a3dff', '#3d6bff', '#3dd6c3', '#3dd65a', '#ffe23d', '#ff9f3d', '#ff3d3d'].forEach((c, i, A) => g.addColorStop(i / (A.length - 1), c));
    d.c.globalAlpha = .18; d.c.fillStyle = g; d.c.fillRect(x0, 140, x1 - x0, 60); d.c.globalAlpha = 1; d.rect(x0, 240, x1 - x0, 60, '#05070d', LC.line, 2, 4);
    [[410, '#7a4dff'], [434, '#5a5dff'], [486, '#3dc6ff'], [656, '#ff3d3d']].forEach(([l, c], i) => { if (p < .15 + i * .15) return; const x = x0 + (l - 380) / 320 * (x1 - x0); d.line(x, 242, x, 298, c, 4); d.text(l + ' нм', x, 318, { size: 11, align: 'center', col: c }); });
    d.text('сплошной спектр', x0, 125, { size: 12 }); d.text('линейчатый спектр водорода (серия Бальмера)', x0, 225, { size: 12 });
  },
  box(d, a, p, t) {
    const x0 = 150, x1 = 570, L = x1 - x0;
    d.line(x0, 60, x0, 360, LC.text, 5); d.line(x1, 60, x1, 360, LC.text, 5);
    [1, 2, 3].forEach((nq, i) => { if (p < i * .25) return; const y = 320 - i * 100; d.line(x0, y, x1, y, LC.line, 1.5, [4, 5]); const pts = []; for (let x = 0; x <= L; x += 3) pts.push([x0 + x, y - 38 * Math.sin(nq * Math.PI * x / L) * Math.cos(t * (nq * nq) * .8)]); d.path(pts, [LC.mint, LC.gold, LC.coral][i], 3); d.text('n = ' + nq, x1 + 14, y, { size: 13, col: [LC.mint, LC.gold, LC.coral][i], bold: true }); });
    if (p > .7) d.tag('Eₙ = n²h²/(8ml²) — энергия квантуется', 360, 72, LC.gold);
  },
  tunnel(d, a, p, t) {
    const bx = 340, bw = 50; d.rect(bx, 90, bw, 230, 'rgba(255,122,89,.18)', LC.coral, 2, 4); d.text('барьер U₀ > E', bx + bw / 2, 76, { size: 12, align: 'center', col: LC.coral });
    const pts = []; for (let x = 40; x <= 680; x += 3) { let A = x < bx ? 70 : x < bx + bw ? 70 * Math.exp(-(x - bx) / 18) : 70 * Math.exp(-bw / 18); pts.push([x, 230 - A * Math.sin(x / 22 - t * 4)]); } d.path(pts, LC.cyan, 3);
    if (p > .5) d.tag('часть волны проходит сквозь барьер — туннельный эффект', 360, 370, LC.gold);
  },
  lattice(d, a, p, t) {
    for (let i = 0; i < 9; i++) for (let j = 0; j < 5; j++) {
      const x = 120 + i * 60 + 6 * Math.sin(t * 4 + i * .7), y = 90 + j * 55 + 4 * Math.cos(t * 3 + j);
      if (i < 8) d.line(x, y, x + 60, y, 'rgba(141,151,181,.35)', 1.5); if (j < 4) d.line(x, y, x, y + 55, 'rgba(141,151,181,.35)', 1.5);
      d.circle(x, y, 11, (i + j) % 2 ? LC.blue : LC.violet);
    }
    if (p > .5) d.tag('атомы колеблются около узлов решётки', 360, 370, LC.gold);
  },
  bands(d, a, p, t) {
    [['металл', 0, -20], ['полупроводник', 240, 40], ['диэлектрик', 480, 110]].forEach(([lab, x, gap], i) => {
      if (p < i * .25) return; const bx = 50 + x, top = 80;
      d.rect(bx, top, 180, 70, i === 0 ? 'rgba(61,214,160,.35)' : 'rgba(108,140,255,.15)', LC.mute, 1.5, 6); d.rect(bx, top + 70 + gap, 180, 60, 'rgba(255,194,75,.35)', LC.mute, 1.5, 6);
      if (i !== 0) d.tag('ΔE', bx + 90, top + 70 + gap / 2, LC.text); d.text(lab, bx + 90, 360, { size: 13, align: 'center', col: LC.text, bold: true });
    });
    d.text('зона проводимости', 60, 64, { size: 11 }); d.text('валентная зона (снизу)', 60, 330, { size: 11 });
  },
  /* ----- ядро и частицы ----- */
  decay(d, a, p, t) {
    const N = 64, T = 1.4; let alive = 0;
    for (let i = 0; i < N; i++) { const life = -Math.log(((i * 0.618) % 1) + .001) * T / Math.LN2, on = t < life; if (on) alive++; d.circle(80 + (i % 8) * 34, 90 + Math.floor(i / 8) * 32, 11, on ? LC.coral : '#2a3658', null); }
    const gx = 400, gy = 340, gw = 280, gh = 250; d.line(gx, gy, gx + gw, gy, LC.mute, 2); d.line(gx, gy, gx, gy - gh, LC.mute, 2);
    const pts = []; for (let x = 0; x <= Math.min(1, t / 8) * gw; x += 3) pts.push([gx + x, gy - gh * Math.pow(.5, x / gw * 8 / T)]); d.path(pts, LC.gold, 3.5);
    d.tag('N = N₀e^(−λt)', gx + 150, gy - gh + 20, LC.gold); d.tag('осталось ' + alive + ' из ' + N, 200, 370, LC.coral);
  },
  fission(d, a, p, t) {
    const s = clamp((p - .25) * 2.2, 0, 1), cx = 380, cy = 200;
    if (p < .25) { d.circle(60 + p / .25 * 290, cy, 8, LC.mint); }
    if (s <= 0) { for (let i = 0; i < 18; i++) d.circle(cx + 18 * Math.cos(i * 2.4) * Math.sqrt(i / 18) * 2, cy + 18 * Math.sin(i * 2.4) * Math.sqrt(i / 18) * 2, 9, i % 2 ? LC.coral : LC.blue); d.tag('²³⁵U', cx, cy - 70, LC.text); }
    else {
      [[-1, -.4], [1, .4]].forEach(([dx, dy]) => { for (let i = 0; i < 9; i++) d.circle(cx + dx * 140 * s + 12 * Math.cos(i * 2.4) * Math.sqrt(i / 9) * 2, cy + dy * 100 * s + 12 * Math.sin(i * 2.4) * Math.sqrt(i / 9) * 2, 8, i % 2 ? LC.coral : LC.blue); });
      for (let k = 0; k < 3; k++) { const q = k / 3 * Math.PI * 2 + .5; d.circle(cx + Math.cos(q) * 260 * s, cy + Math.sin(q) * 170 * s, 7, LC.mint); }
      if (s > .7) { d.tag('≈ 200 МэВ на одно деление', 360, 40, LC.gold); d.tag('2–3 новых нейтрона → цепная реакция', 360, 370, LC.mint); }
    }
  },
  quarks(d, a, p, t) {
    const sets = [['протон', ['u', 'u', 'd'], 200], ['нейтрон', ['u', 'd', 'd'], 520]];
    sets.forEach(([lab, qs, cx], k) => {
      if (p < k * .35) return; d.circle(cx, 190, 110, 'rgba(108,140,255,.08)', LC.line, 2);
      qs.forEach((q, i) => { const a = i / 3 * Math.PI * 2 + t * .7, x = cx + 55 * Math.cos(a), y = 190 + 55 * Math.sin(a); d.circle(x, y, 24, ['#FF6B8B', '#3DD6A0', '#6C8CFF'][i]); d.text(q, x, y + 1, { col: '#fff', size: 18, bold: true, align: 'center' }); });
      d.text(lab, cx, 330, { col: LC.text, size: 15, bold: true, align: 'center' }); d.text(qs.join(''), cx, 352, { col: LC.mute, size: 13, align: 'center' });
    });
  },
  /* ----- механика (дополнительно к моделям лаборатории) ----- */
  orbit(d, a, p, t) {
    d.circle(360, 200, 34, LC.gold); const ang = t * .9, X = 360 + 230 * Math.cos(ang), Y = 200 + 110 * Math.sin(ang);
    d.c.save(); d.c.strokeStyle = 'rgba(108,140,255,.5)'; d.c.lineWidth = 2; d.c.beginPath(); d.c.ellipse(360, 200, 230, 110, 0, 0, Math.PI * 2); d.c.stroke(); d.c.restore();
    d.circle(X, Y, 14, LC.blue); d.arrow(X, Y, X + (360 - X) * .3, Y + (200 - Y) * .3, LC.coral, 3, 'F');
    if (p > .5) d.tag('F = G·m₁m₂/r²', 360, 360, LC.gold);
  },
  collide(d, a, p, t) {
    const inel = a[0] === 'in', y = 300; d.ground(y);
    const tc = 1.6, s = t < tc ? t / tc : 1;
    if (t < tc) { d.cart(120 + 200 * s, y, 100, 40, LC.blue, 200 * s); d.cart(520, y, 100, 40, LC.coral, 0); d.arrow(170 + 200 * s, y - 70, 240 + 200 * s, y - 70, LC.mint, 3, 'υ'); }
    else { const u = Math.min(t - tc, inel ? 2.4 : 1.1); if (inel) { d.cart(320 + 60 * u, y, 100, 40, LC.blue, 60 * u); d.cart(420 + 60 * u, y, 100, 40, LC.coral, 60 * u); d.tag('слиплись: импульс сохранился, часть энергии — в тепло', 360, 60, LC.gold); } else { d.cart(320, y, 100, 40, LC.blue, 0); d.cart(520 + 120 * u, y, 100, 40, LC.coral, 120 * u); d.tag('упругий удар равных масс: обмен скоростями', 360, 60, LC.gold); } }
  },
  clock(d, a, p, t) {
    // световые часы: в движущихся часах путь света длиннее → время идёт медленнее
    const L = 160, y0 = 110, y1 = y0 + L;
    d.rect(100, y0 - 10, 80, 8, '#9aa7c7', null); d.rect(100, y1 + 2, 80, 8, '#9aa7c7', null);
    const ph = (t * 1.2) % 2, yy = ph < 1 ? y0 + ph * L : y1 - (ph - 1) * L; d.circle(140, yy, 7, LC.gold);
    const vx = 120, sx = 360 + ((t * 1.2) % 2) * vx; d.rect(sx - 40, y0 - 10, 80, 8, '#9aa7c7', null); d.rect(sx - 40, y1 + 2, 80, 8, '#9aa7c7', null);
    d.path([[360, y0], [360 + vx, y1], [360 + 2 * vx, y0]], 'rgba(255,194,75,.5)', 2.5, null, [6, 5]); d.circle(sx, yy, 7, LC.gold);
    d.text('покоятся', 140, 320, { size: 13, align: 'center', col: LC.text }); d.text('движутся', 480, 320, { size: 13, align: 'center', col: LC.text });
    if (p > .5) d.tag('Δt = Δt₀ / √(1 − υ²/c²)', 360, 365, LC.gold);
  }
};
const n_ = v => f1(v, 0);

/** Сцена ролика по строке сценария. */
function vsParse(item) {
  const s = item.s || '', i = s.indexOf(':'), type = i < 0 ? s : s.slice(0, i), arg = i < 0 ? '' : s.slice(i + 1);
  if (type === 'title') return { kind: 'title', text: item.t };
  if (type === 'lab') { const [m, ab] = arg.split(':'); const v = ab ? ab.split(',').map(Number) : null; return { kind: 'model', model: m, ab: v, h: item.h || '', formula: item.f || '', text: item.t }; }
  if (type === 'f') return { kind: 'formula', formula: arg.replace(/\\n/g, '\n'), h: item.h || '', text: item.t };
  if (type === 'key') return { kind: 'idea', key: arg, h: item.h || '', text: item.t };
  if (type === 'trap') return { kind: 'trap', key: arg, h: item.h || 'Частая ошибка', text: item.t };
  if (type === 'list') return { kind: 'list', items: arg.split(';'), h: item.h || '', text: item.t };
  if (type === 'cmp') return { kind: 'cmp', cols: arg.split('|').map(c => c.split(';')), h: item.h || '', text: item.t };
  if (type === 'graph') { const [ex, a0, a1, lab] = arg.split('|'); return { kind: 'graph', ex, x0: +a0 || 0, x1: +a1 || 1, lab: lab || '', h: item.h || '', text: item.t }; }
  return { kind: 'vs', type, args: arg ? arg.split(',') : [], h: item.h || '', text: item.t };
}
/** Дополнительные виды сцен для rvDraw (список, сравнение, график, иллюстрация). */
function vsDrawExtra(d, sc, p, lt) {
  if (sc.kind === 'list') {
    rvHeader(d, sc.h, p, LC.blue);
    sc.items.forEach((it, i) => { const q = VS_E((p - .05 - i * .7 / sc.items.length) * 5); if (q <= 0) return; d.c.globalAlpha = q; const y = 85 + i * Math.min(100, 290 / sc.items.length);
      d.text(String(i + 1), 34, y + 12, { col: LC.blue, size: 20, bold: true, align: 'center' }); rvLines(d, it, 64 + (1 - q) * 20, y + 12, 620, sc.items.length > 3 ? 17 : 20, { col: LC.text, bold: true, max: 2 }); d.c.globalAlpha = 1; });
    return true;
  }
  if (sc.kind === 'cmp') {
    rvHeader(d, sc.h, p, LC.violet);
    sc.cols.forEach(([ttl, txt], i) => { const q = VS_E((p - .05 - i * .25) * 4); if (q <= 0) return; d.c.globalAlpha = q; const x = 30 + i * 345;
      if (i) d.line(360, 70, 360, 360, '#2A3658', 2);
      rvLines(d, ttl, x + 10, 80, 300, ttl.length > 18 ? 16 : 20, { col: i ? LC.coral : LC.mint, bold: true, max: 2 });
      rvLines(d, txt || '', x + 10, 150, 300, 16, { col: LC.text, max: 9 }); d.c.globalAlpha = 1; });
    return true;
  }
  if (sc.kind === 'graph') {
    rvHeader(d, sc.h, p, LC.mint);
    let fn; try { fn = new Function('x', 'with (Math) { return ' + sc.ex + '; }'); } catch (e) { return true; }
    const gx = 80, gy = 340, gw = 580, gh = 250, xs = [], N = 160; let lo = Infinity, hi = -Infinity;
    for (let i = 0; i <= N; i++) { const x = sc.x0 + (sc.x1 - sc.x0) * i / N, y = fn(x); xs.push([x, y]); if (Number.isFinite(y)) { lo = Math.min(lo, y); hi = Math.max(hi, y); } }
    lo = Math.min(lo, 0); if (hi - lo < 1e-9) hi = lo + 1; const zy = gy - (0 - lo) / (hi - lo) * gh;
    d.line(gx, zy, gx + gw, zy, LC.mute, 2); d.line(gx, gy, gx, gy - gh, LC.mute, 2);
    const n = Math.floor(N * VS_E(p * 1.4)); d.path(xs.slice(0, n + 1).map(([x, y]) => [gx + (x - sc.x0) / (sc.x1 - sc.x0) * gw, gy - (y - lo) / (hi - lo) * gh]), LC.gold, 3.5);
    if (sc.lab && p > .6) d.tag(sc.lab, 520, 70, LC.gold);
    return true;
  }
  if (sc.kind === 'vs' && VS[sc.type]) { VS[sc.type](d, sc.args, p, lt); rvHeader(d, sc.h, p, LC.blue); return true; }
  return false;
}

/* Фон для сцен с формулами: блёклая иллюстрация темы главы */
const VS_BG = { 2: 'lab:newton', 3: 'lab:freefall', 4: 'lab:torque', 5: 'orbit', 6: 'lab:bernoulli', 7: 'clock', 8: 'gas', 9: 'pv:carnot', 10: 'phase', 11: 'efield:+-', 12: 'lab:ohm', 13: 'lattice', 14: 'bfield', 15: 'lab:induction', 16: 'domain', 17: 'emwave',
  18: 'lab:spring', 19: 'lab:wave', 20: 'emwave', 21: 'lab:lens', 22: 'lab:interference', 23: 'huygens', 24: 'prism', 25: 'polar', 26: 'photo', 27: 'atom', 28: 'box',
  29: 'atom', 30: 'bands', 31: 'lattice', 32: 'decay', 33: 'quarks' };
function vsBackground(d, ch, lt) {
  const b = VS_BG[ch]; if (!b) return false;
  d.c.save(); d.c.globalAlpha = d.video ? .85 : .16; d.quiet = true; d.bg = true;
  if (d.video) { d.c.translate(LAB_W * .4, LAB_H * .36); d.c.scale(.6, .6); } // в ролике — иллюстрация справа внизу, текст слева сверху
  try { if (b.startsWith('lab:')) rvDrawModel(d, b.slice(4), lt); else { const sc = vsParse({ s: b, t: '' }); VS[sc.type](d, sc.args, 1, lt); } } catch (e) {}
  d.quiet = false; d.bg = false; d.c.restore(); if (!d.video) d.rect(0, 0, LAB_W, LAB_H, 'rgba(14,20,36,.45)', null, 0, 0); return true;
}
