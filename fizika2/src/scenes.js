/* ---------- Графика: палитра, рисунки к карточкам, обложки глав, аватары, сцены роликов, симуляции ---------- */
const C = { bg: '#0E1424', bg2: '#141C31', grid: '#1C2642', line: '#2A3658', text: '#E8ECF6', mute: '#8D97B5', blue: '#6C8CFF', coral: '#FF7A59', mint: '#3DD6A0', amber: '#FFC24B', violet: '#B48CFF', pink: '#FF6B8B', cyan: '#3DD6C3' };
const ease = p => p < 0 ? 0 : p > 1 ? 1 : p * p * (3 - 2 * p);
const seg = (p, a, b) => ease((p - a) / (b - a)); // часть анимации между долями a и b
const lerp = (a, b, t) => a + (b - a) * t;

/* ---------- холст ---------- */
function cvArrow(c, x1, y1, x2, y2, col, w = 4, head = 14) {
  const L = Math.hypot(x2 - x1, y2 - y1); if (L < 2) return;
  const a = Math.atan2(y2 - y1, x2 - x1), hx = x2 - Math.cos(a) * head * 0.7, hy = y2 - Math.sin(a) * head * 0.7;
  c.strokeStyle = col; c.fillStyle = col; c.lineWidth = w; c.lineCap = 'round';
  c.beginPath(); c.moveTo(x1, y1); c.lineTo(hx, hy); c.stroke();
  c.beginPath(); c.moveTo(x2, y2); c.lineTo(x2 - Math.cos(a - 0.42) * head, y2 - Math.sin(a - 0.42) * head); c.lineTo(x2 - Math.cos(a + 0.42) * head, y2 - Math.sin(a + 0.42) * head); c.closePath(); c.fill();
}
function cvText(c, s, x, y, size = 28, col = C.text, align = 'left', weight = 700) { c.font = `${weight} ${size}px "Golos UI", system-ui, sans-serif`; c.fillStyle = col; c.textAlign = align; c.textBaseline = 'middle'; c.fillText(s, x, y); c.textAlign = 'left'; }
// формулы на холсте: стрелку вектора (символ U+20D7 после буквы) рисуем сами — шрифты холста её не ставят над буквой
function cvMath(c, s, x, y, size = 30, col = C.text, align = 'left') {
  c.font = `italic 600 ${size}px "Cambria Math", "STIX Two Math", "Times New Roman", serif`; c.fillStyle = col; c.strokeStyle = col; c.textBaseline = 'middle'; c.textAlign = 'left';
  let out = ''; const marks = []; for (const ch of s) { if (ch === '\u20D7') marks.push(out.length - 1); else out += ch; }
  const W = c.measureText(out).width, x0 = align === 'center' ? x - W / 2 : align === 'right' ? x - W : x;
  c.fillText(out, x0, y);
  marks.forEach(i => { const a = x0 + c.measureText(out.slice(0, i)).width, w = c.measureText(out[i]).width, yy = y - size * 0.62, x1 = a + w * 0.12, x2 = a + w * 0.95;
    c.lineWidth = Math.max(1.5, size / 16); c.beginPath(); c.moveTo(x1, yy); c.lineTo(x2, yy); c.stroke(); c.beginPath(); c.moveTo(x2, yy); c.lineTo(x2 - size * 0.16, yy - size * 0.1); c.lineTo(x2 - size * 0.16, yy + size * 0.1); c.closePath(); c.fill(); });
}
function cvDot(c, x, y, r, col) { c.fillStyle = col; c.beginPath(); c.arc(x, y, r, 0, 7); c.fill(); }
function cvBg(c, W, H, grid = true) {
  c.fillStyle = C.bg; c.fillRect(0, 0, W, H);
  if (!grid) return; c.strokeStyle = C.grid; c.lineWidth = 1;
  for (let x = 0; x < W; x += 48) { c.beginPath(); c.moveTo(x + 0.5, 0); c.lineTo(x + 0.5, H); c.stroke(); }
  for (let y = 0; y < H; y += 48) { c.beginPath(); c.moveTo(0, y + 0.5); c.lineTo(W, y + 0.5); c.stroke(); }
}
function cvPath(c, pts, col, w = 4, dash) { c.strokeStyle = col; c.lineWidth = w; c.lineJoin = 'round'; c.lineCap = 'round'; if (dash) c.setLineDash(dash); c.beginPath(); pts.forEach((p, i) => i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1])); c.stroke(); c.setLineDash([]); }
// кривая траектории для сцен: плавная дуга
const curve = t => [140 + 680 * t, 420 - 250 * Math.sin(Math.PI * t * 0.95) - 40 * t];
const curvePts = (a, b, n = 80) => Array.from({ length: n + 1 }, (_, i) => curve(lerp(a, b, i / n)));
const tangentAt = t => { const a = curve(t - 0.002), b = curve(t + 0.002), L = Math.hypot(b[0] - a[0], b[1] - a[1]); return [(b[0] - a[0]) / L, (b[1] - a[1]) / L]; };
function wheel(c, x, y, R, ang, col = C.blue) {
  c.strokeStyle = C.line; c.lineWidth = 10; c.beginPath(); c.arc(x, y, R, 0, 7); c.stroke();
  c.strokeStyle = col; c.lineWidth = 4; c.beginPath(); c.arc(x, y, R, 0, 7); c.stroke();
  for (let k = 0; k < 6; k++) { const a = ang + k * Math.PI / 3; c.strokeStyle = C.line; c.lineWidth = 3; c.beginPath(); c.moveTo(x, y); c.lineTo(x + Math.cos(a) * R, y + Math.sin(a) * R); c.stroke(); }
  cvDot(c, x, y, 8, C.text);
}
function car(c, x, y, col = C.coral) {
  c.fillStyle = col; c.beginPath(); c.roundRect(x - 50, y - 34, 100, 30, 10); c.fill();
  c.beginPath(); c.roundRect(x - 26, y - 56, 54, 26, 9); c.fill();
  c.fillStyle = C.bg; c.fillRect(x - 18, y - 50, 18, 14); c.fillRect(x + 4, y - 50, 18, 14);
  cvDot(c, x - 28, y - 2, 11, '#0B0F1C'); cvDot(c, x + 28, y - 2, 11, '#0B0F1C'); cvDot(c, x - 28, y - 2, 4, C.mute); cvDot(c, x + 28, y - 2, 4, C.mute);
}

