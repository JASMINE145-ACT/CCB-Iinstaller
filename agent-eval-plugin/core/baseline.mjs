import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

import { canonicalStringify } from './canonical-json.mjs'

const targetFingerprintKeys = ['case_set_hash', 'adapter', 'agent', 'knowledge', 'tools', 'environment']
const hardMetricKeys = ['pass_at_1', 'pass_at_3', 'pass_power_3', 'flaky_rate', 'error_rate', 'latency_p50_ms', 'latency_p95_ms', 'tool_calls_mean']
const softMetricKeys = ['soft_score_mean', 'soft_score_p50', 'soft_score_p95']

function same(left, right) {
  if (left === undefined || right === undefined) return false
  return canonicalStringify(left) === canonicalStringify(right)
}

function metricDelta(baseline, current, keys) {
  return Object.fromEntries(keys.filter((key) => Number.isFinite(baseline[key]) && Number.isFinite(current[key]))
    .map((key) => [key, Math.round((current[key] - baseline[key]) * 100) / 100]))
}

export function promoteBaseline({ report, fingerprints, directory, confirmed, promotedAt = new Date().toISOString() } = {}) {
  if (confirmed !== true) throw new Error('Baseline promotion requires explicit confirmation')
  if (report?.verdict !== 'PASS') throw new Error('Baseline promotion requires a passing report')
  if (!/^[a-zA-Z0-9._-]+$/u.test(report.case_id)) throw new Error('Unsafe baseline Case id')
  const baseline = {
    schema_version: 'eval.baseline/v1',
    case_id: report.case_id,
    source_run_id: report.run_id,
    promoted_at: promotedAt,
    fingerprints: structuredClone(fingerprints),
    metrics: structuredClone(report.metrics),
  }
  mkdirSync(directory, { recursive: true })
  writeFileSync(join(directory, `${report.case_id}.json`), `${JSON.stringify(baseline, null, 2)}\n`, 'utf8')
  return baseline
}

export function compareBaseline(baseline, current) {
  const targetMatches = targetFingerprintKeys.every((key) => same(baseline.fingerprints?.[key], current.fingerprints?.[key]))
  if (!targetMatches) {
    const unavailable = { status: 'NOT_COMPARABLE', reason_code: 'TARGET_FINGERPRINT_MISMATCH' }
    return { hard: unavailable, soft: unavailable }
  }
  const hard = { status: 'COMPARABLE', delta: metricDelta(baseline.metrics, current.metrics, hardMetricKeys) }
  const judgeMatches = same(baseline.fingerprints?.judge, current.fingerprints?.judge)
  const soft = judgeMatches
    ? { status: 'COMPARABLE', delta: metricDelta(baseline.metrics, current.metrics, softMetricKeys) }
    : { status: 'NOT_COMPARABLE', reason_code: 'JUDGE_FINGERPRINT_MISMATCH' }
  return { hard, soft }
}
