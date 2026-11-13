/* =====================================================================
   Лаборатория: экран опыта.
   Каждая модель в LAB_MODELS описывает:
     calc(a, b)        → итог опыта: {label, value, unit, expr, note?}
     live(a, b, t)     → живые показания приборов: [[подпись, значение], …]
     dur(a, b)         → длительность опыта в секундах модельного времени
                         (Infinity — опыт не запускается, причина в calc().note)
     draw(d, a, b, t)  → рисунок установки на холсте 720×400
   a и b — два параметра установки (описаны в lab-data.js).
   ===================================================================== */

const LAB_W = 720, LAB_H = 400, LAB_G = 9.81;
const LC = { bg: '#0E1424', grid: 'rgba(141,151,181,.10)', text: '#E8ECF6', mute: '#8D97B5', line: '#3A4668',
  blue: '#6C8CFF', cyan: '#3DD6C3', mint: '#3DD6A0', gold: '#FFC24B', violet: '#B48CFF', coral: '#FF7A59', pink: '#FF6B8B',
  water: 'rgba(61,140,255,.22)', waterTop: 'rgba(110,170,255,.65)' };
const RAD = Math.PI / 180;
/** Число для подписи: n(3.14159, 2) → «3,14». */
const n = (v, d = 2) => Number.isFinite(v) ? f1(v, d) : '∞';
/** Число с единицей: u(20, 'м') → «20 м». */
const u = (v, unit, d = 2) => n(v, d) + (unit ? ' ' + unit : '');
/** Крупные числа с пробелами-разделителями: 42000 → «42 000». */
const big = v => Math.round(v).toLocaleString('ru-RU');
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

/* ---------- Рисование ---------- */
/** Осветлить/затемнить цвет #rrggbb: k > 0 — светлее, k < 0 — темнее. */
function shade(hex, k) {
  const m = /^#([0-9a-f]{6})$/i.exec(hex); if (!m) return hex;
  const v = parseInt(m[1], 16), ch = [v >> 16, (v >> 8) & 255, v & 255].map(x => Math.round(k >= 0 ? x + (255 - x) * k : x * (1 + k)));
  return 'rgb(' + ch.join(',') + ')';
}
function labPainter(cv) {
  const box = cv.getBoundingClientRect();
  const cssW = box.width || LAB_W, dpr = Math.min(2.5, window.devicePixelRatio || 1);
  const pxW = Math.round(cssW * dpr), pxH = Math.round(cssW * LAB_H / LAB_W * dpr);
  if (cv.width !== pxW || cv.height !== pxH) { cv.width = pxW; cv.height = pxH; }
  const c = cv.getContext('2d');
  c.setTransform(pxW / LAB_W, 0, 0, pxH / LAB_H, 0, 0);
  c.lineCap = 'round'; c.lineJoin = 'round';
  // На узком экране холст уменьшается — подписи увеличиваем, чтобы они оставались читаемыми.
  const fs = clamp(LAB_W / cssW * 0.85, 1.1, 1.85);
  // и линии тоже: тонкая линия на маленьком холсте теряется
  const lk = clamp(LAB_W / cssW * 0.6, 1, 1.45);
  const d = {
    c, fs,
    clear() {
      // в роликах — ровный фон без сетки, как в главе 1
      if (d.video) { c.fillStyle = LC.bg; c.fillRect(0, 0, LAB_W, LAB_H); return; }
      const g = c.createLinearGradient(0, 0, 0, LAB_H); g.addColorStop(0, '#121a30'); g.addColorStop(1, '#0a0f1d');
      c.fillStyle = g; c.fillRect(0, 0, LAB_W, LAB_H);
      const r = c.createRadialGradient(LAB_W / 2, LAB_H * .35, 20, LAB_W / 2, LAB_H * .35, LAB_W * .7);
      r.addColorStop(0, 'rgba(108,140,255,.07)'); r.addColorStop(1, 'rgba(108,140,255,0)'); c.fillStyle = r; c.fillRect(0, 0, LAB_W, LAB_H);
      c.strokeStyle = 'rgba(141,151,181,.06)'; c.lineWidth = 1;
      for (let x = 0; x <= LAB_W; x += 40) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, LAB_H); c.stroke(); }
      for (let y = 0; y <= LAB_H; y += 40) { c.beginPath(); c.moveTo(0, y); c.lineTo(LAB_W, y); c.stroke(); }
    },
    line(x1, y1, x2, y2, col = LC.text, lw = 3, dash) {
      c.save(); c.strokeStyle = col; c.lineWidth = lw * lk; if (dash) c.setLineDash(dash);
      c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke(); c.restore();
    },
    path(pts, col = LC.text, lw = 3, fill, dash) {
      if (!pts.length) return;
      c.save(); c.beginPath(); c.moveTo(pts[0][0], pts[0][1]); pts.slice(1).forEach(p => c.lineTo(p[0], p[1]));
      if (fill) { c.closePath(); c.fillStyle = fill; c.fill(); }
      if (col) { c.strokeStyle = col; c.lineWidth = lw * lk; if (dash) c.setLineDash(dash); c.stroke(); }
      c.restore();
    },
    arrow(x1, y1, x2, y2, col = LC.mint, lw = 3.5, label) {
      const len = Math.hypot(x2 - x1, y2 - y1); if (len < 2) return;
      const q = Math.atan2(y2 - y1, x2 - x1), hd = Math.min(14 * lk, len * .45);
      d.line(x1, y1, x2 - Math.cos(q) * hd * .6, y2 - Math.sin(q) * hd * .6, col, lw);
      c.fillStyle = col; c.beginPath(); c.moveTo(x2, y2);
      c.lineTo(x2 - hd * Math.cos(q - .42), y2 - hd * Math.sin(q - .42));
      c.lineTo(x2 - hd * Math.cos(q + .42), y2 - hd * Math.sin(q + .42)); c.closePath(); c.fill();
      if (label) d.tag(label, x2 + Math.cos(q) * 16, y2 + Math.sin(q) * 16, col);
    },
    /** Прямоугольник. Сплошной цвет (#rrggbb) рисуется объёмным телом: градиент, блик, мягкая тень. */
    rect(x, y, w, h, fill, stroke = LC.text, lw = 2, r = 6) {
      const solid = typeof fill === 'string' && /^#[0-9a-f]{6}$/i.test(fill);
      const shape = () => { c.beginPath(); c.roundRect ? c.roundRect(x, y, w, h, Math.min(r, w / 2, h / 2)) : c.rect(x, y, w, h); };
      if (solid && w > 6 && h > 6) {
        c.save(); c.shadowColor = 'rgba(0,0,0,.45)'; c.shadowBlur = 14; c.shadowOffsetY = 5;
        const g = c.createLinearGradient(x, y, x, y + h); g.addColorStop(0, shade(fill, .28)); g.addColorStop(.55, fill); g.addColorStop(1, shade(fill, -.32));
        shape(); c.fillStyle = g; c.fill(); c.restore();
        c.save(); shape(); c.clip(); const hl = c.createLinearGradient(x, y, x, y + Math.min(h, 18)); hl.addColorStop(0, 'rgba(255,255,255,.35)'); hl.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = hl; c.fillRect(x, y, w, Math.min(h, 18)); c.restore();
        if (stroke) { shape(); c.strokeStyle = stroke === LC.text ? shade(fill, -.45) : stroke; c.lineWidth = Math.max(1.5, lw * .8) * lk; c.stroke(); }
        return;
      }
      shape();
      if (fill) { c.fillStyle = fill; c.fill(); }
      if (stroke) { c.strokeStyle = stroke; c.lineWidth = lw * lk; c.stroke(); }
    },
    /** Круг. Сплошной цвет — шар с объёмной заливкой. */
    circle(x, y, r, fill, stroke = LC.text, lw = 2) {
      const solid = typeof fill === 'string' && /^#[0-9a-f]{6}$/i.test(fill);
      c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2);
      if (solid && r > 5) {
        c.save(); c.shadowColor = 'rgba(0,0,0,.4)'; c.shadowBlur = 10; c.shadowOffsetY = 4;
        const g = c.createRadialGradient(x - r * .35, y - r * .4, r * .1, x, y, r); g.addColorStop(0, shade(fill, .55)); g.addColorStop(.45, fill); g.addColorStop(1, shade(fill, -.45));
        c.fillStyle = g; c.fill(); c.restore();
        if (stroke) { c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.strokeStyle = stroke === LC.text ? shade(fill, -.5) : stroke; c.lineWidth = 1.5 * lk; c.stroke(); }
        return;
      }
      if (fill) { c.fillStyle = fill; c.fill(); }
      if (stroke) { c.strokeStyle = stroke; c.lineWidth = lw * lk; c.stroke(); }
    },
    /** Подпись. size — размер на широком экране; на телефоне он увеличивается. */
    text(s, x, y, { col = LC.mute, size = 14, align = 'left', bold = false, base = 'middle' } = {}) {
      if (d.quiet && x === 22 && y === 56) return; // в ролике подсказка опыта не нужна
      if (d.bg) return; // фоновая иллюстрация — без подписей
      s = String(s).replace(/\u20D7/g, '');
      c.fillStyle = col; c.textAlign = align; c.textBaseline = base;
      c.font = (bold ? '700 ' : '500 ') + Math.round(size * fs) + 'px "Golos UI", system-ui, sans-serif';
      c.fillText(s, x, y);
    },
    /** Подпись на тёмной плашке — читается поверх любого рисунка. */
    tag(s, x, y, col = LC.text, size = 13) {
      if (d.bg) return;
      if (d.video) { // в роликах — просто подпись, без плашки (стиль главы 1)
        c.save(); c.shadowColor = 'rgba(0,0,0,.8)'; c.shadowBlur = 6;
        c.font = '700 ' + Math.round((size + 1) * fs) + 'px "Golos UI", system-ui, sans-serif';
        const w = c.measureText(String(s)).width, X = clamp(x - w / 2, 14, LAB_W - 14 - w), Y = Math.max(y, 50); // целиком в кадре и ниже заголовка
        d.text(s, X, Y, { col, size: size + 1, align: 'left', bold: true }); c.restore(); return;
      }
      s = String(s).replace(/\u20D7/g, '');
      c.font = '700 ' + Math.round(size * fs) + 'px "Golos UI", system-ui, sans-serif';
      const w = c.measureText(s).width + 10 * fs, h = (size + 8) * fs;
      const X = clamp(x - w / 2, 2, LAB_W - w - 2), Y = clamp(y - h / 2, 2, LAB_H - h - 2);
      d.rect(X, Y, w, h, 'rgba(11,16,32,.82)', null, 0, 6);
      c.fillStyle = col; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(s, X + w / 2, Y + h / 2 + 1);
    },
    /** Пол / стол: плита с бликом по верхней кромке. */
    ground(y, x1 = 20, x2 = LAB_W - 20) {
      const g = c.createLinearGradient(0, y, 0, y + 18); g.addColorStop(0, '#2c3a5e'); g.addColorStop(1, '#141c33');
      c.fillStyle = g; c.fillRect(x1, y, x2 - x1, 18);
      c.fillStyle = 'rgba(200,215,255,.35)'; c.fillRect(x1, y, x2 - x1, 2);
      c.save(); c.globalAlpha = .25; for (let x = x1 + 10; x < x2; x += 22) { c.fillStyle = '#0a0f1d'; c.fillRect(x, y + 7, 12, 2); } c.restore();
    },
    /** Колесо со спицами; rot — угол поворота (для катящихся тележек). */
    wheel(x, y, r, rot = 0) {
      d.circle(x, y, r, '#3a4668', null); d.circle(x, y, r * .62, '#8d97b5', null);
      for (let i = 0; i < 4; i++) { const q = rot + i * Math.PI / 2; d.line(x, y, x + r * .58 * Math.cos(q), y + r * .58 * Math.sin(q), '#2a3658', 1.6); }
      d.circle(x, y, r * .2, '#e8ecf6', null);
    },
    /** Тележка: кузов цвета col, колёса катятся вместе с пройденным путём dist (в пикселях). */
    cart(x, yBottom, w, h, col = LC.blue, dist = 0, label) {
      const r = Math.max(8, h * .28);
      d.rect(x - w / 2, yBottom - r - h, w, h, col, LC.text, 2, 8);
      d.rect(x - w / 2 + 6, yBottom - r - h + 6, w - 12, 6, 'rgba(255,255,255,.18)', null, 0, 3);
      d.wheel(x - w * .3, yBottom - r, r, dist / r); d.wheel(x + w * .3, yBottom - r, r, dist / r);
      if (label) d.text(label, x, yBottom - r - h / 2 + 2, { col: '#fff', size: 12, align: 'center', bold: true });
    },
    /** Пружина: витки-дуги с тенью — выглядит как металлическая спираль. */
    spring(x1, y1, x2, y2, coils = 10, w = 16, col = LC.cyan) {
      const len = Math.hypot(x2 - x1, y2 - y1), q = Math.atan2(y2 - y1, x2 - x1);
      const pts = [[0, 0], [len * .08, 0]];
      for (let i = 0; i <= coils * 4; i++) { const u = i / (coils * 4); pts.push([len * .08 + len * .84 * u, Math.sin(u * coils * 2 * Math.PI) * w]); }
      pts.push([len, 0]);
      const P = pts.map(([px, py]) => [x1 + px * Math.cos(q) - py * Math.sin(q), y1 + px * Math.sin(q) + py * Math.cos(q)]);
      d.path(P, 'rgba(0,0,0,.45)', 5.5); d.path(P, shade(col, -.25), 3.6); d.path(P, shade(col, .45), 1.4);
    },
    wave(x0, x1, y0, amp, lambdaPx, phase = 0, col = LC.cyan, lw = 3) {
      const pts = []; for (let x = x0; x <= x1; x += 3) pts.push([x, y0 - amp * Math.sin((x - x0) / lambdaPx * 2 * Math.PI - phase)]);
      d.path(pts, col, lw);
    },
    arc(x, y, r, a0, a1, col = LC.gold, lw = 2.5) { c.strokeStyle = col; c.lineWidth = lw; c.beginPath(); c.arc(x, y, r, a0, a1, a1 < a0); c.stroke(); },
    /** Стрелочный прибор: доля 0…1 отклоняет стрелку. */
    gauge(x, y, r, frac, label, col = LC.gold) {
      d.circle(x, y, r, '#121a2e', LC.line, 3);
      for (let i = 0; i <= 10; i++) { const q = Math.PI * (.75 + 1.5 * i / 10); d.line(x + (r - 4) * Math.cos(q), y + (r - 4) * Math.sin(q), x + (r - 11) * Math.cos(q), y + (r - 11) * Math.sin(q), i % 5 ? LC.line : LC.mute, 2); }
      const q = Math.PI * (.75 + 1.5 * clamp(frac, 0, 1));
      d.line(x, y, x + (r - 14) * Math.cos(q), y + (r - 14) * Math.sin(q), col, 3.5); d.circle(x, y, 5, col, null);
      if (label) d.text(label, x, y + r * .55, { col: LC.mute, size: 11, align: 'center', bold: true });
    },
    /** Термометр: доля 0…1 — высота столбика. */
    thermo(x, y, h, frac, col = LC.coral) {
      d.rect(x - 8, y, 16, h, '#121a2e', LC.line, 2, 8); d.circle(x, y + h + 10, 13, col, LC.line, 2);
      const fh = (h - 8) * clamp(frac, 0, 1); d.rect(x - 4, y + h - fh, 8, fh + 6, col, null, 0, 4);
    },
    /** Шкала вдоль оси X с подписями значений. */
    ruler(x0, x1, y, max, unit, step) {
      d.line(x0, y, x1, y, LC.line, 2);
      for (let v = 0; v <= max + 1e-9; v += step) {
        const X = x0 + (x1 - x0) * v / max; d.line(X, y - 6, X, y + 6, LC.mute, 2);
        d.text(n(v, step < 1 ? 1 : 0) + (v === 0 ? '' : ''), X, y + 18, { size: 11, align: 'center' });
      }
      d.text(unit, x1 + 10, y + 18, { size: 11 });
    },
    title(s) { if (!d.quiet) d.text(s, 22, 26, { col: LC.gold, size: 14, bold: true }); },
    /** Формула курсивом (как в роликах главы 1); стрелку вектора (U+20D7) рисуем над буквой сами. */
    math(s, x, y, { col = LC.text, size = 26, align = 'left' } = {}) {
      if (d.bg) return;
      const px = Math.round(size * fs); c.font = 'italic 600 ' + px + 'px "F2 Math", "Cambria Math", "Times New Roman", serif';
      c.fillStyle = col; c.strokeStyle = col; c.textBaseline = 'middle'; c.textAlign = 'left';
      let out = ''; const marks = []; for (const ch of String(s)) { if (ch === '\u20D7') marks.push(out.length - 1); else out += ch; }
      const W = c.measureText(out).width, x0 = align === 'center' ? x - W / 2 : align === 'right' ? x - W : x;
      c.fillText(out, x0, y);
      marks.forEach(i => { if (i < 0) return; const a = x0 + c.measureText(out.slice(0, i)).width, w = c.measureText(out[i]).width, yy = y - px * .62, x1 = a + w * .12, x2 = a + w * .95;
        c.lineWidth = Math.max(1.5, px / 16); c.beginPath(); c.moveTo(x1, yy); c.lineTo(x2, yy); c.stroke(); c.beginPath(); c.moveTo(x2, yy); c.lineTo(x2 - px * .16, yy - px * .1); c.lineTo(x2 - px * .16, yy + px * .1); c.closePath(); c.fill(); });
      return W;
    }
  };
  return d;
}
/** «Красивый» шаг шкалы: примерно n делений на отрезке max. */
function niceStep(max, parts = 5) {
  const raw = max / parts, p = 10 ** Math.floor(Math.log10(raw)), m = raw / p;
  return (m < 1.5 ? 1 : m < 3.5 ? 2 : m < 7.5 ? 5 : 10) * p;
}
/** Молекулы газа: count штук, скорость пропорциональна speed. */
function gasDots(d, x, y, w, h, count, speed, t, seed = 1) {
  for (let i = 0; i < count; i++) {
    const s1 = Math.sin(i * 12.9898 + seed) * 43758.5453, s2 = Math.sin(i * 78.233 + seed) * 12345.678;
    const fx = s1 - Math.floor(s1), fy = s2 - Math.floor(s2);
    const px = (fx * w + t * speed * (30 + 40 * fy)) % (2 * w), py = (fy * h + t * speed * (25 + 35 * fx)) % (2 * h);
    d.circle(x + 6 + (px < w ? px : 2 * w - px) * (w - 12) / w, y + 6 + (py < h ? py : 2 * h - py) * (h - 12) / h, 4.5, i % 3 ? LC.cyan : LC.gold, null);
  }
}
/** Стрелки-«частицы» тока/потока вдоль ломаной. */
function flowDots(d, pts, speed, t, col = LC.gold, gap = 36) {
  const segs = []; let total = 0;
  for (let i = 1; i < pts.length; i++) { const l = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); segs.push([pts[i - 1], pts[i], l]); total += l; }
  const off = (t * speed) % gap;
  for (let s = off; s < total; s += gap) {
    let rest = s; for (const [p, q, l] of segs) { if (rest <= l) { d.circle(p[0] + (q[0] - p[0]) * rest / l, p[1] + (q[1] - p[1]) * rest / l, 4, col, null); break; } rest -= l; }
  }
}
/** График x(t) осциллографа в правой части холста. */
function scope(d, x, y, w, h, fn, t, span, label) {
  d.rect(x, y, w, h, '#0b1222', LC.line, 2, 8);
  d.line(x + 8, y + h / 2, x + w - 8, y + h / 2, LC.line, 1.5);
  const pts = []; const t0 = Math.max(0, t - span);
  for (let i = 0; i <= 120; i++) { const tt = t0 + span * i / 120; if (tt > t) break; pts.push([x + 8 + (w - 16) * i / 120, y + h / 2 - fn(tt) * (h / 2 - 10)]); }
  d.path(pts, LC.gold, 2.5);
  if (label) d.text(label, x + 10, y + 14, { size: 11, bold: true });
}

