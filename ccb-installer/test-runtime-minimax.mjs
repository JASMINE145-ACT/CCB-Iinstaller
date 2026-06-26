/**
 * B-01.A: ccb-runtime MiniMax smoke test (no serve-wanding, no SDK query)
 */
import { dirname } from 'path'
import { fileURLToPath } from 'url'
import { createRuntime } from './src/ccb-runtime/index.js'
import { loadSmokeEnv } from './lib/load-smoke-env.mjs'

const ROOT = dirname(fileURLToPath(import.meta.url))

loadSmokeEnv(ROOT)

// B-01.C: env propagation visible (no token value printed)
const token = process.env.ANTHROPIC_AUTH_TOKEN || ''
const preview = token.length >= 8 ? `${token.slice(0, 4)}…${token.slice(-4)}` : '(empty)'
console.log(`[env] ANTHROPIC_AUTH_TOKEN.length = ${token.length} (${preview})`)
if (token.length < 20) {
  console.error('[env] FAIL: ANTHROPIC_AUTH_TOKEN missing or too short — env 未传播到进程')
  process.exit(2)
}

const rt = await createRuntime()

const t0 = Date.now()
const out = await rt.runTextTurn({ user: 'Reply with exactly: PONG' })
const dt = Date.now() - t0

if (!out.text || out.text.trim() === '') {
  console.error('[smoke] FAIL: empty text')
  process.exit(1)
}
if (!out.usage || out.usage.input_tokens <= 0) {
  console.error('[smoke] FAIL: usage.input_tokens <= 0')
  process.exit(1)
}
if (out.stop_reason !== 'end_turn') {
  console.error(`[smoke] FAIL: stop_reason = ${out.stop_reason}`)
  process.exit(1)
}
if (dt > 30_000) {
  console.error(`[smoke] FAIL: took ${dt}ms > 30000ms`)
  process.exit(1)
}

console.log(`[smoke] PASS in ${dt}ms`)
console.log(`  text:        ${out.text.slice(0, 80)}`)
console.log(`  usage:       ${JSON.stringify(out.usage)}`)
console.log(`  stop_reason: ${out.stop_reason}`)

await rt.close()
process.exit(0)
