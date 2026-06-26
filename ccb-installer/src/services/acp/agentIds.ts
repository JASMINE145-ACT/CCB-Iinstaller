export function normalizeAgentId(id: string): string {
  return id
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function agentIdLookupCandidates(id: string): string[] {
  const trimmed = id.trim()
  const normalized = normalizeAgentId(trimmed)
  const stripped = trimmed.replace(/^builtin-/i, '')
  const strippedNormalized = normalizeAgentId(stripped)
  return [
    ...new Set([trimmed, normalized, stripped, strippedNormalized].filter(Boolean)),
  ]
}
