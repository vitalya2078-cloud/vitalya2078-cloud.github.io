/* =====================================================================
   «Ход работы» — раздел 4 методички «Порядок выполнения работы», дословно.
   Открывается кнопкой «Ход работы» или клавишей H, не затемняет экран и не мешает работе:
   выезжает справа поверх таблицы и графика; установка остаётся видна.
   Текущий пункт подсвечивается по состоянию установки.
   ===================================================================== */
const HOD = [
  'Подать питание на секундомер и включить секундомер (переключатель на задней панели).',
  'Открыть кран K (горизонтальное положение).',
  'Закрыть кран K₀ (горизонтальное положение).',
  'Включить компрессор и накачать воздух в баллон до избыточного давления 210…220 мм (правое колено манометра). <b>Внимание!</b> Компрессор работает, когда нажата и удерживается кнопка. Если жидкость в правом колене манометра при работе компрессора не поднимается, проверить положение кранов K₀ и K (п. п. 2 и 3).',
  'Закрыть кран K (вертикальное положение) и одновременно запустить секундомер (кнопка «Пуск» на передней панели секундомера).',
  'Выждать 1 мин, пока установится постоянное давление в баллоне, остановить секундомер (кнопка «Стоп» на передней панели секундомера), определить величину h₁ по разности уровней в коленах манометра и записать полученное значение в табл. 1.',
  'Сбросить показания секундомера (переключатель на задней панели).',
  'Открыть кран K₀ (вертикальное положение), соединив баллон с атмосферой, и после выравнивания давлений закрыть кран K₀ (горизонтальное положение).',
  'Запустить секундомер и выждать 1 мин (п. 6), пока установится постоянное давление в баллоне.',
  'Определить величину h₂ по разности уровней в коленах манометра, записать полученное значение в табл. 1 и сбросить показания секундомера переключателем на задней панели.',
  'Открыть краны K₀ (вертикальное положение) и K (горизонтальное положение).',
  'Повторить измерения h₁ и h₂ по п. п. 3–11 ещё два раза.',
  'Отключить питание секундомера (переключатель на задней панели).'
];
let HOD_OPEN = false;

/* номер текущего пункта (1…13) по состоянию работы; 0 — пункт не выделяется */
function hodNow() {
  if (SCREEN !== 'work') return 0;
  if (LAB !== 3) return hodNowLab();
  if (!L3S) return 0;
  const S = L3S, st = l3St(), ph = L3V.phase, n = S.runs.length;
  if (st === 'admit') return 0;
  if (st === 'prep') return !S.power ? 1 : !S.kOpen ? 2 : S.k0Open ? 3 : 4;
  if (st !== 'exp' || n >= L3.N) return 13;
  return ({ ready: n ? 3 : (!S.kOpen ? 2 : 3), pump: 4, wait1: 6, read1: 6, vent: 8, vented: 9, wait2: 9, read2: 10 })[ph] || 4;
}
function hodRender() {
  let el = $('#hod');
  if (!el) { el = document.createElement('aside'); el.id = 'hod'; document.body.appendChild(el); }
  const cur = hodNow(), st = LAB === 3 && L3S && SCREEN === 'work' ? l3St() : '', n = LAB === 3 && L3S ? L3S.runs.length : 0, list = LAB === 3 ? HOD : curLab().hod;
  el.className = (HOD_OPEN && SCREEN === 'work' ? 'open ' : '') + (document.body.classList.contains('full') ? 'right' : 'left');
  el.innerHTML = `<header><div><b>Ход работы</b><span>Порядок выполнения работы — методичка, ЛР № ${LAB}</span></div><button class="tb-ic" data-d="hod" title="Закрыть (H)">${ic('x')}</button></header>
    ${st === 'exp' && n < L3.N ? `<p class="hod-run">Сейчас: опыт ${n + 1} из ${L3.N}</p>` : ''}
    <ol>${list.map((t, i) => `<li class="${i + 1 === cur ? 'cur' : ''}"><i>${i + 1}</i><span>${t}</span></li>`).join('')}</ol>`;
  const c = el.querySelector('li.cur'); if (c && HOD_OPEN) c.scrollIntoView({ block: 'nearest' });
}
function hodToggle() { HOD_OPEN = !HOD_OPEN; hodRender(); }

// после каждой перерисовки экрана — обновить панель (текущий пункт, сторона, видимость)
const _renderBase = render;
render = function () { _renderBase(); hodRender(); };
document.addEventListener('click', e => { const b = e.target.closest && e.target.closest('[data-d="hod"]'); if (b) hodToggle(); });
document.addEventListener('keydown', e => {
  if (SCREEN !== 'work' || !$('#modal').hidden || e.ctrlKey || e.altKey) return;
  const tag = e.target.tagName || ''; if (tag === 'INPUT' || tag === 'TEXTAREA') return;
  if (e.code === 'KeyH') { e.preventDefault(); hodToggle(); }
  if (e.key === 'Escape' && HOD_OPEN) { HOD_OPEN = false; hodRender(); }
});
// фаза опыта меняется и без перерисовки (накачка, ожидание) — подсветку обновлять раз в полсекунды
setInterval(() => { if (HOD_OPEN) { const el = $('#hod li.cur'), cur = hodNow(); if (!el || +el.querySelector('i').textContent !== cur) hodRender(); } }, 500);