/* ---------- Оптика: общая схема линзы и зеркала ---------- */
function opticsInfo(f, a) {
  // Формула тонкой линзы / сферического зеркала (обозначения учебника): 1/a + 1/b = 1/f.
  if (Math.abs(a - f) < 1e-6) return { inf: true };
  const b = f * a / (a - f), G = -b / a;
  return { b, G, real: b > 0, inverted: G < 0, kind: (b > 0 ? 'действительное' : 'мнимое') + ', ' + (G < 0 ? 'перевёрнутое' : 'прямое') + ', ' + (Math.abs(G) > 1.02 ? 'увеличенное' : Math.abs(G) < .98 ? 'уменьшенное' : 'того же размера') };
}

const LAB_MODELS = {
  /* ===== 1. Механика и кинематика ===== */
  uniform: {
    calc: (v, T) => ({ label: 'Путь за время опыта', value: v * T, unit: 'м', expr: `s = v·t = ${u(v, 'м/с', 1)} · ${u(T, 'с', 1)} = ${u(v * T, 'м', 1)}` }),
    live: (v, T, t) => [['Время', u(Math.min(t, T), 'с', 1)], ['Путь', u(v * Math.min(t, T), 'м', 1)]],
    dur: (v, T) => T,
    draw(d, v, T, t) {
      d.title('Рельсовая дорожка · постоянная скорость');
      const S = v * T, x0 = 90, x1 = 640, k = (x1 - x0) / S, y = 300, tt = Math.min(t, T);
      d.ground(y + 14); d.ruler(x0, x1, y + 40, S, 'м', niceStep(S));
      for (let s = 1; s <= Math.floor(tt); s++) { const X = x0 + v * s * k; d.line(X, y - 70, X, y + 10, LC.violet, 2, [4, 5]); d.text(s + ' с', X, y - 80, { size: 11, align: 'center', col: LC.violet }); }
      const X = x0 + v * tt * k; d.cart(X, y + 14, 112, 46, LC.blue, X - x0);
      d.arrow(X, y - 72, X + 40 + v * 4, y - 72, LC.mint, 3.5, 'v');
      d.text('Отметки через каждую секунду: отрезки равны', 22, 56, { size: 12 });
    }
  },
  accelerated: {
    calc: (v0, a) => ({ label: 'Скорость через 5 с', value: v0 + 5 * a, unit: 'м/с', expr: `v = v₀ + a·t = ${n(v0, 1)} + ${n(a, 1)} · 5 = ${u(v0 + 5 * a, 'м/с', 1)}` }),
    live: (v0, a, t) => [['Время', u(Math.min(t, 5), 'с', 1)], ['Скорость', u(v0 + a * Math.min(t, 5), 'м/с', 1)], ['Путь', u(v0 * Math.min(t, 5) + a * Math.min(t, 5) ** 2 / 2, 'м', 1)]],
    dur: () => 5,
    draw(d, v0, a, t) {
      d.title('Разгон тележки · отметки через 1 с');
      const S = 5 * v0 + 12.5 * a, x0 = 90, x1 = 640, k = (x1 - x0) / S, y = 300, tt = Math.min(t, 5);
      d.ground(y + 14); d.ruler(x0, x1, y + 40, S, 'м', niceStep(S));
      for (let s = 1; s <= Math.floor(tt); s++) { const X = x0 + (v0 * s + a * s * s / 2) * k; d.line(X, y - 70, X, y + 10, LC.violet, 2, [4, 5]); d.text(s + ' с', X, y - 80, { size: 11, align: 'center', col: LC.violet }); }
      const X = x0 + (v0 * tt + a * tt * tt / 2) * k, v = v0 + a * tt;
      d.cart(X, y + 14, 112, 46, LC.violet, X - x0);
      d.arrow(X, y - 72, X + 20 + v * 5, y - 72, LC.mint, 3.5, 'v');
      d.arrow(X, y - 116, X + 20 + a * 12, y - 116, LC.coral, 3, 'a');
      d.text('Отрезки растут: скорость увеличивается', 22, 56, { size: 12 });
    }
  },
  freefall: {
    calc(h, v0) { const T = (-v0 + Math.sqrt(v0 * v0 + 2 * LAB_G * h)) / LAB_G; return { label: 'Время падения', value: T, unit: 'с', expr: `h = v₀t + gt²/2 → t = (√(v₀² + 2gh) − v₀)/g = ${u(T, 'с')}`, note: `Скорость у земли: v = v₀ + gt = ${u(v0 + LAB_G * T, 'м/с', 1)}` }; },
    live(h, v0, t) { const T = this.calc(h, v0).value, tt = Math.min(t, T); return [['Время', u(tt, 'с', 2)], ['Пролетел', u(v0 * tt + LAB_G * tt * tt / 2, 'м', 1)], ['Скорость', u(v0 + LAB_G * tt, 'м/с', 1)]]; },
    dur(h, v0) { return this.calc(h, v0).value; },
    draw(d, h, v0, t) {
      d.title('Свободное падение · стробоскоп 0,25 с');
      const T = this.calc(h, v0).value, tt = Math.min(t, T), top = 60, bot = 340, k = (bot - top) / h;
      d.ground(bot + 12, 200, 520);
      d.line(560, top, 560, bot, LC.line, 2); const st = niceStep(h, 4);
      for (let v = 0; v <= h + 1e-9; v += st) { const Y = bot - v * k; d.line(552, Y, 568, Y, LC.mute, 2); d.text(n(v, 0) + ' м', 576, Y, { size: 11 }); }
      for (let s = .25; s < tt; s += .25) d.circle(360, top + (v0 * s + LAB_G * s * s / 2) * k, 9, 'rgba(255,194,75,.25)', 'rgba(255,194,75,.45)', 1.5);
      const Y = top + (v0 * tt + LAB_G * tt * tt / 2) * k; d.circle(360, Y, 14, LC.gold);
      d.arrow(395, Y, 395, Y + 18 + (v0 + LAB_G * tt) * 1.6, LC.mint, 3.5, 'v');
      d.text('Промежутки растут: движение равноускоренное', 22, 56, { size: 12 });
    }
  },
  projectile: {
    calc(v, al) { const L = v * v * Math.sin(2 * al * RAD) / LAB_G, H = (v * Math.sin(al * RAD)) ** 2 / (2 * LAB_G); return { label: 'Дальность полёта', value: L, unit: 'м', expr: `L = v₀²·sin 2α / g = ${n(v, 0)}² · sin ${n(2 * al, 0)}° / 9,81 = ${u(L, 'м', 1)}`, note: `Наибольшая высота H = v₀²sin²α / 2g = ${u(H, 'м', 1)}` }; },
    live(v, al, t) { const T = 2 * v * Math.sin(al * RAD) / LAB_G, tt = Math.min(t, T); return [['Время', u(tt, 'с', 2)], ['x', u(v * Math.cos(al * RAD) * tt, 'м', 1)], ['y', u(Math.max(0, v * Math.sin(al * RAD) * tt - LAB_G * tt * tt / 2), 'м', 1)]]; },
    dur: (v, al) => 2 * v * Math.sin(al * RAD) / LAB_G,
    draw(d, v, al, t) {
      d.title('Бросок под углом к горизонту');
      const q = al * RAD, T = 2 * v * Math.sin(q) / LAB_G, Lmax = v * v / LAB_G, x0 = 70, y0 = 330;
      const k = Math.min(580 / Lmax, 250 / (Lmax / 2)); // масштаб зависит только от скорости — углы удобно сравнивать
      d.ground(y0 + 12); d.ruler(x0, x0 + Lmax * k, y0 + 40, Lmax, 'м', niceStep(Lmax));
      const pts = []; for (let i = 0; i <= 80; i++) { const z = T * i / 80; pts.push([x0 + v * Math.cos(q) * z * k, y0 - (v * Math.sin(q) * z - LAB_G * z * z / 2) * k]); }
      d.path(pts, 'rgba(61,214,160,.55)', 2.5, null, [6, 7]);
      d.line(x0, y0, x0 + 60 * Math.cos(q), y0 - 60 * Math.sin(q), LC.text, 8); d.arc(x0, y0, 34, 0, -q, LC.gold); d.text('α = ' + n(al, 0) + '°', x0 + 44, y0 - 14, { col: LC.gold, size: 12, bold: true });
      const z = Math.min(t, T), X = x0 + v * Math.cos(q) * z * k, Y = y0 - (v * Math.sin(q) * z - LAB_G * z * z / 2) * k;
      d.circle(X, Y, 11, LC.gold);
      if (z > 0 && z < T) { d.arrow(X, Y, X + v * Math.cos(q) * 2.2, Y, LC.blue, 3); d.arrow(X, Y, X, Y - (v * Math.sin(q) - LAB_G * z) * 2.2, LC.coral, 3); }
      if (t >= T) d.tag('L = ' + u(v * v * Math.sin(2 * q) / LAB_G, 'м', 1), X, y0 - 30, LC.mint);
    }
  },
  circular: {
    calc: (r, T) => ({ label: 'Центростремительное ускорение', value: 4 * Math.PI ** 2 * r / T ** 2, unit: 'м/с²', expr: `aₙ = 4π²r / T² = 4π² · ${n(r, 1)} / ${n(T, 1)}² = ${u(4 * Math.PI ** 2 * r / T ** 2, 'м/с²')}`, note: `Линейная скорость v = 2πr/T = ${u(2 * Math.PI * r / T, 'м/с')}` }),
    live: (r, T, t) => [['Время', u(Math.min(t, T), 'с', 1)], ['Угол', n(360 * Math.min(t, T) / T, 0) + '°'], ['v', u(2 * Math.PI * r / T, 'м/с')]],
    dur: (r, T) => T,
    draw(d, r, T, t) {
      d.title('Вращение точки по окружности');
      const R = 50 + r * 17, cx = 290, cy = 215, q = -2 * Math.PI * Math.min(t, T) / T, X = cx + R * Math.cos(q), Y = cy + R * Math.sin(q);
      d.circle(cx, cy, R, 'rgba(108,140,255,.08)', LC.blue, 3); d.circle(cx, cy, 5, LC.mute, null);
      d.line(cx, cy, X, Y, LC.line, 2, [5, 5]); d.text('r = ' + u(r, 'м', 1), cx + 10, cy + 22, { size: 12 });
      d.arc(cx, cy, 26, 0, q, LC.violet);
      d.circle(X, Y, 13, LC.gold);
      d.arrow(X, Y, X + (cx - X) * .45, Y + (cy - Y) * .45, LC.coral, 3.5, 'aₙ');
      d.arrow(X, Y, X + 70 * Math.sin(q), Y - 70 * Math.cos(q), LC.mint, 3.5, 'v');
      d.text('скорость — по касательной', 700, 150, { size: 12, col: LC.mint, align: 'right' });
      d.text('ускорение — к центру', 700, 176, { size: 12, col: LC.coral, align: 'right' });
    }
  },

  /* ===== 2. Силы и равновесие ===== */
  newton: {
    calc: (m, F) => ({ label: 'Ускорение тележки', value: F / m, unit: 'м/с²', expr: `a = F / m = ${u(F, 'Н', 0)} / ${u(m, 'кг', 1)} = ${u(F / m, 'м/с²')}` }),
    live: (m, F, t) => [['Время', u(Math.min(t, 3), 'с', 1)], ['Скорость', u(F / m * Math.min(t, 3), 'м/с', 1)], ['Путь', u(F / m * Math.min(t, 3) ** 2 / 2, 'м', 1)]],
    dur: () => 3,
    draw(d, m, F, t) {
      d.title('Тележка под действием постоянной силы');
      const acc = F / m, S = acc * 4.5, x0 = 100, x1 = 560, k = (x1 - x0) / S, y = 300, tt = Math.min(t, 3);
      d.ground(y + 14); d.ruler(x0, x1, y + 40, S, 'м', niceStep(S));
      const X = x0 + acc * tt * tt / 2 * k, s = 26 + Math.cbrt(m) * 12;
      d.cart(X, y + 14, s * 2, s * 1.05, LC.blue, X - x0, n(m, 1) + ' кг');
      d.arrow(X + s, y - s * .65, X + s + 20 + F * 1.2, y - s * .65, LC.mint, 4, 'F');
      d.text('Больше сила — больше ускорение; больше масса — меньше', 22, 56, { size: 12 });
    }
  },
  friction: {
    calc: (m, mu) => ({ label: 'Сила трения скольжения', value: mu * m * LAB_G, unit: 'Н', expr: `Fтр = μ·m·g = ${n(mu, 2)} · ${n(m, 1)} · 9,81 = ${u(mu * m * LAB_G, 'Н', 1)}`, note: 'Брусок тянут равномерно — динамометр показывает силу трения.' }),
    live(m, mu, t) { const Ff = mu * m * LAB_G, F = Math.min(Ff, Ff * t / 1.5); return [['Динамометр', u(F, 'Н', 1)], ['Состояние', t < 1.5 ? 'покоится' : 'скользит']]; },
    dur: () => 4,
    draw(d, m, mu, t) {
      d.title('Брусок на шероховатой поверхности');
      const y = 290, Ff = mu * m * LAB_G, F = Math.min(Ff, Ff * t / 1.5), shift = Math.max(0, t - 1.5) * 50;
      d.ground(y + 2); for (let x = 30; x < 690; x += 9) d.line(x, y + 2, x + 4, y - 2 - mu * 6, 'rgba(141,151,181,.5)', 1.5);
      const w = 70 + Math.cbrt(m) * 18, X = 180 + shift, Hh = 56 + Math.cbrt(m) * 6;
      d.rect(X, y - Hh, w, Hh, LC.violet, LC.text); d.text(n(m, 1) + ' кг', X + w / 2, y - Hh / 2, { col: LC.text, size: 12, align: 'center', bold: true });
      d.line(X + w, y - Hh / 2, X + w + 60, y - Hh / 2, LC.text, 2); d.rect(X + w + 60, y - Hh / 2 - 12, 90, 24, '#1b2542', LC.gold, 2, 5);
      d.rect(X + w + 64, y - Hh / 2 - 6, 82 * clamp(F / 250, .02, 1), 12, LC.gold, null, 0, 3);
      d.line(X + w + 150, y - Hh / 2, X + w + 190, y - Hh / 2, LC.text, 2);
      d.arrow(X + w + 190, y - Hh / 2, X + w + 205 + F * .6, y - Hh / 2, LC.mint, 3.5, 'F');
      d.arrow(X + w * .3, y - 6, X + w * .3 - 12 - F * .6, y - 6, LC.coral, 3.5, 'Fтр');
      d.arrow(X + w / 2, y - Hh, X + w / 2, y - Hh - 70, LC.blue, 3, 'N'); d.arrow(X + w / 2, y - Hh / 2, X + w / 2, y + 60, LC.gold, 3, 'mg');
      d.text(t < 1.5 ? 'Сила растёт — брусок пока покоится' : 'Брусок скользит равномерно: F = Fтр', 22, 56, { size: 12 });
    }
  },
  incline: {
    calc(al, mu) {
      const acc = LAB_G * (Math.sin(al * RAD) - mu * Math.cos(al * RAD));
      return { label: 'Ускорение бруска', value: Math.max(0, acc), unit: 'м/с²', expr: `a = g(sin α − μ cos α) = 9,81 · (${n(Math.sin(al * RAD), 3)} − ${n(mu, 2)} · ${n(Math.cos(al * RAD), 3)}) = ${u(acc, 'м/с²')}`,
        note: acc > .05 ? 'Брусок соскальзывает с постоянным ускорением.' : `Брусок покоится: mg sin α ≤ μmg cos α. Увеличь угол больше ${n(Math.atan(mu) / RAD, 0)}° или уменьши трение.` };
    },
    live(al, mu, t) { const acc = this.calc(al, mu).value; return [['Время', u(t, 'с', 2)], ['Скорость', u(acc * t, 'м/с', 1)], ['Путь', u(Math.min(4, acc * t * t / 2), 'м', 2)]]; },
    dur(al, mu) { const acc = this.calc(al, mu).value; return acc > .05 ? Math.sqrt(8 / acc) : Infinity; },
    draw(d, al, mu, t) {
      d.title('Наклонная плоскость');
      const q = al * RAD, L = 470, X0 = 120, Y0 = 340, acc = this.calc(al, mu).value, s = Math.min(4, acc * t * t / 2);
      const top = [X0 + L * Math.cos(q) * .0, Y0 - L * Math.sin(q)];
      d.path([[X0, Y0 - L * Math.sin(q)], [X0 + L * Math.cos(q), Y0], [X0, Y0]], LC.line, 2, 'rgba(108,140,255,.12)');
      d.arc(X0 + L * Math.cos(q), Y0, 50, Math.PI, Math.PI + q, LC.gold); d.text('α = ' + n(al, 0) + '°', X0 + L * Math.cos(q) - 110, Y0 - 16, { col: LC.gold, size: 12, bold: true });
      const p = (L - 80) * (s / 4) + 40, bx = top[0] + p * Math.cos(q), by = top[1] + p * Math.sin(q);
      d.c.save(); d.c.translate(bx, by); d.c.rotate(q); d.rect(-30, -44, 60, 44, LC.violet, LC.text); d.c.restore();
      const cx = bx + 22 * Math.sin(q), cy = by - 22 * Math.cos(q);
      d.arrow(cx, cy, cx, cy + 80, LC.gold, 3, 'mg');
      d.arrow(cx, cy, cx + 70 * Math.sin(q), cy - 70 * Math.cos(q), LC.blue, 3, 'N');
      if (mu > 0) d.arrow(cx, cy, cx - 70 * mu / .6 * Math.cos(q) - 10 * Math.cos(q), cy - (70 * mu / .6 + 10) * Math.sin(q), LC.coral, 3, 'Fтр');
      if (acc <= .05) d.tag('Брусок покоится', 360, 70, LC.coral);
    }
  },
  elasticity: {
    calc: (k, x) => ({ label: 'Сила упругости', value: k * x, unit: 'Н', expr: `Fупр = k·x = ${u(k, 'Н/м', 0)} · ${u(x, 'м', 3)} = ${u(k * x, 'Н')}`, note: `Энергия пружины kx²/2 = ${u(k * x * x / 2, 'Дж', 3)}` }),
    live(k, x, t) { const xx = x * Math.min(1, t / 1.5); return [['Удлинение', u(xx, 'м', 3)], ['Динамометр', u(k * xx, 'Н', 2)]]; },
    dur: () => 2,
    draw(d, k, x, t) {
      d.title('Растяжение пружины · закон Гука');
      const xx = x * Math.min(1, t / 1.5), L0 = 120, y0 = 60, cx = 280, ext = xx * 560;
      d.rect(cx - 100, y0 - 14, 200, 14, LC.line, LC.mute, 2, 3);
      d.spring(cx, y0, cx, y0 + L0 + ext, 12, 10 + Math.min(10, k / 25), LC.cyan);
      d.rect(cx - 28, y0 + L0 + ext, 56, 30, LC.violet, LC.text);
      d.line(cx + 60, y0 + L0 + 15, cx + 130, y0 + L0 + 15, LC.mute, 1.5, [5, 5]); d.text('без нагрузки', cx + 136, y0 + L0 + 15, { size: 11 });
      if (ext > 6) { d.line(cx + 90, y0 + L0 + 15, cx + 90, y0 + L0 + ext + 15, LC.gold, 2.5); d.text('x = ' + u(xx, 'м', 3), cx + 100, y0 + L0 + ext / 2 + 15, { col: LC.gold, size: 12, bold: true }); }
      d.arrow(cx, y0 + L0 + ext + 15, cx, y0 + L0 + ext + 15 - 10 - k * xx * 1.2, LC.mint, 4, 'Fупр');
      // график F(x)
      const gx = 470, gy = 330, gw = 210, gh = 230, Fm = 250 * .3;
      d.line(gx, gy, gx + gw, gy, LC.mute, 2); d.line(gx, gy, gx, gy - gh, LC.mute, 2); d.text('x', gx + gw + 8, gy, { size: 12 }); d.text('F', gx - 4, gy - gh - 12, { size: 12 });
      d.line(gx, gy, gx + gw, gy - gh * k * .3 / Fm, 'rgba(61,214,160,.5)', 2.5);
      d.circle(gx + gw * xx / .3, gy - gh * k * xx / Fm, 7, LC.gold);
      d.text('Прямая: F ∝ x', gx + 10, gy - gh + 6, { size: 12, col: LC.mint });
    }
  },
  torque: {
    calc(F, l) { const M = F * l, M0 = 15; return { label: 'Момент силы справа', value: M, unit: 'Н·м', expr: `M = F·l = ${u(F, 'Н', 0)} · ${u(l, 'м')} = ${u(M, 'Н·м')}`, note: `Слева груз 30 Н на плече 0,5 м: M₀ = 15 Н·м. ` + (Math.abs(M - M0) < .26 ? 'Рычаг в равновесии.' : M > M0 ? 'Перевешивает правая сторона.' : 'Перевешивает левая сторона.') }; },
    live(F, l) { const M = F * l; return [['M справа', u(M, 'Н·м', 1)], ['M слева', '15 Н·м'], ['Итог', Math.abs(M - 15) < .26 ? 'равновесие' : M > 15 ? 'вправо' : 'влево']]; },
    dur: () => 2,
    draw(d, F, l, t) {
      d.title('Рычаг · правило моментов');
      const M = F * l, diff = M - 15, target = Math.abs(diff) < .26 ? 0 : clamp(diff / 30, -1, 1) * 14 * RAD, q = target * Math.min(1, t / 1.2);
      const cx = 360, cy = 230, k = 140; // пикселей на метр
      d.path([[cx, cy + 6], [cx + 34, cy + 80], [cx - 34, cy + 80]], LC.text, 2, LC.violet); d.ground(cy + 82, 240, 480);
      const pt = s => [cx + s * Math.cos(q), cy + s * Math.sin(q)];
      const [lx1, ly1] = pt(-300), [lx2, ly2] = pt(300); d.line(lx1, ly1, lx2, ly2, LC.text, 8);
      for (let m = -2; m <= 2; m += .5) { const [px, py] = pt(m * k); d.circle(px, py, 3, LC.bg, LC.mute, 1.5); }
      const [ax, ay] = pt(-.5 * k); d.line(ax, ay, ax, ay + 50, LC.mute, 2); d.rect(ax - 22, ay + 50, 44, 40, LC.blue, LC.text); d.text('30 Н', ax, ay + 70, { col: LC.text, size: 11, align: 'center', bold: true });
      const [bx, by] = pt(l * k); d.arrow(bx, by, bx, by + 30 + F * 1.1, LC.mint, 4, 'F = ' + n(F, 0) + ' Н');
      d.line(cx, cy - 26, bx, by - 26, LC.gold, 2, [4, 4]); d.text('l = ' + u(l, 'м'), (cx + bx) / 2, cy - 40, { col: LC.gold, size: 12, align: 'center', bold: true });
      d.text('Равновесие: F·l = 15 Н·м', 22, 56, { size: 12 });
    }
  },

  /* ===== 3. Жидкости и газы ===== */
  pressure: {
    calc: (h, rho) => ({ label: 'Давление на глубине', value: rho * LAB_G * h / 1000, unit: 'кПа', expr: `p = ρgh = ${big(rho)} · 9,81 · ${n(h, 1)} = ${u(rho * LAB_G * h / 1000, 'кПа', 1)}`, note: 'Это давление столба жидкости; атмосферное (≈ 101 кПа) добавляется сверху.' }),
    live(h, rho, t) { const hh = h * Math.min(1, t / 2.5); return [['Глубина', u(hh, 'м', 2)], ['Давление', u(rho * LAB_G * hh / 1000, 'кПа', 1)]]; },
    dur: () => 3,
    draw(d, h, rho, t) {
      d.title('Датчик давления опускают в жидкость');
      const hh = h * Math.min(1, t / 2.5), tx = 150, ty = 70, tw = 300, th = 290, wy = 100, k = (ty + th - wy - 20) / 10;
      d.rect(tx, ty, tw, th, null, LC.mute, 3, 4);
      d.c.fillStyle = `rgba(${Math.round(40 + (rho - 700) / 6)},${Math.round(130 - (rho - 700) / 12)},230,.28)`; d.c.fillRect(tx + 2, wy, tw - 4, ty + th - wy - 2);
      d.line(tx + 2, wy, tx + tw - 2, wy, LC.waterTop, 3);
      for (let v = 0; v <= 10; v += 2) { const Y = wy + v * k; d.line(tx - 12, Y, tx, Y, LC.mute, 2); d.text(v + ' м', tx - 18, Y, { size: 11, align: 'right' }); }
      const Y = wy + hh * k; d.line(tx + tw / 2, 40, tx + tw / 2, Y, LC.text, 2); d.rect(tx + tw / 2 - 16, Y - 10, 32, 20, LC.coral, LC.text, 2, 4);
      const p = rho * LAB_G * hh / 1000; d.gauge(580, 170, 70, p / 130, 'кПа'); d.tag(u(p, 'кПа', 1), 580, 270, LC.gold);
      d.text('ρ = ' + big(rho) + ' кг/м³', tx + 10, ty + th - 16, { size: 12, col: LC.text });
    }
  },
  buoyancy: {
    calc: (V, rho) => ({ label: 'Выталкивающая сила', value: rho * LAB_G * V, unit: 'Н', expr: `Fₐ = ρж·g·V = ${big(rho)} · 9,81 · ${n(V, 3)} = ${u(rho * LAB_G * V, 'Н', 1)}`, note: `Тело из алюминия (2700 кг/м³) весит ${u(2700 * LAB_G * V, 'Н', 1)}; в жидкости динамометр покажет ${u((2700 - rho) * LAB_G * V, 'Н', 1)}.` }),
    live(V, rho, t) { const f = Math.min(1, Math.max(0, (t - .5) / 2)); return [['Погружено', n(f * 100, 0) + ' %'], ['Fₐ', u(rho * LAB_G * V * f, 'Н', 1)], ['Динамометр', u((2700 - rho * f) * LAB_G * V, 'Н', 1)]]; },
    dur: () => 3,
    draw(d, V, rho, t) {
      d.title('Тело погружают в жидкость');
      const f = Math.min(1, Math.max(0, (t - .5) / 2)), s = 30 + Math.cbrt(V) * 160, wy = 210, tx = 160, tw = 330;
      d.rect(tx, 150, tw, 210, null, LC.mute, 3, 4); d.c.fillStyle = LC.water; d.c.fillRect(tx + 2, wy, tw - 4, 148); d.line(tx + 2, wy, tx + tw - 2, wy, LC.waterTop, 3);
      const by = wy - s + f * (s + 20), bx = tx + tw / 2 - s / 2;
      d.line(bx + s / 2, 40, bx + s / 2, 64, LC.text, 2); d.rect(bx + s / 2 - 14, 64, 28, 50, '#1b2542', LC.gold, 2, 4);
      const P = 2700 * LAB_G * V, Fa = rho * LAB_G * V * f; d.rect(bx + s / 2 - 8, 70, 16, 38 * clamp((P - Fa) / 540, .03, 1), LC.gold, null, 0, 3);
      d.line(bx + s / 2, 114, bx + s / 2, by, LC.text, 2); d.rect(bx, by, s, s, '#9aa7c7', LC.text);
      d.arrow(bx + s + 20, by + s / 2, bx + s + 20, by + s / 2 + 20 + P * .25, LC.gold, 3, 'P');
      if (f > 0) d.arrow(bx - 20, by + s / 2, bx - 20, by + s / 2 - 20 - Fa * .25, LC.mint, 3.5, 'Fₐ');
      d.tag('Динамометр: ' + u(P - Fa, 'Н', 1), 600, 90, LC.gold);
    }
  },
  pascal: {
    calc: (S1, S2) => ({ label: 'Сила на большом поршне', value: 100 * S2 / S1, unit: 'Н', expr: `F₂ = F₁ · S₂/S₁ = 100 · ${n(S2, 0)} / ${n(S1, 0)} = ${u(100 * S2 / S1, 'Н', 0)}`, note: `Выигрыш в силе в ${n(S2 / S1, 1)} раза, но большой поршень проходит во столько же раз меньший путь.` }),
    live(S1, S2, t) { const f = Math.min(1, t / 2.5); return [['F₁', '100 Н'], ['Ход малого', u(6 * f, 'см', 1)], ['Ход большого', u(6 * f * S1 / S2, 'см', 2)]]; },
    dur: () => 3,
    draw(d, S1, S2, t) {
      d.title('Гидравлический пресс');
      const f = Math.min(1, t / 2.5), w1 = 24 + Math.sqrt(S1) * 10, w2 = 40 + Math.sqrt(S2) * 13, x1 = 180, x2 = 470, base = 330, top = 170;
      const h1 = 60 * f, h2 = 60 * f * S1 / S2;
      d.c.fillStyle = LC.water;
      d.c.fillRect(x1 - w1 / 2, top + h1, w1, base - top - h1); d.c.fillRect(x2 - w2 / 2, top - h2, w2, base - top + h2); d.c.fillRect(x1, base - 40, x2 - x1, 40);
      d.path([[x1 - w1 / 2, 90], [x1 - w1 / 2, base], [x2 - w2 / 2, base], [x2 - w2 / 2, 90]], LC.mute, 3); d.path([[x1 + w1 / 2, 90], [x1 + w1 / 2, base - 40], [x2 - w2 / 2 + 0, base - 40]], LC.mute, 3);
      d.path([[x2 + w2 / 2, 90], [x2 + w2 / 2, base], [x2 - w2 / 2, base]], LC.mute, 3);
      d.rect(x1 - w1 / 2 + 2, top + h1 - 14, w1 - 4, 14, LC.gold, LC.text, 2, 3); d.rect(x2 - w2 / 2 + 2, top - h2 - 14, w2 - 4, 14, LC.coral, LC.text, 2, 3);
      d.arrow(x1, top + h1 - 80, x1, top + h1 - 18, LC.gold, 3.5, 'F₁');
      d.arrow(x2, top - h2 - 18, x2, top - h2 - 30 - Math.min(150, 100 * S2 / S1 * .05), LC.mint, 4, 'F₂');
      d.text('S₁ = ' + n(S1, 0) + ' см²', x1, base + 22, { size: 12, align: 'center', col: LC.text }); d.text('S₂ = ' + n(S2, 0) + ' см²', x2, base + 22, { size: 12, align: 'center', col: LC.text });
    }
  },
  bernoulli: {
    calc: (r, v1) => ({ label: 'Скорость в узкой части', value: v1 * r, unit: 'м/с', expr: `v₂ = v₁ · S₁/S₂ = ${n(v1, 1)} · ${n(r, 1)} = ${u(v1 * r, 'м/с')}`, note: r > 1 ? 'В сужении скорость выше, а давление ниже (уравнение Бернулли).' : r < 1 ? 'Труба расширяется: скорость падает, давление растёт.' : 'Сечение не меняется — скорость одинакова.' }),
    live: (r, v1) => [['v₁', u(v1, 'м/с', 1)], ['v₂', u(v1 * r, 'м/с', 1)]],
    dur: () => 3,
    draw(d, r, v1, t) {
      d.title('Течение жидкости по трубе');
      const H1 = 140, H2 = H1 / r, cy = 230, xa = 40, xb = 250, xc = 330, xd = 680;
      const top = [[xa, cy - H1 / 2], [xb, cy - H1 / 2], [xc, cy - H2 / 2], [xd, cy - H2 / 2]], bot = [[xa, cy + H1 / 2], [xb, cy + H1 / 2], [xc, cy + H2 / 2], [xd, cy + H2 / 2]];
      d.path([...top, ...bot.slice().reverse()], null, 0, LC.water); d.path(top, LC.mute, 3); d.path(bot, LC.mute, 3);
      for (let i = -2; i <= 2; i++) {
        const y1 = cy + i * H1 / 6, y2 = cy + i * H2 / 6;
        const off = (t * v1 * 60) % 50; for (let x = xa + off; x < xb; x += 50) d.circle(x, y1, 3.5, LC.cyan, null);
        const off2 = (t * v1 * r * 60) % 50; for (let x = xc + off2; x < xd; x += 50) d.circle(x, y2, 3.5, LC.gold, null);
      }
      // манометрические трубки: высота столба ∝ давлению
      const p1 = 110, p2 = clamp(110 - (r * r - 1) * 9 * v1, 10, 160);
      [[150, cy - H1 / 2, p1], [520, cy - H2 / 2, p2]].forEach(([x, y, p]) => { d.rect(x - 8, y - 170, 16, 170, null, LC.mute, 2, 2); d.c.fillStyle = LC.waterTop; d.c.fillRect(x - 6, y - p, 12, p); });
      d.tag('v₁ = ' + u(v1, 'м/с', 1), 150, cy + H1 / 2 + 30, LC.cyan); d.tag('v₂ = ' + u(v1 * r, 'м/с', 1), 520, Math.min(380, cy + H2 / 2 + 30), LC.gold);
    }
  },
  gaspressure: {
    calc: (T, V) => ({ label: 'Давление газа (ν = 1 моль)', value: 8.314 * T / (V / 1000) / 1000, unit: 'кПа', expr: `p = νRT/V = 8,314 · ${n(T, 0)} / ${n(V / 1000, 4)} = ${u(8.314 * T / V, 'кПа', 0)}` }),
    live: (T, V) => [['T', u(T, 'К', 0)], ['V', u(V, 'л', 1)], ['p', u(8.314 * T / V, 'кПа', 0)]],
    dur: () => 3,
    draw(d, T, V, t) {
      d.title('Газ в цилиндре под поршнем');
      const x = 170, w = 220, bot = 350, h = 30 + V * 34, top = bot - h;
      d.path([[x, 60], [x, bot], [x + w, bot], [x + w, 60]], LC.mute, 3); d.rect(x + 3, top - 18, w - 6, 18, LC.gold, LC.text, 2, 3); d.line(x + w / 2, top - 18, x + w / 2, 40, LC.text, 6);
      d.c.save(); d.c.beginPath(); d.c.rect(x + 3, top, w - 6, h - 3); d.c.clip(); gasDots(d, x + 3, top, w - 6, h - 3, 26, Math.sqrt(T / 300) * 1.4, t); d.c.restore();
      const p = 8.314 * T / V; d.gauge(560, 150, 68, p / 10000, 'кПа'); d.tag(u(p, 'кПа', 0), 560, 248, LC.gold);
      d.thermo(470, 170, 130, (T - 150) / 450); d.text(n(T, 0) + ' К', 490, 330, { size: 12, col: LC.coral, bold: true });
    }
  },

  /* ===== 4. Колебания и волны ===== */
  spring: {
    calc: (m, k) => ({ label: 'Период колебаний', value: 2 * Math.PI * Math.sqrt(m / k), unit: 'с', expr: `T = 2π√(m/k) = 2π√(${n(m, 1)}/${n(k, 0)}) = ${u(2 * Math.PI * Math.sqrt(m / k), 'с')}` }),
    live(m, k, t) { const T = 2 * Math.PI * Math.sqrt(m / k); return [['Время', u(t, 'с', 1)], ['Колебаний', n(Math.floor(t / T), 0)], ['x', u(.1 * Math.cos(2 * Math.PI * t / T), 'м', 2)]]; },
    dur(m, k) { return 3 * 2 * Math.PI * Math.sqrt(m / k); },
    draw(d, m, k, t) {
      d.title('Пружинный маятник');
      const T = 2 * Math.PI * Math.sqrt(m / k), x = Math.cos(2 * Math.PI * t / T), cx = 180, y0 = 50, L = 160, Y = y0 + L + x * 60, s = 26 + Math.cbrt(m) * 12;
      d.rect(cx - 70, y0 - 14, 140, 14, LC.line, LC.mute, 2, 3); d.spring(cx, y0, cx, Y, 11, 10 + k / 10, LC.cyan);
      d.rect(cx - s, Y, s * 2, s * 1.2, LC.violet, LC.text); d.text(n(m, 1) + ' кг', cx, Y + s * .6, { col: LC.text, size: 11, align: 'center', bold: true });
      d.line(cx - 90, y0 + L, cx - 60, y0 + L, LC.mute, 2, [4, 4]);
      scope(d, 340, 70, 360, 260, tt => -Math.cos(2 * Math.PI * tt / T), t, 3 * T, 'x(t) · период ' + u(T, 'с'));
    }
  },
  pendulum: {
    calc: (l, A) => ({ label: 'Период малых колебаний', value: 2 * Math.PI * Math.sqrt(l / LAB_G), unit: 'с', expr: `T = 2π√(l/g) = 2π√(${n(l, 1)}/9,81) = ${u(2 * Math.PI * Math.sqrt(l / LAB_G), 'с')}`, note: A > 30 ? 'При углах больше ~30° формула даёт заметную ошибку — период немного больше.' : 'Период не зависит от массы груза и (при малых углах) от амплитуды.' }),
    live(l, A, t) { const T = 2 * Math.PI * Math.sqrt(l / LAB_G); return [['Время', u(t, 'с', 1)], ['Колебаний', n(Math.floor(t / T), 0)], ['Угол', n(A * Math.cos(2 * Math.PI * t / T), 0) + '°']]; },
    dur: l => 3 * 2 * Math.PI * Math.sqrt(l / LAB_G),
    draw(d, l, A, t) {
      d.title('Математический маятник');
      const T = 2 * Math.PI * Math.sqrt(l / LAB_G), q = A * RAD * Math.cos(2 * Math.PI * t / T), cx = 170, cy = 50, L = 60 + l * 130;
      d.rect(cx - 70, cy - 12, 140, 12, LC.line, LC.mute, 2, 3); d.line(cx, cy, cx, cy + L + 20, LC.line, 1.5, [5, 5]);
      d.arc(cx, cy, 40, Math.PI / 2, Math.PI / 2 - A * RAD, LC.violet, 2); d.arc(cx, cy, 40, Math.PI / 2, Math.PI / 2 + A * RAD, LC.violet, 2);
      const X = cx + L * Math.sin(q), Y = cy + L * Math.cos(q); d.line(cx, cy, X, Y, LC.text, 2.5); d.circle(X, Y, 16, LC.gold);
      d.text('l = ' + u(l, 'м', 1), cx + 14, cy + L / 2, { size: 12, col: LC.text });
      scope(d, 340, 70, 360, 260, tt => Math.cos(2 * Math.PI * tt / T), t, 3 * T, 'φ(t) · период ' + u(T, 'с'));
    }
  },
  wave: {
    calc: (f, lam) => ({ label: 'Скорость волны', value: f * lam, unit: 'м/с', expr: `υ = λ·ν = ${u(lam, 'м', 1)} · ${u(f, 'Гц', 1)} = ${u(f * lam, 'м/с')}`, note: `Период T = 1/ν = ${u(1 / f, 'с')}` }),
    live: (f, lam, t) => [['Время', u(t, 'с', 1)], ['Гребень прошёл', u(f * lam * t, 'м', 1)]],
    dur: f => Math.min(10, 3 / f),
    draw(d, f, lam, t) {
      d.title('Бегущая поперечная волна на шнуре');
      const x0 = 40, x1 = 680, k = (x1 - x0) / 8, y = 210, ph = 2 * Math.PI * f * t;
      d.line(x0, y, x1, y, LC.line, 1.5, [5, 5]); d.ruler(x0, x1, 360, 8, 'м', 1);
      d.wave(x0, x1, y, 70, lam * k, ph, LC.cyan, 3.5);
      for (let i = 0; i < 9; i++) { const X = x0 + i * 80; d.circle(X, y - 70 * Math.sin((X - x0) / (lam * k) * 2 * Math.PI - ph), 5, i === 4 ? LC.coral : LC.gold, null); }
      const crest = x0 + ((ph / (2 * Math.PI) + .25) % 1) * lam * k;
      if (crest + lam * k < x1) { d.line(crest, y - 95, crest + lam * k, y - 95, LC.gold, 2); d.line(crest, y - 104, crest, y - 86, LC.gold, 2); d.line(crest + lam * k, y - 104, crest + lam * k, y - 86, LC.gold, 2); d.tag('λ = ' + u(lam, 'м', 1), crest + lam * k / 2, y - 118, LC.gold); }
      d.text('Красная точка колеблется вверх-вниз, а волна бежит вправо', 22, 56, { size: 12 });
    }
  },
  sound: {
    calc: (f, c) => ({ label: 'Длина звуковой волны', value: c / f, unit: 'м', expr: `λ = υ/ν = ${u(c, 'м/с', 0)} / ${u(f, 'Гц', 0)} = ${u(c / f, 'м', 3)}` }),
    live: (f, c) => [['ν', u(f, 'Гц', 0)], ['λ', u(c / f, 'м', 2)]],
    dur: () => 4,
    draw(d, f, c, t) {
      d.title('Звук · сгущения и разрежения воздуха (замедлено)');
      const x0 = 120, x1 = 690, k = (x1 - x0) / 4, lamPx = c / f * k, ph = t * 2 * Math.PI * .8;
      d.rect(40, 140, 60, 140, LC.violet, LC.text); d.circle(100, 210, 24, '#1b2542', LC.text);
      for (let row = 0; row < 9; row++) for (let i = 0; i < 70; i++) {
        const X0 = x0 + i * (x1 - x0) / 70, dx = 6 * Math.sin((X0 - x0) / lamPx * 2 * Math.PI - ph);
        d.circle(X0 + dx, 140 + row * 17, 2.6, row % 2 ? LC.cyan : 'rgba(61,214,195,.6)', null);
      }
      d.ruler(x0, x1, 330, 4, 'м', .5);
      if (lamPx < x1 - x0) { const X = x0 + 10; d.line(X, 120, X + lamPx, 120, LC.gold, 2); d.tag('λ = ' + u(c / f, 'м', 2), X + lamPx / 2, 100, LC.gold); }
    }
  },
  resonance: {
    calc(f0, f) { const r = f / f0, A = 1 / Math.sqrt((1 - r * r) ** 2 + (2 * .08 * r) ** 2); return { label: 'Амплитуда относительно статической', value: A, unit: '×', expr: `A/A₀ = 1/√((1 − r²)² + (2ζr)²), r = ν/ν₀ = ${n(r, 2)} → ${n(A, 2)}`, note: Math.abs(r - 1) < .06 ? 'Резонанс! Частота воздействия совпала с собственной.' : 'Подведи частоту воздействия к собственной частоте — амплитуда резко вырастет.' }; },
    live(f0, f) { return [['ν/ν₀', n(f / f0, 2)], ['Амплитуда', n(this.calc(f0, f).value, 1) + '×']]; },
    dur: () => 4,
    draw(d, f0, f, t) {
      d.title('Вынужденные колебания · резонансная кривая');
      const A = this.calc(f0, f).value, cx = 140, y0 = 60, amp = Math.min(70, A * 9);
      const drive = 8 * Math.sin(2 * Math.PI * Math.min(f, 1.2) * t), Y = 200 + amp * Math.sin(2 * Math.PI * Math.min(f, 1.2) * t - (f > f0 ? Math.PI : 0) * .8);
      d.rect(cx - 60, y0 - 12 + drive, 120, 12, LC.coral, LC.text, 2, 3); d.spring(cx, y0 + drive, cx, Y, 10, 14, LC.cyan); d.rect(cx - 28, Y, 56, 40, LC.violet, LC.text);
      d.text('привод', cx + 70, y0 + drive - 6, { size: 11, col: LC.coral });
      const gx = 300, gy = 340, gw = 390, gh = 260, rmax = 3;
      d.line(gx, gy, gx + gw, gy, LC.mute, 2); d.line(gx, gy, gx, gy - gh, LC.mute, 2); d.text('ν/ν₀', gx + gw - 30, gy + 18, { size: 12 }); d.text('A', gx - 14, gy - gh, { size: 12 });
      const pts = []; for (let i = 0; i <= 200; i++) { const r = rmax * i / 200, a = 1 / Math.sqrt((1 - r * r) ** 2 + (.16 * r) ** 2); pts.push([gx + gw * r / rmax, gy - Math.min(gh, a * gh / 6.5)]); }
      d.path(pts, LC.mint, 2.5); d.line(gx + gw / rmax, gy, gx + gw / rmax, gy - gh, LC.line, 1.5, [5, 5]); d.text('1', gx + gw / rmax, gy + 16, { size: 11, align: 'center' });
      d.circle(gx + gw * Math.min(rmax, f / f0) / rmax, gy - Math.min(gh, A * gh / 6.5), 8, LC.gold);
    }
  },

  /* ===== 5. Термодинамика ===== */
  calorimetry: {
    calc: (m, dT) => ({ label: 'Количество теплоты', value: 4200 * m * dT, unit: 'Дж', expr: `Q = c·m·ΔT = 4200 · ${n(m, 1)} · ${n(dT, 0)} = ${big(4200 * m * dT)} Дж`, note: `≈ ${u(4.2 * m * dT, 'кДж', 1)}; c воды = 4200 Дж/(кг·К).` }),
    live(m, dT, t) { const f = Math.min(1, t / 4); return [['Температура', u(20 + dT * f, '°C', 1)], ['Q', big(4200 * m * dT * f) + ' Дж']]; },
    dur: () => 4,
    draw(d, m, dT, t) {
      d.title('Нагрев воды в калориметре');
      const f = Math.min(1, t / 4), x = 200, w = 200, bot = 330, wh = 30 + m * 60;
      d.path([[x, 110], [x, bot], [x + w, bot], [x + w, 110]], LC.mute, 3); d.c.fillStyle = LC.water; d.c.fillRect(x + 3, bot - wh, w - 6, wh - 2); d.line(x + 3, bot - wh, x + w - 3, bot - wh, LC.waterTop, 2.5);
      d.text(n(m, 1) + ' кг воды', x + w / 2, bot - 20, { size: 12, align: 'center', col: LC.text });
      for (let i = 0; i < 5; i++) { const fl = 10 + 8 * Math.sin(t * 9 + i); d.path([[x + 30 + i * 35, bot + 30], [x + 40 + i * 35, bot + 30 - fl * (t > 0 && f < 1 ? 1 : .2)], [x + 50 + i * 35, bot + 30]], null, 0, t > 0 && f < 1 ? LC.coral : 'rgba(255,122,89,.3)'); }
      d.thermo(x + w - 40, 70, 210, (20 + dT * f) / 100); d.tag(u(20 + dT * f, '°C', 1), 520, 140, LC.coral);
      d.tag('Q = ' + big(4200 * m * dT * f) + ' Дж', 540, 220, LC.gold);
    }
  },
  conduction: {
    calc: (k, dT) => ({ label: 'Тепловой поток через стержень', value: k * .01 * dT / .02, unit: 'Вт', expr: `P = λ·S·ΔT / d = ${n(k, 2)} · 0,01 · ${n(dT, 0)} / 0,02 = ${u(k * .01 * dT / .02, 'Вт', 1)}`, note: 'Площадь сечения S = 0,01 м², толщина d = 2 см.' }),
    live(k, dT, t) { const P = k * .5 * dT; return [['P', u(P, 'Вт', 1)], ['Теплота', u(P * t, 'Дж', 0)]]; },
    dur: () => 3,
    draw(d, k, dT, t) {
      d.title('Теплопроводность стенки');
      const P = k * .5 * dT, x0 = 160, x1 = 560, y = 160, h = 80;
      const g = d.c.createLinearGradient(x0, 0, x1, 0); g.addColorStop(0, `rgba(255,122,89,${.35 + dT / 200})`); g.addColorStop(1, 'rgba(108,140,255,.4)');
      d.rect(x0, y, x1 - x0, h, g, LC.text, 2, 4);
      d.rect(60, y - 30, 100, h + 60, 'rgba(255,122,89,.3)', LC.coral, 2, 6); d.rect(560, y - 30, 100, h + 60, 'rgba(108,140,255,.25)', LC.blue, 2, 6);
      d.text('горячо', 110, y + h + 50, { size: 12, align: 'center', col: LC.coral }); d.text('холодно', 610, y + h + 50, { size: 12, align: 'center', col: LC.blue });
      flowDots(d, [[x0, y + 22], [x1, y + 22]], 30 + P * 1.2, t, LC.gold, 40); flowDots(d, [[x0, y + 58], [x1, y + 58]], 30 + P * 1.2, t + .3, LC.gold, 40);
      d.tag('ΔT = ' + u(dT, 'К', 0), 360, y - 40, LC.text); d.tag('P = ' + u(P, 'Вт', 1), 360, y + h + 40, LC.gold);
    }
  },
  idealgas: {
    calc: (p, V) => ({ label: 'Температура газа (ν = 1 моль)', value: p * V / 8.314, unit: 'К', expr: `T = pV/(νR) = ${big(p * 1000)} · ${n(V / 1000, 3)} / 8,314 = ${u(p * V / 8.314, 'К', 0)}`, note: `≈ ${u(p * V / 8.314 - 273.15, '°C', 0)}` }),
    live: (p, V) => [['p', u(p, 'кПа', 0)], ['V', u(V, 'л', 0)], ['T', u(p * V / 8.314, 'К', 0)]],
    dur: () => 3,
    draw(d, p, V, t) {
      d.title('Уравнение состояния pV = νRT');
      const T = p * V / 8.314, x = 170, w = 220, bot = 350, h = 30 + V * 5.2, top = bot - h;
      d.path([[x, 60], [x, bot], [x + w, bot], [x + w, 60]], LC.mute, 3); d.rect(x + 3, top - 18, w - 6, 18, LC.gold, LC.text, 2, 3);
      d.arrow(x + w / 2, top - 80 - p * .1, x + w / 2, top - 22, LC.mint, 3.5, null); d.text('p', x + w / 2 + 12, top - 60, { size: 13, col: LC.mint, bold: true });
      d.c.save(); d.c.beginPath(); d.c.rect(x + 3, top, w - 6, h - 3); d.c.clip(); gasDots(d, x + 3, top, w - 6, h - 3, 26, Math.sqrt(T / 300) * 1.4, t, 3); d.c.restore();
      d.thermo(480, 110, 190, T / 2000); d.tag(u(T, 'К', 0), 580, 200, LC.coral);
    }
  },
  firstlaw: {
    calc: (Q, A) => ({ label: 'Изменение внутренней энергии', value: Q - A, unit: 'Дж', expr: `ΔU = Q − A = ${n(Q, 0)} − ${n(A, 0)} = ${u(Q - A, 'Дж', 0)}`, note: Q - A > 0 ? 'Газ нагревается: внутренняя энергия растёт.' : Q - A < 0 ? 'Газ остывает: работу совершает за счёт внутренней энергии.' : 'Вся теплота ушла на работу — температура не изменилась.' }),
    live(Q, A, t) { const f = Math.min(1, t / 3); return [['Q', u(Q * f, 'Дж', 0)], ['A', u(A * f, 'Дж', 0)], ['ΔU', u((Q - A) * f, 'Дж', 0)]]; },
    dur: () => 3.5,
    draw(d, Q, A, t) {
      d.title('Первое начало термодинамики');
      const f = Math.min(1, t / 3), x = 250, w = 220, bot = 330, h = 140 + A / 1200 * 80 * f, top = bot - h;
      d.path([[x, 60], [x, bot], [x + w, bot], [x + w, 60]], LC.mute, 3); d.rect(x + 3, top - 18, w - 6, 18, LC.gold, LC.text, 2, 3); d.line(x + w / 2, top - 18, x + w / 2, top - 60, LC.text, 6);
      const heat = clamp(.5 + (Q - A) / 4000 * f, .1, 1); d.c.fillStyle = `rgba(255,${Math.round(200 - heat * 120)},${Math.round(160 - heat * 120)},.25)`; d.c.fillRect(x + 3, top, w - 6, h - 3);
      d.c.save(); d.c.beginPath(); d.c.rect(x + 3, top, w - 6, h - 3); d.c.clip(); gasDots(d, x + 3, top, w - 6, h - 3, 22, .6 + heat, t, 5); d.c.restore();
      for (let i = 0; i < 3; i++) d.arrow(110, bot - 40 - i * 40, x - 12, bot - 40 - i * 40, LC.coral, 2 + Q / 500, null);
      d.tag('Q = ' + n(Q, 0) + ' Дж', 150, bot - 160, LC.coral);
      d.arrow(x + w / 2 + 50, top - 20, x + w / 2 + 50, top - 40 - A / 25, LC.mint, 3.5, null); d.tag('A = ' + n(A, 0) + ' Дж', x + w + 90, top - 50, LC.mint);
      d.tag('ΔU = ' + n((Q - A) * f, 0) + ' Дж', x + w / 2, bot + 30, Q - A >= 0 ? LC.gold : LC.blue);
    }
  },
  heatengine: {
    calc(Th, Tc) { const eta = Math.max(0, 1 - Tc / Th) * 100; return { label: 'КПД идеальной машины', value: eta, unit: '%', expr: `η = 1 − Tх/Tн = 1 − ${n(Tc, 0)}/${n(Th, 0)} = ${u(eta, '%', 1)}`, note: Tc >= Th ? 'Холодильник не холоднее нагревателя — машина работать не может.' : 'Реальная машина всегда имеет КПД меньше, чем идеальная (цикл Карно).' }; },
    live(Th, Tc) { const eta = Math.max(0, 1 - Tc / Th); return [['Q₁', '1000 Дж'], ['A', u(1000 * eta, 'Дж', 0)], ['Q₂', u(1000 * (1 - eta), 'Дж', 0)]]; },
    dur(Th, Tc) { return Tc >= Th ? Infinity : 3; },
    draw(d, Th, Tc, t) {
      d.title('Тепловая машина: нагреватель → рабочее тело → холодильник');
      const eta = Math.max(0, 1 - Tc / Th);
      d.rect(250, 50, 220, 60, 'rgba(255,122,89,.3)', LC.coral, 2, 10); d.text('Нагреватель · ' + n(Th, 0) + ' К', 360, 80, { size: 13, align: 'center', col: LC.text, bold: true });
      d.rect(250, 290, 220, 60, 'rgba(108,140,255,.25)', LC.blue, 2, 10); d.text('Холодильник · ' + n(Tc, 0) + ' К', 360, 320, { size: 13, align: 'center', col: LC.text, bold: true });
      d.circle(360, 200, 48, '#1b2542', LC.violet, 3); d.c.save(); d.c.translate(360, 200); d.c.rotate(t * 3 * eta); for (let i = 0; i < 4; i++) { d.c.rotate(Math.PI / 2); d.line(0, 0, 0, -36, LC.violet, 5); } d.c.restore();
      d.rect(345, 112, 30, 40, null, null); d.line(360, 112, 360, 150, LC.coral, 12);
      d.line(360, 250, 360, 288, LC.blue, Math.max(3, 12 * (1 - eta)));
      if (eta > 0) d.arrow(410, 200, 430 + 200 * eta, 200, LC.mint, 4 + 8 * eta, 'A');
      d.tag('η = ' + n(eta * 100, 1) + ' %', 160, 200, LC.gold);
    }
  },

  /* ===== 6. Электричество и магнетизм ===== */
  ohm: {
    calc: (U, R) => ({ label: 'Сила тока', value: U / R, unit: 'А', expr: `I = U/R = ${u(U, 'В', 0)} / ${u(R, 'Ом', 0)} = ${u(U / R, 'А')}` }),
    live: (U, R) => [['U', u(U, 'В', 0)], ['R', u(R, 'Ом', 0)], ['I', u(U / R, 'А')]],
    dur: () => 3,
    draw(d, U, R, t) {
      d.title('Участок цепи · закон Ома');
      const I = U / R, loop = [[120, 110], [600, 110], [600, 300], [120, 300], [120, 110]];
      d.path(loop, LC.cyan, 4); flowDots(d, loop, 20 + I * 25, t, LC.gold, 34);
      d.rect(100, 180, 40, 50, LC.bg, null); d.line(100, 195, 140, 195, LC.text, 4); d.line(110, 212, 130, 212, LC.text, 6); d.text(n(U, 0) + ' В', 60, 205, { size: 12, align: 'right', col: LC.text, bold: true });
      d.rect(300, 92, 120, 36, '#1b2542', LC.violet, 3, 4); d.text('R = ' + n(R, 0) + ' Ом', 360, 110, { size: 12, align: 'center', col: LC.text, bold: true });
      d.gauge(360, 300, 46, I / 24, 'А');
      d.tag('I = ' + u(I, 'А'), 600, 205, LC.gold);
    }
  },
  parallel: {
    calc: (R1, R2) => ({ label: 'Общее сопротивление', value: R1 * R2 / (R1 + R2), unit: 'Ом', expr: `R = R₁R₂/(R₁ + R₂) = ${n(R1, 0)}·${n(R2, 0)}/(${n(R1, 0)} + ${n(R2, 0)}) = ${u(R1 * R2 / (R1 + R2), 'Ом')}`, note: `При U = 12 В: I₁ = ${u(12 / R1, 'А')}, I₂ = ${u(12 / R2, 'А')}, I = ${u(12 / R1 + 12 / R2, 'А')}.` }),
    live: (R1, R2) => [['I₁', u(12 / R1, 'А')], ['I₂', u(12 / R2, 'А')], ['I', u(12 / R1 + 12 / R2, 'А')]],
    dur: () => 3,
    draw(d, R1, R2, t) {
      d.title('Параллельное соединение · U = 12 В');
      const I1 = 12 / R1, I2 = 12 / R2;
      d.path([[200, 120], [80, 120], [80, 330], [640, 330], [640, 120], [520, 120]], LC.cyan, 4);
      d.rect(62, 210, 36, 40, LC.bg, null); d.line(62, 222, 98, 222, LC.text, 4); d.line(70, 238, 90, 238, LC.text, 6);
      [[120, R1, I1, LC.violet, 'R₁'], [240, R2, I2, LC.blue, 'R₂']].forEach(([y, R, I, col, lab]) => {
        d.path([[200, 120], [200, y], [300, y]], LC.cyan, 4); d.path([[420, y], [520, y], [520, 120]], LC.cyan, 4);
        d.rect(300, y - 18, 120, 36, '#1b2542', col, 3, 4); d.text(lab + ' = ' + n(R, 0) + ' Ом', 360, y, { size: 12, align: 'center', col: LC.text, bold: true });
        flowDots(d, [[200, y], [300, y]], 15 + I * 30, t, LC.gold, 30); flowDots(d, [[420, y], [520, y]], 15 + I * 30, t, LC.gold, 30);
        d.tag('I = ' + u(I, 'А'), 470, y + 32, LC.gold);
      });
      flowDots(d, [[520, 120], [640, 120], [640, 330], [80, 330], [80, 120], [200, 120]], 15 + (I1 + I2) * 20, t, LC.gold, 34);
    }
  },
  power: {
    calc: (U, I) => ({ label: 'Мощность', value: U * I, unit: 'Вт', expr: `P = U·I = ${u(U, 'В', 0)} · ${u(I, 'А', 1)} = ${u(U * I, 'Вт', 1)}`, note: `За 1 минуту выделится ${big(U * I * 60)} Дж.` }),
    live(U, I, t) { return [['P', u(U * I, 'Вт', 1)], ['Работа тока', big(U * I * t) + ' Дж']]; },
    dur: () => 3,
    draw(d, U, I, t) {
      d.title('Лампа в цепи · мощность тока');
      const P = U * I, glow = clamp(P / 192, .05, 1), loop = [[120, 110], [600, 110], [600, 300], [120, 300], [120, 110]];
      d.path(loop, LC.cyan, 4); flowDots(d, loop, 20 + I * 20, t, LC.gold, 34);
      const g = d.c.createRadialGradient(360, 205, 5, 360, 205, 40 + glow * 90); g.addColorStop(0, `rgba(255,214,120,${.25 + glow * .7})`); g.addColorStop(1, 'rgba(255,194,75,0)');
      d.c.fillStyle = g; d.c.fillRect(200, 60, 320, 300);
      d.circle(360, 205, 40, `rgba(255,214,120,${.1 + glow * .6})`, LC.gold, 3); d.line(345, 245, 345, 300, LC.text, 3); d.line(375, 245, 375, 300, LC.text, 3);
      d.tag('P = ' + u(P, 'Вт', 1), 360, 140, LC.gold);
    }
  },
  magnetic: {
    calc: (q, v) => ({ label: 'Сила Лоренца', value: q * 1e-6 * v * 1e3 * .5, unit: 'Н', expr: `F = qυB sin α = ${n(q, 1)}·10⁻⁶ · ${n(v, 0)}·10³ · 0,5 · 1 = ${u(q * v * 5e-4, 'Н', 3)}`, note: 'Поле B = 0,5 Тл направлено от нас (×), α = 90°. Сила перпендикулярна скорости — частица движется по дуге.' }),
    live: (q, v) => [['F', u(q * v * 5e-4, 'Н', 3)], ['υ', u(v, 'км/с', 0)]],
    dur: () => 3,
    draw(d, q, v, t) {
      d.title('Заряд в магнитном поле (B от нас)');
      for (let i = 0; i < 12; i++) for (let j = 0; j < 7; j++) { const X = 110 + i * 50, Y = 70 + j * 46; d.line(X - 5, Y - 5, X + 5, Y + 5, 'rgba(108,140,255,.55)', 2); d.line(X - 5, Y + 5, X + 5, Y - 5, 'rgba(108,140,255,.55)', 2); }
      // Радиус дуги r = mυ/(qB): растёт со скоростью, уменьшается с зарядом (масса условная).
      const R = clamp(95 * (v / 100) ** .5 / (q / 2) ** .5, 45, 150), cx = 140, cy = 350 - R, w = (.8 + v / 250) / R * 110;
      const pts = []; const qmax = Math.min(Math.PI, w * 3); for (let i = 0; i <= 60; i++) { const a = qmax * i / 60; pts.push([cx + R * Math.sin(a), cy + R * Math.cos(a)]); }
      d.path(pts, 'rgba(255,194,75,.4)', 2.5, null, [6, 6]);
      const a = Math.min(qmax, w * t), X = cx + R * Math.sin(a), Y = cy + R * Math.cos(a);
      d.circle(X, Y, 12, LC.coral); d.text('+', X, Y + 1, { size: 13, align: 'center', col: LC.text, bold: true });
      d.arrow(X, Y, X + 60 * Math.cos(a), Y - 60 * Math.sin(a), LC.mint, 3.5, 'υ'); d.arrow(X, Y, X + (cx - X) / R * 55, Y + (cy - Y) / R * 55, LC.gold, 3.5, 'F');
      d.tag('r ∝ mυ/(qB)', 560, 70, LC.text);
    }
  },
  induction: {
    calc: (B, S) => ({ label: 'ЭДС индукции', value: 100 * B * S / 2, unit: 'В', expr: `|ε| = N·ΔΦ/Δt = N·B·S/Δt = 100 · ${n(B, 2)} · ${n(S, 3)} / 2 = ${u(50 * B * S, 'В', 3)}`, note: 'Магнит вдвигают в катушку из 100 витков за Δt = 2 с.' }),
    live(B, S, t) { const moving = t > .3 && t < 2.3; return [['Φ', u(B * S * clamp((t - .3) / 2, 0, 1), 'Вб', 4)], ['ε', moving ? u(50 * B * S, 'В', 3) : '0 В']]; },
    dur: () => 3,
    draw(d, B, S, t) {
      d.title('Магнит вдвигают в катушку');
      const f = clamp((t - .3) / 2, 0, 1), moving = t > .3 && t < 2.3, cx = 420, coilW = 130, coilH = 60 + Math.sqrt(S) * 220;
      for (let i = 0; i < 10; i++) d.c.ellipse && (d.c.beginPath(), d.c.ellipse(cx - coilW / 2 + i * coilW / 9, 200, 12, coilH / 2, 0, 0, Math.PI * 2), d.c.strokeStyle = LC.cyan, d.c.lineWidth = 3, d.c.stroke());
      const mx = 80 + f * 270; d.rect(mx, 180, 60, 40, LC.coral, LC.text, 2, 3); d.rect(mx + 60, 180, 60, 40, LC.blue, LC.text, 2, 3);
      d.text('N', mx + 30, 200, { size: 13, align: 'center', col: LC.text, bold: true }); d.text('S', mx + 90, 200, { size: 13, align: 'center', col: LC.text, bold: true });
      for (let i = -2; i <= 2; i++) d.line(mx + 120, 200 + i * 10, mx + 200 + Math.abs(i) * -8, 200 + i * 28 * B, 'rgba(255,122,89,.4)', 2);
      d.line(cx + coilW / 2, 200 - coilH / 2, 620, 200 - coilH / 2, LC.text, 2); d.line(cx + coilW / 2, 200 + coilH / 2, 620, 200 + coilH / 2, LC.text, 2);
      d.gauge(620, 200, 50, .5 + (moving ? clamp(50 * B * S, 0, 10) / 10 * .5 : 0), 'В');
      d.text(moving ? 'Поток меняется — в катушке возникает ток' : (f >= 1 ? 'Магнит остановился — тока нет' : 'Магнит неподвижен — тока нет'), 22, 56, { size: 12, col: moving ? LC.mint : LC.mute });
    }
  },

  /* ===== 7. Оптика ===== */
  reflection: {
    calc(al, phi) {
      const inc = al - phi; // угол падения относительно новой нормали
      if (Math.abs(inc) >= 89) return { label: 'Угол отражения', value: NaN, unit: '°', expr: 'Луч идёт вдоль зеркала или за ним — отражения нет.', note: 'Уменьши угол падения или поворот зеркала.' };
      return { label: 'Угол отражения', value: Math.abs(inc), unit: '°', expr: `β = α′ = α − φ = ${n(al, 0)}° − (${n(phi, 0)}°) = ${n(Math.abs(inc), 0)}°`, note: phi ? `Зеркало повернули на ${n(Math.abs(phi), 0)}° — отражённый луч повернулся на ${n(Math.abs(2 * phi), 0)}°.` : 'Угол отражения равен углу падения; оба отсчитываются от нормали.' };
    },
    live(al, phi) { const r = this.calc(al, phi); return [['α′ (к нормали)', Number.isFinite(r.value) ? n(r.value, 0) + '°' : '—'], ['β', Number.isFinite(r.value) ? n(r.value, 0) + '°' : '—']]; },
    dur(al, phi) { return Math.abs(al - phi) >= 89 ? Infinity : 2.5; },
    draw(d, al, phi, t) {
      d.title('Плоское зеркало · отражение луча');
      const O = [360, 300], ph = phi * RAD, len = 240, f = clamp(t / 1.2, 0, 1), g = clamp((t - 1.2) / 1.2, 0, 1);
      const mx = Math.cos(ph), my = Math.sin(ph); // направление зеркала (повернуто против часовой при φ > 0)
      d.line(O[0] - 200 * mx, O[1] + 200 * my, O[0] + 200 * mx, O[1] - 200 * my, LC.text, 6);
      for (let s = -190; s <= 190; s += 18) d.line(O[0] + s * mx, O[1] - s * my, O[0] + s * mx - 8 * my + 6 * mx, O[1] - s * my + 8 * mx + 6 * my, LC.line, 2);
      const nx = -Math.sin(ph), ny = -Math.cos(ph); // нормаль (вверх)
      d.line(O[0], O[1], O[0] + nx * 210, O[1] + ny * 210, LC.mute, 2, [6, 6]); d.text('нормаль', O[0] + nx * 214, O[1] + ny * 214 - 10, { size: 11, align: 'center' });
      const din = [Math.sin(al * RAD), Math.cos(al * RAD)]; // падающий луч идёт вправо-вниз под углом al к вертикали
      const S = [O[0] - din[0] * len, O[1] - din[1] * len];
      const dot = din[0] * nx + din[1] * ny, ref = [din[0] - 2 * dot * nx, din[1] - 2 * dot * ny];
      if (Math.abs(al - phi) >= 89) { d.tag('Луч не попадает на зеркало', 360, 80, LC.coral); return; }
      d.arrow(S[0], S[1], S[0] + (O[0] - S[0]) * Math.max(.02, f), S[1] + (O[1] - S[1]) * Math.max(.02, f), LC.gold, 3.5);
      if (g > 0) d.arrow(O[0], O[1], O[0] + ref[0] * len * g, O[1] + ref[1] * len * g, LC.mint, 3.5);
      const an = Math.atan2(ny, nx), ai = Math.atan2(-din[1], -din[0]), ar = Math.atan2(ref[1], ref[0]);
      d.arc(O[0], O[1], 60, an, ai, LC.gold); d.arc(O[0], O[1], 72, an, ar, LC.mint);
      const inc = Math.abs(al - phi);
      d.tag('α′ = ' + n(inc, 0) + '°', O[0] + 95 * Math.cos((an + ai) / 2), O[1] + 95 * Math.sin((an + ai) / 2), LC.gold);
      if (g > .5) d.tag('β = ' + n(inc, 0) + '°', O[0] + 105 * Math.cos((an + ar) / 2), O[1] + 105 * Math.sin((an + ar) / 2), LC.mint);
    }
  },
  refraction: {
    calc(al, n2) { const b = Math.asin(Math.sin(al * RAD) / n2) / RAD; return { label: 'Угол преломления', value: b, unit: '°', expr: `sin β = sin α / n₂ = sin ${n(al, 0)}° / ${n(n2, 2)} = ${n(Math.sin(al * RAD) / n2, 3)} → β = ${n(b, 1)}°`, note: 'Свет переходит в оптически более плотную среду и прижимается к нормали.' }; },
    live(al, n2) { return [['α', n(al, 0) + '°'], ['β', n(this.calc(al, n2).value, 1) + '°'], ['υ в среде', u(300 / n2, 'тыс. км/с', 0)]]; },
    dur: () => 2.5,
    draw(d, al, n2, t) {
      d.title('Преломление света на границе воздух → среда');
      const O = [360, 200], len = 200, b = this.calc(al, n2).value * RAD, a = al * RAD, f = clamp(t / 1.2, 0, 1), g = clamp((t - 1.2) / 1.2, 0, 1);
      d.c.fillStyle = `rgba(61,140,255,${.08 + (n2 - 1) * .15})`; d.c.fillRect(0, 200, LAB_W, 200); d.line(0, 200, LAB_W, 200, LC.cyan, 2.5);
      d.text('воздух · n₁ = 1', 22, 180, { size: 12 }); d.text('среда · n₂ = ' + n(n2, 2), 22, 225, { size: 12, col: LC.text });
      d.line(360, 40, 360, 370, LC.mute, 2, [6, 6]);
      const S = [O[0] - len * Math.sin(a), O[1] - len * Math.cos(a)];
      d.arrow(S[0], S[1], S[0] + (O[0] - S[0]) * Math.max(.02, f), S[1] + (O[1] - S[1]) * Math.max(.02, f), LC.gold, 3.5);
      if (g > 0) { d.arrow(O[0], O[1], O[0] + len * Math.sin(b) * g, O[1] + len * Math.cos(b) * g, LC.mint, 3.5); d.line(O[0], O[1], O[0] + 150 * Math.sin(a) * g, O[1] - 150 * Math.cos(a) * g, 'rgba(255,194,75,.3)', 2); }
      d.arc(O[0], O[1], 60, -Math.PI / 2, -Math.PI / 2 - a, LC.gold); d.tag('α = ' + n(al, 0) + '°', O[0] - 70 * Math.sin(a / 2) - 20, O[1] - 90 * Math.cos(a / 2), LC.gold);
      if (g > .4) { d.arc(O[0], O[1], 70, Math.PI / 2, Math.PI / 2 - b, LC.mint); d.tag('β = ' + n(b / RAD, 1) + '°', O[0] + 80 * Math.sin(b / 2) + 30, O[1] + 100 * Math.cos(b / 2), LC.mint); }
    }
  },
  lens: {
    calc(f, a) {
      const o = opticsInfo(f, a);
      if (o.inf) return { label: 'Расстояние до изображения', value: Infinity, unit: 'см', expr: '1/b = 1/f − 1/a = 0 → изображение на бесконечности', note: 'Предмет в фокусе: лучи после линзы идут параллельно.' };
      return { label: o.real ? 'Расстояние до изображения' : 'Мнимое изображение (перед линзой)', value: o.b, unit: 'см', expr: `1/a + 1/b = 1/f → b = fa/(a − f) = ${n(f, 1)}·${n(a, 0)}/(${n(a, 0)} − ${n(f, 1)}) = ${u(o.b, 'см', 1)}`, note: `Изображение ${o.kind}; увеличение Γ = |b|/a = ${n(Math.abs(o.G), 2)}.` + (o.real ? '' : ' Знак «−»: изображение по ту же сторону, что и предмет.') };
    },
    live(f, a) { const o = opticsInfo(f, a); return [['a', u(a, 'см', 0)], ['b', o.inf ? '∞' : u(o.b, 'см', 1)], ['Γ', o.inf ? '∞' : n(Math.abs(o.G), 2)]]; },
    dur: () => 2.5,
    draw(d, f, a, t) { opticsDraw(d, f, a, t, false); }
  },
  mirror: {
    calc(F, a) {
      const o = opticsInfo(F, a);
      if (o.inf) return { label: 'Расстояние до изображения', value: Infinity, unit: 'см', expr: '1/b = 1/F − 1/a = 0 → изображение на бесконечности', note: 'Предмет в фокусе: отражённые лучи параллельны.' };
      return { label: o.real ? 'Расстояние до изображения' : 'Мнимое изображение (за зеркалом)', value: o.b, unit: 'см', expr: `1/a + 1/b = 1/F → b = Fa/(a − F) = ${n(F, 1)}·${n(a, 0)}/(${n(a, 0)} − ${n(F, 1)}) = ${u(o.b, 'см', 1)}`, note: `Изображение ${o.kind}; увеличение Γ = |b|/a = ${n(Math.abs(o.G), 2)}.` + (o.real ? '' : ' Знак «−»: изображение за зеркалом.') };
    },
    live(F, a) { const o = opticsInfo(F, a); return [['a', u(a, 'см', 0)], ['b', o.inf ? '∞' : u(o.b, 'см', 1)], ['Γ', o.inf ? '∞' : n(Math.abs(o.G), 2)]]; },
    dur: () => 2.5,
    draw(d, F, a, t) { opticsDraw(d, F, a, t, true); }
  },
  interference: {
    calc: (lam, dd) => ({ label: 'Ширина интерференционной полосы', value: lam * 1e-9 / (dd * 1e-3) * 1000, unit: 'мм', expr: `Δx = λL/d = ${n(lam, 0)}·10⁻⁹ · 1 / ${n(dd, 2)}·10⁻³ = ${u(lam * 1e-3 / dd, 'мм', 2)}`, note: 'Расстояние до экрана L = 1 м.' }),
    live: (lam, dd) => [['λ', u(lam, 'нм', 0)], ['Δx', u(lam * 1e-3 / dd, 'мм', 2)]],
    dur: () => 2.5,
    draw(d, lam, dd, t) {
      d.title('Опыт Юнга · две щели');
      const col = lamColor(lam), dx = lam * 1e-3 / dd, f = clamp(t / 1.5, 0, 1), sy = 200, gap = 14 + dd * 50;
      d.rect(110, 70, 14, 260, '#1b2542', LC.mute, 2, 2); d.c.fillStyle = LC.bg; d.c.fillRect(108, sy - gap / 2 - 5, 18, 10); d.c.fillRect(108, sy + gap / 2 - 5, 18, 10);
      d.circle(40, sy, 12, col, null); d.line(52, sy, 108, sy, col, 3);
      for (let r = 20; r < 420 * f; r += 22) { d.c.strokeStyle = col.replace('rgb', 'rgba').replace(')', ',.22)'); d.c.lineWidth = 2; [-1, 1].forEach(s => { d.c.beginPath(); d.c.arc(124, sy + s * gap / 2, r, -Math.PI / 2.4, Math.PI / 2.4); d.c.stroke(); }); }
      d.line(560, 50, 560, 350, LC.text, 3);
      if (f >= 1) {
        const pxmm = 20; // 1 мм на экране = 20 px (масштаб полос)
        for (let y = 50; y <= 350; y += 2) { const I = Math.cos(Math.PI * (y - sy) / pxmm / dx) ** 2; d.c.fillStyle = col.replace('rgb', 'rgba').replace(')', ',' + I.toFixed(2) + ')'); d.c.fillRect(566, y, 70, 2); }
        d.line(650, sy, 650, sy + dx * pxmm, LC.gold, 2); d.tag('Δx = ' + u(dx, 'мм', 2), 650, sy + dx * pxmm + 20, LC.gold);
      }
      d.text('d = ' + u(dd, 'мм', 2), 140, 360, { size: 12, col: LC.text }); d.text('экран (L = 1 м)', 560, 372, { size: 11, align: 'center' });
    }
  }
};

