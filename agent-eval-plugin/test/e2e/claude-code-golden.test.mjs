import assert from 'node:assert/strict'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { spawnSync } from 'node:child_process'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

import { createCcbAcpAdapter } from '../../adapters/ccb-acp/index.mjs'
import { runEvaluation, submitEvaluationJudgments } from '../../core/evaluation.mjs'
import { runCase } from '../../core/run-case.mjs'

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..')
const caseDefinition = JSON.parse(readFileSync(
  join(repoRoot, '.agent-eval', 'cases', 'quotation-direct50-price-stock.json'),
  'utf8',
))
const fixtureUpdates = readFileSync(
  new URL('../fixtures/ccb-acp/tool-call-updates.jsonl', import.meta.url),
  'utf8',
).trim().split(/\r?\n/u).map((line) => JSON.parse(line))

function adapterFactory() {
  return createCcbAcpAdapter({
    transport: {
      async validateEnvironment() { return { ok: true } },
      async startSession({ traceId }) { return { id: traceId } },
      async sendPrompt() {},
      async collectUpdates() { return structuredClone(fixtureUpdates) },
      async snapshotState() { return { supported: false } },
      async cleanup() {},
    },
  })
}

test('Claude wrapper flow runs three isolated trials and accepts one current-AI batch submission', async () => {
  const judge = { host: 'claude-code', model: 'current-host-model', version: 'host-reported' }
  const initial = await runEvaluation({
    caseDefinition,
    adapterFactory,
    trialCount: 3,
    runId: 'run-claude-fixture',
    judge,
    random: () => 0,
  })

  assert.equal(initial.report.verdict, 'NEEDS_REVIEW')
  assert.equal(initial.report.judgment_status, 'pending')
  assert.equal(initial.state.trials.length, 3)
  assert.equal(initial.state.judge_packet.trials.length, 3)
  assert.deepEqual(initial.state.trials.map(({ verdict }) => verdict), Array(3).fill('NEEDS_REVIEW'))

  const judgments = initial.state.judge_packet.trials.map((trial) => ({
    schema_version: 'eval.judgment/v1',
    trial_alias: trial.trial_alias,
    judge: { ...judge, rubric_hash: initial.state.judge_packet.case.rubric_hash },
    batch: { ...initial.state.judge_packet.batch },
    scores: { requirement_satisfaction: 95, selection_reasoning: 90, clarity: 90 },
    evidence_refs: [trial.evidence[0].ref],
    reason: 'The table and tool evidence satisfy the Case-specific rubric.',
    confidence: 0.95,
    needs_human_review: false,
  }))
  const completed = submitEvaluationJudgments({
    state: initial.state,
    caseDefinition,
    judgments,
  })

  assert.equal(completed.report.verdict, 'PASS')
  assert.equal(completed.report.judgment_status, 'complete')
  assert.equal(completed.report.metrics.pass_at_1, 1)
  assert.equal(completed.report.metrics.pass_at_3, 1)
  assert.equal(completed.report.metrics.pass_power_3, 1)
  assert.equal(completed.report.metrics.flaky_rate, 0)
  assert.equal(completed.report.metrics.independent_trials, false)
  assert.equal(completed.report.judgments.length, 3)
  assert.equal(completed.report.judgments.every(({ judge }) => judge.host === 'claude-code'), true)
})

test('hard-only evaluation preserves pending soft review without fabricating a Judge', async () => {
  const initial = await runEvaluation({
    caseDefinition,
    adapterFactory,
    trialCount: 1,
    runId: 'run-hard-only-fixture',
  })

  assert.equal(initial.report.verdict, 'NEEDS_REVIEW')
  assert.equal(initial.report.judgment_status, 'pending')
  assert.equal(initial.state.status, 'judgment_pending')
  assert.equal(initial.state.judge_packet, null)
  assert.equal(initial.state.trial_map, null)
})

