import { createEventLog } from '../../core/event-log.mjs'

const actionByTool = new Map([
  ['Read', 'knowledge.read'],
  ['mcp__quotation__match_quotation', 'quotation.match'],
  ['mcp__quotation__get_inventory_by_code', 'inventory.query'],
  ['mcp__quotation__get_inventory_by_codes', 'inventory.query'],
])

const columnDefinitions = [
  { aliases: ['product', '\u4ea7\u54c1'], canonical: '\u4ea7\u54c1', key: 'product' },
  { aliases: ['specification', '\u89c4\u683c'], canonical: '\u89c4\u683c', key: 'specification' },
  { aliases: ['material code', 'material_code', '\u7269\u6599\u7f16\u7801'], canonical: '\u7269\u6599\u7f16\u7801', key: 'material_code' },
  { aliases: ['b price', 'b\u7ea7\u4ef7\u683c'], canonical: 'B\u7ea7\u4ef7\u683c', key: 'price', numeric: true },
  { aliases: ['inventory', '\u5e93\u5b58'], canonical: '\u5e93\u5b58', key: 'inventory', numeric: true },
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
    Object.fromEntries(fields.map((field, index) => [
      field.key,
      field.numeric ? parseNumeric(cells[index]) : cells[index],
    ]))
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
        const output = parseToolOutput(update)
        log.appendRaw({
          type: failed ? 'tool.call.failed' : 'tool.call.completed',
          actor,
          action: toolAction(toolName),
          status: failed ? 'error' : 'ok',
          input: state.input,
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
