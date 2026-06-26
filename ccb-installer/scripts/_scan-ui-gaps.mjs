#!/usr/bin/env node
/** High-signal UI gap scan: title/children/description in priority chunks */
import fs from 'fs';
import path from 'path';

const chunksDir = 'd:/Projects/claude-code-best/ccb-installer/dist/chunks';
const ps1 = fs.readFileSync('d:/Projects/claude-code-best/ccb-installer/scripts/patch-i18n.ps1', 'utf8');

const translated = new Set();
for (const m of ps1.matchAll(/\[(['"`])([^'"`\\]{3,400})\1\]\s*=/g)) translated.add(m[2]);
for (const m of ps1.matchAll(/\$chunk\w+\[\(New-TipKey \(([^)]+)\)\)\]/g)) translated.add(m[1]);
console.error(`[info] ${translated.size} patch keys`);

const priorityFiles = fs
  .readdirSync(chunksDir)
  .filter((f) => f.endsWith('.js'))
  .filter((f) =>
    /REPL|Settings|Trust|Permission|Welcome|Onboarding|approv|Diff|Doctor|Feedback|plugin|mcp|assistant|REPL|bg-|banner|autonomy|extraUsage|passes/i.test(
      f
    )
  );

const markers = [
  /title:\s*[`"]([^`"\\]{4,120})[`"]/g,
  /title:`([^`\\]{4,120})`/g,
  /children:\s*[`"]([^`"\\]{4,150})[`"]/g,
  /children:`([^`\\]{4,150})`/g,
  /description:\s*[`"]([^`"\\]{10,200})[`"]/g,
  /description:`([^`\\]{10,200})`/g,
  /placeholder:\s*[`"]([^`"\\]{4,100})[`"]/g,
  /label:\s*[`"]([^`"\\]{2,80})[`"]/g,
  /return\s*[`"]([A-Z][^`"\\]{8,150})[`"]/g,
];

function isGap(s) {
  if (translated.has(s)) return false;
  if (s.includes('\\u')) return false;
  if (!/[A-Za-z]{4,}/.test(s)) return false;
  if (!/\b(the|and|for|with|you|your|are|not|can|will|use|this|that|from|please|click|press|select|allow|deny|enable|disable|failed|error|tool)\b/i.test(s))
    return false;
  if (/^https?:\/\//.test(s)) return false;
  if (/[=;{}()=>]/.test(s)) return false;
  return true;
}

const byFile = {};
for (const fname of priorityFiles) {
  const content = fs.readFileSync(path.join(chunksDir, fname), 'utf8');
  const set = new Set();
  for (const re of markers) {
    let m;
    re.lastIndex = 0;
    while ((m = re.exec(content))) {
      const s = m[1];
      if (isGap(s)) set.add(s);
    }
  }
  if (set.size) byFile[fname] = [...set].sort();
}

const total = Object.values(byFile).reduce((a, b) => a + b.length, 0);
console.error(`[info] ${Object.keys(byFile).length} priority files, ${total} gaps\n`);

const sorted = Object.entries(byFile).sort((a, b) => b[1].length - a[1].length);
for (const [f, strs] of sorted.slice(0, 25)) {
  console.log(`\n## ${f} (${strs.length})`);
  for (const s of strs.slice(0, 8)) console.log(`  - ${s}`);
  if (strs.length > 8) console.log(`  ... +${strs.length - 8} more`);
}
