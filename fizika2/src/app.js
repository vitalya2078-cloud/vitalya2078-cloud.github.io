'use strict';
/* Lab visuals refresh: topic-specific experiment scenes and apparatus cards. */
/* ---------- Физика по учебнику: уроки с роликами, карточки, симуляции, проверки, опыт, уровни, комбо ---------- */
const $ = (s, r = document) => r.querySelector(s);
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const nl = s => esc(s).replace(/\n/g, '<br>');
// вектор: буква + U+20D7 → буква со стрелкой (шрифты телефонов часто не ставят стрелку над буквой)
const vx = s => esc(s).replace(/(.)\u20D7/gu, '<span class="vec">$1</span>');
const nlv = s => vx(s).replace(/\n/g, '<br>');
const f1 = (v, d = 1) => (Math.round(v * 10 ** d) / 10 ** d).toString().replace('.', ',');
const plural = (n, a, b, c) => n + ' ' + (n % 10 === 1 && n % 100 !== 11 ? a : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20) ? b : c);
const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.random() * (i + 1) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; };
const mmss = s => Math.floor(s / 60) + ':' + String(Math.floor(s % 60)).padStart(2, '0');
const buzz = ms => { try { navigator.vibrate && navigator.vibrate(ms); } catch (e) {} };
const dayKey = (d = new Date()) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');

/* ---------- профиль игрока ---------- */
const S0 = { name: '', ava: 0, xp: 0, days: [], combo: 0, bestCombo: 0, ok: 0, tot: 0, lessons: {}, steps: {}, boss: {}, badges: [], sci: [], xpDay: { d: '', xp: 0 }, wrong: [] };
let S = (() => { try { return Object.assign({}, S0, JSON.parse(localStorage.getItem('f2') || '{}')); } catch (e) { return Object.assign({}, S0); } })();
const save = () => { try { localStorage.setItem('f2', JSON.stringify(S)); } catch (e) {} };

/* ---------- уровни ---------- */
const TITLES = [[1, 'Наблюдатель'], [5, 'Экспериментатор'], [10, 'Исследователь'], [15, 'Инженер'], [20, 'Теоретик'], [25, 'Академик']];
const needFor = l => 100 + 40 * (l - 1); // опыта от уровня l до l+1
function levelOf(xp) { let l = 1, left = xp; while (left >= needFor(l)) { left -= needFor(l); l++; } return { l, cur: left, need: needFor(l), title: TITLES.filter(t => l >= t[0]).pop()[1] }; }
const DAY_GOAL = 50;
function markDay() { const k = dayKey(); if (S.days[S.days.length - 1] !== k) { S.days.push(k); S.days = S.days.slice(-200); } }
function streak() { const d = new Set(S.days), x = new Date(); let n = 0; if (!d.has(dayKey(x))) x.setDate(x.getDate() - 1); while (d.has(dayKey(x))) { n++; x.setDate(x.getDate() - 1); } return n; }
const xpToday = () => S.xpDay.d === dayKey() ? S.xpDay.xp : 0;
function addXP(n, why) {
  if (n <= 0) return;
  const before = levelOf(S.xp).l, goalBefore = xpToday() >= DAY_GOAL;
  S.xp += n; S.xpDay = { d: dayKey(), xp: xpToday() + n }; markDay();
  if (!goalBefore && xpToday() >= DAY_GOAL) { S.xp += 30; S.xpDay.xp += 30; setTimeout(() => toast(ic('target') + 'Цель дня выполнена · +30 XP', 'gold'), 900); }
  save(); floatXP(n, why); hdrUpd();
  const after = levelOf(S.xp).l; if (after > before) setTimeout(() => levelUp(after), 600);
  checkBadges();
}

/* ---------- комбо: подряд верные ответы умножают опыт ---------- */
const mult = c => c >= 10 ? 4 : c >= 6 ? 3 : c >= 3 ? 2 : 1;
function comboAnswer(ok) {
  S.tot++; if (ok) { S.ok++; S.combo++; if (S.combo > S.bestCombo) S.bestCombo = S.combo; } else S.combo = 0;
  const m = mult(S.combo), gained = ok ? 5 * m : 0; save();
  if (ok && [3, 6, 10].includes(S.combo)) toast(ic('flame') + `Комбо ×${m}! ${S.combo} подряд`, 'fire');
  return gained;
}
const comboChip = () => `<span class="combo${S.combo >= 3 ? ' hot' : ''}" id="combo">${ic('flame')}<b>${S.combo}</b>${S.combo >= 3 ? `<i>×${mult(S.combo)}</i>` : ''}</span>`;

/* ---------- значки ---------- */
const BADGES = [
  ['first', 'Первый шаг', 'Пройди первый урок', s => Object.keys(s.lessons).length >= 1],
  ['ch1', 'Кинематик', 'Пройди финальное испытание главы 1', s => s.boss[1] >= 80],
  ['c5', 'Разогрев', 'Комбо из 5 ответов', s => s.bestCombo >= 5],
  ['c10', 'В ударе', 'Комбо из 10 ответов', s => s.bestCombo >= 10],
  ['c20', 'Неудержимый', 'Комбо из 20 ответов', s => s.bestCombo >= 20],
  ['st3', 'Три дня подряд', 'Занимайся 3 дня подряд', () => streak() >= 3],
  ['st7', 'Неделя физики', 'Занимайся 7 дней подряд', () => streak() >= 7],
  ['lv5', 'Экспериментатор', 'Достигни 5 уровня', s => levelOf(s.xp).l >= 5],
  ['q100', 'Сотня', 'Ответь на 100 вопросов', s => s.tot >= 100],
  ['perfect', 'Без единой ошибки', 'Пройди проверку урока на 100%', s => Object.values(s.lessons).some(l => l.best === 100)],
  ['q50', 'Практик', 'Ответь на 50 вопросов', s => s.tot >= 50],
  ['xp500', 'Энергия знаний', 'Набери 500 XP', s => s.xp >= 500],
  ['l10', 'Путь исследователя', 'Пройди 10 уроков', s => Object.keys(s.lessons).length >= 10],
  ['perfect5', 'Точность', 'Пять раз пройди урок без ошибок', s => Object.values(s.lessons).filter(l => l.best === 100).length >= 5]
];
function checkBadges() {
  BADGES.forEach(([id, t, , f]) => { if (!S.badges.includes(id) && f(S)) { S.badges.push(id); save(); setTimeout(() => toast(ic('award') + 'Новый значок: ' + t, 'gold'), 1200); } });
}

/* ---------- всплывашки ---------- */
function toast(html, kind = '') { const t = document.createElement('div'); t.className = 'toast ' + kind; t.innerHTML = html; $('#toasts').appendChild(t); setTimeout(() => t.classList.add('out'), 2300); setTimeout(() => t.remove(), 2800); }
function floatXP(n) { const f = document.createElement('div'); f.className = 'fxp'; f.textContent = '+' + n + ' XP'; document.body.appendChild(f); setTimeout(() => f.remove(), 1200); }
function levelUp(l) { const L = levelOf(S.xp); sheet(`<div class="lvup"><div class="lvnum">${l}</div><b>Новый уровень!</b><p>Ты теперь — <b>${L.title}</b>. До следующего уровня ${L.need} XP.</p><button class="btn wide" data-act="closeSheet">Дальше</button></div>`); buzz([20, 60, 20]); }
function sheet(html) { const s = $('#sheet'); s.innerHTML = `<div class="sbox">${html}</div>`; s.hidden = false; }
const closeSheet = () => { const s = $('#sheet'); s.hidden = true; s.innerHTML = ''; };

