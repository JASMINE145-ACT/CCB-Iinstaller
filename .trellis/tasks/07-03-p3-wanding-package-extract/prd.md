# P3 — Extract `com.wanding.trade`

## Goal

Turn WanD from unconditional platform content into the first independently
managed vertical package while preserving the current working runtime through
legacy projections.

## Scope

| ID | Workstream | Required output |
|----|------------|-----------------|
| P3-A | Canonical package root | manifest, agents, skill, knowledge, health, assets, lifecycle metadata |
| P3-B | Registry/build discovery | consumers read package root without duplicate business declarations |
| P3-C | Platform/package health split | platform-only manifest and enabled-package health composition |
| P3-D | Lifecycle | install, enable, disable, upgrade, rollback with atomic state |
| P3-E | Legacy projection | current seed/runtime paths continue to work |
| P3-F | Eval/fixtures | package-scoped lifecycle and boundary tests |
| P3-G | Runtime regression | empty-platform PASS and enabled WanD MCP 5/5 |

## Acceptance criteria

- [x] Canonical WanD Agent/Skill/MCP/knowledge/health declarations live under
      `packages/vertical/com.wanding.trade`.
- [x] Registry and config compiler discover the canonical manifest.
- [x] Empty platform health does not require WanD files, agents, or secrets.
- [x] Enabling the package composes its required files and health checks.
- [x] Disable leaves platform health green and retains package data/secrets.
- [x] Uninstall requires disabled state and does not delete tenant data/secrets.
- [x] Upgrade records prior state; rollback restores the prior package version
      and projections.
- [x] Legacy agent IDs and install paths remain supported by generated/staged
      adapters.
- [x] Current staging build passes.
- [x] Current full WanD MCP probe remains PASS 5/5.
- [x] Human install/disable/rollback checks are appended to the epic checklist.

## Non-goals

- Moving ERP credentials to a remote control plane (P4).
- Full dynamic AionUI contribution rendering.
- Physically relocating large vendor binaries if a manifest-owned payload map
  provides the same install boundary.
- Deleting tenant data or secrets on package disable/uninstall.

## Verification commands

```powershell
node ccb-installer/scripts/__tests__/package-lifecycle.test.mjs
node ccb-installer/scripts/__tests__/build-package-registry.test.mjs
node ccb-installer/scripts/__tests__/runtime-config-compiler.test.mjs
pwsh -File ccb-installer/scripts/test-package-health-split.ps1
pwsh -File ccb-installer/scripts/test-mcp-health.ps1 -Probe -Quiet
```
