# Test Records — 07-05 Scenario E (zero behavior change)

**Date:** 2026-07-05

## AC5 — Registry lint + Platform install-health

### Registry lint

```text
Command: node ccb-installer/scripts/build-package-registry.mjs
Result: Registry: 2 package(s), 0 error(s)
Warnings: orphan-agent/skill (pre-existing, non-blocking)
```

### Platform install-health

```text
Command: powershell -File ccb-installer/scripts/test-install-health.ps1 -Profile Platform -InstallDir D:\CCB-Wanding
Result: PASS install health complete
```

Note: Running against repo root `ccb-installer/` without `-InstallDir` fails (incomplete dev tree) — expected. Live install path is authoritative per 07-03.

### Zero source diff

```text
Command: git status --short
Result: Only .trellis/ docs changes; no ccb-installer/src/ modifications
```

## AC3 — Decision tree

See `research/decision-tree-curated-commits.md` — 5/5 classifiable.

## P5 manufacturing pilot test (optional regression)

```text
Command: node ccb-installer/scripts/__tests__/p5-manufacturing-pilot.test.mjs
Result: 4/5 pass; 1 fail (dual-package compile — missing secret://platform/research/exa-api-key in env)
Note: Pre-existing env dependency; registry-owned test (test 1) PASS; not introduced by 07-05 docs.
```
