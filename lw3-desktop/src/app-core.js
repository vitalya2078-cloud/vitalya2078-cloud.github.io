/* =====================================================================
   «Физпрактикум»: общее ядро программы для компьютера, Android и iPhone.
   Учётные записи (ФИО, класс, пароль — хранится только хеш с солью, данные только на устройстве),
   тесты по банку вопросов (bank/bank.json: 9 тем × 100 вопросов) — самопроверка, экзамен по теме,
   итоговый экзамен; раздел «О программе». Экраны строит оболочка (desktop.js / mobile.js) из этих блоков.
   Действия — data-fz. Ждёт от оболочки: store, profiles, PKEY, workKey, PROFILE, render, toast, ic, esc,
   SCREEN, sha256/hmac256 (sha256.js), SIG_KEY/RESULT_FORMAT (result.js), fzModal(title, html) — окно оболочки.
   ===================================================================== */
const APP_NAME = 'Физпрактикум';
const ORG = { copy: '© 2026 ЧВВМУ им. П.С. Нахимова, кафедра физики и общетехнических дисциплин, к.т.н., доцент Жидкова Е.Ю.',
  school: 'Черноморское высшее военно-морское училище имени П.С. Нахимова', dept: 'Кафедра физики и общетехнических дисциплин',
  devs: ['гв. ст. м-с Кравченко В.А.', 'ст. м-с Соколов В.В.', 'ефр. Шевченко А.В.'], devsNote: 'курсанты 103 класса 1 факультета' };

/* ---------- учётные записи ---------- */
const pwHash = (salt, pw) => { let h = sha256(salt + '|' + pw); for (let i = 0; i < 1200; i++) h = sha256(h + salt); return h; };
const acctHasPw = p => !!(p && p.hash);
function acctSetPw(id, pw) {
  const list = profiles(), p = list.find(x => x.id === id); if (!p) return null;
  p.salt = Math.random().toString(36).slice(2) + Date.now().toString(36); p.hash = pwHash(p.salt, pw); delete p.pwReset;
  store.set(PKEY, list); return p;
}
const acctCheck = (p, pw) => !!p && acctHasPw(p) && pwHash(p.salt, pw) === p.hash;
function acctResetPw(id) { const list = profiles(), p = list.find(x => x.id === id); if (!p) return; delete p.hash; delete p.salt; p.pwReset = new Date().toISOString(); store.set(PKEY, list); }
function acctValidate(fio, group, pw, pw2) {
  if (fio.trim().split(/\s+/).length < 2 || fio.trim().length < 5) return 'Впиши фамилию и инициалы или ФИО полностью, например: Иванов И. И.';
  if (!group.trim()) return 'Укажи класс (учебную группу).';
  if (pw.length < 4) return 'Пароль — не короче 4 символов.';
  if (pw !== pw2) return 'Пароли не совпадают.';
  if (profiles().some(x => x.fio.toLowerCase() === fio.trim().toLowerCase() && (x.group || '').toLowerCase() === group.trim().toLowerCase())) return 'Такой курсант уже зарегистрирован на этом устройстве — войди в свою учётную запись.';
  return '';
}

