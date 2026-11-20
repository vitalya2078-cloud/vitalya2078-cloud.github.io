/* =====================================================================
   «Физпрактикум» для Windows и Linux — оболочка программы.
   Работы — модули lw3-core.js, labwork*.js, labs-e.js (общие с сайтом и телефоном), тесты и учётные записи —
   app-core.js. Здесь: вход, экраны ЛР 3, горячие клавиши, график давления, звук, файлы результата.
   ===================================================================== */
const IS_TAURI = !!(window.__TAURI__ && window.__TAURI__.core);
const ui = { main: $('#main'), side: $('#side') };
let SCREEN = 'home';            // home | work | lock | teacher
let PROFILE = null;
let TAB = 'theory';
const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} },
  del(k) { try { localStorage.removeItem(k); } catch (e) {} }
};

/* ---------- то, чего ядро ждёт от оболочки ---------- */
function toast(html, kind = '') { const box = $('#toasts'); while (box.children.length >= 3) box.firstChild.remove(); const t = document.createElement('div'); t.className = 'toast ' + kind; t.innerHTML = html; $('#toasts').appendChild(t); setTimeout(() => t.classList.add('out'), 3200); setTimeout(() => t.remove(), 3700); }
function addXP() { toast(`${ic('award')} Работа защищена. Сохрани файл результата для преподавателя на шаге «Отчёт».`); }
function render() {
  document.body.classList.remove('full', 'fzapp');
  if (SCREEN === 'lock') return vLock();
  if (SCREEN === 'teacher') return vTeacher();
  if (SCREEN === 'home' || !PROFILE) return vHome();
  if (SCREEN === 'labs') return vApp();
  if (SCREEN === 'test') return vTest();
  if (PROFILE) qApply(LAB, curLab().load());
  if (LAB !== 3) return vWorkLab();
  vWork();
}
const LOGO = '<img class="logo img" src="img/brand/icon-128.png" alt="">';
const isLight = () => document.documentElement.dataset.theme === 'light';
function setTheme(t) { document.documentElement.dataset.theme = t; try { localStorage.setItem('lw3d-theme', t); } catch (e) {} render(); }
const themeBtn = () => `<button class="btn ghost" data-d="theme">${ic(isLight() ? 'moon' : 'sun')} ${isLight() ? 'Тёмная тема' : 'Светлая тема'}</button>`;

/* ---------- профили курсантов ---------- */
const PKEY = 'lw3d-profiles';
const profiles = () => store.get(PKEY, []);
const workKey = id => 'lw3d-w-' + id;
const initials = fio => String(fio || '?').trim().split(/\s+/).slice(0, 2).map(w => w[0] || '').join('').toUpperCase() || '?';
const hue = s => { let h = 0; for (const ch of String(s)) h = (h * 31 + ch.charCodeAt(0)) % 360; return h; };
const ava = (fio, size = '') => `<span class="ava ${size}" style="background:hsl(${hue(fio)} 70% 68%)">${esc(initials(fio))}</span>`;
/* отметка о принятии лицензионного соглашения (редакция и дата) */
function acctEula(id) { const list = profiles(), p = list.find(x => x.id === id); if (!p) return; p.eula = { v: '1.0', at: new Date().toISOString() }; store.set(PKEY, list); }
function addProfile(fio, group) {
  const p = { id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), fio: fio.trim(), group: group.trim(), created: new Date().toISOString() };
  store.set(PKEY, [p, ...profiles()]); return p;
}
function ensureMeta(S) {
  if (!S.fio && PROFILE) S.fio = PROFILE.fio;
  if (!S.group && PROFILE) S.group = PROFILE.group;
  if (!S.dx) S.dx = { started: new Date().toISOString(), admitTries: 0, procTries: 0, cqTries: 0 };
}
function openProfile(p, intro = false, lab = 0) {   // курсант → экран выбора работы (или сразу работа lab)
  PROFILE = p; L3S = null; LWS = null; L2S = null; CH.pts = []; CH.marks = []; tRecover();
  if (lab) openLab(lab); else { SCREEN = 'labs'; PAGE = 'main'; render(); ui.main.scrollTop = 0; }
  if (intro) showIntro(0);
}
function profileState(p) { return store.get(workKey(p.id), null); }
function profileStatus(p) {   // кратко по всем работам курсанта
  const st = labNums().map(n => [n, labState(n, p.id)]).filter(([, S]) => S && (S.max || S.done));
  if (!st.length) return 'работы не начаты';
  return st.map(([n, S]) => `ЛР ${n}: ${S.done ? 'защищена' : 'шаг ' + ((S.max || 0) + 1)}`).join(' · ');
}

