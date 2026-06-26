/** @typedef {import('bun').ServerWebSocket<{ url: string, sessionId?: string, pingTimer?: ReturnType<typeof setInterval>, lastPongAt?: number }>} WsSocket */

const PING_INTERVAL_MS = 30000
const PONG_TIMEOUT_MS = 60000

/**
 * @param {WsSocket} ws
 * @param {import('./ws.js').WsDeps} deps
 */
export function handleWsOpen(ws, deps) {
  const url = new URL(ws.data.url)
  const sessionId = url.searchParams.get('sessionId')
  if (!sessionId) {
    ws.close(1008, 'sessionId required')
    return
  }
  if (!deps.sessionManager.get(sessionId)) {
    ws.close(1008, 'unknown session')
    return
  }

  ws.data.sessionId = sessionId
  ws.data.lastPongAt = Date.now()
  deps.sessionManager.subscribe(sessionId, ws)

  ws.send(JSON.stringify({ type: 'subscribed', sessionId }))

  ws.data.pingTimer = setInterval(() => {
    if (Date.now() - (ws.data.lastPongAt ?? 0) >= PONG_TIMEOUT_MS) {
      if (ws.data.pingTimer) clearInterval(ws.data.pingTimer)
      try {
        ws.close(1000, 'pong timeout')
      } catch {
        /* ignore */
      }
      return
    }
    try {
      ws.send(JSON.stringify({ type: 'ping' }))
    } catch {
      /* ignore */
    }
  }, PING_INTERVAL_MS)
}

/**
 * @param {WsSocket} ws
 * @param {string | Buffer} raw
 * @param {import('./ws.js').WsDeps} deps
 */
export function handleWsMessage(ws, raw, deps) {
  let msg
  try {
    msg = JSON.parse(String(raw))
  } catch {
    return
  }

  if (msg.type === 'pong') {
    ws.data.lastPongAt = Date.now()
    return
  }

  if (msg.type === 'unsubscribe' && msg.sessionId) {
    deps.sessionManager.unsubscribe(msg.sessionId, ws)
    return
  }

  if (msg.type === 'subscribe' && msg.sessionId) {
    if (!deps.sessionManager.get(msg.sessionId)) return
    ws.data.sessionId = msg.sessionId
    ws.data.lastPongAt = Date.now()
    deps.sessionManager.subscribe(msg.sessionId, ws)
    ws.send(JSON.stringify({ type: 'subscribed', sessionId: msg.sessionId }))
  }
}

/**
 * @param {WsSocket} ws
 * @param {import('./ws.js').WsDeps} deps
 */
export function handleWsClose(ws, deps) {
  if (ws.data.pingTimer) clearInterval(ws.data.pingTimer)
  if (ws.data.sessionId) {
    deps.sessionManager.unsubscribe(ws.data.sessionId, ws)
  }
}

/** @typedef {{ sessionManager: import('./SessionManager.js').SessionManager }} WsDeps */

export {}
