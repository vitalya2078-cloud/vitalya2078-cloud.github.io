/* =====================================================================
   Тренажёр РБМК: 3D-вид (three.js r162, загружается по требованию из three/three3d.js).
   Две сцены: «Реактор в разрезе» (графитовая кладка, каналы, стержни с вытеснителями, пар) и «Энергоблок»
   (реактор, барабаны-сепараторы, ГЦН, турбогенераторы). Всё связано с состоянием модели RBG.S.
   Текстуры (необязательно): img/rbmk3d/*.webp — развёртки деталей и бесшовные плитки зала; если файла нет, деталь окрашена цветом.
   Если WebGL недоступен (старая видеокарта), остаётся 2D-пульт.
   ===================================================================== */
const R3 = { ok: null, loading: null, scene: null, cam: null, ren: null, ctl: null, objs: {}, kind: 'unit', pick: [], tex: {}, raf: 0 };
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
  az5: ['Кнопка АЗ-5', 'Аварийная защита пятой категории: все стержни СУЗ идут в зону. Крышка защищает от случайного нажатия. Нажимают её на 2D-пульте (щелчок по крышке, затем по кнопке).'],
  desk: ['Блочный щит управления', 'Пульт СИУР: управление стержнями, картограмма зоны, кнопка АЗ-5 под крышкой, приборы контура.'],
  tg: ['Турбогенератор', 'Пар вращает турбину, генератор даёт электричество: два ТГ по 500 МВт.'],
  pipe: ['Трубопроводы', 'Пароводяные коммуникации и опускные трубопроводы контура многократной принудительной циркуляции.'],
};

/* ---------- модели «потекстурно»: объёмные формы, на каждую натянута своя развёртка ---------- */
const R3IMG = {}, R3CT = {};
function r3Img(name) { if (!R3IMG[name]) { const im = new Image(); R3IMG[name] = new Promise(res => { im.onload = () => res(im); im.onerror = () => res(null); }); if (RB3D_TEX.includes(name)) im.src = 'img/rbmk3d/' + name + '.webp'; else R3IMG[name] = Promise.resolve(null); } return R3IMG[name]; }
// кусок картинки [x0, y0, x1, y1] (доли) → текстура; rot — повернуть на 90° (длина картинки → высота цилиндра);
// rep: [по u, по v] — повтор; mirror — повтор с отражением (для картинок без бесшовного стыка)
const r3Crop = (name, box, o = {}) => ({ name, box, o });
const r3Full = (name, o) => r3Crop(name, [0, 0, 1, 1], o);
function r3CanvasTex(spec) {
  const key = spec.name + JSON.stringify(spec.box) + JSON.stringify(spec.o);
  if (!R3CT[key]) R3CT[key] = r3Img(spec.name).then(im => { if (!im) return null; const T = window.THREE, [x0, y0, x1, y1] = spec.box, o = spec.o, sw = (x1 - x0) * im.width, sh = (y1 - y0) * im.height;
    const W = Math.min(1024, Math.round(o.rot ? sh : sw)), H = Math.min(1024, Math.round(o.rot ? sw : sh)), cv = document.createElement('canvas'); cv.width = W; cv.height = H; const c = cv.getContext('2d');
    if (o.rot) { c.translate(W, 0); c.rotate(Math.PI / 2); c.drawImage(im, x0 * im.width, y0 * im.height, sw, sh, 0, 0, H, W); } else c.drawImage(im, x0 * im.width, y0 * im.height, sw, sh, 0, 0, W, H);
    const t = new T.CanvasTexture(cv); t.colorSpace = T.SRGBColorSpace; t.anisotropy = 8;
    if (o.rep) { t.wrapS = t.wrapT = o.mirror ? T.MirroredRepeatWrapping : T.RepeatWrapping; t.repeat.set(o.rep[0], o.rep[1]); }
    if (o.off) t.offset.set(o.off[0], o.off[1]);
    return t; });
  return R3CT[key];
}
function r3Apply(mat, spec, glow) {
  r3CanvasTex(spec).then(t => { if (!t) return; mat.map = t; mat.color.set(0xffffff); if (glow) { mat.emissiveMap = t; mat.emissive.set(0xffffff); mat.emissiveIntensity = glow; } mat.needsUpdate = true; });
}
const r3Mat = (col, spec, extra = {}) => { const T = window.THREE, m = new T.MeshStandardMaterial(Object.assign({ color: col, roughness: 0.55, metalness: spec ? 0.15 : 0.2 }, extra)); if (spec) r3Apply(m, spec); return m; };
// общие материалы: окрашенный металл, нержавейка, оранжевая краска
const r3Metal = (rep = [1, 1]) => r3Mat(0x55667c, r3Full('metal', { rep }));
const r3Steel = (rep = [1, 1]) => r3Mat(0xc0c8d2, r3Full('steel', { rep }), { metalness: 0.55, roughness: 0.32 });
const r3Orange = () => r3Mat(0xf08a24, null, { metalness: 0.1, roughness: 0.6 });
// полусфера-днище с плоской развёрткой (картинка торца ложится «как на фото»)
function r3Cap(R, depth, mat) {
  const T = window.THREE, g = new T.SphereGeometry(R, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), p = g.attributes.position, uv = g.attributes.uv;
  for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) / (2 * R) + 0.5, 0.5 - p.getZ(i) / (2 * R));
  g.scale(1, depth / R, 1); return new T.Mesh(g, mat);
}
function r3Drum() {
  const T = window.THREE, g = new T.Group(), R = 1.25, L = 12, steelM = r3Steel([1, 2]);
  const body = new T.Mesh(new T.CylinderGeometry(R, R, L, 48, 1, true), r3Mat(0xa9b4c0, r3Full('drum-shell', { rot: true, rep: [2, 1] }), { metalness: 0.35, roughness: 0.4 })); body.rotation.z = Math.PI / 2; g.add(body);
  const capM = r3Mat(0xa9b4c0, r3Crop('drum-head', [0.012, 0.012, 0.988, 0.988]), { metalness: 0.35, roughness: 0.4 });
  [-1, 1].forEach(sd => { const c = r3Cap(R, 0.75, capM); c.rotation.z = -sd * Math.PI / 2; c.position.x = sd * L / 2; g.add(c);
    const sup = new T.Mesh(new T.CylinderGeometry(0.35, 0.9, 1.5, 4), r3Metal()); sup.rotation.y = Math.PI / 4; sup.position.set(sd * L * 0.33, -R - 0.55, 0); g.add(sup); });
  const flM = r3Orange();
  [[-0.35, 0.32], [-0.2, 0.22], [0, 0.42], [0.12, 0.2], [0.22, 0.2], [0.35, 0.32]].forEach(([fx, r]) => {
    const n = new T.Mesh(new T.CylinderGeometry(r, r, 0.7, 16), steelM), fl = new T.Mesh(new T.CylinderGeometry(r + 0.12, r + 0.12, 0.12, 20), flM); n.position.set(fx * L, R + 0.25, 0); fl.position.set(fx * L, R + 0.6, 0); g.add(n, fl); });
  return g;
}
function r3Pump() {
  const T = window.THREE, g = new T.Group(), grey = r3Metal(), orange = r3Orange();
  const motor = new T.Mesh(new T.CylinderGeometry(0.62, 0.62, 1.35, 40, 1, true), r3Mat(0x55667c, r3Full('motor', { rep: [1, 1] }))); motor.position.y = 1.55; g.add(motor);
  const capTop = r3Mat(0xf59e0b, r3Crop('motor-cap', [0.012, 0.012, 0.988, 0.988]), { metalness: 0.1 }), cap = new T.Mesh(new T.CylinderGeometry(0.66, 0.66, 0.3, 40), [orange, capTop, orange]); cap.position.y = 2.37; g.add(cap);
  const collar = new T.Mesh(new T.CylinderGeometry(0.74, 0.74, 0.16, 32), orange); collar.position.y = 0.8; g.add(collar);
  const neck = new T.Mesh(new T.CylinderGeometry(0.4, 0.5, 0.45, 20), grey); neck.position.y = 0.5; g.add(neck);
  const face = r3Mat(0x55667c, r3Crop('pump-face', [0.012, 0.012, 0.988, 0.988]));
  const casing = new T.Mesh(new T.CylinderGeometry(0.88, 0.88, 0.95, 40), [grey, face, face]); casing.rotation.x = Math.PI / 2; casing.position.y = -0.2; g.add(casing);
  const pipe = new T.Mesh(new T.CylinderGeometry(0.36, 0.36, 3.1, 20), r3Steel([1, 2])); pipe.rotation.z = Math.PI / 2; pipe.position.y = -0.2; g.add(pipe);
  [-1, 1].forEach(sd => { const fl = new T.Mesh(new T.CylinderGeometry(0.58, 0.58, 0.2, 28), orange); fl.rotation.z = Math.PI / 2; fl.position.set(sd * 1.45, -0.2, 0); g.add(fl); });
  const base = new T.Mesh(new T.BoxGeometry(1.9, 0.28, 1.3), grey); base.position.y = -1.2; g.add(base);
  return g;
}
function r3Turbine() {
  const T = window.THREE, g = new T.Group(), metal = r3Metal([4, 1]);
  const base = new T.Mesh(new T.BoxGeometry(12.5, 0.7, 3.4), metal); base.position.y = -1.6; g.add(base);
  const casM = r3Mat(0x55667c, r3Full('turbine', { rot: true, rep: [1, 1], off: [0.25, 0] }));
  const cas = new T.Mesh(new T.CylinderGeometry(1.35, 1.35, 6.4, 48, 1, true), casM); cas.rotation.z = Math.PI / 2; cas.position.set(-2.4, 0, 0); g.add(cas);
  [-5.6, 0.8].forEach(x => { const e = new T.Mesh(new T.CylinderGeometry(1.35, 1.35, 0.05, 48), r3Metal()); e.rotation.z = Math.PI / 2; e.position.x = x; g.add(e); });
  const coup = new T.Mesh(new T.CylinderGeometry(0.75, 0.75, 0.5, 24), r3Orange()); coup.rotation.z = Math.PI / 2; coup.position.x = 1.1; g.add(coup);
  const endM = r3Mat(0xb8c0c9, r3Crop('gen-end', [0.012, 0.012, 0.988, 0.988]));
  const gen = new T.Mesh(new T.CylinderGeometry(1.4, 1.4, 3.8, 48), [r3Mat(0xb8c0c9, r3Full('generator', { rot: true, rep: [1, 1] })), endM, endM]); gen.rotation.z = Math.PI / 2; gen.position.x = 3.4; g.add(gen);
  const sp = new T.Mesh(new T.TorusGeometry(1.1, 0.16, 10, 24, Math.PI), r3Steel([2, 1])); sp.position.set(-2.4, 1.35, 0); g.add(sp);
  return g;
}
// блочный щит: вертикальная панель приборов и наклонный пульт с кнопкой АЗ-5 под крышкой
function r3Desk() {
  const T = window.THREE, g = new T.Group(), metal = r3Metal([2, 1]);
  const panelM = new T.MeshStandardMaterial({ color: 0x5c6f86, roughness: 0.55, metalness: 0.15 }); R3.objs.panelMat = panelM;   // картинку панели рисует r3DeskTex (живые приборы)
  const panel = new T.Mesh(new T.BoxGeometry(14, 4.67, 0.5), [metal, metal, metal, metal, panelM, metal]); panel.position.set(0, 2.335 + 1, -1.8); g.add(r3Tag(panel, 'desk', 'desk'));
  const plinth = new T.Mesh(new T.BoxGeometry(14.2, 1, 0.8), metal); plinth.position.set(0, 0.5, -1.8); g.add(r3Tag(plinth, 'desk', 'desk'));
  const metal2 = r3Metal([2, 1]), base = new T.Mesh(new T.BoxGeometry(12, 2.1, 3.2), metal2); base.position.set(0, 1.05, 0.6); g.add(r3Tag(base, 'console', 'console'));
  const topM = r3Mat(0x5c6f86, r3Full('desk-top'));
  const top = new T.Group(); top.position.set(0, 2.25, 0.6); top.rotation.x = 0.22; g.add(top);
  const slab = new T.Mesh(new T.BoxGeometry(12, 0.24, 4), [metal2, metal2, topM, metal2, metal2, metal2]); top.add(r3Tag(slab, 'console', 'console'));
  // АЗ-5 — в пустом квадрате посередине пульта
  const az = new T.Group(); az.position.set((0.478 - 0.5) * 12, 0.12, 0); top.add(az);
  const azBase = new T.Mesh(new T.BoxGeometry(0.95, 0.12, 0.95), new T.MeshStandardMaterial({ color: 0x1f2937, roughness: 0.6 }));
  const btn = new T.Mesh(new T.BoxGeometry(0.62, 0.3, 0.62), new T.MeshStandardMaterial({ color: 0xdc2626, emissive: 0x7f1d1d, emissiveIntensity: 0.3, roughness: 0.35 })); btn.position.y = 0.2;
  const hinge = new T.Group(); hinge.position.set(0, 0.1, -0.45); hinge.rotation.x = -1.9;
  const cover = new T.Mesh(new T.BoxGeometry(0.9, 0.06, 0.9), new T.MeshStandardMaterial({ color: 0xfacc15, transparent: true, opacity: 0.75, roughness: 0.3 })); cover.position.z = 0.45; hinge.add(cover);
  az.add(azBase, btn, hinge); R3.objs.az = { btn, hinge };
  [azBase, btn, cover].forEach(m => r3Tag(m, 'az5', 'az5')); btn.material.userData.dyn = true;
  return g;
}
// реакторный зал: пол, стены, потолок и кран-балка (бесшовные текстуры повторяются плиткой)
function r3Room(scene, dark) {
  const T = window.THREE, Y0 = -6.2, HW = 80, WH = 64, BAND = 16, room = new T.Group(); scene.add(room);
  const floor = new T.Mesh(new T.PlaneGeometry(HW * 2, HW * 2), r3Mat(0x5a6a80, r3Full('floor', { rep: [HW / 3.2, HW / 3.2] }), { roughness: 0.7, metalness: 0.25 })); floor.rotation.x = -Math.PI / 2; floor.position.y = Y0; room.add(floor);
  const pad = new T.Mesh(new T.PlaneGeometry(20, 20), r3Mat(0x5a6a80, r3Full('floor-hazard', { rep: [3, 3] }), { roughness: 0.7, metalness: 0.25 })); pad.rotation.x = -Math.PI / 2; pad.position.y = Y0 + 0.02; room.add(pad);
  const wallLo = r3Mat(0x6b7c92, r3Full('wall', { rep: [HW * 2 / BAND, 1] }), { roughness: 0.75 }), wallHi = r3Mat(0xb8bec6, r3Crop('wall', [0, 0, 1, 0.36], { rep: [HW * 2 / BAND, (WH - BAND) / (BAND * 0.36)] }), { roughness: 0.85 });
  for (let k = 0; k < 4; k++) {
    const a = k * Math.PI / 2, w = new T.Group(); w.rotation.y = a; w.position.set(Math.sin(a) * -HW, 0, Math.cos(a) * -HW); room.add(w);
    const lo = new T.Mesh(new T.PlaneGeometry(HW * 2, BAND), wallLo); lo.position.y = Y0 + BAND / 2; w.add(lo);
    const hi = new T.Mesh(new T.PlaneGeometry(HW * 2, WH - BAND), wallHi); hi.position.y = Y0 + BAND + (WH - BAND) / 2; w.add(hi);
  }
  const ceil = new T.Mesh(new T.PlaneGeometry(HW * 2, HW * 2), new T.MeshStandardMaterial({ color: 0x5a6a80, roughness: 0.8, emissive: 0x000000 })); r3Apply(ceil.material, r3Full('ceiling', { rep: [HW / 8, HW / 8] }), dark ? 0.35 : 0.15);
  ceil.rotation.x = Math.PI / 2; ceil.position.y = Y0 + WH; room.add(ceil);
  // мостовой кран над залом
  const or = r3Orange(), metal = r3Metal([6, 1]);
  const beam = new T.Mesh(new T.BoxGeometry(HW * 2 - 2, 2.2, 2.6), or); beam.position.set(0, Y0 + 44, -14); room.add(beam);
  [-1, 1].forEach(sd => { const rail = new T.Mesh(new T.BoxGeometry(1.4, 1.2, HW * 2), metal); rail.position.set(sd * (HW - 1.2), Y0 + 42.4, 0); room.add(rail); });
  const trolley = new T.Mesh(new T.BoxGeometry(4, 1.8, 4), r3Metal()); trolley.position.set(18, Y0 + 42.3, -14); room.add(trolley);
  const rope = new T.Mesh(new T.CylinderGeometry(0.06, 0.06, 14, 6), r3Steel()); rope.position.set(18, Y0 + 34.5, -14); room.add(rope);
  const hook = new T.Mesh(new T.BoxGeometry(1.2, 1.4, 0.8), or); hook.position.set(18, Y0 + 27, -14); room.add(hook);
  return room;
}
Object.assign(R3INFO, {
  console: ['Пульт СИУР', 'Наклонный пульт старшего инженера управления реактором: ключи групп стержней, регулятор АР, кнопка АЗ-5 под крышкой.'],
  pen: ['Питательный электронасос (ПЭН)', 'Подаёт воду из деаэратора в барабаны-сепараторы взамен ушедшего на турбины пара. Обычно работают два из трёх.'],
  deaer: ['Деаэратор', 'Бак питательной воды: здесь из конденсата удаляются растворённые газы, отсюда воду забирают питательные насосы.'],
  cond: ['Конденсатор турбины', 'Отработавший в турбине пар охлаждается водой и снова становится водой — конденсатом.'],
  eccs: ['САОР — система аварийного охлаждения реактора', 'Ёмкости с водой под давлением: при разрыве контура подают воду в каналы. В ночь 26 апреля САОР была отключена.'],
  bru: ['БРУ-К', 'Быстродействующее редукционное устройство: сбрасывает лишний пар из барабанов прямо в конденсатор, минуя турбину.'],
  down: ['Опускные трубы и всасывающий коллектор', 'Вода из барабанов-сепараторов опускается к главным циркуляционным насосам.'],
  press: ['Напорный коллектор и раздаточные коллекторы', 'От насосов вода под напором расходится по раздаточным коллекторам и снизу входит в каналы реактора.'],
  pvk: ['Пароводяные коммуникации', 'Из верха каналов пароводяная смесь поднимается в барабаны-сепараторы.'],
  steam: ['Паропровод', 'Сухой пар из барабанов-сепараторов идёт на турбину.'],
  feed: ['Трубопровод питательной воды', 'Вода из деаэратора через питательные насосы возвращается в барабаны-сепараторы.'],
  condl: ['Трубопровод конденсата', 'Конденсат из конденсатора турбины перекачивается в деаэратор.'],
});

