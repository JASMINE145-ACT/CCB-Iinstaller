# Manual verification — agent-run 2026-07-05

**Runner:** Cursor agent (CLI / isolated state)  
**Machine:** dev workstation  
**Live config:** not modified (P3 used `D:\tmp\p3-lifecycle-verify-*`)

## Step 0 — CLI smoke

| Check | Command | Result |
|-------|---------|--------|
| P1 registry | `build-package-registry.mjs --include-packages com.wanding.trade --check` | **PASS** — 1 pkg, 8 agents, 9 MCP, **0 errors** (10 ownership WARN expected) |
| P2 fixture compile | `compile-runtime-config.mjs --fixture` | **PASS** — settings=8 MCP, agents=4, health=8 |
| P3 health split | `test-package-health-split.ps1` | **PASS 2/2** |
| MCP probe+session | `test-mcp-health.ps1 -Probe -Session` | **PASS** — probe 5/5, session 7/7 |

## P2 — compile / drift (fixture path)

| Check | Result |
|-------|--------|
| Drift clean | `--check-drift` → all `[OK]`, exit **0** |
| Drift after edit | append to fixture `settings.json` → exit **2** (JSON field edit) |
| Real secret map + live AionUI session | **NOT RUN** — needs gitignored local secrets + UI (user) |
| Approve compiled settings as default | **NOT DECIDED** — product decision (user) |

## P3 — isolated lifecycle

State root: `D:\tmp\p3-lifecycle-verify-20260705-205335`

| Step | Result |
|------|--------|
| install | revision=1, exit 0 |
| enable `com.wanding.trade` | revision=2, v0.1.0 enabled |
| compile (enabled) | agents=**4**, MCP=8, health=8 |
| disable | revision=3 |
| compile (disabled) | agents=**0**, MCP=5, health=5 |

AionUI card smoke / upgrade / rollback / uninstall UI | **NOT RUN** — Electron UI (user)

## Platform install health

| Check | Result |
|-------|--------|
| Before fix | **FAIL** — missing `dist/VERSION` |
| Fix | `Ensure-WandingDistVersion` in `build-wanding-lib.ps1`; bootstrap + `start-dev-full` |
| After fix | `test-install-health.ps1 -Profile Platform -SkipBootstrap` → **PASS** (`1.1.6-dev`) |

## Still user-only (cannot automate here)

- **P0** — credential rotation (AOL console, VPS JWT, password manager)
- **P2** — real secret map compile + quotation/accurate/Word/Excel/price-library in **isolated** AionUI session
- **P3** — AionUI enable/disable/upgrade/rollback from staging tree
- **P4** — control plane OIDC/JWKS/canary/production cutover
- **P5** — manufacturing stakeholder + dual-package pilot in UI
- **Operator** — confirm Route-B restart + fresh session after sync (dev was restarted earlier today)

## Recommendation

Epic can move toward `completed` after user completes **P0 ops** + **P2/P3 UI smoke** (≈30–60 min). P4 production cutover may remain deferred per ADR if documented.