/* ---------- обложки и разделы лабораторных ---------- */
const LAB_SEC = { 1: 'Механика', 2: 'Механика', 3: 'Термодинамика', 4: 'Электричество', 5: 'Электричество', 6: 'Магнетизм', 7: 'Магнетизм', 8: 'Магнетизм', 9: 'Ядерная физика', 10: 'Ядерная физика', 11: 'Ядерная физика', 12: 'Ядерная физика', 13: 'Ядерная физика', 14: 'Ядерная физика' };
const cover = n => `img/covers/c${n}.webp`;
function labCards(attr) {
  return `<div class="fz-grid">${labNums().map(n => {
    const L = LABS[n], S = PROFILE ? labState(n, PROFILE.id) : null, N = L.steps.length, at = S ? Math.min((S.max || 0) + (S.done ? 1 : 0), N) : 0;
    let res = ''; if (S && S.done) { try { res = withLabState(n, S, () => L.result()); } catch (e) { res = ''; } }
    const st = !S || !(S.max || S.done) ? 'Не начата' : S.done ? 'Защищена' : `Шаг ${(S.max || 0) + 1} из ${N}: ${L.steps[Math.min(S.max || 0, N - 1)][1].toLowerCase()}`;
    return `<button class="fz-card ${S && S.done ? 'done' : ''}" ${attr}="lab" data-v="${n}">
      <span class="fz-cov"><img src="${cover(n)}" alt="" loading="lazy" onerror="this.parentNode.classList.add('nocov')"><span class="fz-sec">${LAB_SEC[n]}</span>${S && S.done ? `<span class="fz-ok">${ic('circle-check')}</span>` : ''}</span>
      <span class="fz-body"><span class="fz-n"><span class="fz-long">Лабораторная работа</span><span class="fz-short">ЛР</span> № ${n}</span><b>${esc(labTitle(n))}</b>
      <span class="fz-st">${esc(st)}</span>${res ? `<span class="fz-res">${esc(res)}</span>` : ''}
      <span class="fz-bar"><i style="width:${Math.round(at / N * 100)}%"></i></span></span></button>`; }).join('')}</div>`;
}

/* ---------- банк вопросов ---------- */
let BANK = null, BANK_ERR = '';
async function bankLoad() {
  if (BANK) return BANK;
  try { const r = await fetch('bank/bank.json'); BANK = await r.json(); BANK.byId = {}; BANK.q.forEach(q => { BANK.byId[q.id] = q; }); }
  catch (e) { BANK_ERR = 'Не удалось загрузить банк вопросов.'; }
  return BANK;
}
const bankTopic = t => BANK ? BANK.q.filter(q => q.id.split('.')[0] === String(t) && !q.broken) : [];
const TOPIC_SHORT = { 1: 'Механика', 2: 'Электростатика и постоянный ток', 3: 'Электромагнетизм', 4: 'Молекулярная физика и термодинамика', 5: 'Колебания и волны', 6: 'Волновая оптика', 7: 'Квантовая физика', 8: 'Физика твёрдого тела', 9: 'Атомное ядро и элементарные частицы' };
const EXAM_N = 30;
const examGrade = s => (s >= 90 ? 5 : s >= 75 ? 4 : s >= 60 ? 3 : 2);
const GRADE_T = { 5: 'отлично', 4: 'хорошо', 3: 'удовлетворительно', 2: 'неудовлетворительно' };
const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const testKey = id => workKey(id) + '-t';
const tsLoad = () => (PROFILE ? store.get(testKey(PROFILE.id), null) : null) || { self: {}, att: [] };
const tsSave = T => { if (PROFILE) store.set(testKey(PROFILE.id), T); };
/* идущий экзамен сохраняется после каждого ответа: закрыть программу и начать заново, чтобы «переиграть», нельзя */
const runKey = () => testKey(PROFILE.id) + '-run';
const tRunSave = () => { if (PROFILE && TQ && TQ.kind === 'exam' && !TQ.done) store.set(runKey(), TQ); };
function tRecover() {   // при входе: незавершённый экзамен засчитывается с теми ответами, что были даны
  if (!PROFILE) return; const R = store.get(runKey(), null); if (!R || R.kind !== 'exam') return;
  store.del(runKey()); TQ = R; tFinish(true); TQ = null;
  toast('Предыдущий экзамен не был завершён — он засчитан с данными ответами.', 'bad');
}

