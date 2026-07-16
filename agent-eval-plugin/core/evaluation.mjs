import { randomUUID } from 'node:crypto'

import { decideTrial } from './decision.mjs'
import { createJudgePacket } from './judge-packet.mjs'
import { validateBatchJudgments } from './judgment.mjs'
import { aggregateTrials } from './metrics.mjs'
import { createReport } from './report.mjs'
import { runCase } from './run-case.mjs'

export async function runEvaluation({
  caseDefinition,
  adapterFactory,
  trialCount = caseDefinition?.trials?.count ?? 1,
  runId = `run-${randomUUID()}`,
  judge,
  random = Math.random,
  trialRunner = runCase,
} = {}) {
  if (typeof adapterFactory !== 'function') throw new TypeError('adapterFactory is required')
  if (!Number.isInteger(trialCount) || trialCount < 1) throw new TypeError('trialCount must be a positive integer')
  const trials = []
  for (let index = 0; index < trialCount; index += 1) {
    const result = await trialRunner({
      caseDefinition,
      adapter: await adapterFactory(index),
      traceId: `trace-${runId}-${index + 1}`,
    })
    trials.push({ trial_id: `target-trial-${randomUUID()}`, ...result })
  }

  let judgePacket = null
  let trialMap = null
  if (caseDefinition.judge?.required && trials.every(({ trace }) => trace?.events)) {
    const created = createJudgePacket({ caseDefinition, trialResults: trials, judge, random })
    judgePacket = created.packet
    trialMap = created.trial_map
  }
  const metrics = aggregateTrials(trials)
  const report = createReport({ runId, caseId: caseDefinition.id, trialResults: trials, metrics })
  return {
    state: {
      schema_version: 'eval.run-state/v1',
      run_id: runId,
      case_id: caseDefinition.id,
      case_hash: caseDefinition.case_hash,
      status: judgePacket ? 'judgment_pending' : 'complete',
      case_definition: structuredClone(caseDefinition),
      trials,
      judge_packet: judgePacket,
      trial_map: trialMap,
    },
    report,
  }
}

export function submitEvaluationJudgments({ state, caseDefinition = state?.case_definition, judgments } = {}) {
  if (!state?.judge_packet || !state?.trial_map) throw new Error('Evaluation has no pending Judge Packet')
  const validated = validateBatchJudgments(state.judge_packet, judgments)
  const judgmentByTrial = new Map(validated.map((judgment) => [
    state.trial_map[judgment.trial_alias],
    judgment,
  ]))
  const trials = state.trials.map((trial) => {
    const judgment = judgmentByTrial.get(trial.trial_id)
    if (!judgment) throw new Error(`Missing mapped Judgment for ${trial.trial_id}`)
    const decision = decideTrial({
      caseDefinition,
      graderResults: trial.grader_results,
      judgment,
    })
    return { ...structuredClone(trial), ...decision, judgment }
  })
  const metrics = aggregateTrials(trials)
  const report = createReport({
    runId: state.run_id,
    caseId: state.case_id,
    trialResults: trials,
    metrics,
  })
  return {
    state: { ...structuredClone(state), status: 'complete', trials },
    report,
  }
}
