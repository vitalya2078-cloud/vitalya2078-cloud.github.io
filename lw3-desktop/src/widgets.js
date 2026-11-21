/* =====================================================================
   «Физпрактикум» для Windows: поиск (Ctrl+K) и полезные блоки на страницах.
   Поиск — по разделам программы, лабораторным работам, конспектам (заголовки разделов и текст) и терминам.
   Блоки главной: вопрос дня, формула дня, что повторить, физические постоянные, перевод единиц.
   В «Моих результатах» — лучший балл экзамена по каждой теме.
   ===================================================================== */
const fzNorm = s => String(s || '').toLowerCase().replace(/ё/g, 'е');
const fzHash = s => { let h = 2166136261; for (const ch of String(s)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
const fzToday = () => new Date().toISOString().slice(0, 10);

/* ---------- поиск ---------- */
let SR = { q: '', items: [], sel: 0 };
function srIndex() {
  const it = [];
  NAV.forEach(([k, t, i]) => it.push({ g: 'Разделы', t, i, a: { k: 'page', v: k }, h: fzNorm(t) }));
  labNums().forEach(n => it.push({ g: 'Лабораторные работы', t: `ЛР № ${n}. ${labTitle(n)}`, i: 'flask-conical', a: { k: 'lab', v: n }, h: fzNorm(`лр ${n} ${labTitle(n)} лабораторная работа`) }));
  if (NOTES) NOTES.notes.forEach(x => {
    it.push({ g: 'Конспекты', t: x.title, sub: nKind(x), i: 'notebook-pen', a: { k: 'note', v: x.id }, h: fzNorm(`${x.title} ${nKind(x)} конспект`) });
    x.idx.forEach(s => it.push({ g: 'Разделы конспектов', t: s.h, sub: `${nKind(x)}. ${x.title}`, i: 'book-open', a: { k: 'note', v: x.id, s: s.s }, h: fzNorm(s.h), body: s.t, nb: fzNorm(s.t) }));
    x.terms.forEach(term => { const k = fzNorm(term), s = x.idx.find(z => fzNorm(z.t).includes(k)) || x.idx[0];
      it.push({ g: 'Термины', t: term, sub: `${nKind(x)}. ${x.title}`, i: 'bookmark', a: { k: 'note', v: x.id, s: s ? s.s : '' }, h: k }); });
  });
  return it;
}
let SR_IDX = null;
function srFind(q) {
  const toks = fzNorm(q).split(/\s+/).filter(Boolean); if (!toks.length) return [];
  if (!SR_IDX || (NOTES && !SR_IDX.notes)) { SR_IDX = srIndex(); SR_IDX.notes = !!NOTES; }
  const out = [];
  for (const x of SR_IDX) {
    let sc = 0, inBody = false;
    for (const t of toks) {
      if (x.h.includes(t)) sc += x.h.startsWith(t) || x.h.includes(' ' + t) ? 3 : 2;
      else if (x.nb && x.nb.includes(t)) { sc += 1; inBody = true; }
      else { sc = -1; break; }
    }
    if (sc <= 0) continue;
    sc += { 'Разделы': 2, 'Лабораторные работы': 2, 'Конспекты': 2, 'Термины': 1.5, 'Разделы конспектов': 1 }[x.g] || 0;
    if (inBody) sc -= 1.5;
    out.push({ x, sc, inBody });
  }
  out.sort((a, b) => b.sc - a.sc);
  // не больше 6 в группе, всего до 24
  const per = {}, res = [];
  for (const r of out) { per[r.x.g] = (per[r.x.g] || 0) + 1; if (per[r.x.g] <= 6) res.push(r); if (res.length >= 24) break; }
  return res;
}
function srSnippet(text, q) {
  const n = fzNorm(text), t = fzNorm(q).split(/\s+/).filter(Boolean)[0] || '', i = n.indexOf(t); if (i < 0) return '';
  const a = Math.max(0, i - 50), b = Math.min(text.length, i + t.length + 70);
  return (a ? '…' : '') + esc(text.slice(a, i)) + '<mark>' + esc(text.slice(i, i + t.length)) + '</mark>' + esc(text.slice(i + t.length, b)) + (b < text.length ? '…' : '');
}
function srList() {
  const box = $('#fz-srl'); if (!box) return;
  if (!SR.q.trim()) { box.innerHTML = `<div class="fz-srhint"><p>Ищи по темам курса, конспектам, терминам и лабораторным работам.</p><div class="fz-srchips">${['Закон Ома', 'сила Лоренца', 'момент инерции', 'фотоэффект', 'адиабата', 'дифракционная решётка', 'период полураспада'].map(s => `<button data-sr-q="${s}">${s}</button>`).join('')}</div></div>`; SR.items = []; return; }
  const res = srFind(SR.q); SR.items = res; SR.sel = Math.min(SR.sel, Math.max(0, res.length - 1));
  if (!res.length) { box.innerHTML = `<p class="fz-srnone">Ничего не найдено по запросу «${esc(SR.q)}».</p>`; return; }
  let g = '', html = '';
  res.forEach((r, k) => {
    if (r.x.g !== g) { g = r.x.g; html += `<p class="fz-srg">${g}</p>`; }
    const sn = r.inBody && r.x.body ? srSnippet(r.x.body, SR.q) : '';
    html += `<button class="fz-sri ${k === SR.sel ? 'on' : ''}" data-sr="${k}">${ic(r.x.i)}<span><b>${esc(r.x.t)}</b>${r.x.sub ? `<small>${esc(r.x.sub)}</small>` : ''}${sn ? `<em>${sn}</em>` : ''}</span>${ic('chevron-right')}</button>`;
  });
  box.innerHTML = html;
  const on = box.querySelector('.fz-sri.on'); if (on) on.scrollIntoView({ block: 'nearest' });
}
function srOpen() {
  if (!PROFILE || SCREEN !== 'labs') return;
  let el = $('#fz-sr');
  if (!el) {
    el = document.createElement('div'); el.id = 'fz-sr';
    el.innerHTML = `<div class="fz-srbox" role="dialog" aria-label="Поиск"><label class="fz-srin">${ic('search')}<input id="fz-sq" autocomplete="off" spellcheck="false" placeholder="Поиск: темы, конспекты, термины, работы"><kbd>Esc</kbd></label><div id="fz-srl"></div>
      <div class="fz-srft"><span><kbd>↑</kbd><kbd>↓</kbd> выбрать</span><span><kbd>Enter</kbd> открыть</span><span><kbd>Esc</kbd> закрыть</span></div></div>`;
    document.body.appendChild(el);
    el.addEventListener('mousedown', e => { if (e.target === el) srClose(); });
    el.addEventListener('input', e => { if (e.target.id === 'fz-sq') { SR.q = e.target.value; SR.sel = 0; srList(); } });
    el.addEventListener('click', e => {
      const c = e.target.closest('[data-sr-q]'); if (c) { const f = $('#fz-sq'); f.value = SR.q = c.dataset.srQ; SR.sel = 0; srList(); f.focus(); return; }
      const b = e.target.closest('[data-sr]'); if (b) srGo(+b.dataset.sr);
    });
  }
  notesLoad().then(() => { SR_IDX = null; if (!el.hidden) srList(); });
  el.hidden = false; const f = $('#fz-sq'); f.value = SR.q; srList(); setTimeout(() => { f.focus(); f.select(); }, 0);
}
const srClose = () => { const el = $('#fz-sr'); if (el) el.hidden = true; };
const srIsOpen = () => { const el = $('#fz-sr'); return !!el && !el.hidden; };
function srGo(k) {
  const r = SR.items[k]; if (!r) return; srClose(); const a = r.x.a;
  if (a.k === 'page') { PAGE = a.v; NOTE = ''; SCREEN = 'labs'; render(); ui.main.scrollTop = 0; }
  else if (a.k === 'lab') openLab(a.v);
  else if (a.k === 'note') openNote(a.v, a.s || '');
}
document.addEventListener('keydown', e => {
  if (srIsOpen()) {
    if (e.key === 'Escape') { e.preventDefault(); e.stopImmediatePropagation(); srClose(); return; }
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); e.stopImmediatePropagation(); const n = SR.items.length; if (n) { SR.sel = (SR.sel + (e.key === 'ArrowDown' ? 1 : n - 1)) % n; srList(); } return; }
    if (e.key === 'Enter') { e.preventDefault(); e.stopImmediatePropagation(); srGo(SR.sel); return; }
    if (!(e.ctrlKey && e.code === 'KeyK')) { e.stopImmediatePropagation(); return; }   // остальные клавиши — только в поле поиска
  }
  if ((e.ctrlKey || e.metaKey) && !e.altKey && e.code === 'KeyK' && PROFILE && SCREEN === 'labs') { e.preventDefault(); srIsOpen() ? srClose() : srOpen(); }
}, true);

