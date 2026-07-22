# Layer A — Semantic / architecture review (universal)

> **Companion to** [`frontend/layer-b-renderer-review.md`](./frontend/layer-b-renderer-review.md).  
> **Reviewer agent:** Superpowers `code-reviewer` — see [`.cursor/rules/code-reviewer-agent.mdc`](../.cursor/rules/code-reviewer-agent.mdc) for canonical invoke + plugin path.

Layer A asks: *Is the behavior wired to the same contract the rest of the system already uses?*  
Layer B asks: *Will the module load without crashing the route?*

**PASS for user-facing picker / settings / routing work requires Layer A.**  
**PASS for renderer UI also requires Layer B.**

---

## When Layer A is mandatory

| Trigger | Examples (any product) |
|---------|------------------------|
| New or changed **picker / selector / binding** | Agent, assistant, model, channel, workspace, role |
| New **settings form** that mirrors an existing surface | Channels agent dropdown vs Guid agent bar vs conversation create |
| **Persist** path added or changed | `configService.set`, prefs API, channel sync, DB row |
| **Read** path consumes persisted identity | Route handler reads `custom_agent_id`, `assistant.id`, foreign key |
| Refactor that **moves** data loading | extract hook, split component, new API wrapper |
| New **cross-repo / cross-runtime capability** | Agent + MCP + Org API + desktop UI; registry without live deploy |

---

## Universal rules (abstract)

### A1 — Canonical path reuse (单一真相源)

Before introducing a new fetch/load path, locate the **canonical** loader for that entity (shared hook, `fetch*`, SWR key, service method, repository).

| Verdict | Condition |
|---------|-----------|
| **PASS** | New call site reuses canonical path, or wraps it without dropping fields |
| **FAIL** | Same entity loaded via a **narrower** or **alternate** API with no spec-approved reason |
| **FAIL** | Duplicate loader that will drift (subset of options, missing identity fields) |

**Review question:** *If I grep for how surface X loads this entity, is surface Y doing the same thing?*

---

### A2 — Multi-surface parity (多入口一致性)

When **two or more surfaces** let the user make the **same class of decision** (e.g. “which agent handles messages”), they must share:

1. **Data sources** merged the same way  
2. **Filter rules** (enabled, RBAC, authority)  
3. **Persist shape** written to storage  
4. **Restore logic** when reopening settings  

| Verdict | Condition |
|---------|-----------|
| **PASS** | Shared helper/hook documented in spec or `file-map.md`; surfaces call it |
| **FAIL** | Surface B only exposes a subset of Surface A’s options without documented intentional scope |
| **FAIL** | Same label (“对话 Agent”) but different option lists with no spec boundary |
| **FAIL** | A **shared ordered ID list** (nav tabs, builtin keys, enum of routes) has **parallel maps/builders**; an ID exists in the list but is **missing or undefined** in a consumer map that does `ids.map(id => map[id])` (or equivalent), without a documented filter that drops that ID first |

**Review question:** *Would a user reasonably expect the same choices here as on the main workflow screen?*

**Shared ID → map completeness (crash subclass of A2):** When one module exports an ordered ID catalog and another (or the same module) builds UI from a parallel `Record`/`Map`, every ID that reaches `.map` / splice / `.id` access **must** resolve to a defined item—or be filtered out before map. Prefer one shared builder over twin maps. Verify by grepping the ID constant’s consumers and confirming each `builtinMap` / nav builder keys all non-filtered IDs.

---

### A3 — Identity vs capability (身份与能力分离)

Distinguish two layers in pickers:

| Layer | Meaning | Typical source |
|-------|---------|----------------|
| **Capability** | What *can* run (runtime, engine, CLI on PATH) | Registry, `/api/agents`, detector |
| **Identity** | What *should* run for business (profile, preset, orchestrator) | Catalog, `fetchAssistantsCatalog`, DB profile id |

If downstream routing keys on **identity** (`custom_agent_id`, `assistant.id`, `preset_id`), the picker must expose and persist **identity**, not only capability (`backend: codex`).

