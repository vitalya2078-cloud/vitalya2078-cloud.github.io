/* ---------- Обучение: страница темы, конспект, мини-игры, самопроверка ---------- */
const PASS = 80; // порог самопроверки, %
let readSet = new Set(Array.isArray(LS.get('fz-read', [])) ? LS.get('fz-read', []) : []);
let checks = LS.get('fz-check', {}); if (!checks || typeof checks !== 'object') checks = {};
let games = LS.get('fz-games', {}); if (!games || typeof games !== 'object') games = {};
const GAMES = {
  throw: { title: 'Попади в цель', lead: 'Подбери угол и скорость броска — как в задаче про дальность полёта.', need: () => true },
  pair: { title: 'Найди пару', lead: 'Соедини величину с её формулой или единицей. На время.', need: t => t.learn && t.learn.pairs && t.learn.pairs.length >= 6 },
  tf: { title: 'Верю — не верю', lead: '10 утверждений: верно или нет? После каждого — объяснение.', need: t => t.learn && t.learn.tf && t.learn.tf.length >= 10 }
};
const topicGames = t => (t.learn && t.learn.games ? t.learn.games : []).filter(g => GAMES[g] && GAMES[g].need(t));
const stars = n => '<span class="stars" aria-label="' + n + ' из 3">' + [1, 2, 3].map(i => `<i class="${i <= n ? 'on' : ''}">★</i>`).join('') + '</span>';
function learnProgress(t) {
  if (!t.learn) return '';
  const notes = t.learn.notes || [], r = notes.filter(n => readSet.has(t.id + '-' + n.id)).length;
  const gs = topicGames(t), g = gs.filter(x => games[t.id + '-' + x]).length, c = checks[t.id];
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
    html += `<ol class="path">${step(1, read === notes.length, 'Конспект', `прочитано ${read} из ${notes.length}`)}${step(2, gs.length && gs.every(g => games[t.id + '-' + g]), 'Мини-игры', `пройдено ${gs.filter(g => games[t.id + '-' + g]).length} из ${gs.length}`)}${step(3, c >= PASS, 'Самопроверка', c != null ? `лучший результат ${Math.round(c)}%` : `10 вопросов, порог ${PASS}%`)}${step(4, false, 'Тест и экзамен', progressText(items))}</ol>`;
    html += '<h2 class="sec">Конспект</h2><div class="group">' + notes.map((n, i) => {
      const done = readSet.has(t.id + '-' + n.id), nc = checks[t.id + '-' + n.id];
      return `<a class="row note-row" href="#n${t.id}-${i + 1}"><span class="nn ${done ? 'done' : ''}">${done ? '✓' : i + 1}</span><span><b>${esc(n.title)}</b><small>${esc(n.lead)}${nc != null ? ` Проверка: ${Math.round(nc)}%.` : ''}</small></span>${ico('chev')}</a>`;
    }).join('') + '</div>';
    if (gs.length) html += '<h2 class="sec">Мини-игры</h2><div class="games">' + gs.map(g => {
      const best = games[t.id + '-' + g];
      return `<a class="game-card g-${g}" href="#g${t.id}-${g}"><b>${GAMES[g].title}</b><small>${GAMES[g].lead}</small>${best ? stars(best.stars) : '<span class="new">Не пройдена</span>'}</a>`;
    }).join('') + '</div>';
    html += `<h2 class="sec">Самопроверка</h2><section class="panel check"><p>10 вопросов из всех подтем, сразу с пояснениями. Наберёшь ${PASS}% — тема отмечается пройденной.</p>` +
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
    title: `<span class="tq">${esc(n.title)}</span><small>Конспект ${r.idx} из ${total}</small>`, back: true,
    abar: (prev ? `<a class="btn line" href="${prev}">Назад</a>` : '') + `<button class="btn" type="button" data-act="noteCheck" data-t="${t.id}" data-n="${r.idx}">Проверь себя</button>` + (next ? `<a class="btn line" href="${next}">Дальше</a>` : `<a class="btn line" href="#t${t.id}">К теме</a>`)
  });
  const body = n.blocks.map(b => {
    switch (b[0]) {
      case 'p': return `<p>${nl(b[1])}</p>`;
      case 'h': return `<h3>${esc(b[1])}</h3>`;
      case 'def': return `<p class="def"><b>${esc(b[1])}</b> — ${nl(b[2])}</p>`;
      case 'f': return `<div class="formula">${b[1].split('\n').map(l => `<span>${esc(l)}</span>`).join('')}</div>`;
      case 'trap': return `<div class="trap"><b>Ловушка в тесте</b><p>${nl(b[1])}</p></div>`;
      default: return '';
    }
  }).join('');
  const qs = n.q.map(i => BY[t.id + '-' + i]).filter(Boolean);
  setMain(`<article class="conspect"><p class="lead">${esc(n.lead)}</p>${body}</article>` +
    `<h2 class="sec">Вопросы по подтеме<span>${qs.length}</span></h2><div class="list">${qs.map(it => card(it)).join('')}</div>`);
}

