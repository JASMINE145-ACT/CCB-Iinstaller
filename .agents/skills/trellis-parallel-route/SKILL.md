---
name: trellis-parallel-route
description: "Plan and control safe parallel Trellis workstreams. Use for Scenario D, multi-repo tasks, independent workstreams, subagent dispatch, merge ownership, or when asking whether a task can be parallelized."
---

# Trellis Parallel Route

Parallelize only when ownership is disjoint and merge order is explicit.

## Eligibility

Allow parallel execution only when every stream has:

- separate files or a single named merge owner,
- a clear contract ID or docs-only marker,
- its own RED/GREEN evidence,
- no shared generated artifact edited concurrently.

If two streams need the same canonical file, assign one owner and serialize that file.

## Split Table

Add or update this table in `execution-plan.md`:

```markdown
| Agent/stream | Scope | Owns files | Contract | GREEN command | Merge rule |
|--------------|-------|------------|----------|---------------|------------|
```

## Dispatch Rules

- Use `superpowers:dispatching-parallel-agents` discipline when subagents are available.
- Give each stream only its own files, contract, tests, and acceptance target.
- Require each stream to return:
  - changed files
  - test command/result
  - contract evidence
  - risks or blocked items

## Merge Rules

- Parent session owns final merge and verification.
- For WanD/AionUI manifest work, merge JSON first, then mirror TypeScript, then tests.
- Never let two agents edit the same manifest mirror, generated registry, or route identity map concurrently.
- After merging, run `trellis-contract-verify` once over the integrated diff.

## Recovery

If a stream crosses ownership boundaries, stop that stream, update the plan, and ask for re-approval when scope or delivery order changes.
