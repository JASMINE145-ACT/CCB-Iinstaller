import { describe, expect, it } from 'bun:test'
import {
  loadMcpConfigsFromParams,
  mergeSessionMcpConfigs,
} from '../sessionMcpConfig.js'

describe('session MCP config merge contract', () => {
  it('overlays param servers on settings (guide_mcp wins on name clash)', () => {
    const settings = {
      quotation: { scope: 'user' },
      guide_mcp: { scope: 'user', command: 'old-guide' },
      excel: { scope: 'user' },
    } as never
    const merged = mergeSessionMcpConfigs(settings, [
      { name: 'guide_mcp', command: 'node', args: ['guide.js'] },
    ])

    expect(Object.keys(merged).sort()).toEqual(['excel', 'guide_mcp', 'quotation'])
    expect(merged.guide_mcp.scope).toBe('dynamic')
    expect(merged.guide_mcp.command).toBe('node')
  })

  it('param dynamic scope does not remove settings-only servers', () => {
    const settings = { quotation: { scope: 'user' } } as never
    expect(mergeSessionMcpConfigs(settings, [])).toEqual(settings)
  })

  it('ignores malformed param server records without a string name', () => {
    const params = loadMcpConfigsFromParams([
      { name: 'guide_mcp', command: 'node' },
      { name: 123, command: 'bad' } as never,
      null as never,
    ])

    expect(Object.keys(params)).toEqual(['guide_mcp'])
    expect(params.guide_mcp.scope).toBe('dynamic')
  })
})