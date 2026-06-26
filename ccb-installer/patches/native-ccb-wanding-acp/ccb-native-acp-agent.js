import { randomUUID } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { createInterface } from 'node:readline'
import { spawn } from 'node:child_process'

const DEFAULT_MODEL = process.env.ANTHROPIC_DEFAULT_SONNET_MODEL || process.env.ANTHROPIC_MODEL || 'minimax-m3'
const MAX_TOKENS = Number(process.env.CCB_NATIVE_ACP_MAX_TOKENS || 2048)
const MCP_TIMEOUT_MS = Number(process.env.CCB_NATIVE_ACP_MCP_TIMEOUT_MS || 30000)
const CONTEXT_MAX_CHARS = Number(process.env.CCB_NATIVE_ACP_CONTEXT_MAX_CHARS || 45000)

const sessions = new Map()
let cachedWandingContext = null

function log(message) {
  process.stderr.write(`[ccb-native-acp] ${message}\n`)
}

function defaultConfigDir() {
  if (process.platform === 'win32' && process.env.LOCALAPPDATA) {
    return join(process.env.LOCALAPPDATA, 'CCB-Wanding', '.claude')
  }
  return join(homedir(), '.ccb-wanding', '.claude')
}

function resolveConfigDir() {
  return process.env.CCB_WANDING_CONFIG_DIR || defaultConfigDir()
}

function readSettings() {
  const dir = process.env.CLAUDE_CONFIG_DIR || resolveConfigDir()
  const file = join(dir, 'settings.json')
  if (!existsSync(file)) return {}
  const raw = readFileSync(file, 'utf8').replace(/^\uFEFF/, '')
  return JSON.parse(raw)
}

function getSettings() {
  try {
    return readSettings()
  } catch (err) {
    log(`settings parse failed: ${err?.message || err}`)
    return {}
  }
}

function readTextIfExists(file) {
  try {
    if (!file || !existsSync(file)) return ''
    return readFileSync(file, 'utf8').replace(/^\uFEFF/, '').trim()
  } catch (err) {
    log(`context read failed ${file}: ${err?.message || err}`)
    return ''
  }
}

function quotationDataDirFromSettings() {
  const quotation = getSettings().mcpServers?.quotation
  const env = quotation?.env || {}
  if (env.DATA_DIR) return String(env.DATA_DIR)
  if (env.CCB_PROJECT_ROOT) return join(String(env.CCB_PROJECT_ROOT), 'data')
  return ''
}

function defaultWandingDataDir() {
  const fromSettings = quotationDataDirFromSettings()
  if (fromSettings) return fromSettings
  if (process.platform === 'win32') return 'D:\\CCB-Wanding\\vendor\\wanding\\data'
  return ''
}

function contextBlock(title, file, content) {
  if (!content) return ''
  return [
    `## ${title}`,
    `Source: ${file}`,
    '',
    content,
  ].join('\n')
}

function buildWandingSystemPrompt() {
  if (cachedWandingContext !== null) return cachedWandingContext

  const configDir = process.env.CLAUDE_CONFIG_DIR || resolveConfigDir()
  const dataDir = defaultWandingDataDir()
  const blocks = []

  const claudeMd = join(configDir, 'CLAUDE.md')
  blocks.push(contextBlock('CCB-Wanding CLAUDE.md', claudeMd, readTextIfExists(claudeMd)))

  const manuals = [
    ['CCB-Wanding quotation manual', join(dataDir, 'ccb-wanding-quotation.md')],
    ['CCB-Wanding Accurate manual', join(dataDir, 'ccb-wanding-accurate.md')],
    ['CCB-Wanding business knowledge', join(dataDir, 'wanding_business_knowledge.md')],
    ['CCB-Wanding index fallback', join(dataDir, 'ccb-wanding-claude-index.md')],
  ]
  for (const [title, file] of manuals) {
    blocks.push(contextBlock(title, file, readTextIfExists(file)))
  }

  const memoryDir = join(configDir, 'memory')
  const memories = [
    ['CCB-Wanding memory profile', join(memoryDir, 'personal', 'profile.md')],
    ['CCB-Wanding memory workflow', join(memoryDir, 'personal', 'workflow.md')],
    ['CCB-Wanding customer memory', join(memoryDir, 'business', 'customers.md')],
    ['CCB-Wanding product memory', join(memoryDir, 'business', 'products.md')],
    ['CCB-Wanding pricing memory', join(memoryDir, 'business', 'pricing.md')],
  ]
  for (const [title, file] of memories) {
    blocks.push(contextBlock(title, file, readTextIfExists(file)))
  }

  const joined = blocks.filter(Boolean).join('\n\n---\n\n')
  cachedWandingContext = [
    'You are CCB-Wanding, the Wanding quotation, inventory, and business data assistant.',
    'Use the following CCB-Wanding runtime instructions and business manuals as your system context.',
    'Always answer user-facing business replies in Simplified Chinese unless the user asks otherwise.',
    'Do not invent prices, inventory, customer rules, product codes, or Accurate data.',
    'When a request requires quotation or Accurate data, prefer the configured MCP tools or the native shim shortcut over guessing.',
    '',
    joined.slice(0, CONTEXT_MAX_CHARS),
  ].join('\n')
  log(`loaded CCB context chars=${cachedWandingContext.length} config=${configDir} data=${dataDir}`)
  return cachedWandingContext
}