/* ---------- сеанс теста: самопроверка или экзамен ---------- */
let TQ = null;          // { kind: 'self'|'exam', topic: 1..9|'final', ids: [...], i, opts: {id: [...]}, ans: {id: {v, ok, t}}, start, qStart, deadline }
function tStart(kind, topic, onlyWrong) {
  if (!BANK) return toast('Банк вопросов ещё загружается — попробуй через секунду.', 'bad');
  const T = tsLoad(); let ids;
  if (kind === 'exam' && topic === 'final') {
    const per = [1, 2, 3, 4, 5, 6, 7, 8, 9].map(t => shuffle(bankTopic(t)).map(q => q.id));
    ids = per.flatMap(l => l.slice(0, 3)); const extra = shuffle(per.flatMap(l => l.slice(3))).slice(0, EXAM_N - ids.length); ids = shuffle(ids.concat(extra));
  } else if (kind === 'exam') ids = shuffle(bankTopic(topic).map(q => q.id)).slice(0, EXAM_N);
  else { let pool = bankTopic(topic).map(q => q.id); if (onlyWrong) pool = pool.filter(id => T.self[id] === 0); if (!pool.length) return toast(onlyWrong ? 'Ошибок по этой теме нет — всё решено верно.' : 'В теме нет вопросов.', onlyWrong ? '' : 'bad');
    const fresh = pool.filter(id => T.self[id] == null), rest = pool.filter(id => T.self[id] != null); ids = shuffle(fresh).concat(shuffle(rest)); }
  const opts = {}; ids.forEach(id => { const q = BANK.byId[id]; opts[id] = /^Вариант \d$/.test(q.a) ? [q.a, ...q.x].sort() : shuffle([q.a, ...q.x]); });
  TQ = { kind, topic, onlyWrong: !!onlyWrong, ids, i: 0, opts, ans: {}, start: Date.now(), qStart: Date.now() };
  if (kind === 'exam') TQ.deadline = Date.now() + BANK.byId[ids[0]].time * 60000;
  tRunSave(); SCREEN = 'test'; render(); tTimer();
}
const tCur = () => TQ && BANK.byId[TQ.ids[TQ.i]];
function tAnswer(v) {
  const q = tCur(); if (!q || TQ.ans[q.id]) return;
  const ok = v === q.a; TQ.ans[q.id] = { v, ok, t: Math.round((Date.now() - TQ.qStart) / 1000) };
  if (TQ.kind === 'self') { const T = tsLoad(); T.self[q.id] = ok ? 1 : 0; tsSave(T); render(); }
  else tNext();
}
function tNext() {
  if (!TQ) return;
  if (TQ.i >= TQ.ids.length - 1) return tFinish();
  TQ.i++; TQ.qStart = Date.now(); if (TQ.kind === 'exam') TQ.deadline = Date.now() + tCur().time * 60000;
  tRunSave(); render(); tTimer();
}
function tFinish(aborted) {
  clearInterval(tTimer.h); if (!TQ) return; if (PROFILE) store.del(runKey());
  if (TQ.kind === 'exam') {
    const n = TQ.ids.length, right = TQ.ids.filter(id => TQ.ans[id] && TQ.ans[id].ok).length, score = Math.round(right / n * 100);
    const T0 = tsLoad(), no = T0.att.filter(a => a.topic === TQ.topic).length + 1;
    const att = { id: Date.now().toString(36), kind: 'exam', topic: TQ.topic, no, aborted: !!aborted, date: new Date().toISOString(), n, right, score, grade: examGrade(score), spent: Math.round((Date.now() - TQ.start) / 1000),
      items: TQ.ids.map(id => ({ id, v: TQ.ans[id] ? TQ.ans[id].v : null, ok: !!(TQ.ans[id] && TQ.ans[id].ok), t: TQ.ans[id] ? TQ.ans[id].t : null })) };
    const T = tsLoad(); T.att.unshift(att); tsSave(T); TQ.result = att;
  } else TQ.result = { kind: 'self' };
  TQ.done = true; if (!aborted) render();
}
function tTimer() {
  clearInterval(tTimer.h); if (!TQ || TQ.kind !== 'exam' || TQ.done) return;
  const tick = () => { if (!TQ || TQ.done || SCREEN !== 'test') return clearInterval(tTimer.h);
    const left = Math.max(0, TQ.deadline - Date.now()), q = tCur(), all = q.time * 60000, el = document.getElementById('fz-timer'), bar = document.getElementById('fz-tbar');
    if (el) el.textContent = `${Math.floor(left / 60000)}:${String(Math.floor(left / 1000) % 60).padStart(2, '0')}`;
    if (bar) { bar.style.width = (left / all * 100) + '%'; bar.parentNode.classList.toggle('low', left < 20000); }
    if (left <= 0) { TQ.ans[q.id] = { v: null, ok: false, t: q.time * 60, late: true }; toast('Время на вопрос вышло — ответ не засчитан.', 'bad'); tNext(); } };
  tick(); tTimer.h = setInterval(tick, 250);
}
const topicName = t => (t === 'final' ? 'Итоговый экзамен (все темы)' : `Тема ${t}. ${BANK ? BANK.topics[t - 1].title : TOPIC_SHORT[t]}`);