/* ---------- вопрос дня ---------- */
let WQ_OFF = 0, WQ_PICK = null;
function wqPool() { return BANK ? BANK.q.filter(q => !q.broken && !(q.p && q.p.length) && !/^Вариант \d$/.test(q.a) && q.x && q.x.length >= 2 && q.t.length < 260) : []; }
function wqCur() { const P = wqPool(); if (!P.length) return null; return P[(fzHash(fzToday() + (PROFILE ? PROFILE.id : '')) + WQ_OFF * 7919) % P.length]; }
function wqHtml() {
  const q = wqCur(); if (!q) return '';
  const opts = [q.a, ...q.x].map(o => [o, fzHash(q.id + o)]).sort((a, b) => a[1] - b[1]).map(o => o[0]);
  const t = +q.id.split('.')[0], ans = WQ_PICK != null;
  return `<section class="fz-tile fz-w fz-wq"><div class="fz-wh"><h2>${ic('circle-help')} Вопрос дня</h2><span class="fz-wtag">Тема ${t}</span></div>
    <p class="fz-wqt">${esc(q.t)}</p><div class="fz-wqo">${opts.map((o, i) => `<button class="${ans ? (o === q.a ? 'ok' : i === WQ_PICK ? 'bad' : '') : ''}" data-d="wq" data-v="${i}" ${ans ? 'disabled' : ''}>${esc(o)}</button>`).join('')}</div>
    ${ans ? `<p class="fz-verdict ${opts[WQ_PICK] === q.a ? 'ok' : 'bad'}">${opts[WQ_PICK] === q.a ? 'Верно!' : `Неверно. Правильный ответ: ${esc(q.a)}.`}${q.e && q.e.r ? `<span class="fz-wqe">${esc(q.e.r)}</span>` : ''}</p>` : ''}
    <div class="row fz-wrow"><button class="btn ghost" data-d="wq-next">${ic('repeat')} Другой вопрос</button><button class="btn ghost" data-d="note" data-v="t${t}">${ic('notebook-pen')} Конспект темы</button></div></section>`;
}
function wqAnswer(i) {
  const q = wqCur(); if (!q || WQ_PICK != null) return;
  const opts = [q.a, ...q.x].map(o => [o, fzHash(q.id + o)]).sort((a, b) => a[1] - b[1]).map(o => o[0]);
  WQ_PICK = i; const T = tsLoad(); T.self[q.id] = opts[i] === q.a ? 1 : 0; tsSave(T); render();
}

