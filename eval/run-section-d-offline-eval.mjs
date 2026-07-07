#!/usr/bin/env node
/**
 * Offline Section D eval — pytest + isolated temp-dir smoke.
 * Does not invoke ACP or write production mapping_import_pending.jsonl.
 *
 * Usage:
 *   node eval/run-section-d-offline-eval.mjs
 */
import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const generator = resolve(repoRoot, 'python', 'scripts', 'generate_learn_by_data_section_d_eval_fixture.py')
const fixture = resolve(repoRoot, 'data', 'smoke', 'learn-by-data-section-d-eval.xlsx')

function pythonExecutable() {
  return process.env.PYTHON || 'python'
}

function run(cmd, args, label) {
  const result = spawnSync(cmd, args, { cwd: repoRoot, encoding: 'utf8' })
  const out = `${result.stdout || ''}${result.stderr || ''}`.trim()
  if (result.status !== 0) {
    console.error(`[section-d-offline] FAIL ${label} (exit ${result.status})`)
    if (out) console.error(out)
    process.exit(result.status || 1)
  }
  console.log(`[section-d-offline] PASS ${label}`)
  if (out) console.log(out)
}

if (!existsSync(fixture)) {
  console.log('[section-d-offline] generating fixture...')
  run(process.execPath, [generator], 'generate fixture')
}

run(pythonExecutable(), ['-m', 'pytest', 'python/tests/test_learn_by_data_section_d_eval.py', '-q'], 'pytest section-d eval')

console.log('[section-d-offline] all checks passed')