function loadEnvFromSettings() {
  process.env.CLAUDE_CONFIG_DIR = resolveConfigDir()
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = process.env.NODE_TLS_REJECT_UNAUTHORIZED || '0'

  try {
    const settings = readSettings()
    const env = settings.env || {}
    for (const [key, value] of Object.entries(env)) {
      if (process.env[key] === undefined && value != null) {
        process.env[key] = String(value)
      }
    }
  } catch (err) {
    log(`settings load failed: ${err?.message || err}`)
  }
}

function currentModel() {
  return process.env.ANTHROPIC_DEFAULT_SONNET_MODEL || process.env.ANTHROPIC_MODEL || DEFAULT_MODEL
}

function currentModelId() {
  return `${currentModel()}/default`
}

function asciiJsonStringify(value) {
  return JSON.stringify(value).replace(/[\u007f-\uffff]/g, char => {
    const code = char.charCodeAt(0).toString(16).padStart(4, '0')
    return `\\u${code}`
  })
}

function send(message) {
  process.stdout.write(`${asciiJsonStringify(message)}\n`)
}

function result(id, value) {
  send({ jsonrpc: '2.0', id, result: value ?? null })
}

function error(id, code, message, data) {
  send({ jsonrpc: '2.0', id, error: { code, message, ...(data === undefined ? {} : { data }) } })
}

function notify(method, params) {
  send({ jsonrpc: '2.0', method, params })
}

function sessionUpdate(sessionId, update) {
  notify('session/update', { sessionId, update })
}

function extractPromptText(prompt) {
  if (typeof prompt === 'string') return prompt
  if (!Array.isArray(prompt)) return ''
  return prompt
    .filter(block => block && block.type === 'text' && typeof block.text === 'string')
    .map(block => block.text)
    .join('\n')
    .trim()
}

function sanitizeUserText(text) {
  const cleaned = String(text || '')
    .replace(/\[Assistant Rules\][\s\S]*?\[\/Assistant Rules\]/gi, ' ')
    .replace(/\[Loaded MCP[^\]]*\][\s\S]*?\[\/Loaded MCP[^\]]*\]/gi, ' ')
    .replace(/\[System[^\]]*\][\s\S]*?\[\/System[^\]]*\]/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  return repairMojibake(cleaned)
}

function repairMojibake(text) {
  if (!/[ÃÂæçèéåäöüð]/.test(text)) return text
  try {
    const decoded = Buffer.from(text, 'latin1').toString('utf8')
    const decodedHan = (decoded.match(/[\u4e00-\u9fff]/g) || []).length
    const originalHan = (text.match(/[\u4e00-\u9fff]/g) || []).length
    return decodedHan > originalHan ? decoded : text
  } catch {
    return text
  }
}

function contentToText(content) {
  if (typeof content === 'string') return content
  if (!Array.isArray(content)) return ''
  return content
    .filter(block => block && block.type === 'text' && typeof block.text === 'string')
    .map(block => block.text)
    .join('')
}

function detectCustomerLevel(text) {
  const upper = String(text || '').toUpperCase()
  const match = upper.match(/(?:客户|客戶|等级|等級|级|級|LEVEL|LV|价|價)?\s*([ABCDE])\s*(?:级|級|价|價|客户|客戶)?/)
  return match?.[1] || 'B'
}

