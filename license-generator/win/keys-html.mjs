import { chromium } from 'playwright'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const gen = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../Генератор ключей.html'), sk = process.argv[2];
const b = await chromium.launch(); const p = await b.newPage(); await p.goto('file://' + gen); const out = [];
for (const [c, d] of [['FZ-PM2E-7KCE-GCJ3-GR1B', '2026-12-21'], ['FZ-0123-4567-89AB-CDEF', ''], ['FZ-XMX8-RQPD-QMDR-2H5C', '2030-01-31']]) { const r = await p.evaluate(([s, c, d]) => window.__fzSign(s, c, d), [sk, c, d]); out.push(`${c}|${d}|${r.key}`); if (out.length === 1) console.error('pk(html)', r.pk); }
console.log(out.join(' ')); await b.close();
