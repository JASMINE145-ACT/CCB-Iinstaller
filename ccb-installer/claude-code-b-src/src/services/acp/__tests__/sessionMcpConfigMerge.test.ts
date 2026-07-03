import { describe, expect, it } from 'bun:test'

type ScopedMcpServerConfig = { scope: string; [key: string]: unknown }

/** Pure merge contract mirrored from agent.ts resolveSessionMcpConfigs (settings base + params overlay). */
export function mergeSessionMcpConfigs(
  settingsConfigs: Record<string, ScopedMcpServerConfig>,
  paramConfigs: Record<string, ScopedMcpServerConfig>,
): Record<string, ScopedMcpServerConfig> {
  return { ...settingsConfigs, ...paramConfigs }
}

export function loadMcpConfigsFromParams(
  paramServers: Array<{ name: string } & Record<string, unknown>>,
): Record<string, ScopedMcpServerConfig> {
  const mcpConfigs: Record<string, ScopedMcpServerConfig> = {}
  for (const server of paramServers) {
    if (server && typeof server === 'object' && typeof server.name === 'string') {
      const { name, ...rest } = server
      mcpConfigs[name] = { ...rest, scope: 'dynamic' }
    }
  }
  return mcpConfigs
}

describe('session MCP config merge contract', () => {
  it('overlays param servers on settings (guide_mcp wins on name clash)', () => {
    const settings = {
      quotation: { scope: 'user' },
      excel: { scope: 'user' },
    }
    const params = loadMcpConfigsFromParams([
      { name: 'guide_mcp', command: 'node', args: ['guide.js'] },
    ])
    const merged = mergeSessionMcpConfigs(settings, params)
    expect(Object.keys(merged).sort()).toEqual(['excel', 'guide_mcp', 'quotation'])
    expect(merged.guide_mcp.scope).toBe('dynamic')
  })

  it('param dynamic scope does not remove settings-only servers', () => {
    const settings = { quotation: { scope: 'user' } }
    const params = loadMcpConfigsFromParams([])
    expect(mergeSessionMcpConfigs(settings, params)).toEqual(settings)
  })
})
