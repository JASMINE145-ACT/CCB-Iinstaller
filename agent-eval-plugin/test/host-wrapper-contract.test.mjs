import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { spawnSync } from 'node:child_process'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const pluginRoot = join(dirname(fileURLToPath(import.meta.url)), '..')

test('Claude Code wrapper exposes the shared six-operation Skill contract', () => {
  const skill = readFileSync(join(pluginRoot, 'skills', 'agent-eval', 'SKILL.md'), 'utf8')
  for (const operation of ['create', 'confirm', 'run', 'review', 'report', 'baseline']) {
    assert.match(skill, new RegExp(`\\b${operation}\\b`, 'u'))
  }
  assert.match(skill, /current host AI/u)
  assert.match(skill, /Do not call a second LLM judge API/u)
  assert.equal(existsSync(join(pluginRoot, 'hosts', 'claude-code', 'README.md')), true)
})

test('internal script delegates evaluation to the shared Core and documents every operation', () => {
  const scriptPath = join(pluginRoot, 'scripts', 'agent-eval.mjs')
  const source = readFileSync(scriptPath, 'utf8')
  assert.match(source, /from '..\/core\/evaluation\.mjs'/u)
  assert.equal(source.includes('match_quotation'), false)

  const result = spawnSync(process.execPath, [scriptPath, '--help'], { encoding: 'utf8' })
  assert.equal(result.status, 0, result.stderr)
  for (const operation of ['create', 'confirm', 'run', 'review', 'report', 'baseline']) {
    assert.match(result.stdout, new RegExp(operation, 'u'))
  }
})
