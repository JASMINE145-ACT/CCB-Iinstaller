import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { getClaudeConfigHomeDir } from '../../utils/envUtils.js'

export const CCB_EMPLOYEE_PROFILE_FILE = 'employee-profile.json'

/** Marker in claudeMd — used for idempotent merge (session/new + runAgent). */
export const EMPLOYEE_PROFILE_CLAUDE_MD_MARKER = '# 当前用户 / Current user'

export type EmployeeProfile = {
  displayName?: string
  addressName?: string
  department?: string
  jobTitle?: string
  employeeId?: string
  email?: string
  phone?: string
  notes?: string
  updatedAt?: string
}

type EmployeeOrgContext = {
  userId?: string
  username?: string
  displayName?: string
  department?: string
  managerUserId?: string
  managerUsername?: string
  jobTitle?: string
  workTaskRole?: string
  employmentStatus?: string
  dataScopeMax?: string
}

type EmployeeClientProfile = {
  addressName?: string
  email?: string
  phone?: string
  notes?: string
  updatedAt?: string
}

type EmployeeProfileHandoff = {
  org?: EmployeeOrgContext | null
  client?: EmployeeClientProfile | null
  cleared_at?: string
  // legacy flat v1 fields
  displayName?: string
  addressName?: string
  department?: string
  jobTitle?: string
  employeeId?: string
  email?: string
  phone?: string
  notes?: string
  updatedAt?: string
}

const MAX_NOTES_LENGTH = 500
const MAX_ADDRESS_NAME_LENGTH = 20

function trimField(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim()
  return trimmed || undefined
}

export function isMostlyCjkName(name: string): boolean {
  const cjk = name.match(/[\u4e00-\u9fff\u3400-\u4dbf]/g)?.length ?? 0
  return cjk > 0 && cjk >= name.replace(/\s/g, '').length * 0.5
}

export function derivePreferredAddressName(
  profile: EmployeeProfile,
): string | undefined {
  const explicit = trimField(profile.addressName)
  if (explicit) return explicit.slice(0, MAX_ADDRESS_NAME_LENGTH)

  const displayName = trimField(profile.displayName)
  if (!displayName) return undefined

  const compact = displayName.replace(/\s/g, '')
  if (isMostlyCjkName(compact) && compact.length >= 2) {
    return compact.slice(-2)
  }

  return displayName.slice(0, MAX_ADDRESS_NAME_LENGTH)
}

export function normalizeEmployeeProfile(
  input: EmployeeProfile | null | undefined,
): EmployeeProfile | null {
  if (!input || typeof input !== 'object') return null
  if ('cleared_at' in input) return null

  const profile: EmployeeProfile = {
    ...(trimField(input.displayName)
      ? { displayName: trimField(input.displayName) }
      : {}),
    ...(trimField(input.addressName)
      ? {
          addressName: trimField(input.addressName)!.slice(
            0,
            MAX_ADDRESS_NAME_LENGTH,
          ),
        }
      : {}),
    ...(trimField(input.department)
      ? { department: trimField(input.department) }
      : {}),
    ...(trimField(input.jobTitle)
      ? { jobTitle: trimField(input.jobTitle) }
      : {}),
    ...(trimField(input.employeeId)
      ? { employeeId: trimField(input.employeeId) }
      : {}),
    ...(trimField(input.email) ? { email: trimField(input.email) } : {}),
    ...(trimField(input.phone) ? { phone: trimField(input.phone) } : {}),
    ...(trimField(input.notes)
      ? { notes: trimField(input.notes)!.slice(0, MAX_NOTES_LENGTH) }
      : {}),
    ...(trimField(input.updatedAt)
      ? { updatedAt: trimField(input.updatedAt) }
      : {}),
  }

  return isEmployeeProfileEmpty(profile) ? null : profile
}

