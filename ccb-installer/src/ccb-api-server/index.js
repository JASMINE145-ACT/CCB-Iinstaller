import { createRuntime } from '../ccb-runtime/index.js'
import { createSessionManager } from './SessionManager.js'
import { createHealth } from './health.js'
import { handleHttp } from './http.js'
import { handleWsOpen, handleWsMessage, handleWsClose } from './ws.js'

/**
 * @param {StartServerOptions} options
 * @returns {Promise<RunningServer>}
 */
export async function startCcbApiServer(options) {
  const port = Number(options.port)
  if (!Number.isFinite(port) || port <= 0) {
    throw new Error(`invalid port: ${options.port}`)
  }

  const host = options.host || '127.0.0.1'
  const log = options.log || (line => console.error(line))

  const ownsRuntime = !options.runtime
  const runtime =
    options.runtime ||
    (await createRuntime({ enableMcp: options.enableMcp !== false }))

  const sessionManager = createSessionManager()
  const health = createHealth({ sessionManager })

  const httpDeps = {
    runtime,
    sessionManager,
    health,
    tools: async () => runtime.getAllTools(),
  }

  const wsDeps = { sessionManager }

  /** @type {import('bun').Server | null} */
  let server = null

  const closePromise = new Promise(resolve => {
    server = Bun.serve({
      hostname: host,
      port,
      idleTimeout: 120,

      fetch(req, bunServer) {
        const url = new URL(req.url)
        if (url.pathname === '/ws') {
          const upgraded = bunServer.upgrade(req, { data: { url: req.url } })
          if (upgraded) return undefined
          return new Response('WS upgrade failed', { status: 400 })
        }
        return handleHttp(req, httpDeps)
      },

      websocket: {
        open(ws) {
          handleWsOpen(ws, wsDeps)
        },
        message(ws, raw) {
          handleWsMessage(ws, raw, wsDeps)
        },
        close(ws) {
          handleWsClose(ws, wsDeps)
        },
      },
    })

    resolve(undefined)
  })

  await closePromise

  log(`[ccb-api] listening on http://${host}:${port}`)

  let closed = false

  async function shutdown() {
    if (closed) return
    closed = true
    try {
      server?.stop()
    } catch {
      /* ignore */
    }
    if (ownsRuntime) {
      await runtime.close()
    }
  }

  const onSignal = () => {
    shutdown().finally(() => process.exit(0))
  }
  process.on('SIGINT', onSignal)
  process.on('SIGTERM', onSignal)

  return {
    port,
    url: `http://${host}:${port}`,
    wsUrl: `ws://${host}:${port}/ws`,
    activeSessionCount: () => sessionManager.count(),
    close: shutdown,
  }
}

/** @typedef {{ port: number, host?: string, runtime?: import('../ccb-runtime/index.js').Runtime, enableMcp?: boolean, log?: (line: string) => void }} StartServerOptions */
/** @typedef {Awaited<ReturnType<typeof startCcbApiServer>>} RunningServer */

export { createHealth } from './health.js'
export { createSessionManager } from './SessionManager.js'
export { handleHttp } from './http.js'

export {}
