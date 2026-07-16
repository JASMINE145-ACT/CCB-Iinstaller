import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'

import { compareBaseline, promoteBaseline } from '../core/baseline.mjs'
import { aggregateTrials } from '../core/metrics.mjs'
import { createReport, renderMarkdownReport } from '../core/report.mjs'
import { validateContract } from '../core/schema-validator.mjs'

const fingerprints = {
  case_set_hash: 'sha256:cases',
  adapter: 'ccb-acp@1',
  agent: 'quotation-agent@1',
  knowledge: 'sha256:knowledge',
  tools: 'sha256:tools',
  environment: 'sha256:environment',
  judge: {
    host: 'codex',
    model: 'gpt-5',
    version: '2026-07-16',
    rubric_hash: 'sha256:rubric',
  },
}

function trial(verdict, latency, toolCalls = 3, softScore) {
  return {
    verdict,
    trace: { metrics: { latency_ms: latency, tool_calls: toolCalls } },
    ...(softScore === undefined ? {} : { judgment: { weighted_score: softScore } }),
  }
}

test('aggregates three trials into reliability, flakiness, and latency metrics', () => {
  const metrics = aggregateTrials([
    trial('PASS', 100, 2, 90),
    trial('FAIL', 300, 4, 70),
    trial('PASS', 200, 3, 80),
  ])
  assert.deepEqual(metrics, {
    trials: 3,
    passed: 2,
    pass_at_1: 1,
    pass_at_3: 1,
    pass_power_3: 0,
    flaky_rate: 1,
    error_rate: 0,
    needs_review_rate: 0,
    latency_p50_ms: 200,
    latency_p95_ms: 300,
    tool_calls_mean: 3,
    soft_score_mean: 80,
    soft_score_p50: 80,
    soft_score_p95: 90,
    independent_trials: false,
  })
})

test('baseline promotion is explicit, requires PASS, and writes a versioned summary', (t) => {
  const root = mkdtempSync(join(tmpdir(), 'agent-eval-baseline-'))
  t.after(() => rmSync(root, { recursive: true, force: true }))
  const report = {
    schema_version: 'eval.report/v1',
    run_id: 'run-pass',
    case_id: 'case-1',
    verdict: 'PASS',
    metrics: { pass_at_1: 1, soft_score_mean: 90 },
  }
  assert.throws(() => promoteBaseline({ report, fingerprints, directory: root }), /explicit confirmation/u)

  const baseline = promoteBaseline({
    report,
    fingerprints,
    directory: root,
    confirmed: true,
    promotedAt: '2026-07-16T00:00:00.000Z',
  })
  assert.equal(baseline.schema_version, 'eval.baseline/v1')
  assert.equal(baseline.source_run_id, 'run-pass')
  assert.deepEqual(JSON.parse(readFileSync(join(root, 'case-1.json'), 'utf8')), baseline)
  assert.throws(() => promoteBaseline({
    report: { ...report, verdict: 'FAIL' }, fingerprints, directory: root, confirmed: true,
  }), /passing report/u)
})

test('compares hard metrics by target fingerprint and soft metrics only by judge fingerprint', () => {
  const baseline = {
    schema_version: 'eval.baseline/v1',
    fingerprints,
    metrics: { pass_at_1: 1, latency_p50_ms: 200, soft_score_mean: 90 },
  }
  const differentJudge = structuredClone(fingerprints)
  differentJudge.judge.model = 'gpt-5.1'
  const comparison = compareBaseline(baseline, {
    fingerprints: differentJudge,
    metrics: { pass_at_1: 0, latency_p50_ms: 250, soft_score_mean: 95 },
  })
  assert.equal(comparison.hard.status, 'COMPARABLE')
  assert.deepEqual(comparison.hard.delta, { pass_at_1: -1, latency_p50_ms: 50 })
  assert.deepEqual(comparison.soft, { status: 'NOT_COMPARABLE', reason_code: 'JUDGE_FINGERPRINT_MISMATCH' })

  const comparable = compareBaseline(baseline, {
    fingerprints,
    metrics: { pass_at_1: 1, latency_p50_ms: 200, soft_score_mean: 95 },
  })
  assert.deepEqual(comparable.soft, { status: 'COMPARABLE', delta: { soft_score_mean: 5 } })

  const differentEnvironment = structuredClone(fingerprints)
  differentEnvironment.environment = 'sha256:other'
  const blocked = compareBaseline(baseline, { fingerprints: differentEnvironment, metrics: {} })
  assert.equal(blocked.hard.status, 'NOT_COMPARABLE')
  assert.equal(blocked.soft.status, 'NOT_COMPARABLE')
})

test('creates contract-valid JSON and Markdown reports without hiding hard failures', () => {
  const metrics = aggregateTrials([trial('FAIL', 120)])
  const report = createReport({
    runId: 'run-report',
    caseId: 'quotation-case',
    trialResults: [{
      verdict: 'FAIL',
      judgment_status: 'complete',
      grader_results: [{ grader_id: 'required_actions', severity: 'hard', status: 'FAIL' }],
      trace: { trace_id: 'trace-report', metrics: { latency_ms: 120, tool_calls: 0 } },
    }],
    metrics,
  })
  assert.equal(validateContract('eval.report/v1', report).valid, true)
  assert.equal(report.verdict, 'FAIL')
  const markdown = renderMarkdownReport(report)
  assert.match(markdown, /Verdict: FAIL/u)
  assert.match(markdown, /required_actions/u)
})
