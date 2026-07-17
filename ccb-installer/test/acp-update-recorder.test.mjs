import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import os from 'node:os'
import { join } from 'node:path'
import test from 'node:test'

import { createAcpUpdateRecorder } from '../lib/acp-update-recorder.mjs'

test('records complete ACP updates as one JSON object per line', () => {
  const dir = mkdtempSync(join(os.tmpdir(), 'ccb-acp-recorder-'))
  const filePath = join(dir, 'events.jsonl')
  const rawOutput = { candidates: [{ code: '8020020755' }], padding: 'x'.repeat(5000) }

  try {
    const recorder = createAcpUpdateRecorder({ filePath })
    recorder.record({
      sessionUpdate: 'tool_call_update',
      status: 'completed',
      rawOutput,
    })
    recorder.record({ sessionUpdate: 'session_completed' })
    recorder.close()

    const lines = readFileSync(filePath, 'utf8').trimEnd().split('\n')
    assert.equal(lines.length, 2)
    assert.deepEqual(JSON.parse(lines[0]).rawOutput, rawOutput)
    assert.equal(JSON.parse(lines[0]).rawOutput.padding.length, 5000)
    assert.equal(JSON.parse(lines[1]).sessionUpdate, 'session_completed')
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('redacts configured secret keys recursively without mutating the input', () => {
  const dir = mkdtempSync(join(os.tmpdir(), 'ccb-acp-recorder-redact-'))
  const filePath = join(dir, 'events.jsonl')
  const update = {
    sessionUpdate: 'tool_call_update',
    token: 'top-secret',
    nested: {
      authorization: 'Bearer hidden',
      safe: 'visible',
    },
  }

  try {
    const recorder = createAcpUpdateRecorder({
      filePath,
      redactKeys: ['token', 'authorization'],
    })
    recorder.record(update)
    recorder.close()

    const recorded = JSON.parse(readFileSync(filePath, 'utf8'))
    assert.equal(recorded.token, '[REDACTED]')
    assert.equal(recorded.nested.authorization, '[REDACTED]')
    assert.equal(recorded.nested.safe, 'visible')
    assert.equal(update.token, 'top-secret')
    assert.equal(update.nested.authorization, 'Bearer hidden')
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('rejects writes after the recorder is closed', () => {
  const dir = mkdtempSync(join(os.tmpdir(), 'ccb-acp-recorder-closed-'))
  const filePath = join(dir, 'events.jsonl')

  try {
    const recorder = createAcpUpdateRecorder({ filePath })
    recorder.close()

    assert.throws(
      () => recorder.record({ sessionUpdate: 'late' }),
      /ACP update recorder is closed/,
    )
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})
