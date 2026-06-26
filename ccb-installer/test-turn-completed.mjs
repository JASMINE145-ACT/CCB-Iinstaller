import WebSocket from 'ws'
import http from 'http'

const PORT = Number(process.env.CCB_TEST_PORT || 3001)

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
      res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(b || '{}') }))
    })
    r.on('error', reject)
    if (data) r.write(data)
    r.end()
  })
}

const events = []
const ws = new WebSocket(`ws://localhost:${PORT}/ws`)
await new Promise((res, rej) => { ws.on('open', res); ws.on('error', rej) })
ws.on('message', raw => {
  const e = JSON.parse(raw)
  events.push(e.name)
  if (e.name === 'turn.completed') {
    console.log('turn.completed runtime:', JSON.stringify(e.data?.runtime))
  }
})

const conv = (await req('POST', '/api/conversations', { name: 'spin-test', type: 'aionrs' })).body.data
const convGet = (await req('GET', `/api/conversations/${conv.id}`)).body.data
console.log('GET runtime:', JSON.stringify(convGet.runtime))

await req('POST', `/api/conversations/${conv.id}/messages`, { content: '你好', type: 'text' })
await new Promise(r => setTimeout(r, 1500))

console.log('events:', events.join(', '))
console.log('has turn.completed:', events.includes('turn.completed'))
ws.close()
process.exit(events.includes('turn.completed') ? 0 : 1)