/** Цвет видимого света по длине волны (приближённо). */
function lamColor(l) {
  const s = [[400, [130, 70, 255]], [450, [70, 110, 255]], [490, [40, 200, 230]], [530, [70, 230, 90]], [580, [255, 230, 40]], [620, [255, 140, 30]], [700, [255, 50, 40]]];
  for (let i = 1; i < s.length; i++) if (l <= s[i][0]) { const [l0, c0] = s[i - 1], [l1, c1] = s[i], k = (l - l0) / (l1 - l0); return 'rgb(' + c0.map((v, j) => Math.round(v + (c1[j] - v) * k)).join(',') + ')'; }
  return 'rgb(255,50,40)';
}

/** Построение изображения в собирающей линзе (mirror = false) или вогнутом зеркале (mirror = true). */
function opticsDraw(d, f, a, t, mirror) {
  d.title(mirror ? 'Вогнутое зеркало · построение изображения' : 'Собирающая линза · построение изображения');
  const o = opticsInfo(f, a), axisY = 220, prog = clamp(t / 2, 0, 1);
  // Высоту предмета уменьшаем при большом увеличении, чтобы изображение поместилось на рисунке.
  const ho = o.inf ? 70 : clamp(150 / Math.max(1, Math.abs(o.G)), 24, 70);
  // Масштаб подбираем так, чтобы на экране поместились предмет, фокусы и (по возможности) изображение.
  const base = Math.max(a, 2 * f), ext = Math.max(base, o.inf ? 0 : Math.min(Math.abs(o.b), 3 * base));
  const L = mirror ? 600 : 360; // положение линзы / зеркала по X
  const room = mirror ? 560 : 330, k = room / (ext * 1.08);
  const X = cm => mirror ? L - cm * k : L - cm * k; // предмет слева: x = L − a·k
  d.line(20, axisY, 700, axisY, LC.line, 2);
  if (mirror) { d.c.strokeStyle = LC.cyan; d.c.lineWidth = 6; d.c.beginPath(); d.c.moveTo(L - 14, axisY - 150); d.c.quadraticCurveTo(L + 14, axisY, L - 14, axisY + 150); d.c.stroke(); for (let y = -140; y <= 140; y += 16) d.line(L + 6 - Math.abs(y) / 15, axisY + y, L + 16 - Math.abs(y) / 15, axisY + y + 6, LC.line, 2); }
  else { d.c.strokeStyle = LC.cyan; d.c.lineWidth = 5; d.c.beginPath(); d.c.moveTo(L, axisY - 150); d.c.quadraticCurveTo(L - 26, axisY, L, axisY + 150); d.c.quadraticCurveTo(L + 26, axisY, L, axisY - 150); d.c.stroke(); }
  const mark = (cm, lab) => { const x = X(cm); if (x < 10 || x > 710) return; d.circle(x, axisY, 4, LC.gold, null); d.text(lab, x, axisY + 18, { size: 12, align: 'center', col: LC.gold, bold: true }); };
  mark(f, 'F'); mark(2 * f, mirror ? 'C' : '2F'); if (!mirror) { const x = L + f * k; if (x < 710) { d.circle(x, axisY, 4, LC.gold, null); d.text('F′', x, axisY + 18, { size: 12, align: 'center', col: LC.gold, bold: true }); } }
  const ox = X(a); d.arrow(ox, axisY, ox, axisY - ho, LC.gold, 4); d.text('предмет', ox, axisY - ho - 16, { size: 11, align: 'center', col: LC.gold });
  if (o.inf) { d.tag('Изображение на бесконечности', 360, 60, LC.coral); return; }
  // Экранные координаты изображения: действительное — справа от линзы / перед зеркалом.
  const ix = mirror ? L - o.b * k : L + o.b * k, iy = axisY - ho * o.G;
  const top = [ox, axisY - ho];
  // Два характерных луча: параллельный оси и через центр (линза) / через фокус (зеркало).
  const seg = (p, q, col, dash, w = 2.5) => d.line(p[0], p[1], p[0] + (q[0] - p[0]) * prog, p[1] + (q[1] - p[1]) * prog, col, w, dash);
  const hitParallel = [L, axisY - ho];
  seg(top, hitParallel, LC.mint);
  if (mirror) {
    // параллельный луч отражается через фокус F (слева от зеркала)
    const Fx = L - f * k, dir = [Fx - L, axisY - hitParallel[1]], far = [L + dir[0] * 6, hitParallel[1] + dir[1] * 6];
    if (prog >= 1) d.line(hitParallel[0], hitParallel[1], far[0], far[1], LC.mint, 2.5);
    // луч через центр кривизны C возвращается сам на себя — второй луч: в вершину зеркала, отражается симметрично оси
    const v = [L, axisY]; seg(top, v, LC.violet);
    if (prog >= 1) d.line(v[0], v[1], v[0] + (top[0] - L) * 3, axisY + (axisY - top[1]) * 3, LC.violet, 2.5);
    if (!o.real && prog >= 1) { d.line(hitParallel[0], hitParallel[1], ix, iy, LC.mint, 1.6, [6, 6]); d.line(v[0], v[1], ix, iy, LC.violet, 1.6, [6, 6]); }
  } else {
    const Fp = [L + f * k, axisY], dir = [Fp[0] - L, Fp[1] - hitParallel[1]], far = [L + dir[0] * 8, hitParallel[1] + dir[1] * 8];
    if (prog >= 1) d.line(hitParallel[0], hitParallel[1], far[0], far[1], LC.mint, 2.5);
    const c0 = [L, axisY], cdir = [L - top[0], axisY - top[1]], cfar = [L + cdir[0] * 8, axisY + cdir[1] * 8];
    seg(top, c0, LC.violet); if (prog >= 1) d.line(c0[0], c0[1], cfar[0], cfar[1], LC.violet, 2.5);
    if (!o.real && prog >= 1) { d.line(hitParallel[0], hitParallel[1], ix, iy, LC.mint, 1.6, [6, 6]); d.line(c0[0], c0[1], ix, iy, LC.violet, 1.6, [6, 6]); }
  }
  if (prog >= 1) {
    const vis = ix > 10 && ix < 710 && iy > 10 && iy < 390;
    if (vis) { d.arrow(ix, axisY, ix, iy, o.real ? LC.coral : LC.pink, 4); if (!o.real) d.line(ix, axisY, ix, iy, LC.bg, 1, [3, 6]); d.tag(o.real ? 'действительное' : 'мнимое', ix, iy + (iy < axisY ? -22 : 22), o.real ? LC.coral : LC.pink); }
    else d.tag('Изображение за пределами рисунка: b = ' + u(o.b, 'см', 0), 360, 380, LC.coral);
  }
}

