# Execution Plan — `07-21-release-2.0.1`

| Field | Value |
|-------|--------|
| **Status** | **completed** — BUILD_EXIT 0 · exe ready |
| **Active phase** | closeout |
| **Scenario** | **J** (release) |
| **Plan depth** | **Lite** |
| **Verification profile** | **Release** |
| **Baseline** | 2.0.0 + F0a/F0b install compat |

## Skills invoked (this session)

| Invocation | Type | Evidence |
|------------|------|----------|
| Phase -1 / release gate | Read: | `wanding-release-standard.md` §0·§2·§5·§6 · packaging whitelist via build `$shipScripts` |
| Scenario J | Read: | rule `.cursor/rules/wanding-release-packaging.mdc` |
| Preflight | Shell: | `test-purge-packaging-wiring.ps1` PASS |

## Contract map (lite)

- **touches:** `WANd.INSTALL.STALE_PURGE.001` · `WANd.INSTALL.RESOLVE.001` · docs-only/no-runtime-contract (version bump) · product deltas via seed/vendor
- **Behavior protected:** 2.0.1 installer still detects/purges stale trees; Programs InstallDir resolve; gen 9 agent refresh
- **GREEN:** `CCB-Wanding-2.0.1.exe` exists + SHA256 in delivery note; staging VERSION=2.0.1; gen 9 in staging seed
- **Manual smoke:** cold/upgrade install on other PC (post-build)

## Progress snapshot

| Phase | State | Evidence |
|-------|-------|----------|
| Preflight F0a wiring | done | packaging-wiring PASS |
| config_gen 9 | done | `seed/config-ship-manifest.json` |
| Full NSIS build | **done** | `CCB-Wanding-2.0.1.exe` BUILD_EXIT=0 |
| Delivery note | **done** | `delivery-2.0.1-2026-07-21.md` SHA256 recorded |

## Contract Verification

| Contract | Verification | Status |
|----------|--------------|--------|
| STALE_PURGE wired | packaging-wiring + NSI spot-check | PASS preflight |
| RESOLVE | inherit AionUi from full/skip build | pending build |
| VERSION 2.0.1 | staging `dist/VERSION` + exe name | pending |
| plan structure | lint optional for Lite | N/A |
