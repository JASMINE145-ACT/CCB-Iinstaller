# Authenticity & Feasibility Verification — 2026-07-03

**Task:** `07-03-platform-business-decoupling` (epic, status: planning)
**Method:** Read-only fact-check of `docs/platform-system-business-decoupling-optimization.md` claims against actual repo state — direct grep/git/read verification (no code changes). No secret values read or recorded.
**Scope note:** Selected this method over dispatching `trellis-research`/Explore subagents because each claim was independently and cheaply checkable (git tracking, file existence, grep counts) — subagent dispatch overhead wasn't justified for this breadth.

---

## 1. Authenticity — claims checked against real repo state

| # | Claim (doc §) | Verdict | Evidence |
|---|---|---|---|
| 1 | Evidence-base files (§2) all exist | **CONFIRMED** | All 9 spot-checked paths present (spec index, config-layer, mcp-business, platform-architecture, platform-vertical-packages, ccb-wanding docs, mcp-health-manifest.json, install-health-manifest.json, ensure-wanding-settings.ps1) |
| 2 | Four-layer chain `AionUI → aioncore → route-b → CCB Runtime` is real, documented architecture (§1, §5) | **CONFIRMED** | Terms appear consistently in `runtime-architecture.md`, `platform-architecture.md`, `route-b-status.md` |
| 3 | `com.wanding.trade` vertical-package direction already proposed in ADR (§1, §17) | **CONFIRMED** | `platform-vertical-packages.md` already defines `com.wanding.trade` as target vertical package w/ manifest sketch, P1 extraction phase |
| 4 | Fixed business IDs hardcoded in platform runtime layer (§4.1) | **CONFIRMED, worse than "a few IDs"** | `ccb-installer/src/services/acp/agentSessionProfile.ts`: `CCB_DEFAULT_SESSION_AGENT_ID = 'wande-orchestrator'`, `CCB_WANDING_KEEP_AGENT_IDS` list, ~42 wande/quotation/accurate/wanding matches (per existing P0 audit, independently spot-confirmed) |
| 5 | Install health manifest requires WanD-specific files OOTB (§4.1, §17) | **CONFIRMED** | `install-health-manifest.json` requires `vendor/wanding/*`, `quotation-agent.md`, `run-wanding-bootstrap.ps1`, ~20 matches |
| 6 | Config fact duplication — one Agent's tool permissions live in ≥3-5 places (§4.2) | **CONFIRMED, exceeds claim** | `quotation-agent` tool/MCP config independently duplicated in: `quotation-agent.md` (frontmatter) + `quotation-agent.aionui.json` (sidecar, config/) + **second copy** `staging/seed/agents/quotation-agent.aionui.json` + `mcp-health-manifest.json.agent_profiles["quotation-agent"]` — 4 files found in a 2-minute spot check, doc's claim is conservative if anything |
| 7 | Repo config contains real, currently-exposed business credentials (§4.5, §12.3) — **highest-severity claim** | **CONFIRMED, CRITICAL, still live** | `.env.accurate` (repo root) is **currently git-tracked** (`git ls-files` lists it) and contains `AOL_ACCESS_TOKEN` (484 chars), `AOL_DATABASE_ID`, `AOL_SIGNATURE_SECRET` (64 chars) — value shapes are non-placeholder (no "your_"/"example"/"changeme" patterns). **No secret value was read or printed by this audit.** Separately, `.mcp.json` and `scripts/org-phase0/env.local` (which also carried real values per the existing `07-03-p0-security-boundary` research) have already been **staged for removal** from git (`git status` shows `D`) and added to `.gitignore` in the current uncommitted working tree — but **not yet committed**, and rotation status at the credential-issuer side is unverified (git-side cleanup ≠ rotation). |
| 8 | Epic's own child-task linkage is internally consistent | **REFUTED (minor)** | `task.json.children = ["07-03-07-03-p0-security-boundary"]` — this path does not exist. Actual child task directory is `07-03-p0-security-boundary` (which correctly sets `"parent": "07-03-platform-business-decoupling"`). One-directional dangling reference — cosmetic, not blocking, but should be fixed before relying on `children` for tooling. |
| 9 | Maturity scores (§3 table) are self-consistent with rest of doc | **PLAUSIBLE, not independently re-scored** | Scores align directionally with confirmed findings (业务包 1.5, 多租户 1.5, 身份与秘密 1.5 — all match confirmed high-coupling/low-safety findings above). Did not re-derive all 13 scores from scratch; spot checks support the low scores in 业务包/多租户/身份与秘密 rows specifically. |

