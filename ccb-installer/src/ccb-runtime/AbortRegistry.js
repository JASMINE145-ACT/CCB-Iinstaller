/**
 * @returns {import('./AbortRegistry.js').AbortRegistry}
 */
export function createAbortRegistry() {
  /** @type {Map<string, AbortController>} */
  const sessions = new Map()

  return {
    register(sessionId, controller) {
      const prev = sessions.get(sessionId)
      if (prev && prev !== controller) {
        try {
          prev.abort()
        } catch {
          /* ignore */
        }
      }
      sessions.set(sessionId, controller)
    },

    abort(sessionId) {
      const controller = sessions.get(sessionId)
      if (!controller) return false
      controller.abort()
      return true
    },

    unregister(sessionId) {
      sessions.delete(sessionId)
    },

    activeCount() {
      return sessions.size
    },

    abortAll() {
      for (const controller of sessions.values()) {
        try {
          controller.abort()
        } catch {
          /* ignore */
        }
      }
      sessions.clear()
    },
  }
}

/** @typedef {ReturnType<typeof createAbortRegistry>} AbortRegistry */

export {}
