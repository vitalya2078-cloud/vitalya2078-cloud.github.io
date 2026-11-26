/* =====================================================================
   «Физпрактикум» для Windows: лицензия. Программа работает только на компьютере, для которого кафедра выдала ключ.
   Проверку делает сама программа (src-tauri/src/license.rs): код компьютера, подпись ключа, срок, перевод часов.
   Здесь — окно активации и показ срока действия (до какого числа и сколько дней осталось).
   В браузере (проверки, разработка) лицензия не требуется.
   ===================================================================== */
let LIC = IS_TAURI ? null : { enforced: false, state: 'ok', code: '', expires: '', days_left: -1 };
const LIC_WARN = 30;   // за сколько дней до окончания предупреждать
const daysWord = n => { const a = Math.abs(n) % 100, b = a % 10; return a > 10 && a < 20 ? 'дней' : b === 1 ? 'день' : b >= 2 && b <= 4 ? 'дня' : 'дней'; };
const licDate = s => s ? new Date(s + 'T00:00:00').toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' }) : '';
/* строка срока: «бессрочно» или «до 30 июня 2027 г. · осталось 216 дней» */
function licText(L = LIC) {
  if (!L || !L.enforced) return '';
  if (L.state !== 'ok') return 'не активирована';
  if (!L.expires) return 'бессрочно';
  return L.days_left === 0 ? `до ${licDate(L.expires)} · последний день` : `до ${licDate(L.expires)} · осталось ${L.days_left} ${daysWord(L.days_left)}`;
}
const licSoon = () => LIC && LIC.enforced && LIC.state === 'ok' && LIC.expires && LIC.days_left <= LIC_WARN;
async function licRefresh() {
  if (window.FZ_LIC_MOCK) { LIC = window.FZ_LIC_MOCK; render(); return; }
  if (!IS_TAURI) return;
  try { LIC = await tauri('license_status', { folders: FOLDER ? [FOLDER] : [] }); } catch (e) { LIC = { enforced: true, state: 'none', code: '', expires: '', days_left: 0 }; }
  render();
}
const licBlocked = () => LIC === null || (LIC.enforced && LIC.state !== 'ok');
function vLicense() {
  document.body.classList.add('noside'); document.body.classList.remove('full', 'fzapp'); ui.side.innerHTML = '';
  if (LIC === null) { ui.main.innerHTML = ''; return; }
  const why = { none: 'Программа ещё не активирована на этом компьютере.', expired: `Срок действия ключа закончился ${licDate(LIC.expires)}.`,
    clock: 'Дата на компьютере переведена назад. Установите правильную дату и перезапустите программу.' }[LIC.state] || '';
  ui.main.innerHTML = `<div class="login fz-login"><div class="login-box fz-lic">
    <div class="login-brand">${LOGO}<h1>Активация</h1><p>${esc(why)}</p></div>
    <div class="card">
      <label class="field">Код этого компьютера<div class="fz-lcode"><b id="lic-code">${esc(LIC.code)}</b><button class="btn line" data-d="lic-copy">${ic('copy')} Копировать</button></div></label>
      <p class="mute small">Передайте этот код на кафедру физики и общетехнических дисциплин. Кафедра выдаст ключ для этого компьютера.</p>
      <label class="field">Ключ активации<textarea id="lic-key" rows="3" spellcheck="false" placeholder="FZK-..."></textarea></label>
      <button class="btn wide big mt" data-d="lic-go" data-primary>Активировать ${kbd('Enter')}</button>
      <button class="btn ghost wide" data-d="lic-file">${ic('file-text')} Открыть файл лицензии (license.fzl)</button>
      <p class="fz-msg" id="lic-msg"></p>
      <p class="mute small">Файл лицензии класса можно также положить рядом с программой или в общую папку класса: программа найдёт свой ключ сама.</p>
    </div></div>
    <input type="file" id="lic-in" accept=".fzl,.txt" hidden>
    <div class="corner bl">Версия ${esc(APP_VER)}</div></div>`;
  setTimeout(() => { const f = $('#lic-key'); if (f) f.focus(); }, 0);
}
async function licActivate(text) {
  const m = $('#lic-msg'); if (!text.trim()) { m.textContent = 'Вставьте ключ.'; return; }
  try {
    LIC = window.FZ_LIC_MOCK_ACTIVATE ? window.FZ_LIC_MOCK_ACTIVATE(text) : await tauri('license_activate', { text });
    toast(`Программа активирована${LIC.expires ? `: ${licText()}` : ''}`); SCREEN = 'home'; render();
  } catch (e) { m.textContent = String(e && e.message || e); }
}
document.addEventListener('click', e => {
  const b = e.target.closest && e.target.closest('[data-d^="lic-"]'); if (!b || !licBlocked()) return;
  e.stopImmediatePropagation();
  if (b.dataset.d === 'lic-copy') { navigator.clipboard.writeText(LIC.code).then(() => toast('Код скопирован')).catch(() => {}); }
  else if (b.dataset.d === 'lic-go') licActivate($('#lic-key').value);
  else if (b.dataset.d === 'lic-file') { const i = $('#lic-in'); i.value = ''; i.click(); }
}, true);
document.addEventListener('change', async e => { if (e.target.id !== 'lic-in' || !e.target.files[0]) return; licActivate(await e.target.files[0].text()); });
document.addEventListener('keydown', e => { if (licBlocked() && e.key === 'Enter' && !e.shiftKey && e.target.id === 'lic-key') { e.preventDefault(); e.stopImmediatePropagation(); licActivate(e.target.value); } }, true);

/* без лицензии — только окно активации; с лицензией — обычная программа */
const renderApp = render;
render = function () { if (licBlocked()) return vLicense(); renderApp(); licDecorate(); };
/* срок действия: на экране входа, в «О программе», предупреждение на главной */
function licDecorate() {
  if (!LIC || !LIC.enforced) return;
  const t = licText();
  const bl = document.querySelector('.login .corner.bl'); if (bl && !bl.querySelector('.fz-lic-s')) bl.insertAdjacentHTML('beforeend', ` · <span class="fz-lic-s">Лицензия ${esc(t)}</span>`);
  const v = document.querySelector('.fz-ab-foot .fz-ver-s'); if (v && !v.querySelector('.fz-lic-s')) v.insertAdjacentHTML('beforeend', ` · <span class="fz-lic-s">лицензия ${esc(t)}</span>`);
  if (licSoon() && SCREEN === 'labs' && PAGE === 'main' && !document.querySelector('.fz-licwarn')) {
    const ph = document.querySelector('.fz-page .fz-ph');
    if (ph) ph.insertAdjacentHTML('afterend', `<div class="fz-licwarn">${ic('timer')}<span>Лицензия программы на этом компьютере действует ${esc(t)}. Чтобы продлить, обратитесь на кафедру.</span></div>`);
  }
}
licRefresh();
