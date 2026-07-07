#!/usr/bin/env node
/**
 * Offline knowledge effectiveness eval — pytest on ccb-subagent-gate hooks.
 * No ACP; uses temp SUBAGENT_GATE_LOG_DIR only.
 *
 * Usage:
 *   node eval/run-knowledge-effectiveness-offline-eval.mjs
 *   CCB_EVAL_PYTEST_K=test_denies_after_four node eval/run-knowledge-effectiveness-offline-eval.mjs
 */
import { spawnSync } from 'node:child_process'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const gateTests = resolve(
  repoRoot,
  'ccb-installer/config/skills/ccb-subagent-gate/tests/test_knowledge_read_gate.py',
)

function pythonExecutable() {
  return process.env.PYTHON || 'python'
}

function runPytest(label, extraArgs = []) {
  const pytestFilter = process.env.CCB_EVAL_PYTEST_K || ''
  const args = ['-m', 'pytest', gateTests, '-q', ...extraArgs]
  if (pytestFilter) {
    args.push('-k', pytestFilter)
  }
  const result = spawnSync(pythonExecutable(), args, { cwd: repoRoot, encoding: 'utf8' })
  const out = `${result.stdout || ''}${result.stderr || ''}`.trim()
  if (result.status !== 0) {
    console.error(`[knowledge-effectiveness-offline] FAIL ${label} (exit ${result.status})`)
    if (out) console.error(out)
    process.exit(result.status || 1)
  }
  console.log(`[knowledge-effectiveness-offline] PASS ${label}`)
  if (out) console.log(out)
}

runPytest('pytest knowledge effectiveness gate')
console.log('[knowledge-effectiveness-offline] all checks passed')
