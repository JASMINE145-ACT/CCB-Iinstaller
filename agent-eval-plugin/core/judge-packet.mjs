import { randomUUID } from 'node:crypto'

import { sha256Canonical } from './canonical-json.mjs'

function shuffled(values, random) {
  const result = [...values]
  for (let index = result.length - 1; index > 0; index -= 1) {
    const selected = Math.floor(random() * (index + 1))
    ;[result[index], result[selected]] = [result[selected], result[index]]
  }
  return result
}

function packetEvent(event, trialAlias, index) {
  return {
    ref: `packet-event://${trialAlias}/event-${index + 1}`,
    type: event.type,
    action: event.action,
    status: event.status,
    ...(event.input === undefined ? {} : { input: structuredClone(event.input) }),
    ...(event.output === undefined ? {} : { output: structuredClone(event.output) }),
  }
}

export function createJudgePacket({ caseDefinition, trialResults, judge, batchId = `judge-batch-${randomUUID()}`, random = Math.random } = {}) {
  if (!caseDefinition?.judge?.required || !Array.isArray(caseDefinition.judge.rubric)) throw new Error('Case requires a soft rubric before creating a Judge Packet')
  if (!Array.isArray(trialResults) || trialResults.length === 0) throw new Error('All completed trial results are required')
  if (!judge?.host || !judge?.model || !judge?.version) throw new Error('Current-host judge fingerprint is required')
  for (const item of trialResults) {
    if (!item?.trial_id || !item?.trace?.events || !item?.grader_results) throw new Error('Every trial must be completed before batch judgment')
  }
  const ordered = shuffled(trialResults, random)
  const trialMap = {}
  const trials = ordered.map((item, index) => {
    const trialAlias = `trial-${String.fromCharCode(65 + index)}`
    trialMap[trialAlias] = item.trial_id
    const evidence = item.trace.events.map((event, eventIndex) => packetEvent(event, trialAlias, eventIndex))
    const finalOutput = [...evidence].reverse().find(({ action }) => action.startsWith('assistant.'))?.output ?? null
    return { trial_alias: trialAlias, final_output: finalOutput, evidence, deterministic_graders: structuredClone(item.grader_results) }
  })
  const rubric = structuredClone(caseDefinition.judge.rubric)
  const rubricHash = sha256Canonical(rubric)
  return {
    packet: {
      schema_version: 'eval.judge_packet/v1',
      batch: { batch_id: batchId, trial_order_randomized: true, independent_trials: false },
      expected_judge: structuredClone(judge),
      case: { id: caseDefinition.id, objective: caseDefinition.objective, rubric, rubric_hash: rubricHash, threshold: caseDefinition.judge.threshold },
      trials,
      submission_contract: { schema_version: 'eval.judgment/v1', submit_all_trials_together: true, scores_range: [0, 100] },
    },
    trial_map: trialMap,
  }
}