/* ---------- Самопроверка ---------- */
function pickCheck(t, noteIdx) {
  const L = t.learn, mc = i => { const it = BY[t.id + '-' + i]; return it && it.q.x.length ? it : null; };
  if (noteIdx) return shuffle(L.notes[noteIdx - 1].q.map(mc).filter(Boolean)).slice(0, 5);
  const pools = L.notes.map(n => shuffle(n.q.map(mc).filter(Boolean))), out = [];
  for (let k = 0; out.length < 10 && k < 20; k++) pools.forEach(pq => { if (out.length < 10 && pq[k]) out.push(pq[k]); });
  return shuffle(out);
}
function checkBanner(pts) {
  if (test.kind !== 'check') return '';
  const key = test.note ? test.tid + '-' + test.note : String(test.tid), prevBest = checks[key];
  if (!test.checkSaved) { checks[key] = Math.max(prevBest || 0, pts); LS.set('fz-check', checks); test.checkSaved = true; }
  const ok = pts >= PASS - 1e-9;
  const what = test.note ? 'Подтема закреплена' : 'Тема пройдена';
  return `<div class="hint ${ok ? 'pass' : 'fail'}"><p><b>${ok ? what + '!' : 'Пока ниже порога ' + PASS + '%.'}</b> ${ok ? 'Можно переходить дальше.' : 'Перечитай конспект по вопросам с ошибками и попробуй ещё раз.'}</p><a class="btn sm" href="#t${test.tid}">К теме</a></div>`;
}

/* ---------- Мини-игры ---------- */
let G = null; // состояние текущей игры
function stopGame() { if (G && G.raf) cancelAnimationFrame(G.raf); if (G && G.tick) clearInterval(G.tick); if (G) { G.raf = 0; G.tick = 0; } }
function saveGame(tid, g, score, starsN) {
  const k = tid + '-' + g, b = games[k];
  if (!b || starsN > b.stars || (starsN === b.stars && score > b.score)) { games[k] = { stars: starsN, score, d: Date.now() }; LS.set('fz-games', games); }
}
function vGame(r) {
  const t = T.find(x => x.id === r.tid);
  if (!topicGames(t).includes(r.game)) { location.hash = 't' + t.id; return; }
  frame({ title: `<span class="tq">${GAMES[r.game].title}</span><small>${esc(t.title)}</small>`, back: true, tabs: false });
  ({ throw: gThrow, pair: gPair, tf: gTf })[r.game](t, true);
}
function gameEnd(t, g, starsN, text, score) {
  saveGame(t.id, g, score, starsN); stopGame(); buzz(starsN === 3 ? [20, 60, 20] : 20);
  frame({ title: `<span class="tq">${GAMES[g].title}</span><small>Результат</small>`, back: true, tabs: false,
    abar: `<button class="btn" type="button" data-act="gameAgain" data-g="${g}" data-t="${t.id}">Сыграть ещё</button><a class="btn line" href="#t${t.id}">К теме</a>` });
  setMain(`<section class="score game-end"><div class="big-stars">${stars(starsN)}</div><div><b>${text}</b><span>${starsN === 3 ? 'Отлично!' : starsN === 2 ? 'Хорошо. Можно лучше.' : 'Попробуй ещё раз — получится лучше.'}</span></div></section>`);
}

