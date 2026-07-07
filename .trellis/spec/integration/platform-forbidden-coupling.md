# Platform Forbidden Coupling — Enforcement Rules

> **Status:** Active (P0 — task `07-03-p0-security-boundary`)  
> **Authority:** [`docs/platform-system-business-decoupling-optimization.md`](../../../docs/platform-system-business-decoupling-optimization.md) §21  
> **Related:** [`platform-vertical-packages.md`](./platform-vertical-packages.md), [`platform-identity-schema.md`](./platform-identity-schema.md)

Platform core must remain **business-agnostic**. WanD (and future customers) ship as **vertical packages**, not as hardcoded names in platform code.

---

## 1. Platform paths (enforce in review + future lint)

These paths are **platform** layers. They must not introduce customer-specific identity:

| Path | Role |
|------|------|
| `ccb-installer/src/` (ACP, services, not `config/agents/`) | Runtime / platform |
| `AionCore/` (when present) | Org / platform services |
| `aionui-src/` platform modules (not business seed) | Desktop shell |
| `.github/workflows/` | CI / governance |

**Allowed in platform code:**

- Generic descriptors: `packageId`, `capabilityId`, `tenantId`, `agentId` from registry
- Legacy **alias maps** loaded from config (transition only; must be documented)

**Forbidden in platform code (new additions):**

| Category | Examples (WanD) |
|----------|-----------------|
| Customer / product names | `WanD`, `Wanding`, `万鼎`, `VANTSING` |
| Fixed business Agent IDs | `wande-orchestrator`, `quotation-agent`, `accurate-agent` |
| Fixed business MCP server names | `quotation`, `accurate`, `price-library` as **branch keys** |
| Fixed knowledge slugs | `wanding_business_knowledge`, fixed 8-slug lists |
| Fixed install paths | `D:\CCB-Wanding\`, `vendor/wanding/` as **required** platform paths |
| Business credentials | AOL tokens, ERP secrets, `JWT_SECRET` values in tracked files |

**Expected location for WanD specifics today (until P3 package extract):**

- `ccb-installer/config/agents/`
- `ccb-installer/config/skills/`
- `python/`, `mcp_servers/` business modules
- `vendor/wanding/` payloads
- Vertical-bound manifests under `ccb-installer/config/` (health, seed)

---

## 2. Configuration single source of truth

1. Agent–MCP–Skill relationships must have **one declarative source** (manifest or generated registry).
2. Projections (`settings.json`, sidecars, health manifest, UI catalog) must be **generated or validated** — not independently edited.
3. Manual edits to generated files must be caught by drift detection (P2).

---

## 3. Tenant scope

1. New control-plane tables, APIs, audit events, and uniqueness constraints must include **`tenant_id`** (or documented global platform scope).
2. Cross-tenant reads/writes are forbidden without explicit platform-admin tooling.

---

## 4. Secrets

1. **No secret values** in git, manifests, logs, health probe output, or client-shipped JSON.
2. Use `secret://` references or gitignored local files (see `.mcp.json.example`, `scripts/org-phase0/env.local.example`).
3. Tracked templates use `CHANGE_ME` / `YOUR_*` placeholders only.
4. CI: [`.github/workflows/secret-scan.yml`](../../../.github/workflows/secret-scan.yml) (gitleaks).

---

## 5. Package lifecycle

1. Each vertical package must be **disable-able** without preventing platform startup (target: P3).
2. Platform upgrades must not overwrite tenant-owned or package-owned business data.
3. Package upgrades require compatibility check, migration, health, and rollback path.

---

## 6. New work triage

Before implementing a feature, classify:

| Bucket | Action |
|--------|--------|
| Platform capability | Generic API/registry; no customer names |
| Platform capability package | e.g. Office, research — separate package id |
| Vertical package (`com.*`) | WanD or customer business |
| Tenant config | Per-company policy, secrets refs |
| One-off script | Deprecate toward manifest generation |

---

## 7. Review checklist (PR template addendum)

- [ ] No new customer Agent ID / MCP name / slug in platform `src/`
- [ ] No secret values in diff
- [ ] If touching Agent-MCP mapping: single source updated or generation script run
- [ ] If adding health/install requirements: scoped to package manifest, not platform core branch

---

## 8. Changelog

| Date | Change |
|------|--------|
| 2026-07-05 | SB-13: `lint-platform-forbidden-coupling.mjs` + CI workflow `forbidden-coupling.yml`; baseline at `ccb-installer/config/lint/platform-forbidden-coupling.baseline.json` |
| 2026-07-05 | SB-01: ACP `packageRegistry.ts` loads default router / fleet sets from registry snapshot + `agent-fleet.defaults.json` |
| 2026-07-03 | Initial P0 rules from platform decoupling design §21 |
