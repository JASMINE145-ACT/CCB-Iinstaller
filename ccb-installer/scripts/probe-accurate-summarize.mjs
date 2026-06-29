#!/usr/bin/env node
/** One-off deep probe: accurate_summarize_records with real AOL creds from settings.json */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import os from 'node:os'
import { spawn } from 'node:child_process'

const install = process.env.CCB_INSTALL_DIR || 'D:\\CCB-Wanding'
const configDir =
  process.env.CLAUDE_CONFIG_DIR ||
  join(os.homedir(), 'AppData', 'Local', 'CCB-Wanding', '.claude')
const settings = JSON.parse(
  readFileSync(join(configDir, 'settings.json'), 'utf8').replace(/^\uFEFF/, ''),
)
const cfg = settings.mcpServers?.accurate
if (!cfg?.command) {
  console.error('accurate MCP not in settings.json')
  process.exit(2)
}

const child = spawn(cfg.command, cfg.args, {
  stdio: ['pipe', 'pipe', 'pipe'],
  env: { ...process.env, ...cfg.env },
})

let out = ''
child.stdout.on('data', (d) => {
  out += d
})
child.stderr.on('data', (d) => {
  process.stderr.write(d)
})

const init = {
  jsonrpc: '2.0',
  id: 1,
  method: 'initialize',
  params: {
    protocolVersion: '2024-11-05',
    capabilities: {},
    clientInfo: { name: 'probe-accurate-summarize', version: '1' },
  },
}
const call = {
  jsonrpc: '2.0',
  id: 2,
  method: 'tools/call',
  params: {
    name: 'accurate_summarize_records',
    arguments: {
      table_name: 'purchase-invoice',
      start_date: '01/01/2026',
      end_date: '31/01/2026',
      group_by: 'month',
      page_size: 10,
      max_pages: 1,
    },
  },
}

child.stdin.write(`${JSON.stringify(init)}\n`)
child.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' })}\n`)
child.stdin.write(`${JSON.stringify(call)}\n`)

setTimeout(() => {
  child.kill()
  const lines = out.trim().split('\n')
  const resp = lines.map((l) => { try { return JSON.parse(l) } catch { return null } }).filter(Boolean)
  const result = resp.find((r) => r.id === 2)
  if (!result) {
    console.error('FAIL: no id=2 response')
    console.error(out.slice(-3000))
    process.exit(1)
  }
  const text = result.result?.content?.[0]?.text ?? JSON.stringify(result)
  const preview = text.slice(0, 500)
  const isError = result.result?.isError === true
  const hasApiError = /\[API 错误\]|\[参数错误\]|AOL_ACCESS_TOKEN 未设置/i.test(text)
  console.log(`isError=${isError} apiOrParamError=${hasApiError}`)
  console.log(preview)
  process.exit(isError || hasApiError ? 1 : 0)
}, 90000)