/* ---------- Состояние и экран опыта ---------- */
const LAB_SPEEDS = [.5, 1, 2];
let labHoldTimer = 0, labHoldRep = 0, labHeld = false;

function labFresh(id) {
  const x = LABS[id];
  return { id, a: x.a0, b: x.b0, va: x.a0, vb: x.b0, t: 0, run: false, paused: false, completed: false, raf: 0, last: 0, speed: LAB.speed || 1, runs: [] };
}
function labModel() { const x = LABS[LAB.id]; return x && LAB_MODELS[x.model]; }

function vLabExp(r) {
  const x = LABS[r.exp]; if (!x) { location.hash = 'lab'; return; }
  if (LAB.id !== r.exp || !LAB.runs) LAB = labFresh(r.exp);
  const g = labTopic(x.ch, x.topic);
  frame(x.title, { back: true, sub: 'Раздел ' + x.ch + ' · ' + (g ? g.title : 'Опыт') });
  const param = k => {
    const lab = k === 'a' ? x.a : x.b, unit = k === 'a' ? x.uA : x.uB, min = k === 'a' ? x.amin : x.bmin, max = k === 'a' ? x.amax : x.bmax;
    return `<div class="lp"><div class="lp-top"><span>${esc(lab)}</span><b id="lab-${k}v">${labVal(k)}</b></div>
      <div class="lp-row"><button type="button" class="lp-btn" data-act="labAdjust" data-key="${k}" data-delta="-1" aria-label="Уменьшить: ${esc(lab)}">−</button>
      <div class="lp-track" aria-hidden="true"><i id="lab-${k}bar"></i></div>
      <button type="button" class="lp-btn" data-act="labAdjust" data-key="${k}" data-delta="1" aria-label="Увеличить: ${esc(lab)}">+</button></div>
      <div class="lp-lim"><span>${f1(min, 3)} ${esc(unit)}</span><span>удерживай кнопку для быстрой смены</span><span>${f1(max, 3)} ${esc(unit)}</span></div></div>`;
  };
  setMain(`<section class="lab-x">
    <div class="lab-stagebox"><canvas id="lab-canvas" aria-label="Модель опыта: ${esc(x.title)}"></canvas>
      <div class="lab-strip"><div class="lab-hud" id="lab-hud"></div><span class="lab-badge" id="lab-state">Готов</span><button class="lab-mini" data-act="labStart" id="lab-go2" aria-label="Запустить">${ic('play')}</button></div></div>
    <div class="lab-bar">
      <button class="btn lab-go" data-act="labStart" id="lab-go">${ic('play')}<span>Запустить</span></button>
      <button class="btn line lab-ic" data-act="labReset" aria-label="Сбросить опыт">${ic('rotate-ccw')}</button>
      <div class="seg lab-speed" role="group" aria-label="Скорость">${LAB_SPEEDS.map(s => `<button type="button" data-act="labSpeed" data-v="${s}" class="${s === LAB.speed ? 'on' : ''}">${s === .5 ? '½×' : s + '×'}</button>`).join('')}</div>
    </div>
    <p class="lab-msg" id="lab-hint"></p>
    <div class="lab-cols">
      <section class="card lab-params"><div class="lab-h">${ic('sliders-horizontal', 'blue')}<b>Параметры</b></div>${param('a')}${param('b')}</section>
      <section class="card lab-res"><div class="lab-h">${ic('target', 'mint')}<b id="lab-ml">Результат</b></div>
        <div class="lab-big" id="lab-mv">—</div><div class="lab-expr" id="lab-expr"></div><p class="lab-note" id="lab-note"></p>
        <div class="lab-runs" id="lab-runs"></div></section>
    </div>
    <section class="card lab-task"><div class="lab-h">${ic('book-open', 'violet')}<b>Задание</b></div><p>${esc(x.task)}</p>
      <div class="formula">${esc(x.formula)}</div>
      <details><summary>Оборудование и порядок опыта</summary>
        <div class="lab-setup"><div><small>Оборудование</small><p>${esc(x.apparatus)}</p></div><div><small>Порядок</small><p>${esc(x.procedure)}</p></div><div><small>На что обратить внимание</small><p>${esc(x.observe)}</p></div></div>
        <p class="mute">${esc(x.desc)}</p></details></section></section>`);
  labUI(); labDraw();
  if (!labDraw.ro && 'ResizeObserver' in window) { labDraw.ro = new ResizeObserver(() => { if ($('#lab-canvas')) labDraw(); }); }
  if (labDraw.ro) { labDraw.ro.disconnect(); labDraw.ro.observe($('#lab-canvas')); }
}
function labVal(k) { const x = LABS[LAB.id], un = k === 'a' ? x.uA : x.uB; return f1(LAB[k], 3) + (!un ? '' : un === '°' ? '°' : ' ' + un); }

