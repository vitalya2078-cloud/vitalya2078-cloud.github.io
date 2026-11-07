/* ---------- Обучение: страница темы, конспект, мини-игры, самопроверка ---------- */
const PASS = 80; // порог самопроверки, %
let readSet = new Set(Array.isArray(LS.get('fz-read', [])) ? LS.get('fz-read', []) : []);
let checks = LS.get('fz-check', {}); if (!checks || typeof checks !== 'object') checks = {};
let games = LS.get('fz-games', {}); if (!games || typeof games !== 'object') games = {};
// все игры темы — это игры её лекций
const topicGames = t => (t.learn ? t.learn.notes : []).flatMap(n => lectureGames(n).map(x => gameKey(t, n, x.g)));
const stars = n => '<span class="stars" aria-label="' + n + ' из 3">' + [1, 2, 3].map(i => `<i class="${i <= n ? 'on' : ''}">★</i>`).join('') + '</span>';
function learnProgress(t) {
  if (!t.learn) return '';
  const notes = t.learn.notes || [], r = notes.filter(n => readSet.has(t.id + '-' + n.id)).length;
  const gs = topicGames(t), g = gs.filter(k => games[k]).length, c = checks[t.id];
  return `Конспект ${r}/${notes.length}, игры ${g}/${gs.length}` + (c != null ? `, самопроверка ${Math.round(c)}%` : '');
}

function vHub(r) {
  const t = T.find(x => x.id === r.tid), items = topicItems(t.id), s = tstat(items);
  LS.set('fz-last', t.id);
  frame({ title: `<span><span class="tglyph">${GLYPH[t.id] || ''}</span>${esc(t.title)}</span>`, back: true });
  const L = t.learn;
  let html = '';
  if (L) {
    const notes = L.notes || [], read = notes.filter(n => readSet.has(t.id + '-' + n.id)).length, gs = topicGames(t), c = checks[t.id];
    const step = (n, done, title, sub) => `<li class="${done ? 'done' : ''}"><span class="sn">${done ? '✓' : n}</span><span><b>${title}</b><small>${sub}</small></span></li>`;
    html += `<ol class="path">${step(1, read === notes.length, 'Конспект', `прочитано ${read} из ${notes.length}`)}${step(2, gs.length && gs.every(k => games[k]), 'Мини-игры', `пройдено ${gs.filter(k => games[k]).length} из ${gs.length} — по 3 в каждой лекции`)}${step(3, c >= PASS, 'Самопроверка', c != null ? `лучший результат ${Math.round(c)}%` : `10 вопросов, порог ${PASS}%`)}${step(4, false, 'Тест и экзамен', progressText(items))}</ol>`;
    html += '<h2 class="sec">Лекции</h2><div class="group">' + notes.map((n, i) => {
      const done = readSet.has(t.id + '-' + n.id), nc = checks[t.id + '-' + n.id], lg = lectureGames(n), gd = lg.filter(x => games[gameKey(t, n, x.g)]).length;
      const meta = [n.audio ? `озвучка ${Math.round(n.audio.dur / 60)} мин` : '', lg.length ? `игры ${gd}/${lg.length}` : '', nc != null ? `проверка ${Math.round(nc)}%` : ''].filter(Boolean).join(', ');
      return `<a class="row note-row" href="#n${t.id}-${i + 1}"><span class="nn ${done ? 'done' : ''}">${done ? '✓' : i + 1}</span><span><b>${esc(n.title)}</b><small>${esc(n.lead)}</small>${meta ? `<small class="meta">${meta}</small>` : ''}</span>${ico('chev')}</a>`;
    }).join('') + '</div>';
    html += `<h2 class="sec">Самопроверка</h2><section class="panel check"><p>10 вопросов по всему конспекту темы, сразу с пояснениями. Наберёшь ${PASS}% — тема отмечается пройденной.</p>` +
      `${c != null ? `<p class="${c >= PASS ? 'okc' : 'badc'}"><b>Лучший результат: ${Math.round(c)}%</b>${c >= PASS ? ' — тема пройдена' : ' — пока ниже порога'}</p>` : ''}<button class="btn wide" type="button" data-act="selfCheck" data-t="${t.id}">Пройти самопроверку</button></section>`;
  } else {
    html += '<div class="hint"><p><b>Конспект и мини-игры для этой темы готовятся.</b> Пока можно учить вопросы с пояснениями и проходить тесты. Новые материалы придут обновлением.</p></div>';
  }
  html += `<h2 class="sec">Вопросы и тесты</h2><div class="group"><a class="row" href="#t${t.id}q"><span><b>Все вопросы с ответами</b><small>${progressText(items)}</small></span>${ico('chev')}</a>` +
    `<button class="row" type="button" data-act="testTopic" data-t="${t.id}"><span><b>Тест по теме</b><small>Баллы и оценка, как на экзамене</small></span>${ico('chev')}</button></div>`;
  setMain(html);
}

/* ---------- Конспект ---------- */
function vNote(r) {
  const t = T.find(x => x.id === r.tid), L = t.learn, n = L && L.notes[r.idx - 1];
  if (!n) { location.hash = 't' + r.tid; return; }
  readSet.add(t.id + '-' + n.id); LS.set('fz-read', [...readSet]);
  const total = L.notes.length, prev = r.idx > 1 ? `#n${t.id}-${r.idx - 1}` : '', next = r.idx < total ? `#n${t.id}-${r.idx + 1}` : '';
  frame({
    title: `<span class="tq">${esc(n.title)}</span><small>Лекция ${r.idx} из ${total}</small>`, back: true,
    abar: (prev ? `<a class="btn line" href="${prev}">Назад</a>` : '') + `<button class="btn" type="button" data-act="noteCheck" data-t="${t.id}" data-n="${r.idx}">Проверь себя</button>` + (next ? `<a class="btn line" href="${next}">Дальше</a>` : `<a class="btn line" href="#t${t.id}">К теме</a>`)
  });
  const body = n.blocks.map(b => {
    switch (b[0]) {
      case 'p': return `<p>${nl(b[1])}</p>`;
      case 'h': return `<h3>${esc(b[1])}</h3>`;
      case 'def': return `<p class="def"><b>${esc(b[1])}</b> — ${nl(b[2])}</p>`;
      case 'f': return `<div class="formula">${b[1].split('\n').map(l => `<span>${esc(l)}</span>`).join('')}</div>`;
      case 'trap': return `<div class="trap"><b>Частая ошибка</b><p>${nl(b[1])}</p></div>`;
      case 'ex': return `<div class="example"><b>${esc(b[1])}</b><p>${nl(b[2])}</p></div>`;
      default: return '';
    }
  }).join('');
  setMain(player(t, n) + `<article class="conspect"><p class="lead">${esc(n.lead)}</p>${body}</article>` + gamesBlock(t, n, r.idx) +
    `<section class="panel check next-step"><p><b>Проверь себя по лекции</b> — ${plural(n.c.length, 'вопрос', 'вопроса', 'вопросов')} по этому конспекту, сразу с пояснениями.</p></section>`);
}

