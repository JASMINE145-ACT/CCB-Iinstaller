import {
  loadConfig,
  loadMcpConfigs,
  resolvePaths,
  DEFAULT_MCP_ALLOW_LIST,
} from './Config.js'
import { callApiSync, callApiStream } from './ModelClient.js'
import { loadSystemPrompt } from './PromptAssembler.js'
import { createMcpManager } from './McpManager.js'
import { toAnthropicTools } from './ToolBridge.js'
import { runAgentLoop } from './AgentLoop.js'
import { createAbortRegistry } from './AbortRegistry.js'

export {
  loadConfig,
  ConfigError,
  loadMcpConfigs,
  resolvePaths,
  DEFAULT_MCP_ALLOW_LIST,
  AGENT_MAX_TOKENS,
  STREAM_FIRST_DELTA_TIMEOUT_MS,
} from './Config.js'
export { callApiSync, callApiStream, ApiError } from './ModelClient.js'
export { loadSystemPrompt } from './PromptAssembler.js'
export { runAgentLoop } from './AgentLoop.js'
export { createAbortRegistry } from './AbortRegistry.js'

/**
 * @param {CreateRuntimeOptions} [options]
 * @returns {Promise<Runtime>}
 */
export async function createRuntime(options = {}) {
  let config = { ...loadConfig(), ...(options.config || {}) }
  const paths = resolvePaths()
  if (options.installerDir) paths.installerDir = options.installerDir

  const enableMcp = options.enableMcp === true
  const allowList = options.mcpServerAllowList || DEFAULT_MCP_ALLOW_LIST
  const systemPromptPrefix = options.systemPromptPrefix
  const abortRegistry = createAbortRegistry()

  /** @type {import('./McpManager.js').McpManager | null} */
  let mcpManager = null
  /** @type {import('./ModelClient.js').AnthropicTool[]} */
  let anthropicTools = []

  if (enableMcp) {
    mcpManager = createMcpManager()
    const mcpConfigs = loadMcpConfigs(process.env, allowList)
    mcpManager.init(mcpConfigs)
    // B-02: MCP cold start + multi-round agent needs ≥120s (see B-02 spec R-B02-6)
    if (config.timeoutMs < 120000) {
      config = { ...config, timeoutMs: 120000 }
    }
  }

  async function resolveSystem(inputSystem) {
    if (inputSystem) return inputSystem
    const { text } = loadSystemPrompt(paths, { prefix: systemPromptPrefix })
    return text
  }

  async function ensureTools() {
    if (!mcpManager) return []
    if (anthropicTools.length) return anthropicTools
    const mcpTools = await mcpManager.getAllTools()
    anthropicTools = toAnthropicTools(mcpTools)
    return anthropicTools
  }

  return {
    get mcpStatus() {
      return mcpManager?.getStatus() ?? {}
    },

    async listMcp() {
      if (!mcpManager) return { status: {}, tools: [] }
      const tools = await ensureTools()
      return { status: mcpManager.getStatus(), tools }
    },

    async getAllTools() {
      if (!mcpManager) return []
      return mcpManager.getAllTools()
    },

    async runTextTurn({ user, history = [], system }) {
      const messages = [...history, { role: 'user', content: user }]
      const resp = await callApiSync({
        apiBase: config.apiBase,
        apiKey: config.apiKey,
        model: config.model,
        maxTokens: config.maxTokens,
        timeoutMs: config.timeoutMs,
        system: system ?? (await resolveSystem()),
        messages,
      })

      const textBlock = resp.content.find(b => b.type === 'text')
      const text = textBlock?.text ?? ''

      return {
        text,
        usage: resp.usage,
        stop_reason: resp.stop_reason,
      }
    },

    async *runTurn({
      user,
      history = [],
      system,
      maxRounds,
      stream = false,
      sessionId,
    }) {
      const controller = sessionId ? new AbortController() : null
      if (sessionId && controller) {
        abortRegistry.register(sessionId, controller)
      }

      try {
        const resolvedSystem = await resolveSystem(system)
        const tools = enableMcp ? await ensureTools() : []

        yield* runAgentLoop(
          { user, history, system: resolvedSystem, maxRounds, sessionId },
          {
            config,
            tools,
            mcpManager: mcpManager ?? undefined,
            signal: controller?.signal,
            stream,
            sessionId,
          },
        )
      } finally {
        if (sessionId) abortRegistry.unregister(sessionId)
      }
    },

    abort(sessionId) {
      return abortRegistry.abort(sessionId)
    },

    activeAbortCount() {
      return abortRegistry.activeCount()
    },

    async close() {
      abortRegistry.abortAll()
      if (mcpManager) {
        await mcpManager.close()
        mcpManager = null
      }
      anthropicTools = []
    },
  }
}

/** @typedef {Awaited<ReturnType<typeof createRuntime>>} Runtime */

export {}
