import { describe, expect, it } from 'bun:test'
import {
  resolveWanDWarmupServers,
} from '../wanDMcpWarmup.js'

describe('resolveWanDWarmupServers', () => {
  it('skips orchestrator spawn-warm (avoids racing Agent subagent match_quotation)', () => {
    expect(resolveWanDWarmupServers('wande-orchestrator')).toEqual([])
    expect(resolveWanDWarmupServers(undefined)).toEqual([])
    expect(resolveWanDWarmupServers('')).toEqual([])
  })

  it('keeps specialist direct warm targets', () => {
    expect(resolveWanDWarmupServers('quotation-agent')).toEqual(['quotation'])
    expect(resolveWanDWarmupServers('accurate-agent')).toEqual(['accurate'])
    expect(resolveWanDWarmupServers('word-creator')).toEqual(['office-word'])
    expect(resolveWanDWarmupServers('excel-creator')).toEqual(['excel'])
  })

  it('returns empty for unknown profiles', () => {
    expect(resolveWanDWarmupServers('cowork')).toEqual([])
  })
})
