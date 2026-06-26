import { readFileSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { join } from 'node:path';

const configDir = join(process.env.LOCALAPPDATA, 'CCB-Wanding', '.claude');
const settings = JSON.parse(
  readFileSync(join(configDir, 'settings.json'), 'utf8').replace(/^\uFEFF/, ''),
);
const q = settings.mcpServers.quotation;
const child = spawn(q.command, q.args, {
  stdio: ['pipe', 'pipe', 'pipe'],
  env: { ...process.env, ...q.env },
});
let out = '';
child.stdout.on('data', (d) => {
  out += d;
  const line = out.split('\n').find((l) => l.includes('"id":2'));
  if (line) {
    clearTimeout(timeout);
    console.log('elapsed_ms', Date.now() - t0);
    console.log('response', line.slice(0, 2000));
    child.kill();
    process.exit(line.includes('unit_price') ? 0 : 1);
  }
});
child.stderr.on('data', (d) => process.stderr.write(d));
const send = (obj) => child.stdin.write(`${JSON.stringify(obj)}\n`);
const t0 = Date.now();
send({
  jsonrpc: '2.0',
  id: 1,
  method: 'initialize',
  params: {
    protocolVersion: '2024-11-05',
    capabilities: {},
    clientInfo: { name: 't', version: '1' },
  },
});
setTimeout(() => {
  send({ jsonrpc: '2.0', method: 'notifications/initialized' });
  send({
    jsonrpc: '2.0',
    id: 2,
    method: 'tools/call',
    params: {
      name: 'match_quotation',
      arguments: { keywords: '三通50', customer_level: 'B' },
    },
  });
}, 500);
const timeout = setTimeout(() => {
  console.log('elapsed_ms', Date.now() - t0);
  const line = out.split('\n').find((l) => l.includes('"id":2'));
  console.log('response', line?.slice(0, 2000));
  child.kill();
  process.exit(line && line.includes('unit_price') ? 0 : 1);
}, 90000);
