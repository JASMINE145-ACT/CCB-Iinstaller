import { describe, expect, it } from 'bun:test'
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import {
  evaluateOrchestratorToolGuard,
  filterDelegatableCustomAgents,
  ORCHESTRATOR_AGENT_TOOL_NAME,
  ORCHESTRATOR_TASK_OUTPUT_TOOL_NAME,
  orchestratorAgentWantsBackground,
  repairAgentMarkdownBomIfNeeded,
  resolveSessionUserContextOverride,
  sanitizeOrchestratorAgentInput,
} from '../agentSessionProfile.js'
import type { CcbAssistantProfile } from '../assistantProfiles.js'

describe('filterDelegatableCustomAgents orchestrator bypass', () => {
  it('keeps router-delegatable agents when orchestratorSession despite delegatable:false sidecar', () => {
    const configDir = mkdtempSync(join(tmpdir(), 'ccb-delegatable-'))
    const agentsPath = join(configDir, 'agents')
    mkdirSync(agentsPath, { recursive: true })
    writeFileSync(
      join(agentsPath, 'word-creator.aionui.json'),
      JSON.stringify({
        schema_version: 1,
        agent_id: 'word-creator',
        delegatable: false,
      }),
      'utf8',
    )

    const agents = [
      { agentType: 'word-creator', filename: 'word-creator' },
    ] as Parameters<typeof filterDelegatableCustomAgents>[0]

    const strict = filterDelegatableCustomAgents(agents, configDir)
    expect(strict.map(a => a.filename)).toEqual([])

    const orchestrator = filterDelegatableCustomAgents(agents, configDir, {
      orchestratorSession: true,
    })
    expect(orchestrator.map(a => a.filename)).toEqual(['word-creator'])
  })

  it('does not bypass Guid-only agents outside router delegatable set', () => {
    const configDir = mkdtempSync(join(tmpdir(), 'ccb-delegatable-guid-'))
    const agentsPath = join(configDir, 'agents')
    mkdirSync(agentsPath, { recursive: true })
    writeFileSync(
      join(agentsPath, 'price-library-agent.aionui.json'),
      JSON.stringify({
        schema_version: 1,
        agent_id: 'price-library-agent',
        delegatable: false,
      }),
      'utf8',
    )

    const agents = [
      { agentType: 'price-library-agent', filename: 'price-library-agent' },
    ] as Parameters<typeof filterDelegatableCustomAgents>[0]

    const orchestrator = filterDelegatableCustomAgents(agents, configDir, {
      orchestratorSession: true,
    })
    expect(orchestrator.map(a => a.filename)).toEqual([])
  })
})

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

  it('blocks price-library MCP on orchestrator (must delegate quotation-agent)', () => {
    const result = evaluateOrchestratorToolGuard(
      'mcp__price-library__get_price_library_active',
      { confirmed: false },
    )
    expect(result.blocked).toBe(true)
    if (result.blocked) {
      expect(result.message).toContain('Agent(quotation-agent)')
    }
  })
})

describe('filterMcpConfigsForOrchestratorSession', () => {
  it('strips business MCP from ACP param overlay on default router session', async () => {
    const { filterMcpConfigsForOrchestratorSession } = await import(
      '../agentSessionProfile.js'
    )
    const configs = {
      guide_mcp: { scope: 'dynamic' },
      quotation: { scope: 'dynamic' },
      'price-library': { scope: 'dynamic' },
    }
    const filtered = filterMcpConfigsForOrchestratorSession(
      configs,
      'wande-orchestrator',
    )
    expect(Object.keys(filtered).sort()).toEqual(['guide_mcp'])
  })

  it('does not strip specialist MCP on quotation-agent session', async () => {
    const { filterMcpConfigsForOrchestratorSession } = await import(
      '../agentSessionProfile.js'
    )
    const configs = { quotation: { scope: 'user' } }
    expect(
      filterMcpConfigsForOrchestratorSession(configs, 'quotation-agent'),
    ).toEqual(configs)
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
    expect(raw[0]).toBe(0x2d) // '-'
    expect(raw.toString('utf8').startsWith('---')).toBe(true)
  })
})

describe('resolveSessionUserContextOverride L1 self-contained', () => {
  const specialistProfile: CcbAssistantProfile = {
    schema_version: 1,
    id: 'quotation-agent',
    name: 'quotation-agent',
    enabled: true,
    source: 'bundled',
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    instructions: {
      system_prompt: '# Quotation specialist\n\nDirect MCP session.',
      claude_md: 'Legacy sidecar persona block',
    },
    recommended_prompts: [],
    defaults: {
      model: null,
      permission_mode: null,
      skills: { enabled: [], disabled: [] },
      mcp: { enabled: ['quotation'], disabled: [] },
    },
  }

  it('ignores sidecar claude_md when L1 system_prompt exists', () => {
    const result = resolveSessionUserContextOverride({
      assistantProfile: specialistProfile,
      sessionProfileId: 'quotation-agent',
    })
    expect(result?.claudeMd).toContain('专家会话')
    expect(result?.claudeMd).not.toContain('Legacy sidecar')
    expect(result?.currentDate).toContain('Today')
  })

  it('returns only currentDate for orchestrator with L1 body', () => {
    const orchestrator: CcbAssistantProfile = {
      ...specialistProfile,
      id: 'wande-orchestrator',
      defaults: { ...specialistProfile.defaults, mcp: { enabled: [], disabled: [] } },
      instructions: { system_prompt: '# Router\n\nDelegate only.' },
    }
    const result = resolveSessionUserContextOverride({
      assistantProfile: orchestrator,
      sessionProfileId: 'wande-orchestrator',
    })
    expect(result?.claudeMd).toBeUndefined()
    expect(result?.currentDate).toContain('Today')
  })

  it('falls back to sidecar claude_md when L1 body empty (legacy)', () => {
    const legacy: CcbAssistantProfile = {
      ...specialistProfile,
      instructions: { claude_md: 'Legacy-only persona' },
    }
    const result = resolveSessionUserContextOverride({
      assistantProfile: legacy,
      sessionProfileId: 'quotation-agent',
    })
    expect(result?.claudeMd).toBe('Legacy-only persona')
  })
})
