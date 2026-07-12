# 供应商目录（Org 共享）+ Agent 可查可改 — 全面 v1

## Goal

把现有 HTML 供应商站的**全部业务能力**落到 Org + AionUI + Agent：供应商浏览、**产品匹配**、**运输车辆**；数据全员共享；白名单可编辑（**confirmed preview 后再写**）；Agent 三模式都能查/（白名单）改。价格库仍只承载合作过的带编码 SKU。

## What I already know

* **A + B + 白名单写** 已锁定；前端 AionUI 原生（不像素复刻 HTML）
* v1 **全面**：含运输车辆 + 独立产品匹配；**Agent 可用 / 可共享 / 可编辑**
* System Review 合同包已吸收；Agent 路径 / 存储形态已锁定（2026-07-12）
* HTML 源：`research/index-supplier-directory.html`
* 合同：`research/seed-contract.md`、`research/match-fixtures.md`、`research/ui-form.md`、`research/agent-write-path.md`、`research/storage.md`

## 已确认决策（2026-07-12）

| 问题 | 决定 |
|------|------|
| **存储** | Org **结构化表**（SQLite / AionCore），非知识库 md、非 Grep 主路径 |
| Agent 可查 | **必须** — 供应商 / 产品匹配 / 车辆 |
| Org 全员同步 | **必须** |
| 编辑新增 | **必须** — `SUPPLIER_DIR_ADMIN_USERNAMES` |
| Agent/MCP 写 | **两阶段** — `confirmed=false` preview；`confirmed=true` + CSRF |
| 灌进价格库 | **禁止** |
| 前端 | AionUI `#/suppliers` **三模式** |
| Seed | 幂等 upsert；见 seed-contract |
| 匹配验收 | 固定 fixture；见 match-fixtures |
| **Agent 形态** | **独立** `supplier-directory-agent` + 自有 MCP |
| **不挂报价 agent** | quotation **不**承载目录写/匹配/车辆工具 |
| **不用 md/Grep 当权威** | 可选只读导出 md；禁止 Grep 仓库 md 作全员查询主路径 |
| **报价协作** | 委派供应商专家；O 列仍用价库 `supplier` 备注 |

## 存储（已锁定）

见 `research/storage.md`。

| 实体 | 形态 | 说明 |
|------|------|------|
| `suppliers` | 表，一行一家 | 厂名/品类/产品文字/地址/联系人… |
| `logistics_vehicles` | 表，一行一车型 | 载重/尺寸/用途；seed 10 |
| 产品匹配 | 对产品文字 scorer + API | 与 UI/MCP 同源；非另造 md 库 |

权威：**Org API**。HTML = 一次性 seed。

## Agent 修改信息路径（已锁定）

```text
用户改地址/新增/改车型
  → orchestrator → Agent(supplier-directory-agent)
  → MCP confirmed=false → diff → 用户确认
  → confirmed=true + CSRF → Org 表
  → 全员 + #/suppliers 同源
```

| 禁止 | 原因 |
|------|------|
| 写工具挂 `quotation-agent` | 职责/权限混乱 |
| 目录倒成业务知识库 md + Read/Grep | 排序不稳；shadow≠同步；局部更新差 |
| Agent Edit 本地 md | 只改本机 |

| 允许（非权威） | 说明 |
|----------------|------|
| 中心导出 md 给人看 | 只读 |
| 知识库写采购**偏好**句子 | 政策，不是名录行 |

## 已确认 RBAC

| 操作 | 谁 |
|------|-----|
| 读 | 任意 Org 登录成员 |
| 写 | `SUPPLIER_DIR_ADMIN_USERNAMES`（trim；case-insensitive） |
| 空 env | **deny writes** |
| 非白名单写 | **403** |

## Requirements

* Seed：`research/seed-contract.md`
* Match：`research/match-fixtures.md`
* MCP 写：仅 `supplier-directory-agent`；强制 `confirmed`
* Phase 注册：agent md + aionui.json + 独立 MCP + mcp-health + orchestrator + deploy-seed

### Delivery order（串行）

1. Org schema + read API + idempotent seed  
2. Scorer + `/match` + fixtures GREEN  
3. MCP read + agent read smoke  
4. MCP write + CSRF + confirmed + whitelist  
5. UI 三模式  

## Acceptance Criteria

- [x] Spec：目录 ≠ 价格库 ≠ Accurate（升格 `supplier-directory.md`）
- [x] 存储为 Org 表；非 md/Grep 主路径
- [x] Seed×2 不翻倍；编辑后 seed 不覆盖
- [x] Fixture A/B/C GREEN（unit + match path）
- [x] 侧栏「供应商」；三模式 Org 驱动
- [x] Agent：独立卡 + MCP；NL q 契约；Guid 文案 UTF-8 已修复（现场 A/B/C 口头 smoke 可复测）
- [x] confirmed 写路径落地；白名单 env；非白名单 403 合同
- [x] 独立 agent+MCP；quotation 无目录写工具
- [x] mcp-health + delegation 注册
- [x] code-reviewer → tests → spec → finish-work（2026-07-12）
- [x] Phase 8 fidelity：距离列 / 产品摘要 / 18 字段 / migration 023

## Out of Scope

* 像素复刻 HTML  
* Lalamove 实时询价  
* Accurate / 价库 supplier 列双向同步  
* 报价 O 列（另 task）  
* **md + Grep 作为名录权威或 Agent 主检索**  
* quotation-agent 挂载目录写 MCP  

## Technical Notes

* 任务：`07-12-supplier-directory-vs-price-library`
* Plan：`execution-plan.md` — **approved** 2026-07-12；说「执行」开始 Phase 1
* 模板：price-library confirmed；agent-team 委派