/* ---------- трубы: маршрут с плавными поворотами, поток — бегущие метки ---------- */
function r3Route(pts, rad) {
  const T = window.THREE, path = new T.CurvePath(), P = pts.map(p => new T.Vector3(p[0], p[1], p[2])); let cur = P[0].clone();
  for (let i = 1; i < P.length; i++) {
    const a = P[i];
    if (i === P.length - 1) { path.add(new T.LineCurve3(cur, a)); break; }
    const d1 = a.clone().sub(cur), d2 = P[i + 1].clone().sub(a), r = Math.min(rad, d1.length() / 2, d2.length() / 2);
    const p1 = a.clone().sub(d1.normalize().multiplyScalar(r)), p2 = a.clone().add(d2.normalize().multiplyScalar(r));
    if (cur.distanceTo(p1) > 1e-4) path.add(new T.LineCurve3(cur, p1));
    path.add(new T.QuadraticBezierCurve3(p1, a, p2)); cur = p2;
  }
  return path;
}
const R3MED = { water: [0x38bdf8, 1], mix: [0xe2e8f0, 0.95], steam: [0xffffff, 0.6], feed: [0x2563eb, 1] };
function r3Pipe(scene, pts, o) {
  const T = window.THREE, path = r3Route(pts, o.r * 2.5), len = path.getLength();
  const m = new T.Mesh(new T.TubeGeometry(path, Math.max(8, Math.ceil(len * (R3.low ? 1 : 2))), o.r, R3.low ? 6 : 10, false), o.mat);
  scene.add(m); r3Tag(m, o.info, o.id);
  if (o.med) R3.flows.push({ path, len, med: o.med, rate: o.rate, r: o.r, n: Math.max(2, Math.round(len / (R3.low ? 2.6 : 1.6))), off: Math.random() });
  return m;
}
function r3FlowInit(scene) {
  const T = window.THREE, cnt = {}; R3.flows.forEach(f => { cnt[f.med] = (cnt[f.med] || 0) + f.n; });
  R3.flowIM = {};
  for (const k in cnt) { const [c, o] = R3MED[k]; const im = new T.InstancedMesh(new T.SphereGeometry(1, 10, 8), new T.MeshBasicMaterial({ color: c, transparent: o < 1, opacity: o, depthWrite: o >= 1 }), cnt[k]); im.frustumCulled = false; scene.add(im); R3.flowIM[k] = im; }
}
function r3Flows(dt) {
  if (!R3.flowIM) return; const T = window.THREE, m4 = new T.Matrix4(), p = new T.Vector3(), cnt = {};
  R3.flows.forEach(f => {
    const v = Math.max(0, f.rate() || 0), im = R3.flowIM[f.med]; let k = cnt[f.med] || 0;
    f.off = (f.off + v * dt * 3 / f.len) % 1;
    for (let j = 0; j < f.n; j++) { const s = v > 0.02 ? f.r * 1.12 : 0.0001; f.path.getPointAt((j / f.n + f.off) % 1, p); m4.makeScale(s, s, s); m4.setPosition(p); im.setMatrixAt(k++, m4); }
    cnt[f.med] = k;
  });
  for (const k in R3.flowIM) R3.flowIM[k].instanceMatrix.needsUpdate = true;
}