| Verdict | Condition |
|---------|-----------|
| **PASS** | Picker writes identity fields the consumer reads (trace A4) |
| **FAIL** | UI saves capability slug only; consumer expects identity id |
| **FAIL** | User sees “working” selection that routes to wrong/default profile |

**Review question:** *Am I listing engines when the backend routes on profiles?*

---

### A4 — Persist ↔ read symmetry (存取对称)

Trace the full chain for every field that affects routing:

```text
UI selection → persist (local config / API / sync) → backend read → create session / job / message
```

| Verdict | Condition |
|---------|-----------|
| **PASS** | Every field the consumer reads is written by the picker (or documented default) |
| **PASS** | Unit test covers mapper: option → persist payload → expected consumer shape |
| **FAIL** | Backend test/spec documents field `F`; UI never sets `F` |
| **FAIL** | `sync*` or API called but payload missing fields the server merge needs |

**Review question:** *If I log the saved JSON and the backend read, do they agree on identity?*

---

### A5 — “Looks working” is not wired (表象可用 ≠ 已打通)

These are **insufficient** for PASS:

- Dropdown renders options  
- Save shows success toast  
- No console error on click  
- Layer B import smoke passes  

Require **at least one** evidence of contract wiring:

| Evidence type | Example |
|---------------|---------|
| Mapper unit test | `option → persist payload` with identity fields |
| Restore test | saved row → `matchSaved*` → same option |
| Backend test / spec cite | consumer reads `custom_agent_id` |
| Manual smoke step | task `check.jsonl` scenario |

| Verdict | Condition |
|---------|-----------|
| **FAIL** | Only manual “I see Codex in the list” with no identity-path proof |

---

### A6 — Consumer-plane completeness (消费平面完备)

Some features are **not** delivered when a single file lands in git. They are **multi-plane capabilities**: the same intent must reach every **mandatory consumer plane** that actually selects, routes, or executes the behavior.

| Plane (abstract) | Role |
|------------------|------|
| **Authoring** | Where engineers edit truth (crate, agent md, MCP source, migration) |
| **Registration** | Where runtimes *discover* truth (package manifest, registry snapshot, health manifest) |
| **Install / sync** | What copies truth into the user or server runtime (build, deploy script, route-b sync, seed) |
| **Session / UI consumer** | What the user or session *reads* at click time (Guid live config, orchestrator delegate list, sider route, live dist) |

**Core rule:** *Source written ≠ consumer reached.*  
“Entity created in repo” must **not** be treated as “feature delivered” unless the diff or linked plan traces handoff to each **required** consumer plane.

| Verdict | Condition |
|---------|-----------|
| **PASS** | Each mandatory plane for this feature is either updated in the diff **or** explicitly gated in plan/DoD with a named command + evidence (not “ops later”) |
| **PASS** | Observability / UI contracts: either a **default-path consumer** (renderer/timeline mounts or auto-derives) **or** DoD explicitly stages “library-only / not on timeline yet” |
| **FAIL** | Only authoring (+ maybe registration) touched; a user-visible or session consumer plane is **implied** but has no sync step and no verification hook |
| **FAIL** | Review would PASS on “agent/MCP/API exists” without naming **which plane** makes it selectable or callable |
| **FAIL** | New helpers/types/tests for View Steps / Plan / Run exist, but **no** session/UI call site and DoD still claims the observability contract shipped |

**Review question:** *Who consumes this artifact at runtime—and did this change reach that consumer, or only the git tree?*

**Anti-pattern (abstract):** Collapsing a cross-boundary feature into one artifact (one md, one crate, one registry row) and inferring end-to-end delivery.

**Incident class:** Specialist agent visible in packages but absent from Guid until live agent config is synced (authoring ≠ session consumer).

**Incident class (UI helpers):** `decompositionPlan.ts` + unit tests only, while PRD claims Plan↔Run timeline — A6 FAIL until `MessageToolGroupSummary` (or auto-derive) consumes it, or DoD gates library-only.

---

## Reviewer workflow (code-reviewer / trellis-check)

