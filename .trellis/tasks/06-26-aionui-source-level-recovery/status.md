# AionUi Recovery Status — 2026-06-26

## Summary

**Runtime recovery: ~complete.** Bundled 1.1.2 (Mixing UI + 万鼎 Guid cards) is restorable and usable from `D:\CCB-Wanding`.

**Source-level pipeline: Phase 3 staging validation passed (2026-06-26).** `build-wanding.ps1 -Version 1.1.3-dev -SkipNsis -SkipBuild -SkipAionUiBuild -SkipPipMcp -SkipStagingClear` → manifest validation OK; staging includes `python/system/tool_dispatch.py`.

**Canonical doc**: [`.trellis/spec/guides/mixing-meta-repo.md`](../../spec/guides/mixing-meta-repo.md)

---

## What Was Broken

| Symptom | Root cause |
|--------|------------|
| Old upstream UI (AionUi / Aion CLI / 3D游戏 cards) | Dev launcher (`start-aionui-dev.ps1`) or CCB authority inactive path |
| New UI missing 万鼎报价专家 | Same — need bundled + CCB `settings.json` + agent sidecars |
| Mixing login「连接失败」 | `org-server.json` written with UTF-8 BOM → `JSON.parse` failed → `__orgServerUrl` empty |
| `git restore` aftermath | Architecture refactor lost; `aionui-src` CCB integration mostly untracked |

---

## What Works Now

- `D:\CCB-Wanding\AionUi\` matches `ccb-installer/staging/AionUi` (app.asar SHA256 identical).
- Bootstrap + route-b sync + seed agents deploy OK.
- Agent sidecar: `quotation-agent.aionui.json` → `display_name: 万鼎报价专家`, `guid_primary: true`.
- Org VPS `http://67.216.206.3:13401` reachable; `yjc` login POST succeeds.
- Bundled launch: `D:\CCB-Wanding\ccb-launch-aionui.cmd` → window title **Mixing**, org SSO login.
- One-click recovery script: `ccb-installer/scripts/recover-aionui-new-ui.ps1`.

---

## Fixes Applied This Session

### Runtime / packaged (Phase 0)

| Change | Location |
|--------|----------|
| Recovery launcher script | `ccb-installer/scripts/recover-aionui-new-ui.ps1` |
| `ORG_SERVER_URL` env fallback | `ccb-installer/ccb-launch-aionui.cmd` (+ synced to `D:\CCB-Wanding`) |
| Strip UTF-8 BOM on read | `aionui-src/.../orgServerConfig.ts` |
| Rewrite `org-server.json` without BOM | `%APPDATA%\AionUi\aionui\`, `%APPDATA%\AionUi-Dev\aionui\` |
| Guid loader CCB branch (in tree since `109aa15`) | `aionui-src/.../useCustomAgentsLoader.ts` |

### Dev shell parity wiring (2026-06-26, **uncommitted**)

Full file list: [`dev-parity-wiring-2026-06-26.md`](./dev-parity-wiring-2026-06-26.md)

| Area | Summary |
|------|---------|
| **Auth / SSO** | `desktopAuthFlags.ts`, preload flags + `invokeIpc`, `AuthContext` desktop SSO/local JWT, `OrgAuthProvider` |
| **Navigation** | `/tasks` routes, `SiderWorkTasksEntry`, `/settings/team-members`, user chip + logout |
| **Brand** | `APP_BRAND_NAME = Mixing`, login/orgKnowledge i18n |
| **Launcher** | `start-dev-full.ps1` loads `env.local` / `sso.env` (`AIONUI_SSO_MODE=org-idp`) — fixes local `/login` 401 |

**Still upstream in dev (Layer 2 — not this batch):** ~~Settings → 模型 / 助手 / Agents pages; preset prune migration not hooked.~~ **Done 2026-06-26 evening** — see wiring doc § Layer 2. Runtime smoke pending after `start-dev-full.ps1` restart.

### Dev settings parity (Layer 2, 2026-06-26, **uncommitted**)

| Area | Summary |
|------|---------|
| **模型** | `CcbModelSettingsPanel` + `ModelModalContent` CCB branch |
| **助手** | `fetchAssistantsCatalog` shared by Guid + Settings |
| **Agents** | `CcbWandingAgentsPanel` replaces upstream CLI grid when CCB active |
| **Migrations** | `runBackendMigrations` → `CCB_MIGRATION_STEPS` (incl. prune) |

### Dev capabilities parity (Layer 3, 2026-06-27, **uncommitted**)

| Area | Summary |
|------|---------|
| **技能** | `fetchSettingsSkillsCatalog` → CCB `.claude/skills`; CCB-Wanding badge |
| **工具** | `ToolsModalContent` CCB branch → `CcbMcpHealthPanel` only |

### Dev Guid parity (Layer 4, 2026-06-27, **uncommitted**)

| Area | Summary |
|------|---------|
| **Preset handoff** | `buildCcbPresetConversationExtra` + `stageNextSessionProfile` wired in send/warmup path |
| **Guid 技能/MCP 菜单** | CCB catalog when authority active |

---

## How To Run (Daily)

```powershell
# Preferred — bundled Mixing UI
D:\CCB-Wanding\ccb-launch-aionui.cmd
# or
.\ccb-installer\scripts\recover-aionui-new-ui.ps1

