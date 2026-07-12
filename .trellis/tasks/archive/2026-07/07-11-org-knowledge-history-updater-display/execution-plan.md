# Execution Plan — `07-11-org-knowledge-history-updater-display`

| Field | Value |
|-------|--------|
| **Status** | **completed** (2026-07-11, user smoke OK) |
| **Scenario** | **C**（UX/契约 bug：展示 raw id） |
| **Plan depth** | **Standard**（Cross-repo: AionCore + aionui-src） |
| **Verification profile** | **Cross-repo** → UI manual smoke |
| **Repos** | `claude-code-best` (AionCore) + `aionui-src` (renderer) |

## Skills invoked (this session)

| Invocation | Evidence |
|------------|----------|
| `Read:` trellis-task-execution SKILL.md | Scenario C + Contract→TDD→Verification |
| `Read:` skill-selection.md §二 | Scenario C → systematic-debugging before fix |
| Grep / Read | UI `OrgKnowledgePage/index.tsx:301`; API `org_knowledge.rs`; work-tasks `PublicUser` 先例 |

---

## Phase -1 — Capability matrix

| Capability | Available | Fallback |
|------------|-----------|----------|
| AionCore org-knowledge crate | ✅ | — |
| IUserRepository / list_users | ✅ (work-tasks 已用) | find_by_id 单查 |
| aionui orgKnowledge types | ✅ | — |
| Org knowledge UI tests | ⚠️ 无专用 history 单测 | 新增 display helper 单测 |
| VPS deploy | ✅ sync-dev-aioncore | 本地 dev org 先验 |

**Plan depth:** Standard（双 repo，低风险，有 API 契约）

---

## 发散设计 — 四种方案

### 方案 A — API 运行时 join（**推荐 MVP**）

与 Work Tasks 对齐：响应增加 `updated_by: Option<PublicUser>`（保留 `updated_by_id` 兼容）。

```text
GET /history → service 收集 distinct updated_by_id → batch find → 填充 PublicUser
UI → item.updated_by?.username ?? fallback(updated_by_id)
```

| 优点 | 缺点 |
|------|------|
| 无 migration；历史数据自动修复 | 用户删除后只能 fallback |
| 单一真相（users 表） | service 需注入 user_repo |
| 与 work-tasks 模式一致 | 需 rebuild + sync aioncore |

### 方案 B — 写入时反规范化 username

Migration：`org_knowledge_revisions.updated_by_username TEXT`；append revision 时写当前 username。

| 优点 | 缺点 |
|------|------|
| 审计「当时账号名」；读路径零 join | 需 migration + 历史 backfill |
| 用户改名后历史仍显示旧名（可能 desired） | 与 users 表可能漂移 |

**适用：** 若产品明确要求「历史快照名」→ Phase 2 叠加 B；**Phase 1 不选**。

### 方案 C — 仅前端 `/api/users` 映射

OrgKnowledgePage mount 时拉用户列表建 Map。

| 优点 | 缺点 |
|------|------|
| 不改 Rust | 耦合 work-tasks 路由；org 页不应依赖 tasks API |
| 实现快 | 多请求、权限/404 风险；Deleted user 仍难处理 |

**结论：** 反模式，仅作应急；**不采用**。

### 方案 D — 纯展示 truncate / regex

把 `user_019e…` 截短或隐藏前缀。

| 优点 | 缺点 |
|------|------|
| 零后端 | **不解决**「看到账号名」需求 |

**结论：** 拒绝。

### 裁定

| Phase | 选择 |
|-------|------|
| **P1 MVP** | **方案 A** — `updated_by: Option<PublicUser>` on revision (+ doc summary 可选同字段) |
| **P2 可选** | 方案 B 若产品要 audit snapshot username |
| **UI polish** | 显示 `@username`；tooltip 保留 id 供 support |

---

## Contract map

| Contract | Behavior protected | Primary code | Tests / smoke | Risk |
|----------|-------------------|--------------|---------------|------|
| `WANd.ORG_KNOWLEDGE.HISTORY_ACTOR.001` | History list shows human username for updater | `aionui-org-knowledge/service.rs`, `OrgKnowledgePage/index.tsx` | Rust unit/integration + `getDisplayUpdaterName` vitest | ui |
| `WANd.ORG_KNOWLEDGE.API_REVISION.001` | Revision JSON includes optional `updated_by` PublicUser | `aionui-api-types/org_knowledge.rs` | serde round-trip test | cross-repo |

### Contract: WANd.ORG_KNOWLEDGE.HISTORY_ACTOR.001

**Behavior protected:** Manager/employee reading org knowledge history sees login username, not internal user id.  
**Primary code:** `AionCore/crates/aionui-org-knowledge/src/service.rs`, `aionui-src/.../OrgKnowledgePage/index.tsx`  
**Tests:** `cargo test -p aionui-org-knowledge`; `bun test orgKnowledgeDisplay.test.ts` (new)  
**Eval / smoke:** Manual `#/org-knowledge` → 历史版本 → 更新人 = `admin` / `yjc`  
**Risk if broken:** Trust/audit UX; support 无法识别谁改的

