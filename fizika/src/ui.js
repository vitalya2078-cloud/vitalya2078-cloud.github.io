/* ---------- Новый каркас: Сегодня · Курс · Практика · Справочник ---------- */
// Картинки интерфейса (миры, фоны карт, обложки, маскот, иконки) вшиты в сборку — работают без интернета
const UIMG = {{UI}};
const U = n => UIMG[n] || '';
const img = (n, cls = 'ii', alt = '') => `<img class="${cls}" src="${U(n)}" alt="${esc(alt)}">`;
const W_COL = { 1: '#FC6C41', 2: '#FCAC1F', 3: '#7B6AF9', 4: '#FA4988', 5: '#07CCEA', 6: '#40D46E', 7: '#6674FB', 8: '#11C9B7', 9: '#F64D46' };
const W_BG = { 1: '#FEEBE6', 2: '#FEF4E7', 3: '#F5EEFD', 4: '#FEEEF3', 5: '#ECFAFD', 6: '#F0FCF5', 7: '#EEF3FD', 8: '#ECFCFA', 9: '#FEEFF0' };
const SHORT = { 1: 'Механика', 2: 'Электростатика', 3: 'Электромагнетизм', 4: 'Термодинамика', 5: 'Колебания и волны', 6: 'Волновая оптика', 7: 'Квантовая физика', 8: 'Твёрдое тело', 9: 'Ядерная физика' };
const MASCOT = { joy: 'Радость', think: 'Думаю', sleep: 'Сплю', hello: 'Привет', read: 'Читаю', listen: 'Слушаю', win: 'Победа', sad: 'Грустно' };
const mascot = (k, cls = 'mascot') => img('m_' + k, cls, 'Маскот: ' + (MASCOT[k] || ''));
const coverOf = (t, idx) => t.id === 1 && U('c' + idx) ? U('c' + idx) : U('t' + t.id);

/* ---------- активность по дням: серия ---------- */
const dayKey = (d = new Date()) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
function markDay() {
  const days = LS.get('fz-days', []), k = dayKey();
  if (!Array.isArray(days) || days[days.length - 1] === k) { if (!Array.isArray(days)) LS.set('fz-days', [k]); return; }
  days.push(k); LS.set('fz-days', days.slice(-120));
}
function streak() {
  const days = new Set(LS.get('fz-days', [])); let n = 0; const d = new Date();
  if (!days.has(dayKey(d))) d.setDate(d.getDate() - 1); // серия не сгорает, пока не закончился сегодняшний день
  while (days.has(dayKey(d))) { n++; d.setDate(d.getDate() - 1); }
  return n;
}

/* ---------- дата экзамена ---------- */
const examDate = () => { const v = LS.get('fz-exam', ''); return /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : ''; };
function daysToExam() {
  const v = examDate(); if (!v) return null;
  const [y, m, d] = v.split('-').map(Number), now = new Date();
  return Math.round((new Date(y, m - 1, d) - new Date(now.getFullYear(), now.getMonth(), now.getDate())) / DAY);
}
function examChip() {
  const n = daysToExam();
  const txt = n == null ? 'Укажи дату экзамена' : n > 0 ? `До экзамена: <b>${plural(n, 'день', 'дня', 'дней')}</b>` : n === 0 ? '<b>Экзамен сегодня!</b>' : 'Экзамен прошёл — укажи новую дату';
  return `<button class="xchip" type="button" data-act="examDate">${img('i_calendar')}<span>${txt}</span></button>`;
}
function openSheet(html) { const s = $('#sheet'); s.innerHTML = `<div class="sbox" role="dialog" aria-modal="true">${html}</div>`; s.hidden = false; }
const closeSheet = () => { const s = $('#sheet'); if (s) { s.hidden = true; s.innerHTML = ''; } };

