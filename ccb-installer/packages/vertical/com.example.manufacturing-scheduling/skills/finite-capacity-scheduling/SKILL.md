---
name: finite-capacity-scheduling
description: Create and validate a finite-capacity manufacturing schedule.
---

# Finite-capacity scheduling

1. Read capacity and work orders before scheduling.
2. Call `build_schedule`.
3. Check operation precedence, work-center non-overlap, and capacity-window
   containment.
4. Present due-date risk and infeasible operations without claiming optimality.

Capability: `business.manufacturing.schedule`.
