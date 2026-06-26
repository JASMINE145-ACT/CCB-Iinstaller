/**
 * Shared env loader for ccb-installer smoke tests (not imported by runtime).
 */
import { readFileSync, existsSync } from 'fs'
import { join } from 'path'

/**
 * @param {string} root ccb-installer directory
 */
export function loadSmokeEnv(root) {
  function expand(value) {
    return value.replace(/%LOCALAPPDATA%/gi, process.env.LOCALAPPDATA || '')
  }

  function applyEnvLine(key, value) {
    if (!process.env[key]) process.env[key] = expand(value)
  }

  const dotEnv = join(root, '.env.local')
  if (existsSync(dotEnv)) {
    for (const line of readFileSync(dotEnv, 'utf-8').split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
      if (!m) continue
      applyEnvLine(m[1], m[2].replace(/^["']|["']$/g, ''))
    }
  }

  const cmd = join(root, 'start-aionui.cmd')
  if (existsSync(cmd)) {
    for (const line of readFileSync(cmd, 'utf-8').split(/\r?\n/)) {
      const m = line.match(/^\s*set\s+([A-Z0-9_]+)=(.*)\s*$/i)
      if (!m) continue
      applyEnvLine(m[1], m[2])
    }
  }
}
