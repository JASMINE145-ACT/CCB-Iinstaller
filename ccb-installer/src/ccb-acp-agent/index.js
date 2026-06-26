import { Readable, Writable } from 'node:stream'
import { AgentSideConnection, ndJsonStream } from '@agentclientprotocol/sdk'
import { createRuntime } from '../ccb-runtime/index.js'
import { createCcbAcpAgent } from './agent.js'

/**
 * Start CCB-Wanding ACP agent on stdio (Agent Client Protocol).
 */
export async function runCcbAcpAgent() {
  const enableMcp = process.env.CCB_ACP_ENABLE_MCP !== '0'
  const runtime = await createRuntime({ enableMcp })

  const input = Writable.toWeb(process.stdout)
  const output = Readable.toWeb(process.stdin)
  const stream = ndJsonStream(input, output)

  /** @type {ReturnType<typeof createCcbAcpAgent> | undefined} */
  let agent

  new AgentSideConnection(conn => {
    agent = createCcbAcpAgent(conn, runtime)
    return agent
  }, stream)

  const shutdown = async () => {
    try {
      await agent?.dispose?.()
    } catch {
      /* ignore */
    }
    process.exit(0)
  }

  process.on('SIGINT', shutdown)
  process.on('SIGTERM', shutdown)

  await new Promise(() => {})
}

export { createCcbAcpAgent } from './agent.js'

export {}