/* ---------- формула дня ---------- */
let FD = null;
function fdList() {
  if (FD || !NOTES || !NOTES.notes.length) return FD || [];
  FD = [];
  NOTES.notes.filter(x => x.kind === 'topic').forEach(x => {
    let h = x.title, sec = '';
    const re = /<h[23] id="([^"]+)">(.*?)<\/h[23]>|<div class="tx d" data-t="([^"]*)">/g; let m;
    while ((m = re.exec(x.html))) { if (m[1]) { sec = m[1]; h = m[2].replace(/<[^>]+>/g, ''); } else if (m[3].length < 110 && !/\\text\{[^}]*\}\s*\\$/.test(m[3])) FD.push({ id: x.id, n: x.n, sec, h, t: m[3] }); }
  });
  return FD;
}
function fdHtml() {
  const L = fdList(); if (!L.length) return '';
  const f = L[fzHash('f' + fzToday()) % L.length];
  return `<section class="fz-tile fz-w fz-fd"><div class="fz-wh"><h2>${ic('sigma')} Формула дня</h2><span class="fz-wtag">Тема ${f.n}</span></div>
    <div class="fz-fdf"><div class="tx d" data-t="${f.t}">${f.t}</div></div><p class="fz-fdh">${esc(f.h)}</p>
    <button class="btn ghost" data-d="fd" data-v="${f.id}" data-s="${f.sec}">${ic('book-open')} Открыть в конспекте</button></section>`;
}

