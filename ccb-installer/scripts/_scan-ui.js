// _scan-ui.js — find ACTUAL English UI strings (not code fragments) in dist/chunks/
// Heuristic: backtick-enclosed string that looks like human prose, not minified JS.
const fs = require('fs');
const path = require('path');

const chunksDir = 'D:/Projects/claude-code-best/ccb-installer/dist/chunks/';
const ps1Path = 'D:/Projects/claude-code-best/ccb-installer/scripts/patch-i18n.ps1';

const ps1 = fs.readFileSync(ps1Path, 'utf8');
const translatedKeys = new Set();
const re = /\[(['"`])([^'\\]{3,300})\1\]\s*=\s*(['"`])/g;
let m;
while ((m = re.exec(ps1))) {
  const k = m[2];
  translatedKeys.add(k);
}
console.error(`[info] ${translatedKeys.size} already-translated keys`);

// Strict UI filter — rejects JS code, identifiers, paths
function isUiText(s) {
  if (translatedKeys.has(s)) return false;
  if (s.includes('\\u')) return false;
  if (/^https?:\/\//.test(s)) return false;
  if (/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(s)) return false;       // identifier
  if (/[=;{}()[\]<>]|=>|function|return |await |const |let |var /.test(s)) return false; // code
  if (/\$\{/.test(s) && !/[A-Za-z]{4,}/.test(s.replace(/\$\{[^}]*\}/g, ''))) return false; // mostly template vars
  if (!/[A-Z]/.test(s)) return false;                          // needs a capital
  if (!/ [a-z]/.test(s)) return false;                         // needs " word" pattern (English prose)
  if (s.length < 8 || s.length > 200) return false;
  if (s.split(/\s+/).length < 2) return false;                 // multi-word
  // common UI markers
  if (!/^[A-Z][a-zA-Z0-9 ,.!?'"()/:+\-—–&%$#@*\d]+$/.test(s)) return false;
  return true;
}

const fileRe = /`([^`\\]{3,200})`/g;
const skipFilePrefixes = [
  'loadAgentsDir-',
];

const skipFileNames = new Set([
  'loadAgentsDir-head-test.js',
  'loadAgentsDir-test108.js',
]);

function shouldSkipFile(fname) {
  return skipFileNames.has(fname) || skipFilePrefixes.some((prefix) => fname.startsWith(prefix));
}

const allFiles = fs.readdirSync(chunksDir).filter((f) => f.endsWith('.js') && !shouldSkipFile(f));

const findings = {};
for (const fname of allFiles) {
  const content = fs.readFileSync(path.join(chunksDir, fname), 'utf8');
  const strings = new Set();
  let mm;
  fileRe.lastIndex = 0;
  while ((mm = fileRe.exec(content))) {
    if (isUiText(mm[1])) strings.add(mm[1]);
  }
  if (strings.size > 0) findings[fname] = [...strings];
}

const totalUntranslated = Object.values(findings).reduce((a, b) => a + b.length, 0);
console.error(`[info] ${Object.keys(findings).length} chunks with untranslated UI, ${totalUntranslated} strings`);

function priorityOf(fname) {
  if (/welcome|onboard|getting|start|intro/i.test(fname)) return 'P1-onboarding';
  if (/REPL|repl|prompt|chat/i.test(fname)) return 'P2-repl';
  if (/settings|permission|approv|allow/i.test(fname)) return 'P3-settings';
  if (/error|fail|warn/i.test(fname)) return 'P4-errors';
  if (/tool|bash|file|edit/i.test(fname)) return 'P5-tools';
  if (/mcp|agent|hook|plugin/i.test(fname)) return 'P6-platform';
  return 'P7-other';
}

const sorted = Object.entries(findings).sort(([a], [b]) =>
  priorityOf(a).localeCompare(priorityOf(b))
);

const buckets = {};
for (const [f, strs] of sorted) {
  const p = priorityOf(f);
  if (!buckets[p]) buckets[p] = { count: 0, files: 0 };
  buckets[p].count += strs.length;
  buckets[p].files += 1;
}
console.error('[info] Buckets:', buckets);

console.log(JSON.stringify({
  total: totalUntranslated,
  chunks: Object.keys(findings).length,
  buckets,
  top30: sorted.slice(0, 30).map(([f, strs]) => ({ file: f, count: strs.length, sample: strs.slice(0, 5) }))
}, null, 2));