/* ---------- готовность к экзамену ---------- */
function readiness() {
  const recent = hist.slice(-5);
  if (recent.length) { const avg = recent.reduce((a, h) => a + h.pts, 0) / recent.length; return { pct: Math.round(avg), mark: gradeOf(avg), by: 'tests' }; }
  const s = tstat(ALL); return { pct: Math.round((s.s - s.e) / ALL.length * 100), mark: 0, by: 'solved' };
}
function ring(pct, col = 'var(--ok)') {
  const r = 34, L = 2 * Math.PI * r, off = L * (1 - Math.max(0, Math.min(100, pct)) / 100);
  return `<svg class="ring" viewBox="0 0 84 84" aria-hidden="true"><circle cx="42" cy="42" r="${r}" stroke="var(--line)" stroke-width="10" fill="none"/><circle cx="42" cy="42" r="${r}" stroke="${col}" stroke-width="10" fill="none" stroke-linecap="round" stroke-dasharray="${L.toFixed(1)}" stroke-dashoffset="${off.toFixed(1)}" transform="rotate(-90 42 42)"/><text x="42" y="48" text-anchor="middle">${pct}%</text></svg>`;
}

/* ---------- что учить дальше ---------- */
function nextLesson() {
  for (const t of T) {
    if (!t.learn) continue;
    const notes = t.learn.notes;
    const i = notes.findIndex(n => !readSet.has(t.id + '-' + n.id));
    if (i >= 0) return { t, n: notes[i], idx: i + 1 };
  }
  for (const t of T) {
    if (!t.learn) continue;
    const i = t.learn.notes.findIndex(n => !(checks[t.id + '-' + n.id] >= PASS));
    if (i >= 0) return { t, n: t.learn.notes[i], idx: i + 1, check: true };
  }
  return null;
}
const lessonMeta = n => [n.audio ? `слушать ${Math.max(1, Math.round(n.audio.dur / 60))} мин` : '', lectureGames(n).length ? plural(lectureGames(n).length, 'игра', 'игры', 'игр') : '', n.c && n.c.length ? plural(n.c.length, 'вопрос', 'вопроса', 'вопросов') : ''].filter(Boolean).join(' · ');
const readCount = t => t.learn ? t.learn.notes.filter(n => readSet.has(t.id + '-' + n.id)).length : 0;
const iconRow = (href, icon, title, sub, act) => `<${act ? `button type="button" data-act="${act}"` : `a href="${href}"`} class="lrow"><span class="ic">${img(icon)}</span><span class="lt"><b>${title}</b><small>${sub}</small></span>${ico('chev')}</${act ? 'button' : 'a'}>`;

/* ---------- Сегодня ---------- */
function vHome() {
  frame({ title: 'Сегодня', acts: avatarBtn() });
  const errN = ALL.filter(it => isErr(it.key)).length, due = ALL.filter(it => isDue(it.key)).length, st = streak(), rd = readiness();
  const nx = nextLesson();
  const hr = new Date().getHours(), hi = hr < 5 ? 'Доброй ночи!' : hr < 12 ? 'Доброе утро!' : hr < 18 ? 'Привет!' : 'Добрый вечер!';
  let hero;
  if (nx) {
    const tot = nx.t.learn.notes.length, rc = readCount(nx.t);
    hero = `<section class="hero"><div class="hero-t"><small>Задание на сегодня · ${esc(SHORT[nx.t.id])}</small><h2>${esc(nx.n.title)}</h2><small>${nx.check ? 'Закрепи лекцию: проверь себя' : esc(lessonMeta(nx.n))}</small></div>` +
      `<div class="hero-bar"><i style="width:${rc / tot * 100}%"></i></div><a class="btn light" href="#n${nx.t.id}-${nx.idx}">${rc ? 'Продолжить' : 'Начать'}</a></section>`;
  } else {
    hero = `<section class="hero"><div class="hero-t"><small>Задание на сегодня</small><h2>Мини-экзамен</h2><small>Все лекции пройдены — держи форму: 10 вопросов</small></div><button class="btn light" type="button" data-act="mini">Начать</button></section>`;
  }
  const wk = [], d = new Date(), days = new Set(LS.get('fz-days', []));
  const mon = new Date(d); mon.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  for (let i = 0; i < 7; i++) {
    const x = new Date(mon); x.setDate(mon.getDate() + i);
    const k = dayKey(x), today = k === dayKey(d), done = days.has(k);
    wk.push(`<span class="day${done ? ' ok' : ''}${today ? ' now' : ''}"><b>${done ? '✓' : x.getDate()}</b>${['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'][i]}</span>`);
  }
  const nextT = rd.by === 'tests' ? SCALE.slice().reverse().find(([min]) => min > rd.pct) : null;
  const rdText = rd.by === 'tests' ? `Средний балл за последние тесты — прогноз <b>«${rd.mark}»</b>.${nextT ? ` До «${nextT[1]}» — от ${nextT[0]} баллов.` : ' Так держать!'}` : 'Пройди мини-экзамен — появится прогноз оценки.';
  setMain(notice() + installRow() +
    `<div class="hello"><h1>${hi}<br>Сегодня — 15 минут физики</h1>${mascot('hello')}</div>` + examChip() + hero +
    `<section class="card"><div class="card-h"><b class="row-i">${img('i_flame')}${st ? 'Серия: ' + plural(st, 'день', 'дня', 'дней') : 'Начни серию сегодня'}</b><small>цель — 7</small></div><div class="week">${wk.join('')}</div></section>` +
    `<section class="card rd">${ring(rd.pct)}<div><b>Готовность к экзамену</b><p>${rdText}</p></div></section>` +
    `<div class="card list">${iconRow('#err', 'i_cross', 'Повторить ошибки', errN ? plural(errN, 'вопрос ждёт', 'вопроса ждут', 'вопросов ждут') : 'ошибок нет')}` +
    iconRow('', 'i_stopwatch', 'Мини-экзамен', '10 вопросов с вариантами', 'mini') +
    iconRow('#due', 'i_refresh', 'Повторение', due ? `${nQ(due)} на сегодня` : 'на сегодня всё повторено', due ? 'testDue' : '') + '</div>');
}
const avatarBtn = () => `<a class="avatar" href="#me" aria-label="Профиль и настройки">${img('i_gear', 'ii')}</a>`;

