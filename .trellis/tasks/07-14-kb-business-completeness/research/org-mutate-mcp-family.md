# Research — Org mutate MCP family（价库 / 知识库 / 供应商）

**Date:** 2026-07-14  
**Explore:** [Compare CRUD MCP](e31c078b-dd55-4807-a8d8-44f4f79c63ae)

## User absorb (2026-07-14) — K + Foundation

MVP 升级为：**统一 Org Mutate 契约第一步**，不是孤立 delete+token。

| Layer | Deliver |
|-------|---------|
| Foundation | `WANd.ORG.MUTATE.UX.001` — preview→confirm→apply→audit→shadow；统一 envelope |
| K | `delete_business_rule`（block_id/hash+version+snippet；history 可 revert）+ append 三硬规则 |
| Deferred | Phase S supplier delete；P1 get/list/revert/update/RBAC |

**沉淀：** 输出 Org Mutate Proposal（`lane=business_rule`），**无写库权**；Inbox approve → 同一 mutate MCP。

**Delete：** Markdown 去块 + revision 保留 = 与价库 soft-delete **安全意图**对齐。

详见 `prd.md` / `execution-plan.md`（本轮已吸收）。

1. Org JWT（profile-strict）+ CSRF on mutate  
2. **`confirmed=false` 预览 → 用户确认 → `confirmed=true` 落库**（零副作用预览）  
3. L1 必须把预览同轮展示给用户后再问确认  
4. Guid 卡可见 ≠ 写权限（价库/供应商还叠加 capability；知识库偏弱）

## Capability matrix

| | 价格库 | 业务知识库 | 供应商目录 |
|--|--------|------------|------------|
| preview | ✅ | ✅ | ✅ |
| create / upsert | ✅ draft upsert | ✅ append only | ✅ live upsert |
| update | ✅ | ❌（只能再 append） | ✅ |
| delete | ✅ soft + restore | ❌ UI only | ❌ |
| revert / history | ✅ MCP | ⚠ REST/UI only | ❌ |
| draft → publish | ✅ | N/A（直写 live） | N/A（直写 live） |
| get / list | ✅ MCP | ⚠ Read shadow / 无 MCP get | ✅ |
| batch import | ✅ xlsx | ❌ | ❌ |
| write RBAC | `price_library.write` | **任意 JWT** | `supplier_directory.write` |
| optimistic lock | draft revision | doc `expected_version` | ❌ |
| size / chunk guard | import ≤10MB | **不明（~700 分块待钉）** | top_n clamp |

## 互借方向（对齐建议）

### 知识库 ← 价库（优先）

| 借鉴 | 动作 |
|------|------|
| `delete_*` + soft/restore 或按块删除 | **本任务 A**：`delete_business_rule` |
| preview 结构化 `{action, applied, changes[]}` | delete/append 统一 payload |
| PostToolUse confirm nudge | 复用/仿 `post-*-confirm-nudge` |
| MCP `revert` / `list_versions`（可选） | wrap 已有 REST |
| write capability | 可选 `org_knowledge.write`（后置，避免打断现网） |
| MCP get doc | 消除 shadow vs center 双面 |

### 知识库 ← 供应商

| 借鉴 | 动作 |
|------|------|
| `buildFieldDiff` 式 before/after | delete 预览列出将删块 |
| 歧义失败（多匹配须收窄） | delete fail-closed |

### 供应商 ← 价库

| 借鉴 | 动作 |
|------|------|
| `delete` / soft | `suppliers_delete` + restore 或标志位 |
| revision / expected_version | 防并发覆盖 |
| MCP 侧 capability precheck | 对齐价库 `assert*WriteAllowed` |

### 价库 ← 知识库

| 借鉴 | 动作 |
|------|------|
| 预览同轮展示纪律（L1 硬约束） | 已较强；保持 |
| 「词表」路由防串库 | 已有；保持 |

### 横切：`WANd.ORG.MUTATE.UX.001`（建议新合同）

统一：`requires_confirmation` / `applied` / `error_code`（401/403/409）形状；禁止静默截断；单次 payload 预算（知识库对齐价库「不拆块」）。

## Spec / code pointers

- `.trellis/spec/integration/price-library.md`
- `.trellis/spec/integration/org-knowledge.md`
- `.trellis/spec/integration/supplier-directory.md`
- `mcp_servers/price-library-server/dist/index.js`
- `mcp_servers/quotation-server/dist/index.js`（`append_business_rule`）
- `mcp_servers/supplier-directory-server/index.mjs`