/* ---------- вход и регистрация (пароль хранится только как хеш — app-core.js) ---------- */
let AUTH = 'in', ASEL = '';
function vHome() {
  document.body.classList.add('noside'); ui.side.innerHTML = '';
  const ps = profiles(); if (!ps.length) AUTH = 'up';
  const sel = ps.find(p => p.id === ASEL) || null;
  const pwField = (id, lab, ac = 'current-password') => `<label class="field">${lab}<input type="password" id="${id}" autocomplete="${ac}"></label>`;
  const login = !ps.length ? `<p class="mute">На этом компьютере ещё нет учётных записей. Зарегистрируйся — это займёт минуту.</p>`
    : `<p class="mute small">Выбери свою учётную запись:</p><div class="fz-acc">${ps.map(p => `<button data-d="acc" data-v="${p.id}" class="${p.id === ASEL ? 'on' : ''}">${ava(p.fio)}<span><b>${esc(p.fio)}</b><small>${esc(p.group || 'класс не указан')}</small></span></button>`).join('')}</div>
      ${sel ? (acctHasPw(sel) ? `${pwField('au-pw', 'Пароль')}<button class="btn wide big mt" data-d="login" data-primary>Войти ${kbd('Enter')}</button><p class="mute small" style="margin-top:10px">Забыли пароль? Его сбросит преподаватель в режиме преподавателя.</p>`
        : `<p class="mute small">${sel.pwReset ? 'Пароль сброшен преподавателем.' : 'У этой учётной записи ещё нет пароля.'} Придумай новый:</p>${pwField('au-n1', 'Новый пароль', 'new-password')}${pwField('au-n2', 'Ещё раз', 'new-password')}<button class="btn wide big mt" data-d="setpw" data-primary>Сохранить и войти ${kbd('Enter')}</button>`) : ''}`;
  const reg = `<div style="display:grid; gap:12px"><label class="field">ФИО<input id="np-fio" placeholder="Иванов Иван Иванович" autocomplete="off"></label>
      <label class="field">Класс<input id="np-group" placeholder="103" autocomplete="off"></label>${pwField('np-pw', 'Пароль', 'new-password')}${pwField('np-pw2', 'Пароль ещё раз', 'new-password')}
      <label class="fz-eula-ok"><input type="checkbox" id="np-eula"><span>Я принимаю условия <button type="button" class="fz-lnk" data-fz="eula">лицензионного соглашения</button></span></label>
      <button class="btn wide big mt" data-d="register" data-primary>Зарегистрироваться ${kbd('Enter')}</button>
      <p class="mute small">Учётная запись и результаты хранятся только на этом компьютере.</p></div>`;
  const feat = [['flask-conical', '8 лабораторных работ', 'По методическим указаниям кафедры: допуск, опыты, обработка результатов, отчёт и защита.'],
    ['graduation-cap', '900 вопросов по 9 темам', 'Самопроверка с разбором, экзамены по темам и итоговый экзамен по 100-балльной шкале.'],
    ['notebook-pen', 'Конспекты и видеоуроки', 'Определения, законы и формулы по каждой теме курса физики.'],
    ['shield-check', 'Результаты для преподавателя', 'Отчёты и результаты экзаменов сохраняются в файлы, защищённые от изменения.']];
  ui.main.innerHTML = `<div class="login fz-login">
    <div class="corner tr">${themeBtn()}</div>
    <div class="fz-lgrid">
      <section class="fz-lhero">
        <div class="fz-lbrand">${LOGO}<div><h1>Физпрактикум</h1><p>Виртуальный лабораторный практикум по физике</p></div></div>
        <div class="fz-lfeat">${feat.map(([i, t, d]) => `<div>${ic(i)}<div><b>${t}</b><span>${d}</span></div></div>`).join('')}</div>
        <p class="fz-org">${esc(ORG.school)}<br>${esc(ORG.dept)}</p>
      </section>
      <div class="login-box fz-auth">
        <div class="card"><h2 class="fz-ah">${AUTH === 'in' ? 'Вход в программу' : 'Новая учётная запись'}</h2><div class="fz-seg"><button data-d="atab" data-v="in" class="${AUTH === 'in' ? 'on' : ''}">Вход</button><button data-d="atab" data-v="up" class="${AUTH === 'up' ? 'on' : ''}">Регистрация</button></div>
          ${AUTH === 'in' ? login : reg}<p class="fz-msg" id="au-msg"></p></div>
      </div>
    </div>
    <div class="corner bl">Версия ${esc(APP_VER)}${UPD ? ` · <button class="btn ghost" data-d="upd" style="color:var(--acc)">${ic('sparkles')} Вышла версия ${esc(UPD.v)} — скачать</button>` : ''}</div>
    <div class="corner br"><button class="btn ghost" data-d="import">${ic('file-text')} Открыть файл работы</button><button class="btn ghost" data-d="teacher">${ic('lock')} Преподаватель</button></div>
  </div>`;
  setTimeout(() => { const f = $('#au-pw') || $('#au-n1') || $('#np-fio'); if (f && SCREEN === 'home' && $('#modal').hidden) f.focus(); }, 0);
}
const auMsg = t => { const m = $('#au-msg'); if (m) m.textContent = t; };
function vTest() {
  document.body.classList.add('noside', 'full'); ui.side.innerHTML = '';
  ui.main.innerHTML = `<div class="fz-test">${testScreen()}</div>`; ui.main.scrollTop = 0;
}
const fzModal = (t, html) => modal(t, html);
const fzSaveExam = a => saveFile(examFileName(a), packExam(a), 'lw3', 'Файл результата');

/* ---------- работа: боковая панель ---------- */

