# 万鼎 /learn-by-data Slash 与推荐 Prompt 发现性

## Problem

`quotation-agent.md` 工具决策表声明 `/learn-by-data` /「按数据学习」/「复盘报价」，但：

- AionUI `/` slash 菜单**无** `/learn-by-data`（仅有 shell builtin + CCB capability manifest 项）
- Guid 万鼎卡**无**推荐 prompt 指向复盘流程
- 用户不知道要打字触发，误以为 skill 未配置

Skill **运行时**已存在（`Skill(quotation-learn-by-data)`）；缺口是 **发现性（discoverability）**。

## Goal

用户在万鼎报价专家会话中**无需猜口令**即可发现 learn-by-data 入口（slash 菜单和/或 Guid 推荐语）。

## Options (decide in implement — document in design note)

| 路径 | 改动面 | 体验 | 风险 |
|------|--------|------|------|
| **P1 推荐 prompt** | `quotation-agent.aionui.json` `recommended_prompts` | Guid 卡一键填入「按数据学习…」 | 低 |
| **P2 capability slash** | `capabilities.ts` + quotation-agent session filter | `/` 菜单可见 `/learn-by-data` | 中；需 route-b sync |
| **P3 两者都做** | 上两项 | 最佳发现性 | 略增维护 |

**建议默认**：先做 **P1**（本任务 MVP），P2 作为 AC 可选或 follow-up 同任务第二条。

P2 若做：命令类型 `prompt`，`status: ready`，执行时注入与 `Skill(quotation-learn-by-data)` 等价的用户消息前缀（**不**新 MCP）。

## Requirements

### MVP (P1)

1. `quotation-agent.aionui.json` 增加 `recommended_prompts`，至少一条：
   - 「按数据学习：上传已填 VANTSING 报价单，复盘料号与知识库」
2. deploy-seed-agents 同步到 live；Guid 万鼎卡展示推荐 chip。
3. 点击推荐语 → 输入框预填；用户仍需上传 xlsx（或附文件后发送）。

### Optional (P2)

4. CCB-Wanding `capabilities.ts`（或 agent 专属 command 注册）增加 `/learn-by-data`：
   - `status: ready` for `quotation-agent` sessions only（或全局可见、仅报价 agent 会话可执行）
   - 描述：「从已填 VANTSING Excel 复盘报价料号」
5. AionUI slash merge 后新会话 `/` 可见；手动发送 `/learn-by-data` 被 send guard 允许。
6. route-b sync + 新会话验证（`chat-acp-flow.md` § Load timing）。

## Non-Goals

- 不实现新 MCP / 新 skill 步骤（`06-30-quotation-learn-by-data-skill` 已覆盖）。
- 不把 `.trellis/tasks/...` 暴露为 `@` 引用。
- 不强制 FileAttachButton 点击 skill 填 `/learn-by-data`（可与 `07-01-ccb-agent-skills-ui-unified` 协同）。

## Acceptance Criteria

- [ ] Guid 万鼎报价专家卡显示 ≥1 条 learn-by-data 相关 **recommended_prompt**。
- [ ] （P2 若做）新建 quotation-agent 会话 → `/` 列表含 `/learn-by-data`，发送后不触发 send guard 拒绝。
- [ ] 触发后 agent 仍走 `Skill(quotation-learn-by-data)` 或等价 SOP（与 md 工具表一致）。
- [ ] Spec：`agents-unified-model.md` § learn-by-data 补「发现性：recommended_prompts + 可选 slash」。
- [ ] 不回归：`slashCommandsMerge.test.ts` / capabilities 现有用例。

## Validation

1. `07-01-quotation-skills-ui-quick` 完成后新建 Guid 会话。
2. 可见推荐 prompt → 上传 `data/smoke/learn-by-data-vantsing-filled.xlsx` → 发送。
3. （P2）`/learn-by-data` 出现在 slash 菜单且可发送。

## Related tasks

| Task | Relationship |
|------|----------------|
| `06-30-quotation-learn-by-data-skill` | Skill 实现 |
| `07-01-quotation-skills-ui-quick` | 技能菜单可见后再测 slash 体验 |
| `07-01-ccb-agent-skills-ui-unified` | 会话技能列表可显示 agent-bound |
| `06-13-command-capability-manifest` | Slash 架构参考 |
