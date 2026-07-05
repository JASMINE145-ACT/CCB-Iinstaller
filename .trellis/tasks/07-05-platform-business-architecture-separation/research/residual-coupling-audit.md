# Residual Coupling Audit — A1 (line-level) + A2 (directory ownership)

**Date:** 2026-07-05  
**Scenario:** E — zero behavior change  
**Criteria:** `platform-forbidden-coupling.md`, design doc §17, ADR §3/§10

---

## A1 — Platform paths with business identifiers (line-level)

Classification key:

| Tag | Meaning |
|-----|---------|
| **P→B** | Platform file; should migrate logic/strings to vertical package or registry |
| **MIXED** | Intentional transition (orchestrator guardrails, installer defaults) — `transition-ok` |
| **OK** | Comment/test fixture referencing business for regression; or vertical path |

### claude-code-best — `ccb-installer/src/` (platform runtime)

| File | Lines | Evidence | Tag | Notes |
|------|-------|----------|-----|-------|
| `services/acp/agentSessionProfile.ts` | 57–64 | `CCB_DEFAULT_SESSION_AGENT_ID = 'wande-orchestrator'`, `CCB_WANDING_KEEP_AGENT_IDS` | **P→B** | Default agent + keep-list should load from package manifest / registry aliases |
| | 99–100, 153, 171 | WanD routing prompt text, specialist session templates | **MIXED** | Orchestrator behavior; extract to `com.wanding.trade` policy contribution |
| | 530–576 | `buildWanDDelegationIndex`, `appendWanDDelegationIndex` | **P→B** | Delegation index = package metadata |
| | 587–748 | Orchestrator MCP/path guards (`quotation-agent`, `vendor/wanding/data`) | **MIXED** | Platform **enforcement hook** for WanD rules — transition until generic policy engine |
| `services/acp/agent.ts` | 77, 106, 202–219, 826, 917 | `appendWanDDelegationIndex`, `scheduleWanDMcpWarmup`, `ensureWanDSyncSubagents` | **MIXED** | Warmup + sync subagent policy WanD-specific |
| `services/acp/wanDMcpWarmup.ts` | 1–163 (whole module) | `warmWanDMcpServers`, branches on `quotation-agent` / `accurate-agent` | **P→B** | Should be package health/warmup contribution |
| `services/acp/mcpSessionPrefetch.ts` | 2–9 | Comment: core WanD servers quotation/accurate | **MIXED** | Prefetch policy partially generic |
| `services/acp/permissions.ts` | 88 | WanD bundled business MCP auto-allow | **MIXED** | Permission template per package |
| `services/acp/workspacePointer.ts` | 11 | `LOCALAPPDATA/CCB-Wanding/.claude` | **MIXED** | Install dir default; should use `CCB_WANDING_HOME` / registry |
| `services/acp/capabilities.ts` | 7, 107 | `source: 'ccb-wanding'` | **P→B** | Capability source should be `packageId` |
| `services/acp/askUserQuestionPermissionResolve.ts` | 6–8 | User-facing CCB-Wanding string | **MIXED** | i18n / product string |
| `ccb-acp-agent/index.js` | 7 | “CCB-Wanding ACP agent” | **MIXED** | Product branding in entrypoint |
| `ccb-acp-agent/agent.js` | 74 | `CCB-Wanding default` mode label | **MIXED** | |

### claude-code-best — `ccb-installer/scripts/` (platform tooling)

| File | Lines | Evidence | Tag | Notes |
|------|-------|----------|-----|-------|
| `build-wanding-lib.ps1` | 90–97 | Default install dirs `D:\CCB-Wanding`, `%LOCALAPPDATA%\Programs\CCB-Wanding` | **MIXED** | WanD **distribution** script — name is product-specific by design |
| `build-wanding.ps1` | 675–678 | `--include-packages com.wanding.trade` | **OK** | Explicit package scope for WanD release build |
| `compile-runtime-config.mjs` | 120–121 | Default `--install-dir D:/CCB-Wanding` | **MIXED** | Dev default; override via CLI |
| `start-dev-full.ps1` | 13–34, 102–148 | WanD dev paths, quotation-agent preflight | **MIXED** | Dev ergonomics for primary vertical |
| `run-wanding-bootstrap.ps1` | 1–25 | WanD bootstrap, `%LOCALAPPDATA%\CCB-Wanding` | **MIXED** | Vertical bootstrap script (expected business-adjacent) |
| `ensure-wanding-settings.ps1` | (name + body) | WanD settings merge | **OK** | Business installer helper under scripts/ |