/* ---------- Курс: миры ---------- */
function topicProgress(t) {
  if (t.learn) { const n = t.learn.notes.length, r = readCount(t); return { f: r / n, txt: `${r} из ${n} лекций` }; }
  const items = topicItems(t.id), s = tstat(items); return { f: (s.s - s.e) / items.length, txt: `Решено ${s.s} из ${items.length}` };
}
function vTopics() {
  frame({ title: 'Курс', acts: avatarBtn() });
  const lect = T.reduce((a, t) => a + (t.learn ? t.learn.notes.length : 0), 0), rd = T.reduce((a, t) => a + readCount(t), 0);
  setMain(`<p class="lead-note">${T.length} миров · прочитано ${rd} из ${plural(lect, 'лекции', 'лекций', 'лекций')} · ${ALL.length} вопросов</p><div class="worlds">` + T.map((t, i) => {
    const p = topicProgress(t);
    return `<a class="world${i === 0 ? ' big' : ''}" href="#t${t.id}" style="--wc:${W_COL[t.id]}"><span class="art" style="background-image:url(${U('t' + t.id)})"></span><span class="tx"><b>${esc(t.title)}</b><small>${p.txt}</small><span class="pb"><i style="width:${Math.round(p.f * 100)}%"></i></span></span></a>`;
  }).join('') + '</div>');
}

