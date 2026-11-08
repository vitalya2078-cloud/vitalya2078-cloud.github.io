'use strict';
/* Физика — офлайн-приложение с вопросами, тестами и прогрессом.
   Одна кодовая база для сайта (PWA: iPhone, Windows) и Android-приложения (WebView). */
const APP_BUILD = __BUILD__;
// Откуда приложение берёт обновления. Первым — GitVerse (открывается в России без VPN), запасной — GitHub.
const MIRRORS = ['https://fizika.gitverse.site/', 'https://vitalya2078-cloud.github.io/fizika/'];
let REMOTE = (() => { try { const m = JSON.parse(localStorage.getItem('fz-mirror')); return MIRRORS.includes(m) ? m : MIRRORS[0]; } catch (e) { return MIRRORS[0]; } })();
// Запрос к первому зеркалу, которое вернуло настоящий файл. Возвращает результат read(response).
// Важно: GitVerse на отсутствующий файл отвечает кодом 200 и HTML-страницей «не найдено» —
// поэтому для не-HTML файлов HTML-ответ считаем промахом, а read() дополнительно проверяет содержимое.
// Android 2.2+: оболочка сама скачивает файлы зеркал и отдаёт их странице как свои — так не нужен CORS (GitVerse его не отдаёт)
const hasProxy = () => { try { return !!(window.FizikaNative && window.FizikaNative.hasMirrorProxy && window.FizikaNative.hasMirrorProxy()); } catch (e) { return false; } };
const viaProxy = base => !hasProxy() ? base : base.includes('gitverse') ? '/mirror/gv/' : '/mirror/gh/';
async function fetchMirror(path, opt, read) {
  const order = [REMOTE, ...MIRRORS.filter(m => m !== REMOTE)], wantHtml = /\.html(\?|$)/.test(path);
  let last;
  for (const base of order) {
    try {
      const ctl = new AbortController(), tm = setTimeout(() => ctl.abort(), 15000);
      const r = await fetch(viaProxy(base) + path, { ...(opt || {}), signal: ctl.signal }); clearTimeout(tm);
      if (!r.ok) throw new Error(r.status);
      if (!wantHtml && (r.headers.get('content-type') || '').includes('text/html')) throw new Error('не тот файл');
      const out = read ? await read(r) : r;
      if (base !== REMOTE) { REMOTE = base; LS.set('fz-mirror', base); }
      return out;
    } catch (e) { last = e; }
  }
  throw last || new Error('нет связи');
}
const UA = navigator.userAgent;
const IN_APP = /FizikaApp/.test(UA);
const NATIVE = (() => { const m = /FizikaApp\/([\d.]+)(?: \((\d+)\))?/.exec(UA); return m ? { name: m[1], code: +(m[2] || 0) } : null; })();
const BRIDGE = window.FizikaNative || null;
const isIOS = /iPhone|iPad|iPod/.test(UA) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const isAndroid = /Android/.test(UA);

const $ = (s, r = document) => r.querySelector(s);
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const nl = s => esc(s).replace(/\n/g, '<br>');
const LS = {
  get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
};
const plural = (n, a, b, c) => n + ' ' + (n % 10 === 1 && n % 100 !== 11 ? a : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20) ? b : c);
const nQ = n => plural(n, 'вопрос', 'вопроса', 'вопросов');
const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.random() * (i + 1) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; };
const DAY = 864e5;
const buzz = ms => { try { if (navigator.vibrate) navigator.vibrate(ms); } catch (e) {} };

/* ---------- иконки ---------- */
const I = {
  back: '<path d="M15 5l-7 7 7 7"/>',
  close: '<path d="M6 6l12 12M18 6L6 18"/>',
  search: '<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/>',
  eye: '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/>',
  eyeOff: '<path d="M3 3l18 18M10.6 6.1A9 9 0 0 1 12 6c6 0 9.5 6 9.5 6a17 17 0 0 1-3 3.6M6.4 7.6C3.9 9.3 2.5 12 2.5 12S6 18 12 18a8.8 8.8 0 0 0 4.4-1.2M9.9 9.9a3 3 0 0 0 4.2 4.2"/>',
  home: '<path d="M4 10.5L12 4l8 6.5V20h-5.5v-5.5h-5V20H4z"/>',
  topics: '<path d="M5 4.5h11.5a2 2 0 0 1 2 2v13H7a2 2 0 0 1-2-2zM5 17.5a2 2 0 0 1 2-2h11.5M9 8.5h6"/>',
  test: '<rect x="5" y="3.5" width="14" height="17" rx="2"/><path d="M9 3.5h6v3H9zM8.5 12l2 2 4.5-4.5M8.5 17h7"/>',
  me: '<path d="M4.5 20V13M10 20V8M15.5 20v-5M21 20V4.5"/>',
  chev: '<path d="M9 5l7 7-7 7"/>',
  star: '<path d="M12 3.8l2.5 5.2 5.6.8-4 4 .9 5.6L12 16.8l-5 2.6.9-5.6-4-4 5.6-.8z"/>'
};
const ico = (n, cls = '') => `<svg class="i ${cls}" viewBox="0 0 24 24" aria-hidden="true">${I[n]}</svg>`;

/* ---------- хранилище больших данных (IndexedDB) ---------- */
const idb = (() => {
  let p;
  const open = () => p || (p = new Promise((res, rej) => {
    const r = indexedDB.open('fizika', 1);
    r.onupgradeneeded = () => r.result.createObjectStore('kv');
    r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
  }));
  const run = (mode, fn) => open().then(db => new Promise((res, rej) => {
    const t = db.transaction('kv', mode), q = fn(t.objectStore('kv'));
    t.oncomplete = () => res(q && q.result); t.onerror = () => rej(t.error);
  }));
  return { get: k => run('readonly', s => s.get(k)).catch(() => undefined), set: (k, v) => run('readwrite', s => s.put(v, k)) };
})();

/* ---------- контент ---------- */
let T = [], ALL = [], BY = {}, DATA_V = 0, BUNDLED_PICS = new Set();
const otaPics = {}; // рисунки, пришедшие с обновлением (только Android): имя -> blob URL
const TOK = /[a-zа-я0-9]+/g;
const norm = s => String(s).toLowerCase().replace(/ё/g, 'е');
const GLYPH = { 1: 'F = ma', 2: 'U = IR', 3: 'ε = −dΦ/dt', 4: 'pV = νRT', 5: 'T = 2π√(l/g)', 6: 'd sin φ = mλ', 7: 'E = hν', 8: 'E<sub>g</sub>', 9: 'α β γ' };
function validContent(c) {
  return c && Number.isInteger(c.v) && Array.isArray(c.topics) && c.topics.length > 0 && c.topics.every(t =>
    Number.isInteger(t.id) && typeof t.title === 'string' && Array.isArray(t.q) &&
    t.q.every(q => typeof q.t === 'string' && typeof q.a === 'string' && Array.isArray(q.x)));
}
function setContent(c) {
  T = c.topics; DATA_V = c.v; ALL = []; BY = {};
  T.forEach(t => t.q.forEach((q, j) => {
    const it = { t, i: j + 1, key: t.id + '-' + (j + 1), q, nt: norm(q.t + ' \n ' + q.a) };
    it.toks = [...new Set(it.nt.match(TOK) || [])];
    ALL.push(it); BY[it.key] = it;
  }));
}
const picSrc = p => otaPics[p] || 'pics/' + encodeURIComponent(p);
const topicItems = tid => ALL.filter(it => it.t.id === tid);

