// Ключи из настоящего генератора (HTML) для проверки C++: печатает «pubkey код ключ срок …»
import { chromium } from 'playwright'; import crypto from 'node:crypto'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const gen = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../license-generator/Генератор ключей.html');
const b = await chromium.launch(); const p = await b.newPage(); await p.goto('file://' + gen);
const sk = crypto.randomBytes(32).toString('hex'); const out = [];
for (const [code, date] of [['FZ-PM2E-7KCE-GCJ3-GR1B', '2026-12-21'], ['FZ-0123-4567-89AB-CDEF', ''], [process.argv[2], '2030-01-31']]) {
  const r = await p.evaluate(([s, c, d]) => window.__fzSign(s, c, d), [sk, code, date]); if (!out.length) out.push(r.pk); out.push(code, r.key, date || '-'); }
console.log(out.join(' ')); await b.close();