function maybeQuotationKeywords(text) {
  const input = String(text || '')
  if (!/(报价|价格|查价|询价|多少钱|多少錢|price|quotation|quote)/i.test(input)) return ''
  return input
    .replace(/查询|查一下|查|报价|价格|查价|询价|报个价|多少钱|多少錢|price|quotation|quote/gi, ' ')
    .replace(/客户|客戶|等级|等級|默认|默認|按|用|给我|幫我|帮我|请|請/gi, ' ')
    .replace(/\b[A-E]\s*(级|級|价|價|客户|客戶)?\b/gi, ' ')
    .replace(/[，。！？、；：:,.!?()[\]{}"']/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function normalizeChoiceText(text) {
  return String(text || '').trim().toLowerCase()
}

function resolvePendingQuotationChoice(session, text) {
  const pending = session.pendingQuotation
  if (!pending?.candidates?.length) return null

  const normalized = normalizeChoiceText(text)
  const ordinalMap = new Map([
    ['1', 0], ['一', 0], ['第一个', 0], ['第一個', 0], ['第一', 0], ['选一', 0], ['選一', 0],
    ['2', 1], ['二', 1], ['第二个', 1], ['第二個', 1], ['第二', 1], ['选二', 1], ['選二', 1],
    ['3', 2], ['三', 2], ['第三个', 2], ['第三個', 2], ['第三', 2], ['选三', 2], ['選三', 2],
  ])
  for (const [key, index] of ordinalMap) {
    if (normalized === key || normalized.includes(key)) return pending.candidates[index] || null
  }

  const scored = pending.candidates
    .map(candidate => {
      const name = String(candidate.matched_name || candidate.name || '').toLowerCase()
      let score = 0
      for (const token of normalized.split(/\s+/).filter(Boolean)) {
        if (name.includes(token)) score += 2
      }
      if (/排水|drain/.test(normalized) && /排水|drain/i.test(name)) score += 3
      if (/给水|給水|aw|water/.test(normalized) && /给水|給水|aw|water/i.test(name)) score += 3
      if (/ppr/.test(normalized) && /ppr/i.test(name)) score += 3
      if (/pvc/.test(normalized) && /pvc/i.test(name)) score += 3
      return { candidate, score }
    })
    .sort((a, b) => b.score - a.score)
  return scored[0]?.score > 0 ? scored[0].candidate : null
}

function parseMcpTextContent(result) {
  const blocks = result?.content
  if (!Array.isArray(blocks)) return ''
  return blocks
    .filter(block => block?.type === 'text' && typeof block.text === 'string')
    .map(block => block.text)
    .join('\n')
}

function compactQuotationResult(text) {
  try {
    const data = JSON.parse(text)
    return JSON.stringify({
      keywords: data.keywords,
      unmatched: data.unmatched,
      needs_selection: data.needs_selection,
      candidate_count: data.candidate_count,
      candidates: Array.isArray(data.candidates) ? data.candidates.slice(0, 20) : [],
      instructions: data.selection_context?.instructions || data.instructions || [],
    }, null, 2)
  } catch {
    return text.slice(0, 8000)
  }
}

function pickPrice(candidate) {
  return candidate.unit_price ?? candidate.price ?? candidate.b_price ?? candidate.customer_price
}

function formatQuotationCandidate(candidate, keywords, customerLevel = 'B') {
  const name = candidate.matched_name || candidate.name || candidate.quote_name || '未命名产品'
  const code = candidate.code || candidate.item_code || '无编码'
  const price = pickPrice(candidate)
  const priceText = price === undefined || price === null ? '暂无价格' : String(price)
  return `按 ${customerLevel} 级客户价匹配“${keywords}”：${name}，编码 ${code}，价格 ${priceText}。`
}

function buildQuotationClarification(session, rawText, keywords, customerLevel) {
  let data
  try {
    data = JSON.parse(rawText)
  } catch {
    return ''
  }
  if (data.unmatched) return `未匹配到“${keywords}”的报价。请补充更完整的品名或产品编码。`

  const candidates = Array.isArray(data.candidates) ? data.candidates.slice(0, 5) : []
  if (candidates.length === 0) return ''
  if (!data.needs_selection || candidates.length === 1) {
    session.pendingQuotation = null
    return formatQuotationCandidate(candidates[0], keywords, customerLevel)
  }

  session.pendingQuotation = { keywords, customerLevel, candidates }
  const options = candidates.slice(0, 3).map((candidate, index) => {
    const name = candidate.matched_name || candidate.name || '未命名产品'
    const code = candidate.code || candidate.item_code || '无编码'
    const price = pickPrice(candidate) ?? '暂无价格'
    return `${index + 1}. ${name}，编码 ${code}，${customerLevel}价 ${price}`
  })
  return `“${keywords}”有多个可能匹配，请确认要哪一个：\n${options.join('\n')}`
}

async function callMcpTool(serverName, toolName, args) {
  const server = getSettings().mcpServers?.[serverName]
  if (!server?.command) throw new Error(`MCP server not configured: ${serverName}`)

  return await new Promise((resolve, reject) => {
    const child = spawn(server.command, server.args || [], {
      env: { ...process.env, ...(server.env || {}) },
      stdio: ['pipe', 'pipe', 'pipe'],
      windowsHide: true,
    })
    const pending = new Map()
    let settled = false
    let stderr = ''
    const timeout = setTimeout(() => {
      if (settled) return
      settled = true
      child.kill()
      reject(new Error(`MCP ${serverName}.${toolName} timeout${stderr ? `: ${stderr.slice(-500)}` : ''}`))
    }, MCP_TIMEOUT_MS)

    function finish(err, value) {
      if (settled) return
      settled = true
      clearTimeout(timeout)
      child.kill()
      err ? reject(err) : resolve(value)
    }

    function sendMcp(id, method, params = {}) {
      pending.set(id, method)
      child.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', id, method, params })}\n`)
    }

    child.stderr.on('data', data => {
      stderr += String(data)
    })
    child.on('error', finish)
    child.stdout.on('data', data => {
      for (const line of String(data).split(/\r?\n/)) {
        const trimmed = line.trim()
        if (!trimmed) continue
        let message
        try {
          message = JSON.parse(trimmed)
        } catch {
          continue
        }
        if (message.error) {
          return finish(new Error(`MCP ${pending.get(message.id) || message.id} error: ${JSON.stringify(message.error)}`))
        }
        if (message.id === 1) {
          child.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized', params: {} })}\n`)
          sendMcp(2, 'tools/call', { name: toolName, arguments: args })
        } else if (message.id === 2) {
          finish(null, message.result)
        }
      }
    })

    sendMcp(1, 'initialize', {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: { name: 'ccb-native-acp', version: '0.1.0' },
    })
  })
}

async function answerQuotation(session, userText, keywords) {
  const customerLevel = detectCustomerLevel(userText)
  const toolResult = await callMcpTool('quotation', 'match_quotation', { keywords, customer_level: customerLevel })
  const rawResult = parseMcpTextContent(toolResult)
  const clarification = buildQuotationClarification(session, rawResult, keywords, customerLevel)
  if (clarification) return clarification

  const compactResult = compactQuotationResult(rawResult)
  const prompt = [
    '你是 CCB-Wanding 报价助手。必须用简体中文回复。',
    '用户在问价格或报价。下面是 quotation MCP 的 match_quotation 返回结果。',
    '请根据候选选择最适合的一项；如果明显无法确定，就只问一个聚焦澄清问题。',
    `如果能确定，回复要简短，包含品名、编码、价格和客户等级 ${customerLevel}。不要展示完整候选列表。`,
    '',
    `用户原始问题：${userText}`,
    `提取关键词：${keywords}`,
    'MCP 结果：',
    compactResult,
  ].join('\n')
  const out = await callMiniMax([{ role: 'user', content: prompt }])
  return out.text || ''
}

async function callMiniMax(messages, options = {}) {
  loadEnvFromSettings()
  const apiBase = (process.env.ANTHROPIC_BASE_URL || 'https://api.minimaxi.com/anthropic').replace(/\/$/, '')
  const apiKey = process.env.ANTHROPIC_AUTH_TOKEN || process.env.ANTHROPIC_API_KEY
  if (!apiKey) throw new Error('missing ANTHROPIC_AUTH_TOKEN / ANTHROPIC_API_KEY')

  const system = options.system ?? buildWandingSystemPrompt()
  const body = {
    model: currentModel(),
    max_tokens: MAX_TOKENS,
    stream: false,
    messages,
  }
  if (system) body.system = system

  const response = await fetch(`${apiBase}/v1/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify(body),
  })

  const text = await response.text()
  let data
  try {
    data = JSON.parse(text)
  } catch {
    throw new Error(`MiniMax returned non-JSON status=${response.status}`)
  }
  if (!response.ok) {
    throw new Error(`MiniMax status=${response.status}: ${JSON.stringify(data).slice(0, 500)}`)
  }
  return {
    text: contentToText(data.content),
    usage: data.usage,
    stopReason: data.stop_reason || 'end_turn',
  }
}

async function streamText(sessionId, text) {
  for (let i = 0; i < text.length; i += 32) {
    sessionUpdate(sessionId, {
      sessionUpdate: 'agent_message_chunk',
      content: { type: 'text', text: text.slice(i, i + 32) },
    })
  }
}

async function handleRequest(message) {
  const { id, method, params = {} } = message

  if (method === 'initialize') {
    return result(id, {
      protocolVersion: 1,
      agentCapabilities: {
        _meta: { claudeCode: { promptQueueing: true } },
        promptCapabilities: { image: false, embeddedContext: false },
        mcpCapabilities: { http: true, sse: true },
      },
      agentInfo: {
        name: 'ccb-wanding-native',
        title: 'CCB-Wanding Native',
        version: '0.1.0-native-acp',
      },
      authMethods: [],
    })
  }

  if (method === 'authenticate') return result(id, {})

  if (method === 'session/new') {
    const sessionId = randomUUID()
    const model = currentModel()
    const modelId = currentModelId()
    const availableModes = [
      { id: 'default', name: 'Default', description: 'CCB-Wanding native default' },
      { id: 'bypassPermissions', name: 'Bypass Permissions', description: 'CCB-Wanding native permissive mode' },
    ]
    const availableModels = [
      { id: 'default/default', modelId: 'default/default', name: 'Default', label: 'Default (default)' },
      { id: modelId, modelId, name: model, label: `${model} (default)` },
    ]
    sessions.set(sessionId, {
      cwd: params.cwd || process.cwd(),
      history: [],
      mode: 'bypassPermissions',
      model: modelId,
      pendingQuotation: null,
    })
    return result(id, {
      sessionId,
      modes: {
        availableModes,
        available_modes: availableModes,
        currentModeId: 'bypassPermissions',
        current_mode_id: 'bypassPermissions',
      },
      models: {
        availableModels,
        available_models: availableModels,
        currentModelId: modelId,
        current_model_id: modelId,
        current_model_label: `${model} (default)`,
      },
    })
  }

  if (method === 'session/set_mode') {
    const session = sessions.get(params.sessionId)
    if (session && typeof params.modeId === 'string') session.mode = params.modeId
    if (session && typeof params.mode === 'string') session.mode = params.mode
    return result(id, { mode: session?.mode || 'bypassPermissions' })
  }

  if (method === 'session/prompt') {
    const session = sessions.get(params.sessionId)
    if (!session) return error(id, -32002, 'Session not found', { sessionId: params.sessionId })

    const userText = sanitizeUserText(extractPromptText(params.prompt))
    if (!userText) return result(id, { stopReason: 'end_turn' })

    try {
      const pendingChoice = resolvePendingQuotationChoice(session, userText)
      if (pendingChoice) {
        const text = formatQuotationCandidate(
          pendingChoice,
          session.pendingQuotation.keywords,
          session.pendingQuotation.customerLevel,
        )
        session.pendingQuotation = null
        await streamText(params.sessionId, text)
        session.history.push({ role: 'user', content: userText })
        session.history.push({ role: 'assistant', content: text })
        return result(id, { stopReason: 'end_turn' })
      }

      const quotationKeywords = maybeQuotationKeywords(userText)
      const text = quotationKeywords
        ? await answerQuotation(session, userText, quotationKeywords)
        : (await callMiniMax([
            ...session.history,
            { role: 'user', content: userText },
          ])).text || ''

      await streamText(params.sessionId, text)
      session.history.push({ role: 'user', content: userText })
      if (text) session.history.push({ role: 'assistant', content: text })
      return result(id, { stopReason: 'end_turn' })
    } catch (err) {
      log(`prompt failed: ${err?.message || err}`)
      return error(id, -32603, 'Internal error', { details: err?.message || String(err) })
    }
  }

  return error(id, -32601, `"Method not found": ${method}`, { method })
}

async function handleNotification(message) {
  if (message.method === 'session/cancel') return
}

export async function runCcbNativeAcpAgent() {
  loadEnvFromSettings()
  log(`start model=${currentModel()} config=${process.env.CLAUDE_CONFIG_DIR}`)

  console.log = console.error
  console.info = console.error
  console.warn = console.error
  console.debug = console.error

  const rl = createInterface({ input: process.stdin, crlfDelay: Infinity })
  for await (const line of rl) {
    const trimmed = line.trim()
    if (!trimmed) continue
    let message
    try {
      message = JSON.parse(trimmed)
    } catch (err) {
      log(`bad json: ${err?.message || err}`)
      continue
    }
    if (message && typeof message.method === 'string' && message.id !== undefined) {
      await handleRequest(message)
    } else if (message && typeof message.method === 'string') {
      await handleNotification(message)
    }
  }
}

export default runCcbNativeAcpAgent
