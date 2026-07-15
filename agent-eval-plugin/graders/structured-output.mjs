import { eventsForAction, result } from './shared.mjs'

export function gradeStructuredOutput(grader, events) {
  const tableEvent = eventsForAction(events, 'assistant.table').at(-1)
  if (!tableEvent || tableEvent.output?.format !== grader.config.format) {
    return result(grader, 'FAIL', 'STRUCTURED_OUTPUT_MISSING', tableEvent ? [tableEvent] : [])
  }
  const columns = tableEvent.output.columns ?? []
  const missingColumns = grader.config.required_columns.filter((column) => !columns.includes(column))
  if (missingColumns.length) {
    return result(
      grader,
      'FAIL',
      'STRUCTURED_OUTPUT_MISSING_COLUMNS',
      [tableEvent],
      { missing_columns: missingColumns },
    )
  }
  if (!Array.isArray(tableEvent.output.rows) || tableEvent.output.rows.length === 0) {
    return result(grader, 'FAIL', 'STRUCTURED_OUTPUT_EMPTY', [tableEvent])
  }
  return result(grader, 'PASS', 'STRUCTURED_OUTPUT_MATCH', [tableEvent])
}
