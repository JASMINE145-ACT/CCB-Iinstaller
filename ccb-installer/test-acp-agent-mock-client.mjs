/**
 * B-06: ACP mock client — spawn cli.js --ccb-acp, no AionUI
 */
import { spawn } from 'node:child_process'
import { Readable, Writable } from 'node:stream'
import { existsSync } from 'node:fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import {
  ClientSideConnection,
  ndJsonStream,
  PROTOCOL_VERSION,
} from '@agentclientprotocol/sdk'
import { loadSmokeEnv } from './lib/load-smoke-env.mjs'

const ROOT = dirname(fileURLToPath(import.meta.url))
loadSmokeEnv(ROOT)

const token = process.env.ANTHROPIC_AUTH_TOKEN || ''
if (token.length < 20) {
  console.error('[env] FAIL: ANTHROPIC_AUTH_TOKEN missing')
  process.exit(2)
}

function resolveBun(root) {
  for (const p of [
    join(root, 'vendor', 'bun', 'bun.exe'),
    join(root, 'resources', 'bun', 'bun.exe'),
  ]) {
    if (existsSync(p)) return p
  }
  return 'bun'
}

class MockClient {
  /** @type {string[]} */
  updates = []

  async sessionUpdate(params) {
    this.updates.push(params.update?.sessionUpdate || 'unknown')
  }

  async requestPermission(params) {
    return {
      outcome: {
        outcome: 'selected',
        optionId: params.options?.[0]?.optionId || 'allow',
      },
    }
  }
}

const bun = resolveBun(ROOT)
const agent = spawn(bun, ['dist/cli.js', '--ccb-acp'], {
  cwd: ROOT,
  env: {
    ...process.env,
    CCB_ACP_ENABLE_MCP: '0',
  },
  stdio: ['pipe', 'pipe', 'pipe'],
})

const input = Writable.toWeb(agent.stdin)
const output = Readable.toWeb(agent.stdout)
const stream = ndJsonStream(input, output)
const mock = new MockClient()
const conn = new ClientSideConnection(() => mock, stream)

try {
  const init = await conn.initialize({
    protocolVersion: PROTOCOL_VERSION,
    clientCapabilities: {
      auth: { _meta: { gateway: true } },
    },
  })

  if (init.protocolVersion !== 1) {
    throw new Error(`bad protocolVersion: ${init.protocolVersion}`)
  }
  if (!init.agentInfo?.name) {
    throw new Error('missing agentInfo.name')
  }

  const session = await conn.newSession({
    cwd: ROOT,
    mcpServers: [],
  })
  if (!session.sessionId) {
    throw new Error('missing sessionId')
  }

  const result = await conn.prompt({
    sessionId: session.sessionId,
    prompt: [{ type: 'text', text: 'Reply with exactly: HELLO' }],
  })

  const chunks = mock.updates.filter(u => u === 'agent_message_chunk').length
  if (result.stopReason !== 'end_turn') {
    throw new Error(`stopReason=${result.stopReason}`)
  }
  if (chunks < 1) {
    throw new Error(`expected agent_message_chunk, got ${mock.updates.join(',')}`)
  }

  console.log(`[smoke] PASS stop=${result.stopReason} chunks=${chunks} agent=${init.agentInfo.name}`)
  agent.kill()
  process.exit(0)
} catch (e) {
  console.error('[smoke] FAIL', e?.message || e)
  agent.kill()
  process.exit(1)
}
