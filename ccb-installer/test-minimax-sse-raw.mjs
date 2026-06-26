/**
 * B-03.0: Phase 0 SSE spike — verify MiniMax stream format
 */
import { loadSmokeEnv } from './lib/load-smoke-env.mjs'
import { loadConfig } from './src/ccb-runtime/Config.js'
import { dirname } from 'path'
import { fileURLToPath } from 'url'

loadSmokeEnv(dirname(fileURLToPath(import.meta.url)))

const cfg = loadConfig()
const res = await fetch(`${cfg.apiBase.replace(/\/$/, '')}/v1/messages`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': cfg.apiKey,
    'anthropic-version': '2023-06-01',
  },
  body: JSON.stringify({
    model: cfg.model,
    max_tokens: 256,
    stream: true,
    messages: [{ role: 'user', content: 'Say hi in 3 words' }],
  }),
})

if (!res.ok) {
  const err = await res.text().catch(() => '')
  console.error(`[spike] FAIL HTTP ${res.status}: ${err.slice(0, 300)}`)
  process.exit(1)
}

const text = await res.text()
const lines = text.split('\n').slice(0, 20)
console.log(lines.join('\n'))

const hasEvent = lines.some(l => l.startsWith('event:'))
const hasData = lines.some(l => l.startsWith('data:'))
if (!hasEvent || !hasData) {
  console.error('[spike] FAIL: expected event: and data: lines in SSE response')
  process.exit(1)
}

console.log('[spike] PASS SSE format detected')
