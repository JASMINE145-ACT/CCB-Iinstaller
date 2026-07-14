# Closeout — `07-14-07-14-startup-mcp-soft-ready-banner` (2026-07-14)

## Delivered

| Item | Evidence |
|------|----------|
| pywin32 under `python-wanding` | `ensure-python-wanding-pywin32.ps1`; `PYTHONNOUSERSITE=1` import OK |
| warm fail-fast | child exit → FAIL ~0.25s (not fake 120s) |
| soft_ready / quotation gate | `isCcbStartupCoreMcpOk`; ensure returns on quotation PASS; accurate background |
| banner dismiss/retry | Guid UX + IPC `retryStartupReadiness` |
| packaging | `$shipScripts` + `Get-WandingShipScripts` + bootstrap SKIP → ensure |
| tests | `bun test ccbStartupReadinessShared.test.ts` **9/9** |
| code-reviewer | Overall PASS (incl. Important fix re-review) |

## Evening follow-up

Outer timeout wipe of quotation PASS → merge-on-timeout + quotation-first + ensure early return. Electron full restart applied.

## Supplier Guid card residual (same day)

Live + `{install}/seed/agents` still had `supplier-directory-agent` (`guid_primary: true`); install `retired-agent-ids.json` lacked the id. Pruned live+seed; retired list synced. Spec: `supplier-directory.md` § Guid card must stay gone.

## Manual

- Guid cold start: soft_ready not permanent when quotation warms (dev restart 2026-07-14 evening)
- Guid: no 供应商名录 card after prune + refresh

## Spec

- `.trellis/spec/integration/mcp-health.md` § App startup readiness (+ accurate/pywin32)
- `.trellis/spec/integration/wanding-packaging-whitelist.md` §7 / §8.4
- `.trellis/spec/integration/supplier-directory.md` Guid retired residual
