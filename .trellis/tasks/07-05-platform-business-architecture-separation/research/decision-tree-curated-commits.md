# Decision Tree — Curated Commit Classification (AC3)

**Date:** 2026-07-05  
**Tree:** `.trellis/spec/integration/platform-business-boundary-map.md` §3

## Method

For each curated commit, walk Q1→Q5 and record first decisive answer.

Five required types: **平台脚本 / 业务 Agent / UI / 配置 manifest / 文档** — one real commit each.

---

### 1. 平台脚本 — `4b95289a` (claude-code-best)

**Files:** `build-wanding-lib.ps1`, `run-wanding-bootstrap.ps1`, `start-dev-full.ps1`

| Step | Answer | Reason |
|------|--------|--------|
| Q1 | NO | Touches `ccb-installer/scripts/` not vertical-only |
| Q2 | NO | No new agent/MCP IDs; adds VERSION file helper |
| Q3 | NO | Not pure registry/compiler — install path defaults |
| Q4 | **YES** | Dev/bootstrap glue; `%LOCALAPPDATA%\CCB-Wanding` assumptions |

**Classification:** **MIXED** (integration / product dev pipeline)

---

### 2. 业务 Agent — `0ae52199` (claude-code-best)

**Files:** `ccb-personal-memory/`, vertical agent `.md`, deploy scripts

| Step | Answer | Reason |
|------|--------|--------|
| Q1 | **YES** | Skills + vertical agents + memory resources |

**Classification:** **BUSINESS** (vertical package capability)

---

### 3. UI — `813040a` (aionui-src)

**Repo:** `D:\Projects\aionui-src`  
**Files:** `packages/desktop/src/renderer/components/settings/UpdateModal.tsx` (+272 lines)  
**Subject:** `feat(update): CCB full installer one-click download in About page`

| Step | Answer | Reason |
|------|--------|--------|
| Q1 | NO | Renderer settings component, not vertical package dir |
| Q2 | **YES** | WanD/CCB-Wanding product strings, installer filename `CCB-Wanding-{version}.exe` |
| Q4 | **YES** | Assumes WanD NSIS installer layout and update channel |

**Classification:** **NEEDS SPLIT** — product branding/update UX should come from installed package manifest (backlog SB-09), not hardcoded in generic settings UI

---

### 4. 配置 manifest — `4fb903a7` (claude-code-best)

**Files:** install-health manifests, `package.json`, NSIS, checklists

| Step | Answer | Reason |
|------|--------|--------|
| Q1 | PARTIAL | Mix of vertical health JSON + platform manifest |
| Q2 | NO | No hardcoded agent IDs in platform src |
| Q3 | **YES** | Health split / registry snapshot are platform descriptors |

**Classification:** **PLATFORM** (primary); vertical manifest edits in same commit → **BUSINESS** in PR review split

---

### 5. 文档 — `355d6dc2` (claude-code-best)

**Files:** `.trellis/spec/`, `.trellis/tasks/07-04`–`07-07`

| Step | Answer | Reason |
|------|--------|--------|
| Q3 | **YES** | Architecture documentation |

**Classification:** **PLATFORM** (engineering meta)

---

## Supplementary — Platform ACP `7c618ee1` (not one of the five types)

**Files:** `employeeProfile.ts`, `agentSessionProfile.ts`

| Step | Answer |
|------|--------|
| Q3 | **YES** — generic session profile injection |

**Classification:** **PLATFORM**

---

## Result

All **five required commit types** have a real curated hash and a decisive tree outcome. UI commit correctly lands on **NEEDS SPLIT**, matching audit backlog SB-09.
