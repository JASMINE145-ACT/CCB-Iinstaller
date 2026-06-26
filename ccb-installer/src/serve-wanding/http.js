import {
  API_BASE,
  CCB_STAGE,
  CORS,
  MODEL,
  enableMcpForStage,
} from './config.js'
import { defaultModel, idleRuntime, activeRuntime } from './store.js'
import {
  agentsList,
  authUser,
  clientSettings,
  emptyArrayStub,
  emptyObjectStub,
  providersList,
} from './stubs.js'

/**
 * @param {unknown} data
 * @param {number} [status]
 */
function jsonOk(data, status = 200) {
  return Response.json(data, { status, headers: CORS })
}

function jsonData(data, status = 200) {
  return jsonOk({ data }, status)
}

function jsonErr(message, status = 404) {
  return jsonOk({ error: message }, status)
}

function convSummary(c) {
  const { messages, ...rest } = c
  return {
    ...rest,
    model: c.model || defaultModel(),
    runtime: c.runtime || idleRuntime(),
    messageCount: messages?.length ?? 0,
  }
}

function normalizeMessage(m) {
  const content = m.content
  if (typeof content === 'string') {
    return { ...m, content: { content, type: 'text' } }
  }
  if (content && typeof content.content !== 'string') {
    return { ...m, content: { content: String(content.content ?? ''), type: 'text' } }
  }
  return m
}

/**
 * @param {Request} req
 * @param {URL} url
 * @param {import('./http.js').HttpContext} ctx
 */
