import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

import { createCcbAcpAdapter } from '../adapters/ccb-acp/index.mjs'
import { sha256Canonical } from '../core/canonical-json.mjs'
import { runCase } from '../core/run-case.mjs'
import { validateContract } from '../core/schema-validator.mjs'

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const caseDefinition = JSON.parse(readFileSync(
  join(repoRoot, '.agent-eval', 'cases', 'quotation-direct50-price-stock.json'),
  'utf8',
))
const updates = readFileSync(
  new URL('./fixtures/ccb-acp/tool-call-updates.jsonl', import.meta.url),
  'utf8',
).trim().split(/\r?\n/u).map((line) => JSON.parse(line))

function fixtureTransport(overrides = {}) {
  return {
    async validateEnvironment() { return { ok: true } },
    async startSession({ traceId }) { return { id: 'fixture-session', traceId } },
    async sendPrompt() {},
    async collectUpdates() { return structuredClone(updates) },
    async snapshotState() { return { supported: false } },
    async cleanup() {},
    ...overrides,
  }
}

test('runs the locked golden Case deterministically through the CCB ACP adapter', async () => {
  const adapter = createCcbAcpAdapter({ transport: fixtureTransport() })
  const result = await runCase({
    caseDefinition,
    adapter,
    traceId: 'trace-golden-fixture',
  })

  assert.equal(result.verdict, 'NEEDS_REVIEW')
  assert.equal(result.judgment_status, 'pending')
  assert.deepEqual(result.grader_results.map(({ status }) => status), Array(6).fill('PASS'))
  assert.equal(validateContract('eval.trace/v1', result.trace).valid, true)
  assert.equal(result.trace.events.length, 5)
  assert.equal(result.trace.metrics.tool_calls, 3)
  assert.equal(result.trace.adapter, 'ccb-acp')
  assert.equal(result.trace.adapter_version, '1.0.0')
  assert.equal(result.trace.prompt_hash, sha256Canonical(caseDefinition.prompt))
  for (const field of ['agent_version', 'model', 'skill_hash', 'knowledge_hash', 'tools_hash', 'environment_hash']) {
    assert.equal(result.trace[field], null)
    assert.match(result.trace.unavailable_reasons[field], /not reported/u)
  }
})

test('maps environment unavailability to BLOCKED without grading the Agent', async () => {
  let started = false
  const transport = fixtureTransport({
    async validateEnvironment() {
      return { ok: false, status: 'BLOCKED', reason: 'quotation MCP unavailable' }
    },
    async startSession() {
      started = true
      throw new Error('must not start')
    },
  })

  const result = await runCase({ caseDefinition, adapter: createCcbAcpAdapter({ transport }) })
  assert.equal(result.verdict, 'BLOCKED')
  assert.equal(result.reason_code, 'ADAPTER_ENVIRONMENT_BLOCKED')
  assert.deepEqual(result.grader_results, [])
  assert.equal(started, false)
})

test('maps adapter execution faults to ERROR and still attempts cleanup', async () => {
  let cleaned = false
  const transport = fixtureTransport({
    async sendPrompt() { throw Object.assign(new Error('child process crashed'), { code: 'CHILD_EXIT', exitCode: 9 }) },
    async cleanup() { cleaned = true },
  })

  const result = await runCase({ caseDefinition, adapter: createCcbAcpAdapter({ transport }) })
  assert.equal(result.verdict, 'ERROR')
  assert.equal(result.reason_code, 'ADAPTER_EXECUTION_ERROR')
  assert.match(result.error.message, /child process crashed/u)
  assert.equal(result.error.code, 'CHILD_EXIT')
  assert.equal(result.error.exit_code, 9)
  assert.equal(cleaned, true)
})