function normalizeOrgContext(raw: unknown): EmployeeOrgContext | null {
  if (!raw || typeof raw !== 'object') return null
  const input = raw as Record<string, unknown>
  const username = trimField(input.username)
  const displayName = trimField(input.displayName ?? input.display_name)
  if (!username && !displayName) return null

  return {
    ...(trimField(input.userId ?? input.user_id)
      ? { userId: trimField(input.userId ?? input.user_id) }
      : {}),
    ...(username ? { username } : {}),
    ...(displayName ? { displayName } : username ? { displayName: username } : {}),
    ...(trimField(input.department)
      ? { department: trimField(input.department) }
      : {}),
    ...(trimField(input.managerUserId ?? input.manager_user_id)
      ? {
          managerUserId: trimField(input.managerUserId ?? input.manager_user_id),
        }
      : {}),
    ...(trimField(input.managerUsername ?? input.manager_username)
      ? {
          managerUsername: trimField(
            input.managerUsername ?? input.manager_username,
          ),
        }
      : {}),
    ...(trimField(input.jobTitle ?? input.job_title)
      ? { jobTitle: trimField(input.jobTitle ?? input.job_title) }
      : {}),
    ...(trimField(input.workTaskRole ?? input.work_task_role)
      ? {
          workTaskRole: trimField(input.workTaskRole ?? input.work_task_role),
        }
      : {}),
    ...(trimField(input.employmentStatus ?? input.employment_status)
      ? {
          employmentStatus: trimField(
            input.employmentStatus ?? input.employment_status,
          ),
        }
      : {}),
    ...(trimField(input.dataScopeMax ?? input.data_scope_max)
      ? { dataScopeMax: trimField(input.dataScopeMax ?? input.data_scope_max) }
      : {}),
  }
}

function normalizeClientProfile(raw: unknown): EmployeeClientProfile | null {
  if (!raw || typeof raw !== 'object') return null
  const input = raw as EmployeeClientProfile
  const profile: EmployeeClientProfile = {
    ...(trimField(input.addressName)
      ? {
          addressName: trimField(input.addressName)!.slice(
            0,
            MAX_ADDRESS_NAME_LENGTH,
          ),
        }
      : {}),
    ...(trimField(input.email) ? { email: trimField(input.email) } : {}),
    ...(trimField(input.phone) ? { phone: trimField(input.phone) } : {}),
    ...(trimField(input.notes)
      ? { notes: trimField(input.notes)!.slice(0, MAX_NOTES_LENGTH) }
      : {}),
    ...(trimField(input.updatedAt)
      ? { updatedAt: trimField(input.updatedAt) }
      : {}),
  }
  return Object.keys(profile).length === 0 ? null : profile
}

/** Org authority wins over legacy flat client fields for org-owned keys. */
export function resolveEffectiveEmployeeProfile(
  handoff: EmployeeProfileHandoff | null | undefined,
): EmployeeProfile | null {
  if (!handoff || typeof handoff !== 'object') return null
  if ('cleared_at' in handoff && handoff.cleared_at) return null

  const org = normalizeOrgContext(handoff.org)
  const client = normalizeClientProfile(handoff.client)

  if (org || client) {
    const merged: EmployeeProfile = {
      ...(org?.displayName ? { displayName: org.displayName } : {}),
      ...(client?.addressName ? { addressName: client.addressName } : {}),
      ...(org?.department ? { department: org.department } : {}),
      ...(org?.jobTitle ? { jobTitle: org.jobTitle } : {}),
      ...(org?.username ? { employeeId: org.username } : {}),
      ...(client?.email ? { email: client.email } : {}),
      ...(client?.phone ? { phone: client.phone } : {}),
      ...(client?.notes ? { notes: client.notes } : {}),
      updatedAt: client?.updatedAt ?? new Date().toISOString(),
    }
    return normalizeEmployeeProfile(merged)
  }

  return normalizeEmployeeProfile(handoff as EmployeeProfile)
}

export function isEmployeeProfileEmpty(
  profile: EmployeeProfile | null | undefined,
): boolean {
  if (!profile) return true
  return !(
    profile.displayName ||
    profile.addressName ||
    profile.department ||
    profile.jobTitle ||
    profile.employeeId ||
    profile.email ||
    profile.phone ||
    profile.notes
  )
}

