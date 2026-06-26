export const CCB_API_VERSION = '0.1.0'

/**
 * @param {{ sessionManager: { count: () => number } }} deps
 */
export function createHealth(deps) {
  return () => ({
    ok: true,
    version: CCB_API_VERSION,
    runtime: 'ccb-runtime',
    sessions: deps.sessionManager.count(),
  })
}

export {}
