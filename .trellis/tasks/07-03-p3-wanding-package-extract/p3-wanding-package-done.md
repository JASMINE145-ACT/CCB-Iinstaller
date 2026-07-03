# P3 WanD Vertical Package — Done Record

**Task:** `07-03-p3-wanding-package-extract`
**Date:** 2026-07-03
**Verification profile:** Release + Security

## Delivered

| Workstream | Result |
|------------|--------|
| Canonical package | package root owns manifest, agents, skill, knowledge, health, policy, eval, migration, assets |
| Registry/config | canonical discovery; P2 compiler supports lifecycle `state.json` |
| Lifecycle | install, enable, disable, uninstall, upgrade, rollback |
| Health split | platform install/MCP health separated from package health |
| Compatibility | staged legacy agent/skill paths and ID aliases retained |
| Packaging | full staging and partial hot package closure verified |

## TDD evidence

Initial RED:

```text
ERR_MODULE_NOT_FOUND: scripts/lib/package-lifecycle.mjs
ENOENT: config/packages/com.wanding.trade/package.json
```

GREEN:

```text
PASS 3/3 package lifecycle tests
PASS 3/3 package registry tests
PASS 6/6 runtime config compiler tests
PASS deploy-seed-agents prune smoke
PASS 2/2 package health split tests
```

## Empty platform evidence

```text
PASS platform-only health without com.wanding.trade
PASS full health rejects missing com.wanding.trade payload
PASS platform-only live probe 2/2 servers
```

After lifecycle disable, compiler output contained four platform MCPs, zero
business agents, zero WanD package health entries, and retained the installed
package version.

## Lifecycle and projection evidence

All operations used isolated state roots; live package/config state was not
modified.

```text
install revision=1
enable revision=2
disable revision=3
canonical/legacy quotation-agent SHA-256 equal
all projection hashes OK
```

Unit tests also cover upgrade to `1.1.0`, rollback to `1.0.0`, disabled-only
uninstall, and invalid transitions.

## Packaging evidence

Fresh staging build:

```text
staging validation OK
manifest-driven: 39 platform+package files + Route B + app.asar
```

The build reused pre-existing CCB dist and AionUI unpacked output by explicit
flags and did not claim a source rebuild. MCP pip installation completed; the
shared bundled Python environment still reports the pre-existing dependency
conflict warnings documented in P2.

A quick repeat with preserved dependencies also passed, proving package/config
mirror paths are idempotent.

Hot update:

```text
components: package, seed, scripts
package manifest + legacy agents/skill + lifecycle/compiler closure: PASS
```

## Runtime and security evidence

```text
MCP health composition: 5 platform descriptors + 3 package descriptors
live stdio probe: PASS 5/5 servers
staged package/seed/scripts literal-credential scan: 0 hits
```

## Manual gate

The AionUI install/disable/upgrade/rollback workflow remains a human gate.
Commands and expected behavior are in the parent
`manual-verification-checklist.md`.
