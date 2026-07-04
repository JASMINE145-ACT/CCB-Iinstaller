# Architecture §20 decision register

**Reviewed:** 2026-07-04
**Scope:** implementation closure for P0–P5. “Accepted” means accepted for the
implemented v1 boundary, not an irreversible product decision.

| # | Decision | Disposition | Rationale | Authority / owner | Revisit trigger | Evidence |
|---|----------|-------------|-----------|-------------------|-----------------|----------|
| 1 | Platform product name | deferred | Renaming affects product, installer, HR, customer communication, and migration; engineering closure cannot choose it. | Product owner | First non-WanD branded production release | Current compatibility name remains CCB-Wanding |
| 2 | Per-company Phase-A control plane | accepted for v1 | Physical isolation is safer while shared-data isolation is not production-proven. | Architecture + Ops | Approved shared multi-tenant threat model and isolation tests | P4 per-tenant deployment template and runbook |
| 3 | Package format | directory accepted for v1; zip/OCI deferred | Directory packages are executable now; remote distribution needs artifact controls first. | Platform architecture | Remote package catalog/distribution project starts | `packages/vertical/*`, package lifecycle tests |
| 4 | Package signature and publisher trust | deferred | No remote/untrusted package distribution is authorized in P0–P5. | Security + Release | Any package crosses an external trust boundary | P5 feedback backlog; unsigned code plugins prohibited |
| 5 | Office/Research ownership | platform-built-in accepted for transition; split deferred | Existing capabilities remain reusable platform assets; extraction has no P0–P5 user value. | Platform architecture | Independent release/version/policy is required | Platform-only health plan and forbidden-coupling spec |
| 6 | Remote MCP Gateway topology | contract accepted; hosting topology deferred | P4 proves tenant authorization and HTTPS client projection without silently replacing the live local path. | Security + Platform | Production gateway deployment design | P4 control-plane contract/tests and human checklist |
| 7 | Package UI model | schema-only accepted for v1 | Declarative contribution avoids executing unsigned package code. | Platform architecture | Dynamic rendering implementation is approved | P5 `ui/scheduling-dashboard.json`; feedback backlog |
| 8 | Tenant-data retention after uninstall | deferred | Legal/business retention authority and real data classes are not defined. | Legal + Data owner + Ops | First production uninstall or retention policy review | Package `retainOnDisable`; P3/P5 human checklist |
| 9 | Local offline cache policy | deferred | Allowed data, TTL, encryption, and revocation require connector-specific risk review. | Security + Business data owner | A package requests offline business data | Current package policy; no P5 network/cache dependency |
| 10 | Second-company validation domain | accepted: manufacturing scheduling | It is structurally different from quotation/trade and has deterministic acceptance. | Architecture + pilot product owner | A real-company discovery pilot replaces fixtures | P5 ADR, package, full-chain tests, commit `a73c43cf` |

## Deferred-decision rule

A deferred row does not block automated implementation closure because its
trigger is outside P0–P5 scope. It does block any production action that depends
on that decision. The parent epic therefore remains in `review` with lifecycle
`awaiting_human_verification`.
