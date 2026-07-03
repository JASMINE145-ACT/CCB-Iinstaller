/**
 * Session-scoped MCP prefetch policy for CCB-Wanding.
 *
 * excel-mcp (~5s COM startup) and exa are deferred until first tool use
 * (connectToServer is memoized process-wide) **unless** the active assistant
 * profile requires them (e.g. research-agent only has exa — omitting exa
 * leaves zero MCP tools in tools[]).
 *
 * Core WanD servers (quotation, accurate) stay on the session/new prefetch
 * path when the profile allowlist includes them.
 */
import type { ScopedMcpServerConfig } from '@claude-code-best/mcp-client'

/** MCP servers connected on first tool invocation, not at session/new (by default). */
export const LAZY_SESSION_MCP_SERVER_NAMES = new Set(['excel-mcp', 'exa'])

export type OmitLazySessionMcpOptions = {
  /** Profile allowlist — lazy servers listed here are still prefetched at session/new. */
  keepForProfile?: string[]
}

export function omitLazySessionMcpServers(
  configs: Record<string, ScopedMcpServerConfig>,
  options?: OmitLazySessionMcpOptions,
): Record<string, ScopedMcpServerConfig> {
  const keep = new Set(options?.keepForProfile ?? [])
  const deferred: string[] = []
  const filtered = Object.fromEntries(
    Object.entries(configs).filter(([name]) => {
      if (LAZY_SESSION_MCP_SERVER_NAMES.has(name) && !keep.has(name)) {
        deferred.push(name)
        return false
      }
      return true
    }),
  ) as Record<string, ScopedMcpServerConfig>

  if (deferred.length > 0) {
    console.info(
      `[ACP] lazy mcp defer until first tool use: ${deferred.join(', ')}`,
    )
  }

  return filtered
}
