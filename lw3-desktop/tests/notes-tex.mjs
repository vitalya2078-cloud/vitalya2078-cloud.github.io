// Проверка конспектов: все формулы рисуются KaTeX без ошибок, у каждого конспекта есть разделы.
// Запуск после сборки: node lw3-desktop/tests/notes-tex.mjs
import { createRequire } from 'node:module';
import fs from 'node:fs';
const require = createRequire(import.meta.url);
const katex = require('../vendor/katex/katex.min.js');
const N = JSON.parse(fs.readFileSync(new URL('../dist/notes/notes.json', import.meta.url), 'utf8'));
let bad = 0, cnt = 0;
const un = s => s.replace(/&quot;/g, '"').replace(/&#x27;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
for (const x of N.notes) {
  if (!x.secs.length) { console.log('нет разделов:', x.id); bad++; }
  for (const m of x.html.matchAll(/data-t="([^"]*)"/g)) {
    cnt++; const t = un(m[1]);
    try { katex.renderToString(t, { throwOnError: true, strict: 'ignore' }); } catch (e) { bad++; console.log(x.id, '|', t, '|', e.message.split('\n')[0]); }
  }
}
console.log(`${N.notes.length} конспектов, ${cnt} формул, ошибок: ${bad}`);
process.exit(bad ? 1 : 0);
