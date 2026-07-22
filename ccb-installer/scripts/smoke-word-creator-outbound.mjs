/**
 * Smoke: word-creator P0 outbound closed loop (WANd.OFFICE.WORD.CLOSED_LOOP.001)
 *
 * Exercises office-word MCP: create → validate readback → convert_to_pdf → verify files.
 *
 * Usage:
 *   node ccb-installer/scripts/smoke-word-creator-outbound.mjs
 *   CCB_INSTALL_DIR=D:\CCB-Wanding node ...
 */
import { readFileSync, existsSync, mkdirSync, statSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import os from 'node:os'
import { createMcpTransport } from '../src/ccb-runtime/McpTransport.js'
import { resolveMcpServerCommand } from '../lib/mcp-health-manifest.mjs'

const install =
  process.env.CCB_INSTALL_DIR ||
  (existsSync('D:\\CCB-Wanding') ? 'D:\\CCB-Wanding' : null)
const configDir =
  process.env.CLAUDE_CONFIG_DIR ||
  join(os.homedir(), 'AppData', 'Local', 'CCB-Wanding', '.claude')

function fail(msg) {
  console.error(`[smoke-word-outbound] FAIL: ${msg}`)
  process.exit(1)
}

function pass(msg) {
  console.log(`[smoke-word-outbound] PASS: ${msg}`)
}

function assertFile(path, minBytes = 1) {
  if (!existsSync(path)) fail(`missing file: ${path}`)
  const size = statSync(path).size
  if (size < minBytes) fail(`file too small (${size} B): ${path}`)
  pass(`file ok (${size} B): ${path}`)
}

if (!install) fail('CCB_INSTALL_DIR not set and D:\\CCB-Wanding not found')

const settingsPath = join(configDir, 'settings.json')
if (!existsSync(settingsPath)) fail(`settings.json missing: ${settingsPath}`)

const settings = JSON.parse(readFileSync(settingsPath, 'utf8').replace(/^\uFEFF/, ''))
const cmd = resolveMcpServerCommand(install, 'office-word', settings.mcpServers ?? {})
if (!cmd || cmd.kind !== 'stdio') fail('office-word not configured in settings.json')

const smokeDir = join(install, 'smoke', 'word-creator-outbound')
mkdirSync(smokeDir, { recursive: true })
const stamp = new Date().toISOString().replace(/[:.]/g, '-')
const docxPath = join(smokeDir, `smoke-${stamp}.docx`)
const pdfPath = join(smokeDir, `smoke-${stamp}.pdf`)

const transport = createMcpTransport('office-word', {
  command: cmd.command,
  args: cmd.args,
  env: cmd.env,
  cwd: cmd.cwd,
  startupTimeoutMs: 90000,
})

try {
  if (!(await transport.connect())) fail('office-word connect failed')

  const tools = await transport.listTools()
  const toolNames = tools.map((t) => t.name)
  pass(`tools/list count=${toolNames.length}`)

  for (const required of [
    'create_document',
    'add_heading',
    'add_paragraph',
    'add_table',
    'get_document_text',
    'convert_to_pdf',
  ]) {
    if (!toolNames.includes(required)) fail(`missing tool: ${required}`)
  }
  pass('required tools present (incl. convert_to_pdf)')

  const createOut = await transport.callTool('create_document', {
    filename: docxPath,
    title: 'Smoke Outbound',
    author: 'smoke-word-creator-outbound',
  })
  if (/does not exist|failed|error/i.test(createOut) && !/success|created/i.test(createOut)) {
    fail(`create_document: ${createOut.slice(0, 240)}`)
  }
  pass('create_document')

  await transport.callTool('add_heading', {
    filename: docxPath,
    text: '出站闭环 Smoke',
    level: 1,
  })
  pass('add_heading')

  await transport.callTool('add_paragraph', {
    filename: docxPath,
    text: '本段用于 P0 出站 smoke：DOCX 生成后应自动可转 PDF。',
  })
  pass('add_paragraph')

  await transport.callTool('add_table', {
    filename: docxPath,
    rows: 3,
    cols: 3,
    data: [
      ['项目', 'Q1', 'Q2'],
      ['采购额', '100', '110'],
      ['销售额', '120', '130'],
    ],
  })
  pass('add_table')

  const textOut = await transport.callTool('get_document_text', { filename: docxPath })
  if (!textOut || textOut.trim().length < 20) fail('get_document_text returned empty/short body')
  if (!/出站闭环|采购额|销售额/.test(textOut)) {
    fail(`get_document_text missing expected content: ${textOut.slice(0, 200)}`)
  }
  pass('get_document_text validation (non-empty + key phrases)')

  assertFile(docxPath, 2000)

  const pdfOut = await transport.callTool(
    'convert_to_pdf',
    { filename: docxPath, output_filename: pdfPath },
    120000,
  )
  if (/Failed to convert|requires Microsoft Word/i.test(pdfOut)) {
    console.warn(`[smoke-word-outbound] WARN: convert_to_pdf soft-fail (MS Word?): ${pdfOut.slice(0, 300)}`)
    console.warn('[smoke-word-outbound] PARTIAL PASS: DOCX path verified; PDF skipped — install MS Word for full CLOSED_LOOP.001')
    process.exit(0)
  }
  if (!/successfully converted|PDF:/i.test(pdfOut) && !existsSync(pdfPath)) {
    fail(`convert_to_pdf: ${pdfOut.slice(0, 300)}`)
  }
  pass('convert_to_pdf')

  assertFile(pdfPath, 500)

  console.log('[smoke-word-outbound] PASS full outbound loop (DOCX + PDF)')
  process.exit(0)
} catch (e) {
  fail(e instanceof Error ? e.message : String(e))
} finally {
  await transport.close()
  try {
    if (existsSync(docxPath)) rmSync(docxPath, { force: true })
    if (existsSync(pdfPath)) rmSync(pdfPath, { force: true })
  } catch {
    /* leave artifacts for debug */
  }
}
