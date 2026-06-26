/**
 * Stage 3: CCB_STAGE=agent — MiniMax + quotation MCP tool loop
 */
import WebSocket from 'ws'
import http from 'http'

const PORT = Number(process.env.CCB_TEST_PORT || 3001)
const TIMEOUT_MS = Number(process.env.CCB_TEST_TIMEOUT_MS || 180000)
const PROMPT = process.env.CCB_STAGE3_PROMPT ||
  '请查询「三通50」的库存，必须使用库存查询工具，最后用 Markdown 表格总结结果（列：产品、库存、价格）。'

function req(method, path, body) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null
    const r = http.request({
      hostname: 'localhost', port: PORT, path, method,
      headers: data ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) } : {},
    }, res => {
      let b = ''
      res.on('data', c => { b += c })
      res.on('end', () => {
        let parsed = {}
        try { parsed = JSON.parse(b || '{}') } catch { parsed = { raw: b } }
        resolve({ status: res.statusCode, body: parsed })
      })
    })
    r.on('error', reject)
    if (data) r.write(data)
    r.end()
  })
}

// 1) stage
const stage = await req('GET', '/debug/stage')
console.log('debug/stage:', JSON.stringify(stage.body))
if (stage.body?.stage !== 'agent' || !stage.body?.mcp_enabled) {
  console.error('FAIL: expected stage=agent mcp_enabled=true')
  process.exit(1)
}

// 2) quotation tools
const mcpTools = await req('GET', '/debug/mcp/quotation/tools')
console.log('quotation tools ok:', mcpTools.body?.ok, 'count:', mcpTools.body?.tools?.length ?? 0)
if (!mcpTools.body?.ok || !(mcpTools.body?.tools?.length > 0)) {
  console.error('FAIL: quotation MCP tools not available', JSON.stringify(mcpTools.body))
  process.exit(1)
}
const toolNames = mcpTools.body.tools.map(t => t.name)
console.log('tool names:', toolNames.join(', '))

// 3) session + chat
const created = await req('POST', '/api/sessions', { title: 'stage3-agent' })
const sessionId = created.body?.id
if (!sessionId) {
  console.error('FAIL: create session', created.body)
  process.exit(1)
}

const events = []
let assistantText = ''
let errorMsg = null
let toolCalling = false

const ws = new WebSocket(`ws://localhost:${PORT}/ws`)
await new Promise((res, rej) => { ws.on('open', res); ws.on('error', rej) })
ws.on('message', raw => {
  const e = JSON.parse(raw)
  events.push(e.type)
  if (e.type === 'tool_calling') toolCalling = true
  if (e.type === 'chunk' && e.content) assistantText += e.content
  if (e.type === 'error') errorMsg = e.error
})

const deadline = Date.now() + TIMEOUT_MS
ws.send(JSON.stringify({ type: 'chat', sessionId, message: PROMPT }))
while (Date.now() < deadline) {
  if (events.includes('done') || errorMsg) break
  await new Promise(r => setTimeout(r, 500))
}
ws.close()

const got = await req('GET', `/api/sessions/${sessionId}`)
const lastAsst = [...(got.body?.messages || [])].reverse().find(m => m.role === 'assistant')
const text = assistantText || lastAsst?.content || ''

console.log('events:', [...new Set(events)].join(', '))
console.log('tool_calling seen:', toolCalling)
console.log('assistant preview:', text.slice(0, 500))

const hasTable = /\|.+\|/.test(text) || /库存|qty|数量|available|on.?hand/i.test(text)
const ok = events.includes('done') && !errorMsg && toolCalling && text.length > 20 && hasTable

if (ok) {
  console.log('PASS: Stage 3 agent — quotation tool loop + readable summary')
  process.exit(0)
}

console.error('FAIL: Stage 3', { toolCalling, hasTable, errorMsg, done: events.includes('done') })
process.exit(1)
