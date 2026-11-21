/* =====================================================================
   «Физпрактикум» для Android и iPhone — оболочка под телефон.
   Сама работа (модель установки, вопросы, расчёты, проверки, действия data-l3/data-k3, отчёт) —
   fizika2/src/lw3-core.js, тот же файл, что на сайте и в программе для Windows/Linux.
   Файл работы (.lw3) и подпись — result.js, тоже общие: преподаватель проверяет работы с телефона
   в своей программе так же, как с компьютера.
   Нативное (Capacitor): отправка файла (Filesystem + Share), печать / PDF (свой плагин Printer),
   кнопка «Назад» (App). В обычном браузере то же работает через скачивание и window.print().
   ===================================================================== */
const NATIVE = !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
// iPhone / iPad: веб-приложение с экрана «Домой» (сборка build_ios.py, флаг PWA). Файлы — через меню «Поделиться» iOS.
const IOS = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const STANDALONE = !!((window.matchMedia && matchMedia('(display-mode: standalone)').matches) || navigator.standalone);
if (typeof PWA !== 'undefined' && PWA && !NATIVE && 'serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === '127.0.0.1' || location.hostname === 'localhost'))
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
const PLUG = {};
// доступ к нативным плагинам — через capacitor.js (@capacitor/core, встроен в страницу при сборке).
// Любая ошибка здесь не должна мешать запуску: без плагина приложение работает, просто без этой функции.
function plug(n) {
  if (!NATIVE) return null;
  if (PLUG[n]) return PLUG[n];
  try {
    const X = window.capacitorExports || {};
    if (n === 'SystemBars' && X.SystemBars) return (PLUG[n] = X.SystemBars);
    const reg = X.registerPlugin || (window.Capacitor && window.Capacitor.registerPlugin);
    return reg ? (PLUG[n] = reg(n)) : null;
  } catch (e) { return null; }
}
const ui = { main: $('#main'), bar: $('#bar'), dock: $('#dock') };
let SCREEN = 'home';          // home | work
let PROFILE = null;
let AQ = 0, CQ = 0, CTAB = 'concl', ZOOM = true;   // вопрос допуска / защиты, вкладка выводов, лупа крупно
const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} },
  del(k) { try { localStorage.removeItem(k); } catch (e) {} }
};

/* ---------- то, чего ядро ждёт от оболочки ---------- */
function toast(html, kind = '') {
  const box = $('#toasts'); while (box.children.length >= 2) box.firstChild.remove();
  const t = document.createElement('div'); t.className = 'toast ' + kind; t.innerHTML = html; box.appendChild(t);
  setTimeout(() => t.remove(), kind === 'bad' ? 4200 : 3000);
}
function addXP() { toast(`${ic('award')} Работа защищена! Отправь файл преподавателю на шаге «Отчёт».`); }
function render() {
  if (SCREEN === 'home' || !PROFILE) return vHome();
  if (SCREEN === 'labs') return mApp();
  if (SCREEN === 'test') return mTest();
  if (LAB !== 3) return mWorkLab();
  vWork();
}

/* ---------- тема ---------- */
const isLight = () => document.documentElement.dataset.theme !== 'dark';
function setTheme(t) { document.documentElement.dataset.theme = t; try { localStorage.setItem('lw3m-theme', t); } catch (e) {} barStyle(); sceneTheme(); render(); }
function barStyle() { try { const p = plug('SystemBars'); if (p) p.setStyle({ style: isLight() ? 'LIGHT' : 'DARK' }).catch(() => {}); } catch (e) {} }   // значки строки состояния: тёмные на светлой теме
barStyle();
const BG = { dark: null, light: null };
const BG2 = { dark: null, light: null };
function sceneTheme() { L3_THEME = isLight() ? 'light' : 'dark'; L3_BG = BG[L3_THEME]; L2_BG = BG2[L3_THEME]; if ($('#l3-cv')) l3Draw(); if ($('#lw-cv')) lwDraw(); if ($('#l2-cv')) l2Draw(); if ($('#le-cv')) leDraw(); }
function loadBg(cfg, key, to = BG) { if (!cfg) return; const im = new Image(); im.onload = () => { to[key] = Object.assign(im, { edge: cfg.edge, top: cfg.top }); sceneTheme(); }; im.src = cfg.src; }
loadBg(LAB_BG, 'dark'); loadBg(LAB_BG_LIGHT, 'light'); loadBg(LAB_BG2, 'dark', BG2); loadBg(LAB_BG2_LIGHT, 'light', BG2); sceneTheme();
['compressor', 'valve', 'cork', 'stopwatch', 'bottle', 'manometer', 'lens', 'puck-steel', 'puck-brass', 'launcher', 'cross', 'cyl', 'pulley', 'hanger', 'plate', 'magnet', 'psu', 'generator', 'multimeter', 'miniblock', 'magnetron', 'coil', 'helmholtz', 'compass'].forEach(k => { const im = new Image(); im.onload = () => { L3_SPR[k] = im; if (k === 'bottle') L3D.mol = null; if ($('#l3-cv')) l3Draw(); if ($('#lw-cv')) lwDraw(); if ($('#l2-cv')) l2Draw(); if ($('#le-cv')) leDraw(); }; im.src = `img/parts/${k}.webp`; });

/* ---------- профили (несколько курсантов на одном телефоне) ---------- */
const PKEY = 'lw3m-profiles';
const profiles = () => store.get(PKEY, []);
const workKey = id => 'lw3m-w-' + id;
const initials = fio => String(fio || '?').trim().split(/\s+/).slice(0, 2).map(w => w[0] || '').join('').toUpperCase() || '?';
const hue = s => { let h = 0; for (const ch of String(s)) h = (h * 31 + ch.charCodeAt(0)) % 360; return h; };
const ava = fio => `<span class="ava" style="background:hsl(${hue(fio)} 70% 72%)">${esc(initials(fio))}</span>`;
function addProfile(fio, group) {
  const p = { id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), fio: fio.trim(), group: group.trim(), created: new Date().toISOString() };
  store.set(PKEY, [p, ...profiles()]); return p;
}
function ensureMeta(S) {
  if (!S.fio && PROFILE) S.fio = PROFILE.fio;
  if (!S.group && PROFILE) S.group = PROFILE.group;
  if (!S.dx) S.dx = { started: new Date().toISOString(), admitTries: 0, procTries: 0, cqTries: 0 };
  S.dx.device = IOS ? 'ios' : 'android';
}
function openProfile(p, intro = false, lab = 0) {   // курсант → выбор работы (или сразу работа lab)
  PROFILE = p; L3S = null; LWS = null; L2S = null; tRecover();
  if (lab) mOpenLab(lab); else { SCREEN = 'labs'; PAGE = 'main'; render(); scrollTo(0, 0); }
  if (intro) showIntro(0);
}
const firstOpen = (list, ans) => { const i = list.findIndex((_, j) => !(ans || {})[j]); return i < 0 ? 0 : i; };
function profileStatus(p) {
  const st = labNums().map(n => [n, labState(n, p.id)]).filter(([, S]) => S && (S.max || S.done));
  return st.length ? st.map(([n, S]) => `ЛР ${n}: ${S.done ? 'защищена' : 'шаг ' + ((S.max || 0) + 1)}`).join(' · ') : 'работы не начаты';
}

