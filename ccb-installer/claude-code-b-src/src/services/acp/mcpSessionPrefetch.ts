/**
 * Session-scoped MCP prefetch policy for CCB-Wanding.
 *
 * excel-mcp (~5s COM startup) and exa are deferred until first tool use
 * (connectToServer is memoized process-wide). Core WanD servers (quotation,
 * accurate) stay on the session/new prefetch path when the profile allowlist
 * includes them.
 */
import type { ScopedMcpServerConfig } from '@claude-code-best/mcp-client'

/** MCP servers connected on first tool invocation, not at session/new. */
export const LAZY_SESSION_MCP_SERVER_NAMES = new Set(['excel-mcp', 'exa'])

export function omitLazySessionMcpServers(
  configs: Record<string, ScopedMcpServerConfig>,
): Record<string, ScopedMcpServerConfig> {
  const deferred: string[] = []
  const filtered = Object.fromEntries(
    Object.entries(configs).filter(([name]) => {
      if (LAZY_SESSION_MCP_SERVER_NAMES.has(name)) {
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
