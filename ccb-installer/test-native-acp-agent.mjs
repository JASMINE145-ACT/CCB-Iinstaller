/**
 * Smoke test for the original CCB-Wanding ACP entrypoint:
 *   D:\CCB-Wanding\dist\cli.js --acp
 *
 * This deliberately does not use the Route B2 shim.
 */
import { spawn } from 'node:child_process'
import { Readable, Writable } from 'node:stream'
import { existsSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import os from 'node:os'
import { fileURLToPath } from 'node:url'
import {
  ClientSideConnection,
  ndJsonStream,
  PROTOCOL_VERSION,
} from '@agentclientprotocol/sdk'
import { createAcpUpdateRecorder } from './lib/acp-update-recorder.mjs'

const install =
  process.env.CCB_TEST_INSTALL_DIR ||
  (existsSync('D:\\CCB-Wanding') ? 'D:\\CCB-Wanding' : join(os.homedir(), 'AppData', 'Local', 'Programs', 'CCB-Wanding'))
const configDir =
  process.env.CCB_TEST_CONFIG_DIR ||
  join(os.homedir(), 'AppData', 'Local', 'CCB-Wanding', '.claude')
const testProfile =
  process.env.CCB_TEST_PROFILE ||
  process.env.CCB_TEST_AGENT_ID ||
  ''

if (!existsSync(install)) {
  console.error(`[native-acp] install dir not found: ${install}`)
  console.error('[native-acp] set CCB_TEST_INSTALL_DIR to your CCB-Wanding root')
  process.exit(1)
}
if (!existsSync(join(configDir, 'settings.json'))) {
  console.error(`[native-acp] settings.json not found under ${configDir}`)
  console.error('[native-acp] set CCB_TEST_CONFIG_DIR or run bootstrap first')
  process.exit(1)
}

const settings = JSON.parse(readFileSync(join(configDir, 'settings.json'), 'utf8').replace(/^\uFEFF/, ''))
const handoffPath = join(configDir, '.aionui-next-assistant-profile.json')
const handoffMarker = process.env.CCB_TEST_HANDOFF_MARKER || ''
const eventRecorder = process.env.CCB_TEST_EVENT_LOG
  ? createAcpUpdateRecorder({ filePath: process.env.CCB_TEST_EVENT_LOG })
  : null

if (testProfile) {
  writeFileSync(
    handoffPath,
    JSON.stringify({
      profile_id: testProfile,
      staged_at: new Date().toISOString(),
      ...(handoffMarker ? { eval_marker: handoffMarker } : {}),
    }),
    'utf8',
  )
}

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
  completedTools = []
  /** @type {{ promptAt?: number, t_dispatch?: number, t_agent_first?: number, t_business?: number, t_end?: number, dispatchTool?: string, agentFirstTool?: string, businessTool?: string }} */
  timing = {}

  markPromptStart() {
    this.timing.promptAt = Date.now()
  }

  noteTool(name, kind) {
    const at = Date.now()
    const elapsed = this.timing.promptAt ? at - this.timing.promptAt : undefined
    if (kind === 'dispatch' && this.timing.t_dispatch == null && elapsed != null) {
      this.timing.t_dispatch = elapsed
      this.timing.dispatchTool = name
    }
    if (kind === 'agent_first' && this.timing.t_agent_first == null && elapsed != null) {
      this.timing.t_agent_first = elapsed
      this.timing.agentFirstTool = name
    }
    if (kind === 'business' && this.timing.t_business == null && elapsed != null) {
      this.timing.t_business = elapsed
      this.timing.businessTool = name
    }
  }

  async sessionUpdate(params) {
    eventRecorder?.record(params.update)
    const update = params.update?.sessionUpdate || 'unknown'
    this.updates.push(update)
    const toolName = params.update?._meta?.claudeCode?.toolName
    const parentId = params.update?._meta?.claudeCode?.parentToolUseId
    if (update === 'tool_call' && typeof toolName === 'string') {
      if (toolName === 'Agent') this.noteTool(toolName, 'dispatch')
      if (typeof parentId === 'string' && parentId && toolName.startsWith('mcp__')) {
        this.noteTool(toolName, 'agent_first')
        this.noteTool(toolName, 'business')
      } else if (toolName.startsWith('mcp__') && this.timing.t_dispatch == null) {
        // Path B / specialist: first MCP is both dispatch and business
        this.noteTool(toolName, 'dispatch')
        this.noteTool(toolName, 'business')
      }
    }
    if (
      update === 'tool_call_update' &&
      params.update?.status === 'completed' &&
      toolName
    ) {
      this.completedTools.push(toolName)
      if (toolName.startsWith('mcp__') && this.timing.t_business == null) {
        this.noteTool(toolName, 'business')
      }
      if (
        typeof parentId === 'string' &&
        parentId &&
        toolName.startsWith('mcp__') &&
        this.timing.t_agent_first == null
      ) {
        this.noteTool(toolName, 'agent_first')
      }
    }
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
    } else if (content?.type === 'text' && typeof content.text === 'string') {
      this.text += content.text
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
    // Pin product install — route-b walkUp from repo patches/ prefers
    // monorepo ccb-installer (has dist/cli.js + vendor/bun) over D:\CCB-Wanding.
    CCB_WANDING_HOME: install,
    CCB_INSTALL_DIR: install,
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

const timeoutMs = Number(process.env.CCB_TEST_TIMEOUT_MS || 90000)
const timeout = setTimeout(() => {
  console.error('[native-acp] TIMEOUT updates=' + mock.updates.join(','))
  agent.kill('SIGTERM')
  process.exit(1)
}, timeoutMs)

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
  if (testProfile) console.log('[profile]', testProfile)

  function parsePrompts() {
    const raw = process.env.CCB_TEST_PROMPTS || ''
    if (raw.trim()) {
      const parsed = JSON.parse(raw)
      if (!Array.isArray(parsed) || !parsed.length) {
        throw new Error('CCB_TEST_PROMPTS must be a non-empty JSON string array')
      }
      return parsed.map((item) => String(item))
    }
    return [process.env.CCB_TEST_PROMPT || 'Reply exactly: OK']
  }

  const prompts = parsePrompts()
  let result = null
  for (let turn = 0; turn < prompts.length; turn++) {
    console.log(`[prompt ${turn + 1}/${prompts.length}]`, prompts[turn].slice(0, 120))
    mock.markPromptStart()
    result = await conn.prompt({
      sessionId: session.sessionId,
      prompt: [{ type: 'text', text: prompts[turn] }],
    })
    console.log(`[result ${turn + 1}]`, JSON.stringify(result))
    if (result.stopReason !== 'end_turn') break
  }

  clearTimeout(timeout)
  if (mock.timing.promptAt) {
    mock.timing.t_end = Date.now() - mock.timing.promptAt
  }
  console.log('[result]', JSON.stringify(result))
  console.log('[updates]', mock.updates.join(','))
  console.log('[completed_tools]', mock.completedTools.join(','))
  console.log('[timing_ms]', JSON.stringify(mock.timing))
  console.log('[assistant_text]', mock.text)
  agent.kill('SIGTERM')

  const chunks = mock.updates.filter(u => u === 'agent_message_chunk').length
  const expectedTool = process.env.CCB_TEST_EXPECT_TOOL || ''
  const expectedAnyOf = (process.env.CCB_TEST_EXPECT_ANY_OF || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
  const expectedToolCompleted =
    (!expectedTool || mock.completedTools.includes(expectedTool)) &&
    (expectedAnyOf.length === 0 ||
      expectedAnyOf.some((name) => mock.completedTools.includes(name)))
  const expectSubstring = process.env.CCB_TEST_EXPECT_TOOL_SUBSTR || ''
  const expectedSubstrOk =
    !expectSubstring ||
    mock.completedTools.some((name) => name.includes(expectSubstring))
  const forbiddenText = process.env.CCB_TEST_FORBID_TEXT || ''
  const forbiddenTextAbsent =
    !forbiddenText || !mock.text.includes(forbiddenText)
  process.exit(
    result.stopReason === 'end_turn' &&
      chunks > 0 &&
      expectedToolCompleted &&
      expectedSubstrOk &&
      forbiddenTextAbsent
      ? 0
      : 1,
  )
} catch (e) {
  clearTimeout(timeout)
  console.error('[native-acp] FAIL', e?.stack || e)
  agent.kill('SIGTERM')
  process.exit(1)
} finally {
  eventRecorder?.close()
  if (testProfile) {
    try {
      if (!handoffMarker) {
        unlinkSync(handoffPath)
      } else {
        const handoff = JSON.parse(readFileSync(handoffPath, 'utf8').replace(/^\uFEFF/, ''))
        if (handoff.eval_marker === handoffMarker) unlinkSync(handoffPath)
      }
    } catch {
      // The backend normally consumes the one-shot handoff during session/new.
    }
  }
}
