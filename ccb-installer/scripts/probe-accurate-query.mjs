#!/usr/bin/env node
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import os from 'node:os'
import { spawn } from 'node:child_process'

const args = JSON.parse(process.argv[2] || '{}')
const install = process.env.CCB_INSTALL_DIR || 'D:\\CCB-Wanding'
const configDir =
  process.env.CLAUDE_CONFIG_DIR ||
  join(os.homedir(), 'AppData', 'Local', 'CCB-Wanding', '.claude')
const settings = JSON.parse(
  readFileSync(join(configDir, 'settings.json'), 'utf8').replace(/^\uFEFF/, ''),
)
const cfg = settings.mcpServers?.accurate
const child = spawn(cfg.command, cfg.args, {
  stdio: ['pipe', 'pipe', 'pipe'],
  env: { ...process.env, ...cfg.env, AOL_ACCESS_TOKEN: '', AOL_SIGNATURE_SECRET: '', AOL_DATABASE_ID: '' },
})
let out = ''
child.stdout.on('data', (d) => { out += d })
const init = { jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2024-11-05', capabilities: {}, clientInfo: { name: 'q', version: '1' } } }
const call = { jsonrpc: '2.0', id: 2, method: 'tools/call', params: { name: 'accurate_summarize_records', arguments: args } }
child.stdin.write(`${JSON.stringify(init)}\n`)
child.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' })}\n`)
child.stdin.write(`${JSON.stringify(call)}\n`)
setTimeout(() => {
  child.kill()
  const result = out.trim().split('\n').map((l) => { try { return JSON.parse(l) } catch { return null } }).find((r) => r?.id === 2)
  console.log(result?.result?.content?.[0]?.text ?? out.slice(-4000))
}, 180000)
