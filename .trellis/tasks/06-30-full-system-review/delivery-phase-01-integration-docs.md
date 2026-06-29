# Integration Phase 1 — 文档对齐交付（2026-06-30）

> Task: `06-30-full-system-review` · subtask: `integration-fix-docs`

## 修复的问题

### 1. route-b 同步目标 — spec 与脚本不一致（INT-P0-1 文档侧）

**Before:** `route-b-sync.md` 写 **4** 个目标（含 `.aionui-web`、`D:\aionui-web`），与 `sync-aionui-ccb-route-b.ps1` 实际 **3** 目标不符。

**After:** §2 改为与脚本一致的 3 目标（bundled `InstallDir`、 `%APPDATA%\AionUi`、 `%APPDATA%\AionUi-Dev`）；新增 §2b 说明 legacy `sync-aionui-ccb-patch.ps1`（仅 `acp-agent.js`，最多 4 路径）。

### 2. Dev 启动入口 — spec 仍推荐旧 launcher（INT-P1-1）

**Before:** 多处把 `start-aionui-dev.ps1` 当作默认/推荐启动方式。

**After:** 凡「推荐启动」处统一为 `start-dev-full.ps1`（含 `-Clean`）；旧脚本名仅出现在「已退役 / redirect」表格或历史对照中。

## 修改的文件

| 文件 | 变更 |
|------|------|
| `integration/route-b-sync.md` | 3 targets + §2b legacy patch script |
| `outline.md` | dev 模式入口 |
| `integration/dev-runtime-layers.md` | 默认启动、-Clean、PATH |
| `integration/dev-sync-playbook.md` | 速查表命令、注释示例 |
| `frontend/dev-test-ship.md` | 白屏 playbook、symptom 表、示例命令（10 处） |
| `frontend/ccb-model-settings-ui.md` | 重启命令 |
| `integration/mcp-health.md` | dev health 注释 |
| `integration/agents-unified-model.md` | migration 重启 |
| `guides/mixing-meta-repo.md` | 对比表第三列标 retired |
| `integration/org-knowledge-phase0-rollout.md` | dev login / launcher |
| `integration/unified-org-sso-rollout.md` | org-test launcher 标 retired |
| `integration/aioncore-work-tasks.md` | dev 脚本引用 |

**未改（已正确）：** `price-library.md`、`dev-sync-playbook.md` §1 禁止表（保留旧脚本名作退役说明）。

## 未包含（Phase 2/3）

- `start-dev-full.ps1` 自动 `sync-dev-wanding-vendor`（INT-P0-2）
- `verify-installer.ps1` 默认路径（INT-P1-2）
- `integration-smoke.ps1`（INT-P2-1）
- ACP `0.39.0` 代码侧版本探测（INT-P1-3）

## 验证

- [x] `route-b-sync.md` §2 与 `sync-aionui-ccb-route-b.ps1` `$targets` 一致
- [x] `rg start-aionui-dev .trellis/spec` — 剩余引用均为「退役/redirect/历史」语境
- [x] `dev-test-ship.md` 「Do not use」列表仍列旧脚本名（正确）

## Re-review 补遗（2026-06-30，system-reviewer）

- [x] `dev-test-ship.md` L109 — 「4 targets」→ **3** + link `route-b-sync.md` §2
- [x] `dev-sync-playbook.md` L338 — 「5 个 sync 目标」→ **3**
- [x] `dev-sync-playbook.md` L379 — route-b target #4 → **#2**
- [ ] Backend 仍写 5 targets：`route-b-status.md`、`source-migration-mcp.md` — 留 Step 2 Backend（INT-P1-4）
