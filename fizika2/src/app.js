'use strict';
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
  if (h === 'lab') return { name: 'lab', tab: 'train' };
  if (['book', 'train', 'profile'].includes(h)) return { name: h, tab: h };
  return { name: 'home', tab: 'home' };
}
const ui = {};
let lastHash = null, same = false;
function render() {
  stopLoops();
  const r = route(), y = ui.main.scrollTop; same = lastHash === location.hash; lastHash = location.hash;
  document.body.dataset.view = r.name;
  ui.tabs.querySelectorAll('a').forEach(a => a.classList.toggle('on', a.dataset.tab === r.tab));
  ui.tabs.hidden = r.name === 'quiz' || r.name === 'lesson';
  ({ home: vHome, book: vBook, chapter: vChapter, lesson: vLesson, quiz: vQuiz, train: vTrain, lab: vLab, profile: vProfile })[r.name](r);
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
function stopLoops() { if (V) { V.playing = false; cancelAnimationFrame(V.raf); if (V.audio) V.audio.pause(); V = null; } if (G && G.raf) cancelAnimationFrame(G.raf); }

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
    `<h2 class="sec">Практика по учебнику</h2><button class="qrow card" data-act="chQuiz" data-ch="1">${ic('target')}<span><b>Кинематика · глава 1</b><small>14 вопросов по пройденному материалу</small></span>${ic('chevron-right')}</button>` +
    `<button class="qrow card" data-act="lab"><span class="blue">${ic('flask-conical')}</span><span><b>Виртуальная лаборатория</b><small>Исследуй пружинный маятник и математический маятник</small></span>${ic('chevron-right')}</button>`);
}


