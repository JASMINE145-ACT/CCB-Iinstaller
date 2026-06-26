import type { CanUseToolFn } from '../../hooks/useCanUseTool.js'
import type {
  PermissionAllowDecision,
  PermissionAskDecision,
  PermissionDenyDecision,
} from '../../types/permissions.js'
import type { Tool as ToolType, ToolUseContext } from '../../Tool.js'
import type { AssistantMessage } from '../../types/message.js'
import { ORCHESTRATOR_AGENT_TOOL_NAME } from './agentSessionProfile.js'

/** Allow at most 2 consecutive calls with the same tool + normalized params; block the 3rd. */
export const MAX_CONSECUTIVE_SAME_TOOL_CALLS = 2

/** Office-Word doc build legitimately repeats add_paragraph / add_heading many times. */
export function isOfficeWordMcpToolName(toolName: string): boolean {
  return toolName.startsWith('mcp__office-word__')
}

/** Orchestrator delegates via Agent(); must not share the MCP repeat cap. */
export function isOrchestratorDelegationToolName(toolName: string): boolean {
  return toolName === ORCHESTRATOR_AGENT_TOOL_NAME
}

export function isGetInventoryByCodeBatchTool(toolName: string): boolean {
  return (
    normalizeToolNameForRepeatGuard(toolName) ===
    'get_inventory_by_code_batch'
  )
}

export function isGetInventoryByCodeSingleTool(toolName: string): boolean {
  return normalizeToolNameForRepeatGuard(toolName) === 'get_inventory_by_code'
}

type RepeatState = {
  repeatKey: string
  count: number
}

type InventoryBatchPending = {
  scopeKey: string
  codes: string[]
}

const sessionRepeatState = new Map<string, RepeatState>()
const inventoryBatchPendingByToolUseId = new Map<string, InventoryBatchPending>()
const inventoryBatchCoveredByScope = new Map<string, Set<string>>()

function stableSerialize(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value)
  }
  if (Array.isArray(value)) {
    return `[${value.map(stableSerialize).join(',')}]`
  }
  const record = value as Record<string, unknown>
  const keys = Object.keys(record).sort()
  return `{${keys.map((k) => `${JSON.stringify(k)}:${stableSerialize(record[k])}`).join(',')}}`
}

/** Strip mcp__server__ prefix so MCP and logical names group together. */
export function normalizeToolNameForRepeatGuard(toolName: string): string {
  const mcpMatch = /^mcp__[^_]+__(.+)$/.exec(toolName)
  return mcpMatch?.[1] ?? toolName
}

export function buildToolCallRepeatKey(
  toolName: string,
  input: Record<string, unknown>,
): string {
  return `${normalizeToolNameForRepeatGuard(toolName)}\0${stableSerialize(input)}`
}

/** Main orchestrator vs delegated sub-agent get independent repeat counters. */
export function repeatGuardScopeKey(
  sessionId: string,
  agentId?: string | null,
): string {
  const agent = agentId?.trim() || 'main'
  return `${sessionId}\0${agent}`
}

function coerceTextList(
  value: unknown,
  nestedKeys: string[],
): string[] {
  if (value == null) return []
  if (typeof value === 'string') {
    const trimmed = value.trim()
    return trimmed ? [trimmed] : []
  }
  if (!Array.isArray(value)) return []

  const out: string[] = []
  for (const item of value) {
    if (typeof item === 'string') {
      const trimmed = item.trim()
      if (trimmed) out.push(trimmed)
      continue
    }
    if (!item || typeof item !== 'object') continue
    const record = item as Record<string, unknown>
    for (const key of nestedKeys) {
      const nested = record[key]
      if (typeof nested === 'string') {
        const trimmed = nested.trim()
        if (trimmed) {
          out.push(trimmed)
          break
        }
      }
    }
  }
  return out
}

/** Mirrors python/main.py batch code extraction. */
export function extractInventoryBatchCodes(
  input: Record<string, unknown>,
): string[] {
  const raw =
    input.codes ?? input.code ?? input.item_codes ?? input.items
  return coerceTextList(raw, [
    'code',
    'item_code',
    'sku',
    'product_code',
    'no',
  ])
}

