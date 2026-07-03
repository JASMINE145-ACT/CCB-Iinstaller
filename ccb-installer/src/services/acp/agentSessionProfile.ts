import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { basename, join } from 'node:path'
import {
  isBuiltInAgent,
  isPluginAgent,
  type AgentDefinition,
} from '@claude-code-best/builtin-tools/tools/AgentTool/loadAgentsDir.js'
import { EXECUTE_TOOL_NAME } from '@claude-code-best/builtin-tools/tools/ExecuteTool/constants.js'
import { SEARCH_EXTRA_TOOLS_TOOL_NAME } from '@claude-code-best/builtin-tools/tools/SearchExtraToolsTool/prompt.js'
import type { CanUseToolFn } from '../../hooks/useCanUseTool.js'
import type {
  PermissionAllowDecision,
  PermissionAskDecision,
  PermissionDenyDecision,
} from '../../types/permissions.js'
import type { Tool as ToolType, ToolUseContext } from '../../Tool.js'
import type { AssistantMessage } from '../../types/message.js'
import { getClaudeConfigHomeDir } from '../../utils/envUtils.js'
import { parseFrontmatter } from '../../utils/frontmatterParser.js'
import { agentIdLookupCandidates, normalizeAgentId } from './agentIds.js'
import {
  agentsDir,
  isAgentDelegatable,
  readAgentSidecar,
  type CcbAgentSidecar,
} from './agentSidecar.js'
import {
  buildAssistantClaudeMdContext,
  consumeNextAssistantProfileId,
  getAssistantProfile,
  peekNextAssistantProfileId,
  resolveAssistantProfileIdFromMeta,
  type CcbAssistantProfile,
} from './assistantProfiles.js'

export type AgentSessionProfileSource = 'agent' | 'assistant'

export type AgentSessionProfile = CcbAssistantProfile & {
  sessionProfileSource: AgentSessionProfileSource
}

export type GuidPrimaryAgentEntry = {
  id: string
  name: string
  description?: string
  avatar?: string
  sort_order?: number
}

export type ResolvedSessionProfile = {
  profile: CcbAssistantProfile | null
  profileId: string | undefined
  source: AgentSessionProfileSource | undefined
}

/** Default WanD orchestrator when no preset/handoff is staged */
export const CCB_DEFAULT_SESSION_AGENT_ID = 'wande-orchestrator'

/** Bundled agents retained for WanD routing + office presets */
export const CCB_WANDING_KEEP_AGENT_IDS = new Set([
  'wande-orchestrator',
  'quotation-agent',
  'accurate-agent',
  'research-agent',
  'price-library-agent',
  'cowork',
  'word-creator',
  'word-form-creator',
  'ppt-creator',
  'excel-creator',
])

/** Guid-only specialists — kept in fleet but not delegatable from default router */
export const CCB_GUID_ONLY_AGENT_IDS = new Set(['price-library-agent'])

/** Specialists the default router may delegate to (keep set minus orchestrator and Guid-only) */
export const CCB_ROUTER_DELEGATABLE_AGENT_IDS = new Set(
  [...CCB_WANDING_KEEP_AGENT_IDS].filter(
    id => id !== CCB_DEFAULT_SESSION_AGENT_ID && !CCB_GUID_ONLY_AGENT_IDS.has(id),
  ),
)

/** @deprecated Use CCB_ROUTER_DELEGATABLE_AGENT_IDS */
export const CCB_WANDING_DELEGATABLE_AGENT_IDS = CCB_ROUTER_DELEGATABLE_AGENT_IDS

/** Office Guid presets — delegatable from default router */
export const CCB_WANDING_OFFICE_PRESET_IDS = new Set([
  'cowork',
  'word-creator',
  'word-form-creator',
  'ppt-creator',
  'excel-creator',
])

/** Fallback claude_md when orchestrator sidecar has no claude_md (avoids global CLAUDE.md persona bleed) */
export const WANDE_ORCHESTRATOR_ROUTER_CLAUDE_MD = `# 全局路由 / Global Router

你是 CCB-Wanding 默认会话的全局路由助手，不直接执行业务 MCP 或办公技能。
根据意图委派子助手：quotation-agent（报价/库存）、accurate-agent（账务）、cowork / word-creator / ppt-creator / excel-creator 等（办公）。
禁止复述 CLAUDE.md 能力表。`

