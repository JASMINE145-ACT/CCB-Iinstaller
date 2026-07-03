# Manufacturing scheduling pilot

This non-production vertical proves that CCB can compose a second business
domain without changing platform-core implementation.

## Operator case

A factory has two single-capacity work centers (`CUT` and `ASM`) available from
08:00–16:00 UTC. Two work orders contain sequential cutting and assembly
operations. The scheduling agent inspects capacity, lists work orders, builds
an earliest-due-date schedule, and verifies precedence, non-overlap, and
capacity-window containment.

The fixture schedule completes `WO-100` at 11:30 and `WO-200` at 13:30. A
500-minute operation fails with `CAPACITY_EXCEEDED`.

```powershell
node --test ccb-installer/packages/vertical/com.example.manufacturing-scheduling/connector/connector.test.mjs
node --test ccb-installer/scripts/__tests__/p5-manufacturing-pilot.test.mjs
```

The package has no credentials, network dependency, business-data writes, or
legacy projections. It may be enabled concurrently with `com.wanding.trade`.