# Login: org SSO (yjc + employee password from scripts/org-phase0/env.local)
# Dev with Layer 1+2 parity:
.\ccb-installer\scripts\start-dev-full.ps1
# Do NOT use start-aionui-dev.ps1 for WanD/Mixing parity (has AIONUI_BYPASS_AUTH=1)
```

---

## Remaining (Phase 4 — full cold build)

**Phase 4 ≠ 再打一个叫 1.1.2 的安装包。** 目标是从 Git 全冷构建，行为对齐现网 `D:\CCB-Wanding`（1.1.2 参照物），对外版本号用 **`1.1.3-dev`** / **`1.1.3`**。

1. **Full cold build**（去掉 `-SkipBuild` / `-SkipAionUiBuild` / `-SkipPipMcp`）→ 可选 `-SkipNsis` 先只验 staging
2. **Install smoke** on test machine: Mixing title, 万鼎报价专家, org SSO, quotation MCP
3. **Optional NSIS**: `CCB-Wanding-1.1.3-dev.exe`
4. **Mixing clone smoke** on second machine: `git clone --recurse-submodules`
5. **Optional**: fix `ccb-update-auto.ps1` encoding (non-blocking)

---

## Verification Evidence

See `check.jsonl` phases: `baseline`, `source-gap`, `dev-parity`, `ui-recovery`, `org-login-fix`, `dev-shell-wiring`, `dev-sso-launcher-fix`, `layer-2-settings-wiring`.

Key commands that passed:

- `Get-FileHash` staging vs `D:\CCB-Wanding` app.asar — match
- `POST http://67.216.206.3:13401/login` (yjc) — success
- `bun test tests/unit/common-config/ccbAgentCatalog.test.ts` — pass
- User confirmed: **恢复的差不多** (2026-06-26)

### Git snapshots (2026-06-26, all pushed)

| Repo | Branch | Commit | Remote |
|------|--------|--------|--------|
| `aionui-src` | `ccb-wanding-1.1.2-recovered` | `109aa15` + **uncommitted dev-parity wiring** | [JASMINE145-ACT/AionUi](https://github.com/JASMINE145-ACT/AionUi/tree/ccb-wanding-1.1.2-recovered) |

**2026-06-26 dev-parity wiring (uncommitted):** see [`dev-parity-wiring-2026-06-26.md`](./dev-parity-wiring-2026-06-26.md). Summary: `/tasks` + sider, desktop auth (SSO/JWT/bypass), Mixing brand, `OrgAuthProvider`, `invokeIpc`, `start-dev-full.ps1` SSO env load.

| `CCB-Iinstaller` | `main` | `6f2e4963` | [JASMINE145-ACT/CCB-Iinstaller](https://github.com/JASMINE145-ACT/CCB-Iinstaller) (code `f8ab39ae` + Trellis docs) |
| `claude-code` | `ccb-wanding-1.1.2-recovered` | `238f4635` | [JASMINE145-ACT/claude-code](https://github.com/JASMINE145-ACT/claude-code/tree/ccb-wanding-1.1.2-recovered) |
| `Mixing` | `master` | `5513401` | [JASMINE145-ACT/Mixing](https://github.com/JASMINE145-ACT/Mixing) + tag `v1.1.2-recovered` (real submodules) |

Phase 3 build log: `build-1.1.3-dev-pass2.log` in this task folder.

See `aionui-src-commit-audit.md` for file-level commit/ignore audit.  
Meta-repo templates: `meta-repo/` in claude-code-best; local Mixing at `D:\Projects\Mixing`.  
**Trellis guide**: [`.trellis/spec/guides/mixing-meta-repo.md`](../../spec/guides/mixing-meta-repo.md)

---

## 2026-06-27 1.1.2 Agent Alignment 补漏

Scope: align source dev behavior to the 1.1.2 packaged oracle. No broader UI redesign.

| Area | Summary |
|------|---------|
| Agent call path | `CcbWandingAgentsPanel` no longer sends every CCB agent as a plain `claude` execution agent. Guid-visible presets now navigate with `custom:<agentId>` so the existing preset assistant/profile handoff runs. Hidden default `wande-orchestrator` remains the base `claude` session path. |
| Ownership guard | When CCB authority is active, Settings -> Assistants is read-only over the CCB catalog: create, reorder, toggle, edit, duplicate, and delete actions are disabled so source dev does not write WanD agents into legacy AionUI `assistants.*` storage. |
| Test | Added `tests/unit/renderer/ccbAgentGuidSelection.test.ts` for `quotation-agent -> custom:quotation-agent`, `wande-orchestrator -> claude`, and disabled-agent fallback. |
| Verification | `D:\Projects\aionui-src\node_modules\.bin\tsc.exe --noEmit -p tsconfig.json` passed. `D:\Projects\aionui-src\node_modules\.bin\vitest.exe run tests/unit/renderer/ccbAgentGuidSelection.test.ts tests/unit/common-assistants/fetchAssistantsCatalog.test.ts` passed: 2 files / 6 tests. |

Files touched in `D:\Projects\aionui-src`:

- `packages/desktop/src/renderer/pages/settings/AgentSettings/CcbWandingAgentsPanel.tsx`
- `packages/desktop/src/renderer/pages/settings/AssistantSettings/index.tsx`
- `packages/desktop/src/renderer/pages/settings/AssistantSettings/AssistantListPanel.tsx`
- `tests/unit/renderer/ccbAgentGuidSelection.test.ts`