/** Guid preset / specialist sessions with a dedicated MCP allowlist — no Agent() delegation */
export function isSpecialistDirectSession(
  sessionProfileId: string | undefined,
  profile: CcbAssistantProfile | null | undefined,
): boolean {
  if (!sessionProfileId?.trim() || !profile) return false
  if (normalizeAgentId(sessionProfileId) === CCB_DEFAULT_SESSION_AGENT_ID) {
    return false
  }
  return profile.defaults.mcp.enabled.length > 0
}

function parseMcpServersFromFrontmatter(
  frontmatter: Record<string, unknown>,
): string[] {
  const raw = frontmatter.mcpServers
  if (Array.isArray(raw)) {
    return raw
      .filter((item): item is string => typeof item === 'string')
      .map(item => item.trim())
      .filter(Boolean)
  }
  if (typeof raw === 'string' && raw.trim()) {
    return raw
      .split(',')
      .map(item => item.trim())
      .filter(Boolean)
  }
  return []
}

/** Block global CLAUDE.md persona bleed when a session profile is (partially) bound */
export function resolveSessionUserContextOverride(args: {
  assistantProfile: CcbAssistantProfile | null | undefined
  sessionProfileId: string | undefined
  presetContext?: string
}): { [k: string]: string } | undefined {
  const { assistantProfile, sessionProfileId, presetContext } = args
  const currentDate = `Today's date is ${new Date().toISOString().slice(0, 10)}.`

  if (assistantProfile) {
    const systemPrompt = assistantProfile.instructions.system_prompt?.trim()

    if (systemPrompt) {
      if (isSpecialistDirectSession(sessionProfileId, assistantProfile)) {
        const id = normalizeAgentId(sessionProfileId!)
        return {
          claudeMd: `# 专家会话 / Specialist session\n\n本会话已绑定 **${id}**。你是该领域专家，**直接调用专属 MCP**；勿委派给其他 agent，勿套用全局路由（wande-orchestrator）规则。`,
          currentDate,
        }
      }
      return { currentDate }
    }

    const fromSidecar = buildAssistantClaudeMdContext(assistantProfile)
    if (fromSidecar?.claudeMd) return fromSidecar

    if (
      sessionProfileId &&
      normalizeAgentId(sessionProfileId) === CCB_DEFAULT_SESSION_AGENT_ID
    ) {
      return { claudeMd: WANDE_ORCHESTRATOR_ROUTER_CLAUDE_MD, currentDate }
    }

    if (isSpecialistDirectSession(sessionProfileId, assistantProfile)) {
      const id = normalizeAgentId(sessionProfileId!)
      return {
        claudeMd: `# 专家会话 / Specialist session\n\n本会话已绑定 **${id}**。你是该领域专家，**直接调用专属 MCP**；勿委派给其他 agent，勿套用全局路由（wande-orchestrator）规则。`,
        currentDate,
      }
    }

    return { currentDate }
  }

  if (sessionProfileId?.trim()) {
    const id = normalizeAgentId(sessionProfileId)
    return {
      claudeMd: `# 会话 agent: ${id}\n\nagents/${id} profile 未找到；请检查 live agents 目录或重新 deploy 种子。`,
      currentDate,
    }
  }

  if (presetContext?.trim()) {
    return { claudeMd: presetContext.trim(), currentDate }
  }

  return undefined
}

export function resolveDefaultSessionAgentId(
  configDir = getClaudeConfigHomeDir(),
): string | undefined {
  return getAgentSessionProfile(CCB_DEFAULT_SESSION_AGENT_ID, configDir)
    ? CCB_DEFAULT_SESSION_AGENT_ID
    : undefined
}

/** Resolve bound agent id for session/new (meta → handoff peek/consume → default). */
export function resolveSessionProfileIdForCreate(
  meta: Record<string, unknown> | null | undefined,
  options?: { consumeHandoff?: boolean; configDir?: string },
): {
  profileId: string | undefined
  source: 'meta' | 'handoff' | 'default' | undefined
} {
  const configDir = options?.configDir ?? getClaudeConfigHomeDir()
  const fromMeta = resolveSessionAgentIdFromMeta(meta)
  if (fromMeta?.trim()) {
    return {
      profileId: normalizeAgentId(fromMeta.trim()),
      source: 'meta',
    }
  }
  const handoff = options?.consumeHandoff
    ? consumeNextAssistantProfileId(configDir)
    : peekNextAssistantProfileId(configDir)
  if (handoff?.trim()) {
    return {
      profileId: normalizeAgentId(handoff.trim()),
      source: 'handoff',
    }
  }
  const defaultId = resolveDefaultSessionAgentId(configDir)
  return defaultId
    ? { profileId: defaultId, source: 'default' }
    : { profileId: undefined, source: undefined }
}

