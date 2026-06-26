import { CCB_STAGE, FAKE_REPLY, enableMcpForStage } from './config.js'
import { activeRuntime, idleRuntime } from './store.js'

/**
 * @param {object} deps
 * @param {import('../ccb-runtime/index.js').Runtime} deps.runtime
 * @param {import('./store.js').ConversationStore} deps.store
 * @param {ReturnType<import('./aionui-events.js').createEventEmitter>} deps.events
 */
export async function processTurn(deps, convId, userText) {
  const { runtime, store, events } = deps
  const conv = store.get(convId)
  if (!conv) throw new Error('conversation not found')

  conv.runtime = activeRuntime()
  store.touch(conv)

  const userMsg = {
    id: `u-${Date.now()}`,
    role: 'user',
    type: 'text',
    content: { content: userText, type: 'text' },
    status: 'finish',
    created_at: new Date().toISOString(),
  }
  conv.messages.push(userMsg)
  events.userCreated(convId, userMsg)
  events.runtimeStatus(convId, { ...activeRuntime(), phase: 'validating' })
  events.runtimeStatus(convId, { ...activeRuntime(), phase: 'ready' })
  events.streamStart(convId)
  events.streamCommands(convId)

  const startTs = Date.now()
  let fullText = ''

  try {
    if (CCB_STAGE === 'fake') {
      await new Promise(r => setTimeout(r, 200))
      fullText = FAKE_REPLY
      events.streamText(convId, fullText)
    } else {
      const history = conv.messages
        .slice(0, -1)
        .map(m => ({
          role: m.role,
          content: typeof m.content === 'string' ? m.content : m.content?.content || '',
        }))

      for await (const ev of runtime.runTurn({
        user: userText,
        history,
        stream: true,
        sessionId: convId,
      })) {
        if (ev.type === 'text_delta' && ev.text) {
          fullText += ev.text
          events.streamText(convId, ev.text)
        }
        if (ev.type === 'tool_call_batch') {
          events.toolCalling(convId, ev.names)
        }
        if (ev.type === 'turn_aborted') {
          events.streamFinish(convId)
          conv.runtime = idleRuntime()
          store.touch(conv)
          events.turnCompleted(convId, idleRuntime())
          return
        }
        if (ev.type === 'error') {
          throw new Error(ev.error?.message || 'runtime error')
        }
      }
    }
  } catch (e) {
    events.error(convId, e?.message || String(e))
    conv.runtime = idleRuntime()
    store.touch(conv)
    events.streamFinish(convId)
    events.turnCompleted(convId, idleRuntime())
    return
  }

  events.streamFinish(convId)

  const asstMsg = {
    id: `a-${Date.now()}`,
    role: 'assistant',
    type: 'text',
    content: { content: fullText, type: 'text' },
    status: 'finish',
    created_at: new Date().toISOString(),
  }
  conv.messages.push(asstMsg)
  events.agentCreated(convId, asstMsg)

  if (conv.messages.filter(m => m.role === 'user').length === 1 && fullText) {
    conv.title = fullText.slice(0, 40) + (fullText.length > 40 ? '…' : '')
  }

  conv.runtime = idleRuntime()
  store.touch(conv)
  events.turnCompleted(convId, {
    ...idleRuntime(),
    duration_ms: Date.now() - startTs,
  })
}

/**
 * @param {boolean} [enableMcp]
 */
export function runtimeOptions(enableMcp) {
  return { enableMcp: enableMcp ?? enableMcpForStage() }
}

export {}
