# Execution Plan — `07-06-ccb-memory-auto-accumulation` (rev 5)

| Field | Value |
|-------|--------|
| **Status** | `in_progress` |
| **Approved** | P4–P5: 2026-07-06 · P6: 2026-07-06 user「继续」 |
| **Scenario** | **D** (cross-repo; P6 is **aionui-src**-primary, thin IPC in desktop) |
| **Plan depth** | **Standard** (P6) |
| **Verification profile** | **UI** (manual sider smoke required) |
| **Repos** | **aionui-src** (primary) + optional `claude-code-best` Trellis/docs only |
| **Active phase** | **P6 — manual UI smoke open** |
| **Target release** | **1.1.7** |

**PRD:** [`prd.md`](./prd.md) · **P6 design:** [`research/memory-sider-ui-design.md`](./research/memory-sider-ui-design.md) · **P5 design:** [`research/thinking-extract-design.md`](./research/thinking-extract-design.md)

---

## Product note (user ask)

侧栏在「知识库 / 价格库」同级加 **记忆**，点进去 **personal / business** 切换，展示 `.claude/memory/` 下文件。

**Verdict: OK** — 与「知识库=组织 SOP、记忆=本机习得」边界清晰；补齐 P5 自动沉淀的可观测/可编辑面。

---

## Phase -1 — Capability matrix (P6)

| Capability | Preferred tool | Status | Fallback |
|------------|----------------|--------|----------|
| Spec / UI patterns | `trellis-before-dev` → frontend | available | Read `SiderOrgKnowledgeEntry` |
| Implement UI | TDD + main session in `aionui-src` | available | Inline |
| Main-process fs IPC | existing `ccb*Bridge` pattern | available | Mirror `ccbPersonalMemoryBridge` |
| Review | `code-reviewer` | available | — |
| UI smoke | Manual | available | `test-records/ui-smoke-memory-sider-*.md` |

---

## Progress snapshot (P4–P5)

| Phase | State | Evidence |
|-------|--------|----------|
| P4 heuristic + seed | **done** | 9→12 unit path |
| P5 thinking async + banner | **done** | 12/12 python, 2/2 vitest, review fixes |
| P5 manual smoke (banner/learn) | **OPEN** | employee session |
| **P6 Memory sider** | **implemented** | aionui-src Sider+MemoryPage+IPC; vitest 4/4 |

---

## Phase 6 — Memory sider UI (supplement)

| Phase | Priority | Workstream | Risk | Tool | Files | Required output | Profile |
|-------|----------|------------|------|------|-------|-----------------|---------|
| **6a** | P0 | IPC: list/read/write under `memory/` | `security` | implement | `ccbMemoryFiles.ts`, `ccbMemoryBridge`, `ccbIpcBridge` | Path jail under `memory/`; UTF-8 | Standard |
| **6b** | P0 | `SiderMemoryEntry` + route `/memory` | `ui` | implement | `SiderNav/`, `Sider/index.tsx`, `Router.tsx` | Align 知识库/价格库样式；CCB authority only | UI |
| **6c** | P0 | `MemoryPage` tabs personal \| business | `ui` | implement | `pages/memory/` | File list + content view/edit/save | UI |
| **6d** | P1 | i18n zh/en | — | implement | locales | `记忆` / `Memory`, tab labels, empty business | Fast |
| **6e** | P1 | Tests + checklist | — | vitest + manual | `tests/unit/ccbMemoryFiles.test.ts`, checklist | Path traversal denied; list personal files | UI |

### UI layout (locked for plan)

```text
[Sider] … 知识库 | 记忆 | 价格库 …

/memory
  [ Personal | Business ]   ← segmented control
  ┌─────────────┬──────────────────────────┐
  │ profile.md  │  (markdown editor)       │
  │ workflow.md │  Save                    │
  └─────────────┴──────────────────────────┘
```

Business empty: no auto-seed; show empty state (1.1.7 personal-only auto-write).

### TDD contract (P6)

| Workstream | Level | RED | GREEN | Regression |
|------------|-------|-----|-------|------------|
| Path jail | unit | `../settings.json` write succeeds | Rejected | Only `memory/**` |
| List personal | unit | empty when no dir | Returns profile/workflow when seeded | — |
| Sider active | manual | — | `/memory` highlights 记忆 | Collapse tooltip works |

### Verification profile and gate (P6)

**Selected:** **UI**

1. code-reviewer PASS (`aionui-src`)
2. vitest path-jail + list
3. Manual: sider → tabs → edit `workflow.md` → reload persists
4. `test-records/ui-smoke-memory-sider-*.md`
5. `trellis-update-spec` → frontend file-map / agents-unified-model pointer
6. commit **only if user asks**

### Parallelization

| Agent | Scope | Merge |
|-------|--------|-------|
| A | IPC + path jail tests | First |
| B | Sider + MemoryPage | After IPC method names frozen |

### Manual steps (P6)

- [ ] 侧栏出现「记忆」，样式与「知识库」一致
- [ ] 进入后默认 personal，可见 `profile.md` / `workflow.md`
- [ ] 切换 business：有文件则列出，无则空态文案
- [ ] 编辑保存后磁盘文件更新；Stop 自动写入后刷新可见
- [ ] 非 CCB 环境不显示入口（或与 authority 一致）

### Recovery

| Trigger | Return to | Re-approval? |
|---------|-----------|--------------|
| Want auto-seed business templates | PRD | Yes |
| Want confirm-before-Stop-write | PRD (conflicts P5 纯自动) | Yes |
| Editor too heavy — read-only MVP | 6c slim | No if AC still “can view files” |

---

## Defer / out of scope (P6)

Cloud sync; org KB merge into memory page; business auto-accumulation (still Phase 2 of original PRD).
