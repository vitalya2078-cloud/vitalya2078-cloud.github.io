const T = JSON.parse(document.getElementById('data').textContent);
const P = JSON.parse(document.getElementById('pics').textContent);
const $ = s => document.querySelector(s);
const main = $('#main'), inp = $('#q'), cnt = $('#cnt'), ttl = $('#ttl'), back = $('#back'), trainBtn = $('#train'), topBtn = $('#top'), srch = $('#srch');

// хранилище: всё только на этом устройстве
const LS = {
  get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
};
const norm = s => String(s).toLowerCase().replace(/ё/g, 'е'); // длина строки сохраняется — важно для подсветки
const esc = s => String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const TOK = /[a-zа-я0-9]+/g;
const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.random() * (i + 1) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; };
const plural = (n, a, b, c) => n + ' ' + (n % 10 === 1 && n % 100 !== 11 ? a : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20) ? b : c);
const nQ = n => plural(n, 'вопрос', 'вопроса', 'вопросов');
const keepScroll = f => { const y = window.scrollY; f(); window.scrollTo(0, y); };
const IN_APP = /FizikaApp/.test(navigator.userAgent); // запущено внутри Android-приложения

// знак-формула каждой темы
const GLYPH = { 1: 'F = ma', 2: 'U = IR', 3: 'ε = −dΦ/dt', 4: 'pV = νRT', 5: 'T = 2π√(l/g)', 6: 'd sin φ = mλ', 7: 'E = hν', 8: 'E<sub>g</sub>', 9: 'α β γ' };

// плоский список вопросов
const ALL = [], BY = {};
T.forEach(t => t.q.forEach((q, j) => {
  const it = { t, i: j + 1, key: t.id + '-' + (j + 1), q, nt: norm(q.t + ' \n ' + q.a) };
  it.toks = [...new Set(it.nt.match(TOK) || [])];
  ALL.push(it); BY[it.key] = it;
}));

// прогресс: key -> {ok, bad, last}; last = 1 верно / 0 ошибка в последний раз
let stat = LS.get('fz-stat', {}); if (!stat || typeof stat !== 'object' || Array.isArray(stat)) stat = {};
const favRaw = LS.get('fz-fav', []), fav = new Set(Array.isArray(favRaw) ? favRaw.filter(k => BY[k]) : []);
let train = LS.get('fz-train', 0) == 1;
const revealed = new Set(), rated = new Set();
function record(key, ok) { const s = stat[key] || { ok: 0, bad: 0 }; ok ? s.ok++ : s.bad++; s.last = ok ? 1 : 0; stat[key] = s; LS.set('fz-stat', stat); }
const isErr = k => !!stat[k] && stat[k].last === 0;
const seen = k => !!stat[k];
function toggleFav(k) { fav.has(k) ? fav.delete(k) : fav.add(k); LS.set('fz-fav', [...fav]); }
trainBtn.setAttribute('aria-pressed', train);

// поиск: сначала точный (подстрока), если пусто — нечёткий с учётом опечаток
const qWords = raw => norm(raw).split(/[^a-zа-я0-9]+/).filter(Boolean);
function lev(a, b, max) {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i]; let best = i;
    for (let j = 1; j <= b.length; j++) { cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); if (cur[j] < best) best = cur[j]; }
    if (best > max) return max + 1; prev = cur;
  }
  return prev[b.length];
}
function fuzzyTok(w, tok) { // слово запроса похоже на начало слова из текста (окончания не важны)
  const tol = w.length >= 7 ? 2 : w.length >= 4 ? 1 : 0;
  if (!tol || tok[0] !== w[0] || tok.length < w.length - tol) return false;
  for (let L = w.length - tol; L <= w.length + tol; L++) {
    if (lev(w, tok.slice(0, L), tol) <= tol) return true;
    if (L >= tok.length) break;
  }
  return false;
}
const matches = (it, ws, fz) => ws.every(w => it.nt.includes(w) || (fz && w.length >= 4 && it.toks.some(tok => fuzzyTok(w, tok))));
function find(items, ws) {
  if (!ws.length) return { r: items, fz: false };
  let r = items.filter(it => matches(it, ws, false));
  if (r.length) return { r, fz: false };
  r = items.filter(it => matches(it, ws, true));
  return { r, fz: r.length > 0 };
}
function hl(text, ws, fz) {
  if (!ws.length) return esc(text);
  const nt = norm(text), m = [];
  ws.forEach(w => { if (w.length < 2) return; let p = nt.indexOf(w); while (p !== -1) { m.push([p, p + w.length]); p = nt.indexOf(w, p + 1); } });
  if (fz) { const re = new RegExp(TOK.source, 'g'); let mt; while ((mt = re.exec(nt))) if (ws.some(w => w.length >= 4 && fuzzyTok(w, mt[0]))) m.push([mt.index, mt.index + mt[0].length]); }
  if (!m.length) return esc(text);
  m.sort((a, b) => a[0] - b[0] || b[1] - a[1]); let o = '', last = 0;
  for (const [a, b] of m) { if (a < last) continue; o += esc(text.slice(last, a)) + '<mark>' + esc(text.slice(a, b)) + '</mark>'; last = b; }
  return o + esc(text.slice(last));
}

