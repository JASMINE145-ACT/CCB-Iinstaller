/**
 * ACP session-level MCP health: verify each specialist profile gets expected MCP servers.
 *
 * Usage:
 *   node ccb-installer/test-mcp-session-health.mjs
 *   node ccb-installer/test-mcp-session-health.mjs --profile word-creator
 */
import { spawn } from 'node:child_process'
import { Readable, Writable } from 'node:stream'
import { existsSync, readFileSync, writeFileSync, unlinkSync } from 'node:fs'
import { join } from 'node:path'
import os from 'node:os'
import { fileURLToPath } from 'node:url'
import {
  ClientSideConnection,
  ndJsonStream,
  PROTOCOL_VERSION,
} from '@agentclientprotocol/sdk'
import { loadMcpHealthManifest } from './lib/mcp-health-manifest.mjs'

const install =
  process.env.CCB_INSTALL_DIR ||
  (existsSync('D:\\CCB-Wanding') ? 'D:\\CCB-Wanding' : null)
if (!install) {
  console.error('[session-health] FAIL: CCB_INSTALL_DIR not set and D:\\CCB-Wanding missing')
  process.exit(2)
}

const configDir =
  process.env.CLAUDE_CONFIG_DIR ||
  join(os.homedir(), 'AppData', 'Local', 'CCB-Wanding', '.claude')
const settingsPath = join(configDir, 'settings.json')
if (!existsSync(settingsPath)) {
  console.error(`[session-health] FAIL: settings.json missing: ${settingsPath}`)
  process.exit(2)
}

const settings = JSON.parse(readFileSync(settingsPath, 'utf8').replace(/^\uFEFF/, ''))
const manifest = loadMcpHealthManifest()
const routeEntrypoint = fileURLToPath(
  new URL('./patches/aionui-ccb-route-b/index.js', import.meta.url),
)

const profileArg = process.argv.find((a) => a.startsWith('--profile='))?.split('=')[1]
const onlyProfile = profileArg || process.env.CCB_MCP_HEALTH_PROFILE || ''

const profilesToTest = onlyProfile
  ? [onlyProfile]
  : [
      ...Object.keys(manifest.agent_profiles).filter(
        (id) => manifest.agent_profiles[id].required_mcp?.length > 0,
      ),
      'wande-orchestrator',
    ]

const bun = existsSync(join(install, 'vendor', 'bun', 'bun.exe'))
  ? join(install, 'vendor', 'bun', 'bun.exe')
  : 'bun'

const vendorPath = [
  join(install, 'vendor', 'bun'),
  join(install, 'vendor', 'ripgrep'),
  join(install, 'vendor', 'git', 'bin'),
].join(';')

const handoffPath = join(configDir, '.aionui-next-assistant-profile.json')
const SESSION_TIMEOUT_MS = Number(process.env.CCB_MCP_SESSION_TIMEOUT_MS || 60000)

/** @type {Array<{ profile: string, ok: boolean, expected: string[], actual: string[], logs: string[], error?: string }>} */
const results = []

function stageProfile(profileId) {
  writeFileSync(
    handoffPath,
    JSON.stringify({
      profile_id: profileId,
      staged_at: new Date().toISOString(),
    }),
    'utf8',
  )
}

function clearHandoff() {
  try {
    unlinkSync(handoffPath)
  } catch {
    /* ignore */
  }
}

function parseMcpServersFromStderr(stderrText) {
  const match = stderrText.match(/\[ACP\] session mcp servers: ([^\n]+)/)
  if (!match) return []
  let raw = match[1].trim()
  if (!raw || raw === '(none)') return []
  const profileIdx = raw.indexOf(' profile=')
  if (profileIdx >= 0) {
    raw = raw.slice(0, profileIdx).trim()
  }
  if (!raw || raw === '(none)') return []
  return raw.split(',').map((s) => s.trim()).filter(Boolean)
}

function parseProfileApplied(stderrText) {
  return (
    /\[ACP\] session profile id from handoff:/.test(stderrText) ||
    /\[ACP\] agent session profile applied:/.test(stderrText) ||
    /\[ACP\] legacy assistant session profile applied:/.test(stderrText)
  )
}

