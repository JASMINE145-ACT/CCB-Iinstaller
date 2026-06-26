/**
 * B-02: ccb-runtime AgentLoop + MCP smoke (aligns with test-stage3-agent.mjs)
 */
import { dirname } from 'path'
import { fileURLToPath } from 'url'
import { createRuntime } from './src/ccb-runtime/index.js'
import { loadSystemPrompt, resolvePaths } from './src/ccb-runtime/index.js'
import { loadSmokeEnv } from './lib/load-smoke-env.mjs'

const ROOT = dirname(fileURLToPath(import.meta.url))
const TIMEOUT_MS = Math.max(300000, Number(process.env.CCB_TEST_TIMEOUT_MS || 300000))

loadSmokeEnv(ROOT)

const token = process.env.ANTHROPIC_AUTH_TOKEN || ''
const preview = token.length >= 8 ? `${token.slice(0, 4)}…${token.slice(-4)}` : '(empty)'
console.log(`[env] ANTHROPIC_AUTH_TOKEN.length = ${token.length} (${preview})`)
if (token.length < 20) {
  console.error('[env] FAIL: ANTHROPIC_AUTH_TOKEN missing or too short')
  process.exit(2)
}

const { text: sysPrompt, sources } = loadSystemPrompt(resolvePaths())
console.log(`[prompt] sources=${sources.join(',') || 'none'} len=${sysPrompt.length}`)

const PROMPT =
  process.env.CCB_STAGE3_PROMPT ||
  '请查询「三通50」的库存，必须使用库存查询工具，最后用 Markdown 表格总结结果（列：产品、库存、价格）。'

const rt = await createRuntime({ enableMcp: true })

const mcpInfo = await rt.listMcp()
const status = mcpInfo.status
const serverNames = Object.keys(status)
console.log(`[mcp] servers=${serverNames.join(',') || 'none'}`)

for (const [name, s] of Object.entries(status)) {
  console.log(`[mcp:${name}] framing=${s.framing} connected=${s.connected} tools=${s.tools?.length ?? 0}`)
  if (name === 'quotation' && s.framing !== 'ndjson') {
    console.error(`[smoke] FAIL: expected ndjson for quotation, got ${s.framing}`)
    process.exit(1)
  }
}

if (!status.quotation?.tools?.length) {
  console.error('[smoke] FAIL: quotation MCP tools not available')
  process.exit(1)
}

if (!status.accurate) {
  console.warn('[mcp] WARN: accurate MCP not configured (non-fatal)')
}

const t0 = Date.now()
let gotToolCall = false
let gotToolResult = false
let gotEndTurn = false
let textTotal = ''
let finalStopReason = ''
let finalUsage = null

for await (const ev of rt.runTurn({ user: PROMPT })) {
  if (Date.now() - t0 > TIMEOUT_MS) {
    console.error(`[smoke] FAIL: timeout > ${TIMEOUT_MS}ms`)
    process.exit(1)
  }

  switch (ev.type) {
    case 'text_delta':
      textTotal += ev.text
      break
    case 'tool_call_start':
      gotToolCall = true
      break
    case 'tool_result':
      gotToolResult = true
      break
    case 'turn_end':
      gotEndTurn = true
      finalStopReason = ev.stop_reason
      textTotal = ev.text || textTotal
      finalUsage = ev.usage
      break
    case 'error':
      console.error('[error]', ev.error)
      process.exit(1)
  }
}

const dt = Date.now() - t0

if (!gotToolCall) {
  console.error('[smoke] FAIL: no tool_call_start')
  process.exit(1)
}
if (!gotToolResult) {
  console.error('[smoke] FAIL: no tool_result')
  process.exit(1)
}
if (!gotEndTurn) {
  console.error('[smoke] FAIL: no turn_end')
  process.exit(1)
}
if (finalStopReason !== 'end_turn' && finalStopReason !== 'max_rounds') {
  console.error(`[smoke] FAIL: stop_reason = ${finalStopReason}`)
  process.exit(1)
}
if (!textTotal.trim()) {
  console.error('[smoke] FAIL: empty text')
  process.exit(1)
}

const hasTable = textTotal.includes('|') || /库存|三通|DN/i.test(textTotal)
if (!hasTable) {
  console.error('[smoke] FAIL: Stage 3 output missing table/keywords')
  console.error('  text preview:', textTotal.slice(0, 200))
  process.exit(1)
}

if (!finalUsage || finalUsage.input_tokens <= 0) {
  console.error('[smoke] FAIL: usage.input_tokens <= 0')
  process.exit(1)
}

console.log(`[smoke] PASS in ${dt}ms`)
console.log(`  tool_call:   ${gotToolCall}`)
console.log(`  tool_result: ${gotToolResult}`)
console.log(`  stop_reason: ${finalStopReason}`)
console.log(`  usage:       ${JSON.stringify(finalUsage)}`)
console.log(`  text:        ${textTotal.slice(0, 120)}`)

await rt.close()
process.exit(0)
