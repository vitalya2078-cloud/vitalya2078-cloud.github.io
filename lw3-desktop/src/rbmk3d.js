/* =====================================================================
   Тренажёр РБМК: 3D-вид (three.js r162, загружается по требованию из three/three3d.js).
   Две сцены: «Реактор в разрезе» (графитовая кладка, каналы, стержни с вытеснителями, пар) и «Энергоблок»
   (реактор, барабаны-сепараторы, ГЦН, турбогенераторы). Всё связано с состоянием модели RBG.S.
   Текстуры (необязательно): img/rbmk3d/*.webp — если файла нет, деталь окрашена цветом.
   Если WebGL недоступен (старая видеокарта), остаётся 2D-пульт.
   ===================================================================== */
const R3 = { ok: null, loading: null, scene: null, cam: null, ren: null, ctl: null, objs: {}, kind: 'core', pick: [], tex: {}, raf: 0 };
function r3Supported() {
  try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl') || c.getContext('experimental-webgl')); } catch (e) { return false; }
}
function r3Load() {
  if (R3.loading) return R3.loading;
  R3.loading = (window.THREE ? Promise.resolve() : import('./three/three3d.js')).then(() => { R3.ok = true; }).catch(e => { R3.ok = false; console.warn('3D недоступно', e); });
  return R3.loading;
}
// необязательная текстура: если файла нет, материал остаётся цветным
function r3Tex(name, mat, rep) {
  const T = window.THREE; if (R3.tex[name] === false || (typeof RB3D_TEX !== 'undefined' && !RB3D_TEX.includes(name))) return;
  const apply = t => { mat.map = t; mat.color.set(0xffffff); mat.needsUpdate = true; };
  if (R3.tex[name]) return apply(R3.tex[name]);
  new T.TextureLoader().load('img/rbmk3d/' + name + '.webp', t => { t.colorSpace = T.SRGBColorSpace; if (rep) { t.wrapS = t.wrapT = T.RepeatWrapping; t.repeat.set(rep[0], rep[1]); } R3.tex[name] = t; apply(t); }, undefined, () => { R3.tex[name] = false; });
}
const R3INFO = {
  graphite: ['Графитовая кладка', 'Около 1700 т графита замедляют нейтроны. Колонны из блоков с отверстиями под каналы.'],
  fuel: ['Технологический канал', 'Труба из циркониевого сплава с тепловыделяющей сборкой; снизу вверх по ней идёт вода и закипает. Цвет — мощность канала, пузырьки — пар.'],
  rod: ['Стержень СУЗ', 'Сверху — поглотитель из карбида бора (тёмный), снизу — графитовый вытеснитель (светлый), под ним — столб воды. Когда стержень идёт вниз из верхнего положения, вытеснитель сначала выдавливает воду из низа зоны — это и есть концевой эффект.'],
  water: ['Вода под вытеснителем', 'Столб воды в канале СУЗ под вытеснителем поглощает нейтроны. Его вытеснение графитом увеличивает реактивность внизу зоны.'],
  top: ['Верхняя плита («пятачок»)', 'Металлоконструкция над зоной: через неё проходят каналы, на ней — съёмные плиты настила.'],
  drum: ['Барабан-сепаратор', 'Здесь пароводяная смесь из каналов разделяется: пар идёт на турбины, вода — обратно к насосам. Давление около 7 МПа.'],
  pump: ['Главный циркуляционный насос', 'Гонит воду через каналы реактора. На блоке 8 насосов: 6 работают, 2 в резерве.'],
  desk: ['Блочный щит управления', 'Пульт СИУР: управление стержнями, картограмма зоны, кнопка АЗ-5 под крышкой, приборы контура.'],
  tg: ['Турбогенератор', 'Пар вращает турбину, генератор даёт электричество: два ТГ по 500 МВт.'],
  pipe: ['Трубопроводы', 'Пароводяные коммуникации и опускные трубопроводы контура многократной принудительной циркуляции.'],
};

