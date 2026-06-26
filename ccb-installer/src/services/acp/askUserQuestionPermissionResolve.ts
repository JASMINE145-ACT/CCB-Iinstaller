import type {
  PermissionAllowDecision,
  PermissionDenyDecision,
} from '../../types/permissions.js'

/** Shown when the model calls AskUserQuestion in CCB-Wanding / AionUI ACP sessions. */
export const ASK_USER_QUESTION_DENIED_USE_CHAT_MESSAGE =
  'AskUserQuestion 在 CCB-Wanding/AionUI 会话中已禁用。请在 assistant 正文中用中文向用户追问（A/B/C 选项，或多候选 markdown 表 + 请回复编码/序号），等待用户下一条聊天消息，不要调用此工具。'

export function denyAskUserQuestionUseChat(
  toolUseID: string,
): PermissionDenyDecision {
  return {
    behavior: 'deny',
    message: ASK_USER_QUESTION_DENIED_USE_CHAT_MESSAGE,
    decisionReason: {
      type: 'other',
      reason: 'AskUserQuestion disabled; use chat follow-up',
    },
    toolUseID,
  }
}

/** ACP optionId for one AskUserQuestion choice — must match AionUI MessageAcpPermission. */
export function encodeAskUserOptionId(
  questionIndex: number,
  label: string,
): string {
  return `auq:${questionIndex}:${encodeURIComponent(label)}`
}

function safeDecodeURIComponent(value: string): string | null {
  try {
    return decodeURIComponent(value)
  } catch {
    return null
  }
}

export function decodeAskUserOptionId(
  optionId: string,
): { questionIndex: number; label: string } | null {
  const match = /^auq:(\d+):(.+)$/.exec(optionId)
  if (!match) return null
  const label = safeDecodeURIComponent(match[2])
  if (label === null) return null
  return {
    questionIndex: Number(match[1]),
    label,
  }
}

/** Multi-select confirm — must match AionUI askUserQuestionIds.ts */
export function encodeAskUserMultiOptionId(
  questionIndex: number,
  labels: string[],
): string {
  return `auqm:${questionIndex}:${labels.map(label => encodeURIComponent(label)).join('|')}`
}

export function decodeAskUserMultiOptionId(
  optionId: string,
): { questionIndex: number; labels: string[] } | null {
  const match = /^auqm:(\d+):(.+)$/.exec(optionId)
  if (!match) return null
  const parts = match[2].split('|')
  const labels: string[] = []
  for (const part of parts) {
    const decoded = safeDecodeURIComponent(part)
    if (decoded === null || decoded.length === 0) return null
    labels.push(decoded)
  }
  if (labels.length === 0) return null
  return { questionIndex: Number(match[1]), labels }
}

export function resolveAskUserSelection(
  optionId: string,
  questionIndex: number,
  question: { options: Array<{ label: string }> },
): { ok: true; answer: string } | { ok: false } {
  if (optionId === 'reject') {
    return { ok: false }
  }

  const multi = decodeAskUserMultiOptionId(optionId)
  if (multi) {
    if (multi.questionIndex !== questionIndex) return { ok: false }
    const allOffered = multi.labels.every(label =>
      question.options.some(option => option.label === label),
    )
    if (!allOffered) return { ok: false }
    return { ok: true, answer: multi.labels.join(', ') }
  }

  const decoded = decodeAskUserOptionId(optionId)
  if (!decoded || decoded.questionIndex !== questionIndex) {
    return { ok: false }
  }
  const matched = question.options.find(
    option => option.label === decoded.label,
  )
  if (matched) {
    return { ok: true, answer: decoded.label }
  }
  const freeText = decoded.label.trim()
  if (freeText.length > 0) {
    return { ok: true, answer: freeText }
  }
  return { ok: false }
}

export function allowAskUserAnswers(
  input: Record<string, unknown>,
  parsed: { annotations?: unknown },
  answers: Record<string, string>,
): PermissionAllowDecision {
  return {
    behavior: 'allow',
    updatedInput: {
      ...input,
      answers,
      ...(parsed.annotations ? { annotations: parsed.annotations } : {}),
    },
  }
}

export function denyOrPartialAskUser(
  input: Record<string, unknown>,
  parsed: { annotations?: unknown },
  answers: Record<string, string>,
  toolUseID: string,
  denyMessage: string,
): PermissionAllowDecision | PermissionDenyDecision {
  if (Object.keys(answers).length > 0) {
    return allowAskUserAnswers(input, parsed, answers)
  }
  return {
    behavior: 'deny',
    message: denyMessage,
    decisionReason: { type: 'mode', mode: 'default' },
    toolUseID,
  }
}
