/**
 * Background warmup for WanD MCP backends.
 * First business/office MCP calls can pay Python import and workbook-load cost.
 * Warmup during session/new moves that work off the user's first visible query.
 */
import { spawn } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { getClaudeConfigHomeDir } from '../../utils/envUtils.js'
import { CCB_DEFAULT_SESSION_AGENT_ID } from './agentSessionProfile.js'
import { normalizeAgentId } from './agentIds.js'

type WarmupCall = {
  toolName?: string
  arguments?: Record<string, unknown>
}

const WARMUP_CALL: Record<string, WarmupCall> = {
  quotation: {
    toolName: 'match_quotation',
    arguments: { keywords: 'direct 50', customer_level: 'B' },
  },
  accurate: {
    toolName: 'accurate_summarize_records',
    arguments: { keywords: 'purchase', page_size: 1, max_pages: 1 },
  },
  // Office MCPs are warmed with tools/list only. That starts the Python server
  // and imports dependencies without creating throwaway documents.
  'office-word': {},
  excel: {},
}

function loadSettingsMcpServer(name: string): {
  command: string
  args: string[]
  env: Record<string, string>
} | null {
  try {
    const settingsPath = join(getClaudeConfigHomeDir(), 'settings.json')
    const raw = readFileSync(settingsPath, 'utf8').replace(/^\uFEFF/, '')
    const settings = JSON.parse(raw) as {
      mcpServers?: Record<
        string,
        { command?: string; args?: string[]; env?: Record<string, string> }
      >
    }
    const cfg = settings.mcpServers?.[name]
    if (!cfg?.command || !Array.isArray(cfg.args)) return null
    return {
      command: cfg.command,
      args: cfg.args,
      env: { ...process.env, ...(cfg.env ?? {}) } as Record<string, string>,
    }
  } catch {
    return null
  }
}

async function warmOneMcpServer(serverName: string): Promise<void> {
  const cfg = loadSettingsMcpServer(serverName)
  const warmupCall = WARMUP_CALL[serverName]
  if (!cfg || !warmupCall) return

  await new Promise<void>((resolve) => {
    const child = spawn(cfg.command, cfg.args, {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: cfg.env,
    })
    let settled = false
    const finish = () => {
      if (settled) return
      settled = true
      try {
        child.kill()
      } catch {
        // ignore
      }
      resolve()
    }
    const timer = setTimeout(finish, 120_000)
    child.stdout.on('data', (chunk) => {
      const text = String(chunk)
      if (text.includes('"id":2')) {
        clearTimeout(timer)
        finish()
      }
    })
    child.on('error', () => {
      clearTimeout(timer)
      finish()
    })
    child.stdin.write(
      `${JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {
          protocolVersion: '2024-11-05',
          capabilities: {},
          clientInfo: { name: 'wande-mcp-warmup', version: '1' },
        },
      })}\n`,
    )
    child.stdin.write(
      `${JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' })}\n`,
    )
    child.stdin.write(
      `${JSON.stringify(
        warmupCall.toolName
          ? {
              jsonrpc: '2.0',
              id: 2,
              method: 'tools/call',
              params: {
                name: warmupCall.toolName,
                arguments: warmupCall.arguments ?? {},
              },
            }
          : {
              jsonrpc: '2.0',
              id: 2,
              method: 'tools/list',
            },
      )}\n`,
    )
  })
}

export async function warmWanDMcpServers(serverNames: string[]): Promise<void> {
  const unique = [...new Set(serverNames.filter(Boolean))]
  for (const name of unique) {
    const started = Date.now()
    await warmOneMcpServer(name)
    console.info(`[ACP] WanD MCP warmup done: ${name} in ${Date.now() - started}ms`)
  }
}

/** Fire-and-forget warmup after session/new. */
export function scheduleWanDMcpWarmup(sessionProfileId?: string): void {
  const id = normalizeAgentId(sessionProfileId ?? '')
  const servers: string[] = []
  if (!id || id === CCB_DEFAULT_SESSION_AGENT_ID) {
    servers.push('quotation', 'accurate')
  } else if (id === 'quotation-agent') {
    servers.push('quotation')
  } else if (id === 'accurate-agent') {
    servers.push('accurate')
  } else if (id === 'word-creator') {
    servers.push('office-word')
  } else if (id === 'excel-creator') {
    servers.push('excel')
  }
  if (servers.length === 0) return
  console.info(`[ACP] WanD MCP warmup scheduled: ${servers.join(', ')} profile=${id || 'default'}`)
  void warmWanDMcpServers(servers).catch((err) => {
    console.warn('[ACP] WanD MCP warmup failed:', err)
  })
}
