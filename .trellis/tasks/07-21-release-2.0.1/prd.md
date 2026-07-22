# PRD — CCB-Wanding 2.0.1 Full NSIS

| Field | Value |
|-------|--------|
| **Baseline** | 2.0.0 (`07-18-release-2.0.0` / `delivery-2.0.0-2026-07-18.md`) |
| **Build path** | Full NSIS |
| **config_generation** | **8 → 9** |

## Must retain from 2.0.0 (install compat)

| Contract | Mechanism |
|----------|-----------|
| `WANd.INSTALL.STALE_PURGE.001` | NSI `DirectoryLeave` + silent Call + Start Menu list/purge + `$shipScripts` |
| `WANd.INSTALL.RESOLVE.001` | aionui InstallDir resolve (Programs + registry) in AionUi pack |

Preflight: `test-purge-packaging-wiring.ps1` PASS · `test-purge-stale-wanding-installs.ps1` PASS.

## Delta vs 2.0.0 (product)

- Quotation: learn-by-data select-first · multi-code inventory batch · relay/select wire
- Accurate: readonly convergence / ROE profile
- Matcher: field-rule `/` phrase parse (Elbow 3" AW)
- Agent L1 / skills / hooks as currently in packages + seed deploy path

## Non-goals

- Dropping or rewriting stale-purge UX
- Hot-zip-only ship (this release = Full NSIS)