/* ---------- метки деталей: info — справка, id — узел для выделения и карточки ---------- */
function r3Tag(m, info, id) { m.userData.info = info; m.userData.id = id || info; R3.pick.push(m); (R3.parts[m.userData.id] = R3.parts[m.userData.id] || []).push(m); return m; }
const r3S = () => RBG.S;
const r3Side = s => s < 0 ? [0, 1, 2, 3] : [4, 5, 6, 7];
const r3SideFlow = s => r3Side(s).reduce((a, i) => a + RBG.S.pumps[i].spin * (1 - 0.5 * RBG.S.pumps[i].cav), 0) / 3;
const r3Steam = () => { const S = r3S(); return Math.max(0, Math.min(1.3, S.P - S.G * S.sub * 0.6)); };

/* ---------- энергоблок: две петли КМПЦ, турбины, конденсаторы, деаэратор, ПЭН, САОР ---------- */
function r3Plant(scene) {
  const T = window.THREE, mats = {}, M = (id, f) => mats[id] || (mats[id] = f());
  const pipeM = id => M('p:' + id, () => r3Steel([1, 6]));
  [-1, 1].forEach(s => {
    const side = s < 0 ? 'левая' : 'правая';
    // барабаны-сепараторы
    [0, 1].forEach(k => {
      const id = 'drum:' + ((s < 0 ? 0 : 2) + k), z = k ? 3 : -3, d = r3Drum(); d.position.set(s * 11, 8.2, z); scene.add(d); d.traverse(o => { if (o.isMesh) r3Tag(o, 'drum', id); });
      R3.objs.drums.push({ g: d, id, s, z }); r3Label(id, [s * 11, 10.4, z], () => `БС-${(s < 0 ? 1 : 3) + k}`);
      // опускные трубы: от днища барабана наружу и вниз к всасывающему коллектору
      r3Pipe(scene, [[s * 16.4, 7.6, z], [s * 20.5, 7.6, z], [s * 20.5, -1, z]], { r: 0.42, mat: pipeM('down' + s), info: 'down', id: 'down:' + s, med: 'water', rate: () => r3SideFlow(s) });
      // пароводяные коммуникации из верха реактора в барабан
      [2.2, 3.6, 5].forEach((x0, j) => r3Pipe(scene, [[s * x0, 4.7, z * (0.5 + j * 0.25)], [s * x0, 5.9, z * (0.5 + j * 0.25)], [s * (6.5 + j * 2), 5.9, z], [s * (6.5 + j * 2), 7.1, z]], { r: 0.2, mat: pipeM('pvk' + s), info: 'pvk', id: 'pvk:' + s, med: 'mix', rate: () => r3SideFlow(s) * (0.5 + RBG.S.phi) }));
      // паропровод к турбине своей стороны
      const tx = s * 8 - 2.4 + (k ? 0.7 : -0.7);
      r3Pipe(scene, [[s * 14, 9.4, z], [s * 14, 12, z], [s * 14, 12, -15 + k * 1.2], [tx, 12, -15 + k * 1.2], [tx, 12, -22], [tx, -3.25, -22]], { r: 0.34, mat: pipeM('steam' + s), info: 'steam', id: 'steam:' + (s < 0 ? 0 : 1), med: 'steam', rate: () => RBG.S.tg[s < 0 ? 0 : 1].on ? r3Steam() : 0 });
      // питательная вода в барабан
      r3Pipe(scene, [[s * 3, 13.6, z * 0.4], [s * 7, 13.6, z], [s * 7, 9.4, z]], { r: 0.22, mat: pipeM('feed'), info: 'feed', id: 'feed', med: 'feed', rate: () => RBG.S.fw });
    });
    // всасывающий коллектор, насосы, напорный коллектор, раздаточные коллекторы
    r3Pipe(scene, [[s * 20.5, -1, -9], [s * 20.5, -1, 9]], { r: 0.5, mat: pipeM('down' + s), info: 'down', id: 'down:' + s });
    r3Pipe(scene, [[s * 13.5, -4.3, -9.5], [s * 13.5, -4.3, 9.5]], { r: 0.5, mat: pipeM('press' + s), info: 'press', id: 'press:' + s });
    r3Side(s).forEach((i, j) => {
      const z = -7 + j * 4.6, g = new T.Group(); g.position.set(s * 17.5, -4.1, z);
      const body = r3Pump(); body.traverse(o => { if (o.isMesh) r3Tag(o, 'pump', 'pump:' + i); }); g.add(body);
      const lampM = new T.MeshStandardMaterial({ color: 0x22c55e, emissive: 0x22c55e, emissiveIntensity: 1 }); lampM.userData.dyn = true;
      const lamp = new T.Mesh(new T.SphereGeometry(0.22, 12, 10), lampM); lamp.position.set(0, 2.85, 0); g.add(lamp);
      scene.add(g); R3.objs.pumps.push({ g, lamp, body, idx: i });
      r3Label('pump:' + i, [s * 17.5, -0.6, z], () => { const q = RBG.S.pumps[i]; return `ГЦН-${i + 1} · ${q.on ? (q.cav > 0.2 ? 'кавитация' : q.vib > 60 ? 'вибрация' : 'работает') : q.spin > 0.05 ? 'выбег' : 'резерв'}`; });
      const q = () => RBG.S.pumps[i].spin * (1 - 0.5 * RBG.S.pumps[i].cav);
      r3Pipe(scene, [[s * 20.5, -1, z], [s * 20.5, -4.3, z], [s * 19.05, -4.3, z]], { r: 0.3, mat: pipeM('down' + s), info: 'down', id: 'down:' + s, med: 'water', rate: q });
      r3Pipe(scene, [[s * 15.95, -4.3, z], [s * 13.5, -4.3, z]], { r: 0.3, mat: pipeM('press' + s), info: 'press', id: 'press:' + s, med: 'water', rate: q });
    });
    [-6, -2, 2, 6].forEach(z => r3Pipe(scene, [[s * 13.5, -4.3, z], [s * 13.5, -5.4, z], [s * 4.2, -5.4, z * 0.55], [s * 4.2, -4.4, z * 0.55]], { r: 0.26, mat: pipeM('press' + s), info: 'press', id: 'press:' + s, med: 'water', rate: () => r3SideFlow(s) }));
    // ёмкости САОР
    const eg = new T.Group(); eg.position.set(s * 25, -3.2, 9); scene.add(eg);
    const tank = new T.Mesh(new T.CylinderGeometry(1.4, 1.4, 5.4, 32), r3Metal([2, 2])); eg.add(tank);
    const dome = r3Cap(1.4, 0.7, r3Metal()); dome.position.y = 2.7; eg.add(dome);
    const eLampM = new T.MeshStandardMaterial({ color: 0x22c55e, emissive: 0x22c55e, emissiveIntensity: 1 }); eLampM.userData.dyn = true;
    const el = new T.Mesh(new T.SphereGeometry(0.25, 12, 10), eLampM); el.position.y = 3.6; eg.add(el); R3.objs.eccsLamps.push(el);
    [tank, dome].forEach(m => r3Tag(m, 'eccs', 'eccs'));
    r3Pipe(scene, [[s * 25, -5.6, 9], [s * 13.5, -5.6, 9], [s * 13.5, -4.3, 9.4]], { r: 0.22, mat: M('eccsl', () => r3Steel([1, 4])), info: 'eccs', id: 'eccs' });
    if (s < 0) r3Label('eccs', [s * 25, 1.6, 9], () => `САОР · ${RBG.S.eccs ? 'в работе' : 'отключена'}`);
  });
  r3Pipe(scene, [[0, 13.6, -37], [0, 13.6, 0]], { r: 0.26, mat: pipeM('feed'), info: 'feed', id: 'feed', med: 'feed', rate: () => RBG.S.fw });
  r3Pipe(scene, [[-3, 13.6, 0], [3, 13.6, 0]], { r: 0.26, mat: pipeM('feed'), info: 'feed', id: 'feed' });
  // турбогенераторы и конденсаторы
  [0, 1].forEach(i => {
    const x = -8 + i * 16, g = new T.Group(); g.position.set(x, -4.7, -22);
    const b = r3Turbine(); b.traverse(o => { if (o.isMesh) r3Tag(o, 'tg', 'tg:' + i); }); g.add(b); scene.add(g); R3.objs.tgs.push({ g, i });
    r3Label('tg:' + i, [x, -1.4, -22], () => { const t = RBG.S.tg[i]; return `ТГ-${i + 7} · ${t.on ? Math.round(Math.max(0, t.load) * 1000) + ' МВт' : 'отключён'}`; });
    const c = new T.Mesh(new T.BoxGeometry(7, 2.6, 3.6), r3Metal([2, 1])); c.position.set(x, -4.9, -27.6); scene.add(r3Tag(c, 'cond', 'cond:' + i));
    r3Pipe(scene, [[x - 2.4, -4.7, -23.4], [x - 2.4, -4.7, -25.8]], { r: 0.6, mat: M('exh', () => r3Metal()), info: 'cond', id: 'cond:' + i, med: 'steam', rate: () => RBG.S.tg[i].on ? r3Steam() * 0.8 : 0 });
    r3Pipe(scene, [[x, -3.6, -27.6], [x, -3.6, -30], [x * 0.6, -3.6, -30], [x * 0.6, 4.3, -30]], { r: 0.2, mat: M('condl', () => r3Steel([1, 4])), info: 'condl', id: 'condl', med: 'water', rate: () => RBG.S.tg[i].on ? Math.max(0, RBG.S.tg[i].load) * 1.6 : 0 });
  });
  // БРУ-К: перемычка между паропроводами со сбросом в конденсатор
  r3Pipe(scene, [[-14, 12, -12], [14, 12, -12]], { r: 0.26, mat: M('bru', () => r3Steel([1, 6])), info: 'bru', id: 'bru' });
  r3Pipe(scene, [[0, 12, -12], [0, 0, -12], [0, 0, -27.6], [-4.5, 0, -27.6], [-4.5, -3.6, -27.6]], { r: 0.26, mat: M('bru', () => r3Steel([1, 6])), info: 'bru', id: 'bru', med: 'steam', rate: () => RBG.S.bru > 0 ? r3Steam() * 0.7 : 0 });
  const valve = new T.Mesh(new T.BoxGeometry(1.4, 1.2, 1.2), r3Orange()); valve.position.set(0, 12, -12); scene.add(r3Tag(valve, 'bru', 'bru')); R3.objs.bru = valve;
  r3Label('bru', [0, 13.6, -12], () => `БРУ-К · ${RBG.S.bru > 0 ? 'открыт' : 'закрыт'}`);
  // деаэратор и питательные насосы
  const dg = new T.Group(); dg.position.set(0, 5.6, -30); scene.add(dg);
  const tank = new T.Mesh(new T.CylinderGeometry(1.4, 1.4, 10, 40, 1, true), r3Mat(0xa9b4c0, r3Full('drum-shell', { rot: true, rep: [2, 1] }), { metalness: 0.35, roughness: 0.4 })); tank.rotation.z = Math.PI / 2; dg.add(tank);
  const hm = r3Mat(0xa9b4c0, r3Crop('drum-head', [0.012, 0.012, 0.988, 0.988]));
  [-1, 1].forEach(sd => { const c = r3Cap(1.4, 0.6, hm); c.rotation.z = -sd * Math.PI / 2; c.position.x = sd * 5; dg.add(c); const leg = new T.Mesh(new T.BoxGeometry(0.5, 10.5, 0.5), r3Metal()); leg.position.set(sd * 3.6, -5.6, 0); dg.add(leg); });
  const col = new T.Mesh(new T.CylinderGeometry(0.8, 0.8, 3, 24), r3Metal([2, 1])); col.position.set(-2, 2.4, 0); dg.add(col);
  dg.traverse(o => { if (o.isMesh) r3Tag(o, 'deaer', 'deaer'); }); r3Label('deaer', [0, 8.6, -30], () => 'Деаэратор');
  [-4, 0, 4].forEach((x, i) => {
    const g = new T.Group(); g.position.set(x, -4.1, -35); g.scale.setScalar(0.8); g.rotation.y = Math.PI / 2;
    const b = r3Pump(); b.traverse(o => { if (o.isMesh) r3Tag(o, 'pen', 'pen:' + i); }); g.add(b);
    const lm = new T.MeshStandardMaterial({ color: 0x22c55e, emissive: 0x22c55e, emissiveIntensity: 1 }); lm.userData.dyn = true; const lamp = new T.Mesh(new T.SphereGeometry(0.22, 12, 10), lm); lamp.position.set(0, 2.85, 0); g.add(lamp);
    scene.add(g); R3.objs.pens.push({ g, lamp, i });
    r3Label('pen:' + i, [x, -1.5, -35], () => `ПЭН-${i + 1} · ${RBG.S.fwPumps[i] ? 'работает' : 'резерв'}`);
    const fr = () => RBG.S.fwPumps[i] ? RBG.S.fw / Math.max(1, RBG.S.fwPumps.filter(Boolean).length) * 2 : 0;
    r3Pipe(scene, [[x, 4.3, -30], [x, -0.6, -30], [x, -0.6, -33.2], [x, -4.26, -33.2], [x, -4.26, -33.8]], { r: 0.2, mat: pipeM('feed'), info: 'feed', id: 'feed', med: 'feed', rate: fr });
    r3Pipe(scene, [[x, -4.26, -36.2], [x, -4.26, -37], [0, -4.26, -37], [0, 13.6, -37]], { r: 0.2, mat: pipeM('feed'), info: 'feed', id: 'feed', med: 'feed', rate: fr });
  });
  r3Label('reactor', [0, 6.6, 0], () => `Реактор · ${RBN(RBG.S.P)} МВт`);
  r3FlowInit(scene);
}

