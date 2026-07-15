import { eventsForAction, result } from './shared.mjs'

export function gradeToolPresence(grader, events) {
  const missing = grader.config.actions.filter((action) => eventsForAction(events, action).length === 0)
  const evidence = events.filter(({ action }) => grader.config.actions.includes(action))
  return missing.length === 0
    ? result(grader, 'PASS', 'REQUIRED_ACTIONS_PRESENT', evidence)
    : result(grader, 'FAIL', 'MISSING_REQUIRED_ACTION', evidence, { missing })
}
