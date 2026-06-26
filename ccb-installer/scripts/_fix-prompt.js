const fs = require('fs');
const path = 'D:/Projects/claude-code-best/ccb-installer/dist/chunks/prompt-CPOyObod.js';
const orig = fs.readFileSync(path, 'utf8');
const out = orig.replace(/`([^`\\]*(?:\\.[^`\\]*)*)`/g, (full, inner) => {
  if (!/[\u4e00-\u9fff]/.test(inner)) return full;
  const escaped = inner.replace(/[\u4e00-\u9fff]/g, (ch) =>
    '\\u' + ch.charCodeAt(0).toString(16).padStart(4, '0')
  );
  return '`' + escaped + '`';
});
console.log('changed', out !== orig);
if (out !== orig) {
  fs.writeFileSync(path, out, 'utf8');
  console.log('written');
  const i = out.indexOf('${n?');
  console.log(out.slice(i, i + 120));
}
