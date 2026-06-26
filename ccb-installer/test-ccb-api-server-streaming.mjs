/**
 * B-04b: stream + abort via ccb-api-server
 */
import { spawn } from 'node:child_process'
import { createInterface } from 'node:readline'
import { existsSync } from 'node:fs'
import { setTimeout as sleep } from 'node:timers/promises'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { loadSmokeEnv } from './lib/load-smoke-env.mjs'
import { STREAM_FIRST_DELTA_TIMEOUT_MS } from './src/ccb-runtime/Config.js'

const ROOT = dirname(fileURLToPath(import.meta.url))
loadSmokeEnv(ROOT)

const PORT = Number(process.env.CCB_API_TEST_PORT || 3100)

const STREAM_GATE_MS = Math.max(STREAM_FIRST_DELTA_TIMEOUT_MS, 10000)

/** B-04 §3.4: reply to server heartbeat so WS stays alive during long streams */
function handleWsControl(ws, raw) {
  try {
    const msg = JSON.parse(String(raw))
    if (msg.type === 'ping') {
      ws.send(JSON.stringify({ type: 'pong' }))
      return true
    }
  } catch {
    /* ignore */
  }
  return false
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
for await (const line of readlines(cli.stderr)) {
  if (line.includes('[ccb-api] listening on')) {
    ready = true
    break
  }
}
if (!ready) {
  console.error('[smoke] FAIL: server start')
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

  // warm MCP before stream gate
  await fetch(`${base}/api/tools`).then(r => r.json())

  // ── B-04b.A stream over WS ──
  const { sessionId } = await fetch(`${base}/api/sessions`, { method: 'POST' }).then(r => r.json())
  const events = []

  await new Promise((resolve, reject) => {
    const ws = new WebSocket(`ws://127.0.0.1:${PORT}/ws?sessionId=${sessionId}`)
    const postT0 = Date.now()
    let firstDeltaMs = 0

    ws.onmessage = ev => {
      if (handleWsControl(ws, ev.data)) return
      try {
        const msg = JSON.parse(String(ev.data))
        if (msg.type !== 'event') return
        events.push(msg.event)
        if (msg.event?.type === 'text_delta' && !firstDeltaMs) {
          firstDeltaMs = Date.now() - postT0
        }
        if (msg.event?.type === 'turn_end') {
          ws.close()
          if (firstDeltaMs > STREAM_GATE_MS) {
            reject(new Error(`first delta too slow: ${firstDeltaMs}ms`))
            return
          }
          if (events.filter(e => e.type === 'text_delta').length < 2) {
            reject(new Error('need >=2 text_delta'))
            return
          }
          resolve(firstDeltaMs)
        }
      } catch {
        /* ignore */
      }
    }

    ws.onopen = () => {
      fetch(`${base}/api/sessions/${sessionId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user: '用三句话介绍万鼎业务', stream: true }),
      }).catch(reject)
    }
    ws.onerror = reject
    setTimeout(() => reject(new Error('stream ws timeout')), 120000)
  })

  // ── B-04b.B cancel ──
  const { sessionId: sid2 } = await fetch(`${base}/api/sessions`, { method: 'POST' }).then(r => r.json())
  let abortAt = 0
  let gotAborted = false

  await new Promise((resolve, reject) => {
    const ws = new WebSocket(`ws://127.0.0.1:${PORT}/ws?sessionId=${sid2}`)
    const events = []
    ws.onmessage = ev => {
      if (handleWsControl(ws, ev.data)) return
      const msg = JSON.parse(String(ev.data))
      if (msg.type !== 'event') return
      events.push(msg.event?.type)
      if (msg.event?.type === 'text_delta' && !abortAt) {
        abortAt = Date.now()
        fetch(`${base}/api/sessions/${sid2}/cancel`, { method: 'POST' })
      }
      if (msg.event?.type === 'turn_aborted') {
        gotAborted = true
        if (Date.now() - abortAt > 1000) {
          reject(new Error('turn_aborted > 1s after cancel'))
          return
        }
        ws.close()
        resolve(undefined)
      }
    }
    ws.onopen = () => {
      fetch(`${base}/api/sessions/${sid2}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user: '详细介绍万鼎报价、库存、Accurate 三条业务线（每条 500 字）',
          stream: true,
        }),
      }).catch(reject)
    }
    setTimeout(
      () => reject(new Error(`cancel timeout (events: ${events.join(', ') || 'none'})`)),
      60000,
    )
  })

  if (!gotAborted) throw new Error('no turn_aborted')

  console.log('[smoke] PASS stream+cancel')
  await cleanup(0)
} catch (e) {
  console.error('[smoke] FAIL', e?.message || e)
  await cleanup(1)
}
