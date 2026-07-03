# Research: P2 Current Configuration Audit

- **Task:** `07-03-p2-config-compiler-v1`
- **Date:** 2026-07-03
- **Scope:** internal

## Current authority and write paths

| Area | Current source/write path | P2 consequence |
|------|---------------------------|----------------|
| CCB runtime MCP | `%LOCALAPPDATA%\CCB-Wanding\.claude\settings.json` | Remains runtime projection target |
| Installer defaults | `ccb-installer/resources/settings/settings.json` | Must become secret-reference-safe input |
| Bootstrap/repair | `ccb-installer/scripts/ensure-wanding-settings.ps1` | Must become optional thin consumer after parity tests |
| Agent MCP/Skill relation | Agent markdown frontmatter + sidecar + health manifest | P1 package manifest becomes authority; old files are checked projections |
| MCP health | `ccb-installer/config/mcp-health-manifest.json` | P2 generates a package-scoped health plan without changing existing health runtime |
| Registry | `ccb-installer/config/generated/package-registry.snapshot.json` | P2 compiler input |

## Findings

1. `ensure-wanding-settings.ps1` combines merge policy, install-path expansion,
   MCP definitions, credentials, settings writes, and compatibility behavior.
2. Merge precedence is implicit in script order; provenance is absent.
3. The tracked settings template contains a credential-shaped
   `ANTHROPIC_AUTH_TOKEN`. P2 must replace tracked secret values with
   `secret://` references and prohibit literal secrets in declarative layers.
4. P1 registry exposes the relationships required for agent and health
   projections but is deliberately read-only.
5. Live settings must not be replaced until compiler output passes:
   deterministic tests, legacy parity diff, drift tests, and MCP health.

## P2 implementation boundary

- Build a deterministic compiler library and CLI.
- Layer order:
  `platform → environment → package → tenant → user → session`.
- Track provenance per leaf and locked/overridable policy decisions.
- Resolve secrets only from a gitignored/local map or injected resolver.
- Generate CCB settings, Agent projection, health plan, and metadata sidecar.
- Detect manual drift by hashing canonical generated projections.
- Add an opt-in bridge to `ensure-wanding-settings.ps1`; keep legacy default
  until human parity review is complete.

## Related specs

- `.trellis/spec/backend/config-layer.md`
- `.trellis/spec/integration/aionui-config-inventory.md`
- `.trellis/spec/integration/package-manifest-schema.md`
- `.trellis/spec/integration/platform-forbidden-coupling.md`
- `docs/platform-system-business-decoupling-optimization.md` §7.2–7.4