/* ---------- вход и регистрация (пароль — только хеш, app-core.js) ---------- */
let AUTH = 'in', ASEL = '';
function vHome() {
  ui.bar.innerHTML = ''; dock('');
  const ps = profiles(); if (!ps.length) AUTH = 'up';
  const sel = ps.find(p => p.id === ASEL) || null;
  const pw = (id, lab, ac = 'current-password') => `<label class="field">${lab}<input class="inp" type="password" id="${id}" autocomplete="${ac}" enterkeyhint="go"></label>`;
  const login = !ps.length ? '<p class="mute">На этом устройстве ещё нет учётных записей. Зарегистрируйся — это займёт минуту.</p>'
    : `<p class="mute small">Выбери свою учётную запись:</p><div class="fz-acc">${ps.map(p => `<button data-m="acc" data-v="${p.id}" class="${p.id === ASEL ? 'on' : ''}">${ava(p.fio)}<span><b>${esc(p.fio)}</b><small>${esc(p.group || 'класс не указан')}</small></span></button>`).join('')}</div>
      ${sel ? (acctHasPw(sel) ? `${pw('au-pw', 'Пароль')}<button class="btn" data-m="login">Войти ${ic('chevron-right')}</button><button class="lnk" data-m="forgot">Забыли пароль?</button>`
        : `<p class="mute small">${sel.pwReset ? 'Пароль сброшен.' : 'У этой учётной записи ещё нет пароля.'} Придумай новый:</p>${pw('au-n1', 'Новый пароль', 'new-password')}${pw('au-n2', 'Ещё раз', 'new-password')}<button class="btn" data-m="setpw">Сохранить и войти</button>`) : ''}`;
  const reg = `<label class="field">ФИО<input class="inp" id="np-fio" placeholder="Иванов Иван Иванович" autocomplete="off" autocapitalize="words" enterkeyhint="next"></label>
      <label class="field">Класс<input class="inp" id="np-group" placeholder="103" autocomplete="off" enterkeyhint="next"></label>${pw('np-pw', 'Пароль', 'new-password')}${pw('np-pw2', 'Пароль ещё раз', 'new-password')}
      <button class="btn" data-m="register">Зарегистрироваться ${ic('chevron-right')}</button><p class="mute small">Учётная запись и результаты хранятся только на этом устройстве.</p>`;
  ui.main.innerHTML = `<div class="login">
    <div class="brand"><span class="logo">γ</span><h1>Физпрактикум</h1><p>Виртуальный лабораторный практикум по физике</p></div>
    <div class="card"><div class="fz-seg"><button data-m="atab" data-v="in" class="${AUTH === 'in' ? 'on' : ''}">Вход</button><button data-m="atab" data-v="up" class="${AUTH === 'up' ? 'on' : ''}">Регистрация</button></div>
      ${AUTH === 'in' ? login : reg}<p class="fz-msg" id="au-msg"></p></div>
    <p class="fz-org">${esc(ORG.school)}<br>${esc(ORG.dept)}</p>
    <div class="foot"><button class="lnk" data-m="import">${ic('file-text')} Открыть файл работы</button><span>версия ${esc(APP_VER)}</span></div>
  </div>`;
}
const auMsg = t => { const m = $('#au-msg'); if (m) m.textContent = t; };

/* ---------- приложение: разделы и нижняя панель ---------- */
let PAGE = 'main';
const TABS = [['main', 'Главная', 'house'], ['labs', 'Работы', 'flask-conical'], ['tests', 'Тесты', 'graduation-cap'], ['results', 'Итоги', 'trophy'], ['more', 'Ещё', 'sliders-horizontal']];
const PAGE_T = { main: 'Физпрактикум', labs: 'Лабораторные работы', tests: 'Тесты и экзамены', results: 'Мои результаты', more: 'Ещё', profile: 'Профиль', about: 'О программе' };
function mApp() {
  const back = ['profile', 'about'].includes(PAGE);
  ui.bar.innerHTML = `<div class="bar">${back ? `<button class="ib" data-m="page" data-v="more" aria-label="Назад">${ic('chevron-left')}</button>` : ''}<h1>${PAGE_T[PAGE]}${PAGE === 'main' ? `<small>${esc(PROFILE.fio)}${PROFILE.group ? ' · ' + esc(PROFILE.group) : ''}</small>` : ''}</h1></div>`;
  const body = ({ main: mpMain, labs: () => labCards('data-m'), tests: testsHome, results: () => resultsHtml('data-m'), more: mpMore, profile: mpProfile, about: () => aboutHtml('data-m') })[PAGE] || mpMain;
  ui.main.innerHTML = `<div class="fz-mpage">${body()}</div>`;
  dock(`<nav class="fz-tabs">${TABS.map(([k, t, i]) => `<button data-m="page" data-v="${k}" class="${PAGE === k || (k === 'more' && ['profile', 'about'].includes(PAGE)) ? 'on' : ''}">${ic(i)}<span>${t}</span></button>`).join('')}</nav>`);
}
function mpMain() {
  const st = labNums().map(n => [n, labState(n, PROFILE.id)]);
  const go = st.filter(([, S]) => S && (S.max || 0) > 0 && !S.done).sort((a, b) => (b[1].max || 0) - (a[1].max || 0))[0] || st.find(([, S]) => !S || !(S.max || S.done));
  const n = go ? go[0] : 0, S = n ? labState(n, PROFILE.id) : null, T = tsLoad(), done = st.filter(([, x]) => x && x.done).length, last = T.att.filter(a => a.kind === 'exam')[0];
  return `${n ? `<button class="fz-mcont" data-m="lab" data-v="${n}"><img src="${cover(n)}" alt=""><span><small>${S && S.max ? 'Продолжить' : 'Следующая работа'}</small><b>ЛР № ${n}. ${esc(labTitle(n))}</b><em>${S && S.max ? esc(labStatus(n, S)) : 'не начата'}</em></span>${ic('chevron-right')}</button>` : ''}
    <div class="fz-stats"><div class="fz-stat"><b>${done}/${labNums().length}</b><span>работ защищено</span></div><div class="fz-stat"><b>${Object.values(T.self).filter(v => v === 1).length}</b><span>вопросов решено</span></div><div class="fz-stat"><b>${last ? last.score : '—'}</b><span>${last ? `последний экзамен, «${last.grade}»` : 'экзаменов нет'}</span></div></div>
    <div class="fz-links"><button class="fz-link" data-m="page" data-v="labs">${ic('flask-conical')}<span><b>Лабораторные работы</b><small>8 работ по методичке кафедры</small></span></button>
      <button class="fz-link" data-m="page" data-v="tests">${ic('graduation-cap')}<span><b>Тесты и экзамены</b><small>900 вопросов по 9 темам</small></span></button></div>`;
}
function mpMore() {
  const it = (m, v, icn, t, d) => `<button data-m="${m}" ${v ? `data-v="${v}"` : ''}>${ic(icn)}<span>${t}${d ? `<small>${d}</small>` : ''}</span></button>`;
  return `<div class="menu">${it('page', 'profile', 'user', 'Профиль', 'ФИО, класс, пароль')}${it('page', 'about', 'book-open', 'О программе', 'училище, кафедра, авторские права')}
    ${it('theme', '', 'sparkles', isLight() ? 'Тёмная тема' : 'Светлая тема', '')}${it('intro', '', 'captions', 'Как проходит работа', 'короткое знакомство')}
    ${it('import', '', 'file-text', 'Открыть файл работы', 'продолжить работу с другого устройства')}${it('home', '', 'chevron-left', 'Выйти', 'из учётной записи')}</div>`;
}
function mpProfile() {
  const p = PROFILE, f = (id, lab, v, t = 'text', ac = 'off') => `<label class="field">${lab}<input class="inp" type="${t}" id="${id}" value="${esc(v || '')}" autocomplete="${ac}"></label>`;
  return `<section class="card"><h2>${ic('user')} Учётная запись</h2>${f('pf-fio', 'ФИО', p.fio)}${f('pf-group', 'Класс', p.group)}<button class="btn" data-m="pf-save">Сохранить</button></section>
    <section class="card"><h2>${ic('lock')} Смена пароля</h2>${f('pf-old', 'Текущий пароль', '', 'password', 'current-password')}${f('pf-n1', 'Новый пароль', '', 'password', 'new-password')}${f('pf-n2', 'Ещё раз', '', 'password', 'new-password')}
      <button class="btn" data-m="pf-pw">Сменить пароль</button><p class="fz-msg" id="pf-msg"></p></section>
    <button class="btn line" data-m="pf-del" style="color:var(--bad)">${ic('trash-2')} Удалить учётную запись</button>`;
}
function mTest() {
  ui.bar.innerHTML = ''; dock('');
  ui.main.innerHTML = `<div class="fz-test fz-phone">${testScreen()}</div>`; scrollTo(0, 0);
}
const fzModal = (t, html) => sheet(t, html);
const fzSaveExam = a => shareText(examFileName(a), packExam(a), `Экзамен: ${topicName(a.topic)}`);

