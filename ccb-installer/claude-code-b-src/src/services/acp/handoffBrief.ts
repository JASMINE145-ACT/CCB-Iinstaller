/**
 * WANd.RUN.EXECUTION.003 — structured Agent() handoff Brief.
 * Carrier: Markdown sections + marker (Agent `prompt` stays a string).
 */

export const BRIEF_MARKER = '<!-- WANd.HANDOFF.BRIEF.001 -->'

export type BriefEffort = 'low' | 'medium' | 'high'

export type HandoffBrief = {
  goal: string
  inputs: string
  expected_output: string
  prohibitions: string
  effort: BriefEffort
}

export const DEFAULT_INPUTS = '(none)'
export const DEFAULT_EXPECTED_OUTPUT =
  '可直接展示给用户的结果（表格/路径/结论）；失败时说明原因。'
export const DEFAULT_PROHIBITIONS =
  '不做额外查询；不擅自加码 top-N/排行/明细，除非 Goal 明确要求。仅回答以上需求。'
export const DEFAULT_EFFORT: BriefEffort = 'low'
export const EMPTY_GOAL_FALLBACK = '(empty goal)'

function normalizeSectionKey(raw: string): keyof HandoffBrief | null {
  const k = raw.trim().toLowerCase().replace(/\s+/g, ' ')
  if (k === 'goal') return 'goal'
  if (k === 'inputs') return 'inputs'
  if (k === 'expected_output' || k === 'expected output') return 'expected_output'
  if (k === 'prohibitions') return 'prohibitions'
  if (k === 'effort') return 'effort'
  return null
}

function parseEffort(raw: string): BriefEffort {
  const v = raw.trim().toLowerCase()
  if (v === 'medium' || v === 'high' || v === 'low') return v
  return DEFAULT_EFFORT
}

export function isStructuredHandoffBrief(prompt: string): boolean {
  return typeof prompt === 'string' && prompt.includes(BRIEF_MARKER)
}

export function formatHandoffBrief(brief: HandoffBrief): string {
  return [
    BRIEF_MARKER,
    '## Goal',
    brief.goal.trim(),
    '',
    '## Inputs',
    brief.inputs.trim() || DEFAULT_INPUTS,
    '',
    '## Expected output',
    brief.expected_output.trim() || DEFAULT_EXPECTED_OUTPUT,
    '',
    '## Prohibitions',
    brief.prohibitions.trim() || DEFAULT_PROHIBITIONS,
    '',
    '## Effort',
    brief.effort,
    '',
  ].join('\n')
}

export function parseHandoffBrief(prompt: string): HandoffBrief | null {
  if (!isStructuredHandoffBrief(prompt)) return null

  const body = prompt.slice(prompt.indexOf(BRIEF_MARKER) + BRIEF_MARKER.length)
  const sections: Partial<Record<keyof HandoffBrief, string[]>> = {}
  let current: keyof HandoffBrief | null = null

  for (const line of body.split(/\r?\n/)) {
    const heading = line.match(/^##\s+(.+?)\s*$/)
    if (heading) {
      const key = normalizeSectionKey(heading[1] ?? '')
      current = key
      if (current && !sections[current]) sections[current] = []
      continue
    }
    if (current) {
      sections[current]!.push(line)
    }
  }

  const take = (key: keyof HandoffBrief): string =>
    (sections[key] ?? []).join('\n').trim()

  const goal = take('goal')
  if (!goal) return null

  return {
    goal,
    inputs: take('inputs') || DEFAULT_INPUTS,
    expected_output: take('expected_output') || DEFAULT_EXPECTED_OUTPUT,
    prohibitions: take('prohibitions') || DEFAULT_PROHIBITIONS,
    effort: parseEffort(take('effort') || DEFAULT_EFFORT),
  }
}

export function normalizeHandoffBriefPrompt(
  prompt: string,
  options?: { effort?: BriefEffort },
): { prompt: string; wrapped: boolean; brief: HandoffBrief } {
  const trimmed = typeof prompt === 'string' ? prompt.trim() : ''

  if (isStructuredHandoffBrief(trimmed)) {
    const parsed = parseHandoffBrief(trimmed)
    if (parsed) {
      return { prompt: formatHandoffBrief(parsed), wrapped: false, brief: parsed }
    }
    // Malformed marker (e.g. missing Goal): strip marker and re-wrap cleanly
    const stripped = trimmed.replace(BRIEF_MARKER, '').trim()
    const brief: HandoffBrief = {
      goal: stripped || EMPTY_GOAL_FALLBACK,
      inputs: DEFAULT_INPUTS,
      expected_output: DEFAULT_EXPECTED_OUTPUT,
      prohibitions: DEFAULT_PROHIBITIONS,
      effort: options?.effort ?? DEFAULT_EFFORT,
    }
    return { prompt: formatHandoffBrief(brief), wrapped: true, brief }
  }

  const brief: HandoffBrief = {
    goal: trimmed || EMPTY_GOAL_FALLBACK,
    inputs: DEFAULT_INPUTS,
    expected_output: DEFAULT_EXPECTED_OUTPUT,
    prohibitions: DEFAULT_PROHIBITIONS,
    effort: options?.effort ?? DEFAULT_EFFORT,
  }

  return {
    prompt: formatHandoffBrief(brief),
    wrapped: true,
    brief,
  }
}
