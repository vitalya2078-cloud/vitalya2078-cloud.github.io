/* =====================================================================
   Файл работы (.lw3): состояние работы + подпись HMAC-SHA256. Общий для программ
   для Windows/Linux и Android — преподаватель проверяет файлы с любого устройства одинаково.
   Ждёт от оболочки: APP_VER, l3Load, ensureMeta, hmac256 (sha256.js).
   ===================================================================== */
const SIG_KEY = 'lw3:kafedra-fiziki:Clement-Desormes:v1';
const RESULT_FORMAT = 'lw3-result';
function packResult() {
  const S = l3Load(); ensureMeta(S);
  const o = S.runs.length === L3.N ? l3Calc() : null;
  const body = { format: RESULT_FORMAT, v: 1, app: APP_VER, saved: new Date().toISOString(), student: { fio: S.fio || '', group: S.group || '' },
    state: S, summary: o ? { gm: o.gm, dg: o.dg, eg: o.eg, e: o.e } : null };
  return JSON.stringify(Object.assign({}, body, { sig: hmac256(SIG_KEY, JSON.stringify(body)) }));
}
function unpackResult(text) {
  let d; try { d = JSON.parse(text); } catch (e) { return { err: 'это не файл работы «Показатель адиабаты»' }; }
  if (!d || d.format !== RESULT_FORMAT || !d.state) return { err: 'это не файл работы «Показатель адиабаты»' };
  const { sig, ...body } = d;
  return { d: body, ok: typeof sig === 'string' && sig === hmac256(SIG_KEY, JSON.stringify(body)) };
}
const safeName = s => String(s || '').trim().replace(/[\\/:*?"<>|]+/g, '').replace(/\s+/g, '_').slice(0, 60);
