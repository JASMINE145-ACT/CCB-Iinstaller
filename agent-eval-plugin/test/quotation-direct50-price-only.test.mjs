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
  join(repoRoot, '.agent-eval', 'cases', 'quotation-direct50-price-only.json'),
  'utf8',
))

// Match output that the ccb-acp normalizer will lift into output.results[].candidates[].
const matchOutput = JSON.stringify({
  keywords: '直接 50', unmatched: false, needs_selection: true,
  candidate_count: 3, candidates_returned: 3, candidates_truncated: false,
  candidates: [
    { code: '8020020755', matched_name: '直通(管箍)PVC-U排水配件白色 dn50',
      unit_price: 1219, source: '共同',
      description_english: 'Sock 50mm - LESSO',
      indonesian_name: 'Sock 50mm - LESSO' },
    { code: '8010071381', matched_name: '直通(PPR 配件)印尼绿色 dn50 (1-1/2") 联塑',
      unit_price: 7604, source: '共同',
      description_english: 'PPR Coupling dn50 (1-1/2")- LESSO',
      indonesian_name: 'PPR Coupling dn50 (1-1/2")- LESSO' },
    { code: '8010024812', matched_name: '直通印尼(日标)PVC-U管件(AW给水系列)灰色 DN50 (2") 联塑',
      unit_price: 8410, source: '字段匹配',
      description_english: 'JIS PVC-U Socket (AW) DN50 (2") Grey - LESSO',
      indonesian_name: 'JIS PVC-U Socket (AW) DN50 (2") Grey - LESSO' },
  ],
  price_source: 'org_api', price_stale: false,
})

const supplierOutput = JSON.stringify({
  query: '直接 50', total: 3,
  items: [
    { id: 'sup-1', name_zh: '源泉钢管', final_score: 43,
      matched_fields: ['products_text'], category: '钢材相关',
      address: 'Tangerang', contact: '曹总' },
    { id: 'sup-2', name_zh: 'PT.SOMY', final_score: 23,
      matched_fields: ['products_text'], category: '建材五金',
      address: 'Tangerang', contact: '王总、孙总' },
    { id: 'sup-3', name_zh: 'SANFU', final_score: 20,
      matched_fields: ['products_text'], category: '管材管道',
      address: 'Serang', contact: '' },
  ],
})

const selectOutput = JSON.stringify({
  status: 'ok',
  selections: [{
    keywords: '直接 50', code: '8020020755',
    reason: '按§4.1.2,「直接」属管件语义,默认A系列国标白色dn50直通(管箍)',
    matched_name: '直通(管箍)PVC-U排水配件白色 dn50',
    unit_price: '1219', source: '共同',
    description_english: 'Sock 50mm - LESSO',
    indonesian_name: 'Sock 50mm - LESSO',
  }],
})

const assistantText = `推荐(B档): 8020020755  直通(管箍) PVC-U排水配件白色 dn50  ¥1,219
选型理由: 按§4.1.2,「直接」属管件语义,默认A系列国标白色dn50直通(管箍)

其他可能:
- 8010071381  PPR 给水绿色 dn50  ¥7,604
- 8010024812  AW 日标给水灰色 DN50  ¥8,410

货源(名录):
- 源泉钢管 — 镀锌直接 Sok Galvanis Ø20/25/32,1.2/1.5mm(Tangerang)
- PT.SOMY — QYD 井用潜水泵 50/80mm(Tangerang)
- SANFU — 管材切割机 DN15-DN50(Serang)`

// Fixture follows the ccb-acp normalizer contract:
//  - tool_call / tool_call_update for each tool
//  - agent_message_chunk for streaming assistant text
//  - session_completed to flush
const fixtureUpdates = [
  // 1. match_quotation
  { sessionUpdate: 'tool_call', toolCallId: 'tool-match-1', title: 'Match quotation',
    kind: 'execute', status: 'pending', rawInput: {}, content: [],
    _meta: { claudeCode: { toolName: 'mcp__quotation__match_quotation' } } },
  { sessionUpdate: 'tool_call_update', toolCallId: 'tool-match-1', title: 'Match quotation',
    rawInput: { keywords: '直接 50', customer_level: 'B' }, content: [],
    _meta: { claudeCode: { toolName: 'mcp__quotation__match_quotation' } } },
  { sessionUpdate: 'tool_call_update', toolCallId: 'tool-match-1', status: 'completed',
    content: [{ type: 'content', content: { type: 'text', text: matchOutput } }],
    rawOutput: [{ type: 'text', text: matchOutput }],
    _meta: { claudeCode: { toolName: 'mcp__quotation__match_quotation' } } },

  // 2. suppliers_hybrid_match (action normalizes to tool.mcp__supplier-directory__suppliers_hybrid_match)
  { sessionUpdate: 'tool_call', toolCallId: 'tool-supplier-1', title: 'Hybrid supplier match',
    kind: 'execute', status: 'pending', rawInput: {}, content: [],
    _meta: { claudeCode: { toolName: 'mcp__supplier-directory__suppliers_hybrid_match' } } },
  { sessionUpdate: 'tool_call_update', toolCallId: 'tool-supplier-1', title: 'Hybrid supplier match',
    rawInput: { q: '直接 50' }, content: [],
    _meta: { claudeCode: { toolName: 'mcp__supplier-directory__suppliers_hybrid_match' } } },
  { sessionUpdate: 'tool_call_update', toolCallId: 'tool-supplier-1', status: 'completed',
    content: [{ type: 'content', content: { type: 'text', text: supplierOutput } }],
    rawOutput: [{ type: 'text', text: supplierOutput }],
    _meta: { claudeCode: { toolName: 'mcp__supplier-directory__suppliers_hybrid_match' } } },

  // 3. select_quotation_candidates
  { sessionUpdate: 'tool_call', toolCallId: 'tool-select-1', title: 'Select quotation candidates',
    kind: 'execute', status: 'pending', rawInput: {}, content: [],
    _meta: { claudeCode: { toolName: 'mcp__quotation__select_quotation_candidates' } } },
  { sessionUpdate: 'tool_call_update', toolCallId: 'tool-select-1', title: 'Select quotation candidates',
    rawInput: { customer_level: 'B', items: [{ keywords: '直接 50', candidates: [
      { code: '8020020755', matched_name: '直通(管箍)PVC-U排水配件白色 dn50', unit_price: 1219 },
      { code: '8010071381', matched_name: '直通(PPR 配件)印尼绿色 dn50 (1-1/2") 联塑', unit_price: 7604 },
      { code: '8010024812', matched_name: '直通印尼(日标)PVC-U管件(AW给水系列)灰色 DN50 (2") 联塑', unit_price: 8410 },
    ] }] }, content: [], _meta: { claudeCode: { toolName: 'mcp__quotation__select_quotation_candidates' } } },
  { sessionUpdate: 'tool_call_update', toolCallId: 'tool-select-1', status: 'completed',
    content: [{ type: 'content', content: { type: 'text', text: selectOutput } }],
    rawOutput: [{ type: 'text', text: selectOutput }],
    _meta: { claudeCode: { toolName: 'mcp__quotation__select_quotation_candidates' } } },

  // 4. final assistant text via agent_message_chunk (the normalizer's recognized shape)
  { sessionUpdate: 'agent_message_chunk', content: [{ type: 'text', text: assistantText }] },

  // 5. session_completed flushes the accumulated text into an assistant.message event
  { sessionUpdate: 'session_completed', stopReason: 'end_turn' },
]