/* ---------- Самопроверка ---------- */
// вопросы самопроверки — свои, по материалу конспекта (не из базы теста)
const ownItem = (t, n, k) => { const c = n.c[k]; return { t, i: k + 1, lbl: n.title, own: true, key: `c${t.id}-${n.id}-${k}`, q: { t: c[0], a: c[1], x: c[2], e: c[3], p: '', n: '', own: true } }; };
function pickCheck(t, noteIdx) {
  const L = t.learn;
  if (noteIdx) { const n = L.notes[noteIdx - 1]; return shuffle(n.c.map((_, k) => ownItem(t, n, k))); }
  const pools = shuffle(L.notes).map(n => shuffle(n.c.map((_, k) => ownItem(t, n, k)))), out = [];
  for (let k = 0; out.length < 10 && k < 5; k++) pools.forEach(pq => { if (out.length < 10 && pq[k]) out.push(pq[k]); });
  return shuffle(out);
}
function checkBanner(pts) {
  if (test.kind !== 'check') return '';
  const key = test.note ? test.tid + '-' + test.note : String(test.tid), prevBest = checks[key];
  if (!test.checkSaved) { checks[key] = Math.max(prevBest || 0, pts); LS.set('fz-check', checks); test.checkSaved = true; }
  const ok = pts >= PASS - 1e-9;
  const what = test.note ? 'Лекция закреплена' : 'Тема пройдена';
  return `<div class="hint ${ok ? 'pass' : 'fail'}"><p><b>${ok ? what + '!' : 'Пока ниже порога ' + PASS + '%.'}</b> ${ok ? 'Можно переходить дальше.' : 'Перечитай конспект по вопросам с ошибками и попробуй ещё раз.'}</p><a class="btn sm" href="#t${test.tid}">К теме</a></div>`;
}


/* ---------- Озвучка лекций ---------- */
// Файл скачивается один раз (с сайта) и хранится в IndexedDB — потом работает без интернета
const AUD = { el: null, file: '', url: '' };
function player(t, n) {
  if (!n.audio) return '';
  const pos = LS.get('fz-apos', {})[n.audio.file] || 0;
  return `<section class="player" data-file="${n.audio.file}" data-dur="${n.audio.dur}"><button class="pp" type="button" data-act="audPlay" aria-label="Слушать лекцию"><svg class="i" viewBox="0 0 24 24" aria-hidden="true"><path class="pi" d="M8 5l11 7-11 7z"/></svg></button>` +
    `<div class="pmid"><b>Слушать лекцию</b><input id="aseek" type="range" min="0" max="${n.audio.dur}" step="1" value="${pos}" aria-label="Перемотка"><small id="atime">${mmss(Math.round(pos))} / ${mmss(Math.round(n.audio.dur))}</small></div>` +
    `<button class="rate-btn" type="button" data-act="audRate" aria-label="Скорость">${f1(LS.get('fz-arate', 1), 2)}×</button></section>`;
}
async function audioUrl(file) {
  const cached = await idb.get('aud:' + file);
  if (cached) return URL.createObjectURL(cached);
  const blob = IN_APP ? await fetchMirror('audio/' + encodeURIComponent(file), {}, r => r.blob())
    : await fetch('audio/' + encodeURIComponent(file)).then(r => { if (!r.ok) throw new Error(r.status); return r.blob(); }); idb.set('aud:' + file, blob).catch(() => {});
  return URL.createObjectURL(blob);
}
function stopAudio() { if (AUD.el) AUD.el.pause(); }
function audIcon(playing) { const p = document.querySelector('.player .pi'); if (p) p.setAttribute('d', playing ? 'M7 5h4v14H7zM13 5h4v14h-4z' : 'M8 5l11 7-11 7z'); }
function savePos() { if (!AUD.file || !AUD.el) return; const p = LS.get('fz-apos', {}); p[AUD.file] = AUD.el.ended ? 0 : AUD.el.currentTime; LS.set('fz-apos', p); }
async function audPlay() {
  const box = $('.player'); if (!box) return; const file = box.dataset.file;
  if (!AUD.el) {
    AUD.el = new Audio(); AUD.el.preload = 'auto';
    AUD.el.addEventListener('timeupdate', () => {
      const s = $('#aseek'), tm = $('#atime'), pl = $('.player');
      if (s && pl && pl.dataset.file === AUD.file) { s.value = AUD.el.currentTime; tm.textContent = `${mmss(Math.round(AUD.el.currentTime))} / ${mmss(Math.round(+pl.dataset.dur))}`; }
    });
    AUD.el.addEventListener('pause', () => { audIcon(false); savePos(); });
    AUD.el.addEventListener('play', () => audIcon(true));
    AUD.el.addEventListener('ended', () => { audIcon(false); savePos(); });
  }
  if (AUD.file === file && !AUD.el.paused) { AUD.el.pause(); return; }
  if (AUD.file !== file) {
    const tm = $('#atime'); if (tm) tm.textContent = 'Загружаю озвучку…';
    try {
      const url = await audioUrl(file);
      if (AUD.url) URL.revokeObjectURL(AUD.url);
      AUD.url = url; AUD.file = file; AUD.el.src = url;
      AUD.el.currentTime = LS.get('fz-apos', {})[file] || 0;
    } catch (e) { if (tm) tm.textContent = 'Нужен интернет, чтобы один раз скачать озвучку'; return; }
  }
  AUD.el.playbackRate = LS.get('fz-arate', 1);
  AUD.el.play().catch(() => {});
}
document.addEventListener('click', e => {
  const b = e.target.closest('[data-act]'); if (!b) return;
  if (b.dataset.act === 'audPlay') audPlay();
  if (b.dataset.act === 'audRate') {
    const rates = [1, 1.25, 1.5, 0.85], cur = LS.get('fz-arate', 1), nx = rates[(rates.indexOf(cur) + 1) % rates.length];
    LS.set('fz-arate', nx); b.textContent = f1(nx, 2) + '×'; if (AUD.el) AUD.el.playbackRate = nx;
  }
});
document.addEventListener('input', e => {
  if (e.target.id === 'aseek' && AUD.el && $('.player') && AUD.file === $('.player').dataset.file) AUD.el.currentTime = +e.target.value;
});
/* ---------- Мини-игры: у каждой лекции свои ---------- */
// Игры лекции: симуляция по её теме + «Найди пару» + «Верю — не верю» на её материале
const f1 = (v, d = 1) => (Math.round(v * 10 ** d) / 10 ** d).toString().replace('.', ',');
const pick = a => a[Math.random() * a.length | 0];
function lectureGames(n) {
  const P = n.play || {}, out = [];
  if (P.sim && SIMS[P.sim]) out.push({ g: 'sim', title: SIMS[P.sim].title, lead: SIMS[P.sim].lead });
  if (P.pairs && P.pairs.length >= 6) out.push({ g: 'pair', title: 'Найди пару', lead: 'Соедини понятия лекции с формулами и определениями.' });
  if (P.tf && P.tf.length >= 6) out.push({ g: 'tf', title: 'Верю — не верю', lead: 'Утверждения по лекции: верно или нет?' });
  return out;
}
const gameKey = (t, n, g) => `${t.id}-${n.id}-${g}`;
function gamesBlock(t, n, idx) {
  const gs = lectureGames(n); if (!gs.length) return '';
  return `<h2 class="sec">Мини-игры по лекции</h2><div class="games">` + gs.map(x => {
    const best = games[gameKey(t, n, x.g)];
    return `<a class="game-card g-${x.g}" href="#g${t.id}-${idx}-${x.g}"><b>${x.title}</b><small>${x.lead}</small>${best ? stars(best.stars) : '<span class="new">Не пройдена</span>'}</a>`;
  }).join('') + '</div>';
}

