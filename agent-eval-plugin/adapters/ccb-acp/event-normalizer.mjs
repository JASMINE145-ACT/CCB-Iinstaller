import { createEventLog } from '../../core/event-log.mjs'

const actionByTool = new Map([
  ['Read', 'knowledge.read'],
  ['mcp__quotation__match_quotation', 'quotation.match'],
  ['mcp__quotation__match_quotation_batch', 'quotation.match'],
  ['mcp__quotation__select_quotation_candidates', 'quotation.select'],
  ['mcp__quotation__get_inventory_by_code', 'inventory.query'],
  ['mcp__quotation__get_inventory_by_codes', 'inventory.query'],
  ['mcp__quotation__get_inventory_by_code_batch', 'inventory.query'],
])

/** Lift singular match/inventory shapes so evidence paths can use batch forms. */
export function normalizeToolPayload(action, input = {}, output = {}) {
  const nextInput = structuredClone(input ?? {})
  const nextOutput = structuredClone(output ?? {})

  if (action === 'quotation.match') {
    if (!Array.isArray(nextOutput.results) && Array.isArray(nextOutput.candidates)) {
      nextOutput.results = [{
        keywords: nextOutput.keywords ?? nextInput.keywords ?? '',
        candidates: nextOutput.candidates,
        unmatched: nextOutput.unmatched,
        needs_selection: nextOutput.needs_selection,
        error_code: nextOutput.error_code,
        candidate_count: nextOutput.candidate_count,
        candidates_returned: nextOutput.candidates_returned,
        candidates_truncated: nextOutput.candidates_truncated,
      }]
    }
  }

  if (action === 'inventory.query') {
    if (!Array.isArray(nextInput.codes) && typeof nextInput.code === 'string' && nextInput.code) {
      nextInput.codes = [nextInput.code]
    }
    if (!Array.isArray(nextOutput.items) && typeof nextOutput.code === 'string' && nextOutput.code) {
      nextOutput.items = [{
        code: nextOutput.code,
        item: {
          code: nextOutput.code,
          name: nextOutput.name,
          qty_available: nextOutput.qty_available,
          qty_warehouse: nextOutput.qty_warehouse,
          unit: nextOutput.unit,
        },
      }]
    }
  }

  return { input: nextInput, output: nextOutput }
}

const columnDefinitions = [
  { aliases: ['中文名称'], canonical: '中文名称', key: 'product' },
  { aliases: ['英文/印尼名'], canonical: '英文/印尼名', key: 'english_or_indonesian_name' },
  { aliases: ['编码'], canonical: '编码', key: 'material_code', codeToken: true },
  { aliases: ['单价(b级)', '单价（b级）'], canonical: '单价(B级)', key: 'price', numeric: true },
  { aliases: ['在仓库存', '在仓库存(qty_warehouse)'], canonical: '在仓库存', key: 'inventory_warehouse', numeric: true },
  { aliases: ['可用库存', '可用库存(qty_available)'], canonical: '可用库存', key: 'inventory_available', numeric: true },
  { aliases: ['单位'], canonical: '单位', key: 'unit' },
  { aliases: ['备注'], canonical: '备注', key: 'remark' },
  { aliases: ['product', '产品'], canonical: '产品', key: 'product' },
  { aliases: ['specification', '规格'], canonical: '规格', key: 'specification' },
  { aliases: ['material code', 'material_code', '物料编码'], canonical: '物料编码', key: 'material_code', codeToken: true },
  { aliases: ['b price', 'b级价格'], canonical: 'B级价格', key: 'price', numeric: true },
  { aliases: ['inventory', '库存'], canonical: '库存', key: 'inventory', numeric: true },
]

function toolAction(toolName = 'unknown') {
  return actionByTool.get(toolName) ?? `tool.${toolName.replace(/[^a-zA-Z0-9_.-]+/gu, '_')}`
}

function extractText(value) {
  if (typeof value === 'string') return value
  if (Array.isArray(value)) return value.map(extractText).filter(Boolean).join('\n')
  if (!value || typeof value !== 'object') return ''
  if (typeof value.text === 'string') return value.text
  if (value.content !== undefined) return extractText(value.content)
  return ''
}

function parseToolOutput(update) {
  const text = extractText(update.rawOutput ?? update.content)
  if (!text) return {}
  try {
    return JSON.parse(text)
  } catch {
    return { text }
  }
}

function tableCells(line) {
  return line.trim().replace(/^\|/u, '').replace(/\|$/u, '').split('|').map((cell) => cell.trim())
}

function isSeparator(cells) {
  return cells.every((cell) => /^:?-{3,}:?$/u.test(cell))
}

function parseNumeric(value) {
  const normalized = value.replace(/[,\s]/gu, '').replace(/^[\u00a5$]/u, '')
  const number = Number(normalized)
  return Number.isFinite(number) ? number : value
}