const route = () => {
  const h = location.hash.replace('#', ''), m = /^t(\d)$/.exec(h);
  if (m && T[m[1] - 1]) return { name: 'topic', tid: +m[1] };
  if (h === 'fav' || h === 'err' || h === 'test') return { name: h };
  return { name: 'home' };
};

// пояснение к ответу: подробное по шагам (объект) или короткое (строка, старые темы)
const nl = t => esc(t).replace(/\n/g, '<br>');
function whyBody(e) {
  if (typeof e === 'string') {
    return `<p class="why-text">${esc(e).replace('⚠', '<b class="flag">Ключ спорный.</b>')}</p>`;
  }
  return `<div class="why-step"><b>Что спрашивают</b><p>${nl(e.s)}</p></div>` +
    `<div class="why-step"><b>Главная идея</b><p>${nl(e.i)}</p></div>` +
    `<div class="why-step"><b>Решение</b><p>${nl(e.r)}</p></div>` +
    (e.w ? `<div class="why-warn"><b>Внимание: ключ спорный</b><p>${nl(e.w)}</p></div>` : '');
}
function why(q, open) {
  if (!q.e) return '';
  return open ? `<section class="why open"><h3 class="why-h">Пояснение</h3>${whyBody(q.e)}</section>`
    : `<details class="why"><summary><span class="sh">Показать пояснение</span><span class="hd">Скрыть пояснение</span></summary>${whyBody(q.e)}</details>`;
}

// карточка вопроса (справочник)
let cur = { ws: [], fz: false, opt: {} }; // параметры последнего рендера, чтобы перерисовывать одну карточку
function card(it, ws = [], fz = false, opt = {}) {
  const { q, key } = it;
  const pic = q.p && P[q.p] ? `<img src="${P[q.p]}" alt="Рисунок к вопросу ${it.i}">` : '';
  const hide = train && !opt.force && !revealed.has(key);
  let ans;
  if (hide) ans = `<button class="ans hidden" type="button" data-act="reveal" data-k="${key}">Показать ответ</button>`;
  else {
    ans = `<div class="ans">${hl(q.a, ws, fz)}${q.n ? ` <small>(${esc(q.n)})</small>` : ''}</div>`;
    if (train && !opt.force && !rated.has(key)) ans += `<div class="rate"><button type="button" class="ok" data-act="rate" data-v="1" data-k="${key}">Знал</button><button type="button" class="bad" data-act="rate" data-v="0" data-k="${key}">Не знал</button></div>`;
  }
  const others = !hide && q.x.length ? `<div class="others">Неверные варианты: ${esc(q.x.join('; '))}</div>` : '';
  const st = stat[key], badge = !st ? '' : st.last ? ' <span class="badge ok" title="В последний раз — верно">верно</span>' : ' <span class="badge bad">ошибка</span>';
  const f = fav.has(key);
  return `<article class="q" id="q${key}"><button class="star${f ? ' on' : ''}" type="button" data-act="fav" data-k="${key}" aria-pressed="${f}" aria-label="${f ? 'Убрать из избранного' : 'В избранное'}">${f ? '★' : '☆'}</button>` +
    `<p class="qt"><span class="qn">${opt.showT ? it.t.id + '.' : ''}${it.i}</span>${hl(q.t, ws, fz)}${badge}</p>${pic}${opt.extra || ''}${ans}${others}${hide ? '' : why(q, opt.force)}</article>`;
}
function refreshCard(k) { const el = document.getElementById('q' + k); if (el) el.outerHTML = card(BY[k], cur.ws, cur.fz, cur.opt); }
function grouped(items, ws, fz) {
  const n = {}; items.forEach(it => { n[it.t.id] = (n[it.t.id] || 0) + 1; });
  let html = '', tid = 0;
  items.forEach(it => { if (it.t.id !== tid) { tid = it.t.id; html += `<h2 class="sec"><a href="#t${tid}">${tid}. ${esc(it.t.title)}</a> <span>${n[tid]}</span></h2>`; } html += card(it, ws, fz); });
  return `<div class="list">${html}</div>`;
}
const numCls = (it, vis) => [vis ? '' : 'dim', stat[it.key] ? (stat[it.key].last ? 'ok' : 'bad') : ''].join(' ').trim();
const ruler = (ok, bad, total, cls = '') => `<span class="ruler${cls ? ' ' + cls : ''}" aria-hidden="true"><i class="okp" style="width:${ok / total * 100}%"></i><i class="badp" style="width:${bad / total * 100}%"></i></span>`;
function topicStat(items) { let s = 0, e = 0; items.forEach(it => { if (seen(it.key)) { s++; if (isErr(it.key)) e++; } }); return { s, e }; }

