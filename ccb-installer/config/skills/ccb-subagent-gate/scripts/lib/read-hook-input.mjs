#!/usr/bin/env node

const fieldNames = [
  'hook_event_name',
  'agent_type',
  'session_id',
  'last_assistant_message',
  'agent_transcript_path',
  'transcript_path',
]

let buffer = ''
let finished = false

function parseJson(value) {
  if (!value.trim()) return null
  try {
    return JSON.parse(value)
  } catch {
    return null
  }
}

function finish(value) {
  if (finished) return
  finished = true
  clearTimeout(timer)
  process.stdin.pause()
  const payload = parseJson(value) ?? {}
  const output = fieldNames
    .map((field) => `${String(payload[field] ?? '')}\0`)
    .join('')
  process.stdout.write(output, () => process.exit(0))
}

const timer = setTimeout(() => finish(buffer), 8000)

process.stdin.setEncoding('utf8')
process.stdin.on('data', (chunk) => {
  buffer += chunk
  if (parseJson(buffer)) finish(buffer)
})
process.stdin.on('end', () => finish(buffer))
process.stdin.on('error', () => finish(''))
process.stdin.resume()