/* ---------- Курс: карта темы ---------- */
function mapBg(t) {
  ui.main.classList.add('map');
  ui.main.style.setProperty('--mapc', W_BG[t.id]);
  ui.main.style.setProperty('--mapt', `url(${U('bt' + t.id)})`);
  ui.main.style.setProperty('--mapb', `url(${U('bb' + t.id)})`);
}
function node(o) {
  const side = o.side || 'c', dot = o.img ? `<span class="dot img${o.dim ? ' dim' : ''}${o.now ? ' now' : ''}" style="background-image:url(${o.img})"></span>`
    : `<span class="dot clay${o.now ? ' now' : ''}" style="--cc:${o.col}">${o.glyph}</span>`;
  const tag = o.href ? `a href="${o.href}"` : `button type="button" data-act="${o.act}"${o.t ? ` data-t="${o.t}"` : ''}`;
  return `<${tag} class="node ${side}">${o.now ? '<span class="here">Ты здесь</span>' : ''}${dot}<span class="lbl"><b>${o.title}</b><small>${o.sub}</small></span></${o.href ? 'a' : 'button'}><span class="conn"></span>`;
}
function vHub(r) {
  const t = T.find(x => x.id === r.tid), items = topicItems(t.id);
  LS.set('fz-last', t.id);
  frame({ title: esc(SHORT[t.id] || t.title), back: true });
  mapBg(t);
  const p = topicProgress(t), L = t.learn, sides = ['c', 'l', 'r', 'l', 'r'];
  let h = `<section class="thead"><span class="art" style="background-image:url(${U('t' + t.id)})"></span><span><small>Мир ${t.id}</small><b>${esc(t.title)}</b><small>${p.txt} · открыто всё</small></span></section><div class="tpath">`;
  let cur = null;
  if (L) {
    const nowI = L.notes.findIndex(n => !readSet.has(t.id + '-' + n.id));
    L.notes.forEach((n, i) => {
      const done = readSet.has(t.id + '-' + n.id), now = i === nowI, nc = checks[t.id + '-' + n.id];
      if (now) cur = { n, i };
      const sub = done ? (nc != null ? `прочитано · проверка ${Math.round(nc)}%` : 'прочитано') : now ? lessonMeta(n) : '≈ 15 мин';
      const cov = t.id === 1 ? U('c' + (i + 1)) : '';
      h += node({ href: `#n${t.id}-${i + 1}`, side: sides[(i + 1) % 5], now, img: cov, dim: cov && !done && !now, col: done || now ? W_COL[t.id] : '#C3CADD', glyph: done ? '✓' : i + 1, title: esc(n.title), sub });
      if (i === 2) h += node({ href: '#games', side: 'c', img: U('i_gamepad'), title: 'Привал: игры', sub: 'мини-игры по пройденным лекциям' });
    });
    const c = checks[t.id];
    h += node({ act: 'selfCheck', t: t.id, side: 'c', img: U('i_check'), title: 'Самопроверка темы', sub: c != null ? `лучший результат ${Math.round(c)}%` : `10 вопросов, порог ${PASS}%` });
  } else {
    h += `<div class="hint soon"><p><b>Лекции, озвучка и игры для этого мира готовятся.</b> Пока учи вопросы с пояснениями и проходи тест — новое придёт обновлением.</p></div>`;
  }
  h += node({ href: `#t${t.id}q`, side: L ? 'l' : 'c', img: U('i_book'), title: 'Все вопросы с ответами', sub: progressText(items) });
  h += node({ act: 'testTopic', t: t.id, side: 'c', img: t.id === 1 ? U('c9') : '', col: W_COL[t.id], glyph: cupSvg, title: 'Экзамен по теме', sub: 'тест с оценкой, как на экзамене' }).replace(/<span class="conn"><\/span>$/, '');
  h += '</div>';
  if (cur) h += `<a class="cur" href="#n${t.id}-${cur.i + 1}"><span class="ic">${img('i_headphones')}</span><span class="lt"><b>Текущий урок</b><small>${cur.i + 1}. ${esc(cur.n.title)}</small></span><span class="btn sm">Открыть</span></a>`;
  setMain(h);
}
const cupSvg = '<svg width="30" height="30" viewBox="0 0 30 30" aria-hidden="true"><path d="M8 4h14v7a7 7 0 0 1-14 0z" fill="#fff"/><path d="M8 7H4a4 4 0 0 0 4 6M22 7h4a4 4 0 0 1-4 6M15 18v5M10 26h10" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round"/></svg>';

