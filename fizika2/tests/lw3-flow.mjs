// Полное прохождение ЛР № 3 через настоящие кнопки и поля (data-l3 / data-k3) — общее для сайта и программы для Windows.
// Ничего не подменяет в модели: компрессор держится, ожидание идёт, уровни читаются по модели, кран K₀ закрывается по времени.
// reveal(kind, i) — для интерфейсов, где вопросы показываются по одному: открыть нужный вопрос перед кликом
export async function runLw3(page, { log = () => {}, beforeStep = async () => {}, reveal = async () => {} } = {}) {
  const click = async sel => { const b = page.locator(sel).first(); await b.waitFor({ state: 'visible', timeout: 15000 }); await b.click(); };
  const step = () => page.evaluate(() => L3.steps[L3S.step][0]);
  const waitPhase = (ph, t = 30000) => page.waitForFunction(p => L3V.phase === p, ph, { timeout: t });

  // 1. Допуск: сначала одна ошибка в каждом вопросе → не сдан, затем верные ответы → сдан
  await beforeStep('admit');
  const admit = await page.evaluate(() => L3_ADMIT.map(([, a, x]) => ({ a, x: x[0] })));
  for (const [i, q] of admit.entries()) { await reveal('admit', i); await click(`[data-l3="admit"][data-q="${i}"][data-v="${q.x.replace(/"/g, '\\"')}"]`); }
  await reveal('admitCheck'); await click('[data-l3="admitCheck"]');
  if (await page.evaluate(() => L3S.admitOk)) throw new Error('допуск сдан с неверными ответами');
  // в программе после неудачи набор вопросов меняется и включается пауза — для теста пауза снимается
  await page.evaluate(() => { if (L3S.admitWait) { L3S.admitWait = 0; l3Save(); render(); } });
  admit.splice(0, admit.length, ...await page.evaluate(() => L3_ADMIT.map(([, a, x]) => ({ a, x: x[0] }))));
  for (const [i, q] of admit.entries()) { await reveal('admit', i); await click(`[data-l3="admit"][data-q="${i}"][data-v="${q.a.replace(/"/g, '\\"')}"]`); }
  await reveal('admitCheck'); await click('[data-l3="admitCheck"]');
  if (!await page.evaluate(() => L3S.admitOk)) throw new Error('допуск не сдан с верными ответами');
  await click('[data-l3="next"]');
  if (await step() !== 'prep') throw new Error('после допуска не открылась подготовка');

  // 2. Подготовка: питание, K открыт, K₀ закрыт
  await beforeStep('prep');
  await click('[data-l3="power"]'); await click('[data-l3="kv"]'); await click('[data-l3="k0"]');
  await click('[data-l3="next"]');
  if (await step() !== 'exp') throw new Error('после подготовки не открылись опыты');

  // 3. Три опыта
  await beforeStep('exp');
  for (let n = 1; n <= 3; n++) {
    if (await page.evaluate(() => L3V.phase === 'ready')) {      // после опыта: K₀ открыт — закрыть, K — открыть
      if (await page.evaluate(() => !L3S.kOpen)) await click('[data-l3="kv"]');
      if (await page.evaluate(() => L3S.k0Open)) await click('[data-l3="k0"]');
    }
    await waitPhase('pump');
    const pump = page.locator('#l3-pump'); await pump.waitFor();
    const box = await pump.boundingBox();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2); await page.mouse.down();
    await page.waitForFunction(() => L3V.p >= 214, null, { timeout: 30000 });
    await page.mouse.up();
    const p = await page.evaluate(() => L3V.p);
    if (p > 228) throw new Error('перекачано: ' + p);
    await click('[data-l3="closeK"]'); await waitPhase('wait1');
    await click('[data-l3="waitMin"]'); await waitPhase('read1', 60000);
    const read = () => page.evaluate(() => { const [l, r] = l3Levels(); return Math.round(r - l); });
    const h1 = await read();
    await page.locator('[data-k3="ch"]').fill(String(h1)); await click('[data-l3="rec1"]'); await waitPhase('vent');
    await click('[data-l3="k0open"]');
    await page.waitForFunction(() => L3V.hiss < .05 && Math.abs(L3V.p) < 2, null, { timeout: 15000 });
    await page.waitForTimeout(150);
    await click('[data-l3="k0close"]'); await waitPhase('vented');
    await click('[data-l3="startSw"]'); await waitPhase('wait2');
    await click('[data-l3="waitMin"]'); await waitPhase('read2', 60000);
    const h2 = await read();
    await page.locator('[data-k3="ch"]').fill(String(h2)); await click('[data-l3="rec2"]');
    await page.waitForFunction(k => L3S.runs.length === k, n);
    log(`опыт ${n}: h1=${h1} h2=${h2} γ=${(h1 / (h1 - h2)).toFixed(3)}`);
  }
  await click('[data-l3="next"]');
  if (await step() !== 'proc') throw new Error('не открылась обработка');

  // 4. Обработка: сначала заведомо неверное значение, потом верные
  await beforeStep('proc');
  const vals = await page.evaluate(() => { const o = l3Calc(); return Object.fromEntries(L3_KEYS.map(k => [k, k === 'eg' || k === 'e' ? o[k].toFixed(2) : o[k].toFixed(3)])); });
  for (const [k, v] of Object.entries(vals)) await page.locator(`[data-k3="p_${k}"]`).fill(k === 'gm' ? '9,999' : v.replace('.', ','));
  await click('[data-l3="pcheck"]');
  if (await page.evaluate(() => L3S.procOk.gm !== false || L3S.procOk.g1 !== true)) throw new Error('проверка обработки работает неверно');
  await page.locator('[data-k3="p_gm"]').fill(vals.gm.replace('.', ','));
  await click('[data-l3="pcheck"]');
  if (!await page.evaluate(() => L3_KEYS.every(k => L3S.procOk[k] === true))) throw new Error('верные значения не приняты');
  await click('[data-l3="next"]');

  // 5. Выводы и защита
  await beforeStep('concl');
  if (!(await page.locator('[data-k3="concl"]').inputValue()).includes('γ =')) throw new Error('черновик выводов пуст');
  const cq = await page.evaluate(() => L3_CQ.map(([, a]) => a));
  for (const [i, a] of cq.entries()) await click(`[data-l3="cq"][data-q="${i}"][data-v="${a.replace(/"/g, '\\"')}"]`);
  await click('[data-l3="cqCheck"]');
  if (!await page.evaluate(() => L3S.cqOk && L3S.done)) throw new Error('защита не принята');
  await click('[data-l3="next"]');
  if (await step() !== 'report') throw new Error('не открылся отчёт');
  await beforeStep('report');
  const o = await page.evaluate(() => l3Calc());
  log(`⟨γ⟩ = ${o.gm.toFixed(3)} ± ${o.dg.toFixed(3)}, ε = ${o.e.toFixed(1)} %`);
  if (!(o.gm > 1.3 && o.gm < 1.5)) throw new Error('γ вне разумных пределов: ' + o.gm);
  return o;
}