/* ---------- экраны тестов (общие блоки) ---------- */
function testsHome() {
  if (!BANK) { bankLoad().then(() => { if (SCREEN === 'labs' && (typeof PAGE === 'undefined' || PAGE === 'tests')) render(); }); return `<p class="mute">${BANK_ERR || 'Загрузка банка вопросов…'}</p>`; }
  const T = tsLoad(), best = t => T.att.filter(a => a.topic === t).reduce((m, a) => (m && m.score >= a.score ? m : a), null);
  const fin = best('final');
  const head = `<section class="fz-final"><div><span class="fz-n">Итоговый экзамен</span><b>Все 9 тем · ${EXAM_N} вопросов</b><p>По 3 вопроса из каждой темы и ещё 3 случайных. На каждый вопрос — своё время (до 5 минут); если не успел, вопрос не засчитывается. Оценка по 100-балльной шкале.</p>
      ${fin ? `<span class="fz-best g${fin.grade}">Лучший результат: ${fin.score} баллов — «${fin.grade}»</span>` : ''}</div>
    <button class="btn big" data-fz="exam" data-v="final">${ic('graduation-cap')} Начать итоговый экзамен</button></section>`;
  const rows = BANK.topics.map(tp => { const t = tp.id, q = bankTopic(t), solved = q.filter(x => T.self[x.id] === 1).length, wrong = q.filter(x => T.self[x.id] === 0).length, b = best(t);
    return `<div class="fz-topic"><span class="fz-tn">${t}</span><div class="fz-tt"><b>${esc(tp.title)}</b><small>${q.length} вопросов · решено верно ${solved}${wrong ? ` · ошибок ${wrong}` : ''}</small>
        <span class="fz-bar"><i style="width:${Math.round(solved / Math.max(1, q.length) * 100)}%"></i></span></div>
      ${b ? `<span class="fz-best g${b.grade}" title="Лучший экзамен">${b.score} · «${b.grade}»</span>` : '<span class="fz-best none">экзамен не сдавался</span>'}
      <div class="fz-tb"><button class="btn line" data-fz="self" data-v="${t}">${ic('book-open')} Самопроверка</button>${wrong ? `<button class="btn ghost" data-fz="selfw" data-v="${t}">${ic('rotate-ccw')} Ошибки (${wrong})</button>` : ''}<button class="btn" data-fz="exam" data-v="${t}">${ic('timer')} Экзамен</button></div></div>`; }).join('');
  return head + `<p class="fz-h">Темы курса</p><div class="fz-topics">${rows}</div>
    <p class="mute small">Экзамен по теме — ${EXAM_N} вопросов из банка темы (100–160), при каждом запуске разные. Шкала: до 60 баллов — «2», 60–74 — «3», 75–89 — «4», 90–100 — «5». Самопроверка — без ограничения времени, с разбором каждого ответа.</p>`;
}
function qHtml(q) {
  return `<div class="fz-q">${esc(q.t).replace(/\n/g, '<br>')}</div>${q.p.map(p => `<div class="fz-qimg"><img src="bank/img/${encodeURIComponent(p)}" alt="Рисунок к вопросу"></div>`).join('')}`;
}
function explainHtml(q) {
  const e = q.e; let body = '';
  if (e && typeof e === 'object') body = [['s', 'Условие'], ['i', 'Идея'], ['r', 'Решение']].filter(([k]) => e[k]).map(([k, t]) => `<p><b>${t}.</b> ${esc(e[k]).replace(/\n/g, '<br>')}</p>`).join('');
  else if (typeof e === 'string') body = `<p>${esc(e)}</p>`;
  const disp = 'disp' in q ? `<p class="fz-disp">${ic('circle-x')} На экзамене засчитывается ответ из ключа${q.disp ? `. Строго по физике: ${esc(q.disp)}` : ''}.</p>` : '';
  return body || disp ? `<div class="fz-expl">${body}${disp}</div>` : '';
}
function testScreen() {
  if (!TQ) return '';
  if (TQ.done) return testResult();
  const q = tCur(), a = TQ.ans[q.id], n = TQ.ids.length, self = TQ.kind === 'self';
  const opts = TQ.opts[q.id].map((o, j) => { const cls = a ? (o === q.a ? 'ok' : o === a.v ? 'bad' : 'dim') : '';
    return `<button class="fz-opt ${cls}" data-fz="ans" data-v="${esc(o)}" ${a ? 'disabled' : ''}><span class="lt">${j + 1}</span><span>${esc(o)}</span></button>`; }).join('');
  const solved = self ? Object.values(TQ.ans).filter(x => x.ok).length : 0;
  const top = `<div class="fz-thead"><button class="btn ghost fz-quit" data-fz="quit">${ic('chevron-left')} ${self ? 'Завершить' : 'Прервать'}</button>
      <div class="fz-ttl"><b>${self ? 'Самопроверка' : 'Экзамен'}</b><small>${esc(topicName(TQ.topic))}${TQ.onlyWrong ? ' · работа над ошибками' : ''}</small></div>
      <span class="fz-cnt">Вопрос ${TQ.i + 1} из ${n}${self ? ` · верно ${solved}` : ''}</span></div>
    <div class="fz-prog"><i style="width:${Math.round(TQ.i / n * 100)}%"></i></div>`;
  const timer = self ? '' : `<div class="fz-timerbox"><span>${ic('timer')} На этот вопрос: <b id="fz-timer">${q.time}:00</b> из ${q.time} мин</span><span class="fz-tb2"><i id="fz-tbar"></i></span></div>`;
  const after = self && a ? `<div class="fz-verdict ${a.ok ? 'ok' : 'bad'}">${a.ok ? `${ic('circle-check')} Верно` : `${ic('circle-x')} Неверно. Правильный ответ: <b>${esc(q.a)}</b>`}</div>${explainHtml(q)}
      <button class="btn big fz-next" data-fz="next" data-primary>${TQ.i >= n - 1 ? 'Завершить' : 'Следующий вопрос'} ${ic('chevron-right')}</button>` : '';
  return top + `<div class="fz-qwrap">${timer}<div class="fz-qcard"><span class="fz-qid">№ ${q.id}</span>${qHtml(q)}<div class="fz-opts">${opts}</div>${after}</div>
    ${self ? '' : '<p class="mute small center">Ответ засчитывается сразу после выбора варианта. Вернуться к предыдущему вопросу нельзя.</p>'}</div>`;
}
function testResult() {
  const r = TQ.result;
  if (r.kind === 'self') { const n = Object.keys(TQ.ans).length, ok = Object.values(TQ.ans).filter(x => x.ok).length;
    return `<div class="fz-qwrap"><div class="fz-qcard fz-res"><span class="fz-big">${ok} / ${n}</span><h2>Самопроверка завершена</h2><p class="mute">${esc(topicName(TQ.topic))}. Верно ${ok} из ${n} отвеченных. Неверно решённые вопросы можно повторить в режиме «Ошибки».</p>
      <div class="row center"><button class="btn" data-fz="back">${ic('chevron-left')} К тестам</button></div></div></div>`; }
  const wrong = r.items.filter(x => !x.ok);
  return `<div class="fz-qwrap"><div class="fz-qcard fz-res"><span class="fz-big g${r.grade}">${r.score}</span><h2>Оценка «${r.grade}» — ${GRADE_T[r.grade]}</h2>
      <p class="mute">${esc(topicName(r.topic))}, попытка ${r.no || 1}${r.aborted ? ' (прервана)' : ''}. Верно ${r.right} из ${r.n}. Время — ${Math.floor(r.spent / 60)} мин ${r.spent % 60} с.</p>
      <div class="row center"><button class="btn" data-fz="examfile" data-v="${r.id}">${ic('graduation-cap')} Файл результата для преподавателя</button><button class="btn line" data-fz="back">${ic('chevron-left')} К тестам</button></div></div>
    ${wrong.length ? `<p class="fz-h">Разбор ошибок (${wrong.length})</p>${wrong.map(x => { const q = BANK.byId[x.id]; return `<div class="fz-qcard fz-rev"><span class="fz-qid">№ ${q.id}</span>${qHtml(q)}
      <p class="fz-verdict bad">${x.v == null ? 'Нет ответа (время вышло)' : `Твой ответ: ${esc(x.v)}`}</p><p class="fz-verdict ok">Правильный ответ: <b>${esc(q.a)}</b></p>${explainHtml(q)}</div>`; }).join('')}` : ''}</div>`;
}
function resultsHtml(attr) {
  const T = tsLoad(), labs = labNums().map(n => { const S = labState(n, PROFILE.id); let res = ''; if (S && S.done) { try { res = withLabState(n, S, () => LABS[n].result()); } catch (e) {} }
    return `<tr><td>ЛР ${n}</td><td>${esc(labTitle(n))}</td><td>${S ? esc(labStatus(n, S)) : 'не начата'}</td><td>${esc(res)}</td><td>${S && (S.max || S.done) ? `<button class="btn ghost" ${attr}="lab" data-v="${n}">Открыть</button>` : ''}</td></tr>`; }).join('');
  const ex = T.att.filter(a => a.kind === 'exam');
  return `<p class="fz-h">Лабораторные работы</p><div class="fz-tbl"><table><tr><th>№</th><th>Работа</th><th>Состояние</th><th>Результат</th><th></th></tr>${labs}</table></div>
    <p class="fz-h">Экзамены</p>${ex.length ? `<div class="fz-tbl"><table><tr><th>Дата</th><th>Экзамен</th><th>Верно</th><th>Баллы</th><th>Оценка</th><th></th></tr>${ex.map(a => `<tr><td>${new Date(a.date).toLocaleString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</td><td>${esc(topicName(a.topic))}</td><td>${a.right} из ${a.n}</td><td><b>${a.score}</b></td><td><span class="fz-best g${a.grade}">«${a.grade}»</span></td><td><button class="btn ghost" data-fz="examfile" data-v="${a.id}">${ic('file-text')} Файл</button></td></tr>`).join('')}</table></div>` : '<p class="mute">Экзамены ещё не сдавались.</p>'}`;
}

