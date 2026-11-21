import { chromium } from 'playwright'; import fs from 'node:fs'; import path from 'node:path';
const [src, out] = process.argv.slice(2).map(p => path.resolve(p));
const b = await chromium.launch(); const page = await b.newPage({ viewport: { width: 1920, height: 1080 } });
for (const f of fs.readdirSync(src).filter(f => f.endsWith('.html')).sort()) { await page.goto('file://' + path.join(src, f)); await page.evaluate(() => document.fonts.ready); await page.waitForTimeout(200); await page.screenshot({ path: path.join(out, f.replace('.html', '.png')) }); }
await b.close();
