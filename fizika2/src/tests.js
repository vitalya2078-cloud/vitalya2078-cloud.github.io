/* ---------- Тесты: 900 вопросов экзамена, проверки уроков и финалы глав ----------
   Режимы: «с пояснениями» (ответ сразу, комбо, опыт) и «как на экзамене» (разбор в конце, оценка 60/75/90).
   Прогресс по каждому вопросу: верно/ошибка, интервальное повторение ошибок (1, 3, 7, 14 дней), избранное, история. */

/* ---------- база вопросов ---------- */
let BANK = null;
async function bank() {
  if (BANK) return BANK;
  let c = null;
  if (F2_IN_APP) { try { c = JSON.parse(localStorage.getItem('f2-content') || 'null'); } catch (e) {} }
  if (!c) c = await fetch('content.json').then(r => r.json());
  BANK = [];
  c.topics.forEach(t => t.q.forEach((q, j) => {
    // вопросы без вариантов — самопроверка: «Показать ответ», потом «Знал» / «Не знал»
    BANK.push(qfix({ key: t.id + '-' + (j + 1), tid: t.id, num: j + 1, topicTitle: t.title, q: q.t, a: q.a, x: q.x || [], self: !(q.x && q.x.length), p: q.p ? 'pics/' + encodeURIComponent(q.p) : '', e: q.e || '', note: q.n || '' }));
  }));
  return BANK;
}
const TOPIC_SHORT = { 1: 'Механика', 2: 'Электростатика и ток', 3: 'Электромагнетизм', 4: 'Молекулярная физика', 5: 'Колебания и волны', 6: 'Волновая оптика', 7: 'Квантовая физика', 8: 'Твёрдое тело', 9: 'Ядерная физика' };
const MC = B => B.filter(x => !x.self); // для экзамена и быстрого теста — только с вариантами
const chExam = n => (CONTENT[n] && CONTENT[n].exam) || [];

/* ---------- прогресс по вопросам ---------- */
const REPEAT = [1, 3, 7, 14]; // через сколько дней вернуть вопрос после верного ответа
(function migrate() {
  if (!S.stat || typeof S.stat !== 'object') S.stat = {};
  if (!Array.isArray(S.fav)) S.fav = [];
  if (!Array.isArray(S.hist)) S.hist = [];
  if (Array.isArray(S.wrong) && S.wrong.length) { S.wrong.forEach(k => { if (!S.stat[k]) S.stat[k] = { ok: 0, bad: 1, last: 0, box: 0, due: Date.now() }; }); }
  S.wrong = [];
})();
function record(key, ok) {
  if (!key) return;
  const s = S.stat[key] || { ok: 0, bad: 0 };
  if (ok) { s.ok++; if (s.bad) { s.box = (s.box || 0) + 1; s.due = s.box > REPEAT.length ? 0 : Date.now() + REPEAT[s.box - 1] * 864e5; } }
  else { s.bad++; s.box = 0; s.due = Date.now() + 864e5; }
  s.last = ok ? 1 : 0; S.stat[key] = s;
}
const isErr = k => !!S.stat[k] && S.stat[k].last === 0;
const isDue = k => { const s = S.stat[k]; return !!s && s.bad > 0 && s.due > 0 && s.due <= Date.now(); };
const isSeen = k => !!S.stat[k];
const isFav = k => S.fav.includes(k);
function toggleFav(k) { S.fav = isFav(k) ? S.fav.filter(x => x !== k) : [...S.fav, k]; save(); }
const gradeOf = p => p >= 90 ? 5 : p >= 75 ? 4 : p >= 60 ? 3 : 2;
function readiness() {
  const ex = S.hist.filter(h => h.kind === 'exam').slice(-5);
  if (!ex.length) return null;
  const p = Math.round(ex.reduce((a, h) => a + h.pct, 0) / ex.length);
  return { pct: p, mark: gradeOf(p), n: ex.length };
}

/* ---------- пояснение к вопросу ---------- */
function whyHtml(e) {
  if (!e) return '';
  if (typeof e === 'string') {
    const disputed = e.includes('⚠');
    return `<div class="why">${disputed ? '<p class="why-warn"><b>Ключ спорный.</b></p>' : ''}<p>${vx(e.replace('⚠', '').trim())}</p></div>`;
  }
  const part = (h, t) => t ? `<div class="why-step"><b>${h}</b><p>${nlv(t)}</p></div>` : '';
  return `<div class="why">${part('Что спрашивают', e.s)}${part('Главная идея', e.i)}${part('Решение', e.r)}${e.w ? `<div class="why-warn"><b>Ключ спорный</b><p>${nlv(e.w)}</p></div>` : ''}</div>`;
}

