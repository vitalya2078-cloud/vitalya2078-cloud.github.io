// Снимок #c из каждого .html папки в PNG: node shoot.mjs <папка html> <папка png>
import { chromium } from 'playwright';
import fs from 'node:fs'; import path from 'node:path';
const [src, out] = process.argv.slice(2).map(p => path.resolve(p));
const b = await chromium.launch(); const page = await b.newPage({ deviceScaleFactor: 1 });
for (const f of fs.readdirSync(src).filter(f => f.endsWith('.html'))) {
  await page.goto('file://' + path.join(src, f)); await page.waitForTimeout(120);
  await page.locator('#c').screenshot({ path: path.join(out, f.replace('.html', '.png')) });
}
await b.close();
