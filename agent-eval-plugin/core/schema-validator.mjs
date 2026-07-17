import { readFileSync } from 'node:fs'

const schemaFiles = {
  'eval.case/v1': '../schemas/eval.case.v1.schema.json',
  'eval.event/v1': '../schemas/eval.event.v1.schema.json',
  'eval.trace/v1': '../schemas/eval.trace.v1.schema.json',
  'eval.judgment/v1': '../schemas/eval.judgment.v1.schema.json',
  'eval.report/v1': '../schemas/eval.report.v1.schema.json',
}

const schemas = new Map(
  Object.entries(schemaFiles).map(([version, relativePath]) => [
    version,
    JSON.parse(readFileSync(new URL(relativePath, import.meta.url), 'utf8')),
  ]),
)

function matchesType(type, value) {
  if (Array.isArray(type)) return type.some((item) => matchesType(item, value))
  if (type === 'null') return value === null
  if (type === 'array') return Array.isArray(value)
  if (type === 'object') return value !== null && typeof value === 'object' && !Array.isArray(value)
  if (type === 'integer') return Number.isInteger(value)
  if (type === 'number') return typeof value === 'number' && Number.isFinite(value)
  return typeof value === type
}

function validateNode(schema, value, path, errors) {
  if (schema.const !== undefined && value !== schema.const) {
    errors.push(`${path} must equal ${JSON.stringify(schema.const)}`)
    return
  }
  if (schema.enum && !schema.enum.includes(value)) {
    errors.push(`${path} must be one of ${schema.enum.join(', ')}`)
    return
  }
  if (schema.type && !matchesType(schema.type, value)) {
    errors.push(`${path} must be ${Array.isArray(schema.type) ? schema.type.join(' or ') : schema.type}`)
    return
  }
  if (typeof value === 'number') {
    if (schema.minimum !== undefined && value < schema.minimum) {
      errors.push(`${path} must be >= ${schema.minimum}`)
    }
    if (schema.maximum !== undefined && value > schema.maximum) {
      errors.push(`${path} must be <= ${schema.maximum}`)
    }
  }
  if (Array.isArray(value)) {
    if (schema.minItems !== undefined && value.length < schema.minItems) {
      errors.push(`${path} must contain at least ${schema.minItems} item(s)`)
    }
    if (schema.items) {
      value.forEach((item, index) => validateNode(schema.items, item, `${path}[${index}]`, errors))
    }
    return
  }
  if (value !== null && typeof value === 'object') {
    for (const required of schema.required ?? []) {
      if (!Object.hasOwn(value, required)) errors.push(`${path}.${required} is required`)
    }
    for (const [key, childSchema] of Object.entries(schema.properties ?? {})) {
      if (Object.hasOwn(value, key)) validateNode(childSchema, value[key], `${path}.${key}`, errors)
    }
  }
}

export function validateContract(schemaVersion, value) {
  const schema = schemas.get(schemaVersion)
  if (!schema) throw new Error(`Unsupported schema version: ${schemaVersion}`)
  const errors = []
  validateNode(schema, value, '$', errors)
  return { valid: errors.length === 0, errors }
}
