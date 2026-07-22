/**
 * Stage-1 P0 smoke runner for word-creator document toolchain.
 * Covers contract, lanes, MCP probe, and full outbound DOCX→PDF.
 *
 * Usage: node ccb-installer/scripts/smoke-word-creator-p0.mjs
 */
import { spawn } from 'node:child_process'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { readFileSync, existsSync } from 'node:fs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const scripts = join(root, 'scripts')

function runNode(rel, args = []) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [join(scripts, rel), ...args], {
      cwd: root,
      stdio: 'inherit',
      env: process.env,
    })
    child.on('exit', (code) => resolve(code ?? 1))
  })
}

function checkLanes() {
  const orch = join(root, 'packages', 'vertical', 'com.wanding.trade', 'agents', 'wande-orchestrator.md')
  const word = join(root, 'config', 'agents', 'word-creator.md')
  const o = readFileSync(orch, 'utf8')
  const w = readFileSync(word, 'utf8')
  const checks = [
    [o.includes('excel-creator'), 'orchestrator routes excel-creator'],
    [o.includes('ppt-creator'), 'orchestrator routes ppt-creator'],
    [w.includes('excel-creator') && w.includes('ppt-creator'), 'word-creator defers excel/ppt'],
    [w.includes('发客户') && w.includes('convert_to_pdf'), 'word-creator 发客户 → PDF'],
    [!w.includes('convert_pdf_to_word'), 'no black-box convert_pdf_to_word'],
  ]
  let failed = 0
  for (const [ok, label] of checks) {
    if (ok) console.log(`[smoke-word-p0] PASS lanes/intent: ${label}`)
    else {
      console.error(`[smoke-word-p0] FAIL lanes/intent: ${label}`)
      failed++
    }
  }
  return failed
}

console.log('[smoke-word-p0] === Stage 1 P0 suite ===')

let failed = checkLanes()

let code = await runNode('smoke-word-creator-contract.mjs')
if (code !== 0) failed++

code = await runNode('test-mcp-probe-layer.mjs', ['--server=office-word'])
if (code !== 0) failed++

code = await runNode('smoke-word-creator-outbound.mjs')
if (code !== 0) failed++

// Live seed + install script presence (packaging path)
const installScript = join(root, 'scripts', 'install-office-word-mcp.ps1')
const installTxt = readFileSync(installScript, 'utf8')
if (installTxt.includes('docx2pdf') && installTxt.includes('stub-bak') && installTxt.includes('addsitedir')) {
  console.log('[smoke-word-p0] PASS install-office-word-mcp.ps1 has PDF dep + stub quarantine + addsitedir')
} else {
  console.error('[smoke-word-p0] FAIL install script missing PDF/stub/addsitedir clauses')
  failed++
}

const liveWord = join(process.env.LOCALAPPDATA || '', 'CCB-Wanding', '.claude', 'agents', 'word-creator.md')
if (existsSync(liveWord) && readFileSync(liveWord, 'utf8').includes('出站闭环')) {
  console.log('[smoke-word-p0] PASS live agent seed deployed')
} else {
  console.warn('[smoke-word-p0] WARN live agent seed missing/stale')
}

if (failed) {
  console.error(`[smoke-word-p0] FAIL (${failed} suites)`)
  process.exit(1)
}
console.log('[smoke-word-p0] PASS all Stage 1 P0 automated suites')
console.log('[smoke-word-p0] NOTE: Guid LLM hand-chat substituted by MCP outbound (same convert_to_pdf path)')
process.exit(0)
