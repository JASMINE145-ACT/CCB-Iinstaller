import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

import { decideTrial } from '../core/decision.mjs'
import { gradeCase } from '../graders/index.mjs'
import { gradeStructuredOutput } from '../graders/structured-output.mjs'
import { resolveEvidenceExpression } from '../graders/shared.mjs'

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
    event(1, 'quotation.match', {
      input: { keywords: '直接50', customer_level: 'B' },
      output: {
        candidates: [
          { code: 'TEST-DIRECT50', matched_name: '直接 DN50', unit_price: 1219 },
        ],
        results: [
          {
            keywords: '直接50',
            candidates: [
              { code: 'TEST-DIRECT50', matched_name: '直接 DN50', unit_price: 1219 },
            ],
          },
        ],
      },
    }),
    event(2, 'quotation.select', {
      input: {
        items: [{
          keywords: '直接50',
          candidates: [{ code: 'TEST-DIRECT50', matched_name: '直接 DN50', unit_price: 1219 }],
        }],
      },
      output: {
        status: 'ok',
        selections: [{ keywords: '直接50', code: 'TEST-DIRECT50', reason: '默认排水口径' }],
      },
    }),
    event(3, 'inventory.query', {
      input: { code: 'TEST-DIRECT50', codes: ['TEST-DIRECT50'] },
      output: { code: 'TEST-DIRECT50', qty_warehouse: 42, qty_available: 38, unit: 'piece' },
    }),
    event(4, 'assistant.table', {
      type: 'artifact.created',
      output: {
        format: 'markdown_table',
        columns: ['编码', '中文名称', '英文/印尼名', '规格', '单价(B级)', '在仓库存', '可用库存', '单位', '备注'],
        rows: [
          {
            material_code: 'TEST-DIRECT50',
            product: '直接',
            english_or_indonesian_name: 'Direct coupling',
            specification: 'DN50',
            price: 1219,
            inventory_warehouse: 42,
            inventory_available: 38,
            unit: 'piece',
            remark: '默认排水口径',
          },
        ],
      },
    }),
  ]
}

function resultByType(events, type) {
  return gradeCase(goldenCase, events).find((result) => result.type === type)
}

function resultById(events, graderId) {
  return gradeCase(goldenCase, events).find((result) => result.grader_id === graderId)
}

test('the CCB golden evidence passes every deterministic grader, hard and soft', () => {
  const results = gradeCase(goldenCase, goldenEvents())

  assert.deepEqual(results.map((result) => result.type), [
    'tool_presence',
    'tool_forbidden',
    'tool_forbidden',
    'sequence',
    'tool_args',
    'evidence_link',
    'structured_output',
  ])
  assert.deepEqual(results.map((result) => result.status), Array(7).fill('PASS'))
  for (const result of results) {
    assert.equal(result.severity, result.grader_id === 'discouraged_actions' ? 'soft' : 'hard')
    assert.equal(Array.isArray(result.evidence_refs), true)
  }
})

test('tool_presence fails when select evidence is missing', () => {
  const events = goldenEvents().filter(({ action }) => action !== 'quotation.select')
  const result = resultByType(events, 'tool_presence')
  assert.equal(result.status, 'FAIL')
  assert.equal(result.reason_code, 'MISSING_REQUIRED_ACTION')
  assert.deepEqual(result.details.missing, ['quotation.select'])
})

test('tool_forbidden fails when the target Agent delegates', () => {
  const events = [...goldenEvents(), event(5, 'agent.delegate')]
  const result = resultById(events, 'forbidden_actions')
  assert.equal(result.status, 'FAIL')
  assert.equal(result.reason_code, 'FORBIDDEN_ACTION')
  assert.deepEqual(result.details.found, ['agent.delegate'])
})

test('a discouraged price-tiers call is recorded as soft FAIL without tripping the hard gate', () => {
  const events = [...goldenEvents(), event(5, 'tool.mcp__quotation__get_product_price_tiers')]
  const results = gradeCase(goldenCase, events)

  const discouraged = results.find(({ grader_id }) => grader_id === 'discouraged_actions')
  assert.equal(discouraged.severity, 'soft')
  assert.equal(discouraged.status, 'FAIL')
  assert.deepEqual(discouraged.details.found, ['tool.mcp__quotation__get_product_price_tiers'])

  const decision = decideTrial({ caseDefinition: goldenCase, graderResults: results })
  assert.notEqual(decision.reason_code, 'HARD_GATE_FAILED')
  assert.equal(decision.verdict, 'NEEDS_REVIEW')
})