### claude-code-best — `ccb-installer/patches/` (integration glue)

| File | Lines | Evidence | Tag | Notes |
|------|-------|----------|-----|-------|
| `patches/aionui-acp/acp-agent.js` | 13–325 | `CCB-Wanding`, `CCB_WANDING_MCP_ALL`, `quotation`/`accurate` inject | **P→B** | Route-b patch hardcodes WanD MCP set — target: manifest-driven inject |
| `patches/aionui-ccb-route-b/` | (multiple) | CCB install dir resolution | **MIXED** | Layer 3 glue; product path defaults |

### claude-code-best — `ccb-installer/control-plane/` (platform)

| File | Lines | Evidence | Tag | Notes |
|------|-------|----------|-----|-------|
| `__tests__/control-plane.test.mjs` | 56–90 | Asserts `quotation` MCP URL under `com.wanding.trade` | **OK** | Test uses package id correctly — not platform hardcode in prod code |

### claude-code-best — `AionCore/` (platform services)

| File | Lines | Evidence | Tag | Notes |
|------|-------|----------|-----|-------|
| `crates/aionui-ai-agent/src/idle_scanner.rs` | 9 | Comment “WanD ship default” | **OK** | Comment only |
| `crates/aionui-price-library/` | 4, migrations | “Wanding clients sync” | **MIXED** | Domain naming in org price service — tenant-scoped data |
| `data-org/builtin-skills/officecli-docx/SKILL.md` | 509 | WanD specialist hook example | **OK** | Documentation example |

### aionui-src (read-only) — platform modules

| File | Lines | Evidence | Tag | Notes |
|------|-------|----------|-----|-------|
| `common/config/ccbAgentCatalog.ts` | 18–53 | `CCB_WANDING_KEEP_AGENT_IDS`, `wande-orchestrator`, office presets | **P→B** | ADR §4.4 — replace with AgentRegistry |
| `common/config/ccbAgents.ts` | 6–59 | CCB-Wanding config dir I/O | **MIXED** | Generic CCB adapter; product name in errors |
| `common/config/ccbWandingRuntime.ts` | (module) | Install dir resolution, `CCB_WANDING_HOME` | **MIXED** | Runtime discovery — rename to generic `ccbRuntime` long-term |
| `process/bridge/internalUpdateManifest.ts` | 129–172 | `CCB_WANDING_HOME`, registry `HKCU\Software\CCB-Wanding` | **MIXED** | Update channel for WanD SKU |
| `renderer/components/settings/UpdateModal.tsx` | 145–521 | 万鼎/WanD user strings, `CCB-Wanding-{version}.exe` | **P→B** | Product UI — should be package/branding contribution |
| `renderer/services/i18n/locales/*/settings.json` | multiple | CCB-Wanding, WanD copy | **MIXED** | i18n product strings |
| `common/config/ccbEmployeeProfileSession.ts` | 6–16 | Employee profile for CCB-Wanding sessions | **OK** | Platform feature wired to CCB install |
| `common/config/ccbMemoryFiles.ts` | 6–96 | Memory under CCB-Wanding `.claude/memory/` | **OK** | Platform memory UI; path from runtime resolver |

### Intentionally **not** flagged (business-expected paths)

- `ccb-installer/packages/vertical/com.wanding.trade/**` — vertical package (**business**)
- `ccb-installer/config/agents/*.md` — agent definitions (**business**)
- `python/`, `mcp_servers/quotation*`, `vendor/wanding/` — business modules
- `ccb-installer/config/skills/ccb-subagent-gate/` — cross-agent gates (platform capability used by business)

---

## A2 — Directory ownership table (100% coverage)

Legend: **P** platform · **B** business · **M** mixed (see backlog) · **—** non-product / ignore

### Repository root (claude-code-best)