/* ---------- маршруты ---------- */
// '' главная · book учебник · c1 глава · l1-2 урок · boss1 финал главы · train тренировка · quiz идёт проверка · profile профиль
function route() {
  const h = location.hash.replace(/^#/, ''); let m;
  if ((m = /^c(\d+)$/.exec(h))) return { name: 'chapter', ch: +m[1], tab: 'book', parent: 'book' };
  if ((m = /^l(\d+)-(\d+)$/.exec(h))) return { name: 'lesson', ch: +m[1], li: +m[2], tab: 'book', parent: 'c' + m[1] };
  if (h === 'quiz') return { name: 'quiz', tab: '', parent: '' };
  if (h === 'lab') return { name: 'lab', tab: 'lab' };
  if (h === 'sandbox') return { name: 'sandbox', tab: 'lab', parent: 'lab' };
  if (h === 'reader') return { name: 'reader', tab: 'book', parent: 'home' };
  if ((m = /^read-(\d+)$/.exec(h))) return { name: 'readerChapter', ch: +m[1], tab: 'book', parent: 'reader' };
  if (h === 'lab-games') return { name: 'labGames', tab: 'lab', parent: 'lab' };
  if (h === 'game-bridge') return { name: 'bridgeGame', tab: 'lab', parent: 'lab-games' };
  if ((m = /^lab-ch-(\d+)$/.exec(h))) return { name: 'labChapter', ch: +m[1], tab: 'lab', parent: 'lab' };
  if ((m = /^lab-topic-(\d+)-(\d+)$/.exec(h))) return { name: 'labTopic', ch: +m[1], topic: +m[2], tab: 'lab', parent: 'lab-ch-' + m[1] };
  if ((m = /^lab-exp-([a-z0-9-]+)$/.exec(h))) return { name: 'labExp', exp: m[1], tab: 'lab', parent: 'lab-topic-' + ((LABS[m[1]]||{}).ch||1) + '-' + ((LABS[m[1]]||{}).topic||1) };
  if ((m = /^lab-(spring|pendulum|fall|projectile|incline|wave|ohm|refraction|buoyancy|gas)$/.exec(h))) return { name: 'labExp', exp: LAB_LEGACY_MAP[m[1]] ? LAB_LEGACY_MAP[m[1]] : m[1], tab: 'lab', parent: 'lab' };
  if (['book', 'train', 'profile'].includes(h)) return { name: h, tab: h };
  return { name: 'home', tab: 'home' };
}
let SB = null; // initialized before the first route render; sandbox module assigns its state here.
const ui = {};
let lastHash = null, same = false;
function render() {
  stopLoops();
  if (typeof LAB !== 'undefined' && LAB.run && !location.hash.startsWith('#lab-exp-')) labStop('Пауза');
  const r = route(), y = ui.main.scrollTop; same = lastHash === location.hash; lastHash = location.hash;
  document.body.dataset.view = r.name;
  ui.tabs.querySelectorAll('a').forEach(a => a.classList.toggle('on', a.dataset.tab === r.tab));
  ui.tabs.hidden = r.name === 'quiz' || r.name === 'lesson';
  ({ home: vHome, book: vBook, chapter: vChapter, lesson: vLesson, quiz: vQuiz, train: vTrain, lab: vLab, labGames: vLabGames, labChapter: vLabChapter, labTopic: vLabTopic, labExp: vLabExp, profile: vProfile, bridgeGame: vBridgeGame, sandbox: vSandbox, reader: vReader, readerChapter: vReaderChapter })[r.name](r);
  if (same) ui.main.scrollTop = y; else ui.main.scrollTop = 0;
}
function frame(title, { back = false, sub = '' } = {}) {
  ui.ttl.innerHTML = title + (sub ? `<small>${sub}</small>` : ''); ui.back.hidden = !back; hdrUpd();
}
function hdrUpd() { const L = levelOf(S.xp); ui.lv.innerHTML = `<span class="lvb">${L.l}</span><span class="lvbar"><i style="width:${L.cur / L.need * 100}%"></i></span>`; }
function setMain(html) { ui.main.innerHTML = html; ui.main.classList.remove('enter'); if (!same) { void ui.main.offsetWidth; ui.main.classList.add('enter'); } }

/* ---------- данные уроков ---------- */
const chReady = n => !!CONTENT[n];
const lessonKey = (ch, li) => ch + '-' + li;
const lessonDone = (ch, li) => !!S.lessons[lessonKey(ch, li)];
function nextLesson() {
  for (const ch of CHAPTERS) { const C1 = CONTENT[ch.n]; if (!C1) continue; const i = C1.lessons.findIndex((_, k) => !lessonDone(ch.n, k + 1)); if (i >= 0) return { ch, C1, li: i + 1, L: C1.lessons[i] }; if (!(S.boss[ch.n] >= 80)) return { ch, C1, boss: true }; }
  return null;
}
const chapterProgress = n => { const C1 = CONTENT[n]; if (!C1) return 0; const d = C1.lessons.filter((_, k) => lessonDone(n, k + 1)).length + (S.boss[n] >= 80 ? 1 : 0); return d / (C1.lessons.length + 1); };

/* ---------- Главная ---------- */
function vHome() {
  frame('Физика');
  const L = levelOf(S.xp), st = streak(), nx = nextLesson(), today = xpToday(), gp = Math.min(1, today / DAY_GOAL);
  const hi = S.name ? `Привет, ${esc(S.name)}!` : 'Привет!';
  let cont = '';
  if (nx && !nx.boss) cont = `<a class="cont" href="#l${nx.ch.n}-${nx.li}"><span class="cart">${chapterArt(nx.ch)}</span><span class="ctx"><small>Глава ${nx.ch.n} · ${esc(nx.L.par)}</small><b>${esc(nx.L.title)}</b><span class="cbtn">${ic('play')}Продолжить</span></span></a>`;
  else if (nx) cont = `<button class="cont" data-act="boss" data-ch="${nx.ch.n}"><span class="cart">${chapterArt(nx.ch)}</span><span class="ctx"><small>Глава ${nx.ch.n}</small><b>Финальное испытание</b><span class="cbtn">${ic('swords')}В бой</span></span></button>`;
  setMain(`<section class="hello"><a href="#profile" class="hava">${avatarSvg(S.ava, 52)}</a><div><h1>${hi}</h1><p>${esc(L.title)} · уровень ${L.l}</p></div></section>` +
    `<section class="card lvcard"><div class="row"><b>${S.xp} XP</b><small>до уровня ${L.l + 1}: ${L.need - L.cur} XP</small></div><div class="bar"><i style="width:${L.cur / L.need * 100}%"></i></div></section>` +
    cont +
    `<section class="duo"><div class="card goal">${ring(gp)}<div><b>Цель дня</b><small>${today} / ${DAY_GOAL} XP</small></div></div><div class="card goal">${ic('flame', 'big fire')}<div><b>${st ? plural(st, 'день', 'дня', 'дней') : 'Нет серии'}</b><small>серия</small></div></div></section>` +
    `<a class="reader-hero" href="#reader" style="display:flex;align-items:center;gap:14px;margin:14px 0;padding:16px;border:1px solid #3c7180;border-radius:18px;background:linear-gradient(115deg,#142d40,#1a3b4a 65%,#203457);color:#eefaff;text-decoration:none;box-shadow:0 8px 24px #06101d44"><span style="display:grid;place-items:center;flex:0 0 48px;height:48px;border-radius:15px;background:#245363;color:#9ef0e8">${ic('book-open')}</span><span style="display:flex;flex-direction:column;gap:4px;min-width:0"><small style="font-size:9px;letter-spacing:1.5px;color:#91dcd9;font-weight:800">БОЛЬШОЙ ЧИТАТЕЛЬ</small><b style="font-size:16px">Конспекты по физике</b><em style="font-size:12px;color:#b7cdd8;font-style:normal">Формулы, схемы и удобное чтение</em></span><span style="margin-left:auto;color:#a9dfe1">${ic('chevron-right')}</span></a>`+
     `<section class="card qk"><button data-act="warm" class="qrow">${ic('zap')}<span><b>Разминка</b><small>10 вопросов из базы экзамена, комбо умножает опыт</small></span>${ic('chevron-right')}</button>` +
    `<a href="#book" class="qrow">${ic('book-open')}<span><b>Учебник</b><small>7 частей, 33 главы · открыта глава 1</small></span>${ic('chevron-right')}</a></section>`);
}
function ring(f) { const r = 26, L = 2 * Math.PI * r; return `<svg class="ring" viewBox="0 0 64 64"><circle cx="32" cy="32" r="${r}" stroke="var(--line)" stroke-width="7" fill="none"/><circle cx="32" cy="32" r="${r}" stroke="var(--gold)" stroke-width="7" fill="none" stroke-linecap="round" stroke-dasharray="${L}" stroke-dashoffset="${L * (1 - f)}" transform="rotate(-90 32 32)"/></svg>`; }

/* ---------- Учебник ---------- */
function vBook() {
  frame('Учебник', { sub: 'по курсу физики Т. И. Трофимовой' });
  setMain(PARTS.map(P => {
    const chs = CHAPTERS.filter(c => c.part === P.n);
    return `<section class="part" style="--pc:${P.col}"><div class="ph"><span class="pn">Часть ${P.n}</span><h2>${esc(P.title)}</h2></div>` +
      chs.map(ch => {
        const ready = chReady(ch.n), pr = chapterProgress(ch.n);
        return `<${ready ? `a href="#c${ch.n}"` : 'div'} class="chrow${ready ? '' : ' soon'}"><span class="cthumb">${chapterArt(ch)}</span><span class="cinfo"><small>Глава ${ch.n} · § ${ch.a}–${ch.b}</small><b>${esc(ch.title)}</b>${ready ? `<span class="pbar"><i style="width:${pr * 100}%"></i></span>` : '<span class="tag">скоро</span>'}</span>${ready ? ic('chevron-right') : ic('lock', 'mute')}</${ready ? 'a' : 'div'}>`;
      }).join('') + '</section>';
  }).join(''));
}


/* ---------- Читатель конспектов по учебнику ---------- */
const READER_NOTES = {
  2: {
    lead: 'Как силы изменяют движение тел и почему тело сохраняет скорость, пока равнодействующая сил равна нулю.',
    sections: [
      {h:'Первый закон Ньютона. Инерция',p:'Тело сохраняет состояние покоя или равномерного прямолинейного движения, если внешние воздействия не заставляют его изменить это состояние. Это свойство называется инертностью. Закон формулируется для инерциальных систем отсчёта.',formula:'ΣF = 0  ⇒  a = 0',note:'Нулевое ускорение означает постоянную скорость, а не обязательно покой.'},
      {h:'Инерциальные системы отсчёта',p:'Инерциальной называют систему, в которой свободное тело покоится или движется равномерно и прямолинейно. Система, связанная с Землёй, во многих инженерных задачах считается приближённо инерциальной: небольшими эффектами вращения Земли пренебрегают.'},
      {h:'Масса и сила',p:'Масса характеризует инертные свойства тела: чем больше масса, тем меньше изменение скорости при одном и том же воздействии. Сила — векторная мера механического воздействия. Она может изменять скорость тела или вызывать деформацию. Силу характеризуют модуль, направление и точка приложения.',formula:'[F] = Н = кг·м/с²'},
      {h:'Второй закон Ньютона',p:'Ускорение тела прямо пропорционально равнодействующей сил и обратно пропорционально массе. В уравнение входит именно векторная сумма всех сил, приложенных к телу. Закон применяют в инерциальной системе отсчёта.',formula:'ΣF⃗ = m a⃗',note:'Перед подстановкой выбери оси и разложи силы на проекции. Знаки проекций определяются выбранными положительными направлениями.'},
      {h:'Импульс тела',p:'Импульс — векторная величина, равная произведению массы на скорость. Его направление совпадает с направлением скорости. Общая формулировка второго закона Ньютона связывает силу со скоростью изменения импульса.',formula:'p⃗ = m v⃗     ·     F⃗ = dp⃗/dt',note:'При постоянной массе F⃗ = m a⃗. Единица импульса — кг·м/с.'},
      {h:'Принцип независимости действия сил',p:'Если на тело одновременно действуют несколько сил, результат определяется их равнодействующей — геометрической суммой. Каждая сила вносит свой вклад в ускорение.',formula:'F⃗рез = F⃗₁ + F⃗₂ + … + F⃗ₙ'},
      {h:'Третий закон Ньютона',p:'Тела взаимодействуют попарно: силы, с которыми два тела действуют друг на друга, равны по модулю, противоположны по направлению и лежат на одной прямой. Эти силы приложены к разным телам, поэтому не компенсируют друг друга в уравнении движения одного тела.',formula:'F⃗₁₂ = −F⃗₂₁',note:'Не путай пару действия и противодействия с двумя силами, приложенными к одному телу.'},
      {h:'Силы трения',p:'Трение препятствует относительному скольжению соприкасающихся поверхностей. Различают трение покоя, скольжения и качения; внутреннее трение возникает между слоями жидкости или газа. Для сухого трения скольжения в рассматриваемой модели сила пропорциональна нормальной реакции опоры.',formula:'Fтр = μN',note:'Коэффициент μ зависит от материалов и состояния поверхностей. Сила трения направлена против относительного движения или его возможного начала.'},
      {h:'Импульс системы и его сохранение',p:'Для системы тел различают внутренние силы взаимодействия между её частями и внешние силы со стороны окружающих тел. Внутренние силы попарно компенсируются в сумме для всей системы. Если равнодействующая внешних сил равна нулю, суммарный импульс системы остаётся постоянным.',formula:'P⃗ = Σ mᵢv⃗ᵢ = const  (ΣF⃗внеш = 0)',note:'Закон сохранения импульса применяют к замкнутой системе. Проекция импульса также сохраняется вдоль направления, в котором равнодействующая внешних сил равна нулю.'},
      {h:'Центр масс',p:'Центр масс — точка, положение которой отражает распределение массы системы. Для системы материальных точек его радиус-вектор равен взвешенному по массам среднему радиус-вектору.',formula:'r⃗с = (Σ mᵢr⃗ᵢ) / (Σ mᵢ)',note:'Для однородного симметричного тела центр масс совпадает с его геометрическим центром.'}
    ],
    summary:'Динамика связывает движение с причинами его изменения. Для решения задач сначала выдели тело, изобрази все действующие на него силы, выбери оси, запиши второй закон Ньютона в проекциях. Для системы тел проверь, можно ли применить закон сохранения импульса.'
  }
};
let readerFontSize = Number(localStorage.getItem('f2-reader-font') || 17);
function readerStyles(){return `<style>
.reader-shell{--reader-size:${readerFontSize}px;color:var(--text);max-width:820px;margin:0 auto}
.reader-top{position:sticky;top:0;z-index:8;display:flex;align-items:center;justify-content:space-between;gap:10px;padding:10px 12px;margin:-4px -4px 14px;background:color-mix(in srgb,var(--bg) 90%,transparent);backdrop-filter:blur(14px);border-bottom:1px solid var(--line)}
.reader-top a,.reader-top button,.reader-bottom button{border:1px solid var(--line);background:var(--card);color:var(--text);border-radius:12px;padding:9px 12px;font-weight:700;text-decoration:none}
.reader-progress{height:3px;background:var(--line);border-radius:4px;overflow:hidden;flex:1}.reader-progress i{display:block;height:100%;width:0;background:#64d7d9}
.reader-cover{padding:22px;border-radius:22px;background:linear-gradient(135deg,#172c45,#26365b 60%,#17434a);color:#f4f8ff;margin-bottom:16px}
.reader-cover small{letter-spacing:1.7px;color:#9de2e6;font-weight:800}.reader-cover h1{font-size:clamp(25px,6vw,38px);line-height:1.1;margin:12px 0}.reader-cover p{color:#c7d6e4;line-height:1.55;margin:0}
.reader-chapter{display:flex;align-items:center;gap:14px;padding:15px;margin:9px 0;border:1px solid var(--line);border-radius:16px;background:var(--card);color:var(--text);text-decoration:none}
.reader-chapter .num{width:42px;height:42px;display:grid;place-items:center;border-radius:13px;background:#213c50;color:#a5e6e7;font-weight:850}
.reader-chapter b{display:block;line-height:1.3}.reader-chapter small{display:block;color:var(--muted);margin-top:5px}
.reader-page{font-size:var(--reader-size);line-height:1.72;letter-spacing:.005em}
.reader-page h2{font-size:1.18em;line-height:1.3;margin:26px 0 8px;letter-spacing:-.02em}
.reader-page p{margin:0 0 12px;color:var(--text)}
.reader-formula{margin:13px 0 16px;padding:16px 12px;text-align:center;border:1px solid #426477;border-radius:15px;background:linear-gradient(135deg,#12283a,#172d40);color:#b9f1ed;font-size:1.05em;font-weight:750;letter-spacing:.02em;overflow-wrap:anywhere}
.reader-note{padding:12px 14px;border-left:3px solid #e7b45b;background:rgba(231,180,91,.09);border-radius:0 12px 12px 0;color:var(--muted);font-size:.91em;margin:14px 0}
.reader-figure{margin:18px 0;padding:14px;border:1px solid var(--line);border-radius:17px;background:var(--card)}
.reader-figure svg{display:block;width:100%;height:auto;max-height:210px}
.reader-figure figcaption{text-align:center;color:var(--muted);font-size:.8em;margin-top:8px}
.reader-summary{margin:22px 0;padding:18px;border-radius:18px;background:linear-gradient(135deg,rgba(76,180,171,.14),rgba(87,116,190,.12));border:1px solid rgba(90,190,180,.25)}
.reader-bottom{position:sticky;bottom:0;z-index:7;display:flex;gap:8px;justify-content:space-between;padding:10px 0;background:linear-gradient(180deg,transparent,var(--bg) 24%)}
.reader-bottom button{flex:1}
@media(max-width:600px){.reader-cover{padding:19px}.reader-top{margin:0 -10px 12px}.reader-bottom{padding-bottom:12px}.reader-page{line-height:1.7}}
</style>`}
function vReader(){
 frame('Читатель',{back:true,sub:'Конспекты по курсу Т. И. Трофимовой'});
 const chapters=CHAPTERS.filter(c=>c.n>=2);
 setMain(readerStyles()+`<div class="reader-shell"><section class="reader-cover"><small>ФИЗИКА · БОЛЬШОЙ ЧИТАТЕЛЬ</small><h1>Читай и понимай</h1><p>Удобные конспекты по главам: определения, физический смысл, формулы и схемы. Размер текста адаптируется под экран.</p></section><div class="reader-top"><a href="#book">← Учебник</a><div class="reader-progress"><i style="width:3%"></i></div><button data-act="readerFont" data-delta="-1" aria-label="Уменьшить шрифт">A−</button><button data-act="readerFont" data-delta="1" aria-label="Увеличить шрифт">A+</button></div><h2 class="sec">Содержание</h2>${chapters.map(c=>`<a class="reader-chapter" href="#read-${c.n}"><span class="num">${String(c.n).padStart(2,'0')}</span><span><b>${esc(c.title)}</b><small>Глава ${c.n} · § ${c.a}–${c.b} · ${c.n===2?'Конспект готов':'В очереди на конспект'}</small></span>${ic('chevron-right')}</a>`).join('')}</div>`);
}
function vReaderChapter(r){
 const c=CHAPTERS[r.ch-1], n=READER_NOTES[r.ch];
 if(!c){location.hash='reader';return}
 if(!n){frame('Читатель',{back:true,sub:'Глава '+r.ch});setMain(readerStyles()+`<div class="reader-shell"><section class="reader-cover"><small>СЛЕДУЮЩИЙ РАЗДЕЛ</small><h1>${esc(c.title)}</h1><p>Конспект этой главы будет добавлен по материалу соответствующих параграфов учебника.</p></section><a class="reader-chapter" href="#reader">← К содержанию</a></div>`);return}
 frame(c.title,{back:true,sub:'Глава '+c.n+' · § '+c.a+'–'+c.b});
 const cards=n.sections.map((x,i)=>`<section><h2>${i+1}. ${esc(x.h)}</h2><p>${esc(x.p)}</p>${x.formula?`<div class="reader-formula">${esc(x.formula)}</div>`:''}${x.note?`<div class="reader-note"><b>Важно:</b> ${esc(x.note)}</div>`:''}</section>`).join('');
 setMain(readerStyles()+`<article class="reader-shell reader-page" id="reader-article"><div class="reader-top"><a href="#reader">← Содержание</a><div class="reader-progress"><i id="reader-progress-fill"></i></div><button data-act="readerFont" data-delta="-1">A−</button><button data-act="readerFont" data-delta="1">A+</button></div><section class="reader-cover"><small>ЧАСТЬ I · МЕХАНИКА</small><h1>${esc(c.title)}</h1><p>${esc(n.lead)}</p></section><figure class="reader-figure"><svg viewBox="0 0 640 190" role="img" aria-label="Схема действия сил на тело"><defs><marker id="rarr" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0 0L6 3L0 6" fill="#6fe0d7"/></marker></defs><rect x="250" y="68" width="110" height="65" rx="12" fill="#24475c" stroke="#8bd9df" stroke-width="3"/><path d="M305 68V22" stroke="#6fe0d7" stroke-width="4" marker-end="url(#rarr)"/><path d="M360 100H470" stroke="#e9b45d" stroke-width="4" marker-end="url(#rarr)"/><path d="M305 133V174" stroke="#9b8df4" stroke-width="4" marker-end="url(#rarr)"/><text x="320" y="105" text-anchor="middle" fill="#f4fbff" font-size="17">m</text><text x="323" y="16" text-anchor="middle" fill="#6fe0d7" font-size="15">N</text><text x="480" y="105" fill="#e9b45d" font-size="15">F</text><text x="323" y="188" text-anchor="middle" fill="#9b8df4" font-size="14">mg</text></svg><figcaption>Схема сил, действующих на тело. В задаче учитывают все силы и их направления.</figcaption></figure>${cards}<section class="reader-summary"><b>Главное в главе</b><p>${esc(n.summary)}</p></section><div class="reader-bottom"><button data-act="readerPrev" data-v="${Math.max(2,r.ch-1)}">← Предыдущая</button><button data-act="readerNext" data-v="${Math.min(33,r.ch+1)}">Следующая →</button></div></article>`);
 const article=document.getElementById('reader-article'),main=document.getElementById('main'); if(article&&main){const update=()=>{const max=Math.max(1,article.offsetTop+article.scrollHeight-main.clientHeight);const p=Math.min(100,Math.max(0,Math.round(main.scrollTop/max*100)));const f=document.getElementById('reader-progress-fill');if(f)f.style.width=p+'%';};main.addEventListener('scroll',update,{passive:true});update();}
}

/* ---------- Глава ---------- */
function vChapter(r) {
  const ch = CHAPTERS[r.ch - 1], C1 = CONTENT[r.ch]; if (!C1) { location.hash = 'book'; return; }
  frame(`Глава ${ch.n}`, { back: true });
  const nowI = C1.lessons.findIndex((_, k) => !lessonDone(ch.n, k + 1));
  const nodes = C1.lessons.map((L, k) => {
    const d = S.lessons[lessonKey(ch.n, k + 1)], now = k === nowI;
    return `<a class="node${d ? ' done' : ''}${now ? ' now' : ''}" href="#l${ch.n}-${k + 1}"><span class="dot">${d ? ic('check') : k + 1}</span><span class="nl"><small>${esc(L.par)}</small><b>${esc(L.title)}</b>${d ? stars(d.stars) : `<small>${now ? 'следующий урок' : esc(L.lead)}</small>`}</span></a>`;
  }).join('<span class="conn"></span>');
  const bb = S.boss[ch.n];
  setMain(`<section class="chead"><div class="cart big">${chapterArt(ch, 360, 170)}</div><div class="chx"><small>Часть ${ch.part} · § ${ch.a}–${ch.b}</small><h1>${esc(ch.title)}</h1><div class="pbar"><i style="width:${chapterProgress(ch.n) * 100}%"></i></div></div></section>` +
    `<section class="path">${nodes}<span class="conn"></span><button class="node boss${bb >= 80 ? ' done' : ''}" data-act="boss" data-ch="${ch.n}"><span class="dot">${ic('swords')}</span><span class="nl"><small>финал главы · ${C1.boss.length} вопросов</small><b>Финальное испытание</b><small>${bb != null ? `лучший результат ${bb}%` : 'порог 80% · +150 XP'}</small></span></button></section>` +
    `<h2 class="sec">Учёные главы</h2><div class="sci">${C1.scientists.map(x => `<div class="scard${S.sci.includes(x.id) ? '' : ' locked'}"><b>${esc(x.name)}</b><small>${esc(x.years)}</small><p>${S.sci.includes(x.id) ? esc(x.fact) : 'Откроется после финального испытания главы'}</p></div>`).join('')}</div>` +
    `<button class="btn line wide mt" data-act="chQuiz" data-ch="${ch.n}">${ic('dumbbell')}Вопросы экзамена по главе</button>`);
}
const stars = n => `<span class="stars">${[1, 2, 3].map(i => ic('star', i <= n ? 'on' : '')).join('')}</span>`;

/* ---------- Урок: Ролик · Конспект · Практика · Проверка ---------- */
const STEPS = [['video', 'Ролик', 'clapperboard'], ['cards', 'Конспект', 'layers'], ['sim', 'Практика', 'sliders-horizontal'], ['quiz', 'Проверка', 'circle-check']];
const curStep = {};
function vLesson(r) {
  const ch = CHAPTERS[r.ch - 1], C1 = CONTENT[r.ch], L = C1 && C1.lessons[r.li - 1]; if (!L) { location.hash = 'c' + r.ch; return; }
  const key = lessonKey(r.ch, r.li), st = curStep[key] || 'video', done = S.steps[key] || {};
  frame(esc(L.title), { back: true, sub: `Глава ${ch.n} · ${esc(L.par)}` });
  const tabs = `<div class="steps">${STEPS.map(([k, t, i]) => `<button data-act="step" data-v="${k}" class="${k === st ? 'on' : ''}${done[k] ? ' ok' : ''}">${ic(done[k] ? 'check' : i)}<span>${t}</span></button>`).join('')}</div>`;
  if (st === 'video') { setMain(tabs + videoBox(r.ch, L)); videoInit(r.ch, r.li, L); }
  else if (st === 'cards') { setMain(tabs + cardsBox(L)); cardsInit(key); }
  else if (st === 'sim') { setMain(tabs + `<div id="simbox"></div>`); simStart(SIMS[L.sim], key); }
  else setMain(tabs + `<section class="card center"><div class="qic">${ic('circle-check', 'big')}</div><b class="h">Проверка по уроку</b><p class="mute">${plural(L.quiz.length, 'вопрос', 'вопроса', 'вопросов')} с объяснениями. Верные ответы подряд — комбо и больше опыта.${S.lessons[key] ? ` Лучший результат: ${S.lessons[key].best}%.` : ''}</p><button class="btn wide" data-act="lessonQuiz" data-ch="${r.ch}" data-li="${r.li}">Начать проверку</button></section>`);
}
function stepDone(key, k, xp) { const d = S.steps[key] || (S.steps[key] = {}); if (!d[k]) { d[k] = 1; save(); addXP(xp); } }
const nextStepBtn = (k) => { const i = STEPS.findIndex(s => s[0] === k), n = STEPS[i + 1]; return n ? `<button class="btn wide mt" data-act="step" data-v="${n[0]}">Дальше: ${n[1]} ${ic('chevron-right')}</button>` : ''; };

/* ---------- ролик: сцены на холсте + озвучка, синхронно ---------- */
let V = null;
function videoBox(ch, L) {
  return `<section class="vid"><div class="vwrap"><canvas id="vc" width="960" height="540"></canvas><button class="vplay" data-act="vToggle" aria-label="Смотреть">${ic('play')}</button></div>` +
    `<div class="vctl"><button class="vb" data-act="vToggle" aria-label="Пауза/смотреть" id="vpp">${ic('play')}</button><div class="vseek" id="vseek"><i></i></div><span id="vtime">0:00</span><button class="vb" data-act="vCc" aria-label="Субтитры" id="vcc">${ic('captions')}</button></div>` +
    `<p class="vsub" id="vsub">${esc(L.video[0].t)}</p></section>` + nextStepBtn('video');
}
function videoInit(ch, li, L) {
  const id = `ch${ch}-l${li}`, meta = (typeof VOICE !== 'undefined' && VOICE[id]) || null;
  // без озвучки — свои часы по длине текста
  const starts = meta ? meta.starts : (() => { let t = 0; return L.video.map(s => { const a = t; t += Math.max(4, s.t.length / 14); return a; }); })();
  const dur = meta ? meta.dur : starts[starts.length - 1] + Math.max(4, L.video[L.video.length - 1].t.length / 14);
  V = { L, key: lessonKey(ch, li), starts, dur, t: 0, playing: false, audio: null, last: 0, cc: S.cc !== 0, raf: 0 };
  if (meta) { // файл целиком в память: перемотка работает на любом хостинге и без интернета
    const A = V.audio = new Audio(); A.addEventListener('ended', vEnd);
    V.ready = fetch('audio/' + id + '.mp3').then(r => { if (!r.ok) throw new Error(r.status); return r.blob(); }).then(b => { A.src = URL.createObjectURL(new Blob([b], { type: 'audio/mpeg' })); }).catch(() => { if (V && V.audio === A) V.audio = null; });
  }
  $('#vsub').hidden = !V.cc; vDraw();
}
function vSeg(t) { let i = 0; while (i + 1 < V.starts.length && t >= V.starts[i + 1]) i++; const a = V.starts[i], b = i + 1 < V.starts.length ? V.starts[i + 1] : V.dur; return { i, p: Math.min(1, (t - a) / (b - a)), lt: t - a }; }
function vDraw() {
  const cv = $('#vc'); if (!cv || !V) return; const c = cv.getContext('2d'), { i, p, lt } = vSeg(V.t);
  SCENES[V.L.video[i].s](c, 960, 540, p, lt);
  const sb = $('#vsub'); if (sb && sb.dataset.i !== String(i)) { sb.innerHTML = vx(V.L.video[i].t); sb.dataset.i = i; }
  const f = Math.min(1, V.t / V.dur); $('#vseek i').style.width = f * 100 + '%'; $('#vtime').textContent = mmss(V.t) + ' / ' + mmss(V.dur);
}
function vLoop(now) {
  if (!V || !V.playing) return;
  if (V.audio) V.t = V.audio.currentTime; else { V.t += (now - V.last) / 1000; V.last = now; if (V.t >= V.dur) { V.t = V.dur; vDraw(); return vEnd(); } }
  vDraw(); V.raf = requestAnimationFrame(vLoop);
}
async function vToggle() {
  if (!V) return;
  if (!V.playing && V.ready) { $('#vtime').textContent = 'загрузка…'; const v0 = V; await V.ready; if (V !== v0) return; }
  V.playing = !V.playing;
  if (V.t >= V.dur - 0.05) { V.t = 0; if (V.audio) V.audio.currentTime = 0; }
  if (V.playing) { V.last = performance.now(); if (V.audio) V.audio.play().catch(() => { V.audio = null; }); V.raf = requestAnimationFrame(vLoop); } else if (V.audio) V.audio.pause();
  $('.vplay').hidden = V.playing; $('#vpp').innerHTML = ic(V.playing ? 'pause' : 'play');
}
function vEnd() { if (!V) return; V.playing = false; $('.vplay') && ($('.vplay').hidden = false); $('#vpp') && ($('#vpp').innerHTML = ic('rotate-ccw')); stepDone(V.key, 'video', 10); }
function vSeek(e) { const b = $('#vseek'); if (!b || !V) return; const r = b.getBoundingClientRect(), f = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)); V.t = f * V.dur; if (V.audio) V.audio.currentTime = V.t; vDraw(); }
function stopLoops() { if (typeof sbStop === 'function') sbStop(); if (V) { V.playing = false; cancelAnimationFrame(V.raf); if (V.audio) V.audio.pause(); V = null; } if (G && G.raf) cancelAnimationFrame(G.raf); if (LAB && LAB.raf) { cancelAnimationFrame(LAB.raf); LAB.raf=0; LAB.run=false; LAB.paused=false; } }