let G = null; // состояние текущей игры
function stopGame() { if (G && G.raf) cancelAnimationFrame(G.raf); if (G && G.tick) clearInterval(G.tick); if (G) { G.raf = 0; G.tick = 0; } }
function saveGame(key, score, starsN) {
  const b = games[key];
  if (!b || starsN > b.stars || (starsN === b.stars && score > b.score)) { games[key] = { stars: starsN, score, d: Date.now() }; LS.set('fz-games', games); }
}
function vGame(r) {
  const t = T.find(x => x.id === r.tid), n = t.learn && t.learn.notes[r.idx - 1];
  const gi = n && lectureGames(n).find(x => x.g === r.game);
  if (!gi) { location.hash = 't' + r.tid; return; }
  frame({ title: `<span class="tq">${gi.title}</span><small>${esc(n.title)}</small>`, back: true, tabs: false });
  const base = { t, n, idx: r.idx, g: r.game, title: gi.title };
  if (r.game === 'pair') gPair(base); else if (r.game === 'tf') gTf(base);
  else if (n.play.sim === 'throw') gThrow(base); else gSim(base, SIMS[n.play.sim]);
}
function gameEnd(starsN, text, score) {
  const { t, n, idx, g, title } = G;
  saveGame(gameKey(t, n, g), score, starsN); stopGame(); buzz(starsN === 3 ? [20, 60, 20] : 20);
  const other = lectureGames(n).filter(x => x.g !== g && !games[gameKey(t, n, x.g)]);
  frame({ title: `<span class="tq">${title}</span><small>Результат</small>`, back: true, tabs: false,
    abar: `<button class="btn" type="button" data-act="gameAgain">Сыграть ещё</button><a class="btn line" href="#n${t.id}-${idx}">К лекции</a>` });
  setMain(`<section class="score game-end"><div class="big-stars">${stars(starsN)}</div><div><b>${text}</b><span>${starsN === 3 ? 'Отлично!' : starsN === 2 ? 'Хорошо. Можно лучше.' : 'Попробуй ещё раз — получится лучше.'}</span></div></section>` +
    (other.length ? `<div class="group"><a class="row" href="#g${t.id}-${idx}-${other[0].g}"><span><b>Следующая игра: ${other[0].title}</b><small>${other[0].lead}</small></span>${ico('chev')}</a></div>` : ''));
}
const starsBy = (tries, rounds) => tries <= rounds + 1 ? 3 : tries <= rounds + 4 ? 2 : 1;

// «Найди пару»
function gPair(base) {
  const pairs = shuffle(base.n.play.pairs).slice(0, 6);
  G = Object.assign(base, { kind: 'pair', pairs, left: shuffle(pairs.map((p, i) => i)), right: shuffle(pairs.map((p, i) => i)), sel: null, done: new Set(), miss: 0, t0: Date.now() });
  drawPair();
  G.tick = setInterval(() => { const el = $('#gtime'); if (el) el.textContent = Math.floor((Date.now() - G.t0) / 1000) + ' с'; }, 500);
}
function drawPair() {
  const b = (side, i) => `<button type="button" class="pc ${side}${side === 'r' && !/[а-яё]/i.test(G.pairs[i][1]) ? ' math' : ''}${G.done.has(i) ? ' done' : ''}${G.sel && G.sel.side === side && G.sel.i === i ? ' sel' : ''}" data-act="pairPick" data-side="${side}" data-i="${i}"${G.done.has(i) ? ' disabled' : ''}>${esc(G.pairs[i][side === 'l' ? 0 : 1])}</button>`;
  ui.abar.innerHTML = `<p class="abar-note">Пар: ${G.done.size} из ${G.pairs.length}. Ошибок: ${G.miss}. Время: <b id="gtime">${Math.floor((Date.now() - G.t0) / 1000)} с</b></p>`; ui.abar.hidden = false;
  ui.main.innerHTML = `<p class="note gtop">Нажми понятие слева, потом подходящее справа.</p><div class="pairs"><div>${G.left.map(i => b('l', i)).join('')}</div><div>${G.right.map(i => b('r', i)).join('')}</div></div>`;
}
function pairPick(side, i) {
  if (!G.sel || G.sel.side === side) { G.sel = { side, i }; drawPair(); return; }
  const ok = G.sel.i === i;
  if (ok) { G.done.add(i); buzz(12); } else { G.miss++; buzz([30, 40, 30]); }
  G.sel = null; drawPair();
  if (!ok) { const bad = document.querySelector(`.pc.${side}[data-i="${i}"]`); if (bad) bad.classList.add('shake'); }
  if (G.done.size === G.pairs.length) {
    const sec = Math.round((Date.now() - G.t0) / 1000), st = G.miss === 0 ? 3 : G.miss <= 2 ? 2 : 1;
    gameEnd(st, `${G.pairs.length} пар за ${sec} с, ошибок: ${G.miss}`, 1000 - sec - G.miss * 10);
  }
}

// «Верю — не верю»
function gTf(base) {
  G = Object.assign(base, { kind: 'tf', items: shuffle(base.n.play.tf).slice(0, 8), i: 0, ok: 0, ans: null });
  drawTf();
}
function drawTf() {
  const it = G.items[G.i], n = G.items.length;
  ui.abar.hidden = false;
  ui.abar.innerHTML = G.ans == null ? `<button class="btn tf-yes" type="button" data-act="tfAns" data-v="1">Верно</button><button class="btn tf-no" type="button" data-act="tfAns" data-v="0">Неверно</button>`
    : `<button class="btn wide" type="button" data-act="tfNext">${G.i + 1 < n ? 'Следующее утверждение' : 'Результат'}</button>`;
  const res = G.ans == null ? '' : `<p class="verdict ${G.ans === it[1] ? 'ok' : 'bad'}">${G.ans === it[1] ? 'Правильно' : 'Неправильно'}: это ${it[1] ? 'верно' : 'неверно'}.</p><p class="tf-why">${esc(it[2])}</p>`;
  ui.main.innerHTML = `<div class="tprog">${ruler(G.ok, G.i + (G.ans != null ? 1 : 0) - G.ok, n)}</div><p class="note gtop">Утверждение ${G.i + 1} из ${n}. Верно: ${G.ok}</p><article class="q tf-card"><p class="qt">${esc(it[0])}</p>${res}</article>`;
}

/* ---------- холст ---------- */
const CV = () => { const cv = $('#cv'); if (!cv) return null; const cs = getComputedStyle(document.documentElement); const c = cv.getContext('2d'); const col = k => cs.getPropertyValue('--' + k).trim(); return { cv, c, W: cv.width, H: cv.height, col }; };
function bgGrid(k, step = 36) {
  const { c, W, H, col } = k; c.fillStyle = col('sheet'); c.fillRect(0, 0, W, H);
  c.strokeStyle = col('line'); c.lineWidth = 1;
  for (let x = 0; x < W; x += step) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, H); c.stroke(); }
  for (let y = 0; y < H; y += step) { c.beginPath(); c.moveTo(0, y); c.lineTo(W, y); c.stroke(); }
}
function arrow(c, x1, y1, x2, y2, color, w = 4) {
  c.strokeStyle = color; c.fillStyle = color; c.lineWidth = w; c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke();
  const a = Math.atan2(y2 - y1, x2 - x1); c.beginPath(); c.moveTo(x2, y2); c.lineTo(x2 - 14 * Math.cos(a - .4), y2 - 14 * Math.sin(a - .4)); c.lineTo(x2 - 14 * Math.cos(a + .4), y2 - 14 * Math.sin(a + .4)); c.fill();
}
const label = (c, t, x, y, color, size = 16, align = 'left') => { size = Math.round(size * 1.7); /* холст ужимается до ширины телефона — шрифт крупнее */ c.fillStyle = color; c.font = `600 ${size}px system-ui, sans-serif`; c.textAlign = align; c.fillText(t, x, y); c.textAlign = 'left'; };