/* ---------- работа: экраны шагов ---------- */
const kbd = k => `<kbd>${k}</kbd>`;
const lt = 'АБВГДЕ';
const inp = (k, val, cls = '', ph = '') => `<input class="inp l3i ${cls}" data-k3="${k}" inputmode="decimal" autocomplete="off" value="${esc(val ?? '')}" placeholder="${ph}">`;
const nextBtn = label => `<button class="btn wide big next" data-l3="next" data-primary>${label} ${ic('chevron-right')} ${kbd('Enter')}</button>`;
function head(S, extra = '') {   // шаг виден в верхней полосе; здесь — только отметки (всё верно, ошибки…)
  return extra ? `<div class="head"><div class="sp"></div>${extra}</div>` : '';
}
function vWork() {
  document.body.classList.add('noside', 'full'); ui.side.innerHTML = '';   // верхняя полоса шагов вместо боковой панели
  const S = l3Load(); ensureMeta(S);
  const st = L3.steps[S.step][0];
  S.dx.t = S.dx.t || {}; if (!S.dx.t[st]) { S.dx.t[st] = new Date().toISOString(); l3Save(); }   // когда курсант впервые дошёл до шага
  ui.main.innerHTML = st === 'admit' ? vAdmitStep(S) : st === 'prep' || st === 'exp' ? vTrainer(S, st)
    : topbar(S) + `<div class="pg">${({ proc: wProc, concl: wConcl, report: wReport })[st](S)}</div>`;
  $('#printroot').innerHTML = st === 'report' ? l3ReportHtml() : '';
  if (st === 'prep' || st === 'exp') { l3Draw(); l3Run(); liveTick(true); }
}
function quiz(list, S, act, seed, key) {
  const chosen = S[key], checked = S[key === 'admit' ? 'admitChecked' : 'cqChecked'];
  return list.map(([q, a, x], i) => { const opts = lwShuf(i + seed, [a, ...x]), ch = chosen[i];
    return `<div class="q"><b>${i + 1}. ${esc(q)}</b><div class="opts">${opts.map((o, j) => `<button data-l3="${act}" data-q="${i}" data-v="${esc(o)}" class="${ch === o ? (checked ? (o === a ? 'ok' : 'bad') : 'pick') : ''}"><span class="lt">${lt[j]}</span><span>${esc(o)}</span></button>`).join('')}</div></div>`; }).join('');
}
const PLAN = ['Открыть K, закрыть K₀', 'Накачать 210…220 мм, закрыть K', 'Выждать 1 минуту', 'Записать h₁', 'Выпустить воздух через K₀', 'Закрыть K₀, выждать 1 минуту', 'Записать h₂'];
const PLAN_AT = { ready: 0, pump: 1, wait1: 2, read1: 3, vent: 4, vented: 5, wait2: 5, read2: 6 };
function expControls(S) {
  const V = L3V, n = S.runs.length + 1;
  if (V.phase === 'ready' && S.kOpen && !S.k0Open) V.phase = 'pump';     // как на сайте: краны уже готовы — сразу накачка
  const ph = V.phase;
  if (ph === 'ready') return `<p class="say">Опыт ${n}. Открой кран <b>K</b> и закрой кран <b>K₀</b>.</p><div class="ctl">
      <button class="btn ${S.kOpen ? 'on' : 'off'}" data-l3="kv" data-key="K">Кран K: ${S.kOpen ? 'открыт' : 'закрыт'} ${kbd('K')}</button>
      <button class="btn ${!S.k0Open ? 'on' : 'off'}" data-l3="k0" data-key="O">Кран K₀: ${S.k0Open ? 'открыт' : 'закрыт'} ${kbd('O')}</button></div>`;
  if (ph === 'pump') return `<p class="say">Держи компрессор, пока разность уровней не станет <b>210…220 мм</b>. Сейчас: <b id="l3-h">${Math.round(V.p)}</b> мм</p>
      <div class="bar zone"><div id="d-pbar" style="width:0%"></div></div><div class="ctl">
      <button class="btn big hold" id="l3-pump" data-l3="nop">${ic('zap')} Компрессор — держи ${kbd('Пробел')}</button>
      <button class="btn line" data-l3="closeK" data-primary>${ic('timer')} Закрыть K и пустить секундомер ${kbd('Enter')}</button></div>`;
  if (ph === 'wait1' || ph === 'wait2') return `<p class="say">Секундомер идёт. Выжди <b>1 минуту</b>: температура газа сравняется с комнатной, и давление установится.</p>
      <div class="bar"><div id="d-wbar" style="width:0%"></div></div>
      <div class="ctl"><button class="btn big" data-l3="waitMin" data-primary ${V.speed > 1 ? 'disabled' : ''}>${ic('timer')} Ждать 1 минуту (ускоренно) ${kbd('Enter')}</button></div>`;
  if (ph === 'read1' || ph === 'read2') { const j = ph === 'read1' ? '₁' : '₂';
    return `<p class="say">Секундомер остановлен. По лупам на схеме прочитай уровни в <b>обоих коленах</b> и запиши <b>h${j}</b> — разность уровней (правое минус левое), мм.</p>
      <div class="read-in"><input class="inp l3i" data-k3="ch" inputmode="decimal" autocomplete="off" value="${esc(V.cur[ph === 'read1' ? 'r1' : 'r2'] || '')}" placeholder="h${j}, мм" id="d-read"><button class="btn" data-l3="rec${ph === 'read1' ? 1 : 2}" data-primary>${ic('pencil')} Записать ${kbd('Enter')}</button></div>`; }
  if (ph === 'vent') return `<p class="say">h₁ = <b>${l3Fix(V.cur.h1, 0)} мм</b> записано. Открой кран <b>K₀</b> и закрой его, как только давление сравняется с атмосферным: уровни выровняются, шипение прекратится.</p>
      <div class="ctl"><button class="btn" data-l3="k0open" data-key="O" ${S.k0Open ? 'disabled' : ''}>Открыть K₀ ${kbd('O')}</button><button class="btn line" data-l3="k0close" data-key="O" ${S.k0Open ? '' : 'disabled'}>Закрыть K₀ ${kbd('O')}</button></div>`;
  if (ph === 'vented') return `<p class="say">Кран K₀ закрыт. Запусти секундомер и выжди <b>1 минуту</b>, пока газ нагреется до комнатной температуры.</p>
      <div class="ctl"><button class="btn big" data-l3="startSw" data-primary>${ic('timer')} Пуск секундомера ${kbd('Enter')}</button></div>`;
  return '';
}
function wProc(S) {
  const o = l3Calc(), P = S.proc, cls = k => S.procOk[k] === true ? 'ok' : S.procOk[k] === false ? 'bad' : '', I = k => inp('p_' + k, P[k], cls(k));
  const all = L3_KEYS.every(k => S.procOk[k] === true), bad = L3_KEYS.filter(k => S.procOk[k] === false).length;
  const fl = (lab, k) => `<div class="flab"><span>${lab}</span>${I(k)}</div>`;
  return head(S, all ? `<span class="pill ok">${ic('circle-check')} всё верно</span>` : bad ? `<span class="pill bad">ошибок: ${bad}</span>` : '') + `<div class="grid2">
    <div><section class="card"><h2>${ic('grid-3x3')} Таблица 1 · показатель адиабаты</h2><p class="mute small">γᵢ = h₁/(h₁ − h₂) — с точностью до 0,001. Дробную часть можно писать через запятую.</p>
      <table class="t"><tr><th>№</th><th>h₁, мм</th><th>h₂, мм</th><th>γᵢ</th></tr>${o.a.map((x, i) => `<tr><td>${i + 1}</td><td>${x.h1}</td><td>${x.h2}</td><td>${I('g' + (i + 1))}</td></tr>`).join('')}
      <tr class="sum"><td colspan="3">Среднее ⟨γ⟩ = Σγᵢ / N</td><td>${I('gm')}</td></tr></table></section>
    <section class="card"><h2>${ic('target')} Погрешности и теория</h2>
      ${fl('<span class="m">⟨Δγ⟩</span> — средняя абсолютная погрешность', 'dg')}${fl('<span class="m">ε<sub>γ</sub></span> — относительная погрешность, %', 'eg')}
      ${fl('<span class="m">γ<sub>T</sub></span> — теоретическое значение для воздуха', 'gT')}${fl('<span class="m">ε</span> — расхождение с теорией, %', 'e')}
      <button class="btn wide big mt ${all ? 'line' : ''}" data-l3="pcheck" ${all ? '' : 'data-primary'}>${ic('circle-check')} Проверить ${all ? '' : kbd('Enter')}</button>
      ${['gm', 'dg'].every(k => S.procOk[k]) ? `<div class="res">γ = ${l3Res(o)}</div>` : ''}
      <p class="lw-msg" id="lw-msg"></p>${all ? nextBtn('К выводам') : '<p class="mute small center">Когда все значения будут верны, откроются выводы.</p>'}</section></div>
    <section class="card sticky"><h2>${ic('book-open')} Расчётные формулы</h2>
      <div class="fcard"><small>Показатель адиабаты в опыте</small><span class="m">γ = h₁ / (h₁ − h₂)</span></div>
      <div class="fcard"><small>Среднее значение</small><span class="m">⟨γ⟩ = Σγᵢ / N</span></div>
      <div class="fcard"><small>Средняя абсолютная погрешность</small><span class="m">⟨Δγ⟩ = Σ|⟨γ⟩ − γᵢ| / √(N(N − 1))</span></div>
      <div class="fcard"><small>Относительная погрешность</small><span class="m">ε<sub>γ</sub> = ⟨Δγ⟩ / ⟨γ⟩ · 100</span></div>
      <div class="fcard"><small>Теория: двухатомный газ, i = 5</small><span class="m">γ<sub>T</sub> = (i + 2) / i</span></div>
      <div class="fcard"><small>Расхождение с теорией</small><span class="m">ε = |γ<sub>T</sub> − ⟨γ⟩| / γ<sub>T</sub> · 100</span></div>
      <p class="mute small">N = 3 — число опытов. Проценты — с точностью до 0,1.</p></section></div>`;
}
function wConcl(S) {
  if (!S.concl) { S.concl = l3AutoConcl(l3Calc()); l3Save(); }
  const n = Object.keys(S.cq).length;
  return head(S, S.cqOk ? `<span class="pill ok">${ic('circle-check')} защита принята</span>` : '') + `<div class="grid2 even">
    <section class="card sticky"><h2>${ic('pencil')} Выводы</h2><p class="mute small">Черновик собран по твоим результатам. Проверь и допиши своими словами — он попадёт в отчёт.</p>
      <textarea class="inp l3i" data-k3="concl" rows="12">${esc(S.concl)}</textarea>
      <button class="btn line wide mt" data-l3="reconcl">${ic('rotate-ccw')} Собрать черновик заново</button></section>
    <section class="card"><h2>${ic('graduation-cap')} Контрольные вопросы <span class="pill ${n === L3_CQ.length ? 'ok' : ''}">${n} из ${L3_CQ.length}</span></h2><p class="mute small">Защита работы: нужно не меньше 6 верных ответов.</p>
      ${quiz(L3_CQ, S, 'cq', 90, 'cq')}
      <button class="btn wide big ${S.cqOk ? 'line' : ''}" data-l3="cqCheck" ${S.cqOk ? '' : 'data-primary'}>${ic('circle-check')} Проверить ответы ${S.cqOk ? '' : kbd('Enter')}</button>${S.cqOk ? nextBtn('К отчёту') : ''}</section></div>`;
}
function wReport(S) {
  const o = l3Calc();
  const f = (k, lab, ph) => `<label class="field">${lab}<input class="l3i" data-k3="${k}" value="${esc(S[k] || '')}" placeholder="${ph}" autocomplete="off"></label>`;
  return head(S) + `<div class="rep"><div class="sticky">
    <section class="card"><div class="done-badge">${ic('trophy')}<div><b>Работа выполнена</b><span class="mute small">γ = ${l3Res(o)} · ε = ${f1(o.e, 1)} %</span></div></div>
      <div style="display:grid; gap:10px">${f('fio', 'ФИО', 'Иванов И. И.')}${f('group', 'Класс / группа', '')}${f('date', 'Дата', 'дд.мм.гггг')}</div>
      ${S.dx && S.dx.submitted ? `<p class="pill ok mt">${ic('circle-check')} Работа сдана ${new Date(S.dx.submitted).toLocaleString('ru-RU', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}</p>` : ''}
      <button class="btn wide big mt" data-d="submit" ${S.dx && S.dx.submitted ? '' : 'data-primary'}>${ic('graduation-cap')} ${IS_TAURI && FOLDER ? 'Сдать работу в папку класса' : 'Сохранить файл для преподавателя'} ${S.dx && S.dx.submitted ? '' : kbd('Enter')}</button>
      ${IS_TAURI && FOLDER ? `<p class="mute small">Папка: ${esc(FOLDER)}</p><button class="btn ghost wide" data-d="save">${ic('file-text')} Сохранить копию файла ${kbd('Ctrl+S')}</button>` : ''}
      <div class="row mt"><button class="btn line" data-d="pdf">${ic('file-text')} Сохранить PDF</button><button class="btn line" data-l3="print">${ic('printer')} Печать ${kbd('Ctrl+P')}</button></div>
      <button class="btn line wide mt" data-l3="restart">${ic('rotate-ccw')} Выполнить работу заново</button></section></div>
    <div class="paper" id="d-paper">${l3ReportHtml()}</div></div>`;
}

/* ---------- живые показания, график давления, звук ---------- */
const CH = { t: 0, acc: 0, pts: [], marks: [], prev: '' };
const _l3Step = l3Step;
l3Step = function (dt) {               // тот же шаг модели + запись истории для графика
  _l3Step(dt); CH.t += dt; CH.acc += dt;
  if (CH.acc >= .1) { CH.acc = 0; CH.pts.push([CH.t, L3V.p, L3V.th]); if (CH.pts.length > 6000) CH.pts.splice(0, 2000); }
};
function procName() {
  const S = L3S, V = L3V; if (!S) return '—';
  if (V.pump && S.kOpen && !S.k0Open) return 'сжатие (накачка)';
  if (S.k0Open) return V.hiss > .05 ? 'адиабатное расширение' : 'сообщается с атмосферой';
  if (S.kOpen) return V.th > .0003 ? 'изохорное охлаждение' : 'равновесие';
  return V.th > .0003 ? 'изохорное охлаждение' : V.th < -.0003 ? 'изохорное нагревание' : 'равновесие';
}
let liveRaf = 0;
function liveTick(start) {
  if (start) { if (liveRaf) return; }
  const cv = $('#l3-cv'); if (!cv) { liveRaf = 0; sndTick(false); return; }
  const V = L3V, S = L3S;
  if (CH.prev === 'read1' && V.phase === 'vent' && V.cur.h1 != null) CH.marks.push([CH.t, V.cur.h1, 'h₁']);
  if (CH.prev === 'read2' && V.phase !== 'read2' && S.runs.length) CH.marks.push([CH.t, S.runs[S.runs.length - 1].h2, 'h₂']);
  CH.prev = V.phase;
  const set = (id, v) => { const e = document.getElementById(id); if (e && e.textContent !== v) e.textContent = v; };
  set('d-h', String(Math.round(V.p))); set('d-sw', S && S.power ? l3Fix(V.sw, 1) + ' с' : 'выкл'); set('d-proc', procName());
  const pb = $('#d-pbar'); if (pb) pb.style.width = Math.min(100, V.p / 240 * 100) + '%';
  const wb = $('#d-wbar'); if (wb) wb.style.width = Math.min(100, V.sw / L3.wait * 100) + '%';
  const hb = $('#l3-pump'); if (hb) hb.classList.toggle('pressed', !!V.pump);
  drawChart(); sndTick(true);
  liveRaf = requestAnimationFrame(() => liveTick(false));
}
let CHC = null;   // цвета графика из темы (обновляются при смене темы)
const chartColors = () => { const th = document.documentElement.dataset.theme; if (!CHC || CHC.th !== th) { const v = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim(); CHC = { th, grid: v('--line'), tx: v('--mute'), ok: v('--ok-soft'), h: v('--cold'), t: v('--acc'), mark: v('--tx') }; } return CHC; };
function drawChart() {
  const cv = $('#d-chart'); if (!cv) return; const K = chartColors();
  const W = cv.clientWidth, H = cv.clientHeight, dpr = Math.min(2, devicePixelRatio || 1);
  if (cv.width !== Math.round(W * dpr)) { cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); }
  const c = cv.getContext('2d'); c.setTransform(dpr, 0, 0, dpr, 0, 0); c.clearRect(0, 0, W, H);
  const span = 150, t1 = Math.max(CH.t, span), t0 = t1 - span, L = 34, R = W - 8, T = 6, B = H - 18;
  const X = t => L + (t - t0) / span * (R - L), Y = p => B - Math.max(-10, Math.min(250, p)) / 250 * (B - T);
  c.fillStyle = K.ok; c.fillRect(L, Y(220), R - L, Y(210) - Y(220));
  c.strokeStyle = K.grid; c.lineWidth = 1; c.fillStyle = K.tx; c.font = '600 10px "Golos UI"'; c.textAlign = 'right'; c.textBaseline = 'middle';
  for (let p = 0; p <= 250; p += 50) { c.beginPath(); c.moveTo(L, Y(p)); c.lineTo(R, Y(p)); c.stroke(); c.fillText(p, L - 6, Y(p)); }
  c.textAlign = 'center'; c.textBaseline = 'top';
  for (let s = Math.ceil(t0 / 30) * 30; s <= t1; s += 30) { const x = X(s); c.beginPath(); c.moveTo(x, T); c.lineTo(x, B); c.stroke(); c.fillText(Math.round(s) + ' с', x, B + 4); }
  const pts = CH.pts.filter(q => q[0] >= t0 - 1);
  if (pts.length > 1) {
    c.strokeStyle = K.t; c.lineWidth = 1.5; c.setLineDash([4, 3]); c.beginPath();
    pts.forEach(([t, , th], i) => { const y = Y(120 + th / .006 * 100); i ? c.lineTo(X(t), y) : c.moveTo(X(t), y); }); c.stroke(); c.setLineDash([]);
    c.globalAlpha = .14; c.beginPath(); pts.forEach(([t, p], i) => i ? c.lineTo(X(t), Y(p)) : c.moveTo(X(t), Y(p))); c.lineTo(X(pts[pts.length - 1][0]), B); c.lineTo(X(pts[0][0]), B); c.closePath(); c.fillStyle = K.h; c.fill(); c.globalAlpha = 1;
    c.strokeStyle = K.h; c.lineWidth = 2.2; c.beginPath(); pts.forEach(([t, p], i) => i ? c.lineTo(X(t), Y(p)) : c.moveTo(X(t), Y(p))); c.stroke();
  }
  CH.marks.filter(m => m[0] >= t0).forEach(([t, h, lab]) => { const x = X(t), y = Y(h); c.fillStyle = K.t; c.beginPath(); c.arc(x, y, 4, 0, 7); c.fill(); c.fillStyle = K.mark;
    c.font = '700 11px "Golos UI"'; c.textAlign = 'left'; c.textBaseline = 'bottom'; c.fillText(`${lab} = ${h}`, x + 6, y - 3); });
}
const SND = { on: store.get('lw3d-sound', false), ctx: null, hum: null, hiss: null };
function sndInit() {
  if (SND.ctx || !SND.on) return;
  try {
    const C = new (window.AudioContext || window.webkitAudioContext)();
    const buf = C.createBuffer(1, C.sampleRate * 2, C.sampleRate), d = buf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const src = C.createBufferSource(); src.buffer = buf; src.loop = true;
    const hp = C.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 2200; const hg = C.createGain(); hg.gain.value = 0;
    src.connect(hp).connect(hg).connect(C.destination); src.start();
    const o = C.createOscillator(); o.type = 'sawtooth'; o.frequency.value = 92; const lp = C.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 380; const og = C.createGain(); og.gain.value = 0;
    o.connect(lp).connect(og).connect(C.destination); o.start();
    Object.assign(SND, { ctx: C, hiss: hg, hum: og });
  } catch (e) { SND.ctx = null; }
}
function sndTick(active) {
  if (!SND.ctx) return; const t = SND.ctx.currentTime, on = SND.on && active && L3S;
  SND.hum.gain.setTargetAtTime(on && L3V.pump && L3S.kOpen && !L3S.k0Open ? .05 : 0, t, .04);
  const hs = Number.isFinite(L3V.hiss) ? Math.min(.22, L3V.hiss * .25) : 0;   // при dt = 0 модель даёт 0/0
  SND.hiss.gain.setTargetAtTime(on ? hs : 0, t, .03);
}

