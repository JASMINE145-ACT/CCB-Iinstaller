# Prior Work Summary — 07-05 vs 07-03 / 06-25

**Date:** 2026-07-05  
**Purpose:** Phase 0 alignment — what 07-03 already solved vs what this task adds.

## 07-03 completed (product / assembly layer)

| Phase | Delivered | Boundary impact |
|-------|-----------|-----------------|
| P0 | Secret scan, forbidden-coupling rules, credential runbook | **Policy** frozen; ops rotation deferred |
| P1 | Package manifest schema, read-only registry snapshot, registry lint | **Descriptor graph** exists; platform can enumerate packages |
| P2 | Config compiler (`compile-runtime-config.mjs`), drift detection | **Single source** for Agent–MCP projections |
| P3 | `com.wanding.trade` vertical package extract, platform install-health split | **Package boundary** on disk; platform health no longer requires WanD files |
| P4 | Control plane tenant projection, JWKS/OIDC scaffolding | **Tenant_id** in new APIs; cutover human-gated |
| P5 | Second vertical pilot (`com.company-b.manufacturing`) | Proves multi-package model |

**Evidence:** `.trellis/tasks/07-03-platform-business-decoupling/status.md` — epic **completed** 2026-07-05.

## 06-25 (early exploration)

- Python / directory boundary notes under `.trellis/tasks/06-25-architecture-business-system-boundaries`.
- Superseded for runtime truth by 07-03 P1–P3; still useful for **naming** and historical rationale.

## Gap this task fills (code / directory level)

07-03 solved **manifest, registry, compiler, vertical package folder, health split**. It did **not** produce:

1. **Line-level audit** of WanD identifiers still embedded in platform `src/`, route-b patches, AionUI platform modules.
2. **100% directory ownership table** (repo root + `ccb-installer/` second level + aionui-src read-only).
3. **Daily dev decision tree** — “is this change platform, business, or mixed?” in &lt;30 s.
4. **Prioritized separation backlog** with `transition-ok` for items intentionally deferred.

## Authoritative references (no conflict expected)

| Doc | Use in this task |
|-----|------------------|
| `docs/platform-system-business-decoupling-optimization.md` §17 | Business vs platform **extraction list** |
| `.trellis/spec/integration/platform-vertical-packages.md` §3–§4 | Layer model + nine change areas |
| `.trellis/spec/integration/platform-forbidden-coupling.md` | Platform path list + forbidden identifiers |
| `.trellis/spec/integration/platform-identity-schema.md` | ID naming (`packageId`, `tenantId`) |

## Conflicts / open questions

| Item | Status |
|------|--------|
| 07-03 claims “platform install-health no longer requires WanD files” | **Confirmed** — Platform profile PASS without `com.wanding.trade` paths in manifest (2026-07-05 verify) |
| Platform `src/` still contains WanD orchestrator rules | **Expected transition** — documented as mixed in audit; not a 07-03 regression |
| aionui-src `ccbAgentCatalog.ts` hardcoded agent IDs | **Known** — ADR §4.4 target state; backlog item |

## Scope lock (this task)

- **Zero behavior change** — docs and spec only.
- **No code moves** — backlog entries reference future tasks.
- **aionui-src** — read-only audit; fixes belong in aionui-src repo tasks.
