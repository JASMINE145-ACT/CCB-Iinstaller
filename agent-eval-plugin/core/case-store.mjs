import { sha256Canonical } from './canonical-json.mjs'
import { validateContract } from './schema-validator.mjs'

function validateCase(value) {
  const result = validateContract('eval.case/v1', value)
  if (!result.valid) throw new Error(`Invalid eval Case: ${result.errors.join('; ')}`)
}

function hashPayload(value) {
  const payload = structuredClone(value)
  delete payload.status
  delete payload.case_hash
  delete payload.confirmed_at
  return payload
}

export function createCaseDraft(input) {
  const draft = structuredClone(input)
  delete draft.case_hash
  delete draft.confirmed_at
  draft.schema_version = 'eval.case/v1'
  draft.status = 'draft'
  validateCase(draft)
  return draft
}

export function confirmCase(draft, { confirmed, confirmedAt = new Date().toISOString() }) {
  if (confirmed !== true) throw new Error('Explicit user confirmation is required')
  validateCase(draft)
  const locked = structuredClone(draft)
  locked.status = 'locked'
  locked.confirmed_at = confirmedAt
  locked.case_hash = sha256Canonical(hashPayload(locked))
  return locked
}

export function verifyCaseLock(value) {
  if (value?.status !== 'locked' || typeof value?.case_hash !== 'string') {
    throw new Error('Case must be confirmed and locked')
  }
  validateCase(value)
  const actual = sha256Canonical(hashPayload(value))
  if (actual !== value.case_hash) {
    throw new Error(`Case hash mismatch: expected ${value.case_hash}, got ${actual}`)
  }
  return true
}

export function assertCaseRunnable(value) {
  return verifyCaseLock(value)
}