/* ---------- живой щит: стрелки приборов, картограмма, столбики и табло поверх картинки панели ---------- */
const R3GAUGE = [[154, 162], [391, 162], [629, 162], [1373, 162], [1609, 162], [1853, 162]];
function r3DeskTex(mat) {
  r3Img('desk-panel').then(im => {
    if (!im || !R3.ren) return; const T = window.THREE, cv = document.createElement('canvas'); cv.width = 2000; cv.height = 667;
    const c = cv.getContext('2d'); c.drawImage(im, 0, 0, 2000, 667);
    const base = document.createElement('canvas'); base.width = 2000; base.height = 667; base.getContext('2d').drawImage(cv, 0, 0);
    const px = c.getImageData(R3GAUGE[0][0] - 40, R3GAUGE[0][1] + 40, 1, 1).data, face = `rgb(${px[0]},${px[1]},${px[2]})`;
    const t = new T.CanvasTexture(cv); t.colorSpace = T.SRGBColorSpace; t.anisotropy = 8; mat.map = t; mat.color.set(0xffffff); mat.needsUpdate = true;
    R3.desk = { cv, c, base, t, face, at: 0 }; r3DeskDraw();
  });
}
function r3DeskDraw() {
  const D = R3.desk, G = RBG; if (!D || !G) return; const S = G.S, c = D.c, now = performance.now();
  c.drawImage(D.base, 0, 0);
  // приборы: мощность, период, ОЗР | давление, уровень, расход
  const per = isFinite(S.period) && S.period > 0 ? Math.max(0, Math.min(1, 1 - S.period / 120)) : 0;
  const vals = [Math.min(1.2, S.P) / 1.2, per, Math.min(60, RB.ozr(S)) / 60, (S.p - 5.5) / 3.5, (S.lvl + 900) / 1800, S.G / 1.4];
  R3GAUGE.forEach(([x, y], i) => {
    c.fillStyle = D.face; c.beginPath(); c.arc(x, y, 58, 0, Math.PI * 2); c.fill();
    const v = Math.max(0, Math.min(1, vals[i])), a = Math.PI * (0.75 + 1.5 * v), bad = (i === 1 && v > 0.6) || (i === 2 && vals[2] < 0.25) || (i === 3 && S.p > 7.6);
    c.strokeStyle = bad ? '#dc2626' : '#1f2937'; c.lineWidth = 7; c.lineCap = 'round'; c.beginPath(); c.moveTo(x, y); c.lineTo(x + Math.cos(a) * 62, y + Math.sin(a) * 62); c.stroke();
    c.fillStyle = '#1f2937'; c.beginPath(); c.arc(x, y, 10, 0, Math.PI * 2); c.fill();
  });
  // картограмма в круглом экране: 6 × 6 ячеек, цвет — мощность (поле прижато к низу → верх светлее)
  const P = Math.min(1.4, S.P);
  for (let r = 0; r < 6; r++) for (let k = 0; k < 6; k++) {
    const x = 871 + k * 45, y = 246 + r * 44.6, rad = Math.hypot(k - 2.5, r - 2.5) / 3.6, loc = P * (1.15 - rad * 0.5) * (1 + (S.axial - 0.3) * (r - 2.5) * 0.12);
    const h = Math.max(0, Math.min(1, loc / 1.3)); c.fillStyle = S.broken ? '#e11d48' : `hsl(${150 - h * 135},85%,${28 + h * 30}%)`; c.fillRect(x, y, 33, 33);
  }
  // столбики: ОЗР, ксенон | уровень, давление
  [[230, RB.ozr(S) / 60], [385, S.X / 2], [1565, (S.lvl + 900) / 1800], [1720, (S.p - 5.5) / 3.5]].forEach(([x, v], j) => {
    for (let s = 0; s < 10; s++) { const y = 542 - s * 25.6, on = s < Math.round(Math.max(0, Math.min(1, v)) * 10); c.fillStyle = on ? (s > 7 ? '#f59e0b' : j === 1 ? '#a855f7' : '#22c55e') : '#9ca3af'; c.fillRect(x, y, 51, 20); }
  });
  // табло: красные при тревоге
  const red = Object.keys(G.alarms || {}).some(k => G.alarms[k]) && Math.floor(now / 400) % 2;
  if (red || S.az) { c.fillStyle = 'rgba(225,29,72,.85)'; for (let j = 0; j < 6; j++) c.fillRect(783 + j * 75.5, 60, 50, 52); }
  D.t.needsUpdate = true;
}

