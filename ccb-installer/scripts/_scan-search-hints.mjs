#!/usr/bin/env node
import fs from 'fs';

const s = fs.readFileSync(
  'd:/Projects/claude-code-best/ccb-installer/dist/chunks/loadAgentsDir-BMosMfSG.js',
  'utf8'
);
const re = /searchHint:`([^`]+)`/g;
const hints = new Map();
let m;
while ((m = re.exec(s))) {
  const h = m[1];
  if (!h.includes('\\u') && /[a-z]{3,}/.test(h)) hints.set(h, (hints.get(h) || 0) + 1);
}
console.log(`English searchHint: ${hints.size}\n`);
for (const [h] of [...hints.entries()].sort()) console.log(h);

// short async description one-liners
const re2 = /async description\(\)\{return `([^`]{8,120})`\}/g;
const descs = new Set();
while ((m = re2.exec(s))) {
  const d = m[1];
  if (!d.includes('\\u') && /[A-Za-z]{4,}/.test(d)) descs.add(d);
}
console.log(`\nShort async description (EN): ${descs.size}\n`);
for (const d of [...descs].sort()) console.log(d);
