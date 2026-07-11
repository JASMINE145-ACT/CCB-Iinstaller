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

**Review question:** *Would a user reasonably expect the same choices here as on the main workflow screen?*

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

## Reviewer workflow (code-reviewer / trellis-check)

1. Classify change: does it touch a **picker**, **settings persist**, or **routing identity**? → Layer A mandatory.  
2. Run A1–A5 as checklist; cite **file:line** for canonical path vs new path.  
3. If renderer under `aionui-src/.../renderer/**` also changed → run Layer B ([`layer-b-renderer-review.md`](./frontend/layer-b-renderer-review.md)).  
4. Verdict must state **Layer A: PASS/FAIL** with rule ids (e.g. `A3 FAIL — identity not persisted`).  

---

## code-reviewer Custom Instructions (copy-paste)

```text
Layer A mandatory when the diff adds/changes a picker, settings binding, or persist shape for an entity also selected elsewhere in the app.

Read: .trellis/spec/code-review-layer-a.md

Checklist (fail closed on any FAIL):
- A1 Canonical path: grep canonical loader/hook for this entity; new code must reuse it, not a narrower duplicate API.
- A2 Multi-surface parity: if another surface already exposes the same user decision, option list + persist shape must match or spec documents intentional difference.
- A3 Identity vs capability: if downstream routes on profile/id fields, picker must persist identity—not only runtime/backend slug.
- A4 Persist-read symmetry: trace UI save → storage/sync → backend read; every consumer field must be written or have documented default.
- A5 Evidence: require mapper/restore unit test or cited backend test—"dropdown renders" alone is insufficient.

Verdict format:
  Layer A: PASS | FAIL (A1–A5: note failing rules)
  Layer B: PASS | N/A | FAIL (renderer only — layer-b-renderer-review.md)

Do not PASS Layer A on logic-only review when A3/A4 identity chain was not traced.
```

---

## Incident pattern (abstract)

**Symptom:** Feature “works” in UI but wrong runtime behavior in production.  
**Root cause class:** Multi-surface drift — canonical catalog wired on workflow A, capability-only list on workflow B.  
**Prevention:** A1 + A2 + A3 on every new settings/channel picker; shared helper + mapper tests (A5).

Concrete instance: task `07-05-wecom-channel-integration` — Channels agent picker used `getAgents()` only; Guid used `fetchAssistantsCatalog` + `getAgents`. Fixed via shared `channelAgentOptions.ts`.
