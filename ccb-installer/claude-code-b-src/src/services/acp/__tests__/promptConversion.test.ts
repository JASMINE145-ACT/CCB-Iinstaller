import { describe, expect, test } from 'bun:test'
import {
  isEmptyPromptSubmitInput,
  promptToSubmitInput,
  promptToQueryInput,
} from '../promptConversion.js'

describe('promptToSubmitInput', () => {
  test('text-only returns plain string', () => {
    expect(
      promptToSubmitInput([{ type: 'text', text: '查询直接50价格' } as never]),
    ).toBe('查询直接50价格')
  })

  test('embedded resource wraps context like legacy promptToClaude', () => {
    expect(
      promptToSubmitInput([
        { type: 'text', text: 'hello' } as never,
        {
          type: 'resource',
          resource: {
            uri: 'file:///tmp/spec.md',
            text: 'resource body',
          },
        } as never,
      ]),
    ).toBe(
      'hello\n[@spec.md](file:///tmp/spec.md)\n\n<context ref="file:///tmp/spec.md">\nresource body\n</context>',
    )
  })

  test('image block returns anthropic content array', () => {
    const input = promptToSubmitInput([
      { type: 'text', text: '查询价格' } as never,
      {
        type: 'image',
        data: 'aGVsbG8=',
        mimeType: 'image/png',
      } as never,
    ])
    expect(Array.isArray(input)).toBe(true)
    if (!Array.isArray(input)) throw new Error('expected array')
    expect(input).toHaveLength(2)
    expect(input[0]).toEqual({ type: 'text', text: '查询价格' })
    expect(input[1]).toEqual({
      type: 'image',
      source: { type: 'base64', data: 'aGVsbG8=', media_type: 'image/png' },
    })
  })

  test('image http uri returns url source block', () => {
    const input = promptToSubmitInput([
      {
        type: 'image',
        uri: 'https://example.com/price-list.png',
      } as never,
    ])
    expect(Array.isArray(input)).toBe(true)
    if (!Array.isArray(input)) throw new Error('expected array')
    expect(input).toEqual([
      {
        type: 'image',
        source: {
          type: 'url',
          url: 'https://example.com/price-list.png',
        },
      },
    ])
    expect(isEmptyPromptSubmitInput(input)).toBe(false)
  })

  test('image-only prompt is not empty', () => {
    const input = promptToSubmitInput([
      { type: 'image', data: 'abc', mimeType: 'image/jpeg' } as never,
    ])
    expect(isEmptyPromptSubmitInput(input)).toBe(false)
  })

  test('promptToQueryInput drops images (legacy)', () => {
    expect(
      promptToQueryInput([
        { type: 'text', text: '查询价格' } as never,
        { type: 'image', data: 'abc', mimeType: 'image/png' } as never,
      ]),
    ).toBe('查询价格')
  })

  test('resource_link stays metadata text', () => {
    expect(
      promptToQueryInput([
        {
          type: 'resource_link',
          name: 'Spec',
          uri: 'file:///tmp/spec.md',
        } as never,
      ]),
    ).toBe('Resource link: name=Spec, uri=file:///tmp/spec.md')
  })
})
