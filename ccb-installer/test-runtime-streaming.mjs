/**
 * B-03.A/B: streaming first delta + end_turn
 */
import { createRuntime } from './src/ccb-runtime/index.js'
import { loadSmokeEnv } from './lib/load-smoke-env.mjs'
import { dirname } from 'path'
import { fileURLToPath } from 'url'
import { STREAM_FIRST_DELTA_TIMEOUT_MS } from './src/ccb-runtime/Config.js'

const ROOT = dirname(fileURLToPath(import.meta.url))
loadSmokeEnv(ROOT)

const token = process.env.ANTHROPIC_AUTH_TOKEN || ''
if (token.length < 20) {
  console.error('[env] FAIL: token missing')
  process.exit(2)
}

const rt = await createRuntime()
const sessionId = `sess-${Date.now()}`
let firstDeltaAt = 0
let deltaCount = 0
let finalStop = ''
let finalUsage = null
const t0 = Date.now()

for await (const ev of rt.runTurn({
  user: '用三句话介绍万鼎业务',
  stream: true,
  sessionId,
})) {
  if (ev.type === 'text_delta') {
    deltaCount++
    if (!firstDeltaAt) firstDeltaAt = Date.now() - t0
  }
  if (ev.type === 'turn_end') {
    finalStop = ev.stop_reason
    finalUsage = ev.usage
  }
}

if (!firstDeltaAt || firstDeltaAt > STREAM_FIRST_DELTA_TIMEOUT_MS) {
  console.error(`[smoke] FAIL: first delta at ${firstDeltaAt}ms (>${STREAM_FIRST_DELTA_TIMEOUT_MS})`)
  process.exit(1)
}
if (deltaCount < 2) {
  console.error(`[smoke] FAIL: only ${deltaCount} text_delta events`)
  process.exit(1)
}
if (finalStop !== 'end_turn' || !finalUsage?.input_tokens) {
  console.error(`[smoke] FAIL: stop=${finalStop} usage=${JSON.stringify(finalUsage)}`)
  process.exit(1)
}

console.log(`[smoke] PASS first=${firstDeltaAt}ms chunks=${deltaCount} stop=${finalStop}`)
await rt.close()
process.exit(0)