/* ---------- прогресс ---------- */
// stat[key] = {ok, bad, last, box, due}: last — верно ли в последний раз; box/due — интервальное повторение ошибок
let stat = LS.get('fz-stat', {}); if (!stat || typeof stat !== 'object' || Array.isArray(stat)) stat = {};
let fav = new Set(Array.isArray(LS.get('fz-fav', [])) ? LS.get('fz-fav', []) : []);
let hist = Array.isArray(LS.get('fz-hist', [])) ? LS.get('fz-hist', []) : [];
let train = LS.get('fz-train', 0) == 1;
const REPEAT = [1, 3, 7, 14]; // через сколько дней вернуть вопрос после очередного верного ответа
function record(key, ok) {
  const s = stat[key] || { ok: 0, bad: 0 };
  if (ok) {
    s.ok++;
    if (s.bad) { s.box = (s.box || 0) + 1; s.due = s.box > REPEAT.length ? 0 : Date.now() + REPEAT[s.box - 1] * DAY; }
  } else { s.bad++; s.box = 0; s.due = Date.now() + DAY; }
  s.last = ok ? 1 : 0; stat[key] = s; LS.set('fz-stat', stat); markDay();
}
const isErr = k => !!stat[k] && stat[k].last === 0;
const seen = k => !!stat[k];
const isDue = k => { const s = stat[k]; return !!s && s.bad > 0 && s.due > 0 && s.due <= Date.now(); };
const learned = k => { const s = stat[k]; return !!s && s.bad > 0 && s.due === 0; };
function toggleFav(k) { fav.has(k) ? fav.delete(k) : fav.add(k); LS.set('fz-fav', [...fav]); }
function tstat(items) { let s = 0, e = 0; items.forEach(it => { if (seen(it.key)) { s++; if (isErr(it.key)) e++; } }); return { s, e }; }
const ruler = (ok, bad, total, cls = '') => `<span class="ruler ${cls}" aria-hidden="true"><i class="okp" style="width:${total ? ok / total * 100 : 0}%"></i><i class="badp" style="width:${total ? bad / total * 100 : 0}%"></i></span>`;

/* ---------- поиск ---------- */
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
function fuzzyTok(w, tok) {
  const tol = w.length >= 7 ? 2 : w.length >= 4 ? 1 : 0;
  if (!tol || tok[0] !== w[0] || tok.length < w.length - tol) return false;
  for (let L = w.length - tol; L <= w.length + tol; L++) { if (lev(w, tok.slice(0, L), tol) <= tol) return true; if (L >= tok.length) break; }
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
  if (!ws || !ws.length) return esc(text);
  const nt = norm(text), m = [];
  ws.forEach(w => { if (w.length < 2) return; let p = nt.indexOf(w); while (p !== -1) { m.push([p, p + w.length]); p = nt.indexOf(w, p + 1); } });
  if (fz) { const re = new RegExp(TOK.source, 'g'); let mt; while ((mt = re.exec(nt))) if (ws.some(w => w.length >= 4 && fuzzyTok(w, mt[0]))) m.push([mt.index, mt.index + mt[0].length]); }
  if (!m.length) return esc(text);
  m.sort((a, b) => a[0] - b[0] || b[1] - a[1]); let o = '', last = 0;
  for (const [a, b] of m) { if (a < last) continue; o += esc(text.slice(last, a)) + '<mark>' + esc(text.slice(a, b)) + '</mark>'; last = b; }
  return o + esc(text.slice(last));
}

/* ---------- карточка вопроса ---------- */
function whyBody(e, own) {
  if (typeof e === 'string') {
    return `<p class="why-text">${esc(e).replace('⚠', '<b class="flag">Ключ спорный.</b>')}</p>` + (own ? '' : '<p class="why-more">Краткое пояснение. Подробное, по шагам, появится в одном из обновлений.</p>');
  }
  return `<div class="why-step"><b>Что спрашивают</b><p>${nl(e.s)}</p></div><div class="why-step"><b>Главная идея</b><p>${nl(e.i)}</p></div>` +
    `<div class="why-step"><b>Решение</b><p>${nl(e.r)}</p></div>` + (e.w ? `<div class="why-warn"><b>Внимание: ключ спорный</b><p>${nl(e.w)}</p></div>` : '');
}
function why(q, open) {
  if (!q.e) return '';
  return open ? `<section class="why open"><h3 class="why-h">Пояснение</h3>${whyBody(q.e, q.own)}</section>`
    : `<details class="why"><summary><span class="sh">Показать пояснение</span><span class="hd">Скрыть пояснение</span></summary>${whyBody(q.e, q.own)}</details>`;
}
const revealed = new Set(), rated = new Set();
let cardCtx = { ws: [], fz: false, opt: {} };
function card(it, ws = [], fz = false, opt = {}) {
  const { q, key } = it;
  const pic = q.p ? `<img src="${picSrc(q.p)}" alt="Рисунок к вопросу ${it.t.id}.${it.i}" loading="lazy">` : '';
  const hide = train && !opt.force && !revealed.has(key);
  let ans;
  if (hide) ans = `<button class="ans hidden" type="button" data-act="reveal" data-k="${key}">Показать ответ</button>`;
  else {
    ans = `<div class="ans">${hl(q.a, ws, fz)}${q.n ? ` <small>(${esc(q.n)})</small>` : ''}</div>`;
    if (train && !opt.force && !rated.has(key)) ans += `<div class="rate"><button type="button" class="ok" data-act="rate" data-v="1" data-k="${key}">Знал</button><button type="button" class="bad" data-act="rate" data-v="0" data-k="${key}">Не знал</button></div>`;
  }
  const others = !hide && q.x.length ? `<p class="others">Неверные варианты: ${esc(q.x.join('; '))}</p>` : '';
  const st = stat[key], badge = !st ? '' : st.last ? ' <span class="badge ok">верно</span>' : ' <span class="badge bad">ошибка</span>';
  const f = fav.has(key);
  return `<article class="q" id="q${key}"><div class="qh"><p class="qt"><span class="qn">${it.own ? 'Проверка' : (opt.showT ? it.t.id + '.' : '') + it.i}</span>${hl(q.t, ws, fz)}${badge}</p>` +
    (it.own ? '' : `<button class="star${f ? ' on' : ''}" type="button" data-act="fav" data-k="${key}" aria-pressed="${f}" aria-label="${f ? 'Убрать из избранного' : 'В избранное'}">${ico('star')}</button>`) + '</div>' +
    `${pic}${opt.extra || ''}${ans}${others}${hide ? '' : why(q, opt.force)}</article>`;
}
function refreshCard(k) { const el = document.getElementById('q' + k); if (el) el.outerHTML = card(BY[k], cardCtx.ws, cardCtx.fz, cardCtx.opt); }
function grouped(items, ws, fz) {
  const n = {}; items.forEach(it => { n[it.t.id] = (n[it.t.id] || 0) + 1; });
  let html = '', tid = 0;
  items.forEach(it => { if (it.t.id !== tid) { tid = it.t.id; html += `<h2 class="sec"><a href="#t${tid}q">${tid}. ${esc(it.t.title)}</a><span>${n[tid]}</span></h2>`; } html += card(it, ws, fz); });
  return `<div class="list">${html}</div>`;
}