| Directory | Owner | Rationale |
|-----------|-------|-----------|
| `.agents/`, `.claude/`, `.codex/`, `.cursor/` | — | Tooling / skills; not shipped product |
| `.github/` | **P** | CI, secret scan, governance |
| `.trellis/` | **P** | Specs, tasks, workflow (meta) |
| `AionCore/` | **P** | Org/platform Rust services (price-library tenant-scoped) |
| `ccb-installer/` | **M** | See second-level table below |
| `ccb-wanding-web/` | **B** | WanD web portal |
| `data/` | **B** | WanD business data samples |
| `docs/` | **M** | Platform design + WanD product docs co-located |
| `eval/` | **M** | Platform eval harness + WanD scenarios |
| `mcp_servers/` | **B** | Quotation/accurate MCP implementations |
| `meta-repo/` | — | Submodule pointers |
| `openspec/`, `spec/` | **P** | OpenSpec / legacy spec |
| `packages/` | **P** | Shared npm packages (if any) |
| `portal/` | **B** | Business portal assets |
| `python/` | **B** | Quotation matcher, business logic |
| `scripts/` | **M** | Org-phase0 (P) + WanD ops scripts (B) |
| `skill/` | **M** | Legacy skill copies |
| `Microsoft/`, `node_modules/`, `$tmp`, `.pytest_cache` | — | Vendor / cache |
| `_publish/` | **B** | Release artifacts staging |

### `ccb-installer/` second level

| Directory | Owner | Rationale |
|-----------|-------|-----------|
| `src/` | **M** | Platform ACP runtime + WanD orchestrator rules (A1) |
| `claude-code-b-src/` | **M** | Mirror of dist source; same coupling as `src/` |
| `config/` | **M** | Platform manifests + WanD agent/skill seeds |
| `config/agents/`, `config/skills/` (business subsets) | **B** | WanD agent/skill definitions |
| `packages/vertical/` | **B** | Vertical packages (`com.wanding.trade`, pilots) |
| `packages/platform/` | **P** | Platform package stubs (if present) |
| `control-plane/` | **P** | Tenant projection API |
| `scripts/` | **M** | Build (P) + WanD bootstrap/install (B/M) |
| `patches/` | **M** | Route-b / ACP integration glue |
| `resources/` | **M** | Platform templates + WanD memory/commands |
| `seed/` | **M** | Ship manifest + business seed |
| `vendor/` | **B** | WanD vendor payloads, MCP binaries |
| `installer-wanding-v2.nsi`, `build-wanding.ps1` | **B** | WanD SKU installer (product-specific) |
| `tests/`, `fixtures/` | **M** | Platform tests with WanD fixtures |
| `dist/`, `out/`, `staging/`, `node_modules/` | — | Build output |
| `deploy/`, `launcher-src/`, `lib/`, `bin/`, `portal/`, `web-data/` | **M** | Ship / launcher (product-bound today) |
| `ccb-zhangyu/` | **B** | Zhangyu vertical / legacy product slice |
| `docs/` (under ccb-installer) | **M** | Installer-local docs (packaging, dev notes) |

### aionui-src (read-only, separate repo)

| Directory | Owner | Rationale |
|-----------|-------|-----------|
| `packages/desktop/src/common/` | **M** | Platform shell + CCB-Wanding adapters |
| `packages/desktop/src/process/` | **M** | IPC bridges, WanD update/install |
| `packages/desktop/src/renderer/` | **M** | Generic UI + WanD-branded settings/update |
| `packages/mobile/`, other packages | **P** | Non-CCB surfaces |
| `patches/`, route-b sync targets | **M** | Integration layer |

---

## Summary counts (A1 platform-path hits)

| Tag | Count (representative rows) | Action |
|-----|----------------------------|--------|
| **P→B** | ~12 modules/files | Backlog — migrate to package or registry |
| **MIXED** | ~18 files | Backlog — `transition-ok` where intentional |
| **OK** | Vertical paths, tests, comments | No action |

## Manual review requested

Disputed / judgment calls for user confirmation:

1. **`ccb-installer/scripts/build-wanding*.ps1`** — classify as **B** (WanD product pipeline) vs **M** (shared platform build lib)?
2. **`AionCore/aionui-price-library`** — **P** (multi-tenant org service) vs **B** (WanD-named domain)?
3. **Orchestrator guardrails in `agentSessionProfile.ts`** — stay **M** on platform until generic policy engine, or move to package hook?
