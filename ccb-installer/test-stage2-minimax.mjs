/**
 * Stage 2: CCB_STAGE=minimax — MiniMax pure text via serve-wanding
 * Uses current /api/sessions + WS chat protocol (not legacy /api/conversations).
 */
import WebSocket from 'ws'
import http from 'http'

const PORT = Number(process.env.CCB_TEST_PORT || 3001)
const TIMEOUT_MS = Number(process.env.CCB_TEST_TIMEOUT_MS || 120000)

function req(method, path, body) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null
    const r = http.request({
      hostname: 'localhost',
      port: PORT,
      path,
      method,
      headers: data
        ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) }
        : {},
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

// 1) debug/stage
const stage = await req('GET', '/debug/stage')
console.log('debug/stage:', JSON.stringify(stage.body))
if (stage.body?.stage !== 'minimax') {
  console.error('FAIL: expected stage=minimax, got', stage.body?.stage)
  process.exit(1)
}

// 2) create session
const created = await req('POST', '/api/sessions', { title: 'stage2-test' })
if (created.status !== 200 || !created.body?.id) {
  console.error('FAIL: create session', created.status, created.body)
  process.exit(1)
}
const sessionId = created.body.id
console.log('session:', sessionId)

// 3) WS chat + collect events
const events = []
let assistantText = ''
let errorMsg = null

const ws = new WebSocket(`ws://localhost:${PORT}/ws`)
await new Promise((res, rej) => { ws.on('open', res); ws.on('error', rej) })

ws.on('message', raw => {
  let e
  try { e = JSON.parse(raw) } catch { return }
  events.push(e.type)
  if (e.type === 'chunk' && e.content) assistantText += e.content
  if (e.type === 'error') errorMsg = e.error
  if (e.type === 'done') console.log('done duration:', e.duration, 'ms')
})

const deadline = Date.now() + TIMEOUT_MS
ws.send(JSON.stringify({ type: 'chat', sessionId, message: '你好，请用一句话介绍你自己' }))

while (Date.now() < deadline) {
  if (events.includes('done') || errorMsg) break
  await new Promise(r => setTimeout(r, 500))
}

ws.close()

// 4) fetch session messages
const got = await req('GET', `/api/sessions/${sessionId}`)
const messages = got.body?.messages || []
const lastAsst = [...messages].reverse().find(m => m.role === 'assistant')

console.log('events:', events.join(', '))
console.log('assistant (ws chunks):', assistantText.slice(0, 200) || '(empty)')
console.log('assistant (stored):', (lastAsst?.content || '').slice(0, 200) || '(empty)')
if (errorMsg) console.log('error:', errorMsg)

const text = assistantText || lastAsst?.content || ''
const ok = events.includes('done') && !errorMsg && text.length > 0 && text !== '你好，我是 CCB-Wanding。'

if (ok) {
  console.log('PASS: Stage 2 minimax — real MiniMax reply received')
  process.exit(0)
}

console.error('FAIL: Stage 2 — no real assistant text or missing done event')
process.exit(1)