/* ---------- что повторить ---------- */
function rpHtml() {
  if (!BANK) return '';
  const T = tsLoad(), ex = T.att.filter(a => a.kind === 'exam');
  const rows = BANK.topics.map(tp => { const q = bankTopic(tp.id), wrong = q.filter(x => T.self[x.id] === 0).length, ok = q.filter(x => T.self[x.id] === 1).length, b = ex.filter(a => a.topic === tp.id).reduce((m, a) => Math.max(m, a.score), -1);
    return { tp, wrong, ok, n: q.length, b, k: wrong * 3 + (b >= 0 ? (100 - b) / 10 : 4) - ok / 20 }; }).sort((a, b) => b.k - a.k).slice(0, 3);
  return `<section class="fz-tile fz-w"><div class="fz-wh"><h2>${ic('target')} Что повторить</h2></div>
    ${rows.map(r => `<div class="fz-rp"><span class="fz-tn">${r.tp.id}</span><div><b>${esc(r.tp.title)}</b><small>${r.wrong ? `ошибок: ${r.wrong}` : `решено ${r.ok} из ${r.n}`}${r.b >= 0 ? ` · лучший экзамен ${r.b}` : ''}</small></div>
      ${r.wrong ? `<button class="btn line" data-fz="selfw" data-v="${r.tp.id}">Ошибки</button>` : `<button class="btn line" data-fz="self" data-v="${r.tp.id}">Решать</button>`}<button class="tb-ic" data-d="note" data-v="t${r.tp.id}" title="Конспект">${ic('notebook-pen')}</button></div>`).join('')}</section>`;
}

/* ---------- физические постоянные ---------- */
const CONSTS = [['g', 'Ускорение свободного падения', '9,81 м/с²'], ['G', 'Гравитационная постоянная', '6,67·10⁻¹¹ Н·м²/кг²'], ['c', 'Скорость света в вакууме', '3,00·10⁸ м/с'],
  ['e', 'Элементарный заряд', '1,60·10⁻¹⁹ Кл'], ['mₑ', 'Масса электрона', '9,11·10⁻³¹ кг'], ['h', 'Постоянная Планка', '6,63·10⁻³⁴ Дж·с'], ['k', 'Постоянная Больцмана', '1,38·10⁻²³ Дж/К'],
  ['Nₐ', 'Постоянная Авогадро', '6,02·10²³ моль⁻¹'], ['R', 'Молярная газовая постоянная', '8,31 Дж/(моль·К)'], ['ε₀', 'Электрическая постоянная', '8,85·10⁻¹² Ф/м'], ['μ₀', 'Магнитная постоянная', '4π·10⁻⁷ Гн/м'], ['σ', 'Постоянная Стефана — Больцмана', '5,67·10⁻⁸ Вт/(м²·К⁴)']];
const cnHtml = () => `<section class="fz-tile fz-w"><div class="fz-wh"><h2>${ic('atom')} Физические постоянные</h2></div><div class="fz-cn">${CONSTS.map(([s, t, v]) => `<div><i>${s}</i><span>${t}</span><b>${v}</b></div>`).join('')}</div></section>`;

/* ---------- перевод единиц ---------- */
const UNITS = {
  'Давление': [['Па', 1], ['кПа', 1e3], ['МПа', 1e6], ['бар', 1e5], ['атм', 101325], ['мм рт. ст.', 133.322]],
  'Энергия': [['Дж', 1], ['кДж', 1e3], ['эВ', 1.602176634e-19], ['МэВ', 1.602176634e-13], ['кал', 4.1868], ['кВт·ч', 3.6e6]],
  'Длина': [['м', 1], ['км', 1e3], ['см', 1e-2], ['мм', 1e-3], ['мкм', 1e-6], ['нм', 1e-9], ['морская миля', 1852]],
  'Скорость': [['м/с', 1], ['км/ч', 1 / 3.6], ['узел', 1852 / 3600]],
  'Температура': [['°C', 'C'], ['K', 'K'], ['°F', 'F']],
  'Угол': [['градус', Math.PI / 180], ['радиан', 1]],
};
let UC = { cat: 'Давление', a: 4, b: 0, v: '1' };
function ucCalc() {
  const L = UNITS[UC.cat], v = parseFloat(String(UC.v).replace(',', '.')); if (!isFinite(v)) return '—';
  let r;
  if (UC.cat === 'Температура') { const k = { C: x => x + 273.15, K: x => x, F: x => (x - 32) * 5 / 9 + 273.15 }[L[UC.a][1]](v); r = { C: k - 273.15, K: k, F: (k - 273.15) * 9 / 5 + 32 }[L[UC.b][1]]; }
  else r = v * L[UC.a][1] / L[UC.b][1];
  const s = Math.abs(r) >= 1e6 || (Math.abs(r) < 1e-3 && r !== 0) ? r.toExponential(4).replace(/e([+-]\d+)/, (m, p) => '·10^' + (+p)) : String(+r.toPrecision(6));
  return s.replace('.', ',').replace(/\^(-?\d+)/, (m, p) => p.split('').map(ch => '⁰¹²³⁴⁵⁶⁷⁸⁹'['0123456789'.indexOf(ch)] || '⁻').join(''));
}
function ucHtml() {
  const L = UNITS[UC.cat], opt = sel => L.map(([n], i) => `<option value="${i}" ${i === sel ? 'selected' : ''}>${n}</option>`).join('');
  return `<section class="fz-tile fz-w fz-uc"><div class="fz-wh"><h2>${ic('arrow-right-left')} Перевод единиц</h2></div>
    <div class="fz-ucc">${Object.keys(UNITS).map(c => `<button class="${c === UC.cat ? 'on' : ''}" data-d="uc-cat" data-v="${c}">${c}</button>`).join('')}</div>
    <div class="fz-ucr"><input id="uc-v" value="${esc(UC.v)}" inputmode="decimal" autocomplete="off"><select id="uc-a">${opt(UC.a)}</select></div>
    <div class="fz-ucr"><output id="uc-r">${ucCalc()}</output><select id="uc-b">${opt(UC.b)}</select></div></section>`;
}
document.addEventListener('input', e => {
  const t = e.target; if (!t.id || !/^uc-/.test(t.id)) return;
  if (t.id === 'uc-v') UC.v = t.value; else UC[t.id === 'uc-a' ? 'a' : 'b'] = +t.value;
  const r = $('#uc-r'); if (r) r.textContent = ucCalc();
});

