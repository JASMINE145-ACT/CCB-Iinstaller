import { describe, expect, it } from 'bun:test'
import {
  denyOrPartialAskUser,
  encodeAskUserOptionId,
  resolveAskUserSelection,
} from '../askUserQuestionPermissionResolve.js'

describe('resolveAskUserSelection', () => {
  const question = {
    options: [{ label: '0.6MPa' }, { label: '1.0MPa' }],
  }

  it('accepts listed option labels', () => {
    const id = encodeAskUserOptionId(0, '0.6MPa')
    const result = resolveAskUserSelection(id, 0, question)
    expect(result).toEqual({ ok: true, answer: '0.6MPa' })
  })

  it('accepts free-text custom answers', () => {
    const id = encodeAskUserOptionId(0, 'PN10 给水管')
    const result = resolveAskUserSelection(id, 0, question)
    expect(result).toEqual({ ok: true, answer: 'PN10 给水管' })
  })
})

describe('denyAskUserQuestionUseChat', () => {
  it('denies with chat-only instruction', async () => {
    const { denyAskUserQuestionUseChat } = await import(
      '../askUserQuestionPermissionResolve.js'
    )
    const result = denyAskUserQuestionUseChat('tool-auq-1')
    expect(result.behavior).toBe('deny')
    expect(result.message).toContain('AskUserQuestion')
    expect(result.message).toContain('聊天')
    expect(result.toolUseID).toBe('tool-auq-1')
  })
})

describe('denyOrPartialAskUser', () => {
  const input = { questions: [{ question: 'Q1', options: [] }] }

  it('denies when no answers collected', () => {
    const result = denyOrPartialAskUser(input, {}, {}, 'tool-1', 'cancelled')
    expect(result.behavior).toBe('deny')
  })

  it('allows partial answers when later question cancelled', () => {
    const result = denyOrPartialAskUser(
      input,
      {},
      { 'PE 压力等级?': '0.6MPa' },
      'tool-1',
      'cancelled',
    )
    expect(result).toEqual({
      behavior: 'allow',
      updatedInput: {
        questions: input.questions,
        answers: { 'PE 压力等级?': '0.6MPa' },
      },
    })
  })
})