/* ---------- сессия теста ---------- */
// o: { kind, title, items, mode: 'practice' | 'exam', timer (секунд на вопрос, 0 — без таймера), back, ch, key }
let Q = null, QT = null;
const pickOk = (it, k) => it.self ? k === 1 : k >= 0 && it.opts[k] === it.a;
function startQuiz(o) {
  stopQTimer();
  Q = Object.assign({ mode: 'practice', timer: 0, i: 0, ok: 0, xp: 0, picks: [], started: Date.now() }, o);
  // варианты с рисунка идут по порядку 1–4, остальные перемешиваются
  Q.items = o.items.map(it => ({ ...it, opts: it.picOpts ? [1, 2, 3, 4].map(k => 'Вариант ' + k) : shuffle([it.a, ...it.x]) }));
  if (!Q.items.length) { Q = null; toast(ic('circle-check') + 'Подходящих вопросов нет'); return; }
  if (location.hash !== '#quiz') location.hash = 'quiz'; else render();
}
const qCurPick = () => Q.picks[Q.i];
function stopQTimer() { if (QT) { clearInterval(QT); QT = null; } }
function vQuiz() {
  stopQTimer();
  if (!Q) { location.hash = ''; return; }
  if (Q.i >= Q.items.length) return quizEnd();
  const n = Q.items.length, it = Q.items[Q.i], a = qCurPick(), shown = a != null && Q.mode === 'practice';
  frame(esc(Q.title), { sub: `Вопрос ${Q.i + 1} из ${n}` + (Q.mode === 'exam' ? ' · как на экзамене' : '') });
  ui.back.hidden = false;
  const src = it.tid ? `<span class="qsrc">${esc(TOPIC_SHORT[it.tid] || it.topicTitle)} · №${it.num}</span>` : '';
  const star = it.key ? `<button class="qstar${isFav(it.key) ? ' on' : ''}" data-act="qFav" data-k="${it.key}" aria-label="${isFav(it.key) ? 'Убрать из избранного' : 'В избранное'}">${ic('star')}</button>` : '';
  const timer = Q.timer && a == null ? `<div class="qtimer"><i id="qtbar"></i><span id="qtleft">${mmss(Q.timer)}</span></div>` : '';
  if (it.self) return vSelfQ(it, a, src, star, timer, n);
  const opts = it.opts.map((o, k) => {
    const cls = !shown ? (a === k ? ' picked' : '') : o === it.a ? ' right' : k === a ? ' wrong' : ' dim';
    if (it.picOpts) return `<button class="opt pn${cls}" data-act="pick" data-v="${k}"${a != null ? ' disabled' : ''} aria-label="${o}"><b>${k + 1}</b></button>`;
    return `<button class="opt${cls}" data-act="pick" data-v="${k}"${a != null ? ' disabled' : ''}><span class="ln">${'АБВГДЕ'[k]}</span><span>${vx(o)}</span></button>`;
  }).join('');
  let after = '';
  if (shown) {
    const ok = a >= 0 && it.opts[a] === it.a;
    after = `<div class="verdict ${ok ? 'ok' : 'bad'}"><b>${ok ? 'Верно!' : a < 0 ? 'Время вышло' : 'Неверно'}</b>${ok ? (it.aText ? `<p>${vx(it.aText)}</p>` : '') : `<p>Правильный ответ: <b>${vx(it.a)}</b>${it.aText ? ' — ' + vx(it.aText) : ''}</p>`}</div>${whyHtml(it.e)}` +
      `<div class="qnextbar"><button class="btn wide" data-act="qNext" id="qnext">${Q.i + 1 < n ? 'Следующий вопрос' : 'Результат'} ${ic('chevron-right')}</button></div>`;
  }
  // на экзамене можно отложить вопрос — он вернётся в конце
  if (Q.mode === 'exam' && a == null && Q.i + 1 < n) after += `<button class="btn line wide mt qskip" data-act="qSkip">${ic('skip-forward')}Пропустить, вернуться позже</button>`;
  setMain(`<div class="qtop"><div class="qprog"><i style="width:${Q.i / n * 100}%"></i></div>${Q.mode === 'practice' ? comboChip() : `<span class="combo">${Q.i + 1}/${n}</span>`}</div>${timer}` +
    `<article class="qcard"><div class="qhead">${src}${star}</div><p class="qt">${vx(it.q)}</p>${it.p ? `<img class="qpic" src="${it.p}" alt="Рисунок к вопросу" loading="lazy">` : ''}${it.picOpts ? '<p class="picq">Варианты ответа — на рисунке. Выбери номер:</p>' : ''}<div class="opts${it.picOpts ? ' picopts' : ''}">${opts}</div>${after}</article>`);
  if (Q.timer && a == null) startQTimer();
  const nx = $('#qnext'); if (nx) nx.focus({ preventScroll: true });
  qRevealScroll();
}
/** После ответа плавно показываем вердикт и пояснение — без ручной прокрутки. */
function qRevealScroll() {
  if (!Q || !Q.justAnswered) return; Q.justAnswered = false;
  const v = $('.verdict'); if (!v) return;
  const m = ui.main, r = v.getBoundingClientRect(), mr = m.getBoundingClientRect();
  if (r.top > mr.bottom - 160 || r.top < mr.top) m.scrollTo({ top: m.scrollTop + r.top - mr.top - 90, behavior: 'smooth' });
}
function vSelfQ(it, a, src, star, timer, n) {
  const open = Q.reveal === Q.i || a != null;
  let body = !open ? `<button class="btn wide reveal" data-act="qReveal">${ic('circle-check')}Показать ответ</button><p class="mute small">Вариантов ответа нет — вспомни ответ, потом проверь себя.</p>`
    : `<div class="ansbox">${vx(it.a)}${it.note ? ` <small>(${esc(it.note)})</small>` : ''}</div>` + (Q.mode === 'practice' || a == null ? whyHtml(a != null || Q.mode === 'practice' ? it.e : '') : '') +
      (a == null ? `<div class="knew"><button class="btn line ok" data-act="pick" data-v="1">${ic('check')}Знал</button><button class="btn line bad" data-act="pick" data-v="0">${ic('x')}Не знал</button></div>`
        : `<div class="verdict ${a === 1 ? 'ok' : 'bad'}"><b>${a === 1 ? 'Отмечено: знал' : a < 0 ? 'Время вышло' : 'Отмечено: не знал'}</b></div><div class="qnextbar"><button class="btn wide" data-act="qNext" id="qnext">${Q.i + 1 < n ? 'Следующий вопрос' : 'Результат'} ${ic('chevron-right')}</button></div>`);
  setMain(`<div class="qtop"><div class="qprog"><i style="width:${Q.i / n * 100}%"></i></div>${comboChip()}</div>${timer}<article class="qcard"><div class="qhead">${src}${star}</div><p class="qt">${vx(it.q)}</p>${it.p ? `<img class="qpic" src="${it.p}" alt="Рисунок к вопросу" loading="lazy">` : ''}${body}</article>`);
  if (Q.timer && a == null && !open) startQTimer();
  const nx = $('#qnext'); if (nx) nx.focus({ preventScroll: true });
  qRevealScroll();
}
function startQTimer() {
  const end = Date.now() + Q.timer * 1000, qi = Q.i;
  const tick = () => {
    if (!Q || Q.i !== qi || qCurPick() != null) return stopQTimer();
    const left = Math.max(0, Math.ceil((end - Date.now()) / 1000)), bar = $('#qtbar'), lab = $('#qtleft');
    if (bar) bar.style.width = (left / Q.timer * 100) + '%'; if (lab) { lab.textContent = mmss(left); lab.classList.toggle('warn', left <= 15); }
    if (left <= 0) { stopQTimer(); answer(-1); }
  };
  tick(); QT = setInterval(tick, 250);
}
function answer(k) {
  if (!Q || qCurPick() != null) return;
  const it = Q.items[Q.i], ok = pickOk(it, k);
  Q.picks[Q.i] = k; stopQTimer();
  if (ok) Q.ok++;
  record(it.key, ok); markDay();
  if (Q.mode === 'practice' || it.self) {
    const g = comboAnswer(ok); if (ok) { Q.xp += g; addXP(g); buzz(12); } else buzz([30, 40, 30]);
    Q.justAnswered = true; save(); render();
  } else {
    S.tot++; if (ok) S.ok++; save(); buzz(8);
    setTimeout(() => { if (Q && Q.picks[Q.i] === k) { Q.i++; render(); ui.main.scrollTop = 0; } }, 220);
  }
}
function quizEnd() {
  const n = Q.items.length, pct = Math.round(Q.ok / n * 100), st = pct === 100 ? 3 : pct >= 75 ? 2 : pct >= 50 ? 1 : 0, mark = gradeOf(pct);
  const wrong = Q.items.map((it, i) => ({ it, pick: Q.picks[i] })).filter(w => !pickOk(w.it, w.pick));
  let extra = '';
  if (!Q.saved) {
    Q.saved = true;
    if (Q.kind === 'lesson') { const k = Q.key, prev = S.lessons[k]; S.lessons[k] = { stars: Math.max(st, prev ? prev.stars : 0), best: Math.max(pct, prev ? prev.best : 0) }; S.steps[k] = Object.assign(S.steps[k] || {}, { quiz: 1 }); if (!prev && pct >= 50) { addXP(50); extra = '+50 XP за урок'; } }
    else if (Q.kind === 'boss') { const prev = S.boss[Q.ch]; S.boss[Q.ch] = Math.max(pct, prev || 0); if (pct >= 80 && !(prev >= 80)) { addXP(150); extra = '+150 XP за главу'; CONTENT[Q.ch].scientists.forEach(x => { if (!S.sci.includes(x.id)) S.sci.push(x.id); }); } }
    else {
      S.hist.push({ d: Date.now(), kind: Q.kind, title: Q.title, n, ok: Q.ok, pct, mark, sec: Math.round((Date.now() - Q.started) / 1000) }); S.hist = S.hist.slice(-200);
      if (Q.mode === 'exam') { const bonus = Q.ok * 4 + ({ 5: 50, 4: 30, 3: 15, 2: 0 })[mark]; Q.xp += bonus; addXP(bonus); }
    }
    save(); checkBadges();
  }
  frame(esc(Q.title), { sub: 'Результат' }); ui.back.hidden = false;
  const isExam = Q.kind === 'exam' || Q.mode === 'exam';
  const head = isExam ? `<div class="grade g${mark}">${mark}</div><b class="h">${pct} ${plural(pct, 'балл', 'балла', 'баллов').replace(/^\d+ /, '')} из 100</b><p class="mute">${({ 5: 'Отлично', 4: 'Хорошо', 3: 'Удовлетворительно', 2: 'Неудовлетворительно' })[mark]}. ${mark < 5 ? `До «${mark + 1}» — от ${({ 2: 60, 3: 75, 4: 90 })[mark]} баллов.` : 'Максимальная оценка!'}</p>`
    : `${stars(st)}<b class="h">${pct}% верно</b>`;
  const pass = Q.kind === 'boss' ? `<p>${pct >= 80 ? 'Глава пройдена! Учёные главы — в твоей коллекции.' : 'Нужно 80%. Повтори уроки и возвращайся.'}</p>` : '';
  // разбивка по темам базы — для экзамена и больших тестов
  const byT = {}; Q.items.forEach((it, i) => { if (!it.tid) return; const b = byT[it.tid] || (byT[it.tid] = { n: 0, ok: 0 }); b.n++; if (pickOk(it, Q.picks[i])) b.ok++; });
  const topics = Object.keys(byT).length > 1 ? `<h2 class="sec">По темам</h2><section class="card tbreak">${Object.entries(byT).map(([t, b]) => `<div class="tb"><span>${esc(TOPIC_SHORT[t])}</span><small>${b.ok} из ${b.n}</small><div class="pbar"><i style="width:${b.ok / b.n * 100}%"></i></div></div>`).join('')}</section>` : '';
  const review = wrong.length ? `<h2 class="sec">Разбор ошибок · ${wrong.length}</h2>` + wrong.map(({ it, pick }) =>
    `<article class="card werr"><div class="qhead">${it.tid ? `<span class="qsrc">${esc(TOPIC_SHORT[it.tid])} · №${it.num}</span>` : '<span></span>'}${it.key ? `<button class="qstar${isFav(it.key) ? ' on' : ''}" data-act="qFav" data-k="${it.key}" aria-label="Избранное">${ic('star')}</button>` : ''}</div><p class="qt">${vx(it.q)}</p>${it.p ? `<img class="qpic" src="${it.p}" alt="Рисунок к вопросу" loading="lazy">` : ''}` +
    `${it.self ? `<p class="mine">${ic('x')}${pick < 0 ? 'Время вышло' : 'Не знал'}</p>` : pick >= 0 ? `<p class="mine">${ic('x')}<s>${vx(it.opts[pick])}</s></p>` : '<p class="mine">' + ic('timer') + 'Нет ответа</p>'}<p class="okans">${ic('check')}${vx(it.a)}${it.aText ? ' — ' + vx(it.aText) : ''}</p>${it.e ? `<details class="whyd"><summary>Пояснение</summary>${whyHtml(it.e)}</details>` : ''}</article>`).join('') : `<section class="card center"><b class="h">Ни одной ошибки!</b></section>`;
  setMain(`<section class="card center res">${head}<p class="mute">Верно ${Q.ok} из ${n} · ${mmss(Math.round((Date.now() - Q.started) / 1000))} · опыт +${Q.xp}${extra ? ' · ' + extra : ''}</p>${pass}</section>` + topics + review +
    `<div class="cnav two">${wrong.length && Q.items[0].key ? `<button class="btn line" data-act="qRetryWrong">${ic('repeat')}Ошибки заново</button>` : `<button class="btn line" data-act="qAgain">${ic('rotate-ccw')}Ещё раз</button>`}<button class="btn wide" data-act="qDone">Готово</button></div>`);
}

