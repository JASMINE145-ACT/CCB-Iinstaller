# P2 — Config Compiler, Provenance, and Drift

**Parent:** `07-03-platform-business-decoupling`
**Depends on:** P1 package manifest/registry (`51419106` closes final evidence)

## Goal

Introduce a deterministic, policy-aware compiler that turns layered desired
configuration plus the P1 registry into CCB-compatible projections, with
secret references, field provenance, and drift detection. Preserve current
runtime behavior while migration remains opt-in.

## Non-goals

- Replacing the four-layer ACP runtime chain.
- Writing secrets into git or generated audit artifacts.
- Automatically overwriting a user's live `settings.json`.
- Extracting the full `com.wanding.trade` directory layout (P3).
- Building the remote control plane or JWKS/OIDC (P4).

## Workstreams

| ID | Workstream | Required output |
|----|------------|-----------------|
| P2-A | Layer model and merge policy | Explicit precedence, locked paths, safe user/session overrides |
| P2-B | Secret reference model | `secret://...` only on secret paths; local resolver; no value in provenance |
| P2-C | Desired/observed state | Desired revision + observed projection hashes/status |
| P2-D | Config compiler v1 | Deterministic `ResolvedRuntimeConfig` |
| P2-E | Projection adapters | CCB settings, Agent projection, health plan |
| P2-F | Provenance and drift | Per-leaf source/policy + manual-edit detection |
| P2-G | Legacy migration bridge | `ensure-wanding-settings.ps1` opt-in compiled input; legacy default retained |

## Acceptance criteria

- [x] Layer order is deterministic and tested.
- [x] Locked fields cannot be overridden by lower layers.
- [x] User/session layers can change only allowlisted paths.
- [x] Secret-bearing fields reject literals and accept `secret://` references.
- [x] Provenance records references/policy but never resolved secret values.
- [x] Same inputs produce the same revision and byte-identical projections.
- [x] Agent MCP/Skill projections are derived from P1 registry relationships.
- [x] Generated settings and health plan pass schema/structural checks.
- [x] Editing a generated projection causes drift check failure.
- [x] Legacy parity report explains differences from current settings.
- [x] Existing `test-mcp-health.ps1 -Probe -Quiet` remains PASS 5/5.
- [x] P2 done record includes RED/GREEN, commands, diff summary, and manual checks.

## Verification commands

```powershell
node ccb-installer/scripts/__tests__/runtime-config-compiler.test.mjs
node ccb-installer/scripts/compile-runtime-config.mjs --fixture
node ccb-installer/scripts/compile-runtime-config.mjs --check-drift <output-dir>
.\ccb-installer\scripts\test-mcp-health.ps1 -Probe -Quiet
```

## Manual verification required

- Compare redacted compiled `settings.json` structure with live settings.
- Confirm local secret resolver maps required refs without logging values.
- Run opt-in compiled-settings bootstrap against an isolated config directory.
- Start a new AionUI/CCB session and exercise one tool from each required MCP.
