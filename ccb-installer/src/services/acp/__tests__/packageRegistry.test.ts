import { afterEach, describe, expect, it } from 'bun:test'
import { existsSync, mkdtempSync, mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { tmpdir } from 'node:os'
import { fileURLToPath } from 'node:url'
import {
  deriveAgentFleetPolicy,
  loadAgentFleetPolicy,
  resetAgentFleetPolicyCache,
  resolveRegistrySnapshotPath,
  setAgentFleetPolicyForTests,
  type PackageRegistrySnapshot,
} from '../packageRegistry.js'

describe('deriveAgentFleetPolicy', () => {
  const fleetDefaults = {
    primaryPackageId: 'com.wanding.trade',
    defaultRouterCapability: 'platform.agent.route',
    guidOnlyAgentIds: [],
    officePresetAgentIds: ['word-creator', 'excel-creator'],
    legacyFleetAgentIds: ['cowork'],
  }

  it('derives default router from platform.agent.route on primary package', () => {
    const snapshot: PackageRegistrySnapshot = {
      agents: [
        {
          id: 'wande-orchestrator',
          packageId: 'com.wanding.trade',
          requiredCapabilities: ['platform.agent.route'],
        },
        {
          id: 'quotation-agent',
          packageId: 'com.wanding.trade',
          requiredCapabilities: ['business.pricing.quote'],
        },
        {
          id: 'price-library-agent',
          packageId: 'com.wanding.trade',
          requiredCapabilities: ['business.pricing.manage'],
        },
      ],
    }
    const policy = deriveAgentFleetPolicy(snapshot, fleetDefaults)
    expect(policy.defaultSessionAgentId).toBe('wande-orchestrator')
    expect(policy.source).toBe('registry')
    expect(policy.keepAgentIds.has('quotation-agent')).toBe(true)
    expect(policy.keepAgentIds.has('cowork')).toBe(true)
    expect(policy.guidOnlyAgentIds.has('price-library-agent')).toBe(false)
    expect(policy.routerDelegatableAgentIds.has('quotation-agent')).toBe(true)
    expect(policy.routerDelegatableAgentIds.has('price-library-agent')).toBe(true)
    expect(policy.routerDelegatableAgentIds.has('wande-orchestrator')).toBe(false)
  })

  it('falls back to legacy fleet when snapshot has no agents', () => {
    const policy = deriveAgentFleetPolicy({ agents: [] }, fleetDefaults)
    expect(policy.source).toBe('legacy-fallback')
    expect(policy.defaultSessionAgentId).toBe('wande-orchestrator')
    expect(policy.keepAgentIds.has('quotation-agent')).toBe(true)
  })
})

describe('loadAgentFleetPolicy', () => {
  afterEach(() => {
    resetAgentFleetPolicyCache()
    delete process.env.PACKAGE_REGISTRY_PATH
    delete process.env.AGENT_FLEET_DEFAULTS_PATH
  })

  it('loads WanD parity from fixture registry on disk', () => {
    const root = mkdtempSync(join(tmpdir(), 'ccb-registry-'))
    const generated = join(root, 'config', 'generated')
    const runtime = join(root, 'config', 'runtime')
    mkdirSync(generated, { recursive: true })
    mkdirSync(runtime, { recursive: true })
    writeFileSync(
      join(generated, 'package-registry.snapshot.json'),
      JSON.stringify({
        agents: [
          {
            id: 'wande-orchestrator',
            packageId: 'com.wanding.trade',
            requiredCapabilities: ['platform.agent.route'],
          },
          { id: 'quotation-agent', packageId: 'com.wanding.trade' },
          { id: 'research-agent', packageId: null },
        ],
      }),
      'utf8',
    )
    writeFileSync(
      join(runtime, 'agent-fleet.defaults.json'),
      JSON.stringify({
        values: {
          primaryPackageId: 'com.wanding.trade',
          defaultRouterCapability: 'platform.agent.route',
          guidOnlyAgentIds: [],
          legacyFleetAgentIds: ['cowork'],
          officePresetAgentIds: ['word-creator'],
        },
      }),
      'utf8',
    )
    process.env.PACKAGE_REGISTRY_PATH = join(
      generated,
      'package-registry.snapshot.json',
    )
    process.env.AGENT_FLEET_DEFAULTS_PATH = join(
      runtime,
      'agent-fleet.defaults.json',
    )
    setAgentFleetPolicyForTests(null)
    resetAgentFleetPolicyCache()

    const policy = loadAgentFleetPolicy()
    expect(policy.defaultSessionAgentId).toBe('wande-orchestrator')
    expect(policy.keepAgentIds.has('research-agent')).toBe(true)
    expect(policy.keepAgentIds.has('cowork')).toBe(true)
  })

  it('resolves registry snapshot from monorepo ccb-installer layout', () => {
    const testDir = dirname(fileURLToPath(import.meta.url))
    const monorepoSnapshot = join(
      testDir,
      '..',
      '..',
      '..',
      '..',
      'config',
      'generated',
      'package-registry.snapshot.json',
    )
    if (!existsSync(monorepoSnapshot)) return
    process.env.PACKAGE_REGISTRY_PATH = monorepoSnapshot
    resetAgentFleetPolicyCache()
    expect(resolveRegistrySnapshotPath()).toBe(monorepoSnapshot)
  })
})
