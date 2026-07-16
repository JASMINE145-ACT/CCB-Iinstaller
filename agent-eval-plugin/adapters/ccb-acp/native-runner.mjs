import { spawn } from 'node:child_process'
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import {
  basename,
  dirname,
  isAbsolute,
  join,
  relative,
  resolve,
} from 'node:path'

const diagnosticLimit = 8192

function appendBounded(current, chunk) {
  return `${current}${String(chunk)}`.slice(-diagnosticLimit)
}

function childError(message, properties) {
  return Object.assign(new Error(message), properties)
}

function runChild({ runnerPath, cwd, env, timeoutMs }) {
  return new Promise((resolveChild, reject) => {
    const child = spawn(process.execPath, [runnerPath], {
      cwd,
      env,
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
    })
    let stdout = ''
    let stderr = ''
    let settled = false
    child.stdout.on('data', (chunk) => { stdout = appendBounded(stdout, chunk) })
    child.stderr.on('data', (chunk) => { stderr = appendBounded(stderr, chunk) })
    child.on('error', (error) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      reject(childError(`Unable to start ACP runner: ${error.message}`, {
        code: 'CHILD_START',
        cause: error,
        stdout,
        stderr,
      }))
    })
    child.on('close', (exitCode, signal) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      if (exitCode === 0) {
        resolveChild({ exitCode, signal, stdout, stderr })
      } else {
        reject(childError(`ACP runner exited with code ${exitCode ?? 'unknown'}`, {
          code: 'CHILD_EXIT',
          exitCode,
          signal,
          stdout,
          stderr,
        }))
      }
    })
    const timer = setTimeout(() => {
      if (settled) return
      settled = true
      child.kill('SIGTERM')
      reject(childError(`ACP runner exceeded ${timeoutMs} ms`, {
        code: 'CHILD_TIMEOUT',
        stdout,
        stderr,
      }))
    }, timeoutMs)
    timer.unref()
  })
}

export function createNativeRunnerTransport({
  runnerPath,
  installDir,
  configDir,
  profile = 'quotation-agent',
  tempRoot = join(tmpdir(), 'agent-eval'),
  timeoutMs = 120000,
  routeEntry = false,
  routePath,
  environment = process.env,
  executeChild = runChild,
} = {}) {
  if (typeof runnerPath !== 'string' || !runnerPath) throw new TypeError('runnerPath is required')
  if (typeof installDir !== 'string' || !installDir) throw new TypeError('installDir is required')
  if (typeof configDir !== 'string' || !configDir) throw new TypeError('configDir is required')
  const absoluteTempRoot = resolve(tempRoot)

  return {
    async validateEnvironment() {
      const requirements = [
        [runnerPath, 'ACP runner'],
        [installDir, 'CCB install directory'],
        [join(configDir, 'settings.json'), 'CCB settings.json'],
      ]
      if (routeEntry) {
        requirements.push(
          [join(installDir, 'dist', 'cli.js'), 'Route B cli'],
          [join(installDir, 'vendor', 'bun', 'bun.exe'), 'Route B bundled Bun'],
        )
      }
      const missing = requirements.find(([path]) => !existsSync(path))
      return missing
        ? { ok: false, status: 'BLOCKED', reason: `${missing[1]} not found: ${missing[0]}` }
        : { ok: true }
    },

    async startSession({ traceId }) {
      mkdirSync(absoluteTempRoot, { recursive: true })
      const directory = mkdtempSync(join(absoluteTempRoot, 'ccb-acp-'))
      return {
        id: basename(directory),
        traceId,
        directory,
        eventLogPath: join(directory, 'acp-updates.jsonl'),
      }
    },

    async sendPrompt(session, prompt) {
      session.child = await executeChild({
        runnerPath: resolve(runnerPath),
        cwd: dirname(resolve(runnerPath)),
        timeoutMs: timeoutMs + 5000,
        env: {
          ...environment,
          CCB_TEST_INSTALL_DIR: resolve(installDir),
          CCB_TEST_CONFIG_DIR: resolve(configDir),
          CCB_INSTALL_DIR: resolve(installDir),
          CCB_WANDING_CONFIG_DIR: resolve(configDir),
          CCB_TEST_PROFILE: profile,
          CCB_TEST_PROMPT: String(prompt),
          CCB_TEST_EVENT_LOG: session.eventLogPath,
          CCB_TEST_TIMEOUT_MS: String(timeoutMs),
          CCB_TEST_EXPECT_TOOL: '',
          CCB_TEST_DUMP_UPDATES: '0',
          CCB_TEST_ROUTE_ENTRY: routeEntry ? '1' : '',
          ...(routePath ? { CCB_TEST_ROUTE_PATH: resolve(routePath) } : {}),
        },
      })
    },

    async collectUpdates(session) {
      if (!existsSync(session.eventLogPath)) {
        throw childError(`ACP event log was not created: ${session.eventLogPath}`, {
          code: 'EVENT_LOG_MISSING',
        })
      }
      return readFileSync(session.eventLogPath, 'utf8')
        .split(/\r?\n/u)
        .filter((line) => line.trim())
        .map((line, index) => {
          try {
            return JSON.parse(line)
          } catch (error) {
            throw childError(`Invalid ACP event JSON at line ${index + 1}`, {
              code: 'EVENT_LOG_INVALID',
              cause: error,
            })
          }
        })
    },

    async snapshotState() {
      return {
        supported: false,
        reason: 'CCB ACP adapter exposes tool evidence but no state snapshot provider',
      }
    },

    async cleanup(session) {
      const target = resolve(session.directory)
      const pathFromRoot = relative(absoluteTempRoot, target)
      const unsafe = !pathFromRoot || pathFromRoot.startsWith('..') || isAbsolute(pathFromRoot) || !basename(target).startsWith('ccb-acp-')
      if (unsafe) throw new Error(`Refusing to clean unsafe ACP session path: ${target}`)
      rmSync(target, { recursive: true, force: true })
    },
  }
}