async function probeProfile(profileId) {
  const spec = manifest.agent_profiles[profileId]
  if (!spec) {
    return {
      profile: profileId,
      ok: false,
      expected: [],
      actual: [],
      logs: [],
      error: 'unknown profile in manifest',
    }
  }

  const agentMd = join(configDir, 'agents', `${profileId}.md`)
  if (!existsSync(agentMd)) {
    return {
      profile: profileId,
      ok: false,
      expected: spec.required_mcp ?? [],
      actual: [],
      logs: [],
      error: `agent file missing: ${agentMd}`,
    }
  }

  stageProfile(profileId)
  let stderrBuf = ''

  const useRoute = process.env.CCB_TEST_ROUTE_ENTRY === '1'
  const agent = spawn(
    useRoute ? process.execPath : bun,
    useRoute
      ? [routeEntrypoint]
      : [join(install, 'dist', 'cli.js'), '--acp'],
    {
      cwd: install,
      env: {
        ...process.env,
        CLAUDE_CONFIG_DIR: configDir,
        ANTHROPIC_BASE_URL: settings.env?.ANTHROPIC_BASE_URL,
        ANTHROPIC_AUTH_TOKEN: settings.env?.ANTHROPIC_AUTH_TOKEN,
        ANTHROPIC_API_KEY: settings.env?.ANTHROPIC_AUTH_TOKEN,
        ANTHROPIC_DEFAULT_SONNET_MODEL: 'minimax-m3',
        CLAUDE_CODE_ENABLE_TELEMETRY: '0',
        CLAUDE_CODE_DISABLE_FAST_MODE: '1',
        NODE_TLS_REJECT_UNAUTHORIZED: '0',
        ENABLE_AUTOUPDATE_PLUGINS: '0',
        ENABLE_SEARCH_EXTRA_TOOLS: '0',
        CCB_WANDING_SKIP_GROVE: '1',
        PATH: `${vendorPath};${process.env.PATH ?? ''}`,
      },
      stdio: ['pipe', 'pipe', 'pipe'],
    },
  )

  agent.stderr.on('data', (d) => {
    stderrBuf += String(d)
  })

  const input = Writable.toWeb(agent.stdin)
  const output = Readable.toWeb(agent.stdout)
  const stream = ndJsonStream(input, output)

  class MockClient {
    async sessionUpdate() {}
    async requestPermission(params) {
      return {
        outcome: {
          outcome: 'selected',
          optionId: params.options?.[0]?.optionId || 'allow',
        },
      }
    }
  }

  const conn = new ClientSideConnection(() => new MockClient(), stream)
  const expected = [...(spec.required_mcp ?? [])]

  try {
    await Promise.race([
      (async () => {
        await conn.initialize({
          protocolVersion: PROTOCOL_VERSION,
          clientCapabilities: { auth: {}, fs: {}, terminal: false },
        })
        await conn.newSession({ cwd: install, mcpServers: [] })
      })(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('session/new timeout')), SESSION_TIMEOUT_MS),
      ),
    ])

    const actual = parseMcpServersFromStderr(stderrBuf)
    const profileApplied = parseProfileApplied(stderrBuf)
    const profileNotFound = stderrBuf.includes(
      `session profile '${profileId}' not found`,
    )

    const forbidden = [...(spec.forbidden_mcp ?? [])]
    const forbiddenPresent = forbidden.filter((m) => actual.includes(m))
    const missing = expected.filter((m) => !actual.includes(m))

    const ok =
      forbiddenPresent.length === 0 &&
      missing.length === 0 &&
      profileApplied &&
      !profileNotFound &&
      (expected.length > 0 || forbidden.length > 0)

    return {
      profile: profileId,
      ok,
      expected,
      actual,
      logs: stderrBuf
        .split('\n')
        .filter((l) => /\[ACP\]/.test(l))
        .slice(-12),
      error: ok
        ? undefined
        : [
            forbiddenPresent.length
              ? `forbidden mcp present: ${forbiddenPresent.join(', ')}`
              : null,
            missing.length ? `missing mcp: ${missing.join(', ')}` : null,
            !profileApplied ? 'profile handoff not applied' : null,
            profileNotFound ? 'profile not found in agents dir' : null,
          ]
            .filter(Boolean)
            .join('; '),
    }
  } catch (err) {
    return {
      profile: profileId,
      ok: false,
      expected,
      actual: parseMcpServersFromStderr(stderrBuf),
      logs: stderrBuf
        .split('\n')
        .filter((l) => /\[ACP\]/.test(l))
        .slice(-12),
      error: err instanceof Error ? err.message : String(err),
    }
  } finally {
    agent.kill('SIGTERM')
    clearHandoff()
  }
}

console.log(`[session-health] install=${install}`)
console.log(`[session-health] config=${configDir}`)
console.log(`[session-health] profiles=${profilesToTest.join(', ')}`)

for (const profileId of profilesToTest) {
  const result = await probeProfile(profileId)
  results.push(result)
  const status = result.ok ? 'PASS' : 'FAIL'
  console.log(
    `[session-health] ${status} ${profileId} expected=[${result.expected.join(',')}] actual=[${result.actual.join(',')}]`,
  )
  if (!result.ok) {
    console.log(`  error: ${result.error}`)
    for (const line of result.logs) console.log(`  ${line}`)
  }
}

const failed = results.filter((r) => !r.ok)
if (failed.length > 0) {
  console.error(`[session-health] FAIL ${failed.length}/${results.length} profiles`)
  process.exit(1)
}

console.log(`[session-health] PASS ${results.length}/${results.length} profiles`)
process.exit(0)