// Presentation noise (bold markers, decorations) must not leak into evidence values.
function cleanCell(value) {
  return value.replace(/\*{1,3}([^*]*)\*{1,3}/gu, '$1').trim()
}

function cellValue(field, rawCell) {
  const cell = cleanCell(rawCell)
  const value = field.codeToken ? (cell.match(/^\S+/u)?.[0] ?? cell) : cell
  return field.numeric ? parseNumeric(value) : value
}

export function parseMarkdownTable(text) {
  const lines = text.split(/\r?\n/u).filter((line) => line.trim().startsWith('|'))
  if (lines.length < 3) return null
  const header = tableCells(lines[0])
  const separator = tableCells(lines[1])
  if (header.length !== separator.length || !isSeparator(separator)) return null

  const fields = header.map((name) => {
    const normalized = name.trim().toLowerCase()
    return columnDefinitions.find(({ aliases }) => aliases.includes(normalized)) ?? {
      canonical: name.trim(),
      key: name.trim().toLowerCase().replace(/\s+/gu, '_'),
    }
  })
  const rows = lines.slice(2).map(tableCells).filter((cells) => cells.length === fields.length).map((cells) => (
    Object.fromEntries(fields.map((field, index) => [field.key, cellValue(field, cells[index])]))
  ))
  if (rows.length === 0) return null
  return {
    format: 'markdown_table',
    columns: fields.map(({ canonical }) => canonical),
    rows,
  }
}

export function normalizeCcbAcpUpdates(updates, {
  traceId,
  actor = 'quotation-agent',
  clock,
} = {}) {
  if (!Array.isArray(updates)) throw new TypeError('ACP updates must be an array')
  const log = createEventLog(traceId, clock ? { clock } : undefined)
  const toolCalls = new Map()
  let assistantText = ''
  let assistantLastIndex = -1

  updates.forEach((update, index) => {
    const rawEventRef = `adapter://ccb-acp/update-${index + 1}`
    if (update.sessionUpdate === 'tool_call' || update.sessionUpdate === 'tool_call_update') {
      const id = update.toolCallId
      if (!id) return
      const prior = toolCalls.get(id) ?? { input: {} }
      const toolName = update._meta?.claudeCode?.toolName ?? prior.toolName
      const input = update.rawInput && Object.keys(update.rawInput).length > 0
        ? update.rawInput
        : prior.input
      const state = {
        ...prior,
        toolName,
        input: structuredClone(input ?? {}),
        parentSpanId: update.parentToolUseId ?? prior.parentSpanId,
      }
      toolCalls.set(id, state)

      if (update.status === 'completed' || update.status === 'failed' || update.status === 'error') {
        const failed = update.status !== 'completed'
        const action = toolAction(toolName)
        const parsedOutput = parseToolOutput(update)
        const { input, output } = normalizeToolPayload(action, state.input, parsedOutput)
        log.appendRaw({
          type: failed ? 'tool.call.failed' : 'tool.call.completed',
          actor,
          action,
          status: failed ? 'error' : 'ok',
          input,
          output: failed ? { ...output, error: extractText(update.content) || output.text || update.status } : output,
          span_id: id,
          ...(state.parentSpanId ? { parent_span_id: state.parentSpanId } : {}),
          raw_event_ref: rawEventRef,
        })
        toolCalls.delete(id)
      }
      return
    }

    if (update.sessionUpdate === 'agent_message_chunk') {
      assistantText += extractText(update.content)
      assistantLastIndex = index
      return
    }

    if (update.sessionUpdate === 'session_completed') {
      if (assistantText) {
        const table = parseMarkdownTable(assistantText)
        log.appendRaw({
          type: table ? 'artifact.created' : 'assistant.message',
          actor,
          action: table ? 'assistant.table' : 'assistant.message',
          status: 'ok',
          output: table ?? { text: assistantText },
          raw_event_ref: `adapter://ccb-acp/update-${assistantLastIndex + 1}`,
        })
        assistantText = ''
      }
      log.appendRaw({
        type: 'session.completed',
        actor: 'ccb-acp',
        action: 'session.completed',
        status: update.stopReason === 'error' ? 'error' : 'ok',
        output: { stop_reason: update.stopReason ?? 'unknown' },
        raw_event_ref: rawEventRef,
      })
    }
  })

  if (assistantText) {
    const table = parseMarkdownTable(assistantText)
    log.appendRaw({
      type: table ? 'artifact.created' : 'assistant.message',
      actor,
      action: table ? 'assistant.table' : 'assistant.message',
      status: 'ok',
      output: table ?? { text: assistantText },
      raw_event_ref: `adapter://ccb-acp/update-${assistantLastIndex + 1}`,
    })
  }
  return log.snapshot()
}