/* ---------- карточки конспекта: листаются пальцем ---------- */
const KIND = { idea: ['Главное', 'var(--blue)'], def: ['Определение', 'var(--mint)'], formula: ['Формула', 'var(--gold)'], trap: ['Ловушка', 'var(--pink)'], ex: ['Пример', 'var(--violet)'] };
function cardsBox(L) {
  return `<div class="cards" id="cards">${L.cards.map((k, i) => `<article class="kcard"><span class="kind" style="--kc:${KIND[k.k][1]}">${KIND[k.k][0]}</span><h3>${vx(k.h)}</h3>${k.fig && FIGS[k.fig] ? FIGS[k.fig]() : ''}${k.f ? `<div class="formula">${k.f.split('\n').map(l => `<span>${vx(l)}</span>`).join('')}</div>` : ''}<p>${nlv(k.t)}</p><small class="kn">${i + 1} / ${L.cards.length}</small></article>`).join('')}</div>` +
    `<div class="dots" id="dots">${L.cards.map((_, i) => `<i class="${i ? '' : 'on'}"></i>`).join('')}</div><div class="cnav"><button class="btn line" data-act="cPrev">${ic('chevron-left')}</button><button class="btn wide" data-act="cNext" id="cnext">Дальше ${ic('chevron-right')}</button></div>`;
}
function cardsInit(key) {
  const box = $('#cards'); if (!box) return;
  box.addEventListener('scroll', () => {
    const i = Math.round(box.scrollLeft / box.clientWidth), n = box.children.length;
    $('#dots').querySelectorAll('i').forEach((d, k) => d.classList.toggle('on', k === i));
    $('#cnext').innerHTML = i >= n - 1 ? `Дальше: Практика ${ic('chevron-right')}` : `Дальше ${ic('chevron-right')}`;
    if (i >= n - 1) stepDone(key, 'cards', 15);
  }, { passive: true });
}

