# Memory sider UI — supplement to auto-accumulation (P6)

**Task:** `07-06-ccb-memory-auto-accumulation`  
**Date:** 2026-07-06  
**User ask:** Sidebar entry **记忆**, aligned with 知识库 / 价格库; page with **personal / business** switch; show memory files.

---

## Product fit (OK)

| Nav | Role |
|-----|------|
| **知识库** | Org-shared SOP (`org-knowledge` server) |
| **记忆** | Local learned prefs under `%LOCALAPPDATA%\CCB-Wanding\.claude\memory\` |
| **价格库** | Price library admin |

**记忆** is the right place to *see* what Stop-hook / `/记住` wrote — complements the invisible auto-learn path (banner only).

Placement: **after 知识库, before 价格库** (knowledge → memory → price).

---

## Files shown

```
.claude/memory/
├── MEMORY.md                 ← index (optional top of page)
├── personal/
│   ├── profile.md
│   └── workflow.md           ← Stop hook primary write target
└── business/                 ← may be empty in 1.1.7 (no auto-seed)
    ├── customers.md          ← if present (agent/manual)
    ├── products.md
    └── pricing.md
```

| Tab | Files |
|-----|--------|
| **personal** | `personal/profile.md`, `personal/workflow.md` (+ any other `personal/*.md`) |
| **business** | `business/*.md` if exist; else empty state |

Empty business copy (zh): `暂无业务记忆。1.1.7 仅自动沉淀 personal；业务纠偏仍走知识库 / append_business_rule。`

Do **not** auto-create `business/*` in this UI phase (keeps P4/P5 personal-only seed contract).

---

## UX (align with existing sider)

1. **Sider:** `SiderMemoryEntry` — same height/padding/icon+label pattern as `SiderOrgKnowledgeEntry` / `SiderPriceLibraryEntry`.
2. **Icon:** e.g. `Memory` / `BookOne` / `Notes` from `@icon-park/react` (pick one consistent outline style).
3. **Route:** `/memory` (optional `?tab=personal|business`).
4. **Page:**
   - Segmented / Tabs: **Personal** | **Business**
   - Left or top file list (filename + one-line preview)
   - Right / below: markdown content (read + edit + save)
5. **Learning banner:** optional small status chip if `.learning-status.json` is `learning` (reuse existing IPC).

---

## Architecture

```text
Sider → navigate('/memory')
MemoryPage
  Tabs personal | business
  IPC listMemoryFiles(scope) → read dir under config/memory/{scope}
  IPC readMemoryFile(relPath) / writeMemoryFile(relPath, content)
  Main process only (fs) — same pattern as employee-profile / learning status
```

**Security:** paths must stay under `memory/` (reject `..`); UTF-8 no BOM; write does not overwrite other scopes.

**Visibility:** show entry when CCB authority active (same as other WanD tools), not gated on org-server (unlike 知识库).

---

## Non-goals (P6)

- Cloud sync / multi-user memory
- Auto-seed `business/*`
- Confirm dialog for Stop-hook writes
- Full markdown WYSIWYG
- Replacing Settings employee profile (identity stays Settings)

---

## Relation to P4/P5

| Layer | Owner |
|-------|--------|
| Auto-write | Stop worker → `workflow.md` |
| Manual write | `/记住` or this UI editor |
| Browse / edit | **This P6 page** |
| Learning toast | Existing banner (unchanged) |