type ParsedAgentMd = {
  frontmatter: Record<string, unknown>
  body: string
}

function agentMdPath(id: string, configDir = getClaudeConfigHomeDir()): string {
  const safeId = normalizeAgentId(id)
  if (!safeId) throw new Error('Invalid agent id')
  return join(agentsDir(configDir), `${safeId}.md`)
}

function readAgentMd(
  id: string,
  configDir = getClaudeConfigHomeDir(),
): ParsedAgentMd | null {
  for (const candidate of agentIdLookupCandidates(id)) {
    const paths = [
      agentMdPath(candidate, configDir),
      join(agentsDir(configDir), `${candidate}.md`),
    ]
    for (const path of [...new Set(paths)]) {
      try {
        if (!existsSync(path)) continue
        const raw = readFileSync(path, 'utf8').replace(/^\uFEFF/, '')
        const { frontmatter, content } = parseFrontmatter(raw)
        const name = frontmatter['name']
        if (!name || typeof name !== 'string') continue
        return {
          frontmatter: frontmatter as Record<string, unknown>,
          body: content.trim(),
        }
      } catch {
        // try next alias
      }
    }
  }
  return null
}

function parseSkillsFromFrontmatter(value: unknown): string[] {
  if (typeof value !== 'string' || !value.trim()) return []
  return value
    .split(',')
    .map(skill => skill.trim())
    .filter(Boolean)
}

function projectAgentToProfile(
  md: ParsedAgentMd,
  sidecar: CcbAgentSidecar | null,
  lookupId: string,
): CcbAssistantProfile | null {
  const name =
    typeof md.frontmatter.name === 'string' ? md.frontmatter.name.trim() : ''
  const description =
    typeof md.frontmatter.description === 'string'
      ? md.frontmatter.description.replace(/\\n/g, '\n').trim()
      : ''
  const id = normalizeAgentId(
    sidecar?.agent_id ?? String(md.frontmatter.name ?? lookupId),
  )
  if (!id || !name) return null

  const now = new Date().toISOString()
  const modelRaw = md.frontmatter.model
  const model =
    typeof modelRaw === 'string' &&
    modelRaw.trim() &&
    modelRaw.trim().toLowerCase() !== 'inherit'
      ? modelRaw.trim()
      : null
  const permissionModeRaw = md.frontmatter.permissionMode
  const permission_mode =
    typeof permissionModeRaw === 'string' && permissionModeRaw.trim()
      ? permissionModeRaw.trim()
      : null

  const skillsFromSidecar = sidecar?.skills?.enabled ?? []
  const skillsFromFrontmatter = parseSkillsFromFrontmatter(md.frontmatter.skills)
  const system_prompt = md.body.trim() || undefined
  const mcpFromFrontmatter = parseMcpServersFromFrontmatter(md.frontmatter)
  const mcpEnabled =
    mcpFromFrontmatter.length > 0
      ? mcpFromFrontmatter
      : (sidecar?.mcp_allowlist ?? [])

  return {
    schema_version: 1,
    id,
    name,
    ...(description ? { description } : {}),
    ...(sidecar?.avatar ? { avatar: sidecar.avatar } : {}),
    enabled: sidecar?.enabled !== false,
    source: sidecar?.source ?? 'user',
    created_at: sidecar?.created_at ?? now,
    updated_at: sidecar?.updated_at ?? now,
    instructions: {
      ...(system_prompt ? { system_prompt } : {}),
    },
    recommended_prompts: sidecar?.recommended_prompts ?? [],
    defaults: {
      model,
      permission_mode,
      skills: {
        enabled:
          skillsFromSidecar.length > 0 ? skillsFromSidecar : skillsFromFrontmatter,
        disabled: sidecar?.skills?.disabled ?? [],
      },
      mcp: {
        enabled: mcpEnabled,
        disabled: [],
      },
    },
  }
}

