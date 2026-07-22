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
    'quotation.match',
    'quotation.select',
    'inventory.query',
    'assistant.table',
    'session.completed',
  ])

  const match = events.find(({ action }) => action === 'quotation.match')
  assert.equal(match.input.customer_level, 'B')
  assert.equal(match.output.candidates[0].code, 'TEST-DIRECT50')
  assert.equal(match.output.candidates[0].unit_price, 1219)

  const select = events.find(({ action }) => action === 'quotation.select')
  assert.equal(select.output.status, 'ok')
  assert.equal(select.output.selections[0].code, 'TEST-DIRECT50')

  const inventory = events.find(({ action }) => action === 'inventory.query')
  assert.deepEqual(inventory.input, { code: 'TEST-DIRECT50', codes: ['TEST-DIRECT50'] })
  assert.equal(inventory.output.qty_available, 42)
  assert.equal(inventory.output.items[0].code, 'TEST-DIRECT50')

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
    '\u7f16\u7801',
    '\u4e2d\u6587\u540d\u79f0',
    '\u82f1\u6587/\u5370\u5c3c\u540d',
    '\u89c4\u683c',
    '\u5355\u4ef7(B\u7ea7)',
    '\u5728\u4ed3\u5e93\u5b58',
    '\u53ef\u7528\u5e93\u5b58',
    '\u5355\u4f4d',
    '\u5907\u6ce8',
  ])
  assert.deepEqual(table.output.rows, [{
    material_code: 'TEST-DIRECT50',
    product: 'Direct coupling',
    english_or_indonesian_name: 'Direct coupling DN50',
    specification: 'DN50',
    price: 1219,
    inventory_warehouse: 42,
    inventory_available: 42,
    unit: 'piece',
    remark: 'Default drainage coupling',
  }])
})

test('maps the live 9-column quotation header and decorated cells onto canonical evidence keys', () => {
  const tableText = [
    '| 编码 | 中文名称 | 英文/印尼名 | 规格 | 单价(B级) | 在仓库存(qty_warehouse) | 可用库存(qty_available) | 单位 | 备注 |',
    '| --- | --- | --- | --- | --- | --- | --- | --- | --- |',
    '| **8020020755** ⭐推荐 | 直通(管箍)PVC-U排水配件 | Sock 50mm - LESSO | dn50 白色 | **¥1,219** | **1,344** | 1,228 | PCS | 默认排水口径 |',
  ].join('\n')
  const updates = [
    { sessionUpdate: 'agent_message_chunk', content: [{ type: 'text', text: tableText }] },
    { sessionUpdate: 'session_completed', stopReason: 'end_turn' },
  ]

  const events = normalizeCcbAcpUpdates(updates, { traceId: 'trace-live-header' })
  const table = events.find(({ action }) => action === 'assistant.table')

  assert.ok(table, 'expected an assistant.table artifact')
  assert.deepEqual(table.output.columns, [
    '编码',
    '中文名称',
    '英文/印尼名',
    '规格',
    '单价(B级)',
    '在仓库存',
    '可用库存',
    '单位',
    '备注',
  ])
  const [row] = table.output.rows
  assert.equal(row.material_code, '8020020755')
  assert.equal(row.product, '直通(管箍)PVC-U排水配件')
  assert.equal(row.price, 1219)
  assert.equal(row.inventory_warehouse, 1344)
  assert.equal(row.inventory_available, 1228)
  assert.equal(row.unit, 'PCS')
  assert.equal(row.remark, '默认排水口径')
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
  assert.deepEqual(failed.input, { code: 'TEST-DIRECT50', codes: ['TEST-DIRECT50'] })
  assert.match(failed.output.error, /inventory unavailable/u)
})

test('maps select_quotation_candidates onto quotation.select', () => {
  const updates = [
    {
      sessionUpdate: 'tool_call',
      toolCallId: 'tool-select',
      status: 'completed',
      rawInput: {
        items: [{ keywords: '直接50', candidates: [{ code: 'CODE-A', unit_price: 1 }] }],
      },
      rawOutput: JSON.stringify({
        status: 'ok',
        selections: [{ keywords: '直接50', code: 'CODE-A', reason: '默认排水直通' }],
      }),
      _meta: { claudeCode: { toolName: 'mcp__quotation__select_quotation_candidates' } },
    },
    { sessionUpdate: 'session_completed', stopReason: 'end_turn' },
  ]
  const events = normalizeCcbAcpUpdates(updates, { traceId: 'trace-select' })
  const select = events.find(({ action }) => action === 'quotation.select')
  assert.ok(select)
  assert.equal(select.output.status, 'ok')
  assert.equal(select.output.selections[0].code, 'CODE-A')
})

test('lifts singular match candidates into results[*] for evidence paths', () => {
  const updates = [
    {
      sessionUpdate: 'tool_call',
      toolCallId: 'tool-single-match',
      status: 'completed',
      rawInput: { keywords: '直接50', customer_level: 'B' },
      rawOutput: JSON.stringify({
        keywords: '直接50',
        candidates: [{ code: 'CODE-A', unit_price: 1219 }],
      }),
      _meta: { claudeCode: { toolName: 'mcp__quotation__match_quotation' } },
    },
    { sessionUpdate: 'session_completed', stopReason: 'end_turn' },
  ]
  const events = normalizeCcbAcpUpdates(updates, { traceId: 'trace-lift-match' })
  const match = events.find(({ action }) => action === 'quotation.match')
  assert.equal(match.output.candidates[0].code, 'CODE-A')
  assert.equal(match.output.results[0].candidates[0].code, 'CODE-A')
})

test('maps match_quotation_batch and get_inventory_by_code_batch onto canonical actions', () => {
  const updates = [
    {
      sessionUpdate: 'tool_call',
      toolCallId: 'tool-batch-match',
      status: 'completed',
      rawInput: { keywords_list: ['直接50', '三通50'], customer_level: 'B' },
      rawOutput: JSON.stringify({
        results: [
          { keywords: '直接50', candidates: [{ code: 'CODE-A', unit_price: 1 }] },
          { keywords: '三通50', candidates: [{ code: 'CODE-B', unit_price: 2 }] },
        ],
      }),
      _meta: { claudeCode: { toolName: 'mcp__quotation__match_quotation_batch' } },
    },
    {
      sessionUpdate: 'tool_call',
      toolCallId: 'tool-batch-inv',
      status: 'completed',
      rawInput: { codes: ['CODE-A', 'CODE-B'] },
      rawOutput: JSON.stringify({ data: { items: [{ code: 'CODE-A' }, { code: 'CODE-B' }] } }),
      _meta: { claudeCode: { toolName: 'mcp__quotation__get_inventory_by_code_batch' } },
    },
    { sessionUpdate: 'session_completed', stopReason: 'end_turn' },
  ]

  const events = normalizeCcbAcpUpdates(updates, { traceId: 'trace-batch' })
  const match = events.find(({ action }) => action === 'quotation.match')
  const inventory = events.find(({ action }) => action === 'inventory.query')
  assert.ok(match)
  assert.ok(inventory)
  assert.deepEqual(match.input.keywords_list, ['直接50', '三通50'])
  assert.equal(match.input.customer_level, 'B')
  assert.deepEqual(inventory.input.codes, ['CODE-A', 'CODE-B'])
  assert.equal(match.output.results.length, 2)
})
