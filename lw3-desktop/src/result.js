/* =====================================================================
   Файл работы (.lw3): состояние работы + подпись HMAC-SHA256. Общий для программ
   для Windows/Linux и Android — преподаватель проверяет файлы с любого устройства одинаково.
   Ждёт от оболочки: APP_VER, l3Load, ensureMeta, hmac256 (sha256.js).
   ===================================================================== */
const SIG_KEY = 'lw3:kafedra-fiziki:Clement-Desormes:v1';
const RESULT_FORMAT = 'lw3-result';
/* lab — номер работы (1, 2, 3); старые файлы без lab — это ЛР 3 */
function packResult() {
  const n = typeof LAB === 'number' ? LAB : 3, L = typeof LABS === 'object' ? LABS[n] : null, S = L ? L.load() : l3Load(); ensureMeta(S);
  let sum = null; try { if (S.done || S.max >= S.step) sum = L ? L.nums() : null; } catch (e) { sum = null; }
  if (n === 3 && !(S.runs && S.runs.length === L3.N)) sum = null;
  const body = { format: RESULT_FORMAT, v: 1, app: APP_VER, saved: new Date().toISOString(), student: { fio: S.fio || '', group: S.group || '' },
    state: S, summary: sum };
  if (n !== 3) body.lab = n;
  return JSON.stringify(Object.assign({}, body, { sig: hmac256(SIG_KEY, JSON.stringify(body)) }));
}
function unpackResult(text) {
  let d; try { d = JSON.parse(text); } catch (e) { return { err: 'это не файл результата «Физпрактикума»' }; }
  if (!d || d.format !== RESULT_FORMAT || !d.state) return { err: 'это не файл результата «Физпрактикума»' };
  const { sig, ...body } = d;
  const ok = typeof sig === 'string' && sig === hmac256(SIG_KEY, JSON.stringify(body));
  if (!body.lab) body.lab = 3;
  return { d: body, ok };
}
const safeName = s => String(s || '').trim().replace(/[\\/:*?"<>|]+/g, '').replace(/\s+/g, '_').slice(0, 60);