export function formatEmployeeProfileClaudeMd(
  profile: EmployeeProfile | null | undefined,
  org?: EmployeeOrgContext | null,
): string | undefined {
  const normalized = normalizeEmployeeProfile(profile)
  if (!normalized) return undefined

  const addressName = derivePreferredAddressName(normalized)

  const lines = [EMPLOYEE_PROFILE_CLAUDE_MD_MARKER, '']

  if (org) {
    lines.push(
      '- 组织身份信息以公司账号为准（服务器同步）；个人补充说明见下方登记信息。',
      '',
    )
  }

  if (addressName) {
    lines.push('## 对话称呼 / Addressing the user', '')
    lines.push(`- **日常称呼 / Preferred address:** ${addressName}`)
    if (normalized.displayName && normalized.displayName !== addressName) {
      lines.push(`- **登记姓名 / Registered name:** ${normalized.displayName}`)
    }
    lines.push(
      `- 在问候、确认、任务完成与交接时，**优先用「${addressName}」称呼用户**，例如：「好的${addressName}，…」「${addressName}，还有什么需要帮忙的吗？」`,
      '- 每轮回复 1–2 次即可，自然即可；不要机械地在每句话末尾重复称呼。',
      '- 用户**未**询问身份/个人信息时，**不要**主动列出下方完整登记表；仅在用户明确问「我是谁/我的信息/个人信息」时结构化回答。',
      '- 勿向第三方泄露未必要的个人信息。',
      '',
    )
  }

  lines.push('## 登记信息 / Registered profile', '')
  if (normalized.displayName)
    lines.push(`- **姓名 / Name:** ${normalized.displayName}`)
  if (normalized.department)
    lines.push(`- **部门 / Department:** ${normalized.department}`)
  if (normalized.jobTitle)
    lines.push(`- **职位 / Title:** ${normalized.jobTitle}`)
  if (normalized.employeeId)
    lines.push(`- **工号 / Employee ID:** ${normalized.employeeId}`)
  if (org?.managerUsername)
    lines.push(`- **直属上级 / Manager:** ${org.managerUsername}`)
  if (org?.employmentStatus)
    lines.push(`- **在职状态 / Status:** ${org.employmentStatus}`)
  if (normalized.email) lines.push(`- **邮箱 / Email:** ${normalized.email}`)
  if (normalized.phone) lines.push(`- **电话 / Phone:** ${normalized.phone}`)
  if (normalized.notes) lines.push(`- **补充 / Notes:** ${normalized.notes}`)

  return lines.join('\n')
}

function readEmployeeProfileHandoff(
  configDir = getClaudeConfigHomeDir(),
): EmployeeProfileHandoff | null {
  const filePath = join(configDir, CCB_EMPLOYEE_PROFILE_FILE)
  if (!existsSync(filePath)) return null
  try {
    return JSON.parse(
      readFileSync(filePath, 'utf8').replace(/^\uFEFF/, ''),
    ) as EmployeeProfileHandoff
  } catch {
    return null
  }
}

export function readEmployeeProfile(
  configDir = getClaudeConfigHomeDir(),
): EmployeeProfile | null {
  const handoff = readEmployeeProfileHandoff(configDir)
  return resolveEffectiveEmployeeProfile(handoff)
}

export function readEmployeeProfileOrgContext(
  configDir = getClaudeConfigHomeDir(),
): EmployeeOrgContext | null {
  const handoff = readEmployeeProfileHandoff(configDir)
  if (!handoff?.org) return null
  return normalizeOrgContext(handoff.org)
}

export function userContextHasEmployeeProfile(
  base: { [k: string]: string } | undefined,
): boolean {
  return Boolean(base?.claudeMd?.includes(EMPLOYEE_PROFILE_CLAUDE_MD_MARKER))
}

export function appendEmployeeProfileToUserContext(
  base: { [k: string]: string } | undefined,
  configDir = getClaudeConfigHomeDir(),
): { [k: string]: string } | undefined {
  const handoff = readEmployeeProfileHandoff(configDir)
  const profile = resolveEffectiveEmployeeProfile(handoff)
  const org = handoff?.org ? normalizeOrgContext(handoff.org) : null
  const employeeBlock = formatEmployeeProfileClaudeMd(profile, org)
  if (!employeeBlock) return base
  if (!base) return { claudeMd: employeeBlock }
  const mergedClaudeMd = base.claudeMd
    ? `${base.claudeMd}\n\n${employeeBlock}`
    : employeeBlock
  return { ...base, claudeMd: mergedClaudeMd }
}

/**
 * Merge employee profile into a subagent's resolved userContext (post omitClaudeMd).
 * Idempotent: skips when marker already present (e.g. parent override already injected).
 */
export function mergeEmployeeProfileIntoResolvedUserContext(
  resolved: { [k: string]: string } | undefined,
  configDir = getClaudeConfigHomeDir(),
): { [k: string]: string } | undefined {
  if (userContextHasEmployeeProfile(resolved)) return resolved
  return appendEmployeeProfileToUserContext(resolved, configDir)
}
