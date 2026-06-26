const fs = require('fs');
const c = fs.readFileSync('D:/Projects/claude-code-best/ccb-installer/dist/chunks/prompt-CPOyObod.js', 'utf8');
const m = c.match(/[\u4e00-\u9fff]/g);
console.log('cjk count', m ? m.length : 0);
const i = c.indexOf('${n?');
console.log(JSON.stringify(c.slice(i, i + 180)));
