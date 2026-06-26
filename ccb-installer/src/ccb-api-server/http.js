import { createSessionRunner } from './Session.js'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

/**
 * @param {number} status
 * @param {unknown} body
 */
function jsonResponse(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS },
  })
}

/**
 * @param {Request} req
 */
async function readJson(req) {
  try {
    return await req.json()
  } catch {
    return {}
  }
}

/**
 * @param {Request} req
 * @param {import('./http.js').HttpDeps} deps
 */
export async function handleHttp(req, deps) {
  const url = new URL(req.url)
  const { pathname } = url
  const method = req.method

  if (method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS })
  }

  if (pathname === '/api/health' && method === 'GET') {
    return jsonResponse(200, deps.health())
  }

  if (pathname === '/api/tools' && method === 'GET') {
    const tools = await deps.tools()
    return jsonResponse(200, tools)
  }

  if (pathname === '/api/sessions' && method === 'GET') {
    return jsonResponse(200, deps.sessionManager.list())
  }

  if (pathname === '/api/sessions' && method === 'POST') {
    const session = deps.sessionManager.create()
    return jsonResponse(200, { sessionId: session.id, createdAt: session.createdAt })
  }

  const sessionMatch = pathname.match(/^\/api\/sessions\/([^/]+)$/)
  if (sessionMatch) {
    const sessionId = decodeURIComponent(sessionMatch[1])
    const session = deps.sessionManager.get(sessionId)

    if (method === 'GET') {
      if (!session) return jsonResponse(404, { error: 'not_found', path: pathname })
      return jsonResponse(200, {
        sessionId: session.id,
        createdAt: session.createdAt,
        lastActiveAt: session.lastActiveAt,
        messageCount: session.messages.length,
      })
    }

    if (method === 'DELETE') {
      if (!session) return jsonResponse(404, { error: 'not_found', path: pathname })
      // abort is best-effort; an in-flight POST /messages may still resolve (race)
      deps.runtime.abort(sessionId)
      deps.sessionManager.delete(sessionId)
      return new Response(null, { status: 204, headers: CORS })
    }
  }

  const messagesMatch = pathname.match(/^\/api\/sessions\/([^/]+)\/messages$/)
  if (messagesMatch && method === 'POST') {
    const sessionId = decodeURIComponent(messagesMatch[1])
    const session = deps.sessionManager.get(sessionId)
    if (!session) return jsonResponse(404, { error: 'not_found', path: pathname })

    const body = await readJson(req)
    const user = String(body.user || '').trim()
    if (!user) return jsonResponse(400, { error: 'missing_user' })

    const runner = createSessionRunner(sessionId, deps.runtime, deps.sessionManager)
    try {
      const result = await runner.runTurn({
        user,
        stream: body.stream === true,
      })
      return jsonResponse(200, result)
    } catch (err) {
      return jsonResponse(500, { error: err?.message || String(err) })
    }
  }

  const cancelMatch = pathname.match(/^\/api\/sessions\/([^/]+)\/cancel$/)
  if (cancelMatch && method === 'POST') {
    const sessionId = decodeURIComponent(cancelMatch[1])
    const session = deps.sessionManager.get(sessionId)
    if (!session) return jsonResponse(404, { error: 'not_found', path: pathname })
    const aborted = deps.runtime.abort(sessionId)
    return jsonResponse(200, { aborted })
  }

  return jsonResponse(404, { error: 'not_found', path: pathname })
}

/** @typedef {{ runtime: import('../ccb-runtime/index.js').Runtime, sessionManager: import('./SessionManager.js').SessionManager, health: () => object, tools: () => Promise<Array<{name: string, description?: string, input_schema?: object}>> }} HttpDeps */

export {}
