# PRD — agent-company-meta + platform 绿场引导

> **Task:** `07-13-agent-company-meta-bootstrap`  
> **Status:** planning (await 执行) — **System Review accepted 2026-07-13**  
> **Priority:** P0  
> **Date:** 2026-07-13  
> **Source:** 方案 A + System Review Phase 1 门禁

## Goal

把「Agent 原生公司」新产品从 `claude-code-best`（CCB）身份中拆出，建立可开发的 **meta 工作区 + platform 主仓 + sample-ccb 只读样板**，并 bootstrap 可复用的 Cursor/Claude/Trellis 工具链——**不**把 CCB/Wanding 业务语义带进平台核心。

边界必须 **技术门禁 + 文档** 双轨，不能只靠 README。

## What I already know

* 产品定位：`docs/platform-system-business-decoupling-optimization.md` §0 / §0.1  
* 组织愿景：`公司组织/prd.md`（L1）  
* Mixing 参考：`meta-repo/README.md`  
* System Review：`research/system-review-accepted.md`

## Locked decisions

| 决策 | 内容 |
|------|------|
| 结构 | `agent-company-meta` = 工作区；`platform/` = 新产品主仓；`sample-ccb/` = CCB submodule |
| 禁止 | 在 `claude-code-best` 内新建 `platform/` 当新产品主场 |
| 边界 | `platform/` **不得** import/require `sample-ccb/` 源码（脚本门禁） |
| 迁包 | CCB 迁出物只能进 `platform/packages/com.wanding.trade/`（**另 task**；本 task 不造包体） |
| 工具链 | 可 bootstrap trellis-* / cursor；**`.trellis/spec` 重写**；禁止照搬 CCB backend/frontend WanD spec |
| 提交 | Cursor 开 meta 根；**git 提交在 platform / sample-ccb 各自仓**；meta 只编排 |
| **Submodule** | **MVP = 本地 path** → `D:\Projects\claude-code-best`；README 写远端 URL 替换步骤 |
| **Docs** | **MVP = 快照复制** + `platform/docs/source-map.md`（source path + date）；不做 symlink |
| **meta .trellis** | **保留轻量** `.trellis/tasks`（路线图）；产品 spec 只在 platform |
| **Runtime** | 本 task **无应用运行时**；README 写 “no app runtime yet” |
| **Contract 前缀** | 本 task 使用 `AGENTCO.*`（中立）；不沿用 `WANd.*` |

## Recommended layout

```text
D:\Projects\agent-company-meta\
  AGENTS.md
  README.md                      # where-to-commit + 3× git status + sample-ccb 只读
  .cursor\
  .agents\
  .trellis\tasks\                # 轻量 meta 任务（必有）
  agent-company-meta.code-workspace

  platform\                      # 独立 git
    AGENTS.md
    README.md                    # no app runtime yet
    .trellis/spec/index.md       # L1/L2/L3 only
    .trellis/scripts\
    packages/.gitkeep
    control-plane/.gitkeep
    runtime-adapters/.gitkeep
    scripts/check-no-sample-import.mjs
    scripts/check-no-wanding-core-terms.mjs
    docs/… + source-map.md + bootstrap-retarget-report.md

  sample-ccb\                    # submodule（只读样板）
```

## Requirements

1. 创建 meta 根 + workspace + README（提交规则 / 只读 / 三仓 status）。  
2. 初始化 platform 独立 git 骨架。  
3. sample-ccb submodule（本地 path）；README 含远端替换。  
4. Bootstrap 工具链 per inventory + **retarget report**。  
5. 权威文档 **快照复制** + source-map。  
6. `check-no-sample-import.mjs`（allowlist + RED fixture + **scanner 自排除**）。  
7. `check-no-wanding-core-terms.mjs`（forbidden list + **scanner 自排除**）。  
8. sample-ccb `git status --short` 必须为空（冒烟）。  
9. platform `.trellis/spec/index.md` 仅 L1/L2/L3 入口。

## Acceptance Criteria

- [ ] meta 可用 Cursor 打开（`.code-workspace`）  
- [ ] platform 独立 git + AGENTS.md 边界声明  
- [ ] sample-ccb submodule；`git -C sample-ccb status --short` 为空  
- [ ] boundary scripts GREEN；fixtures RED 可演示  
- [ ] wanding-core-terms GREEN on platform core paths  
- [ ] `docs/source-map.md` + 文档快照存在  
- [ ] `bootstrap-retarget-report.md` 存在  
- [ ] README：where-to-commit 表 + 三仓 status  
- [ ] `.trellis/spec/index.md` 无 forbidden terms  
- [ ] plan lint PASS；用户说「执行」前不写业务应用代码  

## Out of Scope

* Contract Engine / Rudder fork / 完整 L3 registry  
* `com.wanding.trade` 实际抽包（新 task）  
* ClaudeCodeBRuntimeAdapter 实现（新 task）  
* 改 CCB 现网发版  

## Open Questions — closed for MVP

| Q | Decision |
|---|----------|
| submodule local vs remote | **local path** |
| meta own git? | **yes** |
| folder names | `agent-company-meta` / `platform` |

## Technical Notes

* `research/bootstrap-inventory.md` — scan scopes / allowlist / forbidden terms  
* `research/system-review-accepted.md` — review disposition  
* Upstream：`docs/platform-system-business-decoupling-optimization.md` §0.1  
