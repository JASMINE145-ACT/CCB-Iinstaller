import { existsSync } from 'fs'
import { join } from 'path'
import { networkInterfaces } from 'os'
import { createRuntime } from '../ccb-runtime/index.js'
import {
  CCB_STAGE,
  CORS,
  INSTALLER_DIR,
  MODEL,
  STATIC_DIR,
} from './config.js'
import { createConversationStore, idleRuntime } from './store.js'
import { createEventEmitter } from './aionui-events.js'
import { processTurn, runtimeOptions } from './turn-processor.js'
import { handleHTTP } from './http.js'
import { serveStatic } from './static.js'

/** @type {Set<object>} */
const wsClients = new Set()

function broadcastLegacy(payload) {
  const data = JSON.stringify(payload)
  for (const ws of wsClients) {
    try {
      ws.send(data)
    } catch {
      /* ignore */
    }
  }
}

function broadcastAionUI(name, data) {
  const payload = JSON.stringify({ name, data })
  for (const ws of wsClients) {
    try {
      ws.send(payload)
    } catch {
      /* ignore */
    }
  }
}

const events = createEventEmitter(broadcastLegacy, broadcastAionUI)

export async function serveMain(args) {
  const port = Number(args.find(a => a.startsWith('--port='))?.split('=')[1] ?? 3000)
  const host = args.find(a => a.startsWith('--host='))?.split('=')[1] ?? '0.0.0.0'

  const store = createConversationStore()
  const runtime = await createRuntime(runtimeOptions())

  const stageLabel =
    CCB_STAGE === 'fake'
      ? 'fake — no MiniMax, no MCP'
      : CCB_STAGE === 'minimax'
        ? 'minimax — MiniMax enabled, MCP disabled'
        : 'agent — MiniMax + MCP enabled'

  console.log(`[stage] ${stageLabel}`)

  function emitTurnCompleted(convId) {
    events.turnCompleted(convId, idleRuntime())
  }

  async function runTurn(convId, userText) {
    await processTurn({ runtime, store, events }, convId, userText)
  }

  const httpCtx = {
    store,
    runtime,
    processTurn: runTurn,
    emitTurnCompleted,
  }

  Bun.serve({
    port,
    hostname: host,
    idleTimeout: 120,

    fetch(req, server) {
      const url = new URL(req.url)
      if (req.method === 'OPTIONS') {
        return new Response(null, { status: 204, headers: CORS })
      }

      if (url.pathname === '/ws') {
        if (server.upgrade(req, { data: {} })) return undefined
        return new Response('WS upgrade failed', { status: 400 })
      }

      if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/debug/')) {
        return handleHTTP(req, url, httpCtx)
      }

      return serveStatic(url.pathname)
    },

    websocket: {
      open(ws) {
        wsClients.add(ws)
      },

      message(ws, raw) {
        let msg
        try {
          msg = JSON.parse(String(raw))
        } catch {
          return
        }

        if (msg.type === 'ping') {
          ws.send(JSON.stringify({ type: 'pong' }))
          return
        }

        if (msg.type === 'chat') {
          const conv = store.get(msg.sessionId)
          if (!conv) {
            broadcastLegacy({
              type: 'error',
              error: 'session not found',
              sessionId: msg.sessionId,
            })
            return
          }
          if (conv.runtime?.is_processing) {
            broadcastLegacy({
              type: 'error',
              error: 'session busy',
              sessionId: msg.sessionId,
            })
            return
          }

          runTurn(msg.sessionId, msg.message).catch(e =>
            console.error('[chat]', e?.message || e),
          )
        }

        if (msg.type === 'interrupt') {
          runtime.abort(msg.sessionId)
          const conv = store.get(msg.sessionId)
          if (conv) {
            conv.runtime = idleRuntime()
            store.touch(conv)
            emitTurnCompleted(msg.sessionId)
          }
        }
      },

      close(ws) {
        wsClients.delete(ws)
      },
    },
  })

  const uiOk = existsSync(join(STATIC_DIR, 'index.html'))
  console.log(`\n  CCB-Wanding Web`)
  console.log(`  ─────────────────────────────────────────`)
  console.log(`  Local  : http://localhost:${port}`)
  console.log(`  Network: http://${getLocalIP()}:${port}`)
  console.log(`  Model  : ${MODEL}`)
  console.log(`  Stage  : ${CCB_STAGE}`)
  console.log(`  UI     : ${uiOk ? STATIC_DIR : 'MISSING — run: ccb-wanding-web build'}`)
  console.log(`  ─────────────────────────────────────────`)
  console.log(`  Press Ctrl+C to stop\n`)

  await new Promise(() => {})
}

function getLocalIP() {
  try {
    for (const iface of Object.values(networkInterfaces()).flat()) {
      if (iface?.family === 'IPv4' && !iface.internal) return iface.address
    }
  } catch {
    /* ignore */
  }
  return '0.0.0.0'
}

export {}
