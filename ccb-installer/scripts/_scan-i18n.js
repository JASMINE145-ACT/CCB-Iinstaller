const fs = require('fs');
const files = {
  grove: 'D:/Projects/claude-code-best/ccb-installer/dist/chunks/Grove-CbuBxe_j.js',
  privacy: 'D:/Projects/claude-code-best/ccb-installer/dist/chunks/privacy-settings-C8Igwlcz.js',
};
for (const [name, p] of Object.entries(files)) {
  const c = fs.readFileSync(p, 'utf8');
  const re = /`([^`\\]{4,200})`/g;
  const set = new Set();
  let m;
  while ((m = re.exec(c))) {
    const s = m[1];
    if (/\\u[0-9a-f]{4}/i.test(s)) continue;
    if (/^[a-z]+-[A-Z]/.test(s)) continue;
    if (/^[a-z_]+$/.test(s)) continue;
    if (/https?:\/\//.test(s)) continue;
    if (/October 8/.test(s)) continue;
    if (/[A-Za-z]{3,}/.test(s) && /[A-Z]/.test(s)) set.add(s);
  }
  console.log('\n=== ' + name + ' ===');
  [...set].sort().forEach((x) => console.log(JSON.stringify(x)));
}