/* ---------- «Попади в цель» (кинематика): L = v²·sin2α/g ---------- */
function gThrow(base) {
  G = Object.assign(base, { kind: 'throw', round: 1, rounds: 5, shots: 0, ang: 45, v: 15, flying: false, path: [], last: null });
  newTarget(); drawThrow();
}
function newTarget() { G.target = Math.round((8 + Math.random() * 30) * 2) / 2; G.width = 1.6; G.path = []; G.last = null; }
function drawThrow() {
  ui.abar.hidden = false;
  ui.abar.innerHTML = `<button class="btn wide" type="button" data-act="throwGo"${G.flying ? ' disabled' : ''}>Бросок</button>`;
  ui.main.innerHTML = `<p class="note gtop">Цель ${G.round} из ${G.rounds}. Бросков: ${G.shots}. Мишень на расстоянии <b>${f1(G.target)} м</b>.</p>` +
    `<canvas id="cv" class="throw-cv" width="720" height="360" aria-label="Поле броска"></canvas>` +
    `<p class="note tmsg" id="tmsg">${G.last || 'Подбери угол и скорость. Дальность L = v²·sin 2α / g, при 45° она максимальна.'}</p>` +
    `<label class="range"><span>Угол: <b id="vang">${G.ang}°</b></span><input id="sang" type="range" min="10" max="80" step="1" value="${G.ang}"></label>` +
    `<label class="range"><span>Скорость: <b id="vv">${f1(G.v)} м/с</b></span><input id="sv" type="range" min="5" max="22" step="0.5" value="${G.v}"></label>`;
  paintThrow();
}
const calcL = () => G.v * G.v * Math.sin(2 * G.ang * Math.PI / 180) / 9.8;
function paintThrow(ball) {
  const k = CV(); if (!k) return; const { c, W, H, col } = k;
  const X0 = 30, Y0 = H - 40, sx = (W - 60) / 50, sy = sx;
  c.fillStyle = col('sheet'); c.fillRect(0, 0, W, H);
  c.strokeStyle = col('line'); c.lineWidth = 1;
  for (let m = 0; m <= 50; m += 5) { const x = X0 + m * sx; c.beginPath(); c.moveTo(x, 0); c.lineTo(x, Y0); c.stroke(); }
  for (let m = 0; m * sy < Y0; m += 5) { const y = Y0 - m * sy; c.beginPath(); c.moveTo(X0, y); c.lineTo(W, y); c.stroke(); }
  c.fillStyle = col('muted'); c.font = '600 20px system-ui'; for (let m = 0; m <= 50; m += 10) c.fillText(m + ' м', X0 + m * sx - 12, Y0 + 26);
  c.strokeStyle = col('text'); c.lineWidth = 2; c.beginPath(); c.moveTo(0, Y0); c.lineTo(W, Y0); c.stroke();
  const tx = X0 + G.target * sx; c.fillStyle = col('red');
  c.fillRect(tx - G.width / 2 * sx, Y0 - 6, G.width * sx, 6); c.fillRect(tx - 1, Y0 - 40, 2, 34);
  c.beginPath(); c.moveTo(tx + 1, Y0 - 40); c.lineTo(tx + 18, Y0 - 33); c.lineTo(tx + 1, Y0 - 26); c.fill();
  const a = G.ang * Math.PI / 180; c.strokeStyle = col('ink'); c.lineWidth = 3;
  c.beginPath(); c.moveTo(X0, Y0); c.lineTo(X0 + Math.cos(a) * 40, Y0 - Math.sin(a) * 40); c.stroke();
  c.lineWidth = 2; c.setLineDash([5, 5]); c.beginPath();
  G.path.forEach(([x, y], i) => { const px = X0 + x * sx, py = Y0 - y * sy; i ? c.lineTo(px, py) : c.moveTo(px, py); }); c.stroke(); c.setLineDash([]);
  if (ball) { c.fillStyle = col('ink'); c.beginPath(); c.arc(X0 + ball[0] * sx, Y0 - ball[1] * sy, 7, 0, 7); c.fill(); }
}
function throwGo() {
  if (G.flying) return;
  G.flying = true; G.shots++; G.path = [];
  const a = G.ang * Math.PI / 180, vx = G.v * Math.cos(a), vy = G.v * Math.sin(a), T_ = 2 * vy / 9.8, L = calcL();
  const btn = $('[data-act=throwGo]'); if (btn) btn.disabled = true;
  const t0 = performance.now();
  const step = now => {
    const tt = Math.min(T_, (now - t0) / 1000 * 1.6), x = vx * tt, y = vy * tt - 9.8 * tt * tt / 2;
    G.path.push([x, Math.max(0, y)]); paintThrow([x, Math.max(0, y)]);
    if (tt < T_ && G.kind === 'throw') { G.raf = requestAnimationFrame(step); return; }
    G.flying = false;
    const d = L - G.target, hit = Math.abs(d) <= G.width / 2;
    const calc = `L = ${f1(G.v)}²·sin ${2 * G.ang}° / 9,8 = ${f1(L)} м`;
    if (hit) {
      buzz([15, 40, 15]);
      if (G.round >= G.rounds) return gameEnd(starsBy(G.shots, G.rounds + 2), `${G.rounds} целей за ${plural(G.shots, 'бросок', 'броска', 'бросков')}`, 100 - G.shots);
      G.round++; G.last = `Попадание! ${calc}. Новая цель.`; newTarget(); drawThrow();
    } else {
      buzz(25); G.last = `${d > 0 ? 'Перелёт' : 'Недолёт'} на ${f1(Math.abs(d))} м: ${calc}.`;
      $('#tmsg').textContent = G.last; const b2 = $('[data-act=throwGo]'); if (b2) b2.disabled = false;
      $('.gtop').innerHTML = `Цель ${G.round} из ${G.rounds}. Бросков: ${G.shots}. Мишень на расстоянии <b>${f1(G.target)} м</b>.`;
    }
  };
  G.raf = requestAnimationFrame(step);
}