/* ---------- работа ---------- */
const STEP_T = ['Допуск', 'Подготовка', 'Опыты', 'Обработка', 'Выводы и защита', 'Отчёт'];
function topbar(S) {
  const i = S.step;
  ui.bar.innerHTML = `<div class="bar"><button class="ib" data-m="home" aria-label="К списку">${ic('chevron-left')}</button>
      <h1>${STEP_T[i]}<small>Шаг ${i + 1} из 6 · ${esc(S.fio || '')}</small></h1>
      <button class="ib" data-m="hod" aria-label="Ход работы">${ic('clipboard-list')}</button>
      <button class="ib" data-m="menu" aria-label="Меню">${ic('sliders-horizontal')}</button></div>
    <div class="steps">${L3.steps.map((_, j) => `<button data-l3="go" data-v="${j}" class="${j === i ? 'cur' : j <= S.max ? 'done' : ''}" ${j <= S.max ? '' : 'disabled'} aria-label="${STEP_T[j]}"></button>`).join('')}</div>`;
}
function dock(html) { ui.dock.innerHTML = html ? `<div>${html}</div>` : ''; if (!html) document.documentElement.style.setProperty('--dock', '0px'); requestAnimationFrame(() => document.documentElement.style.setProperty('--dock', (ui.dock.offsetHeight || 0) + 'px')); }
function vWork() {
  const S = l3Load(); ensureMeta(S);
  const st = L3.steps[S.step][0];
  S.dx.t = S.dx.t || {}; if (!S.dx.t[st]) { S.dx.t[st] = new Date().toISOString(); l3Save(); }
  topbar(S);
  ({ admit: wAdmit, prep: wPrep, exp: wExp, proc: wProc, concl: wConcl, report: wReport })[st](S);
  $('#printroot').innerHTML = st === 'report' ? l3ReportHtml() : '';
  if (st === 'prep' || st === 'exp') { fitScene(); l3Draw(); l3Run(); liveTick(true); }
}

/* --- вопросы по одному (допуск и защита) --- */
const LT = 'АБВГ';
function qCard(list, ans, checked, i, act, seed, total, attr = 'l3') {
  const [q, a, x] = list[i], ch = ans[i], opts = lwShuf(i + seed, [a, ...x]);
  return `<section class="card"><div class="qn">Вопрос ${i + 1} из ${total}<span class="dots">${list.map((_, j) => `<i class="${j === i ? 'cur' : checked ? (ans[j] === list[j][1] ? 'ok' : 'bad') : ans[j] ? 'a' : ''}"></i>`).join('')}</span></div>
    <p class="q">${esc(q)}</p>
    <div class="opts">${opts.map((o, j) => `<button class="opt ${ch === o ? (checked ? (o === a ? 'ok' : 'bad') : 'pick') : ''}" data-${attr}="${act}" data-q="${i}" data-v="${esc(o)}"><span class="lt">${LT[j]}</span><span>${esc(o)}</span></button>`).join('')}</div></section>`;
}
function qResult(list, ans, ok, kind) {
  const n = list.filter(([, a], i) => ans[i] === a).length;
  return `<section class="card"><h2>${ic(ok ? 'circle-check' : 'circle-x')} ${kind} ${ok ? 'сдан' : 'не сдан'} <span class="tag ${ok ? 'ok' : 'bad'}">${n} из ${list.length}</span></h2>
    <p class="lead">${ok ? 'Можно идти дальше.' : 'Нужно не меньше 6 верных. Нажми на вопрос с ошибкой, чтобы ответить заново.'}</p>
    <ul class="res-list">${list.map(([q, a], i) => `<li class="${ans[i] === a ? '' : 'bad'}">${ans[i] === a ? '✓' : '✗'} <span>${esc(q)}</span>${ans[i] === a || ok ? '' : `<button class="lnk" data-m="${kind === 'Допуск' ? 'aq' : 'cqq'}" data-v="${i}">${ic('pencil')}</button>`}</li>`).join('')}</ul></section>`;
}
function wAdmit(S) {
  const all = L3_ADMIT.every((_, i) => S.admit[i]);
  if (S.admitChecked && S.admitOk) {
    ui.main.innerHTML = qResult(L3_ADMIT, S.admit, true, 'Допуск');
    return dock(`<button class="btn" data-l3="next">К подготовке установки ${ic('chevron-right')}</button>`);
  }
  ui.main.innerHTML = (S.admitChecked ? qResult(L3_ADMIT, S.admit, false, 'Допуск') : '') + qCard(L3_ADMIT, S.admit, S.admitChecked, AQ, 'admit', 10, 8)
    + `<button class="btn soft" data-m="theory">${ic('book-open')} Теория и схема установки</button>`;
  dock(`<div class="row"><button class="btn line" data-m="aq" data-v="${AQ - 1}" ${AQ ? '' : 'disabled'}>${ic('chevron-left')}</button>
    ${AQ < 7 ? `<button class="btn ${S.admit[AQ] ? '' : 'line'}" data-m="aq" data-v="${AQ + 1}" style="flex:3">Дальше ${ic('chevron-right')}</button>`
      : `<button class="btn" data-l3="admitCheck" ${all ? '' : 'disabled'} style="flex:3">${ic('circle-check')} Проверить допуск</button>`}</div>
    ${AQ < 7 && all && !S.admitChecked ? `<button class="btn ok" data-l3="admitCheck">${ic('circle-check')} Проверить допуск</button>` : ''}`);
}