// «Найди пару»: величина ↔ формула или единица
function gPair(t) {
  const pairs = shuffle(t.learn.pairs).slice(0, 6);
  G = { kind: 'pair', t, pairs, left: shuffle(pairs.map((p, i) => i)), right: shuffle(pairs.map((p, i) => i)), sel: null, done: new Set(), miss: 0, t0: Date.now() };
  drawPair();
  G.tick = setInterval(() => { const el = $('#gtime'); if (el) el.textContent = Math.floor((Date.now() - G.t0) / 1000) + ' с'; }, 500);
}
function drawPair() {
  const b = (side, i) => `<button type="button" class="pc ${side}${side === 'r' && !/[а-яё]/i.test(G.pairs[i][1]) ? ' math' : ''}${G.done.has(i) ? ' done' : ''}${G.sel && G.sel.side === side && G.sel.i === i ? ' sel' : ''}" data-act="pairPick" data-side="${side}" data-i="${i}"${G.done.has(i) ? ' disabled' : ''}>${esc(G.pairs[i][side === 'l' ? 0 : 1])}</button>`;
  ui.abar.innerHTML = `<p class="abar-note">Пар: ${G.done.size} из ${G.pairs.length}. Ошибок: ${G.miss}. Время: <b id="gtime">${Math.floor((Date.now() - G.t0) / 1000)} с</b></p>`; ui.abar.hidden = false;
  ui.main.innerHTML = `<p class="note gtop">Нажми величину слева, потом её формулу или единицу справа.</p><div class="pairs"><div>${G.left.map(i => b('l', i)).join('')}</div><div>${G.right.map(i => b('r', i)).join('')}</div></div>`;
}
function pairPick(side, i) {
  if (!G.sel || G.sel.side === side) { G.sel = { side, i }; drawPair(); return; }
  const ok = G.sel.i === i;
  if (ok) { G.done.add(i); buzz(12); } else { G.miss++; buzz([30, 40, 30]); }
  G.sel = null; drawPair();
  if (!ok) { const bad = document.querySelector(`.pc.${side}[data-i="${i}"]`); if (bad) bad.classList.add('shake'); }
  if (G.done.size === G.pairs.length) {
    const sec = Math.round((Date.now() - G.t0) / 1000), st = G.miss === 0 ? 3 : G.miss <= 2 ? 2 : 1;
    gameEnd(G.t, 'pair', st, `${G.pairs.length} пар за ${sec} с, ошибок: ${G.miss}`, 1000 - sec - G.miss * 10);
  }
}

// «Верю — не верю»
function gTf(t) {
  G = { kind: 'tf', t, items: shuffle(t.learn.tf).slice(0, 10), i: 0, ok: 0, ans: null };
  drawTf();
}
function drawTf() {
  const it = G.items[G.i], n = G.items.length;
  ui.abar.hidden = false;
  if (G.ans == null) {
    ui.abar.innerHTML = `<button class="btn tf-yes" type="button" data-act="tfAns" data-v="1">Верно</button><button class="btn tf-no" type="button" data-act="tfAns" data-v="0">Неверно</button>`;
  } else ui.abar.innerHTML = `<button class="btn wide" type="button" data-act="tfNext">${G.i + 1 < n ? 'Следующее утверждение' : 'Результат'}</button>`;
  const res = G.ans == null ? '' : `<p class="verdict ${G.ans === it[1] ? 'ok' : 'bad'}">${G.ans === it[1] ? 'Правильно' : 'Неправильно'}: это ${it[1] ? 'верно' : 'неверно'}.</p><p class="tf-why">${esc(it[2])}</p>`;
  ui.main.innerHTML = `<div class="tprog">${ruler(G.ok, G.i + (G.ans != null ? 1 : 0) - G.ok, n)}</div><p class="note gtop">Утверждение ${G.i + 1} из ${n}. Верно: ${G.ok}</p><article class="q tf-card"><p class="qt">${esc(it[0])}</p>${res}</article>`;
}

