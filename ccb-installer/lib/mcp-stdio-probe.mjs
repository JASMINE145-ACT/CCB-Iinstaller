/**
 * Spawn a stdio MCP server from settings.json and verify tools/list.
 */
import { createMcpTransport } from '../src/ccb-runtime/McpTransport.js'

/**
 * @param {unknown} toolResult
 * @param {{ tool: string, reject_patterns?: string[] }} probeCall
 */
function validateToolCallResult(toolResult, probeCall) {
  if (!toolResult) {
    return { ok: false, error: `tools/call ${probeCall.tool} returned no result` }
  }

  const textBlocks = Array.isArray(toolResult.content)
    ? toolResult.content
        .filter((block) => block && typeof block === 'object' && block.type === 'text')
        .map((block) => String(block.text ?? ''))
    : []
  const combined = textBlocks.join('\n')
  const isError = toolResult.isError === true
  const looksLikeMissingPython =
    /can't open file.*main\.py/i.test(combined) ||
    /Python produced no JSON output/i.test(combined) ||
    /Failed to spawn Python/i.test(combined)

  if (isError || looksLikeMissingPython) {
    return {
      ok: false,
      error: `tools/call ${probeCall.tool} failed: ${combined.slice(0, 240) || 'isError=true'}`,
    }
  }

  for (const pattern of probeCall.reject_patterns ?? []) {
    if (pattern && combined.includes(pattern)) {
      return {
        ok: false,
        error: `tools/call ${probeCall.tool} rejected pattern "${pattern}": ${combined.slice(0, 240)}`,
      }
    }
  }

  return { ok: true }
}

/**
 * @param {string} name
 * @param {{ command: string, args?: string[], env?: Record<string,string>, cwd?: string }} config
 * @param {{ timeoutMs?: number, minTools?: number, expectToolPrefix?: string, probeToolCall?: { tool: string, arguments?: Record<string, unknown>, reject_patterns?: string[] }, probeToolCalls?: Array<{ tool: string, arguments?: Record<string, unknown>, reject_patterns?: string[] }> }} opts
 */
export async function probeStdioMcpServer(name, config, opts = {}) {
  const timeoutMs = opts.timeoutMs ?? 45000
  const minTools = opts.minTools ?? 1
  const expectToolPrefix = opts.expectToolPrefix ?? ''
  const probeToolCalls = [
    ...(opts.probeToolCalls ?? []),
    ...(opts.probeToolCall?.tool ? [opts.probeToolCall] : []),
  ]

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

    const executedTools = []
    for (const probeCall of probeToolCalls) {
      if (!probeCall?.tool) continue
      const toolResult =
        typeof transport._rpc === 'function'
          ? await transport._rpc(
              'tools/call',
              {
                name: probeCall.tool,
                arguments: probeCall.arguments ?? {},
              },
              timeoutMs,
            )
          : null

      const validation = validateToolCallResult(toolResult, probeCall)
      if (!validation.ok) {
        return {
          ok: false,
          name,
          error: validation.error,
          duration_ms: Date.now() - started,
        }
      }
      executedTools.push(probeCall.tool)
    }

    return {
      ok: true,
      name,
      tool_count: toolNames.length,
      sample_tools: toolNames.slice(0, 5),
      duration_ms: Date.now() - started,
      probe_tool: executedTools.join('+') || null,
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