/* --- установка: сцена, показания --- */
function sceneHtml(read) {
  return `<div class="scene ${read && ZOOM ? 'zoom' : ''}" id="m-scene"><canvas id="l3-cv"></canvas>${read ? `<button class="btn zbtn" data-m="zoom">${ZOOM ? 'Вся установка' : 'Лупы крупно'}</button>` : ''}</div>`;
}
function fitScene() {   // при отсчёте лупы — крупно: показываем только область луп (x 138…450, y 276…420 из 580×452)
  const w = $('#m-scene'), cv = $('#l3-cv'); if (!w || !cv) return;
  if (w.classList.contains('zoom')) {
    const W = w.clientWidth, cw = W * 580 / 312;
    cv.style.width = cw + 'px'; cv.style.marginLeft = -138 / 580 * cw + 'px'; cv.style.marginTop = -276 / 580 * cw + 'px';
    w.style.height = 144 / 580 * cw + 'px';
  } else { cv.style.width = ''; cv.style.marginLeft = ''; cv.style.marginTop = ''; w.style.height = ''; }
}
const liveHtml = () => `<div class="live"><div><small>h, мм</small><b id="m-h">0</b></div><div><small>секундомер</small><b id="m-sw">—</b></div><div><small>в баллоне</small><b id="m-proc">—</b></div></div>`;
function procName() {
  const S = L3S, V = L3V; if (!S) return '—';
  if (V.pump && S.kOpen && !S.k0Open) return 'сжатие (накачка)';
  if (S.k0Open) return V.hiss > .05 ? 'адиабатное расширение' : 'сообщается с атмосферой';
  if (S.kOpen) return V.th > .0003 ? 'изохорное охлаждение' : 'равновесие';
  return V.th > .0003 ? 'изохорное охлаждение' : V.th < -.0003 ? 'изохорное нагревание' : 'равновесие';
}
let liveRaf = 0;
function liveTick(start) {
  if (start && liveRaf) return;
  const cv = $('#l3-cv'); if (!cv) { liveRaf = 0; return; }
  const V = L3V, S = L3S, set = (id, v) => { const e = document.getElementById(id); if (e && e.textContent !== v) e.textContent = v; };
  set('m-h', String(Math.round(V.p))); set('m-sw', S && S.power ? l3Fix(V.sw, 1) + ' с' : 'выкл'); set('m-proc', procName()); set('l3-h', String(Math.round(V.p)));
  const pb = $('#m-pbar'); if (pb) pb.style.width = Math.min(100, V.p / 240 * 100) + '%';
  const wb = $('#m-wbar'); if (wb) wb.style.width = Math.min(100, V.sw / L3.wait * 100) + '%';
  const hb = $('#l3-pump'); if (hb) hb.classList.toggle('pressed', !!V.pump);
  liveRaf = requestAnimationFrame(() => liveTick(false));
}
function wPrep(S) {
  const ok = S.power && S.kOpen && !S.k0Open;
  const sw = (act, on, need, t, d) => `<button class="sw ${on ? 'on' : need ? 'need' : ''}" data-l3="${act}"><div class="nm"><b>${t}</b><small>${d}</small></div><span class="tog"></span></button>`;
  ui.main.innerHTML = sceneHtml(false) + `<section class="card"><h2>${ic('settings')} Подготовка к опыту</h2>
    <p class="lead" style="margin-bottom:12px">Зелёная ручка крана — открыт, красная — закрыт.</p>
    <div class="stack">${sw('power', S.power, true, 'Питание секундомера', S.power ? 'включено' : 'нужно включить')}
      ${sw('kv', S.kOpen, true, 'Кран K — к компрессору', S.kOpen ? 'открыт' : 'нужно открыть')}
      ${sw('k0', !S.k0Open, true, 'Кран K₀ — к атмосфере', S.k0Open ? 'открыт — нужно закрыть' : 'закрыт')}</div></section>`;
  dock(ok ? `<button class="btn" data-l3="next">Установка готова — к опытам ${ic('chevron-right')}</button>` : `<p class="say center">Включи питание, открой K и закрой K₀.</p>`);
}
function runsHtml(S) {
  const n = S.runs.length;
  return `<div class="runs">${[0, 1, 2].map(i => { const r = S.runs[i];
    return `<div class="${r ? 'ok' : i === n ? 'now' : ''}">Опыт ${i + 1}<b>${r ? `${r.h1} / ${r.h2}` : i === n && L3V.cur.h1 != null ? `${L3V.cur.h1} / …` : '— / —'}</b>${r ? `γ = ${l3Fix(r.h1 / (r.h1 - r.h2), 3)}` : 'h₁ / h₂, мм'}</div>`; }).join('')}</div>`;
}
function wExp(S) {
  const V = L3V, n = S.runs.length, read = V.phase === 'read1' || V.phase === 'read2';
  if (n >= L3.N) {
    ui.main.innerHTML = sceneHtml(false) + `<section class="card"><h2>${ic('circle-check')} Опыты завершены <span class="tag ok">3 из 3</span></h2>${runsHtml(S)}</section>`;
    return dock(`<button class="btn" data-l3="next">К обработке результатов ${ic('chevron-right')}</button>`);
  }
  if (V.phase === 'ready' && S.kOpen && !S.k0Open) V.phase = 'pump';
  ui.main.innerHTML = sceneHtml(read) + liveHtml() + `<section class="card"><h2>${ic('flask-conical')} Опыт ${n + 1} из 3</h2>${runsHtml(S)}</section>`;
  const ph = V.phase, msg = '<p class="lw-msg" id="lw-msg"></p>';
  let d = '';
  if (ph === 'ready') d = `<p class="say">Опыт ${n + 1}: открой кран <b>K</b> и закрой кран <b>K₀</b>.</p><div class="row">
      <button class="btn ${S.kOpen ? 'ok' : 'line'}" data-l3="kv">K: ${S.kOpen ? 'открыт' : 'открыть'}</button>
      <button class="btn ${!S.k0Open ? 'ok' : 'line'}" data-l3="k0">K₀: ${S.k0Open ? 'закрыть' : 'закрыт'}</button></div>`;
  else if (ph === 'pump') d = `<p class="say">Держи кнопку, пока h не станет <b>210…220 мм</b>. Сейчас: <b id="l3-h">${Math.round(V.p)}</b> мм</p>
      <div class="bar2 zone"><i id="m-pbar"></i></div>
      <button class="btn hold" id="l3-pump" data-l3="nop">${ic('zap')} Компрессор — держи</button>
      <button class="btn line" data-l3="closeK">${ic('timer')} Закрыть K и пустить секундомер</button>`;
  else if (ph === 'wait1' || ph === 'wait2') d = `<p class="say">Ждём 1 минуту: температура газа сравняется с комнатной, давление установится.</p>
      <div class="bar2"><i id="m-wbar"></i></div><button class="btn" data-l3="waitMin" ${V.speed > 1 ? 'disabled' : ''}>${ic('timer')} ${V.speed > 1 ? 'Ждём… (ускорено)' : 'Ждать 1 минуту (ускоренно)'}</button>`;
  else if (read) { const j = ph === 'read1' ? '₁' : '₂';
    d = `<p class="say">Прочитай по лупам уровни в <b>обоих коленах</b> и запиши <b>h${j}</b> = правое − левое, мм.</p>
      <div class="read"><input class="inp l3i" data-k3="ch" inputmode="numeric" enterkeyhint="done" autocomplete="off" placeholder="h${j}, мм" value="${esc(V.cur[ph === 'read1' ? 'r1' : 'r2'] || '')}">
      <button class="btn" data-l3="rec${ph === 'read1' ? 1 : 2}">Записать</button></div>`; }
  else if (ph === 'vent') d = `<p class="say">Открой <b>K₀</b> и закрой, как только шипение стихнет и уровни сравняются.</p>
      ${S.k0Open ? `<button class="btn bad" data-l3="k0close">Закрыть K₀</button>` : `<button class="btn" data-l3="k0open">Открыть K₀ — выпустить воздух</button>`}`;
  else if (ph === 'vented') d = `<p class="say">K₀ закрыт. Запусти секундомер и подожди минуту, пока газ нагреется.</p><button class="btn" data-l3="startSw">${ic('timer')} Пуск секундомера</button>`;
  dock(d + msg);
}