/* ---------- сцены роликов: (c, W, H, p — доля сегмента 0..1, t — секунды от начала сегмента) ---------- */
const SCENES = {
  intro(c, W, H, p, t) {
    cvBg(c, W, H, false);
    cvDot(c, 810, 120, 60, C.amber); c.fillStyle = C.bg2; c.fillRect(0, 430, W, H - 430);
    c.strokeStyle = C.line; c.lineWidth = 3; c.beginPath(); c.moveTo(0, 430); c.lineTo(W, 430); c.stroke();
    const x = lerp(-80, W + 80, (t / 9) % 1);
    for (let k = 1; k < 7; k++) cvDot(c, x - 70 - k * 26, 418, 3, C.mute);
    car(c, x, 430);
    c.globalAlpha = seg(p, 0, 0.25); cvText(c, 'ГЛАВА 1', 80, 120, 26, C.blue, 'left', 700);
    cvText(c, 'Кинематика', 80, 175, 64); cvText(c, 'как движется тело', 80, 230, 28, C.mute, 'left', 400); c.globalAlpha = 1;
  },
  point(c, W, H, p, t) {
    cvBg(c, W, H);
    const sx = 330, sy = 270; cvDot(c, sx, sy, 46, C.amber);
    c.strokeStyle = C.line; c.lineWidth = 2; c.setLineDash([6, 8]); c.beginPath(); c.ellipse(sx, sy, 300, 180, 0, 0, 7); c.stroke(); c.setLineDash([]);
    const a = t * 0.6, ex = sx + Math.cos(a) * 300, ey = sy + Math.sin(a) * 180, r = lerp(40, 7, seg(p, 0.35, 0.7));
    cvDot(c, ex, ey, r, C.blue); if (r > 20) { c.fillStyle = C.mint; c.beginPath(); c.arc(ex - 8, ey - 6, r * 0.45, 0, 7); c.fill(); }
    c.globalAlpha = seg(p, 0.6, 0.8); cvText(c, 'материальная точка', ex + 18, ey - 26, 24, C.text); c.globalAlpha = 1;
    cvText(c, 'размеры не важны → точка', 40, 500, 26, C.mute, 'left', 500);
  },
  frame(c, W, H, p, t) {
    cvBg(c, W, H);
    const ox = 160, oy = 440, k1 = seg(p, 0, 0.25);
    cvArrow(c, ox, oy, ox + 640 * k1, oy, C.mute, 3); cvArrow(c, ox, oy, ox, oy - 360 * k1, C.mute, 3);
    if (k1 > 0.9) { cvMath(c, 'x', ox + 650, oy + 26, 28, C.mute); cvMath(c, 'y', ox - 28, oy - 360, 28, C.mute); cvMath(c, 'O', ox - 30, oy + 24, 26, C.mute); }
    // часы
    c.globalAlpha = seg(p, 0.25, 0.4); c.strokeStyle = C.text; c.lineWidth = 4; c.beginPath(); c.arc(840, 100, 46, 0, 7); c.stroke();
    const ha = t * 1.5; cvArrow(c, 840, 100, 840 + Math.cos(ha - 1.57) * 34, 100 + Math.sin(ha - 1.57) * 34, C.amber, 4, 10); c.globalAlpha = 1;
    // тело отсчёта
    c.fillStyle = C.coral; c.beginPath(); c.roundRect(ox - 34, oy - 6, 68, 40, 8); c.fill();
    const k2 = seg(p, 0.45, 0.75), px = ox + 360 + Math.cos(t * 0.7) * 90, py = oy - 210 + Math.sin(t * 0.9) * 60;
    if (k2 > 0) { cvArrow(c, ox, oy, lerp(ox, px, k2), lerp(oy, py, k2), C.blue, 5); cvDot(c, px, py, 10, C.mint); }
    if (k2 > 0.9) cvMath(c, 'r⃗', (ox + px) / 2 - 30, (oy + py) / 2 - 20, 34, C.blue);
    c.globalAlpha = seg(p, 0.75, 0.9); cvText(c, 'система отсчёта = тело + оси + часы', 40, 510, 26, C.mute, 'left', 500); c.globalAlpha = 1;
  },
  traj(c, W, H, p) {
    cvBg(c, W, H);
    const k = seg(p, 0.05, 0.85); cvPath(c, curvePts(0, k), C.blue, 5);
    const [x, y] = curve(k); cvDot(c, x, y, 12, C.mint);
    cvText(c, 'траектория', 360, 120, 28, C.blue);
    let s = 0; const pts = curvePts(0, k, 60); for (let i = 1; i < pts.length; i++) s += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    c.globalAlpha = seg(p, 0.4, 0.55); cvText(c, `путь  Δs = ${(s / 48).toFixed(1).replace('.', ',')} м`, 40, 500, 30, C.text); c.globalAlpha = 1;
  },
  disp(c, W, H, p) {
    cvBg(c, W, H);
    cvPath(c, curvePts(0, 1), C.line, 5, [10, 10]);
    const a = curve(0), b = curve(1), k = seg(p, 0.1, 0.5);
    cvDot(c, a[0], a[1], 10, C.mute); cvDot(c, b[0], b[1], 10, C.mint);
    cvArrow(c, a[0], a[1], lerp(a[0], b[0], k), lerp(a[1], b[1], k), C.coral, 6, 18);
    if (k > 0.95) cvMath(c, 'Δr⃗', (a[0] + b[0]) / 2 - 10, (a[1] + b[1]) / 2 + 36, 36, C.coral);
    cvText(c, 'путь Δs — по линии', 380, 110, 26, C.mute, 'left', 500);
    c.globalAlpha = seg(p, 0.55, 0.75); cvMath(c, 'Δs ≥ |Δr⃗|', 40, 500, 38, C.amber); c.globalAlpha = 1;
  },
  avg(c, W, H, p) {
    cvBg(c, W, H); cvPath(c, curvePts(0, 1), C.line, 5);
    const A = curve(0.25), B = curve(0.6), k = seg(p, 0.15, 0.5);
    cvDot(c, A[0], A[1], 10, C.mint); cvDot(c, B[0], B[1], 10, C.mint);
    cvText(c, 't', A[0] - 10, A[1] + 34, 26, C.mute); cvText(c, 't + Δt', B[0] - 30, B[1] + 34, 26, C.mute);
    cvArrow(c, A[0], A[1], lerp(A[0], B[0], k), lerp(A[1], B[1], k), C.coral, 5);
    c.globalAlpha = seg(p, 0.5, 0.7); cvMath(c, '⟨v⃗⟩ = Δr⃗ / Δt', 40, 500, 40, C.amber); c.globalAlpha = 1;
  },
  limit(c, W, H, p) {
    cvBg(c, W, H); cvPath(c, curvePts(0, 1), C.line, 5);
    const ta = 0.3, tb = lerp(0.75, 0.302, seg(p, 0.1, 0.85)), A = curve(ta), B = curve(tb);
    const dx = B[0] - A[0], dy = B[1] - A[1], L = Math.hypot(dx, dy) || 1;
    c.strokeStyle = 'rgba(108,140,255,.45)'; c.lineWidth = 3; c.beginPath(); c.moveTo(A[0] - dx / L * 260, A[1] - dy / L * 260); c.lineTo(A[0] + dx / L * 420, A[1] + dy / L * 420); c.stroke();
    cvDot(c, A[0], A[1], 10, C.mint); cvDot(c, B[0], B[1], 9, C.coral);
    cvText(c, `Δt → 0`, 40, 500, 34, C.text);
    if (p > 0.85) { const [tx, ty] = tangentAt(ta); cvArrow(c, A[0], A[1], A[0] + tx * 170, A[1] + ty * 170, C.amber, 6); cvText(c, 'касательная', 640, 500, 28, C.amber); }
  },
  inst(c, W, H, p, t) {
    cvBg(c, W, H); cvPath(c, curvePts(0, 1), C.line, 5);
    const u = 0.08 + 0.84 * ((t / 6) % 1), P = curve(u), [tx, ty] = tangentAt(u);
    cvArrow(c, P[0], P[1], P[0] + tx * 150, P[1] + ty * 150, C.amber, 6); cvDot(c, P[0], P[1], 11, C.mint);
    cvMath(c, 'v⃗', P[0] + tx * 150 + 10, P[1] + ty * 150 - 20, 34, C.amber);
    c.globalAlpha = seg(p, 0.2, 0.4); cvMath(c, 'v⃗ = dr⃗ / dt', 40, 470, 40, C.text); c.globalAlpha = seg(p, 0.6, 0.8); cvMath(c, 'v = ds / dt', 40, 520, 34, C.mute); c.globalAlpha = 1;
  },
  area(c, W, H, p) {
    cvBg(c, W, H);
    const ox = 120, oy = 440, gw = 700, gh = 300;
    cvArrow(c, ox, oy, ox + gw + 30, oy, C.mute, 3); cvArrow(c, ox, oy, ox, oy - gh - 30, C.mute, 3);
    cvMath(c, 't', ox + gw + 40, oy + 22, 28, C.mute); cvMath(c, 'v', ox - 30, oy - gh - 30, 28, C.mute);
    const k = seg(p, 0.1, 0.7), vy = oy - 180;
    c.fillStyle = 'rgba(108,140,255,.28)'; c.fillRect(ox, vy, gw * k, oy - vy);
    c.strokeStyle = C.blue; c.lineWidth = 5; c.beginPath(); c.moveTo(ox, vy); c.lineTo(ox + gw * k, vy); c.stroke();
    if (k > 0.5) cvMath(c, 's = v·t', ox + gw * k / 2 - 60, (vy + oy) / 2, 40, C.text);
    c.globalAlpha = seg(p, 0.7, 0.9); cvText(c, 'площадь под графиком = путь', 40, 510, 28, C.amber); c.globalAlpha = 1;
  },
  acc(c, W, H, p, t) {
    cvBg(c, W, H, false); c.fillStyle = C.bg2; c.fillRect(0, 380, W, H - 380);
    const k = (t % 5) / 5, x = 120 + 700 * k * k; car(c, x, 380, C.blue);
    cvArrow(c, x + 56, 330, x + 56 + 30 + 220 * k, 330, C.amber, 6); cvMath(c, 'v⃗', x + 70 + 220 * k, 300, 32, C.amber);
    c.globalAlpha = seg(p, 0.2, 0.4); cvMath(c, 'a⃗ = dv⃗ / dt', 40, 120, 44, C.text); c.globalAlpha = 1;
    cvText(c, 'скорость растёт → есть ускорение', 40, 480, 26, C.mute, 'left', 500);
  },
  decomp(c, W, H, p) {
    cvBg(c, W, H); cvPath(c, curvePts(0, 1), C.line, 5);
    const u = 0.38, P = curve(u), [tx, ty] = tangentAt(u), nx = ty, ny = -tx; // нормаль к центру (вниз выпуклая дуга — центр снизу)
    const k = seg(p, 0.1, 0.4), at = 150, an = 120;
    cvDot(c, P[0], P[1], 11, C.mint);
    cvArrow(c, P[0], P[1], P[0] + (tx * at - nx * an) * k, P[1] + (ty * at - ny * an) * k, C.text, 5);
    if (k > 0.95) cvMath(c, 'a⃗', P[0] + tx * at - nx * an + 10, P[1] + ty * at - ny * an + 10, 32, C.text);
    const k2 = seg(p, 0.45, 0.8);
    if (k2 > 0) { cvArrow(c, P[0], P[1], P[0] + tx * at * k2, P[1] + ty * at * k2, C.amber, 6); cvMath(c, 'aτ', P[0] + tx * at + 6, P[1] + ty * at - 26, 30, C.amber);
      cvArrow(c, P[0], P[1], P[0] - nx * an * k2, P[1] - ny * an * k2, C.pink, 6); cvMath(c, 'aₙ', P[0] - nx * an + 10, P[1] - ny * an + 20, 30, C.pink);
      c.strokeStyle = 'rgba(232,236,246,.35)'; c.setLineDash([6, 6]); c.lineWidth = 2; c.beginPath(); c.moveTo(P[0] + tx * at, P[1] + ty * at); c.lineTo(P[0] + tx * at - nx * an, P[1] + ty * at - ny * an); c.lineTo(P[0] - nx * an, P[1] - ny * an); c.stroke(); c.setLineDash([]); }
    c.globalAlpha = seg(p, 0.75, 0.9); cvText(c, 'aτ — вдоль скорости: меняет её модуль', 40, 510, 26, C.amber, 'left', 500); c.globalAlpha = 1;
  },
  normal(c, W, H, p, t) {
    cvBg(c, W, H);
    const cx = 330, cy = 280, R = 180; c.strokeStyle = C.line; c.lineWidth = 5; c.beginPath(); c.arc(cx, cy, R, 0, 7); c.stroke(); cvDot(c, cx, cy, 6, C.mute);
    const a = t * 0.9, x = cx + Math.cos(a) * R, y = cy + Math.sin(a) * R;
    cvArrow(c, x, y, x - Math.sin(a) * 140, y + Math.cos(a) * 140, C.amber, 6);
    cvArrow(c, x, y, x - Math.cos(a) * 110, y - Math.sin(a) * 110, C.pink, 6); cvDot(c, x, y, 11, C.mint);
    cvMath(c, 'v⃗', 600, 150, 34, C.amber); cvMath(c, 'aₙ', 600, 210, 34, C.pink);
    c.globalAlpha = seg(p, 0.35, 0.6); cvMath(c, 'aₙ = v² / r', 600, 330, 48, C.text); c.globalAlpha = 1;
    cvText(c, 'к центру кривизны', 600, 400, 26, C.mute, 'left', 500);
  },
  types(c, W, H, p) {
    cvBg(c, W, H, false);
    const panels = [['aτ = 0, aₙ = 0', 'равномерное прямолинейное'], ['aτ = const, aₙ = 0', 'равнопеременное прямолинейное'], ['aτ = 0, aₙ = const', 'равномерное по окружности']];
    panels.forEach(([f, s], i) => {
      const k = seg(p, i * 0.25, i * 0.25 + 0.2); if (k <= 0) return; c.globalAlpha = k;
      const y = 80 + i * 150; c.fillStyle = C.bg2; c.beginPath(); c.roundRect(40, y, 880, 120, 22); c.fill();
      if (i === 0) { cvArrow(c, 80, y + 60, 230, y + 60, C.blue, 5); } else if (i === 1) { cvArrow(c, 80, y + 60, 120, y + 60, C.amber, 4); cvArrow(c, 140, y + 60, 230, y + 60, C.amber, 6); }
      else { c.strokeStyle = C.mint; c.lineWidth = 5; c.beginPath(); c.arc(155, y + 60, 42, 0, 7); c.stroke(); }
      cvMath(c, f, 270, y + 42, 30, C.text); cvText(c, s, 270, y + 86, 24, C.mute, 'left', 500); c.globalAlpha = 1;
    });
  },
  angle(c, W, H, p, t) {
    cvBg(c, W, H); const x = 320, y = 280, R = 190, ang = -seg(p, 0.1, 0.8) * 2.2;
    wheel(c, x, y, R, 0); c.strokeStyle = C.mute; c.lineWidth = 3; c.setLineDash([8, 8]); c.beginPath(); c.moveTo(x, y); c.lineTo(x + R, y); c.stroke(); c.setLineDash([]);
    cvArrow(c, x, y, x + Math.cos(ang) * R, y + Math.sin(ang) * R, C.coral, 6);
    c.strokeStyle = C.amber; c.lineWidth = 5; c.beginPath(); c.arc(x, y, 70, ang, 0); c.stroke(); cvMath(c, 'φ', x + 84, y - 40, 38, C.amber);
    cvText(c, `φ = ${(-ang).toFixed(2).replace('.', ',')} рад`, 600, 260, 36, C.text);
    cvText(c, '1 оборот = 2π рад', 600, 330, 26, C.mute, 'left', 500);
  },
  omega(c, W, H, p, t) {
    cvBg(c, W, H); const x = 320, y = 330;
    c.save(); c.translate(x, y); c.scale(1, 0.35); wheel(c, 0, 0, 200, t * 1.4); c.restore();
    c.globalAlpha = seg(p, 0.3, 0.55); cvArrow(c, x, y, x, y - 250, C.amber, 7, 18); cvMath(c, 'ω⃗', x + 18, y - 240, 38, C.amber); c.globalAlpha = 1;
    cvMath(c, 'ω = dφ / dt', 600, 220, 46, C.text);
    c.globalAlpha = seg(p, 0.55, 0.75); cvText(c, 'по правилу правого винта', 600, 300, 26, C.mute, 'left', 500); c.globalAlpha = 1;
  },
  linear(c, W, H, p, t) {
    cvBg(c, W, H); const x = 300, y = 280, R = 200, a = -t * 0.7; wheel(c, x, y, R, a);
    [0.33, 0.66, 1].forEach((f, i) => {
      if (seg(p, 0.1 + i * 0.15, 0.25 + i * 0.15) <= 0) return;
      const px = x + Math.cos(a) * R * f, py = y + Math.sin(a) * R * f, L = 150 * f;
      cvArrow(c, px, py, px + Math.sin(a) * L, py - Math.cos(a) * L, [C.mint, C.amber, C.coral][i], 5); cvDot(c, px, py, 8, C.text);
    });
    c.globalAlpha = seg(p, 0.6, 0.8); cvMath(c, 'v = ωR', 620, 260, 54, C.text); c.globalAlpha = 1;
    cvText(c, 'дальше от оси — быстрее', 620, 340, 26, C.mute, 'left', 500);
  },
  period(c, W, H, p, t) {
    cvBg(c, W, H); const x = 280, y = 280, w = Math.PI; wheel(c, x, y, 180, -t * w);
    cvText(c, `оборотов: ${Math.floor(t * w / (2 * Math.PI))}`, 560, 150, 32, C.text); cvText(c, `время: ${t.toFixed(1).replace('.', ',')} с`, 560, 200, 32, C.mute, 'left', 500);
    c.globalAlpha = seg(p, 0.3, 0.5); cvMath(c, 'T = 2π / ω', 560, 290, 40, C.amber); c.globalAlpha = seg(p, 0.5, 0.7); cvMath(c, 'n = 1 / T', 560, 350, 40, C.amber);
    c.globalAlpha = seg(p, 0.7, 0.85); cvMath(c, 'ω = 2πn', 560, 410, 40, C.text); c.globalAlpha = 1;
  },
  eps(c, W, H, p, t) {
    cvBg(c, W, H); const x = 280, y = 280, om = 0.4 + 2.2 * p, ang = -(0.4 * t + 1.1 * t * t / Math.max(1, t / (p + 0.01)));
    wheel(c, x, y, 180, -(0.4 * t + 0.25 * t * t));
    c.fillStyle = C.bg2; c.beginPath(); c.roundRect(560, 160, 340, 34, 17); c.fill();
    c.fillStyle = C.coral; c.beginPath(); c.roundRect(560, 160, 340 * Math.min(1, om / 2.6), 34, 17); c.fill(); cvText(c, 'ω растёт', 560, 130, 26, C.mute, 'left', 500);
    c.globalAlpha = seg(p, 0.3, 0.55); cvMath(c, 'ε = dω / dt', 560, 280, 46, C.text); c.globalAlpha = 1;
    void ang;
  }
};