/** Обновляет всё, кроме холста: результат, приборы, кнопки, подсказку. */
function labUI() {
  const x = LABS[LAB.id], M = labModel(); if (!x || !M) return;
  const r = M.calc(LAB.a, LAB.b), dur = M.dur(LAB.a, LAB.b);
  const set = (id, v, html) => { const el = $('#' + id); if (el) el[html ? 'innerHTML' : 'textContent'] = v; };
  set('lab-av', labVal('a')); set('lab-bv', labVal('b'));
  ['a', 'b'].forEach(k => { const min = k === 'a' ? x.amin : x.bmin, max = k === 'a' ? x.amax : x.bmax, bar = $('#lab-' + k + 'bar'); if (bar) bar.style.width = (100 * (LAB[k] - min) / (max - min)).toFixed(1) + '%'; });
  set('lab-ml', r.label);
  const val = !Number.isFinite(r.value) ? (Number.isNaN(r.value) ? '—' : '∞') : (Math.abs(r.value) >= 10000 ? big(r.value) : f1(r.value, Math.abs(r.value) < 1 ? 3 : 2));
  set('lab-mv', val + (Number.isFinite(r.value) && r.unit ? (r.unit === '°' ? '' : ' ') + r.unit : ''));
  set('lab-expr', esc(r.expr), true); set('lab-note', r.note || '');
  set('lab-hud', M.live(LAB.va, LAB.vb, Math.max(0, Math.min(LAB.t, Number.isFinite(dur) ? dur : LAB.t))).map(([k, v]) => `<span><small>${esc(k)}</small><b>${esc(v)}</b></span>`).join(''), true);
  const go = $('#lab-go');
  if (go) {
    const running = LAB.run;
    go.dataset.act = running ? 'labPause' : 'labStart';
    go.innerHTML = ic(running ? 'pause' : LAB.completed ? 'repeat' : 'play') + '<span>' + (running ? 'Пауза' : LAB.completed ? 'Ещё раз' : LAB.paused ? 'Продолжить' : 'Запустить') + '</span>';
    go.disabled = !Number.isFinite(dur) && !running;
  }
  const g2 = $('#lab-go2');
  if (g2) { g2.dataset.act = LAB.run ? 'labPause' : 'labStart'; g2.innerHTML = ic(LAB.run ? 'pause' : LAB.completed ? 'repeat' : 'play'); g2.disabled = !Number.isFinite(dur) && !LAB.run; g2.setAttribute('aria-label', LAB.run ? 'Пауза' : 'Запустить'); }
  set('lab-state', LAB.completed ? 'Готово' : LAB.run ? 'Идёт опыт' : LAB.paused ? 'Пауза' : 'Готов');
  const st = $('#lab-state'); if (st) st.className = 'lab-badge' + (LAB.run ? ' on' : LAB.completed ? ' done' : '');
  if (!Number.isFinite(dur)) set('lab-hint', 'С такими параметрами опыт не пойдёт: ' + (r.note || 'измени значения.'));
  else if (!LAB.run && !LAB.completed && !LAB.paused) set('lab-hint', LAB_DONE.has(LAB.id) ? 'Опыт уже засчитан. Меняй параметры и сравнивай результаты.' : 'Настрой параметры и нажми «Запустить». Опыт засчитается, когда установка доработает до конца.');
  const runs = $('#lab-runs');
  if (runs) runs.innerHTML = LAB.runs.length ? `<small>Твои запуски — сравни:</small><table><tr><th>${esc(x.a)}</th><th>${esc(x.b)}</th><th>Итог</th></tr>${LAB.runs.map(q => `<tr><td>${f1(q.a, 3)}</td><td>${f1(q.b, 3)}</td><td>${esc(q.v)}</td></tr>`).join('')}</table>` : '';
}
function labDraw() {
  const cv = $('#lab-canvas'), M = labModel(); if (!cv || !M) return;
  const d = labPainter(cv); d.clear();
  const dur = M.dur(LAB.va, LAB.vb);
  try { M.draw(d, LAB.va, LAB.vb, Number.isFinite(dur) ? Math.min(LAB.t, dur) : LAB.t); }
  catch (e) { console.error('lab draw', e); d.text('Не удалось нарисовать установку', 360, 200, { align: 'center', col: LC.coral }); }
}
function labStop(msg, paused = false) {
  LAB.run = false; LAB.paused = paused; if (LAB.raf) cancelAnimationFrame(LAB.raf); LAB.raf = 0; labUI();
}
function labFrame(now) {
  if (!LAB.run) return;
  const dt = Math.min(.05, (now - LAB.last) / 1000 || 0) * (LAB.speed || 1); LAB.last = now; LAB.t += dt;
  LAB.va += (LAB.a - LAB.va) * Math.min(1, dt * 8); LAB.vb += (LAB.b - LAB.vb) * Math.min(1, dt * 8);
  const end = labModel().dur(LAB.va, LAB.vb);
  if (Number.isFinite(end) && LAB.t >= end) { LAB.t = end; labDraw(); labComplete(); return; }
  labDraw(); labUI();
  LAB.raf = requestAnimationFrame(labFrame);
}
function labRun() {
  if (LAB.run) return;
  if (LAB.completed) { LAB.t = 0; LAB.completed = false; }
  LAB.va = LAB.a; LAB.vb = LAB.b;
  if (!Number.isFinite(labModel().dur(LAB.a, LAB.b))) { labUI(); return; }
  LAB.run = true; LAB.paused = false; LAB.last = performance.now();
  const h = $('#lab-hint'); if (h) h.textContent = 'Наблюдай за установкой. Значения можно менять прямо во время опыта.';
  labUI(); LAB.raf = requestAnimationFrame(labFrame);
}
function labComplete() {
  LAB.run = false; LAB.paused = false; LAB.completed = true; if (LAB.raf) cancelAnimationFrame(LAB.raf); LAB.raf = 0;
  const r = labModel().calc(LAB.a, LAB.b);
  LAB.runs.unshift({ a: LAB.a, b: LAB.b, v: Number.isFinite(r.value) ? (Math.abs(r.value) >= 10000 ? big(r.value) : f1(r.value, 2)) + ' ' + r.unit : '—' }); LAB.runs = LAB.runs.slice(0, 5);
  const first = !LAB_DONE.has(LAB.id);
  if (first) { LAB_DONE.add(LAB.id); try { localStorage.setItem('f2-lab-done', JSON.stringify([...LAB_DONE])); } catch (e) {} addXP(15, 'Опыт'); toast('Опыт выполнен · +15 XP'); }
  labUI();
  const h = $('#lab-hint'); if (h) h.textContent = first ? 'Опыт засчитан. Измени один параметр и запусти снова — сравни результаты в таблице.' : 'Запуск записан в таблицу. Попробуй другое значение.';
}
function labAdjust(k, delta) {
  const x = LABS[LAB.id]; if (!x || !['a', 'b'].includes(k)) return;
  const step = k === 'a' ? x.stA : x.stB, min = k === 'a' ? x.amin : x.bmin, max = k === 'a' ? x.amax : x.bmax;
  const v = clamp(Math.round((LAB[k] + delta * step) / step) * step, min, max);
  LAB[k] = +v.toFixed(6);
  if (!LAB.run) { LAB.va = LAB.a; LAB.vb = LAB.b; if (LAB.completed) { LAB.completed = false; LAB.t = 0; } }
  const el = $('#lab-' + k + 'v'); if (el) el.textContent = labVal(k);
  labDraw(); labUI();
}
function labReset() { labStop(); LAB.t = 0; LAB.completed = false; LAB.paused = false; LAB.va = LAB.a; LAB.vb = LAB.b; labDraw(); labUI(); }

