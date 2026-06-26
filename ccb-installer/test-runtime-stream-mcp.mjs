/**
 * B-03.G: stream + MCP tool call
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

const PROMPT =
  process.env.CCB_STAGE3_PROMPT ||
  '请用一句话查「三通50」库存并调用库存工具'

const rt = await createRuntime({ enableMcp: true })
let toolCall = false
let endTurn = false
const deadline = Date.now() + 180000

for await (const ev of rt.runTurn({
  user: PROMPT,
  stream: true,
  sessionId: 'mcp-stream',
})) {
  if (Date.now() > deadline) {
    console.error('[smoke] FAIL: timeout > 180s')
    process.exit(1)
  }
  if (ev.type === 'tool_call_start') toolCall = true
  if (ev.type === 'turn_end') endTurn = true
}

if (!toolCall || !endTurn) {
  console.error(`[smoke] FAIL: toolCall=${toolCall} endTurn=${endTurn}`)
  process.exit(1)
}

console.log('[smoke] PASS stream+mcp')
await rt.close()
process.exit(0)
