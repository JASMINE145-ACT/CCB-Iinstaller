# Package Manifest and Read-only Registry

> **Status:** Active (P1 — task `07-03-platform-business-decoupling`)
> **Schema:** `ccb-installer/config/schemas/package-manifest.schema.json`
> **Example:** `ccb-installer/packages/vertical/com.wanding.trade/package.json`

P1 introduces a declarative description layer without changing installation or
runtime behavior. Package manifests describe ownership and relationships;
`build-package-registry.mjs` projects the current legacy assets into a read-only
snapshot and reports drift/orphans.

## Contract

Every package manifest uses:

- `schemaVersion`: manifest contract version (`1.0.0`).
- `packageId` and `version`: stable reverse-DNS identity plus SemVer.
- `capabilities`: `platform.*` or `business.*` IDs.
- `agents`, `mcpServers`, `skills`, `knowledge`, `contributions`: descriptors
  with stable IDs and source paths.
- `aliases`: transition-only legacy ID mappings.

Agents declare `requiredCapabilities`. MCP and skill descriptors declare
`providesCapabilities`. Runtime transport names remain implementation details;
new platform branches must not hardcode WanD IDs.

P2 MCP descriptors may also declare:

- `runtime`: the CCB projection template (`${variable}` and `secret://` allowed);
- `runtimeSecretPaths`: JSON pointers relative to `runtime` that must remain
  secret references until local compilation.

## Registry command

```powershell
# Validate manifests and current asset relationships without writing output
node ccb-installer/scripts/build-package-registry.mjs --check

# Generate the deterministic read-only snapshot
node ccb-installer/scripts/build-package-registry.mjs

# Targeted tests
node ccb-installer/scripts/__tests__/build-package-registry.test.mjs
```

Default output:

`ccb-installer/config/generated/package-registry.snapshot.json`

The snapshot contains no wall-clock value, so identical inputs produce an
identical file.

## Diagnostic policy

| Severity | Meaning | CLI |
|----------|---------|-----|
| `error` | Invalid schema relationship, duplicate ownership, or manifest/frontmatter drift | exit non-zero |
| `warning` | Existing legacy asset is not assigned to a package yet | report and continue |

P1 intentionally leaves Office and Research assets unassigned. Their warnings
are inputs to later platform-capability packages, not reasons to force them into
`com.wanding.trade`.

## P1 boundary

- The builder only reads existing config and writes a derived snapshot.
- It does not edit agent markdown, sidecars, MCP settings, or health manifests.
- The generated snapshot is not runtime authority in P1.
- P2 may consume this model for configuration compilation only after its own
  acceptance and migration plan.
