# Edit capability audit — 2026-07-03

**Task:** `07-01-price-library-admin-agent` · **Phase:** P2-Edit

## Bulk routing (三分法)

| User intent | Path | Do not |
|-------------|------|--------|
| 1–5 field edits on known materials | `upsert` two-phase | Excel round-trip |
| Tens of rows partial update | `export` → excel → `preview`/`apply` | Full prepare script |
| Full normalize / dedupe / tax mapping | `prepare-price-library-import.py` → `import_ready` → apply | Per-row upsert ×3000 |

## Gaps closed this phase

| Gap | Fix |
|-----|-----|
| Revert needs `version_id` without list API in MCP | `list_price_library_versions` |
| No enforced Read `data.Md` before field writes | PreToolUse gate on upsert/apply |
| Preview without user confirm nudge | PostToolUse confirm nudge |
| Draft applied but session ends without publish | Stop warn validator |
| Bulk SOP not agent-addressable | `price-library-edit` skill + sidecar |

## Still defer

- P1.5 orchestrator delegate
- AionUI table edit UI
- `GET /audit` MCP wrapper
- P3 Guid E2E (user smoke)
