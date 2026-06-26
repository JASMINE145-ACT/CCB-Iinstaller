import { callApiSync, callApiStream, ApiError } from './ModelClient.js'
import { AGENT_MAX_TOKENS } from './Config.js'

const MAX_ROUNDS_DEFAULT = 10
const OVER_LIMIT_TEXT = '（工具调用轮次超限）'

/**
 * @param {AbortSignal | undefined} signal
 * @param {string | undefined} sessionId
 * @param {{ input_tokens: number, output_tokens: number }} usage
 */
function abortEvent(signal, sessionId, usage) {
  if (sessionId && signal?.aborted) {
    return { type: 'turn_aborted', sessionId, usage }
  }
  return { type: 'error', error: { name: 'AbortError', message: 'Aborted' } }
}

/**
 * @param {unknown} err
 * @param {AbortSignal | undefined} signal
 * @param {string | undefined} sessionId
 * @param {{ input_tokens: number, output_tokens: number }} usage
 */
function asAbortEvent(err, signal, sessionId, usage) {
  if (err instanceof ApiError && err.status === 0 && String(err.body).includes('aborted')) {
    return abortEvent(signal, sessionId, usage)
  }
  if (err?.name === 'AbortError') {
    return abortEvent(signal, sessionId, usage)
  }
  return null
}

/**
 * @param {Map<number, object>} blocks
 */
function blocksToContent(blocks) {
  /** @type {Array<{type: string, text?: string, id?: string, name?: string, input?: unknown}>} */
  const content = []
  for (const idx of [...blocks.keys()].sort((a, b) => a - b)) {
    const b = /** @type {{type: string, text?: string, inputJson?: string, id?: string, name?: string}} */ (
      blocks.get(idx)
    )
    if (b.type === 'text') {
      content.push({ type: 'text', text: b.text || '' })
    } else if (b.type === 'tool_use') {
      let input = {}
      try {
        input = JSON.parse(b.inputJson || '{}')
      } catch (e) {
        throw new Error(`tool input JSON parse failed: ${e?.message || String(e)}`)
      }
      content.push({ type: 'tool_use', id: b.id, name: b.name, input })
    }
  }
  return content
}

/**
 * @param {object} apiBase
 * @param {Array<{role: string, content: unknown}>} loop
 * @param {import('./ModelClient.js').AnthropicTool[]} tools
 * @param {AbortSignal | undefined} signal
 * @param {string | undefined} sessionId
 * @param {{ input_tokens: number, output_tokens: number }} usage
 */
async function* streamApiRound(apiBase, loop, tools, signal, sessionId, usage) {
  /** @type {Map<number, object>} */
  const blocks = new Map()
  let stopReason = 'end_turn'

  try {
    for await (const ev of callApiStream({
      ...apiBase,
      messages: loop,
      tools: tools.length ? tools : undefined,
    })) {
      if (signal?.aborted) {
        yield { type: 'turn_aborted', sessionId, usage }
        return
      }

      if (ev.type === 'message_start' && ev.message?.usage?.input_tokens) {
        usage.input_tokens += ev.message.usage.input_tokens
      }

      if (ev.type === 'content_block_start') {
        const cb = ev.content_block || {}
        blocks.set(ev.index, {
          type: cb.type,
          text: cb.text || '',
          inputJson: '',
          id: cb.id,
          name: cb.name,
        })
      }

      if (ev.type === 'content_block_delta') {
        const block = blocks.get(ev.index)
        if (!block) continue
        if (ev.delta?.type === 'text_delta' && ev.delta.text) {
          block.text = (block.text || '') + ev.delta.text
          yield { type: 'text_delta', text: ev.delta.text }
        }
        if (ev.delta?.type === 'input_json_delta') {
          block.inputJson = (block.inputJson || '') + (ev.delta.partial_json || '')
        }
      }

      if (ev.type === 'message_delta') {
        if (ev.delta?.stop_reason) stopReason = ev.delta.stop_reason
        if (ev.usage?.output_tokens) usage.output_tokens += ev.usage.output_tokens
      }
    }
  } catch (err) {
    const ev = asAbortEvent(err, signal, sessionId, usage)
    if (ev) {
      yield ev
      return
    }
    throw err
  }

  let content
  try {
    content = blocksToContent(blocks)
  } catch (e) {
    yield { type: 'error', error: { name: 'Error', message: e?.message || String(e) } }
    return
  }

  yield {
    type: '__round_result__',
    resp: {
      content,
      stop_reason: stopReason,
      usage: { input_tokens: 0, output_tokens: 0 },
    },
  }
}

