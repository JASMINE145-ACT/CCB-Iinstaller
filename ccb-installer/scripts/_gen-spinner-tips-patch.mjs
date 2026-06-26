import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const repl = fs.readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), '../dist/chunks/REPL-Bbtw98TO.js'),
  'utf8'
);

// Extract tip objects: id + content literal start
const blocks = [...repl.matchAll(/\{id:`([^`]+)`,content:(async[^}]{20,1200}?)\}/g)];

const english = [];
for (const [, id, content] of blocks) {
  if (content.includes('\\u4e00') || content.includes('\\u53ef') || content.includes('\\u8fd0\u884c')) continue;
  if (!/[A-Za-z]{5,}/.test(content)) continue;
  english.push({ id, content: content.slice(0, 500) });
}

const out = join(dirname(fileURLToPath(import.meta.url)), '_spinner-tips-en.json');
fs.writeFileSync(out, JSON.stringify(english, null, 2), 'utf8');
console.error(`Wrote ${english.length} tips to ${out}`);