export function getAgentSessionProfile(
  id: string,
  configDir = getClaudeConfigHomeDir(),
): AgentSessionProfile | null {
  const md = readAgentMd(id, configDir)
  if (!md) return null
  const sidecar = readAgentSidecar(id, configDir)
  const profile = projectAgentToProfile(md, sidecar, id)
  if (!profile) return null
  return { ...profile, sessionProfileSource: 'agent' }
}

export function resolveSessionAgentIdFromMeta(
  meta: Record<string, unknown> | null | undefined,
): string | undefined {
  if (!meta) return undefined

  const directCandidates = [meta.ccbAgentId, meta.ccb_agent_id]
  for (const candidate of directCandidates) {
    if (typeof candidate === 'string' && candidate.trim()) {
      return candidate.trim()
    }
  }

  const acpMeta = meta.acp_meta
  if (acpMeta && typeof acpMeta === 'object') {
    const nested = acpMeta as Record<string, unknown>
    if (typeof nested.ccbAgentId === 'string' && nested.ccbAgentId.trim()) {
      return nested.ccbAgentId.trim()
    }
    if (typeof nested.ccb_agent_id === 'string' && nested.ccb_agent_id.trim()) {
      return nested.ccb_agent_id.trim()
    }
  }

  const claudeCode = meta.claudeCode
  if (claudeCode && typeof claudeCode === 'object') {
    const options = (claudeCode as Record<string, unknown>).options
    if (options && typeof options === 'object') {
      const optionRecord = options as Record<string, unknown>
      if (
        typeof optionRecord.ccbAgentId === 'string' &&
        optionRecord.ccbAgentId.trim()
      ) {
        return optionRecord.ccbAgentId.trim()
      }
      if (
        typeof optionRecord.ccb_agent_id === 'string' &&
        optionRecord.ccb_agent_id.trim()
      ) {
        return optionRecord.ccb_agent_id.trim()
      }
    }
  }

  return resolveAssistantProfileIdFromMeta(meta)
}

export function resolveSessionProfile(
  id: string | undefined,
  configDir = getClaudeConfigHomeDir(),
): ResolvedSessionProfile {
  if (!id) {
    return { profile: null, profileId: undefined, source: undefined }
  }

  const agentProfile = getAgentSessionProfile(id, configDir)
  if (agentProfile) {
    const { sessionProfileSource, ...profile } = agentProfile
    return { profile, profileId: id, source: sessionProfileSource }
  }

  const assistantProfile = getAssistantProfile(id, configDir)
  if (assistantProfile) {
    return { profile: assistantProfile, profileId: id, source: 'assistant' }
  }

  return { profile: null, profileId: id, source: undefined }
}

export function listGuidPrimaryAgents(
  configDir = getClaudeConfigHomeDir(),
): GuidPrimaryAgentEntry[] {
  let entries: string[] = []
  try {
    entries = readdirSync(agentsDir(configDir))
  } catch {
    return []
  }

  const result: GuidPrimaryAgentEntry[] = []
  for (const entry of entries) {
    if (!entry.endsWith('.md')) continue
    const id = basename(entry, '.md')
    const sidecar = readAgentSidecar(id, configDir)
    if (sidecar?.guid_primary !== true) continue
    const profile = getAgentSessionProfile(id, configDir)
    if (!profile) continue
    result.push({
      id: profile.id,
      name: profile.name,
      ...(profile.description ? { description: profile.description } : {}),
      ...(profile.avatar ? { avatar: profile.avatar } : {}),
      ...(sidecar.sort_order !== undefined
        ? { sort_order: sidecar.sort_order }
        : {}),
    })
  }

  return result.sort((a, b) => {
    const orderA = a.sort_order ?? 9999
    const orderB = b.sort_order ?? 9999
    if (orderA !== orderB) return orderA - orderB
    return a.name.localeCompare(b.name)
  })
}

