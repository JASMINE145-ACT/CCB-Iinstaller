const requiredMethods = [
  'validateEnvironment',
  'startSession',
  'sendPrompt',
  'collectEvents',
  'snapshotState',
  'cleanup',
]

export function assertRuntimeAdapter(adapter) {
  if (!adapter || typeof adapter !== 'object') {
    throw new TypeError('Runtime Adapter is required')
  }
  if (typeof adapter.id !== 'string' || !adapter.id) {
    throw new TypeError('Runtime Adapter id is required')
  }
  const missing = requiredMethods.filter((method) => typeof adapter[method] !== 'function')
  if (missing.length > 0) {
    throw new TypeError(`Runtime Adapter is missing: ${missing.join(', ')}`)
  }
  return adapter
}
