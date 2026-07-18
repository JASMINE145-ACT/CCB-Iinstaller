# Safe pi → CCB adoption (no business-exec impact)

**Rule:** Only borrow patterns that **do not change** quotation match、Accurate 账务、价库读写、Word/Excel 产出、权限/ACP 协议语义。改「怎么装、怎么记、怎么懒加载非核心」可以；改「业务工具输入输出 / 编排策略」不行（另开 task）。

**Parent research:** `pi-vs-claude-code-b.md`  
**Date:** 2026-07-15

---

## Already in CCB (pi-aligned)

| Pi idea | Already here | Evidence |
|---------|--------------|----------|
| Minimal / profile tools | Session MCP prefetch is **not** “warm everything” | `mcpSessionPrefetch.ts` — defer lazy MCPs until first tool use; comment: excel-mcp COM expensive |
| Profile-scoped warm | Guid / profile allowlist drives warm set | `wanDMcpWarmup.ts` + `mcp-health.md` |
| Domain tools outside core | Business in MCP servers, not fatten `cli.js` | quotation / accurate / office-word MCP |
| Extensions as packages | Vertical seed agents/skills | `ccb-installer/packages/vertical/...` |

→ **Don’t re-implement these.** Prefer document + tighten, not new stack.

---

## Green-lit borrows (safe)

| ID | Borrow | Where | Why business-safe | How |
|----|--------|-------|-------------------|-----|
| **S1** | Document “pi thinness lesson” | `.trellis/spec/integration/` short note or mcp-health § | Docs only | Point: latency ≠ swap QueryEngine; = process/protocol count |
| **S2** | Keep sharpening **lazy defer list** | `mcpSessionPrefetch.ts` allow/deny | Only slows/starts non-core servers later; core quotation/accurate stay on warm contracts | Add office MCPs already deferred; never defer quotation/accurate without warm-timeout task |
| **S3** | Packaging hygiene (pin / ignore-scripts culture) | installer scripts / delivery notes | Install-time only | Mirror pi’s exact pins / `--ignore-scripts` where we already do partial |
| **S4** | “Prefer in-process ACP” checklist | route-b / sync docs | Process hygiene | Forbid adding pi-RPC **beside** ACP as second control plane |
| **S5** | Measure-only tool parallelism | research note + optional microbench | No prod flag flip until equal ordering proven | Capture QueryEngine batch behavior; **no** code change in this wave |

---

## Yellow (needs own task — may touch exec path)

| ID | Idea | Risk to business |
|----|------|------------------|
| Y1 | Parallel toolExecution like pi | Tool result order / side effects in match+inventory same turn |
| Y2 | Mid-turn steering queues | ACP message model + Guid UX |
| Y3 | Session fork/tree UX | Transcript store semantics |
| Y4 | Quotation warm budget (90s) | Already `07-15-quotation-mcp-warm-timeout` — keep there |
| Y5 | Change which MCPs warm on app open | Guid first-send / soft_ready contracts |

Do **not** fold Y* into “safe pi learn” — separate plans with TDD.

---

## Red (never for WanD)

- Replace ACP with pi RPC  
- Drop permission popups / hooks for “speed”  
- Move quotation/accurate into in-process “pi tools”  
- Bun-compile `pi` as Route B agent  

---

## Recommended next actions (this wave)

1. **This turn:** land this file + update research plan progress (done below).  
2. **Docs S1:** one short paragraph into `mcp-health.md` or `agents-unified-model.md` latency section (when user says 执行 / update-spec).  
3. **No runtime code** in pi-vs task closeout.  
4. Warm race → stay on `07-15-quotation-mcp-warm-timeout` (already productized).

---

## Decision for owners

**Learn = record + reinforce existing CCB laziness + packaging hygiene.  
Do not change business MCP I/O or agent turn semantics under the pi banner.**