/** Strip UTF-8 BOM from agents/*.md — PowerShell Set-Content -Encoding UTF8 breaks frontmatter parsing. */
export function repairAgentMarkdownBomIfNeeded(
  configDir = getClaudeConfigHomeDir(),
): string[] {
  const repaired: string[] = []
  let entries: string[]
  try {
    entries = readdirSync(agentsDir(configDir))
  } catch {
    return repaired
  }

  for (const entry of entries) {
    if (!entry.endsWith('.md')) continue
    const path = join(agentsDir(configDir), entry)
    try {
      const raw = readFileSync(path)
      if (
        raw.length >= 3 &&
        raw[0] === 0xef &&
        raw[1] === 0xbb &&
        raw[2] === 0xbf
      ) {
        writeFileSync(path, raw.subarray(3))
        repaired.push(basename(entry, '.md'))
      }
    } catch {
      // try next file
    }
  }

  if (repaired.length > 0) {
    console.info(
      `[ACP] stripped UTF-8 BOM from agent markdown: ${repaired.join(', ')}`,
    )
  }
  return repaired
}

export function filterDelegatableCustomAgents(
  agents: AgentDefinition[],
  configDir = getClaudeConfigHomeDir(),
): AgentDefinition[] {
  return agents.filter(agent => {
    if (isBuiltInAgent(agent) || isPluginAgent(agent)) {
      return true
    }
    const lookupId = agent.filename ?? agent.agentType
    return isAgentDelegatable(lookupId, configDir)
  })
}

const WAN_D_DELEGATION_INTENT: Record<string, string> = {
  'quotation-agent':
    'pricing, inventory, product match, quotation sheets (e.g. 查价, 询价, 库存)',
  'accurate-agent':
    'Accurate purchase/sales totals, vendor/customer search (e.g. 采购额, 销售额)',
  cowork: 'general autonomous tasks, file ops, multi-step workflows',
  'word-creator': 'Word document creation and editing',
  'word-form-creator': 'fillable Word forms (.docx)',
  'ppt-creator': 'PowerPoint presentations',
  'excel-creator': 'Excel spreadsheets',
  'research-agent':
    'web research, policy/industry intel, evidence files in research/*.md (e.g. 调研, 搜资料, 查政策)',
}

export function buildWanDDelegationIndex(
  agents: AgentDefinition[],
): string {
  const lines = [
    '## Delegation index (auto-generated)',
    '',
    'Delegate to the right specialist via **Agent** tool:',
    '',
  ]

  for (const agent of agents) {
    if (isBuiltInAgent(agent) || isPluginAgent(agent)) continue
    const id = agent.filename ?? agent.agentType
    if (!CCB_ROUTER_DELEGATABLE_AGENT_IDS.has(id)) continue
    const description =
      agent.whenToUse?.trim() ||
      WAN_D_DELEGATION_INTENT[id] ||
      ''
    lines.push(`- **${id}**: ${description}`)
  }

  lines.push(
    '',
    'Do **not** use built-in Explore/Plan agents for WanD quotation, Accurate analytics, or office document tasks when a specialist above applies.',
  )

  return lines.join('\n')
}

export function appendWanDDelegationIndex(
  systemPrompt: string | undefined,
  agents: AgentDefinition[],
): string {
  const index = buildWanDDelegationIndex(agents)
  if (!systemPrompt?.trim()) return index
  return `${systemPrompt.trim()}\n\n${index}`
}

const ORCHESTRATOR_BLOCKED_MCP_PREFIXES = [
  'mcp__quotation__',
  'mcp__accurate__',
] as const

const WANDING_BUSINESS_SOP_MARKERS = [
  'ccb-wanding-quotation',
  'ccb-wanding-accurate',
  'wanding_business_knowledge',
  'vendor/wanding/data',
  'vendor\\wanding\\data',
] as const

export function isWandeOrchestratorSession(
  sessionProfileId: string | undefined,
): boolean {
  return (
    normalizeAgentId(sessionProfileId ?? '') === CCB_DEFAULT_SESSION_AGENT_ID
  )
}

function normalizePathForGuard(path: string): string {
  return path.replace(/\\/g, '/').toLowerCase()
}

export function isWandingBusinessDataPath(path: string | undefined): boolean {
  if (!path?.trim()) return false
  const normalized = normalizePathForGuard(path)
  return WANDING_BUSINESS_SOP_MARKERS.some(marker =>
    normalized.includes(marker.toLowerCase()),
  )
}

function isBlockedOrchestratorMcpToolName(toolName: string): boolean {
  return ORCHESTRATOR_BLOCKED_MCP_PREFIXES.some(prefix =>
    toolName.startsWith(prefix),
  )
}

