# P0 Security & Boundary — Done Record

**Task:** `07-03-p0-security-boundary`  
**Date:** 2026-07-03  
**Parent:** `07-03-platform-business-decoupling` Phase P0

---

## Delivered

| Workstream | Status | Evidence |
|------------|--------|----------|
| P0-A Remove tracked secrets | done | `git rm --cached`; `.gitignore`; `*.example` templates |
| P0-B Secret scan CI | done | `.github/workflows/secret-scan.yml`, `.gitleaks.toml` |
| P0-C Forbidden coupling spec | done | `.trellis/spec/integration/platform-forbidden-coupling.md` |
| P0-D Identity schema | done | `.trellis/spec/integration/platform-identity-schema.md` |
| P0-E Vertical packages §10 | done | `platform-vertical-packages.md` |
| P0-F This record | done | this file |

---

## Verification

### Secrets no longer tracked

```text
git ls-files --error-unmatch .mcp.json
→ error: pathspec '.mcp.json' did not match any file(s) known to git

git ls-files --error-unmatch scripts/org-phase0/env.local
→ error: pathspec 'scripts/org-phase0/env.local' did not match any file(s) known to git

git ls-files --error-unmatch .env.accurate
→ error: pathspec '.env.accurate' did not match any file(s) known to git
```

Local files **preserved** on disk (`Test-Path` → True for all three).

### MCP health regression (WanD assembly baseline)

```powershell
powershell -NoProfile -File ccb-installer\scripts\test-mcp-health.ps1 -Probe -Quiet
```

**Result:** exit 0 — `PASS 5/5 servers` (quotation, accurate, office-word, excel, price-library).

### Code review

- Initial review: **FAIL** (incomplete staging, gitleaks history, missing done record, `.env.accurate` still tracked).
- Remediation: gitleaks allowlist for removed paths, `.env.accurate` untracked + example, `env.example` placeholders, Trellis jsonl/task.json sync, P0-only index.md diff, full staging.

---

## Ops actions required (human)

| Action | Owner | Status |
|--------|-------|--------|
| Rotate AOL / org admin / employee / JWT credentials (were in git history) | Ops | **TODO** |
| Assess git history exposure (BFG vs accept + rotate) | Ops | **TODO** |
| Atomic git commit of all P0 files | Dev | **TODO** (user request) |

No secret values recorded in this document.

---

## Files changed (for commit)

- `.gitignore`
- `.mcp.json.example` (new)
- `.env.accurate.example` (new)
- `scripts/org-phase0/env.local.example` (new)
- `scripts/org-phase0/env.example` (placeholders)
- `.github/workflows/secret-scan.yml` (new)
- `.gitleaks.toml` (new)
- `.trellis/spec/integration/platform-forbidden-coupling.md` (new)
- `.trellis/spec/integration/platform-identity-schema.md` (new)
- `.trellis/spec/integration/platform-vertical-packages.md` (§10)
- `.trellis/spec/integration/index.md` (links)
- Staged removal: `.mcp.json`, `.env.accurate`, `scripts/org-phase0/env.local` from index
- `.trellis/tasks/07-03-p0-security-boundary/` (task records)

---

## Not in P0 (deferred)

- `install-health-manifest.json` WanD decoupling → P3
- `agentSessionProfile.ts` refactor → P1/P3
- Credential rotation proof → private ops channel
