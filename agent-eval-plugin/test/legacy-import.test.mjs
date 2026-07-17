import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

import { importLegacyCase } from '../core/legacy-import.mjs'

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const legacyPath = join(repoRoot, 'eval', 'agent_eval_cases.jsonl')

function legacyCases() {
  return readFileSync(legacyPath, 'utf8').trim().split(/\r?\n/u).map((line) => JSON.parse(line))
}

test('imports a legacy match-first quotation Case as a new Read-first draft without mutation', () => {
  const beforeBytes = readFileSync(legacyPath)
  const legacy = structuredClone(legacyCases().find(({ id }) => id === 'quote-direct50-post-hook-golden'))
  legacy.must_not = [
    ...legacy.must_not.filter((assertion) => assertion !== 'match_before_required_knowledge_read'),
    'read_knowledge_before_match',
  ]
  const original = structuredClone(legacy)
  const draft = importLegacyCase(legacy)
  assert.equal(draft.schema_version, 'eval.case/v1')
  assert.equal(draft.status, 'draft')
  assert.equal(draft.case_hash, undefined)
  assert.deepEqual(draft.ideal_process.slice(0, 2), ['knowledge.read', 'quotation.match'])
  const sequence = draft.graders.find(({ type }) => type === 'sequence')
  assert.deepEqual(sequence.config.actions, ['knowledge.read', 'quotation.match'])
  assert.equal(draft.migration.retired_assertions.some(({ assertion }) => assertion === 'read_knowledge_before_match'), true)
  assert.deepEqual(legacy, original)
  assert.deepEqual(readFileSync(legacyPath), beforeBytes)
})

test('maps supported legacy tool, forbidden action, and parameter checks without guessing soft scores', () => {
  const legacy = legacyCases().find(({ id }) => id === 'quote-direct50-b')
  const draft = importLegacyCase(legacy)
  const presence = draft.graders.find(({ type }) => type === 'tool_presence')
  const forbidden = draft.graders.find(({ type }) => type === 'tool_forbidden')
  const args = draft.graders.find(({ type }) => type === 'tool_args')
  assert.deepEqual(presence.config.actions, ['quotation.match'])
  assert.deepEqual(forbidden.config.actions, ['quotation.search_inventory', 'inventory.query', 'agent.delegate'])
  assert.deepEqual(args.config.assertions, [{
    action: 'quotation.match', path: 'input.customer_level', operator: 'equals', value: 'B',
  }])
  assert.deepEqual(draft.judge, { required: false })
  assert.equal(draft.decision.policy, 'hard_gates_only')
  assert.equal(draft.migration.unmapped_assertions.includes('fabricate_price'), true)
})

test('rejects unsupported alternative-branch legacy Cases instead of silently changing semantics', () => {
  const legacy = legacyCases().find(({ id }) => id === 'quote-smoke-fill-direct50-draft')
  assert.throws(() => importLegacyCase(legacy), /pass_if_any requires manual migration/u)
})
