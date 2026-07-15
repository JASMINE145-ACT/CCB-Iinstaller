import { eventsForAction, getPath, result } from './shared.mjs'

export function gradeToolArgs(grader, events) {
  const failures = []
  const evidence = []
  for (const assertion of grader.config.assertions) {
    const event = eventsForAction(events, assertion.action).at(-1)
    if (event) evidence.push(event)
    const actual = event ? getPath(event, assertion.path) : undefined
    if (assertion.operator !== 'equals' || actual !== assertion.value) {
      failures.push({ ...assertion, actual })
    }
  }
  return failures.length === 0
    ? result(grader, 'PASS', 'TOOL_ARGS_MATCH', evidence)
    : result(grader, 'FAIL', 'TOOL_ARGS_MISMATCH', evidence, { failures })
}