/* ---------- Лекция: Слушать · Читать · Играть · Проверка ---------- */
const STEPS = [['listen', 'Слушать', 'i_headphones'], ['read', 'Читать', 'i_book'], ['play', 'Играть', 'i_puzzle'], ['check', 'Проверка', 'i_check']];
const noteStep = {}; // текущий шаг по каждой лекции (до перезапуска)
function vNote(r) {
  const t = T.find(x => x.id === r.tid), L = t.learn, n = L && L.notes[r.idx - 1];
  if (!n) { location.hash = 't' + r.tid; return; }
  if (!readSet.has(t.id + '-' + n.id)) { readSet.add(t.id + '-' + n.id); LS.set('fz-read', [...readSet]); markDay(); }
  const key = t.id + '-' + n.id, steps = STEPS.filter(s => s[0] !== 'listen' || n.audio).filter(s => s[0] !== 'play' || lectureGames(n).length);
  let st = noteStep[key] || steps[0][0]; if (!steps.some(s => s[0] === st)) st = steps[0][0];
  const si = steps.findIndex(s => s[0] === st), total = L.notes.length;
  const nextS = steps[si + 1];
  frame({ title: `<span class="tq">${esc(n.title)}</span><small>${esc(SHORT[t.id])} · лекция ${r.idx} из ${total}</small>`, back: true,
    abar: nextS ? `<button class="btn wide" type="button" data-act="noteStep" data-v="${nextS[0]}">Дальше: ${nextS[1]}</button>`
      : r.idx < total ? `<a class="btn wide" href="#n${t.id}-${r.idx + 1}">Следующая лекция</a>` : `<a class="btn wide" href="#t${t.id}">К карте темы</a>` });
  const tabs = `<div class="steps">${steps.map((s, i) => `<button type="button" class="step${i === si ? ' on' : i < si ? ' done' : ''}" data-act="noteStep" data-v="${s[0]}">${img(s[2])}<span>${s[1]}</span></button>`).join('')}</div>`;
  let body = '';
  if (st === 'listen') body = player(t, n, r.idx);
  else if (st === 'read') body = `<article class="conspect"><p class="lead">${esc(n.lead)}</p>${noteBody(n)}</article>` +
    `<div class="pn">${r.idx > 1 ? `<a class="btn line" href="#n${t.id}-${r.idx - 1}">← Прошлая лекция</a>` : ''}${r.idx < total ? `<a class="btn line" href="#n${t.id}-${r.idx + 1}">Следующая →</a>` : ''}</div>`;
  else if (st === 'play') body = gamesBlock(t, n, r.idx);
  else {
    const nc = checks[key];
    body = `<section class="card state">${mascot(nc >= PASS ? 'win' : 'think')}<b>${nc >= PASS ? 'Лекция закреплена' : 'Проверь себя по лекции'}</b><p>${plural(n.c.length, 'вопрос', 'вопроса', 'вопросов')} по этому конспекту, сразу с пояснениями. Порог — ${PASS}%.${nc != null ? ` Лучший результат: ${Math.round(nc)}%.` : ''}</p><button class="btn wide" type="button" data-act="noteCheck" data-t="${t.id}" data-n="${r.idx}">${nc != null ? 'Пройти ещё раз' : 'Начать проверку'}</button></section>`;
  }
  setMain(tabs + body);
}
function noteBody(n) {
  return n.blocks.map(b => {
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
}
function player(t, n, idx) {
  if (!n.audio) return '';
  const pos = LS.get('fz-apos', {})[n.audio.file] || 0, rate = LS.get('fz-arate', 1);
  return `<section class="player big" data-file="${n.audio.file}" data-dur="${n.audio.dur}" data-title="${esc(n.title)}" data-href="#n${t.id}-${idx}" data-cover="${t.id}-${idx}">` +
    `<span class="cover" style="background-image:url(${coverOf(t, idx)})"></span><b class="pt">${esc(n.title)}</b><small class="ps">${esc(SHORT[t.id])} · лекция ${idx}</small>` +
    `<input id="aseek" type="range" min="0" max="${n.audio.dur}" step="1" value="${pos}" aria-label="Перемотка"><small id="atime">${mmss(Math.round(pos))} / ${mmss(Math.round(n.audio.dur))}</small>` +
    `<div class="ctrls"><button class="sm" type="button" data-act="audBack" aria-label="Назад на 15 секунд">−15</button><button class="pp" type="button" data-act="audPlay" aria-label="Слушать лекцию"><svg class="i" viewBox="0 0 24 24" aria-hidden="true"><path class="pi" d="${AUD.el && AUD.file === n.audio.file && !AUD.el.paused ? 'M7 5h4v14H7zM13 5h4v14h-4z' : 'M8 5l11 7-11 7z'}"/></svg></button><button class="rate-btn" type="button" data-act="audRate" aria-label="Скорость">${f1(rate, 2)}×</button></div></section>`;
}
function gamesBlock(t, n, idx) {
  const gs = lectureGames(n); if (!gs.length) return '';
  const ic = { sim: 'i_target', pair: 'i_chain', tf: 'i_truefalse' };
  return `<div class="games">` + gs.map(x => {
    const best = games[gameKey(t, n, x.g)];
    return `<a class="game-card" href="#g${t.id}-${idx}-${x.g}">${img(ic[x.g] || 'i_gamepad', 'gi')}<b>${x.title}</b><small>${x.lead}</small>${best ? stars(best.stars) : '<span class="new">Не пройдена</span>'}</a>`;
  }).join('') + '</div>';
}
const stars = n => `<span class="stars" aria-label="${n} из 3">${[1, 2, 3].map(i => img('i_star', 'st' + (i <= n ? ' on' : ''))).join('')}</span>`;

/* ---------- мини-плеер: озвучка играет, пока ходишь по приложению ---------- */
function miniUpd() {
  const m = $('#mini'); if (!m) return;
  const show = AUD.el && AUD.file && !$('.player.big');
  m.hidden = !show; if (!show) return;
  const playing = !AUD.el.paused, dur = AUD.el.duration || 0;
  m.innerHTML = `<a class="mi" href="${AUD.href || '#'}"><span class="mc" style="background-image:url(${AUD.cover || ''})"></span><span class="mt"><b>${esc(AUD.title || 'Лекция')}</b><small>${mmss(Math.round(AUD.el.currentTime || 0))}${dur ? ' / ' + mmss(Math.round(dur)) : ''}</small></span></a>` +
    `<button class="mb" type="button" data-act="miniToggle" aria-label="${playing ? 'Пауза' : 'Слушать'}"><svg class="i" viewBox="0 0 24 24" aria-hidden="true"><path d="${playing ? 'M7 5h4v14H7zM13 5h4v14h-4z' : 'M8 5l11 7-11 7z'}"/></svg></button>` +
    `<button class="mx" type="button" data-act="miniClose" aria-label="Закрыть плеер">${ico('close')}</button>`;
}

function miniTick() {
  const m = $('#mini'); if (!m || m.hidden || !AUD.el) return;
  const s = m.querySelector('.mt small'), dur = AUD.el.duration || 0;
  if (s) s.textContent = mmss(Math.round(AUD.el.currentTime || 0)) + (dur ? ' / ' + mmss(Math.round(dur)) : '');
}

/* ---------- Практика ---------- */
function vPractice() {
  frame({ title: 'Практика', acts: avatarBtn() });
  const errN = ALL.filter(it => isErr(it.key)).length, due = ALL.filter(it => isDue(it.key)).length;
  const gAll = T.flatMap(t => topicGames(t)), gDone = gAll.filter(k => games[k]).length;
  const df = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long' });
  const last = hist.slice(-3).reverse();
  setMain(`<div class="tiles">` +
    `<button class="tile big" type="button" data-act="exam">${img(U('c9') ? 'c9' : 'i_target', 'tb')}<b>Экзамен · 30 вопросов</b><small>как на настоящем: «3» от 60, «4» от 75, «5» от 90 баллов</small></button>` +
    `<button class="tile" type="button" data-act="quick">${img('i_lightning')}<b>Быстрый тест</b><small>10 вопросов с пояснениями</small></button>` +
    `<a class="tile" href="#err">${img('i_cross')}<b>Мои ошибки</b><small>${errN ? nQ(errN) : 'ошибок нет'}</small></a>` +
    `<a class="tile" href="#due">${img('i_refresh')}<b>Повторение</b><small>${due ? nQ(due) + ' на сегодня' : 'на сегодня всё'}</small></a>` +
    `<a class="tile" href="#games">${img('i_gamepad')}<b>Игры</b><small>пройдено ${gDone} из ${gAll.length}</small></a>` +
    `<a class="tile wide" href="#formulas">${img('i_formula')}<span><b>Формулы</b><small>шпаргалка по конспектам</small></span></a>` +
    `<a class="tile wide" href="#test">${img('i_target')}<span><b>Свой тест</b><small>тема, количество, таймер, режим экзамена</small></span></a></div>` +
    (last.length ? `<h2 class="sec">История<a href="#hist">все ${hist.length}</a></h2><div class="card list">${last.map(h => `<a class="lrow" href="#hist"><span class="hm m${h.mark}">${h.mark}</span><span class="lt"><b>${esc(h.label || 'Тест')}</b><small>${df.format(h.d)} · ${ptsText(h.pts)}</small></span></a>`).join('')}</div>` : ''));
}

/* ---------- Все игры ---------- */
function vGames() {
  frame({ title: 'Игры', back: true });
  let h = '';
  T.forEach(t => {
    if (!t.learn) return;
    h += `<h2 class="sec">${esc(SHORT[t.id])}</h2>` + t.learn.notes.map((n, i) => `<p class="gl-t">${i + 1}. ${esc(n.title)}</p>` + gamesBlock(t, n, i + 1)).join('');
  });
  setMain(h || `<div class="empty">${mascot('think', 'mascot big')}<p>Игры появятся вместе с лекциями.</p></div>`);
}

/* ---------- Формулы ---------- */
function allFormulas() {
  const out = [];
  T.forEach(t => (t.learn ? t.learn.notes : []).forEach((n, i) => {
    let h = n.title;
    n.blocks.forEach(b => { if (b[0] === 'h') h = b[1]; if (b[0] === 'f') out.push({ t, n, idx: i + 1, h, f: b[1] }); });
  }));
  return out;
}
function formulaList(ws) {
  const L = allFormulas().filter(x => !ws.length || ws.every(w => norm(x.h + ' ' + x.f + ' ' + x.n.title).includes(w)));
  if (!L.length) return `<div class="empty">${mascot('think', 'mascot big')}<p>Ничего не нашлось. Попробуй другое слово.</p></div>`;
  return L.map(x => `<a class="fcard" href="#n${x.t.id}-${x.idx}"><small>${esc(SHORT[x.t.id])} · ${esc(x.n.title)}</small><b>${esc(x.h)}</b><div class="formula small">${x.f.split('\n').map(l => `<span>${esc(l)}</span>`).join('')}</div></a>`).join('');
}
function vFormulas() { frame({ title: 'Формулы', back: true }); setMain(formulaList([])); }

/* ---------- Справочник ---------- */
let refSeg = 'q';
function vRef() {
  frame({ title: 'Справочник', acts: avatarBtn(), sub: searchField(refSeg === 'q' ? 'Слова из вопроса или номер, например 3.15' : refSeg === 'f' ? 'Название или формула' : 'Тема лекции') });
  const raw = searchText.trim(), ws = qWords(raw);
  const seg = `<div class="seg">${[['q', 'Вопросы'], ['f', 'Формулы'], ['n', 'Конспекты']].map(([k, l]) => `<button type="button" data-act="refSeg" data-v="${k}" aria-pressed="${refSeg === k}">${l}</button>`).join('')}</div>`;
  let body = '';
  if (refSeg === 'f') body = formulaList(ws);
  else if (refSeg === 'n') {
    const L = []; T.forEach(t => (t.learn ? t.learn.notes : []).forEach((n, i) => { if (!ws.length || ws.every(w => norm(n.title + ' ' + n.lead).includes(w))) L.push({ t, n, i }); }));
    body = L.length ? `<div class="card list">${L.map(x => `<a class="lrow" href="#n${x.t.id}-${x.i + 1}"><span class="ic"><span class="cv" style="background-image:url(${coverOf(x.t, x.i + 1)})"></span></span><span class="lt"><b>${esc(x.n.title)}</b><small>${esc(SHORT[x.t.id])} · ${esc(x.n.lead)}</small></span>${ico('chev')}</a>`).join('')}</div>`
      : `<div class="empty">${mascot('think', 'mascot big')}<p>Ничего не нашлось.</p></div>`;
  } else if (!raw) {
    body = `<div class="card list">${T.map(t => `<a class="lrow" href="#t${t.id}q"><span class="ic"><span class="cv" style="background-image:url(${U('t' + t.id)})"></span></span><span class="lt"><b>${t.id}. ${esc(t.title)}</b><small>${progressText(topicItems(t.id))}</small></span>${ico('chev')}</a>`).join('')}</div>`;
  } else {
    const m = /^(\d)\s*[.,\-/ ]\s*(\d{1,3})$/.exec(raw);
    if (m && BY[m[1] + '-' + +m[2]]) { cardCtx.opt = { showT: true }; body = `<div class="list">${card(BY[m[1] + '-' + +m[2]], [], false, cardCtx.opt)}</div>`; }
    else {
      const { r, fz } = find(ALL, ws); cardCtx.ws = ws; cardCtx.fz = fz;
      const shown = r.slice(0, 100);
      body = r.length ? `<div class="topbar-info"><p>${fz ? `Точных совпадений нет, похожих: ${r.length}` : `Найдено: ${r.length}`}${r.length > shown.length ? `. Показаны первые ${shown.length}` : ''}</p></div>` + grouped(shown, ws, fz)
        : `<div class="empty">${mascot('think', 'mascot big')}<p><b>Ничего не нашлось</b><br>Попробуй часть слова или номер вопроса.</p></div>`;
    }
  }
  setMain(seg + body);
}

/* ---------- Профиль ---------- */
function vMe() {
  frame({ title: 'Профиль', back: true });
  const s = tstat(ALL), errN = ALL.filter(it => isErr(it.key)).length, due = ALL.filter(it => isDue(it.key)).length, lrn = ALL.filter(it => learned(it.key)).length;
  const ed = examDate(), edTxt = ed ? new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(ed + 'T12:00')) : 'не указана';
  setMain(`<section class="stats"><div><b>${s.s}</b><span>решено из ${ALL.length}</span></div><div><b>${streak()}</b><span>дней подряд</span></div><div><b>${lrn}</b><span>ошибок закреплено</span></div></section>` +
    `<section class="panel"><h2>Баллы за последние тесты</h2>${chart(hist.slice(-12))}</section>` +
    `<div class="card list">${iconRow('', 'i_calendar', 'Дата экзамена', edTxt, 'examDate')}${iconRow('#due', 'i_refresh', 'На повторение сегодня', nQ(due))}${iconRow('#err', 'i_cross', 'Мои ошибки', nQ(errN))}${iconRow('#fav', 'i_star', 'Избранное', nQ(fav.size))}${iconRow('#hist', 'i_history', 'История тестов', plural(hist.length, 'тест', 'теста', 'тестов'))}</div>` +
    `<section class="panel"><h2>По темам</h2>${T.map(t => { const it = topicItems(t.id), x = tstat(it); return `<a class="tline" href="#t${t.id}"><span>${t.id}. ${esc(t.title)}</span><small>${x.s}/${it.length}${x.e ? `, ошибок ${x.e}` : ''}</small>${ruler(x.s - x.e, x.e, it.length)}</a>`; }).join('')}</section>` +
    `<div class="card list">${iconRow('#backup', 'i_history', 'Резервная копия прогресса', 'сохранить или восстановить')}${iconRow('#settings', 'i_gear', 'Настройки и обновления', 'тема оформления, версия')}</div>`);
}

/* ---------- маскот в результатах и пустых списках ---------- */
const resultMascot = mark => mark >= 5 ? 'win' : mark >= 3 ? 'joy' : 'sad';

/* ---------- события нового каркаса ---------- */
document.addEventListener('click', e => {
  if (e.target.id === 'sheet') { closeSheet(); return; }
  const b = e.target.closest('[data-act]'); if (!b) return;
  switch (b.dataset.act) {
    case 'noteStep': { const r = route(), t = T.find(x => x.id === r.tid), n = t && t.learn && t.learn.notes[r.idx - 1]; if (n) { noteStep[t.id + '-' + n.id] = b.dataset.v; render(); ui.main.scrollTop = 0; } break; }
    case 'audBack': if (AUD.el) AUD.el.currentTime = Math.max(0, AUD.el.currentTime - 15); break;
    case 'miniToggle': if (AUD.el) { if (AUD.el.paused) AUD.el.play().catch(() => {}); else AUD.el.pause(); } break;
    case 'miniClose': if (AUD.el) { AUD.el.pause(); savePos(); } AUD.file = ''; miniUpd(); break;
    case 'refSeg': refSeg = b.dataset.v; render(); break;
    case 'mini': startTest(shuffle(ALL.filter(it => it.q.x.length)).slice(0, 10), { exam: true, timer: 0, label: 'Мини-экзамен' }); break;
    case 'quick': startTest(shuffle(ALL.filter(it => it.q.x.length)).slice(0, 10), { exam: false, timer: 0, label: 'Быстрый тест' }); break;
    case 'examDate': {
      const v = examDate() || (() => { const d = new Date(); d.setDate(d.getDate() + 30); return dayKey(d); })();
      openSheet(`<b class="sh">Когда экзамен?</b><p class="note">Приложение будет считать дни до экзамена.</p><input id="exd" type="date" value="${v}" min="${dayKey()}"><div class="btnrow"><button class="btn" type="button" data-act="examSave">Сохранить</button>${examDate() ? '<button class="btn line" type="button" data-act="examClear">Убрать дату</button>' : ''}</div>`);
      break;
    }
    case 'examSave': { const v = $('#exd') && $('#exd').value; if (/^\d{4}-\d{2}-\d{2}$/.test(v)) LS.set('fz-exam', v); closeSheet(); keep(render); break; }
    case 'examClear': LS.set('fz-exam', ''); closeSheet(); keep(render); break;
  }
});