/* ---------- Общий движок «подбери параметр» ---------- */
// sim: { title, lead, rounds, newRound(G), param: {min,max,step,label,unit,init,fmt}, check(G, v) → {ok, msg}, draw(k, G, v, phase 0..1, result) }
function gSim(base, sim) {
  G = Object.assign(base, { kind: 'sim', sim, round: 1, tries: 0, v: sim.param.init, phase: 0, res: null, busy: false });
  sim.newRound(G); drawSim();
}
function drawSim() {
  const { sim } = G, p = sim.param;
  ui.abar.hidden = false;
  ui.abar.innerHTML = `<button class="btn wide" type="button" data-act="simGo"${G.busy ? ' disabled' : ''}>${sim.go || 'Проверить'}</button>`;
  ui.main.innerHTML = `<p class="note gtop">Задание ${G.round} из ${sim.rounds}. Попыток: ${G.tries}.</p><p class="task"><b>${G.task}</b></p>` +
    `<canvas id="cv" class="throw-cv" width="720" height="360" aria-label="${esc(sim.title)}"></canvas>` +
    `<p class="note tmsg" id="tmsg">${G.res ? G.res.msg : sim.hint}</p>` +
    `<label class="range"><span>${p.label}: <b id="pval">${p.fmt(G.v)}</b></span><input id="psl" type="range" min="${p.min}" max="${p.max}" step="${p.step}" value="${G.v}"></label>`;
  sim.draw(CV(), G, G.v, G.res ? 1 : 0, G.res);
}
function simGo() {
  if (G.busy) return;
  G.busy = true; G.tries++; const v = G.v, res = G.sim.check(G, v); G.res = null;
  const btn = $('[data-act=simGo]'); if (btn) btn.disabled = true;
  const t0 = performance.now(), dur = G.sim.anim || 900;
  const step = now => {
    const ph = Math.min(1, (now - t0) / dur);
    G.sim.draw(CV(), G, v, ph, ph >= 1 ? res : null);
    if (ph < 1 && G.kind === 'sim') { G.raf = requestAnimationFrame(step); return; }
    G.busy = false; G.res = res;
    if (res.ok) {
      buzz([15, 40, 15]);
      if (G.round >= G.sim.rounds) return gameEnd(starsBy(G.tries, G.sim.rounds), `${G.sim.rounds} заданий за ${plural(G.tries, 'попытку', 'попытки', 'попыток')}`, 100 - G.tries);
      setTimeout(() => { if (G.kind !== 'sim') return; G.round++; G.res = null; G.sim.newRound(G); drawSim(); }, 1400);
      $('#tmsg').textContent = 'Верно! ' + res.msg;
    } else {
      buzz(25); $('#tmsg').textContent = res.msg; const b2 = $('[data-act=simGo]'); if (b2) b2.disabled = false;
      $('.gtop').textContent = `Задание ${G.round} из ${G.sim.rounds}. Попыток: ${G.tries}.`;
    }
  };
  G.raf = requestAnimationFrame(step);
}