/* ---------- сцены ---------- */
const R3Q = () => { try { return localStorage.getItem('fz-rb-q3') === 'low' ? 'low' : 'high'; } catch (e) { return 'high'; } };
const R3L = () => { try { return localStorage.getItem('fz-rb-lbl') !== '0'; } catch (e) { return true; } };
const R3VIEWS = {
  unit: { all: ['Обзор', [32, 24, 36], [0, 0, -8]], reactor: ['Реактор', [12, 10, 14], [0, 0, 0]], pumps: ['ГЦН', [-31, 4, 15], [-17, -3, 0]], drums: ['Барабаны', [0, 17, 17], [0, 8, 0]], tg: ['Турбины', [0, 7, -7], [0, -3, -24]], feed: ['Питание', [16, 7, -20], [0, 0, -32]] },
  core: { all: ['Обзор', [15, 9, 17], [0, 0.5, 0]], top: ['Сверху', [3, 20, 4], [0, 0, 0]], bottom: ['Низ зоны', [9, -3, 11], [0, -2.5, 0]] },
  desk: { all: ['Щит', [0, 2.5, 12], [0, -2.6, -0.5]], console: ['Пульт', [0, 3.5, 6], [0, -3.8, 0.3]], panel: ['Приборы', [0, -1.5, 7], [0, -2.9, -1.8]] },
};
function r3Build(kind) {
  const T = window.THREE, box = $('#rb-3dc'); if (!box) return;
  r3Dispose();
  const low = R3Q() === 'low';
  const ren = new T.WebGLRenderer({ antialias: !low, alpha: false }); ren.setPixelRatio(low ? 1 : Math.min(1.5, window.devicePixelRatio || 1));
  ren.setSize(box.clientWidth, box.clientHeight); ren.outputColorSpace = T.SRGBColorSpace; box.appendChild(ren.domElement);
  const lbl = document.createElement('div'); lbl.className = 'r3-lbls' + (R3L() ? '' : ' off'); box.appendChild(lbl);
  const tip = document.createElement('div'); tip.className = 'r3-tip'; tip.hidden = true; box.appendChild(tip);
  const dark = !isLight(), scene = new T.Scene(); scene.background = new T.Color(dark ? 0x0c1016 : 0xc3ccd8); scene.fog = new T.Fog(scene.background, 80, 210);
  const cam = new T.PerspectiveCamera(42, box.clientWidth / box.clientHeight, 0.1, 400);
  scene.add(new T.HemisphereLight(dark ? 0xc9d6ff : 0xffffff, dark ? 0x141a22 : 0xb8c2d0, dark ? 0.75 : 1.2));
  const sun = new T.DirectionalLight(dark ? 0xffe2b8 : 0xffffff, dark ? 1.1 : 1.6); sun.position.set(14, 22, 10); scene.add(sun);
  Object.assign(R3, { scene, cam, ren, kind, low, lblBox: lbl, tip, objs: { rods: [], pumps: [], tgs: [], drums: [], pens: [], eccsLamps: [] }, pick: [], parts: {}, flows: [], flowIM: null, labels: [], sel: null, hover: null, fly: null, fx: null, glow: {}, desk: null, mouse: null, last: performance.now(), tick: 0 });
  r3Room(scene, dark);
  const steel = r3Steel([4, 1]);
  // ---------- реактор ----------
  const reactor = new T.Group(); scene.add(reactor); R3.objs.reactor = reactor;
  const H = 7, Rr = 5.8, cut = kind === 'core';
  const gMat = new T.MeshStandardMaterial({ color: 0x3a3f46, roughness: 0.85 }); r3Tex('graphite', gMat, [1, 3]);
  const cells = [], step = 0.62;
  for (let x = -Rr; x <= Rr; x += step) for (let z = -Rr; z <= Rr; z += step) { if (Math.hypot(x, z) > Rr) continue; if (cut && x > 0 && z > 0) continue; cells.push([x, z]); }
  const gi = new T.InstancedMesh(new T.BoxGeometry(step * 0.96, H, step * 0.96), gMat, cells.length), m4 = new T.Matrix4();
  cells.forEach(([x, z], i) => { m4.makeTranslation(x, 0, z); gi.setMatrixAt(i, m4); }); gi.computeBoundingBox(); reactor.add(r3Tag(gi, 'graphite', 'reactor'));
  const chMat = new T.MeshStandardMaterial({ color: 0xc9d2dc, metalness: 0.5, roughness: 0.3, emissive: new T.Color(0xff7a2e), emissiveIntensity: 0.4 }); chMat.userData.dyn = true; r3Tex('channel', chMat); R3.objs.chMat = chMat;
  const faceCells = []; if (cut) for (let t = step * 0.8; t < Rr - 0.3; t += step) { faceCells.push([0.05, t]); faceCells.push([t, 0.05]); }
  const fuelCells = faceCells.filter((c, i) => i % 3 !== 1), rodCells = faceCells.filter((c, i) => i % 3 === 1);
  if (fuelCells.length) { const fi = new T.InstancedMesh(new T.CylinderGeometry(0.16, 0.16, H + 0.6, 10), chMat, fuelCells.length); fuelCells.forEach(([x, z], i) => { m4.makeTranslation(x, 0.3, z); fi.setMatrixAt(i, m4); }); fi.computeBoundingBox(); reactor.add(r3Tag(fi, 'fuel', 'reactor')); }
  const absMat = new T.MeshStandardMaterial({ color: 0x1d232b, roughness: 0.5, metalness: 0.3 }), dispMat = new T.MeshStandardMaterial({ color: 0x8c96a3, roughness: 0.7 }), watMat = new T.MeshStandardMaterial({ color: 0x38a9e8, transparent: true, opacity: 0.55, roughness: 0.1 });
  r3Tex('rod-absorber', absMat); r3Tex('rod-displacer', dispMat);
  const markM = { RR: new T.MeshStandardMaterial({ color: 0x64748b }), AR: new T.MeshStandardMaterial({ color: 0xf59e0b }), USP: new T.MeshStandardMaterial({ color: 0x8b5cf6 }) };
  rodCells.forEach(([x, z], i) => {
    const g = ['RR', 'RR', 'AR', 'RR', 'USP'][i % 5], grp = new T.Group(); grp.position.set(x, 0, z);
    const abs = new T.Mesh(new T.CylinderGeometry(0.2, 0.2, g === 'USP' ? 3.5 : 6.2, 12), absMat), dis = new T.Mesh(new T.CylinderGeometry(0.2, 0.2, 4.5, 12), dispMat), wat = new T.Mesh(new T.CylinderGeometry(0.19, 0.19, 1.25, 10), watMat);
    const mark = new T.Mesh(new T.CylinderGeometry(0.24, 0.24, 0.3, 12), markM[g]);
    grp.add(r3Tag(abs, 'rod', 'rod:' + g), r3Tag(dis, 'rod', 'rod:' + g), r3Tag(wat, 'water', 'rod:' + g), r3Tag(mark, 'rod', 'rod:' + g)); reactor.add(grp); R3.objs.rods.push({ g, grp, abs, dis, wat, mark });
  });
  if (fuelCells.length) { const n = fuelCells.length * 6, bi = new T.InstancedMesh(new T.SphereGeometry(0.07, 6, 6), new T.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.85 }), n); bi.userData.seed = Array.from({ length: n }, (_, k) => ({ c: fuelCells[k % fuelCells.length], y: Math.random(), s: 0.6 + Math.random() })); reactor.add(bi); R3.objs.bubbles = bi; }
  const topMat = new T.MeshStandardMaterial({ color: 0xb4bcc6, metalness: 0.5, roughness: 0.45, emissive: 0x000000 }); r3Tex('top', topMat); topMat.userData.dyn = true; R3.objs.topMat = topMat;
  const theta = cut ? Math.PI * 1.5 : Math.PI * 2, th0 = cut ? Math.PI : 0;
  const top = new T.Mesh(new T.CylinderGeometry(Rr + 0.6, Rr + 0.6, 0.9, 64, 1, false, th0, theta), [steel, topMat, steel]); top.position.y = H / 2 + 0.75; reactor.add(r3Tag(top, 'top', 'reactor')); R3.objs.top = top; R3.objs.topY = top.position.y;
  const bot = new T.Mesh(new T.CylinderGeometry(Rr + 0.6, Rr + 0.6, 0.7, 64, 1, false, th0, theta), steel); bot.position.y = -H / 2 - 0.6; reactor.add(bot);
  const ped = new T.Mesh(new T.CylinderGeometry(Rr - 1, Rr - 0.4, 1.8, 48), r3Metal([6, 1])); ped.position.y = -H / 2 - 1.85; reactor.add(ped);
  const shell = new T.Mesh(new T.CylinderGeometry(Rr + 0.45, Rr + 0.45, H, 64, 1, true, th0, theta), new T.MeshStandardMaterial({ color: 0x7d8794, metalness: 0.4, roughness: 0.5, side: T.DoubleSide, transparent: true, opacity: 0.35 })); reactor.add(shell);
  if (kind === 'unit') { r3Plant(scene); }
  else if (kind === 'desk') {
    reactor.visible = false; R3.pick = R3.pick.filter(m => !m.userData.id.startsWith('r')); delete R3.parts.reactor;
    const desk = r3Desk(); desk.position.set(0, -6.2, 0); scene.add(desk);
  } else { r3Label('reactor', [0, 6.4, 0], () => `Реактор · ${RBN(RBG.S.P)} МВт`); ['RR', 'AR', 'USP'].forEach((g, j) => { const r = R3.objs.rods.find(o => o.g === g); if (r) r3Label('rod:' + g, [r.grp.position.x, 5.6 + j * 0.01, r.grp.position.z], () => `${{ RR: 'РР', AR: 'АР', USP: 'УСП' }[g]} · ${(RBG.S.rods[g] * 100).toFixed(0)} %`); }); }
  const v = (R3VIEWS[kind] || R3VIEWS.core).all; cam.position.set(...v[1]);
  const ctl = new window.THREE_OrbitControls(cam, ren.domElement); ctl.enableDamping = true; ctl.target.set(...v[2]);
  ctl.maxDistance = kind === 'desk' ? 30 : 62; ctl.minDistance = kind === 'desk' ? 3 : 4; ctl.maxPolarAngle = Math.PI * 0.49; ctl.minPolarAngle = Math.PI * 0.08; R3.ctl = ctl;
  // наведение, щелчок
  let down = null;
  ren.domElement.addEventListener('pointerdown', e => { down = [e.clientX, e.clientY]; R3.drag = true; });
  ren.domElement.addEventListener('pointerup', e => { R3.drag = false; if (!down || Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 5) return; const o = r3PickAt(e.clientX, e.clientY);
    if (!o) return r3Select(null); const id = o.userData.id; if (id === 'az5') return r3Cmd(RBG.cover ? 'az' : 'cover'); r3Select(id); });
  ren.domElement.addEventListener('pointermove', e => { R3.mouse = [e.clientX, e.clientY]; });
  ren.domElement.addEventListener('pointerleave', () => { R3.mouse = null; R3.hover = null; tip.hidden = true; });
  lbl.addEventListener('click', e => { const l = e.target.closest('.r3-lbl'); if (l) r3Select(l.dataset.id); });
  r3Views(); r3Select(null);
  if (kind === 'desk') r3DeskTex(R3.objs.panelMat);
  r3Frame();
}
function r3PickAt(x, y) {
  const T = window.THREE, r = R3.ren.domElement.getBoundingClientRect(), rc = new T.Raycaster();
  rc.setFromCamera(new T.Vector2((x - r.left) / r.width * 2 - 1, -(y - r.top) / r.height * 2 + 1), R3.cam);
  const h = rc.intersectObjects(R3.pick, false)[0]; return h ? h.object : null;
}
// команда пульта из 3D: та же кнопка data-rb, что и на 2D-пульте
function r3Cmd(rb, v, g) { const b = document.createElement('button'); b.dataset.rb = rb; if (v != null) b.dataset.v = v; if (g) b.dataset.g = g; b.hidden = true; document.body.appendChild(b); b.click(); b.remove(); }
function r3Label(id, pos, text) { const T = window.THREE, el = document.createElement('div'); el.className = 'r3-lbl'; el.dataset.id = id; R3.lblBox.appendChild(el); R3.labels.push({ id, pos: new T.Vector3(...pos), text, el }); }
function r3Views() { const box = $('#r3-views'); if (!box) return; const V = R3VIEWS[R3.kind] || {}; box.innerHTML = Object.entries(V).map(([k, v]) => `<button class="btn line" data-rb="r3view" data-v="${k}">${v[0]}</button>`).join(''); }
function r3Preset(k) { const v = (R3VIEWS[R3.kind] || {})[k]; if (!v || !R3.cam) return; const T = window.THREE; R3.fly = { t: 0, d: 0.9, t0: R3.ctl.target.clone(), t1: new T.Vector3(...v[2]), p0: R3.cam.position.clone(), p1: new T.Vector3(...v[1]) }; }
function r3FlyTo(id) {
  const T = window.THREE, ms = R3.parts[id]; if (!ms || !ms.length) return;
  const b = new T.Box3(); ms.forEach(m => b.expandByObject(m)); if (b.isEmpty()) return;
  const c = b.getCenter(new T.Vector3()), sz = b.getSize(new T.Vector3()).length(); let dir = R3.cam.position.clone().sub(R3.ctl.target).normalize();
  // деталь в стороне от реактора: смотрим снаружи и сверху, чтобы трубы не загораживали
  const out = new T.Vector3(c.x, 0, c.z); if (out.length() > 4 && R3.kind === 'unit') dir = out.normalize().multiplyScalar(0.55).add(new T.Vector3(0, 0.75, 0.45)).normalize();
  const dist = Math.max(7, Math.min(34, sz * 1.7)); const p1 = c.clone().add(dir.multiplyScalar(dist)); p1.y = Math.max(p1.y, -4.5);
  R3.fly = { t: 0, d: 0.8, t0: R3.ctl.target.clone(), t1: c, p0: R3.cam.position.clone(), p1 };
}

