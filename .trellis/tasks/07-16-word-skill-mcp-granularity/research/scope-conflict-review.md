# Research — Word 颗粒度任务 vs 已锁定架构（2026-07-16）

## 用户真实痛点（有效）

- `word-creator` 委派生成报告时出现 **100+ 次** `mcp__office-word__*` 调用
- 体验：慢、易超时、编排像流水账
- 期望：大块构建 + 少量 patch

## 已锁定决策（不可 silent 覆盖）

| 来源 | 锁定内容 |
|------|----------|
| `agents-unified-model.md` § Word Creator MCP-only (2026-06-18c) | `word-creator` **只用** `office-word` MCP |
| `word-creator.md` L16 | **禁止** officecli、**禁止依赖任何 skill** |
| `07-13-word-creator-document-toolchain` (approved) | 文档助手 = **2 核心 MCP**（office-word + pdf-toolkit）；轻量 template/validator 可后接，但不是 fork 外部 skill |

## 仓库内已有能力（原计划未引用）

| 栈 | 路径 | 与 word-creator 关系 |
|----|------|----------------------|
| `officecli-docx` | `AionCore/data-org/builtin-skills/officecli-docx/SKILL.md` | **禁止** word-creator 使用；可用于其他 agent |
| `officecli-word-form` | 同上 | `word-form-creator` 专用 |
| `office-word` MCP | `ccb-installer/staging/vendor/mcp-servers/office-word-mcp/` | word-creator **唯一**运行时栈 |
| SOP 效率规则 | `word-creator.md` L43-50 | 目标 **≤15 次 MCP**；合并段落、一次 `add_table` |
| 块级 patch 工具 | MCP 已有 `search_and_replace`, `replace_paragraph_block_below_header`, `replace_block_between_manual_anchors`, `insert_header_near_text` | 计划所称「MCP 缺 macro/micro 分界」需 **对照 inventory 重算** |

## 原计划三处 P0 冲突

1. **给 word-creator 加 Word skill** → 直接违反 MCP-only + 禁止 skill
2. **Fork appautomaton/document-SKILLs** → 未 pin commit/license；且与 officecli-docx 功能重叠
3. **Phase 1 skill / Phase 2 MCP** 顺序 → 在 word-creator 语境下应反转为 **先 MCP 宏化 + SOP 强化**，skill 层仅在其他 agent 或 spec 修正案后考虑

## 能力缺口（经独立核对，仍成立）

即使用现有 MCP + SOP，以下仍缺：

1. **无 bulk compose 工具** — 无「一次写入整章 outline+paragraphs」的 MCP tool；模型仍倾向逐段 `add_paragraph`
2. **SOP 未被模型遵守** — 113 次调用说明 ≤15 次硬规则未生效（orchestrator 委派路径？prompt 不够硬？）
3. **无 call-budget 运行时门禁** — 不像 officecli Delivery Gate，MCP 路径无「超 N 次 warn/block」
4. **07-13 轻量 `document-template`** — 仍在 roadmap，未实现；可作为 **非 word-creator skill** 或 **MCP 宏工具** 两种形态

## 推荐路线（不 amend 锁的情况下）

```text
Phase 0  决策门：确认不改 word-creator MCP-only
Phase 1  MCP 宏颗粒度 + word-creator SOP 强化（主战场）
         ├── 新增/包装 bulk MCP tools（如 render_sections_from_json）
         ├── 强化 word-creator.md 路由表 + orchestrator 委派 brief
         └── smoke：同一份报告 MCP 调用 ≤15（或 ≤20 含 convert_to_pdf）
Phase 2  边界 spec + 54-tool inventory 标注 macro/micro
Phase 3  （可选，需单独 amend）document-template 模块 — 引用 07-13，不 fork 外部 repo
```

## 若用户坚持「Skill 主构建」

必须先选一条并 **re-approve**：

- **A**  Amend `agents-unified-model.md` — word-creator 允许 `document-template` skill（07-13 已预留）
- **B**  Skill 仅给 **非 word-creator** agent（如 research → 外部编排，word-creator 仍 MCP-only 收稿）
- **C**  回退 word-creator 到 officecli-docx（与 2026-06-18c 迁移相反 — 不推荐）

## 外部参考定位

- `anthropic/skills/docx` → **架构原则**（read/edit/validate 分离），映射到 MCP 宏工具设计，非直接 fork
- `appautomaton/document-SKILLs` → **wishlist** 直至 pin URL + commit + license + delta vs officecli-docx
