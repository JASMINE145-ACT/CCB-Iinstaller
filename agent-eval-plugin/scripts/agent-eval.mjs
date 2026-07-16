#!/usr/bin/env node
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'

import { createCcbAcpAdapter } from '../adapters/ccb-acp/index.mjs'
import { createNativeRunnerTransport } from '../adapters/ccb-acp/native-runner.mjs'
import { promoteBaseline } from '../core/baseline.mjs'
import { confirmCase, createCaseDraft } from '../core/case-store.mjs'
import { runEvaluation, submitEvaluationJudgments } from '../core/evaluation.mjs'
import { renderMarkdownReport } from '../core/report.mjs'

const help = `Agent Eval internal host interface (invoke through the agent-eval Skill)

Operations:
  create   --input-file <json> [--output-file <json>]
  confirm  --case-file <json> --confirmed [--output-file <json>]
  run      --case-file <json> (--fixture <jsonl> | native adapter options) [--trials 3]
  review   --run-dir <dir> --judgments-file <json>
  report   --run-dir <dir>
  baseline --run-dir <dir> --fingerprints-file <json> --confirmed [--baseline-dir <dir>]

The script performs deterministic work only. The current host AI reads the Judge Packet
and submits Judgment JSON; this script never calls a judge model API.
`

function parseArgs(argv) {
  const [operation, ...rest] = argv
  const options = {}
  for (let index = 0; index < rest.length; index += 1) {
    const token = rest[index]
    if (!token.startsWith('--')) throw new Error(`Unexpected argument: ${token}`)
    const key = token.slice(2)
    const next = rest[index + 1]
    if (!next || next.startsWith('--')) options[key] = true
    else { options[key] = next; index += 1 }
  }
  return { operation, options }
}

function required(options, key) {
  if (!options[key] || options[key] === true) throw new Error(`--${key} is required`)
  return options[key]
}

function readJson(path) {
  return JSON.parse(readFileSync(resolve(path), 'utf8'))
}

function writeJson(path, value) {
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, 'utf8')
}

function emit(value) {
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`)
}

function fixtureAdapterFactory(fixturePath) {
  const updates = readFileSync(resolve(fixturePath), 'utf8').trim().split(/\r?\n/u).map((line) => JSON.parse(line))
  return () => createCcbAcpAdapter({
    transport: {
      async validateEnvironment() { return { ok: true } },
      async startSession({ traceId }) { return { id: traceId } },
      async sendPrompt() {},
      async collectUpdates() { return structuredClone(updates) },
      async snapshotState() { return { supported: false } },
      async cleanup() {},
    },
  })
}

function nativeAdapterFactory(options) {
  return () => createCcbAcpAdapter({
    transport: createNativeRunnerTransport({
      runnerPath: required(options, 'runner-path'),
      installDir: required(options, 'install-dir'),
      configDir: required(options, 'config-dir'),
      tempRoot: options['temp-root'],
      timeoutMs: Number(options['timeout-ms'] ?? 180000),
      routeEntry: options['route-entry'] === true || options['route-entry'] === 'true',
    }),
  })
}

function saveRun(runDir, state, report) {
  mkdirSync(runDir, { recursive: true })
  writeJson(join(runDir, 'state.json'), state)
  writeJson(join(runDir, 'report.json'), report)
  writeFileSync(join(runDir, 'report.md'), renderMarkdownReport(report), 'utf8')
  if (state.judge_packet) writeJson(join(runDir, 'judge-packet.json'), state.judge_packet)
}

async function main() {
  if (process.argv.includes('--help') || process.argv.length < 3) {
    process.stdout.write(help)
    return
  }
  const { operation, options } = parseArgs(process.argv.slice(2))
  if (operation === 'create') {
    const draft = createCaseDraft(readJson(required(options, 'input-file')))
    if (options['output-file']) writeJson(resolve(options['output-file']), draft)
    emit(draft)
    return
  }
  if (operation === 'confirm') {
    const locked = confirmCase(readJson(required(options, 'case-file')), { confirmed: options.confirmed === true })
    if (options['output-file']) writeJson(resolve(options['output-file']), locked)
    emit(locked)
    return
  }
  if (operation === 'run') {
    const caseDefinition = readJson(required(options, 'case-file'))
    const adapterFactory = options.fixture ? fixtureAdapterFactory(options.fixture) : nativeAdapterFactory(options)
    const judge = {
      host: options['judge-host'] ?? 'current-host',
      model: options['judge-model'] ?? 'current-host-model',
      version: options['judge-version'] ?? 'host-reported',
    }
    const result = await runEvaluation({
      caseDefinition,
      adapterFactory,
      trialCount: Number(options.trials ?? caseDefinition.trials.count),
      runId: options['run-id'],
      judge,
    })
    const runDir = resolve(options['output-dir'] ?? join('.agent-eval', 'runs', result.state.run_id))
    saveRun(runDir, result.state, result.report)
    emit({ run_id: result.state.run_id, run_dir: runDir, verdict: result.report.verdict, judgment_status: result.report.judgment_status })
    return
  }
  if (operation === 'review') {
    const runDir = resolve(required(options, 'run-dir'))
    const state = readJson(join(runDir, 'state.json'))
    const result = submitEvaluationJudgments({ state, judgments: readJson(required(options, 'judgments-file')) })
    saveRun(runDir, result.state, result.report)
    emit({ run_id: state.run_id, verdict: result.report.verdict, judgment_status: result.report.judgment_status })
    return
  }
  if (operation === 'report') {
    emit(readJson(join(resolve(required(options, 'run-dir')), 'report.json')))
    return
  }
  if (operation === 'baseline') {
    const runDir = resolve(required(options, 'run-dir'))
    const report = readJson(join(runDir, 'report.json'))
    const baseline = promoteBaseline({
      report,
      fingerprints: readJson(required(options, 'fingerprints-file')),
      directory: resolve(options['baseline-dir'] ?? join('.agent-eval', 'baselines')),
      confirmed: options.confirmed === true,
    })
    emit(baseline)
    return
  }
  throw new Error(`Unknown operation: ${operation}`)
}

main().catch((error) => {
  process.stderr.write(`[agent-eval] ${error.message}\n`)
  process.exitCode = 1
})