// экраны
function render() {
  const r = route(), raw = inp.value.trim();
  cur = { ws: [], fz: false, opt: {} };
  const inTest = r.name === 'test';
  document.body.dataset.view = r.name;
  back.hidden = r.name === 'home';
  topBtn.hidden = r.name === 'home' && !raw;
  srch.hidden = inTest; trainBtn.hidden = inTest;
  if (inTest) return renderTest();
  if (r.name === 'topic') return renderTopic(r.tid, raw);
  if (r.name === 'fav' || r.name === 'err') return renderList(r.name, raw);
  return raw ? renderSearchAll(raw) : renderHome();
}

function renderHome() {
  if (T.length === 1) return renderSingleHome();
  ttl.innerHTML = 'Физика';
  inp.placeholder = 'Поиск или номер, например 3.15';
  const all = topicStat(ALL), errN = ALL.filter(it => isErr(it.key)).length;
  cnt.textContent = all.s ? `Решено ${all.s} из ${ALL.length}, ошибок сейчас ${errN}` : `${nQ(ALL.length)} в ${T.length} темах`;
  main.innerHTML = installBox() +
    `<section class="hero"><a class="go" href="#test"><b>Пройти тест</b><span>Варианты вперемешку, пояснение после каждого ответа</span></a>` +
    `<div class="pair"><a class="chipbtn${errN ? ' red' : ''}" href="#err">Мои ошибки <b>${errN}</b></a><a class="chipbtn" href="#fav">Избранное <b>${fav.size}</b></a></div></section>` +
    '<h2 class="sec">Темы</h2><div class="tiles">' + T.map(t => {
      const items = ALL.filter(it => it.t === t), s = topicStat(items);
      const meta = s.s ? `решено ${s.s} из ${items.length}` + (s.e ? `, ошибок ${s.e}` : '') : nQ(items.length);
      return `<a class="tile" href="#t${t.id}"><span class="glyph">${GLYPH[t.id] || ''}</span><span class="tn">${t.id}</span><span class="tt">${esc(t.title)}</span><span class="tm">${meta}</span>${ruler(s.s - s.e, s.e, items.length)}</a>`;
    }).join('') + '</div>' +
    (all.s ? '<p class="note center">Прогресс хранится только на этом устройстве. <button class="link" type="button" data-act="reset">Сбросить прогресс</button></p>' : '');
  bindInstall();
}

