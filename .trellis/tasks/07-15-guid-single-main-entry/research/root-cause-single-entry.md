# Research — Guid「展示全部助手」根因与单入口方案 (2026-07-15)

## User idea

不展示所有助手；入口只有一个主 agent。

## Verdict on the idea

**赞成，且与现架构同构 — 但藏卡只是 P1。**  
今日默认主路径已经是「Claude Code pill + 隐式 `wande-orchestrator`」；卡面上的报价/财务/… 是 **shortcut 层**。

**用户补充（2026-07-15）：** 单入口的前提是主入口 **dispatch 足够强、足够完善**。没有这条，轻量化不成立。  
真门禁 = `WANd.ORCH.DISPATCH.001`（意图→委派→完整回传 ≈ 直连卡业务结果）；藏卡 = `WANd.GUID.SINGLE_ENTRY.001`（骨架）。

代价：未过 dispatch 前失去直连逃生舱会伤业务 → 建议 flag 默认仍露卡，或 2c PASS 后再藏。

## Root cause（为何会觉得「要展示全部」）

| Layer | Reality |
|-------|---------|
| 产品 AC（父任务） | `WANd.WEB.ASSISTANTS.001` 写成 **Guid 卡列表 ≡ exe CCB seed**，把 parity 绑在「多卡可见」上 |
| Catalog 规则 | `filterGuidCatalogAgents`：bundled + `guid_primary` → 故意 show specialists；**仅 hide** `wande-orchestrator` |
| 主入口（已存在） | 无卡 send → `useGuidSend` 绑定 `CCB_DEFAULT_SESSION_AGENT_ID = wande-orchestrator` |
| Web 缺口（父任务） | 传输面 HTTP vs IPC；**不是**「Web 必须多卡」的硬理由 |

结论：问题不是「缺主 agent」，而是 **parity 合同把 shortcut 卡当成必交付面**；轻量优化应 **改合同 + 收窄 Guid filter 作用域**，不是再造第二条 bootstrap。

## Smallest code path

1. **Guid-only** 空卡：`filterGuidCatalogAgents` → `[]`（或等价 expand hide-set / `guid_primary=false` migration），`AssistantSelectionArea` 已有 empty→null
2. **禁止**对 `fetchAssistantsCatalog` 全局清空（Team / Settings / WeCom / sidebar 共用 SWR）
3. 修订契约：`WANd.WEB.ASSISTANTS.001` / 父 PRD AC → 默认身份 + 委派，而非卡 ID 全集

## Scope decision (blocks implement)

| Opt | Scope | Re-approve? |
|-----|-------|-------------|
| **A** | exe + Web 同 filter | 父任务 AC 同步改 |
| B | Web-only | 父任务保留 exe 多卡；文档 intentional fork |
| C | 显式 orchestrator 卡 | 通常多余 |

**Recommendation: A**（真轻量；避免 Web/exe 产品精神分裂）

## Risks

- Layer A：若误伤共享 catalog → Team 选项丢失
- Specialist resume：现有会话 `ccb_agent_id` 不得被 New Chat 默认逻辑覆盖
- 委派质量：报价/财务走 orchestrator 有历史挂死/空壳债（见 `agents-unified-model.md`）—— **MVP 不修委派**，只做入口；若手测失败单开 debug task
- 与父任务 P6 smoke：若选 A，父任务「对照 exe 卡列表」行作废，改对照「默认发送身份」

## Sources

- Explore: [Guid main-agent entry](7c1d518c-3283-440b-b0ac-9bfd2255bfba)
- Spec: `agents-unified-model.md` § Role flags / Guid catalog rule
- Parent: `07-15-webui-business-parity-exe` research + `WANd.WEB.ASSISTANTS.001`
