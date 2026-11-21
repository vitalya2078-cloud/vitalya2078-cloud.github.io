// Снимки слайдов видеоурока: node shoot.mjs <папка со sNN.html> — рядом появятся sNN.png (1920×1080).
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
const dir = path.resolve(process.argv[2]);
const b = await chromium.launch(); const page = await b.newPage({ viewport: { width: 1920, height: 1080 } });
for (const f of fs.readdirSync(dir).filter(f => /^s\d+\.html$/.test(f)).sort()) {
  await page.goto('file://' + path.join(dir, f)); await page.evaluate(() => document.fonts.ready); await page.waitForTimeout(150);
  await page.screenshot({ path: path.join(dir, f.replace('.html', '.png')) });
}
await b.close();