export function extractSingleInventoryCode(
  input: Record<string, unknown>,
): string | null {
  const raw =
    input.code ?? input.item_code ?? input.no ?? input.sku ?? input.item
  if (typeof raw !== 'string') return null
  const trimmed = raw.trim()
  return trimmed || null
}

function getOrCreateCoveredSet(scopeKey: string): Set<string> {
  let covered = inventoryBatchCoveredByScope.get(scopeKey)
  if (!covered) {
    covered = new Set()
    inventoryBatchCoveredByScope.set(scopeKey, covered)
  }
  return covered
}

function registerInventoryBatchPending(
  scopeKey: string,
  toolUseID: string,
  codes: string[],
): void {
  const normalized = [...new Set(codes.map((code) => code.trim()).filter(Boolean))]
  if (normalized.length === 0) return
  inventoryBatchPendingByToolUseId.set(toolUseID, {
    scopeKey,
    codes: normalized,
  })
}

function isCodeCoveredByBatch(scopeKey: string, code: string): boolean {
  return inventoryBatchCoveredByScope.get(scopeKey)?.has(code.trim()) ?? false
}

function parseToolResultPayload(content: unknown): unknown {
  if (content == null) return null
  if (typeof content === 'string') {
    try {
      return JSON.parse(content) as unknown
    } catch {
      return content
    }
  }
  if (Array.isArray(content)) {
    for (const block of content) {
      if (!block || typeof block !== 'object') continue
      const record = block as Record<string, unknown>
      if (record.type === 'text' && typeof record.text === 'string') {
        try {
          return JSON.parse(record.text) as unknown
        } catch {
          // fall through
        }
      }
    }
    return null
  }
  if (typeof content === 'object') return content
  return null
}

function isInventoryBatchResultSuccess(content: unknown): boolean {
  const payload = parseToolResultPayload(content)
  if (payload == null) return false
  if (Array.isArray(payload)) return payload.length > 0

  const record = payload as Record<string, unknown>
  if (record.success === false) return false
  if (Array.isArray(record.items)) return true
  if (typeof record.formatted_response === 'string') return true
  if (record.stats && typeof record.stats === 'object') return true
  return false
}

/** Called when an inventory batch tool_result arrives (success → cover codes). */
export function finalizeInventoryBatchByToolUseId(
  toolUseID: string,
  outcome: { isError: boolean; content: unknown },
): void {
  const pending = inventoryBatchPendingByToolUseId.get(toolUseID)
  if (!pending) return
  inventoryBatchPendingByToolUseId.delete(toolUseID)

  if (outcome.isError || !isInventoryBatchResultSuccess(outcome.content)) {
    return
  }

  const covered = getOrCreateCoveredSet(pending.scopeKey)
  for (const code of pending.codes) {
    covered.add(code)
  }
}

function inspectToolResultBlock(block: Record<string, unknown>): void {
  const type = block.type
  if (type !== 'tool_result' && type !== 'mcp_tool_result') return
  const toolUseId = block.tool_use_id
  if (typeof toolUseId !== 'string' || !toolUseId) return
  finalizeInventoryBatchByToolUseId(toolUseId, {
    isError: block.is_error === true,
    content: block.content,
  })
}

/** Scan SDK stream / assistant messages for batch tool results. */
export function inspectSdkMessageForInventoryBatch(msg: unknown): void {
  if (!msg || typeof msg !== 'object') return
  const record = msg as Record<string, unknown>

  if (record.type === 'stream_event') {
    const event = record.event
    if (!event || typeof event !== 'object') return
    const eventRecord = event as Record<string, unknown>
    if (eventRecord.type !== 'content_block_start') return
    const block = eventRecord.content_block
    if (block && typeof block === 'object') {
      inspectToolResultBlock(block as Record<string, unknown>)
    }
    return
  }

  const message = record.message
  if (!message || typeof message !== 'object') return
  const content = (message as Record<string, unknown>).content
  if (!Array.isArray(content)) return
  for (const block of content) {
    if (block && typeof block === 'object') {
      inspectToolResultBlock(block as Record<string, unknown>)
    }
  }
}

