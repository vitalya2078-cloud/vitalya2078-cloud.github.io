/* =====================================================================
   «Физпрактикум»: несколько лабораторных работ в одной программе.
   Реестр работ — labs-core.js. Здесь — экран выбора,
   общие экраны (допуск по одному вопросу, выводы и защита, отчёт, сводка) для ЛР 1 и ЛР 2.
   ЛР 3 идёт своими экранами (desktop.js, layout2.js) — как раньше.
   ===================================================================== */
/* ---------- выбор работы ---------- */
/* ---------- приложение: меню слева и разделы ----------
   Меню прижато к левому краю; кнопкой внизу меню или Ctrl+B оно сворачивается до значков (выбор запоминается).
   Клик по названию программы — на главную. Пока курсант не открыл «Что нового» этой версии, у названия метка «Новое». */
let PAGE = 'main';
const NAV = [['main', 'Главная', 'house'], ['labs', 'Лабораторные работы', 'flask-conical'], ['tests', 'Тесты и экзамены', 'graduation-cap'], ['results', 'Мои результаты', 'trophy'], ['profile', 'Профиль', 'user'], ['about', 'О программе', 'book-open']];
const lsGet = (k, d) => { try { const v = localStorage.getItem(k); return v == null ? d : v; } catch (e) { return d; } };
const lsSet = (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} };
let NAVMINI = lsGet('fz-nav-mini', '0') === '1';
const isNew = () => lsGet('fz-seen-ver', '') !== APP_VER;
function vApp() {
  document.body.classList.add('noside', 'fzapp'); document.body.classList.remove('full'); ui.side.innerHTML = '';
  const p = PROFILE, page = ({ main: pgMain, labs: pgLabs, tests: pgTests, results: pgResults, profile: pgProfile, about: pgAbout })[PAGE] || pgMain, nw = isNew();
  const tip = t => NAVMINI ? ` title="${t}"` : '';
  ui.main.innerHTML = `<div class="fz-app ${NAVMINI ? 'mini' : ''}"><nav class="fz-nav">
      <button class="fz-brand ${nw ? 'new' : ''}" data-d="brand" title="На главную"><span class="logo">γ</span><span class="fz-bt"><b>Физпрактикум</b><small>${nw ? `<i class="fz-new">Новое в версии ${esc(APP_VER)}</i>` : 'ЧВВМУ им. П.С. Нахимова'}</small></span></button>
      ${NAV.map(([k, t, i]) => `<button class="fz-ni ${PAGE === k ? 'on' : ''}" data-d="page" data-v="${k}"${tip(t)}>${ic(i)}<span>${t}</span></button>`).join('')}
      <span class="fz-sp"></span>
      <button class="fz-ni" data-d="theme"${tip(isLight() ? 'Тёмная тема' : 'Светлая тема')}>${ic(isLight() ? 'moon' : 'sun')}<span>${isLight() ? 'Тёмная тема' : 'Светлая тема'}</span></button>
      <button class="fz-ni" data-d="navmini" title="${NAVMINI ? 'Развернуть меню' : 'Свернуть меню'} (Ctrl+B)">${ic(NAVMINI ? 'panel-left-open' : 'panel-left-close')}<span>Свернуть меню</span></button>
      <div class="fz-me"><button class="fz-meb" data-d="page" data-v="profile" title="Профиль">${ava(p.fio)}</button><div><b>${esc(p.fio)}</b><small>${esc(p.group ? p.group + ' класс' : '')}</small></div><button class="tb-ic" data-d="home" title="Выйти">${ic('log-out')}</button></div>
    </nav><main class="fz-page">${page()}</main></div>`;
}
const fzNav = () => { NAVMINI = !NAVMINI; lsSet('fz-nav-mini', NAVMINI ? '1' : '0'); const a = $('.fz-app'); if (a) render(); };
/* что нового в версии: показывается на главной, пока не прочитано */
const WHATSNEW = [
  ['panel-left-close', 'Новое меню', 'Меню слева сворачивается до значков — кнопка внизу меню или Ctrl+B.'],
  ['search', 'Поиск', 'Поиск по темам, конспектам, лабораторным работам и терминам — Ctrl+K.'],
  ['notebook-pen', 'Конспекты и видеоуроки', 'Конспекты по 9 темам курса и 8 лабораторным работам: определения, законы, формулы. К каждой теме — видеоурок.'],
  ['user', 'Профиль', 'Статистика по работам, темам и экзаменам в одном месте.'],
  ['shield-check', 'Честная сдача', 'Допуск и защита: после неудачи вопросы меняются, новая попытка — через 2 минуты. Незавершённый экзамен засчитывается.'],
  ['school', 'Кабинет преподавателя', 'Новое меню, список курсантов, проверка работ и журнал.'],
];
const newsHtml = () => `<div class="fz-news">${WHATSNEW.map(([i, t, d]) => `<div class="fz-nwi">${ic(i)}<div><b>${t}</b><span>${d}</span></div></div>`).join('')}</div>`;
function fzNews() { lsSet('fz-seen-ver', APP_VER); fzModal(`Что нового в версии ${esc(APP_VER)}`, newsHtml()); if (SCREEN === 'labs') render(); }
document.addEventListener('keydown', e => {
  if (SCREEN !== 'labs' || !PROFILE || !(e.ctrlKey || e.metaKey) || e.altKey) return;
  if (e.code === 'KeyB') { e.preventDefault(); fzNav(); }
});
const pgHead = (t, sub = '', extra = '') => `<div class="fz-ph"><div><h1>${t}</h1>${sub ? `<p>${sub}</p>` : ''}</div>${extra}</div>`;
function fzNext() {   // продолжить: начатая и не защищённая работа; иначе — первая не начатая
  const st = labNums().map(n => [n, labState(n, PROFILE.id)]);
  const go = st.filter(([, S]) => S && (S.max || 0) > 0 && !S.done).sort((a, b) => (b[1].max || 0) - (a[1].max || 0))[0] || st.find(([, S]) => !S || !(S.max || S.done));
  return go ? go[0] : 0;
}
function pgMain() {
  const n = fzNext(), T = tsLoad(), done = labNums().filter(k => { const S = labState(k, PROFILE.id); return S && S.done; }).length;
  const ex = T.att.filter(a => a.kind === 'exam'), last = ex[0], solved = Object.values(T.self).filter(v => v === 1).length;
  const name = PROFILE.fio.split(/\s+/).slice(1).join(' ') || PROFILE.fio;
  const S = n ? labState(n, PROFILE.id) : null;
  return pgHead(`Здравствуйте, ${esc(name)}!`, `${esc(PROFILE.group ? PROFILE.group + ' класс · ' : '')}${new Date().toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' })}`) +
    (isNew() ? `<section class="fz-wn">${ic('party-popper')}<div><b>Что нового в версии ${esc(APP_VER)}</b><span>${WHATSNEW.map(w => w[1]).join(' · ')}</span></div><button class="btn line" data-d="news">Подробнее</button></section>` : '') +
    `<div class="fz-hero"><section class="fz-tile">${n ? `<div class="fz-cont"><img src="${cover(n)}" alt=""><div><span class="fz-n">${S && S.max ? 'Продолжить' : 'Следующая работа'}</span><h2>ЛР № ${n}. ${esc(labTitle(n))}</h2>
        <p>${S && S.max ? esc(labStatus(n, S)) : 'Работа ещё не начата.'}</p><button class="btn" data-d="lab" data-v="${n}">${S && S.max ? 'Продолжить работу' : 'Начать работу'} ${ic('chevron-right')}</button></div></div>`
      : `<h2>Все лабораторные работы защищены</h2><p>Отличная работа! Результаты — в разделе «Мои результаты».</p><button class="btn" data-d="page" data-v="results">Мои результаты</button>`}</section>
      <section class="fz-tile"><h2>Прогресс</h2><div class="fz-stats"><div class="fz-stat"><b>${done} / ${labNums().length}</b><span>работ защищено</span></div>
        <div class="fz-stat"><b>${solved}</b><span>вопросов решено верно</span></div><div class="fz-stat"><b>${last ? last.score : '—'}</b><span>${last ? `баллов, «${last.grade}» — последний экзамен` : 'экзамены не сдавались'}</span></div></div></section></div>
    <div class="fz-links"><button class="fz-link" data-d="page" data-v="labs">${ic('flask-conical')}<span><b>Лабораторные работы</b><small>8 работ по методическим указаниям кафедры</small></span></button>
      <button class="fz-link" data-d="page" data-v="tests">${ic('graduation-cap')}<span><b>Тесты и экзамены</b><small>900 вопросов: самопроверка и экзамены по темам</small></span></button>
      <button class="fz-link" data-d="help">${ic('book-open')}<span><b>Как проходит работа</b><small>Шаги лабораторной работы и клавиши</small></span></button>
      <button class="fz-link" data-d="import">${ic('file-text')}<span><b>Открыть файл работы</b><small>Продолжить работу с другого компьютера</small></span></button></div>`;
}
const pgLabs = () => pgHead('Лабораторные работы', 'Работы выполняются по методическим указаниям кафедры. Каждая сохраняется отдельно — можно продолжить позже.') + labCards('data-d');
const pgTests = () => pgHead('Тесты и экзамены', 'Банк из 900 вопросов по 9 темам курса физики.') + testsHome();
const pgResults = () => pgHead('Мои результаты', 'Лабораторные работы и экзамены. Файл результата экзамена можно сохранить для преподавателя.') + resultsHtml('data-d');
const KEYS = [['Ctrl', 'K', 'Поиск по программе'], ['Ctrl', 'B', 'Свернуть или развернуть меню'], ['', 'Enter', 'Следующий шаг, проверить ответ'], ['', '1 – 4', 'Выбор ответа в тесте'], ['', 'Esc', 'Закрыть окно']];
const pgAbout = () => aboutHtml('data-d').replace(/<p class="fz-copy">/, `<div class="fz-ab-two">
    <section class="fz-ab-card"><p class="fz-ab-t">${ic('keyboard')} Клавиши</p>${KEYS.map(([m, k, t]) => `<div class="fz-key">${m ? `<kbd>${m}</kbd>+` : ''}<kbd>${k}</kbd><span>${t}</span></div>`).join('')}</section>
    <section class="fz-ab-card"><p class="fz-ab-t">${ic('party-popper')} Что нового в версии ${esc(APP_VER)}</p><ul class="fz-ab-ul">${WHATSNEW.map(w => `<li>${w[1]}</li>`).join('')}</ul><button class="btn line" data-d="news">Подробнее</button></section>
  </div><p class="fz-copy">`);
