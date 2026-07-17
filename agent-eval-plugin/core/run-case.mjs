import { randomUUID } from 'node:crypto'

import { assertRuntimeAdapter } from '../adapter-sdk/index.mjs'
import { gradeCase } from '../graders/index.mjs'
import { sha256Canonical } from './canonical-json.mjs'
import { assertCaseRunnable } from './case-store.mjs'
import { decideTrial } from './decision.mjs'
import { validateContract } from './schema-validator.mjs'

function errorDetails(error) {
  const details = {
    name: error instanceof Error ? error.name : 'Error',
    message: error instanceof Error ? error.message : String(error),
  }
  if (error && typeof error === 'object') {
    if (typeof error.code === 'string') details.code = error.code
    if (Number.isInteger(error.exitCode)) details.exit_code = error.exitCode
    if (typeof error.signal === 'string') details.signal = error.signal
  }
  return details
}

function fault(verdict, reasonCode, reason, extra = {}) {
  return {
    verdict,
    judgment_status: 'not_started',
    reason_code: reasonCode,
    reason,
    grader_results: [],
    trace: null,
    ...extra,
  }
}

function reproducibilityMetadata(caseDefinition, adapter, environment) {
  const reported = environment?.trace_metadata ?? {}
  const values = {
    adapter_version: adapter.version ?? reported.adapter_version ?? null,
    agent_version: reported.agent_version ?? caseDefinition.agent?.version ?? null,
    model: reported.model ?? null,
    prompt_hash: sha256Canonical(caseDefinition.prompt),
    skill_hash: reported.skill_hash ?? null,
    knowledge_hash: reported.knowledge_hash ?? null,
    tools_hash: reported.tools_hash ?? null,
    environment_hash: reported.environment_hash ?? null,
  }
  const unavailableReasons = {}
  for (const [field, value] of Object.entries(values)) {
    if (value === null) unavailableReasons[field] = reported.unavailable_reasons?.[field] ?? `${field} not reported by adapter`
  }
  return { ...values, unavailable_reasons: unavailableReasons }
}

export async function runCase({
  caseDefinition,
  adapter,
  traceId = `trace-${randomUUID()}`,
  clock = () => Date.now(),
} = {}) {
  assertCaseRunnable(caseDefinition)
  assertRuntimeAdapter(adapter)
  const startedAt = clock()
  let session

  let environment
  try {
    environment = await adapter.validateEnvironment({ caseDefinition, traceId })
  } catch (error) {
    return fault('ERROR', 'ADAPTER_ENVIRONMENT_ERROR', errorDetails(error).message, {
      error: errorDetails(error),
    })
  }
  if (!environment?.ok) {
    const verdict = environment?.status === 'ERROR' ? 'ERROR' : 'BLOCKED'
    return fault(
      verdict,
      verdict === 'ERROR' ? 'ADAPTER_ENVIRONMENT_ERROR' : 'ADAPTER_ENVIRONMENT_BLOCKED',
      environment?.reason ?? 'Adapter environment is unavailable',
    )
  }

  try {
    session = await adapter.startSession({ caseDefinition, traceId })
    const before = await adapter.snapshotState(session, { phase: 'before', caseDefinition, traceId })
    await adapter.sendPrompt(session, caseDefinition.prompt, { caseDefinition, traceId })
    const events = await adapter.collectEvents(session, {
      traceId,
      actor: caseDefinition.agent?.id ?? 'agent',
    })
    const after = await adapter.snapshotState(session, { phase: 'after', caseDefinition, traceId })
    const graderResults = gradeCase(caseDefinition, events)
    const decision = decideTrial({ caseDefinition, graderResults })
    const trace = {
      schema_version: 'eval.trace/v1',
      trace_id: traceId,
      case_id: caseDefinition.id,
      case_version: caseDefinition.case_hash,
      adapter: adapter.id,
      ...reproducibilityMetadata(caseDefinition, adapter, environment),
      events,
      artifacts: [
        { kind: 'state.before', value: before },
        { kind: 'state.after', value: after },
      ],
      metrics: {
        turns: events.filter(({ type }) => type === 'assistant.message' || type === 'artifact.created').length,
        tool_calls: events.filter(({ type }) => type.startsWith('tool.call')).length,
        latency_ms: Math.max(0, clock() - startedAt),
      },
    }
    const validation = validateContract('eval.trace/v1', trace)
    if (!validation.valid) throw new Error(`Invalid Trace: ${validation.errors.join('; ')}`)

    try {
      await adapter.cleanup(session, { caseDefinition, traceId })
      session = undefined
    } catch (error) {
      return fault('ERROR', 'ADAPTER_CLEANUP_ERROR', errorDetails(error).message, {
        error: errorDetails(error),
        grader_results: graderResults,
        trace,
      })
    }

    return {
      ...decision,
      grader_results: graderResults,
      trace,
    }
  } catch (error) {
    if (session !== undefined) {
      try {
        await adapter.cleanup(session, { caseDefinition, traceId, fault: true })
      } catch (cleanupError) {
        return fault('ERROR', 'ADAPTER_EXECUTION_ERROR', errorDetails(error).message, {
          error: { ...errorDetails(error), cleanup_error: errorDetails(cleanupError) },
        })
      }
    }
    return fault('ERROR', 'ADAPTER_EXECUTION_ERROR', errorDetails(error).message, {
      error: errorDetails(error),
    })
  }
}
