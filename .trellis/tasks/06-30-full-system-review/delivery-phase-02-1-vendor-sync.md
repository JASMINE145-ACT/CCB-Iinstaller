# Phase 2.1 Delivery — Vendor Sync (conservative)

> Task: `06-30-full-system-review` · subtask: `integration-fix-vendor-gate-21`  
> Date: 2026-07-02 · Scope: dev sync only (no build-wanding / Option E / preflight reorder)

---

## Implemented

| ID | Item | Change |
|----|------|--------|
| INT-P1-7 | data glob parity | `ccb-installer/scripts/lib/sync-wanding-data.ps1` — denylist md + all xlsx; used by `sync-dev-wanding-vendor.ps1` |
| INT-P1-6 | `-Strict` / `-VendorStrict` | Opt-in; fingerprint drift → exit 1 |
| INT-P2-4 | SkipVendorSync warn | Only when vendor flags explicitly bound (`PSBoundParameters`) |
| INT-P2-5 | ensure exit check | `if (-not $?) { throw }` after ensure-wanding-settings |
| INT-P2-7 | python `/XD tools` | Aligns with `build-wanding.ps1` |

## Deferred (risk)

| ID | Reason |
|----|--------|
| INT-P2-3 Option E | Skip-robocopy drift gate — false-negative risk |
| INT-P2-8 bootstrap log | Polish only |
| INT-P2-9 preflight reorder | First-run behavior change |
| build-wanding shared helper | Ship path untouched |

---

## Verification

| Check | Result |
|-------|--------|
| `ccb-installer/scripts/tests/test-sync-wanding-data.ps1` | PASS (12 files; denylist respected) |
| `sync-dev-wanding-vendor.ps1` live run | exit 0; copies `ccb-wanding-accurate.md`, `wanding_price_lib.xlsx`, blank template xlsx |
| Fingerprints | 5/5 OK |
| code-review agent | PASS (re-review after ensure/warn fixes) |

---

## Usage

```powershell
# Default — unchanged behavior + full data glob
.\ccb-installer\scripts\sync-dev-wanding-vendor.ps1

# Release-candidate strict check
.\ccb-installer\scripts\start-dev-full.ps1 -SkipBootstrap -VendorStrict
```
