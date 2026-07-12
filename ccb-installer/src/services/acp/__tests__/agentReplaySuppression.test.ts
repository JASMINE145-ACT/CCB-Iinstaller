import { describe, expect, it } from 'bun:test'
import { readFileSync } from 'node:fs'

const source = readFileSync(
  'ccb-installer/src/services/acp/agent.ts',
  'utf8',
)

describe('ACP stale prompt rehydrate replay suppression', () => {
  it('does not replay disk history to the ACP client during prompt-time stale rehydrate', () => {
    expect(source).toContain('replayToClient: false')
    expect(source).toContain('params.replayToClient !== false')
    expect(source).toContain('await this.replaySessionHistory(params)')
    expect(source).toContain('await replayHistoryMessages(')
  })
})