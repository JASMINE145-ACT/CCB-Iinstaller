# Step 1 Integration Rereview — 2026-07-11

> Method: `$system-review` read-only rereview  
> Scope: Integration layer, dev sync chain, route-b sync, installer health gates, CI/release handoff  
> Baseline: `reviews/step-01-integration.md` from 2026-06-30

---

## Overall Judgment

**Maturity: 8.0/10.**

Step 1 is now suitable as the daily development integration baseline. The two original Integration P0s have been closed:

- `INT-P0-1`: route-b target mismatch is closed. The current canonical route-b sync model is three targets, with legacy acp-agent-only sync documented separately.
- `INT-P0-2`: `start-dev-full.ps1` now runs vendor sync by default unless `-SkipVendorSync` is explicitly passed.

The remaining risk is no longer "can developers start the system"; it is "can this integration chain be repeatedly proven and shipped without manual interpretation." Release CI, stale verification entrypoints, ACP version pinning, and one-shot integration smoke remain open.

Current delivery level: **internal development tool / integration baseline**, not yet a fully repeatable product release gate.

---

## System Map

| Area | Responsibility | Evidence |
| --- | --- | --- |
| Dev launcher | Canonical local dev entrypoint and layered sync orchestration | `ccb-installer/scripts/start-dev-full.ps1` |
| Route-B sync | Copies route-b patch and acp-agent into installed, AppData, and dev ACP slots | `ccb-installer/scripts/sync-aionui-ccb-route-b.ps1` |
| Vendor sync | Syncs repo Python/data/MCP payload into live `D:\CCB-Wanding` vendor tree | `ccb-installer/scripts/sync-dev-wanding-vendor.ps1`, `scripts/lib/sync-wanding-data.ps1` |
| Build packaging | Stages Wanding installer payload and validates fail-closed package health | `ccb-installer/scripts/build-wanding.ps1`, `resources/install-health-manifest.json` |
| Field health | Verifies installed package health and MCP/runtime health | `test-install-health.ps1`, `test-mcp-health.ps1`, `smoke-wanding-e2e.ps1` |
| CI release | Current workflow still builds legacy installer path | `.github/workflows/release-installer.yml` |

---

## Main Flow

### Development Flow

```text
repo changes
  -> start-dev-full.ps1
  -> preflight / optional bootstrap
  -> sync-aionui-ccb-route-b.ps1
  -> sync-dev-wanding-vendor.ps1
  -> deploy seed agents / commands / skills / hooks
  -> sync-dev-aioncore.ps1
  -> launch AionUI dev runtime
```

This flow is materially better than the 2026-06-30 review because route-b sync and vendor sync are now both in the default dev path.

### Release Flow

```text
build-wanding.ps1
  -> stage self-contained Wanding tree
  -> validate install-health manifest and package markers
  -> NSIS installer
  -> test-install-health / test-mcp-health / smoke-wanding-e2e
  -> internal update / publish
```

The local script design is coherent, but CI has not caught up. This is the main Step 1 handoff risk into Step 5 Ship/Ops.

---

## Findings

| Priority | ID | Finding | Impact | Suggested Action |
| --- | --- | --- | --- | --- |
| P1 | INT-P1-2 | `verify-installer.ps1` still points at the old CCB install model and default path. | Developers can run a stale verifier and get false confidence or false failure. | Retire as legacy or make it delegate to `test-install-health.ps1`. |
| P1 | INT-P1-3 | ACP `0.39.0` path is still hardcoded across route-b sync, dev preflight, manifest, and docs. | ACP upgrades can silently break sync/health checks. | Add a single version discovery/helper contract and use it from scripts/manifests. |
| P1 | INT-P1-11 | acp-agent source selection can prefer installed bundle over repo patch when marker exists. | Repo patch edits may not appear in dev runtime, creating confusing false negatives. | Add `-ForceRepoAcpAgent` or hash/mtime warning when repo patch differs from chosen source. |
| P1 | SHIP-P1-1 | GitHub release workflow still runs legacy `installer.nsi`, not `build-wanding.ps1` / v2 staging validation. | CI can produce or validate the wrong artifact path. | Update release workflow or explicitly mark it legacy until Step 5 replaces it. |
| P2 | INT-P2-1 | No single `integration-smoke.ps1` exists. | Health checks are correct but fragmented; agents and humans must remember the sequence. | Add one orchestrator over install health, MCP health, and E2E smoke. |
| P2 | XL-P2-1 | `.trellis/spec/index.md` maturity snapshot is stale for Integration. | Future agents may trust 9/10 while current rereview says 8/10. | Refresh spec maturity table after Step 4/5 or immediately mark it as stale. |
| P2 | INT-P2-10 | `dev-runtime-layers.md` still has route-b target wording drift. | Documentation can reintroduce the old target-count confusion. | Align wording with `route-b-sync.md`: three canonical targets plus legacy acp-agent-only note. |
| P3 | INT-P2-9 | Some preflight checks run before sync/repair can fix missing dev files. | Fresh dev setup may fail before the canonical launcher can repair state. | Consider moving repairable checks after sync or downgrading them to actionable warnings. |

---

## Backlog Delta

Add or update:

- `INT-P1-11`: route-b acp-agent source selection can hide repo patch changes.
- `SHIP-P1-1`: CI release workflow still uses legacy installer path instead of v2 Wanding build gate.
- `XL-P2-1`: spec maturity snapshot stale after Step 1 rereview.
- `INT-P2-10`: dev runtime docs still contain route-b target wording drift.

Keep open:

- `INT-P1-2`
- `INT-P1-3`
- `INT-P2-1`
- `INT-P2-2`
- `SHIP-P0-1`

---

## Next Fix Order

1. Replace or retire `verify-installer.ps1`.
2. Add ACP version helper / centralized version source.
3. Add route-b acp-agent repo-source protection.
4. Add `integration-smoke.ps1`.
5. Update CI release workflow as part of Step 5 Ship/Ops.

---

## Step 1 Status

Step 1 should stay **completed with rereview notes**, not reopened as a broad exploration task. The right operating model is:

- keep `reviews/step-01-integration.md` as the original 2026-06-30 review;
- use this rereview as the current Step 1 state;
- track remaining work through backlog items and small implementation tasks;
- treat CI/release hardening as Step 5 Ship/Ops unless it blocks daily development.
