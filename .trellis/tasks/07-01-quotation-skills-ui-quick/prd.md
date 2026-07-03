# 万鼎报价专家技能 UI 快修（Tier A + 部分 B）

## Problem

`quotation-learn-by-data` 已部署（`deploy-ccb-skills.ps1`）且 `quotation-agent.md` frontmatter 已声明 `skills: [quotation-learn-by-data]`，但 Guid「本会话技能」显示 **「当前 Agent 未启用技能」**。用户无法从 UI 确认 skill 已绑定，阻碍 learn-by-data 冒烟测试。

对比：`ppt-creator.aionui.json` 有 `skills.enabled: ["ppt-master"]`；`quotation-agent.aionui.json` 缺失。UI 层 `resolveSessionEffectiveSkillNames` 对 allowlist ∩ catalog 求交集，任一为空则显示无技能。

## Goal

**最快**让万鼎报价专家 Guid 会话的技能菜单反映运行时现实，使 learn-by-data 可测、可观测。

## Scope (this task only)

### Tier A — 种子 / 部署对齐

1. `ccb-installer/config/agents/quotation-agent.aionui.json` 增加：
   ```json
   "skills": { "enabled": ["quotation-learn-by-data"], "disabled": [] }
   ```
2. `deploy-seed-agents` 确保 sidecar 与 seed 同步到 live `%LOCALAPPDATA%\CCB-Wanding\.claude\agents\`.
3. `start-dev-full.ps1` 路径不变（已有 deploy-seed-agents + deploy-ccb-skills）。

### Tier B (partial) — Guid 显示逻辑最小修复

4. **仅针对 CCB authority + Guid**：当 agent allowlist 含已部署于 `.claude/skills/<name>/` 的 skill 时，**必须**在「本会话技能」列出（即使 Skills Hub 目录扫描时序偶发为空，也以 allowlist + `listCcbWandingSkills` 合并为准）。
5. 可选最小改动点（择一，优先 a）：
   - **(a)** `resolveSessionEffectiveSkillNames`：返回 `allowlist` 中在磁盘存在 `SKILL.md` 的项 ∪ catalog 交集（union-not-only-intersection）
   - **(b)** `GuidPage` sessionSkillNames：allowlist 非空时直接展示 allowlist 名称（只读），描述从 `listCcbWandingSkills` 补全
6. **不在本任务**：会话内 `FileAttachButton`「已加载技能」、全 Agent 统一、slash 菜单（见兄弟任务）。

## Non-Goals

- 不改 learn-by-data SKILL.md 业务逻辑或 MCP。
- 不重构 Skills Hub / 全量 assistant profile 权威模型。
- 不注册 `/learn-by-data` slash capability（见 `07-01-quotation-slash-discovery`）。

## Acceptance Criteria

- [ ] Live `quotation-agent.aionui.json` 含 `skills.enabled: ["quotation-learn-by-data"]`（deploy 后 `Get-Content` 可验证）。
- [ ] 新建万鼎报价专家 Guid 会话 → `+` → **本会话技能** 列出 `quotation-learn-by-data`（非「未启用技能」）。
- [ ] `Test-Path "$env:LOCALAPPDATA\CCB-Wanding\.claude\skills\quotation-learn-by-data\SKILL.md"` 仍为 true。
- [ ] 上传 `data/smoke/learn-by-data-vantsing-filled.xlsx` + 发送「按数据学习」→ agent 进入 batch 复盘流程（与 `06-30-quotation-learn-by-data-skill` 验收一致）。
- [ ] 单测：`guidCapabilitiesCatalog.test.ts` 覆盖 allowlist 有、catalog 缺项时仍返回 agent skill 名。

## Validation

```powershell
.\ccb-installer\scripts\start-dev-full.ps1 -SkipBootstrap -SkipVendorSync -BuildAioncore:$false
# 或 deploy only:
.\ccb-installer\scripts\deploy-seed-agents.ps1 -ForceMd
.\ccb-installer\scripts\deploy-ccb-skills.ps1
Get-Content "$env:LOCALAPPDATA\CCB-Wanding\.claude\agents\quotation-agent.aionui.json" -Encoding UTF8
```

Guid：新建会话 → 检查本会话技能 → learn-by-data smoke。

## Spec touch

- `.trellis/spec/integration/agents-unified-model.md` § learn-by-data — 补 **UI 观测点**（Guid 本会话技能应显示 `quotation-learn-by-data`）。

## Related tasks

| Task | Relationship |
|------|----------------|
| `06-30-quotation-learn-by-data-skill` | Skill 实现已完成；本任务 unblock UI 冒烟 |
| `07-01-ccb-agent-skills-ui-unified` | 后续全 Agent + 会话页统一 |
| `07-01-quotation-slash-discovery` | slash / 推荐 prompt 发现性 |