1. Classify change: does it touch a **picker**, **settings persist**, **routing identity**, or a **multi-plane capability** (agent/MCP/API spanning repos)? → Layer A mandatory.  
2. Run A1–A6 as checklist; cite **file:line** for canonical path vs new path.  
3. If renderer under `aionui-src/.../renderer/**` also changed → run Layer B ([`layer-b-renderer-review.md`](./frontend/layer-b-renderer-review.md)).  
4. Verdict must state **Layer A: PASS/FAIL** with rule ids (e.g. `A3 FAIL — identity not persisted`, `A6 FAIL — Guid consumer plane not synced`).  

---

## code-reviewer Custom Instructions (copy-paste)

```text
Layer A mandatory when the diff adds/changes a picker, settings binding, persist shape for an entity also selected elsewhere, or a capability that spans repos/runtimes (agent + MCP + Org API + desktop).

Read: .trellis/spec/code-review-layer-a.md

Checklist (fail closed on any FAIL):
- A1 Canonical path: grep canonical loader/hook for this entity; new code must reuse it, not a narrower duplicate API.
- A2 Multi-surface parity: if another surface already exposes the same user decision, option list + persist shape must match or spec documents intentional difference. If a shared ordered ID list drives parallel maps/builders, every non-filtered ID must resolve to a defined item (no `undefined` in `ids.map(id => map[id])`).
- A3 Identity vs capability: if downstream routes on profile/id fields, picker must persist identity—not only runtime/backend slug.
- A4 Persist-read symmetry: trace UI save → storage/sync → backend read; every consumer field must be written or have documented default.
- A5 Evidence: require mapper/restore unit test or cited backend test—"dropdown renders" alone is insufficient.
- A6 Consumer-plane completeness: name each mandatory consumer plane (authoring / registration / install-sync / session-UI); do not PASS on "file exists in repo" if session or live runtime consumer is untraced. For observability/UI contracts: require a default-path consumer (or auto-derive) **or** explicit library-only DoD — helpers+tests alone FAIL.

Verdict format:
  Layer A: PASS | FAIL (A1–A6: note failing rules)
  Layer B: PASS | N/A | FAIL (renderer only — layer-b-renderer-review.md)

Do not PASS Layer A on logic-only review when A3/A4 identity chain was not traced, or when A6 applies and only the authoring plane was updated.
```

---

## Incident pattern (abstract)

**Symptom:** Feature “works” in UI but wrong runtime behavior in production.  
**Root cause class:** Multi-surface drift — canonical catalog wired on workflow A, capability-only list on workflow B.  
**Prevention:** A1 + A2 + A3 on every new settings/channel picker; shared helper + mapper tests (A5).

**Symptom:** Clicking Settings (or another primary shell route) white-screens even when the new tab itself is unused.  
**Root cause class:** **Shared ID list ↔ parallel map incomplete** — one surface adds an ID to a shared ordered catalog; another surface’s map omits it; `undefined.id` (or similar) throws on every settings mount.  
**Prevention:** A2 shared-ID→map completeness on every nav/tab/settings catalog change; Runtime Crash Checklist must cite map-key coverage for all `BUILTIN_*` / ordered-ID consumers.

**Related (A4 / admin surface):** Filtering a still-loginable bootstrap admin out of the org Users table so operators think the account was deleted — see Runtime Crash “Admin management list” + [`../tasks/07-13-07-13-org-admin-user-management/admin-rbac-contract.md`](../tasks/07-13-07-13-org-admin-user-management/admin-rbac-contract.md) §2.1.

**Related (AionCore DB):** Multi-statement work on `&SqlitePool` without `pool.begin()` — see [`integration/aioncore-sqlite-transactions.md`](./integration/aioncore-sqlite-transactions.md) (Runtime Crash Critical).

**Symptom:** Code merged, tests green, user cannot select or invoke the feature.  
**Root cause class:** **Authoring-plane-only delivery** — artifact exists in repo/registry but mandatory **session or live-runtime consumer** was never synced.  
**Prevention:** A6 on every cross-repo capability; execution plan must list consumer planes + deploy evidence, not imply completion from “agent created”.

Concrete instance: task `07-05-wecom-channel-integration` — Channels agent picker used `getAgents()` only; Guid used `fetchAssistantsCatalog` + `getAgents`. Fixed via shared `channelAgentOptions.ts`.