function renderSingleHome() {
  const t = T[0], s = topicStat(ALL), errN = ALL.filter(it => isErr(it.key)).length;
  ttl.innerHTML = `<span class="tglyph">${GLYPH[t.id] || ''}</span>${esc(t.title)}`;
  inp.placeholder = 'Поиск по вопросам или номер';
  cnt.textContent = s.s ? `Решено ${s.s} из ${ALL.length}, ошибок сейчас ${errN}` : `${nQ(ALL.length)} с ответами и подробными пояснениями`;
  main.innerHTML = installBox() +
    `<section class="hero"><a class="go" href="#test"><b>Пройти тест</b><span>4 варианта ответа, после каждого — подробное пояснение</span></a>` +
    `<a class="go alt" href="#t${t.id}"><b>Учить вопросы</b><span>Все ${ALL.length} вопросов с ответами; пояснение — по кнопке под ответом</span></a>` +
    (s.s ? ruler(s.s - s.e, s.e, ALL.length, 'big') : '') +
    `<div class="pair"><a class="chipbtn${errN ? ' red' : ''}" href="#err">Мои ошибки <b>${errN}</b></a><a class="chipbtn" href="#fav">Избранное <b>${fav.size}</b></a></div></section>` +
    '<h2 class="sec">Как заниматься</h2><ol class="howto"><li><b>Учить вопросы</b> — читаешь вопрос, ответ и пояснение. Включи «Тренировку» в шапке, чтобы ответы были скрыты.</li><li><b>Пройти тест</b> — выбираешь вариант и сразу видишь, почему верно именно так.</li><li><b>Мои ошибки</b> — сюда попадает всё, где ошибся. Повторяй, пока список не опустеет.</li></ol>' +
    (s.s ? '<p class="note center">Прогресс хранится только на этом устройстве. <button class="link" type="button" data-act="reset">Сбросить прогресс</button></p>' : '');
  bindInstall();
}

function renderSearchAll(raw) {
  ttl.innerHTML = T.length === 1 ? esc(T[0].title) : 'Физика';
  const m = /^(\d)\s*[.,\-/ ]\s*(\d{1,3})$/.exec(raw); // «3.15» — тема 3, вопрос 15
  if (m && T[m[1] - 1] && BY[m[1] + '-' + +m[2]]) {
    cur.opt = { showT: true };
    cnt.textContent = `Тема ${m[1]}, вопрос ${+m[2]}`;
    main.innerHTML = `<div class="list"><h2 class="sec"><a href="#t${m[1]}">${m[1]}. ${esc(T[m[1] - 1].title)}</a></h2>${card(BY[m[1] + '-' + +m[2]], [], false, cur.opt)}</div>`;
    return;
  }
  const ws = qWords(raw), { r, fz } = find(ALL, ws);
  cur.ws = ws; cur.fz = fz;
  cnt.textContent = fz ? `Точных совпадений нет, похожих: ${r.length}` : `Найдено во всех темах: ${r.length}`;
  main.innerHTML = r.length ? grouped(r, ws, fz) : '<div class="empty">Ничего не нашлось. Попробуй часть слова или номер вопроса, например 3.15.</div>';
}

function renderTopic(tid, raw) {
  const t = T[tid - 1], items = ALL.filter(it => it.t === t), isNum = /^\d+$/.test(raw);
  ttl.innerHTML = `<span class="tglyph">${GLYPH[tid] || ''}</span>${t.id}. ${esc(t.title)}`;
  inp.placeholder = 'Слова из вопроса или номер';
  let vis = items, fz = false, ws = [];
  if (isNum) vis = items.filter(it => String(it.i) === raw);
  else if (raw) { ws = qWords(raw); ({ r: vis, fz } = find(items, ws)); }
  cur.ws = ws; cur.fz = fz;
  const vs = new Set(vis), s = topicStat(items);
  cnt.textContent = raw ? (fz ? `Точных совпадений нет, похожих: ${vis.length}` : `Найдено ${vis.length} из ${items.length}`)
    : `${nQ(items.length)}, решено ${s.s}` + (s.e ? `, ошибок ${s.e}` : '');
  main.innerHTML = `<div class="tbar"><button class="go sm" type="button" data-act="testTopic" data-t="${tid}"><b>Тест по теме</b></button><p class="note">В настоящем тесте варианты перемешаны: сверяй текст ответа, а не его номер.</p></div>` +
    `<nav class="nums" id="nums" aria-label="Номера вопросов">${items.map(it => `<a href="#" data-n="${it.i}" class="${numCls(it, vs.has(it))}">${it.i}</a>`).join('')}</nav>` +
    (vis.length ? `<section class="list">${vis.map(it => card(it, ws, fz)).join('')}</section>` : '<div class="empty">Ничего не нашлось.</div>') +
    (T.length > 1 ? `<nav class="pager">${tid > 1 ? `<a href="#t${tid - 1}"><small>Назад</small>${tid - 1}. ${esc(T[tid - 2].title)}</a>` : '<span></span>'}${tid < T.length ? `<a href="#t${tid + 1}"><small>Дальше</small>${tid + 1}. ${esc(T[tid].title)}</a>` : ''}</nav>` : '');
}

