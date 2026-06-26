import { spawn } from 'node:child_process'

/** @typedef {'ndjson' | 'content-length' | 'auto-detect'} McpFraming */

/**
 * @typedef {Object} McpServerConfig
 * @property {string} command
 * @property {string[]} args
 * @property {Record<string, string>} [env]
 * @property {string} [cwd]
 * @property {string} [type]
 * @property {McpFraming} [framing]
 * @property {number} [startupTimeoutMs]
 */

/**
 * @typedef {Object} McpTool
 * @property {string} name
 * @property {string} [description]
 * @property {object} [input_schema]
 * @property {object} [inputSchema]
 */

/**
 * @param {string} name
 * @param {McpServerConfig} config
 * @returns {import('./McpTransport.js').McpTransport}
 */
export function createMcpTransport(name, config) {
  /** @type {import('./McpTransport.js').McpTransport} */
  const transport = {
    name,
    get framing() {
      return config.framing || 'ndjson'
    },

    proc: null,
    buf: Buffer.alloc(0),
    pending: new Map(),
    _nextId: 0,
    tools: null,

    _id() {
      return ++this._nextId
    },

    _send(msg) {
      if (!this.proc?.stdin?.writable) return
      try {
        this.proc.stdin.write(JSON.stringify(msg) + '\n')
      } catch {
        /* ignore */
      }
    },

    _handleMessage(msg) {
      if (msg.id != null && this.pending.has(msg.id)) {
        const { resolve, reject } = this.pending.get(msg.id)
        this.pending.delete(msg.id)
        if (msg.error) {
          reject(new Error(msg.error.message || JSON.stringify(msg.error)))
        } else {
          resolve(msg.result)
        }
      }
    },

    _onData(chunk) {
      this.buf = Buffer.concat([this.buf, chunk])
      while (true) {
        const idx = this.buf.indexOf(0x0a)
        if (idx === -1) break
        const line = this.buf.slice(0, idx).toString('utf-8').replace(/\r$/, '').trim()
        this.buf = this.buf.slice(idx + 1)
        if (!line) continue
        try {
          this._handleMessage(JSON.parse(line))
        } catch {
          /* bad json line */
        }
      }
    },

    async connect() {
      if (config.type === 'http') return false
      if (this.proc) return true

      const env = { ...process.env, ...(config.env || {}) }
      this.proc = spawn(config.command, config.args || [], {
        env,
        cwd: config.cwd,
        stdio: ['pipe', 'pipe', 'pipe'],
      })

      this.proc.stdout.on('data', c => this._onData(c))
      this.proc.stderr.on('data', () => {})
      // B-03 §3.2: MCP in-flight is not wired to AbortRegistry; pending RPC rejects only.
      this.proc.on('exit', () => {
        this.proc = null
        this.tools = null
        for (const [, { reject }] of this.pending) {
          reject(new Error('MCP process exited'))
        }
        this.pending.clear()
      })

      try {
        await this._rpc('initialize', {
          protocolVersion: '2024-11-05',
          capabilities: { tools: {} },
          clientInfo: { name: 'ccb-runtime', version: '1.0.0' },
        }, config.startupTimeoutMs || 30000)
        this._send({ jsonrpc: '2.0', method: 'notifications/initialized', params: {} })
        return true
      } catch {
        await this.close()
        return false
      }
    },

    _rpc(method, params, timeout = 30000) {
      return new Promise((resolve, reject) => {
        if (!this.proc) {
          reject(new Error('not connected'))
          return
        }
        const id = this._id()
        const t = setTimeout(() => {
          this.pending.delete(id)
          reject(new Error(`timeout: ${method}`))
        }, timeout)
        this.pending.set(id, {
          resolve: v => {
            clearTimeout(t)
            resolve(v)
          },
          reject: e => {
            clearTimeout(t)
            reject(e)
          },
        })
        this._send({ jsonrpc: '2.0', id, method, params })
      })
    },

    async ensureConnected() {
      if (this.proc) return true
      return this.connect()
    },

    async listTools() {
      if (this.tools) return this.tools
      if (!await this.ensureConnected()) return []
      try {
        const r = await this._rpc('tools/list', {})
        this.tools = r.tools || []
        return this.tools
      } catch {
        return []
      }
    },

    async callTool(toolName, args, timeoutMs = 60000) {
      if (!await this.ensureConnected()) {
        throw new Error(`${name} unavailable`)
      }
      const r = await this._rpc('tools/call', { name: toolName, arguments: args }, timeoutMs)
      if (r.content) {
        return r.content.map(b => b.text ?? JSON.stringify(b)).join('\n')
      }
      return JSON.stringify(r)
    },

    async close() {
      if (this.proc) {
        try {
          this.proc.kill()
        } catch {
          /* ignore */
        }
        this.proc = null
      }
      this.tools = null
      this.buf = Buffer.alloc(0)
      for (const [, { reject }] of this.pending) {
        reject(new Error('MCP closed'))
      }
      this.pending.clear()
    },
  }

  return transport
}

/**
 * @typedef {ReturnType<typeof createMcpTransport>} McpTransport
 */

export {}