const g_ = 9.8;
const SIMS = {
  throw: { title: 'Попади в цель', lead: 'Подбери угол и скорость броска — дальность полёта по формуле.' },

  // Динамика: вес в лифте P = m(g + a)
  lift: {
    title: 'Лифт', lead: 'Разгони или затормози лифт так, чтобы весы показали нужный вес.', rounds: 4,
    hint: 'Вес P = m(g + a): ускорение вверх увеличивает показания весов, вниз — уменьшает.',
    param: { min: -6, max: 6, step: 0.5, init: 0, label: 'Ускорение лифта', fmt: v => v === 0 ? '0 (равномерно)' : `${f1(Math.abs(v))} м/с² ${v > 0 ? 'вверх' : 'вниз'}` },
    newRound(G) { G.m = pick([50, 55, 60, 65, 70, 75, 80]); const a = pick([-5, -4, -3, -2, -1.5, 1.5, 2, 3, 4, 5]); G.goal = Math.round(G.m * (g_ + a)); G.task = `Человек массой ${G.m} кг стоит на весах. Добейся, чтобы весы показали ${G.goal} Н.`; G.v = 0; },
    check(G, v) { const P = G.m * (g_ + v), ok = Math.abs(P - G.goal) <= G.m * 0.25 + 0.5; return { ok, P, msg: `P = m(g + a) = ${G.m}·(9,8 ${v < 0 ? '−' : '+'} ${f1(Math.abs(v))}) = ${f1(P, 0)} Н${ok ? '' : `. Нужно ${G.goal} Н — ${P < G.goal ? 'больше ускорение вверх' : 'больше ускорение вниз'}.`}` }; },
    draw(k, G, v, ph, res) {
      if (!k) return; const { c, W, H, col } = k; bgGrid(k);
      const cx = W / 2, shift = (res || ph > 0) ? -Math.sign(v) * 30 * Math.sin(ph * Math.PI) : 0;
      c.strokeStyle = col('muted'); c.lineWidth = 2; c.strokeRect(cx - 120, 10, 240, H - 20);
      const top = 70 + shift; c.fillStyle = col('ink-soft'); c.strokeStyle = col('ink'); c.lineWidth = 3; c.fillRect(cx - 100, top, 200, 230); c.strokeRect(cx - 100, top, 200, 230);
      c.beginPath(); c.moveTo(cx, 10); c.lineTo(cx, top); c.stroke();
      c.fillStyle = col('text'); c.beginPath(); c.arc(cx, top + 70, 16, 0, 7); c.fill(); c.fillRect(cx - 12, top + 88, 24, 70); c.fillRect(cx - 12, top + 158, 9, 40); c.fillRect(cx + 3, top + 158, 9, 40);
      c.fillStyle = col('muted'); c.fillRect(cx - 45, top + 198, 90, 14);
      c.fillStyle = col('sheet'); c.fillRect(cx - 34, top + 200, 68, 10);
      label(c, res ? `${f1(res.P, 0)} Н` : '— Н', cx + 130, top + 212, res ? (res.ok ? col('ok') : col('red')) : col('muted'), 26);
      label(c, `цель: ${G.goal} Н`, cx + 130, top + 180, col('muted'), 15);
      if (v !== 0) arrow(c, cx - 170, top + 115, cx - 170, top + 115 - Math.sign(v) * (25 + Math.abs(v) * 10), col('ink'));
      label(c, v === 0 ? 'a = 0' : `a = ${f1(Math.abs(v))}`, cx - 200, top + 160, col('ink'), 15);
    }
  },

  // Законы сохранения: неупругий удар m₁v₁ = (m₁ + m₂)u
  carts: {
    title: 'Сцепка тележек', lead: 'Подбери массу второй тележки, чтобы после сцепки они поехали с нужной скоростью.', rounds: 4, anim: 1500, go: 'Толкнуть',
    hint: 'Импульс сохраняется: m₁v₁ = (m₁ + m₂)·u.',
    param: { min: 0.5, max: 12, step: 0.5, init: 2, label: 'Масса второй тележки', fmt: v => f1(v) + ' кг' },
    newRound(G) { G.m1 = pick([1, 2, 3, 4]); G.v1 = pick([4, 6, 8]); const m2 = pick([0.5, 1, 2, 3, 4, 6, 8, 10].filter(x => x !== G.m1)); G.goal = G.m1 * G.v1 / (G.m1 + m2); G.task = `Тележка ${G.m1} кг едет со скоростью ${G.v1} м/с и сцепляется с неподвижной. Нужно, чтобы вместе они поехали со скоростью ${f1(G.goal, 2)} м/с.`; G.v = 2; },
    check(G, m2) { const u = G.m1 * G.v1 / (G.m1 + m2), ok = Math.abs(u - G.goal) <= 0.02 * G.v1 + 0.005; return { ok, u, msg: `u = m₁v₁/(m₁ + m₂) = ${G.m1}·${G.v1}/(${G.m1} + ${f1(m2)}) = ${f1(u, 2)} м/с${ok ? '' : `. Нужно ${f1(G.goal, 2)} м/с — ${u > G.goal ? 'тяжелее' : 'легче'} вторая тележка.`}` }; },
    draw(k, G, m2, ph, res) {
      if (!k) return; const { c, W, H, col } = k; bgGrid(k);
      const Y = H - 80; c.strokeStyle = col('text'); c.lineWidth = 2; c.beginPath(); c.moveTo(0, Y + 30); c.lineTo(W, Y + 30); c.stroke();
      const w1 = 50 + G.m1 * 8, w2 = 40 + m2 * 8, x2s = W / 2;
      const meet = x2s - w1, t1 = Math.min(1, ph * 2), t2 = Math.max(0, ph * 2 - 1);
      const u = G.m1 * G.v1 / (G.m1 + m2);
      let x1 = 30 + (meet - 30) * t1, x2 = x2s;
      if (t2 > 0) { const d = 200 * t2 * (u / G.v1); x1 = meet + d; x2 = x2s + d; }
      const cart = (x, w, fill, txt) => { c.fillStyle = fill; c.fillRect(x, Y - 26, w, 46); c.fillStyle = col('text'); c.beginPath(); c.arc(x + 12, Y + 22, 8, 0, 7); c.arc(x + w - 12, Y + 22, 8, 0, 7); c.fill(); label(c, txt, x + w / 2, Y + 4, col('sheet'), 15, 'center'); };
      cart(x1, w1, col('ink'), G.m1 + ' кг'); cart(x2, w2, col('muted'), f1(m2) + ' кг');
      if (ph === 0) arrow(c, x1 + w1 / 2, Y - 50, x1 + w1 / 2 + 70, Y - 50, col('ink'));
      label(c, ph === 0 ? `v₁ = ${G.v1} м/с` : res ? `u = ${f1(res.u, 2)} м/с` : '', 20, 40, res ? (res.ok ? col('ok') : col('red')) : col('ink'), 22);
      label(c, `цель: ${f1(G.goal, 2)} м/с`, W - 20, 40, col('muted'), 16, 'right');
    }
  },

  // Вращение: сохранение момента импульса J₁ω₁ = J₂ω₂
  skater: {
    title: 'Фигурист', lead: 'Прижми или раскинь руки так, чтобы фигурист вращался с нужной скоростью.', rounds: 4, anim: 1400, go: 'Вращать',
    hint: 'Момент импульса сохраняется: J₁ω₁ = J₂ω₂. Руки ближе — момент инерции меньше — вращение быстрее.',
    param: { min: 1, max: 5, step: 0.1, init: 4, label: 'Момент инерции (положение рук)', fmt: v => f1(v) + ' кг·м²' },
    newRound(G) { G.J1 = 4; G.w1 = pick([0.5, 1, 1.5]); const J2 = pick([1.2, 1.5, 2, 2.5, 3, 3.5]); G.goal = G.J1 * G.w1 / J2; G.task = `Фигурист с раскинутыми руками (J = 4 кг·м²) вращается с частотой ${f1(G.w1)} об/с. Добейся частоты ${f1(G.goal, 2)} об/с.`; G.v = 4; G.ang = 0; },
    check(G, J) { const w = G.J1 * G.w1 / J, ok = Math.abs(w - G.goal) <= 0.03 * G.goal + 0.01; return { ok, w, msg: `ω₂ = J₁ω₁/J₂ = 4·${f1(G.w1)}/${f1(J)} = ${f1(w, 2)} об/с${ok ? '' : `. Нужно ${f1(G.goal, 2)} об/с — ${w < G.goal ? 'прижми руки сильнее' : 'разведи руки шире'}.`}` }; },
    draw(k, G, J, ph, res) {
      if (!k) return; const { c, W, H, col } = k; bgGrid(k);
      const cx = W / 2, cy = H / 2 + 10, arm = 30 + (J - 1) / 4 * 110, w = res ? res.w : G.w1;
      G.ang = (G.ang || 0) + (ph > 0 ? w * 0.12 : 0.02);
      c.save(); c.translate(cx, cy); c.rotate(G.ang);
      c.strokeStyle = col('ink'); c.lineWidth = 10; c.lineCap = 'round'; c.beginPath(); c.moveTo(-arm, 0); c.lineTo(arm, 0); c.stroke();
      c.fillStyle = col('ink'); c.beginPath(); c.arc(-arm, 0, 9, 0, 7); c.arc(arm, 0, 9, 0, 7); c.fill();
      c.fillStyle = col('text'); c.beginPath(); c.ellipse(0, 0, 34, 22, 0, 0, 7); c.fill(); c.fillStyle = col('sheet'); c.beginPath(); c.arc(0, 0, 13, 0, 7); c.fill();
      c.restore();
      c.strokeStyle = col('muted'); c.setLineDash([4, 6]); c.beginPath(); c.arc(cx, cy, 150, 0, 7); c.stroke(); c.setLineDash([]);
      label(c, res ? `ω = ${f1(res.w, 2)} об/с` : `ω₁ = ${f1(G.w1)} об/с`, 20, 36, res ? (res.ok ? col('ok') : col('red')) : col('ink'), 20);
      label(c, `цель: ${f1(G.goal, 2)} об/с`, W - 20, 36, col('muted'), 16, 'right');
      if (G.kind === 'sim' && !G.busy && !G.raf2) { G.raf2 = requestAnimationFrame(() => { G.raf2 = 0; if (G.kind === 'sim' && G.sim === SIMS.skater && !G.busy && $('#cv')) G.sim.draw(CV(), G, G.v, G.res ? 1 : 0, G.res); }); }
    }
  },

  // Тяготение: пушка Ньютона, космические скорости
  orbit: {
    title: 'Пушка Ньютона', lead: 'Подбери скорость ядра: упасть, выйти на орбиту или улететь навсегда.', rounds: 4, anim: 2600, go: 'Выстрел',
    hint: 'Первая космическая ≈ 7,9 км/с — круговая орбита, вторая ≈ 11,2 км/с — уход от Земли.',
    param: { min: 4, max: 13, step: 0.1, init: 6, label: 'Скорость ядра', fmt: v => f1(v) + ' км/с' },
    tasks: [['fall', 'Пусть ядро упадёт на Землю, пролетев заметное расстояние (больше 1000 км).'], ['circle', 'Выведи ядро на круговую орбиту.'], ['ellipse', 'Выведи ядро на вытянутую (эллиптическую) орбиту, но так, чтобы оно не улетело.'], ['escape', 'Отправь ядро навсегда прочь от Земли.']],
    newRound(G) { const tk = this.tasks[G.round - 1]; G.goal = tk[0]; G.task = tk[1]; G.v = 6; },
    kind(v) { return v >= 11.15 ? 'escape' : v > 8.05 ? 'ellipse' : v >= 7.75 ? 'circle' : 'fall'; }, // старт с высоты 1,1R, круговая скорость там = 7,9
    check(G, v) {
      const kd = this.kind(v), ok = kd === G.goal && !(kd === 'fall' && v < 5);
      const what = { fall: 'ядро упало на Землю', circle: 'круговая орбита', ellipse: 'эллиптическая орбита', escape: 'ядро улетело навсегда' }[kd];
      return { ok, kd, msg: `При ${f1(v)} км/с: ${what}${kd === 'fall' && v < 5 ? ', но слишком близко' : ''}.${ok ? '' : ' Сравни с первой (7,9) и второй (11,2) космическими скоростями.'}` };
    },
    draw(k, G, v, ph, res) {
      if (!k) return; const { c, W, H, col } = k; c.fillStyle = col('sheet'); c.fillRect(0, 0, W, H);
      const cx = W / 2, cy = H / 2 + 40, R = 90;
      c.fillStyle = col('ink-soft'); c.beginPath(); c.arc(cx, cy, R, 0, 7); c.fill(); c.strokeStyle = col('ink'); c.lineWidth = 2; c.stroke();
      c.fillStyle = col('text'); c.beginPath(); c.moveTo(cx - 16, cy - R + 2); c.lineTo(cx, cy - R * 1.1); c.lineTo(cx + 16, cy - R + 2); c.fill();
      if (ph > 0) {
        // интегрируем движение в единицах R = 1, GM = 1: первая космическая = 1 (7,9 км/с)
        let x = 0, y = 1.1, vx = v / 7.9 / Math.sqrt(1.1), vy = 0, dt = 0.004; const pts = [[x, y]], N = Math.floor(2000 * ph);
        for (let i = 0; i < N; i++) { const r = Math.hypot(x, y), a = 1 / (r * r * r); vx -= x * a * dt; vy -= y * a * dt; x += vx * dt; y += vy * dt; pts.push([x, y]); if (r < 1 || r > 6) break; }
        c.strokeStyle = col('red'); c.lineWidth = 2; c.setLineDash([5, 4]); c.beginPath(); pts.forEach(([px, py], i) => { const X = cx + px * R, Y = cy - py * R; i ? c.lineTo(X, Y) : c.moveTo(X, Y); }); c.stroke(); c.setLineDash([]);
        const [lx, ly] = pts[pts.length - 1]; c.fillStyle = col('red'); c.beginPath(); c.arc(cx + lx * R, cy - ly * R, 6, 0, 7); c.fill();
      }
      label(c, 'Земля', cx, cy + 6, col('ink'), 15, 'center');
      label(c, `v = ${f1(v)} км/с`, 20, 30, res ? (res.ok ? col('ok') : col('red')) : col('ink'), 20);
    }
  },

  // Жидкости: плавание, доля погружения = ρ_тела/ρ_жидк
  float: {
    title: 'Плавание', lead: 'Подбери плотность жидкости, чтобы брусок погрузился ровно на нужную долю.', rounds: 4, anim: 1100, go: 'Опустить брусок',
    hint: 'Плавающее тело погружено на долю ρ_тела/ρ_жидкости. Если жидкость легче тела — оно тонет.',
    param: { min: 500, max: 1600, step: 10, init: 1000, label: 'Плотность жидкости', fmt: v => v + ' кг/м³' },
    newRound(G) { G.rb = pick([600, 700, 750, 800, 900]); const fr = pick([0.5, 0.6, 0.75, 0.8, 0.9].filter(f => G.rb / f <= 1600 && G.rb / f >= 500)); G.goal = fr; G.task = `Брусок плотностью ${G.rb} кг/м³. Подбери жидкость, в которой он погрузится ровно на ${Math.round(fr * 100)}% объёма.`; G.v = 1000; },
    check(G, rl) { const fr = Math.min(1, G.rb / rl), sink = G.rb > rl, ok = !sink && Math.abs(fr - G.goal) <= 0.025; return { ok, fr, sink, msg: sink ? `Жидкость легче бруска (${rl} < ${G.rb}) — он утонул.` : `Погружено ρ_т/ρ_ж = ${G.rb}/${rl} = ${Math.round(fr * 100)}%${ok ? '' : `. Нужно ${Math.round(G.goal * 100)}% — ${fr > G.goal ? 'жидкость плотнее' : 'жидкость легче'}.`}` }; },
    draw(k, G, rl, ph, res) {
      if (!k) return; const { c, W, H, col } = k; bgGrid(k);
      const tx = W / 2 - 170, tw = 340, top = 60, bot = H - 20, lvl = top + 70;
      const shade = Math.max(0, Math.min(1, (rl - 500) / 1100));
      c.fillStyle = `rgba(30,63,160,${0.12 + shade * 0.45})`; c.fillRect(tx, lvl, tw, bot - lvl);
      c.strokeStyle = col('text'); c.lineWidth = 3; c.beginPath(); c.moveTo(tx, top); c.lineTo(tx, bot); c.lineTo(tx + tw, bot); c.lineTo(tx + tw, top); c.stroke();
      const bh = 110, bw = 120, fr = res ? (res.sink ? 1 : res.fr) : 0;
      const restY = res && res.sink ? bot - bh : lvl - bh + bh * fr, startY = 8, y = ph > 0 ? startY + (restY - startY) * Math.min(1, ph) : startY;
      c.fillStyle = '#B07A3A'; c.fillRect(W / 2 - bw / 2, y, bw, bh); c.strokeStyle = col('text'); c.lineWidth = 2; c.strokeRect(W / 2 - bw / 2, y, bw, bh);
      c.strokeStyle = col('red'); c.setLineDash([6, 4]); const gy = lvl - bh + bh * G.goal; c.beginPath(); c.moveTo(W / 2 + bw / 2 + 6, gy); c.lineTo(W / 2 + bw / 2 + 60, gy); c.stroke(); c.setLineDash([]);
      label(c, `цель ${Math.round(G.goal * 100)}%`, W / 2 + bw / 2 + 64, gy + 5, col('red'), 14);
      label(c, `ρ_ж = ${rl}`, tx + 8, bot - 10, col('text'), 15);
      if (res) label(c, res.sink ? 'утонул' : `${Math.round(res.fr * 100)}% под водой`, 20, 30, res.ok ? col('ok') : col('red'), 20);
    }
  },

  // Деформации: закон Гука x = mg/k
  spring: {
    title: 'Пружина', lead: 'Подбери груз, чтобы пружина растянулась ровно до отметки.', rounds: 4, anim: 1000, go: 'Подвесить',
    hint: 'По закону Гука kx = mg, значит растяжение x = mg/k.',
    param: { min: 0.05, max: 3, step: 0.05, init: 0.5, label: 'Масса груза', fmt: v => f1(v, 2) + ' кг' },
    newRound(G) { G.k = pick([20, 25, 40, 50, 80, 100]); const m = pick([0.2, 0.3, 0.4, 0.5, 0.6, 0.8, 1, 1.2].filter(m => m * g_ / G.k * 100 <= 30 && m * g_ / G.k * 100 >= 5)); G.goal = Math.round(m * g_ / G.k * 1000) / 10; G.task = `Жёсткость пружины ${G.k} Н/м. Подбери груз, чтобы она растянулась на ${f1(G.goal)} см.`; G.v = 0.5; },
    check(G, m) { const x = m * g_ / G.k * 100, ok = Math.abs(x - G.goal) <= 0.6; return { ok, x, msg: `x = mg/k = ${f1(m, 2)}·9,8/${G.k} = ${f1(x)} см${ok ? '' : `. Нужно ${f1(G.goal)} см — ${x < G.goal ? 'груз тяжелее' : 'груз легче'}.`}` }; },
    draw(k, G, m, ph, res) {
      if (!k) return; const { c, W, H, col } = k; bgGrid(k);
      const cx = W / 2 - 60, top = 20, L0 = 90, scale = 7, x = res ? Math.min(res.x, 38) : (ph > 0 ? Math.min(m * g_ / G.k * 100, 38) * ph : 0);
      c.fillStyle = col('text'); c.fillRect(cx - 60, top - 6, 120, 8);
      const len = L0 + x * scale, coils = 12; c.strokeStyle = col('ink'); c.lineWidth = 3; c.beginPath(); c.moveTo(cx, top);
      for (let i = 0; i <= coils; i++) c.lineTo(cx + (i % 2 ? 18 : -18) * (i && i < coils ? 1 : 0), top + len * i / coils); c.stroke();
      const wy = top + len; c.fillStyle = col('muted'); c.fillRect(cx - 55, wy, 110, 44); label(c, f1(m, 2) + ' кг', cx, wy + 31, col('sheet'), 13, 'center');
      const rx = cx + 120; c.strokeStyle = col('text'); c.lineWidth = 1; c.beginPath(); c.moveTo(rx, top + L0); c.lineTo(rx, top + L0 + 38 * scale); c.stroke();
      for (let cm = 0; cm <= 38; cm += 2) { const y = top + L0 + cm * scale; c.beginPath(); c.moveTo(rx, y); c.lineTo(rx + (cm % 10 ? 8 : 16), y); c.stroke(); if (cm % 10 === 0) label(c, cm + ' см', rx + 22, y + 5, col('muted'), 13); }
      const gy = top + L0 + G.goal * scale; c.strokeStyle = col('red'); c.lineWidth = 3; c.beginPath(); c.moveTo(rx - 30, gy); c.lineTo(rx + 16, gy); c.stroke();
      label(c, 'цель', rx - 74, gy + 5, col('red'), 14);
      c.strokeStyle = col('ink'); c.setLineDash([4, 4]); c.beginPath(); c.moveTo(cx + 30, wy); c.lineTo(rx, wy); c.stroke(); c.setLineDash([]);
      if (res) label(c, `x = ${f1(res.x)} см`, 20, 30, res.ok ? col('ok') : col('red'), 20);
    }
  },

  // СТО: парадокс близнецов, τ = t·√(1 − v²/c²)
  clock: {
    title: 'Близнецы', lead: 'Подбери скорость корабля, чтобы космонавт постарел ровно на нужное число лет.', rounds: 4, anim: 1600, go: 'Полетели',
    hint: 'На Земле проходит 10 лет, а на корабле τ = t·√(1 − v²/c²) — меньше.',
    param: { min: 0.1, max: 0.99, step: 0.01, init: 0.5, label: 'Скорость корабля', fmt: v => f1(v, 2) + ' c' },
    newRound(G) { G.goal = pick([9, 8, 7, 6, 5, 4, 3, 2]); G.task = `Пока на Земле проходит 10 лет, космонавт должен постареть на ${G.goal} ${G.goal < 5 ? 'года' : 'лет'}.`; G.v = 0.5; },
    check(G, b) { const tau = 10 * Math.sqrt(1 - b * b), ok = Math.abs(tau - G.goal) <= 0.15; return { ok, tau, msg: `τ = 10·√(1 − ${f1(b, 2)}²) = ${f1(tau, 2)} года${ok ? '' : `. Нужно ${G.goal} — ${tau > G.goal ? 'быстрее' : 'медленнее'}.`}` }; },
    draw(k, G, b, ph, res) {
      if (!k) return; const { c, W, H, col } = k; bgGrid(k);
      const BX = 250; const bar = (y, years, color, name) => { c.fillStyle = col('line'); c.fillRect(BX, y, W - BX - 30, 34); c.fillStyle = color; c.fillRect(BX, y, (W - BX - 30) * years / 10 * Math.min(1, ph || 0), 34); label(c, name, 20, y + 24, col('text'), 16); label(c, `${f1(years * Math.min(1, ph || 0), 1)} лет`, W - 52, y + 24, col('text'), 15, 'right'); };
      const tau = 10 * Math.sqrt(1 - b * b);
      bar(90, 10, col('ink'), 'На Земле'); bar(170, tau, col('red'), 'На корабле');
      const gx = BX + (W - BX - 30) * G.goal / 10; c.strokeStyle = col('ok'); c.lineWidth = 3; c.setLineDash([6, 4]); c.beginPath(); c.moveTo(gx, 155); c.lineTo(gx, 220); c.stroke(); c.setLineDash([]);
      label(c, `цель ${G.goal}`, gx, 240, col('ok'), 14, 'center');
      const sx = BX + (W - BX - 60) * Math.min(1, ph || 0); c.fillStyle = col('ink'); c.beginPath(); c.moveTo(sx + 30, 300); c.lineTo(sx, 288); c.lineTo(sx, 312); c.fill();
      label(c, `γ = ${f1(1 / Math.sqrt(1 - b * b), 2)}`, 20, 40, col('ink'), 20);
    }
  }
};

