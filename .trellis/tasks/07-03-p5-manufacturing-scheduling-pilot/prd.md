# P5 — Manufacturing Scheduling Vertical Pilot

## Goal

Prove that the platform can deliver a second, non-trade vertical package without
modifying platform-core implementation. The pilot is a deterministic
finite-capacity manufacturing scheduler named
`com.example.manufacturing-scheduling`.

## Design decision

- Domain: manufacturing finite-capacity scheduling.
- Package mode: coexists with `com.wanding.trade`.
- Connector: local stdio MCP over JSON-RPC, backed by deterministic fixture data.
- Scope: demonstration-grade scheduling, not an optimizer or production MES.
- Security: no credentials and no network calls.
- UI contribution: declarative package metadata only; no AionUI core change.

## Workstreams

| ID | Workstream | Deliverable |
|----|------------|-------------|
| P5-A | Selection ADR | `research/p5-vertical-selection-adr.md` |
| P5-B | Package | manifest, agent, skill, knowledge schema, policy, eval, UI contribution |
| P5-C | Connector | stdio MCP with `get_work_center_capacity`, `list_work_orders`, `build_schedule` |
| P5-D | Full-chain acceptance | registry, compiler, control-plane, lifecycle, coexistence smoke |
| P5-E | Feedback | zero-core-change evidence and platform backlog |

## Acceptance criteria

- [x] Registry discovers both vertical packages with no error diagnostics.
- [x] The scheduler connector returns a deterministic capacity-feasible schedule
      and rejects malformed requests without crashing.
- [x] Runtime compilation enables the manufacturing MCP and agent from package
      metadata. A WanD-only vs dual-package differential proves WanD MCP
      settings, agents, health entries, provenance, and secret handling are
      unchanged; manufacturing entries are additive and global IDs unique.
- [x] `com.wanding.trade` and `com.example.manufacturing-scheduling` can be
      enabled concurrently without projection collision.
- [x] Manufacturing lifecycle covers install, enable, upgrade, rollback,
      disable, and uninstall using the real package as v1 and a temporary v2
      copy; WanD remains enabled and unchanged throughout coexistence.
- [x] A P4 control-plane tenant can publish a desired config containing the
      package, report the exact published config and package-lock revisions,
      and show no drift with both packages locked.
- [x] Every package-owned manifest source exists; agent frontmatter agrees with
      the manifest; policy/eval/knowledge/UI artifacts parse and reference the
      manufacturing capability; package config contains no secret or network
      dependency.
- [x] No platform-core implementation file is changed for the new package.
- [x] Full-chain smoke, concise operator case, feedback list, and exact command
      evidence are recorded.

## Non-goals

- Production-grade optimization, persistence, ERP integration, or dynamic UI
  rendering.
- Changes to ACP, route-b, AionUI, registry/compiler/lifecycle/control-plane
  implementation.
- Production cutover or customer data.

## Core-change boundary

Allowed implementation changes are confined to:

- `ccb-installer/packages/vertical/com.example.manufacturing-scheduling/**`
- package-owned connector under that directory
- tests and generated registry snapshot
- existing control-plane tests where a second catalog entry exposes a
  test-only single-package assumption or nondeterministic negative fixture
- Trellis task/spec/evidence documents

If acceptance requires editing platform implementation, stop and return to
design; do not silently generalize the platform during this pilot.

Baseline commit: `16cff83f4305a102103459bfb2a671c5fd456353`.
P5 closure must include a changed-path allowlist audit.
