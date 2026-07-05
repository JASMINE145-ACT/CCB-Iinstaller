# Platform / Business Boundary Map — Daily Dev Guide

> **Status:** Active (task `07-05-platform-business-architecture-separation`)  
> **Authority:** [`platform-vertical-packages.md`](./platform-vertical-packages.md) (ADR) · [`platform-forbidden-coupling.md`](./platform-forbidden-coupling.md)  
> **Design:** [`docs/platform-system-business-decoupling-optimization.md`](../../../docs/platform-system-business-decoupling-optimization.md) §17  
> **Audit evidence:** [`.trellis/tasks/07-05-.../research/residual-coupling-audit.md`](../../tasks/07-05-platform-business-architecture-separation/research/residual-coupling-audit.md)

Use this doc when you need to know **where a path belongs** and **how to classify a change** in under 30 seconds.

---

## 1. Layer diagram

```text
┌─────────────────────────────────────────────────────────────────┐
│ Platform Core (P)                                               │
│  AionUI shell · AionCore · CCB ACP runtime · control-plane      │
│  Registry · compiler · tenant · health executor · route-b glue  │
└────────────────────────────┬────────────────────────────────────┘
                             │ loads
┌────────────────────────────▼────────────────────────────────────┐
│ Vertical Package (B)  e.g. com.wanding.trade                    │
│  agents/ · mcp/ · knowledge/ · skills/ · health/ · evals/       │
└────────────────────────────┬────────────────────────────────────┘
                             │ configured per
┌────────────────────────────▼────────────────────────────────────┐
│ Tenant (P) — tenant_id, secrets refs, policy, members           │
└─────────────────────────────────────────────────────────────────┘

Integration (M) = route-b patches, WanD installer scripts, dev bootstrap
```

**Rule:** Platform **must not** add new hardcoded WanD agent IDs, MCP names, or slugs in `ccb-installer/src/`, `AionCore/` prod code, or aionui **generic** modules. Use `packageId`, `agentId`, `capabilityId` from registry.

---

## 2. Directory quick reference

### claude-code-best — top level

| Path | Layer | Notes |
|------|-------|-------|
| `AionCore/` | P | Org/platform Rust services |
| `ccb-installer/src/` | M | Platform ACP; WanD orchestrator rules remain (transition) |
| `ccb-installer/packages/vertical/` | B | Vertical packages |
| `ccb-installer/config/agents/`, `config/skills/` | B | WanD seeds (pre-install) |
| `ccb-installer/control-plane/` | P | Tenant MCP projection |
| `ccb-installer/scripts/build-wanding*.ps1`, `installer-*.nsi` | B/M | WanD **product** release pipeline |
| `ccb-installer/scripts/compile-runtime-config.mjs` | P | Config compiler |
| `ccb-installer/patches/` | M | Layer 3 integration |
| `ccb-installer/ccb-zhangyu/`, `ccb-installer/docs/` | B/M | Product slice / installer docs |
| `python/`, `mcp_servers/`, `vendor/wanding/`, `data/` | B | Business logic & payloads |
| `docs/platform-*.md`, `.trellis/spec/` | P/M | Architecture & specs |
| `docs/ccb-wanding-*.md`, `ccb-wanding-web/` | B | Product docs & web |

Full table: audit doc **A2**.

### aionui-src (separate repo)

| Path | Layer | Notes |
|------|-------|-------|
| `packages/desktop/src/renderer/` (generic chat, layout) | P | UI shell |
| `packages/desktop/src/common/config/ccb*.ts` | M | CCB adapter; agent catalog still WanD-coupled |
| `packages/desktop/src/process/bridge/ccb*.ts` | M | IPC to CCB install |
| WanD-branded update/settings copy | B | Target: package UI contribution |

---

## 3. Change classification — decision tree

Answer in order. First match wins unless noted.