/* ---------- рисунки к карточкам (SVG) ---------- */
const svgWrap = (body, h = 150) => `<svg class="fig" viewBox="0 0 320 ${h}" aria-hidden="true"><rect width="320" height="${h}" rx="14" fill="${C.bg}"/>${body}</svg>`;
const sArrow = (x1, y1, x2, y2, col, w = 3) => { const a = Math.atan2(y2 - y1, x2 - x1), h = 10; return `<line x1="${x1}" y1="${y1}" x2="${x2 - Math.cos(a) * 6}" y2="${y2 - Math.sin(a) * 6}" stroke="${col}" stroke-width="${w}" stroke-linecap="round"/><path d="M${x2} ${y2} L${x2 - Math.cos(a - 0.45) * h} ${y2 - Math.sin(a - 0.45) * h} L${x2 - Math.cos(a + 0.45) * h} ${y2 - Math.sin(a + 0.45) * h}Z" fill="${col}"/>`; };
// подпись на рисунке; стрелку вектора рисуем линией над буквой
const sTxt = (s, x, y, col = C.text, size = 15, it = true) => {
  let out = '', arrows = ''; for (const ch of s) { if (ch === '\u20D7') { const i = out.length - 1, ax = x + i * size * 0.55 + size * 0.05, w = size * 0.5, ay = y - size * 0.85; arrows += `<path d="M${ax} ${ay}H${ax + w}M${ax + w - 4} ${ay - 3}L${ax + w} ${ay}L${ax + w - 4} ${ay + 3}" stroke="${col}" stroke-width="1.6" fill="none" stroke-linecap="round"/>`; } else out += ch; }
  return `<text x="${x}" y="${y}" fill="${col}" font-size="${size}" ${it ? 'font-style="italic" font-family="Cambria Math, Times New Roman, serif"' : 'font-family="Golos UI, sans-serif"'} font-weight="600">${out}</text>${arrows}`;
};
const arcD = 'M30 120 Q140 10 290 110';
const FIGS = {
  point: () => svgWrap(`<circle cx="80" cy="75" r="22" fill="${C.amber}"/><ellipse cx="80" cy="75" rx="70" ry="44" fill="none" stroke="${C.line}" stroke-dasharray="4 6"/><circle cx="150" cy="75" r="5" fill="${C.blue}"/>${sArrow(170, 75, 220, 75, C.mute, 2)}<circle cx="250" cy="75" r="22" fill="${C.blue}"/><circle cx="244" cy="70" r="9" fill="${C.mint}"/>${sTxt('точка', 132, 108, C.mute, 13, false)}${sTxt('тело', 234, 118, C.mute, 13, false)}`),
  frame: () => svgWrap(`${sArrow(40, 125, 280, 125, C.mute, 2)}${sArrow(40, 125, 40, 18, C.mute, 2)}<rect x="22" y="118" width="36" height="18" rx="4" fill="${C.coral}"/>${sArrow(40, 125, 200, 45, C.blue, 3)}<circle cx="200" cy="45" r="6" fill="${C.mint}"/>${sTxt('r⃗', 108, 74, C.blue, 18)}<circle cx="270" cy="34" r="16" fill="none" stroke="${C.text}" stroke-width="2"/><line x1="270" y1="34" x2="270" y2="23" stroke="${C.amber}" stroke-width="2.5"/>${sTxt('x', 284, 140, C.mute)}${sTxt('y', 48, 20, C.mute)}`),
  disp: () => svgWrap(`<path d="${arcD}" fill="none" stroke="${C.line}" stroke-width="3" stroke-dasharray="6 6"/>${sArrow(30, 120, 290, 110, C.coral, 3)}<circle cx="30" cy="120" r="5" fill="${C.mute}"/><circle cx="290" cy="110" r="5" fill="${C.mint}"/>${sTxt('Δs', 140, 40, C.mute)}${sTxt('Δr⃗', 150, 134, C.coral, 17)}`),
  secant: () => svgWrap(`<path d="${arcD}" fill="none" stroke="${C.line}" stroke-width="3"/>${sArrow(70, 82, 200, 52, C.coral, 3)}<circle cx="70" cy="82" r="5" fill="${C.mint}"/><circle cx="200" cy="52" r="5" fill="${C.mint}"/>${sTxt('⟨v⃗⟩', 120, 50, C.coral, 17)}`),
  tangent: () => svgWrap(`<path d="${arcD}" fill="none" stroke="${C.line}" stroke-width="3"/>${sArrow(100, 63, 190, 33, C.amber, 3)}<circle cx="100" cy="63" r="6" fill="${C.mint}"/>${sTxt('v⃗', 194, 30, C.amber, 18)}`),
  area: () => svgWrap(`${sArrow(30, 130, 300, 130, C.mute, 2)}${sArrow(30, 130, 30, 14, C.mute, 2)}<path d="M30 130 L30 70 Q120 40 250 60 L250 130Z" fill="rgba(108,140,255,.3)"/><path d="M30 70 Q120 40 250 60" fill="none" stroke="${C.blue}" stroke-width="3"/>${sTxt('s', 130, 105, C.text, 22)}${sTxt('t', 292, 146, C.mute)}${sTxt('v', 12, 22, C.mute)}`),
  decomp: () => svgWrap(`<path d="${arcD}" fill="none" stroke="${C.line}" stroke-width="3"/><circle cx="110" cy="58" r="6" fill="${C.mint}"/>${sArrow(110, 58, 200, 38, C.amber, 3)}${sArrow(110, 58, 128, 128, C.pink, 3)}${sArrow(110, 58, 218, 108, C.text, 2)}${sTxt('aτ', 204, 36, C.amber)}${sTxt('aₙ', 132, 140, C.pink)}${sTxt('a⃗', 222, 112, C.text)}`),
  normal: () => svgWrap(`<circle cx="100" cy="75" r="55" fill="none" stroke="${C.line}" stroke-width="3"/><circle cx="100" cy="75" r="3" fill="${C.mute}"/><circle cx="155" cy="75" r="6" fill="${C.mint}"/>${sArrow(155, 75, 155, 18, C.amber, 3)}${sArrow(155, 75, 112, 75, C.pink, 3)}${sTxt('v⃗', 162, 22, C.amber)}${sTxt('aₙ = v²/r', 200, 85, C.text, 18)}`),
  omega: () => svgWrap(`<ellipse cx="120" cy="100" rx="80" ry="24" fill="none" stroke="${C.blue}" stroke-width="3"/><path d="M190 92 l12 6 l-14 6" fill="none" stroke="${C.blue}" stroke-width="3"/>${sArrow(120, 100, 120, 18, C.amber, 4)}${sTxt('ω⃗', 130, 26, C.amber, 18)}${sTxt('ω = dφ/dt', 210, 60, C.text, 16)}`),
  wheel: () => svgWrap(`<circle cx="90" cy="75" r="58" fill="none" stroke="${C.blue}" stroke-width="3"/><circle cx="90" cy="75" r="4" fill="${C.text}"/><circle cx="148" cy="75" r="5" fill="${C.text}"/>${sArrow(148, 75, 148, 15, C.coral, 3)}<circle cx="119" cy="75" r="4" fill="${C.text}"/>${sArrow(119, 75, 119, 45, C.amber, 3)}${sTxt('v = ωR', 190, 82, C.text, 20)}`)
};

