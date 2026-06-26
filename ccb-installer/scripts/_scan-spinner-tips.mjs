import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const repl = fs.readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), '../dist/chunks/REPL-Bbtw98TO.js'),
  'utf8'
);

const patterns = [
  /content:async\(\)=>(`[^`]+`)/g,
  /content:async e=>(`[^`]+`)/g,
  /content:async\(\)=>(`[^`]*)/g,
];

const tips = new Set();
for (const re of patterns) {
  let m;
  while ((m = re.exec(repl))) {
    const body = m[1];
    if (!body.startsWith('`')) continue;
    if (body.includes('\\u')) continue;
    if (!/[A-Za-z]{4,}/.test(body)) continue;
    tips.add(body.length > 200 ? body.slice(0, 200) + '...' : body);
  }
}

// Also find content:async()=>` without closing on same match - use id blocks
const idRe = /\{id:`[^`]+`,content:async[^,]{0,800}/g;
let im;
while ((im = idRe.exec(repl))) {
  const block = im[0];
  if (block.includes('\\u4e00') || block.includes('\\u53ef')) continue;
  if (/[A-Za-z]{5,}/.test(block) && !block.includes('ANT-ONLY')) {
    if (/content:async\(\)=>`[A-Za-z/]/.test(block)) tips.add(block.slice(-200));
  }
}

const uniq = [...tips].sort();
console.log(`English spinner tip fragments: ${uniq.length}\n`);
for (const t of uniq) {
  console.log(t);
  console.log('---');
}
