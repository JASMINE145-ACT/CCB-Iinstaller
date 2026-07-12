import type { ScopedMcpServerConfig } from '@claude-code-best/mcp-client'

export type AcpParamMcpServer = { name: string } & Record<string, unknown>

export function loadMcpConfigsFromParams(
  paramServers: AcpParamMcpServer[],
): Record<string, ScopedMcpServerConfig> {
  const mcpConfigs: Record<string, ScopedMcpServerConfig> = {}
  for (const server of paramServers) {
    if (
      server &&
      typeof server === 'object' &&
      typeof server.name === 'string'
    ) {
      const { name, ...rest } = server
      mcpConfigs[name] = {
        ...rest,
        scope: 'dynamic',
      } as ScopedMcpServerConfig
    }
  }
  return mcpConfigs
}

/** User MCP from settings.json, overlaid by ACP client servers (e.g. AionUI guide_mcp). */
export function mergeSessionMcpConfigs(
  settingsConfigs: Record<string, ScopedMcpServerConfig>,
  paramServers: AcpParamMcpServer[],
): Record<string, ScopedMcpServerConfig> {
  return {
    ...settingsConfigs,
    ...loadMcpConfigsFromParams(paramServers),
  }
}