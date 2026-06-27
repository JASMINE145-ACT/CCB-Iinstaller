# Fill tool 1.1.3.1 — vendor recovery + pack gate (2026-06-27)

## Problem

Live dev vendor `D:\CCB-Wanding\vendor\wanding\python` drifted from repo after `git restore` / partial staging recovery. `quote_tools.fill_quotation()` lost:

- `validate_and_fix_fill_rows` (header-row guard)
- `backfill_inquiry_columns_if_empty` (B/C inquiry columns)
- `fill_items.py` module split (`normalize_fill_items` lived only in monolithic `main.py`)

Spec §12.9 #9–#11 and repo `python/` were correct; **runtime vendor was not**.

## Fix (dev runtime)

```powershell
cd D:\Projects\claude-code-best
.\ccb-installer\scripts\sync-dev-wanding-vendor.ps1 -Smoke
```

Restart dev + **new conversation** for MCP python reload.

## Pack guarantee (NSIS + hot zip)

| Layer | Source | Gate |
|-------|--------|------|
| Full NSIS | `build-wanding.ps1` robocopy `repo/python/` → `staging/vendor/wanding/python/` | `Test-StagingWanDInstall` |
| Hot zip `python` component | `build-wanding-lib.ps1` `Stage-WandingHotPython` (same robocopy filter) | same manifest files |

**Pack source of truth = repo `python/`**, not live `D:\CCB-Wanding\vendor`. Dev vendor must be synced separately (`dev-sync-playbook.md` §4.3).

### install-health-manifest.json (2026-06-27)

Added required_files for 1.1.3.1 fill chain:

- `vendor/wanding/python/main.py`
- `vendor/wanding/python/system/tool_dispatch.py`
- `vendor/wanding/python/quotation/fill_items.py`
- `vendor/wanding/python/quotation/fill_dispatch.py`
- `vendor/wanding/python/quotation/fill_row_guard.py`
- `vendor/wanding/python/quotation/inquiry_backfill.py`

`Test-StagingWanDInstall` also asserts `quote_tools.py` contains `validate_and_fix_fill_rows` + `backfill_inquiry_columns_if_empty`, and `main.py` imports `system.tool_dispatch`.

## Verification

| Step | Command | Result |
|------|---------|--------|
| Repo tests | `pytest tests/test_fill_row_guard.py tests/test_inquiry_backfill.py` | 15+ passed |
| Vendor sync smoke | `sync-dev-wanding-vendor.ps1 -Smoke` | HDPE `8010036693` PASS |
| Code review | code-reviewer agent 2026-06-27 | PASS |

See `check.jsonl` entries dated 2026-06-27.

## Related spec

- `internal-update.md` §12.9 #9–#11
- `wanding-packaging-whitelist.md` §16.6
- `dev-sync-playbook.md` §4.3
