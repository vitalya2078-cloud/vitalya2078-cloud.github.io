/* =====================================================================
   «Физпрактикум» для Windows: честная сдача допуска и защиты.
   — Вопросы берутся случайным набором из пула (исходные вопросы работы + QPOOL), у каждой попытки свой набор.
   — После неудачной сдачи программа не показывает, какие ответы неверные: ответы сбрасываются,
     набор вопросов меняется, новая попытка — через 2 минуты (время повторить теорию).
   Массивы вопросов работ (LW_ADMIT, L2_ADMIT, L3_ADMIT, D.admit …) меняются на месте: их же читают модули работ.
   ===================================================================== */
const Q_N = 8, Q_WAIT = 120000;
const QORIG = {};
labNums().forEach(n => { QORIG[n] = { admit: LABS[n].admit.slice(), cq: LABS[n].cq.slice() }; });
const qFull = (n, kind) => QORIG[n][kind].concat((QPOOL[n] || {})[kind] || []);
function qPick(n, kind) { const full = qFull(n, kind); return shuffle(full.map((_, i) => i)).slice(0, Math.min(Q_N, full.length)); }
/* набор вопросов попытки; для старых сохранений с ответами — исходный порядок, чтобы ответы совпали */
function qSet(n, S, kind) {
  const k = kind + 'Set';
  if (!S[k]) S[k] = (S[kind + 'Ok'] || Object.keys(S[kind] || {}).length) ? QORIG[n][kind].map((_, i) => i) : qPick(n, kind);
  return S[k];
}
const qList = (n, S, kind) => { const full = qFull(n, kind); return qSet(n, S, kind).map(i => full[i]).filter(Boolean); };
function qApply(n, S) {
  if (!S || !QORIG[n]) return;
  const fresh = !S.admitSet || !S.cqSet;
  ['admit', 'cq'].forEach(kind => { const arr = LABS[n][kind], list = qList(n, S, kind); arr.length = 0; list.forEach(q => arr.push(q)); });
  if (fresh) LABS[n].save();   // набор попытки сохраняется сразу — при повторном открытии он тот же
}
/* число верных ответов по сохранённому состоянию (для преподавателя: у каждого курсанта свой набор) */
/* ответы, сохранённые прежней версией (длинное тире вместо дефиса), считаются совпавшими */
const qEq = (x, y) => x != null && String(x).replace(/\u2014/g, '-') === String(y).replace(/\u2014/g, '-');
function qCount(n, S, kind) { if (!S || !QORIG[n]) return 0; const list = S[kind + 'Set'] ? qList(n, Object.assign({}, S), kind) : QORIG[n][kind]; return list.filter(([, a], i) => S[kind] && qEq(S[kind][i], a)).length; }
const qTotal = (n, S, kind) => (S && S[kind + 'Set'] ? S[kind + 'Set'].length : QORIG[n][kind].length);
const qWaitLeft = (S, kind) => Math.max(0, ((S && S[kind + 'Wait']) || 0) - Date.now());
const qWaitText = ms => { const s = Math.ceil(ms / 1000); return s >= 60 ? `${Math.floor(s / 60)} мин ${String(s % 60).padStart(2, '0')} с` : `${s} с`; };

const Q_ACT = '[data-lw],[data-l2],[data-l3],[data-le]';
const qKind = b => { const a = b.dataset.lw || b.dataset.l2 || b.dataset.l3 || b.dataset.le; return a === 'admitCheck' ? 'admit' : a === 'cqCheck' ? 'cq' : ''; };
// до обработчика работы: во время паузы сдавать нельзя
document.addEventListener('click', e => {
  const b = e.target.closest && e.target.closest(Q_ACT); if (!b || SCREEN !== 'work') return; const kind = qKind(b); if (!kind) return;
  const S = curLab().S(), left = qWaitLeft(S, kind);
  if (left > 0) { e.stopImmediatePropagation(); e.preventDefault(); toast(`Новая попытка — через ${qWaitText(left)}. Пока повтори теорию: вопросы будут другие.`, 'bad'); }
}, true);
// после обработчика работы (тот же клик, до отрисовки): неудача — сброс без подсказок
document.addEventListener('click', e => {
  const b = e.target.closest && e.target.closest(Q_ACT); if (!b || SCREEN !== 'work') return; const kind = qKind(b); if (!kind) return;
  const L = curLab(), S = L.S(); if (!S || !S[kind + 'Checked'] || S[kind + 'Ok']) return;
  S[kind] = {}; S[kind + 'Checked'] = false; S[kind + 'Set'] = qPick(LAB, kind); S[kind + 'Wait'] = Date.now() + Q_WAIT;
  S.dx = S.dx || {}; (S.dx.fails = S.dx.fails || {})[kind] = ((S.dx.fails || {})[kind] || 0) + 1;
  L.save(); qApply(LAB, S); if (kind === 'admit') AQ = 0; else CQI = 0; render();
  toast(`Новая попытка — через 2 минуты, с другими вопросами. Повтори теорию.`, 'bad');
});
// таймер на экране допуска / защиты во время паузы
setInterval(() => { const el = document.getElementById('q-wait'); if (!el || SCREEN !== 'work') return; const S = curLab().S(), left = qWaitLeft(S, el.dataset.kind);
  if (left > 0) el.textContent = qWaitText(left); else render(); }, 1000);
const qWaitBox = (S, kind) => { const left = qWaitLeft(S, kind); return left > 0 ? `<div class="pill bad q-wait">${ic('timer')} Новая попытка через <b id="q-wait" data-kind="${kind}">${qWaitText(left)}</b>. Повтори теорию — вопросы будут другие.</div>` : ''; };