/* ---------- файл результата ---------- */
/* packResult, unpackResult, safeName — в result.js (общий с программой для Android) */
async function saveFile(name, text, ext, label) {
  if (IS_TAURI) {
    try { const p = await window.__TAURI__.core.invoke('save_file', { name, contents: text, ext, label }); if (p) toast(`${ic('circle-check')} Сохранено: ${esc(p)}`); return !!p; }
    catch (e) { toast('Не удалось сохранить файл: ' + esc(String(e)), 'bad'); return false; }
  }
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type: 'application/octet-stream' })); a.download = name;
  document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  toast(`${ic('circle-check')} Файл «${esc(name)}» сохранён в загрузки`); return true;
}
function saveWork() {
  const S = curLab().load(); ensureMeta(S);
  return saveFile(workFileName(S), packResult(), 'lw3', 'Файл работы');
}
function pickFiles(mode) { const i = $('#file-in'); i.value = ''; i.multiple = mode === 'teacher'; i.click(); }
const readFile = f => new Promise((ok, no) => { const r = new FileReader(); r.onload = () => ok(String(r.result)); r.onerror = () => no(r.error); r.readAsText(f, 'utf-8'); });
$('#file-in').addEventListener('change', async e => {
  const files = Array.from(e.target.files || []); if (!files.length) return;
  if (SCREEN === 'teacher') return teacherAdd(files);
  continueFrom(await readFile(files[0]));
});
function continueFrom(text) {
  const r = unpackResult(text);
  if (r.err) return toast(r.err, 'bad');
  if (!r.ok) return toast('Файл изменён вручную — продолжить по нему нельзя.', 'bad');
  if (r.d.kind === 'exam') return toast('Это файл результата экзамена — его открывает преподаватель в режиме преподавателя.', 'bad');
  const S = r.d.state; if (S.v !== 1) return toast('Файл от другой версии работы.', 'bad');
  const fio = (S.fio || r.d.student.fio || 'Курсант').trim(), group = (S.group || r.d.student.group || '').trim();
  let p = profiles().find(x => x.fio.toLowerCase() === fio.toLowerCase() && (x.group || '') === group);
  if (p) { const cur = profileState(p); if (cur && (cur.max || 0) > (S.max || 0) && !confirm(`У «${fio}» на этом компьютере работа продвинута дальше. Заменить её работой из файла?`)) return; }
  else p = addProfile(fio, group);
  store.set(LABS[r.d.lab || 3].key(p.id), S); toast(`Работа «${esc(fio)}» загружена из файла`); openProfile(p, false, r.d.lab || 3);
}

