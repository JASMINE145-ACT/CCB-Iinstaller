import { createCaseDraft } from './case-store.mjs'
import { sha256Canonical } from './canonical-json.mjs'

const toolActions = new Map([
  ['Read', 'knowledge.read'],
  ['Agent', 'agent.delegate'],
  ['mcp__quotation__match_quotation', 'quotation.match'],
  ['mcp__quotation__get_inventory_by_code', 'inventory.query'],
  ['mcp__quotation__get_inventory_by_code_batch', 'inventory.query'],
  ['mcp__quotation__search_inventory', 'quotation.search_inventory'],
])

const retiredMatchFirstAssertions = new Set([
  'read_knowledge_before_match',
  'preload_business_knowledge_for_routine_lookup',
])

function actionFor(tool) {
  if (toolActions.has(tool)) return toolActions.get(tool)
  return `legacy.tool.${String(tool).replace(/[^a-zA-Z0-9_.-]+/gu, '_')}`
}

function unique(values) {
  return [...new Set(values)]
}

function promptFor(legacy) {
  if (typeof legacy.input === 'string' && legacy.input) return legacy.input
  if (Array.isArray(legacy.prompts) && legacy.prompts.length > 0) {
    return legacy.prompts.map((prompt, index) => `Turn ${index + 1}: ${prompt}`).join('\n')
  }
  throw new Error(`Legacy Case ${legacy.id ?? '<unknown>'} has no supported prompt`)
}

export function importLegacyCase(legacyCase) {
  if (!legacyCase || typeof legacyCase !== 'object') throw new TypeError('Legacy Case is required')
  if (!legacyCase.id) throw new Error('Legacy Case id is required')
  if (legacyCase.pass_if_any) throw new Error('Legacy pass_if_any requires manual migration')
  const source = structuredClone(legacyCase)
  const expectedActions = unique((source.expected_tools ?? []).map(actionFor))
  const forbiddenActions = unique((source.forbidden_tools ?? []).map(actionFor))
  const mustNot = source.must_not ?? []
  const retired = mustNot.filter((assertion) => retiredMatchFirstAssertions.has(assertion))
  const translatedReadFirst = retired.length > 0 || mustNot.includes('match_before_required_knowledge_read')
  const graders = []

  if (expectedActions.length > 0) {
    graders.push({
      id: 'legacy_required_actions',
      type: 'tool_presence',
      severity: 'hard',
      config: { actions: expectedActions },
    })
  }
  if (forbiddenActions.length > 0) {
    graders.push({
      id: 'legacy_forbidden_actions',
      type: 'tool_forbidden',
      severity: 'hard',
      config: { actions: forbiddenActions },
    })
  }
  if (translatedReadFirst && expectedActions.includes('knowledge.read') && expectedActions.includes('quotation.match')) {
    graders.push({
      id: 'migrated_read_first',
      type: 'sequence',
      severity: 'hard',
      config: { actions: ['knowledge.read', 'quotation.match'] },
    })
  }
  if (source.expected_params && Object.keys(source.expected_params).length > 0) {
    const parameterAction = expectedActions.find((action) => action !== 'knowledge.read')
    if (!parameterAction) throw new Error('Legacy expected_params has no supported target action')
    graders.push({
      id: 'legacy_expected_params',
      type: 'tool_args',
      severity: 'hard',
      config: {
        assertions: Object.entries(source.expected_params).map(([key, value]) => ({
          action: parameterAction,
          path: `input.${key}`,
          operator: 'equals',
          value,
        })),
      },
    })
  }
  const idealProcess = translatedReadFirst
    ? ['knowledge.read', 'quotation.match', ...expectedActions.filter((action) => !['knowledge.read', 'quotation.match'].includes(action))]
    : expectedActions
  const knownAssertions = new Set([...retiredMatchFirstAssertions, 'match_before_required_knowledge_read'])

  return createCaseDraft({
    id: `legacy-${source.id}`,
    title: `Imported legacy Case: ${source.id}`,
    objective: `Preserve supported deterministic behavior from legacy Case ${source.id}.`,
    prompt: promptFor(source),
    risk_level: source.risk_level ?? 'read_only',
    agent: { id: source.agent ?? 'unknown-agent', adapter: 'ccb-acp' },
    ideal_process: idealProcess,
    graders,
    judge: { required: false },
    decision: { policy: 'hard_gates_only', hard: { require: 'all' } },
    trials: { count: 1, metrics: ['pass_at_1'] },
    migration: {
      source_format: 'legacy-agent-eval-jsonl',
      source_id: source.id,
      source_hash: sha256Canonical(source),
      retired_assertions: retired.map((assertion) => ({
        assertion,
        disposition: 'retired',
        reason: 'Authoritative quotation contract is Read-first.',
      })),
      translated_assertions: mustNot.includes('match_before_required_knowledge_read')
        ? ['match_before_required_knowledge_read']
        : [],
      unmapped_assertions: mustNot.filter((assertion) => !knownAssertions.has(assertion)),
    },
  })
}