/* ---------- обложки глав: плоские сцены по мотиву ---------- */
function chapterArt(ch, w = 320, h = 180) {
  const col = PARTS[ch.part - 1].col, m = ch.art;
  const base = `<rect width="${w}" height="${h}" fill="${C.bg2}"/><circle cx="${w - 48}" cy="40" r="70" fill="${col}" opacity=".10"/><circle cx="40" cy="${h}" r="90" fill="${col}" opacity=".07"/>`;
  const M = {
    kin: `<path d="M20 150 Q120 20 250 150" fill="none" stroke="${col}" stroke-width="4" stroke-dasharray="8 8"/><circle cx="98" cy="72" r="11" fill="${C.coral}"/>${sArrow(98, 72, 150, 52, C.text, 3)}<rect x="0" y="150" width="${w}" height="30" fill="${C.bg}"/>`,
    force: `<rect x="110" y="90" width="70" height="50" rx="8" fill="${col}"/>${sArrow(40, 115, 105, 115, C.coral, 5)}${sArrow(185, 115, 260, 115, C.text, 3)}<rect x="0" y="140" width="${w}" height="40" fill="${C.bg}"/>`,
    energy: `<path d="M20 60 Q90 160 160 140 T300 70" fill="none" stroke="${col}" stroke-width="4"/><circle cx="40" cy="78" r="12" fill="${C.amber}"/>`,
    rot: `<circle cx="160" cy="90" r="55" fill="none" stroke="${col}" stroke-width="5"/><circle cx="160" cy="90" r="6" fill="${C.text}"/><path d="M215 90 a55 55 0 0 1 -30 49" fill="none" stroke="${C.amber}" stroke-width="5"/>`,
    orbit: `<circle cx="160" cy="90" r="22" fill="${C.amber}"/><ellipse cx="160" cy="90" rx="110" ry="50" fill="none" stroke="${col}" stroke-width="3"/><circle cx="270" cy="90" r="9" fill="${C.blue}"/>`,
    fluid: `<path d="M0 100 Q40 85 80 100 T160 100 T240 100 T320 100 V180 H0Z" fill="${col}" opacity=".7"/><rect x="130" y="70" width="56" height="44" rx="6" fill="${C.text}"/>`,
    rel: `<rect x="60" y="80" width="90" height="30" rx="15" fill="${col}"/>${sArrow(160, 95, 250, 95, C.text, 3)}<circle cx="270" cy="60" r="20" fill="none" stroke="${C.amber}" stroke-width="3"/><line x1="270" y1="60" x2="270" y2="46" stroke="${C.amber}" stroke-width="3"/>`,
    gas: [[90, 70], [140, 110], [200, 60], [230, 120], [120, 140], [260, 80], [170, 90]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="9" fill="${col}"/>`).join('') + `<rect x="60" y="30" width="230" height="130" rx="10" fill="none" stroke="${C.line}" stroke-width="3"/>`,
    heat: `<rect x="140" y="30" width="26" height="110" rx="13" fill="none" stroke="${C.text}" stroke-width="3"/><rect x="146" y="70" width="14" height="66" rx="7" fill="${col}"/><circle cx="153" cy="140" r="18" fill="${col}"/>`,
    phase: `<path d="M60 140 L60 60 L120 60" fill="none" stroke="${col}" stroke-width="4"/><path d="M140 140 Q180 40 260 50" fill="none" stroke="${C.text}" stroke-width="3"/>`,
    charge: `<circle cx="110" cy="90" r="24" fill="${C.coral}"/><circle cx="210" cy="90" r="24" fill="${C.blue}"/><text x="102" y="98" fill="#fff" font-size="26" font-weight="700">+</text><text x="203" y="98" fill="#fff" font-size="26" font-weight="700">−</text><path d="M134 80 Q160 60 186 80 M134 100 Q160 120 186 100" fill="none" stroke="${col}" stroke-width="2"/>`,
    circuit: `<rect x="70" y="50" width="180" height="90" rx="8" fill="none" stroke="${col}" stroke-width="4"/><rect x="140" y="40" width="40" height="20" fill="${C.bg2}" stroke="${C.text}" stroke-width="3"/><circle cx="250" cy="95" r="14" fill="${C.amber}"/>`,
    spark: `<path d="M150 30 L130 95 L160 95 L140 160" fill="none" stroke="${col}" stroke-width="5" stroke-linejoin="round"/>`,
    magnet: `<path d="M110 50 V110 a50 50 0 0 0 100 0 V50" fill="none" stroke="${col}" stroke-width="18"/><path d="M101 50 h18 M201 50 h18" stroke="${C.text}" stroke-width="18"/>`,
    coil: Array.from({ length: 7 }, (_, i) => `<ellipse cx="${90 + i * 24}" cy="90" rx="12" ry="40" fill="none" stroke="${col}" stroke-width="4"/>`).join(''),
    domain: [0, 1, 2, 3].map(i => sArrow(70 + i * 55, 120, 100 + i * 55, 60, i % 2 ? col : C.text, 4)).join(''),
    field: `<path d="M20 90 Q60 40 100 90 T180 90 T260 90 T320 90" fill="none" stroke="${col}" stroke-width="4"/><path d="M20 90 Q60 140 100 90 T180 90 T260 90" fill="none" stroke="${C.amber}" stroke-width="3" opacity=".7"/>`,
    osc: `<line x1="160" y1="20" x2="160" y2="40" stroke="${C.text}" stroke-width="3"/><path d="M160 40 l-14 8 l28 8 l-28 8 l28 8 l-28 8 l14 8" fill="none" stroke="${col}" stroke-width="3"/><rect x="138" y="96" width="44" height="34" rx="6" fill="${C.coral}"/>`,
    wave: `<path d="M10 90 Q40 40 70 90 T130 90 T190 90 T250 90 T310 90" fill="none" stroke="${col}" stroke-width="5"/>`,
    emwave: `<path d="M10 90 Q40 40 70 90 T130 90 T190 90 T250 90 T310 90" fill="none" stroke="${col}" stroke-width="4"/><path d="M10 90 Q40 120 70 90 T130 90 T190 90 T250 90 T310 90" fill="none" stroke="${C.blue}" stroke-width="3"/>`,
    lens: `<path d="M160 30 Q190 90 160 150 Q130 90 160 30Z" fill="${col}" opacity=".7"/><path d="M20 70 L160 70 L290 110 M20 110 L160 110 L290 70" fill="none" stroke="${C.amber}" stroke-width="2.5"/>`,
    interf: [0, 1, 2, 3, 4, 5, 6].map(i => `<rect x="${60 + i * 30}" y="40" width="14" height="100" rx="4" fill="${col}" opacity="${1 - Math.abs(i - 3) * 0.25}"/>`).join(''),
    diffr: `<rect x="80" y="30" width="10" height="50" fill="${C.text}"/><rect x="80" y="100" width="10" height="50" fill="${C.text}"/>` + [1, 2, 3].map(i => `<path d="M95 90 m0 ${-i * 22} a${i * 22} ${i * 22} 0 0 1 0 ${i * 44}" fill="none" stroke="${col}" stroke-width="3"/>`).join(''),
    prism: `<path d="M120 140 L170 40 L220 140Z" fill="none" stroke="${C.text}" stroke-width="3"/><path d="M20 100 L150 95" stroke="#fff" stroke-width="3"/>` + ['#FF6B8B', '#FFC24B', '#3DD6A0', '#6C8CFF', '#B48CFF'].map((cl, i) => `<path d="M190 95 L310 ${70 + i * 14}" stroke="${cl}" stroke-width="3"/>`).join(''),
    polar: `${sArrow(60, 90, 140, 90, C.text, 3)}<rect x="150" y="40" width="14" height="100" rx="4" fill="${col}"/>${sArrow(170, 90, 260, 90, col, 3)}`,
    photon: `<path d="M20 90 q15 -25 30 0 t30 0 t30 0 t30 0" fill="none" stroke="${col}" stroke-width="4"/><rect x="170" y="40" width="20" height="100" fill="${C.text}"/>${sArrow(195, 70, 260, 40, C.amber, 3)}${sArrow(195, 110, 270, 130, C.amber, 3)}`,
    bohr: `<circle cx="160" cy="90" r="12" fill="${C.coral}"/>` + [30, 55, 80].map(r => `<circle cx="160" cy="90" r="${r}" fill="none" stroke="${col}" stroke-width="2.5"/>`).join('') + `<circle cx="215" cy="90" r="6" fill="${C.text}"/>`,
    psi: `<path d="M20 140 C80 140 100 30 160 30 C220 30 240 140 300 140" fill="none" stroke="${col}" stroke-width="4"/><path d="M20 140 C80 140 100 30 160 30 C220 30 240 140 300 140 Z" fill="${col}" opacity=".18"/>`,
    atom: `<circle cx="160" cy="90" r="10" fill="${C.amber}"/>` + [0, 60, 120].map(a => `<ellipse cx="160" cy="90" rx="90" ry="28" fill="none" stroke="${col}" stroke-width="3" transform="rotate(${a} 160 90)"/>`).join(''),
    stat: [20, 45, 80, 110, 90, 60, 35, 18].map((h, i) => `<rect x="${60 + i * 26}" y="${150 - h}" width="18" height="${h}" rx="4" fill="${col}"/>`).join(''),
    crystal: [0, 1, 2, 3].map(i => [0, 1, 2].map(j => `<circle cx="${90 + i * 46}" cy="${45 + j * 45}" r="9" fill="${(i + j) % 2 ? col : C.text}"/>`).join('')).join(''),
    nucleus: [[150, 85], [168, 80], [160, 98], [142, 100], [175, 97], [158, 68]].map(([x, y], i) => `<circle cx="${x}" cy="${y}" r="12" fill="${i % 2 ? col : C.coral}"/>`).join('') + sArrow(190, 70, 270, 30, C.text, 3),
    particle: `<path d="M40 150 L160 90 L280 140 M160 90 L200 20" fill="none" stroke="${col}" stroke-width="3"/><circle cx="160" cy="90" r="8" fill="${C.amber}"/>`
  };
  return `<svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="xMidYMid slice" aria-hidden="true">${base}${M[m] || ''}</svg>`;
}

/* ---------- аватары ---------- */
const AVATARS = [
  ['atom', '#6C8CFF', `<circle cx="32" cy="32" r="5" fill="#fff"/><ellipse cx="32" cy="32" rx="20" ry="8" fill="none" stroke="#fff" stroke-width="2.5"/><ellipse cx="32" cy="32" rx="20" ry="8" fill="none" stroke="#fff" stroke-width="2.5" transform="rotate(60 32 32)"/><ellipse cx="32" cy="32" rx="20" ry="8" fill="none" stroke="#fff" stroke-width="2.5" transform="rotate(120 32 32)"/>`],
  ['rocket', '#FF7A59', `<path d="M32 12 C42 20 42 36 38 44 H26 C22 36 22 20 32 12Z" fill="#fff"/><circle cx="32" cy="28" r="4" fill="#FF7A59"/><path d="M26 44 l-6 8 l8 -3 M38 44 l6 8 l-8 -3" fill="#fff"/>`],
  ['magnet', '#FFC24B', `<path d="M20 18 V34 a12 12 0 0 0 24 0 V18" fill="none" stroke="#fff" stroke-width="7"/>`],
  ['wave', '#3DD6C3', `<path d="M12 34 q5 -12 10 0 t10 0 t10 0 t10 0" fill="none" stroke="#fff" stroke-width="3.5" stroke-linecap="round"/>`],
  ['planet', '#B48CFF', `<circle cx="32" cy="32" r="10" fill="#fff"/><ellipse cx="32" cy="32" rx="20" ry="6" fill="none" stroke="#fff" stroke-width="2.5" transform="rotate(-20 32 32)"/>`],
  ['prism', '#FF6B8B', `<path d="M20 44 L32 20 L44 44Z" fill="none" stroke="#fff" stroke-width="3"/><path d="M10 34 L28 32" stroke="#fff" stroke-width="2.5"/><path d="M38 34 L54 28 M38 36 L54 36 M38 38 L54 44" stroke="#fff" stroke-width="2"/>`],
  ['pendulum', '#5FD38D', `<line x1="32" y1="12" x2="40" y2="40" stroke="#fff" stroke-width="2.5"/><circle cx="40" cy="42" r="7" fill="#fff"/><line x1="22" y1="12" x2="42" y2="12" stroke="#fff" stroke-width="3"/>`],
  ['bolt', '#6C8CFF', `<path d="M36 12 L22 34 H32 L28 52 L44 28 H34 Z" fill="#fff"/>`]
];
const avatarSvg = (i, size = 56) => { const [, col, body] = AVATARS[i % AVATARS.length]; return `<svg class="ava" width="${size}" height="${size}" viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="32" r="32" fill="${col}"/>${body}</svg>`; };

/* ---------- симуляции «Покрути сам»: один параметр, кнопки −/+, цель по раундам ---------- */
const SIMS = {
  route: {
    title: 'Путь и перемещение', rounds: 3,
    param: { label: 'Пройденный угол по кругу', min: 10, max: 350, step: 5, big: 30, init: 60, fmt: v => v + '°' },
    newRound(G) { G.goal = [1.2, 1.5, 2][G.round - 1]; G.task = `Точка бежит по кругу радиусом 10 м. Останови её там, где путь в ${f1(G.goal)} раза больше модуля перемещения.`; },
    calc(v) { const th = v * Math.PI / 180, s = 10 * th, d = 20 * Math.sin(th / 2); return { s, d, r: s / d }; },
    check(G, v) { const { s, d, r } = this.calc(v), ok = Math.abs(r - G.goal) <= 0.06; return { ok, msg: `Путь ${f1(s)} м, перемещение ${f1(d)} м, отношение ${f1(r, 2)}.${ok ? '' : r < G.goal ? ' Пройди дальше.' : ' Слишком далеко.'}` }; },
    draw(c, W, H, G, v) {
      cvBg(c, W, H); const cx = 360, cy = 200, R = 150, th = v * Math.PI / 180;
      c.strokeStyle = C.line; c.lineWidth = 4; c.beginPath(); c.arc(cx, cy, R, 0, 7); c.stroke();
      c.strokeStyle = C.blue; c.lineWidth = 6; c.beginPath(); c.arc(cx, cy, R, -Math.PI / 2, -Math.PI / 2 + th); c.stroke();
      const ax = cx, ay = cy - R, bx = cx + Math.cos(-Math.PI / 2 + th) * R, by = cy + Math.sin(-Math.PI / 2 + th) * R;
      cvArrow(c, ax, ay, bx, by, C.coral, 5); cvDot(c, ax, ay, 8, C.mute); cvDot(c, bx, by, 10, C.mint);
      const { s, d } = this.calc(v); cvText(c, `путь ${f1(s)} м`, 560, 120, 24, C.blue); cvText(c, `перемещение ${f1(d)} м`, 560, 160, 24, C.coral);
    }
  },
  secant: {
    title: 'Средняя и мгновенная скорость', rounds: 3,
    param: { label: 'Промежуток Δt', min: 0.1, max: 2, step: 0.1, big: 0.5, init: 1.5, fmt: v => f1(v) + ' с' },
    newRound(G) { G.goal = [5.4, 5, 4.6][G.round - 1]; G.task = `Тело движется по закону x = 2t². В момент t = 1 с мгновенная скорость 4 м/с. Подбери Δt, чтобы средняя скорость на [1; 1+Δt] была ${f1(G.goal)} м/с.`; },
    check(G, v) { const avg = 4 + 2 * v, ok = Math.abs(avg - G.goal) <= 0.05; return { ok, msg: `Средняя скорость ${f1(avg, 2)} м/с.${ok ? '' : avg > G.goal ? ' Уменьши Δt.' : ' Увеличь Δt.'}` }; },
    draw(c, W, H, G, v) {
      cvBg(c, W, H); const ox = 80, oy = 360, sx = 200, sy = 26, X = t => ox + t * sx, Y = x => oy - x * sy;
      cvArrow(c, ox, oy, 680, oy, C.mute, 2); cvArrow(c, ox, oy, ox, 20, C.mute, 2); cvText(c, 't, с', 650, 390, 20, C.mute, 'left', 500); cvText(c, 'x, м', 30, 30, 20, C.mute, 'left', 500);
      cvPath(c, Array.from({ length: 60 }, (_, i) => { const t = i / 59 * 3; return [X(t), Y(2 * t * t)]; }), C.blue, 4);
      const t1 = 1, t2 = 1 + v, k = (2 * t2 * t2 - 2) / v;
      c.strokeStyle = C.coral; c.lineWidth = 3; c.beginPath(); c.moveTo(X(0.3), Y(2 + k * (0.3 - 1))); c.lineTo(X(3), Y(2 + k * 2)); c.stroke();
      c.strokeStyle = 'rgba(255,194,75,.7)'; c.setLineDash([8, 8]); c.beginPath(); c.moveTo(X(0.3), Y(2 + 4 * (0.3 - 1))); c.lineTo(X(3), Y(2 + 4 * 2)); c.stroke(); c.setLineDash([]);
      cvDot(c, X(t1), Y(2), 8, C.mint); cvDot(c, X(t2), Y(2 * t2 * t2), 8, C.coral);
      cvText(c, 'секущая — средняя', 430, 330, 20, C.coral, 'left', 600); cvText(c, 'касательная — мгновенная', 430, 300, 20, C.amber, 'left', 600);
    }
  },
  turn: {
    title: 'Ускорение на повороте', rounds: 3,
    param: { label: 'Скорость машины', min: 2, max: 30, step: 1, big: 5, init: 6, fmt: v => v + ' м/с' },
    newRound(G) { const R = [[50, 2], [50, 8], [32, 4.5]][G.round - 1]; G.R = R[0]; G.goal = R[1]; G.task = `Поворот радиусом ${G.R} м. Подбери скорость, при которой нормальное ускорение равно ${f1(G.goal)} м/с².`; },
    check(G, v) { const a = v * v / G.R, ok = Math.abs(a - G.goal) <= 0.25; return { ok, msg: `aₙ = v²/r = ${v}²/${G.R} = ${f1(a, 2)} м/с².${ok ? '' : a > G.goal ? ' Сбавь скорость.' : ' Быстрее.'}` }; },
    draw(c, W, H, G, v) {
      cvBg(c, W, H); const cx = 300, cy = 220, R = 150; c.strokeStyle = C.line; c.lineWidth = 26; c.beginPath(); c.arc(cx, cy, R, 0, 7); c.stroke();
      c.strokeStyle = C.bg; c.lineWidth = 2; c.setLineDash([12, 12]); c.beginPath(); c.arc(cx, cy, R, 0, 7); c.stroke(); c.setLineDash([]);
      const a = -0.6, x = cx + Math.cos(a) * R, y = cy + Math.sin(a) * R, an = v * v / G.R;
      cvArrow(c, x, y, x - Math.sin(a) * (40 + v * 5), y + Math.cos(a) * (40 + v * 5), C.amber, 5);
      cvArrow(c, x, y, x - Math.cos(a) * (20 + an * 14), y - Math.sin(a) * (20 + an * 14), C.pink, 5); cvDot(c, x, y, 12, C.coral);
      cvText(c, `aₙ = ${f1(an, 2)} м/с²`, 500, 120, 28, C.pink); cvText(c, `цель ${f1(G.goal)} м/с²`, 500, 165, 22, C.mute, 'left', 500);
    }
  },
  wheel: {
    title: 'Колесо', rounds: 3,
    param: { label: 'Частота вращения', min: 0.5, max: 6, step: 0.5, big: 1, init: 1, fmt: v => f1(v) + ' об/с' },
    newRound(G) { G.n = [2, 3, 1.5][G.round - 1]; G.R = [0.5, 0.4, 1][G.round - 1]; G.goal = 2 * Math.PI * G.n * G.R; G.task = `Колесо радиусом ${f1(G.R)} м. Подбери частоту, чтобы точки обода двигались со скоростью ${f1(G.goal)} м/с.`; },
    check(G, v) { const sp = 2 * Math.PI * v * G.R, ok = Math.abs(sp - G.goal) <= 0.15; return { ok, msg: `v = 2πnR = 2π·${f1(v)}·${f1(G.R)} = ${f1(sp, 2)} м/с.${ok ? '' : sp > G.goal ? ' Медленнее.' : ' Быстрее.'}` }; },
    draw(c, W, H, G, v, ph) { cvBg(c, W, H); wheel(c, 260, 200, 150, -(ph || 0) * v * 4); cvText(c, `ω = 2πn = ${f1(2 * Math.PI * v, 2)} рад/с`, 460, 150, 26, C.text); cvText(c, `v = ωR = ${f1(2 * Math.PI * v * G.R, 2)} м/с`, 460, 200, 26, C.amber); }
  }
};
