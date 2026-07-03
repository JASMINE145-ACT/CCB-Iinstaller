# Platform + Vertical Packages — Architecture Record

> **Status:** Architecture decision record (ADR-style), captured 2026-06-22 from design exploration.  
> **Not ops SOP** — for product/engineering alignment before a formal OpenSpec change.  
> **Related discussion doc:** [`docs/ccb-wanding-platform-architecture.md`](../../../docs/ccb-wanding-platform-architecture.md) (runtime planes, Phase 2+ center MCP).  
> **Short index:** [`platform-architecture.md`](./platform-architecture.md)

---

## 1. Core judgment

The system already has a **platform shell**, but in practice ships as:

> **Generic desktop runtime + deeply embedded WanD business distribution**

WanD should become **`com.wanding.trade`** (a vertical package), not the platform itself.

```
┌─────────────────────────────────────────────────────────────┐
│  Today                                                      │
├─────────────────────────────────────────────────────────────┤
│   ┌────────────── Platform Shell ──────────────┐            │
│   │ AionUI · aioncore · route-b · CCB ACP      │  ← reuse  │
│   └──────────────────┬─────────────────────────┘            │
│                      │ welded                               │
│   ┌──────────────────▼─────────────────────────┐            │
│   │ WanD vertical (hardcoded across layers)     │            │
│   │ · 8 org slugs · 3 agent IDs · quotation MCP │            │
│   │ · AOL creds · wanding data · migration keep │            │
│   └────────────────────────────────────────────┘            │
│                                                             │
│   Center org :13401 ≈ single-org service (no tenant_id)     │
└─────────────────────────────────────────────────────────────┘
```

**Do not overturn:** the four-layer chain remains platform core:

```text
AionUI → aioncore → route-b → CCB Runtime
```

ACP boundary, source-first fixes, stable `error_code`, agent eval, MCP health, and local task APIs are **platform assets**. Change **config authority, tenant, package ownership, and credential placement** — not the runtime stack.

---

## 2. Evidence — where WanD is coupled today

| Coupling | Evidence |
|----------|----------|
| Fixed org knowledge slugs (8) | [`org-knowledge.md`](./org-knowledge.md) L85; `AionCore/crates/aionui-org-knowledge/` — query by `slug`, **no `tenant_id`** |
| Agent IDs in runtime rules | `aionui-src/.../ccbAgentCatalog.ts`: `CCB_WANDING_KEEP_AGENT_IDS`, `wande-orchestrator`, `quotation-agent`, `accurate-agent` |
| Migration protects WanD agents | `ccbAgentMigration.ts` — `CCB_WANDING_KEEP_AGENT_IDS`, specialist sort order |
| MCP health bound to agent names | `ccbMcpHealthManifest.ts` — per-agent `required_mcp` |
| Monolithic `settings.json` | [`../backend/config-layer.md`](../backend/config-layer.md) L20–38 — MiniMax + quotation + accurate + excel + office-word |
| Installer ships platform + business | [`wanding-packaging-whitelist.md`](./wanding-packaging-whitelist.md), `ensure-wanding-settings.ps1` |
| Center org = single tenant | Org SQLite; no `tenant_id` on users, knowledge, audit |
| SSO symmetric `JWT_SECRET` on clients | [`unified-org-sso-rollout.md`](./unified-org-sso-rollout.md) — acceptable **Phase 0 single org**; **not** multi-company safe (client can verify/sign with shared secret) |
| Neon cache (third leg) | [`config-layer.md`](../backend/config-layer.md) L52 — quotation matcher; package-specific today |

**Platform overview (runtime planes):** [`docs/ccb-wanding-platform-architecture.md`](../../../docs/ccb-wanding-platform-architecture.md) §1–§10.

---

## 3. Target architecture

### 3.1 Layers

```text
Platform Core
├── AionUI desktop shell
├── ACP / aioncore / CCB Runtime
├── Login, tenant, permissions, audit
├── Agent / MCP / knowledge package registry
└── Update, health, version management

Tenant
├── tenant_id / company_id
├── Members, roles, departments
├── Policy & feature flags
└── Isolated data, secrets refs, audit space

Vertical Package (e.g. com.wanding.trade)
├── package.manifest.json
├── agents/
├── mcp/
├── knowledge/
├── ui/
├── policies/
├── migrations/
└── evals/

Connector
├── Accurate / ERP / CRM
├── Quotation & inventory
└── Office, local files
```

### 3.2 Package examples

| Package | Contents |
|---------|----------|
| `com.wanding.trade` | quotation, inventory, accurate, wanding-knowledge |
| `com.company-b.manufacturing` | (future) |
| `com.company-c.logistics` | (future) |

### 3.3 Phase A deployment (recommended first)

**Control-plane multi-tenant interfaces + physically separate deploy per company** — safer than one shared center holding all ERP credentials and business data on day one.

