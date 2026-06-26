import { describe, expect, it } from 'bun:test'
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import {
  evaluateOrchestratorToolGuard,
  ORCHESTRATOR_AGENT_TOOL_NAME,
  ORCHESTRATOR_TASK_OUTPUT_TOOL_NAME,
  orchestratorAgentWantsBackground,
  repairAgentMarkdownBomIfNeeded,
  sanitizeOrchestratorAgentInput,
} from '../agentSessionProfile.js'

describe('orchestrator Agent delegation guard', () => {
  it('detects run_in_background on Agent input', () => {
    expect(
      orchestratorAgentWantsBackground({
        subagent_type: 'word-creator',
        prompt: 'make doc',
        run_in_background: true,
      }),
    ).toBe(true)
    expect(
      orchestratorAgentWantsBackground({
        subagent_type: 'word-creator',
        prompt: 'make doc',
      }),
    ).toBe(false)
  })

  it('strips run_in_background from Agent calls', () => {
    const input = {
      subagent_type: 'word-creator',
      prompt: 'x',
      run_in_background: true,
      description: 'Word doc',
    }
    const sanitized = sanitizeOrchestratorAgentInput(
      ORCHESTRATOR_AGENT_TOOL_NAME,
      input,
    )
    expect(sanitized.run_in_background).toBeUndefined()
    expect(sanitized.subagent_type).toBe('word-creator')
    expect(sanitized.prompt).toBe('x')
  })

  it('leaves non-Agent tools unchanged', () => {
    const input = { run_in_background: true, command: 'echo hi' }
    expect(sanitizeOrchestratorAgentInput('Bash', input)).toBe(input)
  })
})

describe('evaluateOrchestratorToolGuard', () => {
  it('blocks TaskOutput on wande-orchestrator', () => {
    const result = evaluateOrchestratorToolGuard(
      ORCHESTRATOR_TASK_OUTPUT_TOOL_NAME,
      { task_id: 'abc' },
    )
    expect(result.blocked).toBe(true)
    if (result.blocked) {
      expect(result.message).toContain('TaskOutput')
      expect(result.message).toContain('同步等待')
    }
  })
})

describe('repairAgentMarkdownBomIfNeeded', () => {
  it('strips UTF-8 BOM so frontmatter parses', () => {
    const configDir = mkdtempSync(join(tmpdir(), 'ccb-agent-bom-'))
    const agentsDir = join(configDir, 'agents')
    mkdirSync(agentsDir, { recursive: true })
    const mdPath = join(agentsDir, 'quotation-agent.md')
    const body = '---\nname: quotation-agent\ndescription: test\n---\n# body\n'
    writeFileSync(mdPath, Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), Buffer.from(body, 'utf8')]))

    const repaired = repairAgentMarkdownBomIfNeeded(configDir)

    expect(repaired).toEqual(['quotation-agent'])
    const raw = readFileSync(mdPath)
    expect(raw[0]).toBe(0x2d)
    expect(raw.toString('utf8').startsWith('---')).toBe(true)
  })
})
