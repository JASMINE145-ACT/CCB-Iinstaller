// _build-translations.js — generate PowerShell chunk table entries from a JSON spec
// Usage: node _build-translations.js <spec.json>
// Spec format: { "chunkName": { "English key": "中文翻译", ... }, ... }
const fs = require('fs');

function toUnicodeEscapes(s) {
  let out = '';
  for (const ch of s) {
    const cp = ch.codePointAt(0);
    if (cp < 0x80) {
      out += ch;
    } else if (cp <= 0xffff) {
      out += '\\u' + cp.toString(16).padStart(4, '0');
    } else {
      // surrogate pair
      const high = Math.floor((cp - 0x10000) / 0x400) + 0xd800;
      const low = ((cp - 0x10000) % 0x400) + 0xdc00;
      out += '\\u' + high.toString(16).padStart(4, '0') + '\\u' + low.toString(16).padStart(4, '0');
    }
  }
  return out;
}

function psEscape(s) {
  return s.replace(/'/g, "''");
}

const spec = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const lines = [];
for (const [chunkName, entries] of Object.entries(spec)) {
  lines.push(`$chunk${chunkName} = @{}`);
  for (const [en, zh] of Object.entries(entries)) {
    const key = psEscape(en);
    const val = toUnicodeEscapes(zh);
    lines.push(`$chunk${chunkName}['${key}'] = '${val}'`);
  }
  lines.push(`Patch-AllChunks -DistDir $ChunksDir -Replacements $chunk${chunkName}`);
  lines.push('');
}
process.stdout.write(lines.join('\n'));