// «Попади в цель»: бросок под углом к горизонту, L = v²·sin2α/g
function gThrow(t) {
  G = { kind: 'throw', t, round: 1, rounds: 5, shots: 0, hits: 0, ang: 45, v: 15, flying: false, path: [], last: null };
  newTarget(); drawThrow();
}
function newTarget() { G.target = Math.round((8 + Math.random() * 30) * 2) / 2; G.width = 1.6; G.path = []; G.last = null; }
function drawThrow() {
  ui.abar.hidden = false;
  ui.abar.innerHTML = `<button class="btn wide" type="button" data-act="throwGo"${G.flying ? ' disabled' : ''}>Бросок</button>`;
  ui.main.innerHTML = `<p class="note gtop">Цель ${G.round} из ${G.rounds}. Бросков: ${G.shots}. Мишень на расстоянии <b>${String(G.target).replace('.', ',')} м</b>.</p>` +
    `<canvas id="cv" class="throw-cv" width="720" height="360" aria-label="Поле броска"></canvas>` +
    `<p class="note tmsg" id="tmsg">${G.last || 'Подбери угол и скорость. Подсказка: дальность L = v²·sin 2α / g, при 45° она максимальна.'}</p>` +
    `<label class="range"><span>Угол: <b id="vang">${G.ang}°</b></span><input id="sang" type="range" min="10" max="80" step="1" value="${G.ang}"></label>` +
    `<label class="range"><span>Скорость: <b id="vv">${G.v} м/с</b></span><input id="sv" type="range" min="5" max="22" step="0.5" value="${G.v}"></label>` +
    `<p class="formula small"><span>L = v²·sin 2α / g = <b id="vl">${fmtL()}</b> м</span></p>`;
  paintThrow();
}
const calcL = () => G.v * G.v * Math.sin(2 * G.ang * Math.PI / 180) / 9.8;
const fmtL = () => (Math.round(calcL() * 10) / 10).toString().replace('.', ',');
function paintThrow(ball) {
  const cv = $('#cv'); if (!cv) return;
  const cs = getComputedStyle(document.documentElement), c = cv.getContext('2d'), W = cv.width, H = cv.height;
  const X0 = 30, Y0 = H - 40, sx = (W - 60) / 50, sy = sx; // 50 м по горизонтали
  c.clearRect(0, 0, W, H);
  c.fillStyle = cs.getPropertyValue('--sheet'); c.fillRect(0, 0, W, H);
  c.strokeStyle = cs.getPropertyValue('--line'); c.lineWidth = 1;
  for (let m = 0; m <= 50; m += 5) { const x = X0 + m * sx; c.beginPath(); c.moveTo(x, 0); c.lineTo(x, Y0); c.stroke(); }
  for (let m = 0; m * sy < Y0; m += 5) { const y = Y0 - m * sy; c.beginPath(); c.moveTo(X0, y); c.lineTo(W, y); c.stroke(); }
  c.fillStyle = cs.getPropertyValue('--muted'); c.font = '12px system-ui';
  for (let m = 0; m <= 50; m += 10) c.fillText(m + ' м', X0 + m * sx - 8, Y0 + 18);
  c.strokeStyle = cs.getPropertyValue('--text'); c.lineWidth = 2; c.beginPath(); c.moveTo(0, Y0); c.lineTo(W, Y0); c.stroke();
  // мишень
  const tx = X0 + G.target * sx; c.fillStyle = cs.getPropertyValue('--red');
  c.fillRect(tx - G.width / 2 * sx, Y0 - 6, G.width * sx, 6); c.fillRect(tx - 1, Y0 - 40, 2, 34);
  c.beginPath(); c.moveTo(tx + 1, Y0 - 40); c.lineTo(tx + 18, Y0 - 33); c.lineTo(tx + 1, Y0 - 26); c.fill();
  // направление броска
  const a = G.ang * Math.PI / 180; c.strokeStyle = cs.getPropertyValue('--ink'); c.lineWidth = 3;
  c.beginPath(); c.moveTo(X0, Y0); c.lineTo(X0 + Math.cos(a) * 40, Y0 - Math.sin(a) * 40); c.stroke();
  // траектория
  c.strokeStyle = cs.getPropertyValue('--ink'); c.lineWidth = 2; c.setLineDash([5, 5]); c.beginPath();
  G.path.forEach(([x, y], i) => { const px = X0 + x * sx, py = Y0 - y * sy; i ? c.lineTo(px, py) : c.moveTo(px, py); }); c.stroke(); c.setLineDash([]);
  if (ball) { c.fillStyle = cs.getPropertyValue('--ink'); c.beginPath(); c.arc(X0 + ball[0] * sx, Y0 - ball[1] * sy, 7, 0, 7); c.fill(); }
}
function throwGo() {
  if (G.flying) return;
  G.flying = true; G.shots++; G.path = [];
  const a = G.ang * Math.PI / 180, vx = G.v * Math.cos(a), vy = G.v * Math.sin(a), T_ = 2 * vy / 9.8, L = calcL();
  const btn = $('[data-act=throwGo]'); if (btn) btn.disabled = true;
  const t0 = performance.now(), speed = 1.6;
  const step = now => {
    const tt = Math.min(T_, (now - t0) / 1000 * speed), x = vx * tt, y = vy * tt - 9.8 * tt * tt / 2;
    G.path.push([x, Math.max(0, y)]); paintThrow([x, Math.max(0, y)]);
    if (tt < T_ && G.kind === 'throw') { G.raf = requestAnimationFrame(step); return; }
    G.flying = false;
    const d = L - G.target, hit = Math.abs(d) <= G.width / 2, f = v => (Math.round(Math.abs(v) * 10) / 10).toString().replace('.', ',');
    if (hit) {
      G.hits++; buzz([15, 40, 15]);
      if (G.round >= G.rounds) { const st = G.shots <= 7 ? 3 : G.shots <= 11 ? 2 : 1; return gameEnd(G.t, 'throw', st, `${G.rounds} целей за ${plural(G.shots, 'бросок', 'броска', 'бросков')}`, 100 - G.shots); }
      G.round++; G.last = `Попадание! Дальность ${f(L)} м. Новая цель.`; newTarget(); drawThrow();
    } else {
      buzz(25); G.last = `${d > 0 ? 'Перелёт' : 'Недолёт'} на ${f(d)} м: мяч упал на ${f(L)} м.`;
      const m = $('#tmsg'); if (m) m.textContent = G.last; const b2 = $('[data-act=throwGo]'); if (b2) b2.disabled = false;
      const pg = $('.gtop'); if (pg) pg.innerHTML = `Цель ${G.round} из ${G.rounds}. Бросков: ${G.shots}. Мишень на расстоянии <b>${String(G.target).replace('.', ',')} м</b>.`;
    }
  };
  G.raf = requestAnimationFrame(step);
}

