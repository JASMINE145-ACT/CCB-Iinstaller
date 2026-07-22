function extractAssistantText(combined) {
  const marker = '[assistant_text]'
  const idx = combined.lastIndexOf(marker)
  if (idx === -1) return ''
  return combined.slice(idx + marker.length).trim()
}

export function validateResponseAssertionShape(outcome) {
  const errors = []
  for (const field of ['response_includes_any', 'response_matches_all']) {
    const value = outcome?.[field]
    if (value !== undefined && !Array.isArray(value)) {
      errors.push(`${field} must be an array`)
    }
  }
  if (Array.isArray(outcome?.response_matches_all)) {
    for (const pattern of outcome.response_matches_all) {
      try {
        new RegExp(pattern, 'iu')
      } catch {
        errors.push(`invalid response_matches_all pattern (${pattern})`)
      }
    }
  }
  return errors
}

export function checkResponseAssertions(outcome, combined) {
  const failures = []
  const assistantText = extractAssistantText(combined)
  const legacyHaystack = assistantText || combined

  if (outcome.response_includes_any?.length) {
    const hit = outcome.response_includes_any.some((pattern) => legacyHaystack.includes(pattern))
    if (!hit) {
      failures.push(`missing response cue (${outcome.response_includes_any.join('|')})`)
    }
  }

  for (const pattern of outcome.response_matches_all || []) {
    let matched = false
    try {
      matched = new RegExp(pattern, 'iu').test(assistantText)
    } catch {
      failures.push(`invalid required response pattern (${pattern})`)
      continue
    }
    if (!matched) {
      failures.push(`missing required response pattern (${pattern})`)
    }
  }

  return failures
}
