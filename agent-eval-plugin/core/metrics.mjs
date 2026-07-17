function quantileNearestRank(values, percentile) {
  if (values.length === 0) return null
  const sorted = [...values].sort((left, right) => left - right)
  return sorted[Math.max(0, Math.ceil(percentile * sorted.length) - 1)]
}

function mean(values) {
  if (values.length === 0) return null
  return Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 100) / 100
}

export function aggregateTrials(trialResults) {
  if (!Array.isArray(trialResults) || trialResults.length === 0) throw new Error('At least one trial is required')
  const verdicts = trialResults.map(({ verdict }) => verdict)
  const passed = verdicts.filter((verdict) => verdict === 'PASS').length
  const latencies = trialResults.map(({ trace }) => trace?.metrics?.latency_ms).filter(Number.isFinite)
  const toolCalls = trialResults.map(({ trace }) => trace?.metrics?.tool_calls).filter(Number.isFinite)
  const softScores = trialResults.map(({ judgment }) => judgment?.weighted_score).filter(Number.isFinite)
  return {
    trials: trialResults.length,
    passed,
    pass_at_1: verdicts[0] === 'PASS' ? 1 : 0,
    pass_at_3: passed > 0 ? 1 : 0,
    pass_power_3: trialResults.length === 3 && passed === 3 ? 1 : 0,
    flaky_rate: new Set(verdicts).size > 1 ? 1 : 0,
    error_rate: verdicts.filter((verdict) => verdict === 'ERROR').length / verdicts.length,
    needs_review_rate: verdicts.filter((verdict) => verdict === 'NEEDS_REVIEW').length / verdicts.length,
    latency_p50_ms: quantileNearestRank(latencies, 0.5),
    latency_p95_ms: quantileNearestRank(latencies, 0.95),
    tool_calls_mean: mean(toolCalls),
    soft_score_mean: mean(softScores),
    soft_score_p50: quantileNearestRank(softScores, 0.5),
    soft_score_p95: quantileNearestRank(softScores, 0.95),
    independent_trials: false,
  }
}
