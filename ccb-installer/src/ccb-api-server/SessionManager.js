import { randomUUID } from 'crypto'

/**
 * @returns {import('./SessionManager.js').SessionManager}
 */
export function createSessionManager() {
  /** @type {Map<string, SessionRecord>} */
  const sessions = new Map()
  /** @type {Map<string, Set<WsLike>>} */
  const subscribers = new Map()

  return {
    create() {
      const id = randomUUID()
      const session = {
        id,
        createdAt: Date.now(),
        lastActiveAt: Date.now(),
        messages: [],
        isRunning: false,
      }
      sessions.set(id, session)
      subscribers.set(id, new Set())
      return session
    },

    get(id) {
      return sessions.get(id)
    },

    delete(id) {
      const subs = subscribers.get(id)
      if (subs) {
        const payload = JSON.stringify({ type: 'close', sessionId: id, reason: 'deleted' })
        for (const client of [...subs]) {
          try {
            client.send(payload)
          } catch {
            subs.delete(client)
          }
        }
        subscribers.delete(id)
      }
      sessions.delete(id)
    },

    list() {
      return [...sessions.values()].map(s => ({
        sessionId: s.id,
        createdAt: s.createdAt,
        lastActiveAt: s.lastActiveAt,
      }))
    },

    count() {
      return sessions.size
    },

    subscribe(sessionId, client) {
      if (!subscribers.has(sessionId)) subscribers.set(sessionId, new Set())
      subscribers.get(sessionId).add(client)
    },

    unsubscribe(sessionId, client) {
      subscribers.get(sessionId)?.delete(client)
    },

    broadcast(sessionId, msg) {
      const subs = subscribers.get(sessionId)
      if (!subs?.size) return
      const data = JSON.stringify(msg)
      for (const client of [...subs]) {
        try {
          client.send(data)
        } catch {
          subs.delete(client)
        }
      }
    },
  }
}

/** @typedef {{ id: string, createdAt: number, lastActiveAt: number, messages: Array<{role: string, content: string}>, isRunning: boolean }} SessionRecord */
/** @typedef {{ send: (data: string) => void }} WsLike */
/** @typedef {ReturnType<typeof createSessionManager>} SessionManager */

export {}
