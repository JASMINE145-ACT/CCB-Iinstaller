import { readFileSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { join } from 'node:path';

const configDir = join(process.env.LOCALAPPDATA, 'CCB-Wanding', '.claude');
const settings = JSON.parse(
  readFileSync(join(configDir, 'settings.json'), 'utf8').replace(/^\uFEFF/, ''),
);
const q = settings.mcpServers.quotation;

function callTool(child, id, keywords) {
  return new Promise((resolve) => {
    let buf = '';
    const onData = (d) => {
      buf += d;
      if (buf.includes(`"id":${id}`)) {
        child.stdout.off('data', onData);
        resolve({ ms: 0, line: buf.split('\n').find((l) => l.includes(`"id":${id}`)) });
      }
    };
    child.stdout.on('data', onData);
    child.stdin.write(
      `${JSON.stringify({
        jsonrpc: '2.0',
        id,
        method: 'tools/call',
        params: { name: 'match_quotation', arguments: { keywords, customer_level: 'B' } },
      })}\n`,
    );
  });
}

const child = spawn(q.command, q.args, {
  stdio: ['pipe', 'pipe', 'pipe'],
  env: { ...process.env, ...q.env },
});
child.stderr.on('data', (d) => process.stderr.write(d));
child.stdin.write(
  `${JSON.stringify({
    jsonrpc: '2.0',
    id: 1,
    method: 'initialize',
    params: {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: { name: 't', version: '1' },
    },
  })}\n`,
);
child.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' })}\n`);

const t0 = Date.now();
await callTool(child, 2, '三通50');
const t1 = Date.now();
console.log('first_call_ms', t1 - t0);
await callTool(child, 3, '直接50');
const t2 = Date.now();
console.log('second_call_ms', t2 - t1);
child.kill();
