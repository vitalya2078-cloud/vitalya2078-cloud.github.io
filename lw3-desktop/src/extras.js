/* =====================================================================
   Дополнения программы: тема установки, масштаб, PDF одной кнопкой,
   общая папка для сдачи работ, время шагов, подсказки в обработке, новая версия.
   ===================================================================== */
const tauri = (cmd, args) => window.__TAURI__.core.invoke(cmd, args);

/* ---------- тема установки: рисунок общий с сайтом, палитра и фон по теме ---------- */
const BG = { dark: null, light: null }, BG2 = { dark: null, light: null };   // BG2 — фон без формул для ЛР 1, 2…
function sceneTheme() { L3_THEME = isLight() ? 'light' : 'dark'; L3_BG = BG[L3_THEME]; L2_BG = BG2[L3_THEME]; if ($('#l3-cv')) l3Draw(); if ($('#lw-cv')) lwDraw(); if ($('#l2-cv')) l2Draw(); if ($('#le-cv')) leDraw(); }
function loadBg(cfg, key, to = BG) { if (!cfg) return; const im = new Image(); im.onload = () => { to[key] = Object.assign(im, { edge: cfg.edge, top: cfg.top }); sceneTheme(); }; im.src = cfg.src; }
loadBg(LAB_BG, 'dark'); loadBg(LAB_BG_LIGHT, 'light'); loadBg(LAB_BG2, 'dark', BG2); loadBg(LAB_BG2_LIGHT, 'light', BG2); sceneTheme();
['compressor', 'valve', 'cork', 'stopwatch', 'bottle', 'manometer', 'lens', 'puck-steel', 'puck-brass', 'launcher', 'cross', 'cyl', 'pulley', 'hanger', 'plate', 'magnet', 'psu', 'generator', 'multimeter', 'miniblock', 'magnetron', 'coil', 'helmholtz', 'compass'].forEach(k => { const im = new Image(); im.onload = () => { L3_SPR[k] = im; if (k === 'bottle') L3D.mol = null; if ($('#l3-cv')) l3Draw(); if ($('#lw-cv')) lwDraw(); if ($('#l2-cv')) l2Draw(); if ($('#le-cv')) leDraw(); };   /* бутылка — другой контур: молекулы заново */ im.src = `img/parts/${k}.webp`; });   // приборы-картинки
const _setTheme = setTheme;
setTheme = function (t) { document.documentElement.dataset.theme = t; sceneTheme(); _setTheme(t); };

/* ---------- масштаб интерфейса: Ctrl + / Ctrl − / Ctrl 0, запоминается ---------- */
let ZOOM = store.get('lw3d-zoom', 1);
function applyZoom(show) {
  ZOOM = Math.round(Math.min(1.6, Math.max(.7, ZOOM)) * 10) / 10; store.set('lw3d-zoom', ZOOM);
  if (IS_TAURI) tauri('set_zoom', { scale: ZOOM }).catch(() => {}); else document.documentElement.style.zoom = ZOOM === 1 ? '' : String(ZOOM);
  if (show) toast(`Масштаб ${Math.round(ZOOM * 100)} %`);
}
applyZoom(false);
document.addEventListener('keydown', e => {
  if (!e.ctrlKey || e.altKey) return;
  const d = { Equal: .1, NumpadAdd: .1, Minus: -.1, NumpadSubtract: -.1 }[e.code];
  if (d) { e.preventDefault(); ZOOM += d; applyZoom(true); }
  else if (e.code === 'Digit0' || e.code === 'Numpad0') { e.preventDefault(); ZOOM = 1; applyZoom(true); }
}, true);

/* ---------- PDF одной кнопкой (WebView2); иначе — окно печати ---------- */
const pdfName = S => `Отчёт_ЛР${LAB}_${safeName(S && S.fio) || 'курсант'}.pdf`;
async function savePdf(name) {
  if (IS_TAURI) {
    try { const p = await tauri('save_pdf', { name }); if (p) toast(`${ic('circle-check')} PDF сохранён: ${esc(p)}`); return; }
    catch (e) { toast(`PDF не сохранился (${esc(String(e))}). Открываю печать — выберите принтер «${/Windows/.test(navigator.userAgent) ? 'Microsoft Print to PDF' : 'Сохранить в PDF'}».`, 'bad'); }
  }
  window.print();
}