**Overall authenticity verdict:** The design doc's technical claims are **not speculative** — every checkable claim that was tested came back confirmed, several (config duplication, business-ID hardcoding) understated the actual mess found. The §4.5 credential-exposure claim is the most important: it is **currently true and unresolved for `.env.accurate`**, partially remediated (uncommitted) for `.mcp.json`/`env.local`.

---

## 2. Feasibility — roadmap vs. actual project reality

| Factor | Finding | Implication |
|---|---|---|
| Team size | `git log --format='%an' \| sort -u` → **1 contributor** (JASMINE145-ACT) across 99 commits | P0–P5 as scoped (OIDC/JWKS, control plane, package registry, multi-tenant, second-company pilot) is a **multi-quarter roadmap for a team**, being planned solo. Doc itself acknowledges this is a phased epic, not a sprint — but P4/P5 scope (control plane MVP + admin UI + audit + second real company) is large for one person + AI agents. Recommend treating P4/P5 as **directional**, not committed, until P0–P3 evidence lands. |
| Second-company premise (P5) | No evidence found in repo of an actual second company/customer lined up — `open-questions.md` #10 "第二家公司验收样本业务域" is still **open** | P4 (OIDC/JWKS, tenant governance) and P5 (second vertical) risk being built for a hypothetical customer. Recommend gating P4 start on either (a) a real second-tenant commitment, or (b) explicit acceptance that P4 is speculative infra investment. |
| Process gating already correct | `execution-plan.md` Status=`draft`, not `approved`; `status.md` blockers correctly list "Epic 未 approved" + open ADR questions (§20, 10 items, all `open`) | The epic is **correctly self-gated** per this repo's own `trellis-task-execution` skill — no premature "in_progress" or completed-phase claims. Good sign of process discipline. |
| P0 already has a head start | Child task `07-03-p0-security-boundary` exists with its own `prd.md`, `execution-plan.md` (Status: draft), and a prior baseline audit (`research/p0-baseline-audit-2026-07-03.md`) that **independently reached the same tracked-secret conclusion** this verification did, plus ran `test-mcp-health.ps1 -Probe -Quiet` → 5/5 PASS | P0 is more shovel-ready than the epic's `status.md` "尚无子 task" note suggests — `status.md` is **stale** (written before the child task existed, or not updated after). Recommend syncing `status.md` "Active subtasks" section. |
| Overlap with existing tasks | `06-25-architecture-business-system-boundaries` — **completed**; `06-30-full-system-review` — **in_progress**; `07-01-price-library-admin-agent` — **in_progress**; `07-02-mcp-health-coverage-expansion` — **completed** | No direct file-level collision detected in this pass, but `07-01-price-library-admin-agent` is actively adding Agent/MCP surface **while** this epic's P0 note says "新代码不得新增平台层万鼎硬编码" — worth a explicit one-line check-in with that task before P1 registry snapshot is built, so it doesn't need immediate rework. |
| Scope realism of P1 (read-only registry) | Confirmed inputs exist (`mcp-health-manifest.json`, `ccb-installer/config/agents/*`) and are structured enough (JSON) to script a snapshot generator against | **Feasible as scoped** — P1 is explicitly "no behavior change," lowest-risk phase, good next step after P0. |

**Overall feasibility verdict:** P0 and P1 are realistic near-term work with real inputs already validated. P2/P3 depend on P0/P1 landing first (correctly sequenced in the doc). P4/P5 are the highest execution-risk phases given solo-maintainer bandwidth and an unconfirmed second-tenant premise — recommend re-scoping those two as "revisit after P3 evidence, don't commit dates yet" rather than treating the whole P0–P5 roadmap as equally committed.

---

## 3. Action items surfaced by this verification

1. **Do now (security, needs user decision — not auto-actioned by this verification):** `.env.accurate` is a live tracked credential file. Recommend: rotate the AOL token/secret at the issuer, then `git rm --cached .env.accurate` + add to `.gitignore` + commit, same treatment already staged (uncommitted) for `.mcp.json`/`env.local`. This blocks P0-A acceptance regardless of which phase order is chosen.
2. Fix `task.json.children` dangling path (`07-03-07-03-p0-security-boundary` → `07-03-p0-security-boundary`).
3. Sync `status.md` "Active subtasks" — child task already exists with its own draft execution plan; the epic status file doesn't reflect that.
4. Before approving P4/P5 dates, resolve open-question #10 (second-company domain) — otherwise scope them as speculative.
5. One-line sync with `07-01-price-library-admin-agent` owner (same person, self-note) to confirm no new platform-layer hardcoding is being added while P0 is pending.
