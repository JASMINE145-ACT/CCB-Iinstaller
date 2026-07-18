# Release 2.0.0 — Feature Matrix (Full NSIS)

> Audited 2026-07-18 (Phase 0). Template: `wanding-release-standard.md` §8.1.
> Chains: ① source→staging ② staging→$INSTALL (NSIS File) ③ $INSTALL→$CONFIG (bootstrap) ④ $INSTALL→$RUNTIME (route-b sync).

## Source repo freshness (pre-build)

| Repo | Newest source | Last artifact | Action |
|------|---------------|---------------|--------|
| `D:\claude-code-B` (CCB dist) | 07-15 14:52 `wanDMcpWarmup.ts` | dist/cli.js 07-14 20:38 (**stale**) | `bun run build` via build-wanding (default) |
| `AionCore` | 07-17 23:56 `events.rs` (+migrations 024–027) | aioncore.exe 07-16 10:20 (**stale**) | `cargo build --release` before build-wanding |
| `aionui-src` | uncommitted WIP (resolve fix, workspace-todo, org users…) | — | full rebuild (**no** `-SkipAionUiBuild`) |
| overlay `ccb-installer/claude-code-b-src` vs live | `handoffBrief.ts` hash diff = **line endings only** (FC: no diff) | — | no action |

## Feature rows

| # | Feature | Source | ① staging | ② NSIS | ③ $CONFIG / ④ $RUNTIME | IN/OUT | Verified |
|---|---------|--------|-----------|--------|------------------------|--------|----------|
| F0a | **Stale-purge installer** (`WANd.INSTALL.STALE_PURGE.001`) | `purge-stale-wanding-installs.ps1` + `find-…` + `repair-…` + cmds | `$shipScripts` L801-803 + root cmd copies L987-988 ✅ | NSI `DirectoryLeave` L76-140 + `File` L222-223 + Start-Menu L308-309 ✅ | — / — | **IN** | smokes PASS (p05) |
| F0b | **InstallDir resolve** (`WANd.INSTALL.RESOLVE.001`) | aionui-src `ccbWandingRuntimeNode.ts` | via AionUi pack | `File /r staging\AionUi` | — / desktop binary | **IN** | vitest 2/2; re-run Phase 2 |
| F1 | Supplier directory | `mcp_servers/supplier-directory-server` + aioncore crate + `#/suppliers` UI | build-wanding L625-629 ✅ | vendor `File /r` | settings MCP / aioncore | **IN** | probe Phase 4 |
| F1r | **supplier-directory-agent retired** | `config/agents/retired-agent-ids.json` (cowork, word-form-creator, supplier-directory-agent) | seed agents full-copy incl. json ✅ | `File /r seed\agents` | `deploy-seed-agents.mjs` prunes on deploy ✅ | **IN** | check $CONFIG post-install |
| F2 | Word DocumentSpec toolchain | `lib/wand-document-spec/` + `install-office-word-mcp.ps1` hook + word-creator.md | `lib/` robocopy L823-827 ✅ | `File /r staging\lib` L243-244 ✅ | install-office-word-mcp syncs site-packages + hook ✅ | **IN** | 60 tools incl. 5 DocumentSpec (07-17 probe) |
| F3 | Session precipitation (+outcome/redaction) | `config/skills/ccb-session-precipitation` + worker libs | seed skill robocopy L733-735 ✅ | NSI L258-259 ✅ | `$requiredSeedSkills` ✅ (6 skills) | **IN** | pytest Phase 2 |
| F4 | Orchestrator handoff/relay + MCP warmup | CCB `handoffBrief.ts` · `wanDMcpWarmup.ts` · relay (committed c6e75da2) | dist rebuild | `File /r dist` | — / route-b sync ④ | **IN** | CCB tests Phase 2 |
| F5 | Employee intelligence + org-knowledge mutate | `python/admin/org_knowledge_mutate.py` etc. + aioncore migrations 024-027 | vendor/wanding/python glob | `File /r vendor` | — | **IN** | pytest Phase 2; VPS deploy = ops, non-blocking |
| F6 | Price library (load-hang fix + edit skill) | `price-library-server/dist` + `price-library-edit` skill | L599-616 + skill L741-743 ✅ | NSI L264-265 ✅ | settings MCP (ensure-wanding-settings L200) ✅ | **IN** | probe Phase 4 (Symptom B paths) |
| F7 | Quotation (dist + learn-by-data + agent md) | quotation dist + `quotation-learn-by-data` | L737-739 ✅ + pack gate fill_* | NSI L261-262 ✅ | `$requiredSeedSkills` ✅ | **IN** | probe Phase 4 |
| F8 | Work-tasks v2 | `work-tasks-query-server` + aioncore crate | vendor staging | `File /r vendor` | settings MCP | **IN** | probe Phase 4; known: bare `node` command portability risk (accepted, tracked) |
| F9 | Inventory AI assist | `python/inventory/*` (item_dump/store/price_gap_fill) | vendor/wanding/python | `File /r vendor` | — | **IN** | pytest Phase 2 |
| F10 | Workspace-todo observability | aionui-src PlanChecklist/SubagentDrawer/auto-open | via AionUi pack | `File /r AionUi` | — | **IN** | vitest 12/12 (07-16) |
| F11 | New seed skills gen | ccb-personal-memory · wanding-deep-research | L729-731 / L745-747 ✅ | NSI L255-256 / L267-268 ✅ | `$requiredSeedSkills` ✅ | **IN** | bootstrap Phase 4 |
| F12 | eval / dev test scripts | `eval/*`, `test-*.ps1/mjs` | `$devOnlyScripts` ✅ | not shipped | — | **OUT** | drift-guard WARN=0 |
| Fdoc | Specs/docs/journals | `.trellis/**`, docs | — | not shipped | — | **OUT** (repo only) | — |

## config_generation

- 7 → **8** (agents retired + new skills + MCP set changes) — `seed/config-ship-manifest.json`
- reset_targets: `agents`, `aionui_runtime` (unchanged semantics; skills/commands deployed by reset script chain)

## Gaps found in Phase 0

None blocking. All uncommitted packaging-relevant components already wired into `build-wanding.ps1` + `installer-wanding-v2.nsi` + bootstrap gates. Stale binaries (CCB dist, aioncore) handled by rebuild in Phase 3.
