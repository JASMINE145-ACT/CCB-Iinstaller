# P5 platform feedback

## Outcome

The second vertical required zero platform-core implementation changes.
Existing registry, runtime compiler, lifecycle, and control-plane APIs supported
the manufacturing package and concurrent WanD installation.

## Test-only assumptions found

1. A control-plane regression selected `catalog.packages[0]` as WanD. It now
   looks up `com.wanding.trade` by ID, allowing any catalog sort order.
2. A JWKS tamper fixture changed the final base64url character, whose unused
   bits can decode to the same signature. It now mutates a middle character.

Neither correction changes production behavior.

## Backlog (not required for this pilot)

- Render declarative `ui` contributions dynamically in AionUI.
- Add signed package archives/SBOM before remote package distribution.
- Add production MES/ERP connectors behind tenant-scoped gateway authorization.
- Add multi-day calendars and optimization only after real-factory discovery.
