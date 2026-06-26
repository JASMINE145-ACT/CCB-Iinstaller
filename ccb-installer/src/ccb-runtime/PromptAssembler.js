import { existsSync, readFileSync } from 'fs'
import { join } from 'path'

const DEFAULT_SYSTEM =
  '你是 CCB-Wanding，万鼎业务 AI 助手，专注报价、库存、Accurate 数据。'

/**
 * @param {import('./Config.js').ResolvedPaths} paths
 * @param {{ prefix?: string, override?: string }} [options]
 * @returns {{ text: string, sources: string[] }}
 */
export function loadSystemPrompt(paths, options = {}) {
  if (options.override) {
    return { text: options.override, sources: ['override'] }
  }

  const candidates = [
    join(paths.installerDir, 'CLAUDE.md'),
    join(paths.claudeConfigDir, 'CLAUDE.md'),
    join(paths.claudeConfigDir, '..', 'CLAUDE.md'),
  ]

  const parts = []
  const sources = []
  for (const p of candidates) {
    try {
      if (existsSync(p)) {
        parts.push(readFileSync(p, 'utf-8').trim())
        sources.push(p)
      }
    } catch {
      /* skip unreadable */
    }
  }

  let text = parts.join('\n\n') || DEFAULT_SYSTEM
  if (!parts.length) sources.push('fallback')

  if (options.prefix) {
    text = `${options.prefix.trim()}\n\n${text}`
  }

  return { text, sources }
}
