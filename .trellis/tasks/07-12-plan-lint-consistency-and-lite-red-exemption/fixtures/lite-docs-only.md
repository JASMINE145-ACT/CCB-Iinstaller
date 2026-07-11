# Execution Plan — fixture `lite-docs-only`

| Field | Value |
|-------|--------|
| **Status** | approved |
| **Scenario** | K |
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
- **touches:** docs-only/no-runtime-contract
- **Behavior protected:** fixture docs-only plan
- **GREEN:** `python ./.trellis/scripts/lint_skill_consistency.py`
- **Manual smoke:** N/A

## Contract Verification
| Contract | Verification command / smoke | Required evidence | Status |
|----------|------------------------------|-------------------|--------|
| docs-only/no-runtime-contract | GREEN command above | command output | pending |
