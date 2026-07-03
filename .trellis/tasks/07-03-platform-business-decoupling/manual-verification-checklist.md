# Platform Decoupling — Human Verification Checklist

Complete these checks after automated phases finish. Do not record secrets,
tokens, or private business data in this file.

## P0 — Security operations

- [ ] Rotate all credentials listed in
  `07-03-p0-security-boundary/research/p0-credential-rotation-runbook.md`.
- [ ] Confirm old credentials no longer authenticate.
- [ ] Decide whether repository history rewrite is required.

## P2 — Compiled runtime config

- [ ] Create a gitignored local secret map using the required `secret://` keys.
- [ ] Compile to an isolated directory with real local variables.
- [ ] Review `legacy-parity-report.json`; expected difference count is `0`.
- [ ] Review `provenance.json`; confirm secret references are visible but values are absent.
- [ ] Inspect packaged `resources/settings/settings.json`; confirm it came from
  `settings.example.json` and contains no literal credential.
- [ ] Apply compiled settings to an isolated config directory.
- [ ] Start a new AionUI/CCB session using the isolated config.
- [ ] Exercise quotation, accurate, Word, Excel, and price-library once each.
- [ ] Edit isolated `settings.json`; confirm drift command exits `2`.
- [ ] Restore/recompile; confirm drift returns clean.
- [ ] Approve or reject switching compiled settings from opt-in to default.

## P3 — Vertical package lifecycle

- [ ] Install `com.wanding.trade` into a new non-production lifecycle state root.
- [ ] Enable it and confirm `projections/seed/agents` contains the four WanD
  business agents and `package-runtime.json` names version `0.1.0`.
- [ ] Compile with `--package-state <stateRoot>/state.json`; confirm quotation,
  Accurate, and price-library are present.
- [ ] Start AionUI from the P3 staging tree and verify the WanD orchestrator,
  quotation, Accurate, and price-library cards open.
- [ ] Run one quotation/inventory lookup, one Accurate summary, and one
  price-library read.
- [ ] Disable the package; compile again and confirm business agents/MCPs are
  absent while platform Office/research health remains green.
- [ ] Confirm disable did not delete WanD data, tenant state, or local secrets.
- [ ] Upgrade a sandbox copy to a higher test version, then rollback; confirm
  the prior version and agent projections are restored.
- [ ] Attempt uninstall while enabled; confirm it is rejected. Disable, then
  uninstall; confirm package versions are removed but tenant data/secrets remain.
- [ ] Run `test-install-health.ps1 -Profile Platform -SkipBootstrap` on an
  empty-platform install and confirm PASS.
- [ ] Run the Full install-health and MCP probe on a package-enabled install;
  expected MCP probe result is `PASS 5/5`.

## P4 — Control plane and tenant governance

- [ ] Deploy one isolated control-plane state root for a non-production tenant.
- [ ] Store the AES-GCM master key only in the server secret manager/environment;
  confirm it is absent from Git, package artifacts, logs, and employee clients.
- [ ] Register an OIDC client using RS256 and publish its JWKS.
- [ ] Inspect the client verifier config; confirm it contains issuer, audience,
  and JWKS URI only—no `JWT_SECRET`, client secret, or private key.
- [ ] Verify valid login claims include `tenant_id`, roles, permissions, issuer,
  audience, subject, and expiry.
- [ ] Attempt wrong-tenant and missing-permission access; confirm rejection.
- [ ] Create a tenant package lock and compare package hashes with the catalog.
- [ ] Publish a canary config using only `secret://` references.
- [ ] Report one matching and one drifting observed device; confirm dashboard
  desired/observed/drift and tenant-filtered audit.
- [ ] Promote, then rollback; confirm immutable revision history remains.
- [ ] Confirm audit contains actor/correlation/tenant/result but no token,
  secret value, or business document body.
- [ ] Cut over legacy `org-idp` HS256 only after canary login, config compile,
  platform health, and full package MCP probes pass.

## P5 — Second vertical pilot

_Added when P5 automation is complete._
