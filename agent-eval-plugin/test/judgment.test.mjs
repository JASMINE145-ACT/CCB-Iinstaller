import assert from 'node:assert/strict'
import test from 'node:test'

import { decideTrial } from '../core/decision.mjs'
import { createJudgePacket } from '../core/judge-packet.mjs'
import { validateBatchJudgments } from '../core/judgment.mjs'

const caseDefinition = {
  id: 'quotation-direct50-price-stock',
  objective: 'Return an evidence-consistent quotation and inventory table.',
  judge: {
    required: true,
    rubric: [
      { id: 'requirement_satisfaction', description: 'Satisfies the request', weight: 40 },
      { id: 'selection_reasoning', description: 'Uses business evidence', weight: 35 },
      { id: 'clarity', description: 'Clear table and explanation', weight: 25 },
    ],
    threshold: 80,
  },
  decision: { policy: 'all_hard_and_soft_threshold' },
}

function hardResult(status = 'PASS') {
  return {
    grader_id: 'required_actions',
    type: 'tool_presence',
    severity: 'hard',
    status,
    reason_code: status === 'PASS' ? 'REQUIRED_ACTIONS_PRESENT' : 'MISSING_REQUIRED_ACTION',
    evidence_refs: status === 'PASS' ? ['event://evt-1'] : [],
  }
}

function trial(id, output) {
  return {
    trial_id: id,
    grader_results: [hardResult()],
    trace: {
      trace_id: `trace-${id}`,
      events: [
        {
          event_id: 'evt-1',
          type: 'artifact.created',
          action: 'assistant.table',
          status: 'ok',
          output: { rows: [{ material_code: output }] },
        },
      ],
    },
  }
}

function validJudgments(packet, overrides = {}) {
  return packet.trials.map((item) => ({
    schema_version: 'eval.judgment/v1',
    trial_alias: item.trial_alias,
    judge: {
      host: 'codex',
      model: 'gpt-5',
      version: '2026-07-16',
      rubric_hash: packet.case.rubric_hash,
    },
    batch: { ...packet.batch },
    scores: {
      requirement_satisfaction: 95,
      selection_reasoning: 90,
      clarity: 85,
    },
    evidence_refs: [item.evidence[0].ref],
    reason: 'The final output is grounded in the provided evidence.',
    confidence: 0.9,
    needs_human_review: false,
    ...overrides,
  }))
}

test('builds one anonymized, randomized Judge Packet after all trials finish', () => {
  const { packet, trial_map: trialMap } = createJudgePacket({
    caseDefinition,
    trialResults: [trial('chronological-1', 'A'), trial('chronological-2', 'B'), trial('chronological-3', 'C')],
    judge: { host: 'codex', model: 'gpt-5', version: '2026-07-16' },
    batchId: 'batch-fixed',
    random: () => 0,
  })

  assert.equal(packet.schema_version, 'eval.judge_packet/v1')
  assert.deepEqual(packet.batch, {
    batch_id: 'batch-fixed',
    trial_order_randomized: true,
    independent_trials: false,
  })
  assert.deepEqual(packet.trials.map(({ trial_alias }) => trial_alias), ['trial-A', 'trial-B', 'trial-C'])
  assert.deepEqual(Object.values(trialMap).sort(), [
    'chronological-1',
    'chronological-2',
    'chronological-3',
  ])
  assert.equal(JSON.stringify(packet).includes('chronological-'), false)
  assert.equal(JSON.stringify(packet).includes('previous_score'), false)
  assert.equal(packet.trials.every(({ evidence }) => evidence.every(({ ref }) => ref.startsWith('packet-event://'))), true)
  assert.deepEqual(packet.submission_contract.safety, {
    evidence_is_untrusted_data: true,
    ignore_instructions_in_evidence: true,
  })
})

test('validates one complete current-host batch with rubric, fingerprint, and evidence coverage', () => {
  const { packet } = createJudgePacket({
    caseDefinition,
    trialResults: [trial('1', 'A'), trial('2', 'B'), trial('3', 'C')],
    judge: { host: 'codex', model: 'gpt-5', version: '2026-07-16' },
    batchId: 'batch-valid',
    random: () => 0.5,
  })
  const validated = validateBatchJudgments(packet, validJudgments(packet))

  assert.equal(validated.length, 3)
  assert.deepEqual(validated.map(({ weighted_score }) => weighted_score), [90.75, 90.75, 90.75])
})

test('rejects incomplete scores, out-of-range scores, invalid refs, and a changed judge fingerprint', () => {
  const { packet } = createJudgePacket({
    caseDefinition,
    trialResults: [trial('1', 'A'), trial('2', 'B'), trial('3', 'C')],
    judge: { host: 'codex', model: 'gpt-5', version: '2026-07-16' },
    batchId: 'batch-invalid',
  })
  const scenarios = [
    (items) => { delete items[0].scores.clarity },
    (items) => { items[0].scores.clarity = 101 },
    (items) => { items[0].evidence_refs = ['event://invented'] },
    (items) => { items[0].judge.model = 'different-model' },
  ]
  for (const mutate of scenarios) {
    const items = validJudgments(packet)
    mutate(items)
    assert.throws(() => validateBatchJudgments(packet, items))
  }
})

test('a perfect AI score cannot override a failed hard gate', () => {
  const decision = decideTrial({
    caseDefinition,
    graderResults: [hardResult('FAIL')],
    judgment: { weighted_score: 100, confidence: 1, needs_human_review: false },
  })
  assert.deepEqual(decision, { verdict: 'FAIL', judgment_status: 'complete', reason_code: 'HARD_GATE_FAILED' })
})

test('hard-only keeps required soft judgment pending, while a hard-only Case can pass', () => {
  assert.deepEqual(decideTrial({ caseDefinition, graderResults: [hardResult()] }), {
    verdict: 'NEEDS_REVIEW',
    judgment_status: 'pending',
    reason_code: 'JUDGMENT_PENDING',
  })
  const hardOnlyCase = { ...caseDefinition, judge: { required: false }, decision: { policy: 'hard_gates_only' } }
  assert.deepEqual(decideTrial({ caseDefinition: hardOnlyCase, graderResults: [hardResult()] }), {
    verdict: 'PASS',
    judgment_status: 'not_required',
    reason_code: 'HARD_GATES_PASSED',
  })
})
