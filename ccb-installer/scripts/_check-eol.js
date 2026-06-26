const fs = require('fs');
const b = fs.readFileSync('D:/Projects/claude-code-best/ccb-installer/scripts/patch-i18n.ps1');
const s = b.toString('utf8');
const pos = s.indexOf('# BackgroundTasksDialog');
console.log(JSON.stringify(s.slice(pos, pos + 150)));
const slice = b.slice(pos, pos + 150);
for (let i = 0; i < slice.length; i++) {
  if (slice[i] === 0x0d) process.stdout.write(` CR@${i}`);
  if (slice[i] === 0x0a) process.stdout.write(` LF@${i}`);
}
console.log('\n---');
// count line ending styles in file
let crlf = 0, lf = 0, cr = 0;
for (let i = 0; i < b.length - 1; i++) {
  if (b[i] === 0x0d && b[i + 1] === 0x0a) { crlf++; i++; }
  else if (b[i] === 0x0a) lf++;
  else if (b[i] === 0x0d) cr++;
}
console.log({ crlf, lf, cr });
