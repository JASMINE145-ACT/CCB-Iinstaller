const fs = require('fs');
const c = fs.readFileSync('D:/Projects/claude-code-best/ccb-installer/dist/chunks/prompt-CPOyObod.js', 'utf8');
const idx = c.indexOf('${n?');
console.log('idx', idx);
console.log('char codes around:', [...c.slice(idx, idx + 60)].map(ch => ch.charCodeAt(0).toString(16)));
console.log('slice:', c.slice(idx, idx + 100));
