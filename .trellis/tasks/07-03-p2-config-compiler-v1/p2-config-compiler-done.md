# P2 Config Compiler, Provenance, and Drift — Done Record

**Task:** `07-03-p2-config-compiler-v1`
**Date:** 2026-07-03
**Parent:** `07-03-platform-business-decoupling`
**Verification profile:** Security

## Delivered

| Workstream | Status | Evidence |
|------------|--------|----------|
| P2-A layer/merge policy | done | `runtime-config-compiler.mjs`; layer schema |
| P2-B secret references | done | platform/package secret paths; local resolver |
| P2-C desired/observed | done | tenant desired state + observed-state projection |
| P2-D compiler v1 | done | deterministic compiler + CLI |
| P2-E adapters | done | settings, Agent, health projections |
| P2-F provenance/drift | done | redacted field provenance + hash checks |
| P2-G legacy bridge | done, opt-in | atomic apply + `-CompiledSettingsPath` |

## TDD evidence

Initial RED:

```text
ERR_MODULE_NOT_FOUND:
ccb-installer/scripts/lib/runtime-config-compiler.mjs
```

GREEN:

```text
PASS merge precedence and locked paths
PASS safe user overrides
PASS secret references and provenance
PASS registry-derived projections
PASS projection drift
PASS tracked files contain no literal credentials
PASS 6/6 runtime config compiler tests
```

P1 regression:

```text
PASS 3/3 package registry tests
Registry lint: 0 errors; existing 10 ownership warnings
```

## Projection and drift evidence

Fixture compile:

```text
Projections: settings=7 MCP, agents=4, health=7
[OK] settings
[OK] agents
[OK] healthPlan
```

After manually editing generated `settings.json`:

```text
[DRIFT] settings
drift_exit=2
```

Unresolved secret apply:

```text
Compiled settings contain unresolved secret:// references
exit=1
```

Scoped literal-credential scan:

```text
scoped_literal_secret_hits=0
```

The final tracked-input audit also removed credential injection from all three
CCB launchers, both local launch helpers, the legacy MCP bootstrap, and the
process-manager configuration. Runtime credentials now come from the
environment, compiled settings, or an existing local settings file. The
regression test covers all nine tracked configuration inputs.

`gitleaks` is not installed locally; repository CI remains the full-history
secret-scan authority.

## Live parity and runtime evidence

The compiler was run with an ephemeral local secret map derived from current
live settings. The file was deleted immediately and no secret value was printed
or persisted in task artifacts.

```text
Legacy parity: 0 difference(s)
```

Source-tree default invocation is now guarded:

```text
source_guard_exit=1
live_unchanged=True
```

During verification, the legacy bootstrap was found to overwrite an existing
`AionUi-Dev` org-session profile with `AionUi`, causing price-library HTTP 401.
The profile resolution now preserves existing settings unless an environment
override is supplied.

After restoring the correct profile:

```text
price-library probe: PASS 1/1
full MCP probe: PASS 5/5 servers
```

## Packaging evidence

An isolated staging build was run under `D:\tmp` with existing CCB/AionUI
artifacts and a fresh MCP dependency install:

```text
staging validation OK (manifest-driven: 38 files + Route B + app.asar)
[OK] Staging complete
```

The first attempt intentionally skipped MCP pip on a fresh staging directory
and failed for missing Office/Excel site-packages. Re-running without that
invalid skip populated dependencies and passed. Pip reported pre-existing
dependency resolver conflicts in the bundled Python environment; the
manifest-driven gate and live MCP 5/5 passed. A fully rebuilt release/NSIS is a
later human release gate, not claimed here.

After the tracked secret-bearing settings file was removed, P2 added the safe
replacement `resources/settings/settings.example.json`. Staging explicitly
excludes any developer-local ignored `settings.json`, then projects the example
to the packaged runtime name.

```text
staged_safe_settings_equal=True
staged_literal_secret_hits=0
required_missing=0
staged compiler fixture/drift verification=PASS
```

## Safety boundary

- Compiled settings remain opt-in.
- Existing installer/update callers pass explicit `-InstallDir`.
- No automatic overwrite of live settings was added.
- Making compiled settings the default requires the human P2 checklist.
