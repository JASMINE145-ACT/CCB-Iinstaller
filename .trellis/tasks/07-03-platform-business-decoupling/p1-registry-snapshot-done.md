# P1 Meta-model and Read-only Registry — Done Record

**Task:** `07-03-platform-business-decoupling`
**Date:** 2026-07-03
**Phase:** P1
**Verification profile:** Standard

## Delivered

| Workstream | Status | Evidence |
|------------|--------|----------|
| P1-A Package JSON Schema | done | `ccb-installer/config/schemas/package-manifest.schema.json` |
| P1-B Descriptor model | done | Agent/MCP/Skill/Knowledge/Contribution/Capability definitions |
| P1-C Legacy aliases | done | `com.wanding.trade/package.json` aliases |
| P1-D Registry snapshot | done | `build-package-registry.mjs` + generated snapshot |
| P1-E Registry lint | done | duplicate/reference/drift/orphan diagnostics |
| P1-F Capability IDs | done | `platform.agent.route`, `business.*` initial set |

## TDD evidence

### RED

```text
node ccb-installer/scripts/__tests__/build-package-registry.test.mjs
→ ERR_MODULE_NOT_FOUND: build-package-registry.mjs
```

Determinism was also tested RED:

```text
AssertionError: snapshot must not contain wall-clock data
true !== false
```

### GREEN

```text
PASS package manifest contract
PASS invalid manifest diagnostics
PASS registry snapshot graph
PASS 3/3 package registry tests
```

## Real asset snapshot

Command:

```powershell
node ccb-installer/scripts/build-package-registry.mjs
node ccb-installer/scripts/build-package-registry.mjs --check
```

Output:

`ccb-installer/config/generated/package-registry.snapshot.json`

| Object | Count |
|--------|------:|
| Packages | 1 |
| Agents | 8 |
| MCP servers | 8 |
| Skills | 2 |
| Aliases | 4 |
| Errors | 0 |
| Warnings | 10 |

Warnings are traceable legacy ownership gaps:

- Agents: `excel-creator`, `ppt-creator`, `research-agent`, `word-creator`
- MCP: `exa`, `excel`, `excel-mcp`, `office-word`, `scrapling`
- Skill: `ccb-subagent-gate`

These assets are intentionally not assigned to `com.wanding.trade`; later
platform capability packages should claim them. P1 does not hide the gaps or
invent incorrect ownership.

## Runtime boundary

- No existing Agent markdown, sidecar, MCP health entry, installer, or runtime
  source was changed.
- The registry is read-only and is not runtime authority in P1.
- Existing runtime regression was verified:

  ```text
  .\ccb-installer\scripts\test-mcp-health.ps1 -Probe -Quiet
  → exit 0; MCP probe PASS 5/5 servers
  ```

- P2 configuration compilation requires separate approval.