/* ---------- симуляции с кнопками − / + ---------- */
let G = null;
function simStart(sim, key) { G = { sim, key, round: 1, tries: 0, v: sim.param.init, res: null }; sim.newRound(G); simDraw(); }
function simDraw() {
  const { sim } = G, p = sim.param, f = d => (d > 0 ? '+' : '−') + String(Math.abs(d)).replace('.', ',');
  $('#simbox').innerHTML = `<section class="card sim"><div class="row"><b>${esc(sim.title)}</b><small>задание ${G.round} из ${sim.rounds}</small></div><p class="task">${esc(G.task)}</p><canvas id="sc" width="720" height="400"></canvas><p class="smsg ${G.res ? (G.res.ok ? 'ok' : 'bad') : ''}" id="smsg">${G.res ? esc(G.res.msg) : 'Меняй значение кнопками и жми «Проверить».'}</p>` +
    `<div class="stp"><div class="stp-h"><span>${esc(p.label)}</span><b id="sval">${p.fmt(G.v)}</b></div><div class="stp-b"><button data-step="${-p.big}">${f(-p.big)}</button><button class="m" data-step="${-p.step}">−</button><button class="m" data-step="${p.step}">+</button><button data-step="${p.big}">${f(p.big)}</button></div></div>` +
    `<button class="btn wide mt" data-act="simGo">Проверить</button></section>`;
  sim.draw($('#sc').getContext('2d'), 720, 400, G, G.v, 0);
  if (sim === SIMS.wheel) { const t0 = performance.now(); const spin = now => { if (!G || G.sim !== SIMS.wheel || !$('#sc')) return; sim.draw($('#sc').getContext('2d'), 720, 400, G, G.v, (now - t0) / 1000); G.raf = requestAnimationFrame(spin); }; G.raf = requestAnimationFrame(spin); }
}
const snap = (v, step, min, max) => { const d = (String(step).split('.')[1] || '').length; return +Math.max(min, Math.min(max, Math.round(v / step) * step)).toFixed(d); };
function simStep(d) { if (!G) return; const p = G.sim.param; G.v = snap(G.v + d, p.step, p.min, p.max); G.res = null; $('#sval').textContent = p.fmt(G.v); $('#smsg').className = 'smsg'; $('#smsg').textContent = 'Меняй значение кнопками и жми «Проверить».'; if (G.sim !== SIMS.wheel) G.sim.draw($('#sc').getContext('2d'), 720, 400, G, G.v, 0); }
function simGo() {
  G.tries++; const res = G.sim.check(G, G.v); G.res = res; const m = $('#smsg'); m.className = 'smsg ' + (res.ok ? 'ok' : 'bad'); m.textContent = res.msg;
  if (!res.ok) { buzz(25); return; }
  buzz([15, 40, 15]);
  if (G.round >= G.sim.rounds) { const key = G.key; setTimeout(() => { stepDone(key, 'sim', 20); $('#simbox').innerHTML = `<section class="card center">${ic('trophy', 'big gold')}<b class="h">Практика пройдена!</b><p class="mute">${G.sim.rounds} задания за ${plural(G.tries, 'попытку', 'попытки', 'попыток')}.</p></section>` + nextStepBtn('sim'); }, 700); return; }
  setTimeout(() => { if (!G) return; G.round++; G.res = null; G.sim.newRound(G); simDraw(); }, 1200);
}
let stepRep = null; const stepStop = () => { clearTimeout(stepRep); clearInterval(stepRep); stepRep = null; };
document.addEventListener('pointerdown', e => { const b = e.target.closest('[data-step]'); if (!b) return; e.preventDefault(); stepStop(); const go = () => simStep(+b.dataset.step); go(); stepRep = setTimeout(() => { stepRep = setInterval(go, 70); }, 380); });
['pointerup', 'pointercancel', 'pointerleave'].forEach(t => document.addEventListener(t, stepStop));

/* ---------- проверки: урок, финал главы, разминка, экзамен ---------- */
let Q = null;
function startQuiz(o) {
  Q = Object.assign({ i: 0, ok: 0, xp: 0, ans: null, wrong: [] }, o);
  Q.items = o.items.map(it => ({ ...it, opts: shuffle([it.a, ...it.x]) }));
  location.hash = 'quiz'; if (route().name === 'quiz') render();
}
function vQuiz() {
  if (!Q) { location.hash = ''; return; }
  frame(esc(Q.title), { sub: Q.i < Q.items.length ? `Вопрос ${Q.i + 1} из ${Q.items.length}` : 'Результат' });
  ui.back.hidden = false;
  if (Q.i >= Q.items.length) return quizEnd();
  const it = Q.items[Q.i], a = Q.ans;
  setMain(`<div class="qtop"><div class="qprog"><i style="width:${Q.i / Q.items.length * 100}%"></i></div>${comboChip()}</div>` +
    `<article class="qcard"><p class="qt">${vx(it.q)}</p>${it.p ? `<img class="qpic" src="${it.p}" alt="Рисунок к вопросу">` : ''}<div class="opts">${it.opts.map((o, k) => {
      const cls = a == null ? '' : o === it.a ? ' right' : k === a ? ' wrong' : ' dim';
      return `<button class="opt${cls}" data-act="pick" data-v="${k}"${a != null ? ' disabled' : ''}><span class="ln">${'АБВГДЕ'[k]}</span><span>${vx(o)}</span></button>`;
    }).join('')}</div>` +
    (a != null ? `<div class="verdict ${it.opts[a] === it.a ? 'ok' : 'bad'}"><b>${it.opts[a] === it.a ? 'Верно!' : 'Неверно'}</b>${it.e ? `<p>${vx(it.e)}</p>` : ''}</div><button class="btn wide mt" data-act="qNext">${Q.i + 1 < Q.items.length ? 'Следующий вопрос' : 'Результат'} ${ic('chevron-right')}</button>` : '') + `</article>`);
}
function qPick(k) {
  if (!Q || Q.ans != null) return; const it = Q.items[Q.i], ok = it.opts[k] === it.a; Q.ans = k;
  const g = comboAnswer(ok); if (ok) { Q.ok++; Q.xp += g; addXP(g); buzz(12); } else { Q.wrong.push(it); buzz([30, 40, 30]); if (it.key && !S.wrong.includes(it.key)) { S.wrong.push(it.key); save(); } }
  if (ok && it.key) { S.wrong = S.wrong.filter(x => x !== it.key); save(); }
  render();
}
function quizEnd() {
  const n = Q.items.length, pct = Math.round(Q.ok / n * 100), st = pct === 100 ? 3 : pct >= 75 ? 2 : pct >= 50 ? 1 : 0;
  let extra = '';
  if (!Q.saved) {
    Q.saved = true;
    if (Q.kind === 'lesson') { const k = Q.key, prev = S.lessons[k]; S.lessons[k] = { stars: Math.max(st, prev ? prev.stars : 0), best: Math.max(pct, prev ? prev.best : 0) }; S.steps[k] = Object.assign(S.steps[k] || {}, { quiz: 1 }); save(); if (!prev && pct >= 50) { addXP(50); extra = '+50 XP за урок'; } }
    if (Q.kind === 'boss') { const prev = S.boss[Q.ch]; S.boss[Q.ch] = Math.max(pct, prev || 0); if (pct >= 80 && !(prev >= 80)) { addXP(150); extra = '+150 XP за главу'; CONTENT[Q.ch].scientists.forEach(x => { if (!S.sci.includes(x.id)) S.sci.push(x.id); }); } save(); }
    if (Q.kind === 'exam') { Q.grade = pct >= 90 ? 5 : pct >= 75 ? 4 : pct >= 60 ? 3 : 2; }
    checkBadges();
  }
  const head = Q.kind === 'exam' ? `<div class="grade g${Q.grade}">${Q.grade}</div><b class="h">${pct} баллов из 100</b>` : `${stars(st)}<b class="h">${pct}% верно</b>`;
  const pass = Q.kind === 'boss' ? (pct >= 80 ? 'Глава пройдена! Учёные главы — в твоей коллекции.' : 'Нужно 80%. Повтори уроки и возвращайся.') : '';
  setMain(`<section class="card center res">${head}<p class="mute">Верно ${Q.ok} из ${n} · опыт +${Q.xp}${extra ? ' · ' + extra : ''}<br>Лучшее комбо: ${S.bestCombo}</p>${pass ? `<p>${pass}</p>` : ''}</section>` +
    (Q.wrong.length ? `<h2 class="sec">Разбор ошибок</h2>` + Q.wrong.map(w => `<article class="card werr"><p class="qt">${vx(w.q)}</p><p class="okans">${ic('check')}${vx(w.a)}</p>${w.e ? `<p class="mute">${vx(w.e)}</p>` : ''}</article>`).join('') : '') +
    `<div class="cnav two"><button class="btn line" data-act="qAgain">${ic('rotate-ccw')}Ещё раз</button><button class="btn wide" data-act="qDone">${Q.back ? 'Готово' : 'На главную'}</button></div>`);
}

/* ---------- Тренировка: 900 вопросов экзамена ---------- */
let BANK = null;
async function bank() { if (BANK) return BANK; let c = null; if (F2_IN_APP) { try { c = JSON.parse(localStorage.getItem('f2-content') || 'null'); } catch (e) {} } if (!c) c = await fetch('content.json').then(r => r.json()); BANK = []; c.topics.forEach(t => t.q.forEach((q, j) => { if (q.x && q.x.length) BANK.push({ key: t.id + '-' + (j + 1), tid: t.id, topicTitle: t.title, q: q.t, a: q.a, x: q.x, p: q.p ? 'pics/' + encodeURIComponent(q.p) : '', e: typeof q.e === 'string' ? q.e.replace('⚠', '') : q.e ? [q.e.i, q.e.r].filter(Boolean).join(' ') : '' }); })); return BANK; }
// привязка вопросов экзамена к главам учебника (пилот: глава 1 — кинематика)
// вопросы экзамена, отобранные вручную по главам учебника (номер темы-номер вопроса в базе)
const CH_KEYS = { 1: ['1-5', '1-6', '1-10', '1-19', '1-34', '1-45', '1-47', '1-58', '1-67', '1-68', '1-74', '1-80', '1-81', '1-82'] };
const CH_FILTER = Object.fromEntries(Object.entries(CH_KEYS).map(([n, ks]) => [n, it => ks.includes(it.key)]));
function vTrain() {
  frame('Тренировка', { sub: 'Выбирай формат и закрепляй знания' });
  setMain(`<section class="card hero2">${comboChip()}<b class="h">Тренируйся — получай опыт</b><p class="mute">3 верных ответа подряд — ×2, 6 — ×3, 10 — ×4. Ошибка сбрасывает комбо. Твой рекорд: ${S.bestCombo}.</p></section>` +
    `<h2 class="sec">Быстрый старт</h2><div class="tiles"><button class="tile" data-act="warm">${ic('zap', 'big blue')}<b>Разминка</b><small>10 случайных вопросов · 2–3 минуты</small></button><button class="tile" data-act="exam">${ic('graduation-cap', 'big gold')}<b>Пробный экзамен</b><small>30 вопросов · итоговая оценка</small></button>` +
    `<button class="tile" data-act="topics">${ic('layers', 'big mint')}<b>По темам</b><small>Выбери раздел физики и тренируйся точечно</small></button><button class="tile" data-act="errs">${ic('repeat', 'big pink')}<b>Разбор ошибок</b><small>${plural(S.wrong.length, 'вопрос', 'вопроса', 'вопросов')} ждут повторения</small></button></div>` +
    `<h2 class="sec">Практика по учебнику</h2><button class="qrow card" data-act="chQuiz" data-ch="1">${ic('target')}<span><b>Кинематика · глава 1</b><small>14 вопросов по пройденному материалу</small></span>${ic('chevron-right')}</button>`);
}


