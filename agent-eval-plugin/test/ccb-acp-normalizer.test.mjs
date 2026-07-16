import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

import { normalizeCcbAcpUpdates } from '../adapters/ccb-acp/event-normalizer.mjs'

const fixtureUrl = new URL('./fixtures/ccb-acp/tool-call-updates.jsonl', import.meta.url)

function fixtureUpdates() {
  return readFileSync(fixtureUrl, 'utf8')
    .trim()
    .split(/\r?\n/u)
    .map((line) => JSON.parse(line))
}

test('normalizes split ACP tool updates into evidence-bearing completed Events', () => {
  const events = normalizeCcbAcpUpdates(fixtureUpdates(), {
    traceId: 'trace-fixture',
    actor: 'quotation-agent',
  })

  assert.deepEqual(events.map(({ action }) => action), [
    'knowledge.read',
    'quotation.match',
    'inventory.query',
    'assistant.table',
    'session.completed',
  ])

  const match = events.find(({ action }) => action === 'quotation.match')
  assert.equal(match.input.customer_level, 'B')
  assert.equal(match.output.candidates[0].code, 'TEST-DIRECT50')
  assert.equal(match.output.candidates[0].unit_price, 1219)

  const inventory = events.find(({ action }) => action === 'inventory.query')
  assert.deepEqual(inventory.input, { code: 'TEST-DIRECT50' })
  assert.equal(inventory.output.qty_available, 42)

  for (const event of events) {
    assert.equal(event.schema_version, 'eval.event/v1')
    assert.equal(event.trace_id, 'trace-fixture')
    assert.equal(event.origin, 'raw')
    assert.match(event.raw_event_ref, /^adapter:\/\/ccb-acp\/update-\d+$/u)
  }
})

test('normalizes a Markdown response into canonical quotation table evidence', () => {
  const events = normalizeCcbAcpUpdates(fixtureUpdates(), { traceId: 'trace-table' })
  const table = events.find(({ action }) => action === 'assistant.table')

  assert.equal(table.type, 'artifact.created')
  assert.deepEqual(table.output.columns, [
    '\u4ea7\u54c1',
    '\u89c4\u683c',
    '\u7269\u6599\u7f16\u7801',
    'B\u7ea7\u4ef7\u683c',
    '\u5e93\u5b58',
  ])
  assert.deepEqual(table.output.rows, [{
    product: 'Direct coupling',
    specification: 'DN50',
    material_code: 'TEST-DIRECT50',
    price: 1219,
    inventory: 42,
  }])
})

test('preserves failed tool completion as adapter evidence instead of dropping it', () => {
  const updates = [
    {
      sessionUpdate: 'tool_call',
      toolCallId: 'tool-stock-failed',
      status: 'pending',
      rawInput: { code: 'TEST-DIRECT50' },
      _meta: { claudeCode: { toolName: 'mcp__quotation__get_inventory_by_code' } },
    },
    {
      sessionUpdate: 'tool_call_update',
      toolCallId: 'tool-stock-failed',
      status: 'failed',
      content: [{ type: 'error', text: 'inventory unavailable' }],
      _meta: { claudeCode: { toolName: 'mcp__quotation__get_inventory_by_code' } },
    },
  ]

  const [failed] = normalizeCcbAcpUpdates(updates, { traceId: 'trace-failed' })
  assert.equal(failed.action, 'inventory.query')
  assert.equal(failed.type, 'tool.call.failed')
  assert.equal(failed.status, 'error')
  assert.deepEqual(failed.input, { code: 'TEST-DIRECT50' })
  assert.match(failed.output.error, /inventory unavailable/u)
})