/* ---------- экран «Тесты» ---------- */
function vTrain() {
  frame('Тесты', { sub: '900 вопросов экзамена с пояснениями' });
  const B = BANK; if (!B) { setMain('<section class="card center"><b class="h">Загружаю вопросы…</b></section>'); bank().then(() => { if (route().name === 'train') render(); }); return; }
  const seen = B.filter(x => isSeen(x.key)).length, errs = B.filter(x => isErr(x.key)).length, due = B.filter(x => isDue(x.key)).length, rd = readiness();
  const ringPct = rd ? rd.pct : Math.round(seen / B.length * 100);
  const last = S.hist.slice(-4).reverse();
  setMain(
    `<section class="card thero">${ringBig(ringPct)}<div><small class="mute">${rd ? 'Готовность к экзамену' : 'Пройдено вопросов'}</small><b class="h">${rd ? `Прогноз — «${rd.mark}»` : `${seen} из ${B.length}`}</b><p class="mute">${rd ? `Средний балл ${rd.pct} за ${plural(rd.n, 'экзамен', 'экзамена', 'экзаменов')}. «3» — 60, «4» — 75, «5» — 90.` : 'Пройди пробный экзамен — покажу прогноз оценки.'}</p></div></section>` +
    `<button class="cta" data-act="examSetup">${ic('graduation-cap', 'big')}<span><b>Пробный экзамен</b><small>30 вопросов из всех тем · оценка по шкале 60/75/90</small></span>${ic('chevron-right')}</button>` +
    `<div class="tiles">` +
    tile('quick', 'zap', 'blue', 'Быстрый тест', '10 вопросов с пояснениями') +
    tile('due', 'repeat', 'gold', 'Повторение', due ? `${plural(due, 'вопрос', 'вопроса', 'вопросов')} на сегодня` : 'на сегодня всё') +
    tile('errs', 'circle-x', 'pink', 'Мои ошибки', errs ? plural(errs, 'вопрос', 'вопроса', 'вопросов') : 'ошибок нет') +
    tile('favs', 'star', 'gold', 'Избранное', S.fav.length ? plural(S.fav.length, 'вопрос', 'вопроса', 'вопросов') : 'отмечай звёздочкой') +
    tile('topics', 'layers', 'mint', 'По темам', '9 разделов экзамена') +
    tile('pickCh', 'book-open', 'violet', 'По главам', 'вопросы к главам учебника') +
    tile('custom', 'sliders-horizontal', 'cyan', 'Свой тест', 'тема, количество, таймер') +
    tile('qsearch', 'target', 'blue', 'Найти вопрос', 'поиск по всем 900') + `</div>` +
    (last.length ? `<h2 class="sec">Недавние тесты<a href="#hist">вся история</a></h2><section class="card qk">${last.map(histRow).join('')}</section>` : ''));
}
const tile = (act, icon, col, t, s) => `<button class="tile" data-act="${act}">${ic(icon, 'big ' + col)}<b>${t}</b><small>${s}</small></button>`;
function ringBig(p) { const r = 30, L = 2 * Math.PI * r; return `<svg class="ringb" viewBox="0 0 76 76"><circle cx="38" cy="38" r="${r}" stroke="var(--line)" stroke-width="8" fill="none"/><circle cx="38" cy="38" r="${r}" stroke="var(--mint)" stroke-width="8" fill="none" stroke-linecap="round" stroke-dasharray="${L}" stroke-dashoffset="${L * (1 - p / 100)}" transform="rotate(-90 38 38)"/><text x="38" y="44" text-anchor="middle">${p}%</text></svg>`; }
const DF = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
const histRow = h => `<div class="qrow static"><span class="hmark m${h.mark}">${h.kind === 'exam' ? h.mark : h.pct + '%'}</span><span><b>${esc(h.title)}</b><small>${DF.format(h.d)} · верно ${h.ok} из ${h.n}</small></span></div>`;