/* ---------- файл результата экзамена (тот же формат и подпись, что у лабораторных) ---------- */
function packExam(att) {
  const body = { format: RESULT_FORMAT, v: 1, kind: 'exam', lab: 'exam', app: APP_VER, saved: new Date().toISOString(), student: { fio: PROFILE.fio, group: PROFILE.group || '' },
    state: { v: 1, fio: PROFILE.fio, group: PROFILE.group || '', exam: att }, summary: { score: att.score, grade: att.grade, right: att.right, n: att.n } };
  return JSON.stringify(Object.assign({}, body, { sig: hmac256(SIG_KEY, JSON.stringify(body)) }));
}
const examFileName = att => `Экзамен_${att.topic === 'final' ? 'итоговый' : 'тема' + att.topic}_${safeName(PROFILE.fio) || 'курсант'}${PROFILE.group ? '_' + safeName(PROFILE.group) : ''}.lw3`;

/* ---------- О программе ---------- */
function aboutHtml(attr) {
  return `<div class="fz-about">
    <div class="fz-ab-head"><span class="logo big">γ</span><div><h1>${APP_NAME}</h1><p>Виртуальный лабораторный практикум по физике</p><span class="fz-ver">Версия ${esc(APP_VER)}</span></div></div>
    <section class="fz-ab-card"><p class="fz-ab-org">${esc(ORG.school)}</p><p class="fz-ab-dept">${esc(ORG.dept)}</p>
      <p>В «Физпрактикуме» курсанты выполняют лабораторные работы по физике в виртуальной лаборатории, готовятся к допуску и защите, повторяют теорию по конспектам и сдают тесты по курсу.</p>
      <div class="fz-ab-grid"><div><b>8</b><span>лабораторных работ</span></div><div><b>9</b><span>тем курса с конспектами</span></div><div><b>900</b><span>вопросов для самопроверки и экзаменов</span></div></div></section>
    <p class="fz-copy">${esc(ORG.copy)}</p>
    <div class="fz-ab-links"><button class="fz-devs" data-fz="devs">Разработчики</button><button class="fz-devs" data-fz="legal">Правовая информация</button></div></div>`;
}
const legalHtml = () => `<div class="fz-legal">
  <p><b>Правообладатель.</b> ${esc(ORG.copy)}</p>
  <p><b>Назначение.</b> Программа предназначена для учебного процесса ${esc(ORG.school)}. Методические материалы, вопросы тестов и конспекты принадлежат кафедре и используются только в учебных целях.</p>
  <p><b>Данные.</b> Учётные записи, результаты лабораторных работ и тестов хранятся только на этом компьютере и никуда не передаются. Пароль хранится в виде хеша. Преподавателю результаты передаются файлами с цифровой подписью, которая обнаруживает любые изменения.</p>
  <p><b>Сторонние компоненты.</b> Шрифты Golos UI и STIX Two — SIL Open Font License 1.1. Значки Lucide — лицензия ISC.${typeof katexLoad === 'function' ? ' Отображение формул KaTeX — лицензия MIT. Озвучка видеоуроков — синтезатор речи Piper (лицензия MIT).' : ''}</p></div>`;
