export function evidenceRefs(events) {
  return events.map(({ event_id }) => `event://${event_id}`)
}

export function result(grader, status, reasonCode, events, details = {}) {
  return {
    grader_id: grader.id,
    type: grader.type,
    severity: grader.severity,
    status,
    evidence_refs: evidenceRefs(events),
    reason_code: reasonCode,
    details,
  }
}

export function eventsForAction(events, action) {
  return events.filter((event) => event.action === action)
}

export function getPath(value, path) {
  return path.split('.').reduce((current, key) => current?.[key], value)
}

function pathTokens(path) {
  const tokens = []
  let token = ''
  let bracketDepth = 0
  for (const character of path) {
    if (character === '[') bracketDepth += 1
    if (character === ']') bracketDepth -= 1
    if (character === '.' && bracketDepth === 0) {
      tokens.push(token)
      token = ''
    } else {
      token += character
    }
  }
  if (token) tokens.push(token)
  return tokens
}

export function resolveEvidenceExpression(events, expression) {
  const actions = [...new Set(events.map(({ action }) => action))]
    .sort((left, right) => right.length - left.length)
  const action = actions.find((candidate) => (
    expression === candidate || expression.startsWith(`${candidate}.`)
  ))
  if (!action) return []

  const event = eventsForAction(events, action).at(-1)
  const path = expression === action ? '' : expression.slice(action.length + 1)
  let values = [event]

  for (const token of pathTokens(path)) {
    const wildcard = token.match(/^([^[]+)\[\*\]$/)
    const filter = token.match(/^([^[]+)\[([^=]+)=\$(.+)\]$/)
    if (wildcard) {
      values = values.flatMap((value) => {
        const collection = value?.[wildcard[1]]
        return Array.isArray(collection) ? collection : []
      })
      continue
    }
    if (filter) {
      const expected = resolveEvidenceExpression(events, filter[3])
      values = values.flatMap((value) => {
        const collection = value?.[filter[1]]
        if (!Array.isArray(collection)) return []
        return collection.filter((item) => expected.includes(item?.[filter[2]]))
      })
      continue
    }
    values = values
      .map((value) => value?.[token])
      .flatMap((value) => Array.isArray(value) ? value : [value])
      .filter((value) => value !== undefined)
  }
  return values
}

export function valuesEqual(left, right) {
  return left.length === right.length && left.every((value, index) => (
    JSON.stringify(value) === JSON.stringify(right[index])
  ))
}
