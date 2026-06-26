import { randomUUID } from 'crypto'
import { createRuntime } from '../ccb-runtime/index.js'
import { mapRuntimeEvent } from './event-mapper.js'
import {
  AGENT_NAME,
  AGENT_TITLE,
  AGENT_VERSION,
  MODEL,
  defaultSessionCwd,
} from './config.js'

/**
 * @param {import('@agentclientprotocol/sdk').AgentSideConnection} client
 * @param {import('../ccb-runtime/index.js').Runtime} runtime
 */
export function createCcbAcpAgent(client, runtime) {
  /** @type {Map<string, { cwd: string, history: Array<{role: string, content: string}> }>} */
  const sessions = new Map()

  return {
    async initialize(request) {
      const supportsGateway =
        request.clientCapabilities?.auth?._meta?.gateway === true

      return {
        protocolVersion: 1,
        agentCapabilities: {
          _meta: {
            claudeCode: {
              promptQueueing: true,
            },
          },
          promptCapabilities: {
            image: false,
            embeddedContext: false,
          },
          mcpCapabilities: {
            http: true,
            sse: true,
          },
        },
        agentInfo: {
          name: AGENT_NAME,
          title: AGENT_TITLE,
          version: AGENT_VERSION,
        },
        authMethods: supportsGateway
          ? [
              {
                id: 'gateway',
                name: 'Custom model gateway',
                description: 'MiniMax Anthropic-compatible gateway',
                _meta: { gateway: { protocol: 'anthropic' } },
              },
            ]
          : [],
      }
    },

    async authenticate() {
      return {}
    },

    async newSession(params) {
      const sessionId = randomUUID()
      sessions.set(sessionId, {
        cwd: defaultSessionCwd(params.cwd),
        history: [],
      })

      return {
        sessionId,
        modes: {
          availableModes: [{ id: 'default', name: 'Default', description: 'CCB-Wanding default' }],
          currentModeId: 'default',
        },
        models: {
          availableModels: [{ modelId: MODEL, name: MODEL }],
          currentModelId: MODEL,
        },
      }
    },

    async setSessionMode() {
      return {}
    },

    async cancel(params) {
      runtime.abort(params.sessionId)
    },

    async prompt(params) {
      const session = sessions.get(params.sessionId)
      if (!session) {
        throw new Error('Session not found')
      }

      const userText = params.prompt
        .filter(b => b.type === 'text')
        .map(b => b.text)
        .join('\n')
        .trim()

      if (!userText) {
        return { stopReason: 'end_turn' }
      }

      let stopReason = 'end_turn'
      let assistantText = ''

      try {
        for await (const ev of runtime.runTurn({
          user: userText,
          history: session.history,
          stream: true,
          sessionId: params.sessionId,
        })) {
          await mapRuntimeEvent(client, params.sessionId, ev)

          if (ev.type === 'text_delta' && ev.text) {
            assistantText += ev.text
          }
          if (ev.type === 'turn_aborted') {
            stopReason = 'cancelled'
            break
          }
          if (ev.type === 'turn_end') {
            assistantText = ev.text || assistantText
            stopReason = ev.stop_reason === 'max_rounds' ? 'max_turn_requests' : 'end_turn'
          }
          if (ev.type === 'error') {
            throw new Error(ev.error?.message || 'runtime error')
          }
        }
      } catch (err) {
        if (stopReason === 'cancelled') {
          return { stopReason: 'cancelled' }
        }
        throw err
      }

      session.history.push({ role: 'user', content: userText })
      if (assistantText && stopReason !== 'cancelled') {
        session.history.push({ role: 'assistant', content: assistantText })
      }

      return { stopReason }
    },

    async dispose() {
      await runtime.close()
    },
  }
}

export {}