/* ---------- события игр ---------- */
document.addEventListener('click', e => {
  const b = e.target.closest('[data-act]'); if (!b || b.disabled) return;
  const v = b.dataset.v;
  switch (b.dataset.act) {
    case 'selfCheck': { const t = T.find(x => x.id === +b.dataset.t); startTest(pickCheck(t), { kind: 'check', tid: t.id, label: 'Самопроверка: ' + t.title, timer: 0 }); break; }
    case 'noteCheck': { const t = T.find(x => x.id === +b.dataset.t), n = t.learn.notes[+b.dataset.n - 1]; startTest(pickCheck(t, +b.dataset.n), { kind: 'check', tid: t.id, note: n.id, label: 'Проверка: ' + n.title, timer: 0 }); break; }
    case 'pairPick': pairPick(b.dataset.side, +b.dataset.i); break;
    case 'tfAns': if (G && G.kind === 'tf' && G.ans == null) { G.ans = v === '1'; if (G.ans === G.items[G.i][1]) { G.ok++; buzz(12); } else buzz([30, 40, 30]); drawTf(); } break;
    case 'tfNext': if (G && G.kind === 'tf') { G.i++; G.ans = null; if (G.i >= G.items.length) { const st = G.ok >= G.items.length - 1 ? 3 : G.ok >= G.items.length - 3 ? 2 : 1; gameEnd(st, `Верно ${G.ok} из ${G.items.length}`, G.ok); } else drawTf(); } break;
    case 'throwGo': throwGo(); break;
    case 'simGo': simGo(); break;
    case 'gameAgain': render(); break;
  }
});
document.addEventListener('input', e => {
  if (!G) return;
  if (G.kind === 'throw') {
    if (e.target.id === 'sang') { G.ang = +e.target.value; $('#vang').textContent = G.ang + '°'; }
    else if (e.target.id === 'sv') { G.v = +e.target.value; $('#vv').textContent = f1(G.v) + ' м/с'; }
    else return;
    if (!G.flying) { G.path = []; paintThrow(); }
  } else if (G.kind === 'sim' && e.target.id === 'psl' && !G.busy) {
    G.v = +e.target.value; $('#pval').textContent = G.sim.param.fmt(G.v); G.res = null; $('#tmsg').textContent = G.sim.hint; G.sim.draw(CV(), G, G.v, 0, null);
  }
});
