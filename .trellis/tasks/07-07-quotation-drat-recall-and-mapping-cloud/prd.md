# PRD — drat 螺纹弯头召回 + 历史报价库云端共享

## Goal

Fix two gaps exposed by PT. JINSE 7.1 learn-by-data session (2026-07-07):

1. **Matcher:** `Elbow drat ½" AW` must recall **Faucet Elbow / 内螺纹弯头** (`80100248xx`), not plain 90° elbow (`80100243xx`) or ceiling `stelldrat`.
2. **Historical mapping:** Section D write path must evolve toward **org-shared** historical quotation mappings (price-library parity), not per-machine pending-only.

## Background

| Item | Observed |
|------|----------|
| Row 10 keywords | `Elbow drat ½" AW` |
| Human code (F col) | `8010024875` (Faucet Elbow AW DN16) |
| Agent pick | `8010024350` (plain 90° elbow) |
| Section D pending | `d6e458d7-…` in local `mapping_import_pending.jsonl` |
| Merge | Not run — recall still misses; agent gave wrong script path once |

**User verdict:** Business knowledge alone is insufficient; **matcher code** must understand `drat` = 丝扣/螺纹弯头. Historical mappings should be **cloud-shared** like price library with proper import/merge tools.

## Requirements

### R1 — drat / 丝扣 thread recall (P0)

**User-confirmed rule (2026-07-07):** `Elbow drat` = **丝扣弯头 / 螺纹弯头** (Faucet Elbow / 内螺纹弯头 AW 系列，如 `80100248xx`) — not plain 90° elbow, not ceiling `stelldrat`.

- In **AW / fitting** context, `drat` maps to **female thread** (同 `内丝` / `内螺纹` / 丝扣 / 螺纹弯头), not `stelldrat` ceiling category.
- Bare `\bdrat\b` must **not** trigger `_query_ceiling_category → stelldrat` when query also contains fitting signals (`elbow`, `tee`, `AW`, `½"`, etc.).
- `match_quotation("Elbow drat ½\" AW")` candidates must include `8010024875` (or equivalent Faucet Elbow DN16) **before** plain elbow `8010024350`.
- Add regression tests (RED→GREEN) anchored to PT. JINSE row 10.

### R2 — Section D ops hardening (P1)

- Document + script wrapper for merge: `vendor/wanding` → `python python/scripts/merge_mapping_import.py`.
- Optional MCP: `merge_quotation_mapping_pending` (dry-run + apply) so agent/user need not hunt CLI.
- Optional MCP: `lookup_quotation_mapping` for M2/M4 dedup without loading full xlsx in session.
- After `confirmed=true` append, agent must surface **verify steps** (read jsonl entry + merge command).

### R3 — Org-shared historical mapping (P2)

- Mirror price-library pattern: org API `GET /active` + draft append/import + publish + revision.
- Python `org_mapping_client` + matcher org-primary read (replace Neon stub).
- MCP org write tool(s) for learn-by-data Section D (fleet-wide, not `%LOCALAPPDATA%` only).
- Bootstrap: import seed `mapping_table.xlsx` → org active.

## Acceptance Criteria

- [x] `pytest` — new drat/elbow AW tests PASS; no regression on `stelldrat` / ceiling queries.
- [ ] Manual: `match_quotation` on row 10 keywords → Faucet Elbow in top 3, preferred [0].
- [ ] Merge runbook + wrapper script committed; SKILL §D step 5 uses absolute vendor-relative path.
- [ ] Research ADR: Route 1 API shape documented; P2 phased in execution plan (not blocking P0).
- [ ] Spec: `quotation-matching-engine.md` § thread/drat + § mapping cloud roadmap.

## Out of Scope (initial)

- Full AionUI mapping admin UI (can follow price-library page pattern later).
- LINGWEI learn-by-data layout.
- Bulk re-import entire historical xlsx archive (separate ops task).

## Parent / related tasks

- `07-06-learn-by-data-price-library-enrich` Phase 2.2 (Section D Route 2 MVP)
- `07-06-quotation-match-ranking-fix` (ranking — orthogonal; drat is category/thread bug)
