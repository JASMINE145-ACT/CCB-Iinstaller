import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

import { gradeCase } from '../graders/index.mjs'

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const goldenCase = JSON.parse(readFileSync(
  join(repoRoot, '.agent-eval', 'cases', 'quotation-direct50-price-stock.json'),
  'utf8',
))

function event(sequence, action, { input, output, type = 'tool.call.completed' } = {}) {
  return {
    schema_version: 'eval.event/v1',
    event_id: `evt-${sequence}`,
    trace_id: 'trace-golden',
    sequence,
    timestamp: `2026-07-15T10:00:0${sequence}.000Z`,
    type,
    actor: 'quotation-agent',
    action,
    status: 'ok',
    origin: 'raw',
    ...(input === undefined ? {} : { input }),
    ...(output === undefined ? {} : { output }),
  }
}

function goldenEvents() {
  return [
    event(1, 'knowledge.read'),
    event(2, 'quotation.match', {
      input: { keywords: '直接50', customer_level: 'B' },
      output: {
        candidates: [
          { code: 'TEST-DIRECT50', matched_name: '直接 DN50', unit_price: 1219 },
        ],
      },
    }),
    event(3, 'inventory.query', {
      input: { code: 'TEST-DIRECT50' },
      output: { code: 'TEST-DIRECT50', qty_available: 42 },
    }),
    event(4, 'assistant.table', {
      type: 'artifact.created',
      output: {
        format: 'markdown_table',
        columns: ['产品', '规格', '物料编码', 'B级价格', '库存'],
        rows: [
          {
            product: '直接',
            specification: 'DN50',
            material_code: 'TEST-DIRECT50',
            price: 1219,
            inventory: 42,
          },
        ],
      },
    }),
  ]
}

function resultByType(events, type) {
  return gradeCase(goldenCase, events).find((result) => result.type === type)
}

test('the CCB golden evidence passes all six deterministic hard graders', () => {
  const results = gradeCase(goldenCase, goldenEvents())

  assert.deepEqual(results.map((result) => result.type), [
    'tool_presence',
    'tool_forbidden',
    'sequence',
    'tool_args',
    'evidence_link',
    'structured_output',
  ])
  assert.deepEqual(results.map((result) => result.status), Array(6).fill('PASS'))
  for (const result of results) {
    assert.equal(result.severity, 'hard')
    assert.equal(Array.isArray(result.evidence_refs), true)
  }
})

test('tool_presence fails when Read evidence is missing', () => {
  const events = goldenEvents().filter(({ action }) => action !== 'knowledge.read')
  const result = resultByType(events, 'tool_presence')
  assert.equal(result.status, 'FAIL')
  assert.equal(result.reason_code, 'MISSING_REQUIRED_ACTION')
  assert.deepEqual(result.details.missing, ['knowledge.read'])
})

test('tool_forbidden fails when the target Agent delegates', () => {
  const events = [...goldenEvents(), event(5, 'agent.delegate')]
  const result = resultByType(events, 'tool_forbidden')
  assert.equal(result.status, 'FAIL')
  assert.equal(result.reason_code, 'FORBIDDEN_ACTION')
  assert.deepEqual(result.details.found, ['agent.delegate'])
})

test('sequence fails when inventory occurs before quotation matching', () => {
  const events = goldenEvents()
  events.find(({ action }) => action === 'quotation.match').sequence = 3
  events.find(({ action }) => action === 'inventory.query').sequence = 2
  const result = resultByType(events, 'sequence')
  assert.equal(result.status, 'FAIL')
  assert.equal(result.reason_code, 'SEQUENCE_ORDER')
})

test('tool_args fails when quotation matching uses the wrong customer level', () => {
  const events = goldenEvents()
  events.find(({ action }) => action === 'quotation.match').input.customer_level = 'D'
  const result = resultByType(events, 'tool_args')
  assert.equal(result.status, 'FAIL')
  assert.equal(result.reason_code, 'TOOL_ARGS_MISMATCH')
})

test('evidence_link fails when inventory code is outside the match candidates', () => {
  const events = goldenEvents()
  events.find(({ action }) => action === 'inventory.query').input.code = 'OTHER-CODE'
  const result = resultByType(events, 'evidence_link')
  assert.equal(result.status, 'FAIL')
  assert.equal(result.reason_code, 'EVIDENCE_LINK_MISMATCH')
})

test('structured_output fails when the Markdown table omits inventory', () => {
  const events = goldenEvents()
  const table = events.find(({ action }) => action === 'assistant.table').output
  table.columns = table.columns.filter((column) => column !== '库存')
  const result = resultByType(events, 'structured_output')
  assert.equal(result.status, 'FAIL')
  assert.equal(result.reason_code, 'STRUCTURED_OUTPUT_MISSING_COLUMNS')
  assert.deepEqual(result.details.missing_columns, ['库存'])
})
