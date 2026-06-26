# Project Strategy Notes (AionUI + CCB-Wanding)

> **Not a structured handbook** — use [`index.md`](./index.md) layer entries for day-to-day work. This file: architecture narrative + **Primary strategy (Rule 0)**.

---

## Architecture (4 layers)

```text
AionUI.exe (前端 UI)
  └─ aioncore.exe (ACP 二进制桥)
      └─ route-b/index.js (process launcher)
          └─ CCB-Wanding dist/cli.js --acp (完整 CCB-Wanding 后端)
```

AionUI 是纯展示层；CCB-Wanding 是后端（MCP、报价、业务知识）。route-b 用正确环境变量启动 CCB-Wanding；aioncore 做 ACP IPC 桥接。

**AionUI 源码：** `D:\Projects\aionui-src\packages\desktop`（monorepo 根：`D:\Projects\aionui-src`）

---

## Repo layout

| 路径 | 角色 |
|------|------|
| `D:\Projects\aionui-src\` | AionUI 前端源码（`packages/desktop`） |
| `D:\claude-code-B\src\` | CCB-Wanding ACP/MCP 源码 |
| `D:\CCB-Wanding\dist\` | CCB 编译产物（**从源码 build，不要手改 minified chunk**） |
| `D:\Projects\claude-code-best\` | Installer、route-b 补丁、`python/`、`data/`、`ccb-installer/` |
| `D:\CCB-Wanding\` | 本机 bundled 运行时（1.1.2 恢复基线 / 对比 oracle） |
| `D:\Projects\Mixing\` | 三仓 meta-repo（submodules） |

---

## Dev vs bundled

| 方式 | 速度 | 操作 |
|------|------|------|
| **dev 模式（改 UI）** | 保存即刷新 | `ccb-installer/scripts/start-aionui-dev.ps1` 或 `cd aionui-src; bun run dev` |
| **bundled Mixing UI（员工同款）** | 无需 build | `D:\CCB-Wanding\ccb-launch-aionui.cmd` 或 `recover-aionui-new-ui.ps1` |
| **打安装包** | 数十分钟 | `build-wanding.ps1 -Version <x.y.z>` — 见 [`guides/mixing-meta-repo.md`](./guides/mixing-meta-repo.md) |

**Save ≠ Deploy。** 只有 renderer 接近热更新；CCB dist、route-b、vendor python 需 sync/build。见 [`integration/dev-runtime-layers.md`](./integration/dev-runtime-layers.md)。

---

## Capability status (2026-06-26)

| 需求 | 状态 |
|------|------|
| 前端改代码 + 热更新 | ✅ `aionui-src` + dev / `start-aionui-dev.ps1` |
| 后端改代码 + rebuild | ✅ `claude-code-B` → `deploy-claude-code-b-to-wanding.ps1` |
| MCP 源码注册（`$buildMcp`） | ✅ 已完成 2026-06-12 — [`backend/source-migration-mcp.md`](./backend/source-migration-mcp.md) |
| 业务层（MCP / 价库 / python） | ✅ `ccb-installer/`、`python/`、`data/` |
| 集成运行（Mixing + org SSO） | ✅ `D:\CCB-Wanding` 1.1.2 恢复基线 |
| 源码全量冷构建 → 新安装包 | ⏳ Phase 4 — ship **`1.1.3-dev`** — task `06-26-aionui-source-level-recovery` |

---

## Historical note (archived)

2026-06 初曾手 patch minified `entry-*.js` 里的 `$buildMcp()`。该路径已废弃；dist 从 `claude-code-B` 源码重建。过程记录：[`tasks/archive/2026-06/06-12-route-b-exe-aionui-runtime/aionui-ccb-wanding-acp-mcp-fix.md`](../tasks/archive/2026-06/06-12-route-b-exe-aionui-runtime/aionui-ccb-wanding-acp-mcp-fix.md)。

---

## Primary strategy (Rule 0)

| 场景 | 改哪里 |
|------|--------|
| ACP / MCP / session / greeting / 工具列表 | **`D:\claude-code-B\src/`** → build → deploy dist |
| 纯 UI / UX / 热键 / 聊天渲染 | **`aionui-src/packages/desktop/src/`** |
| route-b 胶水、安装脚本、seed | **`ccb-installer/`** |
| 报价 Python、价库、业务 md | **`python/`、`data/`、`mcp_servers/`** |
| AionUI 防御性补丁（症状缓解） | 仅在后端修复进行中；必须 `// TODO(defensive)` — [`integration/defensive-fix-policy.md`](./integration/defensive-fix-policy.md) |

**Bottom line:**

1. **ACP/MCP 根因在 Layer 4 源码**，不在 AionUI 前端堆补丁。
2. **不要长期手改** `D:\CCB-Wanding\dist\` minified chunk；应急 hotfix 须有迁移 ticket。
3. **route-b** 是永久集成层，不是临时 workaround。
4. **MCP 源码迁移已完成**；rebuild dist 是常规路径，不是高风险实验。
5. **不确定时** → 先读 [`integration/index.md`](./integration/index.md) 决策树，再进 layer index。

详见 [`backend/index.md`](./backend/index.md) · [`frontend/index.md`](./frontend/index.md) · [`integration/defensive-fix-policy.md`](./integration/defensive-fix-policy.md)。
