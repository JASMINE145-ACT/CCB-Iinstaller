import assert from 'node:assert/strict'
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'

import { createNativeRunnerTransport } from '../adapters/ccb-acp/native-runner.mjs'

const fixture = readFileSync(
  new URL('./fixtures/ccb-acp/tool-call-updates.jsonl', import.meta.url),
  'utf8',
)

function sandbox() {
  const root = mkdtempSync(join(tmpdir(), 'agent-eval-native-test-'))
  const installDir = join(root, 'install')
  const configDir = join(root, 'config')
  const workDir = join(root, 'work')
  mkdirSync(join(installDir, 'dist'), { recursive: true })
  mkdirSync(join(installDir, 'vendor', 'bun'), { recursive: true })
  mkdirSync(configDir)
  writeFileSync(join(installDir, 'dist', 'cli.js'), '', 'utf8')
  writeFileSync(join(installDir, 'vendor', 'bun', 'bun.exe'), '', 'utf8')
  writeFileSync(join(configDir, 'settings.json'), '{}', 'utf8')
  return { root, installDir, configDir, workDir }
}

test('native runner transport records a child ACP log and cleans its isolated directory', async (t) => {
  const paths = sandbox()
  t.after(() => rmSync(paths.root, { recursive: true, force: true }))
  const runnerPath = join(paths.root, 'fixture-runner.mjs')
  writeFileSync(runnerPath, [
    "import { writeFileSync } from 'node:fs'",
    "if (process.env.CCB_TEST_ROUTE_ENTRY !== '1') process.exit(8)",
    "if (process.env.CCB_INSTALL_DIR !== process.env.CCB_TEST_INSTALL_DIR) process.exit(9)",
    "if (process.env.CCB_WANDING_CONFIG_DIR !== process.env.CCB_TEST_CONFIG_DIR) process.exit(10)",
    `writeFileSync(process.env.CCB_TEST_EVENT_LOG, ${JSON.stringify(fixture)}, 'utf8')`,
  ].join('\n'), 'utf8')

  const transport = createNativeRunnerTransport({
    runnerPath,
    installDir: paths.installDir,
    configDir: paths.configDir,
    tempRoot: paths.workDir,
    timeoutMs: 5000,
    routeEntry: true,
  })
  assert.deepEqual(await transport.validateEnvironment(), { ok: true })

  const session = await transport.startSession({ traceId: 'trace-native-test' })
  await transport.sendPrompt(session, 'fixture prompt')
  const updates = await transport.collectUpdates(session)
  assert.equal(updates.length, 11)
  assert.equal(updates[5].rawOutput[0].text.includes('TEST-DIRECT50'), true)
  assert.equal(existsSync(session.directory), true)

  await transport.cleanup(session)
  assert.equal(existsSync(session.directory), false)
})

test('native runner reports a missing install as BLOCKED before starting a child', async (t) => {
  const paths = sandbox()
  t.after(() => rmSync(paths.root, { recursive: true, force: true }))
  const runnerPath = join(paths.root, 'fixture-runner.mjs')
  writeFileSync(runnerPath, '', 'utf8')
  const transport = createNativeRunnerTransport({
    runnerPath,
    installDir: join(paths.root, 'missing-install'),
    configDir: paths.configDir,
    tempRoot: paths.workDir,
  })

  const result = await transport.validateEnvironment()
  assert.equal(result.ok, false)
  assert.equal(result.status, 'BLOCKED')
  assert.match(result.reason, /install directory/u)
})

test('native runner reports an incomplete Route B runtime as BLOCKED', async (t) => {
  const paths = sandbox()
  t.after(() => rmSync(paths.root, { recursive: true, force: true }))
  const runnerPath = join(paths.root, 'fixture-runner.mjs')
  writeFileSync(runnerPath, '', 'utf8')
  rmSync(join(paths.installDir, 'dist', 'cli.js'))
  const transport = createNativeRunnerTransport({
    runnerPath,
    installDir: paths.installDir,
    configDir: paths.configDir,
    tempRoot: paths.workDir,
    routeEntry: true,
  })

  const result = await transport.validateEnvironment()
  assert.equal(result.ok, false)
  assert.equal(result.status, 'BLOCKED')
  assert.match(result.reason, /Route B cli/u)
})
test('native runner rejects a non-zero child exit with bounded diagnostics', async (t) => {
  const paths = sandbox()
  t.after(() => rmSync(paths.root, { recursive: true, force: true }))
  const runnerPath = join(paths.root, 'failed-runner.mjs')
  writeFileSync(runnerPath, "console.error('synthetic child failure'); process.exit(7)\n", 'utf8')
  const transport = createNativeRunnerTransport({
    runnerPath,
    installDir: paths.installDir,
    configDir: paths.configDir,
    tempRoot: paths.workDir,
    timeoutMs: 5000,
  })
  const session = await transport.startSession({ traceId: 'trace-child-failure' })
  t.after(() => transport.cleanup(session))

  await assert.rejects(
    transport.sendPrompt(session, 'fixture prompt'),
    (error) => error.code === 'CHILD_EXIT' && error.exitCode === 7 && /synthetic child failure/u.test(error.stderr),
  )
})
