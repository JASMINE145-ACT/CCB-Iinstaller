import assert from 'node:assert/strict'
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs'
import os from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import test from 'node:test'

import {
  assertCaseRunnable,
  confirmCase,
  createCaseDraft,
  verifyCaseLock,
} from '../core/case-store.mjs'
import {
  ensureProjectEvalStore,
  projectEvalPaths,
  saveConfirmedCase,
} from '../core/project-store.mjs'

const caseInput = {
  id: 'quotation-direct50-price-stock',
  title: 'Direct DN50 price and stock',
  objective: 'Return an evidence-backed quote and inventory table.',
  prompt: 'Quote direct DN50 at B level and check stock.',
  risk_level: 'read_only',
  graders: [],
  decision: { policy: 'hard_gates_only' },
  trials: { count: 3 },
}

test('creates a normalized draft that cannot run before explicit confirmation', () => {
  const draft = createCaseDraft(caseInput)

  assert.equal(draft.schema_version, 'eval.case/v1')
  assert.equal(draft.status, 'draft')
  assert.equal(Object.hasOwn(draft, 'case_hash'), false)
  assert.throws(() => assertCaseRunnable(draft), /Case must be confirmed and locked/)
  assert.throws(
    () => confirmCase(draft, { confirmed: false }),
    /Explicit user confirmation is required/,
  )
})

test('confirmation locks a stable canonical hash independent of key order', () => {
  const first = confirmCase(createCaseDraft(caseInput), {
    confirmed: true,
    confirmedAt: '2026-07-15T12:00:00.000Z',
  })
  const reordered = confirmCase(createCaseDraft({
    trials: { count: 3 },
    decision: { policy: 'hard_gates_only' },
    graders: [],
    prompt: caseInput.prompt,
    objective: caseInput.objective,
    title: caseInput.title,
    id: caseInput.id,
    risk_level: 'read_only',
  }), {
    confirmed: true,
    confirmedAt: '2026-07-15T12:00:00.000Z',
  })

  assert.match(first.case_hash, /^sha256:[a-f0-9]{64}$/)
  assert.equal(first.case_hash, reordered.case_hash)
  assert.equal(verifyCaseLock(first), true)
  assert.equal(assertCaseRunnable(first), true)
})

test('detects any mutation after a Case is locked', () => {
  const locked = confirmCase(createCaseDraft(caseInput), {
    confirmed: true,
    confirmedAt: '2026-07-15T12:00:00.000Z',
  })
  locked.prompt = 'A changed prompt'

  assert.throws(() => verifyCaseLock(locked), /Case hash mismatch/)
  assert.throws(() => assertCaseRunnable(locked), /Case hash mismatch/)
})

test('creates the standard project store and saves only verified locked Cases', () => {
  const projectRoot = mkdtempSync(join(os.tmpdir(), 'agent-eval-project-'))
  try {
    const paths = projectEvalPaths(projectRoot)
    assert.equal(paths.root, join(projectRoot, '.agent-eval'))
    assert.equal(paths.cases, join(projectRoot, '.agent-eval', 'cases'))
    assert.equal(paths.runs, join(projectRoot, '.agent-eval', 'runs'))

    ensureProjectEvalStore(projectRoot)
    for (const key of ['cases', 'suites', 'graders', 'baselines', 'runs', 'reports']) {
      assert.equal(existsSync(paths[key]), true, key)
    }

    const draft = createCaseDraft(caseInput)
    assert.throws(
      () => saveConfirmedCase(projectRoot, draft),
      /Case must be confirmed and locked/,
    )

    const locked = confirmCase(draft, {
      confirmed: true,
      confirmedAt: '2026-07-15T12:00:00.000Z',
    })
    const savedPath = saveConfirmedCase(projectRoot, locked)
    assert.equal(savedPath, join(paths.cases, `${caseInput.id}.json`))
    assert.deepEqual(JSON.parse(readFileSync(savedPath, 'utf8')), locked)
  } finally {
    rmSync(projectRoot, { recursive: true, force: true })
  }
})

test('rejects unsafe Case identifiers before constructing a storage path', () => {
  const projectRoot = mkdtempSync(join(os.tmpdir(), 'agent-eval-project-safe-'))
  try {
    const locked = confirmCase(createCaseDraft({ ...caseInput, id: '../escape' }), {
      confirmed: true,
      confirmedAt: '2026-07-15T12:00:00.000Z',
    })
    assert.throws(() => saveConfirmedCase(projectRoot, locked), /safe path segment/)
  } finally {
    rmSync(projectRoot, { recursive: true, force: true })
  }
})

test('the repository CCB Eval Pack ships locked Cases including the dual-item price+stock Case', () => {
  const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
  const packRoot = join(repoRoot, '.agent-eval')
  const casesDir = join(packRoot, 'cases')
  const caseFiles = readdirSync(casesDir).filter((name) => name.endsWith('.json'))
  const lockedCases = caseFiles.map((name) => JSON.parse(readFileSync(join(casesDir, name), 'utf8')))
  const golden = lockedCases.find(({ id }) => id === 'quotation-direct50-price-stock')
  const dual = lockedCases.find(({ id }) => id === 'quotation-direct50-tee50-price-stock')
  const suite = JSON.parse(readFileSync(join(packRoot, 'suites', 'smoke.json'), 'utf8'))
  const config = JSON.parse(readFileSync(join(packRoot, 'config.json'), 'utf8'))
  const gitignore = readFileSync(join(repoRoot, '.gitignore'), 'utf8')

  assert.ok(golden, 'missing single-item golden Case')
  assert.ok(dual, 'missing dual-item price+stock Case')
  assert.ok(lockedCases.length >= 2)
  for (const locked of lockedCases) {
    assert.equal(locked.status, 'locked')
    assert.equal(verifyCaseLock(locked), true)
  }
  assert.deepEqual(
    golden.graders.map((grader) => grader.type),
    ['tool_presence', 'tool_forbidden', 'tool_forbidden', 'sequence', 'tool_args', 'evidence_link', 'structured_output'],
  )
  assert.deepEqual(
    golden.graders.filter(({ severity }) => severity === 'soft').map(({ id }) => id),
    ['discouraged_actions'],
  )
  assert.deepEqual(
    golden.ideal_process,
    ['quotation.match', 'quotation.select', 'inventory.query', 'assistant.table'],
  )
  assert.equal(
    golden.graders.find(({ id }) => id === 'required_actions')?.config?.actions?.includes('quotation.select'),
    true,
  )
  assert.equal(dual.graders.find(({ id }) => id === 'quotation_table')?.config?.min_rows, 2)
  assert.equal(
    dual.graders.find(({ id }) => id === 'required_actions')?.config?.actions?.includes('quotation.select'),
    true,
  )
  assert.deepEqual(suite.case_ids, [golden.id])
  assert.equal(config.default_adapter, 'ccb-acp')
  for (const ignored of ['.agent-eval/runs/', '.agent-eval/reports/private/', '.agent-eval/artifacts/']) {
    assert.match(gitignore, new RegExp(`^${ignored.replaceAll('.', '\\.')}\\s*$`, 'm'))
  }
})
