/**
 * Load and query ccb-installer/config/mcp-health-manifest.json
 */
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const MANIFEST_PATH = join(ROOT, 'config', 'mcp-health-manifest.json')

/** @typedef {import('../config/mcp-health-manifest.json')} McpHealthManifest */

let _cached = null

/** @returns {McpHealthManifest} */
export function loadMcpHealthManifest() {
  if (!_cached) {
    _cached = JSON.parse(readFileSync(MANIFEST_PATH, 'utf8').replace(/^\uFEFF/, ''))
  }
  return _cached
}

/** @param {string} installDir */
export function resolveMcpServerCommand(installDir, serverName, settingsMcpServers) {
  const entry = settingsMcpServers?.[serverName]
  if (!entry || typeof entry !== 'object') return null

  const raw = /** @type {Record<string, unknown>} */ (entry)
  if (raw.type === 'http' || raw.url) {
    return { kind: 'http', url: String(raw.url ?? '') }
  }

  const command = typeof raw.command === 'string' ? raw.command : ''
  if (!command) return null

  const args = Array.isArray(raw.args)
    ? raw.args.filter((a) => typeof a === 'string')
    : []
  const env =
    raw.env && typeof raw.env === 'object'
      ? Object.fromEntries(
          Object.entries(/** @type {Record<string, unknown>} */ (raw.env)).map(
            ([k, v]) => [k, String(v)],
          ),
        )
      : {}

  return {
    kind: 'stdio',
    command,
    args,
    env,
    cwd: installDir,
  }
}

export function manifestPath() {
  return MANIFEST_PATH
}

export function installerRoot() {
  return ROOT
}