/* --- обработка --- */
const PK_F = { gm: '⟨γ⟩ = (γ₁ + γ₂ + γ₃) / 3', dg: '⟨Δγ⟩ = Σ|⟨γ⟩ − γᵢ| / √(N(N − 1)), N = 3', eg: 'ε<sub>γ</sub> = ⟨Δγ⟩ / ⟨γ⟩ · 100', gT: 'γ<sub>T</sub> = (i + 2) / i, для воздуха i = 5', e: 'ε = |γ<sub>T</sub> − ⟨γ⟩| / γ<sub>T</sub> · 100' };
const PK_D = { gm: '0,001', dg: '0,001', eg: '0,1 %', gT: '0,001', e: '0,1 %' };
function wProc(S) {
  const o = l3Calc(), P = S.proc, pk = (S.dx && S.dx.pk) || {}, all = L3_KEYS.every(k => S.procOk[k] === true), bad = L3_KEYS.filter(k => S.procOk[k] === false).length;
  const fld = (k, lab, f, d) => { const v = P[k], st = S.procOk[k], empty = !String(v ?? '').trim();
    return `<div class="pv"><label>${lab}<small>точность ${d}</small></label>
      <input class="inp l3i ${st === true ? 'ok' : st === false ? 'bad' : ''}" data-k3="p_${k}" inputmode="decimal" enterkeyhint="next" autocomplete="off" value="${esc(v ?? '')}" placeholder="0,000">
      <span class="f">${f}</span>${st === false ? `<span class="hint">${empty ? 'Заполни это значение.' : esc(procHint(k, lwNum(v), o, S, pk[k] || 0))}</span>` : ''}</div>`; };
  ui.main.innerHTML = `<section class="card"><h2>${ic('grid-3x3')} γ по каждому опыту ${all ? '<span class="tag ok">всё верно</span>' : bad ? `<span class="tag bad">ошибок: ${bad}</span>` : ''}</h2>
      ${o.a.map((r, i) => fld('g' + (i + 1), `γ${SUBI[i]}`, `опыт ${i + 1}: γ = h₁ / (h₁ − h₂) = ${r.h1} / (${r.h1} − ${r.h2})`, '0,001')).join('')}</section>
    <section class="card"><h2>${ic('target')} Среднее, погрешности, теория</h2>
      ${fld('gm', '⟨γ⟩ — среднее', PK_F.gm, PK_D.gm)}${fld('dg', '⟨Δγ⟩ — абсолютная погрешность', PK_F.dg, PK_D.dg)}${fld('eg', 'ε<sub>γ</sub> — относительная, %', PK_F.eg, PK_D.eg)}
      ${fld('gT', 'γ<sub>T</sub> — теория', PK_F.gT, PK_D.gT)}${fld('e', 'ε — расхождение с теорией, %', PK_F.e, PK_D.e)}
      ${['gm', 'dg'].every(k => S.procOk[k]) ? `<div class="resv">γ = ${l3Res(o)}</div>` : ''}
      <p class="mute small" style="margin:6px 0 0">Дробную часть можно писать через запятую. После трёх ошибок в ячейке появится пример расчёта.</p></section>`;
  dock(all ? `<button class="btn" data-l3="next">К выводам ${ic('chevron-right')}</button>` : `<button class="btn" data-l3="pcheck">${ic('circle-check')} Проверить</button>`);
}

/* --- выводы и защита --- */
function wConcl(S) {
  if (!S.concl) { S.concl = l3AutoConcl(l3Calc()); l3Save(); }
  const tabs = `<div class="tabs"><button class="${CTAB === 'concl' ? 'on' : ''}" data-m="ctab" data-v="concl">${ic('pencil')} Выводы</button><button class="${CTAB === 'cq' ? 'on' : ''}" data-m="ctab" data-v="cq">${ic('graduation-cap')} Защита ${S.cqOk ? '✓' : `${Object.keys(S.cq).length}/8`}</button></div>`;
  if (CTAB === 'concl') {
    ui.main.innerHTML = tabs + `<section class="card"><h2>${ic('pencil')} Выводы</h2><p class="lead" style="margin-bottom:10px">Черновик собран по твоим результатам. Проверь и допиши своими словами — он попадёт в отчёт.</p>
      <textarea class="inp l3i" data-k3="concl">${esc(S.concl)}</textarea><button class="lnk" data-l3="reconcl">${ic('rotate-ccw')} Собрать черновик заново</button></section>`;
    return dock(S.cqOk ? `<button class="btn" data-l3="next">К отчёту ${ic('chevron-right')}</button>` : `<button class="btn" data-m="ctab" data-v="cq">К защите: 8 вопросов ${ic('chevron-right')}</button>`);
  }
  const all = L3_CQ.every((_, i) => S.cq[i]);
  if (S.cqChecked && S.cqOk) { ui.main.innerHTML = tabs + qResult(L3_CQ, S.cq, true, 'Защита'); return dock(`<button class="btn" data-l3="next">К отчёту ${ic('chevron-right')}</button>`); }
  ui.main.innerHTML = tabs + (S.cqChecked ? qResult(L3_CQ, S.cq, false, 'Защита') : '') + qCard(L3_CQ, S.cq, S.cqChecked, CQ, 'cq', 90, 8);
  dock(`<div class="row"><button class="btn line" data-m="cqq" data-v="${CQ - 1}" ${CQ ? '' : 'disabled'}>${ic('chevron-left')}</button>
    ${CQ < 7 ? `<button class="btn ${S.cq[CQ] ? '' : 'line'}" data-m="cqq" data-v="${CQ + 1}" style="flex:3">Дальше ${ic('chevron-right')}</button>`
      : `<button class="btn" data-l3="cqCheck" ${all ? '' : 'disabled'} style="flex:3">${ic('circle-check')} Проверить ответы</button>`}</div>
    ${CQ < 7 && all && !S.cqChecked ? `<button class="btn ok" data-l3="cqCheck">${ic('circle-check')} Проверить ответы</button>` : ''}`);
}