/* ---------- блоки главной ---------- */
function fzWidgets() {
  if (!BANK || !NOTES) { Promise.all([bankLoad(), notesLoad()]).then(() => { if (SCREEN === 'labs' && PAGE === 'main') render(); }); }
  const labs = labNums().map(n => { const S = labState(n, PROFILE.id), st = S && S.done ? 'done' : S && (S.max || 0) > 0 ? 'go' : '';
    return `<button class="fz-ml ${st}" data-d="lab" data-v="${n}" title="${esc(labTitle(n))}"><img src="${cover(n)}" alt=""><span><b>ЛР ${n}</b><small>${st === 'done' ? 'защищена' : st === 'go' ? 'в работе' : 'не начата'}</small></span></button>`; }).join('');
  return `<p class="fz-h">Лабораторные работы</p><div class="fz-mlabs">${labs}</div>
    <div class="fz-widgets two">${wqHtml()}${rpHtml()}</div>`;
}

/* ---------- результаты: лучший балл по темам ---------- */
function resChart() {
  if (!BANK) return '';
  const ex = tsLoad().att.filter(a => a.kind === 'exam'); if (!ex.length) return '';
  const best = t => ex.filter(a => a.topic === t).reduce((m, a) => (!m || a.score > m.score ? a : m), null);
  const fin = best('final'), n = new Set(ex.map(a => a.topic)).size, avg = Math.round(ex.reduce((s, a) => s + a.score, 0) / ex.length);
  const bars = BANK.topics.map(tp => { const b = best(tp.id);
    return `<div class="fz-cb" title="${esc(topicName(tp.id))}: ${b ? `лучший балл ${b.score}, оценка «${b.grade}»` : 'экзамен не сдавался'}"><span class="fz-cbl">${tp.id}. ${esc(tp.title)}</span><span class="fz-cbt">${b ? `<i style="width:${Math.max(b.score, 1)}%"></i>` : ''}<s style="left:60%"></s></span><b>${b ? b.score : '—'}</b>${b ? `<span class="fz-best g${b.grade}">«${b.grade}»</span>` : '<span></span>'}</div>`; }).join('');
  return `<div class="fz-rsum"><div class="fz-pst">${ic('graduation-cap')}<b>${ex.length}</b><span>экзаменов сдано</span></div><div class="fz-pst">${ic('layers')}<b>${n}<small> / 10</small></b><span>тем с экзаменом (с итоговым)</span></div>
    <div class="fz-pst">${ic('award')}<b>${avg}</b><span>средний балл</span></div><div class="fz-pst">${ic('trophy')}<b>${fin ? fin.score : '—'}</b><span>${fin ? `итоговый экзамен, «${fin.grade}»` : 'итоговый экзамен не сдавался'}</span></div></div>
    <section class="fz-tile fz-chart"><h2>${ic('chart-column')} Лучший балл экзамена по темам</h2><p>Шкала от 0 до 100. Вертикальная черта показывает порог оценки «3» (60 баллов).</p>${bars}</section>`;
}

