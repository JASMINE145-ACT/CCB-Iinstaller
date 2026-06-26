import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { getClaudeConfigHomeDir } from '../../utils/envUtils.js'
import { agentIdLookupCandidates, normalizeAgentId } from './agentIds.js'

export type CcbAgentSidecarSource = 'user' | 'bundled' | 'imported'

export type CcbAgentSidecar = {
  schema_version: 1
  agent_id: string
  guid_primary?: boolean
  delegatable?: boolean
  enabled?: boolean
  avatar?: string
  sort_order?: number
  recommended_prompts?: string[]
  claude_md?: string
  mcp_allowlist?: string[]
  skills?: { enabled: string[]; disabled: string[] }
  source?: CcbAgentSidecarSource
  created_at?: string
  updated_at?: string
}

export function agentsDir(configDir = getClaudeConfigHomeDir()): string {
  return join(configDir, 'agents')
}

function sidecarPath(id: string, configDir = getClaudeConfigHomeDir()): string {
  const safeId = normalizeAgentId(id)
  if (!safeId) throw new Error('Invalid agent id')
  return join(agentsDir(configDir), `${safeId}.aionui.json`)
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : []
}

function normalizeSidecar(
  value: unknown,
  defaultAgentId: string,
): CcbAgentSidecar | null {
  if (!value || typeof value !== 'object') return null
  const raw = value as Record<string, unknown>
  const agent_id = normalizeAgentId(String(raw.agent_id ?? defaultAgentId))
  if (!agent_id) return null

  const skills =
    raw.skills && typeof raw.skills === 'object'
      ? (raw.skills as Record<string, unknown>)
      : {}

  const source =
    raw.source === 'bundled' || raw.source === 'imported' ? raw.source : 'user'

  return {
    schema_version: 1,
    agent_id,
    guid_primary: raw.guid_primary === true,
    delegatable: raw.delegatable !== false,
    enabled: raw.enabled !== false,
    ...(typeof raw.avatar === 'string' && raw.avatar.trim()
      ? { avatar: raw.avatar.trim() }
      : {}),
    ...(typeof raw.sort_order === 'number' ? { sort_order: raw.sort_order } : {}),
    recommended_prompts: stringArray(raw.recommended_prompts),
    ...(typeof raw.claude_md === 'string' && raw.claude_md.trim()
      ? { claude_md: raw.claude_md.trim() }
      : {}),
    mcp_allowlist: stringArray(raw.mcp_allowlist),
    skills: {
      enabled: stringArray(skills.enabled),
      disabled: stringArray(skills.disabled),
    },
    source,
    ...(typeof raw.created_at === 'string' ? { created_at: raw.created_at } : {}),
    ...(typeof raw.updated_at === 'string' ? { updated_at: raw.updated_at } : {}),
  }
}

export function readAgentSidecar(
  id: string,
  configDir = getClaudeConfigHomeDir(),
): CcbAgentSidecar | null {
  for (const candidate of agentIdLookupCandidates(id)) {
    try {
      const path = sidecarPath(candidate, configDir)
      if (!existsSync(path)) continue
      const raw = JSON.parse(
        readFileSync(path, 'utf8').replace(/^\uFEFF/, ''),
      )
      const sidecar = normalizeSidecar(raw, candidate)
      if (sidecar) return sidecar
    } catch {
      // try next alias
    }
  }
  return null
}

export function isAgentDelegatable(
  id: string,
  configDir = getClaudeConfigHomeDir(),
): boolean {
  const sidecar = readAgentSidecar(id, configDir)
  if (!sidecar) return true
  return sidecar.delegatable !== false
}

export function isGuidPrimaryAgent(
  id: string,
  configDir = getClaudeConfigHomeDir(),
): boolean {
  const sidecar = readAgentSidecar(id, configDir)
  return sidecar?.guid_primary === true
}