/* ---------- Виртуальная лаборатория: 35 самостоятельных опытов ---------- */
const LAB_LEGACY_MAP={spring:'spring-1',pendulum:'pendulum-1',fall:'freefall-1',projectile:'projectile-1',incline:'incline-1',wave:'wave-1',ohm:'ohm-1',refraction:'refraction-1',buoyancy:'buoyancy-1',gas:'gaspressure-1'};
let LAB={id:'uniform-1',a:4,b:5,va:4,vb:5,t:0,run:false,paused:false,raf:0,last:0,trace:[],lastSample:0};
const LAB_DONE=new Set((()=>{try{return JSON.parse(localStorage.getItem('f2-lab-done')||'[]')}catch(e){return []}})());
Object.entries(LAB_LEGACY_MAP).forEach(([oldId,newId])=>{if(LAB_DONE.has(oldId))LAB_DONE.add(newId)});
LAB_EXPERIMENTS.forEach(x=>{if([2,3,4,5].some(n=>LAB_DONE.has(x.topicId+'-'+n)))LAB_DONE.add(x.id)});
const labDoneCount=()=>LAB_EXPERIMENTS.reduce((n,x)=>n+(LAB_DONE.has(x.id)?1:0),0);
const labChapterCount=ch=>LAB_EXPERIMENTS.filter(x=>x.ch===ch).length;
const labTopic=(ch,n)=>LAB_TOPIC_GROUPS.find(x=>x.ch===ch&&x.n===n);
function labOpen(id){const x=LABS[id];if(!x)return;LAB={id:id,a:x.a0,b:x.b0,va:x.a0,vb:x.b0,t:0,run:false,paused:false,raf:0,last:0,trace:[],lastSample:0};location.hash='lab-exp-'+id;}
function labTabs(active='experiments'){return '<div class="lab-switch"><button class="btn '+(active==='experiments'?'active':'line')+'" data-act="lab" type="button">'+ic('sparkles')+' Опыты <small>'+LAB_EXPERIMENTS.length+'</small></button><button class="btn '+(active==='games'?'active':'line')+'" data-act="labGames" type="button">'+ic('swords')+' Игры <small>1</small></button></div>';}
function vLab(){
 frame('Лаборатория',{sub:'Опыты и игровые задания'});
 setMain(labTabs()+'<a class="lab-chapter" href="#sandbox" style="margin:12px 0;border-color:rgba(90,210,220,.35);background:linear-gradient(110deg,#132d3b,#172b3c)"><span class="lab-chapter-num">✦</span><span class="lab-chapter-copy"><b>Свободная лаборатория</b><small>Создавай установки, соединяй объекты и запускай физику без готового сценария</small></span><span class="lab-chapter-count">ОТКРЫТЬ</span>'+ic('chevron-right')+'</a><section class="lab-intro"><b class="h">Виртуальные опыты</b><p class="mute">7 глав · 35 тем · '+LAB_EXPERIMENTS.length+' самостоятельных опытов. Выбирай тему, меняй параметры и проверяй физические законы.</p><div class="lab-total"><b>'+labDoneCount()+'</b><span>из '+LAB_EXPERIMENTS.length+' опытов пройдено</span><i><em style="width:'+(labDoneCount()/LAB_EXPERIMENTS.length*100)+'%"></em></i></div></section><div class="lab-chapters">'+LAB_CHAPTERS.map(ch=>{const n=LAB_EXPERIMENTS.filter(x=>x.ch===ch.n&&LAB_DONE.has(x.id)).length,total=labChapterCount(ch.n);return '<a class="lab-chapter" href="#lab-ch-'+ch.n+'"><span class="lab-chapter-num">'+String(ch.n).padStart(2,'0')+'</span><span class="lab-chapter-copy"><b>'+esc(ch.title)+'</b><small>'+esc(ch.desc)+'</small><i><em style="width:'+(n/total*100)+'%"></em></i></span><span class="lab-chapter-count">'+n+'/'+total+'</span>'+ic('chevron-right')+'</a>'}).join('')+'</div>');
}
function vLabGames(){frame('Лаборатория',{back:true,sub:'Игры'});setMain(labTabs('games')+'<section class="bridge-lobby-v2"><div class="bridge-lobby-visual"><div class="bridge-visual-top"><span>PHYSICS LAB / FIELD OPS</span><b>01</b></div><svg viewBox="0 0 760 310" role="img" aria-label="Стальной мост над водой"><defs><linearGradient id="bridgeSky" x2="0" y2="1"><stop stop-color="#142d4b"/><stop offset="1" stop-color="#091522"/></linearGradient><linearGradient id="bridgeSteel"><stop stop-color="#6fe2c6"/><stop offset="1" stop-color="#4b88a7"/></linearGradient></defs><rect width="760" height="310" fill="url(#bridgeSky)"/><circle cx="600" cy="75" r="48" fill="#64d6ca" opacity=".08"/><path d="M0 210 Q180 185 360 215 T760 205 V310 H0Z" fill="#0b4056"/><path d="M0 245 Q180 230 360 248 T760 240" stroke="#4b9db0" opacity=".35" fill="none" stroke-width="3"/><path d="M55 195H705" stroke="#8ca5b8" stroke-width="13"/><path d="M55 184H705" stroke="#d5e7e8" stroke-width="3"/><g stroke="url(#bridgeSteel)" stroke-width="8" stroke-linecap="round" fill="none"><path d="M80 184L160 65 240 184 320 65 400 184 480 65 560 184 660 80"/><path d="M80 184L240 184 400 184 560 184 705 184"/><path d="M160 65V184M320 65V184M480 65V184M660 80V184"/></g><path d="M400 184L480 65" stroke="#ff9b61" stroke-width="10" stroke-linecap="round" stroke-dasharray="13 9"/><path d="M130 205h500" stroke="#e8bb70" stroke-width="2" stroke-dasharray="20 16"/><g transform="translate(345 143)"><rect width="92" height="30" rx="7" fill="#e9a84f"/><rect x="17" y="-16" width="38" height="19" rx="5" fill="#b9d4dd"/><circle cx="20" cy="31" r="10" fill="#101a2b"/><circle cx="72" cy="31" r="10" fill="#101a2b"/></g></svg><div class="bridge-visual-bottom"><span><i></i> LIVE INCIDENT</span><span>SECTOR 04 · BR-01</span></div></div><div class="bridge-lobby-copy-v2"><div class="bridge-lobby-meta"><span>ИНЖЕНЕРНЫЙ КВЕСТ</span><b><i></i> ДОСТУПНО</b></div><h2>Инженер катастроф</h2><p>Расследуй аварии, восстанавливай конструкции и проверяй свои решения в динамических испытаниях.</p><div class="bridge-lobby-mission"><span>ПЕРВАЯ МИССИЯ</span><b>Мост на грани обрушения</b><small>Механика · равновесие · прочность материалов</small></div><div class="bridge-lobby-foot"><span>◈ 3 ЭТАПА</span><span>◈ СЛОЖНОСТЬ: СРЕДНЯЯ</span><span>◈ 5–8 МИН</span></div><button type="button" class="btn wide bridge-lobby-cta" data-act="bridgeLaunch">Начать миссию <span aria-hidden="true">→</span></button></div></section>');}
function vLabChapter(r){
 const ch=LAB_CHAPTERS[r.ch-1];if(!ch){location.hash='lab';return;}
 const groups=LAB_TOPIC_GROUPS.filter(x=>x.ch===r.ch);
 frame('Глава '+ch.n,{back:true,sub:ch.title});
 setMain('<section class="lab-intro"><b class="h">'+esc(ch.title)+'</b><p class="mute">'+esc(ch.desc)+'</p><p class="mute">5 тем · '+labChapterCount(ch.n)+' самостоятельных опытов</p></section><div class="lab-topic-list">'+groups.map(g=>{const n=g.experiments.filter(x=>LAB_DONE.has(x.id)).length,total=g.experiments.length;return '<a class="lab-topic-card" href="#lab-topic-'+g.ch+'-'+g.n+'"><span class="lab-topic-index">ТЕМА '+g.n+'</span><b>'+esc(g.title)+'</b><small>'+esc(g.desc)+'</small><span class="lab-topic-foot"><i><em style="width:'+(n/total*100)+'%"></em></i><small>'+n+'/'+total+' пройдено</small>'+ic('chevron-right')+'</span></a>'}).join('')+'</div>');
}
function vLabTopic(r){
 const g=labTopic(r.ch,r.topic);if(!g){location.hash='lab-ch-'+r.ch;return;}
 frame(g.title,{back:true,sub:'Глава '+r.ch+' · Тема '+r.topic});
 setMain('<section class="lab-intro"><b class="h">'+esc(g.title)+'</b><p class="mute">'+esc(g.desc)+'</p><p class="mute">Самостоятельный эксперимент</p></section><div class="lab-experiment-list">'+g.experiments.map((x,i)=>'<button class="lab-experiment-card '+(LAB_DONE.has(x.id)?'done':'')+'" data-act="labOpen" data-v="'+x.id+'"><span class="lab-experiment-top"><span class="lab-experiment-icon">'+ic(['zap','target','sliders-horizontal','trophy','star'][i])+'</span><span class="lab-experiment-badge">Опыт '+(i+1)+'</span><span class="lab-experiment-status">'+(LAB_DONE.has(x.id)?ic('check'):ic('chevron-right'))+'</span></span><b>'+esc(x.title)+'</b><small>'+esc(x.task)+'</small></button>').join('')+'</div>');
}
function vLabExp(r){
 const x=LABS[r.exp];if(!x){location.hash='lab';return;}
 if(LAB.id!==r.exp)LAB={id:r.exp,a:x.a0,b:x.b0,va:x.a0,vb:x.b0,t:0,run:false,paused:false,completed:false,raf:0,last:0,trace:[],lastSample:0};
 const g=labTopic(x.ch,x.topic);
 frame(x.title,{back:true,sub:'Глава '+x.ch+' · '+(g?g.title:'Эксперимент')});
 const control=(key,label,value,unit,step,min,max)=>'<div class="lab-stepper"><span>'+esc(label)+'</span><div class="lab-stepper-row"><button type="button" data-act="labAdjust" data-key="'+key+'" data-delta="-1" aria-label="Уменьшить '+esc(label)+'">−</button><b id="lab-'+key+'v">'+f1(value,2)+' '+esc(unit)+'</b><button type="button" data-act="labAdjust" data-key="'+key+'" data-delta="1" aria-label="Увеличить '+esc(label)+'">+</button></div><small>Шаг '+f1(step,3)+' · '+f1(min,2)+'–'+f1(max,2)+' '+esc(unit)+'</small></div>';
 setMain('<section class="card lab-stage"><div class="lab-stage-head"><b>Модель эксперимента</b><span id="lab-state">Готов к запуску</span></div><canvas id="lab-canvas" width="720" height="300" aria-label="Анимация физического эксперимента"></canvas><div class="lab-actions"><button class="btn" data-act="labStart" id="lab-start">▶ Запустить</button><button class="btn line" data-act="labPause" id="lab-pause" disabled>Ⅱ Пауза</button><button class="btn line" data-act="labReset">↺ Сброс</button></div><p class="lab-hint" id="lab-hint">Запусти установку. Опыт завершится, когда будет выполнено исследовательское действие.</p></section>'+
 '<section class="card lab-controls"><div class="lab-section-title"><b>Настройка установки</b><small>Меняй значения кнопками − / +</small></div>'+control('a',x.a,LAB.a,x.uA,x.stA,x.amin,x.amax)+control('b',x.b,LAB.b,x.uB,x.stB,x.bmin,x.bmax)+'</section>'+
 '<section class="lab-metrics"><div class="card"><small id="lab-ml">Измеряемая величина</small><b id="lab-mv">—</b></div><div class="card"><small>Состояние установки</small><b id="lab-time">Готова</b></div></section>'+
 '<section class="card lab-meaning"><b>Задача исследования</b><p class="mute">'+esc(x.task)+'</p><div class="lab-setup-grid"><div><small>Оборудование</small><p>'+esc(x.apparatus)+'</p></div><div><small>Порядок опыта</small><p>'+esc(x.procedure)+'</p></div><div><small>На что обратить внимание</small><p>'+esc(x.observe)+'</p></div></div><b>Физическая модель</b><p class="mute">'+esc(x.desc)+'</p><div class="formula">'+esc(x.formula)+'</div></section>');
 labSetButtons();labDraw();labMetrics();
}
function labSetButtons(){const s=$('#lab-start'),p=$('#lab-pause');if(s){s.disabled=LAB.run||!!LAB.completed;s.classList.toggle('active',!LAB.run&&LAB.paused)}if(p){p.disabled=!LAB.run;p.classList.toggle('active',LAB.run)}}
function labStop(msg,paused=false){LAB.run=false;LAB.paused=paused;if(LAB.raf)cancelAnimationFrame(LAB.raf);LAB.raf=0;if(msg&&$('#lab-state'))$('#lab-state').textContent=msg;labSetButtons();}
function labResult(){
 const x=LABS[LAB.id],a=LAB.a,b=LAB.b,g=9.81;if(!x)return {label:'Результат',value:0,unit:''};
 let value=0,label='Результат',unit='';
 switch(x.model){
 case 'uniform':value=a*b;label='Пройденный путь';unit='м';break;
 case 'accelerated':value=a+5*b;label='Скорость через 5 с';unit='м/с';break;
 case 'freefall':value=(-b+Math.sqrt(b*b+2*g*a))/g;label='Время падения';unit='с';break;
 case 'projectile':value=a*a*Math.sin(2*b*Math.PI/180)/g;label='Дальность полёта';unit='м';break;
 case 'circular':value=4*Math.PI*Math.PI*a/(b*b);label='Центростремительное ускорение';unit='м/с²';break;
 case 'newton':value=b/a;label='Ускорение';unit='м/с²';break;
 case 'friction':value=a*b*g;label='Сила трения';unit='Н';break;
 case 'incline':value=Math.max(0,g*(Math.sin(a*Math.PI/180)-b*Math.cos(a*Math.PI/180)));label='Ускорение вдоль плоскости';unit='м/с²';break;
 case 'elasticity':value=a*b;label='Сила упругости';unit='Н';break;
 case 'torque':value=a*b;label='Момент силы';unit='Н·м';break;
 case 'pressure':value=b*g*a/1000;label='Гидростатическое давление';unit='кПа';break;
 case 'buoyancy':value=b*g*a;label='Сила Архимеда';unit='Н';break;
 case 'pascal':value=100*(b/a);label='Сила на большом поршне';unit='Н';break;
 case 'bernoulli':value=a*b;label='Скорость в узком сечении';unit='м/с';break;
 case 'gaspressure':value=8.314*a/(b/1000);label='Давление (n = 1 моль)';unit='кПа';value/=1000;break;
 case 'spring':value=2*Math.PI*Math.sqrt(a/b);label='Период колебаний';unit='с';break;
 case 'pendulum':value=2*Math.PI*Math.sqrt(a/g);label='Период малых колебаний';unit='с';break;
 case 'wave':value=a*b;label='Скорость волны';unit='м/с';break;
 case 'sound':value=b/a;label='Длина звуковой волны';unit='м';break;
 case 'resonance':{const q=b/a,z=.08;value=1/Math.sqrt((1-q*q)**2+(2*z*q)**2);label='Относительная амплитуда';unit='условн. ед.';break;}
 case 'calorimetry':value=4200*a*b;label='Количество теплоты';unit='Дж';break;
 case 'conduction':value=a*.01*b/.02;label='Тепловая мощность';unit='Вт';break;
 case 'idealgas':value=a*b/(8.314);label='Температура (ν = 1 моль)';unit='К';break;
 case 'firstlaw':value=a-b;label='Изменение внутренней энергии';unit='Дж';break;
 case 'heatengine':value=Math.max(0,(a-b)/a*100);label='Предельный КПД Карно';unit='%';break;
 case 'ohm':value=a/b;label='Сила тока';unit='А';break;
 case 'parallel':value=a*b/(a+b);label='Общее сопротивление';unit='Ом';break;
 case 'power':value=a*b;label='Электрическая мощность';unit='Вт';break;
 case 'magnetic':value=(a*1e-6)*(b*1000)*.5;label='Магнитная сила';unit='Н';break;
 case 'induction':value=100*.5*a*b;label='Средняя ЭДС (100 витков)';unit='В';break;
 case 'reflection':value=Math.abs(2*b-a);label='Направление отражённого луча';unit='°';break;
 case 'refraction':value=Math.asin(Math.min(1,Math.sin(a*Math.PI/180)/b))*180/Math.PI;label='Угол преломления';unit='°';break;
 case 'lens':case 'mirror':value=Math.abs(b-a)<.001?Infinity:a*b/(b-a);label=Math.abs(b-a)<.001?'Изображение на бесконечности':'Расстояние до изображения';unit=Math.abs(b-a)<.001?'':'см';break;
 case 'interference':value=(a*1e-9)/(b*1e-3)*1*1000;label='Расстояние между полосами';unit='мм';break;
 }
 return {label:label,value:value,unit:unit};
}
function labObservable(){
 const x=LABS[LAB.id],t=LAB.t,a=LAB.a,b=LAB.b,g=9.81;if(!x)return 0;
 switch(x.model){
 case 'uniform':return a*t;
 case 'accelerated':return a*t+.5*b*t*t;
 case 'freefall':return Math.min(a,b*t+.5*g*t*t);
 case 'projectile':{const ang=b*Math.PI/180,flight=2*a*Math.sin(ang)/g,tt=Math.min(t,flight);return a*Math.cos(ang)*tt;}
 case 'circular':return a*Math.sin(2*Math.PI*t/b);
 case 'newton':return .5*(b/a)*t*t;
 case 'friction':return labResult().value;
 case 'incline':return .5*labResult().value*t*t;
 case 'elasticity':return b*Math.cos(t*Math.sqrt(a/1));
 case 'torque':return labResult().value;
 case 'pressure':return labResult().value;
 case 'buoyancy':return labResult().value;
 case 'pascal':return labResult().value;
 case 'bernoulli':return b*a;
 case 'gaspressure':return labResult().value;
 case 'spring':return Math.cos(t*2*Math.PI/Math.max(.1,labResult().value));
 case 'pendulum':return Math.sin(t*Math.sqrt(g/a));
 case 'wave':return b*Math.sin(2*Math.PI*a*t);
 case 'sound':return Math.sin(2*Math.PI*a*t);
 case 'resonance':return labResult().value*Math.sin(2*Math.PI*b*t);
 case 'calorimetry':return 4200*a*Math.min(b,t*b/5);
 case 'conduction':return labResult().value*t;
 case 'idealgas':return labResult().value;
 case 'firstlaw':return labResult().value;
 case 'heatengine':return labResult().value;
 case 'ohm':return labResult().value;
 case 'parallel':return labResult().value;
 case 'power':return labResult().value;
 case 'magnetic':return labResult().value;
 case 'induction':return labResult().value*Math.sin(2*Math.PI*t);
 case 'reflection':return labResult().value;
 case 'refraction':return labResult().value;
 case 'lens':case 'mirror':return labResult().value;
 case 'interference':return labResult().value;
 default:return 0;
 }
}
function labMetrics(){
 const x=LABS[LAB.id];if(!x)return;const r=labResult();
 const av=$('#lab-av'),bv=$('#lab-bv'),mv=$('#lab-mv'),ml=$('#lab-ml'),state=$('#lab-time');
 if(x.model==='pressure'){const depth=LAB.t>0?LAB.a*Math.min(1,LAB.t/2.6):0;r.value=LAB.b*9.81*depth/1000;}
 if(mv)mv.textContent=f1(r.value,2)+' '+r.unit;if(ml)ml.textContent=r.label;
 if(av)av.textContent=f1(LAB.a,2)+' '+x.uA;if(bv)bv.textContent=f1(LAB.b,2)+' '+x.uB;
 if(state)state.textContent=LAB.completed?'Завершено':LAB.run?'Выполняется':'Готова';
}
function labArrow(c,x1,y1,x2,y2,color){const ang=Math.atan2(y2-y1,x2-x1);c.strokeStyle=color;c.fillStyle=color;c.lineWidth=3;c.beginPath();c.moveTo(x1,y1);c.lineTo(x2,y2);c.stroke();c.beginPath();c.moveTo(x2,y2);c.lineTo(x2-10*Math.cos(ang-.45),y2-10*Math.sin(ang-.45));c.lineTo(x2-10*Math.cos(ang+.45),y2-10*Math.sin(ang+.45));c.closePath();c.fill();}
function labDraw(){
 const cv=$('#lab-canvas');if(!cv)return;const c=cv.getContext('2d'),w=cv.width,h=cv.height,x=LABS[LAB.id],t=LAB.t,a=LAB.va??LAB.a,b=LAB.vb??LAB.b;
 const bg='#0E1424',white='#E8ECF6',muted='#AAB3CD',blue='#6C8CFF',cyan='#3DD6C3',green='#3DD6A0',gold='#FFC24B',violet='#B48CFF',red='#FF7A59';
 c.fillStyle=bg;c.fillRect(0,0,w,h);c.save();c.strokeStyle='rgba(141,151,181,.12)';c.lineWidth=1;for(let i=0;i<=w;i+=36){c.beginPath();c.moveTo(i,0);c.lineTo(i,h);c.stroke()}for(let i=0;i<=h;i+=36){c.beginPath();c.moveTo(0,i);c.lineTo(w,i);c.stroke()}c.restore();c.lineCap='round';c.lineJoin='round';
 const txt=(s,X=25,Y=28,col=muted,size=15)=>{c.fillStyle=col;c.font=size+'px sans-serif';c.fillText(s,X,Y)},ln=(x1,y1,x2,y2,col=white,lw=3)=>{c.strokeStyle=col;c.lineWidth=lw;c.beginPath();c.moveTo(x1,y1);c.lineTo(x2,y2);c.stroke()},box=(X,Y,W,H,col=blue)=>{c.fillStyle=col;c.fillRect(X,Y,W,H);c.strokeStyle=white;c.lineWidth=2;c.strokeRect(X,Y,W,H)},dot=(X,Y,r=10,col=gold)=>{c.fillStyle=col;c.beginPath();c.arc(X,Y,r,0,Math.PI*2);c.fill();c.strokeStyle=white;c.lineWidth=2;c.stroke()},arr=(x1,y1,x2,y2,col=green)=>{const q=Math.atan2(y2-y1,x2-x1);ln(x1,y1,x2,y2,col,3);ln(x2,y2,x2-10*Math.cos(q-.45),y2-10*Math.sin(q-.45),col,3);ln(x2,y2,x2-10*Math.cos(q+.45),y2-10*Math.sin(q+.45),col,3)},wave=(x0,x1,y0,amp,cycles,phase=0,col=cyan)=>{c.strokeStyle=col;c.lineWidth=3;c.beginPath();for(let px=x0;px<=x1;px+=2){const py=y0-amp*Math.sin((px-x0)/(x1-x0)*cycles*2*Math.PI+phase);px===x0?c.moveTo(px,py):c.lineTo(px,py)}c.stroke()},spr=(X,Y1,Y2)=>{c.strokeStyle=cyan;c.lineWidth=3;c.beginPath();c.moveTo(X,Y1);for(let i=1;i<=20;i++)c.lineTo(X+(i%2?23:-23),Y1+(Y2-Y1)*i/20);c.lineTo(X,Y2);c.stroke()};
 const head=s=>txt(s,25,27,gold,17);
 switch(x.model){
 case 'uniform':head('Рельсовая дорожка · постоянная скорость');ln(60,240,660,240,white,5);for(let i=0;i<10;i++)ln(80+i*58,240,80+i*58,252,muted,2);{const X=80+Math.min(520,t*65);box(X,185,65,42,blue);dot(X+15,235,8,gold);dot(X+50,235,8,gold);arr(X+25,165,X+100,165);txt('s = v · t',510,80,white,18)}break;
 case 'accelerated':head('Наклонная дорожка · тележка и датчик скорости');{const X0=85,Y0=242,L=540,q=.16;ln(X0,Y0,X0+L*Math.cos(q),Y0-L*Math.sin(q),white,9);ln(X0,Y0+12,X0+L*Math.cos(q),Y0-L*Math.sin(q)+12,muted,3);for(let i=0;i<12;i++){const xx=X0+i*45,yy=Y0-i*45*Math.tan(q);ln(xx,yy+10,xx+8,yy+20,muted,2)}const dist=Math.min(500,(a*t+.5*b*t*t)*62.5),tx=X0+dist*Math.cos(q),ty=Y0-dist*Math.sin(q);c.save();c.translate(tx,ty-18);c.rotate(-q);box(-30,-18,60,34,violet);dot(-17,18,7,gold);dot(18,18,7,gold);c.restore();const sx=X0+L*.72*Math.cos(q),sy=Y0-L*.72*Math.sin(q);box(sx-9,sy-48,18,40,red);ln(sx,sy-48,sx,sy-5,gold,3);txt('ДАТЧИК',sx-38,sy-58,gold,12);arr(tx+25,ty-60,tx+95,ty-60,green);txt('v = '+f1(a+b*t,2)+' м/с',430,55,white,16);txt('a = '+f1(b,2)+' м/с²',90,75,cyan,15)}break;
 case 'freefall':head('Свободное падение · высотная шкала');ln(540,55,540,255,white,3);for(let i=0;i<=8;i++){ln(530,55+i*24,550,55+i*24,muted,2);txt((80-i*10)+' м',555,60+i*24,muted,11)}{const Y=55+Math.min(1,(b*t+4.905*t*t)/a)*190;dot(280,Y,13,gold);arr(320,Y-25,320,Y+35,green)}txt('g = 9,81 м/с²',65,90,white,17);break;
 case 'projectile':head('Пусковая установка · параболическая траектория');ln(55,250,670,250,white,4);{const q=b*Math.PI/180,T=2*a*Math.sin(q)/9.81,X0=90,scale=7;c.strokeStyle=green;c.lineWidth=3;c.beginPath();for(let i=0;i<=100;i++){const z=T*i/100,xx=X0+a*Math.cos(q)*z*scale,yy=248-(a*Math.sin(q)*z-4.905*z*z)*scale;i?c.lineTo(xx,yy):c.moveTo(xx,yy)}c.stroke();box(50,205,45,42,blue);ln(80,220,120,220,white,8);const z=Math.min(t,T);dot(X0+a*Math.cos(q)*z*scale,248-(a*Math.sin(q)*z-4.905*z*z)*scale,10,gold);txt('α = '+f1(b,0)+'°',60,65,white,17)}break;
 case 'circular':head('Вращающийся диск · центростремительное ускорение');c.strokeStyle=blue;c.lineWidth=4;c.beginPath();c.arc(360,150,94,0,Math.PI*2);c.stroke();{const q=2*Math.PI*t/Math.max(.5,b),X=360+94*Math.cos(q),Y=150+94*Math.sin(q);dot(360,150,7,muted);dot(X,Y,13,gold);arr(X,Y,360,150,green);arr(X,Y,X-45*Math.sin(q),Y+45*Math.cos(q),violet)}break;
 case 'newton':head('Тележка и динамометр · второй закон Ньютона');ln(70,235,650,235,white,5);box(285,175,115,55,blue);dot(310,237,9,gold);dot(375,237,9,gold);ln(400,195,485,195,gold,5);box(485,180,85,30,red);arr(295,145,470,145,green);txt('F = '+f1(b,1)+' Н',490,125,white,16);txt('m = '+f1(a,1)+' кг',90,90,white,16);break;
 case 'friction':head('Брусок · силы трения и тяги');ln(75,230,645,230,white,7);for(let i=0;i<28;i++)ln(80+i*20,235,90+i*20,245,muted,2);box(275,170,140,58,violet);arr(345,115,345,165,gold);arr(275,200,185,200,red);arr(415,200,505,200,green);txt('Fтр',175,185,red,15);txt('F тяги',510,185,green,15);break;
 case 'incline':head('Наклонная плоскость · брусок и угол наклона');{const q=a*Math.PI/180,X=95,Y=252,L=520,bx=X+Math.min(430,Math.max(0,.5*labResult().value*t*t*18))*Math.cos(q),by=Y-Math.min(430,Math.max(0,.5*labResult().value*t*t*18))*Math.sin(q);ln(X,Y,X+L*Math.cos(q),Y-L*Math.sin(q),white,9);ln(X,Y,X+L*Math.cos(q),Y,muted,2);c.save();c.translate(bx,by-22);c.rotate(-q);box(-32,-25,64,44,violet);c.restore();arr(bx,by-38,bx-20*Math.sin(q),by-38-20*Math.cos(q),green);txt('α = '+f1(a,0)+'°',110,205,gold,16);txt('Fтр = '+f1(b,2)+' · N',475,55,white,14)}break;
 case 'elasticity':head('Пружина и груз · закон Гука');ln(160,55,560,55,white,6);spr(360,62,205);box(326,205,68,48,violet);arr(445,95,445,190,gold);txt('x = '+f1(b,2)+' м',470,140,white,16);txt('Fупр = kx',70,90,green,17);break;
 case 'torque':head('Рычаг на опоре · моменты сил');ln(105,190,615,190,white,7);c.fillStyle=violet;c.beginPath();c.moveTo(340,190);c.lineTo(390,260);c.lineTo(290,260);c.closePath();c.fill();box(180,145,52,42,blue);box(520,145,52,42,red);arr(205,90,205,140,gold);arr(545,90,545,140,green);txt('M = F · l',300,70,gold,17);break;
 case 'pressure':head('Гидростатика · погружение датчика давления');{const tankX=190,tankY=66,tankW=310,tankH=194,waterY=112;box(tankX,tankY,tankW,tankH,'rgba(61,140,255,.12)');c.fillStyle='rgba(42,126,226,.28)';c.fillRect(tankX+5,waterY,tankW-10,tankY+tankH-waterY-5);ln(tankX+5,waterY,tankX+tankW-5,waterY,cyan,3);for(let i=0;i<5;i++)wave(tankX+18,tankX+tankW-18,waterY+18+i*25,2,6,t*.8+i,cyan);for(let i=0;i<=5;i++){const yy=waterY+i*25;ln(tankX-12,yy,tankX,yy,muted,2);txt(f1(i*a/5,1)+' м',tankX-58,yy+4,muted,10)}const p=Math.min(1,t/2.6),Y=waterY+Math.min(1,a/10)*125*p;ln(345,58,345,Y,gold,4);box(331,Y-8,28,18,red);dot(345,Y,7,gold);ln(345,Y+8,345,Y+20,white,2);c.strokeStyle=gold;c.lineWidth=3;c.beginPath();c.arc(590,158,48,Math.PI*.75,Math.PI*2.25);c.stroke();const actualDepth=a*p,pressure=b*9.81*actualDepth/1000,angle=Math.PI*.75+Math.min(1,pressure/130)*Math.PI*1.5;arr(590,158,590+35*Math.cos(angle),158+35*Math.sin(angle),red);dot(590,158,5,gold);txt('МАНОМЕТР',548,92,gold,12);txt('p = '+f1(pressure,2)+' кПа',530,235,white,14);txt('ρ = '+f1(b,0)+' кг/м³',525,265,muted,12);txt('Глубина '+f1(actualDepth,2)+' м',220,290,muted,12)}break;
 case 'buoyancy':head('Погружённое тело · сила Архимеда');box(190,90,340,165,'rgba(61,140,255,.18)');ln(195,135,525,135,cyan,3);box(310,150,100,75,violet);arr(360,225,360,95,green);arr(430,155,430,70,gold);txt('FА вверх',440,80,green,15);txt('P вниз',440,170,gold,15);break;
 case 'pascal':head('Гидравлический пресс · передача давления');box(130,170,180,60,'rgba(61,140,255,.18)');box(410,110,180,120,'rgba(61,140,255,.18)');ln(215,170,215,115,white,6);ln(500,110,500,55,white,8);box(185,100,60,15,gold);box(460,40,80,15,red);ln(215,230,215,260,cyan,8);ln(500,230,500,260,cyan,8);ln(215,260,500,260,cyan,8);arr(215,65,215,100,gold);arr(500,10,500,40,green);txt('S₁',175,290,white,15);txt('S₂',475,290,white,15);break;
 case 'bernoulli':head('Труба Вентури · скорость и давление');c.strokeStyle=blue;c.lineWidth=5;c.beginPath();c.moveTo(65,95);c.lineTo(225,95);c.lineTo(310,145);c.lineTo(415,145);c.lineTo(500,95);c.lineTo(655,95);c.lineTo(655,205);c.lineTo(500,205);c.lineTo(415,155);c.lineTo(310,155);c.lineTo(225,205);c.lineTo(65,205);c.closePath();c.stroke();arr(85,150,205,150,gold);arr(320,150,405,150,green);arr(505,150,625,150,gold);txt('v ↑',335,55,green,16);txt('p ↓',400,80,gold,16);break;
 case 'gaspressure':head('Газ в цилиндре · давление и температура');box(245,75,230,180,'rgba(61,140,255,.12)');box(245,75,230,20,gold);ln(360,25,360,75,white,6);for(let i=0;i<24;i++)dot(265+(i*47%190),110+(i*31%125),4,i%2?cyan:gold);arr(530,55,530,110,green);txt('T = '+f1(a,0)+' K',70,85,white,16);break;
 case 'spring':head('Пружинный маятник · колебания груза');ln(360,40,360,60,white,5);{const P=2*Math.PI*Math.sqrt(a/b),Y=145+48*Math.sin(2*Math.PI*t/P);spr(360,60,Y-20);box(330,Y-20,60,42,violet);arr(430,85,430,190,green)}txt('T = 2π√(m/k)',65,90,white,16);break;
 case 'pendulum':head('Математический маятник · период колебаний');{const q=(b*Math.PI/180)*Math.sin(t/Math.max(.3,Math.sqrt(a/9.81))),X=360+a*95*Math.sin(q),Y=65+a*95*Math.cos(q);ln(360,45,360,65,white,5);ln(360,65,X,Y,white,3);dot(X,Y,17,gold);ln(360,65,360,255,muted,1);txt('l = '+f1(a,2)+' м',75,90,white,16)}break;
 case 'wave':head('Волновая машина · распространение волны');ln(35,155,685,155,muted,2);wave(35,685,155,Math.min(65,30+b*9),Math.max(1,8/b),t*2,cyan);for(let i=0;i<14;i++)dot(45+i*48,155-Math.min(65,30+b*9)*Math.sin((45+i*48-35)/650*Math.max(1,8/b)*2*Math.PI+t*2),4,gold);txt('λ = '+f1(b,2)+' м',510,80,white,16);break;
 case 'sound':head('Звуковой генератор · волны в среде');box(75,105,75,90,violet);for(let i=1;i<=5;i++){c.strokeStyle='rgba(61,214,195,'+(0.9-i*.13)+')';c.lineWidth=3;c.beginPath();c.arc(150,150,35+i*38,-.9,.9);c.stroke()}wave(365,660,150,32,Math.max(1,a/100),t*4,gold);txt('f = '+f1(a,0)+' Гц',75,75,white,16);break;
 case 'resonance':head('Вынужденные колебания · резонанс');ln(70,240,650,240,white,4);ln(360,55,360,90,white,4);spr(360,90,190);box(330,190,60,48,violet);{const r=b/a,A=1/Math.sqrt((1-r*r)**2+(.16*r)**2);wave(75,645,110,Math.min(75,A*10),2,t*4,gold)}txt('f₀ = '+f1(a,1)+' Гц',70,70,white,15);txt('f = '+f1(b,1)+' Гц',500,70,white,15);break;
 case 'calorimetry':head('Калориметр · нагрев воды');box(255,75,170,170,'rgba(61,140,255,.2)');box(260,125,160,115,'rgba(61,140,255,.32)');ln(340,30,340,125,white,5);dot(340,125,8,red);for(let i=0;i<6;i++)wave(275,405,145+i*15,3,5,t+i,cyan);box(305,250,70,8,gold);txt('m = '+f1(a,2)+' кг',70,85,white,16);txt('ΔT = '+f1(b,1)+' °C',465,85,white,16);break;
 case 'conduction':head('Теплопроводность · поток через стержни');box(85,125,250,42,red);box(335,125,250,42,blue);for(let i=0;i<8;i++)arr(100+i*27,105,170+i*27,105,i<4?gold:cyan);for(let i=0;i<6;i++)dot(105+i*35,146,4,gold);for(let i=0;i<6;i++)dot(365+i*35,146,4,cyan);txt('горячий конец',90,205,red,15);txt('холодный конец',430,205,blue,15);break;
 case 'idealgas':head('Газовый цилиндр · уравнение состояния');box(250,80,220,175,'rgba(61,140,255,.12)');box(250,80,220,18,gold);ln(360,35,360,80,white,6);for(let i=0;i<30;i++)dot(265+(i*43%190),110+(i*29%125),4,i%3?cyan:gold);arr(520,50,520,100,green);txt('pV = νRT',75,85,white,17);break;
 case 'firstlaw':head('Газ получает тепло и совершает работу');box(240,90,220,150,'rgba(61,140,255,.12)');box(240,90,220,18,gold);ln(350,40,350,90,white,6);arr(180,190,240,190,red);arr(350,75,350,30,gold);arr(460,160,560,160,green);txt('Q →',95,170,gold,16);txt('A →',570,165,green,16);txt('ΔU = Q − A',280,275,white,18);break;
 case 'heatengine':head('Тепловая машина · два резервуара');box(75,55,170,60,red);box(475,190,170,60,blue);box(300,125,120,85,violet);arr(245,95,300,145,gold);arr(420,165,475,210,cyan);arr(360,125,360,65,green);txt('Нагреватель',95,85,white,15);txt('Холодильник',500,220,white,15);break;
 case 'ohm':head('Электрическая цепь · закон Ома');ln(155,95,560,95,cyan,4);ln(560,95,560,225,cyan,4);ln(560,225,155,225,cyan,4);ln(155,225,155,95,cyan,4);ln(155,145,155,180,gold,5);ln(140,155,170,155,gold,3);box(330,75,90,40,violet);txt('R',365,101,white,18);dot(230,95,18,blue);txt('A',224,101,white,16);arr(200,65,280,65,green);txt('U = '+f1(a,1)+' В',75,270,white,15);txt('R = '+f1(b,1)+' Ом',490,270,white,15);break;
 case 'parallel':head('Две параллельные ветви · распределение тока');ln(110,75,610,75,cyan,4);ln(110,235,610,235,cyan,4);ln(110,75,110,235,cyan,4);ln(610,75,610,235,cyan,4);ln(110,115,250,115,cyan,4);box(250,95,100,40,violet);ln(350,115,610,115,cyan,4);ln(110,195,250,195,cyan,4);box(250,175,100,40,blue);ln(350,195,610,195,cyan,4);arr(165,95,225,95,gold);arr(165,175,225,175,green);txt('R₁',285,121,white,15);txt('R₂',285,201,white,15);txt('I = I₁ + I₂',430,155,white,17);break;
 case 'power':head('Электрическая лампа · мощность потребителя');ln(150,85,570,85,cyan,4);ln(570,85,570,220,cyan,4);ln(570,220,150,220,cyan,4);ln(150,220,150,85,cyan,4);c.strokeStyle=gold;c.lineWidth=5;c.beginPath();c.arc(360,150,38,0,Math.PI*2);c.stroke();for(let i=0;i<12;i++){const q=i*Math.PI/6;ln(360+48*Math.cos(q),150+48*Math.sin(q),360+68*Math.cos(q),150+68*Math.sin(q),gold,3)}txt('P = UI',320,155,white,18);break;
 case 'magnetic':head('Магнитное поле · сила Лоренца');for(let i=0;i<9;i++)for(let j=0;j<4;j++){const X=130+i*58,Y=85+j*45;c.strokeStyle=blue;c.beginPath();c.arc(X,Y,7,0,Math.PI*2);c.stroke();ln(X-4,Y,X+4,Y,blue,2);ln(X,Y-4,X,Y+4,blue,2)}c.strokeStyle=gold;c.lineWidth=4;c.beginPath();for(let q=0;q<=100;q++){const z=q/100,X=100+z*500,Y=165-70*Math.sin(z*Math.PI*2);q?c.lineTo(X,Y):c.moveTo(X,Y)}c.stroke();arr(110,165,185,165,green);txt('F = qvB sin α',475,260,white,16);break;
 case 'induction':head('Катушка и магнит · электромагнитная индукция');for(let i=0;i<9;i++){c.strokeStyle=cyan;c.lineWidth=3;c.beginPath();c.ellipse(400+i*3,155,16,48,0,0,Math.PI*2);c.stroke()}box(90+(Math.sin(t*2)+1)*85,125,95,60,red);arr(235,155,315,155,green);dot(580,150,38,blue);ln(580,150,605,125,gold,3);txt('ε индуцируется',485,220,white,15);break;
 case 'reflection':head('Плоское зеркало · равенство углов');ln(360,65,360,250,white,6);ln(360,155,360,260,muted,2);arr(180,65,360,155,gold);arr(360,155,540,65,green);txt('α',300,115,gold,18);txt('β',420,115,green,18);break;
 case 'refraction':head('Граница сред · преломление светового луча');box(0,155,720,145,'rgba(61,140,255,.18)');ln(0,155,720,155,cyan,3);ln(360,40,360,280,muted,2);{const q=a*Math.PI/180,r=Math.asin(Math.min(1,Math.sin(q)/b));arr(360-150*Math.sin(q),155-150*Math.cos(q),360,155,gold);arr(360,155,360+150*Math.sin(r),155+150*Math.cos(r),green);txt('n₂ = '+f1(b,2),500,230,white,16)}break;
 case 'lens':head('Собирающая линза · построение изображения');c.strokeStyle=cyan;c.lineWidth=7;c.beginPath();c.moveTo(360,55);c.quadraticCurveTo(320,155,360,255);c.quadraticCurveTo(400,155,360,55);c.stroke();ln(45,235,670,235,muted,2);arr(160,235,160,125,gold);{const X=360+Math.max(35,Math.min(250,a*b/Math.max(1,b-a)));arr(X,235,X,130,green);ln(160,125,360,155,gold,2);ln(360,155,X,130,green,2);txt('изображение',X-35,110,green,13)}break;
 case 'mirror':head('Вогнутое зеркало · действительное изображение');c.strokeStyle=cyan;c.lineWidth=7;c.beginPath();c.arc(620,155,170,-1.1,1.1,true);c.stroke();ln(40,235,680,235,muted,2);arr(175,235,175,120,gold);{const X=360+Math.max(30,Math.min(190,a*b/Math.max(1,b-a)));arr(X,235,X,130,green);ln(175,120,620,155,gold,2);ln(X,130,620,155,green,2);txt('изображение',X-40,110,green,13)}break;
 case 'interference':head('Опыт Юнга · интерференционные полосы');box(145,95,12,110,blue);box(145,118,12,8,bg);box(145,170,12,8,bg);ln(158,122,480,80,gold,2);ln(158,174,480,220,green,2);ln(480,55,480,250,white,3);for(let i=0;i<11;i++)box(490,65+i*18,130,5,i%2?blue:gold);txt('двойная щель',65,75,white,14);txt('экран',500,270,white,14);break;
 default:head('Физическая установка');txt(x.desc,70,150,white,16)
 }
 const r=labResult();txt(r.label+': '+f1(r.value,2)+' '+r.unit,25,286,white,13);labMetrics();
}
function labEndCondition(){
 const x=LABS[LAB.id],a=LAB.a,b=LAB.b,g=9.81;if(!x)return 3;
 switch(x.model){
  case 'uniform':return Math.max(1,Math.min(12,8/Math.max(.2,a)));
  case 'accelerated':return Math.max(1,Math.min(12,(-a+Math.sqrt(a*a+16*b))/b));
  case 'freefall':return Math.sqrt(2*a/g);
  case 'projectile':return 2*a*Math.sin(b*Math.PI/180)/g;
  case 'circular':return Math.max(2,3*b);
  case 'incline':{const acc=g*(Math.sin(a*Math.PI/180)-b*Math.cos(a*Math.PI/180));return acc>0.05?Math.sqrt(8/acc):Infinity;}
  case 'spring':return 4*2*Math.PI*Math.sqrt(a/b);
  case 'pendulum':return 4*2*Math.PI*Math.sqrt(a/g);
  case 'wave':return 3/Math.max(.1,a);
  case 'sound':return 3/Math.max(.1,a);
  case 'resonance':return 3/Math.max(.1,b);
  case 'pressure':return 3.8;
  case 'buoyancy':case 'pascal':case 'bernoulli':case 'gaspressure':return 3.4;
  case 'calorimetry':return Math.max(2,Math.min(8,b*1.4));
  case 'induction':return 3.2;
  default:return 2.8;
 }
}
function labFrame(now){
 if(!LAB.run)return;const dt=Math.min(.04,(now-LAB.last)/1000||0);LAB.last=now;LAB.t+=dt;
 LAB.va+=(LAB.a-LAB.va)*Math.min(1,dt*7);LAB.vb+=(LAB.b-LAB.vb)*Math.min(1,dt*7);
 labDraw();labMetrics();
 const end=labEndCondition();
 if(Number.isFinite(end)&&LAB.t>=end){labComplete();return;}
 const state=$('#lab-state');if(state)state.textContent=Number.isFinite(end)?'Выполняется действие':'Ожидание начала движения';
 if(LAB.run)LAB.raf=requestAnimationFrame(labFrame);
}
function labRun(){if(LAB.run||LAB.completed)return;const end=labEndCondition();if(!Number.isFinite(end)){const h=$('#lab-hint');if(h)h.textContent='Параметры не запускают движение. Увеличь угол или уменьши трение, затем запусти снова.';return;}LAB.run=true;LAB.paused=false;LAB.last=performance.now();const st=$('#lab-state'),hint=$('#lab-hint');if(st)st.textContent='Установка запущена';if(hint)hint.textContent='Наблюдай за процессом: опыт завершится автоматически после выполнения действия.';labSetButtons();LAB.raf=requestAnimationFrame(labFrame);}
function labComplete(){
 if(LAB.completed)return;LAB.completed=true;
 const alreadyDone=LAB_DONE.has(LAB.id);
 if(!alreadyDone){LAB_DONE.add(LAB.id);try{localStorage.setItem('f2-lab-done',JSON.stringify([...LAB_DONE]))}catch(e){}addXP(15,'Опыт');toast('Опыт пройден · +15 XP');}
 LAB.run=false;LAB.paused=false;if(LAB.raf)cancelAnimationFrame(LAB.raf);LAB.raf=0;
 const st=$('#lab-state'),hint=$('#lab-hint');if(st)st.textContent=alreadyDone?'Действие завершено':'Опыт завершён';
 if(hint)hint.textContent=alreadyDone?'Действие выполнено. Повторный зачёт не начисляется.':'Установка выполнила действие. Опыт автоматически засчитан · +15 XP.';
 labSetButtons();labDraw();labMetrics();
}
/* ---------- Профиль ---------- */
function vProfile() {
  frame('Профиль');
  const L = levelOf(S.xp), acc = S.tot ? Math.round(S.ok / S.tot * 100) : 0, nl_ = Object.keys(S.lessons).length;
  setMain(`<section class="card prof"><button class="pava" data-act="ava">${avatarSvg(S.ava, 84)}<span>${ic('pencil')}</span></button><div><input id="pname" value="${esc(S.name)}" placeholder="Как тебя зовут?" maxlength="24" aria-label="Имя"><p><b>${esc(L.title)}</b> · уровень ${L.l}</p><div class="bar"><i style="width:${L.cur / L.need * 100}%"></i></div><small class="mute">${L.cur} / ${L.need} XP до уровня ${L.l + 1}</small></div></section>` +
    `<section class="stats"><div><b>${S.xp}</b><span>опыт</span></div><div><b>${streak()}</b><span>дней подряд</span></div><div><b>${S.bestCombo}</b><span>лучшее комбо</span></div><div><b>${acc}%</b><span>точность</span></div><div><b>${nl_}</b><span>уроков</span></div><div><b>${S.badges.length}/${BADGES.length}</b><span>значков</span></div></section>` +
    `<h2 class="sec">Значки</h2><div class="badges">${BADGES.map(([id, t, d]) => `<div class="bdg${S.badges.includes(id) ? ' on' : ''}">${ic(S.badges.includes(id) ? 'award' : 'lock')}<b>${t}</b><small>${d}</small></div>`).join('')}</div>` +
    `<h2 class="sec">Коллекция учёных</h2><div class="sci">${Object.values(CONTENT).flatMap(c => c.scientists).map(x => `<div class="scard${S.sci.includes(x.id) ? '' : ' locked'}"><b>${S.sci.includes(x.id) ? esc(x.name) : '???'}</b><small>${S.sci.includes(x.id) ? esc(x.years) : 'пройди финал главы'}</small></div>`).join('')}</div>` +
    `<button class="btn line wide mt danger" data-act="reset">Сбросить прогресс</button><p class="mute small">Пилотная версия: открыта глава 1. Конспекты, ролики и задания — собственные, по программе учебника Т. И. Трофимовой «Курс физики». Озвучка роликов — ElevenLabs (elevenlabs.io). Значки — Lucide (ISC).</p>`);
}

