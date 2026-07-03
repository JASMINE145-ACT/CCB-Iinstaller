# P3 Current Package Boundary Audit

Date: 2026-07-03

## Current state

- `config/packages/com.wanding.trade/package.json` describes four business
  agents, three business MCP servers, one business skill, aliases, and runtime
  secret references.
- The descriptor is not yet a package payload. Its sources still point to
  global `config/agents`, `config/skills`, and `config/mcp-health-manifest.json`.
- WanD runtime data and Python code already have a recognizable legacy payload
  boundary under `vendor/wanding`, but the installer and health manifests treat
  those files as unconditional platform files.
- `resources/install-health-manifest.json` mixes platform runtime files,
  reusable Office tooling, and WanD-only files in one `required_files` array.
- `config/mcp-health-manifest.json` mixes platform/reusable MCP checks with
  quotation, Accurate, price-library, and WanD agent profiles.
- Build and bootstrap scripts still enumerate global agent/skill paths.
- P2 can compile settings, agent projections, and a health plan from a package
  manifest, but package lifecycle state is not yet persisted.

## Ownership decision

Canonical package root:

`ccb-installer/packages/vertical/com.wanding.trade/`

Package-owned:

- WanD orchestrator, quotation, Accurate, and price-library agents/sidecars;
- quotation learn-by-data skill;
- quotation, Accurate, and price-library health/probe descriptors;
- knowledge declarations and the legacy knowledge seed mapping;
- runtime payload mapping for `vendor/wanding` and business MCP servers;
- lifecycle metadata, migration hooks, eval/fixture references.

Platform-owned:

- package registry, config compiler, lifecycle executor, health executor;
- ACP/runtime, Route B, AionUI shell, generic Office/research tooling;
- compatibility adapters that project package content to legacy install paths.

## Migration shape

1. Make the vertical package root the source of truth.
2. Teach registry/build/runtime consumers to read package-root descriptors.
3. Generate or merge legacy-shaped agent/health/install projections during the
   transition; do not maintain duplicate hand-authored business declarations.
4. Add an isolated lifecycle state machine with atomic state and rollback.
5. Split platform health from enabled-package health.
6. Verify both an empty-platform fixture and the current full WanD runtime.

## Risks

- Moving agents can silently break build/deploy scripts with hardcoded
  `config/agents` paths.
- Disabling a package must not delete user data or secrets.
- Package rollback must restore metadata and projections atomically.
- Live install tests must remain read-only unless an explicit sandbox root is
  supplied.
- Office MCP remains platform/reusable for P3; package descriptors may depend
  on it but must not claim ownership.

## Verification candidates

- Node unit tests for package discovery, projection, lifecycle transitions,
  compatibility aliases, and rollback.
- PowerShell install-health tests against synthetic platform-only and full
  layouts.
- Existing registry 3/3 and runtime compiler 6/6 regressions.
- Staging build validation.
- Live `test-mcp-health.ps1 -Probe -Quiet` remains 5/5 after package enable.