function pgProfile() {
  const p = PROFILE, T = tsLoad(), ex = T.att.filter(a => a.kind === 'exam'), nl = labNums().length;
  const st = labNums().map(n => [n, labState(n, p.id)]), done = st.filter(([, S]) => S && S.done).length, started = st.filter(([, S]) => S && (S.max || S.done)).length;
  const solved = Object.values(T.self).filter(v => v === 1).length, wrong = Object.values(T.self).filter(v => v === 0).length, total = BANK ? BANK.q.filter(q => !q.broken).length : 900;
  const avg = ex.length ? Math.round(ex.reduce((s, a) => s + a.score, 0) / ex.length) : null, best = ex.length ? ex.reduce((m, a) => (a.score > m.score ? a : m)) : null;
  const since = p.created ? new Date(p.created).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' }) : '';
  const topics = BANK ? BANK.topics.map(tp => { const q = bankTopic(tp.id), ok = q.filter(x => T.self[x.id] === 1).length, b = ex.filter(a => a.topic === tp.id).sort((x, y) => y.score - x.score)[0];
    return `<div class="fz-ptop"><span class="fz-tn">${tp.id}</span><div><b>${esc(tp.title)}</b><span class="fz-bar"><i style="width:${q.length ? Math.round(ok / q.length * 100) : 0}%"></i></span></div><small>${ok} / ${q.length}</small>${b ? `<span class="fz-best g${b.grade}">${b.score}</span>` : '<span class="fz-best none">—</span>'}</div>`; }).join('') : '';
  const labs = st.map(([n, S]) => `<button class="fz-plab ${S && S.done ? 'done' : S && (S.max || 0) > 0 ? 'go' : ''}" data-d="lab" data-v="${n}" title="${esc(labTitle(n))}"><b>${n}</b><small>${S && S.done ? 'защищена' : S && (S.max || 0) > 0 ? 'в работе' : 'не начата'}</small></button>`).join('');
  const last = ex.slice(0, 5).map(a => `<div class="fz-pact">${ic('graduation-cap')}<div><b>${esc(topicName(a.topic))}</b><small>${new Date(a.date).toLocaleString('ru-RU', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}</small></div><span class="fz-best g${a.grade}">${a.score} · «${a.grade}»</span></div>`).join('');
  return pgHead('Профиль') + `<div class="fz-prof">
    <section class="fz-tile fz-pid">${ava(p.fio, 'big')}<div><h2>${esc(p.fio)}</h2><p>${p.group ? `${esc(p.group)} класс · ` : ''}${esc(ORG.school)}</p>${since ? `<small>${ic('calendar')} Учётная запись создана ${since}</small>` : ''}</div></section>
    <div class="fz-pstats">
      <div class="fz-pst">${ic('flask-conical')}<b>${done}<small> / ${nl}</small></b><span>работ защищено${started > done ? `, ${started - done} в работе` : ''}</span></div>
      <div class="fz-pst">${ic('circle-check')}<b>${solved}<small> / ${total}</small></b><span>вопросов решено верно</span></div>
      <div class="fz-pst">${ic('rotate-ccw')}<b>${wrong}</b><span>вопросов на повторение</span></div>
      <div class="fz-pst">${ic('award')}<b>${avg == null ? '—' : avg}</b><span>${avg == null ? 'экзамены не сдавались' : `средний балл экзаменов (${ex.length})${best ? `, лучший — ${best.score}` : ''}`}</span></div>
    </div>
    <div class="fz-pgrid">
      <section class="fz-tile fz-pwide"><h2>${ic('chart-column')} Темы курса</h2><p>Верно решённые вопросы самопроверки и лучший балл экзамена по теме.</p><div class="fz-ptops">${topics}</div></section>
      <div class="fz-pcol">
        <section class="fz-tile"><h2>${ic('flask-conical')} Лабораторные работы</h2><div class="fz-plabs">${labs}</div></section>
        <section class="fz-tile"><h2>${ic('history')} Последние экзамены</h2>${last || '<p>Экзамены ещё не сдавались.</p>'}</section>
      </div>
    </div>
    <p class="fz-h">Настройки учётной записи</p>
    <div class="fz-pcards">
    <section class="fz-tile"><h2>${ic('user-pen')} Данные</h2><div class="fz-form"><label class="field">ФИО<input id="pf-fio" value="${esc(p.fio)}" autocomplete="off"></label>
      <label class="field">Класс<input id="pf-group" value="${esc(p.group || '')}" autocomplete="off"></label><button class="btn" data-d="pf-save">${ic('circle-check')} Сохранить</button></div></section>
    <section class="fz-tile"><h2>${ic('key-round')} Пароль</h2><div class="fz-form"><label class="field">Текущий пароль<input type="password" id="pf-old" autocomplete="current-password"></label>
      <label class="field">Новый пароль<input type="password" id="pf-n1" autocomplete="new-password"></label><label class="field">Ещё раз<input type="password" id="pf-n2" autocomplete="new-password"></label>
      <button class="btn" data-d="pf-pw">${ic('lock')} Сменить пароль</button><p class="fz-msg" id="pf-msg"></p></div></section>
    <section class="fz-tile"><h2>${ic('settings')} Сеанс</h2><p>Учётная запись и результаты хранятся только на этом компьютере.</p><div class="fz-form"><button class="btn line" data-d="home">${ic('log-out')} Выйти из учётной записи</button>
      <button class="btn ghost" data-d="pf-del" style="color:var(--bad)">${ic('trash-2')} Удалить учётную запись и её результаты</button></div></section></div></div>`;
}
const pfMsg = t => { const m = $('#pf-msg'); if (m) m.textContent = t; };
document.addEventListener('click', e => {
  const b = e.target.closest && e.target.closest('[data-d]'); if (!b || !PROFILE) return; const d = b.dataset;
  switch (d.d) {
    case 'page': PAGE = d.v; SCREEN = 'labs'; render(); ui.main.scrollTop = 0; break;
    case 'brand': PAGE = 'main'; SCREEN = 'labs'; render(); ui.main.scrollTop = 0; break;
    case 'navmini': fzNav(); break;
    case 'news': fzNews(); break;
    case 'pf-save': { const fio = $('#pf-fio').value.trim(), group = $('#pf-group').value.trim();
      if (fio.split(/\s+/).length < 2) { toast('Впиши фамилию и инициалы.', 'bad'); break; }
      const list = profiles(), p = list.find(x => x.id === PROFILE.id); p.fio = fio; p.group = group; store.set(PKEY, list); PROFILE = p; render(); toast('Сохранено'); break; }
    case 'pf-pw': { if (!acctCheck(PROFILE, $('#pf-old').value)) { pfMsg('Текущий пароль неверный.'); break; } const a = $('#pf-n1').value;
      if (a.length < 4) { pfMsg('Новый пароль — не короче 4 символов.'); break; } if (a !== $('#pf-n2').value) { pfMsg('Пароли не совпадают.'); break; }
      PROFILE = acctSetPw(PROFILE.id, a); render(); toast('Пароль изменён'); break; }
    case 'pf-del': { const pw = prompt('Удалить учётную запись и все её результаты с этого компьютера? Для подтверждения введи пароль.');
      if (pw == null) break; if (!acctCheck(PROFILE, pw)) { toast('Неверный пароль — учётная запись не удалена.', 'bad'); break; }
      const id = PROFILE.id; store.set(PKEY, profiles().filter(x => x.id !== id)); labNums().forEach(n => store.del(LABS[n].key(id))); store.del(testKey(id));
      PROFILE = null; SCREEN = 'home'; render(); toast('Учётная запись удалена'); break; }
  }
});
function openLab(n) {
  LAB = n; const L = curLab(); L.setKey(L.key(PROFILE.id));
  const S = L.load(); ensureMeta(S); L.save(); if (n === 3) l3Reset();
  AQ = 0; CQI = 0; SCREEN = 'work'; PAGE = 'labs'; render(); ui.main.scrollTop = 0;
}

