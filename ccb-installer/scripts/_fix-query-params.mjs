import fs from 'fs';
import path from 'path';

const chunksDir = path.resolve('dist/chunks');
for (const name of fs.readdirSync(chunksDir)) {
  if (!name.endsWith('.js')) continue;
  const p = path.join(chunksDir, name);
  let s = fs.readFileSync(p, 'utf8');
  const before = s;
  s = s.replaceAll('query\\u53c2\\u6570', 'queryParameters');
  s = s.replaceAll('model\\u53c2\\u6570', 'modelParameters');
  if (s !== before) {
    fs.writeFileSync(p, s, 'utf8');
    console.log('fixed', name);
  }
}