```text
Q1. Does the change ONLY touch paths under
    packages/vertical/<packageId>/, config/agents/, config/skills/ (business),
    python/, mcp_servers/, vendor/wanding/, or business docs?
    YES → BUSINESS (vertical). Stop.
    NO  → Q2

Q2. Does it add/rename a customer agent ID, MCP server name, knowledge slug,
    or product string in ccb-installer/src/, AionCore/ (non-test),
    aionui generic modules, or .github workflows?
    YES → NEEDS SPLIT — platform hook + business manifest. Stop.
    NO  → Q3

Q3. Is it registry, manifest schema, compiler, tenant_id, health executor,
    or generic ACP/session behavior with NO WanD-specific branches?
    YES → PLATFORM. Stop.
    NO  → Q4

Q4. Is it route-b patch, installer, bootstrap, dev script, or i18n
    that assumes CCB-Wanding install layout?
    YES → MIXED (integration / product glue). Mark transition-ok if intentional.
    NO  → Q5

Q5. Does it move data or policy between platform and a vertical package?
    YES → NEEDS SPLIT — update manifest + compiler; see separation backlog.
    NO  → PLATFORM (default for shared infra) or ask in #platform-architecture
```

### Bucket definitions

| Bucket | Merge policy | Examples |
|--------|--------------|----------|
| **PLATFORM** | Generic; no customer names in `src/` | Registry lint, tenant API, ACP protocol fix |
| **BUSINESS** | Inside `com.wanding.trade` or business dirs | quotation-agent.md, match_quotation MCP |
| **MIXED** | Allowed short-term with `transition-ok` | `wanDMcpWarmup.ts`, dev bootstrap scripts |
| **NEEDS SPLIT** | Do not ship as single-layer PR | New hardcoded agent ID in `ccbAgentCatalog.ts` |

---

## 4. Curated commit walkthrough (AC3)

Five recent commits classified through the decision tree:

| # | Commit | Type | Tree path | Result |
|---|--------|------|-----------|--------|
| 1 | `4b95289a` — `Ensure-WandingDistVersion` in build/bootstrap/dev scripts | 平台脚本 | Q4 → dev/install glue with WanD defaults | **MIXED** |
| 2 | `0ae52199` — `ccb-personal-memory` skill + agent hook wiring | 业务 Agent | Q1 → vertical + config/skills | **BUSINESS** |
| 3 | `813040a` (aionui-src) — `UpdateModal.tsx` CCB installer download | UI | Q2/Q4 → WanD product strings | **NEEDS SPLIT** |
| 4 | `4fb903a7` — install-health manifest, package.json, NSIS backlog | 配置 manifest | Q3 → registry/health descriptors | **PLATFORM** |
| 5 | `355d6dc2` — Trellis spec + task docs 07-04–07-07 | 文档 | Q3 → meta docs | **PLATFORM** |

Evidence file: [`research/decision-tree-curated-commits.md`](../../tasks/07-05-platform-business-architecture-separation/research/decision-tree-curated-commits.md)

---

## 5. Naming conventions (pointer)

| ID type | Pattern | Doc |
|---------|---------|-----|
| Package | `com.{company}.{domain}` | [`platform-identity-schema.md`](./platform-identity-schema.md) |
| Agent | `{role}-agent` in package manifest | ADR §4.4 |
| MCP | Declared in package `mcpServers[]` | [`package-manifest-schema.md`](./package-manifest-schema.md) |
| Tenant | `tenant_id` on all new control-plane rows | ADR §4.1 |

---

## 6. When to read other docs

| Situation | Read |
|-----------|------|
| Adding a vertical package | [`platform-vertical-packages.md`](./platform-vertical-packages.md) §4.3 |
| PR review — forbidden coupling | [`platform-forbidden-coupling.md`](./platform-forbidden-coupling.md) §7 |
| Migrating a mixed item | [`separation-backlog.md`](../../tasks/07-05-platform-business-architecture-separation/research/separation-backlog.md) |
| 07-03 scope already done | Do not re-audit manifest/registry/compiler |

---

## Changelog

| Date | Change |
|------|--------|
| 2026-07-05 | Initial boundary map from 07-05 audit (Scenario E) |
