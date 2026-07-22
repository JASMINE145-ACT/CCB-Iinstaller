# Work Routing vs Execution — Domain Contracts

> **Status:** Active (task `07-09-work-routing-execution-contracts`)  
> **Registry:** [`contracts/agent-runtime-registry.yml`](./contracts/agent-runtime-registry.yml)  
> **Parent map:** [`agent-team-architecture.md`](./agent-team-architecture.md)  
> **Exploration source:** [`docs/asda`](../../../docs/asda) §3 · task research `rudder-wand-mapping.md`

Use this doc when you need to know whether a change belongs to **who does the work** (Routing) or **how the run happens** (Execution) — and which contract id to update in the registry.

**Zero behavior change.** This is documentation and traceability only.

---

## 1. Two domains (+ observability)

```text
                    User message
                         │
                         ▼
┌──────────────────────────────────────────────────────────────┐
│ WORK ROUTING — 策略：谁干活、谁 review、能否直连 MCP           │
│  (used by employee primary entry as a *tool*, not identity)  │
│                                                              │
│  L1 playbook (wande-orchestrator.md)                         │
│  filterDelegatableCustomAgents / appendWanDDelegationIndex   │
│  filterMcpConfigsForOrchestratorSession                      │
│  evaluateOrchestratorToolGuard                               │
│  :roe-judge Stop hook (reviewer)                             │
│  ENTRY contracts: WANd.ENTRY.IDENTITY / INTENT_SPLIT / EXT   │
└────────────────────────────┬─────────────────────────────────┘
                             │ Agent(subagent_type) decided
                             ▼
┌──────────────────────────────────────────────────────────────┐
│ EXECUTION — 机制：怎么 spawn、同步等待、transcript、profile   │
│                                                              │
│  runAgent.ts (sync spawn, subagents/agent-*.jsonl)           │
│  wanDEnvBootstrap / CLAUDE_CODE_DISABLE_BACKGROUND_TASKS      │
│  sanitizeOrchestratorAgentInput (strip run_in_background)      │
│  mergeEmployeeProfile in runAgent (P9)                         │
│  PreToolUse / PostToolUse / Stop hooks (delivery pipeline)     │
└────────────────────────────┬─────────────────────────────────┘
                             │ events + jsonl
                             ▼
┌──────────────────────────────────────────────────────────────┐
│ OBSERVABILITY — 展示已发生的 run（不重新派工）                 │
│                                                              │
│  DelegationRun B0 reducer (aionui-src)                       │
│  MessageToolGroupSummary nested View Steps                   │
│  SubagentDrawer · eval logs · parentToolUseId                │
└──────────────────────────────────────────────────────────────┘
```

| Domain | Answers | Must not own |
|--------|---------|--------------|
| **Routing** | Which agent? Direct MCP allowed? Who reviews output? | Spawn mechanics, UI tree layout |
| **Execution** | Sync vs async? Which jsonl? Profile merge order? | Playbook business routing prose |
| **Observability** | How operators see delegation + tools | Blocking tools or assigning agents |

---

## 2. Rudder ↔ WanD contract map

| Rudder (reference) | WanD contract id | WanD implementation |
|--------------------|------------------|---------------------|
| `ROUTING.ASSIGNMENT.001` | `WANd.ROUTING.ASSIGNMENT.001` | Orchestrator intent → `Agent(subagent_type)`; guard blocks top-level business MCP |
| _(knowledge vocab)_ | `WANd.ROUTING.KB_ORG.001` | 「知识库」= 业务知识库 → quotation `append_business_rule` |
| _(knowledge vocab)_ | `WANd.ROUTING.KB_PRICE.001` | 「价格库」→ `price-library-agent`（delegatable） |
| _(knowledge vocab)_ | `WANd.ROUTING.KB_DISAMBIG.001` | 混信号才澄清「业务知识库 vs 价格库」 |
| _(trade sourcing)_ | `WANd.TRADE.SOURCING.DUAL.001` | 报价卡同轮 `match_quotation` + `suppliers_hybrid_match` |
| _(supplier routing)_ | `WANd.ROUTING.SUPPLIER_DIR.001` | 名录意图一律 → quotation-agent（独立 supplier agent 已移除） |
| _(learn-by-data)_ | `WANd.LEARN.PRECIPITATE.001` | A 写知识库；B 通知祐嘉诚；C 价库 draft；D 跳过 |
| `ROUTING.REVIEWER.001` | `WANd.ROUTING.REVIEWER.001` | Specialist `Stop:` → `:roe-judge` via `subagent-gate.sh` |
| `RUN.EXECUTION.001` | `WANd.RUN.EXECUTION.001` | `runAgent.ts` sync spawn + verbatim same-turn forward |
| _(outcome relay)_ | `WANd.ORCH.OUTCOME_RELAY.001` | Parent Stop: Agent artifact → parent bubble path+count (nudge×1 → force-forward) |
| _(handoff brief)_ | `WANd.RUN.EXECUTION.003` | Structured Brief on Agent `prompt` + sanitize wrap (`07-14-orchestrator-handoff-brief-decomp-plan`) |
| `RUN.ADMISSION.001` | `WANd.RUN.ADMISSION.001` | `CLAUDE_CODE_DISABLE_BACKGROUND_TASKS` + `sanitizeOrchestratorAgentInput` + sync-wait playbooks |
| _(effort / plan)_ | `WANd.ROUTING.ASSIGNMENT.004` | Effort scaling + multi-intent hard-confirm plan (L1 + eval decomp) |
| _(observability)_ | `WANd.OBSERVE.DELEGATION.001` | `delegationRun.ts` + nested View Steps (`07-06-delegation-nested-view-steps`) |
| _(plan↔run)_ | `WANd.OBSERVE.DELEGATION.002` | DecompositionPlan timeline (slim; B1 meta still deferred) |

