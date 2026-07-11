---
name: system-review
description: Evidence-based system review for written plans, technical designs, repositories, or implemented code. Use when the user asks for plan review, code review, implementation-vs-spec review, architecture review, system audit, safety review, end-to-end completeness review, or asks whether a project/design is feasible, complete, safe, executable, or product-ready.
---

# System Review

Perform a read-only, evidence-based review from four perspectives: engineering feasibility, system architecture, safety boundaries, and end-to-end completeness. The goal is to identify prioritized risks, missing contracts, unclear ownership, unsafe assumptions, unstable execution paths, and business-flow gaps.

## Operating Mode

Default to read-only review.

Allowed in read-only mode:
- Read files, plans, specs, logs, and directory structure.
- Search code and documents.
- Run existing safe tests or smoke commands when they are already available and do not modify state.
- Report findings.

Do not create, delete, overwrite, refactor, or reconfigure files unless the user explicitly enables modification with phrases such as `zhixing xiugai`, `zhijie gai`, `enter modification mode`, `modify according to Phase 1`, or `implement the fixes`.

## Input Type

Identify the review type before judging:

| Input Type | Meaning | Evidence Standard |
| --- | --- | --- |
| Plan Review | Written plan, PRD, execution plan, or architecture proposal | Cite section title, task ID, requirement, assumption, or short quoted plan text |
| Code Review | Code files or repository inspection | Cite file path, function/class name, config path, command, or file:line when available |
| Implementation Review | Finished code checked against plan/spec | Compare plan requirements with implementation evidence |
| System Audit | Full project-level review | Build a system map before reviewing business flow, data flow, contracts, tests, and deployment |

If evidence is missing, state what is missing. Do not fabricate evidence.

## Review Principles

- Understand the system before judging it.
- Make every major finding evidence-based.
- Separate confirmed findings from hypotheses.
- Focus on business closure, not just code style.
- Prefer MVP-level improvements over full rewrites.
- Identify missing contracts, not only missing code.
- Check safety, idempotency, observability, and failure recovery.
- If plan and implementation diverge, prioritize the business-flow gap.
- Do not treat detailed plans or polished code as executable proof.
- End with concrete next-step options.

## Required Review Dimensions

Cover these dimensions when applicable. If a dimension cannot be assessed, say why.

1. Engineering feasibility: scope, dependencies, assumptions, interfaces, phases, success criteria, hidden prerequisites.
2. System architecture: entry points, core modules, data sources, external services, config, runtime flow, responsibilities, coupling, repeated logic, missing contracts.
3. Business flow completeness: user input, validation, processing, tool/data calls, output, persistence, confirmation, failure handling.
4. Data flow and state: data sources, formats, validation, transformations, temp files, cache, writes, idempotency, dirty data after failure, success evidence.
5. Execution contract and stability: success/failure/blocked states, retries, timeouts, logs, errors, recovery/resume, destructive confirmations, tool-result validation.
6. Safety boundaries: read/write separation, permission control, destructive action approval, external API boundaries, prompt injection, secrets, private data, rollback.
7. Testing and verification: success path, missing information, invalid input, tool/API failure, repeated execution, write-success evidence, no-action path, permission boundary.
8. Deployment and usability: install, environment, dependencies, config examples, OS differences, startup, logs, troubleshooting, versioning, rollback, updates, docs.

Use priority levels:

| Priority | Meaning |
| --- | --- |
| P0 | Core function may fail, data may be wrong, or unsafe action may occur |
| P1 | Serious instability, poor user experience, or unclear execution result |
| P2 | Maintainability, scalability, or module-boundary issue |
| P3 | Long-term optimization |

Do not mark everything as P0. Prioritize by real impact.

## Evidence Tables

For repository or system audits, first produce a system map:

| Module / Directory | Responsibility | Key Files | Initial Judgment |
| --- | --- | --- | --- |

For the main flow, use:

`User input -> validation -> processing -> tool/data call -> result generation -> persistence -> user confirmation`

Then include a flow-risk table:

| Flow Node | Evidence | Risk | Suggested Fix |
| --- | --- | --- | --- |

For data flow, include:

| Data Object | Source | Processing Location | Output Location | Risk | Recommendation |
| --- | --- | --- | --- | --- | --- |

For execution stability, include:

| Risk Scenario | Current Behavior | Failure Impact | Recommended Mechanism | MVP Fix |
| --- | --- | --- | --- | --- |

For safety, include:

| Safety Risk | Evidence | Impact | Boundary Needed | Priority |
| --- | --- | --- | --- | --- |

For testing, include:

| Test Type | Current Status | Gap | Suggested Test |
| --- | --- | --- | --- |

For deployment and usability, include:

| Area | Current Design | User Risk | Improvement |
| --- | --- | --- | --- |

## Final Report Format

Use this format unless the user asks for a narrower review:

```markdown
# System Review Report

## 1. Overall Judgment

Summarize maturity in 3-5 sentences. Classify the system as one of: Demo, MVP, Internal tool, Deliverable product, Scalable product. Explain why.

## 2. System Map

Provide the main modules, responsibilities, and key files or plan sections.

## 3. Main Business Flow

Show the end-to-end flow:

User input -> validation -> processing -> tool/data call -> result generation -> persistence -> user confirmation

Explain breakpoints, hidden assumptions, and failure points.

## 4. Top 10 Risks

| Priority | Risk | Evidence | Impact | Recommendation |
| --- | --- | --- | --- | --- |

## 5. MVP Improvement Roadmap

### Phase 1: Immediate Fixes, 1-2 Days

High-priority, low-risk, high-impact changes only.

### Phase 2: Structural Cleanup, 3-7 Days

Module separation, logging, contracts, tests, and config cleanup.

### Phase 3: Productization, 1-3 Weeks

Monitoring, permissions, documentation, deployment, rollback, and automated verification.

## 6. Suggested New Files or Specs

Only recommend files that are actually useful for the reviewed system.

| File | Purpose |
| --- | --- |

## 7. Next-Step Options

**A.** Continue with read-only system review only
**B.** Generate a Phase 1 modification plan
**C.** Enter modification mode and implement Phase 1 fixes

Ask the user to choose A/B/C before making changes.
```

## Review Rules

- Cite evidence clearly.
- Distinguish confirmed findings from hypotheses.
- Review technical and business-flow risks.
- Prioritize MVP fixes.
- Check safety boundaries and proof of success.
- Do not give generic advice without evidence.
- Do not propose a full rewrite unless the system is fundamentally invalid.
- Do not claim execution success without evidence.
- Do not make changes in read-only mode.