/* ---------- события ---------- */
document.addEventListener('click', async e => {
  if (e.target.id === 'sheet') return closeSheet();
  const b = e.target.closest('[data-act]'); if (!b || b.disabled) return;
  const d = b.dataset, r = route();
  // Игровые действия принадлежат только bridge-game.js: не допускаем двойную диспетчеризацию.
  if (d.act.startsWith('bridge') || d.act.startsWith('sandbox')) return;
  const asyncActions = ['topics', 'topicQuiz', 'warm', 'exam', 'errs', 'chQuiz'];
  if (asyncActions.includes(d.act)) {
    if (b.dataset.busy === '1') return;
    b.dataset.busy = '1';
    b.disabled = true;
  }
  try {
  switch (d.act) {
    case 'closeSheet': closeSheet(); break;
    case 'readerFont': readerFontSize=Math.max(15,Math.min(23,readerFontSize+Number(d.delta)));localStorage.setItem('f2-reader-font',String(readerFontSize));render();break;
    case 'readerPrev': location.hash='read-'+d.v;break;
    case 'readerNext': location.hash='read-'+d.v;break;
    case 'step': curStep[lessonKey(r.ch, r.li)] = d.v; render(); ui.main.scrollTop = 0; break;
    case 'vToggle': vToggle(); break;
    case 'vCc': if (V) { V.cc = !V.cc; S.cc = V.cc ? 1 : 0; save(); $('#vsub').hidden = !V.cc; } break;
    case 'cNext': { const box = $('#cards'), i = Math.round(box.scrollLeft / box.clientWidth); if (i >= box.children.length - 1) { curStep[lessonKey(r.ch, r.li)] = 'sim'; render(); } else box.scrollTo({ left: (i + 1) * box.clientWidth, behavior: 'smooth' }); break; }
    case 'cPrev': { const box = $('#cards'), i = Math.round(box.scrollLeft / box.clientWidth); box.scrollTo({ left: Math.max(0, i - 1) * box.clientWidth, behavior: 'smooth' }); break; }
    case 'simGo': simGo(); break;
    case 'lessonQuiz': { const L = CONTENT[d.ch].lessons[d.li - 1]; startQuiz({ kind: 'lesson', key: lessonKey(+d.ch, +d.li), title: 'Проверка: ' + L.title, items: L.quiz, back: '#l' + d.ch + '-' + d.li }); break; }
    case 'boss': { const C1 = CONTENT[d.ch]; startQuiz({ kind: 'boss', ch: +d.ch, title: 'Финал главы ' + d.ch, items: shuffle(C1.boss), back: '#c' + d.ch }); break; }
    case 'topics': { const B = await bank(), topics = [...new Map(B.map(x => [x.tid, x.topicTitle])).entries()]; sheet(`<b class="h">Тренировка по теме</b><p class="mute">Выбери раздел — подберём вопросы из экзаменационной базы.</p><div class="topic-list">${topics.map(([id, title]) => `<button class="qrow" data-act="topicQuiz" data-topic="${id}"><span><b>${esc(title || ('Раздел ' + id))}</b><small>${B.filter(x => x.tid === id).length} вопросов в базе</small></span>${ic('chevron-right')}</button>`).join('')}</div>`); break; }
    case 'topicQuiz': { const B = await bank(), W = B.filter(x => String(x.tid) === String(d.topic)); closeSheet(); startQuiz({ kind: 'topic', title: 'Тема: ' + (W[0] ? W[0].topicTitle : 'физика'), items: shuffle(W).slice(0, 15) }); break; }
    case 'lab': location.hash = 'lab'; break;
    case 'labGames': location.hash = 'lab-games'; break;
    case 'labOpen': labOpen(d.v); break;
    case 'labHome': labStop(); location.hash='lab'; break;
    case 'labStart': labRun(); break;
    case 'labAdjust': {const x=LABS[LAB.id],k=d.key,step=k==='a'?x.stA:x.stB,min=k==='a'?x.amin:x.bmin,max=k==='a'?x.amax:x.bmax;if(x&&['a','b'].includes(k)){LAB[k]=Math.max(min,Math.min(max,Math.round((LAB[k]+Number(d.delta)*step)/step)*step));if(!LAB.run){LAB.va=LAB.a;LAB.vb=LAB.b;}const el=$('#lab-'+k+'v');if(el)el.textContent=f1(LAB[k],2)+' '+(k==='a'?x.uA:x.uB);labDraw();labMetrics();if($('#lab-state')&&!LAB.run)$('#lab-state').textContent='Параметр изменён';if($('#lab-hint')&&!LAB.run)$('#lab-hint').textContent='Настрой установку и запусти опыт.';}break;}
    case 'labPause': labStop('Пауза',true); if($('#lab-hint'))$('#lab-hint').textContent='Пауза. Нажми «Запустить», чтобы продолжить с того же момента.'; break;
    case 'labReset': labStop('Готов к запуску');LAB.t=0;LAB.completed=false;LAB.trace=[];LAB.lastSample=0;LAB.va=LAB.a;LAB.vb=LAB.b;labDraw();labMetrics();if($('#lab-hint'))$('#lab-hint').textContent='Установка сброшена. Можно повторить опыт с новыми параметрами.';labSetButtons();break;
    case 'trainBack': location.hash = 'train'; break;
    case 'warm': { const B = await bank(); startQuiz({ kind: 'warm', title: 'Разминка', items: shuffle(B).slice(0, 10) }); break; }
    case 'exam': { const B = await bank(); startQuiz({ kind: 'exam', title: 'Экзамен', items: shuffle(B).slice(0, 30) }); break; }
    case 'errs': { const B = await bank(), W = B.filter(x => S.wrong.includes(x.key)); if (!W.length) { toast(ic('check') + 'Ошибок нет — отлично!'); break; } startQuiz({ kind: 'errs', title: 'Мои ошибки', items: shuffle(W).slice(0, 20) }); break; }
    case 'chQuiz': { const B = await bank(), W = B.filter(CH_FILTER[d.ch] || (() => false)); startQuiz({ kind: 'chq', title: 'Глава ' + d.ch + ': вопросы экзамена', items: shuffle(W).slice(0, 15), back: '#c' + d.ch }); break; }
    case 'pick': qPick(+d.v); break;
    case 'qNext': Q.i++; Q.ans = null; render(); break;
    case 'qAgain': startQuiz(Object.assign({}, Q, { items: Q.items.map(({ opts, ...x }) => x), saved: false })); break;
    case 'qDone': { const back = Q && Q.back; Q = null; location.hash = back ? back.slice(1) : ''; break; }
    case 'ava': sheet(`<b class="h">Выбери аватар</b><div class="avas">${AVATARS.map((_, i) => `<button data-act="setAva" data-v="${i}" class="${i === S.ava ? 'on' : ''}">${avatarSvg(i, 60)}</button>`).join('')}</div>`); break;
    case 'setAva': S.ava = +d.v; save(); closeSheet(); render(); break;
    case 'reset': if (confirm('Сбросить весь прогресс, опыт и значки?')) { S = Object.assign({}, S0); save(); render(); } break;
  }
  } catch (err) {
    console.error('Fizika action failed:', d.act, err);
    toast('Не удалось выполнить действие. Попробуй ещё раз.', 'bad');
  } finally {
    if (b.dataset.busy === '1') { b.disabled = false; delete b.dataset.busy; }
  }
});
document.addEventListener('pointerdown', e => { if (e.target.closest('#vseek')) vSeek(e); });