/* Удержание «−/+»: через 0,4 с значение начинает меняться само. Обычный клик обрабатывает общий обработчик. */
document.addEventListener('pointerdown', e => {
  const b = e.target.closest('.lp-btn'); if (!b) return;
  labHeld = false; clearTimeout(labHoldTimer); clearInterval(labHoldRep);
  labHoldTimer = setTimeout(() => { labHeld = true; labHoldRep = setInterval(() => labAdjust(b.dataset.key, +b.dataset.delta), 80); }, 400);
});
['pointerup', 'pointercancel', 'pointerleave'].forEach(tp => document.addEventListener(tp, () => { clearTimeout(labHoldTimer); clearInterval(labHoldRep); }));

/** Действия лаборатории; вызывается из общего обработчика кликов. Возвращает true, если действие обработано. */
function labAction(act, d) {
  switch (act) {
    case 'labStart': labRun(); return true;
    case 'labPause': labStop('', true); const h = $('#lab-hint'); if (h) h.textContent = 'Пауза. Нажми «Продолжить», чтобы досмотреть опыт.'; return true;
    case 'labReset': labReset(); return true;
    case 'labAdjust': if (labHeld) { labHeld = false; return true; } labAdjust(d.key, Number(d.delta)); return true;
    case 'labSpeed': LAB.speed = +d.v; document.querySelectorAll('.lab-speed button').forEach(b => b.classList.toggle('on', +b.dataset.v === LAB.speed)); return true;
  }
  return false;
}

