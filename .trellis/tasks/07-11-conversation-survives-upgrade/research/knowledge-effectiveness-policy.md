# Knowledge Effectiveness Policy — ADR (2026-07-06)

**Status:** approved (product delegate decision)  
**Scope:** quotation-agent + learn-by-data; hooks in `ccb-subagent-gate`  
**Amends:** SP2 in `conversation-continuity-contract.md`, C5 in `execution-plan.md`

---

## Problem

**Knowledge gate** (session-once Read) guarantees the agent *has read* `wanding_business_knowledge.md` before first `match_quotation*`. It does **not** guarantee:

1. **Attention dilution** — early Read pushed deep in long transcripts  
2. **Staleness** — KB changed mid-session (`append_business_rule`, org publish) while flag stays set  
3. **Context loss after soft refresh** — flag inherited but KB text absent from new context window  

**Rejected default:** re-Read full KB before **every** match (~9k chars × N matches bloats transcript faster than it fixes dilution).

---

## Decision summary

| Layer | Question | Answer |
|-------|----------|--------|
| **Gate** | Has session ever established KB context? | Session flag + first Read (unchanged) |
| **Effectiveness** | Is cached Read still valid for *this* match? | **Invalidation matrix** below |
| **Soft refresh (SP2)** | Inherit or reset? | **Inherit when `kb_hash` unchanged**; invalidate + re-Read when changed |
| **UX on re-Read after refresh** | Silent vs visible? | **Light toast** (not silent) |

---

## SP2 — Soft refresh choice: **B + C**

**Mechanism (C):** Persist with conversation continuity:

```text
knowledge_state = {
  read_at_generation,      // config_generation when last effective Read
  kb_content_hash,         // hash of wanding_business_knowledge.md at last Read
  match_count_since_read,  // optional counter for long-session nudge
}
```

**On soft refresh** (`config_generation` or app version bump per D2):

| Condition | Action |
|-----------|--------|
| Current `kb_hash` == stored `kb_content_hash` | **Inherit** — PreToolUse gate satisfied; **no** forced Read |
| `kb_hash` differs | **Invalidate** — next match blocked until re-Read; agent Read full KB or diff summary |
| New context, no KB in window, hash unchanged | **Inherit flag only** — acceptable; ~9k KB likely still in retained transcript; monitor via spike |

**UX (B):** When invalidation triggers re-Read after refresh:

> Toast: 「业务知识库已更新，已重新加载」  
> Not blocking modal; D4 still applies if re-Read fails.

**Reject pure C (inject-only):** Continuity injecting KB excerpt without Read bypasses hook evidence and duplicates maintenance; use only as **fallback spike** if hash-unchanged inherit fails S-Q smoke.

---

## Invalidation matrix (effectiveness)

| Event | Invalidate? | Recovery action |
|-------|-------------|-----------------|
| First match in session | — | Full Read (existing PreToolUse gate) |
| `append_business_rule` `confirmed=true` | **Yes** | re-Read full KB **or** tool-returned diff summary Read |
| learn-by-data **new batch** start | **Yes** | re-Read §选型相关节 (or full KB if section anchors TBD) |
| ≥ **4** `match_quotation*` since last effective Read | **Soft invalidate** | PostToolUse increments count; PreToolUse deny when `count >= 4` |
| Soft refresh, `kb_hash` changed | **Yes** | re-Read + toast (B) |
| Soft refresh, `kb_hash` unchanged | **No** | Inherit (SP2) |
| Ordinary 2nd/3rd price lookup | **No** | — |

**N = 4** — implemented in `knowledge_effectiveness.MATCH_COUNT_LIMIT`.

---

## Hook changes (P1, after 07-11 pipeline)

| Hook | Change |
|------|--------|
| `pre-match-knowledge-gate.py` | Check **effectiveness** (hash + generation), not boolean flag only |
| `parse_transcript_knowledge_gate.py` | Store `kb_content_hash` on Read; bump invalidation counters |
| PostToolUse (new, optional P2) | On `append_business_rule` applied → set invalidate flag |
| `quotation-learn-by-data` SKILL | Before each batch after first: 「若本会话 KB 已失效，re-Read 后再 batch」 |

**No change:** Stop `:knowledge` block backup; PostToolUse multi-candidate nudge.

---

## 07-11 contract amendments

Replace literal «gate 继承 = never Read again» with:

> **SP2:** After soft refresh, **inherit knowledge effectiveness** when org KB hash unchanged; **re-Read once** when KB or `config_generation` binding requires it. Goal: same conversation continues (D1/D3) without stale selection rules.

**C5 rewrite:** SP2 knowledge **effectiveness inherit** (hash-bound), not blind flag inherit.

**Recovery table:** Remove «不 Read 糊弄» as conflict with this ADR; replace with «SP2 spike must prove hash read path + S-Q pass».

---

## Testing

| ID | Case |
|----|------|
| K1 | Session Read → 5 matches → no second Read (gate pass) |
| K2 | `append_business_rule` confirm → next match denied until re-Read |
| K3 | learn-by-data batch 2 → nudge or deny until re-Read |
| K4 | Soft refresh, same kb_hash → S-Q without forced Read |
| K5 | Soft refresh, kb_hash bump → re-Read + toast; then S-Q |
| K6 | Soft refresh, hash unchanged but flag-only inherit fails → spike inject fallback |

---

## Out of scope (P0)

- Every-match full Read  
- Automatic diff Read without agent tool call (future MCP `get_business_knowledge_revision`)  
- accurate-agent / orchestrator KB (quotation-only)

---

## References

- `agents-unified-model.md` § Knowledge Read enforcement  
- `ccb-subagent-gate/scripts/pre-match-knowledge-gate.py`  
- `07-11` PRD D2/D4, `conversation-continuity-contract.md`
