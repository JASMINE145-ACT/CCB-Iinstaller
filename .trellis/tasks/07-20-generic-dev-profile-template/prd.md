# PRD — Generic Dev Profile（CCB 内部解耦 / agent harness）

> **Task:** `07-20-generic-dev-profile-template`  
> **Status:** planning — **r2 after conditional-approval review** (2026-07-20) · await 批准执行  
> **Priority:** P1  
> **Maturity:** **Internal tool / dev harness** — 不是 Deliverable product，不是新产品绿场骨架  
> **Source:** openspec-explore + `/trellis:plan-execution` + 可行性评审 ×2

## Goal

在 **不破坏 Mixing / WanD 默认路径** 的前提下，提供一条可启动的 **业务中立 Generic dev profile**，用于验证：

1. **Agent 能力可替换**（primary）— 默认 router / fleet / MCP / Guid 随 **enabled packages 编译投影** 切换  
2. **状态与 Mixing 隔离** — 独立 AppData + 独立 CCB ConfigDir，禁止污染 Mixing  
3. **二次垂直可挂载（闭环）** — enable/disable non-WanD vertical 后 live agents / Guid / Agent() 同步出现或清理；**不**承诺「换公司即可交付产品」

## Locked decisions (2026-07-20 r2)

| Decision | Choice |
|----------|--------|
| Maturity | Internal Generic **dev harness** only |
| Default packages (cold start) | **`enabledPackages: ["com.platform.core"]`** — 禁止 `[]`；允许后续 enable 其他 vertical（见闭环） |
| Default agent | **`platform-router`**（唯一 ID） |
| Router mode | **B** — `Agent()` 保留；core-only 时委派为空；enable vertical 后专家自动进入 fleet |
| Agent MCP | `platform-router.mcpServers: []` |
| Platform MCP | 可保留 `platform.defaults` 通用 MCP；验收 = **无业务 MCP**，不是零 MCP |
| Isolation | `AIONUI_APPDATA_PROFILE=Generic-Dev` + `CCB_WANDING_CONFIG_DIR=...\profiles\Generic-Dev\.claude` |
| Auth | Generic = **dev-only bypass**；Mixing = org-idp |
| Compiler | 显式 `--tenant-config`（+ package-state）；禁止隐式 `tn_wanding_prod` |
| **Fleet authority (P0-1)** | **方案 A（锁定）**：compile 写出 profile-scoped `agents.json` + `agent-fleet.defaults.json` + `package-registry.snapshot.json`（或等价过滤 snapshot）；launcher 设 `PACKAGE_REGISTRY_PATH` + `AGENT_FLEET_DEFAULTS_PATH` 指向隔离 ConfigDir；Route B / CCB / AionUI **同一套** env。**禁止**运行时继续读全局 `primaryPackageId=com.wanding.trade` |
| **Exact-mirror (P0-2)** | 精确镜像 **编译后的 enabled-package Agent projection**（`agents.json` 中的 id 集合），**不是**写死只镜像 `com.platform.core` |
| Default session (UI) | 经 **fleet-policy IPC / projection** 取得 `defaultSessionAgentId` — **禁止**「列表只有 1 个就当默认」启发式 |
| Smoke | 新 Claude/CCB smoke：**至少 1 例不显式传 `ccb_agent_id`**，验证默认解析 = `platform-router`；另可有显式 id 用例 |
| Extensions | Generic 默认 **`-NoExtensions`**（关 wecom 等） |
| Isolation proof | Hash/`content` 检查 Mixing **ConfigDir 与 `%APPDATA%\AionUi-Dev`** |
| `com.platform.core` path | 暂放 `packages/vertical/` = **harness 兼容债**，非最终平台包边界 |
| Execute | 用户明确说 执行 后再写代码 |

### Profile-scoped fleet chain（P0-1 · 方案 A）

```text
compile(--tenant-config tn_generic_dev …)
  → <Generic ConfigDir>/agents.json              # enabled projection
  → <Generic ConfigDir>/agent-fleet.defaults.json  # primaryPackageId=com.platform.core,
                                                   # legacyFleetAgentIds=[], officePreset=…
  → <Generic ConfigDir>/package-registry.snapshot.json  # agents ⊆ enabled packages
  → apply settings.json atomically
  → exact-mirror agents/*.md from projection sources
  → launcher:
       PACKAGE_REGISTRY_PATH=<Generic…/package-registry.snapshot.json>
       AGENT_FLEET_DEFAULTS_PATH=<Generic…/agent-fleet.defaults.json>
       CCB_WANDING_CONFIG_DIR=<Generic…/.claude>
  → packageRegistry.ts 已有 env override → defaultSessionAgentId=platform-router
```