/* ---------- карточка выбранной детали: живые цифры и команды ---------- */
const r3Row = (k, v, cls = '') => `<div class="r3-row ${cls}"><span>${k}</span><b>${v}</b></div>`;
const r3B = (rb, v, lbl, on, x = '') => `<button class="btn line ${on ? 'on' : ''}" data-rb="${rb}"${v != null ? ` data-v="${v}"` : ''} ${x}>${lbl}</button>`;
const r3Per = S => !isFinite(S.period) || Math.abs(S.period) > 999 ? '∞' : (S.period > 0 ? '+' : '') + S.period.toFixed(0) + ' с';
function r3RodsHtml() {
  const S = RBG.S, rod = (g, t) => `<div class="r3-rod"><span>${t}</span><i><s style="width:${(S.rods[g] * 100).toFixed(1)}%"></s></i><button class="btn line" data-rb="rod" data-g="${g}" data-v="-1" title="Вывести">▲</button><button class="btn line" data-rb="rod" data-g="${g}" data-v="1" title="Погрузить">▼</button></div>`;
  return rod('RR', 'РР') + rod('USP', 'УСП') + `<div class="r3-rod"><span>АР</span><i><s style="width:${(S.rods.AR * 100).toFixed(1)}%"></s></i>${S.ar.on ? r3B('arset', -0.025, '−') + r3B('arset', 0.025, '+') : `<button class="btn line" data-rb="rod" data-g="AR" data-v="-1">▲</button><button class="btn line" data-rb="rod" data-g="AR" data-v="1">▼</button>`}</div>`;
}
function r3Card(id) {
  const S = RBG.S, [k, n] = id.split(':'), i = +n, info = R3INFO[k] || R3INFO[{ reactor: 'graphite', rod: 'rod', drum: 'drum', pump: 'pump', tg: 'tg', az5: 'desk', desk: 'desk', cond: 'cond', steam: 'steam', down: 'down', press: 'press', pvk: 'pvk' }[k]] || ['Деталь', ''];
  const main = () => r3Row('Мощность', RBN(S.P) + ' МВт') + r3Row('Период', r3Per(S), S.period > 0 && S.period < 40 ? 'bad' : '') + r3Row('ОЗР', RB.ozr(S).toFixed(1) + ' ст.', RB.ozr(S) < 15 ? 'bad' : '');
  const C = {
    reactor: { t: 'Реактор РБМК-1000', live: () => main() + r3Row('Реактивность', (S.rho >= 0 ? '+' : '') + S.rho.toFixed(2) + ' β') + r3Row('Пар в каналах', (S.phi * 100).toFixed(0) + ' %') + r3Row('Ксенон', (S.X * 100).toFixed(0) + ' %') + r3Row('Поле к низу', (S.axial * 100).toFixed(0) + ' %'), btns: r3RodsHtml },
    rod: { t: { RR: 'Стержни РР — ручное регулирование', AR: 'Стержни АР — автоматический регулятор', USP: 'Стержни УСП — укороченные, снизу' }[n], live: () => r3Row('Погружение', (S.rods[n] * 100).toFixed(1) + ' %') + main(), btns: r3RodsHtml },
    pump: { t: `ГЦН-${i + 1}`, live: () => { const q = S.pumps[i]; return r3Row('Состояние', q.on ? (q.cav > 0.2 ? 'кавитация' : 'работает') : q.spin > 0.05 ? 'выбег' : 'резерв', q.cav > 0.2 ? 'bad' : '') + r3Row('Расход', (q.spin * 8).toFixed(1) + ' тыс. м³/ч') + r3Row('Вибрация', q.vib.toFixed(0) + ' %', q.vib > 60 ? 'bad' : '') + r3Row('Всего по контуру', Math.round(S.G * 48) + ' тыс. м³/ч'); }, btns: () => r3B('pump', i, S.pumps[i].on ? 'Остановить насос' : 'Пустить насос', S.pumps[i].on) },
    drum: { t: `Барабан-сепаратор БС-${i + 1}`, live: () => r3Row('Давление', S.p.toFixed(2) + ' МПа', S.p > 7.4 || S.p < 6.6 ? 'bad' : '') + r3Row('Уровень', (S.lvl > 0 ? '+' : '') + S.lvl.toFixed(0) + ' мм', Math.abs(S.lvl) > 300 ? 'bad' : '') + r3Row('Пар на турбины', Math.round(r3Steam() * 1600) + ' МВт'), btns: () => r3B('bru', null, S.bru > 0 ? 'БРУ-К: открыт' : 'БРУ-К: закрыт', S.bru > 0) + r3B('fwauto', null, S.fwAuto ? 'Питание: авто' : 'Питание: ручн.', S.fwAuto) + S.fwPumps.map((on, j) => r3B('pen', j, 'ПЭН-' + (j + 1), on)).join('') },
    tg: { t: `Турбогенератор ТГ-${i + 7}`, live: () => r3Row('Состояние', S.tg[i].on ? 'в сети' : 'отключён') + r3Row('Нагрузка', Math.round(Math.max(0, S.tg[i].load) * 1000) + ' МВт') + r3Row('Давление пара', S.p.toFixed(2) + ' МПа'), btns: () => r3B('tg', i, S.tg[i].on ? 'Отключить ТГ' : 'Включить в сеть', S.tg[i].on) + r3B('tgauto', null, S.tgAuto ? 'Регулятор ТГ: авто' : 'Регулятор ТГ: ручн.', S.tgAuto) },
    pen: { t: `Питательный насос ПЭН-${i + 1}`, live: () => r3Row('Состояние', S.fwPumps[i] ? 'работает' : 'резерв') + r3Row('Подача воды', Math.round(S.fw * 100) + ' % от номинала') + r3Row('Уровень в БС', (S.lvl > 0 ? '+' : '') + S.lvl.toFixed(0) + ' мм', Math.abs(S.lvl) > 300 ? 'bad' : ''), btns: () => r3B('pen', i, S.fwPumps[i] ? 'Отключить' : 'Включить', S.fwPumps[i]) + r3B('fwauto', null, S.fwAuto ? 'Питание: авто' : 'Питание: ручн.', S.fwAuto) },
    deaer: { live: () => r3Row('Подача воды', Math.round(S.fw * 100) + ' %') + r3Row('Работают ПЭН', S.fwPumps.filter(Boolean).length + ' из 3'), btns: () => S.fwPumps.map((on, j) => r3B('pen', j, 'ПЭН-' + (j + 1), on)).join('') + r3B('fwauto', null, S.fwAuto ? 'Питание: авто' : 'Питание: ручн.', S.fwAuto) },
    eccs: { live: () => r3Row('Состояние', S.eccs ? 'в работе' : 'отключена', S.eccs ? '' : 'bad'), btns: () => r3B('eccs', null, S.eccs ? 'Отключить САОР' : 'Ввести САОР', S.eccs) },
    bru: { live: () => r3Row('Клапан', S.bru > 0 ? 'открыт' : 'закрыт') + r3Row('Давление в БС', S.p.toFixed(2) + ' МПа', S.p > 7.4 ? 'bad' : ''), btns: () => r3B('bru', null, S.bru > 0 ? 'Закрыть БРУ-К' : 'Открыть БРУ-К', S.bru > 0) },
    cond: { t: `Конденсатор ТГ-${i + 7}`, live: () => r3Row('Пар из турбины', S.tg[i].on ? Math.round(r3Steam() * 800) + ' МВт' : 'нет') },
    desk: { live: main, btns: r3RodsHtml }, console: { live: main, btns: () => r3RodsHtml() + r3B('ar', null, S.ar.on ? 'АР включён' : 'Включить АР', S.ar.on) },
    az5: { t: 'Кнопка АЗ-5', live: () => r3Row('Крышка', RBG.cover ? 'открыта' : 'закрыта') + r3Row('АЗ-5', S.az ? 'сработала' : 'не нажата', S.az ? 'bad' : ''), btns: () => r3B('cover', null, RBG.cover ? 'Закрыть крышку' : 'Открыть крышку') + (RBG.cover ? r3B('az', null, 'Нажать АЗ-5', false, 'style="background:#dc2626;color:#fff;border-color:#dc2626"') : '') },
    down: { live: () => r3Row('Расход стороны', Math.round(r3SideFlow(i) * 24) + ' тыс. м³/ч') }, press: { live: () => r3Row('Расход стороны', Math.round(r3SideFlow(i) * 24) + ' тыс. м³/ч') }, pvk: { live: () => r3Row('Пар в смеси', (S.phi * 100).toFixed(0) + ' %') },
    steam: { t: `Паропровод к ТГ-${i + 7}`, live: () => r3Row('Пар', S.tg[i].on ? Math.round(r3Steam() * 800) + ' МВт' : 'нет — ТГ отключён') }, feed: { live: () => r3Row('Подача', Math.round(S.fw * 100) + ' %') }, condl: { live: () => r3Row('Конденсат', Math.round(S.tg.reduce((a, t) => a + (t.on ? Math.max(0, t.load) : 0), 0) * 100) + ' %') },
  }[k] || { live: () => '' };
  return { t: C.t || info[0], d: info[1], live: C.live, btns: C.btns };
}
function r3Hint0() { return `<p class="mute small">Наведите на деталь — подсветится; щёлкните — откроется карточка с показаниями и командами. Подписи тоже нажимаются.</p>`; }
function r3Select(id) {
  R3.sel = id || null; const box = $('#rb-3dinfo'); if (!box) return;
  if (!id) { box.innerHTML = r3Hint0(); R3.card = null; return; }
  const c = r3Card(id); R3.card = c; R3.btnHtml = c.btns ? c.btns() : '';
  box.innerHTML = `<div class="r3-card"><div class="r3-ch"><b>${c.t}</b><button class="r3-x" data-rb="r3sel" title="Закрыть">×</button></div><p class="mute small">${c.d}</p><div class="r3-live" id="r3-live">${c.live()}</div>${c.btns ? `<div class="r3-btns" id="r3-btns">${R3.btnHtml}</div>` : ''}</div>`;
  r3FlyTo(id);
}
function r3CardTick() {
  if (!R3.card) return; const l = $('#r3-live'); if (l) { const h = R3.card.live(); if (l.innerHTML !== h) l.innerHTML = h; }
  const b = $('#r3-btns'); if (b && R3.card.btns && !RBG.btnRod) { const h = R3.card.btns(); if (h !== R3.btnHtml) { R3.btnHtml = h; b.innerHTML = h; } }
}
function r3HudTick() {
  const S = RBG.S, set = (id, v) => { const e = document.getElementById(id); if (e && e.textContent !== v) e.textContent = v; };
  set('rb-p3', S.p.toFixed(2)); set('rb-l3', (S.lvl > 0 ? '+' : '') + S.lvl.toFixed(0)); set('rb-g3', String(Math.round(S.G * 48)));
  const rr = $('#r3-hudrods'); if (rr && !RBG.btnRod) { const h = r3RodsHtml() + `<div class="r3-rowb">${r3B('ar', null, S.ar.on ? 'АР включён' : 'Включить АР', S.ar.on)}<span class="mute small">${S.ar.on ? 'уставка ' + RBN(S.ar.set) + ' МВт' : 'ручное'}</span></div>`; if (rr._h !== h) { rr._h = h; rr.innerHTML = h; } }
}

