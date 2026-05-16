/**
 * Claude Code Ralph-style loop: Stop hook driver.
 * Reads `.claude/ralph/scratchpad.md`; on exit 2, stderr becomes blocking user
 * feedback and the query loop continues (see src/query.ts stop_hook_blocking).
 *
 * stdin: one JSON line (Stop hook input from Claude Code).
 */
import fs from 'fs'
import path from 'path'

function parseScalar(raw) {
  const v = raw.trim()
  if (v === 'true') return true
  if (v === 'false') return false
  if (v === 'null') return null
  if (/^-?\d+$/.test(v)) return parseInt(v, 10)
  if (
    (v.startsWith('"') && v.endsWith('"')) ||
    (v.startsWith("'") && v.endsWith("'"))
  ) {
    return v.slice(1, -1)
  }
  return v
}

function parseScratchpad(content) {
  const m = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/)
  if (!m) return null
  const raw = {}
  for (const line of m[1].split(/\r?\n/)) {
    if (!line.trim() || line.trim().startsWith('#')) continue
    const eq = line.indexOf(':')
    if (eq === -1) continue
    const key = line.slice(0, eq).trim()
    raw[key] = parseScalar(line.slice(eq + 1))
  }
  const frontmatter = normalizeFrontmatter(raw)
  return { frontmatter, body: m[2].trimEnd() }
}

/** Coerce YAML-adjacent strings ("20", "false") so caps and enabled work reliably */
function normalizeFrontmatter(raw) {
  const fm = { ...raw }
  const ni = parseInt(String(fm.inject_count ?? '0'), 10)
  fm.inject_count = Number.isFinite(ni) && ni >= 0 ? ni : 0
  const nm = parseInt(String(fm.max_iterations ?? '0'), 10)
  fm.max_iterations = Number.isFinite(nm) && nm >= 0 ? nm : 0
  const en = fm.enabled
  fm.enabled =
    en === false ||
    en === 'false' ||
    String(en).toLowerCase() === 'false'
      ? false
      : true
  if (fm.completion_promise != null && fm.completion_promise !== '') {
    fm.completion_promise = String(fm.completion_promise)
  }
  return fm
}

function serializeScratchpad(frontmatter, body) {
  const keys = Object.keys(frontmatter).sort()
  const lines = ['---']
  for (const k of keys) {
    const v = frontmatter[k]
    if (v === null) lines.push(`${k}: null`)
    else if (typeof v === 'boolean') lines.push(`${k}: ${v}`)
    else if (typeof v === 'number') lines.push(`${k}: ${v}`)
    else {
      const s = String(v).replace(/\\/g, '\\\\').replace(/"/g, '\\"')
      lines.push(`${k}: "${s}"`)
    }
  }
  lines.push('---', '', body.trimEnd() ? `${body.trimEnd()}\n` : '')
  return lines.join('\n')
}

function atomicWrite(filePath, data) {
  const dir = path.dirname(filePath)
  const tmp = path.join(dir, `.scratchpad.${process.pid}.tmp`)
  fs.writeFileSync(tmp, data, 'utf8')
  fs.renameSync(tmp, filePath)
}

function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

async function readStdin() {
  const chunks = []
  for await (const c of process.stdin) chunks.push(c)
  return Buffer.concat(chunks).toString('utf8').trim()
}

const raw = await readStdin()
if (!raw) process.exit(0)

let input
try {
  input = JSON.parse(raw)
} catch {
  process.exit(0)
}

if (input.hook_event_name !== 'Stop') process.exit(0)
if (input.agent_id) process.exit(0)

const cwd = input.cwd || process.cwd()
const scratchpadPath = path.join(cwd, '.claude', 'ralph', 'scratchpad.md')

if (!fs.existsSync(scratchpadPath)) process.exit(0)

const content = fs.readFileSync(scratchpadPath, 'utf8')
const parsed = parseScratchpad(content)
if (!parsed) process.exit(0)

const fm = { ...parsed.frontmatter }
if (fm.enabled === false) process.exit(0)

const last = (input.last_assistant_message || '').trim()
if (!last) process.exit(0)

let promiseToken =
  fm.completion_promise != null && fm.completion_promise !== ''
    ? String(fm.completion_promise)
    : 'COMPLETE'
if (promiseToken === 'null') promiseToken = 'COMPLETE'

const promiseRe = new RegExp(
  `<promise>\\s*${escapeRegExp(promiseToken)}\\s*</promise>`,
  'i',
)
if (promiseRe.test(last)) {
  fm.enabled = false
  atomicWrite(scratchpadPath, serializeScratchpad(fm, parsed.body))
  process.exit(0)
}

const maxIterations =
  typeof fm.max_iterations === 'number' ? fm.max_iterations : 0
let injectCount =
  typeof fm.inject_count === 'number' ? fm.inject_count : 0

if (maxIterations > 0 && injectCount >= maxIterations) {
  process.exit(0)
}

injectCount += 1
fm.inject_count = injectCount
atomicWrite(scratchpadPath, serializeScratchpad(fm, parsed.body))

const taskBody = parsed.body.trim()
const followUp =
  `[Ralph loop iteration ${injectCount}.]\n\n` +
  (taskBody ? `${taskBody}\n\n` : '') +
  `Continue the task above. When it is fully and genuinely complete, output exactly <promise>${promiseToken}</promise> (and only then).`

console.error(followUp)
process.exit(2)
