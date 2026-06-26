import { spawn } from 'child_process';
import path from 'path';

const exe = path.resolve('vendor/mcp-servers/excel-mcp/mcp-excel.exe');
const proc = spawn(exe, [], { stdio: ['pipe', 'pipe', 'pipe'] });
let out = '';
proc.stdout.on('data', (d) => { out += d; });
proc.stderr.on('data', (d) => { out += d; });

function send(msg) {
  proc.stdin.write(JSON.stringify(msg) + '\n');
}

send({
  jsonrpc: '2.0',
  id: 1,
  method: 'initialize',
  params: {
    protocolVersion: '2024-11-05',
    capabilities: {},
    clientInfo: { name: 'ccb-i18n-scan', version: '1.0' },
  },
});

setTimeout(() => {
  send({ jsonrpc: '2.0', method: 'notifications/initialized' });
  send({ jsonrpc: '2.0', id: 2, method: 'prompts/list', params: {} });
}, 500);

setTimeout(() => {
  const lines = out.split('\n').filter(Boolean);
  for (const line of lines) {
    try {
      const j = JSON.parse(line);
      if (j.id === 2 && j.result?.prompts) {
        for (const p of j.result.prompts) {
          console.log(`${p.name}\t${p.description ?? ''}`);
        }
      }
    } catch {}
  }
  if (!out.includes('"prompts"')) {
    console.error('RAW OUTPUT:\n', out.slice(0, 4000));
  }
  proc.kill();
}, 4000);
