# Execution Plan — fixture `lite-runtime`

| Field | Value |
|-------|--------|
| **Status** | approved |
| **Scenario** | A |
| **Plan depth** | Lite |
| **Verification profile** | Fast |
| **Active phase** | P0 |

## Progress snapshot
| Phase | State | Delivery / evidence |
|-------|-------|---------------------|
| P0 | pending | — |

## Skills invoked
| Invocation | Type | Evidence |
|------------|------|----------|
| trellis-before-dev | Skill: | spec paths noted |

## Contract map (lite)
- **touches:** WANd.TEST.SAMPLE.001
- **Behavior protected:** fixture runtime-contract plan
- **GREEN:** `python ./.trellis/scripts/lint_skill_consistency.py`
- **Manual smoke:** N/A

## Contract Verification
| Contract | Verification command / smoke | Required evidence | Status |
|----------|------------------------------|-------------------|--------|
| WANd.TEST.SAMPLE.001 | GREEN command above | command output | pending |
