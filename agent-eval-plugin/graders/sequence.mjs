import { result } from './shared.mjs'

export function gradeSequence(grader, events) {
  const ordered = [...events].sort((left, right) => left.sequence - right.sequence)
  const positions = grader.config.actions.map((action) => ordered.findIndex((event) => event.action === action))
  const evidence = ordered.filter(({ action }) => grader.config.actions.includes(action))
  const missing = grader.config.actions.filter((_, index) => positions[index] === -1)
  if (missing.length) return result(grader, 'FAIL', 'SEQUENCE_MISSING_ACTION', evidence, { missing })
  const inOrder = positions.every((position, index) => index === 0 || position > positions[index - 1])
  return inOrder
    ? result(grader, 'PASS', 'SEQUENCE_MATCH', evidence)
    : result(grader, 'FAIL', 'SEQUENCE_ORDER', evidence, { actions: grader.config.actions, positions })
}