const devsHtml = () => `<div class="fz-devlist"><p class="mute">${esc(ORG.devsNote[0].toUpperCase() + ORG.devsNote.slice(1))}</p>${ORG.devs.map(d => `<div class="fz-dev">${ava(d.split(' ').slice(-2, -1)[0] || d)}<b>${esc(d)}</b></div>`).join('')}<p class="mute small">${esc(ORG.dept)}, ${esc(ORG.school)}</p></div>`;

/* ---------- действия ---------- */
document.addEventListener('click', e => {
  const b = e.target.closest && e.target.closest('[data-fz]'); if (!b) return; const d = b.dataset;
  switch (d.fz) {
    case 'self': tStart('self', +d.v); break;
    case 'selfw': tStart('self', +d.v, true); break;
    case 'exam': { const t = d.v === 'final' ? 'final' : +d.v;
      if (confirm(`${topicName(t)}: ${EXAM_N} вопросов, на каждый — своё время. Вернуться к вопросу нельзя, прервать экзамен — значит не сдать его. Начать?`)) tStart('exam', t); break; }
    case 'ans': tAnswer(d.v); break;
    case 'next': tNext(); break;
    case 'quit': if (!TQ) break;
      if (TQ.kind === 'exam' && !TQ.done) { if (!confirm('Прервать экзамен? Неотвеченные вопросы будут засчитаны как неверные.')) break; return tFinish(true); }
      if (TQ.kind === 'self' && !TQ.done && Object.keys(TQ.ans).length) return tFinish();
      TQ = null; clearInterval(tTimer.h); SCREEN = 'labs'; render(); break;
    case 'back': TQ = null; clearInterval(tTimer.h); SCREEN = 'labs'; if (typeof PAGE !== 'undefined') PAGE = 'tests'; render(); break;
    case 'examfile': { const a = tsLoad().att.find(x => x.id === d.v); if (a) fzSaveExam(a); break; }
    case 'devs': fzModal('Разработчики', devsHtml()); break;
    case 'legal': fzModal('Правовая информация', legalHtml()); break;
  }
});
bankLoad();