/* ---------- история ---------- */
function vHist() {
  frame('История тестов', { back: true });
  if (!S.hist.length) { setMain('<section class="card center"><b class="h">Тестов пока не было</b><p class="mute">Пройди любой тест — результат появится здесь.</p></section>'); return; }
  const last = S.hist.slice(-20), W = 340, H = 140, bw = W / 20;
  const y = v => H - 14 - v / 100 * (H - 24);
  const chart = `<svg class="chart" viewBox="0 0 ${W} ${H}">${[60, 75, 90].map(v => `<line x1="0" x2="${W}" y1="${y(v)}" y2="${y(v)}" class="gl"/><text x="2" y="${y(v) - 3}" class="gt">${v}</text>`).join('')}${last.map((h, i) => `<rect x="${i * bw + 3}" y="${y(h.pct)}" width="${bw - 6}" height="${H - 14 - y(h.pct)}" rx="3" class="b m${gradeOf(h.pct)}"/>`).join('')}</svg>`;
  setMain(`<section class="card"><b>Баллы за последние тесты</b>${chart}<p class="mute small">Линии — пороги «3», «4» и «5».</p></section><section class="card qk">${S.hist.slice().reverse().map(histRow).join('')}</section>`);
}

/* ---------- поиск по вопросам ---------- */
let qsText = '';
const normQ = s => String(s).toLowerCase().replace(/ё/g, 'е');
function vQSearch() {
  frame('Найти вопрос', { back: true });
  const B = BANK; if (!B) { bank().then(() => render()); setMain(''); return; }
  const ws = normQ(qsText).split(/[^a-zа-я0-9]+/).filter(w => w.length > 1);
  const num = /^(\d)\s*[.\-/ ]\s*(\d{1,3})$/.exec(qsText.trim());
  const res = num ? B.filter(x => x.key === num[1] + '-' + +num[2]) : ws.length ? B.filter(x => { const t = normQ(x.q + ' ' + x.a); return ws.every(w => t.includes(w)); }) : [];
  setMain(`<div class="search"><input id="qs" type="search" value="${esc(qsText)}" placeholder="Слова из вопроса или номер, например 3.15" autocomplete="off" enterkeyhint="search"></div>` +
    (!qsText.trim() ? '<p class="mute center-note">Введи слова из вопроса или ответа. Номер вида «3.15» откроет вопрос 15 из темы 3.</p>'
      : res.length ? `<p class="mute">Найдено: ${res.length}${res.length > 60 ? ', показаны первые 60' : ''}</p>` + res.slice(0, 60).map(it =>
        `<article class="card werr"><div class="qhead"><span class="qsrc">${esc(TOPIC_SHORT[it.tid])} · №${it.num}</span><button class="qstar${isFav(it.key) ? ' on' : ''}" data-act="qFav" data-k="${it.key}" aria-label="Избранное">${ic('star')}</button></div><p class="qt">${vx(it.q)}</p>${it.p ? `<img class="qpic" src="${it.p}" alt="Рисунок" loading="lazy">` : ''}<p class="okans">${ic('check')}${vx(it.a)}${it.aText ? ' — ' + vx(it.aText) : ''}</p>${it.e ? `<details class="whyd"><summary>Пояснение</summary>${whyHtml(it.e)}</details>` : ''}</article>`).join('')
        : '<p class="mute center-note">Ничего не нашлось. Попробуй часть слова.</p>'));
}

