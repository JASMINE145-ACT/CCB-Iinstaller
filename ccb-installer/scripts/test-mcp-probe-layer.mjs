/**
 * Probe all non-lazy stdio MCP servers from settings.json (invoked by test-mcp-health.ps1 -Probe).
 */
import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import os from 'node:os'
import {
  loadMcpHealthManifest,
  resolveMcpServerCommand,
} from '../lib/mcp-health-manifest.mjs'
import { probeStdioMcpServer } from '../lib/mcp-stdio-probe.mjs'

function resolveProbeToolCall(serverName, probeCall, install) {
  if (!probeCall?.tool) return probeCall
  const args = { ...(probeCall.arguments ?? {}) }
  if (serverName === 'excel' && args.filepath && !/[\\/]:/.test(String(args.filepath).slice(0, 3))) {
    args.filepath = join(install, 'vendor', 'wanding', 'data', String(args.filepath))
  }
  return { ...probeCall, arguments: args }
}

const install =
  process.env.CCB_INSTALL_DIR ||
  (existsSync('D:\\CCB-Wanding') ? 'D:\\CCB-Wanding' : null)
const configDir =
  process.env.CLAUDE_CONFIG_DIR ||
  join(os.homedir(), 'AppData', 'Local', 'CCB-Wanding', '.claude')

const serverFilterArg = process.argv.find((arg) => arg.startsWith('--server='))
const serverFilter = serverFilterArg ? serverFilterArg.slice('--server='.length) : null

if (!install) {
  console.error('[mcp-probe] FAIL: CCB_INSTALL_DIR not set')
  process.exit(2)
}

const settingsPath = join(configDir, 'settings.json')
const settings = JSON.parse(readFileSync(settingsPath, 'utf8').replace(/^\uFEFF/, ''))
const manifest = loadMcpHealthManifest()
const mcpServers = settings.mcpServers ?? {}

/** @type {Array<{ ok: boolean, name: string, error?: string }>} */
const results = []

for (const [name, spec] of Object.entries(manifest.mcp_servers)) {
  if (serverFilter && name !== serverFilter) {
    continue
  }
  if (spec.kind === 'http') {
    console.log(`[mcp-probe] SKIP ${name} (http/lazy optional)`)
    continue
  }
  if (spec.lazy) {
    console.log(`[mcp-probe] SKIP ${name} (lazy — connect on first tool use)`)
    continue
  }
  if (spec.optional) {
    console.log(`[mcp-probe] SKIP ${name} (optional)`)
    continue
  }

  const cmd = resolveMcpServerCommand(install, name, mcpServers)
  if (!cmd || cmd.kind !== 'stdio') {
    console.error(`[mcp-probe] FAIL ${name}: not configured in settings.json`)
    process.exit(1)
  }

  const result = await probeStdioMcpServer(
    name,
    {
      command: cmd.command,
      args: cmd.args,
      env: cmd.env,
      cwd: cmd.cwd,
    },
    {
      timeoutMs: spec.probe_timeout_ms ?? 45000,
      minTools: 1,
      probeToolCalls: [
        ...(spec.probe_tool_call ? [resolveProbeToolCall(name, spec.probe_tool_call, install)] : []),
        ...(spec.probe_inventory_call
          ? [resolveProbeToolCall(name, spec.probe_inventory_call, install)]
          : []),
      ],
    },
  )

  if (result.ok) {
    const toolNote = result.probe_tool ? ` tool_call=${result.probe_tool}` : ''
    console.log(
      `[mcp-probe] PASS ${name} tools=${result.tool_count} ${result.duration_ms}ms sample=${result.sample_tools?.join(',')}${toolNote}`,
    )
  } else {
    console.error(
      `[mcp-probe] FAIL ${name}: ${result.error} (${result.duration_ms}ms)`,
    )
  }
  results.push(result)
}
const failed = results.filter((r) => !r.ok)
if (failed.length > 0) {
  console.error(`[mcp-probe] FAIL ${failed.length}/${results.length} servers`)
  process.exit(1)
}

console.log(`[mcp-probe] PASS ${results.length}/${results.length} servers`)
process.exit(0)
