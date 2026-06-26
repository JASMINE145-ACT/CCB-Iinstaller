const fs = require('fs');
const lines = fs.readFileSync('D:/Projects/claude-code-best/ccb-installer/scripts/patch-i18n.ps1', 'utf8').split(/\r?\n/);
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  if (/^#.*\$chunk\w+\s*=/.test(line)) {
    console.log(`L${i + 1}:`, JSON.stringify(line));
  }
}
