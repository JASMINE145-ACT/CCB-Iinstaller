import { existsSync, readFileSync } from 'fs'
import { join, resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const DEFAULT_API_BASE = 'https://api.minimaxi.com/anthropic'
const DEFAULT_MODEL = 'minimax-m3'
const DEFAULT_MAX_TOKENS = 1024
export const AGENT_MAX_TOKENS = 8192
export const STREAM_FIRST_DELTA_TIMEOUT_MS = 5000
const DEFAULT_TIMEOUT_MS = 30000

export const DEFAULT_MCP_ALLOW_LIST = ['quotation', 'accurate']

const RUNTIME_DIR = dirname(fileURLToPath(import.meta.url))
const DEFAULT_INSTALLER_DIR = resolve(RUNTIME_DIR, '../..')

export class ConfigError extends Error {
  constructor(message) {
    super(message)
    this.name = 'ConfigError'
  }
}

/**
 * @typedef {Object} RuntimeConfig
 * @property {string} apiBase
 * @property {string} apiKey
 * @property {string} model
 * @property {number} maxTokens
 * @property {number} timeoutMs
 */

/**
 * @typedef {Object} ResolvedPaths
 * @property {string} installerDir
 * @property {string} claudeConfigDir
 */

/**
 * @param {NodeJS.ProcessEnv | Record<string, string | undefined>} [env]
 * @returns {ResolvedPaths}
 */
export function resolvePaths(env = process.env) {
  const installerDir = env.CCB_INSTALLER_DIR || DEFAULT_INSTALLER_DIR
  const claudeConfigDir =
    env.CLAUDE_CONFIG_DIR ||
    (env.LOCALAPPDATA ? join(env.LOCALAPPDATA, 'CCB-Wanding', '.claude') : '')

  return { installerDir, claudeConfigDir }
}

/**
 * @param {NodeJS.ProcessEnv | Record<string, string | undefined>} [env]
 * @returns {RuntimeConfig}
 */
export function loadConfig(env = process.env) {
  const apiKey = env.ANTHROPIC_AUTH_TOKEN || ''
  if (apiKey.length < 20) {
    throw new ConfigError('ANTHROPIC_AUTH_TOKEN missing or too short')
  }

  const apiBase = env.ANTHROPIC_BASE_URL || DEFAULT_API_BASE
  if (!apiBase.startsWith('http://') && !apiBase.startsWith('https://')) {
    throw new ConfigError('ANTHROPIC_BASE_URL must be absolute')
  }

  const model = env.ANTHROPIC_DEFAULT_SONNET_MODEL || DEFAULT_MODEL
  const maxTokens = Number(env.CCB_RUNTIME_MAX_TOKENS || DEFAULT_MAX_TOKENS)
  const timeoutMs = Number(env.CCB_RUNTIME_TIMEOUT_MS || DEFAULT_TIMEOUT_MS)

  return {
    apiBase,
    apiKey,
    model,
    maxTokens: Number.isFinite(maxTokens) && maxTokens > 0 ? maxTokens : DEFAULT_MAX_TOKENS,
    timeoutMs: Number.isFinite(timeoutMs) && timeoutMs > 0 ? timeoutMs : DEFAULT_TIMEOUT_MS,
  }
}

/**
 * @param {NodeJS.ProcessEnv | Record<string, string | undefined>} [env]
 * @param {string[]} [allowList]
 * @returns {Record<string, import('./McpTransport.js').McpServerConfig>}
 */
export function loadMcpConfigs(env = process.env, allowList = DEFAULT_MCP_ALLOW_LIST) {
  const { claudeConfigDir } = resolvePaths(env)
  if (!claudeConfigDir) return {}

  const settingsPath = join(claudeConfigDir, 'settings.json')
  if (!existsSync(settingsPath)) return {}

  try {
    const raw = readFileSync(settingsPath, 'utf-8')
      .replace(/^\uFEFF/, '')
      .replace(/^锘\?/, '')
    const parsed = JSON.parse(raw)
    const all = parsed.mcpServers || {}
    const allowed = new Set(allowList)
    return Object.fromEntries(
      Object.entries(all).filter(([name]) => allowed.has(name)),
    )
  } catch {
    return {}
  }
}