/* ---------- подсветка: выбранная деталь, под курсором, подсказка ---------- */
function r3GlowSet(id, col, k) {
  (R3.parts[id] || []).forEach(m => (Array.isArray(m.material) ? m.material : [m.material]).forEach(mt => {
    if (!mt.emissive || mt.userData.dyn) return;
    if (col != null) { if (!mt.userData.e0) mt.userData.e0 = [mt.emissive.getHex(), mt.emissiveIntensity]; mt.emissive.setHex(col); mt.emissiveIntensity = k; }
    else if (mt.userData.e0) { mt.emissive.setHex(mt.userData.e0[0]); mt.emissiveIntensity = mt.userData.e0[1]; delete mt.userData.e0; }
  }));
}
function r3Glow(now) {
  const want = {}; if (R3.hint && R3.parts[R3.hint]) want[R3.hint] = [0xf59e0b, 0.15 + 0.25 * (0.5 + 0.5 * Math.sin(now / 180))];
  if (R3.hover) want[R3.hover] = [0x60a5fa, 0.3]; if (R3.sel) want[R3.sel] = [0xff7a2e, 0.32];
  for (const id in R3.glow) if (!want[id]) { r3GlowSet(id, null); delete R3.glow[id]; }
  for (const id in want) { const [c, k] = want[id], g = R3.glow[id]; if (!g || g[0] !== c || Math.abs(g[1] - k) > 0.01) { if (g && g[0] !== c) r3GlowSet(id, null); r3GlowSet(id, c, k); R3.glow[id] = [c, k]; } }
}

/* ---------- авария: визуализация по видам разрушения ---------- */
const R3FX = {
  reactor: [[0, 'АЗ-5: стержни пошли вниз. Графитовые вытеснители выдавили воду из низа зоны — там реактивность выросла.'], [1.6, 'Разгон на мгновенных нейтронах: за секунды мощность выросла в десятки раз.'], [3, 'Топливо разрушается, каналы рвутся: пар заполняет реакторное пространство.'], [4.2, 'Паровой взрыв: давление пара поднимает верхнюю плиту реактора.'], [5.6, 'Второй взрыв: обломки графита и топлива выброшены из зоны.'], [7, 'Горит графит. Реактор разрушен.']],
  drum: [[0, 'Давление в барабанах-сепараторах выше допустимого: клапаны не справляются.'], [1.8, 'Металл барабана не выдерживает.'], [2.6, 'Разрыв барабана-сепаратора: пар под давлением 10 МПа вырывается в помещение.'], [5, 'Контур разгерметизирован. Реактор нужно глушить и охлаждать через САОР.']],
  dryout: [[0, 'Уровень в барабанах упал: вода почти не поступает в каналы.'], [2, 'Каналы без воды: оболочки твэлов перегреваются.'], [4.5, 'Твэлы разрушаются — в контур выходят продукты деления.']],
};
const R3FXDUR = { reactor: 11, drum: 8, dryout: 8 };
function r3Boom(kind) {
  const T = window.THREE; if (!R3.scene) return; const low = R3.low, sc = R3.scene;
  const mk = (geo, mat, n) => { const im = new T.InstancedMesh(geo, mat, n); im.frustumCulled = false; const z = new T.Matrix4().makeScale(0, 0, 0); for (let i = 0; i < n; i++) im.setMatrixAt(i, z); sc.add(im); return { im, n, p: [] }; };
  const N = low ? 0.5 : 1;
  const fx = { kind, t: 0, cap: -1, done: false, light: new T.PointLight(0xff7a2e, 0, 80, 1.5),
    steam: mk(new T.SphereGeometry(1, 10, 8), new T.MeshBasicMaterial({ color: 0xf1f5f9, transparent: true, opacity: 0.16, depthWrite: false }), Math.round(320 * N)),
    smoke: mk(new T.SphereGeometry(1, 10, 8), new T.MeshBasicMaterial({ color: 0x2b2f36, transparent: true, opacity: 0.28, depthWrite: false }), Math.round(240 * N)),
    debris: mk(new T.BoxGeometry(1, 1, 1), new T.MeshStandardMaterial({ color: 0x2d3137, roughness: 0.9 }), Math.round(110 * N)),
    ember: mk(new T.SphereGeometry(1, 6, 5), new T.MeshBasicMaterial({ color: 0xff8a3d }), Math.round(140 * N)) };
  let o = new T.Vector3(0, 4.6, 0);
  if (kind === 'drum') { const d = R3.objs.drums[0]; if (d) o = d.g.position.clone(); fx.drum = d; }
  fx.o = o; fx.light.position.copy(o).add(new T.Vector3(0, 2, 0)); sc.add(fx.light); R3.fx = fx;
}
function r3Spawn(sys, n, f) { for (let k = 0; k < n; k++) { if (sys.p.length >= sys.n) sys.p.shift(); sys.p.push(f()); } }
function r3FxStep(dt) {
  const fx = R3.fx; if (!fx || !R3.scene) return; const T = window.THREE, t0 = fx.t; fx.t += dt; const t = fx.t, o = fx.o, R = Math.random, cross = a => t0 < a && t >= a;
  const caps = R3FX[fx.kind]; let ci = -1; caps.forEach(([at], j) => { if (t >= at) ci = j; }); if (ci !== fx.cap) { fx.cap = ci; rbCrashCap(caps[ci][1]); }
  const rnd = (a, b) => a + R() * (b - a), v3 = (x, y, z) => new T.Vector3(x, y, z);
  const steamP = (pos, vel, life, s0, s1) => ({ pos, vel, life, age: 0, s0, s1 });
  if (fx.kind === 'reactor') {
    const ch = R3.objs.chMat, tm = R3.objs.topMat, heat = Math.max(0, Math.min(1, (t - 1.2) / 2));
    if (ch) { ch.emissive.setRGB(1, 0.55 + 0.45 * heat, 0.25 + 0.75 * heat); ch.emissiveIntensity = 0.6 + heat * 3; }
    if (tm) { tm.emissive.setRGB(1, 0.35, 0.1); tm.emissiveIntensity = heat * 0.5; }
    if (t > 3 && t < 4.4) r3Spawn(fx.steam, 5, () => { const a = rnd(0, 6.28), r = rnd(1, 6); return steamP(v3(o.x + Math.cos(a) * r, o.y, o.z + Math.sin(a) * r), v3(rnd(-1, 1), rnd(3, 7), rnd(-1, 1)), rnd(1.5, 2.5), 0.5, 2.5); });
    if (cross(4.2)) { rbSnd.boom && rbSnd.boom(0.8); R3.shake = 0.7; fx.flash = 1; r3Spawn(fx.steam, 90, () => steamP(o.clone(), v3(rnd(-9, 9), rnd(4, 16), rnd(-9, 9)), rnd(2, 3.5), 1, 5)); r3Spawn(fx.debris, 25, () => ({ pos: o.clone().add(v3(rnd(-4, 4), 0, rnd(-4, 4))), vel: v3(rnd(-8, 8), rnd(8, 16), rnd(-8, 8)), rot: v3(R(), R(), R()), w: v3(rnd(-4, 4), rnd(-4, 4), rnd(-4, 4)), s: rnd(0.4, 0.9), life: 99, age: 0 })); }
    if (cross(5.6)) { rbSnd.boom && rbSnd.boom(1); R3.shake = 1.1; fx.flash = 1.6; r3Spawn(fx.debris, 70, () => ({ pos: o.clone().add(v3(rnd(-3, 3), 0, rnd(-3, 3))), vel: v3(rnd(-14, 14), rnd(10, 24), rnd(-14, 14)), rot: v3(R(), R(), R()), w: v3(rnd(-6, 6), rnd(-6, 6), rnd(-6, 6)), s: rnd(0.3, 1), life: 99, age: 0 })); r3Spawn(fx.ember, 90, () => ({ pos: o.clone(), vel: v3(rnd(-12, 12), rnd(6, 22), rnd(-12, 12)), life: rnd(3, 7), age: 0, s: rnd(0.08, 0.2) })); r3Spawn(fx.steam, 80, () => steamP(o.clone(), v3(rnd(-12, 12), rnd(6, 20), rnd(-12, 12)), rnd(2, 3.5), 1.5, 6)); }
    if (t > 5.8) r3Spawn(fx.smoke, R() < 0.5 ? 2 : 1, () => steamP(o.clone().add(v3(rnd(-2, 2), 1, rnd(-2, 2))), v3(rnd(-0.4, 0.4), rnd(1.8, 3), rnd(-0.4, 0.4)), rnd(4, 7), 1, 6));
    if (t > 6.2) r3Spawn(fx.ember, R() < 0.4 ? 1 : 0, () => ({ pos: o.clone().add(v3(rnd(-3, 3), 0, rnd(-3, 3))), vel: v3(rnd(-1, 1), rnd(2, 5), rnd(-1, 1)), life: rnd(1.5, 3), age: 0, s: rnd(0.06, 0.14) }));
    const top = R3.objs.top; if (top && t > 4.2) { const u = t - 4.2; top.position.y = R3.objs.topY + 11 * (1 - Math.exp(-u * 1.6)) - (u > 1.4 ? (u - 1.4) * 0 : 0); top.rotation.x = Math.min(1.35, Math.max(0, u - 0.4) * 0.9); top.rotation.z = Math.min(0.3, Math.max(0, u - 0.8) * 0.2); }
    fx.light.intensity = (fx.flash || 0) * 120 + (t > 5.8 ? 30 + 15 * Math.sin(t * 13) * Math.sin(t * 7) : heat * 20); fx.flash = Math.max(0, (fx.flash || 0) - dt * 2.5);
  } else if (fx.kind === 'drum') {
    const d = fx.drum && fx.drum.g;
    if (t > 1.2 && t < 2.6) r3Spawn(fx.steam, 1, () => steamP(o.clone().add(v3(rnd(-5, 5), 1.2, rnd(-0.5, 0.5))), v3(rnd(-0.5, 0.5), rnd(2, 4), rnd(-0.5, 0.5)), rnd(1, 2), 0.3, 1.5));
    if (cross(2.6)) { rbSnd.boom && rbSnd.boom(0.7); R3.shake = 0.6; fx.flash = 0.6; r3Spawn(fx.steam, 90, () => steamP(o.clone().add(v3(rnd(-5, 5), 0, 0)), v3(rnd(-10, 10), rnd(-2, 12), rnd(-10, 10)), rnd(2.5, 4.5), 1, 7)); r3Spawn(fx.debris, 20, () => ({ pos: o.clone(), vel: v3(rnd(-9, 9), rnd(3, 12), rnd(-9, 9)), rot: v3(R(), R(), R()), w: v3(rnd(-5, 5), rnd(-5, 5), rnd(-5, 5)), s: rnd(0.2, 0.6), life: 99, age: 0 })); fx.debris.im.material.color.set(0x8a96a6); }
    if (t > 2.6) { r3Spawn(fx.steam, R() < 0.7 ? 1 : 0, () => steamP(o.clone(), v3(rnd(-5, 5), rnd(2, 8), rnd(-5, 5)), rnd(2, 3), 1, 5)); if (d) { const u = t - 2.6; d.position.y = 8.2 + Math.min(1.2, u * 3) - Math.max(0, u - 0.4) * 1.5; d.rotation.z = Math.min(0.5, u * 0.6); d.position.y = Math.max(d.position.y, -4.8); } }
    fx.light.color.set(0xffffff); fx.light.intensity = (fx.flash || 0) * 60; fx.flash = Math.max(0, (fx.flash || 0) - dt * 2);
  } else {
    const ch = R3.objs.chMat, u = Math.max(0, Math.min(1, t / 3)); if (ch) { ch.emissive.setRGB(1, 0.2 * (1 - u), 0.05); ch.emissiveIntensity = 0.6 + u * 2.4; }
    if (t > 2) r3Spawn(fx.smoke, R() < 0.35 ? 1 : 0, () => steamP(o.clone().add(v3(rnd(-4, 4), 0.5, rnd(-4, 4))), v3(rnd(-0.3, 0.3), rnd(1, 2), rnd(-0.3, 0.3)), rnd(3, 5), 0.6, 3));
    fx.light.color.set(0xff3b1f); fx.light.intensity = u * 25;
  }
  // частицы
  const m4 = new T.Matrix4(), q = new T.Quaternion(), e = new T.Euler(), sc = new T.Vector3(), Y0 = -6.1;
  const soft = (sys, up) => { sys.p = sys.p.filter(p => (p.age += dt) < p.life); sys.p.forEach((p, j) => { p.pos.addScaledVector(p.vel, dt); p.vel.multiplyScalar(1 - 0.9 * dt); p.vel.y += up * dt; const s = p.s0 + (p.s1 - p.s0) * (p.age / p.life); m4.makeScale(s, s, s); m4.setPosition(p.pos); sys.im.setMatrixAt(j, m4); }); for (let j = sys.p.length; j < sys.n; j++) sys.im.setMatrixAt(j, m4.makeScale(0, 0, 0)); sys.im.instanceMatrix.needsUpdate = true; };
  soft(fx.steam, 0.6); soft(fx.smoke, 0.4);
  [fx.debris, fx.ember].forEach((sys, w) => { sys.p = sys.p.filter(p => (p.age += dt) < p.life); sys.p.forEach((p, j) => {
    p.vel.y -= 9.8 * dt; p.pos.addScaledVector(p.vel, dt);
    if (p.pos.y < Y0 + (p.s || 0.1) / 2) { p.pos.y = Y0 + (p.s || 0.1) / 2; p.vel.y *= -0.25; p.vel.x *= 0.6; p.vel.z *= 0.6; if (p.w) p.w.multiplyScalar(0.6); }
    if (p.rot) { p.rot.addScaledVector(p.w, dt); q.setFromEuler(e.set(p.rot.x, p.rot.y, p.rot.z)); } else q.identity();
    const s = w ? p.s * (1 - p.age / p.life * 0.6) : p.s; m4.compose(p.pos, q, sc.set(s, s, s)); sys.im.setMatrixAt(j, m4); });
    for (let j = sys.p.length; j < sys.n; j++) sys.im.setMatrixAt(j, m4.makeScale(0, 0, 0)); sys.im.instanceMatrix.needsUpdate = true; });
  if (!fx.done && t > R3FXDUR[fx.kind]) { fx.done = true; rbCrashFxDone(); }
}

