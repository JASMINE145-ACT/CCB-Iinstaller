export function decideTrial({ caseDefinition, graderResults, judgment } = {}) {
  const hardFailed = graderResults.some(({ severity, status }) => severity === 'hard' && status !== 'PASS')
  if (hardFailed) return { verdict: 'FAIL', judgment_status: judgment ? 'complete' : 'not_required', reason_code: 'HARD_GATE_FAILED' }
  if (caseDefinition.judge?.required !== true || caseDefinition.decision?.policy === 'hard_gates_only') return { verdict: 'PASS', judgment_status: 'not_required', reason_code: 'HARD_GATES_PASSED' }
  if (!judgment) return { verdict: 'NEEDS_REVIEW', judgment_status: 'pending', reason_code: 'JUDGMENT_PENDING' }
  if (judgment.needs_human_review || judgment.confidence < 0.5) return { verdict: 'NEEDS_REVIEW', judgment_status: 'complete', reason_code: 'HUMAN_REVIEW_REQUIRED' }
  const threshold = caseDefinition.judge.threshold ?? caseDefinition.decision?.soft?.threshold ?? 0
  return judgment.weighted_score >= threshold
    ? { verdict: 'PASS', judgment_status: 'complete', reason_code: 'ALL_GATES_PASSED' }
    : { verdict: 'FAIL', judgment_status: 'complete', reason_code: 'SOFT_THRESHOLD_NOT_MET' }
}
