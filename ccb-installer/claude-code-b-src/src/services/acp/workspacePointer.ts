import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'

/** Path shared with quotation MCP / Python for the active ACP session workspace. */
export function resolveWorkspacePointerPath(): string {
  const fromEnv = process.env.WANDING_WORKSPACE_POINTER?.trim()
  if (fromEnv) return fromEnv
  const configDir = (
    process.env.CLAUDE_CONFIG_DIR ||
    process.env.CCB_WANDING_HOME ||
    join(process.env.LOCALAPPDATA || '', 'CCB-Wanding', '.claude')
  ).trim()
  return join(configDir, 'runtime', 'active-workspace.txt')
}

/** Publish session cwd so quotation fill defaults into the AionUI workspace sidebar. */
export function publishActiveWorkspace(cwd: string): void {
  const workspace = (cwd || '').trim()
  if (!workspace) return
  process.env.WANDING_WORKSPACE = workspace
  const pointer = resolveWorkspacePointerPath()
  mkdirSync(dirname(pointer), { recursive: true })
  writeFileSync(pointer, workspace, 'utf-8')
}