/* ---------- маршруты ---------- */
// Вкладки: '' Сегодня · topics Курс · practice Практика · ref Справочник. Профиль (me) — по кнопке в шапке.
// Курс: t3 карта темы · t3q вопросы темы · n1-2 лекция · g1-2-sim игра. Практика: test · err · due · games · formulas · hist.
function route() {
  const h = location.hash.replace(/^#\/?/, ''), has = id => T.some(t => t.id === id);
  let m = /^t(\d+)$/.exec(h);
  if (m && has(+m[1])) return { name: 'hub', tid: +m[1], tab: 'course', parent: 'topics' };
  if ((m = /^t(\d+)q$/.exec(h)) && has(+m[1])) return { name: 'topic', tid: +m[1], tab: 'course', parent: 't' + m[1] };
  if ((m = /^n(\d+)-(\d+)$/.exec(h)) && has(+m[1])) return { name: 'note', tid: +m[1], idx: +m[2], tab: 'course', parent: 't' + m[1] };
  if ((m = /^g(\d+)-(\d+)-(sim|pair|tf)$/.exec(h)) && has(+m[1])) return { name: 'game', tid: +m[1], idx: +m[2], game: m[3], tab: 'course', parent: 'n' + m[1] + '-' + m[2] };
  const map = { topics: ['course'], practice: ['practice'], test: ['practice', 'practice'], err: ['practice', 'practice'], due: ['practice', 'practice'], games: ['practice', 'practice'], formulas: ['practice', 'practice'], hist: ['practice', 'practice'],
    ref: ['ref'], search: ['ref'], me: ['', ''], fav: ['', 'me'], settings: ['', 'me'], backup: ['', 'me'] };
  if (map[h]) return { name: h === 'search' ? 'ref' : h, tab: map[h][0], parent: map[h][1] };
  return { name: 'home', tab: 'home' };
}
const go = h => { if (location.hash.replace(/^#/, '') === h) render(); else location.hash = h; };
const scrollMem = {};

/* ---------- оболочка экрана ---------- */
const ui = {};
function frame({ title, back = false, acts = '', sub = '', abar = '', tabs = true }) {
  ui.ttl.innerHTML = title;
  ui.back.hidden = !back;
  ui.acts.innerHTML = acts;
  ui.sub.innerHTML = sub; ui.sub.hidden = !sub;
  ui.abar.innerHTML = abar; ui.abar.hidden = !abar;
  ui.tabs.hidden = !tabs; ui.app.classList.toggle('notabs', !tabs);
}
const actBtn = (act, icon, label, extra = '') => `<button class="ib" type="button" data-act="${act}" aria-label="${label}" title="${label}" ${extra}>${ico(icon)}</button>`;
let searchOpen = false, searchText = '';

// Перерисовка того же экрана (нажал кнопку, выбрал вариант) — без анимации и с той же прокруткой.
// Анимация появления и прокрутка наверх — только при переходе на другой экран.
let lastView = null, sameView = false;
function render() {
  stopTimer();
  const r = route(), y = ui.main.scrollTop;
  sameView = lastView === location.hash; lastView = location.hash;
  document.body.dataset.view = r.name;
  ui.main.classList.remove('map'); // фон карты темы — только на карте
  ui.tabs.querySelectorAll('a').forEach(a => a.setAttribute('aria-current', a.dataset.tab === r.tab ? 'page' : 'false'));
  cardCtx = { ws: [], fz: false, opt: {} };
  stopGame();
  ({ home: vHome, topics: vTopics, hub: vHub, note: vNote, game: vGame, topic: vTopic, test: vTest, me: vMe, err: vList, fav: vList, due: vList, hist: vHist, settings: vSettings, backup: vBackup,
    practice: vPractice, ref: vRef, games: vGames, formulas: vFormulas })[r.name](r);
  if (sameView) ui.main.scrollTop = y;
  miniUpd();
}
function setMain(html) {
  ui.main.innerHTML = html;
  ui.main.classList.remove('enter');
  if (!sameView) { void ui.main.offsetWidth; ui.main.classList.add('enter'); }
}

const progressText = items => { const s = tstat(items); return s.s ? `Решено ${s.s} из ${items.length}` + (s.e ? `, ошибок ${s.e}` : '') : `${nQ(items.length)}, пока не начато`; };

/* ---------- Тема ---------- */
let showNums = false;
function vTopic(r) {
  const t = T.find(x => x.id === r.tid), items = topicItems(t.id);
  LS.set('fz-last', t.id);
  const ws = searchOpen ? qWords(searchText) : [], isNum = /^\d+$/.test(searchText.trim()) && searchOpen;
  let vis = items, fz = false;
  if (isNum) vis = items.filter(it => String(it.i) === searchText.trim());
  else if (ws.length) ({ r: vis, fz } = find(items, ws));
  cardCtx.ws = isNum ? [] : ws; cardCtx.fz = fz;
  frame({
    title: `${t.id}. ${esc(t.title)}`, back: true,
    acts: actBtn('toggleSearch', 'search', 'Поиск в теме') + actBtn('train', train ? 'eyeOff' : 'eye', train ? 'Показывать ответы' : 'Скрыть ответы (тренировка)', `aria-pressed="${train}"`),
    sub: searchOpen ? searchField('Слова из вопроса или номер') : ''
  });
  const vs = new Set(vis);
  setMain(`<div class="topbar-info"><p>${searchOpen && searchText.trim() ? (fz ? `Точных совпадений нет, похожих: ${vis.length}` : `Найдено ${vis.length} из ${items.length}`) : progressText(items)}${train ? '. Тренировка: ответы скрыты' : ''}</p></div>` +
    `<div class="btnrow"><button class="btn" type="button" data-act="testTopic" data-t="${t.id}">Тест по теме</button><button class="btn line" type="button" data-act="nums" aria-expanded="${showNums}">К номеру</button></div>` +
    (showNums ? `<nav class="nums" aria-label="Номера вопросов">${items.map(it => `<a href="#" data-n="${it.i}" class="${numCls(it, vs.has(it))}">${it.i}</a>`).join('')}</nav>` : '') +
    (vis.length ? `<section class="list">${vis.map(it => card(it, cardCtx.ws, fz)).join('')}</section>` : '<div class="empty">Ничего не нашлось.</div>'));
}
const numCls = (it, vis) => [vis ? '' : 'dim', stat[it.key] ? (stat[it.key].last ? 'ok' : 'bad') : ''].join(' ').trim();
const searchField = ph => `<div class="search"><input id="q" type="search" value="${esc(searchText)}" placeholder="${ph}" autocomplete="off" enterkeyhint="search" aria-label="Поиск"><button class="ib" type="button" data-act="clearSearch" aria-label="Очистить">${ico('close')}</button></div>`;

/* ---------- Списки: ошибки, избранное, повторение ---------- */
function vList(r) {
  const kind = r.name, base = ALL.filter(it => kind === 'fav' ? fav.has(it.key) : kind === 'err' ? isErr(it.key) : isDue(it.key));
  const title = { err: 'Мои ошибки', fav: 'Избранное', due: 'На повторение' }[kind];
  frame({ title, back: true });
  if (!base.length) {
    setMain(`<div class="empty">${mascot({ fav: 'think', err: 'joy', due: 'sleep' }[kind], 'mascot big')}<p>${{ fav: 'Здесь пока пусто. Нажми звёздочку у вопроса, чтобы сохранить его сюда.', err: '<b>Ошибок нет!</b><br>Вопросы, на которые ответишь неверно, появятся здесь.', due: '<b>На сегодня всё повторено.</b><br>Ошибки возвращаются через 1, 3, 7 и 14 дней.' }[kind]}</p></div>`);
    return;
  }
  const note = { err: 'Вопрос уходит из списка, когда ответишь на него верно.', fav: '', due: 'Ответишь верно — вопрос вернётся позже. Ошибёшься — завтра.' }[kind];
  setMain(`<div class="topbar-info"><p>${nQ(base.length)}${note ? '. ' + note : ''}</p></div>` +
    `<div class="btnrow"><button class="btn" type="button" data-act="testList" data-src="${kind}">Пройти тестом</button></div>` + grouped(base, [], false));
}

/* ---------- Тест ---------- */
const CFG0 = { topic: 0, src: 'all', n: 30, mc: false, exam: false, tOn: false, tSec: 120 };
let cfg = Object.assign({}, CFG0, LS.get('fz-testcfg', {}));
function fixCfg() {
  if (!(cfg.topic === 0 || T.some(t => t.id === cfg.topic))) cfg.topic = 0;
  if (!['all', 'new', 'err', 'fav'].includes(cfg.src)) cfg.src = 'all';
  if (![30, 10, 0].includes(cfg.n)) cfg.n = 30;
  cfg.mc = cfg.mc === true; cfg.exam = cfg.exam === true;
  cfg.tOn = cfg.tPick === true && cfg.tOn === true;
  cfg.tSec = Math.min(180, Math.max(100, Math.round((+cfg.tSec || 120) / 10) * 10));
}
const saveCfg = () => LS.set('fz-testcfg', cfg);
const SCALE = [[90, 5], [75, 4], [60, 3]];
const points = (ok, n) => n ? ok * 100 / n : 0;
const gradeOf = p => (SCALE.find(([min]) => p >= min - 1e-9) || [0, 2])[1];
const fmtPts = p => (Math.round(p * 10) / 10).toString().replace('.', ',');
const ptsText = p => { const r = Math.round(p * 10) / 10; return Number.isInteger(r) ? plural(r, 'балл', 'балла', 'баллов') : fmtPts(r) + ' балла'; };
const mmss = s => Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
const pool = c => ALL.filter(it => (!c.topic || it.t.id === c.topic) && (!c.mc || it.q.x.length) &&
  (c.src === 'all' || (c.src === 'new' && !seen(it.key)) || (c.src === 'err' && isErr(it.key)) || (c.src === 'fav' && fav.has(it.key))));
let test = null;
function startTest(items, o) {
  test = { kind: o.kind || '', tid: o.tid || 0, note: o.note || '',
    items: items.map(it => ({ it, opts: it.q.x.length ? shuffle([it.q.a, ...it.q.x]) : null, shown: false })),
    i: 0, res: [], done: false, saved: false, exam: !!o.exam, timer: o.timer || 0, label: o.label || 'Тест', topic: o.topic || 0
  };
  if (location.hash !== '#test') location.hash = 'test'; else render();
  ui.main.scrollTop = 0;
}
const timerFromCfg = () => cfg.tOn ? cfg.tSec : 0;
const testRunning = () => test && !test.done && test.i < test.items.length;

let tick = null;
const stopTimer = () => { if (tick) { clearInterval(tick); tick = null; } };
function timeout() {
  stopTimer();
  const c = test.items[test.i];
  test.res[test.i] = { ok: false, pick: -1, timeout: true }; record(c.it.key, false); buzz(200);
  if (test.exam) test.i++;
  render(); ui.main.scrollTop = 0;
}
function startTick(c) {
  const upd = () => {
    const el = $('#tmr'), left = Math.max(0, Math.ceil((c.deadline - Date.now()) / 1000));
    if (el) { el.textContent = mmss(left); el.classList.toggle('warn', left <= 20); }
    const bar = $('#tbar'); if (bar) bar.style.width = (left / test.timer * 100).toFixed(1) + '%';
    if (left <= 0) timeout();
  };
  upd(); tick = setInterval(upd, 250);
}

function vTest() {
  if (!test) return vSetup();
  if (test.done || test.i >= test.items.length) return vResults();
  const n = test.items.length, c = test.items[test.i], it = c.it, q = it.q, res = test.res[test.i];
  const okN = test.res.filter(x => x && x.ok).length, badN = test.res.filter(x => x && !x.ok).length;
  frame({
    title: `<span class="tq">${esc(test.label)}</span><small>Вопрос ${test.i + 1} из ${n}</small>`,
    acts: (test.timer && !res ? `<span class="timer" id="tmr" role="timer" aria-label="Осталось времени">${mmss(test.timer)}</span>` : '') + actBtn('quit', 'close', 'Завершить тест'),
    sub: `<div class="tprog">${test.exam ? ruler(okN + badN, 0, n) : ruler(okN, badN, n)}${test.timer && !res ? '<span class="tbar"><i id="tbar"></i></span>' : ''}</div>`,
    tabs: false,
    abar: res || (!c.opts && c.shown) ? (res ? `<button class="btn wide" type="button" data-act="next">${test.i + 1 < n ? 'Следующий вопрос' : 'Показать результат'}</button>` : '') : `<p class="abar-note">${test.exam ? 'Выбери ответ — сразу откроется следующий вопрос' : `Верно ${okN}, ошибок ${badN}. Баллы: ${fmtPts(points(okN, n))} из 100`}</p>`
  });
  const pic = q.p ? `<img src="${picSrc(q.p)}" alt="Рисунок к вопросу">` : '';
  let body;
  if (c.opts && test.exam && !res) {
    body = '<div class="opts">' + c.opts.map((o, k) => `<button class="opt" type="button" data-act="pick" data-v="${k}"><span class="ln">${'АБВГДЕ'[k]}</span><span>${esc(o)}</span></button>`).join('') + '</div>';
  } else if (c.opts) {
    body = '<div class="opts">' + c.opts.map((o, k) => {
      const cls = !res ? '' : o === q.a ? ' right' : k === res.pick ? ' wrong' : '';
      return `<button class="opt${cls}" type="button" data-act="pick" data-v="${k}"${res ? ' disabled' : ''}><span class="ln">${'АБВГДЕ'[k]}</span><span>${esc(o)}</span></button>`;
    }).join('') + '</div>';
    if (res) body += `<p class="verdict ${res.ok ? 'ok' : 'bad'}">${res.ok ? 'Верно' : res.timeout ? 'Время вышло — засчитано как неверный ответ. Правильный отмечен зелёным.' : 'Неверно. Правильный ответ отмечен зелёным.'}</p>`;
  } else if (!c.shown && !res) {
    body = '<button class="ans hidden" type="button" data-act="show">Показать ответ</button><p class="note">Для этого вопроса в базе нет вариантов. Вспомни ответ, потом проверь себя.</p>';
  } else {
    body = `<div class="ans">${esc(q.a)}</div>` + (res ? `<p class="verdict ${res.ok ? 'ok' : 'bad'}">${res.ok ? 'Отмечено: знал' : res.timeout ? 'Время вышло — засчитано как неверный ответ' : 'Отмечено: не знал'}</p>`
      : '<div class="rate"><button type="button" class="ok" data-act="self" data-v="1">Знал</button><button type="button" class="bad" data-act="self" data-v="0">Не знал</button></div>');
  }
  if (res) body += (q.n ? `<p class="note">${esc(q.n)}</p>` : '') + why(q, true);
  setMain(`<article class="q test"><p class="qt"><span class="qn">${it.own ? esc(it.lbl) : it.t.id + '.' + it.i}</span>${esc(q.t)}</p>${pic}${body}</article>`);
  const nx = $('[data-act=next]'); if (nx) nx.focus({ preventScroll: true });
  if (test.timer && !res) { if (!c.deadline) c.deadline = Date.now() + test.timer * 1000; startTick(c); }
}
function answer(ok, pick) {
  const c = test.items[test.i]; test.res[test.i] = { ok, pick }; record(c.it.key, ok); buzz(ok ? 12 : [30, 40, 30]);
  if (test.exam && c.opts) { test.i++; render(); ui.main.scrollTop = 0; return; }
  render();
}

let setupMore = false;
function vSetup() {
  fixCfg();
  const avail = pool(cfg).length, take = cfg.n ? Math.min(cfg.n, avail) : avail;
  const seg = (g, opts) => `<div class="seg">${opts.map(([v, l]) => `<button type="button" data-act="cfg" data-g="${g}" data-v="${v}" aria-pressed="${cfg[g] === v}">${esc(l)}</button>`).join('')}</div>`;
  frame({ title: 'Свой тест', back: true, abar: `<button class="btn wide" type="button" data-act="start"${take ? '' : ' disabled'}>${take ? `Начать: ${nQ(take)}` : 'Нет подходящих вопросов'}</button>` });
  setMain(
    `<section class="form"><h2>Тема</h2><select id="tsel" class="sel" aria-label="Тема"><option value="0"${cfg.topic ? '' : ' selected'}>Все темы</option>${T.map(t => `<option value="${t.id}"${cfg.topic === t.id ? ' selected' : ''}>${t.id}. ${esc(t.title)}</option>`).join('')}</select></section>` +
    `<section class="form"><h2>Какие вопросы</h2>${seg('src', [['all', 'Все'], ['new', 'Новые'], ['err', 'Ошибки'], ['fav', 'Избранное']])}</section>` +
    `<section class="form"><h2>Сколько</h2>${seg('n', [[10, '10'], [30, '30, как на экзамене'], [0, 'Все']])}<p class="note">Подходит вопросов: ${avail}. «3» — от 60 баллов, «4» — от 75, «5» — от 90.</p></section>` +
    `<button class="more-b" type="button" data-act="setupMore" aria-expanded="${setupMore}">Дополнительно ${ico('chev', setupMore ? 'up' : 'down')}</button>` +
    (setupMore ? `<section class="form"><h2>Варианты ответа</h2>${seg('mc', [[false, 'С вариантами и без'], [true, 'Только с вариантами']])}</section>` +
      `<section class="form"><h2>Пояснения</h2>${seg('exam', [[false, 'Сразу после ответа'], [true, 'В конце']])}</section>` +
      `<section class="form"><h2>Таймер на вопрос</h2>${seg('tOn', [[false, 'Без таймера'], [true, 'С таймером']])}` +
      (cfg.tOn ? `<h2 class="sub2">Секунд на вопрос</h2>${seg('tSec', [100, 120, 140, 160, 180].map(s => [s, String(s)]))}<p class="note">Не успел — вопрос засчитывается как неверный. <span id="ttot">${totTxt(take)}</span></p>` : '') + '</section>' : ''));
}
const totTxt = n => `На ${nQ(n)} — не больше ${Math.ceil(n * cfg.tSec / 60)} мин.`;

function vResults() {
  const n = test.items.length, done = test.res.map((r, k) => r && { r, c: test.items[k] }).filter(Boolean);
  const ok = done.filter(d => d.r.ok).length, tot = done.length, wrong = done.filter(d => !d.r.ok);
  const pts = points(ok, n), mark = gradeOf(pts);
  const word = { 5: 'Отлично', 4: 'Хорошо', 3: 'Удовлетворительно', 2: 'Неудовлетворительно' }[mark];
  const nextT = SCALE.slice().reverse().find(([min]) => min > pts + 1e-9);
  const need = nextT ? Math.ceil(nextT[0] * n / 100 - 1e-9) - ok : 0;
  const hint = nextT ? `До «${nextT[1]}» не хватило ${plural(need, 'верного ответа', 'верных ответов', 'верных ответов')}.` : 'Максимальная оценка.';
  if (!test.saved && tot) { hist.push({ d: Date.now(), label: test.label, n, ok, pts: Math.round(pts * 10) / 10, mark, exam: test.exam }); hist = hist.slice(-100); LS.set('fz-hist', hist); test.saved = true; }
  const chk = checkBanner(pts);
  frame({ title: 'Результат', abar: (wrong.length ? `<button class="btn" type="button" data-act="retry">Повторить ошибки (${wrong.length})</button>` : '') + '<button class="btn line" type="button" data-act="again">Новый тест</button>' });
  cardCtx.opt = { force: true };
  setMain(chk + `<section class="score sit">${mascot(resultMascot(mark), 'sitm')}<span class="grade" aria-label="Оценка ${mark}">${mark}</span><div><b>${ptsText(pts)} из 100</b><span>${word}: верно ${ok} из ${n}${tot < n ? ` (без ответа ${n - tot})` : ''}. ${hint}</span></div></section>` +
    (wrong.length ? '<h2 class="sec">Разбор ошибок</h2><div class="list">' + wrong.map(d => card(d.c.it, [], false,
      { force: true, showT: true, extra: d.r.timeout ? '<p class="mine">Время вышло — ответа нет</p>' : d.c.opts ? `<p class="mine strike">Твой ответ: ${esc(d.c.opts[d.r.pick])}</p>` : '' })).join('') + '</div>'
      : '<div class="empty"><b>Ни одной ошибки.</b></div>'));
}

/* ---------- Прогресс ---------- */
function chart(items) {
  if (!items.length) return '<p class="note">Пройди тест — здесь появится график баллов.</p>';
  const W = 320, H = 140, pad = 22, bw = (W - pad) / 12;
  const y = v => H - 16 - (v / 100) * (H - 26);
  const lines = [60, 75, 90].map(v => `<line x1="${pad}" x2="${W}" y1="${y(v)}" y2="${y(v)}" class="gl"/><text x="0" y="${y(v) + 4}" class="gt">${v}</text>`).join('');
  const bars = items.map((h, k) => `<rect x="${pad + k * bw + 3}" y="${y(h.pts)}" width="${bw - 6}" height="${H - 16 - y(h.pts)}" rx="3" class="b m${h.mark}"><title>${fmtPts(h.pts)} баллов, оценка ${h.mark}</title></rect>`).join('');
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Баллы за последние ${items.length} тестов">${lines}${bars}</svg><p class="note">Линии — пороги «3», «4» и «5». Столбик — один тест.</p>`;
}
function vHist() {
  frame({ title: 'История тестов', back: true });
  if (!hist.length) { setMain('<div class="empty">Тестов пока не было.</div>'); return; }
  const df = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });
  setMain('<div class="group">' + hist.slice().reverse().map(h => `<div class="row static"><span class="hm m${h.mark}">${h.mark}</span><span><b>${esc(h.label || 'Тест')}</b><small>${df.format(h.d)}: ${ptsText(h.pts)}, верно ${h.ok} из ${h.n}${h.exam ? ', как на экзамене' : ''}</small></span></div>`).join('') + '</div>');
}

/* ---------- Резервная копия ---------- */
function backupData() { return { app: 'fizika', v: 1, date: new Date().toISOString(), stat, fav: [...fav], hist, cfg }; }
function vBackup() {
  frame({ title: 'Резервная копия', back: true });
  setMain(`<section class="panel"><h2>Сохранить</h2><p class="note">Прогресс хранится только на этом устройстве. Сохрани копию, чтобы перенести её на другой телефон или не потерять при переустановке.</p>` +
    `<div class="btnrow"><button class="btn" type="button" data-act="bkSave">Сохранить в файл</button><button class="btn line" type="button" data-act="bkCopy">Скопировать код</button></div></section>` +
    `<section class="panel"><h2>Восстановить</h2><p class="note">Выбери сохранённый файл или вставь код. Текущий прогресс будет заменён.</p>` +
    `<div class="btnrow"><label class="btn line file">Выбрать файл<input id="bkFile" type="file" accept=".json,application/json,text/plain"></label></div>` +
    `<textarea id="bkText" rows="4" placeholder="Вставь сюда код прогресса" aria-label="Код прогресса"></textarea><div class="btnrow"><button class="btn" type="button" data-act="bkPaste">Восстановить из кода</button></div><p class="note" id="bkMsg" role="status"></p></section>`);
}
function restore(text) {
  let d; try { d = JSON.parse(text); } catch (e) { return 'Это не похоже на резервную копию: файл или код повреждён.'; }
  if (!d || d.app !== 'fizika' || typeof d.stat !== 'object' || !Array.isArray(d.fav)) return 'Это не резервная копия приложения «Физика».';
  if (!confirm('Заменить текущий прогресс сохранённым?')) return '';
  stat = d.stat; fav = new Set(d.fav.filter(k => typeof k === 'string')); hist = Array.isArray(d.hist) ? d.hist : [];
  LS.set('fz-stat', stat); LS.set('fz-fav', [...fav]); LS.set('fz-hist', hist);
  if (d.cfg && typeof d.cfg === 'object') { cfg = Object.assign({}, CFG0, d.cfg); fixCfg(); saveCfg(); }
  return `Готово: восстановлено ${nQ(Object.keys(stat).length)} в прогрессе.`;
}

/* ---------- Настройки и обновления ---------- */
const theme = () => LS.get('fz-theme', 'system');
function applyTheme() { // одна, светлая тема оформления
  document.documentElement.dataset.theme = 'light';
  const dark = false;
  const meta = $('meta[name=theme-color]'); if (meta) meta.content = dark ? '#132B4C' : '#FFFFFF';
  if (BRIDGE && BRIDGE.setDark) try { BRIDGE.setDark(dark); } catch (e) {}
}
function vSettings() {
  frame({ title: 'Настройки', back: true });
  setMain(    `<section class="panel"><h2>Обновления</h2><p class="note">Приложение ${IN_APP ? `для Android ${esc(NATIVE ? NATIVE.name : '')}` : 'в браузере'}, сборка ${APP_BUILD}, вопросы — версия ${DATA_V}. ${IN_APP ? 'Новые вопросы и изменения интерфейса скачиваются сами, когда есть интернет.' : 'При запуске с интернетом всегда открывается свежая версия.'}</p>` +
    `<div class="btnrow"><button class="btn line" type="button" data-act="checkUpd">Проверить обновления</button></div><p class="note" id="updMsg" role="status"></p></section>` +
    (IN_APP ? '' : `<section class="panel"><h2>Установить как приложение</h2><p class="note">${installHow()}</p></section>`) +
    `<section class="panel"><h2>Сброс</h2><p class="note">Удалить решённые вопросы, ошибки и историю тестов на этом устройстве. Избранное останется.</p><div class="btnrow"><button class="btn danger" type="button" data-act="reset">Сбросить прогресс</button></div></section>`);
}
const standalone = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
function installHow() {
  if (isIOS) return 'Открой сайт в Safari, нажми «Поделиться» и выбери «На экран „Домой“». Работает без интернета.';
  if (isAndroid) return `Скачай приложение для Android: <a href="fizika.apk">fizika.apk</a>. Или в Chrome: меню ⋮ → «Добавить на главный экран».`;
  return 'В Edge или Chrome нажми значок установки в адресной строке или меню → «Приложения» → «Установить». Появится в меню «Пуск».';
}
function installRow() {
  if (IN_APP || standalone() || LS.get('fz-noinstall', 0)) return '';
  return `<div class="hint"><p><b>Поставь как приложение.</b> ${installHow()}</p><button class="ib" type="button" data-act="hideInstall" aria-label="Скрыть">${ico('close')}</button></div>`;
}
function notice() {
  const n = LS.get('fz-notice', null);
  if (!n) return '';
  return `<div class="hint ${n.kind || ''}"><p>${n.html}</p>${n.act ? `<button class="btn sm" type="button" data-act="${n.act}">${esc(n.btn)}</button>` : ''}<button class="ib" type="button" data-act="hideNotice" aria-label="Скрыть">${ico('close')}</button></div>`;
}
const setNotice = n => { LS.set('fz-notice', n); if (route().name === 'home') render(); };

// Только Android: тихо скачиваем новые вопросы и новую версию интерфейса с сайта
async function checkUpdates(manual) {
  if (!IN_APP) { if (manual) location.reload(); return; }
  const say = t => { const el = $('#updMsg'); if (el) el.textContent = t; };
  if (manual) say('Проверяю…');
  try {
    const v = await fetchMirror('version.json?t=' + Date.now(), { cache: 'no-store' }, r => r.json());
    let news = [];
    if (Number.isInteger(v.data) && v.data > DATA_V) {
      const c = await fetchMirror('content.json?v=' + v.data, { cache: 'no-store' }, async r => { const j = await r.json(); if (!validContent(j)) throw new Error('битые данные'); return j; });
      if (validContent(c) && c.v === v.data) {
        await fetchPics(c);
        await idb.set('content', c);
        setContent(c); news.push('обновлены вопросы и пояснения');
      }
    }
    if (Number.isInteger(v.build) && v.build > APP_BUILD && String(v.build) !== localStorage.getItem('fz-app-bad') && LS.get('fz-app-build', 0) < v.build) {
      const h = await fetchMirror('app.html?v=' + v.build, { cache: 'no-store' }, async r => { const t = await r.text(); if (!t.includes('const APP_BUILD = ' + v.build + ';')) throw new Error('не та версия'); return t; });
      if (h.includes('const APP_BUILD = ' + v.build + ';')) {
        localStorage.setItem('fz-app-html', h); LS.set('fz-app-build', v.build);
        news.push('скачана новая версия интерфейса');
      }
    }
    LS.set('fz-upd-at', Date.now());
    const whatsNew = v.notes ? ` Что нового: ${esc(v.notes)}` : '';
    if (v.apk && NATIVE && v.apk.code > NATIVE.code) {
      setNotice({ kind: 'upd', html: `<b>Вышло приложение ${esc(v.apk.name)}.</b> Установи его поверх текущего — прогресс сохранится.`, act: 'getApk', btn: 'Скачать' });
      LS.set('fz-apk-url', v.apk.url);
    } else if (news.length) {
      setNotice({ kind: 'upd', html: `<b>Приложение обновлено.</b>${whatsNew || ' ' + news.join(', ') + '.'}` });
    }
    if (manual) say(news.length ? 'Готово: ' + news.join(', ') + '.' : 'У тебя последняя версия.');
    if (news.some(x => x.includes('интерфейса'))) { pendingReload = true; applyUpdate(manual); }
    else if (news.length && !testRunning()) render();
  } catch (e) { if (manual) say('Не удалось проверить: нет связи с сайтом. Попробуй позже.'); }
}
// новая версия интерфейса включается перезапуском — только когда человек ничем не занят
let pendingReload = false;
const busyNow = () => testRunning() || (typeof G !== 'undefined' && G && ['throw', 'sim'].includes(G.kind) && route().name === 'game') || (typeof AUD !== 'undefined' && AUD.el && !AUD.el.paused);
function applyUpdate(force) {
  if (!pendingReload || (!force && busyNow())) return;
  pendingReload = false;
  ui.main.innerHTML = '<div class="empty"><b>Обновляю приложение…</b></div>';
  setTimeout(() => location.reload(), 500);
}
async function fetchPics(c) {
  const need = new Set(); c.topics.forEach(t => t.q.forEach(q => { if (q.p && !BUNDLED_PICS.has(q.p)) need.add(q.p); }));
  for (const p of need) {
    let blob = await idb.get('pic:' + p);
    if (!blob) { try { blob = await fetchMirror('pics/' + encodeURIComponent(p), {}, r => r.blob()); } catch (e) { continue; } await idb.set('pic:' + p, blob); }
    otaPics[p] = URL.createObjectURL(blob);
  }
}

/* ---------- события ---------- */
function onClick(e) {
  const a = e.target.closest('.nums a');
  if (a) { e.preventDefault(); jump(a.dataset.n); return; }
  const b = e.target.closest('[data-act]');
  if (!b || b.disabled) return;
  const k = b.dataset.k, v = b.dataset.v;
  switch (b.dataset.act) {
    case 'openSearch': searchText = ''; searchOpen = true; go('ref'); focusSearch(); break;
    case 'toggleSearch': searchOpen = !searchOpen; searchText = ''; render(); if (searchOpen) focusSearch(); break;
    case 'clearSearch': searchText = ''; render(); focusSearch(); break;
    case 'train': train = !train; revealed.clear(); rated.clear(); LS.set('fz-train', train ? 1 : 0); keep(render); break;
    case 'nums': showNums = !showNums; keep(render); break;
    case 'reveal': revealed.add(k); refreshCard(k); break;
    case 'rate': record(k, v === '1'); rated.add(k); refreshCard(k); break;
    case 'fav': toggleFav(k); if (route().name === 'fav') keep(render); else refreshCard(k); break;
    case 'exam': startTest(shuffle(ALL.filter(it => it.q.x.length)).slice(0, 30), { exam: true, timer: timerFromCfg(), label: 'Экзамен' }); break;
    case 'testTopic': cfg.topic = +b.dataset.t; saveCfg(); test = null; go('test'); break;
    case 'testDue': startTest(shuffle(ALL.filter(it => isDue(it.key))), { label: 'Повторение', timer: 0 }); break;
    case 'testList': {
      const src = b.dataset.src, items = shuffle(ALL.filter(it => src === 'fav' ? fav.has(it.key) : src === 'err' ? isErr(it.key) : isDue(it.key)));
      startTest(items, { label: { fav: 'Избранное', err: 'Мои ошибки', due: 'Повторение' }[src], timer: 0 }); break;
    }
    case 'cfg': {
      const g = b.dataset.g;
      cfg[g] = g === 'src' ? v : ['mc', 'exam', 'tOn'].includes(g) ? v === 'true' : +v;
      if (g === 'tOn') cfg.tPick = true;
      saveCfg(); keep(render); break;
    }
    case 'setupMore': setupMore = !setupMore; keep(render); break;
    case 'start': {
      fixCfg();
      const items = shuffle(pool(cfg)).slice(0, cfg.n || undefined);
      startTest(items, { exam: cfg.exam, timer: timerFromCfg(), label: cfg.topic ? T.find(t => t.id === cfg.topic).title : 'Тест по всем темам', topic: cfg.topic }); break;
    }
    case 'pick': { const c = test.items[test.i]; answer(c.opts[+v] === c.it.q.a, +v); break; }
    case 'show': test.items[test.i].shown = true; render(); break;
    case 'self': answer(v === '1'); break;
    case 'next': test.i++; render(); ui.main.scrollTop = 0; break;
    case 'quit':
      if (test.res.some(Boolean)) { if (!confirm('Завершить тест? Вопросы без ответа засчитаются как неверные.')) break; test.done = true; }
      else test = null;
      render(); ui.main.scrollTop = 0; break;
    case 'retry': startTest(shuffle(test.res.map((r, i) => r && !r.ok && test.items[i].it).filter(Boolean)), { label: 'Работа над ошибками', timer: 0 }); break;
    case 'again': test = null; render(); ui.main.scrollTop = 0; break;
    case 'reset':
      if (confirm('Сбросить решённые вопросы, ошибки и историю тестов? Избранное останется.')) { stat = {}; hist = []; LS.set('fz-stat', stat); LS.set('fz-hist', hist); render(); }
      break;
    case 'theme': LS.set('fz-theme', v); applyTheme(); render(); break;
    case 'checkUpd': checkUpdates(true); break;
    case 'hideInstall': LS.set('fz-noinstall', 1); render(); break;
    case 'hideNotice': LS.set('fz-notice', null); render(); break;
    case 'restart': LS.set('fz-notice', null); location.reload(); break;
    case 'getApk': LS.set('fz-notice', null); window.open(LS.get('fz-apk-url', REMOTE + 'fizika.apk'), '_blank'); render(); break;
    case 'bkSave': {
      const txt = JSON.stringify(backupData()), name = `fizika-progress-${new Date().toISOString().slice(0, 10)}.json`;
      if (BRIDGE && BRIDGE.saveText) { BRIDGE.saveText(name, txt); break; }
      const url = URL.createObjectURL(new Blob([txt], { type: 'application/json' })), l = document.createElement('a');
      l.href = url; l.download = name; document.body.appendChild(l); l.click(); l.remove(); setTimeout(() => URL.revokeObjectURL(url), 2000);
      $('#bkMsg').textContent = 'Файл сохранён в «Загрузки».'; break;
    }
    case 'bkCopy': {
      const txt = JSON.stringify(backupData()), msg = $('#bkMsg');
      (navigator.clipboard ? navigator.clipboard.writeText(txt) : Promise.reject()).then(() => { msg.textContent = 'Код скопирован. Сохрани его в заметках или отправь себе в мессенджер.'; })
        .catch(() => { const ta = $('#bkText'); ta.value = txt; ta.select(); msg.textContent = 'Скопируй код из поля выше вручную.'; });
      break;
    }
    case 'bkPaste': { const m = restore($('#bkText').value.trim()); if (m) $('#bkMsg').textContent = m; break; }
  }
}
function onInput(e) {
  if (e.target.id === 'q') { searchText = e.target.value; clearTimeout(onInput.t); onInput.t = setTimeout(() => { const pos = e.target.selectionStart; render(); const q = $('#q'); if (q) { q.focus(); try { q.setSelectionRange(pos, pos); } catch (er) {} } }, 160); }
  if (e.target.id === 'tsl') { cfg.tSec = +e.target.value; saveCfg(); const l = $('#tsec'); if (l) l.textContent = `${cfg.tSec} с (${mmss(cfg.tSec)})`; const t = $('#ttot'); if (t) { const a = pool(cfg).length; t.textContent = totTxt(cfg.n ? Math.min(cfg.n, a) : a); } }
}
function onChange(e) {
  if (e.target.id === 'tsel') { cfg.topic = +e.target.value; saveCfg(); keep(render); return; }
  if (e.target.id === 'bkFile' && e.target.files[0]) {
    const f = e.target.files[0]; if (f.size > 5e6) { $('#bkMsg').textContent = 'Файл слишком большой для резервной копии.'; return; }
    f.text().then(t => { const m = restore(t); if (m) $('#bkMsg').textContent = m; });
  }
}
const focusSearch = () => requestAnimationFrame(() => { const q = $('#q'); if (q) q.focus(); });
const keep = f => { const y = ui.main.scrollTop; f(); ui.main.scrollTop = y; };
function jump(n) {
  const el = document.getElementById(`q${route().tid}-${n}`);
  if (!el) { searchOpen = false; searchText = ''; render(); return jump(n); }
  ui.main.scrollTop = el.offsetTop - 8;
  el.classList.add('flash'); setTimeout(() => el.classList.remove('flash'), 1200);
}
function onKey(e) {
  if (route().name !== 'test' || !test || test.done || e.ctrlKey || e.metaKey || e.altKey) return;
  const tag = e.target.tagName, c = test.items[test.i];
  if (!c || tag === 'INPUT') return;
  const kk = /^[1-9]$/.test(e.key) ? +e.key - 1 : 'абвгде'.indexOf(e.key.toLowerCase());
  if (c.opts && !test.res[test.i] && kk >= 0 && kk < c.opts.length) { e.preventDefault(); answer(c.opts[kk] === c.it.q.a, kk); }
  else if (test.res[test.i] && e.key === 'Enter' && tag !== 'BUTTON') { e.preventDefault(); test.i++; render(); ui.main.scrollTop = 0; }
}

/* ---------- запуск ---------- */
async function boot() {
  Object.assign(ui, { app: $('#app'), ttl: $('#ttl'), back: $('#back'), acts: $('#acts'), sub: $('#sub'), main: $('#main'), abar: $('#abar'), tabs: $('#tabs'), mini: $('#mini') });
  applyTheme(); matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applyTheme);
  let c;
  try { c = await fetch('content.json', { cache: 'no-cache' }).then(r => r.json()); } catch (e) { c = null; }
  if (c && validContent(c)) c.topics.forEach(t => t.q.forEach(q => { if (q.p) BUNDLED_PICS.add(q.p); }));
  if (IN_APP) {
    const st = await idb.get('content');
    if (validContent(st) && (!c || st.v > c.v)) { c = st; await fetchPics(c).catch(() => {}); }
  }
  if (!validContent(c)) { ui.main.innerHTML = '<div class="empty">Не удалось загрузить вопросы. Открой приложение ещё раз, когда будет интернет.</div>'; return; }
  setContent(c); fixCfg();
  document.addEventListener('click', onClick);
  document.addEventListener('input', onInput);
  document.addEventListener('change', onChange);
  document.addEventListener('keydown', onKey);
  ui.back.addEventListener('click', () => { const r = route(); location.hash = r.parent || ''; });
  window.addEventListener('hashchange', () => {
    const prev = onHash.prev; scrollMem[prev] = ui.main.scrollTop;
    const r = route();
    if (r.name !== 'test' && test && (test.done || test.i >= test.items.length)) test = null; // результат уже в истории
    if (r.name !== 'topic' && r.name !== 'ref') { searchOpen = false; searchText = ''; }
    if (r.name === 'ref') searchOpen = true;
    revealed.clear(); rated.clear(); showNums = false;
    render();
    ui.main.scrollTop = scrollMem[location.hash] && r.name !== 'test' ? scrollMem[location.hash] : 0;
    onHash.prev = location.hash;
  });
  render();
  onHash.prev = location.hash;
  try { localStorage.setItem('fz-app-ok', String(APP_BUILD)); } catch (e) {}
  if ('serviceWorker' in navigator && !IN_APP && (location.protocol === 'https:' || location.hostname === 'localhost')) navigator.serviceWorker.register('sw.js').catch(() => {});
  if (IN_APP) {
    checkUpdates(false); window.addEventListener('online', () => checkUpdates(false));
    // Android не перезапускает свёрнутое приложение — проверяем обновления при возвращении в него
    document.addEventListener('visibilitychange', () => { if (document.visibilityState !== 'visible') return; if (pendingReload) applyUpdate(false); else if (Date.now() - LS.get('fz-upd-at', 0) > 15 * 60e3) checkUpdates(false); });
    window.addEventListener('hashchange', () => applyUpdate(false));
  }
}
const onHash = { prev: '' };
boot(); // скрипт стоит в конце страницы — разметка уже готова
