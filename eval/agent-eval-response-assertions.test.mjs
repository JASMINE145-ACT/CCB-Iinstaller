import assert from 'node:assert/strict'
import test from 'node:test'

import {
  checkResponseAssertions,
  validateResponseAssertionShape,
} from './agent-eval-response-assertions.mjs'

test('response_matches_all requires both artifact path and success count', () => {
  const outcome = {
    response_matches_all: [
      '(?:\\.xlsx|Wanding-Quotation)',
      '(?:filled_count|\\d+\\s*items?)',
    ],
  }

  const pathOnly = '[assistant_text] File: Wanding-Quotation_20260716.xlsx'
  assert.deepEqual(checkResponseAssertions(outcome, pathOnly), [
    'missing required response pattern ((?:filled_count|\\d+\\s*items?))',
  ])

  const complete = '[assistant_text] File: Wanding-Quotation_20260716.xlsx; completed 1 item.'
  assert.deepEqual(checkResponseAssertions(outcome, complete), [])
})

test('response assertions inspect final assistant text instead of tool logs', () => {
  const outcome = {
    response_matches_all: ['(?:\\.xlsx|Wanding-Quotation)', 'filled_count'],
  }
  const combined = [
    '[tool_result] {"output_path":"Wanding-Quotation_tool.xlsx","filled_count":1}',
    '[assistant_text] The quotation will be generated now.',
  ].join('\n')

  assert.deepEqual(checkResponseAssertions(outcome, combined), [
    'missing required response pattern ((?:\\.xlsx|Wanding-Quotation))',
    'missing required response pattern (filled_count)',
  ])

  const emptyParent = '[tool_result] {"output_path":"Wanding-Quotation_tool.xlsx","filled_count":1}\n[assistant_text]'
  assert.deepEqual(checkResponseAssertions(outcome, emptyParent), [
    'missing required response pattern ((?:\\.xlsx|Wanding-Quotation))',
    'missing required response pattern (filled_count)',
  ])
})

test('response assertion schema rejects malformed arrays and regex patterns', () => {
  assert.deepEqual(
    validateResponseAssertionShape({
      response_includes_any: 'not-an-array',
      response_matches_all: ['['],
    }),
    ['response_includes_any must be an array', 'invalid response_matches_all pattern ([)'],
  )
})
