# Separation Backlog — mixed / P→B items

**Date:** 2026-07-05  
**Source:** `research/residual-coupling-audit.md` A1/A2  
**Dedup:** Skips 07-03 completed items (manifest, registry, compiler, vertical folder, health split).  
**Rule:** This task lists only — no code moves.

Cost: **S** ≤2 d · **M** 3–5 d · **L** &gt;1 wk  
Priority: **P0** blocks second vertical · **P1** high leverage · **P2** polish

| ID | Current location | Target | Cost | Risk | Priority | transition-ok | Suggested task |
|----|------------------|--------|------|------|----------|---------------|----------------|
| SB-01 | `ccb-installer/src/.../agentSessionProfile.ts` — `CCB_DEFAULT_SESSION_AGENT_ID`, keep-agent sets | Load from `package-registry` + legacy alias map | M | Break default session / Guid card | P0 | no | `platform-agent-registry-defaults` |
| SB-02 | `aionui-src/.../ccbAgentCatalog.ts` — `CCB_WANDING_KEEP_AGENT_IDS` | `AgentRegistry` + package manifest `agents[]` | M | Migration / prune regression | P0 | no | aionui: `ccb-agent-catalog-registry` |
| SB-03 | `ccb-installer/src/.../wanDMcpWarmup.ts` | Package `healthChecks` + generic warmup executor | S | Cold-start latency | P1 | yes | `package-mcp-warmup-pluggable` |
| SB-04 | `ccb-installer/patches/aionui-acp/acp-agent.js` — hardcoded quotation/accurate MCP | Manifest-driven MCP inject via route-b | L | ACP session regressions | P0 | no | `route-b-manifest-mcp-inject` |
| SB-05 | `agentSessionProfile.ts` — WanD delegation index builders | `com.wanding.trade` policy contribution API | M | Orchestrator prompt drift | P1 | yes | `package-orchestrator-contributions` |
| SB-06 | `agentSessionProfile.ts` — orchestrator MCP/path guards | Generic `SessionPolicyEngine` + package rules | L | Security: orchestrator calling business MCP | P1 | yes | `platform-session-policy-engine` |
| SB-07 | `capabilities.ts` — `source: 'ccb-wanding'` | `source: packageId` from registry | S | Telemetry mis-tag | P2 | yes | `platform-capability-source-id` |
| SB-08 | `compile-runtime-config.mjs` — default `D:/CCB-Wanding` | Env `CCB_INSTALL_DIR` only; no WanD path in platform defaults | S | Dev script friction | P2 | yes | `platform-config-neutral-defaults` |
| SB-09 | `aionui-src/UpdateModal.tsx` + i18n WanD strings | Branding contribution from installed package manifest | M | Wrong update UX for non-WanD SKU | P1 | yes | aionui: `package-ui-branding` |
| SB-10 | `internalUpdateManifest.ts` — registry key `CCB-Wanding` | Generic `CCB-{productId}` or manifest URL | M | Update channel break | P1 | yes | aionui: `generic-ccb-update-channel` |
| SB-11 | `build-wanding-lib.ps1` — WanD-named helpers in shared lib | Split `build-platform-lib.ps1` vs `build-wanding-release.ps1` | M | Release script breakage | P2 | yes | `ccb-installer-build-script-split` |
| SB-12 | `AionCore/aionui-price-library` WanD-centric naming in docs/API | Tenant-scoped product API (neutral naming) | M | Client sync contract | P2 | yes | `aioncore-price-library-neutral-api` |
| SB-13 | Boundary lint in CI (forbidden coupling) | Extend secret-scan workflow with grep rules from `platform-forbidden-coupling.md` | S | False positives | P1 | n/a | `platform-forbidden-coupling-lint` (07-03 P0-B extension) |
| SB-14 | `ccbWandingRuntime.ts` module naming | Rename to `ccbRuntime.ts`; product id from env | S | Import churn across aionui | P2 | yes | aionui: `ccb-runtime-neutral-naming` |

## Deferred from 07-03 (not duplicated here)

- P0 credential rotation (ops runbook)
- P4 production OIDC cutover
- P5 manufacturing pilot UI smoke

## Recommended pick order for next tasks

1. **SB-01 + SB-02** (registry defaults) — unblocks second vertical agent catalog
2. **SB-04** (route-b MCP inject) — highest coupling in integration layer
3. **SB-13** (lint) — prevent regression while migrating SB-01–06
4. **SB-06** (policy engine) — structural fix for orchestrator guards
