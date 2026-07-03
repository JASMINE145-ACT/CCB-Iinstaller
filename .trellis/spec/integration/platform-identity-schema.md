# Platform Identity & Schema Versioning

> **Status:** Active (P0 — task `07-03-p0-security-boundary`)  
> **Related:** [`platform-vertical-packages.md`](./platform-vertical-packages.md), [`platform-forbidden-coupling.md`](./platform-forbidden-coupling.md)

Stable identifiers for packages, tenants, capabilities, and schema evolution. Use these names in manifests, registry, audit, and APIs from P1 onward.

---

## 1. Identifier formats

| ID | Format | Example | Rules |
|----|--------|---------|-------|
| `tenant_id` | UUID or `tn_` + slug | `tn_wanding_prod` | Globally unique per deployment; never reuse across companies |
| `package_id` | Reverse DNS | `com.wanding.trade` | Stable across versions; lowercase |
| `package_version` | SemVer | `1.2.3` | Manifest `version` field |
| `capability_id` | Dot-separated | `business.pricing.quote` | Platform `platform.*`, business `business.*` |
| `agent_id` | kebab-case slug | `quotation-agent` | Unique within package; legacy IDs map via alias table |
| `skill_id` | Reverse DNS or `{package}.{name}` | `com.wanding.trade.quotation-learn` | |
| `mcp_server_id` | kebab-case | `quotation` | Transport config key; not a capability |
| `collection_id` | slug | `wanding-business-knowledge` | Knowledge registry; replaces fixed slug hardcoding |
| `schemaVersion` | SemVer string | `1.0.0` | Per-artifact JSON Schema version |

---

## 2. Capability naming

```
platform.<domain>.<action>     # e.g. platform.office.word.create
business.<domain>.<action>    # e.g. business.pricing.quote
```

Agents declare **`requiredCapabilities`**, not raw MCP server names, in target manifests (P1+).

---

## 3. Schema versioning policy

1. Every machine-readable artifact includes `schemaVersion` (manifest, tenant config, package lock).
2. **Patch** — backward compatible; consumers may ignore unknown optional fields.
3. **Minor** — additive fields; old consumers continue with defaults.
4. **Major** — breaking; requires migration + compatibility gate in package lifecycle.
5. Reject unknown **required** fields at install/compile time (P2 config compiler).

---

## 4. Legacy aliases (transition)

Until P3 extract completes, maintain a read-only alias map (P1 registry):

| Legacy | Target package | Notes |
|--------|----------------|-------|
| `wande-orchestrator` | `com.wanding.trade` | Default session router |
| `quotation-agent` | `com.wanding.trade` | |
| `accurate-agent` | `com.wanding.trade` | |
| `wanding_business_knowledge` | collection under WanD package | |

Platform code must resolve aliases through registry — not new hardcoded `if (id === 'quotation-agent')` branches.

---

## 5. Audit & logging fields

Structured events should include where applicable:

- `tenant_id`
- `package_id`
- `package_version`
- `capability_id`
- `agent_id`
- `correlation_id`

Never log secret values or full business document bodies in platform audit.

---

## 6. Changelog

| Date | Change |
|------|--------|
| 2026-07-03 | Initial P0 naming policy |
