import { randomUUID } from 'crypto'
import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'fs'
import { DATA_DIR, SESSIONS_FILE, MODEL } from './config.js'

export function idleRuntime() {
  return { is_processing: false, can_send_message: true, phase: 'idle' }
}

export function activeRuntime() {
  return { is_processing: true, can_send_message: false, phase: 'validating' }
}

export function defaultModel() {
  return { platform: 'ccb-wanding', use_model: MODEL }
}

/**
 * @returns {import('./store.js').ConversationStore}
 */
export function createConversationStore() {
  /** @type {Record<string, Conversation>} */
  let store = {}

  function load() {
    try {
      if (existsSync(SESSIONS_FILE)) {
        store = JSON.parse(readFileSync(SESSIONS_FILE, 'utf-8'))
      }
    } catch {
      store = {}
    }
  }

  function save() {
    mkdirSync(DATA_DIR, { recursive: true })
    writeFileSync(SESSIONS_FILE, JSON.stringify(store, null, 2), 'utf-8')
  }

  load()

  return {
    get(id) {
      return store[id]
    },

    create({ title = '新会话', userId = 'local', type = 'aionrs', model } = {}) {
      const now = new Date().toISOString()
      const conv = {
        id: randomUUID().replace(/-/g, '').slice(0, 16),
        title,
        userId,
        type,
        createdAt: now,
        updatedAt: now,
        messages: [],
        model: model || defaultModel(),
        runtime: idleRuntime(),
      }
      store[conv.id] = conv
      save()
      return conv
    },

    delete(id) {
      delete store[id]
      save()
    },

    list({ userId } = {}) {
      return Object.values(store)
        .filter(c => !userId || c.userId === userId)
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    },

    touch(conv) {
      conv.updatedAt = new Date().toISOString()
      save()
    },

    save,
  }
}

/** @typedef {{ id: string, title: string, userId: string, type: string, createdAt: string, updatedAt: string, messages: Array<object>, model: object, runtime: object }} Conversation */
/** @typedef {ReturnType<typeof createConversationStore>} ConversationStore */

export {}