/* ---------- настройка теста (шторка) ---------- */
let CFG = Object.assign({ topic: 0, src: 'all', n: 20, mode: 'practice', timer: 0 }, (() => { try { return JSON.parse(localStorage.getItem('f2-testcfg') || '{}'); } catch (e) { return {}; } })());
const saveCfg = () => { try { localStorage.setItem('f2-testcfg', JSON.stringify(CFG)); } catch (e) {} };
const segBtns = (g, opts) => `<div class="seg">${opts.map(([v, l]) => `<button type="button" data-act="cfg" data-g="${g}" data-v="${v}" aria-pressed="${String(CFG[g]) === String(v)}">${l}</button>`).join('')}</div>`;
function poolOf(c) { return BANK.filter(x => (!c.topic || x.tid === +c.topic) && (c.src === 'all' || (c.src === 'new' && !isSeen(x.key)) || (c.src === 'err' && isErr(x.key)) || (c.src === 'fav' && isFav(x.key)))); }
function sheetCustom() {
  const avail = poolOf(CFG).length, take = CFG.n ? Math.min(+CFG.n, avail) : avail;
  sheet(`<b class="h">Свой тест</b><div class="form"><small>Тема</small><select id="cfgTopic" class="sel"><option value="0">Все темы</option>${Object.entries(TOPIC_SHORT).map(([k, t]) => `<option value="${k}"${+CFG.topic === +k ? ' selected' : ''}>${k}. ${t}</option>`).join('')}</select>` +
    `<small>Какие вопросы</small>${segBtns('src', [['all', 'Все'], ['new', 'Новые'], ['err', 'Ошибки'], ['fav', 'Избранное']])}` +
    `<small>Сколько</small>${segBtns('n', [[10, '10'], [20, '20'], [30, '30'], [0, 'Все']])}` +
    `<small>Режим</small>${segBtns('mode', [['practice', 'С пояснениями'], ['exam', 'Как на экзамене']])}` +
    `<small>Таймер на вопрос</small>${segBtns('timer', [[0, 'Нет'], [60, '60 с'], [120, '120 с'], [180, '180 с']])}</div>` +
    `<button class="btn wide mt" data-act="customStart"${take ? '' : ' disabled'}>${take ? `Начать · ${plural(take, 'вопрос', 'вопроса', 'вопросов')}` : 'Нет подходящих вопросов'}</button>`);
}
function sheetExam() {
  sheet(`<b class="h">Пробный экзамен</b><p class="mute">30 случайных вопросов из всех 9 тем. Оценка: 60 баллов — «3», 75 — «4», 90 — «5».</p><div class="form"><small>Режим</small>${segBtns('mode', [['exam', 'Как на экзамене'], ['practice', 'С пояснениями']])}<small>Таймер на вопрос</small>${segBtns('timer', [[0, 'Нет'], [60, '60 с'], [120, '120 с'], [180, '180 с']])}</div><button class="btn wide mt" data-act="examStart">Начать экзамен</button>`);
}

