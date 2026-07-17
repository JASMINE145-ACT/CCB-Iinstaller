import assert from 'node:assert/strict'
import test from 'node:test'

import { createEventLog } from '../core/event-log.mjs'

test('appends immutable raw events with stable sequence and provenance', () => {
  const times = [
    '2026-07-15T10:00:00.000Z',
    '2026-07-15T10:00:01.000Z',
  ]
  const log = createEventLog('trace-1', { clock: () => times.shift() })

  const first = log.appendRaw({
    type: 'knowledge.read',
    actor: 'quotation-agent',
    action: 'knowledge.read',
    status: 'ok',
    raw_event_ref: 'adapter://ccb-acp/1',
  })
  const second = log.appendRaw({
    type: 'tool.call.completed',
    actor: 'quotation-agent',
    action: 'quotation.match',
    status: 'ok',
    input: { customer_level: 'B' },
    raw_event_ref: 'adapter://ccb-acp/2',
  })

  assert.deepEqual(
    [first.event_id, first.sequence, first.origin, second.event_id, second.sequence],
    ['evt-1', 1, 'raw', 'evt-2', 2],
  )
  first.action = 'mutated-outside'
  assert.equal(log.snapshot()[0].action, 'knowledge.read')
})

test('derived events require valid raw evidence references', () => {
  const log = createEventLog('trace-2')
  const source = log.appendRaw({
    type: 'tool.call.completed',
    actor: 'quotation-agent',
    action: 'quotation.match',
    status: 'ok',
  })

  const derived = log.appendDerived({
    type: 'artifact.created',
    actor: 'harness',
    action: 'assistant.table',
    status: 'ok',
    derived_from: [source.event_id],
  })
  assert.equal(derived.origin, 'derived')
  assert.deepEqual(derived.derived_from, ['evt-1'])
  assert.throws(
    () => log.appendDerived({
      type: 'artifact.created',
      actor: 'harness',
      action: 'assistant.table',
      status: 'ok',
      derived_from: ['evt-missing'],
    }),
    /Unknown derived_from event: evt-missing/,
  )
})

test('does not derive successful business evidence only from assistant claims', () => {
  const log = createEventLog('trace-3')
  const claim = log.appendRaw({
    type: 'assistant.message',
    actor: 'quotation-agent',
    action: 'assistant.message',
    status: 'ok',
    output: { text: 'I checked the inventory.' },
  })

  assert.throws(
    () => log.appendDerived({
      type: 'state.snapshot',
      actor: 'harness',
      action: 'inventory.query',
      status: 'ok',
      derived_from: [claim.event_id],
    }),
    /assistant claims cannot be the sole evidence/,
  )
})
