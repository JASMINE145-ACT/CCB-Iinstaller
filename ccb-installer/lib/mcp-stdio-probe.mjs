/**
 * Spawn a stdio MCP server from settings.json and verify tools/list.
 */
import { createMcpTransport } from '../src/ccb-runtime/McpTransport.js'

/**
 * @param {string} name
 * @param {{ command: string, args?: string[], env?: Record<string,string>, cwd?: string }} config
 * @param {{ timeoutMs?: number, minTools?: number, expectToolPrefix?: string }} opts
 */
export async function probeStdioMcpServer(name, config, opts = {}) {
  const timeoutMs = opts.timeoutMs ?? 45000
  const minTools = opts.minTools ?? 1
  const expectToolPrefix = opts.expectToolPrefix ?? ''

  const transport = createMcpTransport(name, {
    command: config.command,
    args: config.args ?? [],
    env: config.env ?? {},
    cwd: config.cwd,
    startupTimeoutMs: timeoutMs,
  })

  const started = Date.now()
  try {
    const connected = await transport.connect()
    if (!connected) {
      return {
        ok: false,
        name,
        error: 'connect failed',
        duration_ms: Date.now() - started,
      }
    }

    const tools =
      typeof transport._rpc === 'function'
        ? (await transport._rpc('tools/list', {}, timeoutMs))?.tools ?? []
        : await transport.listTools()
    const toolNames = tools.map((t) => t.name).filter(Boolean)

    if (toolNames.length < minTools) {
      return {
        ok: false,
        name,
        error: `tools/list returned ${toolNames.length} tools (expected >= ${minTools})`,
        duration_ms: Date.now() - started,
        tools: toolNames.slice(0, 10),
      }
    }

    if (expectToolPrefix) {
      const prefixed = toolNames.filter((n) => n.startsWith(expectToolPrefix))
      if (prefixed.length === 0) {
        return {
          ok: false,
          name,
          error: `no tools with prefix ${expectToolPrefix}`,
          duration_ms: Date.now() - started,
          tools: toolNames.slice(0, 10),
        }
      }
    }

    return {
      ok: true,
      name,
      tool_count: toolNames.length,
      sample_tools: toolNames.slice(0, 5),
      duration_ms: Date.now() - started,
    }
  } catch (err) {
    return {
      ok: false,
      name,
      error: err instanceof Error ? err.message : String(err),
      duration_ms: Date.now() - started,
    }
  } finally {
    await transport.close()
  }
}