test('sequence fails when inventory occurs before quotation matching', () => {
  const events = goldenEvents()
  events.find(({ action }) => action === 'quotation.match').sequence = 3
  events.find(({ action }) => action === 'inventory.query').sequence = 1
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

test('evidence_link fails when select code is outside the match candidates', () => {
  const events = goldenEvents()
  events.find(({ action }) => action === 'quotation.select').output.selections[0].code = 'OTHER-CODE'
  events.find(({ action }) => action === 'inventory.query').input = { code: 'OTHER-CODE', codes: ['OTHER-CODE'] }
  events.find(({ action }) => action === 'assistant.table').output.rows[0].material_code = 'OTHER-CODE'
  const result = resultByType(events, 'evidence_link')
  assert.equal(result.status, 'FAIL')
  assert.equal(result.reason_code, 'EVIDENCE_LINK_MISMATCH')
})

test('evidence_link aggregates inventory codes across batch and singular follow-up calls', () => {
  const events = [
    event(1, 'inventory.query', {
      input: { codes: ['CODE-A', 'CODE-PROBE'] },
      output: { items: [{ code: 'CODE-A' }, { code: 'CODE-PROBE' }] },
    }),
    event(2, 'inventory.query', {
      input: { code: 'CODE-B', codes: ['CODE-B'] },
      output: { code: 'CODE-B', qty_warehouse: 1, qty_available: 1 },
    }),
  ]
  assert.deepEqual(
    resolveEvidenceExpression(events, 'inventory.query.input.codes'),
    ['CODE-A', 'CODE-PROBE', 'CODE-B'],
  )
})

test('evidence_link still fails when inventory over-queries relative to the table', () => {
  const events = [
    event(1, 'quotation.match', {
      input: { keywords_list: ['直接50', '三通50'], customer_level: 'B' },
      output: {
        results: [
          { keywords: '直接50', candidates: [{ code: 'CODE-A', unit_price: 1 }] },
          { keywords: '三通50', candidates: [{ code: 'CODE-B', unit_price: 2 }] },
        ],
      },
    }),
    event(2, 'quotation.select', {
      output: {
        status: 'ok',
        selections: [
          { keywords: '直接50', code: 'CODE-A', reason: 'a' },
          { keywords: '三通50', code: 'CODE-B', reason: 'b' },
        ],
      },
    }),
    event(3, 'inventory.query', {
      input: { codes: ['CODE-A', 'CODE-B', 'CODE-EXTRA'] },
      output: {},
    }),
    event(4, 'assistant.table', {
      type: 'artifact.created',
      output: {
        format: 'markdown_table',
        columns: ['编码', '中文名称', '英文/印尼名', '规格', '单价(B级)', '在仓库存', '可用库存', '单位', '备注'],
        rows: [
          {
            material_code: 'CODE-A',
            product: 'a',
            english_or_indonesian_name: 'a',
            specification: 'dn50',
            price: 1,
            inventory_warehouse: 1,
            inventory_available: 1,
            unit: 'PCS',
            remark: 'ok',
          },
          {
            material_code: 'CODE-B',
            product: 'b',
            english_or_indonesian_name: 'b',
            specification: 'dn50',
            price: 2,
            inventory_warehouse: 1,
            inventory_available: 1,
            unit: 'PCS',
            remark: 'ok',
          },
        ],
      },
    }),
  ]
  const dualCase = {
    ...goldenCase,
    graders: goldenCase.graders.map((grader) => {
      if (grader.id !== 'evidence_provenance') return grader
      return {
        ...grader,
        config: {
          assertions: [
            {
              source: 'inventory.query.input.codes',
              target: 'assistant.table.output.rows[*].material_code',
              operator: 'contains',
            },
            {
              source: 'assistant.table.output.rows[*].material_code',
              target: 'inventory.query.input.codes',
              operator: 'contains',
            },
          ],
        },
      }
    }),
  }
  const result = gradeCase(dualCase, events).find((item) => item.grader_id === 'evidence_provenance')
  assert.equal(result.status, 'FAIL')
  assert.equal(result.reason_code, 'EVIDENCE_LINK_MISMATCH')
})

test('evidence_link uses warehouse inventory as the stock judgment basis', () => {
  const events = goldenEvents()
  const row = events.find(({ action }) => action === 'assistant.table').output.rows[0]
  row.inventory_warehouse = row.inventory_available
  const result = resultByType(events, 'evidence_link')
  assert.equal(result.status, 'FAIL')
  assert.equal(result.reason_code, 'EVIDENCE_LINK_MISMATCH')
})

test('evidence_link preserves available inventory as an independent displayed field', () => {
  const events = goldenEvents()
  const row = events.find(({ action }) => action === 'assistant.table').output.rows[0]
  row.inventory_available = row.inventory_warehouse
  const result = resultByType(events, 'evidence_link')
  assert.equal(result.status, 'FAIL')
  assert.equal(result.reason_code, 'EVIDENCE_LINK_MISMATCH')
})

test('structured_output fails when the Markdown table omits warehouse inventory', () => {
  const events = goldenEvents()
  const table = events.find(({ action }) => action === 'assistant.table').output
  table.columns = table.columns.filter((column) => column !== '在仓库存')
  const result = resultByType(events, 'structured_output')
  assert.equal(result.status, 'FAIL')
  assert.equal(result.reason_code, 'STRUCTURED_OUTPUT_MISSING_COLUMNS')
  assert.deepEqual(result.details.missing_columns, ['在仓库存'])
})

test('structured_output rejects reordered fixed columns', () => {
  const events = goldenEvents()
  const table = events.find(({ action }) => action === 'assistant.table').output
  ;[table.columns[0], table.columns[1]] = [table.columns[1], table.columns[0]]
  const result = resultByType(events, 'structured_output')
  assert.equal(result.status, 'FAIL')
  assert.equal(result.reason_code, 'STRUCTURED_OUTPUT_COLUMNS_NOT_EXACT')
  assert.deepEqual(result.details.actual_columns.slice(0, 2), ['中文名称', '编码'])
})

test('structured_output fails when row count is below min_rows', () => {
  const events = goldenEvents()
  const columns = events.find(({ action }) => action === 'assistant.table').output.columns
  const result = gradeStructuredOutput({
    id: 'quotation_table',
    type: 'structured_output',
    severity: 'hard',
    config: {
      format: 'markdown_table',
      exact_columns: true,
      min_rows: 2,
      required_columns: columns,
    },
  }, events)
  assert.equal(result.status, 'FAIL')
  assert.equal(result.reason_code, 'STRUCTURED_OUTPUT_TOO_FEW_ROWS')
  assert.equal(result.details.min_rows, 2)
  assert.equal(result.details.actual_rows, 1)
})
