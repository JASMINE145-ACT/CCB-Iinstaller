# agent-doc-sync: 跨agent共性改动同步与文档更新

## Goal

将 quotation-agent 上已做的改动（代码 + 文档层面）梳理清楚，把共性部分同步给其他 agent；同时修复因 `DEFAULT_SELECTION_CANDIDATE_LIMIT` 7→10 带来的文档滞后。两端（local AppData 与 ccb-installer/config）保持一致。

## What I already know

已读文件：
- `C:\Users\m1774\AppData\Local\CCB-Wanding\.claude\agents\quotation-agent.md`
- `C:\Users\m1774\AppData\Local\CCB-Wanding\.claude\agents\accurate-agent.md`
- `C:\Users\m1774\AppData\Local\CCB-Wanding\.claude\agents\wande-orchestrator.md`
- `C:\Users\m1774\AppData\Local\CCB-Wanding\.claude\agents\cowork.md`

### 明确需要立刻修复

**A. quotation-agent.md 文档中的"7"残留（2处）**
- line 114: `"MCP 默认每条最多返回 **7** 个候选"` → `**10**`
- line 123-124 表格: `默认 ≤7；show_candidates=true ≤15` → `≤10`
- 两端（local + installer）同步

### 共性结构对比（已探索）

| 模块 | quotation-agent | accurate-agent | wande-orchestrator | cowork |
|------|:-:|:-:|:-:|:-:|
| 动态记忆（按需Read）| ✅ | ✅ | ✅ | ❌ |
| 通用执行收敛规则 | ✅ | ✅ | ✅（委派版） | ❌ |
| Do not / 禁止 | ✅ | ✅ | ✅ | 简版 |
| AskUserQuestion 禁用说明 | ✅ 详细 | ❌ 缺 | ✅ | ❌ |
| 禁止3工具链 / 少调用硬规则 | ✅ 详细 | ✅ 有 | ✅ 有 | ❌ |

### 已知设计差异（不需要同步）

- `accurate-agent` 用 `ExecuteExtraTool` 包装 → 这是故意的：accurate MCP 的 `ENABLE_SEARCH_EXTRA_TOOLS` 不同于 quotation MCP（false）
- `cowork` 无 MCP 直调，无需收敛规则

## Open Questions

- **Q1（偏好）**: `accurate-agent.md` 缺少 `AskUserQuestion 禁用`说明；quotation-agent 里写的很清楚（"CCB/AionUI 会话已在 `permissions.ts` 硬拒绝"）。是否要补到 accurate-agent？
- **Q2（范围）**: cowork / word-creator / ppt-creator 等 office agent 是否在本次同步范围内？

## Requirements（已确定）

1. 修复 `quotation-agent.md` 两处 "7" → "10"（local + installer 两端）
2. 确认 local 与 installer 各 agent 是否完全一致（diff 检查）；不一致则以 local 为准同步到 installer
3. `accurate-agent.md` 补充「禁止 AskUserQuestion」说明（与 quotation-agent 风格一致）（local + installer 两端）

## Acceptance Criteria

* [ ] `quotation-agent.md` (local + installer) 所有 "≤7" / "**7**" 已改为 "≤10" / "**10**"
* [ ] `accurate-agent.md` (local + installer) Do not 节增加 AskUserQuestion 禁用说明
* [ ] local 与 installer 四个主要 agent 内容完全一致（diff = 0）

## Definition of Done

* 两端文件 diff 为空
* git commit 记录变更

## Technical Approach

1. 先做 diff：`local agents/` vs `ccb-installer/config/agents/`
2. 修复 quotation-agent 7→10 文档
3. 同步 local 与 installer（以 local 为准）
4. 若 Q1/Q2 确认，补充 accurate-agent 的 AskUserQuestion 禁用说明

## Out of Scope

* 不改 cowork / word-creator / ppt-creator / excel-creator（除非 Q2 确认）
* 不重构 agent 结构，只做文字层面同步

## Technical Notes

* Local: `C:\Users\m1774\AppData\Local\CCB-Wanding\.claude\agents\`
* Installer: `D:\Projects\claude-code-best\ccb-installer\config\agents\`
* quotation-agent.md 中 "7" 的位置：line 114, line 123-124
