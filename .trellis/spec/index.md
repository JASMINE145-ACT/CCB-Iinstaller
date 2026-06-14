# Project Spec Index (AionUI + CCB-Wanding)

> **Start here** if you are unsure which layer to read. Human strategy notes: [`outline.md`](./outline.md). AI entry points: [`AGENTS.md`](../AGENTS.md) (repo root).

---

## Three entry points (by layer)

| Layer | Start | When |
|-------|-------|------|
| **Frontend** (AionUI desktop) | [`frontend/index.md`](./frontend/index.md) | UI, IPC, chat rendering, dev mode |
| **Backend** (CCB-Wanding / MCP / ACP) | [`backend/index.md`](./backend/index.md) | `--acp`, quotation MCP, build/deploy, MiniMax config |
| **Integration** (boundary) | [`integration/index.md`](./integration/index.md) | route-b, sync, defensive fixes, 4-layer chain |

**Thinking guides** (before cross-layer work): [`guides/index.md`](./guides/index.md)

### Backend quick map

| Area | Root |
|------|------|
| CCB-Wanding source | `D:\claude-code-B\src\` |
| CCB-Wanding deploy | `D:\CCB-Wanding\dist\` |
| Integration patches | `ccb-installer/` |
| Business MCP + Python | `mcp_servers/`, `python/` |
| CCB config | `%LOCALAPPDATA%\CCB-Wanding\.claude\` |

Detail: [`backend/file-map.md`](./backend/file-map.md).

---

## Doc maturity (honest snapshot, 2026-06-14)

| Area | Rating | Good for | Gaps |
|------|--------|----------|------|
| **Integration** | **9/10** | route-b sync, boundary rules, defensive policy, CCB authority config ownership, warmup latency boundary, assistant profile handoff | — |
| **Backend (ACP / Route B)** | **9/10** | file-map, acp-session-flow, smoke, deploy, source-level MCP, assistant profiles, capability manifest | Source MCP migration complete; assistant profile smoke pending |
| **Frontend (core)** | **8.5/10** | file-map, chat-acp-flow (warmup timing control points), coding-rules, dev-test-ship | Trellis placeholders → redirect stubs only |
| **outline.md** | **7/10** | Strategy, architecture narrative (Chinese) | Not a structured handbook — use layer indexes for tasks |
| **Runtime verification** | **7.5/10** | `test-native-acp-agent.mjs` documented; MCP/skills/command authority verified | AionUI UI E2E + preset assistant smoke pending |

**Verdict:** **OK to ship as a handbook** for Route B + layer routing + CCB authority config. Refresh [`backend/route-b-status.md`](./backend/route-b-status.md) when live behavior changes. Active work: `06-13-ccb-assistant-templates`, `06-13-ccb-session-warmup-latency`, `06-14-ccb-assistant-profile-runtime-authority`, `06-14-ccb-assistant-catalog-authority`.

---

## Full doc map

### Frontend (`frontend/`)

| Doc | Status |
|-----|--------|
| [`index.md`](./frontend/index.md) | ✅ Entry |
| [`file-map.md`](./frontend/file-map.md) | ✅ |
| [`chat-acp-flow.md`](./frontend/chat-acp-flow.md) | ✅ |
| [`coding-rules.md`](./frontend/coding-rules.md) | ✅ |
| [`dev-test-ship.md`](./frontend/dev-test-ship.md) | ✅ |
| [`electron-architecture.md`](./frontend/electron-architecture.md) | ✅ |
| component / hook / quality / type-safety / directory-structure | ➡️ Redirect stubs — use `coding-rules.md` |

### Backend (`backend/`)

| Doc | Status |
|-----|--------|
| [`index.md`](./backend/index.md) | ✅ Entry |
| [`file-map.md`](./backend/file-map.md) | ✅ |
| [`runtime-architecture.md`](./backend/runtime-architecture.md) | ✅ |
| [`acp-session-flow.md`](./backend/acp-session-flow.md) | ✅ |
| [`build-deploy-verify.md`](./backend/build-deploy-verify.md) | ✅ |
| [`coding-rules.md`](./backend/coding-rules.md) | ✅ |
| [`config-layer.md`](./backend/config-layer.md) | ✅ |
| [`route-b-status.md`](./backend/route-b-status.md) | ✅ Live snapshot |
| [`source-migration-mcp.md`](./backend/source-migration-mcp.md) | ✅ Migration plan |
| [`mcp-business.md`](./backend/mcp-business.md) | ✅ Quotation / Python / data |

### Integration (`integration/`)

| Doc | Status |
|-----|--------|
| [`index.md`](./integration/index.md) | ✅ |
| [`aionui-ccb-boundary.md`](./integration/aionui-ccb-boundary.md) | ✅ (warmup latency + assistant profile handoff added 2026-06-14) |
| [`aionui-config-inventory.md`](./integration/aionui-config-inventory.md) | ✅ CCB authority ownership map + skills/MCP migration impl |
| [`route-b-sync.md`](./integration/route-b-sync.md) | ✅ |
| [`defensive-fix-policy.md`](./integration/defensive-fix-policy.md) | ✅ |

### Task logs (not handbooks)

| Doc | Role |
|-----|------|
| [`../spec/aionui-ccb-wanding-acp-mcp-fix.md`](../spec/aionui-ccb-wanding-acp-mcp-fix.md) | Route B progress / transcripts |
| [`../ccb-installer/AIONUI-BACKEND-STATUS.md`](../ccb-installer/AIONUI-BACKEND-STATUS.md) | Raw status source for route-b-status |

---

## Refresh policy

- **Live behavior changes** → update `backend/route-b-status.md` same day
- **New smoke or deploy script** → update `backend/build-deploy-verify.md`
- **claude-agent-acp version bump** → update `integration/route-b-sync.md`
- **Source MCP migration lands** → ✅ Done (2026-06-12). `acp-session-flow.md` current; dual-state sections collapsed
- **CCB authority config ownership changes** → update `integration/aionui-config-inventory.md`
- **Assistant profile schema / handoff changes** → update `integration/aionui-ccb-boundary.md` § CCB assistant profile handoff