export async function handleHTTP(req, url, ctx) {
  const p = url.pathname
  const method = req.method

  if (p === '/api/auth/user' && method === 'GET') return jsonData(authUser())
  if (p === '/api/agents' && method === 'GET') return jsonOk(agentsList())
  if (p === '/api/providers' && method === 'GET') return jsonOk(providersList())
  if (p === '/api/settings/client' && method === 'GET') return jsonOk(clientSettings())

  const emptyListPaths = [
    '/api/mcp/servers',
    '/api/mcp/agent-configs',
    '/api/mcp/oauth/authenticated',
    '/api/extensions/acp-adapters',
    '/api/extensions',
    '/api/skills',
    '/api/skills/builtin-auto',
    '/api/remote-agents',
    '/api/channel/plugins',
    '/api/cron/jobs',
    '/api/assistants',
  ]
  if (emptyListPaths.includes(p) && method === 'GET') return jsonOk(emptyArrayStub())
  if (p === '/api/teams' && method === 'GET') return jsonOk(emptyArrayStub())

  if (p === '/api/conversations' && method === 'GET') {
    const items = ctx.store.list().map(convSummary)
    return jsonData({ items, total: items.length })
  }

  if (p === '/api/conversations' && method === 'POST') {
    const body = await req.json().catch(() => ({}))
    const conv = ctx.store.create({
      title: body.name || body.title || '新会话',
      type: body.type || 'aionrs',
      model: body.model || defaultModel(),
    })
    return jsonData(convSummary(conv))
  }

  const convMatch = p.match(/^\/api\/conversations\/([^/]+)$/)
  if (convMatch) {
    const id = decodeURIComponent(convMatch[1])
    const conv = ctx.store.get(id)
    if (!conv && method !== 'DELETE') return jsonErr('not found', 404)

    if (method === 'GET') {
      return jsonData({
        ...convSummary(conv),
        messages: conv.messages.map(normalizeMessage),
      })
    }
    if (method === 'PATCH') {
      const body = await req.json().catch(() => ({}))
      if (body.title) conv.title = body.title
      ctx.store.touch(conv)
      return jsonData(convSummary(conv))
    }
    if (method === 'DELETE') {
      ctx.runtime.abort(id)
      ctx.store.delete(id)
      return jsonData({})
    }
  }

  const msgMatch = p.match(/^\/api\/conversations\/([^/]+)\/messages$/)
  if (msgMatch) {
    const id = decodeURIComponent(msgMatch[1])
    const conv = ctx.store.get(id)
    if (!conv) return jsonErr('not found', 404)

    if (method === 'GET') {
      return jsonData({
        items: conv.messages.map(normalizeMessage),
        total: conv.messages.length,
      })
    }

    if (method === 'POST') {
      const body = await req.json().catch(() => ({}))
      const text = String(body.content || '').trim()
      if (!text) return jsonErr('missing content', 400)
      if (conv.runtime?.is_processing) return jsonErr('busy', 409)

      conv.runtime = { ...activeRuntime(), is_processing: true, can_send_message: false }
      ctx.store.touch(conv)

      ctx.processTurn(id, text).catch(e => console.error('[turn]', e?.message || e))

      return jsonData({
        runtime: conv.runtime,
        accepted: true,
      })
    }
  }

  const cancelMatch = p.match(/^\/api\/conversations\/([^/]+)\/cancel$/)
  if (cancelMatch && method === 'POST') {
    const id = decodeURIComponent(cancelMatch[1])
    const conv = ctx.store.get(id)
    if (!conv) return jsonErr('not found', 404)
    ctx.runtime.abort(id)
    conv.runtime = idleRuntime()
    ctx.store.touch(conv)
    ctx.emitTurnCompleted(id)
    return jsonData({ cancelled: true, runtime: idleRuntime() })
  }

  const modelMatch = p.match(/^\/api\/conversations\/([^/]+)\/model$/)
  if (modelMatch && (method === 'GET' || method === 'PATCH' || method === 'PUT' || method === 'POST')) {
    const id = decodeURIComponent(modelMatch[1])
    const conv = ctx.store.get(id)
    if (!conv) return jsonErr('not found', 404)
    if (method !== 'GET') {
      const body = await req.json().catch(() => ({}))
      if (body.use_model) conv.model = { ...defaultModel(), ...conv.model, use_model: body.use_model }
    }
    return jsonData({
      use_model: conv.model?.use_model || MODEL,
      model_info: {
        current_model_id: conv.model?.use_model || MODEL,
        available_models: [MODEL],
      },
    })
  }

  const emptyConvSub = p.match(
    /^\/api\/conversations\/([^/]+)\/(artifacts|confirmations|approvals|side-question)$/,
  )
  if (emptyConvSub && method === 'GET') return jsonOk([])

  // Legacy /api/sessions (Stage 2/3 smoke)
  if (p === '/api/sessions' && method === 'GET') {
    return jsonOk(ctx.store.list().map(convSummary))
  }
  if (p === '/api/sessions' && method === 'POST') {
    const body = await req.json().catch(() => ({}))
    const conv = ctx.store.create({ title: body.title || '新会话' })
    return jsonOk(convSummary(conv))
  }

  const sessionMatch = p.match(/^\/api\/sessions\/([^/]+)$/)
  if (sessionMatch) {
    const id = sessionMatch[1]
    const conv = ctx.store.get(id)
    if (method === 'GET') {
      if (!conv) return jsonErr('not found', 404)
      return jsonOk({
        ...conv,
        messages: conv.messages.map(m => ({
          role: m.role,
          content:
            typeof m.content === 'string' ? m.content : m.content?.content ?? '',
          ts: m.created_at || m.ts,
        })),
      })
    }
    if (method === 'DELETE') {
      ctx.runtime.abort(id)
      ctx.store.delete(id)
      return jsonOk({})
    }
  }

  if (p === '/api/mcp/status' && method === 'GET') {
    return jsonOk((await ctx.runtime.listMcp()).status)
  }
  if (p === '/api/mcp/tools' && method === 'GET') {
    return jsonOk(await ctx.runtime.getAllTools())
  }
  if (p === '/api/system/info') {
    return jsonOk({ version: '1.0.0', model: MODEL, stage: CCB_STAGE })
  }
  if (p === '/debug/stage') {
    return jsonOk({
      stage: CCB_STAGE,
      model: MODEL,
      api_base: API_BASE,
      mcp_enabled: enableMcpForStage(),
    })
  }

  const debugMcpMatch = p.match(/^\/debug\/mcp\/([^/]+)\/tools$/)
  if (debugMcpMatch && method === 'GET') {
    const name = decodeURIComponent(debugMcpMatch[1])
    const status = (await ctx.runtime.listMcp()).status
    if (!status[name]) {
      return jsonOk({ name, ok: false, error: 'not configured', tools: [] })
    }
    const tools = await ctx.runtime.getAllTools()
    return jsonOk({ name, ok: tools.length > 0, tools })
  }

  if (p.startsWith('/api/')) return jsonOk(emptyObjectStub())

  return null
}

/** @typedef {{ store: import('./store.js').ConversationStore, runtime: import('../ccb-runtime/index.js').Runtime, processTurn: (id: string, text: string) => Promise<void>, emitTurnCompleted: (id: string) => void }} HttpContext */

export {}
