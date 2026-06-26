/**
 * Ensure patch-i18n.ps1 is ASCII-only: convert any non-ASCII in quoted strings to \uXXXX
 */
const fs = require('fs');
const path = 'D:/Projects/claude-code-best/ccb-installer/scripts/patch-i18n.ps1';
let text = fs.readFileSync(path, 'utf8');

function escapeNonAscii(str) {
  return str.replace(/[^\x00-\x7F]/g, (ch) => {
    const cp = ch.codePointAt(0);
    if (cp > 0xffff) {
      const hi = Math.floor((cp - 0x10000) / 0x400) + 0xd800;
      const lo = ((cp - 0x10000) % 0x400) + 0xdc00;
      return '\\u' + hi.toString(16).padStart(4, '0') + '\\u' + lo.toString(16).padStart(4, '0');
    }
    return '\\u' + cp.toString(16).padStart(4, '0');
  });
}

// ASCII-only comments that had CJK
text = text.replace(/^#.*[^\x00-\x7F].*$/gm, (line) => {
  const m = line.match(/^#+\s*(\S+)/);
  return '# ' + (m ? m[1].replace(/[^\x00-\x7F]/g, '') : 'section');
});

// Single-quoted strings
text = text.replace(/'((?:[^'\\]|'')*)'/g, (match, inner) => {
  if (!/[^\x00-\x7F]/.test(inner)) return match;
  if (/\\u[0-9a-fA-F]{4}/.test(inner) && !/[^\x00-\x7F]/.test(inner.replace(/\\u[0-9a-fA-F]{4}/g, ''))) return match;
  return "'" + escapeNonAscii(inner) + "'";
});

// Double-quoted strings (avoid breaking already-escaped content)
text = text.replace(/"((?:[^"\\]|\\.)*)"/g, (match, inner) => {
  if (!/[^\x00-\x7F]/.test(inner)) return match;
  return '"' + escapeNonAscii(inner) + '"';
});

fs.writeFileSync(path, text, 'utf8');
const remaining = (text.match(/[^\x00-\x7F]/g) || []).length;
console.log('Remaining non-ASCII chars in PS1:', remaining);
if (remaining > 0) {
  text.split('\n').forEach((l, i) => {
    if (/[^\x00-\x7F]/.test(l)) console.log(`L${i + 1}: ${l.slice(0, 120)}`);
  });
}