/* ---------- окна ---------- */
function modal(title, body, actions = '') {
  const m = $('#modal'); m.innerHTML = `<div class="mbox"><header><h2>${title}</h2>${actions}<button class="btn line" data-d="mclose">${ic('x')} ${kbd('Esc')}</button></header><div class="mb">${body}</div></div>`; m.hidden = false;
}
function closeModal() { const m = $('#modal'); m.hidden = true; m.innerHTML = ''; if (SCREEN === 'work' && PROFILE) { const L = curLab(), S = L.S(); if (S && L.steps[S.step][0] === 'report') $('#printroot').innerHTML = L.report(); } }
/* Знакомство: 4 слайда после первого входа, потом — по F1 */
const INTRO = [
  { t: 'Добро пожаловать в «Физпрактикум»', p: 'Слева — разделы программы: лабораторные работы, тесты и экзамены, результаты, профиль. Всё сохраняется само — можно закрыть программу и продолжить потом.',
    art: () => `<div class="isteps">${[['Работы', '8 лабораторных'], ['Тесты', '900 вопросов'], ['Экзамены', 'по темам и итоговый'], ['Результаты', 'файлы для преподавателя']].map(([b, sm], i) => `<div><i>${i + 1}</i><b>${b}</b><small>${sm}</small></div>`).join('')}</div>` },
  { t: 'Как проходит лабораторная работа', p: 'Шаги идут по порядку: следующий открывается, когда выполнен предыдущий. Порядок выполнения по методичке всегда под рукой — кнопка «Ход работы» (клавиша H).',
    art: () => `<div class="isteps">${[['Допуск', '8 вопросов'], ['Подготовка', 'установка и приборы'], ['Опыты', 'измерения'], ['Обработка', 'таблицы и расчёты'], ['Защита', 'выводы и вопросы'], ['Отчёт', 'печать или PDF']].map(([b, sm], i) => `<div><i>${i + 1}</i><b>${b}</b><small>${sm}</small></div>`).join('')}</div>` },
  { t: 'Клавиши', p: 'Мышью тоже можно, но клавишами быстрее. Подсвеченная кнопка с Enter — главное действие на экране.',
    art: () => `<div class="keys">${[['Enter', 'главное действие'], ['1 – 4', 'ответ в тесте'], ['Ctrl+S', 'сохранить файл работы'], ['H', 'ход работы (порядок по методичке)'], ['Пробел', 'компрессор (ЛР 3)'], ['F1', 'это знакомство'], ['Ctrl + / −', 'крупнее / мельче (Ctrl 0 — как было)'], ['F11', 'во весь экран']].map(([k, t]) => `${kbd(k)}<span>${t}</span>`).join('')}</div>` },
  { t: 'Как сдать работу', p: 'В конце работы нажми «Сохранить файл для преподавателя» (Ctrl+S) и передай файл на флешке или через общую папку. Результат экзамена сохраняется так же — в разделе «Мои результаты».', art: () => introFile() }
];
let INTRO_AT = 0;
function showIntro(i = 0) {
  INTRO_AT = Math.max(0, Math.min(INTRO.length - 1, i)); const s = INTRO[INTRO_AT], last = INTRO_AT === INTRO.length - 1, m = $('#modal');
  m.innerHTML = `<div class="intro" data-intro><div class="intro-art">${s.art()}</div><div class="intro-tx"><h2>${s.t}</h2><p>${s.p}</p></div>
    <div class="intro-ft"><div class="dots">${INTRO.map((_, j) => `<i class="${j === INTRO_AT ? 'on' : ''}"></i>`).join('')}</div>
    ${last ? '' : '<button class="btn ghost" data-d="intro-skip">Пропустить</button>'}${INTRO_AT ? '<button class="btn line" data-d="intro-prev">Назад</button>' : ''}
    <button class="btn" data-d="intro-next">${last ? 'Начать' : 'Дальше'} ${kbd('Enter')}</button></div></div>`;
  m.hidden = false;
}
const introOpen = () => !$('#modal').hidden && !!$('#modal [data-intro]');
function introRig() {
  // схема сдвинута вправо на 170; подписи — слева (K₀, K, Н) и справа (М, Б), линия-выноска к детали
  const L = (y, t, d, ax, ay) => `<path d="M150 ${y} H${ax - 14} L${ax} ${ay}" fill="none" stroke="var(--line2)" stroke-width="1.5"/><circle cx="${ax}" cy="${ay}" r="4" fill="var(--acc)"/>
    <text x="140" y="${y - 3}" text-anchor="end" font-size="16" font-weight="800" fill="var(--tx)">${t}</text><text x="140" y="${y + 15}" text-anchor="end" font-size="12.5" fill="var(--mute)">${d}</text>`;
  const R = (y, t, d, ax, ay) => `<path d="M${ax} ${ay} L${ax + 14} ${y} H650" fill="none" stroke="var(--line2)" stroke-width="1.5"/><circle cx="${ax}" cy="${ay}" r="4" fill="var(--acc)"/>
    <text x="660" y="${y - 3}" font-size="16" font-weight="800" fill="var(--tx)">${t}</text><text x="660" y="${y + 15}" font-size="12.5" fill="var(--mute)">${d}</text>`;
  return `<svg viewBox="0 0 860 250" font-family="Golos UI" width="860">
    <g transform="translate(170 0)">
    <path d="M30 40 H400 V62 M90 40 V170 M220 40 V62" fill="none" stroke="var(--line2)" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M202 60 H238 V72 C290 82 294 120 290 230 H150 C146 120 150 82 202 72 Z" fill="var(--cold-soft)" stroke="var(--cold)" stroke-width="2"/>
    <text x="220" y="180" text-anchor="middle" font-size="20" font-weight="800" fill="var(--tx)">Б</text>
    <rect x="60" y="170" width="60" height="52" rx="8" fill="var(--panel2)" stroke="var(--line2)"/><text x="90" y="202" text-anchor="middle" font-size="16" font-weight="800" fill="var(--tx)">Н</text>
    <circle cx="90" cy="110" r="10" fill="var(--panel2)" stroke="var(--line2)"/><rect x="73" y="107" width="34" height="6" rx="3" fill="var(--ok)"/>
    <circle cx="30" cy="40" r="10" fill="var(--panel2)" stroke="var(--line2)"/><rect x="27" y="23" width="6" height="34" rx="3" fill="var(--bad)"/>
    <rect x="380" y="62" width="44" height="168" rx="6" fill="var(--panel2)" stroke="var(--line2)"/>
    <rect x="389" y="150" width="8" height="74" fill="var(--cold)"/><rect x="407" y="100" width="8" height="124" fill="var(--cold)"/><rect x="389" y="220" width="26" height="6" fill="var(--cold)"/>
    </g>
    ${L(40, 'K₀', 'кран к атмосфере', 186, 40)}${L(110, 'K', 'кран к компрессору', 246, 110)}${L(200, 'Н', 'компрессор', 230, 200)}
    ${R(90, 'М', 'манометр, h — разность уровней', 594, 120)}${R(190, 'Б', 'стеклянный баллон', 460, 190)}</svg>`;
}
function introFile() {
  return `<svg viewBox="0 0 560 200" font-family="Golos UI" width="560">
    <rect x="30" y="40" width="120" height="130" rx="14" fill="var(--panel)" stroke="var(--line2)" stroke-width="2"/><path d="M118 40 V72 H150" fill="none" stroke="var(--line2)" stroke-width="2"/>
    <text x="90" y="112" text-anchor="middle" font-size="16" font-weight="800" fill="var(--acc)">файл</text><text x="90" y="134" text-anchor="middle" font-size="12" fill="var(--mute)">результата</text>
    <path d="M180 105 H330" stroke="var(--acc)" stroke-width="3" stroke-dasharray="8 8"/><path d="M322 95 L336 105 L322 115" fill="none" stroke="var(--acc)" stroke-width="3"/>
    <text x="255" y="90" text-anchor="middle" font-size="13" fill="var(--tx2)">флешка или общая папка</text>
    <rect x="360" y="40" width="170" height="130" rx="14" fill="var(--panel)" stroke="var(--line2)" stroke-width="2"/>
    ${[0, 1, 2].map(i => `<rect x="378" y="${66 + i * 30}" width="20" height="20" rx="6" fill="var(--ok-soft)"/><path d="M383 ${76 + i * 30} l4 4 l7 -8" fill="none" stroke="var(--ok)" stroke-width="2.5"/><rect x="408" y="${71 + i * 30}" width="${100 - i * 18}" height="10" rx="5" fill="var(--line)"/>`).join('')}
    <text x="445" y="190" text-anchor="middle" font-size="13" fill="var(--tx2)">преподаватель</text></svg>`;
}
async function toggleFull() {
  if (IS_TAURI) { try { await window.__TAURI__.core.invoke('toggle_fullscreen'); } catch (e) {} return; }
  try { if (document.fullscreenElement) await document.exitFullscreen(); else await document.documentElement.requestFullscreen(); } catch (e) {}
}

