import { closeSync, mkdirSync, openSync, writeSync } from 'node:fs'
import { dirname } from 'node:path'

export const DEFAULT_REDACT_KEYS = Object.freeze([
  'token',
  'authorization',
  'anthropic_auth_token',
  'anthropic_api_key',
  'api_key',
  'apikey',
  'password',
  'secret',
])

function redactValue(value, redactKeys) {
  if (Array.isArray(value)) {
    return value.map((item) => redactValue(item, redactKeys))
  }
  if (value === null || typeof value !== 'object') {
    return value
  }

  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [
      key,
      redactKeys.has(key.toLowerCase())
        ? '[REDACTED]'
        : redactValue(item, redactKeys),
    ]),
  )
}

export function createAcpUpdateRecorder({
  filePath,
  redactKeys = DEFAULT_REDACT_KEYS,
}) {
  if (typeof filePath !== 'string' || !filePath.trim()) {
    throw new TypeError('filePath must be a non-empty string')
  }

  const normalizedKeys = new Set(redactKeys.map((key) => String(key).toLowerCase()))
  mkdirSync(dirname(filePath), { recursive: true })
  const fd = openSync(filePath, 'a')
  let closed = false

  return {
    record(update) {
      if (closed) throw new Error('ACP update recorder is closed')
      const serialized = JSON.stringify(redactValue(update, normalizedKeys))
      writeSync(fd, `${serialized}\n`, undefined, 'utf8')
    },

    close() {
      if (closed) return
      closeSync(fd)
      closed = true
    },
  }
}
