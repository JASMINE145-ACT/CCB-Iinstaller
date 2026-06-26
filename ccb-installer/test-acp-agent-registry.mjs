/**
 * B-06b: registry / patch index spawn path — mock ACP client, no AionUI UI
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

async function runMockAgainstAgent(spawnArgs, label) {
  const agent = spawn(spawnArgs[0], spawnArgs.slice(1), {
    cwd: ROOT,
    env: {
      ...process.env,
      CCB_INSTALL_DIR: ROOT,
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
      clientCapabilities: {},
    })

    const session = await conn.newSession({ cwd: ROOT, mcpServers: [] })
    const result = await conn.prompt({
      sessionId: session.sessionId,
      prompt: [{ type: 'text', text: 'Reply HELLO only' }],
    })

    const chunks = mock.updates.filter(u => u === 'agent_message_chunk').length
    if (result.stopReason !== 'end_turn' || chunks < 1) {
      throw new Error(
        `${label}: stop=${result.stopReason} chunks=${chunks} updates=${mock.updates.join(',')}`,
      )
    }

    console.log(`[smoke] PASS ${label} stop=${result.stopReason} chunks=${chunks}`)
    agent.kill()
    return true
  } catch (e) {
    agent.kill()
    throw e
  }
}

const bun = resolveBun(ROOT)

try {
  await runMockAgainstAgent(
    [bun, 'dist/cli.js', '--ccb-acp'],
    'direct --ccb-acp',
  )

  await runMockAgainstAgent(
    [bun, 'patches/aionui-ccb-route-b/index.js'],
    'registry patch index.js',
  )

  console.log('[smoke] PASS registry paths (direct + patch)')
  process.exit(0)
} catch (e) {
  console.error('[smoke] FAIL', e?.message || e)
  process.exit(1)
}
