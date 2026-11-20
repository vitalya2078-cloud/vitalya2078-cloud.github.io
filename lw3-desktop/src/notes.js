/* =====================================================================
   «Физпрактикум» для Windows: конспекты.
   Тексты — lw3-desktop/notes/*.md, при сборке превращаются в notes/notes.json (notes_md.py).
   Формулы рисует KaTeX (katex/, загружается при первом открытии конспекта).
   К теме курса — видеоурок video/t<n>.mp4 (если он есть в сборке).
   ===================================================================== */
let NOTES = null, NOTE = '', NOTE_SEC = '', KATEX = null;
async function notesLoad() {
  if (NOTES) return NOTES;
  try { const r = await fetch('notes/notes.json'); NOTES = await r.json(); } catch (e) { NOTES = { notes: [], err: true }; }
  NOTES.byId = {}; NOTES.notes.forEach(x => { NOTES.byId[x.id] = x; });
  return NOTES;
}
function katexLoad() {
  if (KATEX) return KATEX;
  KATEX = new Promise(res => {
    const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = 'katex/katex.min.css'; document.head.appendChild(l);
    const s = document.createElement('script'); s.src = 'katex/katex.min.js'; s.onload = () => res(window.katex || null); s.onerror = () => res(null); document.head.appendChild(s);
  });
  return KATEX;
}
/* \\htmlClass — цвета в формулах (вычисляемая величина, постоянные); \\cst{...} — постоянная */
const KX_OPT = d => ({ displayMode: d, throwOnError: false, strict: false, output: 'html', trust: c => c.command === '\\htmlClass', macros: { '\\cst': '\\htmlClass{fc}{#1}' } });
async function texRender(root) {
  if (!root || !root.querySelector('.tx:not(.ok)')) return;
  const k = await katexLoad(); if (!k) return;
  root.querySelectorAll('.tx:not(.ok)').forEach(e => {
    try { k.render(e.dataset.t, e, KX_OPT(e.classList.contains('d'))); e.classList.add('ok'); } catch (x) {}
  });
}
const nReadKey = () => 'fz-nread-' + (PROFILE ? PROFILE.id : '');
const nRead = () => store.get(nReadKey(), {});
const nMark = id => { if (!PROFILE) return; const R = nRead(); R[id] = Date.now(); store.set(nReadKey(), R); };
const nMin = x => Math.max(3, Math.round(x.words / 140));
const nKind = x => (x.kind === 'topic' ? `Тема ${x.n}` : `Лабораторная работа № ${x.n}`);

