import { result } from './shared.mjs'

export function gradeToolForbidden(grader, events) {
  const evidence = events.filter(({ action }) => grader.config.actions.includes(action))
  const found = [...new Set(evidence.map(({ action }) => action))]
  return found.length === 0
    ? result(grader, 'PASS', 'FORBIDDEN_ACTIONS_ABSENT', [])
    : result(grader, 'FAIL', 'FORBIDDEN_ACTION', evidence, { found })
}