/* ---------- действия оболочки (data-d) ---------- */
document.addEventListener('click', e => {
  const b = e.target.closest && e.target.closest('[data-d]'); if (!b) return; const d = b.dataset;
  switch (d.d) {
    case 'atab': AUTH = d.v; render(); break;
    case 'acc': ASEL = d.v; render(); break;
    case 'login': { const p = profiles().find(x => x.id === ASEL); if (acctCheck(p, $('#au-pw').value)) { ASEL = ''; openProfile(p); } else { auMsg('Неверный пароль.'); $('#au-pw').select(); } break; }
    case 'setpw': { const a = $('#au-n1').value, c = $('#au-n2').value; if (a.length < 4) { auMsg('Пароль — не короче 4 символов.'); break; } if (a !== c) { auMsg('Пароли не совпадают.'); break; }
      const p = acctSetPw(ASEL, a); ASEL = ''; if (p) { toast('Пароль сохранён'); openProfile(p); } break; }
    case 'register': {
      const fio = $('#np-fio').value.trim(), group = $('#np-group').value.trim(), pw = $('#np-pw').value, pw2 = $('#np-pw2').value, err = acctValidate(fio, group, pw, pw2);
      if (err) { auMsg(err); break; }
      if (!$('#np-eula').checked) { auMsg('Чтобы продолжить, примите условия лицензионного соглашения.'); break; }
      const p = acctSetPw(addProfile(fio, group).id, pw); acctEula(p.id); openProfile(p, true); break;
    }
    case 'import': pickFiles('continue'); break;
    case 'teacher': SCREEN = 'lock'; render(); break;
    case 'home': if (TQ && !TQ.done && TQ.kind === 'exam') break; PROFILE = null; L3S = null; LES = null; TQ = null; SCREEN = 'home'; AUTH = 'in'; render(); break;
    case 'tab': TAB = d.v; render(); break;
    case 'save': saveWork(); break;
    case 'sound': SND.on = !SND.on; store.set('lw3d-sound', SND.on); if (SND.on) sndInit(); render(); break;
    case 'full': toggleFull(); break;
    case 'help': showIntro(0); break;
    case 'intro-next': if (INTRO_AT < INTRO.length - 1) showIntro(INTRO_AT + 1); else closeModal(); break;
    case 'intro-prev': showIntro(INTRO_AT - 1); break;
    case 'intro-skip': closeModal(); break;
    case 'theme': setTheme(isLight() ? 'dark' : 'light'); break;
    case 'mclose': closeModal(); break;
  }
});
$('#modal').addEventListener('click', e => { if (e.target.id === 'modal') closeModal(); });
// учёт попыток (для преподавателя): до обработчика ядра
document.addEventListener('click', e => {
  const b = e.target.closest && e.target.closest('[data-l3]'); if (!b || !L3S || !L3S.dx) return;
  const k = { admitCheck: 'admitTries', pcheck: 'procTries', cqCheck: 'cqTries' }[b.dataset.l3]; if (k) L3S.dx[k] = (L3S.dx[k] || 0) + 1;
  if (b.dataset.l3 === 'cqCheck' && !L3S.dx.finished) setTimeout(() => { if (L3S && L3S.done && !L3S.dx.finished) { L3S.dx.finished = new Date().toISOString(); l3Save(); } }, 0);
}, true);
// отчёт: шапка меняется — обновить лист
document.addEventListener('input', e => {
  const k = e.target.dataset && e.target.dataset.k3; if (!k || !['fio', 'group', 'date'].includes(k)) return;
  clearTimeout(window.__rep); window.__rep = setTimeout(() => { const html = l3ReportHtml(), p = $('#d-paper'); if (p) p.innerHTML = html; $('#printroot').innerHTML = html; }, 250);
});
document.addEventListener('pointerdown', () => sndInit(), { once: false, passive: true });