function pgNotes() {
  if (!NOTES) { notesLoad().then(() => { if (SCREEN === 'labs' && PAGE === 'notes') render(); }); return pgHead('Конспекты') + '<p class="mute">Загрузка…</p>'; }
  const x = NOTE && NOTES.byId[NOTE];
  if (x) return noteView(x);
  const R = nRead(), list = k => NOTES.notes.filter(x => x.kind === k);
  const card = x => `<button class="fz-ncard ${x.kind}" data-d="note" data-v="${x.id}">
      ${x.kind === 'lab' ? `<img src="${cover(x.n)}" alt="">` : `<span class="fz-tn">${x.n}</span>`}
      <span class="fz-nct"><small>${nKind(x)}</small><b>${esc(x.title)}</b>
      <span class="fz-ntags"><i>${ic('clock')} ${nMin(x)} мин</i>${x.video ? `<i>${ic('video')} Видеоурок</i>` : ''}${R[x.id] ? `<i class="ok">${ic('check')} Прочитано</i>` : ''}</span></span></button>`;
  if (!NOTES.notes.length) return pgHead('Конспекты') + '<p class="mute">Конспекты не найдены.</p>';
  return pgHead('Конспекты', 'Теория по темам курса физики и по лабораторным работам: определения, законы и формулы. К каждой теме — видеоурок.') +
    `<p class="fz-h">Темы курса</p><div class="fz-ngrid">${list('topic').map(card).join('')}</div>
     <p class="fz-h">Лабораторные работы</p><div class="fz-ngrid">${list('lab').map(card).join('')}</div>`;
}
function noteView(x) {
  const all = NOTES.notes, i = all.indexOf(x), prev = all[i - 1], next = all[i + 1];
  const acts = x.kind === 'topic'
    ? `<button class="btn line" data-fz="self" data-v="${x.n}">${ic('book-open')} Самопроверка по теме</button><button class="btn line" data-fz="exam" data-v="${x.n}">${ic('timer')} Экзамен по теме</button>`
    : `<button class="btn line" data-d="lab" data-v="${x.n}">${ic('flask-conical')} Открыть работу</button>`;
  const toc = x.secs.map(s => `<button class="fz-tl l${s.l}" data-d="ntoc" data-v="${s.id}">${esc(s.h)}</button>`).join('');
  return `<div class="fz-nview"><div class="fz-nmain">
      <button class="btn ghost fz-nback" data-d="notes">${ic('chevron-left')} Все конспекты</button>
      <div class="fz-nhead"><span class="fz-n">${nKind(x)}</span><h1>${esc(x.title)}</h1><div class="row">${acts}<span class="mute small">${ic('clock')} ${nMin(x)} мин чтения</span></div></div>
      ${x.video ? `<div class="fz-video"><video controls preload="metadata" poster="video/${x.id}.jpg" src="video/${x.id}.mp4"></video><p class="mute small">${ic('video')} Видеоурок по теме. Конкретные ответы на вопросы тестов в нём не разбираются — только теория.</p></div>` : ''}
      <div class="fz-legend"><span class="tm">термин</span><span class="lw">закон, правило</span><span class="un">единица измерения</span><span class="wv">главная мысль</span><span class="fq">искомая величина</span><span class="fc">постоянная</span></div>
      <article class="fz-note">${x.html}</article>
      <div class="fz-nnav">${prev ? `<button class="fz-link" data-d="note" data-v="${prev.id}">${ic('chevron-left')}<span><small>${nKind(prev)}</small><b>${esc(prev.title)}</b></span></button>` : '<span></span>'}
        ${next ? `<button class="fz-link nx" data-d="note" data-v="${next.id}"><span><small>${nKind(next)}</small><b>${esc(next.title)}</b></span>${ic('chevron-right')}</button>` : '<span></span>'}</div>
    </div><aside class="fz-ntoc"><b>Содержание</b>${toc}${(x.cheat || []).length ? `<b class="fz-csh">Шпаргалка</b>${x.cheat.map(c => `<button class="fz-cs" data-d="ntoc" data-v="${c.s}" title="${esc(c.h)}"><span class="tx" data-t="${esc(c.t)}"></span><small>${esc(c.h)}</small></button>`).join('')}` : ''}</aside></div>`;
}
function noteScroll(id) { const el = document.getElementById(id); if (el) el.scrollIntoView({ block: 'start', behavior: 'smooth' }); }
/* после отрисовки раздела: формулы и переход к нужному разделу */
function fzAfter() {
  if (PAGE === 'main') texRender($('.fz-fd'));
  if (PAGE !== 'notes' || !NOTE) return;
  const root = $('.fz-nview'); texRender(root);
  if (NOTE_SEC) { const s = NOTE_SEC; NOTE_SEC = ''; setTimeout(() => { const el = document.getElementById(s); if (el) { el.scrollIntoView({ block: 'start' }); el.classList.add('fz-hl'); setTimeout(() => el.classList.remove('fz-hl'), 2200); } }, 30); }
}
function openNote(id, sec = '') { PAGE = 'notes'; NOTE = id; NOTE_SEC = sec; SCREEN = 'labs'; nMark(id); notesLoad().then(() => { render(); if (!sec) ui.main.scrollTop = 0; }); }
document.addEventListener('click', e => {
  const b = e.target.closest && e.target.closest('[data-d]'); if (!b || !PROFILE || SCREEN !== 'labs') return; const d = b.dataset;
  switch (d.d) {
    case 'notes': PAGE = 'notes'; NOTE = ''; render(); ui.main.scrollTop = 0; break;
    case 'note': openNote(d.v); break;
    case 'ntoc': noteScroll(d.v); break;
  }
});
notesLoad();
