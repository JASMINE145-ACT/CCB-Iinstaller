#!/usr/bin/env node
/** Scan loadAgentsDir for short user-facing tool descriptions (like qFt=) still in English */
import fs from 'fs';
import path from 'path';

const chunk = fs.readFileSync(
  path.join('d:/Projects/claude-code-best/ccb-installer/dist/chunks/loadAgentsDir-BMosMfSG.js'),
  'utf8'
);

// qFt=`...`, lXe=`...`, async description patterns
const patterns = [
  /\w+Ft=`([^`]{20,300})`/g,
  /async description\(\)\{return `([^`]{15,300})`/g,
  /async description\(\)\{return "([^"]{15,300})"/g,
  /searchHint:`([^`]{15,200})`/g,
  /userFacingName\(\)\{return`([^`]+)`/g,
];

function isEnglishUi(s) {
  if (s.includes('\\u')) return false;
  if (!/[A-Za-z]{4,}/.test(s)) return false;
  if (/^mcp__|^\/[a-z]/.test(s)) return false;
  if (/^[A-Z][a-zA-Z]+$/.test(s)) return false; // tool name only
  return /[a-z]{3,}.*[a-z]{3,}/i.test(s) && /\b(the|and|for|with|use|tool|not|are|you|this|that|from|via|only|must|can|will)\b/i.test(s);
}

const hits = new Map();
for (const re of patterns) {
  let m;
  re.lastIndex = 0;
  while ((m = re.exec(chunk))) {
    const s = m[1];
    if (isEnglishUi(s)) {
      const key = s.slice(0, 120);
      if (!hits.has(key)) hits.set(key, { text: s, pattern: re.source.slice(0, 40) });
    }
  }
}

console.log(`English tool descriptions in loadAgentsDir: ${hits.size}\n`);
for (const v of [...hits.values()].sort((a, b) => b.text.length - a.text.length).slice(0, 40)) {
  console.log('---');
  console.log(v.text.slice(0, 280) + (v.text.length > 280 ? '...' : ''));
}