```text
Phase A (near term)
  Per company: own VPS org instance · own JWT realm · own SQLite
  Platform code: TenantContext exists; default tenant_id = 1

Phase B (later)
  Shared control plane · tenant_id isolation · shared ops
```

Aligns with [`docs/ccb-wanding-platform-architecture.md`](../../../docs/ccb-wanding-platform-architecture.md) §10.2 (center MCP, credentials off desktop).

---

## 4. Required changes (nine areas)

### 4.1 Tenant model

All center data gains at minimum:

| Field | Purpose |
|-------|---------|
| `tenant_id` | Isolation |
| `package_id` | Which vertical owns the row |
| `environment` | prod / staging |
| `created_by` | Audit |
| `version` | Optimistic concurrency |

Applies to: membership, knowledge docs, agent config, MCP config, audit logs, business data. **Unique constraints and queries must include `tenant_id`.**

### 4.2 Split config authority

Today one CCB `settings.json` holds too much. Target layout:

| File | Role |
|------|------|
| `config/platform.json` | Platform defaults |
| `config/user-preferences.json` | User UI prefs |
| `tenants/{tenantId}/tenant.json` | Tenant policy |
| `tenants/{tenantId}/secrets.refs.json` | Pointers to server-side secrets |
| `packages/{packageId}/manifest.json` | Package declaration |
| `packages/{packageId}/runtime.json` | MCP spawn refs for this package |

**Platform config must not hardcode `quotation`, `accurate`, or `AOL_*`.**

**Migration note:** Split gradually; route-b / `ensure-wanding-settings.ps1` may emit multiple files then merge into CCB-compatible shape during transition.

### 4.3 Business package manifest

Install, upgrade, uninstall, and compatibility checks revolve around manifest — not PowerShell enumerating WanD files one by one.

```json
{
  "id": "com.wanding.trade",
  "version": "1.0.0",
  "agents": [],
  "mcpServers": [],
  "knowledgeCollections": [],
  "uiContributions": [],
  "permissions": [],
  "healthChecks": [],
  "migrations": [],
  "evalSuites": []
}
```

**P0 scope:** descriptive manifest + registry types only. **P1:** installer reads manifest to stage/unstage.

### 4.4 Agent registry (replace hardcoded IDs)

Remove runtime dependence on:

- `wande-orchestrator`
- `quotation-agent`
- `accurate-agent`
- `CCB_WANDING_KEEP_AGENT_IDS`

Replace with:

- `AgentRegistry`
- `PackageAgentDescriptor`
- `TenantAgentPolicy`

“Direct specialist session”, delegatable targets, MCP allowlist, Guid card visibility → **package metadata**, not scattered `ccbAgentCatalog.ts` constants.

**P0:** registry + **legacy ID aliases** for compatibility.

### 4.5 Knowledge — dynamic collections

Replace fixed 8 `wanding_*` / `ccb-wanding-*` slugs and special `wanding_business_knowledge` sync paths with:

```text
GET /api/tenants/{tenantId}/knowledge-collections
GET /api/tenants/{tenantId}/knowledge-documents/{documentId}
```

Document fields: `package_id`, `schema_version`, visible roles, sync policy. Platform does not recognize `wanding_*` slugs.

**P0.5 (recommended):** parallel v2 API alongside legacy slug API until clients migrate.

### 4.6 MCP serviceization & credential isolation

Move quotation, inventory, Accurate **off employee machines** over time:

| Rule | Detail |
|------|--------|
| Server holds ERP/AOL credentials | Not in installer / `sso.env` / MCP `env` |
| Client gets short-lived tokens | Scoped by tenant + user + tool |
| MCP Gateway | AuthZ on every tool call |
| Local MCP retained | Office, local files |
| Failure policy | Inventory fail-closed; price cache read-only degrade (existing policy) |

See [`docs/ccb-wanding-platform-architecture.md`](../../../docs/ccb-wanding-platform-architecture.md) §7, §10.2.

### 4.7 Identity — OIDC / JWKS (multi-company)

Do **not** distribute shared symmetric `JWT_SECRET` to employee PCs for multi-tenant production.

| Mechanism | Role |
|-----------|------|
| OIDC/OAuth2 | Login |
| Server private key | Sign tokens |
| JWKS | Client + local aioncore verify only |
| Token claims | `tenant_id`, roles, permissions, `aud` |
| Tool calls | Re-check tenant + permission server-side |

**Relation to shipped work:** [`unified-org-sso-rollout.md`](./unified-org-sso-rollout.md) is **single-org Phase 0** — valid for WanD v1.x ship; **must change before second company**.

### 4.8 Frontend contribution points

AionUI provides generic containers only:

| Contribution | Example |
|--------------|---------|
| `AgentCardContribution` | Guid preset cards |
| `SettingsPageContribution` | Package settings tabs |
| `KnowledgePageContribution` | Org knowledge UI |
| `ToolStatusContribution` | MCP health rows |
| `NavigationContribution` | Menu entries |

