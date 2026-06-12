/**
 * Smoke test for the original CCB-Wanding ACP entrypoint:
 *   D:\CCB-Wanding\dist\cli.js --acp
 *
 * This deliberately does not use the Route B2 shim.
 */
import { spawn } from 'node:child_process'
import { Readable, Writable } from 'node:stream'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import os from 'node:os'
import { fileURLToPath } from 'node:url'
import {
  ClientSideConnection,
  ndJsonStream,
  PROTOCOL_VERSION,
} from '@agentclientprotocol/sdk'

const install = 'D:\\CCB-Wanding'
const configDir = join(os.homedir(), 'AppData', 'Local', 'CCB-Wanding', '.claude')
const settings = JSON.parse(readFileSync(join(configDir, 'settings.json'), 'utf8').replace(/^\uFEFF/, ''))

const bun = existsSync(join(install, 'vendor', 'bun', 'bun.exe'))
  ? join(install, 'vendor', 'bun', 'bun.exe')
  : 'bun'
const routeEntrypoint = fileURLToPath(new URL('./patches/aionui-ccb-route-b/index.js', import.meta.url))
const selectedRouteEntrypoint = process.env.CCB_TEST_ROUTE_PATH || routeEntrypoint

const vendorPath = [
  join(install, 'vendor', 'bun'),
  join(install, 'vendor', 'ripgrep'),
  join(install, 'vendor', 'git', 'bin'),
].join(';')

class MockClient {
  updates = []
  text = ''

  async sessionUpdate(params) {
    const update = params.update?.sessionUpdate || 'unknown'
    this.updates.push(update)
    console.log('[update]', update)
    if (process.env.CCB_TEST_DUMP_UPDATES === '1') {
      if (/agent_message_chunk|tool_call|tool_call_update/.test(update)) {
        console.log('[update_json]', JSON.stringify(params.update).slice(0, 2000))
      }
    } else if (process.env.CCB_TEST_DUMP_UPDATES === 'all') {
      console.log('[update_json]', JSON.stringify(params.update).slice(0, 3000))
    }
    const content = params.update?.content
    if (Array.isArray(content)) {
      for (const item of content) {
        if (item?.type === 'text' && typeof item.text === 'string') this.text += item.text
      }
    }
  }

  async requestPermission(params) {
    console.log('[permission]', params.toolCall?.title || params.toolCall?.toolCallId || 'unknown')
    return {
      outcome: {
        outcome: 'selected',
        optionId: params.options?.[0]?.optionId || 'allow',
      },
    }
  }
}

const useRoute = process.env.CCB_TEST_ROUTE_ENTRY === '1'
const agent = spawn(
  useRoute ? process.execPath : bun,
  useRoute ? [selectedRouteEntrypoint] : [join(install, 'dist', 'cli.js'), '--acp'],
  {
  cwd: install,
  env: {
    ...process.env,
    CLAUDE_CONFIG_DIR: configDir,
    ANTHROPIC_BASE_URL: settings.env.ANTHROPIC_BASE_URL,
    ANTHROPIC_AUTH_TOKEN: settings.env.ANTHROPIC_AUTH_TOKEN,
    ANTHROPIC_API_KEY: settings.env.ANTHROPIC_AUTH_TOKEN,
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

agent.stderr.on('data', d => {
  const text = String(d)
  if (text.trim()) console.error('[agent stderr]', text.slice(-1000))
})

const input = Writable.toWeb(agent.stdin)
const output = Readable.toWeb(agent.stdout)
const stream = ndJsonStream(input, output)
const mock = new MockClient()
const conn = new ClientSideConnection(() => mock, stream)

const timeout = setTimeout(() => {
  console.error('[native-acp] TIMEOUT updates=' + mock.updates.join(','))
  agent.kill('SIGTERM')
  process.exit(1)
}, 90000)

try {
  const init = await conn.initialize({
    protocolVersion: PROTOCOL_VERSION,
    clientCapabilities: {
      auth: {},
      fs: {},
      terminal: false,
    },
  })
  console.log('[init]', init.agentInfo?.name, init.protocolVersion)

  const session = await conn.newSession({
    cwd: install,
    mcpServers: [],
    ...(process.env.CCB_TEST_BYPASS === '1' ? { _meta: { permissionMode: 'bypassPermissions' } } : {}),
  })
  console.log('[session]', session.sessionId, session.models?.currentModelId)

  const result = await conn.prompt({
    sessionId: session.sessionId,
    prompt: [{ type: 'text', text: process.env.CCB_TEST_PROMPT || 'Reply exactly: OK' }],
  })

  clearTimeout(timeout)
  console.log('[result]', JSON.stringify(result))
  console.log('[updates]', mock.updates.join(','))
  console.log('[assistant_text]', mock.text)
  agent.kill('SIGTERM')

  const chunks = mock.updates.filter(u => u === 'agent_message_chunk').length
  process.exit(result.stopReason === 'end_turn' && chunks > 0 ? 0 : 1)
} catch (e) {
  clearTimeout(timeout)
  console.error('[native-acp] FAIL', e?.stack || e)
  agent.kill('SIGTERM')
  process.exit(1)
}
