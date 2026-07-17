import { canonicalStringify } from './canonical-json.mjs'
import { validateContract } from './schema-validator.mjs'

function same(left, right) {
  return canonicalStringify(left) === canonicalStringify(right)
}

function weightedScore(rubric, scores) {
  const totalWeight = rubric.reduce((sum, item) => sum + item.weight, 0)
  const value = rubric.reduce((sum, item) => sum + scores[item.id] * item.weight, 0) / totalWeight
  return Math.round(value * 100) / 100
}

export function validateBatchJudgments(packet, judgments) {
  if (packet?.schema_version !== 'eval.judge_packet/v1') throw new Error('Invalid Judge Packet')
  if (!Array.isArray(judgments) || judgments.length !== packet.trials.length) throw new Error(`Judgment batch must contain exactly ${packet.trials.length} items`)
  const expectedAliases = packet.trials.map(({ trial_alias }) => trial_alias).sort()
  const actualAliases = judgments.map(({ trial_alias }) => trial_alias).sort()
  if (!same(expectedAliases, actualAliases)) throw new Error('Judgment trial coverage is incomplete')
  return judgments.map((judgment) => {
    const validation = validateContract('eval.judgment/v1', judgment)
    if (!validation.valid) throw new Error(`Invalid Judgment: ${validation.errors.join('; ')}`)
    const trial = packet.trials.find(({ trial_alias }) => trial_alias === judgment.trial_alias)
    const rubricIds = packet.case.rubric.map(({ id }) => id).sort()
    if (!same(Object.keys(judgment.scores).sort(), rubricIds)) throw new Error(`Judgment ${judgment.trial_alias} must score every rubric exactly once`)
    for (const [rubricId, score] of Object.entries(judgment.scores)) {
      if (typeof score !== 'number' || !Number.isFinite(score) || score < 0 || score > 100) throw new Error(`Judgment score ${rubricId} must be between 0 and 100`)
    }
    const expectedJudge = { ...packet.expected_judge, rubric_hash: packet.case.rubric_hash }
    if (!same(judgment.judge, expectedJudge)) throw new Error('Judge fingerprint does not match the Packet')
    if (!same(judgment.batch, packet.batch)) throw new Error('Judgment batch identity does not match the Packet')
    if (!judgment.reason.trim()) throw new Error('Judgment reason is required')
    const allowedRefs = new Set(trial.evidence.map(({ ref }) => ref))
    if (judgment.evidence_refs.length === 0 || judgment.evidence_refs.some((ref) => !allowedRefs.has(ref))) throw new Error(`Judgment ${judgment.trial_alias} contains invalid evidence references`)
    return { ...structuredClone(judgment), weighted_score: weightedScore(packet.case.rubric, judgment.scores), judge_fingerprint: canonicalStringify(judgment.judge) }
  })
}