test('mixed infrastructure faults judge only pending evidence Trials and still complete', async () => {
  const judge = { host: 'claude-code', model: 'current-host-model', version: 'host-reported' }
  const initial = await runEvaluation({
    caseDefinition,
    adapterFactory,
    trialCount: 2,
    runId: 'run-mixed-fixture',
    judge,
    random: () => 0,
    trialRunner: async ({ caseDefinition: currentCase, adapter, traceId }) => (
      traceId.endsWith('-1')
        ? runCase({ caseDefinition: currentCase, adapter, traceId })
        : {
            verdict: 'ERROR', judgment_status: 'not_started', reason_code: 'ADAPTER_EXECUTION_ERROR',
            reason: 'fixture child crashed', grader_results: [], trace: null,
          }
    ),
  })

  assert.equal(initial.state.judge_packet.trials.length, 1)
  const packetTrial = initial.state.judge_packet.trials[0]
  const completed = submitEvaluationJudgments({
    state: initial.state,
    judgments: [{
      schema_version: 'eval.judgment/v1',
      trial_alias: packetTrial.trial_alias,
      judge: { ...judge, rubric_hash: initial.state.judge_packet.case.rubric_hash },
      batch: { ...initial.state.judge_packet.batch },
      scores: { requirement_satisfaction: 95, selection_reasoning: 90, clarity: 90 },
      evidence_refs: [packetTrial.evidence[0].ref],
      reason: 'The evidence Trial satisfies the Case rubric.', confidence: 0.95, needs_human_review: false,
    }],
  })

  assert.deepEqual(completed.state.trials.map(({ verdict }) => verdict), ['PASS', 'ERROR'])
  assert.equal(completed.state.status, 'complete')
  assert.equal(completed.report.verdict, 'ERROR')
})

test('internal host script persists run, review, and final report artifacts end to end', (t) => {
  const root = mkdtempSync(join(tmpdir(), 'agent-eval-wrapper-e2e-'))
  t.after(() => rmSync(root, { recursive: true, force: true }))
  const runDir = join(root, 'run')
  const scriptPath = join(repoRoot, 'agent-eval-plugin', 'scripts', 'agent-eval.mjs')
  const casePath = join(repoRoot, '.agent-eval', 'cases', 'quotation-direct50-price-stock.json')
  const fixturePath = fileURLToPath(new URL('../fixtures/ccb-acp/tool-call-updates.jsonl', import.meta.url))
  const run = spawnSync(process.execPath, [
    scriptPath, 'run', '--case-file', casePath, '--fixture', fixturePath,
    '--trials', '3', '--run-id', 'run-script-fixture', '--output-dir', runDir,
    '--judge-host', 'claude-code', '--judge-model', 'current-host-model',
    '--judge-version', 'host-reported',
  ], { encoding: 'utf8' })
  assert.equal(run.status, 0, run.stderr)

  const packet = JSON.parse(readFileSync(join(runDir, 'judge-packet.json'), 'utf8'))
  const judgments = packet.trials.map((trial) => ({
    schema_version: 'eval.judgment/v1',
    trial_alias: trial.trial_alias,
    judge: {
      host: 'claude-code', model: 'current-host-model', version: 'host-reported',
      rubric_hash: packet.case.rubric_hash,
    },
    batch: { ...packet.batch },
    scores: { requirement_satisfaction: 95, selection_reasoning: 90, clarity: 90 },
    evidence_refs: [trial.evidence[0].ref],
    reason: 'Current-host review found the output grounded and complete.',
    confidence: 0.95,
    needs_human_review: false,
  }))
  const judgmentsPath = join(root, 'judgments.json')
  writeFileSync(judgmentsPath, JSON.stringify(judgments), 'utf8')
  const review = spawnSync(process.execPath, [
    scriptPath, 'review', '--run-dir', runDir, '--judgments-file', judgmentsPath,
  ], { encoding: 'utf8' })
  assert.equal(review.status, 0, review.stderr)

  const report = JSON.parse(readFileSync(join(runDir, 'report.json'), 'utf8'))
  assert.equal(report.verdict, 'PASS')
  assert.equal(report.judgment_status, 'complete')
  assert.equal(report.metrics.pass_power_3, 1)
  assert.match(readFileSync(join(runDir, 'report.md'), 'utf8'), /Verdict: PASS/u)
})

test('internal host script runs hard-only without invented Judge identity', (t) => {
  const root = mkdtempSync(join(tmpdir(), 'agent-eval-wrapper-hard-only-'))
  t.after(() => rmSync(root, { recursive: true, force: true }))
  const runDir = join(root, 'run')
  mkdirSync(runDir)
  writeFileSync(join(runDir, 'judge-packet.json'), '{"stale":true}', 'utf8')
  const result = spawnSync(process.execPath, [
    join(repoRoot, 'agent-eval-plugin', 'scripts', 'agent-eval.mjs'), 'run',
    '--case-file', join(repoRoot, '.agent-eval', 'cases', 'quotation-direct50-price-stock.json'),
    '--fixture', fileURLToPath(new URL('../fixtures/ccb-acp/tool-call-updates.jsonl', import.meta.url)),
    '--trials', '1', '--output-dir', runDir,
  ], { encoding: 'utf8' })

  assert.equal(result.status, 0, result.stderr)
  const state = JSON.parse(readFileSync(join(runDir, 'state.json'), 'utf8'))
  assert.equal(state.status, 'judgment_pending')
  assert.equal(state.judge_packet, null)
  assert.equal(state.trial_map, null)
  assert.equal(existsSync(join(runDir, 'judge-packet.json')), false)
  assert.equal(readFileSync(join(runDir, 'report.json'), 'utf8').includes('current-host-model'), false)
})