/* ---------- общая папка для сдачи работ ---------- */
let FOLDER = store.get('lw3d-folder', ''), FOLDER_FIXED = false;
if (IS_TAURI) tauri('app_config').then(t => { if (!t) return; try { const c = JSON.parse(t); if (c.folder) { FOLDER = String(c.folder); FOLDER_FIXED = true; render(); } } catch (e) {} }).catch(() => {});
const workFileName = S => `ЛР${LAB}_${safeName(S.fio) || 'курсант'}${S.group ? '_' + safeName(S.group) : ''}.lw3`;
async function submitWork(auto) {
  const L = curLab(), S = L.load(); ensureMeta(S); const l3Save = () => L.save();
  if (IS_TAURI && FOLDER) {
    try {
      const p = await tauri('write_lw3', { dir: FOLDER, name: workFileName(S), contents: packResult() });
      S.dx.submitted = new Date().toISOString(); l3Save(); render(); toast(`${ic('circle-check')} Работа сдана в папку: ${esc(p)}`); return true;
    } catch (e) { toast(`Не удалось сдать в папку (${esc(String(e))}). Сохраните файл вручную.`, 'bad'); if (auto) return false; }
  }
  if (auto) return false;
  const ok = await saveWork();
  if (ok) { S.dx.submitted = new Date().toISOString(); l3Save(); render(); }
  return ok;
}
// защита принята → сразу сдать в папку (если она задана)
document.addEventListener('click', e => {
  const b = e.target.closest && e.target.closest('[data-l3="cqCheck"]'); if (!b) return;
  setTimeout(() => { if (L3S && L3S.done && L3S.dx && !L3S.dx.submitted && FOLDER && IS_TAURI) submitWork(true); }, 50);
});

/* ---------- подсказки в обработке: procHint и PK_NAME — в hints.js (общий с Android) ---------- */
function procHintsHtml(S) {
  const bad = L3_KEYS.filter(k => S.procOk[k] === false); if (!bad.length) return '';
  const o = l3Calc(), pk = (S.dx && S.dx.pk) || {};
  const empty = bad.filter(k => !String(S.proc[k] ?? '').trim()), wrong = bad.filter(k => !empty.includes(k));   // пустые — одной строкой, подсказки — только к ошибкам
  return `<section class="card hints"><h2>${ic('target')} Подсказки</h2>${wrong.map(k => `<p><b>${PK_NAME[k]}</b> ${esc(procHint(k, lwNum(S.proc[k]), o, S, pk[k] || 0))}</p>`).join('')}
    ${empty.length ? `<p class="mute">Заполни пустые ячейки: ${empty.map(k => PK_NAME[k]).join(', ')}.</p>` : ''}
    <p class="mute small">После трёх неверных попыток по ячейке появится пример расчёта.</p></section>`;
}
const _wProc = wProc;
wProc = function (S) { const h = _wProc(S), i = h.indexOf('</table></section>'); return i < 0 ? h + procHintsHtml(S) : h.slice(0, i + 18) + procHintsHtml(S) + h.slice(i + 18); };
// после проверки: счёт ошибок по ячейкам (ядро уже отметило procOk)
document.addEventListener('click', e => {
  const b = e.target.closest && e.target.closest('[data-l3="pcheck"]'); if (!b) return;
  setTimeout(() => { const S = L3S; if (!S || !S.dx) return; S.dx.pk = S.dx.pk || {}; L3_KEYS.forEach(k => { if (S.procOk[k] === false && String(S.proc[k] ?? '').trim()) S.dx.pk[k] = (S.dx.pk[k] || 0) + 1; });   /* пустая ячейка — не ошибка */ l3Save(); render(); }, 0);
});

/* ---------- новая версия (если компьютер в интернете) ---------- */
let UPD = null;
const verGt = (a, b) => { const p = s => String(s).split('.').map(n => parseInt(n, 10) || 0), x = p(a), y = p(b); for (let i = 0; i < 3; i++) if ((x[i] || 0) !== (y[i] || 0)) return (x[i] || 0) > (y[i] || 0); return false; };
if (IS_TAURI) fetch('https://api.github.com/repos/vitalya2078-cloud/vitalya2078-cloud.github.io/releases/latest', { headers: { Accept: 'application/vnd.github+json' } })
  .then(r => r.ok ? r.json() : null).then(d => { if (!d) return; const v = String(d.tag_name || '').replace(/^lw3-v/, ''); if (verGt(v, APP_VER)) { UPD = { v, url: d.html_url }; if (SCREEN === 'home') render(); } })
  .catch(() => {});

/* ---------- кнопки ---------- */
document.addEventListener('click', e => {
  const b = e.target.closest && e.target.closest('[data-d]'); if (!b) return;
  switch (b.dataset.d) {
    case 'pdf': savePdf(pdfName(curLab().S())); break;
    case 'submit': submitWork(false); break;
    case 'upd': if (UPD) tauri('open_release', { url: UPD.url }).catch(err => toast(esc(String(err)), 'bad')); break;
  }
});
