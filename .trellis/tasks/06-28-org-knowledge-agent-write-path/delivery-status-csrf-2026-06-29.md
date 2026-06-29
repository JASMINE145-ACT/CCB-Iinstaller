# Delivery status — org knowledge MCP CSRF fix

**Date:** 2026-06-29  
**Symptom:** `append_business_rule` with `confirmed=true` → HTTP 403 `CSRF_INVALID` on `PUT /api/org-knowledge/wanding_business_knowledge`

## Code (repo)

| File | Change |
|------|--------|
| `python/admin/org_http_csrf.py` | Bootstrap `GET /api/auth/status` → `aionui-csrf-token` |
| `python/admin/org_knowledge_client.py` | `_api_json` PUT uses CookieJar + `x-csrf-token` |
| Tests | `admin.test_org_http_csrf` + `admin.test_org_knowledge_client` → **7/7 pass** |

## Spec

- `.trellis/spec/integration/org-knowledge.md` — mutating write CSRF contract + triage rows
- `.trellis/spec/integration/dev-sync-playbook.md` — §3.1 + Recorded 2026-06-29

## Dev sync (2026-06-29 13:11)

```powershell
.\ccb-installer\scripts\sync-dev-wanding-vendor.ps1 -Smoke
# → org_http_csrf.py + org_knowledge_client.py copied; SMOKE PASS
```

### Parity check (post-sync)

| Layer | hash_match |
|-------|------------|
| `admin/org_http_csrf.py` | ✅ |
| `admin/org_knowledge_client.py` | ✅ |
| `quotation/fill_items.py` | ✅ |
| `admin/org_price_client.py` | ✅ |
| `CCB dist/cli.js` | ✅ |
| `quotation-agent.md` (live agents) | ✅ |

**Note:** Live vendor has orphan `wanding_workspace_paths.py` (not in repo) — harmless extra; robocopy does not delete extras.

## Operator follow-up

1. **Restart dev** — current electron started 10:38, sync at 13:11; MCP won't reload vendor python until restart
2. **New quotation Guid session** — retry `append_business_rule` confirmed=true
3. UI `#/org-knowledge` save may still lack CSRF in `orgHttpBridge` (separate track)
