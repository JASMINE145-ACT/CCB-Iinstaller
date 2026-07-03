# Project Spec Index (AionUI + CCB-Wanding)

> **Start here** if you are unsure which layer to read. Human strategy notes: [`outline.md`](./outline.md). AI entry points: [`AGENTS.md`](../AGENTS.md) (repo root).

---

## Three entry points (by layer)

| Layer | Start | When |
|-------|-------|------|
| **Frontend** (AionUI desktop) | [`frontend/index.md`](./frontend/index.md) | UI, IPC, chat rendering, dev mode |
| **Backend** (CCB-Wanding / MCP / ACP) | [`backend/index.md`](./backend/index.md) | `--acp`, quotation MCP, build/deploy, MiniMax config |
| **Integration** (boundary) | [`integration/index.md`](./integration/index.md) | route-b, sync, defensive fixes, 4-layer chain |

**Thinking guides** (before cross-layer work): [`guides/index.md`](./guides/index.md)

### Backend quick map

| Area | Root |
|------|------|
| CCB-Wanding source | `D:\claude-code-B\src\` |
| CCB-Wanding deploy | `D:\CCB-Wanding\dist\` |
| Integration patches | `ccb-installer/` |
| Business MCP + Python | `mcp_servers/`, `python/` |
| CCB config | `%LOCALAPPDATA%\CCB-Wanding\.claude\` |

Detail: [`backend/file-map.md`](./backend/file-map.md).

---

## Doc maturity (honest snapshot, 2026-06-26)

| Area | Rating | Good for | Gaps |
|------|--------|----------|------|
| **Integration** | **9/10** | route-b sync, boundary rules, ship/update runbooks, org SSO, dev sync | Some version examples still cite 1.0.x — refresh when shipping 1.1.3 |
| **Backend (ACP / Route B)** | **9/10** | file-map, acp-session-flow, smoke, deploy, source-level MCP, assistant profiles | `route-b-status.md` snapshot date lags — refresh after dist changes |
| **Frontend (core)** | **8.5/10** | file-map, chat-acp-flow, coding-rules, dev-test-ship | `aionui-update-mechanism.md` / `ccb-model-settings-ui.md` not listed below — see `frontend/index.md` |
| **outline.md** | **8/10** | Architecture + Primary strategy (Rule 0) | Not a structured handbook — use layer indexes for tasks |
| **Runtime verification** | **7.5/10** | `test-native-acp-agent.mjs` documented; MCP/skills/command authority verified | Phase 4 cold build + install smoke vs 1.1.2 oracle pending |

**Verdict:** **OK to ship as a handbook** for Route B + layer routing + CCB authority config. Refresh [`backend/route-b-status.md`](./backend/route-b-status.md) when live behavior changes.

**Active work (2026-06-26):** [`06-26-aionui-source-level-recovery`](../tasks/06-26-aionui-source-level-recovery/status.md) — Phase 4 full cold build + install smoke (ship `1.1.3-dev`). Recovery guide: [`guides/mixing-meta-repo.md`](./guides/mixing-meta-repo.md).

---

## Full doc map

### Frontend (`frontend/`)

| Doc | Status |
|-----|--------|
| [`index.md`](./frontend/index.md) | ✅ Entry |
| [`file-map.md`](./frontend/file-map.md) | ✅ |
| [`chat-acp-flow.md`](./frontend/chat-acp-flow.md) | ✅ |
| [`coding-rules.md`](./frontend/coding-rules.md) | ✅ |
| [`dev-test-ship.md`](./frontend/dev-test-ship.md) | ✅ |
| [`electron-architecture.md`](./frontend/electron-architecture.md) | ✅ |
| [`aionui-update-mechanism.md`](./frontend/aionui-update-mechanism.md) | ✅ Upstream + WanD dual-track client |
| [`ccb-model-settings-ui.md`](./frontend/ccb-model-settings-ui.md) | ✅ CCB authority model catalog UI |

### Backend (`backend/`)

| Doc | Status |
|-----|--------|
| [`index.md`](./backend/index.md) | ✅ Entry |
| [`file-map.md`](./backend/file-map.md) | ✅ |
| [`runtime-architecture.md`](./backend/runtime-architecture.md) | ✅ |
| [`acp-session-flow.md`](./backend/acp-session-flow.md) | ✅ |
| [`build-deploy-verify.md`](./backend/build-deploy-verify.md) | ✅ |
| [`coding-rules.md`](./backend/coding-rules.md) | ✅ |
| [`config-layer.md`](./backend/config-layer.md) | ✅ |
| [`route-b-status.md`](./backend/route-b-status.md) | ✅ Live snapshot |
| [`source-migration-mcp.md`](./backend/source-migration-mcp.md) | ✅ Completed — regression ref |
| [`mcp-business.md`](./backend/mcp-business.md) | ✅ Quotation / Python / data |

### Integration (`integration/`)

> **Boundary decision tree** (which doc when touching layers): [`integration/index.md`](./integration/index.md) — not a full directory; this table is the complete file list.

| Doc | Status |
|-----|--------|
| [`index.md`](./integration/index.md) | ✅ Entry — boundary decision tree |
| [`aionui-ccb-boundary.md`](./integration/aionui-ccb-boundary.md) | ✅ 4-layer chain, warmup, assistant handoff |
| [`aionui-config-inventory.md`](./integration/aionui-config-inventory.md) | ✅ CCB authority ownership map |
| [`route-b-sync.md`](./integration/route-b-sync.md) | ✅ route-b patch sync |
| [`defensive-fix-policy.md`](./integration/defensive-fix-policy.md) | ✅ Renderer defensive fixes |
| [`wanding-first-ship.md`](./integration/wanding-first-ship.md) | ✅ First-ship / full exe checklist |
| [`wanding-mvp-v1.md`](./integration/wanding-mvp-v1.md) | ✅ MVP v1 scope contract |
| [`wanding-packaging-whitelist.md`](./integration/wanding-packaging-whitelist.md) | ✅ Install dir file whitelist |
| [`wanding-release-standard.md`](./integration/wanding-release-standard.md) | **Draft** — 发版验收标准（四层链 + NSIS/热更双矩阵）；打包代码缺口见该文 §11 |
| [`internal-update.md`](./integration/internal-update.md) | ✅ VPS manifest + hot update ops |
| [`mcp-health.md`](./integration/mcp-health.md) | ✅ MCP health CLI + UI · **§ AOL inventory closed** · **§ App startup readiness gate** (2026-06-28) |
| [`dev-runtime-layers.md`](./integration/dev-runtime-layers.md) | ✅ Dev layer map (save ≠ deploy) |
| [`dev-sync-playbook.md`](./integration/dev-sync-playbook.md) | ✅ Dev sync commands + smoke |
| [`price-library.md`](./integration/price-library.md) | ✅ Org price library API + AionUI read-only (v2 / 41 cols) |
| [`org-knowledge.md`](./integration/org-knowledge.md) | ✅ Org knowledge API / dual JWT / agent append + shadow read-only / **org_session profile** (2026-07-02) |
| [`org-knowledge-phase0-rollout.md`](./integration/org-knowledge-phase0-rollout.md) | ✅ Phase 0 login linkage ops |
| [`unified-org-sso-rollout.md`](./integration/unified-org-sso-rollout.md) | ✅ Unified org SSO pilot + fleet |
| [`agents-unified-model.md`](./integration/agents-unified-model.md) | ✅ Agent markdown + sidecar + subagent gate / ROE / Gate-J · **§ price+stock + image inquiry (2026-06-29)** |
| [`aioncore-work-tasks.md`](./integration/aioncore-work-tasks.md) | ✅ `/tasks` work-tasks API |
| [`platform-architecture.md`](./integration/platform-architecture.md) | ✅ Platform index → `docs/` |
| [`platform-vertical-packages.md`](./integration/platform-vertical-packages.md) | ✅ ADR — vertical packages |
| [`web-version-ios-access-todo.md`](./integration/web-version-ios-access-todo.md) | 📋 Todo — WebUI / iOS access |

### Task logs (not handbooks)

**Dashboard:** [`../tasks/DASHBOARD.md`](../tasks/DASHBOARD.md) — run `task.py report --write` · playbook [`../tasks/GOVERNANCE.md`](../tasks/GOVERNANCE.md)

| Doc | Role |
|-----|------|
| [`../tasks/06-30-task-system-governance/prd.md`](../tasks/06-30-task-system-governance/prd.md) | **P1 in progress** — task hygiene: `report` / DASHBOARD / GOVERNANCE |
| [`../tasks/06-30-full-system-review/prd.md`](../tasks/06-30-full-system-review/prd.md) | **P1 in progress** — system review；Phase 1 doc ✅；Phase 2 vendor sync ✅ [`delivery-phase-02-integration-vendor.md`](../tasks/06-30-full-system-review/delivery-phase-02-integration-vendor.md)；Phase 2 优化复审 7.5/10 [`phase-02-vendor-sync-optimization-review.md`](../tasks/06-30-full-system-review/reviews/phase-02-vendor-sync-optimization-review.md) |
| [`../tasks/07-02-org-knowledge-dev-token-alignment/prd.md`](../tasks/07-02-org-knowledge-dev-token-alignment/prd.md) | **P1 in progress** — profile-strict `org_session.py` + MCP `AIONUI_APPDATA_PROFILE`; fix `append_business_rule` 401；spec [`integration/org-knowledge.md`](./integration/org-knowledge.md) § MCP `org_session` |
| [`../tasks/07-01-aionui-full-auto-permission-sync/prd.md`](../tasks/07-01-aionui-full-auto-permission-sync/prd.md) | **P0 in progress** — 全自动 bypassPermissions 端到端同步；spec [`frontend/chat-acp-flow.md`](./frontend/chat-acp-flow.md) §3.5 · [`backend/acp-session-flow.md`](./backend/acp-session-flow.md) 2026-07-01 |
| [`../tasks/06-28-app-startup-readiness-gate/prd.md`](../tasks/06-28-app-startup-readiness-gate/prd.md) | **P1 in progress** — app startup readiness gate; spec [`integration/mcp-health.md`](./integration/mcp-health.md) § App startup readiness gate |
| [`../tasks/06-28-app-startup-readiness-gate/progress-2026-06-28.md`](../tasks/06-28-app-startup-readiness-gate/progress-2026-06-28.md) | MVP L1+L2 implemented; `.then()` init crash fixed (2026-06-28) |
| [`../tasks/06-27-quotation-mcp-health/progress-2026-06-28.md`](../tasks/06-27-quotation-mcp-health/progress-2026-06-28.md) | MCP health 29/29 + **AOL BOM fix closed** (2026-06-28) |
| [`../tasks/06-27-quotation-mcp-health/progress-2026-06-27.md`](../tasks/06-27-quotation-mcp-health/progress-2026-06-27.md) | Quotation MCP #20 — python path + probe (2026-06-27) |
| [`../tasks/06-27-result-oriented-execution/progress-2026-06-27.md`](../tasks/06-27-result-oriented-execution/progress-2026-06-27.md) | ROE Stop gate #19 MVP (2026-06-27) |
| [`../tasks/archive/2026-06/06-28-roe-semantic-judge-l2-mvp/`](../tasks/archive/2026-06/06-28-roe-semantic-judge-l2-mvp/) | Gate-J in-process self-check MVP (2026-06-28) |
| [`../tasks/archive/2026-06/06-12-route-b-exe-aionui-runtime/aionui-ccb-wanding-acp-mcp-fix.md`](../tasks/archive/2026-06/06-12-route-b-exe-aionui-runtime/aionui-ccb-wanding-acp-mcp-fix.md) | Archived Route B progress / transcripts (2026-06-12) |
| [`../ccb-installer/AIONUI-BACKEND-STATUS.md`](../ccb-installer/AIONUI-BACKEND-STATUS.md) | Raw status source for route-b-status |

---

## Refresh policy

- **Live behavior changes** → update `backend/route-b-status.md` same day
- **New smoke or deploy script** → update `backend/build-deploy-verify.md`
- **claude-agent-acp version bump** → update `integration/route-b-sync.md`
- **Source MCP migration lands** → ✅ Done (2026-06-12). `acp-session-flow.md` current; dual-state sections collapsed
- **CCB authority config ownership changes** → update `integration/aionui-config-inventory.md`
- **Assistant profile schema / handoff changes** → update `integration/aionui-ccb-boundary.md` § CCB assistant profile handoff
- **Permission mode / 全自动 sync** → update `frontend/chat-acp-flow.md` §3.5 + `backend/acp-session-flow.md` (Guid → session mode)
- **Ship / recovery workflow changes** → update `guides/mixing-meta-repo.md` + `06-26-aionui-source-level-recovery/status.md`
