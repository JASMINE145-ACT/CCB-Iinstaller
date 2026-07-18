# Research: pi-agent vs Claude-Code-B / CCB-Wanding

> Sources: vendored `docs/reference/pi/` (README, packages/agent|coding-agent|ai); WanD `.trellis/spec/backend|integration|frontend/`.  
> Scope: architectural contrast — **not** a rewrite recommendation.  
> Date: 2026-07-15 · Explore agent + plan-execution Scenario **L**

---

## 1. What “pi” is

**Pi Agent Harness** (`earendil-works/pi`, npm `@earendil-works/pi-*`) is a **minimal coding-agent toolkit**, not a desktop product stack.

| Package | Role |
|---------|------|
| `@earendil-works/pi-ai` | Multi-provider LLM API; tree-shakeable providers |
| `@earendil-works/pi-agent-core` | Stateful agent + tool loop + event stream |
| `@earendil-works/pi-coding-agent` | CLI / TUI / RPC / SDK (`pi` binary) |
| `@earendil-works/pi-tui` | Terminal UI |

**Explicit “no” list (by design):** No MCP, no built-in sub-agents, no permission popups, no plan mode, no to-dos, no background bash. Extend via TypeScript extensions / skills / packages.

Default tools: **`read` / `write` / `edit` / `bash`**.

---

## 2. Pi process / loop / deps (where “light” lives)

- **Primary:** single Node (≥22) or Bun-compiled binary; optional **in-process SDK** (`createAgentSession`).
- Modes: TUI · print · JSON stream · `--mode rpc` (JSONL) · SDK.
- Tool loop: `prompt → LLM stream → tool_execution_* → results → (more turns)`. Default **`toolExecution: "parallel"`**.
- Hooks: `beforeToolCall` / `afterToolCall` (optional terminate).
- Sandboxing out-of-band (Docker / VM); tools run as launching user unless you add gates.
- **agent-core** deps intentionally thin; `pi-ai` can tree-shake to one provider.

---

## 3. WanD / CCB baseline

```text
AionUI.exe (Electron)
  → aioncore.exe
    → route-b ACP slot
      → bun → CCB-Wanding dist/cli.js --acp
        → AcpAgent + QueryEngine
          → MCP children (quotation, accurate, excel, office-word, …)
```

- Protocols: ACP NDJSON + Electron IPC + aioncore HTTP/SSE + MCP multiplex.
- Product: assistant profiles, orchestrator+subagents, skills, hooks, permission UX, NSIS packaging.
- Latency spine: business MCP warm (quotation cold can be ~90s) — not LLM loop elegance alone.

---

## 4. Dimension checklist — pi “fast / lightweight”

| Dimension | Pi delivers | CCB / WanD |
|-----------|-------------|------------|
| **Process / cold start** | One Node/Bun process; SDK avoids spawn | Electron → aioncore → CCB → N MCP |
| **Dependency / binary** | Thin agent-core; optional Bun single-file | Electron + aioncore + CCB + bun + Python + MCP + vendor |
| **Protocol layers** | LLM + tools; optional RPC — **no ACP/MCP required** | ACP + MCP + IPC (product contracts) |
| **Permission UX** | Omitted by default (trust + optional extension/container) | ACP permissions / AskUser / hooks policy |
| **Session features** | Sessions, skills, extensions; **no** built-in subagents/plan/MCP | Skills + hooks + specialists + ROE gates |
| **Simple turn latency** | Shorter path (FS/bash tools only) | Stack tax + MCP spawn on business turns |
| **Ops / packaging** | npm / Bun CLI footprint | NSIS + route-b + bootstrap + seed whitelist |

**Verdict:** Pi’s “fast & light” = **architectural thinness** (refuse product features). It does **not** remove WanD’s MCP warm cost. Speed mostly comes from **not shipping what CCB ships**.

---

## 5. Comparison matrix

| | **Pi** | **CCB-Wanding + AionUI** |
|--|--------|---------------------------|
| Product shape | Terminal harness + embeddable SDK | Desktop vertical on Claude-fork ACP |
| Host UI | TUI / your app via SDK|RPC | Electron + Guid |
| Agent runtime | `Agent` / `AgentSession` | QueryEngine + `AcpAgent` |
| Default tools | 4 FS/shell | Built-ins + MCP surface |
| MCP | Out of core | Core business path |
| ACP | N/A | Required |
| Subagents | DIY | First-class |
| Permissions | Trust + optional gate | Product-controlled |
| Ship | npm / Bun binary | NSIS + multi-tree sync |
| Best at | Embeddable loops, CLI, custom UIs | Domain MCP, desk UX, installed base |

---

## 6. When WanD should **NOT** switch

1. Business MCP is the product (quotation / accurate / office / price-library).
2. ACP ↔ AionUI/aioncore Guid/permissions/session contracts stay load-bearing.
3. Orchestrator + specialists + Stop/ROE gates remain required.
4. Desktop packaging/update train is already paid for.
5. Permission UX must stay product-controlled.
6. Switch cost ≫ wins — Guid yellow-bar / MCP warm not fixed by swapping QueryEngine for pi loop alone.

---

## 7. Steal without rewrite

| Pi idea | Safe adoption |
|---------|----------------|
| Minimal default tools | Lazy / profile-scoped MCP prefetch (don’t warm everything) |
| Prefer in-process SDK | Strengthen CCB ACP in-process; don’t add pi RPC + ACP double stack |
| Tree-shake / pin deps | Harden CCB+MCP install policy |
| Parallel tools + ordered results | Benchmark QueryEngine tool batching if measurable |
| Steering / follow-up queues | Mid-turn redirect UX if ACP maps |
| Session fork/compact | UX on existing transcript store |
| Extensions as packages | Align with vertical package / skill seeds |
| “No MCP in core” | Keep domain tools in MCP servers, not fatter `cli.js` |

**Anti-inspiration:** drop permissions for speed; replace ACP with pi RPC; expect Bun `pi` to absorb Python MCP warm.

---

## 8. One-line summary

**Pi is a light agent library/CLI that stays fast by refusing WanD’s product features; CCB-Wanding is a heavy multi-process product whose latency and value both live in ACP+MCP. Steal loops and packaging hygiene; do not switch the runtime.**
