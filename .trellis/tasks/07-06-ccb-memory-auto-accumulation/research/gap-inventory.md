# Gap inventory — CCB memory auto-accumulation (explore)

**Task:** `07-06-ccb-memory-auto-accumulation`  
**Date:** 2026-07-06

## Executive summary

| Layer | Status | Notes |
|-------|--------|-------|
| Product design | **Done** | `docs/memory系统改造.md` |
| Agent read/write rules (L1) | **Partial** | `quotation-agent` / `accurate-agent` / `wande-orchestrator` reference `memory/*` |
| L0 CLAUDE.md memory block | **Unknown** | `ensure-wanding-settings.ps1` — no `CCB-MEMORY-RULES` grep hit |
| Installer seed (`resources/memory/`) | **Missing** | No template dir in repo |
| `/记住` command | **Missing** | Not in `ccb-installer/resources/commands/` |
| Stop/PreToolUse hook enforcement | **Partial** | Knowledge gate exists; **no memory-write gate** |
| Org knowledge promotion | **Separate path** | `append_business_rule` — must not conflate with memory |

**Verdict (explore):** **High feasibility, low infra cost.** Gap is **packaging + L0 rules + optional hook**, not new platform.

---

## 1. Intended directory layout (design)

```
%LOCALAPPDATA%\CCB-Wanding\.claude\memory\
├── MEMORY.md
├── personal/
│   ├── profile.md
│   └── workflow.md
└── business/
    ├── customers.md
    ├── products.md
    └── pricing.md
```

Source: `docs/memory系统改造.md`

---

## 2. Agent L1 — already wired (prompt-level)

| Agent | Read triggers | Write triggers |
|-------|---------------|----------------|
| `wande-orchestrator` | profile, workflow | 路由纠偏、工作偏好 → `personal/workflow.md` |
| `quotation-agent` | customers, products, pricing | 会话纠偏 → memory; org 规则 → `append_business_rule` |
| `accurate-agent` | customers, pricing | 客户/价格口径 → business/*.md |

**Risk:** If directories/files don't exist, agent Write may fail or skip silently depending on runtime.

---

## 3. Installer / runtime gaps

| Item | Expected (design) | Actual (repo scan 2026-07-06) |
|------|-------------------|----------------------------------|
| `ensure-wanding-settings.ps1` creates memory tree | Yes | **No match** for `memory` |
| `resources/memory/*` templates | Yes | **Not present** |
| `resources/commands/记住.md` | Yes | **Not present** |
| Upgrade: don't overwrite user memory | Yes | N/A until seed exists |
| CLAUDE.md `CCB-MEMORY-RULES` block | Yes | **Not verified in script output** |

---

## 4. Boundary: memory vs org knowledge

| Need | Path | Auto? |
|------|------|-------|
| 仅本会话/个人/小范围例外 | `memory/business/*.md` | Agent 追加 |
| 全员组织规则 | `append_business_rule` → org KB | 预览 + 用户确认 |
| 静态 SOP | `wanding_business_knowledge.md` shadow | Read-only at runtime |

`quotation-agent.md` already states this split — **preserve in MVP**.

---

## 5. Rudder-inspired features — map to CCB

| Rudder | CCB equivalent | MVP? |
|--------|----------------|------|
| Feedback on run | 用户纠偏/偏好对话 | Yes (trigger in L1) |
| Review before skill promote | personal 自动; business 轻确认 | P1 personal only |
| Issue-attached context | Trellis task / session | Out of scope |
| Heartbeat pull work | N/A | No |
| Skills table | `memory/*.md` + future skill extract | Phase 2 |

---

## 6. Recommended MVP (for PRD approval)

**Phase 1 implement (smallest valuable):**

1. Seed `memory/` on install/upgrade (non-destructive)
2. Inject `CCB-MEMORY-RULES` into generated CLAUDE.md
3. Add `/记住` command
4. **Personal auto-write** default on; business write remains agent-triggered with Read-before-append
5. Manual smoke: 新装 → 说「我习惯先查库存」→ 检查 `personal/workflow.md`

**Defer:** Stop hook for「本轮有纠偏但未写入」; business → org promotion workflow UI.

---

## 7. Open questions

1. Memory 路径：`.claude/memory/` vs CCB 内置 `/memory` UI — 是否需 AionUI 入口联动？
2. 多 Windows 用户同机 — `personal/` 是否 per-Windows-user（默认 `%LOCALAPPDATA%` 已是）
3. 1.1.6 发版是否纳入 MVP 或 1.1.7

---

## References

- `docs/memory系统改造.md`
- `ccb-installer/packages/vertical/com.wanding.trade/agents/quotation-agent.md` L77–85
- `ccb-installer/config/skills/ccb-subagent-gate/` — hook pattern reference