/**
 * @param {RunTurnInput} input
 * @param {AgentLoopOptions} options
 */
export async function* runAgentLoop(input, options) {
  const {
    config,
    tools = [],
    mcpManager,
    signal,
    stream = false,
    sessionId,
  } = options

  const maxRounds = input.maxRounds ?? MAX_ROUNDS_DEFAULT
  const system = input.system

  /** @type {Array<{role: string, content: unknown}>} */
  let loop = [...(input.history || []), { role: 'user', content: input.user }]
  let tries = 0
  let usage = { input_tokens: 0, output_tokens: 0 }

  const apiBase = {
    apiBase: config.apiBase,
    apiKey: config.apiKey,
    model: config.model,
    maxTokens: AGENT_MAX_TOKENS,
    timeoutMs: config.timeoutMs,
    system,
    signal,
  }

  while (tries < maxRounds) {
    tries++

    if (signal?.aborted) {
      yield abortEvent(signal, sessionId, usage)
      return
    }

    let resp

    if (stream) {
      let roundResp = null
      for await (const ev of streamApiRound(apiBase, loop, tools, signal, sessionId, usage)) {
        if (ev.type === '__round_result__') {
          roundResp = ev.resp
          continue
        }
        if (ev.type === 'turn_aborted' || ev.type === 'error') {
          yield ev
          return
        }
        yield ev
      }
      if (!roundResp) return
      resp = roundResp
    } else {
      try {
        resp = await callApiSync({
          ...apiBase,
          messages: loop,
          tools: tools.length ? tools : undefined,
        })
      } catch (e) {
        const ev = asAbortEvent(e, signal, sessionId, usage)
        if (ev) {
          yield ev
          return
        }
        if (tools.length && tries === 1) {
          try {
            resp = await callApiSync({ ...apiBase, messages: loop })
          } catch (e2) {
            const ev2 = asAbortEvent(e2, signal, sessionId, usage)
            if (ev2) {
              yield ev2
              return
            }
            yield {
              type: 'error',
              error: { name: e2?.name || 'Error', message: e2?.message || String(e2) },
            }
            return
          }
        } else {
          yield {
            type: 'error',
            error: { name: e?.name || 'Error', message: e?.message || String(e) },
          }
          return
        }
      }

      usage = {
        input_tokens: usage.input_tokens + (resp.usage?.input_tokens || 0),
        output_tokens: usage.output_tokens + (resp.usage?.output_tokens || 0),
      }
    }

    const content = resp.content || []
    const toolUses = content.filter(b => b.type === 'tool_use')

    if (!toolUses.length || resp.stop_reason !== 'tool_use') {
      const text = content.filter(b => b.type === 'text').map(b => b.text).join('')
      if (!stream) {
        yield { type: 'text_delta', text }
      }
      yield { type: 'turn_end', stop_reason: resp.stop_reason || 'end_turn', text, usage }
      return
    }

    const names = toolUses.map(t => t.name).join(', ')
    yield { type: 'tool_call_batch', names }

    for (const tu of toolUses) {
      yield { type: 'tool_call_start', id: tu.id, name: tu.name, input: tu.input }
    }

    loop.push({ role: 'assistant', content })

    const results = await Promise.all(
      toolUses.map(async tu => {
        try {
          if (!mcpManager) throw new Error('MCP not enabled')
          const text = await mcpManager.callTool(tu.name, tu.input || {})
          return {
            type: 'tool_result',
            tool_use_id: tu.id,
            content: [{ type: 'text', text }],
          }
        } catch (e) {
          const msg = e?.message || String(e)
          return {
            type: 'tool_result',
            tool_use_id: tu.id,
            is_error: true,
            content: [{ type: 'text', text: `工具错误: ${msg}` }],
          }
        }
      }),
    )

    for (let i = 0; i < toolUses.length; i++) {
      const tu = toolUses[i]
      const r = results[i]
      const text = r.content?.[0]?.text ?? ''
      yield {
        type: 'tool_result',
        toolUseId: tu.id,
        name: tu.name,
        text,
        isError: !!r.is_error,
      }
    }

    loop.push({ role: 'user', content: results })
  }

  yield { type: 'text_delta', text: OVER_LIMIT_TEXT }
  yield { type: 'turn_end', stop_reason: 'max_rounds', text: OVER_LIMIT_TEXT, usage }
}

/** @typedef {ReturnType<typeof runAgentLoop> extends AsyncGenerator<infer E> ? E : never} RuntimeEvent */

export {}