/* ---------- события тестов ---------- */
document.addEventListener('click', async e => {
  const b = e.target.closest('[data-act]'); if (!b || b.disabled) return;
  const d = b.dataset;
  switch (d.act) {
    case 'pick': answer(+d.v); break;
    case 'qNext': if (Q) { Q.i++; render(); ui.main.scrollTop = 0; } break;
    case 'qSkip': if (Q && Q.i + 1 < Q.items.length && qCurPick() == null) { stopQTimer(); Q.items.push(Q.items.splice(Q.i, 1)[0]); Q.picks.push(Q.picks.splice(Q.i, 1)[0]); render(); ui.main.scrollTop = 0; toast('Вопрос отложен — он будет в конце'); } break;
    case 'qReveal': if (Q) { Q.reveal = Q.i; stopQTimer(); render(); } break;
    case 'qFav': toggleFav(d.k); b.classList.toggle('on', isFav(d.k)); toast(ic('star') + (isFav(d.k) ? 'Добавлено в избранное' : 'Убрано из избранного')); break;
    case 'qAgain': startQuiz(Object.assign({}, Q, { items: Q.items.map(({ opts, ...x }) => x), saved: false, picks: [], ok: 0, xp: 0, i: 0, started: Date.now() })); break;
    case 'qRetryWrong': { const W = Q.items.filter((it, i) => !pickOk(it, Q.picks[i])).map(({ opts, ...x }) => x); startQuiz({ kind: 'errs', title: 'Работа над ошибками', items: shuffle(W), mode: 'practice', back: Q.back }); break; }
    case 'qDone': { const back = Q && Q.back; Q = null; stopQTimer(); location.hash = back ? back.slice(1) : 'train'; break; }
    case 'quick': { const B = await bank(); startQuiz({ kind: 'quick', title: 'Быстрый тест', items: shuffle(MC(B)).slice(0, 10), back: '#train' }); break; }
    case 'warm': { const B = await bank(); startQuiz({ kind: 'quick', title: 'Разминка', items: shuffle(MC(B)).slice(0, 10), back: '#' }); break; }
    case 'examSetup': await bank(); if (CFG.mode !== 'practice') CFG.mode = 'exam'; sheetExam(); break;
    case 'exam': await bank(); CFG.mode = 'exam'; sheetExam(); break;
    case 'examStart': { const B = await bank(); closeSheet(); saveCfg(); startQuiz({ kind: 'exam', title: 'Пробный экзамен', items: shuffle(MC(B)).slice(0, 30), mode: CFG.mode, timer: +CFG.timer, back: '#train' }); break; }
    case 'due': { const B = await bank(), W = B.filter(x => isDue(x.key)); if (!W.length) { toast(ic('check') + 'На сегодня повторять нечего'); break; } startQuiz({ kind: 'due', title: 'Повторение', items: shuffle(W).slice(0, 20), back: '#train' }); break; }
    case 'errs': { const B = await bank(), W = B.filter(x => isErr(x.key)); if (!W.length) { toast(ic('check') + 'Ошибок нет — отлично!'); break; } startQuiz({ kind: 'errs', title: 'Мои ошибки', items: shuffle(W).slice(0, 20), back: '#train' }); break; }
    case 'favs': { const B = await bank(), W = B.filter(x => isFav(x.key)); if (!W.length) { toast(ic('star') + 'Отмечай вопросы звёздочкой'); break; } startQuiz({ kind: 'favs', title: 'Избранное', items: shuffle(W), back: '#train' }); break; }
    case 'topics': { const B = await bank(); sheet(`<b class="h">Тест по теме</b><p class="mute">15 вопросов из выбранной темы экзамена.</p><div class="chpick">${Object.entries(TOPIC_SHORT).map(([id, t]) => { const all = B.filter(x => x.tid === +id), s = all.filter(x => isSeen(x.key)).length, er = all.filter(x => isErr(x.key)).length; return `<button class="qrow" data-act="topicQuiz" data-topic="${id}"><span class="tnum">${id}</span><span><b>${t}</b><small>решено ${s} из ${all.length}${er ? ` · ошибок ${er}` : ''}</small></span>${ic('chevron-right')}</button>`; }).join('')}</div>`); break; }
    case 'topicQuiz': { const B = await bank(), W = B.filter(x => x.tid === +d.topic); closeSheet(); startQuiz({ kind: 'topic', title: TOPIC_SHORT[d.topic], items: shuffle(W).slice(0, 15), back: '#train' }); break; }
    case 'pickCh': sheet(`<b class="h">Вопросы экзамена по главам</b><div class="chpick">${CHAPTERS.filter(c => chExam(c.n).length).map(c => `<button class="qrow" data-act="chQuiz" data-ch="${c.n}"><span class="tnum">${c.n}</span><span><b>${esc(c.title)}</b><small>${plural(chExam(c.n).length, 'вопрос', 'вопроса', 'вопросов')}</small></span>${ic('chevron-right')}</button>`).join('')}</div>`); break;
    case 'chQuiz': { closeSheet(); const B = await bank(), ks = chExam(+d.ch), W = B.filter(x => ks.includes(x.key)); startQuiz({ kind: 'chq', title: 'Глава ' + d.ch + ': вопросы экзамена', items: shuffle(W).slice(0, 15), back: location.hash || '#train' }); break; }
    case 'custom': await bank(); sheetCustom(); break;
    case 'cfg': CFG[d.g] = ['n', 'timer', 'topic'].includes(d.g) ? +d.v : d.v; saveCfg(); if ($('#cfgTopic')) sheetCustom(); else sheetExam(); break;
    case 'customStart': { const B = await bank(); closeSheet(); const W = shuffle(poolOf(CFG)), items = CFG.n ? W.slice(0, +CFG.n) : W; startQuiz({ kind: 'custom', title: CFG.topic ? TOPIC_SHORT[CFG.topic] : 'Свой тест', items, mode: CFG.mode, timer: +CFG.timer, back: '#train' }); void B; break; }
    case 'qsearch': location.hash = 'qsearch'; break;
  }
});
document.addEventListener('change', e => { if (e.target.id === 'cfgTopic') { CFG.topic = +e.target.value; saveCfg(); sheetCustom(); } });
document.addEventListener('input', e => {
  if (e.target.id !== 'qs') return; qsText = e.target.value;
  clearTimeout(vQSearch.t); vQSearch.t = setTimeout(() => { const pos = e.target.selectionStart; render(); const q = $('#qs'); if (q) { q.focus(); try { q.setSelectionRange(pos, pos); } catch (er) {} } }, 200);
});
document.addEventListener('keydown', e => {
  if (route().name !== 'quiz' || !Q || e.ctrlKey || e.metaKey || e.altKey || e.target.tagName === 'INPUT') return;
  const k = /^[1-6]$/.test(e.key) ? +e.key - 1 : 'абвгде'.indexOf(e.key.toLowerCase());
  if (Q.i < Q.items.length && Q.items[Q.i].self) { if (e.key === 'Enter' && $('#qnext')) { e.preventDefault(); $('#qnext').click(); } else if (e.key === ' ' && !$('.ansbox')) { e.preventDefault(); Q.reveal = Q.i; render(); } return; }
  if (Q.i < Q.items.length && qCurPick() == null && k >= 0 && k < Q.items[Q.i].opts.length) { e.preventDefault(); answer(k); }
  else if (e.key === 'Enter' && $('#qnext')) { e.preventDefault(); $('#qnext').click(); }
});