test('internal wrapper preserves a hard FAIL when required tool evidence is missing', (t) => {
  const root = mkdtempSync(join(tmpdir(), 'agent-eval-wrapper-fail-'))
  t.after(() => rmSync(root, { recursive: true, force: true }))
  const invalidFixture = fixtureUpdates.filter(({ sessionUpdate }) => (
    sessionUpdate === 'agent_message_chunk' || sessionUpdate === 'session_completed'
  ))
  const fixturePath = join(root, 'missing-tools.jsonl')
  writeFileSync(fixturePath, `${invalidFixture.map((item) => JSON.stringify(item)).join('\n')}\n`, 'utf8')
  const runDir = join(root, 'run')
  const result = spawnSync(process.execPath, [
    join(repoRoot, 'agent-eval-plugin', 'scripts', 'agent-eval.mjs'), 'run',
    '--case-file', join(repoRoot, '.agent-eval', 'cases', 'quotation-direct50-price-stock.json'),
    '--fixture', fixturePath, '--trials', '1', '--output-dir', runDir,
  ], { encoding: 'utf8' })
  assert.equal(result.status, 0, result.stderr)
  const report = JSON.parse(readFileSync(join(runDir, 'report.json'), 'utf8'))
  assert.equal(report.verdict, 'FAIL')
  const required = report.grader_results.find(({ grader_id }) => grader_id === 'required_actions')
  assert.equal(required.status, 'FAIL')
  assert.equal(required.reason_code, 'MISSING_REQUIRED_ACTION')
})

test('internal wrapper forwards native profile and Route B path to the child runner', (t) => {
  const root = mkdtempSync(join(tmpdir(), 'agent-eval-wrapper-native-options-'))
  t.after(() => rmSync(root, { recursive: true, force: true }))
  const installDir = join(root, 'install')
  const configDir = join(root, 'config')
  const runDir = join(root, 'run')
  const routePath = join(root, 'route-entry.mjs')
  const runnerPath = join(root, 'fixture-runner.mjs')
  mkdirSync(join(installDir, 'dist'), { recursive: true })
  mkdirSync(join(installDir, 'vendor', 'bun'), { recursive: true })
  mkdirSync(configDir, { recursive: true })
  writeFileSync(join(installDir, 'dist', 'cli.js'), '', 'utf8')
  writeFileSync(join(installDir, 'vendor', 'bun', 'bun.exe'), '', 'utf8')
  writeFileSync(join(configDir, 'settings.json'), '{}', 'utf8')
  writeFileSync(routePath, '', 'utf8')
  writeFileSync(runnerPath, [
    "import { writeFileSync } from 'node:fs'",
    "import { resolve } from 'node:path'",
    "if (process.env.CCB_TEST_PROFILE !== 'quotation-v1') process.exit(21)",
    `if (process.env.CCB_TEST_ROUTE_PATH !== resolve(${JSON.stringify(routePath)})) process.exit(22)`,
    `writeFileSync(process.env.CCB_TEST_EVENT_LOG, ${JSON.stringify(
      `${fixtureUpdates.map((item) => JSON.stringify(item)).join('\n')}\n`,
    )}, 'utf8')`,
  ].join('\n'), 'utf8')

  const result = spawnSync(process.execPath, [
    join(repoRoot, 'agent-eval-plugin', 'scripts', 'agent-eval.mjs'), 'run',
    '--case-file', join(repoRoot, '.agent-eval', 'cases', 'quotation-direct50-price-stock.json'),
    '--runner-path', runnerPath, '--install-dir', installDir, '--config-dir', configDir,
    '--route-entry', 'true', '--route-path', routePath, '--profile', 'quotation-v1',
    '--trials', '1', '--output-dir', runDir,
  ], { encoding: 'utf8' })

  assert.equal(result.status, 0, result.stderr)
  const report = JSON.parse(readFileSync(join(runDir, 'report.json'), 'utf8'))
  assert.equal(report.verdict, 'NEEDS_REVIEW')
  assert.equal(report.judgment_status, 'pending')
})
