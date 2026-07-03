# Runtime Config Compiler

> **Status:** Active (P2 — task `07-03-p2-config-compiler-v1`)
> **Inputs:** package manifests, runtime layers, tenant desired state, local secret resolver
> **Outputs:** CCB settings, Agent projection, health plan, provenance, observed state

P2 makes runtime configuration a deterministic projection instead of an
implicit sequence of PowerShell mutations. The compiler is opt-in until the
human parity checklist is complete; legacy bootstrap remains the default.

## Layer order and policy

```text
platform → environment → package → tenant → user → session
```

- A locked JSON pointer cannot be overridden by a lower layer.
- User and session layers may write only explicitly allowlisted pointers.
- Unknown layer fields and unsupported `schemaVersion` values are rejected.
- Empty layers do not erase prior values.

Canonical schema:

`ccb-installer/config/schemas/runtime-config-layer.schema.json`

## Secret references

Tracked inputs contain references only:

```text
secret://platform/llm/auth-token
secret://tenant/tn_wanding_prod/aol/access-token
```

Platform layers declare `secretPaths`; package MCP descriptors declare
`runtimeSecretPaths`. The compiler rejects literals at those paths. Secret
values come from an explicitly supplied, gitignored JSON map or an injected
resolver. Provenance records the reference and `redacted: true`, never the
resolved value.

The tracked runtime template is
`resources/settings/settings.example.json`; it contains a reference rather
than a bundled token. A developer-local `settings.json` remains ignored.
Staging excludes that ignored file and projects the safe example to
`resources/settings/settings.json`. `ensure-wanding-settings.ps1` resolves
local values in this order:

1. process environment;
2. existing live settings;
3. local `vendor/wanding/.env.accurate`.

Missing values produce a warning; the script no longer invents shared
credentials.

## Deterministic projections

`compile-runtime-config.mjs` produces:

- `settings.json`;
- `agents.json` derived from P1 Agent→MCP/Skill relationships;
- `health-plan.json`;
- `provenance.json`;
- `metadata.json` with projection hashes;
- `observed-state.json`.

Revision and hashes use canonical key ordering and contain no timestamps.
Identical inputs produce byte-equivalent semantic projections.

## Drift

```powershell
node ccb-installer/scripts/compile-runtime-config.mjs `
  --check-drift D:\path\to\compiled-output
```

Exit codes:

- `0`: all projection hashes match;
- `2`: one or more projections drifted;
- other non-zero: invalid input or unresolved secret.

## Legacy bridge and safety

`apply-compiled-runtime-config.ps1` validates that no unresolved `secret://`
remains, writes UTF-8 no-BOM files atomically, and backs up existing settings.

`ensure-wanding-settings.ps1 -CompiledSettingsPath <settings.json>` is opt-in.
Without that argument the existing bootstrap path remains active.

Source-tree invocation without explicit `-InstallDir` is rejected. This avoids
rewriting live settings with paths under the source `ccb-installer` directory.
Installer/update/bootstrap callers already pass `-InstallDir`.

When no `AIONUI_APPDATA_PROFILE` environment override exists, bootstrap
preserves the profile in existing settings. This prevents an `AionUi-Dev`
session token from being silently replaced with an unauthenticated `AionUi`
path.

## Verification

```powershell
node ccb-installer/scripts/__tests__/runtime-config-compiler.test.mjs
node ccb-installer/scripts/compile-runtime-config.mjs --fixture --verify-after-write
.\ccb-installer\scripts\test-mcp-health.ps1 -Probe -Quiet
```

Before making compiled settings the default, complete the P2 entries in:

`.trellis/tasks/07-03-platform-business-decoupling/manual-verification-checklist.md`