/* --- отчёт --- */
function wReport(S) {
  const o = l3Calc(), f = (k, lab, ph) => `<label class="field">${lab}<input class="inp l3i" data-k3="${k}" value="${esc(S[k] || '')}" placeholder="${ph}" autocomplete="off"></label>`;
  const sent = S.dx && S.dx.submitted;
  ui.main.innerHTML = `<section class="card hero">${ic('trophy')}<h2>Работа выполнена</h2><p>γ = <b>${l3Res(o)}</b> · расхождение с теорией ${f1(o.e, 1)} %</p></section>
    <button class="btn soft" data-m="summary" style="margin-bottom:12px">${ic('graduation-cap')} Что рассказать на защите</button>
    <section class="card"><h2>${ic('user')} Шапка отчёта</h2>${f('fio', 'ФИО', 'Иванов И. И.')}${f('group', 'Класс / группа', '11 А')}${f('date', 'Дата', 'дд.мм.гггг')}</section>
    <section class="card"><h2>${ic('file-text')} Отчёт <span class="tag">4 листа А4</span></h2><div class="paper-wrap" id="m-paper"><div class="lwr">${l3ReportHtml()}</div></div></section>
    <div class="stack"><button class="btn line" data-m="pdf">${ic('printer')} PDF или печать</button><button class="btn line" data-l3="restart">${ic('rotate-ccw')} Выполнить работу заново</button></div>`;
  dock(`${sent ? `<p class="say center">${ic('circle-check')} Файл отправлен ${new Date(sent).toLocaleString('ru-RU', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}</p>` : ''}
    <button class="btn ${sent ? 'line' : ''}" data-m="send">${ic('graduation-cap')} Отправить работу преподавателю</button>`);
  fitPaper();
  if (!(S.dx && S.dx.sumSeen)) setTimeout(() => { if (SCREEN === 'work' && l3St() === 'report' && $('#sheet').hidden) openSummary(); }, 0);   // один раз — сразу при переходе к отчёту
}
function fitPaper() {   // бланк вёрстки А4 (800 px) — уменьшенно на ширину экрана
  const w = $('#m-paper'); if (!w) return; const r = w.querySelector('.lwr'); if (!r) return;
  r.style.width = '800px'; const k = (w.clientWidth - 20) / 800; r.style.transform = `scale(${k})`; w.style.height = r.scrollHeight * k + 20 + 'px';
}
addEventListener('resize', () => { fitPaper(); fitScene(); });

/* ---------- нижний лист ---------- */
function sheet(title, body, actions = '') {
  const s = $('#sheet');
  s.innerHTML = `<div class="sbox" role="dialog"><div class="grab"></div><header><h2>${title}</h2><button class="ib" data-m="sclose" aria-label="Закрыть">${ic('x')}</button></header>
    <div class="sbody">${body}</div><div class="sact">${actions}</div></div>`;
  s.hidden = false;
}
function closeSheet() { const s = $('#sheet'); s.hidden = true; s.innerHTML = ''; }
$('#sheet').addEventListener('click', e => { if (e.target.id === 'sheet') closeSheet(); });
let TTAB = 'theory';
function showTheory() {
  const T = { theory: 'Теория', equip: 'Установка', safety: 'Безопасность' };
  sheet(`${ic('book-open')} Теория`, `<div class="tabs">${Object.entries(T).map(([k, t]) => `<button class="${TTAB === k ? 'on' : ''}" data-m="ttab" data-v="${k}">${t}</button>`).join('')}</div>
    ${TTAB === 'equip' ? `<div style="background:#fff; border-radius:16px; padding:8px; margin-bottom:12px">${l3SchemeSvg()}</div>` : ''}<div class="txt">${L3_TEXT[TTAB]}</div>`);
}
function hodNow() {
  if (LAB !== 3) return hodNowLab();
  if (!L3S) return 0;
  const S = L3S, st = l3St(), ph = L3V.phase, n = S.runs.length;
  if (st === 'admit') return 0;
  if (st === 'prep') return !S.power ? 1 : !S.kOpen ? 2 : S.k0Open ? 3 : 4;
  if (st !== 'exp' || n >= L3.N) return 13;
  return { ready: 11, pump: 4, wait1: 6, read1: 6, vent: 8, vented: 9, wait2: 9, read2: 10 }[ph] || 4;
}
function showHod() {
  const cur = hodNow();
  sheet(`${ic('clipboard-list')} Ход работы`, `<p class="mute small" style="margin:0 0 10px">Раздел 4 методички. Текущий пункт подсвечен.</p>
    <ol class="hod">${(LAB === 3 ? HOD : curLab().hod).map((t, i) => `<li class="${i + 1 === cur ? 'cur' : ''}"><i>${i + 1}</i><span>${t}</span></li>`).join('')}</ol>`);
  const c = $('.hod li.cur'); if (c) c.scrollIntoView({ block: 'center' });
}
function showMenu() {
  const it = (m, icn, t, d) => `<button data-m="${m}">${ic(icn)}<span>${t}${d ? `<small>${d}</small>` : ''}</span></button>`;
  sheet('Меню', `<div class="menu">
    ${it('hod', 'clipboard-list', 'Ход работы', 'порядок по методичке')}${it('theory', 'book-open', 'Теория', 'формулы, установка, безопасность')}
    ${it('send', 'file-text', 'Отправить файл работы', 'преподавателю — в мессенджер, почту, на диск')}
    ${it('theme', 'sparkles', isLight() ? 'Тёмная тема' : 'Светлая тема', '')}${it('intro', 'captions', 'Как проходит работа', 'короткое знакомство')}
    ${it('labs', 'layers', 'К списку работ', 'работа сохранится')}${it('home', 'house', 'Выйти из учётной записи', '')}</div>`);
}
function openSummary() {
  const L = curLab(), S = L.load(); if (!S || (LAB === 3 ? (S.runs || []).length !== L3.N : !S.cqOk)) return;
  sheet(`${ic('graduation-cap')} Что рассказать на защите`, labSummaryHtml(LAB, S), `<button class="btn" data-m="sclose">${ic('file-text')} К отчёту</button>`);
  S.dx = S.dx || {}; if (!S.dx.sumSeen) { S.dx.sumSeen = new Date().toISOString(); L.save(); }
}
const INTRO = [
  { big: '🎓', t: 'Добро пожаловать в «Физпрактикум»', p: 'Внизу — разделы: работы, тесты и экзамены, итоги. Всё сохраняется само — можно закрыть приложение и продолжить потом.',
    x: () => `<div class="isteps">${[['Работы', '8 лабораторных'], ['Тесты', '900 вопросов'], ['Экзамены', 'по темам и итоговый'], ['Итоги', 'файлы для преподавателя']].map(([b, sm], i) => `<div><i>${i + 1}</i><b>${b}</b><small>${sm}</small></div>`).join('')}</div>` },
  { big: '🧪', t: 'Как проходит работа', p: 'Шаги идут по порядку: следующий открывается, когда выполнен предыдущий. Ход работы по методичке — значок со списком вверху экрана.',
    x: () => `<div class="isteps">${[['Допуск', '8 вопросов'], ['Подготовка', 'установка'], ['Опыты', 'измерения'], ['Обработка', 'расчёты'], ['Защита', 'выводы'], ['Отчёт', 'PDF']].map(([b, sm], i) => `<div><i>${i + 1}</i><b>${b}</b><small>${sm}</small></div>`).join('')}</div>` },
  { big: '📤', t: 'Как сдать работу', p: 'В конце работы нажми «Отправить работу преподавателю» и выбери мессенджер, почту или диск. Результат экзамена отправляется так же — в разделе «Итоги».', x: () => '' }
];
let INTRO_AT = 0;
function showIntro(i) {
  INTRO_AT = Math.max(0, Math.min(INTRO.length - 1, i)); const s = INTRO[INTRO_AT], last = INTRO_AT === INTRO.length - 1;
  sheet('Знакомство', `<div class="slide"><div class="big">${s.big}</div><h3>${s.t}</h3><p>${s.p}</p>${s.x()}</div>
    <div class="sdots">${INTRO.map((_, j) => `<i class="${j === INTRO_AT ? 'on' : ''}"></i>`).join('')}</div>`,
    `<button class="btn" data-m="intro-next">${last ? 'Начать' : 'Дальше'} ${ic('chevron-right')}</button>${last ? '' : '<button class="btn soft" data-m="sclose">Пропустить</button>'}`);
}

/* ---------- файл работы, PDF ---------- */
const workFileName = S => `ЛР${LAB}_${safeName(S.fio) || 'курсант'}${S.group ? '_' + safeName(S.group) : ''}.lw3`;
async function shareText(name, text, title, type = 'application/octet-stream') {
  const FS = plug('Filesystem'), SH = plug('Share');
  if (FS && SH) {
    try {
      const r = await FS.writeFile({ path: name, data: text, directory: 'CACHE', encoding: 'utf8' });
      await SH.share({ title, text: title, files: [r.uri], dialogTitle: title }); return true;
    } catch (e) { if (/cancel/i.test(String(e && (e.message || e)))) return false; toast('Не удалось отправить файл: ' + esc(String(e && (e.message || e))), 'bad'); return false; }
  }
  // браузер / iPhone: меню «Поделиться» с файлом (почта, мессенджеры, «Файлы»), иначе — скачивание
  try { const file = new File([text], name, { type }); if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], title }); return true; } }
  catch (e) { if (e && e.name === 'AbortError') return false; }
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type })); a.download = name;
  document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  toast(`${ic('circle-check')} Файл «${esc(name)}» сохранён в загрузки`); return true;
}
async function sendWork() {
  const L = curLab(), S = L.load(); ensureMeta(S);
  const ok = await shareText(workFileName(S), packResult(), `Работа: ЛР ${LAB} — ${labTitle(LAB)}`);
  if (ok && S.done) { S.dx.submitted = new Date().toISOString(); L.save(); if (L.steps[S.step][0] === 'report') render(); }
}
async function printReport() {
  const L = curLab(), S = L.load(); $('#printroot').innerHTML = L.report();
  const PR = plug('Printer');
  if (PR) { try { await PR.print({ name: `Отчёт_ЛР${LAB}_${safeName(S.fio) || 'курсант'}` }); } catch (e) { toast('Печать недоступна: ' + esc(String(e && (e.message || e))), 'bad'); } return; }
  // на iPhone в приложении с экрана «Домой» печать из страницы может не открываться — отчёт отдаётся файлом:
  // его открывают в «Файлах» или Safari и оттуда печатают или сохраняют в PDF (меню «Поделиться» → «Напечатать»)
  if (IOS && (STANDALONE || typeof window.print !== 'function')) { await shareText(`Отчёт_ЛР${LAB}_${safeName(S.fio) || 'курсант'}.html`, reportFileHtml(L.report(), `Отчёт по ЛР № ${LAB}`), `Отчёт по ЛР № ${LAB}`, 'text/html'); return; }
  window.print();
}
const reportFileHtml = (body, title) => `<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${esc(title)}</title>
<style>body{margin:0; background:#fff; color:#000; font-family:"Times New Roman",serif} .lwr{display:block} ${typeof REPORT_CSS !== 'undefined' ? REPORT_CSS : ''}
@page{size:A4; margin:12mm} .lwp{box-shadow:none; max-width:190mm; margin:0 auto 12mm} @media print{.lwp{margin:0; page-break-after:always; break-after:page} .lwp:last-child{page-break-after:auto}}</style></head><body><div class="lwr">${body}</div></body></html>`;
const readFile = f => new Promise((ok, no) => { const r = new FileReader(); r.onload = () => ok(String(r.result)); r.onerror = () => no(r.error); r.readAsText(f, 'utf-8'); });
$('#file-in').addEventListener('change', async e => { const f = (e.target.files || [])[0]; if (f) continueFrom(await readFile(f)); });
function continueFrom(text) {
  const r = unpackResult(text);
  if (r.err) return toast(r.err, 'bad');
  if (!r.ok) return toast('Файл изменён вручную — продолжить по нему нельзя.', 'bad');
  if (r.d.kind === 'exam') return toast('Это файл результата экзамена — его открывает преподаватель в режиме преподавателя.', 'bad');
  const S = r.d.state; if (S.v !== 1) return toast('Файл от другой версии работы.', 'bad');
  if (S.demo || (S.dx && S.dx.demo)) return toast('Это демо-прохождение преподавателя, а не работа курсанта.', 'bad');
  const fio = (S.fio || r.d.student.fio || 'Курсант').trim(), group = (S.group || r.d.student.group || '').trim();
  let p = profiles().find(x => x.fio.toLowerCase() === fio.toLowerCase() && (x.group || '') === group);
  if (p) { const cur = store.get(workKey(p.id), null); if (cur && (cur.max || 0) > (S.max || 0) && !confirm(`У «${fio}» на этом телефоне работа продвинута дальше. Заменить её работой из файла?`)) return; }
  else p = addProfile(fio, group);
  store.set(LABS[r.d.lab || 3].key(p.id), S); toast(`Работа «${esc(fio)}» загружена из файла`); openProfile(p, false, r.d.lab || 3);
}

