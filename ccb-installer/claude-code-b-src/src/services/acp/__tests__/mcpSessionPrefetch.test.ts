import { describe, expect, it } from 'bun:test'
import {
  LAZY_SESSION_MCP_SERVER_NAMES,
  omitLazySessionMcpServers,
} from '../mcpSessionPrefetch.js'

describe('mcpSessionPrefetch', () => {
  it('defers excel-mcp and exa from session prefetch', () => {
    const configs = {
      quotation: { scope: 'user' } as never,
      accurate: { scope: 'user' } as never,
      'excel-mcp': { scope: 'user' } as never,
      exa: { scope: 'user' } as never,
    }
    const result = omitLazySessionMcpServers(configs)
    expect(Object.keys(result).sort()).toEqual(['accurate', 'quotation'])
  })

  it('returns empty object unchanged', () => {
    expect(omitLazySessionMcpServers({})).toEqual({})
  })

  it('LAZY set includes excel-mcp and exa', () => {
    expect(LAZY_SESSION_MCP_SERVER_NAMES.has('excel-mcp')).toBe(true)
    expect(LAZY_SESSION_MCP_SERVER_NAMES.has('exa')).toBe(true)
    expect(LAZY_SESSION_MCP_SERVER_NAMES.has('quotation')).toBe(false)
  })
})
