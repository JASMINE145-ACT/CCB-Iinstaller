# ADR — P5 second vertical selection

**Status:** accepted for pilot
**Date:** 2026-07-03

## Decision

Use finite-capacity manufacturing scheduling as the second vertical and package
it as `com.example.manufacturing-scheduling`.

## Why this proves more than another trade package

The domain graph is structurally different from quotation and accounting:
work orders depend on operations, work centers, capacity calendars, and
precedence constraints. Its connector needs deterministic planning behavior,
not price lookup or ERP record analytics.

## Alternatives

| Candidate | Result | Reason |
|-----------|--------|--------|
| Logistics anomaly triage | rejected | Event ingestion and observability would dominate the package-model proof. |
| Generic document assistant | rejected | Too close to existing platform Office capabilities. |
| Manufacturing scheduling | selected | Distinct data model, agent, connector tools, knowledge, policy, eval, and UI contribution; deterministic fixtures keep acceptance reproducible. |

## Connector contract

The package-owned stdio MCP exposes:

- `get_work_center_capacity`
- `list_work_orders`
- `build_schedule`

`build_schedule` uses earliest-due-date ordering with operation precedence and
finite work-center availability. The fixture is intentionally small and
deterministic. This proves package/connector composition; it does not claim
optimality.

### Normative fixture and schedule

All time values are UTC ISO-8601 strings; durations are integer minutes. The
planning date is `2026-07-06` and both work centers have one capacity window
`08:00Z`–`16:00Z` (480 minutes).

| Work order | Due | Operation | Center | Duration |
|------------|-----|-----------|--------|----------|
| `WO-100` | `2026-07-06T14:00:00Z` | 10 | `CUT` | 120 |
| `WO-100` | same | 20 | `ASM` | 90 |
| `WO-200` | `2026-07-06T16:00:00Z` | 10 | `CUT` | 60 |
| `WO-200` | same | 20 | `ASM` | 120 |

Expected earliest-due-date schedule:

| Work order/op | Start | End |
|---------------|-------|-----|
| `WO-100/10` | `08:00Z` | `10:00Z` |
| `WO-100/20` | `10:00Z` | `11:30Z` |
| `WO-200/10` | `10:00Z` | `11:00Z` |
| `WO-200/20` | `11:30Z` | `13:30Z` |

The scheduler orders work orders by due timestamp then work-order ID, and
operations by sequence. Each operation starts at the later of its predecessor
finish and its work center's next availability. A result is valid only if:

1. operations on one center never overlap;
2. every successor starts after its predecessor finishes;
3. every operation lies inside its capacity window;
4. repeated calls return byte-equivalent result data.

An operation that cannot fit in the remaining window returns
`CAPACITY_EXCEEDED`; malformed work-order input returns `INVALID_ARGUMENT`.

### MCP protocol

The connector implements newline-delimited JSON-RPC 2.0 over stdio and writes
protocol messages only to stdout. It supports:

- `initialize` → protocol version `2024-11-05` and server metadata;
- `tools/list` → JSON schemas for all three tools;
- `tools/call` → `{content:[{type:"text",text:"<JSON>"}], isError:false}`;
- parse error `-32700`, invalid request/arguments `-32602`, unknown method/tool
  `-32601`.

Tests cover initialize, listing, each call, invalid JSON, missing fields,
unknown tool, schema violations, process continuity after errors, and repeated
deterministic output.

## Coexistence decision

Both verticals may be enabled simultaneously. The manufacturing package has no
legacy projections, aliases, secret refs, or globally shared descriptor IDs,
so it cannot collide with WanD projections.

## Failure criterion

Any required platform implementation change invalidates the zero-core-change
acceptance and triggers a design review instead of an in-pilot core patch.

The pre-P5 implementation baseline is commit
`16cff83f4305a102103459bfb2a671c5fd456353`. The closure check reviews changed
paths and permits P5 work only in the new package directory, its dedicated
integration test, narrowly required existing control-plane test corrections,
generated registry snapshot, and Trellis task/spec evidence.
Unrelated pre-existing worktree changes are explicitly excluded from P5.