/* ---------- общие экраны ЛР 1 и ЛР 2 ---------- */
let CQI = 0;   // текущий вопрос защиты (по одному)
function gTop(S, L) {
  const fin = L.steps[S.max][0] === 'report';
  return `<header class="tb">
    <div class="tb-brand"><button class="tb-ic" data-d="labs" title="К списку работ">${ic('chevron-left')}</button><span class="logo">γ</span><b>ЛР ${L.no}<small>${esc(L.short)}</small></b></div>
    <nav class="tb-steps${L.steps.length > 7 || L.steps.map(x => x[1]).join('').length > 58 ? ' many' : ''}">${L.steps.map(([, t], i) => { const ok = i < S.max || (i === S.max && fin && S.done), on = i === S.step;
      return `<button data-${L.act}="go" data-v="${i}" class="${on ? 'on' : ''}${ok ? ' ok' : ''}" ${i > S.max ? 'disabled' : ''}><i>${ok && !on ? '✓' : i + 1}</i><span>${t}</span></button>`; }).join('<s></s>')}</nav>
    <div class="tb-act">
      <button class="btn line tb-hod" data-d="hod" title="Ход работы (H)">${ic('clipboard-list')} Ход работы ${kbd('H')}</button>
      <span class="tb-who">${ava(S.fio || PROFILE.fio)}<span>${esc(S.fio || PROFILE.fio)}</span></span>
      <button class="tb-ic" data-d="save" title="Сохранить файл работы (Ctrl+S)">${ic('file-text')}</button>
      <button class="tb-ic" data-d="theory" title="Теория и установка">${ic('book-open')}</button>
      <button class="tb-ic" data-d="theme" title="Тема">${ic('sparkles')}</button>
    </div></header>`;
}
function gQuestion(list, S, key, i, act, seed, checked) {
  const [q, a, x] = list[i], opts = lwShuf(i + seed, [a, ...x]), ch = S[key][i];
  return `<div class="qs-n">Вопрос ${i + 1} из ${list.length}</div><h2 class="qs-q">${esc(q)}</h2>
    <div class="qs-opts">${opts.map((o, j) => `<button data-${act}="${key}" data-q="${i}" data-v="${esc(o)}" class="${ch === o ? (checked ? (o === a ? 'ok' : 'bad') : 'pick') : ''}"><span class="lt">${j + 1}</span><span>${esc(o)}</span></button>`).join('')}</div>`;
}
function gDots(list, S, key, cur, checked, nav) {
  return `<div class="qs-dots">${list.map(([, a], i) => { const ch = S[key][i]; const cls = i === cur ? 'on' : ch ? (checked ? (ch === a ? 'ok' : 'bad') : 'ans') : '';
    return `<button data-d="${nav}" data-v="${i}" class="${cls}">${i + 1}</button>`; }).join('')}<button data-d="${nav}" data-v="${list.length}" class="fin ${cur === list.length ? 'on' : ''}" title="Сдать">${ic('flag')}</button></div>`;
}
function gTheorySide(L) {
  return `<aside class="qs-side card"><div class="tabs">${[['theory', 'Теория и установка'], ['safety', 'Безопасность']].map(([k, t]) => `<button data-d="stab" data-v="${k}" class="${(TAB === 'safety' ? 'safety' : 'theory') === k ? 'on' : ''}">${t}</button>`).join('')}</div>
    <div class="read">${TAB === 'safety' ? L.text.safety : `${L.text.theory}<div class="paper-mini">${L.scheme()}</div>${L.text.equip}`}</div></aside>`;
}
function gAdmit(S, L) {
  const list = L.admit, N = list.length, answered = Object.keys(S.admit).length; AQ = Math.max(0, Math.min(N, AQ));
  const body = AQ < N
    ? gQuestion(list, S, 'admit', AQ, L.act, 40 + L.no * 20, S.admitChecked) + `<div class="qs-nav"><button class="btn ghost" data-d="aq" data-v="${AQ - 1}" ${AQ ? '' : 'disabled'}>${ic('chevron-left')} Назад</button><span class="mute small">1–4 — выбрать ответ</span>
      <button class="btn ${S.admit[AQ] ? '' : 'line'}" data-d="aq" data-v="${AQ + 1}" data-primary>${AQ === N - 1 ? 'К сдаче' : 'Дальше'} ${kbd('Enter')}</button></div>`
    : `<div class="qs-n">Сдача допуска</div><h2 class="qs-q">${S.admitOk ? 'Допуск сдан' : `Отвечено ${answered} из ${N}`}</h2>
      <p class="mute">${S.admitOk ? 'Можно переходить к подготовке установки.' : 'Нужно не меньше 6 верных ответов из 8. Вернуться к любому вопросу — кнопки с номерами вверху.'}</p>
      <div class="qs-nav"><button class="btn ghost" data-d="aq" data-v="${N - 1}">${ic('chevron-left')} Назад</button><span></span>
      ${S.admitOk ? `<button class="btn" data-${L.act}="next" data-primary>К подготовке ${kbd('Enter')}</button>` : `<button class="btn" data-${L.act}="admitCheck" data-primary ${answered ? '' : 'disabled'}>${ic('circle-check')} Сдать допуск ${kbd('Enter')}</button>`}</div>`;
  return gTop(S, L) + `<div class="qs"><div class="qs-main"><div class="qs-aim"><span class="kicker">Цель работы</span>${esc(labAim(L.no))}</div>${qWaitBox(S, 'admit')}${gDots(list, S, 'admit', AQ, S.admitChecked, 'aq')}<section class="qs-card">${body}</section></div>${gTheorySide(L)}</div>`;
}
function gConcl(S, L) {
  if (!S.concl) { S.concl = L.autoConcl(); L.save(); }
  const list = L.cq, N = list.length, answered = Object.keys(S.cq).length; CQI = Math.max(0, Math.min(N, CQI));
  const q = CQI < N
    ? gQuestion(list, S, 'cq', CQI, L.act, 70 + L.no * 20, S.cqChecked) + `<div class="qs-nav"><button class="btn ghost" data-d="cqi" data-v="${CQI - 1}" ${CQI ? '' : 'disabled'}>${ic('chevron-left')} Назад</button><span></span>
      <button class="btn ${S.cq[CQI] ? '' : 'line'}" data-d="cqi" data-v="${CQI + 1}">${CQI === N - 1 ? 'К сдаче' : 'Дальше'}</button></div>`
    : `<div class="qs-n">Защита</div><h2 class="qs-q">${S.cqOk ? 'Защита принята' : `Отвечено ${answered} из ${N}`}</h2><p class="mute">${S.cqOk ? 'Отчёт готов.' : `Нужно не меньше 6 верных ответов из ${N}.`}</p>
      <div class="qs-nav"><button class="btn ghost" data-d="cqi" data-v="${N - 1}">${ic('chevron-left')} Назад</button><span></span>
      ${S.cqOk ? `<button class="btn" data-${L.act}="next" data-primary>К отчёту ${kbd('Enter')}</button>` : `<button class="btn" data-${L.act}="cqCheck" data-primary ${answered ? '' : 'disabled'}>${ic('circle-check')} Проверить ответы ${kbd('Enter')}</button>`}</div>`;
  return gTop(S, L) + `<div class="pg"><div class="grid2 even">
    <section class="card sticky"><h2>${ic('pencil')} Выводы</h2><p class="mute small">Черновик собран по твоим результатам. Проверь и допиши своими словами — он попадёт в отчёт.</p>
      ${L.ta(S.concl)}<button class="btn line wide mt" data-${L.act}="reconcl">${ic('rotate-ccw')} Собрать черновик заново</button></section>
    <section class="card"><h2>${ic('graduation-cap')} Контрольные вопросы <span class="pill ${S.cqOk ? 'ok' : ''}">${answered} из ${N}</span></h2>${qWaitBox(S, 'cq')}${gDots(list, S, 'cq', CQI, S.cqChecked, 'cqi')}<div class="qs-card flat">${q}</div></section></div></div>`;
}
function gReport(S, L) {
  let res = ''; try { res = L.result(); } catch (e) {}
  const sent = S.dx && S.dx.submitted;
  if (!(S.dx && S.dx.sumSeen)) setTimeout(() => { if (SCREEN === 'work' && LAB === L.no && L.steps[L.S().step][0] === 'report' && $('#modal').hidden) openSummary(); }, 0);
  return gTop(S, L) + `<div class="pg"><div class="rep"><div class="sticky">
    <section class="card"><div class="done-badge">${ic('trophy')}<div><b>Работа выполнена</b><span class="mute small">${esc(res)}</span></div></div>
      <div style="display:grid; gap:10px"><label class="field">ФИО${L.inp('fio', S.fio, 'Иванов И. И.')}</label><label class="field">Класс / группа${L.inp('group', S.group, '')}</label><label class="field">Дата${L.inp('date', S.date, 'дд.мм.гггг')}</label></div>
      ${sent ? `<p class="pill ok mt">${ic('circle-check')} Работа сдана ${new Date(sent).toLocaleString('ru-RU', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}</p>` : ''}
      <button class="btn wide big mt" data-d="submit" ${sent ? '' : 'data-primary'}>${ic('graduation-cap')} ${IS_TAURI && FOLDER ? 'Сдать работу в папку класса' : 'Сохранить файл для преподавателя'}</button>
      <div class="row mt"><button class="btn line" data-d="pdf">${ic('file-text')} Сохранить PDF</button><button class="btn line" data-${L.act}="print">${ic('printer')} Печать ${kbd('Ctrl+P')}</button></div>
      <button class="btn line wide mt" data-d="summary">${ic('graduation-cap')} Что рассказать на защите</button>
      <button class="btn line wide mt" data-${L.act}="restart">${ic('rotate-ccw')} Выполнить работу заново</button></section></div>
    <div class="paper" id="d-paper"><div class="lwr">${L.report()}</div></div></div></div>`;
}
function gWork(S, L) {
  const st = L.steps[S.step][0];
  if (st === 'admit') return gAdmit(S, L);
  if (st === 'concl') return gConcl(S, L);
  if (st === 'report') return gReport(S, L);
  return gTop(S, L) + `<div class="pg"><div class="slab ${L.live.includes(st) ? 'live' : ''}">${L.view[st]()}</div></div>`;
}
function vWorkLab() {
  document.body.classList.add('noside', 'full'); ui.side.innerHTML = '';
  const L = curLab(), S = L.load(); ensureMeta(S);
  const st = L.steps[S.step][0];
  S.dx.t = S.dx.t || {}; if (!S.dx.t[st]) { S.dx.t[st] = new Date().toISOString(); L.save(); }
  ui.main.innerHTML = gWork(S, L);
  $('#printroot').innerHTML = st === 'report' ? L.report() : '';
  L.after(st);
}
function showTheoryLab() {
  const L = curLab();
  modal('Теория и установка', `<div class="tabs">${[['theory', 'Теория'], ['equip', 'Установка'], ['safety', 'Безопасность']].map(([k, t]) => `<button data-d="ttab" data-v="${k}" class="${TAB === k ? 'on' : ''}">${t}</button>`).join('')}</div>
    <div class="read">${TAB === 'equip' ? `<div class="paper-mini">${L.scheme()}</div>` : ''}${L.text[TAB] || L.text.theory}</div>`);
}

/* ---------- события ---------- */
document.addEventListener('click', e => {
  const b = e.target.closest && e.target.closest('[data-d]'); if (!b) return; const d = b.dataset;
  if (d.d === 'lab') openLab(+d.v);
  if (d.d === 'labs' && PROFILE) { closeModal(); SCREEN = 'labs'; PAGE = 'labs'; render(); }
  if (d.d === 'cqi') { CQI = +d.v; render(); }
});
// ответ выбран — следующий вопрос без ответа (ЛР 1 и ЛР 2)
document.addEventListener('click', e => {
  const b = e.target.closest && e.target.closest('[data-lw="admit"],[data-l2="admit"],[data-le="admit"],[data-lw="cq"],[data-l2="cq"],[data-le="cq"]'); if (!b || LAB === 3) return;
  const L = curLab(), S = L.S(), adm = (b.dataset.lw || b.dataset.l2 || b.dataset.le) === 'admit', list = adm ? L.admit : L.cq;
  if (!S || (adm ? S.admitChecked : S.cqChecked)) return;
  setTimeout(() => { const ans = adm ? S.admit : S.cq, cur = adm ? AQ : CQI; let nx = list.findIndex((_, j) => j > cur && !ans[j]); if (nx < 0) nx = list.findIndex((_, j) => !ans[j]); if (nx < 0) nx = list.length;
    if (adm) AQ = nx; else CQI = nx; render(); }, 260);
});
// учёт попыток и времени — как у ЛР 3 (для преподавателя)
document.addEventListener('click', e => {
  const b = e.target.closest && e.target.closest('[data-lw],[data-l2],[data-le]'); if (!b || LAB === 3) return;
  const L = curLab(), S = L.S(); if (!S || !S.dx) return; const a = b.dataset.lw || b.dataset.l2 || b.dataset.le;
  const k = { admitCheck: 'admitTries', pcheck: 'procTries', cqCheck: 'cqTries' }[a]; if (k) S.dx[k] = (S.dx[k] || 0) + 1;
  if (a === 'cqCheck') setTimeout(() => { if (S.done && !S.dx.finished) { S.dx.finished = new Date().toISOString(); L.save(); } if (S.done && !S.dx.submitted && FOLDER && IS_TAURI) submitWork(true); }, 50);
  if (a === 'next' || a === 'go') { AQ = 0; CQI = 0; }
}, true);