document.addEventListener('click', e => {
  const b = e.target.closest && e.target.closest('[data-d]'); if (!b || !PROFILE || SCREEN !== 'labs') return; const d = b.dataset;
  switch (d.d) {
    case 'search': srOpen(); break;
    case 'wq': wqAnswer(+d.v); break;
    case 'wq-next': WQ_OFF++; WQ_PICK = null; render(); break;
    case 'fd': openNote(d.v, d.s); break;
    case 'uc-cat': UC = { cat: d.v, a: d.v === 'Давление' ? 4 : 1, b: 0, v: UC.v }; render(); break;
  }
});

/* ---------- справочник: то, что нужно при обработке результатов ---------- */
const REF = [
  ['Плотность веществ', 'кг/м³', [['Вода', '1000'], ['Лёд', '900'], ['Алюминий', '2700'], ['Сталь, железо', '7800'], ['Медь', '8900'], ['Свинец', '11 300'], ['Ртуть', '13 600'], ['Стекло', '2500'], ['Воздух (0 °C)', '1,29']]],
  ['Удельное сопротивление при 20 °C', 'Ом·мм²/м', [['Медь', '0,017'], ['Алюминий', '0,028'], ['Никелин', '0,40'], ['Манганин', '0,43'], ['Константан', '0,50'], ['Нихром', '1,10'], ['Фехраль', '1,30']], '1 Ом·мм²/м = 10⁻⁶ Ом·м. Значения те же, что в ЛР 5.'],
  ['Удельная теплоёмкость', 'Дж/(кг·К)', [['Вода', '4200'], ['Лёд', '2100'], ['Алюминий', '920'], ['Сталь', '460'], ['Медь', '380'], ['Свинец', '130'], ['Воздух (p = const)', '1005']]],
  ['Показатель преломления', '', [['Воздух', '1,0003'], ['Лёд', '1,31'], ['Вода', '1,33'], ['Спирт этиловый', '1,36'], ['Глицерин', '1,47'], ['Стекло', '1,5'], ['Кварц', '1,54'], ['Алмаз', '2,42']]],
];
const PREF = [['гига', 'Г', '10⁹'], ['мега', 'М', '10⁶'], ['кило', 'к', '10³'], ['санти', 'с', '10⁻²'], ['милли', 'м', '10⁻³'], ['микро', 'мк', '10⁻⁶'], ['нано', 'н', '10⁻⁹'], ['пико', 'п', '10⁻¹²']];
const GREEK = 'α альфа,β бета,γ гамма,δ дельта,ε эпсилон,ζ дзета,η эта,θ тета,κ каппа,λ лямбда,μ мю,ν ню,π пи,ρ ро,σ сигма,τ тау,φ фи,χ хи,ψ пси,ω омега,Δ дельта,Σ сигма,Φ фи,Ω омега'.split(',');
function pgRef() {
  const tbl = ([t, u, rows, note]) => `<section class="fz-tile fz-w"><div class="fz-wh"><h2>${ic('layers')} ${t}</h2>${u ? `<span class="fz-wtag">${u}</span>` : ''}</div>
    <div class="fz-rt">${rows.map(([a, b]) => `<div><span>${a}</span><b>${b}</b></div>`).join('')}</div>${note ? `<p class="fz-rn">${note}</p>` : ''}</section>`;
  return pgHead('Справочник', 'Постоянные, перевод единиц и табличные значения для обработки результатов.') +
    (() => {
      const pref = `<section class="fz-tile fz-w"><div class="fz-wh"><h2>${ic('sigma')} Приставки СИ</h2></div><div class="fz-rt">${PREF.map(([a, b, c]) => `<div><span>${a} (${b})</span><b>${c}</b></div>`).join('')}</div></section>`;
      const greek = `<section class="fz-tile fz-w"><div class="fz-wh"><h2>${ic('sigma')} Греческие буквы</h2></div><div class="fz-greek">${GREEK.map(g => { const [l, n] = g.split(' '); return `<div><i>${l}</i><span>${n}</span></div>`; }).join('')}</div></section>`;
      const [dens, rho, heat, refr] = REF.map(tbl);
      // три колонки одной высоты: последний блок колонки растягивается до низа
      return `<div class="fz-refg">${[[ucHtml(), cnHtml(), refr], [dens, rho, pref], [heat, greek]].map(c => `<div class="fz-refc">${c.join('')}</div>`).join('')}</div>`;
    })();
}
