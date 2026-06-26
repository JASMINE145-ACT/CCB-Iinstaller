/**
 * B-03.C: abort after first stream delta
 */
import { createRuntime } from './src/ccb-runtime/index.js'
import { loadSmokeEnv } from './lib/load-smoke-env.mjs'
import { dirname } from 'path'
import { fileURLToPath } from 'url'

const ROOT = dirname(fileURLToPath(import.meta.url))
loadSmokeEnv(ROOT)

const token = process.env.ANTHROPIC_AUTH_TOKEN || ''
if (token.length < 20) {
  console.error('[env] FAIL: token missing')
  process.exit(2)
}

const rt = await createRuntime()
const sessionId = `sess-abort-${Date.now()}`
let gotAborted = false
let abortAt = 0

for await (const ev of rt.runTurn({
  user: '详细介绍万鼎的报价、库存、Accurate 三条业务线（每条 500 字）',
  stream: true,
  sessionId,
})) {
  if (ev.type === 'text_delta' && !abortAt) {
    abortAt = Date.now()
    rt.abort(sessionId)
  }
  if (ev.type === 'turn_aborted') {
    gotAborted = true
    if (!abortAt || Date.now() - abortAt > 1000) {
      console.error('[smoke] FAIL: turn_aborted took > 1s after abort()')
      process.exit(1)
    }
    break
  }
}

if (!gotAborted || rt.activeAbortCount() !== 0) {
  console.error(`[smoke] FAIL: gotAborted=${gotAborted} active=${rt.activeAbortCount()}`)
  process.exit(1)
}

const out = await rt.runTextTurn({ user: 'Reply with exactly: OK' })
if (!out.text.includes('OK')) {
  console.error('[smoke] FAIL: post-abort runTextTurn broken')
  process.exit(1)
}

console.log('[smoke] PASS abort + post-abort OK')
await rt.close()
process.exit(0)