/* ---------- Виртуальная лаборатория ---------- */
let LAB = { mode: 'spring', mass: 1, k: 20, length: 1, angle: 20 };
function vLab() {
  frame('Лаборатория', { back: true, sub: 'Меняй параметры и наблюдай результат' });
  const spring = LAB.mode === 'spring';
  setMain(`<div class="lab-switch"><button class="btn ${spring ? '' : 'line'}" data-act="labMode" data-v="spring">Пружинный маятник</button><button class="btn ${!spring ? '' : 'line'}" data-act="labMode" data-v="pendulum">Математический маятник</button></div>` +
    `<section class="card lab-card"><div class="row"><b>${spring ? 'Колебания груза на пружине' : 'Колебания маятника'}</b><small>интерактивный опыт</small></div><canvas id="lab-canvas" width="720" height="300" aria-label="Схема физического эксперимента"></canvas><p class="mute small" id="lab-caption">${spring ? 'Увеличивай массу — система колеблется медленнее. Увеличивай жёсткость — быстрее.' : 'Чем длиннее нить, тем больше период. Масса груза на период идеального маятника не влияет.'}</p></section>` +
    (spring ? `<section class="card lab-controls"><label>Масса груза <b id="lab-mass-val">${f1(LAB.mass, 1)} кг</b><input type="range" min="0.2" max="3" step="0.1" value="${LAB.mass}" data-lab="mass"></label><label>Жёсткость пружины <b id="lab-k-val">${f1(LAB.k, 0)} Н/м</b><input type="range" min="5" max="60" step="1" value="${LAB.k}" data-lab="k"></label></section>` :
    `<section class="card lab-controls"><label>Длина нити <b id="lab-length-val">${f1(LAB.length, 1)} м</b><input type="range" min="0.3" max="2" step="0.1" value="${LAB.length}" data-lab="length"></label><label>Начальный угол <b id="lab-angle-val">${f1(LAB.angle, 0)}°</b><input type="range" min="5" max="45" step="1" value="${LAB.angle}" data-lab="angle"></label></section>`) +
    `<section class="lab-results"><div class="card"><small>Период T</small><b id="lab-period">—</b></div><div class="card"><small>Частота ν</small><b id="lab-frequency">—</b></div></section><section class="card"><b>Физический смысл</b><p class="mute" id="lab-explain">${spring ? 'Период пружинного маятника зависит от массы и жёсткости пружины.' : 'Для малых колебаний период математического маятника зависит от длины нити и ускорения свободного падения.'}</p><div class="formula" id="lab-formula">${spring ? 'T = 2π√(m / k)' : 'T = 2π√(l / g)'}</div></section>` +
    `<button class="btn line wide" data-act="trainBack">Вернуться к тренировке</button>`);
  labDraw();
}
function labDraw() {
  const cv = $('#lab-canvas'); if (!cv) return;
  const c = cv.getContext('2d'), w = cv.width, h = cv.height;
  c.clearRect(0, 0, w, h); c.fillStyle = '#0E1424'; c.fillRect(0, 0, w, h);
  c.strokeStyle = 'rgba(141,151,181,.12)'; c.lineWidth = 1;
  for (let x = 0; x < w; x += 36) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, h); c.stroke(); }
  for (let y = 0; y < h; y += 36) { c.beginPath(); c.moveTo(0, y); c.lineTo(w, y); c.stroke(); }
  c.lineCap = 'round'; c.lineJoin = 'round';
  if (LAB.mode === 'spring') {
    const top = 28, left = 310, massW = 76 + LAB.mass * 12, massH = 48 + LAB.mass * 5, endY = 178;
    c.fillStyle = '#26324F'; c.fillRect(220, top, 280, 12);
    c.strokeStyle = '#8D97B5'; c.lineWidth = 3; c.beginPath(); c.moveTo(left, top + 12); c.lineTo(left, 58); c.stroke();
    const coils = 12, springLen = 95 + LAB.mass * 17;
    c.strokeStyle = '#6C8CFF'; c.lineWidth = 5; c.beginPath(); c.moveTo(left, 58);
    for (let i = 1; i <= coils; i++) c.lineTo(left + (i % 2 ? 22 : -22), 58 + springLen * i / coils);
    c.lineTo(left, 58 + springLen); c.stroke();
    const y = 58 + springLen;
    c.fillStyle = '#B48CFF'; c.strokeStyle = '#D8C8FF'; c.lineWidth = 3;
    c.beginPath(); c.roundRect(left - massW/2, y, massW, massH, 12); c.fill(); c.stroke();
    c.fillStyle = '#F2F4FF'; c.font = 'bold 22px sans-serif'; c.textAlign = 'center'; c.fillText(f1(LAB.mass,1) + ' кг', left, y + massH/2 + 7);
    c.fillStyle = '#8D97B5'; c.font = '16px sans-serif'; c.fillText('Пружина', 500, 82); c.fillText('Груз', 500, y + massH/2 + 6);
    c.strokeStyle = '#3DD6A0'; c.lineWidth = 4; c.beginPath(); c.moveTo(430, y + 4); c.lineTo(430, y + massH - 4); c.stroke();
  } else {
    const px = 360, py = 32, len = 75 + LAB.length * 90, a = LAB.angle * Math.PI / 180;
    const bx = px + len * Math.sin(a), by = py + len * Math.cos(a);
    c.fillStyle = '#26324F'; c.fillRect(px - 145, py - 10, 290, 14);
    c.strokeStyle = '#6C8CFF'; c.lineWidth = 5; c.beginPath(); c.moveTo(px, py); c.lineTo(bx, by); c.stroke();
    c.strokeStyle = 'rgba(255,194,75,.7)'; c.lineWidth = 2; c.beginPath(); c.arc(px, py, 56, Math.PI/2, Math.PI/2 + a, false); c.stroke();
    c.fillStyle = '#FFC24B'; c.beginPath(); c.arc(bx, by, 24, 0, Math.PI*2); c.fill();
    c.fillStyle = '#F2F4FF'; c.beginPath(); c.arc(px, py, 7, 0, Math.PI*2); c.fill();
    c.fillStyle = '#8D97B5'; c.font = '16px sans-serif'; c.textAlign = 'left'; c.fillText('Точка подвеса', px + 18, py + 5); c.fillText('L = ' + f1(LAB.length,1) + ' м', 500, 110);
  }
  const T = LAB.mode === 'spring' ? 2 * Math.PI * Math.sqrt(LAB.mass / LAB.k) : 2 * Math.PI * Math.sqrt(LAB.length / 9.81);
  $('#lab-period').textContent = f1(T, 2) + ' с';
  $('#lab-frequency').textContent = f1(1 / T, 2) + ' Гц';
  if (LAB.mode === 'spring') {
    $('#lab-mass-val').textContent = f1(LAB.mass,1) + ' кг'; $('#lab-k-val').textContent = f1(LAB.k,0) + ' Н/м';
  } else {
    $('#lab-length-val').textContent = f1(LAB.length,1) + ' м'; $('#lab-angle-val').textContent = f1(LAB.angle,0) + '°';
  }
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
  switch (d.act) {
    case 'closeSheet': closeSheet(); break;
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
    case 'labMode': LAB.mode = d.v; render(); break;
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
});
document.addEventListener('pointerdown', e => { if (e.target.closest('#vseek')) vSeek(e); });
document.addEventListener('input', e => { const k = e.target.dataset.lab; if (k) { LAB[k] = Number(e.target.value); labDraw(); } });
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
boot();
