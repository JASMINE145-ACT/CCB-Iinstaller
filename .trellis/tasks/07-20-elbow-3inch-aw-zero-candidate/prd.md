# PRD — Elbow 3" AW zero-candidate recall

| Field | Value |
|-------|--------|
| **Task** | `07-20-elbow-3inch-aw-zero-candidate` |
| **Parent** | `07-20-learn-by-data-select-first` |
| **Priority** | P1 |
| **Status** | planning |

## Problem

Plain English inquiry `Elbow 3" AW 3"` returns **0** fuzzy candidates while material `8010024354` exists in the price library (DN75 / 3" AW 90° elbow). learn-by-data marks Section B「人工核查」incorrectly as a matcher miss.

## Root cause (confirmed)

Field-matching rule parser splits `elbow drat / drat → …` into token sources including bare `elbow`, so plain Elbow queries inherit 丝扣/内螺纹 expansion and hard-filter drops all plain elbows. See `research/root-cause-elbow3-zero-candidate.md`.

## Goal

Plain Elbow (+ size + AW) recalls existing plain 90° AW elbow SKUs (incl. `8010024354`). `Elbow drat` / explicit 丝扣 still expand to threaded faucet elbows.

## Acceptance

| ID | Criterion |
|----|-----------|
| AC1 | `match_quotation_union('Elbow 3" AW 3"', B)` includes `8010024354` |
| AC2 | Knowledge expansion for plain `Elbow` does **not** add `丝扣弯头`/`内螺纹` |
| AC3 | `Elbow drat 1/2" AW` still expands to threaded terms; existing `test_drat_elbow_aw.py` PASS |
| AC4 | Optional Guid: learn-by-data Jinse row14 no longer Section B solely due to 0 candidates (or candidates contain actual) |

## Non-goals

- Changing select-first learn skill
- Auto-append Section A business rules
- Fixing unrelated `half bend` token-OR pollution (track separately if needed)