Evidence of current gap: global `agent-fleet.defaults.json` has `"primaryPackageId": "com.wanding.trade"`; `agents.json` is written but not consumed; runtime loads global registry via `packageRegistry.ts`.

### Vertical enable/disable loop（P0-2）

```text
1) Core-only: live agents = {platform-router}; delegatable empty; default = platform-router
2) Enable com.example.manufacturing-scheduling:
     recompile → remirror → scheduling-agent in live agents / Guid / Agent() targets
     default still platform-router; still no WanD agents/MCP
3) Disable manufacturing:
     recompile → remirror → scheduling-agent removed; no stale files
4) End-to-end never introduces WanD agents/MCP into Generic profile
```

## Mixing vs Generic matrix

| 项目 | Mixing | Generic（cold start） |
|------|--------|------------------------|
| AionUI AppData | `AionUi-Dev` | `Generic-Dev` |
| CCB ConfigDir | `...\CCB-Wanding\.claude` | `...\profiles\Generic-Dev\.claude` |
| Tenant | `tn_wanding_prod` | `tn_generic_dev` |
| Packages | `com.wanding.trade` | `com.platform.core`（可再 enable manufacturing 做闭环） |
| Fleet defaults | 全局 WanD primary | **profile-scoped** core primary + empty legacy |
| Auth | org-idp + JWT | dev-only bypass |
| Seed | WanD + office | **exact-mirror of agents.json projection** |
| Extensions | WeCom 等默认开 | **默认关** |
| Vendor / WanD cmds | 执行 | 跳过 |
| Default session | `wande-orchestrator` | `platform-router` via fleet env |
| Biz MCP | 有 | 无 |

## Target run chain

```text
-Profile Generic
  → Generic-Dev AppData + isolated ConfigDir
  → compile --tenant-config tn_generic_dev
  → write agents.json + agent-fleet.defaults.json + filtered registry snapshot
  → apply settings.json
  → exact-mirror projection agents
  → set PACKAGE_REGISTRY_PATH + AGENT_FLEET_DEFAULTS_PATH
  → SKIP vendor / WanD / org SSO / extensions
  → start AionUI
  → default session from fleet policy (= platform-router)
  → Claude/CCB ACP (incl. smoke **without** explicit ccb_agent_id)
  → assert isolation hashes on Mixing ConfigDir + AionUi-Dev
```

## Acceptance criteria

- [ ] Generic 不写入 Mixing ConfigDir **且** `%APPDATA%\AionUi-Dev`（hash/content）
- [ ] Compile：`agents.json` 含 `platform-router`；`settings.json` **无** quotation/accurate 等业务 MCP（平台通用 MCP 可保留）
- [ ] Profile fleet：`AGENT_FLEET_DEFAULTS_PATH` / `PACKAGE_REGISTRY_PATH` 生效 → `defaultSessionAgentId=platform-router`（非 wande-orchestrator）
- [ ] Exact-mirror：live agents 文件集合 == `agents.json` ids；无 stale WanD
- [ ] **闭环：** enable manufacturing → scheduling-agent 可见；disable → 清理；全程无 WanD
- [ ] Guid 默认发送（无选卡、**不显式传 id**）= platform-router
- [ ] CCB smoke：至少 1 例无显式 `ccb_agent_id` + stream + turn.completed
- [ ] Generic 启动无需 org-server / JWT；默认无 WeCom 扩展
- [ ] Mixing checklist 仍 PASS
- [ ] Phase 0b 基线测试先绿

## Non-goals

- 绿场新产品主仓  
- 交付级「换公司即可上线」  
- 完整动态 UI 插件系统  
- Generic 默认 org-idp / WanD MCP  
- aionrs `test-turn-completed.mjs` 作 CCB 验收  
- `enabledPackages: []`  
- Mode A（禁用 Agent()）  
- 把 `packages/vertical/com.platform.core` 当作最终平台包边界（仅 harness 债）

## Related

- `.trellis/spec/integration/platform-vertical-packages.md`
- `.trellis/spec/integration/package-lifecycle.md`
- `docs/platform-system-business-decoupling-optimization.md` §0
- `ccb-installer/config/runtime/agent-fleet.defaults.json`（全局 WanD primary — Generic 必须 override）
- Conditional-approval review 2026-07-20（P0-1 fleet chain · P0-2 projection mirror）