function renderList(name, raw) {
  const isF = name === 'fav', base = ALL.filter(it => isF ? fav.has(it.key) : isErr(it.key));
  ttl.innerHTML = isF ? 'Избранное' : 'Мои ошибки';
  inp.placeholder = isF ? 'Поиск в избранном' : 'Поиск в ошибках';
  if (!base.length) {
    cnt.textContent = '';
    main.innerHTML = `<div class="empty">${isF ? 'Здесь пока пусто. Нажми ☆ у вопроса, чтобы сохранить его сюда.' : 'Ошибок нет. Пройди тест или тренировку: вопросы, на которые ответишь неверно, появятся здесь.'}</div>`;
    return;
  }
  const ws = qWords(raw), { r, fz } = find(base, ws);
  cur.ws = ws; cur.fz = fz;
  cnt.textContent = raw ? (fz ? `Точных совпадений нет, похожих: ${r.length}` : `Найдено ${r.length} из ${base.length}`) : nQ(base.length);
  main.innerHTML = `<div class="tbar"><button class="go sm" type="button" data-act="testList" data-src="${name}"><b>Тест по ${isF ? 'избранному' : 'ошибкам'}</b></button>` +
    (isF ? '' : '<p class="note">Вопрос уходит из списка, когда ответишь на него верно.</p>') + '</div>' +
    (r.length ? grouped(r, ws, fz) : '<div class="empty">Ничего не нашлось.</div>');
}

// режим теста
const CFG0 = { topic: 0, src: 'all', n: 20, mc: false };
let cfg = Object.assign({}, CFG0, LS.get('fz-testcfg', {}));
if (!(cfg.topic === 0 || T.some(t => t.id === cfg.topic))) cfg.topic = 0;
if (!['all', 'new', 'err', 'fav'].includes(cfg.src)) cfg.src = 'all';
if (![10, 20, 50, 0].includes(cfg.n)) cfg.n = 20;
cfg.mc = cfg.mc === true;
let test = null, pendingTest = null;
const pool = c => ALL.filter(it => (!c.topic || it.t.id === c.topic) && (!c.mc || it.q.x.length) &&
  (c.src === 'all' || (c.src === 'new' && !seen(it.key)) || (c.src === 'err' && isErr(it.key)) || (c.src === 'fav' && fav.has(it.key))));
function startTest(items) { test = { items: items.map(it => ({ it, opts: it.q.x.length ? shuffle([it.q.a, ...it.q.x]) : null, shown: false })), i: 0, res: [], done: false }; }
const testRunning = () => test && !test.done && test.i < test.items.length && test.res.some(Boolean);