function fixtureTransport(overrides = {}) {
  return {
    async validateEnvironment() { return { ok: true } },
    async startSession({ traceId }) { return { id: 'fixture-session-price-only', traceId } },
    async sendPrompt() {},
    async collectUpdates() { return structuredClone(fixtureUpdates) },
    async snapshotState() { return { supported: false } },
    async cleanup() {},
    ...overrides,
  }
}

test('quotation-direct50-price-only: locked Case runs with 0 hard grader failures', async () => {
  const adapter = createCcbAcpAdapter({ transport: fixtureTransport() })
  const result = await runCase({
    caseDefinition,
    adapter,
    traceId: 'trace-quotation-direct50-price-only-1',
  })

  const hardFails = (result.grader_results || []).filter(
    (g) => g.severity === 'hard' && g.status !== 'PASS',
  )
  if (hardFails.length) {
    console.error('hard fail reasons:', JSON.stringify(hardFails.map((g) => ({
      grader_id: g.grader_id, reason_code: g.reason_code, details: g.details,
    })), null, 2))
  }
  assert.equal(hardFails.length, 0, `expected 0 hard grader failures, got ${hardFails.length}`)
  assert.equal(result.judgment_status, 'pending', 'soft judges should be pending until host judgment')
  assert.equal(validateContract('eval.trace/v1', result.trace).valid, true)
  assert.equal(result.trace.adapter, 'ccb-acp')
  assert.equal(result.trace.prompt_hash, sha256Canonical(caseDefinition.prompt))
})

test('quotation-direct50-price-only: forbidden + required graders reflect price-only contract', async () => {
  const adapter = createCcbAcpAdapter({ transport: fixtureTransport() })
  const result = await runCase({ caseDefinition, adapter, traceId: 'trace-forbidden-1' })
  const forbidden = (result.grader_results || []).find((g) => g.grader_id === 'forbidden_actions')
  assert.ok(forbidden, 'forbidden_actions grader must be present')
  assert.equal(forbidden.status, 'PASS', 'no inventory / fill_quotation_sheet calls in fixture')
  const required = (result.grader_results || []).find((g) => g.grader_id === 'required_actions')
  assert.ok(required, 'required_actions grader must be present')
  assert.equal(required.status, 'PASS', 'match + supplier + select all present in fixture')
})

test('quotation-direct50-price-only: rubric captures L1 BAD-shape concerns via soft judge', () => {
  // The structured_output grader is the only existing grader that supports
  // forbidden_patterns, but it hardcodes assistant.table. Price-only GOOD
  // pattern is text, so we encode the L1 § 查后多候选 BAD concerns in the
  // soft rubric instead (weighted 15% — must hit 80/100 soft threshold).
  const rubric = caseDefinition.judge.rubric
  const noDump = rubric.find((r) => r.id === 'no_clarification_dump')
  assert.ok(noDump, 'no_clarification_dump rubric item must be present')
  assert.ok(noDump.weight >= 10, 'no_clarification_dump must weight enough to influence verdict')
  assert.match(noDump.description, /A\/B\/C/u, 'rubric must reference A/B/C menu forbidden shape')

  // The hard graders must NOT depend on assistant.table (no inventory, no fill)
  const forbidden = caseDefinition.graders.find((g) => g.id === 'forbidden_actions')
  assert.ok(forbidden.config.actions.includes('tool.mcp__quotation__fill_quotation_sheet'),
    'must hard-forbid fill_quotation_sheet in price-only path')
  assert.ok(forbidden.config.actions.includes('inventory.query'),
    'must hard-forbid inventory.query in price-only path')
})
