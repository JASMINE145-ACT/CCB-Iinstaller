# System Review 接纳裁定（Codex 2026-07-13）

**结论：** 方向正确；P0/P1 合同缺口全部接纳并补进计划。不改「方案 A」本身。

| # | 风险 | 裁定 | 修补 |
|---|------|------|------|
| 1 | quotation 尚无 supplier MCP | **接纳** | Phase 1 必做：frontmatter + 决策表 |
| 2 | Section D 与「本次不改」冲突 | **接纳** | **Skill 显式跳过 D**（禁 `append_quotation_mapping_pending`）；非「维持现状仍会跑」 |
| 3 | supplier 卡隐藏未规定 | **接纳** | 写清：`guid_primary=false`；orchestrator 产品找厂委派报价卡；独立 agent 文件可保留只读 |
| 4 | Section A 模板未强制 | **接纳** | Skill 预览前校验：缺「原因」或「来源」→ 禁止 `confirmed=false` 外的 append |
| 5 | Section C 缺 admin/失败合同 | **接纳** | 明确：仅 draft；非 `price_admin` 只出表不写；403/409 不得强写 |
| 6 | 双调用合成契约薄 | **接纳** | 新增 `dual-call-contract.md` |
| 7 | 知识库 Big Bang | **接纳** | 强制 inventory→per-slug diff→小批 PUT→rollback；见 `kb-inventory.md` |
| 8 | smoke 命令偏占位 | **接纳** | 新增 `smoke.md` |
| 9 | 文档乱码 | **部分接纳** | 本批用 UTF-8 重写关键段；shell 显示问题不挡 |
| 10 | `relatedFiles: []` | **接纳** | 填入 task.json |

**不接纳 / 缓做：**

| 项 | 原因 |
|----|------|
| 改回「双 Agent 委派」 | 用户已锁方案 A |
| Section D 继续完整跑 | 与「D 本次不改」矛盾；改为 **硬跳过** |
| C 「直写 active / 跳过 draft」 | 现网价库是 draft→publish；「直接进价格库」= **确认后写 draft**，非绕过 admin |
| 改 dispatch 强制模板（Phase 1） | 先 Skill 强制；Python 校验可 Phase 2+ |

**Codex 选项：** 对应 **B（生成 Phase 1 修补计划）** 已完成落盘；**C 实现** 仍等用户说「执行 task」。
