import { validateContract } from './schema-validator.mjs'

const verdictPriority = ['ERROR', 'BLOCKED', 'FAIL', 'NEEDS_REVIEW', 'PASS']

function overallVerdict(trials) {
  return verdictPriority.find((verdict) => trials.some((trial) => trial.verdict === verdict)) ?? 'ERROR'
}

export function createReport({ runId, caseId, trialResults, metrics, baseline = null } = {}) {
  const verdict = overallVerdict(trialResults)
  const statuses = trialResults.map(({ judgment_status }) => judgment_status)
  const judgmentStatus = statuses.includes('pending') ? 'pending' : statuses.includes('complete') ? 'complete' : 'not_required'
  const report = {
    schema_version: 'eval.report/v1',
    run_id: runId,
    case_id: caseId,
    verdict,
    judgment_status: judgmentStatus,
    outcomes: trialResults.map((trial, index) => ({
      trial: index + 1,
      verdict: trial.verdict,
      judgment_status: trial.judgment_status,
      ...(trial.reason_code ? { reason_code: trial.reason_code } : {}),
      ...(trial.reason ? { reason: trial.reason } : {}),
      ...(trial.error ? { error: structuredClone(trial.error) } : {}),
    })),
    grader_results: trialResults.flatMap((trial, index) => trial.grader_results.map((result) => ({ trial: index + 1, ...structuredClone(result) }))),
    judgments: trialResults.flatMap((trial, index) => trial.judgment
      ? [{ trial: index + 1, ...structuredClone(trial.judgment) }]
      : []),
    trace_refs: trialResults.filter(({ trace }) => trace?.trace_id).map(({ trace }) => `trace://${trace.trace_id}`),
    metrics: structuredClone(metrics),
    ...(baseline ? { baseline: structuredClone(baseline) } : {}),
  }
  const validation = validateContract('eval.report/v1', report)
  if (!validation.valid) throw new Error(`Invalid Report: ${validation.errors.join('; ')}`)
  return report
}

export function renderMarkdownReport(report) {
  const failures = report.grader_results.filter(({ status }) => status === 'FAIL')
  const baseline = report.baseline
  const lines = [
    `# Agent Eval Report: ${report.case_id}`,
    '',
    `Verdict: ${report.verdict}`,
    `Judgment: ${report.judgment_status}`,
    '',
    '## Trial outcomes',
    '',
    ...report.outcomes.map((item) => `- Trial ${item.trial}: ${item.verdict} / ${item.reason_code ?? 'NO_REASON_CODE'}${item.error?.code ? ` / ${item.error.code}` : ''}`),
    '',
    '## Metrics',
    '',
    ...Object.entries(report.metrics).map(([key, value]) => `- ${key}: ${value}`),
    '',
    '## Hard failures',
    '',
    ...(failures.length > 0 ? failures.map((item) => `- Trial ${item.trial}: ${item.grader_id} (${item.reason_code ?? 'FAILED'})`) : ['- None']),
    ...(baseline ? [
      '',
      '## Baseline',
      '',
      `- hard: ${baseline.hard.status}`,
      `- soft: ${baseline.soft.status}`,
      `- hard_delta: ${JSON.stringify(baseline.hard.delta ?? {})}`,
      `- soft_delta: ${JSON.stringify(baseline.soft.delta ?? {})}`,
    ] : []),
  ]
  return `${lines.join('\n')}\n`
}
