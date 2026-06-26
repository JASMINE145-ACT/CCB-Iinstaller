# CCB-Wanding Backend Development Guide

> **Start here for any CCB-Wanding / MCP / ACP backend work.** For AionUI renderer changes, see [`../frontend/index.md`](../frontend/index.md). For cross-layer boundaries from the desktop side, see [`../integration/index.md`](../integration/index.md).

---

## Rule 0 — Decide the layer first

| What you want to change | Where it belongs |
|--------------------------|------------------|
| ACP session, greeting, permission payload, tool loop, `mcpClients` | **`D:\claude-code-B\src/`** → build → `D:\CCB-Wanding\dist\` |
| route-b launcher, ACP slot env, `CCB_WANDING_*` policy | **`ccb-installer/patches/`** → sync (see [`../integration/route-b-sync.md`](../integration/route-b-sync.md)) |
| Quotation / inventory / Accurate business logic | **`mcp_servers/`** + **`python/`** + config in settings |
| MiniMax env, MCP server list, business markdown | **`%LOCALAPPDATA%\CCB-Wanding\.claude\settings.json`** + data files |
| Official Claude Code login | **`C:\Users\m1774\.claude`** — **never write here for CCB work** |

If the symptom is an ACP event bug, **do not thicken the AionUI frontend**. Fix the producer in `claude-code-B` (see [`acp-session-flow.md`](./acp-session-flow.md)).

---

## Quick start — three questions

1. **I only want to change MCP tool behavior or business data?**
   → [`mcp-business.md`](./mcp-business.md) + [`config-layer.md`](./config-layer.md) + [`build-deploy-verify.md`](./build-deploy-verify.md) smoke

2. **I'm fixing ACP / greeting / permission / MCP registration in sessions?**
   → [`acp-session-flow.md`](./acp-session-flow.md) + edit `D:\claude-code-B\src\services\acp\agent.ts` (not `dist/chunks/entry-*.js`)

3. **I changed backend code but AionUI still shows old behavior?**
   → [`build-deploy-verify.md`](./build-deploy-verify.md) § Symptom → Diagnosis + [`../integration/route-b-sync.md`](../integration/route-b-sync.md)

---

## Docs index

| Doc | When to read |
|-----|--------------|
| [`file-map.md`](./file-map.md) | **First lookup**: Feature → file (ACP runtime, patches, MCP, config) |
| [`runtime-architecture.md`](./runtime-architecture.md) | `--acp` routing, QueryEngine, MCP lifecycle, deprecated paths |
| [`acp-session-flow.md`](./acp-session-flow.md) | session/new, greeting, permissions, tool loop; **producer** side of chat events |
| [`coding-rules.md`](./coding-rules.md) | Hard rules, isolation, verification checklist, task templates |
| [`build-deploy-verify.md`](./build-deploy-verify.md) | `bun run build`, deploy to `D:\CCB-Wanding\dist\`, smoke commands |
| [`config-layer.md`](./config-layer.md) | `settings.json`, `CLAUDE.md`, Wanding data paths |
| [`mcp-business.md`](./mcp-business.md) | Quotation MCP tools, Python layer, business data, smoke |
| [`route-b-status.md`](./route-b-status.md) | **Live snapshot**: what works today (dist `$buildMcp` patch, smoke evidence, open items) |
| [`source-migration-mcp.md`](./source-migration-mcp.md) | Migrate `$buildMcp` from dist patch → `agent.ts` (step-by-step) |
| [`../integration/aionui-ccb-boundary.md`](../integration/aionui-ccb-boundary.md) | 4-layer chain (read when touching AionUI + backend together) |
| [`../../tasks/archive/2026-06/06-12-route-b-exe-aionui-runtime/aionui-ccb-wanding-acp-mcp-fix.md`](../../tasks/archive/2026-06/06-12-route-b-exe-aionui-runtime/aionui-ccb-wanding-acp-mcp-fix.md) | **Archived task log** (Route B, 2026-06-12) — not a general handbook |

### Legacy / N/A (not separate docs)

| Topic | Use instead |
|-------|-------------|
| Directory layout | [`file-map.md`](./file-map.md) + quick map in [`../index.md`](../index.md) |
| Quality / error / logging / database | [`coding-rules.md`](./coding-rules.md); N/A for DB (Wanding xlsx in [`config-layer.md`](./config-layer.md)); MCP stderr prefix `[ccb-acp-mcp]` in live dist |

---

## Source vs live dist (MCP)

**Single source of truth:** [`acp-session-flow.md`](./acp-session-flow.md) § Source vs live dist.

Live snapshot + open items: [`route-b-status.md`](./route-b-status.md). Migration plan: [`source-migration-mcp.md`](./source-migration-mcp.md).

---

## Project strategy (1-line)

> Full version: [`../outline.md`](../outline.md) § Primary strategy. **Bottom line:** fix ACP/MCP in `claude-code-B` source; config for business knowledge; never hand-patch minified `dist` except emergency hotfix with a migration ticket.