/* ---------- каждый кадр ---------- */
function r3Frame() {
  if (!R3.ren || !RBG) return; const T = window.THREE, S = RBG.S, H = 7, now = performance.now(), dt = Math.min(0.1, (now - R3.last) / 1000); R3.last = now;
  if (R3.objs.chMat && !R3.fx) { const v = Math.max(0, Math.min(1, Math.log10(1 + S.P * 60) / Math.log10(1 + 1.4 * 60))); R3.objs.chMat.emissive.setHSL(0.6 - 0.53 * v, 0.9, 0.5); R3.objs.chMat.emissiveIntensity = 0.15 + v * 1.4; }
  R3.objs.rods.forEach(r => {
    const ins = S.rods[r.g], absL = r.g === 'USP' ? 3.5 : 6.2;
    if (r.g === 'USP') { r.abs.position.y = -H / 2 - absL / 2 + ins * absL; r.dis.visible = r.wat.visible = false; r.mark.position.y = r.abs.position.y - absL / 2 - 0.15; return; }
    const tipY = H / 2 + 0.3 - ins * (H + 0.3); r.abs.position.y = tipY + absL / 2; r.dis.position.y = tipY - 0.25 - 4.5 / 2; r.mark.position.y = tipY + absL + 0.15;
    const wb = r.dis.position.y - 4.5 / 2; r.wat.visible = wb > -H / 2 + 0.05; const wl = Math.max(0.05, Math.min(1.25, wb + H / 2)); r.wat.scale.y = wl / 1.25; r.wat.position.y = -H / 2 + wl / 2;
  });
  const bi = R3.objs.bubbles; if (bi) { const m = new T.Matrix4(), n = bi.count, show = Math.round(n * Math.min(1, S.phi * 1.6 + (S.P > 0.01 ? 0.05 : 0)));
    bi.userData.seed.forEach((q, i) => { q.y += 0.004 * q.s * (0.3 + S.G); if (q.y > 1) q.y = 0; const y = -H / 2 + q.y * H, k = i < show ? 1 : 0.0001; m.makeScale(k, k, k); m.setPosition(q.c[0] + Math.sin(i) * 0.05, y, q.c[1] + Math.cos(i) * 0.05); bi.setMatrixAt(i, m); });
    bi.instanceMatrix.needsUpdate = true; }
  R3.objs.pumps.forEach(p => { const q = S.pumps[p.idx]; p.lamp.material.color.set(q.on ? (q.vib > 60 || q.cav > 0.2 ? 0xf59e0b : 0x22c55e) : q.spin > 0.05 ? 0x38bdf8 : 0x64748b); p.lamp.material.emissive.copy(p.lamp.material.color); p.body.position.x = q.on && q.vib > 60 ? Math.sin(now / 30) * 0.04 : 0; });
  R3.objs.pens.forEach(p => { const c = S.fwPumps[p.i] ? 0x22c55e : 0x64748b; p.lamp.material.color.set(c); p.lamp.material.emissive.set(c); });
  R3.objs.eccsLamps.forEach(l => { const c = S.eccs ? 0x22c55e : 0xdc2626; l.material.color.set(c); l.material.emissive.set(c); });
  const az = R3.objs.az; if (az) { az.btn.position.y = S.az ? 0.12 : 0.2; az.btn.material.emissiveIntensity = S.az ? 0.9 + 0.5 * Math.sin(now / 160) : 0.3; az.hinge.rotation.x += ((RBG.cover ? -1.9 : 0) - az.hinge.rotation.x) * Math.min(1, dt * 10); }
  r3Flows(dt); r3FxStep(dt);
  // полёт камеры к детали
  if (R3.fly) { const f = R3.fly; f.t += dt; const k = Math.min(1, f.t / f.d), e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2; R3.ctl.target.lerpVectors(f.t0, f.t1, e); R3.cam.position.lerpVectors(f.p0, f.p1, e); if (k >= 1) R3.fly = null; }
  R3.ctl.update();
  // наведение (не чаще 20 раз в секунду)
  if (R3.mouse && !R3.drag && now - (R3.hoverAt || 0) > 50) { R3.hoverAt = now; const o = r3PickAt(R3.mouse[0], R3.mouse[1]), id = o ? o.userData.id : null; R3.hover = id; R3.ren.domElement.style.cursor = id ? 'pointer' : '';
    const tip = R3.tip; if (id) { const r = R3.ren.domElement.getBoundingClientRect(), c = r3Card(id); tip.innerHTML = `<b>${c.t}</b>`; tip.style.transform = `translate(${R3.mouse[0] - r.left + 14}px,${R3.mouse[1] - r.top + 12}px)`; tip.hidden = false; } else tip.hidden = true; }
  r3Glow(now);
  // подписи
  if (R3.labels.length && !R3.lblBox.classList.contains('off')) { const W = R3.ren.domElement.clientWidth, Hh = R3.ren.domElement.clientHeight, v = new T.Vector3(), upd = now - (R3.lblAt || 0) > 250; if (upd) R3.lblAt = now;
    R3.labels.forEach(l => { v.copy(l.pos).project(R3.cam); const vis = v.z < 1 && Math.abs(v.x) < 1.05 && Math.abs(v.y) < 1.05; l.el.style.display = vis ? '' : 'none'; if (!vis) return; l.el.style.transform = `translate(${((v.x + 1) / 2 * W).toFixed(0)}px,${((1 - v.y) / 2 * Hh).toFixed(0)}px) translate(-50%,-100%)`; if (upd) { const s = l.text(); if (l.el.textContent !== s) l.el.textContent = s; } l.el.classList.toggle('sel', l.id === R3.sel); }); }
  if (now - (R3.tick || 0) > 250) { R3.tick = now; r3CardTick(); r3HudTick(); }
  if (R3.desk && now - R3.desk.at > 200) { R3.desk.at = now; r3DeskDraw(); }
  // толчок при взрыве
  let sh = null; if (R3.shake > 0.01) { sh = new T.Vector3((Math.random() - 0.5) * R3.shake, (Math.random() - 0.5) * R3.shake, (Math.random() - 0.5) * R3.shake); R3.cam.position.add(sh); R3.shake *= Math.pow(0.08, dt); }
  R3.ren.render(R3.scene, R3.cam); if (sh) R3.cam.position.sub(sh);
}
function r3Resize() { const box = $('#rb-3dc'); if (!R3.ren || !box) return; R3.ren.setSize(box.clientWidth, box.clientHeight); R3.cam.aspect = box.clientWidth / box.clientHeight; R3.cam.updateProjectionMatrix(); }
window.addEventListener('resize', () => { if (RBG && RBG.view === '3d') r3Resize(); });
async function r3Show(kind) {
  if (!r3Supported()) { toast('3D недоступно на этом компьютере (видеокарта не поддерживает WebGL). Работает 2D-пульт.', 'bad'); RBG.view = '2d'; rbView(); return false; }
  const info = $('#rb-3dinfo'); if (info) info.innerHTML = '<p class="mute">Загрузка 3D…</p>';
  await r3Load(); if (!R3.ok) { toast('Не удалось загрузить 3D', 'bad'); RBG.view = '2d'; rbView(); return false; }
  if (!RBG || RBG.view !== '3d') return false;
  r3Build(kind || R3.kind || 'unit'); document.querySelectorAll('.rb-3dsc .btn').forEach(x => x.classList.toggle('on', x.dataset.v === R3.kind));
  if (RBG.crash && (!RBG.done || RBG.replay)) r3Boom(RBG.crash.kind);
  return true;
}
function r3Dispose() { if (R3.ren) { R3.ren.dispose(); R3.ren.domElement.remove(); R3.ren = null; } if (R3.lblBox) { R3.lblBox.remove(); R3.lblBox = null; } if (R3.tip) { R3.tip.remove(); R3.tip = null; } R3.fx = null; R3.desk = null; R3.card = null; R3.scene = null; }
function r3Hide() { r3Dispose(); }
const r3LblOn = () => R3L();