export async function* wrapSdkMessagesForInventoryBatch<T>(
  sdkMessages: AsyncGenerator<T, void, unknown>,
): AsyncGenerator<T, void, unknown> {
  for await (const msg of sdkMessages) {
    inspectSdkMessageForInventoryBatch(msg)
    yield msg
  }
}

export function resetToolCallRepeatState(sessionId: string): void {
  for (const key of [...sessionRepeatState.keys()]) {
    if (key === sessionId || key.startsWith(`${sessionId}\0`)) {
      sessionRepeatState.delete(key)
    }
  }
  for (const key of [...inventoryBatchCoveredByScope.keys()]) {
    if (key === sessionId || key.startsWith(`${sessionId}\0`)) {
      inventoryBatchCoveredByScope.delete(key)
    }
  }
  for (const [toolUseId, pending] of [
    ...inventoryBatchPendingByToolUseId.entries(),
  ]) {
    if (
      pending.scopeKey === sessionId ||
      pending.scopeKey.startsWith(`${sessionId}\0`)
    ) {
      inventoryBatchPendingByToolUseId.delete(toolUseId)
    }
  }
}

function recordSameToolParamAttempt(
  scopeKey: string,
  toolName: string,
  input: Record<string, unknown>,
): number {
  const repeatKey = buildToolCallRepeatKey(toolName, input)
  const prev = sessionRepeatState.get(scopeKey)
  if (!prev || prev.repeatKey !== repeatKey) {
    const next = { repeatKey, count: 1 }
    sessionRepeatState.set(scopeKey, next)
    return next.count
  }
  prev.count += 1
  return prev.count
}

export function wrapCanUseToolWithRepeatGuard(
  baseCanUseTool: CanUseToolFn,
  sessionId: string,
): CanUseToolFn {
  return async (
    tool: ToolType,
    input: Record<string, unknown>,
    context: ToolUseContext,
    assistantMessage: AssistantMessage,
    toolUseID: string,
    forceDecision?:
      | PermissionAllowDecision
      | PermissionAskDecision
      | PermissionDenyDecision,
  ) => {
    if (
      isOfficeWordMcpToolName(tool.name) ||
      isOrchestratorDelegationToolName(tool.name)
    ) {
      return baseCanUseTool(
        tool,
        input,
        context,
        assistantMessage,
        toolUseID,
        forceDecision,
      )
    }

    const scopeKey = repeatGuardScopeKey(sessionId, context.agentId)

    if (isGetInventoryByCodeSingleTool(tool.name)) {
      const code = extractSingleInventoryCode(input)
      if (code && isCodeCoveredByBatch(scopeKey, code)) {
        const message =
          `物料编号「${code}」已在本轮成功的 get_inventory_by_code_batch 结果中。请直接使用 batch 返回的 formatted_response 汇总回复，勿再调用 get_inventory_by_code。` +
          '若上一轮 batch 超时或返回 success:false，按报价 SOP 拆单重试（本拦截仅针对已成功 batch）。'
        return {
          behavior: 'deny' as const,
          message,
          decisionReason: { type: 'other' as const, reason: message },
          toolUseID,
        }
      }
    }

    const attempt = recordSameToolParamAttempt(scopeKey, tool.name, input)
    if (attempt > MAX_CONSECUTIVE_SAME_TOOL_CALLS) {
      const displayName = normalizeToolNameForRepeatGuard(tool.name)
      const message =
        `工具「${displayName}」已连续使用相同参数调用 ${attempt} 次。请基于已有返回结果直接给出最终答复；` +
        '若仍不完整，说明已得结果、缺口与下一步建议，勿再用相同参数重复调用。'
      return {
        behavior: 'deny' as const,
        message,
        decisionReason: { type: 'other' as const, reason: message },
        toolUseID,
      }
    }

    const result = await baseCanUseTool(
      tool,
      input,
      context,
      assistantMessage,
      toolUseID,
      forceDecision,
    )

    if (
      result.behavior === 'allow' &&
      isGetInventoryByCodeBatchTool(tool.name)
    ) {
      registerInventoryBatchPending(
        scopeKey,
        toolUseID,
        extractInventoryBatchCodes(input),
      )
    }

    return result
  }
}