document.addEventListener('change', e => { if (e.target.id === 'pname') { S.name = e.target.value.trim().slice(0, 24); save(); toast(ic('check') + 'Имя сохранено'); } });

/* ---------- обновления Android ---------- */
async function checkAppUpdates() {
  if (!F2_IN_APP) return;
  const get = async path => {
    let last;
    for (const prefix of ['/mirror/gv2/', '/mirror/gh2/']) {
      try {
        const r = await fetch(prefix + path + (path.includes('?') ? '&' : '?') + 't=' + Date.now(), { cache: 'no-store' });
        if (r.ok) return r;
        last = new Error('HTTP ' + r.status);
      } catch (e) { last = e; }
    }
    throw last || new Error('Нет зеркала обновлений');
  };
  try {
    const v = await (await get('version.json')).json();
    if (Number.isInteger(v.data) && v.data > Number(localStorage.getItem('f2-data') || 0)) {
      const c = await (await get('content.json')).json();
      if (c && c.v === v.data && Array.isArray(c.topics)) {
        localStorage.setItem('f2-content', JSON.stringify(c));
        localStorage.setItem('f2-data', String(v.data));
        BANK = null;
      }
    }
    if (Number.isInteger(v.build) && v.build > F2_BUILD && localStorage.getItem('f2-app-bad') !== String(v.build)) {
      const h = await (await get('index.html')).text();
      if (h.includes('const F2_BUILD = ' + v.build + ';')) {
        localStorage.setItem('f2-app-html', h);
        localStorage.setItem('f2-app-build', String(v.build));
      }
    }
  } catch (e) {
    // Offline is expected: the APK already contains a complete working copy.
  }
}

/* ---------- запуск ---------- */
function boot() {
  if (F2_IN_APP) { try { localStorage.setItem('f2-app-ok', String(F2_BUILD)); } catch (e) {} }
  Object.assign(ui, { main: $('#main'), ttl: $('#ttl'), back: $('#back'), tabs: $('#tabs'), lv: $('#lv') });
  ui.back.addEventListener('click', () => { const r = route(); if (r.name === 'quiz') { if (Q && Q.i < Q.items.length && Q.i > 0 && !confirm('Выйти из проверки? Результат не сохранится.')) return; const back = Q && Q.back; Q = null; location.hash = back ? back.slice(1) : ''; } else location.hash = r.parent || ''; });
  window.addEventListener('hashchange', render);
  render();
  if (!F2_IN_APP && 'serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});
  if (F2_IN_APP) setTimeout(checkAppUpdates, 1800);
}
// boot() is called after all feature modules have been loaded (sandbox.js).