Full entries with `code` / `tests` / `spec` links: [`contracts/agent-runtime-registry.yml`](./contracts/agent-runtime-registry.yml).

---

## 3. Change classification decision tree

Answer in order. First match wins.

```text
1. Does the change only affect how AionUI displays tool steps / delegation tree
   without changing CCB spawn or guard rules?
   YES → Observability (WANd.OBSERVE.*)
   NO  → continue

2. Does the change answer "who should do this" or "is this output acceptable"
   (playbook routing, MCP allowlist on router, roe-judge, delegatable catalog)?
   YES → Routing (WANd.ROUTING.*)
   NO  → continue

3. Does the change affect spawn, sync/async, transcript paths, profile injection
   at Agent() time, or hook execution order on the subagent run?
   YES → Execution (WANd.RUN.*)
```

**Mixed change?** Split the PR / task: one routing commit, one execution commit. If impossible, document which contract ids are touched in `implement.jsonl`.

### Curated examples

| Change | Domain | Contract |
|--------|--------|----------|
| Block `mcp__price-library__` on orchestrator top-level | Routing | `WANd.ROUTING.ASSIGNMENT.001` |
| 「知识库更新」误走价库 upsert | Routing | `WANd.ROUTING.KB_ORG.001` + `KB_PRICE.001` |
| 「知识库」+ 物料编码混信号 | Routing | `WANd.ROUTING.KB_DISAMBIG.001` |
| Reorder `mergeEmployeeProfile` in `runAgent.ts` | Execution | `WANd.RUN.EXECUTION.001` |
| Tune `:roe-judge` block message on Stop | Routing | `WANd.ROUTING.REVIEWER.001` |
| Edit `wande-orchestrator.md`「报价委派 quotation-agent」 | Routing | L1 + `WANd.ROUTING.ASSIGNMENT.001` |
| Fix `委派 → 万鼎报价专家` nested grouping | Observability | `WANd.OBSERVE.DELEGATION.001` |
| Strip `run_in_background` on router `Agent()` input | Execution | `WANd.RUN.ADMISSION.001` |

---

## 4. Layer cross-reference (do not mix)

| Layer | Routing role | Execution role |
|-------|--------------|----------------|
| **L0** `CLAUDE.md` | Must not add business routing | Tool discipline only |
| **L1** agent `.md` body | Playbook: delegate vs direct MCP | Sync delegation instructions |
| **L2** `*.aionui.json` | `delegatable`, Guid primary | — |
| **L3** `mcpServers` | Stripped on router session | Passed to subagent at spawn |
| **L4** business knowledge | — | Read gate in subagent PreToolUse |

Hooks sit **on the Execution path** but **Routing-owned** hooks (`roe-judge`) must not be edited when fixing Execution admission — see registry `related` links.

---

## 5. Relationship to other work

| Task / doc | Relationship |
|------------|--------------|
| `07-06-delegation-nested-view-steps` | Shipped Observability; B1 `_meta.delegationRun` deferred |
| `07-04-orchestrator-dispatch-hardening` | Routing reliability + eval proof |
| `07-05-platform-business-architecture-separation` | Platform vs business **directory** map; orthogonal to routing/execution **runtime** map |
| `agent-team-architecture.md` | Operational deep dive; this doc is the **contract index** |

---

## 6. Backlog (out of scope)

- CI: fail PR if `evaluateOrchestratorToolGuard` changes without registry touch
- B1 CCB `_meta.delegationRun` enrich (DELEGATION.002 still uses frontend plan↔run link)
- MessageList auto-bind `decompositionPlan` prop from session/ACP
- Artifact pipeline / failed-step retry UX / work-tasks L2 decomp (task follow-ups)
