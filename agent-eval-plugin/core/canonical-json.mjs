import { createHash } from 'node:crypto'

function canonicalize(value, path = '$') {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') {
    return value
  }
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new TypeError(`${path} must be a finite number`)
    return value
  }
  if (Array.isArray(value)) {
    return value.map((item, index) => canonicalize(item, `${path}[${index}]`))
  }
  if (typeof value === 'object') {
    const result = {}
    for (const key of Object.keys(value).sort()) {
      if (value[key] === undefined) throw new TypeError(`${path}.${key} cannot be undefined`)
      result[key] = canonicalize(value[key], `${path}.${key}`)
    }
    return result
  }
  throw new TypeError(`${path} is not JSON-compatible`)
}

export function canonicalStringify(value) {
  return JSON.stringify(canonicalize(value))
}

export function sha256Canonical(value) {
  const digest = createHash('sha256').update(canonicalStringify(value)).digest('hex')
  return `sha256:${digest}`
}