/** Claude Code Agent tool name (subagent delegation). */
export const ORCHESTRATOR_AGENT_TOOL_NAME = 'Agent'

/** Polls background Agent tasks — WanD orchestrator must sync-wait Agent() instead. */
export const ORCHESTRATOR_TASK_OUTPUT_TOOL_NAME = 'TaskOutput'

function isTruthy(value: unknown): boolean {
  return value === true || value === 'true'
}

/** True when orchestrator tries to delegate via background Agent (WanD forbids). */
export function orchestratorAgentWantsBackground(
  input: Record<string, unknown>,
): boolean {
  return isTruthy(input.run_in_background)
}

/**
 * WanD orchestrator must delegate synchronously so the user gets paths/tables in the same turn.
 * Strips run_in_background instead of denying so the model need not retry.
 */
export function sanitizeOrchestratorAgentInput(
  toolName: string,
  input: Record<string, unknown>,
): Record<string, unknown> {
  if (toolName !== ORCHESTRATOR_AGENT_TOOL_NAME) {
    return input
  }
  if (!('run_in_background' in input)) {
    return input
  }
  const next = { ...input }
  delete next.run_in_background
  return next
}

export function evaluateOrchestratorToolGuard(
  toolName: string,
  input: Record<string, unknown>,
): { blocked: true; message: string } | { blocked: false } {
  if (toolName === ORCHESTRATOR_TASK_OUTPUT_TOOL_NAME) {
    return {
      blocked: true,
      message:
        'wande-orchestrator 不得使用 TaskOutput 轮询后台任务。请同步等待 Agent(quotation-agent|accurate-agent|办公子助手) 完成并汇总其返回；勿声称需要「授权 MCP」。',
    }
  }

  if (isBlockedOrchestratorMcpToolName(toolName)) {
    return {
      blocked: true,
      message:
        'wande-orchestrator 不得直接调用业务 MCP。请使用 Agent 工具委派 quotation-agent 或 accurate-agent。',
    }
  }

  if (toolName === EXECUTE_TOOL_NAME) {
    const target =
      typeof input.tool_name === 'string' ? input.tool_name.trim() : ''
    if (target && isBlockedOrchestratorMcpToolName(target)) {
      return {
        blocked: true,
        message:
          'wande-orchestrator 不得通过 ExecuteExtraTool 调用 quotation/accurate MCP。请委派 quotation-agent 或 accurate-agent。',
      }
    }
  }

  if (toolName === SEARCH_EXTRA_TOOLS_TOOL_NAME) {
    const query = typeof input.query === 'string' ? input.query.toLowerCase() : ''
    if (
      query.includes('mcp__quotation') ||
      query.includes('mcp__accurate') ||
      query.includes('quotation') ||
      query.includes('accurate')
    ) {
      return {
        blocked: true,
        message:
          'wande-orchestrator 不得搜索业务 MCP。请使用 Agent(quotation-agent) 或 Agent(accurate-agent)。',
      }
    }
  }

  const pathCandidates = [
    input.file_path,
    input.path,
    input.pattern,
  ].filter((value): value is string => typeof value === 'string')

  if (
    (toolName === 'Read' || toolName === 'Grep' || toolName === 'Glob') &&
    pathCandidates.some(isWandingBusinessDataPath)
  ) {
    return {
      blocked: true,
      message:
        'wande-orchestrator 不得读取万鼎业务 SOP 文件。请委派 quotation-agent 或 accurate-agent。',
    }
  }

  return { blocked: false }
}

export function wrapCanUseToolForWandeOrchestrator(
  baseCanUseTool: CanUseToolFn,
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
    // Delegated sub-agents (quotation-agent, etc.) run with their own agentId + MCP.
    if (context.agentId) {
      return baseCanUseTool(
        tool,
        input,
        context,
        assistantMessage,
        toolUseID,
        forceDecision,
      )
    }

    const sanitizedInput = sanitizeOrchestratorAgentInput(tool.name, input)

    const guard = evaluateOrchestratorToolGuard(tool.name, sanitizedInput)
    if (guard.blocked) {
      return {
        behavior: 'deny',
        message: guard.message,
        decisionReason: { type: 'other', reason: guard.message },
        toolUseID,
      }
    }
    return baseCanUseTool(
      tool,
      sanitizedInput,
      context,
      assistantMessage,
      toolUseID,
      forceDecision,
    )
  }
}