function renderTest() {
  if (!test) return renderSetup();
  if (test.done || test.i >= test.items.length) return renderResults();
  const n = test.items.length, c = test.items[test.i], it = c.it, q = it.q, res = test.res[test.i];
  const okN = test.res.filter(x => x && x.ok).length, badN = test.res.filter(x => x && !x.ok).length;
  ttl.innerHTML = `Тест <span class="pos">${test.i + 1} из ${n}</span>`;
  cnt.textContent = `Верно ${okN}, ошибок ${badN}`;
  const pic = q.p && P[q.p] ? `<img src="${P[q.p]}" alt="Рисунок к вопросу">` : '';
  let body;
  if (c.opts) {
    body = '<div class="opts">' + c.opts.map((o, k) => {
      const cls = !res ? '' : o === q.a ? ' right' : k === res.pick ? ' wrong' : '';
      return `<button class="opt${cls}" type="button" data-act="pick" data-v="${k}"${res ? ' disabled' : ''}><span class="ok-n">${"АБВГДЕ"[k]}</span><span>${esc(o)}</span></button>`;
    }).join('') + '</div>';
    if (res) body += `<div class="verdict ${res.ok ? 'ok' : 'bad'}">${res.ok ? 'Верно' : 'Неверно. Правильный ответ отмечен зелёным.'}</div>`;
  } else if (!c.shown && !res) {
    body = '<button class="ans hidden" type="button" data-act="show">Показать ответ</button><p class="note">Для этого вопроса в базе нет вариантов. Вспомни ответ, потом проверь себя.</p>';
  } else {
    body = `<div class="ans">${esc(q.a)}</div>` + (res ? `<div class="verdict ${res.ok ? 'ok' : 'bad'}">${res.ok ? 'Отмечено: знал' : 'Отмечено: не знал'}</div>`
      : '<div class="rate"><button type="button" class="ok" data-act="self" data-v="1">Знал</button><button type="button" class="bad" data-act="self" data-v="0">Не знал</button></div>');
  }
  if (res) body += (q.n ? `<p class="note">${esc(q.n)}</p>` : '') + why(q, true);
  main.innerHTML = ruler(okN, badN, n, 'big') +
    `<article class="q test"><p class="qt"><span class="qn">${it.t.id}.${it.i}</span>${esc(q.t)}</p>${pic}${body}</article>` +
    (res ? `<button class="next" type="button" data-act="next">${test.i + 1 < n ? 'Следующий вопрос' : 'Показать результат'}</button>` : '') +
    `<div class="tfoot"><button class="link" type="button" data-act="finish">Завершить тест</button></div>`;
  const nx = $('.next'); if (nx) nx.focus({ preventScroll: true });
}

function renderSetup() {
  ttl.innerHTML = 'Тест';
  const avail = pool(cfg).length, take = cfg.n ? Math.min(cfg.n, avail) : avail;
  cnt.textContent = `Подходит вопросов: ${avail}`;
  const chip = (g, v, label) => `<button type="button" class="chip" data-act="cfg" data-g="${g}" data-v="${v}" aria-pressed="${cfg[g] === v}">${esc(label)}</button>`;
  main.innerHTML = '<section class="setup">' +
    (T.length > 1 ? `<h2 class="sec">Тема</h2><div class="chips">${chip('topic', 0, 'Все темы')}${T.map(t => chip('topic', t.id, t.id + '. ' + t.title)).join('')}</div>` : '') +
    `<h2 class="sec">Какие вопросы</h2><div class="chips">${chip('src', 'all', 'Все')}${chip('src', 'new', 'Ещё не решал')}${chip('src', 'err', 'Мои ошибки')}${chip('src', 'fav', 'Избранное')}</div>` +
    `<div class="chips">${chip('mc', false, 'С вариантами и без')}${chip('mc', true, 'Только с вариантами')}</div>` +
    `<h2 class="sec">Сколько</h2><div class="chips">${[10, 20, 50, 0].map(v => chip('n', v, v || 'Все')).join('')}</div>` +
    `<button class="next" type="button" data-act="start"${take ? '' : ' disabled'}>${take ? `Начать: ${nQ(take)}` : 'Нет подходящих вопросов'}</button>` +
    '<p class="note">Вопросы и варианты перемешиваются. После каждого ответа — подробное пояснение. Если вариантов в базе нет, проверяешь себя сам. На клавиатуре: 1–4 (или А–Г) — выбрать, Enter — дальше.</p></section>';
}

