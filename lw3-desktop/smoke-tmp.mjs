import { chromium } from 'playwright';
const out = process.argv[2];
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => m.type() === 'error' && errs.push(m.text()));
await p.goto('http://127.0.0.1:4180/'); await p.fill('#np-fio', 'Тестов Тест'); await p.click('[data-d="new"]'); await p.click('[data-d="intro-skip"]');
await p.screenshot({ path: out + '/labs.png' });
for (const n of [2, 1]) {
  await p.click(`[data-d="lab"][data-v="${n}"]`); await p.waitForTimeout(300); await p.screenshot({ path: out + `/l${n}-admit.png` });
  const A = await p.evaluate(() => curLab().admit.map(([, a]) => a));
  for (let i = 0; i < 8; i++) { await p.evaluate(i => { AQ = i; render(); }, i); await p.click(`.qs-opts [data-q="${i}"][data-v="${A[i].replace(/"/g, '\\"')}"]`); await p.waitForTimeout(300); }
  await p.evaluate(() => { AQ = 8; render(); }); await p.click(`[data-${n === 1 ? 'lw' : 'l2'}="admitCheck"]`); await p.click(`[data-${n === 1 ? 'lw' : 'l2'}="next"]`); await p.waitForTimeout(500);
  await p.screenshot({ path: out + `/l${n}-prep.png` });
  await p.keyboard.press('h'); await p.waitForTimeout(300); await p.screenshot({ path: out + `/l${n}-hod.png` }); await p.keyboard.press('h');
  await p.click('[data-d="labs"]'); await p.waitForTimeout(200);
}
await p.screenshot({ path: out + '/labs2.png' });
console.log('errors', JSON.stringify(errs));
await b.close();
