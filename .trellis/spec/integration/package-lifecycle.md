# Package Lifecycle and Health Composition

## Canonical roots

- Platform package executor: `ccb-installer/scripts/package-lifecycle.mjs`
- Vertical package catalog: `ccb-installer/packages/vertical/<packageId>/`
- Local lifecycle state: caller-supplied, non-repository `--state-root`
- Runtime config compilation may consume `--package-state <state.json>`

The source tree is a catalog input. Installed versions are copied under:

```text
<stateRoot>/installed/<packageId>/<version>/
```

## State transitions

| Action | Rule |
|--------|------|
| install | copy immutable version; leave disabled |
| enable | add package to deterministic `enabledPackages`; rebuild projections |
| disable | remove runtime projections; retain data and secrets |
| uninstall | require disabled state; remove package version files, not tenant data/secrets |
| upgrade | stage new version; retain previous active version |
| rollback | restore previous version and rebuild projections |

State and legacy projections use temporary paths and rollback on projection or
state-write failure. Callers must never point tests at a live state root.

## Health composition

`resources/install-health-manifest.json` owns platform-required files.
Each enabled package owns `health/install-health.json`.

- `Platform` profile checks platform files/config only.
- `Full` profile composes platform plus package requirements.
- Build staging always uses the full composition.

MCP health follows the same rule:

- `config/mcp-health-manifest.json` owns platform/reusable MCPs.
- Vertical packages own their MCP and Agent probe descriptors.
- JS and PowerShell loaders reject duplicate descriptor IDs.

## Compatibility

Package assets declare `legacyProjections` for current `seed/agents` and
`seed/skills` paths. Legacy IDs remain aliases in `package.json`. Removing
legacy projections requires a separately verified runtime migration.

## Verification

```powershell
node ccb-installer/scripts/__tests__/package-lifecycle.test.mjs
pwsh -File ccb-installer/scripts/test-package-health-split.ps1
node ccb-installer/scripts/__tests__/build-package-registry.test.mjs
node ccb-installer/scripts/__tests__/runtime-config-compiler.test.mjs
pwsh -File ccb-installer/scripts/test-mcp-health.ps1 -Probe -Quiet
```
