import { validateContract } from './schema-validator.mjs'

function clone(value) {
  return structuredClone(value)
}

export function createEventLog(traceId, { clock = () => new Date().toISOString() } = {}) {
  if (typeof traceId !== 'string' || !traceId) throw new TypeError('traceId is required')
  const events = []

  function append(payload, origin) {
    const event = {
      ...clone(payload),
      schema_version: 'eval.event/v1',
      event_id: `evt-${events.length + 1}`,
      trace_id: traceId,
      sequence: events.length + 1,
      timestamp: clock(),
      origin,
    }
    const validation = validateContract('eval.event/v1', event)
    if (!validation.valid) throw new Error(`Invalid Event: ${validation.errors.join('; ')}`)
    events.push(clone(event))
    return clone(event)
  }

  return {
    appendRaw(payload) {
      return append(payload, 'raw')
    },

    appendDerived(payload) {
      if (!Array.isArray(payload.derived_from) || payload.derived_from.length === 0) {
        throw new Error('Derived Event requires derived_from evidence')
      }
      const sources = payload.derived_from.map((eventId) => {
        const source = events.find((event) => event.event_id === eventId)
        if (!source) throw new Error(`Unknown derived_from event: ${eventId}`)
        return source
      })
      if (payload.status === 'ok' && sources.every(({ type }) => type === 'assistant.message')) {
        throw new Error('assistant claims cannot be the sole evidence for derived success')
      }
      return append(payload, 'derived')
    },

    snapshot() {
      return clone(events)
    },
  }
}
