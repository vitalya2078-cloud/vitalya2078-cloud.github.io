/* =====================================================================
   «Физпрактикум» для Windows: «О программе», разработчики, правовая информация, лицензионное соглашение.
   Общий код (app-core.js) не меняется — здесь Windows-версия заменяет его функции и окна.
   Текст соглашения — src-tauri/license.txt (он же в установщике), build.py подставляет его в EULA_TXT.
   ===================================================================== */
const AUTHORS = {
  owners: ['Кравченко Виталий Артурович', 'Соколов Василий Владимирович', 'Шевченко Александр Владимирович'],
  short: 'Кравченко В.А., Соколов В.В., Шевченко А.В.',
  devs: [['гв. ст. м-с', 'Кравченко Виталий Артурович'], ['ст. м-с', 'Соколов Василий Владимирович'], ['ефр.', 'Шевченко Александр Владимирович']],
  devsNote: 'Курсанты 103 класса 1 факультета',
  adviser: 'Жидкова Екатерина Юрьевна', adviserShort: 'к.т.н., доцент Жидкова Е.Ю.',
  adviserFull: 'кандидат технических наук, доцент кафедры физики и общетехнических дисциплин',
};
ORG.copy = `© 2026 ${AUTHORS.short}`;

function aboutHtml() {
  return `<div class="fz-about">
    <div class="fz-ab-head">${LOGO}<div><h1>Физпрактикум</h1><p>Виртуальный лабораторный практикум по физике</p></div></div>
    <section class="fz-ab-card"><p class="fz-ab-org">${esc(ORG.school)}</p><p class="fz-ab-dept">${esc(ORG.dept)}</p>
      <p>Здесь выполняются лабораторные работы по физике: допуск, опыты на виртуальной установке, обработка результатов, отчёт и защита. В программе есть конспекты и видеоуроки по темам курса, самопроверка и экзамены.</p>
      <div class="fz-ab-grid"><div><b>8</b><span>лабораторных работ по методическим указаниям кафедры</span></div><div><b>9</b><span>тем курса с конспектами и видеоуроками</span></div><div><b>900</b><span>вопросов для самопроверки и экзаменов</span></div></div></section>
    <footer class="fz-ab-foot">
      <p class="fz-copy">${esc(ORG.copy)}<br>Разработано для ЧВВМУ им. П.С. Нахимова, кафедра физики и общетехнических дисциплин</p>
      <p class="fz-adv">Научный руководитель и консультант: ${esc(AUTHORS.adviserShort)}</p>
      <div class="fz-ab-links"><button class="fz-devs" data-fz="devs">Разработчики</button><button class="fz-devs" data-fz="legal">Правовая информация</button><button class="fz-devs" data-fz="eula">Лицензионное соглашение</button></div>
      <p class="fz-ver-s">Версия ${esc(APP_VER)}</p>
    </footer></div>`;
}
const devsWin = () => `<div class="fz-devlist"><p class="mute">${esc(AUTHORS.devsNote)}</p>
  ${AUTHORS.devs.map(([r, n]) => `<div class="fz-dev">${ava(n)}<span><small>${esc(r)}</small><b>${esc(n)}</b></span></div>`).join('')}
  <p class="fz-h" style="margin:14px 2px 4px">Научный руководитель и консультант</p>
  <div class="fz-dev">${ava(AUTHORS.adviser)}<span><small>${esc(AUTHORS.adviserFull)}</small><b>${esc(AUTHORS.adviser)}</b></span></div></div>`;
const legalWin = () => `<div class="fz-legal">
  <p><b>Правообладатели.</b> ${AUTHORS.owners.map(esc).join(', ')}.</p>
  <p><b>Научный руководитель и консультант.</b> ${esc(AUTHORS.adviser)}, ${esc(AUTHORS.adviserFull)}.</p>
  <p><b>Назначение.</b> Программа разработана для учебного процесса ${esc(ORG.school)}. Порядок использования определяет кафедра физики и общетехнических дисциплин. Вне училища программой можно пользоваться только с разрешения кафедры.</p>
  <p><b>Учебные материалы.</b> Лабораторные работы выполнены по методическим указаниям кафедры, вопросы тестов предоставлены кафедрой. Конспекты и видеоуроки подготовлены для программы и предназначены только для учебных целей.</p>
  <p><b>Данные.</b> Учётные записи, пароли (в виде хеша) и результаты хранятся только на этом компьютере и по сети не передаются. Файлы результатов защищены цифровой подписью: программа сразу видит, если результат изменён.</p>
  <p><b>Озвучка видеоуроков.</b> Синтезатор речи Piper (лицензия MIT), голос «Irina» из открытого набора голосов Piper.</p>
  <p><b>Сторонние компоненты.</b> Tauri (MIT, Apache 2.0), KaTeX (MIT), шрифты Golos UI и STIX Two (SIL Open Font License 1.1), значки Lucide (ISC). Среда Microsoft Edge WebView2 распространяется по условиям лицензии Microsoft.</p>
  <p><b>Вопросы.</b> Кафедра физики и общетехнических дисциплин ${esc(ORG.school)}.</p>
  <p><button class="btn line" data-fz="eula">Лицензионное соглашение</button></p></div>`;
/* соглашение из текста: заголовки разделов «N. …», пункты «N.N. …», списки «- …» */
function eulaHtml() {
  const L = String(typeof EULA_TXT === 'string' ? EULA_TXT : '').replace(/\r/g, '').split('\n'); let h = '', ul = false;
  const close = () => { if (ul) { h += '</ul>'; ul = false; } };
  L.forEach((ln, i) => { const t = ln.trim(); if (!t) { close(); return; }
    if (i === 0) h += `<h3 class="fz-eu-t">${esc(t)}</h3>`;
    else if (i < 4) h += `<p class="fz-eu-s">${esc(t)}</p>`;
    else if (/^\d+\.\s/.test(t)) { close(); h += `<h4>${esc(t)}</h4>`; }
    else if (/^- /.test(t)) { if (!ul) { h += '<ul>'; ul = true; } h += `<li>${esc(t.slice(2))}</li>`; }
    else { close(); h += `<p>${esc(t)}</p>`; } });
  close(); return `<div class="fz-eula">${h}</div>`;
}
// окна «Разработчики», «Правовая информация», «Лицензионное соглашение» — раньше обработчика общего кода
document.addEventListener('click', e => {
  const b = e.target.closest && e.target.closest('[data-fz="devs"],[data-fz="legal"],[data-fz="eula"]'); if (!b) return;
  e.stopImmediatePropagation(); e.preventDefault();
  const v = b.dataset.fz;
  if (v === 'devs') fzModal('Разработчики', devsWin());
  else if (v === 'legal') fzModal('Правовая информация', legalWin());
  else fzModal('Лицензионное соглашение', eulaHtml());
}, true);