function renderResults() {
  const done = test.res.map((r, k) => r && { r, c: test.items[k] }).filter(Boolean);
  const ok = done.filter(d => d.r.ok).length, tot = done.length, pct = tot ? Math.round(ok / tot * 100) : 0;
  const wrong = done.filter(d => !d.r.ok);
  const mark = pct >= 85 ? 5 : pct >= 70 ? 4 : pct >= 50 ? 3 : 2;
  const word = { 5: 'Отлично', 4: 'Хорошо', 3: 'Удовлетворительно', 2: 'Нужно повторить' }[mark];
  ttl.innerHTML = 'Результат';
  cnt.textContent = tot < test.items.length ? `Отвечено ${tot} из ${test.items.length}` : nQ(tot);
  cur.opt = { force: true };
  main.innerHTML = `<section class="score m${mark}"><span class="grade" aria-label="Оценка ${mark}">${mark}</span><div><b>${ok} из ${tot}</b><span>${word}, ${pct}% верных ответов</span></div></section>` +
    '<div class="pair">' + (wrong.length ? `<button class="chipbtn red" type="button" data-act="retry">Ошибки ещё раз <b>${wrong.length}</b></button>` : '') +
    '<button class="chipbtn" type="button" data-act="again">Новый тест</button><a class="chipbtn" href="#">К темам</a></div>' +
    (wrong.length ? '<h2 class="sec">Разбор ошибок</h2><div class="list">' + wrong.map(d => card(d.c.it, [], false,
      { force: true, showT: true, extra: d.c.opts ? `<div class="mine">Твой ответ: ${esc(d.c.opts[d.r.pick])}</div>` : '' })).join('') + '</div>'
      : '<div class="empty">Ни одной ошибки.</div>');
}

// события
function jump(n) {
  let el = document.getElementById(`q${route().tid}-${n}`);
  if (!el) { inp.value = ''; render(); el = document.getElementById(`q${route().tid}-${n}`); }
  if (!el) return;
  const go = () => window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY - $('header').getBoundingClientRect().height - 8);
  go(); requestAnimationFrame(go);
  el.classList.add('flash'); setTimeout(() => el.classList.remove('flash'), 1200);
}
const go = h => { if (location.hash.replace('#', '') === h) { test = null; if (pendingTest) startTest(pendingTest); pendingTest = null; render(); window.scrollTo(0, 0); } else location.hash = h; };
function answer(ok, pick) { const c = test.items[test.i]; test.res[test.i] = { ok, pick }; record(c.it.key, ok); render(); }

main.addEventListener('click', e => {
  const a = e.target.closest('.nums a');
  if (a) { e.preventDefault(); jump(a.dataset.n); return; }
  const b = e.target.closest('[data-act]');
  if (!b || b.disabled) return;
  const k = b.dataset.k, v = b.dataset.v;
  switch (b.dataset.act) {
    case 'reveal': revealed.add(k); refreshCard(k); break;
    case 'rate': {
      record(k, v === '1'); rated.add(k); refreshCard(k);
      const n = document.querySelector(`.nums a[data-n="${BY[k].i}"]`); if (n) n.className = numCls(BY[k], !n.classList.contains('dim'));
      break;
    }
    case 'fav': toggleFav(k); if (route().name === 'fav') keepScroll(render); else refreshCard(k); break;
    case 'reset':
      if (confirm('Сбросить весь прогресс и список ошибок? Избранное останется.')) { stat = {}; LS.set('fz-stat', stat); render(); }
      break;
    case 'hideInstall': LS.set('fz-noinstall', 1); render(); break;
    case 'testTopic': cfg.topic = +b.dataset.t; LS.set('fz-testcfg', cfg); go('test'); break;
    case 'testList': pendingTest = shuffle(ALL.filter(it => b.dataset.src === 'fav' ? fav.has(it.key) : isErr(it.key))); go('test'); break;
    case 'cfg': {
      const g = b.dataset.g;
      cfg[g] = g === 'src' ? v : g === 'mc' ? v === 'true' : +v;
      LS.set('fz-testcfg', cfg); keepScroll(render); break;
    }
    case 'start': startTest(shuffle(pool(cfg)).slice(0, cfg.n || undefined)); render(); window.scrollTo(0, 0); break;
    case 'pick': { const c = test.items[test.i]; answer(c.opts[+v] === c.it.q.a, +v); break; }
    case 'show': test.items[test.i].shown = true; render(); break;
    case 'self': answer(v === '1'); break;
    case 'next': test.i++; render(); window.scrollTo(0, 0); break;
    case 'finish':
      if (!test.res.some(Boolean)) test = null; else test.done = true;
      render(); window.scrollTo(0, 0); break;
    case 'retry': startTest(shuffle(test.res.map((r, i) => r && !r.ok && test.items[i].it).filter(Boolean))); render(); window.scrollTo(0, 0); break;
    case 'again': test = null; render(); window.scrollTo(0, 0); break;
  }
});
document.addEventListener('keydown', e => {
  if (route().name !== 'test' || !test || test.done || e.ctrlKey || e.metaKey || e.altKey) return;
  const tag = e.target.tagName, c = test.items[test.i];
  if (!c || tag === 'INPUT') return;
  const kk = /^[1-9]$/.test(e.key) ? +e.key - 1 : 'абвгде'.indexOf(e.key.toLowerCase());
  if (c.opts && !test.res[test.i] && kk >= 0 && kk < c.opts.length) { e.preventDefault(); answer(c.opts[kk] === c.it.q.a, kk); }
  else if (test.res[test.i] && e.key === 'Enter' && tag !== 'BUTTON') { e.preventDefault(); test.i++; render(); window.scrollTo(0, 0); }
});
back.addEventListener('click', () => {
  if (route().name === 'test' && testRunning() && !confirm('Прервать тест? Уже данные ответы сохранятся в прогрессе.')) return;
  location.hash = '';
});
window.addEventListener('hashchange', () => {
  inp.value = ''; revealed.clear(); rated.clear();
  if (route().name === 'test') { test = null; if (pendingTest) startTest(pendingTest); }
  pendingTest = null;
  render(); window.scrollTo(0, 0);
});
let tm; inp.addEventListener('input', () => { clearTimeout(tm); tm = setTimeout(render, 140); });
$('#clr').addEventListener('click', () => { inp.value = ''; render(); inp.focus(); });
trainBtn.addEventListener('click', () => { train = !train; revealed.clear(); rated.clear(); trainBtn.setAttribute('aria-pressed', train); LS.set('fz-train', train ? 1 : 0); keepScroll(render); });
topBtn.addEventListener('click', () => window.scrollTo(0, 0));

