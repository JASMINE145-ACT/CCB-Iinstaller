# Frontend Development & CCB-Wanding Integration Guide

> AionUI exe frontend + integration with CCB-Wanding. **Start here for any AionUI frontend work.**

---

## Rule 0 — Decide the layer first

> **Before editing, decide the layer first.** This is the single most important rule.

| What you want to change | Where it belongs |
|--------------------------|------------------|
| Pure UI behavior (color, layout, text, hotkey, splash) | **AionUI frontend** (you are here) |
| IPC channel / window / local settings | **Electron process / preload** |
| ACP event correctness (greeting, permission, tool-call shape) | **CCB-Wanding backend** (`D:\claude-code-B\src/`) |
| MCP registration / env / route-b patch | **Integration layer** (`ccb-installer/`) |
| aioncore.exe behavior | **Cannot modify** — adapt around it |

If your symptom is a backend bug, **stop patching the frontend**. See `../integration/aionui-ccb-boundary.md`.

---

## Quick start — three questions

1. **I only want to change UI behavior (color, layout, hotkey, splash, text)?**
   → [`file-map.md`](./file-map.md) + [`electron-architecture.md`](./electron-architecture.md) + [`dev-test-ship.md`](./dev-test-ship.md)

2. **I'm fixing a chat / permission / duplicate-message bug?**
   → Run this decision tree:
   ```
   Is the root cause in the BACKEND (greeting emitted twice, permission payload missing fields)?
   ├── YES  → STOP. Read ../outline.md (Primary strategy, L95-110), fix in D:\claude-code-B\src/, rebuild.
   ├── NO   → Pure UI? → file-map.md to find the right desktop file
   └── UNSURE
       ├── Archived: tasks/archive/2026-06/06-12-aionui-exe/prd.md — ACP event bugs → backend root fix; UI guards in aionui-src
       ├── If release is blocked, allow a *defensive fix* per ../integration/defensive-fix-policy.md
       └── Default: stop and ask before patching the symptom
   ```

3. **I changed code but nothing happens in dev?**
   → [`dev-test-ship.md`](./dev-test-ship.md) § Symptom → Diagnosis

4. **I'm verifying renderer UI fixes (greeting / thinking / permission)?**
   → [`dev-test-ship.md`](./dev-test-ship.md) §5 — **dev-first**; `dist:win` only after scenarios pass. PRD: `tasks/archive/2026-06/06-12-aionui-exe/prd.md`

5. **I'm wiring or debugging slash commands (`/` menu)?**
   → [`chat-acp-flow.md`](./chat-acp-flow.md) § Slash Command Flow — merge rules, file map, new-session requirement

---

## Docs Index

| Doc | When to read |
|-----|--------------|
| [`file-map.md`](./file-map.md) | **First lookup**: "I want to change X — which file?" |
| [`electron-architecture.md`](./electron-architecture.md) | process / preload / renderer / common split; source tree; build config |
| [`chat-acp-flow.md`](./chat-acp-flow.md) | Deep-dive on chat event flow + real ACP event examples + "add new chat message type" template |
| [`coding-rules.md`](./coding-rules.md) | **Code-level** rules (don't import Node in renderer, dedup only in chatLib, etc.) + verification checklist + "add new IPC channel" template |
| [`dev-test-ship.md`](./dev-test-ship.md) | dev / test / package workflow + symptom → diagnosis table + modify+test loop + **§8 white screen playbook** |
| [`../integration/index.md`](../integration/index.md) | Backend boundary, route-b sync, defensive fix policy (read when crossing layers) |
| [`../backend/index.md`](../backend/index.md) | CCB-Wanding / MCP / ACP backend (when root cause is Layer 4) |
| [`../backend/route-b-status.md`](../backend/route-b-status.md) | What works today in live dist (MCP smoke evidence) |
| [`../backend/source-migration-mcp.md`](../backend/source-migration-mcp.md) | When planning `$buildMcp` move from dist → source |

---

## Legacy Trellis placeholders

| Doc | Status |
|-----|--------|
| component / hook / quality / type-safety / state-management / directory-structure | Redirect stubs — use core docs above |

---

## Project strategy (1-line)

> Full version in [`../outline.md`](../outline.md) (Primary strategy, L95-110). **Bottom line:** ACP / MCP / session bugs → `D:\claude-code-B\src/`. Pure UI → desktop. Defensive fix only with `// TODO(defensive)` and a backend tracking issue.

**Full project spec map:** [`../index.md`](../index.md)
