const fs = require('fs');
const c = fs.readFileSync('D:/Projects/claude-code-best/ccb-installer/dist/chunks/prompt-CPOyObod.js', 'utf8');
let i = 0;
while (i < c.length) {
  if (c[i] === '`') {
    let j = i + 1;
    while (j < c.length) {
      if (c[j] === '\\') { j += 2; continue; }
      if (c[j] === '`') break;
      j++;
    }
    const inner = c.slice(i + 1, j);
    if (/[\u4e00-\u9fff]/.test(inner)) {
      console.log('--- at', i, 'len', inner.length);
      console.log(JSON.stringify(inner.slice(0, 80)));
    }
    i = j + 1;
  } else i++;
}