### Contract: WANd.ORG_KNOWLEDGE.API_REVISION.001

**Behavior protected:** API backward-compatible: `updated_by_id` retained; `updated_by` additive optional.  
**Primary code:** `aionui-api-types/src/org_knowledge.rs`, `orgKnowledgeTypes.ts`  
**Tests:** Rust serde test; TS type compile  
**Risk if broken:** UI 白屏 / undefined username

---

## Workstreams

| Phase | Priority | Workstream | touches | Risk | Tool / agent | Files | Required output | Profile |
|-------|----------|------------|---------|------|--------------|-------|-----------------|---------|
| P0 | P0 | Root-cause lock | docs-only | — | Read (done) | prd, this plan | Confirmed line 301 | Fast |
| P1a | P0 | API DTO + serde | API_REVISION | cross-repo | TDD | `aionui-api-types/org_knowledge.rs` | `updated_by?: PublicUser` on revision (+ doc) | Cross-repo |
| P1b | P0 | Service user resolve | HISTORY_ACTOR | security | TDD | `aionui-org-knowledge/service.rs`, `state.rs`, `aionui-app/router/state.rs` | Inject `Arc<dyn IUserRepository>`; batch resolve in `list_history` | Cross-repo |
| P1c | P0 | Integration test | HISTORY_ACTOR | — | TDD | `aionui-org-knowledge/tests/` | Create doc → update as user → history has username | Cross-repo |
| P2a | P1 | TS types + display helper | HISTORY_ACTOR | ui | TDD | `orgKnowledgeTypes.ts`, `orgKnowledgeDisplay.ts` | `getOrgKnowledgeUpdaterLabel(revision)` | UI |
| P2b | P1 | UI render | HISTORY_ACTOR | ui | implement | `OrgKnowledgePage/index.tsx` | Use helper; optional Tooltip id | UI |
| P2c | P1 | i18n fallback | HISTORY_ACTOR | ui | implement | `orgKnowledge.json` | `unknownUser` key | UI |
| P3 | P2 | Spec sync | docs | — | trellis-update-spec | `org-knowledge.md` | Response field documented | Fast |
| P4 | — | Deploy smoke | — | ops | manual | sync-dev-aioncore | Local org history shows name | Cross-repo |

**Serial gates:** P1a → P1b → P1c GREEN → P2a → P2b → code-reviewer → manual AC1–3 → spec

---

## TDD contract

| Workstream | Contract | RED evidence | GREEN command | Refactor guard |
|------------|----------|--------------|---------------|----------------|
| P1a DTO | API_REVISION | Test expects `updated_by.username` in JSON | `cargo test -p aionui-api-types org_knowledge` | same |
| P1b Service | HISTORY_ACTOR | Integration: history item has username | `cargo test -p aionui-org-knowledge` | same |
| P2a Helper | HISTORY_ACTOR | vitest: PublicUser → name; null → fallback | `bun test orgKnowledgeDisplay.test.ts` | same |
| P2b UI | HISTORY_ACTOR | smoke-renderer-imports | `node scripts/review/smoke-renderer-imports.mjs --file .../OrgKnowledgePage/index.tsx` | same |

---

## Contract Verification

| Contract | Verification | Required evidence | Status |
|----------|--------------|-------------------|--------|
| HISTORY_ACTOR | cargo test + manual UI | screenshot / 更新人=admin | pending |
| API_REVISION | serde round-trip | test output | pending |

---

## Implementation sketch (Plan A)

### API (additive)

```rust
// OrgKnowledgeRevisionResponse
pub updated_by_id: String,
#[serde(default, skip_serializing_if = "Option::is_none")]
pub updated_by: Option<PublicUser>,
```

### Service

```rust
// list_history: after load revisions
let ids: HashSet<_> = rows.iter().map(|r| r.updated_by_id.as_str()).collect();
let users = self.resolve_public_users(&ids).await?;
// map revision_to_response(row, users.get(&row.updated_by_id))
```

Inject `user_repo` in `build_org_knowledge_state` (mirror `build_work_tasks_state`).

### UI

```tsx
{t('orgKnowledge.updatedBy', {
  user: getOrgKnowledgeUpdaterLabel(item),
})}
```

```ts
export function getOrgKnowledgeUpdaterLabel(item: OrgKnowledgeRevisionSummary): string {
  return item.updated_by?.username ?? item.updated_by_id ?? t('orgKnowledge.unknownUser');
}
```

---

## Manual steps

- [ ] admin 登录 → `#/org-knowledge` → 保存一次 → 历史最新行 **更新人：admin**
- [ ] 若有 yjc 账号改过 → 显示 **yjc** 非 `user_*`
- [ ] Agent `append_business_rule` 确认写入后 → 更新人为确认操作的 org 用户
- [ ] 回退版本 → 更新人为执行回退者；change_kind=revert 仍正确

---

## Defer

- 方案 B 反规范化 username 列
- Doc 列表页 summary 的 updated_by（若 UI 未展示可 Phase 2）
- Preview 模块 Git 历史（不同产品面）

---

## Approval gate

**Do not implement until user says 执行 / implement.**

After approval: `task.py create` (if not registered) → `task.py start` → P1a RED.
