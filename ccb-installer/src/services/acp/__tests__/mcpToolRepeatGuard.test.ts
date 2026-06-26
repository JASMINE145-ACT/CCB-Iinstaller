import { describe, expect, it } from 'bun:test'
import {
  buildToolCallRepeatKey,
  extractInventoryBatchCodes,
  finalizeInventoryBatchByToolUseId,
  MAX_CONSECUTIVE_SAME_TOOL_CALLS,
  normalizeToolNameForRepeatGuard,
  resetToolCallRepeatState,
  wrapCanUseToolWithRepeatGuard,
} from '../mcpToolRepeatGuard.js'
import { ORCHESTRATOR_AGENT_TOOL_NAME } from '../agentSessionProfile.js'
import type { CanUseToolFn } from '../../../hooks/useCanUseTool.js'

describe('mcpToolRepeatGuard', () => {
  it('normalizes MCP tool names', () => {
    expect(
      normalizeToolNameForRepeatGuard(
        'mcp__accurate__accurate_summarize_records',
      ),
    ).toBe('accurate_summarize_records')
  })

  it('builds stable keys regardless of object key order', () => {
    const a = buildToolCallRepeatKey('summarize', { b: 1, a: 2 })
    const b = buildToolCallRepeatKey('summarize', { a: 2, b: 1 })
    expect(a).toBe(b)
  })

  it('denies the 3rd consecutive call with the same tool and params', async () => {
    const base: CanUseToolFn = async () => ({
      behavior: 'allow',
      updatedInput: {},
      decisionReason: { type: 'other', reason: 'ok' },
    })
    const guarded = wrapCanUseToolWithRepeatGuard(base, 'sess-1')
    const tool = { name: 'mcp__accurate__accurate_summarize_records' } as never
    const input = { month: 1, group_by: 'month' }
    const ctx = {} as never
    const msg = {} as never

    const first = await guarded(tool, input, ctx, msg, 't1')
    const second = await guarded(tool, input, ctx, msg, 't2')
    const third = await guarded(tool, input, ctx, msg, 't3')

    expect(first.behavior).toBe('allow')
    expect(second.behavior).toBe('allow')
    expect(third.behavior).toBe('deny')
    if (third.behavior === 'deny') {
      expect(third.message).toContain('accurate_summarize_records')
      expect(third.message).toContain('相同参数')
    }
    expect(MAX_CONSECUTIVE_SAME_TOOL_CALLS).toBe(2)
  })

  it('allows repeated calls when params differ', async () => {
    const base: CanUseToolFn = async () => ({
      behavior: 'allow',
      updatedInput: {},
      decisionReason: { type: 'other', reason: 'ok' },
    })
    const guarded = wrapCanUseToolWithRepeatGuard(base, 'sess-months')
    const tool = { name: 'mcp__accurate__accurate_summarize_records' } as never
    const ctx = {} as never
    const msg = {} as never

    for (let month = 1; month <= 5; month += 1) {
      const result = await guarded(tool, { month }, ctx, msg, `m${month}`)
      expect(result.behavior).toBe('allow')
    }
  })

  it('tracks repeat counts independently per subagent scope', async () => {
    const base: CanUseToolFn = async () => ({
      behavior: 'allow',
      updatedInput: {},
      decisionReason: { type: 'other', reason: 'ok' },
    })
    const guarded = wrapCanUseToolWithRepeatGuard(base, 'sess-scope')
    const tool = { name: 'accurate_summarize_records' } as never
    const input = { month: 1 }
    const mainCtx = {} as never
    const subCtx = { agentId: 'accurate-agent' } as never
    const msg = {} as never

    await guarded(tool, input, mainCtx, msg, 'm1')
    await guarded(tool, input, mainCtx, msg, 'm2')
    const mainThird = await guarded(tool, input, mainCtx, msg, 'm3')
    expect(mainThird.behavior).toBe('deny')

    const subFirst = await guarded(tool, input, subCtx, msg, 's1')
    const subSecond = await guarded(tool, input, subCtx, msg, 's2')
    expect(subFirst.behavior).toBe('allow')
    expect(subSecond.behavior).toBe('allow')
  })

  it('does not apply repeat guard to orchestrator Agent delegation', async () => {
    let calls = 0
    const base: CanUseToolFn = async () => {
      calls += 1
      return {
        behavior: 'allow',
        updatedInput: {},
        decisionReason: { type: 'other', reason: 'ok' },
      }
    }
    const guarded = wrapCanUseToolWithRepeatGuard(base, 'sess-agent')
    const tool = { name: ORCHESTRATOR_AGENT_TOOL_NAME } as never
    const ctx = {} as never
    const msg = {} as never

    for (let i = 0; i < 5; i += 1) {
      const result = await guarded(
        tool,
        { subagent_type: i % 2 === 0 ? 'accurate-agent' : 'quotation-agent' },
        ctx,
        msg,
        `a${i}`,
      )
      expect(result.behavior).toBe('allow')
    }
    expect(calls).toBe(5)
  })

  it('does not apply repeat guard to office-word MCP tools', async () => {
    let calls = 0
    const base: CanUseToolFn = async () => {
      calls += 1
      return {
        behavior: 'allow',
        updatedInput: {},
        decisionReason: { type: 'other', reason: 'ok' },
      }
    }
    const guarded = wrapCanUseToolWithRepeatGuard(base, 'sess-word')
    const tool = { name: 'mcp__office-word__add_paragraph' } as never
    const ctx = {} as never
    const msg = {} as never

    for (let i = 0; i < 5; i += 1) {
      const result = await guarded(tool, { n: i }, ctx, msg, `p${i}`)
      expect(result.behavior).toBe('allow')
    }
    expect(calls).toBe(5)
  })

  it('resets count when tool name changes', async () => {
    let calls = 0
    const base: CanUseToolFn = async () => {
      calls += 1
      return {
        behavior: 'allow',
        updatedInput: {},
        decisionReason: { type: 'other', reason: 'ok' },
      }
    }
    const guarded = wrapCanUseToolWithRepeatGuard(base, 'sess-2')
    const summarize = { name: 'accurate_summarize_records' } as never
    const fetch = { name: 'accurate_fetch_by_date' } as never
    const ctx = {} as never
    const msg = {} as never

    await guarded(summarize, { a: 1 }, ctx, msg, 'a')
    await guarded(summarize, { a: 1 }, ctx, msg, 'b')
    await guarded(fetch, { a: 1 }, ctx, msg, 'c')
    await guarded(summarize, { a: 1 }, ctx, msg, 'd')

    expect(calls).toBe(4)
  })

  it('clears repeat state on session reset', async () => {
    const base: CanUseToolFn = async () => ({
      behavior: 'allow',
      updatedInput: {},
      decisionReason: { type: 'other', reason: 'ok' },
    })
    const sessionId = 'sess-teardown'
    const guarded = wrapCanUseToolWithRepeatGuard(base, sessionId)
    const tool = { name: 'summarize' } as never
    const input = { month: 1 }
    const ctx = {} as never
    const msg = {} as never

    await guarded(tool, input, ctx, msg, '1')
    await guarded(tool, input, ctx, msg, '2')
    resetToolCallRepeatState(sessionId)

    const afterReset = await guarded(tool, input, ctx, msg, '3')
    expect(afterReset.behavior).toBe('allow')
  })

  it('extracts batch inventory codes from alternate param keys', () => {
    expect(
      extractInventoryBatchCodes({
        codes: ['8010072478', '8010071402'],
      }),
    ).toEqual(['8010072478', '8010071402'])
    expect(
      extractInventoryBatchCodes({
        item_codes: ['8020020755'],
      }),
    ).toEqual(['8020020755'])
  })

  it('denies single inventory for codes covered by a successful batch', async () => {
    const base: CanUseToolFn = async () => ({
      behavior: 'allow',
      updatedInput: {},
      decisionReason: { type: 'other', reason: 'ok' },
    })
    const sessionId = 'sess-batch-cover'
    const guarded = wrapCanUseToolWithRepeatGuard(base, sessionId)
    const batchTool = {
      name: 'mcp__quotation__get_inventory_by_code_batch',
    } as never
    const singleTool = {
      name: 'mcp__quotation__get_inventory_by_code',
    } as never
    const subCtx = { agentId: 'quotation-agent' } as never
    const msg = {} as never

    const batchAllow = await guarded(
      batchTool,
      { codes: ['8010072478', '8010071402'] },
      subCtx,
      msg,
      'batch-1',
    )
    expect(batchAllow.behavior).toBe('allow')

    finalizeInventoryBatchByToolUseId('batch-1', {
      isError: false,
      content: {
        items: [{ code: '8010072478' }],
        stats: { found: 2 },
        formatted_response: 'ok',
      },
    })

    const denied = await guarded(
      singleTool,
      { code: '8010072478' },
      subCtx,
      msg,
      'single-1',
    )
    expect(denied.behavior).toBe('deny')
    if (denied.behavior === 'deny') {
      expect(denied.message).toContain('8010072478')
      expect(denied.message).toContain('formatted_response')
    }

    const otherCode = await guarded(
      singleTool,
      { code: '8010062288' },
      subCtx,
      msg,
      'single-2',
    )
    expect(otherCode.behavior).toBe('allow')
  })

  it('allows single inventory after batch failure or timeout', async () => {
    const base: CanUseToolFn = async () => ({
      behavior: 'allow',
      updatedInput: {},
      decisionReason: { type: 'other', reason: 'ok' },
    })
    const sessionId = 'sess-batch-fail'
    const guarded = wrapCanUseToolWithRepeatGuard(base, sessionId)
    const batchTool = {
      name: 'mcp__quotation__get_inventory_by_code_batch',
    } as never
    const singleTool = {
      name: 'mcp__quotation__get_inventory_by_code',
    } as never
    const subCtx = { agentId: 'quotation-agent' } as never
    const msg = {} as never

    await guarded(
      batchTool,
      { codes: ['8010072478'] },
      subCtx,
      msg,
      'batch-fail',
    )
    finalizeInventoryBatchByToolUseId('batch-fail', {
      isError: true,
      content: 'TIMEOUT',
    })

    const single = await guarded(
      singleTool,
      { code: '8010072478' },
      subCtx,
      msg,
      'single-fail',
    )
    expect(single.behavior).toBe('allow')
  })

  it('clears batch coverage on session reset', async () => {
    const base: CanUseToolFn = async () => ({
      behavior: 'allow',
      updatedInput: {},
      decisionReason: { type: 'other', reason: 'ok' },
    })
    const sessionId = 'sess-batch-reset'
    const guarded = wrapCanUseToolWithRepeatGuard(base, sessionId)
    const batchTool = {
      name: 'mcp__quotation__get_inventory_by_code_batch',
    } as never
    const singleTool = {
      name: 'mcp__quotation__get_inventory_by_code',
    } as never
    const subCtx = { agentId: 'quotation-agent' } as never
    const msg = {} as never

    await guarded(
      batchTool,
      { codes: ['8010072478'] },
      subCtx,
      msg,
      'batch-reset',
    )
    finalizeInventoryBatchByToolUseId('batch-reset', {
      isError: false,
      content: { items: [], stats: {}, formatted_response: 'ok' },
    })
    resetToolCallRepeatState(sessionId)

    const single = await guarded(
      singleTool,
      { code: '8010072478' },
      subCtx,
      msg,
      'single-reset',
    )
    expect(single.behavior).toBe('allow')
  })
})
