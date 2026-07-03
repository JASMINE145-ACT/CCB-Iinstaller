/**
 * Load and query ccb-installer/config/mcp-health-manifest.json
 */
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const MANIFEST_PATH = join(ROOT, 'config', 'mcp-health-manifest.json')

/** @typedef {import('../config/mcp-health-manifest.json')} McpHealthManifest */

const cache = new Map()

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8').replace(/^\uFEFF/, ''))
}

/** @returns {McpHealthManifest} */
export function loadMcpHealthManifest({ includePackages = true } = {}) {
  const cacheKey = includePackages ? 'full' : 'platform'
  if (!cache.has(cacheKey)) {
    const platform = readJson(MANIFEST_PATH)
    const composed = {
      ...platform,
      mcp_servers: { ...platform.mcp_servers },
      agent_profiles: { ...platform.agent_profiles },
    }
    if (includePackages) {
      for (const relativePath of platform.package_health_manifests ?? []) {
        const packageHealth = readJson(join(ROOT, relativePath))
        for (const [id, descriptor] of Object.entries(
          packageHealth.mcp_servers ?? {},
        )) {
          if (composed.mcp_servers[id]) {
            throw new Error(`Duplicate MCP health descriptor: ${id}`)
          }
          composed.mcp_servers[id] = descriptor
        }
        for (const [id, descriptor] of Object.entries(
          packageHealth.agent_profiles ?? {},
        )) {
          if (composed.agent_profiles[id]) {
            throw new Error(`Duplicate agent health profile: ${id}`)
          }
          composed.agent_profiles[id] = descriptor
        }
      }
    }
    cache.set(cacheKey, composed)
  }
  return cache.get(cacheKey)
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
