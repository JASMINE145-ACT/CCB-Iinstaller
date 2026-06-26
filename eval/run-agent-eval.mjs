#!/usr/bin/env node
/**
 * Agent eval runner — schema check + optional live ACP smoke.
 * See eval/README.md for case fields and fix log.
 * Alternative success paths: pass_if_any[] with per-branch expected_tools / response_includes_any.
 */
import { spawn } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const defaultCasesPath = resolve(repoRoot, 'eval', 'agent_eval_cases.jsonl')

const args = process.argv.slice(2)
const runLive = args.includes('--run')
const route = args.includes('--route')
const casesPath = valueAfter('--cases') || defaultCasesPath
const onlyId = valueAfter('--case')
const onlyCategory = valueAfter('--category')

function valueAfter(flag) {
  const idx = args.indexOf(flag)
  return idx >= 0 ? args[idx + 1] : ''
}

function readCases(path) {
  return readFileSync(path, 'utf8')
    .split(/\r?\n/)
    .map((line, index) => ({ line: line.trim(), lineNo: index + 1 }))
    .filter(({ line }) => line && !line.startsWith('#'))
    .map(({ line, lineNo }) => {
      try {
        return { lineNo, value: JSON.parse(line) }
      } catch (error) {
        throw new Error(`${path}:${lineNo}: invalid JSON: ${error.message}`)
      }
    })
}

function validateCase(testCase, lineNo) {
  const errors = []
  for (const field of ['id', 'category', 'agent', 'input', 'risk_level']) {
    if (typeof testCase[field] !== 'string' || !testCase[field].trim()) errors.push(`missing ${field}`)
  }
  for (const field of ['expected_tools', 'forbidden_tools', 'must_not']) {
    if (testCase[field] !== undefined && !Array.isArray(testCase[field])) errors.push(`${field} must be an array`)
  }
  if (testCase.expected_params !== undefined && (testCase.expected_params === null || typeof testCase.expected_params !== 'object' || Array.isArray(testCase.expected_params))) {
    errors.push('expected_params must be an object')
  }
  if (testCase.timeout_ms !== undefined && (!Number.isFinite(testCase.timeout_ms) || testCase.timeout_ms <= 0)) {
    errors.push('timeout_ms must be a positive number')
  }
  if (testCase.pass_if_any !== undefined) {
    if (!Array.isArray(testCase.pass_if_any) || testCase.pass_if_any.length === 0) {
      errors.push('pass_if_any must be a non-empty array')
    } else {
      for (const outcome of testCase.pass_if_any) {
        if (typeof outcome?.id !== 'string' || !outcome.id.trim()) {
          errors.push('pass_if_any outcome missing id')
        }
      }
    }
  } else if (
    !testCase.expected_tools?.length &&
    !testCase.expected_error_codes?.length &&
    !testCase.allow_empty_tools
  ) {
    errors.push('expected_tools, expected_error_codes, pass_if_any, or allow_empty_tools is required')
  }
  if (errors.length) throw new Error(`case ${testCase.id || `<line ${lineNo}>`}: ${errors.join(', ')}`)
}

function checkExpectedParams(combined, expectedParams) {
  if (!expectedParams || typeof expectedParams !== 'object') return []
  const failures = []
  for (const [key, value] of Object.entries(expectedParams)) {
    const needle = `"${key}":${JSON.stringify(value)}`
    if (!combined.includes(needle)) {
      failures.push(`missing expected param ${key}=${JSON.stringify(value)}`)
    }
  }
  return failures
}

function extractAssistantText(combined) {
  const marker = '[assistant_text]'
  const idx = combined.lastIndexOf(marker)
  if (idx === -1) return ''
  return combined.slice(idx + marker.length).trim()
}

function parseToolEvents(combined) {
  const events = []
  for (const line of combined.split(/\r?\n/)) {
    const marker = '[update_json]'
    const idx = line.indexOf(marker)
    if (idx === -1) continue
    const jsonText = line.slice(idx + marker.length).trim()
    try {
      const obj = JSON.parse(jsonText)
      const toolName = obj?._meta?.claudeCode?.toolName || obj?.title
      if (typeof toolName !== 'string' || !toolName.trim()) continue
      events.push({
        toolName,
        parentToolUseId: obj.parentToolUseId || null,
        rawInput: obj.rawInput && typeof obj.rawInput === 'object' ? obj.rawInput : null,
      })
    } catch {
      // Log lines may truncate JSON; regex fallback below.
    }
  }
  return events
}

function topLevelToolAppeared(events, toolName) {
  return events.some((event) => event.toolName === toolName && !event.parentToolUseId)
}

