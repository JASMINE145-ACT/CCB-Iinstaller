import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

export type RegistryAgent = {
  id: string
  packageId?: string | null
  requiredCapabilities?: string[]
}

export type PackageRegistrySnapshot = {
  agents?: RegistryAgent[]
}

export type AgentFleetDefaults = {
  primaryPackageId?: string
  defaultRouterCapability?: string
  guidOnlyAgentIds?: string[]
  officePresetAgentIds?: string[]
  legacyFleetAgentIds?: string[]
}

export type AgentFleetPolicy = {
  defaultSessionAgentId: string
  keepAgentIds: ReadonlySet<string>
  guidOnlyAgentIds: ReadonlySet<string>
  routerDelegatableAgentIds: ReadonlySet<string>
  officePresetAgentIds: ReadonlySet<string>
  source: 'registry' | 'legacy-fallback'
}

const LEGACY_AGENT_FLEET: AgentFleetPolicy = {
  defaultSessionAgentId: 'wande-orchestrator',
  keepAgentIds: new Set([
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
  ]),
  guidOnlyAgentIds: new Set(['price-library-agent']),
  routerDelegatableAgentIds: new Set([
    'quotation-agent',
    'accurate-agent',
    'research-agent',
    'cowork',
    'word-creator',
    'word-form-creator',
    'ppt-creator',
    'excel-creator',
  ]),
  officePresetAgentIds: new Set([
    'cowork',
    'word-creator',
    'word-form-creator',
    'ppt-creator',
    'excel-creator',
  ]),
  source: 'legacy-fallback',
}

let cachedPolicy: AgentFleetPolicy | null = null
let testOverride: AgentFleetPolicy | null = null

function moduleInstallerRoot(): string | undefined {
  const here = dirname(fileURLToPath(import.meta.url))
  let dir = here
  for (let i = 0; i < 8; i += 1) {
    const candidate = join(dir, 'config', 'generated', 'package-registry.snapshot.json')
    if (existsSync(candidate)) {
      return dir
    }
    const parent = dirname(dir)
    if (parent === dir) break
    dir = parent
  }
  return undefined
}

export function resolveInstallDirForRegistry(): string | undefined {
  const fromEnv = process.env.CCB_INSTALL_DIR?.trim()
  if (fromEnv) return fromEnv
  const configDir = process.env.CLAUDE_CONFIG_DIR?.trim()
  if (configDir) {
    const normalized = configDir.replace(/\\/g, '/')
    if (normalized.endsWith('/.claude')) {
      return dirname(configDir)
    }
  }
  return moduleInstallerRoot()
}

export function resolveRegistrySnapshotPath(): string | undefined {
  const override = process.env.PACKAGE_REGISTRY_PATH?.trim()
  if (override && existsSync(override)) return override

  const candidates: string[] = []
  const installDir = resolveInstallDirForRegistry()
  if (installDir) {
    candidates.push(
      join(installDir, 'config', 'generated', 'package-registry.snapshot.json'),
    )
    candidates.push(
      join(
        installDir,
        'ccb-installer',
        'config',
        'generated',
        'package-registry.snapshot.json',
      ),
    )
  }
  const moduleRoot = moduleInstallerRoot()
  if (moduleRoot) {
    candidates.push(
      join(moduleRoot, 'config', 'generated', 'package-registry.snapshot.json'),
    )
  }
  for (const candidate of candidates) {
    if (existsSync(candidate)) return candidate
  }
  return undefined
}

export function resolveAgentFleetDefaultsPath(): string | undefined {
  const override = process.env.AGENT_FLEET_DEFAULTS_PATH?.trim()
  if (override) return override
  const installDir = resolveInstallDirForRegistry()
  if (!installDir) return undefined
  const installed = join(installDir, 'config', 'runtime', 'agent-fleet.defaults.json')
  if (existsSync(installed)) return installed
  const dev = join(
    installDir,
    'ccb-installer',
    'config',
    'runtime',
    'agent-fleet.defaults.json',
  )
  if (existsSync(dev)) return dev
  return undefined
}

function readJsonFile<T>(path: string | undefined): T | null {
  if (!path || !existsSync(path)) return null
  try {
    return JSON.parse(readFileSync(path, 'utf8')) as T
  } catch {
    return null
  }
}

function loadAgentFleetDefaults(): AgentFleetDefaults {
  const raw = readJsonFile<{ values?: AgentFleetDefaults }>(
    resolveAgentFleetDefaultsPath(),
  )
  return raw?.values ?? {}
}

export function deriveAgentFleetPolicy(
  snapshot: PackageRegistrySnapshot | null,
  fleetDefaults: AgentFleetDefaults,
): AgentFleetPolicy {
  const agents = snapshot?.agents ?? []
  if (agents.length === 0) {
    return LEGACY_AGENT_FLEET
  }

  const keepAgentIds = new Set<string>()
  for (const agent of agents) {
    if (agent.id) keepAgentIds.add(agent.id)
  }
  for (const id of fleetDefaults.legacyFleetAgentIds ?? []) {
    keepAgentIds.add(id)
  }

  const defaultRouterCapability =
    fleetDefaults.defaultRouterCapability ?? 'platform.agent.route'
  const primaryPackageId = fleetDefaults.primaryPackageId

  const routerCandidates = agents.filter(agent =>
    agent.requiredCapabilities?.includes(defaultRouterCapability),
  )
  const preferredRouter = primaryPackageId
    ? routerCandidates.find(agent => agent.packageId === primaryPackageId)
    : undefined
  const defaultSessionAgentId =
    preferredRouter?.id ?? routerCandidates[0]?.id ?? LEGACY_AGENT_FLEET.defaultSessionAgentId

  const guidOnlyAgentIds = new Set(fleetDefaults.guidOnlyAgentIds ?? [])
  const officePresetAgentIds = new Set(fleetDefaults.officePresetAgentIds ?? [])
  const routerDelegatableAgentIds = new Set(
    [...keepAgentIds].filter(
      id =>
        id !== defaultSessionAgentId && !guidOnlyAgentIds.has(id),
    ),
  )

  return {
    defaultSessionAgentId,
    keepAgentIds,
    guidOnlyAgentIds,
    routerDelegatableAgentIds,
    officePresetAgentIds,
    source: 'registry',
  }
}

export function loadAgentFleetPolicy(): AgentFleetPolicy {
  const snapshot = readJsonFile<PackageRegistrySnapshot>(
    resolveRegistrySnapshotPath(),
  )
  const fleetDefaults = loadAgentFleetDefaults()
  return deriveAgentFleetPolicy(snapshot, fleetDefaults)
}

export function getAgentFleetPolicy(): AgentFleetPolicy {
  if (testOverride) return testOverride
  if (!cachedPolicy) {
    cachedPolicy = loadAgentFleetPolicy()
  }
  return cachedPolicy
}

export function resetAgentFleetPolicyCache(): void {
  cachedPolicy = null
  testOverride = null
}

/** Test hook — override fleet policy without touching disk. */
export function setAgentFleetPolicyForTests(policy: AgentFleetPolicy | null): void {
  testOverride = policy
  cachedPolicy = policy
}
