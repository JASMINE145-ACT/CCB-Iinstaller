type TranscriptRecord = Record<string, unknown>

function asRecord(value: unknown): TranscriptRecord | null {
  return value && typeof value === 'object'
    ? (value as TranscriptRecord)
    : null
}

function isAssistantEndTurn(message: unknown): boolean {
  const record = asRecord(message)
  if (!record || record.type !== 'assistant') {
    return false
  }

  const payload = asRecord(record.message) ?? record
  return (
    payload.stop_reason === 'end_turn' || payload.stopReason === 'end_turn'
  )
}

export function trimMessagesToCompleteTurnBoundary<T>(messages: T[]): T[] {
  let lastCompleteTurnIndex = -1

  for (let i = 0; i < messages.length; i++) {
    if (isAssistantEndTurn(messages[i])) {
      lastCompleteTurnIndex = i
    }
  }

  if (lastCompleteTurnIndex < 0) {
    return []
  }

  if (lastCompleteTurnIndex === messages.length - 1) {
    return messages
  }

  return messages.slice(0, lastCompleteTurnIndex + 1)
}