function agentDelegationSubagents(events) {
  const subagents = []
  for (const event of events) {
    if (event.toolName !== 'Agent' || event.parentToolUseId) continue
    const raw = event.rawInput || {}
    const explicit =
      (typeof raw.subagent_type === 'string' && raw.subagent_type) ||
      (typeof raw.agent === 'string' && raw.agent) ||
      ''
    if (explicit) {
      subagents.push(explicit)
      continue
    }
    const prompt = typeof raw.prompt === 'string' ? raw.prompt : ''
    if (prompt.includes('quotation-agent')) subagents.push('quotation-agent')
    if (prompt.includes('accurate-agent')) subagents.push('accurate-agent')
  }
  return subagents
}

function usesTopLevelForbiddenScope(testCase) {
  return Boolean(testCase.forbidden_top_level_only || testCase.agent === 'wande-orchestrator')
}

function forbiddenBuiltinToolAppeared(toolEvents, toolName) {
  return toolEvents.some((event) => {
    const name = event.toolName || ''
    return name === toolName || name.startsWith(`${toolName} `)
  })
}

function forbiddenMcpToolAppeared(testCase, combined, toolEvents, tool) {
  if (usesTopLevelForbiddenScope(testCase)) {
    return topLevelToolAppeared(toolEvents, tool)
  }
  return toolCallAppeared(combined, tool, toolEvents)
}

function checkForbiddenTools(testCase, combined, toolEvents) {
  const failures = []
  for (const tool of testCase.forbidden_tools || []) {
    if (tool.startsWith('mcp__')) {
      if (forbiddenMcpToolAppeared(testCase, combined, toolEvents, tool)) {
        failures.push(`forbidden tool appeared ${tool}`)
      }
    } else if (/^[A-Z][A-Za-z0-9]*$/.test(tool)) {
      if (forbiddenBuiltinToolAppeared(toolEvents, tool)) {
        failures.push(`forbidden tool appeared ${tool}`)
      }
    } else if (combined.includes(tool)) {
      failures.push(`forbidden tool appeared ${tool}`)
    }
  }
  return failures
}

function checkExpectedSubagent(testCase, toolEvents) {
  if (!testCase.expected_subagent) return []
  const delegated = agentDelegationSubagents(toolEvents)
  if (!delegated.includes(testCase.expected_subagent)) {
    return [`missing expected_subagent ${testCase.expected_subagent}`]
  }
  return []
}

function toolCallAppeared(combined, toolName, toolEvents) {
  if (toolEvents.some((event) => event.toolName === toolName)) return true
  if (toolEvents.length > 0) return false
  return (
    combined.includes(`"title":"${toolName}"`) ||
    combined.includes(`"toolName":"${toolName}"`)
  )
}

function expectedToolAppeared(combined, toolName, toolEvents) {
  if (toolName.startsWith('mcp__')) {
    return toolCallAppeared(combined, toolName, toolEvents)
  }
  return combined.includes(toolName)
}

function evaluateOutcome(outcome, combined, testCase, toolEvents) {
  const failures = []
  for (const tool of outcome.expected_tools || []) {
    if (!expectedToolAppeared(combined, tool, toolEvents)) failures.push(`missing expected tool ${tool}`)
  }
  for (const tool of outcome.expected_tool_calls || []) {
    if (!toolCallAppeared(combined, tool, toolEvents)) failures.push(`missing expected tool_call ${tool}`)
  }
  failures.push(
    ...checkForbiddenTools(
      {
        forbidden_tools: outcome.forbidden_tools,
        agent: testCase.agent,
        forbidden_top_level_only: outcome.forbidden_top_level_only,
      },
      combined,
      toolEvents
    )
  )
  for (const tool of outcome.forbidden_tool_calls || []) {
    if (toolCallAppeared(combined, tool, toolEvents)) failures.push(`forbidden tool_call appeared ${tool}`)
  }
  for (const errorCode of outcome.expected_error_codes || []) {
    if (!combined.includes(errorCode)) failures.push(`missing expected error_code ${errorCode}`)
  }
  failures.push(...checkExpectedParams(combined, outcome.expected_params))
  if (outcome.response_includes_any?.length) {
    const haystack = extractAssistantText(combined) || combined
    const hit = outcome.response_includes_any.some((pattern) => haystack.includes(pattern))
    if (!hit) {
      failures.push(`missing response cue (${outcome.response_includes_any.join('|')})`)
    }
  }
  return failures
}

