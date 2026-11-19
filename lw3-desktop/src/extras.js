/* =====================================================================
   Дополнения программы: тема установки, масштаб, PDF одной кнопкой,
   общая папка для сдачи работ, время шагов, подсказки в обработке, новая версия.
   ===================================================================== */
const tauri = (cmd, args) => window.__TAURI__.core.invoke(cmd, args);

/* ---------- тема установки: рисунок общий с сайтом, палитра и фон по теме ---------- */
const BG = { dark: null, light: null };
function sceneTheme() { L3_THEME = isLight() ? 'light' : 'dark'; L3_BG = BG[L3_THEME]; if ($('#l3-cv')) l3Draw(); }
function loadBg(cfg, key) { if (!cfg) return; const im = new Image(); im.onload = () => { BG[key] = Object.assign(im, { edge: cfg.edge, top: cfg.top }); sceneTheme(); }; im.src = cfg.src; }
loadBg(LAB_BG, 'dark'); loadBg(LAB_BG_LIGHT, 'light'); sceneTheme();
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
const pdfName = S => `Отчёт_адиабата_${safeName(S && S.fio) || 'студент'}.pdf`;
async function savePdf(name) {
  if (IS_TAURI) {
    try { const p = await tauri('save_pdf', { name }); if (p) toast(`${ic('circle-check')} PDF сохранён: ${esc(p)}`); return; }
    catch (e) { toast(`PDF не сохранился (${esc(String(e))}). Открываю печать — выберите «Microsoft Print to PDF».`, 'bad'); }
  }
  window.print();
}

/* ---------- общая папка для сдачи работ ---------- */
let FOLDER = store.get('lw3d-folder', ''), FOLDER_FIXED = false;
if (IS_TAURI) tauri('app_config').then(t => { if (!t) return; try { const c = JSON.parse(t); if (c.folder) { FOLDER = String(c.folder); FOLDER_FIXED = true; render(); } } catch (e) {} }).catch(() => {});
const workFileName = S => `Адиабата_${safeName(S.fio) || 'студент'}${S.group ? '_' + safeName(S.group) : ''}.lw3`;
async function submitWork(auto) {
  const S = l3Load(); ensureMeta(S);
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

/* ---------- подсказки в обработке ---------- */
const SUBI = ['₁', '₂', '₃'];
function procHint(k, u, o, S, n) {
  const near = (a, b, tol = .006) => Number.isFinite(a) && Number.isFinite(b) && Math.abs(a - b) <= Math.max(tol, Math.abs(b) * .004);
  if (!Number.isFinite(u)) return 'Не число: впиши значение, дробную часть — через запятую.';
  const g = o.a.map(x => x.g), F = (v, d = 3) => l3Fix(v, d);
  if (/^g\d$/.test(k)) {
    const i = +k[1] - 1, r = S.runs[i], s = SUBI[i];
    let h = near(u, r.h2 / (r.h1 - r.h2)) ? 'В числителе должно быть h₁, а не h₂.'
      : near(u, r.h1 / r.h2) ? 'В знаменателе — разность h₁ − h₂, а не h₂.'
      : near(u, (r.h1 - r.h2) / r.h1) ? 'Дробь перевёрнута: γ = h₁ / (h₁ − h₂).'
      : g.some((x, j) => j !== i && near(u, x)) ? `Это γ другого опыта — возьми h₁ и h₂ из строки ${i + 1}.`
      : Math.abs(u - g[i]) < .02 ? 'Почти верно — проверь округление: три знака после запятой.'
      : `γ${s} = h₁ / (h₁ − h₂) по данным строки ${i + 1}.`;
    if (n >= 3) h += ` Пример: γ${s} = ${r.h1} / (${r.h1} − ${r.h2}) = ${r.h1} / ${r.h1 - r.h2} = ${F(g[i])}.`;
    return h;
  }
  const sum = g.reduce((a, x) => a + x, 0), sa = g.reduce((a, x) => a + Math.abs(o.gm - x), 0);
  if (k === 'gm') return (near(u, sum) ? 'Сумму нужно разделить на N = 3.' : '⟨γ⟩ = (γ₁ + γ₂ + γ₃) / 3 — по верным γᵢ из таблицы.')
    + (n >= 3 ? ` Пример: (${g.map(x => F(x)).join(' + ')}) / 3 = ${F(o.gm)}.` : '');
  if (k === 'dg') return (near(u, sa, .002) ? 'Сумму модулей нужно разделить на √(N(N − 1)) = √6 ≈ 2,449.'
      : near(u, sa / 3, .002) ? 'Делить нужно на √(N(N − 1)) = √6, а не на N.'
      : near(u, sa / 6, .002) ? 'Делить нужно на √6, а не на 6.'
      : '⟨Δγ⟩ = (|⟨γ⟩ − γ₁| + |⟨γ⟩ − γ₂| + |⟨γ⟩ − γ₃|) / √6.')
    + (n >= 3 ? ` Пример: (${g.map(x => F(Math.abs(o.gm - x))).join(' + ')}) / 2,449 = ${F(o.dg)}.` : '');
  if (k === 'eg') return (near(u, o.dg / o.gm, .0005) ? 'Не забудь умножить на 100 %.' : 'ε_γ = ⟨Δγ⟩ / ⟨γ⟩ · 100 %, с точностью до 0,1.')
    + (n >= 3 ? ` Пример: ${F(o.dg)} / ${F(o.gm)} · 100 % = ${F(o.eg, 1)} %.` : '');
  if (k === 'gT') return near(u, 5 / 3) ? 'Для воздуха (двухатомный газ) i = 5, а не 3.' : near(u, 4 / 3) ? 'Для воздуха i = 5, а не 6.'
    : near(u, 5 / 7) ? 'Дробь перевёрнута: γ_T = (i + 2) / i.' : 'γ_T = (i + 2) / i при i = 5' + (n >= 3 ? ' = 7 / 5 = 1,400.' : '.');
  if (k === 'e') { const d = Math.abs(o.gT - o.gm);
    return (near(u, d, .002) ? 'Разность нужно разделить на γ_T и умножить на 100 %.' : near(u, d / o.gT, .0005) ? 'Не забудь умножить на 100 %.'
      : near(u, d / o.gm * 100, .05) ? 'Делить нужно на γ_T = 1,4, а не на ⟨γ⟩.' : 'ε = |γ_T − ⟨γ⟩| / γ_T · 100 %.')
      + (n >= 3 ? ` Пример: |1,400 − ${F(o.gm)}| / 1,400 · 100 % = ${F(o.e, 1)} %.` : ''); }
  return '';
}
const PK_NAME = { g1: 'γ₁', g2: 'γ₂', g3: 'γ₃', gm: '⟨γ⟩', dg: '⟨Δγ⟩', eg: 'ε_γ', gT: 'γ_T', e: 'ε' };
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
    case 'pdf': savePdf(pdfName(L3S)); break;
    case 'submit': submitWork(false); break;
    case 'upd': if (UPD) tauri('open_release', { url: UPD.url }).catch(err => toast(esc(String(err)), 'bad')); break;
  }
});