/* ---------- действия оболочки (data-m) ---------- */
document.addEventListener('click', e => {
  const b = e.target.closest && e.target.closest('[data-m]'); if (!b) return; const d = b.dataset;
  switch (d.m) {
    case 'atab': AUTH = d.v; render(); break;
    case 'acc': ASEL = d.v; render(); break;
    case 'login': { const p = profiles().find(x => x.id === ASEL); if (acctCheck(p, $('#au-pw').value)) { ASEL = ''; openProfile(p); } else auMsg('Неверный пароль.'); break; }
    case 'forgot': { const p = profiles().find(x => x.id === ASEL); if (p && confirm(`Сбросить пароль учётной записи «${p.fio}»? Работы и результаты сохранятся, нужно будет придумать новый пароль.`)) { acctResetPw(p.id); render(); } break; }
    case 'setpw': { const a = $('#au-n1').value, c = $('#au-n2').value; if (a.length < 4) { auMsg('Пароль — не короче 4 символов.'); break; } if (a !== c) { auMsg('Пароли не совпадают.'); break; }
      const p = acctSetPw(ASEL, a); ASEL = ''; if (p) { toast('Пароль сохранён'); openProfile(p); } break; }
    case 'register': {
      const fio = $('#np-fio').value.trim(), group = $('#np-group').value.trim(), err = acctValidate(fio, group, $('#np-pw').value, $('#np-pw2').value);
      if (err) { auMsg(err); break; }
      openProfile(acctSetPw(addProfile(fio, group).id, $('#np-pw').value), true); break;
    }
    case 'page': closeSheet(); PAGE = d.v; SCREEN = 'labs'; render(); scrollTo(0, 0); break;
    case 'pf-save': { const fio = $('#pf-fio').value.trim(), group = $('#pf-group').value.trim();
      if (fio.split(/\s+/).length < 2) { toast('Впиши фамилию и инициалы.', 'bad'); break; }
      const list = profiles(), p = list.find(x => x.id === PROFILE.id); p.fio = fio; p.group = group; store.set(PKEY, list); PROFILE = p; render(); toast('Сохранено'); break; }
    case 'pf-pw': { const m = t => { const el = $('#pf-msg'); if (el) el.textContent = t; };
      if (!acctCheck(PROFILE, $('#pf-old').value)) { m('Текущий пароль неверный.'); break; } const a = $('#pf-n1').value;
      if (a.length < 4) { m('Новый пароль — не короче 4 символов.'); break; } if (a !== $('#pf-n2').value) { m('Пароли не совпадают.'); break; }
      PROFILE = acctSetPw(PROFILE.id, a); render(); toast('Пароль изменён'); break; }
    case 'pf-del': { const pw = prompt('Удалить учётную запись и все её результаты с этого устройства? Для подтверждения введи пароль.');
      if (pw == null) break; if (!acctCheck(PROFILE, pw)) { toast('Неверный пароль — учётная запись не удалена.', 'bad'); break; }
      const id = PROFILE.id; store.set(PKEY, profiles().filter(x => x.id !== id)); labNums().forEach(n => store.del(LABS[n].key(id))); store.del(testKey(id));
      PROFILE = null; SCREEN = 'home'; render(); toast('Учётная запись удалена'); break; }
    case 'import': { const i = $('#file-in'); i.value = ''; i.click(); break; }
    case 'home': closeSheet(); if (TQ && !TQ.done && TQ.kind === 'exam') break; PROFILE = null; L3S = null; LES = null; TQ = null; SCREEN = 'home'; AUTH = 'in'; render(); scrollTo(0, 0); break;
    case 'aq': AQ = Math.max(0, Math.min(7, +d.v)); render(); scrollTo(0, 0); break;
    case 'cqq': CQ = Math.max(0, Math.min(7, +d.v)); render(); scrollTo(0, 0); break;
    case 'ctab': CTAB = d.v; render(); scrollTo(0, 0); break;
    case 'zoom': ZOOM = !ZOOM; render(); break;
    case 'theory': TTAB = TTAB || 'theory'; showTheory(); break;
    case 'ttab': TTAB = d.v; showTheory(); break;
    case 'hod': showHod(); break;
    case 'menu': showMenu(); break;
    case 'summary': openSummary(); break;
    case 'send': closeSheet(); sendWork(); break;
    case 'pdf': printReport(); break;
    case 'theme': closeSheet(); setTheme(isLight() ? 'dark' : 'light'); break;
    case 'intro': showIntro(0); break;
    case 'intro-next': if (INTRO_AT < INTRO.length - 1) showIntro(INTRO_AT + 1); else closeSheet(); break;
    case 'sclose': closeSheet(); if (SCREEN === 'work') { const L = curLab(), S = L.S(); if (S && L.steps[S.step][0] === 'report') $('#printroot').innerHTML = L.report(); } break;
  }
});
// ответ на вопрос — сам переходит к следующему без ответа
document.addEventListener('click', e => {
  const b = e.target.closest && e.target.closest('[data-l3="admit"],[data-l3="cq"]'); if (!b) return;
  const adm = b.dataset.l3 === 'admit', list = adm ? L3_ADMIT : L3_CQ;
  setTimeout(() => { const S = L3S; if (!S) return; const ans = adm ? S.admit : S.cq, cur = adm ? AQ : CQ;
    let nx = list.findIndex((_, j) => j > cur && !ans[j]); if (nx < 0) nx = list.findIndex((_, j) => !ans[j]);
    if (nx >= 0 && nx !== cur) { if (adm) AQ = nx; else CQ = nx; render(); scrollTo(0, 0); } }, 260);
});
// учёт попыток (для преподавателя) — до обработчика ядра, как в программе для Windows
document.addEventListener('click', e => {
  const b = e.target.closest && e.target.closest('[data-l3]'); if (!b || !L3S || !L3S.dx) return;
  const k = { admitCheck: 'admitTries', pcheck: 'procTries', cqCheck: 'cqTries' }[b.dataset.l3]; if (k) L3S.dx[k] = (L3S.dx[k] || 0) + 1;
  if (b.dataset.l3 === 'cqCheck' && !L3S.dx.finished) setTimeout(() => { if (L3S && L3S.done && !L3S.dx.finished) { L3S.dx.finished = new Date().toISOString(); l3Save(); } }, 0);
  if (['admitCheck', 'cqCheck', 'next', 'go', 'restart'].includes(b.dataset.l3)) setTimeout(() => { scrollTo(0, 0); }, 0);
}, true);
// ошибки в ячейках обработки — счётчик для примера расчёта (пустая ячейка — не ошибка)
document.addEventListener('click', e => {
  const b = e.target.closest && e.target.closest('[data-l3="pcheck"]'); if (!b) return;
  setTimeout(() => { const S = L3S; if (!S || !S.dx) return; S.dx.pk = S.dx.pk || {}; L3_KEYS.forEach(k => { if (S.procOk[k] === false && String(S.proc[k] ?? '').trim()) S.dx.pk[k] = (S.dx.pk[k] || 0) + 1; }); l3Save(); render(); }, 0);
});
// шапка отчёта меняется — обновить лист
document.addEventListener('input', e => {
  const k = e.target.dataset && e.target.dataset.k3; if (!k || !['fio', 'group', 'date'].includes(k)) return;
  clearTimeout(window.__rep); window.__rep = setTimeout(() => { const html = l3ReportHtml(), p = $('#m-paper .lwr'); if (p) { p.innerHTML = html; fitPaper(); } $('#printroot').innerHTML = html; }, 300);
});
document.addEventListener('keydown', e => {
  if (e.key !== 'Enter') return;
  const go = { 'np-fio': '#np-group', 'np-group': '#np-pw', 'np-pw': '#np-pw2', 'au-n1': '#au-n2' }[e.target.id];
  if (go) { e.preventDefault(); $(go).focus(); }
  else if (['np-pw2', 'au-pw', 'au-n2'].includes(e.target.id)) { e.preventDefault(); const b = $('[data-m="register"],[data-m="login"],[data-m="setpw"]'); if (b) b.click(); }
  else if (e.target.dataset && e.target.dataset.k3 === 'ch') { e.preventDefault(); const r = $('[data-l3^="rec"]'); if (r) r.click(); }
});
document.addEventListener('contextmenu', e => { if (!(e.target.closest && e.target.closest('input,textarea'))) e.preventDefault(); });
addEventListener('blur', () => { L3V.pump = false; });
document.addEventListener('visibilitychange', () => { if (document.hidden) L3V.pump = false; });

/* ---------- системная кнопка «Назад» ---------- */
try {
  const APP = plug('App');
  if (APP) APP.addListener('backButton', () => {
    if (!$('#sheet').hidden) return closeSheet();
    if (SCREEN === 'test') { const q = $('[data-fz="quit"],[data-fz="back"]'); if (q) q.click(); return; }
    if (SCREEN === 'work') { SCREEN = 'labs'; PAGE = 'labs'; render(); return; }
    if (SCREEN === 'labs' && PAGE !== 'main') { PAGE = ['profile', 'about'].includes(PAGE) ? 'more' : 'main'; render(); return; }
    if (SCREEN === 'labs') { APP.exitApp(); return; }
    APP.exitApp();
  }).catch(() => {});
} catch (e) {}

render();
