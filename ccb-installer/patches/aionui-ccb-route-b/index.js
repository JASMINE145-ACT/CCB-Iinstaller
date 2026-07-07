#!/usr/bin/env node
/**
 * Route B ACP entry for AionUI claude-agent-acp dist slot.
 * Launches the original CCB-Wanding ACP runtime from a CCB-Wanding install.
 *
 * Important boundary:
 * - This file only mutates the current agent process environment.
 * - It does not write Windows user environment variables.
 * - It intentionally ignores inherited CLAUDE_CONFIG_DIR so official Claude Code
 *   global config cannot redirect this AionUI/CCB process.
 */
import { spawn } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { homedir } from 'node:os'

function walkUpForInstall(start) {
  let dir = start
  for (let i = 0; i < 24; i++) {
    if (
      existsSync(join(dir, 'dist', 'cli.js')) &&
      existsSync(join(dir, 'vendor', 'bun', 'bun.exe'))
    ) {
      return dir
    }
    const parent = dirname(dir)
    if (parent === dir) break
    dir = parent
  }
  return null
}

function resolveInstallDir() {
  const bundledInstall = walkUpForInstall(import.meta.dirname)
  const candidates = [
    process.env.CCB_WANDING_HOME,
    process.env.CCB_INSTALL_DIR,
    bundledInstall,
    join(process.env.LOCALAPPDATA ?? '', 'Programs', 'CCB-Wanding'),
    'D:\\CCB-Wanding',
  ].filter(Boolean)

  for (const dir of candidates) {
    if (
      existsSync(join(dir, 'dist', 'cli.js')) &&
      existsSync(join(dir, 'vendor', 'bun', 'bun.exe'))
    ) {
      return dir
    }
  }

  return null
}

function defaultConfigDir() {
  if (process.platform === 'win32' && process.env.LOCALAPPDATA) {
    return join(process.env.LOCALAPPDATA, 'CCB-Wanding', '.claude')
  }
  return join(homedir(), '.ccb-wanding', '.claude')
}

const installDir = resolveInstallDir()
if (!installDir) {
  console.error(
    '[ccb-native-acp-route] install not found: need dist/cli.js + vendor/bun/bun.exe',
  )
  process.exit(1)
}

process.env.CLAUDE_CONFIG_DIR = process.env.CCB_WANDING_CONFIG_DIR || defaultConfigDir()
process.env.NODE_TLS_REJECT_UNAUTHORIZED = process.env.NODE_TLS_REJECT_UNAUTHORIZED ?? '0'
process.env.CLAUDE_CODE_DISABLE_FAST_MODE = process.env.CLAUDE_CODE_DISABLE_FAST_MODE ?? '1'
process.env.CLAUDE_CODE_ENABLE_TELEMETRY = process.env.CLAUDE_CODE_ENABLE_TELEMETRY ?? '0'
process.env.CLAUDE_CODE_ACP_ALLOW_BYPASS_PERMISSIONS =
  process.env.CLAUDE_CODE_ACP_ALLOW_BYPASS_PERMISSIONS ?? 'true'
process.env.ENABLE_AUTOUPDATE_PLUGINS = process.env.ENABLE_AUTOUPDATE_PLUGINS ?? '0'
process.env.CCB_WANDING_SKIP_GROVE = process.env.CCB_WANDING_SKIP_GROVE ?? '1'
process.env.PYTHONNOUSERSITE = process.env.PYTHONNOUSERSITE ?? '1'
// Disable deferred tool loading (ExecuteExtraTool bypasses orchestrator MCP filter).
// Force — do not use ?? ; inherited auto:100 from shell would keep SearchExtraTools on.
process.env.ENABLE_SEARCH_EXTRA_TOOLS = 'false'

try {
  const settingsPath = join(process.env.CLAUDE_CONFIG_DIR, 'settings.json')
  const settings = JSON.parse(readFileSync(settingsPath, 'utf8').replace(/^\uFEFF/, ''))
  for (const [key, value] of Object.entries(settings.env ?? {})) {
    if (typeof value === 'string' && value && !process.env[key]) process.env[key] = value
  }
  if (process.env.ANTHROPIC_AUTH_TOKEN && !process.env.ANTHROPIC_API_KEY) {
    process.env.ANTHROPIC_API_KEY = process.env.ANTHROPIC_AUTH_TOKEN
  }
} catch (error) {
  console.error(`[ccb-native-acp-route] settings load failed: ${error?.message || error}`)
}

try {
  const conversationHandoffPath = join(
    process.env.CLAUDE_CONFIG_DIR,
    '.aionui-next-conversation-id.json',
  )
  if (existsSync(conversationHandoffPath)) {
    const pending = JSON.parse(
      readFileSync(conversationHandoffPath, 'utf8').replace(/^\uFEFF/, ''),
    )
    const conversationId = String(pending?.conversation_id ?? '').trim()
    const stagedAt = Date.parse(String(pending?.staged_at ?? ''))
    if (
      conversationId &&
      Number.isFinite(stagedAt) &&
      Date.now() - stagedAt <= 300_000 &&
      !process.env.CCB_CONVERSATION_ID
    ) {
      process.env.CCB_CONVERSATION_ID = conversationId
      console.error(`[ccb-native-acp-route] CCB_CONVERSATION_ID=${conversationId}`)
    }
  }
} catch (error) {
  console.error(
    `[ccb-native-acp-route] conversation handoff load failed: ${error?.message || error}`,
  )
}

const vendorPath = [
  join(installDir, 'vendor', 'python-wanding'),
  join(installDir, 'vendor', 'python-wanding', 'Scripts'),
  join(installDir, 'vendor', 'bun'),
  join(installDir, 'vendor', 'ripgrep'),
  join(installDir, 'vendor', 'git', 'bin'),
].join(process.platform === 'win32' ? ';' : ':')
process.env.PATH = `${vendorPath}${process.platform === 'win32' ? ';' : ':'}${process.env.PATH ?? ''}`

console.error(`[ccb-native-acp-route] install=${installDir}`)
console.error(`[ccb-native-acp-route] config=${process.env.CLAUDE_CONFIG_DIR}`)
console.error(
  `[ccb-native-acp-route] ENABLE_SEARCH_EXTRA_TOOLS=${process.env.ENABLE_SEARCH_EXTRA_TOOLS}`,
)

console.log = console.error
console.info = console.error
console.warn = console.error
console.debug = console.error

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason)
})

const bun = join(installDir, 'vendor', 'bun', 'bun.exe')
const cli = join(installDir, 'dist', 'cli.js')
const child = spawn(bun, [cli, '--acp'], {
  cwd: installDir,
  env: process.env,
  stdio: 'inherit',
  windowsHide: true,
})

child.on('error', error => {
  console.error(`[ccb-native-acp-route] spawn failed: ${error?.message || error}`)
  process.exit(1)
})

const code = await new Promise(resolve => {
  child.on('exit', (code, signal) => {
    if (signal) console.error(`[ccb-native-acp-route] child exited by signal ${signal}`)
    resolve(code ?? 1)
  })
})

process.exit(code)