/* ---------- модели «потекстурно»: объёмные формы, на каждую натянут вырезанный кусок листа ---------- */
const R3IMG = {};
function r3Img(name) { if (!R3IMG[name]) { const im = new Image(); R3IMG[name] = new Promise(res => { im.onload = () => res(im); im.onerror = () => res(null); }); if (RB3D_TEX.includes(name)) im.src = 'img/rbmk3d/' + name + '.webp'; else R3IMG[name] = Promise.resolve(null); } return R3IMG[name]; }
// кусок листа [x0, y0, x1, y1] (доли) → текстура; rot — повернуть на 90° (длина картинки → высота цилиндра); wrap — повтор с отражением по окружности
const r3Crop = (name, box, o = {}) => ({ name, box, o });
function r3Apply(mat, spec) {
  const T = window.THREE;
  r3Img(spec.name).then(im => { if (!im) return; const [x0, y0, x1, y1] = spec.box, o = spec.o, sw = (x1 - x0) * im.width, sh = (y1 - y0) * im.height;
    const W = Math.min(1024, Math.round(o.rot ? sh : sw)), H = Math.min(1024, Math.round(o.rot ? sw : sh)), cv = document.createElement('canvas'); cv.width = W; cv.height = H; const c = cv.getContext('2d');
    if (o.rot) { c.translate(W, 0); c.rotate(Math.PI / 2); c.drawImage(im, x0 * im.width, y0 * im.height, sw, sh, 0, 0, H, W); } else c.drawImage(im, x0 * im.width, y0 * im.height, sw, sh, 0, 0, W, H);
    const t = new T.CanvasTexture(cv); t.colorSpace = T.SRGBColorSpace; t.anisotropy = 4;
    if (o.wrap) { t.wrapS = T.MirroredRepeatWrapping; t.repeat.x = o.wrap; } if (o.repeat) { t.wrapS = T.RepeatWrapping; t.repeat.x = o.repeat; }
    mat.map = t; mat.color.set(0xffffff); mat.needsUpdate = true; });
}
const r3Mat = (col, spec, extra = {}) => { const T = window.THREE, m = new T.MeshStandardMaterial(Object.assign({ color: col, roughness: 0.55, metalness: spec ? 0.15 : 0.2 }, extra)); if (spec) r3Apply(m, spec); return m; };
// полусфера-днище с плоской развёрткой (картинка торца ложится «как на фото»)
function r3Cap(R, depth, mat) {
  const T = window.THREE, g = new T.SphereGeometry(R, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), p = g.attributes.position, uv = g.attributes.uv;
  for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) / (2 * R) + 0.5, 0.5 - p.getZ(i) / (2 * R));
  g.scale(1, depth / R, 1); return new T.Mesh(g, mat);
}
function r3Drum() {
  const T = window.THREE, g = new T.Group(), R = 1.25, L = 12, steelM = r3Mat(0xa9b4c0, null, { metalness: 0.6, roughness: 0.3 });
  const body = new T.Mesh(new T.CylinderGeometry(R, R, L, 48, 1, true), r3Mat(0xa9b4c0, r3Crop('drum-side', [0.10, 0.16, 0.90, 0.79], { rot: true, wrap: 2 }))); body.rotation.z = Math.PI / 2; g.add(body);
  const capM = r3Mat(0xa9b4c0, r3Crop('drum-end', [0.10, 0.165, 0.90, 0.805]));
  [-1, 1].forEach(sd => { const c = r3Cap(R, 0.75, capM); c.rotation.z = -sd * Math.PI / 2; c.position.x = sd * L / 2; g.add(c);
    const sup = new T.Mesh(new T.CylinderGeometry(0.35, 0.9, 1.5, 4), steelM); sup.rotation.y = Math.PI / 4; sup.position.set(sd * L * 0.33, -R - 0.55, 0); g.add(sup); });
  [[-0.35, 0.32], [-0.2, 0.22], [0, 0.42], [0.12, 0.2], [0.22, 0.2], [0.35, 0.32]].forEach(([fx, r]) => {
    const n = new T.Mesh(new T.CylinderGeometry(r, r, 0.7, 16), steelM), fl = new T.Mesh(new T.CylinderGeometry(r + 0.12, r + 0.12, 0.12, 20), steelM); n.position.set(fx * L, R + 0.25, 0); fl.position.set(fx * L, R + 0.6, 0); g.add(n, fl); });
  return g;
}
function r3Pump() {
  const T = window.THREE, g = new T.Group(), grey = r3Mat(0x55667c), orange = r3Mat(0xf59e0b, r3Crop('pump-front', [0.32, 0.015, 0.70, 0.13], { wrap: 2 }));
  const motor = new T.Mesh(new T.CylinderGeometry(0.62, 0.62, 1.35, 32, 1, true), r3Mat(0x55667c, r3Crop('pump-front', [0.31, 0.15, 0.69, 0.40], { wrap: 2 }))); motor.position.y = 1.55; g.add(motor);
  const capTop = r3Mat(0xf59e0b, null, { metalness: 0.1 }), cap = new T.Mesh(new T.CylinderGeometry(0.66, 0.68, 0.38, 32), [orange, capTop, capTop]); cap.position.y = 2.4; g.add(cap);
  const collar = new T.Mesh(new T.CylinderGeometry(0.74, 0.74, 0.16, 32), r3Mat(0xf59e0b, null, { metalness: 0.1 })); collar.position.y = 0.8; g.add(collar);
  const neck = new T.Mesh(new T.CylinderGeometry(0.4, 0.5, 0.45, 20), grey); neck.position.y = 0.5; g.add(neck);
  const face = r3Mat(0x55667c, r3Crop('pump-front', [0.245, 0.555, 0.755, 0.915]));
  const casing = new T.Mesh(new T.CylinderGeometry(0.88, 0.88, 0.95, 40), [grey, face, face]); casing.rotation.x = Math.PI / 2; casing.position.y = -0.2; g.add(casing);
  const pipe = new T.Mesh(new T.CylinderGeometry(0.36, 0.36, 3.1, 20), grey); pipe.rotation.z = Math.PI / 2; pipe.position.y = -0.2; g.add(pipe);
  [-1, 1].forEach(sd => { const fl = new T.Mesh(new T.CylinderGeometry(0.58, 0.58, 0.2, 28), r3Mat(0xf59e0b, null, { metalness: 0.1 })); fl.rotation.z = Math.PI / 2; fl.position.set(sd * 1.45, -0.2, 0); g.add(fl); });
  const base = new T.Mesh(new T.BoxGeometry(1.9, 0.28, 1.3), grey); base.position.y = -1.2; g.add(base);
  return g;
}
function r3Turbine() {
  const T = window.THREE, g = new T.Group(), steelM = r3Mat(0xc0c8d2, null, { metalness: 0.6, roughness: 0.3 });
  const baseTex = r3Crop('tg-side', [0.04, 0.83, 0.98, 0.99]);
  const base = new T.Mesh(new T.BoxGeometry(12.5, 0.7, 3.4), [r3Mat(0x55667c), r3Mat(0x55667c), r3Mat(0x55667c), r3Mat(0x55667c), r3Mat(0x55667c, baseTex), r3Mat(0x55667c, baseTex)]); base.position.y = -1.6; g.add(base);
  const cas = new T.Mesh(new T.CylinderGeometry(1.35, 1.35, 6.4, 40), [r3Mat(0x55667c, r3Crop('tg-side', [0.08, 0.22, 0.59, 0.76], { rot: true, wrap: 2 })), r3Mat(0x55667c), r3Mat(0x55667c)]); cas.rotation.z = Math.PI / 2; cas.position.set(-2.4, 0, 0); g.add(cas);
  const coup = new T.Mesh(new T.CylinderGeometry(0.75, 0.75, 0.5, 24), r3Mat(0xf59e0b, null, { metalness: 0.1 })); coup.rotation.z = Math.PI / 2; coup.position.x = 1.1; g.add(coup);
  const endM = r3Mat(0xb8c0c9, r3Crop('tg-end', [0.14, 0.09, 0.86, 0.80]));
  const gen = new T.Mesh(new T.CylinderGeometry(1.4, 1.4, 3.8, 40), [r3Mat(0xb8c0c9, r3Crop('tg-side', [0.645, 0.20, 0.935, 0.80], { rot: true, wrap: 2 })), endM, endM]); gen.rotation.z = Math.PI / 2; gen.position.x = 3.4; g.add(gen);
  const sp = new T.Mesh(new T.TorusGeometry(1.1, 0.16, 10, 24, Math.PI), steelM); sp.position.set(-2.4, 1.35, 0); g.add(sp);
  return g;
}
function r3Build(kind) {
  const T = window.THREE, S = RBG.S, box = $('#rb-3dc'); if (!box) return;
  if (R3.ren) { R3.ren.dispose(); R3.ren.domElement.remove(); }
  const ren = new T.WebGLRenderer({ antialias: true, alpha: false }); ren.setPixelRatio(Math.min(1.5, window.devicePixelRatio || 1));
  ren.setSize(box.clientWidth, box.clientHeight); ren.outputColorSpace = T.SRGBColorSpace; box.appendChild(ren.domElement);
  const dark = !isLight(), scene = new T.Scene(); scene.background = new T.Color(dark ? 0x0f1319 : 0xe9eef5); scene.fog = new T.Fog(scene.background, 40, 110);
  const cam = new T.PerspectiveCamera(42, box.clientWidth / box.clientHeight, 0.1, 300);
  scene.add(new T.HemisphereLight(0xffffff, dark ? 0x202830 : 0xb8c2d0, dark ? 0.9 : 1.2));
  const sun = new T.DirectionalLight(0xffffff, 1.6); sun.position.set(14, 22, 10); scene.add(sun);
  const floor = new T.Mesh(new T.CircleGeometry(60, 48), new T.MeshStandardMaterial({ color: dark ? 0x161c24 : 0xd5dde8, roughness: 0.95 })); floor.rotation.x = -Math.PI / 2; floor.position.y = -6.2; scene.add(floor);
  R3.objs = { channels: null, rods: [], bubbles: null }; R3.pick = []; R3.sheets = [];
  const tag = (m, key) => { m.userData.info = key; R3.pick.push(m); return m; };
  const steel = new T.MeshStandardMaterial({ color: 0x9aa6b4, metalness: 0.6, roughness: 0.35 });
  // ---------- реактор (общий для обеих сцен) ----------
  const reactor = new T.Group(); scene.add(reactor);
  const H = 7, Rr = 5.8, cut = kind === 'core';
  // графитовые колонны: сетка в круге; в разрезе убраны колонны одной четверти
  const gMat = new T.MeshStandardMaterial({ color: 0x3a3f46, roughness: 0.85 }); r3Tex('graphite', gMat, [1, 3]);
  const cells = []; const step = 0.62;
  for (let x = -Rr; x <= Rr; x += step) for (let z = -Rr; z <= Rr; z += step) { if (Math.hypot(x, z) > Rr) continue; if (cut && x > 0 && z > 0) continue; cells.push([x, z]); }
  const gi = new T.InstancedMesh(new T.BoxGeometry(step * 0.96, H, step * 0.96), gMat, cells.length); const m4 = new T.Matrix4();
  cells.forEach(([x, z], i) => { m4.makeTranslation(x, 0, z); gi.setMatrixAt(i, m4); }); reactor.add(tag(gi, 'graphite'));
  // каналы на гранях разреза (видны внутри): топливо и СУЗ
  const chMat = new T.MeshStandardMaterial({ color: 0xc9d2dc, metalness: 0.5, roughness: 0.3, emissive: new T.Color(0xff7a2e), emissiveIntensity: 0.4 }); r3Tex('channel', chMat);
  // каналы на гранях разреза: чуть выступают из кладки, чтобы их было видно
  const faceCells = []; if (cut) for (let t = step * 0.8; t < Rr - 0.3; t += step) { faceCells.push([0.05, t]); faceCells.push([t, 0.05]); }
  const fuelCells = faceCells.filter((c, i) => i % 3 !== 1), rodCells = faceCells.filter((c, i) => i % 3 === 1);
  if (fuelCells.length) { const fi = new T.InstancedMesh(new T.CylinderGeometry(0.16, 0.16, H + 0.6, 10), chMat, fuelCells.length); fuelCells.forEach(([x, z], i) => { m4.makeTranslation(x, 0.3, z); fi.setMatrixAt(i, m4); }); reactor.add(tag(fi, 'fuel')); R3.objs.channels = fi; R3.objs.chMat = chMat; }
  // стержни СУЗ: поглотитель + вытеснитель + вода; положение — по группам РР/АР/УСП
  const absMat = new T.MeshStandardMaterial({ color: 0x1d232b, roughness: 0.5, metalness: 0.3 }), dispMat = new T.MeshStandardMaterial({ color: 0x8c96a3, roughness: 0.7 }), watMat = new T.MeshStandardMaterial({ color: 0x38a9e8, transparent: true, opacity: 0.55, roughness: 0.1 });
  r3Tex('rod-absorber', absMat); r3Tex('rod-displacer', dispMat);
  rodCells.forEach(([x, z], i) => {
    const g = ['RR', 'RR', 'AR', 'RR', 'USP'][i % 5], grp = new T.Group(); grp.position.set(x, 0, z);
    const abs = new T.Mesh(new T.CylinderGeometry(0.2, 0.2, g === 'USP' ? 3.5 : 6.2, 12), absMat), dis = new T.Mesh(new T.CylinderGeometry(0.2, 0.2, 4.5, 12), dispMat), wat = new T.Mesh(new T.CylinderGeometry(0.19, 0.19, 1.25, 10), watMat);
    const mark = new T.Mesh(new T.CylinderGeometry(0.24, 0.24, 0.3, 12), new T.MeshStandardMaterial({ color: g === 'AR' ? 0xf59e0b : g === 'USP' ? 0x8b5cf6 : 0x64748b }));
    grp.add(tag(abs, 'rod'), tag(dis, 'rod'), tag(wat, 'water'), mark); reactor.add(grp); R3.objs.rods.push({ g, grp, abs, dis, wat, mark });
  });
  // пузырьки пара в топливных каналах
  if (fuelCells.length) { const n = fuelCells.length * 6, bi = new T.InstancedMesh(new T.SphereGeometry(0.07, 6, 6), new T.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.85 }), n); bi.userData.seed = Array.from({ length: n }, (_, k) => ({ c: fuelCells[k % fuelCells.length], y: Math.random(), s: 0.6 + Math.random() })); reactor.add(bi); R3.objs.bubbles = bi; }
  // верхняя и нижняя плиты, кожух
  const topMat = new T.MeshStandardMaterial({ color: 0xb4bcc6, metalness: 0.5, roughness: 0.45 }); r3Tex('top', topMat);
  const theta = cut ? Math.PI * 1.5 : Math.PI * 2, th0 = cut ? Math.PI : 0;   // в разрезе плиты и кожух тоже без четверти
  const top = new T.Mesh(new T.CylinderGeometry(Rr + 0.6, Rr + 0.6, 0.9, 64, 1, false, th0, theta), [steel, topMat, steel]); top.position.y = H / 2 + 0.75; reactor.add(tag(top, 'top'));
  const bot = new T.Mesh(new T.CylinderGeometry(Rr + 0.6, Rr + 0.6, 0.7, 64, 1, false, th0, theta), steel); bot.position.y = -H / 2 - 0.6; reactor.add(bot);
  const shell = new T.Mesh(new T.CylinderGeometry(Rr + 0.45, Rr + 0.45, H, 64, 1, true, th0, theta), new T.MeshStandardMaterial({ color: 0x7d8794, metalness: 0.4, roughness: 0.5, side: T.DoubleSide, transparent: true, opacity: 0.35 })); reactor.add(shell);
  // ---------- модели из листов: коробка, на грани которой натянуты виды спереди, сбоку и сверху (с прозрачным фоном) ----------
  const sheetBox = (w, h, d, v, key, col) => {
    const mk = name => { const m = new T.MeshStandardMaterial({ color: col, roughness: 0.55, metalness: 0.2, alphaTest: 0.45, side: T.DoubleSide }); if (name) r3Tex(name, m); return m; };
    const side = mk(v.side), front = mk(v.front), top = mk(v.top || v.side), none = new T.MeshStandardMaterial({ visible: false });
    if (!RB3D_TEX.includes(v.front)) [side, front, top].forEach(m => { m.alphaTest = 0; });   // без текстур — обычная коробка
    const mats = [side, side.clone(), top, none, front, front.clone()];
    const m = tag(new T.Mesh(new T.BoxGeometry(w, h, d), mats), key);
    if (RB3D_TEX.includes(v.front)) { m.userData.sheet = true; mats[1].map = side.map; mats[5].map = front.map; R3.sheets.push(m); }
    return m;
  };
  // ---------- энергоблок ----------
  if (kind === 'unit') {
    const pipeMat = new T.MeshStandardMaterial({ color: 0xc0c8d2, metalness: 0.6, roughness: 0.3 });
    R3.objs.pumps = [];
    [-1, 1].forEach(side => {
      for (const k of [0, 1]) { const d = r3Drum(); d.position.set(side * 11, 8.2, (k ? 1 : -1) * 3); d.traverse(o => { if (o.isMesh) tag(o, 'drum'); }); scene.add(d); }
      for (let i = 0; i < 4; i++) {
        const g = new T.Group(); g.position.set(side * 15.5, -4.1, -7 + i * 4.6);
        const body = r3Pump(); body.rotation.y = Math.PI / 2; body.traverse(o => { if (o.isMesh) tag(o, 'pump'); }); g.add(body);
        const lamp = new T.Mesh(new T.SphereGeometry(0.22, 12, 10), new T.MeshStandardMaterial({ color: 0x22c55e, emissive: 0x22c55e, emissiveIntensity: 1 })); lamp.position.set(0, 2.85, 0); g.add(lamp);
        scene.add(g); R3.objs.pumps.push({ g, lamp, body, idx: side < 0 ? i : 4 + i });
        const p1 = new T.Mesh(new T.CylinderGeometry(0.28, 0.28, 7.5, 10), pipeMat); p1.rotation.z = Math.PI / 2; p1.position.set(side * 10.3, -4.8, -7 + i * 4.6); scene.add(tag(p1, 'pipe'));
      }
      const riser = new T.Mesh(new T.CylinderGeometry(0.35, 0.35, 6, 10), pipeMat); riser.position.set(side * 7.8, 6.2, 0); riser.rotation.z = side * 0.75; scene.add(tag(riser, 'pipe'));
      const down = new T.Mesh(new T.CylinderGeometry(0.4, 0.4, 11, 10), pipeMat); down.position.set(side * 13.5, 1.2, 0); scene.add(tag(down, 'pipe'));
    });
    R3.objs.tgs = [];
    [0, 1].forEach(i => { const g = new T.Group(); g.position.set(-8 + i * 16, -4.7, -22);
      const b = r3Turbine(); b.traverse(o => { if (o.isMesh) tag(o, 'tg'); }); g.add(b); scene.add(g); R3.objs.tgs.push({ g, i });
      const sp = new T.Mesh(new T.CylinderGeometry(0.35, 0.35, 22, 10), pipeMat); sp.rotation.x = Math.PI / 2; sp.position.set(-8 + i * 16, 8.2, -11); scene.add(tag(sp, 'pipe')); });
    cam.position.set(30, 22, 34);
  } else if (kind === 'desk') {
    reactor.visible = false;
    const desk = sheetBox(14, 4.2, 1.6, { front: 'desk', side: null, top: null }, 'desk', 0x5c6f86); desk.position.set(0, -4, 0); scene.add(desk);
    cam.position.set(0, -1.5, 13);
  } else cam.position.set(15, 9, 17);
  const ctl = new window.THREE_OrbitControls(cam, ren.domElement); ctl.enableDamping = true; ctl.target.set(0, kind === 'unit' ? 0 : kind === 'desk' ? -4 : 0.5, kind === 'unit' ? -3 : 0); ctl.maxDistance = 90; ctl.minDistance = 6; ctl.maxPolarAngle = Math.PI * 0.49;
  Object.assign(R3, { scene, cam, ren, ctl, kind });
  // выбор детали щелчком
  let down = null; ren.domElement.addEventListener('pointerdown', e => { down = [e.clientX, e.clientY]; });
  ren.domElement.addEventListener('pointerup', e => { if (!down || Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 5) return; const r = ren.domElement.getBoundingClientRect();
    const rc = new T.Raycaster(); rc.setFromCamera(new T.Vector2((e.clientX - r.left) / r.width * 2 - 1, -(e.clientY - r.top) / r.height * 2 + 1), cam);
    const hit = rc.intersectObjects(R3.pick, false)[0]; const k = hit && hit.object.userData.info, box2 = $('#rb-3dinfo'); if (!box2) return;
    box2.innerHTML = k ? `<b>${R3INFO[k][0]}</b><p>${R3INFO[k][1]}</p>` : '<p class="mute">Щёлкните по детали, чтобы узнать, что это.</p>'; });
  r3Frame();
}
// каждый кадр: синхронизация с моделью
function r3Frame() {
  if (!R3.ren || !RBG) return; const T = window.THREE, S = RBG.S, H = 7;
  const v = Math.max(0, Math.min(1, Math.log10(1 + S.P * 60) / Math.log10(1 + 1.4 * 60)));
  if (R3.objs.chMat) { R3.objs.chMat.emissive.setHSL(0.6 - 0.53 * v, 0.9, 0.5); R3.objs.chMat.emissiveIntensity = 0.15 + v * 1.4 + (S.broken ? 3 : 0); }   // синий — малая мощность, оранжевый — номинал
  R3.objs.rods.forEach(r => {   // стержень: глубина погружения поглотителя h → низ поглотителя на высоте top − h·H
    const ins = S.rods[r.g], absL = r.g === 'USP' ? 3.5 : 6.2;
    if (r.g === 'USP') { r.abs.position.y = -H / 2 - absL / 2 + ins * absL; r.dis.visible = r.wat.visible = false; r.mark.position.y = r.abs.position.y - absL / 2 - 0.15; return; }
    const tipY = H / 2 + 0.3 - ins * (H + 0.3); r.abs.position.y = tipY + absL / 2; r.dis.position.y = tipY - 0.25 - 4.5 / 2; r.mark.position.y = tipY + absL + 0.15;
    const wb = r.dis.position.y - 4.5 / 2; r.wat.visible = wb > -H / 2 + 0.05; const wl = Math.max(0.05, Math.min(1.25, wb + H / 2)); r.wat.scale.y = wl / 1.25; r.wat.position.y = -H / 2 + wl / 2;
  });
  const bi = R3.objs.bubbles; if (bi) { const m = new T.Matrix4(), n = bi.count, show = Math.round(n * Math.min(1, S.phi * 1.6 + (S.P > 0.01 ? 0.05 : 0)));
    bi.userData.seed.forEach((q, i) => { q.y += 0.004 * q.s * (0.3 + S.G); if (q.y > 1) q.y = 0; const y = -H / 2 + q.y * H; m.makeScale(i < show ? 1 : 0.0001, i < show ? 1 : 0.0001, i < show ? 1 : 0.0001); m.setPosition(q.c[0] + Math.sin(i) * 0.05, y, q.c[1] + Math.cos(i) * 0.05); bi.setMatrixAt(i, m); });
    bi.instanceMatrix.needsUpdate = true; }
  (R3.objs.pumps || []).forEach(p => { const q = S.pumps[p.idx]; p.lamp.material.color.set(q.on ? (q.vib > 60 ? 0xf59e0b : 0x22c55e) : q.spin > 0.05 ? 0x38bdf8 : 0x64748b); p.lamp.material.emissive.copy(p.lamp.material.color); p.body.position.x = q.on && q.vib > 60 ? Math.sin(performance.now() / 30) * 0.04 : 0; });
  // модели из листов: видна только грань, обращённая к камере (иначе сквозь прозрачный фон просвечивают другие виды)
  const cp = R3.cam.position, wp = new T.Vector3(), q = new T.Quaternion();
  R3.sheets.forEach(m => { const ms = m.material; if (!ms[1].map && ms[0].map) { ms[1].map = ms[0].map; ms[1].needsUpdate = true; } if (!ms[5].map && ms[4].map) { ms[5].map = ms[4].map; ms[5].needsUpdate = true; }
    m.getWorldPosition(wp); m.getWorldQuaternion(q); const v = cp.clone().sub(wp).applyQuaternion(q.invert()), ax = Math.abs(v.x), ay = Math.abs(v.y), az = Math.abs(v.z);
    const k = ay > Math.max(ax, az) * 1.6 ? 'y' : ax > az ? 'x' : 'z';
    ms[0].visible = k === 'x' && v.x > 0; ms[1].visible = k === 'x' && v.x <= 0; ms[2].visible = k === 'y'; ms[4].visible = k === 'z' && v.z > 0; ms[5].visible = k === 'z' && v.z <= 0; });
  R3.ctl.update(); R3.ren.render(R3.scene, R3.cam);
}
function r3Resize() { const box = $('#rb-3dc'); if (!R3.ren || !box) return; R3.ren.setSize(box.clientWidth, box.clientHeight); R3.cam.aspect = box.clientWidth / box.clientHeight; R3.cam.updateProjectionMatrix(); }
window.addEventListener('resize', () => { if (RBG && RBG.view === '3d') r3Resize(); });
async function r3Show(kind) {
  if (!r3Supported()) { toast('3D недоступно на этом компьютере (видеокарта не поддерживает WebGL). Работает 2D-пульт.', 'bad'); RBG.view = '2d'; rbView(); return; }
  const info = $('#rb-3dinfo'); if (info) info.innerHTML = '<p class="mute">Загрузка 3D…</p>';
  await r3Load(); if (!R3.ok) { toast('Не удалось загрузить 3D', 'bad'); RBG.view = '2d'; rbView(); return; }
  if (!RBG || RBG.view !== '3d') return;
  r3Build(kind || R3.kind || 'core'); if (info) info.innerHTML = '<p class="mute">Щёлкните по детали, чтобы узнать, что это.</p>';
}
function r3Hide() { if (R3.ren) { R3.ren.dispose(); R3.ren.domElement.remove(); R3.ren = null; } }
