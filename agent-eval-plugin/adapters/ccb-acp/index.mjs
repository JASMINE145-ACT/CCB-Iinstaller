import { assertRuntimeAdapter } from '../../adapter-sdk/index.mjs'
import { normalizeCcbAcpUpdates } from './event-normalizer.mjs'

const requiredTransportMethods = [
  'validateEnvironment',
  'startSession',
  'sendPrompt',
  'collectUpdates',
  'snapshotState',
  'cleanup',
]

export function createCcbAcpAdapter({ transport }) {
  if (!transport || typeof transport !== 'object') throw new TypeError('CCB ACP transport is required')
  const missing = requiredTransportMethods.filter((method) => typeof transport[method] !== 'function')
  if (missing.length > 0) throw new TypeError(`CCB ACP transport is missing: ${missing.join(', ')}`)

  return assertRuntimeAdapter({
    id: 'ccb-acp',
    validateEnvironment(context) {
      return transport.validateEnvironment(context)
    },
    startSession(context) {
      return transport.startSession(context)
    },
    sendPrompt(session, prompt, context) {
      return transport.sendPrompt(session, prompt, context)
    },
    async collectEvents(session, { traceId, actor }) {
      const updates = await transport.collectUpdates(session)
      return normalizeCcbAcpUpdates(updates, { traceId, actor })
    },
    snapshotState(session, context) {
      return transport.snapshotState(session, context)
    },
    cleanup(session, context) {
      return transport.cleanup(session, context)
    },
  })
}
