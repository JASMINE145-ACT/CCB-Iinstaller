// _scan-untranslated.js — find English UI strings in dist/chunks/ not yet covered by patch-i18n.ps1
// Output: per-chunk untranslated English strings sorted by visibility
const fs = require('fs');
const path = require('path');

const chunksDir = 'D:/Projects/claude-code-best/ccb-installer/dist/chunks/';
const ps1Path = 'D:/Projects/claude-code-best/ccb-installer/scripts/patch-i18n.ps1';

// 1. Build set of already-translated keys from patch-i18n.ps1
const ps1 = fs.readFileSync(ps1Path, 'utf8');
const translatedKeys = new Set();
const re = /\[(['"`])([^'"`\\]{3,300})\1\]\s*=\s*(['"`])/g;
let m;
while ((m = re.exec(ps1))) {
  translatedKeys.add(m[2]);
}
console.error(`[info] ${translatedKeys.size} already-translated keys in patch-i18n.ps1`);

// 2. Scan all .js chunks for backtick-enclosed UI strings
const fileRe = /`([^`\\]{3,200})`/g;
const allFiles = fs.readdirSync(chunksDir).filter((f) => f.endsWith('.js'));

const findings = {};
for (const fname of allFiles) {
  const content = fs.readFileSync(path.join(chunksDir, fname), 'utf8');
  const strings = new Set();
  let mm;
  fileRe.lastIndex = 0;
  while ((mm = fileRe.exec(content))) {
    const s = mm[1];
    if (translatedKeys.has(s)) continue;
    if (s.includes('\\u')) continue;
    if (/^https?:\/\//.test(s)) continue;
    if (/^[a-z_]+-[a-z_]+$/.test(s)) continue;
    if (/^[A-Z][a-z]+[A-Z]/.test(s) && !/[a-z]{4,}/.test(s.replace(/[A-Z]/g, ''))) continue; // camelCase identifier
    if (!/[A-Z]/.test(s)) continue; // must have at least one capital
    if (!/[a-z]{3,}/.test(s)) continue; // must have at least one lowercase word
    if (/^[\d.]+$/.test(s)) continue;
    if (s.length < 6) continue;
    if (/^[\s\W]+$/.test(s)) continue;
    strings.add(s);
  }
  if (strings.size > 0) {
    findings[fname] = [...strings];
  }
}

const totalUntranslated = Object.values(findings).reduce((a, b) => a + b.length, 0);
console.error(`[info] ${Object.keys(findings).length} chunks have untranslated strings, ${totalUntranslated} total`);

// 3. Heuristic priority: REPL/Onboarding/Settings first, then permissions, then tools, then platform
function priorityOf(fname) {
  if (/welcome|onboard|getting|start|intro/i.test(fname)) return 1;
  if (/REPL|repl|prompt|chat/i.test(fname)) return 2;
  if (/settings|permission|approv|allow/i.test(fname)) return 3;
  if (/error|fail|warn/i.test(fname)) return 4;
  if (/tool|bash|file|edit/i.test(fname)) return 5;
  if (/mcp|agent|hook|plugin/i.test(fname)) return 6;
  return 7;
}

const sorted = Object.entries(findings).sort(([a], [b]) => priorityOf(a) - priorityOf(b));

// 4. Emit per-priority bucket summary
const buckets = {};
for (const [f, strs] of sorted) {
  const p = priorityOf(f);
  if (!buckets[p]) buckets[p] = { count: 0, files: 0, examples: [] };
  buckets[p].count += strs.length;
  buckets[p].files += 1;
  if (buckets[p].examples.length < 5) buckets[p].examples.push({ file: f, sample: strs.slice(0, 3) });
}
console.error('[info] Priority buckets:');
for (const [p, b] of Object.entries(buckets).sort()) {
  console.error(`  P${p}: ${b.files} files, ${b.count} strings`);
}

// 5. Dump top 50 files with most strings for next iteration
const top50 = sorted.slice(0, 50);
console.log(JSON.stringify({ top50, totalUntranslated, chunksWithStrings: Object.keys(findings).length }, null, 2));