function evaluateCase(testCase, combined, code) {
  const failures = []
  let matchedBranchId = null
  const toolEvents = parseToolEvents(combined)

  failures.push(...checkForbiddenTools(testCase, combined, toolEvents))

  if (testCase.pass_if_any?.length) {
    const branches = testCase.pass_if_any.map((outcome) => ({
      id: outcome.id || 'unnamed',
      failures: evaluateOutcome(outcome, combined, testCase, toolEvents),
    }))
    const matched = branches.find((branch) => branch.failures.length === 0)
    if (!matched) {
      failures.push(
        `no pass_if_any branch matched: ${branches
          .map((branch) => `${branch.id}(${branch.failures.join(', ') || 'ok'})`)
          .join('; ')}`
      )
    } else {
      matchedBranchId = matched.id
    }
  } else {
    for (const tool of testCase.expected_tools || []) {
      if (!expectedToolAppeared(combined, tool, toolEvents)) failures.push(`missing expected tool ${tool}`)
    }
    for (const errorCode of testCase.expected_error_codes || []) {
      if (!combined.includes(errorCode)) failures.push(`missing expected error_code ${errorCode}`)
    }
    failures.push(...checkExpectedParams(combined, testCase.expected_params))
    failures.push(...checkExpectedSubagent(testCase, toolEvents))
  }

  if (code !== 0) failures.push(`ACP smoke exited ${code}`)
  return { failures, matchedBranchId }
}

function runNativeAcpOnce(testCase) {
  const timeoutMs =
    testCase.timeout_ms?.toString() ||
    process.env.CCB_TEST_TIMEOUT_MS ||
    '120000'

  return new Promise((resolveCase) => {
    const child = spawn(process.execPath, [resolve(repoRoot, 'ccb-installer', 'test-native-acp-agent.mjs')], {
      cwd: repoRoot,
      env: {
        ...process.env,
        CCB_TEST_PROMPT: testCase.input,
        CCB_TEST_AGENT_ID: testCase.agent,
        CCB_TEST_DUMP_UPDATES: 'all',
        CCB_TEST_TIMEOUT_MS: timeoutMs,
        CCB_TEST_ROUTE_ENTRY: route ? '1' : process.env.CCB_TEST_ROUTE_ENTRY || '',
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    let stdout = ''
    let stderr = ''
    child.stdout.on('data', chunk => { stdout += chunk.toString() })
    child.stderr.on('data', chunk => { stderr += chunk.toString() })
    child.on('close', code => {
      const combined = `${stdout}\n${stderr}`
      const { failures, matchedBranchId } = evaluateCase(testCase, combined, code)
      resolveCase({ id: testCase.id, failures, matchedBranchId, stdout, stderr, combined, code })
    })
  })
}

function isFlakyAcpResult(result) {
  if (!result.failures.some((f) => f.startsWith('ACP smoke exited'))) return false
  if (result.combined?.includes('BAD_TURN')) return true
  const toolEvents = parseToolEvents(result.combined || '')
  return toolEvents.length === 0
}

async function runCaseWithRetry(testCase) {
  const extra = Number(process.env.CCB_EVAL_RETRY ?? testCase.retry ?? 0)
  const maxAttempts = 1 + (Number.isFinite(extra) ? extra : 0)
  let last = null
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    last = await runNativeAcpOnce(testCase)
    if (!last.failures.length) return last
    if (!isFlakyAcpResult(last) || attempt === maxAttempts) return last
    console.log(`[agent-eval] retry ${testCase.id} (${attempt + 1}/${maxAttempts})`)
  }
  return last
}

function runNativeAcp(testCase) {
  return runCaseWithRetry(testCase)
}

const loaded = readCases(casesPath)
const selected = loaded
  .map(({ lineNo, value }) => {
    validateCase(value, lineNo)
    return value
  })
  .filter(testCase => !onlyId || testCase.id === onlyId)
  .filter(testCase => !onlyCategory || testCase.category === onlyCategory)

if (!selected.length) {
  console.error(`No cases selected from ${casesPath}`)
  process.exit(1)
}

console.log(`[agent-eval] loaded=${loaded.length} selected=${selected.length} mode=${runLive ? 'live' : 'validate'}`)

if (!runLive) {
  console.log('[agent-eval] schema ok')
  process.exit(0)
}

let failed = 0
for (const testCase of selected) {
  console.log(`[agent-eval] run ${testCase.id}`)
  const result = await runNativeAcp(testCase)
  if (result.failures.length) {
    failed += 1
    console.error(`[agent-eval] FAIL ${result.id}: ${result.failures.join('; ')}`)
  } else {
    const branch = result.matchedBranchId ? ` (branch=${result.matchedBranchId})` : ''
    console.log(`[agent-eval] PASS ${result.id}${branch}`)
  }
}

process.exit(failed ? 1 : 0)
