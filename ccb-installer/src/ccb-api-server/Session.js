/**
 * @param {string} id
 * @param {import('../ccb-runtime/index.js').Runtime} runtime
 * @param {import('./SessionManager.js').SessionManager} sessionManager
 */
export function createSessionRunner(id, runtime, sessionManager) {
  return {
    /**
     * @param {{ user: string, stream?: boolean }} input
     */
    async runTurn(input) {
      const session = sessionManager.get(id)
      if (!session) throw new Error('session not found')
      if (session.isRunning) throw new Error('session busy')

      session.isRunning = true
      session.lastActiveAt = Date.now()

      const history = session.messages.map(m => ({ role: m.role, content: m.content }))
      let text = ''
      let usage = null
      let stopReason = 'end_turn'
      const stream = input.stream === true

      try {
        for await (const ev of runtime.runTurn({
          user: input.user,
          history,
          stream,
          sessionId: id,
        })) {
          sessionManager.broadcast(id, { type: 'event', sessionId: id, event: ev })

          if (ev.type === 'text_delta' && ev.text) {
            if (stream) text += ev.text
          }
          if (ev.type === 'turn_end') {
            text = ev.text || text
            usage = ev.usage
            stopReason = ev.stop_reason || 'end_turn'
          }
          if (ev.type === 'turn_aborted') {
            stopReason = 'aborted'
            break
          }
          if (ev.type === 'error') {
            throw new Error(ev.error?.message || 'runtime error')
          }
        }

        session.messages.push({ role: 'user', content: input.user })
        if (stopReason !== 'aborted') {
          session.messages.push({ role: 'assistant', content: text })
        }
        session.lastActiveAt = Date.now()

        return { text, usage, stop_reason: stopReason }
      } finally {
        session.isRunning = false
      }
    },

    abort() {
      return runtime.abort(id)
    },
  }
}

export {}
