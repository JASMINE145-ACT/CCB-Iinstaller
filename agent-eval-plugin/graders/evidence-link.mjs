import {
  resolveEvidenceExpression,
  result,
  valuesEqual,
} from './shared.mjs'

export function gradeEvidenceLink(grader, events) {
  const failures = []
  for (const assertion of grader.config.assertions) {
    const source = resolveEvidenceExpression(events, assertion.source)
    const target = resolveEvidenceExpression(events, assertion.target)
    const passed = assertion.operator === 'contains'
      ? target.length > 0 && target.every((value) => source.some((candidate) => candidate === value))
      : assertion.operator === 'equals' && source.length > 0 && valuesEqual(source, target)
    if (!passed) failures.push({ ...assertion, source, target })
  }
  return failures.length === 0
    ? result(grader, 'PASS', 'EVIDENCE_LINK_MATCH', events)
    : result(grader, 'FAIL', 'EVIDENCE_LINK_MISMATCH', events, { failures })
}
