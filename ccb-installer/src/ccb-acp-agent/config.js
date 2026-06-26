import { join, resolve } from 'path'
import { existsSync } from 'fs'

export const AGENT_NAME = 'ccb-wanding'
export const AGENT_TITLE = 'CCB-Wanding'
export const AGENT_VERSION = '1.0.0'
export const MODEL =
  process.env.ANTHROPIC_DEFAULT_SONNET_MODEL || 'minimax-m3'

export const INSTALLER_DIR = resolve(import.meta.dir, '../..')

export function resolveInstallDir() {
  if (existsSync(join(INSTALLER_DIR, 'dist', 'cli.js'))) return INSTALLER_DIR
  return INSTALLER_DIR
}

export function defaultSessionCwd(requestCwd) {
  const installDir = resolveInstallDir()
  if (!requestCwd || typeof requestCwd !== 'string') return installDir
  const normalized = requestCwd.replace(/\\/g, '/').toLowerCase()
  if (
    normalized.includes('.aionui-web/conversations/') ||
    normalized.includes('claude-temp-')
  ) {
    return installDir
  }
  return requestCwd
}

export {}