/* ---------- Свободная лаборатория: кнопки −/+ вместо ползунков ----------
   Ползунок остаётся в разметке (скрытым) — песочница по-прежнему слушает его событие input.
   Кнопки меняют значение на шаг; при удержании шаг постепенно растёт. */
function sbStepperize(root = document) {
  root.querySelectorAll('.sb-inspector input[type=range]:not([data-st])').forEach(inp => {
    inp.dataset.st = '1'; inp.hidden = true;
    const w = document.createElement('span'); w.className = 'sbst';
    w.innerHTML = `<button type="button" class="lp-btn" data-sbk="${inp.dataset.sbr}" data-d="-1" aria-label="Меньше">−</button><button type="button" class="lp-btn" data-sbk="${inp.dataset.sbr}" data-d="1" aria-label="Больше">+</button>`;
    inp.after(w);
  });
}
function sbNudge(key, dir, mult = 1) {
  const inp = document.querySelector(`.sb-inspector input[data-sbr="${key}"]`); if (!inp) return;
  const step = Number(inp.step) || 1, min = Number(inp.min), max = Number(inp.max);
  const v = clamp(Math.round((Number(inp.value) + dir * step * mult) / step) * step, min, max);
  inp.value = String(+v.toFixed(4)); inp.dispatchEvent(new Event('input', { bubbles: true }));
}
let sbHold = 0, sbRep = 0, sbHeld = false;
document.addEventListener('pointerdown', e => {
  const b = e.target.closest('.sbst [data-sbk]'); if (!b) return;
  sbHeld = false; clearTimeout(sbHold); clearInterval(sbRep); let n = 0;
  sbHold = setTimeout(() => { sbHeld = true; sbRep = setInterval(() => { n++; sbNudge(b.dataset.sbk, +b.dataset.d, n > 40 ? 20 : n > 15 ? 5 : 1); }, 80); }, 400);
});
['pointerup', 'pointercancel'].forEach(tp => document.addEventListener(tp, () => { clearTimeout(sbHold); clearInterval(sbRep); }));
document.addEventListener('click', e => {
  const b = e.target.closest('.sbst [data-sbk]'); if (!b) return;
  if (sbHeld) { sbHeld = false; return; }
  sbNudge(b.dataset.sbk, +b.dataset.d);
});
new MutationObserver(() => { if (document.querySelector('.sb-inspector input[type=range]:not([data-st])')) sbStepperize(); })
  .observe(document.documentElement, { childList: true, subtree: true });
