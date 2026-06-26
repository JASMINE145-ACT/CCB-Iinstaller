import { createMcpTransport } from './McpTransport.js'

/**
 * @returns {import('./McpManager.js').McpManager}
 */
export function createMcpManager() {
  /** @type {Map<string, import('./McpTransport.js').McpTransport>} */
  const clients = new Map()

  return {
    init(configs) {
      clients.clear()
      for (const [name, cfg] of Object.entries(configs)) {
        if (cfg.type === 'http') continue
        clients.set(name, createMcpTransport(name, cfg))
      }
    },

    async getAllTools() {
      const all = []
      for (const c of clients.values()) {
        try {
          all.push(...await c.listTools())
        } catch {
          /* single client failure should not break others */
        }
      }
      return all
    },

    findClient(toolName) {
      for (const c of clients.values()) {
        if (c.tools?.some(t => t.name === toolName)) return c
      }
      return null
    },

    async callTool(toolName, args) {
      if ([...clients.values()].some(c => c.tools === null)) {
        await this.getAllTools()
      }
      const c = this.findClient(toolName)
      if (!c) throw new Error(`unknown tool: ${toolName}`)
      return c.callTool(toolName, args)
    },

    getStatus() {
      /** @type {Record<string, { connected: boolean, tools: string[] | null, framing: string }>} */
      const result = {}
      for (const [name, c] of clients.entries()) {
        result[name] = {
          connected: !!c.proc,
          tools: c.tools?.map(t => t.name) ?? null,
          framing: c.framing || 'ndjson',
        }
      }
      return result
    },

    async close() {
      for (const c of clients.values()) {
        await c.close()
      }
      clients.clear()
    },
  }
}

/** @typedef {ReturnType<typeof createMcpManager>} McpManager */

export {}
