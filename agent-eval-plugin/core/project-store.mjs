import { mkdirSync, renameSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

import { assertCaseRunnable } from './case-store.mjs'

const STORE_DIRECTORIES = ['cases', 'suites', 'graders', 'baselines', 'runs', 'reports']

export function projectEvalPaths(projectRoot) {
  const root = join(projectRoot, '.agent-eval')
  return Object.fromEntries([
    ['root', root],
    ...STORE_DIRECTORIES.map((name) => [name, join(root, name)]),
  ])
}

export function ensureProjectEvalStore(projectRoot) {
  const paths = projectEvalPaths(projectRoot)
  for (const key of ['root', ...STORE_DIRECTORIES]) {
    mkdirSync(paths[key], { recursive: true })
  }
  return paths
}

export function saveConfirmedCase(projectRoot, lockedCase) {
  assertCaseRunnable(lockedCase)
  if (!/^[a-z0-9][a-z0-9._-]*$/i.test(lockedCase.id)) {
    throw new Error('Case id must be a safe path segment')
  }

  const paths = ensureProjectEvalStore(projectRoot)
  const destination = join(paths.cases, `${lockedCase.id}.json`)
  const temporary = `${destination}.tmp`
  writeFileSync(temporary, `${JSON.stringify(lockedCase, null, 2)}\n`, 'utf8')
  renameSync(temporary, destination)
  return destination
}