// установка: Android — кнопка браузера или APK, iOS — «На экран Домой», Windows/Mac — установка из Edge/Chrome
let deferred = null;
window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferred = e; if (route().name === 'home' && !inp.value) render(); });
window.addEventListener('appinstalled', () => { deferred = null; render(); });
const standalone = () => matchMedia('(display-mode: standalone)').matches || matchMedia('(display-mode: window-controls-overlay)').matches || navigator.standalone === true;
const UA = navigator.userAgent, isIOS = /iPhone|iPad|iPod/.test(UA) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1), isAndroid = /Android/.test(UA);
function installBox() {
  if (IN_APP || standalone() || LS.get('fz-noinstall', 0)) return '';
  let how;
  if (isIOS) how = 'Открой сайт в Safari, нажми «Поделиться» <span class="ico" aria-hidden="true">⇪</span> и выбери «На экран „Домой“». Иконка появится рядом с приложениями, всё работает без интернета.';
  else if (isAndroid) how = (deferred ? 'Установи прямо из браузера или ' : 'В Chrome: меню ⋮ → «Добавить на главный экран». Или ') + '<a href="fizika.apk" download>скачай APK</a> (около 2 МБ). Всё работает без интернета.';
  else how = deferred ? 'Установи на компьютер как отдельное приложение: появится в меню «Пуск» и будет работать без интернета.'
    : 'В Edge или Chrome нажми значок установки в адресной строке (⊕) или меню → «Приложения» → «Установить». Появится в меню «Пуск», работает без интернета.';
  return `<aside class="install"><div><b>Поставь как приложение</b><p>${how}</p></div>${deferred ? '<button id="inst" class="instbtn" type="button">Установить</button>' : ''}<button class="x" type="button" data-act="hideInstall" aria-label="Скрыть подсказку">×</button></aside>`;
}
function bindInstall() { const b = $('#inst'); if (b) b.onclick = async () => { deferred.prompt(); await deferred.userChoice; deferred = null; render(); }; }
if ('serviceWorker' in navigator && !IN_APP && location.protocol.startsWith('http')) navigator.serviceWorker.register('sw.js').catch(() => {});
render();
