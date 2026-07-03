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

_Added when P3 automation is complete._

## P4 — Control plane and tenant governance

_Added when P4 automation is complete._

## P5 — Second vertical pilot

_Added when P5 automation is complete._
