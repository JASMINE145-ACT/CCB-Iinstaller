# Agent path for supplier edits (locked)

**Date:** 2026-07-12  
**Decision:** Dedicated specialist — not quotation MCP, not knowledge-md SoT.

## Write flow

```text
User edit intent
  → orchestrator Agent(supplier-directory-agent)
  → mcp__supplier-directory__*  confirmed=false → diff
  → user confirms
  → confirmed=true + CSRF → Org API
  → fleet read + #/suppliers same rows
```

## Rejected alternatives

1. **Mount on quotation-agent** — role bloat; whitelist mixed with quote sessions.  
2. **Dump to business-knowledge md** — weak structured match; shadow write ≠ sync; poor partial updates.

## Allowed adjacent

- Optional **read-only** md export from Org for humans.  
- Knowledge base may hold **policy** sentences (“prefer X for pipes”), not the directory rows.  
- Quotation keeps price-library `supplier` on O-column only.
