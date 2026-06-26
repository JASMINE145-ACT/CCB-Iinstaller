/**
 * B-04a: ccb-api-server + cli.js --ccb-api smoke
 */
import { spawn } from 'node:child_process'
import { createInterface } from 'node:readline'
import { existsSync } from 'node:fs'
import { setTimeout as sleep } from 'node:timers/promises'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { loadSmokeEnv } from './lib/load-smoke-env.mjs'

const ROOT = dirname(fileURLToPath(import.meta.url))
loadSmokeEnv(ROOT)

const PORT = Number(process.env.CCB_API_TEST_PORT || 3099)
const TIMEOUT_MS = Math.max(120000, Number(process.env.CCB_TEST_TIMEOUT_MS || 120000))

const token = process.env.ANTHROPIC_AUTH_TOKEN || ''
if (token.length < 20) {
  console.error('[env] FAIL: ANTHROPIC_AUTH_TOKEN missing')
  process.exit(2)
}

function resolveBun(root) {
  for (const p of [
    join(root, 'vendor', 'bun', 'bun.exe'),
    join(root, 'resources', 'bun', 'bun.exe'),
  ]) {
    if (existsSync(p)) return p
  }
  return 'bun'
}

function readlines(stream) {
  const rl = createInterface({ input: stream })
  return (async function* () {
    for await (const line of rl) yield line
  })()
}

const bun = resolveBun(ROOT)
const cli = spawn(bun, ['dist/cli.js', '--ccb-api', '--port', String(PORT)], {
  cwd: ROOT,
  env: process.env,
  stdio: ['ignore', 'pipe', 'pipe'],
})

let ready = false
const readyDeadline = Date.now() + 30000
for await (const line of readlines(cli.stderr)) {
  if (line.includes('[ccb-api] listening on')) {
    ready = true
    break
  }
  if (Date.now() > readyDeadline) break
}

if (!ready) {
  console.error('[smoke] FAIL: server did not start')
  cli.kill()
  process.exit(1)
}

async function cleanup(code) {
  cli.kill()
  await sleep(500)
  process.exit(code)
}

try {
  const base = `http://127.0.0.1:${PORT}`

  const h = await fetch(`${base}/api/health`).then(r => r.json())
  if (!h.ok || h.runtime !== 'ccb-runtime') {
    throw new Error(`health FAIL: ${JSON.stringify(h)}`)
  }

  const tools = await fetch(`${base}/api/tools`).then(r => r.json())
  if (!Array.isArray(tools) || !tools.some(t => String(t.name).includes('get_inventory_by_code'))) {
    throw new Error(`tools FAIL: count=${tools?.length}`)
  }

  const created = await fetch(`${base}/api/sessions`, { method: 'POST' }).then(r => r.json())
  const { sessionId } = created
  if (!sessionId) throw new Error('create session FAIL')

  const getStatus = await fetch(`${base}/api/sessions/${sessionId}`).then(r => r.status)
  if (getStatus !== 200) throw new Error(`get session FAIL: ${getStatus}`)

  const t0 = Date.now()
  const msg = await fetch(`${base}/api/sessions/${sessionId}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      user: '查"三通 DN50"库存，用 get_inventory_by_code，最后 Markdown 表格',
    }),
  }).then(r => r.json())

  if (Date.now() - t0 > TIMEOUT_MS) throw new Error('message timeout')
  if (!msg.text || !String(msg.text).includes('|')) {
    throw new Error(`message FAIL: ${String(msg.text || '').slice(0, 120)}`)
  }

  const del = await fetch(`${base}/api/sessions/${sessionId}`, { method: 'DELETE' }).then(r => r.status)
  if (del !== 204) throw new Error(`delete FAIL: ${del}`)

  console.log(`[smoke] PASS port=${PORT} dt=${Date.now() - t0}ms`)
  await cleanup(0)
} catch (e) {
  console.error('[smoke] FAIL', e?.message || e)
  await cleanup(1)
}