/* ---------- клавиатура ---------- */
document.addEventListener('keydown', e => {
  const tag = (e.target.tagName || ''), typing = tag === 'INPUT' || tag === 'TEXTAREA';
  if (e.key === 'F1') { e.preventDefault(); if (PROFILE) showIntro(0); return; }
  if (introOpen()) {
    if (e.key === 'Enter' || e.key === 'ArrowRight') { e.preventDefault(); $('[data-d="intro-next"]').click(); }
    else if (e.key === 'ArrowLeft' && INTRO_AT) { e.preventDefault(); showIntro(INTRO_AT - 1); }
    else if (e.key === 'Escape') closeModal();
    return;
  }
  if (e.key === 'F11') { e.preventDefault(); toggleFull(); return; }
  if (e.key === 'F5' || (e.ctrlKey && e.code === 'KeyR')) { e.preventDefault(); return; }
  if (e.key === 'Escape' && !$('#modal').hidden) { closeModal(); return; }
  if (e.ctrlKey && e.code === 'KeyS') { e.preventDefault(); if (SCREEN === 'work' && PROFILE) saveWork(); return; }
  if (e.ctrlKey && e.code === 'KeyP') { e.preventDefault(); if (SCREEN === 'work' && PROFILE) { const L = curLab(), S = L.S(); if (S && L.steps[S.step][0] === 'report') window.print(); } return; }
  if (!$('#modal').hidden) return;
  if (SCREEN === 'home') { if (e.key === 'Enter') { const p = $('[data-primary]'); if (p) { e.preventDefault(); p.click(); } } return; }
  if (SCREEN === 'test') { if (typing) return; const n = +e.key; if (n >= 1 && n <= 4) { const o = document.querySelectorAll('.fz-opt')[n - 1]; if (o && !o.disabled) { e.preventDefault(); o.click(); } return; }
    if (e.key === 'Enter') { const p = $('[data-fz="next"]'); if (p) { e.preventDefault(); p.click(); } } return; }
  if (SCREEN === 'lock') { if (e.key === 'Enter' && e.target.tagName === 'INPUT') { e.preventDefault(); const b = $('[data-t="unlock"],[data-t="setpass"]'); if (b) b.click(); } return; }
  if (SCREEN !== 'work') return;
  if (e.key === 'Enter') { if (tag === 'TEXTAREA') return; const p = $('[data-primary]'); if (p && !p.disabled) { e.preventDefault(); p.click(); } return; }
  if (typing || e.ctrlKey || e.altKey) return;
  if (e.code === 'Space' && $('#l3-pump')) { e.preventDefault(); if (!e.repeat) { sndInit(); L3V.pump = true; } return; }
  const sel = { KeyK: '[data-key="K"]', KeyO: '[data-key="O"]:not([disabled])', KeyP: '[data-key="P"]' }[e.code];
  const b = sel && $(sel); if (b && !b.disabled) { e.preventDefault(); b.click(); }
});
document.addEventListener('keyup', e => { if (e.code === 'Space' && L3V.pump) { e.preventDefault(); L3V.pump = false; const el = $('#l3-h'); if (el) el.textContent = Math.round(L3V.p); } });
window.addEventListener('blur', () => { L3V.pump = false; });
document.addEventListener('contextmenu', e => { if (!(e.target.closest && e.target.closest('input,textarea'))) e.preventDefault(); });
document.addEventListener('dragover', e => e.preventDefault());
document.addEventListener('drop', e => { e.preventDefault(); const fs = Array.from(e.dataTransfer.files || []).filter(f => /\.lw3$/i.test(f.name)); if (!fs.length) return;
  if (SCREEN === 'teacher') teacherAdd(fs); else if (SCREEN === 'home') readFile(fs[0]).then(continueFrom); });
