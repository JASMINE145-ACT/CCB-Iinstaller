# Phase 1–5 bootstrap — done (2026-07-13)

## Created

| Path | Role |
|------|------|
| `D:\Projects\agent-company-meta` | meta git + Cursor workspace |
| `platform/` | independent git (greenfield) |
| `sample-ccb/` | submodule → `D:/Projects/claude-code-best` (clone; nested submodules not initialized) |

## GREEN

```text
node platform/scripts/check-no-sample-import.mjs          → REPO_BOUNDARY PASS
node platform/scripts/check-no-wanding-core-terms.mjs     → CORE_TERMS PASS
node platform/scripts/check-no-sample-import.mjs --include-fixtures → FAIL (expected RED)
git -C sample-ccb status --short → empty
```

## Notes

- `protocol.file.allow=always` used **once** via `git -c` for local submodule add (no global git config change).
- Nested CCB submodule `ppt-master-src` skipped (not required for L4 sample).
- `platform/` is gitignored from meta (separate repo); meta tracks `sample-ccb` pointer + tooling.
- CCB working tree not modified by this bootstrap (pre-existing dirty files unrelated).

## Open next

- User opens `agent-company-meta.code-workspace` in Cursor
- Deferred: `com.wanding.trade` extract task; Rudder L2; Contract Engine
