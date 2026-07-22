import { describe, expect, it } from 'bun:test'
import {
  BRIEF_MARKER,
  formatHandoffBrief,
  isStructuredHandoffBrief,
  normalizeHandoffBriefPrompt,
  parseHandoffBrief,
  type HandoffBrief,
} from '../handoffBrief.js'

describe('handoffBrief WANd.RUN.EXECUTION.003', () => {
  it('detects structured brief by marker', () => {
    expect(isStructuredHandoffBrief('查直接50')).toBe(false)
    expect(
      isStructuredHandoffBrief(`${BRIEF_MARKER}\n## Goal\nx\n## Effort\nlow\n`),
    ).toBe(true)
  })

  it('wraps free-text prompt into brief markdown', () => {
    const { prompt, wrapped, brief } = normalizeHandoffBriefPrompt('查直接50价格')
    expect(wrapped).toBe(true)
    expect(prompt).toContain(BRIEF_MARKER)
    expect(prompt).toContain('## Goal')
    expect(brief.goal).toBe('查直接50价格')
    expect(brief.effort).toBe('low')
    expect(parseHandoffBrief(prompt)?.goal).toBe('查直接50价格')
  })

  it('round-trips a full brief', () => {
    const source: HandoffBrief = {
      goal: '查直接50 B价',
      inputs: '客户档 B',
      expected_output: '价格表',
      prohibitions: '不查库存',
      effort: 'medium',
    }
    const md = formatHandoffBrief(source)
    const parsed = parseHandoffBrief(md)
    expect(parsed).toEqual(source)
    const again = normalizeHandoffBriefPrompt(md)
    expect(again.wrapped).toBe(false)
    expect(again.brief.goal).toBe(source.goal)
    expect(again.brief.effort).toBe('medium')
  })

  it('rejects empty goal when normalizing whitespace-only', () => {
    const { brief, prompt } = normalizeHandoffBriefPrompt('   ')
    expect(brief.goal.length).toBeGreaterThan(0)
    expect(prompt).toContain(BRIEF_MARKER)
  })

  it('does not nest markers when malformed brief lacks Goal', () => {
    const malformed = `${BRIEF_MARKER}\n## Effort\nlow\n`
    const { prompt, brief } = normalizeHandoffBriefPrompt(malformed)
    expect(prompt.indexOf(BRIEF_MARKER)).toBe(prompt.lastIndexOf(BRIEF_MARKER))
    expect(brief.goal).not.toContain(BRIEF_MARKER)
  })
})
