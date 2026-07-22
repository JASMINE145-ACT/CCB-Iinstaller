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
  if (
    grader.config.exact_columns === true
    && (
      columns.length !== grader.config.required_columns.length
      || columns.some((column, index) => column !== grader.config.required_columns[index])
    )
  ) {
    return result(
      grader,
      'FAIL',
      'STRUCTURED_OUTPUT_COLUMNS_NOT_EXACT',
      [tableEvent],
      {
        expected_columns: grader.config.required_columns,
        actual_columns: columns,
      },
    )
  }
  if (!Array.isArray(tableEvent.output.rows) || tableEvent.output.rows.length === 0) {
    return result(grader, 'FAIL', 'STRUCTURED_OUTPUT_EMPTY', [tableEvent])
  }
  const minRows = grader.config.min_rows
  if (typeof minRows === 'number' && tableEvent.output.rows.length < minRows) {
    return result(
      grader,
      'FAIL',
      'STRUCTURED_OUTPUT_TOO_FEW_ROWS',
      [tableEvent],
      {
        min_rows: minRows,
        actual_rows: tableEvent.output.rows.length,
      },
    )
  }
  return result(grader, 'PASS', 'STRUCTURED_OUTPUT_MATCH', [tableEvent])
}
