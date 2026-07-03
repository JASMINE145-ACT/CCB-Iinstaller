# CCB Agent 技能 UI 统一真相（Tier A + B + C）

## Problem

CCB 存在 **三层技能**，UI 未统一表达：

```
 Layer 1  平台 builtin (_builtin/)     → FileAttachButton「已加载技能」
 Layer 2  Skills Hub / CCB 目录扫描    → Guid catalog (loadCcbGuidSkillsCatalog)
 Layer 3  Agent 绑定 (.md + sidecar)   → runtime Skill() + hooks
```

现状：

| 表面 | 期望 | 实际 |
|------|------|------|
| Guid「本会话技能」 | Agent 绑定技能 | allowlist ∩ catalog → 常为空 |
| 会话「已加载技能」 | Agent + 平台 | 仅 `conversation.extra.skills` 平台 builtin 4 个 |
| MCP 菜单 | allowlist ∩ 全局 | **正常**（可对标） |

`ppt-creator` sidecar 有 `skills.enabled`；其他 Guid 卡（quotation、excel-creator 等）不一致。`AcpSendBox` 未向 `FileAttachButton` 传递 agent-bound skills。

## Goal

所有 CCB Agent 的 **Guid + 会话** UI 与 `agent.md` / `.aionui.json` / `.claude/skills/` **一致、可观测**，体验对标「本会话 MCP」。

## Requirements

### A — 种子与 sidecar parity（ccb-installer）

1. 审计 `ccb-installer/config/agents/*.aionui.json`：凡 `.md` frontmatter 含 `skills:` 的 Guid 卡，sidecar 须有对应 `skills.enabled`（与 `ppt-creator` 同模式）。
2. `deploy-seed-agents` 文档化：sidecar 与 md 双源；frontmatter 兜底规则不变。
3. 可选：`agentSessionProfile` / seed 校验脚本 — frontmatter skills ⊆ 已部署 `.claude/skills/` 目录。

### B — Guid 显示模型（aionui-src）

4. **双分区菜单**（GuidActionRow）：
   - **Agent 专属技能**（只读，来自 `defaults.skills.enabled` 合并 sidecar+frontmatter）
   - **平台 / 可选技能**（现有 builtin + Hub，可开关）
5. 替换纯交集逻辑：`resolveSessionEffectiveSkillNames` 改为：
   - `agentBoundSkills` = allowlist 项（磁盘有 `SKILL.md` 或 catalog ready）
   - 不与「allowlist 为空 → 显示未启用」混淆；空 allowlist 才显示空态
6. `fetchGuidAssistantDetail` / `ccbAgentsService.getAgent` 与 UI 使用同一 merged skills 源（`normalizeCcbAgentRecord` 已有 frontmatter 兜底）。

### C — 会话贯通（aionui-src）

7. 建会话 / warmup 时：`conversation.extra.skills` = **平台会话技能** ∪ **agent.defaults.skills.enabled**（去重；agent 项标 `source: agent-bound` 若需区分）。
8. `AcpSendBox` → `FileAttachButton`：传递 `loadedSkills`（含 agent-bound）；或 `ConversationContext` 合并 agent profile skills。
9. FileAttachButton UI：分区展示「Agent 技能」vs「平台技能」（文案 i18n）。
10. 切换会话 / 新会话规则与 MCP 一致（见 `chat-acp-flow.md` § slash load timing）。

## Non-Goals

- 不合并 Skills Hub 与 CCB deploy 为单一存储（仍 `.claude/skills/`）。
- 不改变 CCB runtime 谁执行 `Skill()` — 仅 UI + `conversation.extra` 真相。
- Slash capability 注册（见 `07-01-quotation-slash-discovery`）。

## Acceptance Criteria

- [ ] 5 张 Guid 预设卡：各自声明的 agent-bound skills 在 **本会话技能** 可见（quotation → `quotation-learn-by-data`；ppt → `ppt-master`；等）。
- [ ] 进入会话后 **已加载技能** 含 agent-bound 项（不仅 aionui-skills/cron/officecli/skill-creator）。
- [ ] `ppt-creator` / `quotation-agent` sidecar 种子结构一致；deploy 后 live 可验证。
- [ ] 单测：`guidCapabilitiesCatalog.test.ts` + `assistantDefaults.test.ts` + FileAttachButton/Guid 相关用例。
- [ ] 回归：MCP 菜单、Guid send、`skill_ids` 权威路径不破坏 `06-14-ccb-assistant-profile-runtime-authority`。
- [ ] Spec 更新：`agents-unified-model.md` + `chat-acp-flow.md` § 技能三层与 UI 契约。

## Architecture sketch

```
agent.md skills + sidecar.skills.enabled
        │
        ▼
normalizeCcbAgentRecord / getAgentSessionProfile
        │
        ├─► Guid「Agent 专属技能」只读区
        │
        └─► conversation.extra.skills (merged)
                 │
                 ▼
            FileAttachButton「已加载技能」
            (Agent 分区 + 平台分区)
```

## Validation

- Guid：每张预设卡新建会话 → 技能菜单截图 / 自动化 e2e（可选）。
- 会话：万鼎 + PPT 各一条 → `+` 菜单技能列表含 agent 项。
- `bun test` / vitest 相关包。

## Related tasks

| Task | Relationship |
|------|----------------|
| `07-01-quotation-skills-ui-quick` | 先行快修；本任务吸收并泛化 |
| `06-14-ccb-assistant-profile-runtime-authority` | 权威边界约束 |
| `07-01-quotation-slash-discovery` | 平行的发现性任务 |
