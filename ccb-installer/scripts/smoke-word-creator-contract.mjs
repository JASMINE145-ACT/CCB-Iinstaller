/**
 * Contract smoke: word-creator.md + orchestrator contain P0 outbound clauses.
 */
import { readFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const files = [
  join(root, 'config', 'agents', 'word-creator.md'),
  join(root, 'packages', 'vertical', 'com.wanding.trade', 'agents', 'wande-orchestrator.md'),
]

const required = [
  { file: 'word-creator.md', patterns: ['mcp__office-word__convert_to_pdf', '出站闭环', '当前未接线'] },
  { file: 'wande-orchestrator.md', patterns: ['word-creator', 'convert_to_pdf', '再问用户要不要 PDF'] },
]

let failed = 0
for (const rel of files) {
  if (!existsSync(rel)) {
    console.error(`[smoke-word-contract] FAIL missing ${rel}`)
    failed++
    continue
  }
  const text = readFileSync(rel, 'utf8')
  const label = rel.includes('word-creator') ? 'word-creator.md' : 'wande-orchestrator.md'
  const reqs = required.find((r) => r.file === label)?.patterns ?? []
  for (const p of reqs) {
    if (!text.includes(p)) {
      console.error(`[smoke-word-contract] FAIL ${label} missing: ${p}`)
      failed++
    } else {
      console.log(`[smoke-word-contract] PASS ${label} has: ${p}`)
    }
  }
}

const liveAgent = join(
  process.env.LOCALAPPDATA || '',
  'CCB-Wanding',
  '.claude',
  'agents',
  'word-creator.md',
)
if (existsSync(liveAgent)) {
  const live = readFileSync(liveAgent, 'utf8')
  if (live.includes('出站闭环')) {
    console.log('[smoke-word-contract] PASS live install word-creator.md has 出站闭环')
  } else {
    console.warn('[smoke-word-contract] WARN live install word-creator.md may be stale (no 出站闭环)')
  }
} else {
  console.warn('[smoke-word-contract] WARN live agent md not found (skip deploy check)')
}

if (failed) process.exit(1)
console.log('[smoke-word-contract] PASS all contract clauses')
process.exit(0)
