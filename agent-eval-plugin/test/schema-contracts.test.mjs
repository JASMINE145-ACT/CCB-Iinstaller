import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

import {
  canonicalStringify,
  sha256Canonical,
} from '../core/canonical-json.mjs'
import { validateContract } from '../core/schema-validator.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

const contracts = {
  'eval.case/v1': {
    schema_version: 'eval.case/v1',
    id: 'quotation-direct50-price-stock',
    title: 'Direct DN50 price and stock',
    objective: 'Return an evidence-backed quote and inventory table.',
    prompt: 'Quote direct DN50 at B level and check stock.',
    risk_level: 'read_only',
    graders: [],
    decision: { policy: 'hard_gates_only' },
    trials: { count: 1 },
  },
  'eval.event/v1': {
    schema_version: 'eval.event/v1',
    event_id: 'evt-1',
    trace_id: 'trace-1',
    sequence: 1,
    timestamp: '2026-07-15T10:00:00.000Z',
    type: 'tool.call.completed',
    actor: 'quotation-agent',
    action: 'quotation.match',
    status: 'ok',
    origin: 'raw',
  },
  'eval.trace/v1': {
    schema_version: 'eval.trace/v1',
    trace_id: 'trace-1',
    case_id: 'quotation-direct50-price-stock',
    case_version: 'sha256:case',
    adapter: 'ccb-acp',
    adapter_version: '0.1.0',
    agent_version: null,
    model: null,
    prompt_hash: 'sha256:prompt',
    skill_hash: null,
    knowledge_hash: null,
    tools_hash: null,
    environment_hash: null,
    unavailable_reasons: {
      agent_version: 'not reported by adapter',
      model: 'not reported by adapter',
      skill_hash: 'not reported by adapter',
      knowledge_hash: 'not reported by adapter',
      tools_hash: 'not reported by adapter',
      environment_hash: 'not reported by adapter',
    },
    events: [],
    artifacts: [],
    metrics: { turns: 1, tool_calls: 0, latency_ms: 1 },
  },
  'eval.judgment/v1': {
    schema_version: 'eval.judgment/v1',
    judge: {
      host: 'claude-code',
      model: 'current-host-model',
      version: 'host-reported',
      rubric_hash: 'sha256:rubric',
    },
    batch: {
      batch_id: 'batch-1',
      trial_order_randomized: true,
      independent_trials: false,
    },
    scores: { clarity: 90 },
    evidence_refs: ['event://evt-1'],
    reason: 'Clear and evidence backed.',
    confidence: 0.9,
    needs_human_review: false,
  },
  'eval.report/v1': {
    schema_version: 'eval.report/v1',
    run_id: 'run-1',
    case_id: 'quotation-direct50-price-stock',
    verdict: 'PASS',
    judgment_status: 'complete',
    outcomes: [],
    grader_results: [],
    trace_refs: ['trace://trace-1'],
    metrics: {},
  },
}

test('all v1 contract examples validate against executable schemas', () => {
  for (const [schemaVersion, value] of Object.entries(contracts)) {
    assert.deepEqual(validateContract(schemaVersion, value), {
      valid: true,
      errors: [],
    })
  }
})

test('each v1 contract rejects a value missing its identity field', () => {
  const identityFields = {
    'eval.case/v1': 'id',
    'eval.event/v1': 'event_id',
    'eval.trace/v1': 'trace_id',
    'eval.judgment/v1': 'judge',
    'eval.report/v1': 'run_id',
  }

  for (const [schemaVersion, identityField] of Object.entries(identityFields)) {
    const invalid = structuredClone(contracts[schemaVersion])
    delete invalid[identityField]
    const result = validateContract(schemaVersion, invalid)
    assert.equal(result.valid, false, schemaVersion)
    assert.match(result.errors.join('\n'), new RegExp(identityField))
  }
})

test('Trace rejects missing reproducibility metadata', () => {
  const invalid = structuredClone(contracts['eval.trace/v1'])
  delete invalid.prompt_hash
  const result = validateContract('eval.trace/v1', invalid)
  assert.equal(result.valid, false)
  assert.match(result.errors.join('\n'), /prompt_hash/u)
})

test('rejects unknown schema versions instead of guessing a contract', () => {
  assert.throws(
    () => validateContract('eval.case/v2', {}),
    /Unsupported schema version: eval\.case\/v2/,
  )
})

test('canonical JSON is stable across object key order and preserves array order', () => {
  const left = { z: 1, nested: { b: 2, a: 1 }, list: ['a', 'b'] }
  const reordered = { list: ['a', 'b'], nested: { a: 1, b: 2 }, z: 1 }
  const changedArray = { list: ['b', 'a'], nested: { a: 1, b: 2 }, z: 1 }

  assert.equal(
    canonicalStringify(left),
    '{"list":["a","b"],"nested":{"a":1,"b":2},"z":1}',
  )
  assert.equal(canonicalStringify(left), canonicalStringify(reordered))
  assert.equal(sha256Canonical(left), sha256Canonical(reordered))
  assert.notEqual(sha256Canonical(left), sha256Canonical(changedArray))
  assert.match(sha256Canonical(left), /^sha256:[a-f0-9]{64}$/)
})

test('ships one JSON Schema document for every executable v1 contract', () => {
  const files = [
    'eval.case.v1.schema.json',
    'eval.event.v1.schema.json',
    'eval.trace.v1.schema.json',
    'eval.judgment.v1.schema.json',
    'eval.report.v1.schema.json',
  ]

  for (const file of files) {
    const path = join(root, 'schemas', file)
    assert.equal(existsSync(path), true, file)
    const schema = JSON.parse(readFileSync(path, 'utf8'))
    assert.equal(schema.$schema, 'https://json-schema.org/draft/2020-12/schema')
    assert.equal(typeof schema.$id, 'string')
  }
})

test('three host manifests expose one shared agent-eval skill contract', () => {
  const manifestPaths = {
    codex: join(root, '.codex-plugin', 'plugin.json'),
    claude: join(root, '.claude-plugin', 'plugin.json'),
    cursor: join(root, '.cursor-plugin', 'plugin.json'),
  }
  const manifests = Object.fromEntries(
    Object.entries(manifestPaths).map(([host, path]) => [
      host,
      JSON.parse(readFileSync(path, 'utf8')),
    ]),
  )

  assert.deepEqual(
    Object.values(manifests).map(({ name, version }) => ({ name, version })),
    Array(3).fill({ name: 'agent-eval-plugin', version: '0.1.0' }),
  )
  assert.equal(manifests.codex.skills, './skills/')
  assert.equal(manifests.cursor.skills, './skills/')

  const skill = readFileSync(join(root, 'skills', 'agent-eval', 'SKILL.md'), 'utf8')
  assert.match(skill, /^---\r?\nname: agent-eval\r?\n/)
  for (const operation of ['create', 'confirm', 'run', 'review', 'report', 'baseline']) {
    assert.match(skill, new RegExp(`\\b${operation}\\b`), operation)
  }
  assert.match(skill, /current host AI/i)
  assert.match(skill, /never override a failed hard gate/i)
})