/* ---------- события обучения ---------- */
document.addEventListener('click', e => {
  const b = e.target.closest('[data-act]'); if (!b || b.disabled) return;
  const v = b.dataset.v;
  switch (b.dataset.act) {
    case 'selfCheck': { const t = T.find(x => x.id === +b.dataset.t); startTest(pickCheck(t), { kind: 'check', tid: t.id, label: 'Самопроверка: ' + t.title, timer: 0 }); break; }
    case 'noteCheck': { const t = T.find(x => x.id === +b.dataset.t), n = t.learn.notes[+b.dataset.n - 1]; startTest(pickCheck(t, +b.dataset.n), { kind: 'check', tid: t.id, note: n.id, label: 'Проверка: ' + n.title, timer: 0 }); break; }
    case 'pairPick': pairPick(b.dataset.side, +b.dataset.i); break;
    case 'tfAns': if (G && G.kind === 'tf' && G.ans == null) { G.ans = v === '1'; if (G.ans === G.items[G.i][1]) { G.ok++; buzz(12); } else buzz([30, 40, 30]); drawTf(); } break;
    case 'tfNext': if (G && G.kind === 'tf') { G.i++; G.ans = null; if (G.i >= G.items.length) { const st = G.ok >= 9 ? 3 : G.ok >= 7 ? 2 : 1; gameEnd(G.t, 'tf', st, `Верно ${G.ok} из ${G.items.length}`, G.ok); } else drawTf(); } break;
    case 'throwGo': throwGo(); break;
    case 'gameAgain': render(); break;
  }
});
document.addEventListener('input', e => {
  if (!G || G.kind !== 'throw') return;
  if (e.target.id === 'sang') { G.ang = +e.target.value; $('#vang').textContent = G.ang + '°'; }
  else if (e.target.id === 'sv') { G.v = +e.target.value; $('#vv').textContent = String(G.v).replace('.', ',') + ' м/с'; }
  else return;
  $('#vl').textContent = fmtL(); if (!G.flying) { G.path = []; paintThrow(); }
});