“万鼎账务专家”, “报价专家” come from **`com.wanding.trade`**, not hardcoded Guid / migration / settings code.

**Order:** backend registry + config split before full dynamic UI (P2).

### 4.9 Install & update decoupling

From one monolithic WanD EXE to:

```text
Platform installer
+ platform version updates (see internal-update.md)
+ vertical package install/update
+ tenant config push
```

Platform upgrade must **not** overwrite tenant knowledge, secrets, or installed packages. Package upgrade requires version, migrations, rollback.

Existing hot-update path: [`internal-update.md`](./internal-update.md), [`wanding-first-ship.md`](./wanding-first-ship.md) §5.2.1 — applies to **platform `dist/`** today; package-level zip is a **next layer**.

---

## 5. Assets that should stay local

Even in target architecture:

| Asset | Reason |
|-------|--------|
| `memory/` personal prefs | Privacy, per-user |
| Chat transcripts | Privacy, volume |
| Office / local file MCP | Must touch desktop |
| Optional read-only price cache | Offline degrade |

Center MCP ≠ move everything to cloud.

---

## 6. Implementation order

| Phase | Scope | Notes |
|-------|--------|-------|
| **P0** | Boundaries: Manifest (descriptive), `TenantContext`, `AgentRegistry`, `McpRegistry`; **keep legacy IDs as aliases** | Do **not** rewrite installer yet |
| **P0.5** | Knowledge API v2 parallel to slug API | Avoid rework in P1 agent/MCP |
| **P1** | Extract `com.wanding.trade`: agents, MCP, SOP, knowledge, evals, health checks | Content in package dirs; scripts may still stage |
| **P2** | Frontend dynamic: cards, menus, settings from registry | After P0 registry stable |
| **P3** | Center MCP + OIDC/JWKS; credentials leave client | Security gate for fleet |
| **P4** | **Second company pilot** — different business domain | Proves no hidden WanD coupling |

**Critical:** P4 is not optional validation — renaming WanD files into a folder does not prove platform generality.

---

## 7. Relation to other work

| Work | Relationship |
|------|----------------|
| `unified-org-sso` (shipped 2026-06-22) | Single-org login hardening — **not** platform multi-tenant |
| `internal-update` / v1.0.x ship | Platform hot-update — compatible; package updates are additive |
| [`docs/ccb-wanding-platform-architecture.md`](../../../docs/ccb-wanding-platform-architecture.md) | Runtime planes + center MCP direction — this doc adds **package/tenant product model** |
| Future OpenSpec | Suggested change id: `platform-vertical-packages` |

---

## 8. Open questions (for next design pass)

1. Is Neon a **WanD connector only** or a **platform cache abstraction**?
2. Package uninstall: orphan tenant knowledge or soft-delete with retention policy?
3. `com.wanding.trade` — still bundle local Office MCP, or split `com.platform.office` connector?
4. Per-company VPS (Phase A) vs shared control plane — ops cost vs isolation tradeoff for company #2.

---

## 9. Changelog

| Date | Change |
|------|--------|
| 2026-07-03 | P0 red lines: [`platform-forbidden-coupling.md`](./platform-forbidden-coupling.md), [`platform-identity-schema.md`](./platform-identity-schema.md), secret-scan CI; tracked secrets removed from git (task `07-03-p0-security-boundary`) |
| 2026-06-22 | Initial record from architecture exploration (platform vs vertical, nine change areas, P0–P4, evidence table) |

---

## 10. P0 security & boundary freeze (2026-07-03)

**Epic:** `.trellis/tasks/07-03-platform-business-decoupling` · **Task:** `07-03-p0-security-boundary`

### Non-negotiables (active now)

1. **Four-layer chain is not rewritten** — `AionUI → aioncore → route-b → CCB Runtime` stays platform core.
2. **No new WanD hardcoding** in platform `ccb-installer/src/` — see [`platform-forbidden-coupling.md`](./platform-forbidden-coupling.md).
3. **No secrets in git** — `.mcp.json`, `.env.accurate`, `scripts/org-phase0/env.local` are gitignored; use `*.example` templates; CI gitleaks on PR/push.
4. **Rotate exposed credentials** — files were previously tracked; treat git history as compromised (ops action, not spec content).

### P0 vs later phases

| P0 (this task) | Deferred |
|----------------|----------|
| Secret removal + scan + forbidden-coupling spec | Registry implementation (P1) |
| Identity naming policy | Config compiler (P2) |
| Baseline audit + MCP probe evidence | `com.wanding.trade` extract (P3) |
| | OIDC/JWKS (P4) |

**Design doc alignment:** [`docs/platform-system-business-decoupling-optimization.md`](../../../docs/platform-system-business-decoupling-optimization.md) Phase 0.

