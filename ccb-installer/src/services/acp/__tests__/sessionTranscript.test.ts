import { describe, expect, test } from 'bun:test'

import { trimMessagesToCompleteTurnBoundary } from '../sessionTranscript.js'

describe('trimMessagesToCompleteTurnBoundary', () => {
  test('keeps a transcript that already ends at an assistant end_turn', () => {
    const messages = [
      { type: 'user', message: { content: 'hello' } },
      {
        type: 'assistant',
        message: { content: [{ type: 'text', text: 'hi' }], stop_reason: 'end_turn' },
      },
    ]

    expect(trimMessagesToCompleteTurnBoundary(messages)).toBe(messages)
  })

  test('drops interrupted user and assistant tail after the last complete turn', () => {
    const messages = [
      { type: 'user', message: { content: 'old prompt' } },
      {
        type: 'assistant',
        message: { content: [{ type: 'text', text: 'old answer' }], stop_reason: 'end_turn' },
      },
      { type: 'user', message: { content: 'interrupted prompt' } },
      {
        type: 'assistant',
        message: { content: [{ type: 'text', text: 'partial answer' }], stop_reason: null },
      },
    ]

    expect(trimMessagesToCompleteTurnBoundary(messages)).toEqual(messages.slice(0, 2))
  })

  test('drops an initial unfinished turn instead of asking the SDK to continue it', () => {
    const messages = [
      { type: 'user', message: { content: 'first prompt' } },
      {
        type: 'assistant',
        message: { content: [{ type: 'tool_use', id: 'toolu_1' }], stop_reason: 'tool_use' },
      },
      { type: 'user', message: { content: [{ type: 'tool_result', tool_use_id: 'toolu_1' }] } },
    ]

    expect(trimMessagesToCompleteTurnBoundary(messages)).toEqual([])
  })
})
