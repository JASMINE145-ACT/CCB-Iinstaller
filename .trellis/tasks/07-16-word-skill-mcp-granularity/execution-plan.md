# Execution Plan — `07-16-word-skill-mcp-granularity`

| Field | Value |
|-------|--------|
| **Status** | in_progress |
| **Active phase** | Phase 3 |
| **Route** | **A** — MCP-only；用户 2026-07-16 确认 |
| **Repos** | `claude-code-best`, `ccb-installer` (office-word-mcp) |
| **Precedent** | `07-13-word-creator-document-toolchain` |

## Skills invoked (this planning session)
| Invocation | Type | Evidence |
|------------|------|----------|
| trellis-task-execution | Read: | doctrine + plan template |
| trellis-before-dev | Read: | integration index |
| System review | Read: | scope pivot + conflict research |
| User refinement | Read: | DocumentSpec / id / tx / validate 四项并入 Phase 1 |
| documentspec design | Read: | `research/documentspec-ast-design.md` |

## Pre-flight — Route A + Phase 1 六项

**Route A 已选。** Phase 1 **不是**「bulk tool + SOP」两项，而是 **六项并列**：

```text
DocumentSpec/AST  →  section_id/block_id  →  bulk MCP (spec-driven)
       →  tx/idempotent/recovery  →  Gate S + Gate R  →  SOP/orchestrator brief
```

**反模式（禁止）：** 10 次 opaque bulk 调用、无 manifest、无 block_id、无校验即 declare done。

## Progress snapshot
| Phase | State | Delivery / evidence |
|-------|-------|---------------------|
| Phase -1 | done | review + Route A pivot |
| Phase 0 | done | Route A confirmed |
| Phase 1a–1f | done | `p1-documentspec-mcp-done.md`; 5/5 unittest; code-reviewer PASS (A6 closed) |
| Phase 2 | done | `word-mcp-skill-boundary.md` |
| Phase 3 | pending | Contract Verification rows + Guid smoke optional |
| plan lint | done | PASS (DocumentSpec revision) |

## Phase -1 — Capability matrix
| Capability | Preferred tool | Status | Fallback |
|------------|----------------|--------|----------|
| DocumentSpec schema | task research → spec | available | JSON Schema file in repo |
| MCP extend | trellis-implement | available | inline vendor patch |
| Validation | TDD + smoke scripts | available | manual gate checklist |
| Review | code-reviewer | available | trellis-check |

## Contract map
| Contract | Behavior protected | Primary code | Tests / eval / smoke | Risk |
|----------|--------------------|--------------|----------------------|------|
| `WANd.OFFICE.WORD.DOCUMENT_SPEC.001` | Compose 必须经 DocumentSpec AST；非 opaque bulk | schema, orchestrator brief | schema unit tests | migration |
| `WANd.OFFICE.WORD.BLOCK_ID.001` | section_id/block_id 稳定；manifest 可寻址 patch | render + bookmark mapping | manifest alignment test | concurrency |
| `WANd.OFFICE.WORD.APPLY_TX.001` | apply_id 幂等；backup；rollback | apply envelope, restore tool | idempotent retry + failure inject smoke | external-api |
| `WANd.OFFICE.WORD.VALIDATE.001` | Gate S（spec）+ Gate R（render/manifest） | validate_* tools | RED invalid spec; GREEN full pipeline | ui |
| `WANd.OFFICE.WORD.MCP_BUDGET.001` | ≤20 calls on baseline | word-creator SOP | smoke call count | ui |
| `WANd.OFFICE.WORD.BOUNDARY.001` | macro/micro + DocumentSpec 路由 | word-mcp-skill-boundary.md | spec review | — |

## Workstreams
| Phase | Priority | Workstream | touches | Risk | Tool / agent | Files | Required output | Profile |
|-------|----------|------------|---------|------|--------------|-------|-----------------|---------|
| 1a | P0 | DocumentSpec / AST schema + 示例 | DOCUMENT_SPEC.001 | migration | TDD | schema json, research doc | schema + 2 fixtures | Standard |
| 1b | P0 | section_id / block_id + manifest | BLOCK_ID.001 | concurrency | implement | office-word-mcp | bookmark map + manifest json | Standard |
| 1c | P0 | MCP: render / patch / get_manifest | DOCUMENT_SPEC, BLOCK_ID | external-api | implement | office-word-mcp | 3 tools registered | Standard |
| 1d | P0 | 事务 / 幂等 / backup / rollback | APPLY_TX.001 | external-api | TDD | apply envelope, restore | retry smoke + rollback smoke | Standard |
| 1e | P0 | Gate S + Gate R | VALIDATE.001 | ui | TDD | validate_document_spec, validate_rendered_document | RED/GREEN tests | Standard |
| 1f | P0 | SOP + orchestrator DocumentSpec brief | MCP_BUDGET.001 | ui | doc | word-creator.md, orchestrator | ≤20 call routing table | Standard |
| 2 | P1 | word-mcp-skill-boundary.md | BOUNDARY.001 | — | doc | integration spec | 54-tool + spec routing | Standard |
| 3 | P0 | Contract Verification | all | — | code-reviewer + smoke | — | evidence rows | Standard |

## TDD contract
| Workstream | Contract | RED evidence | GREEN command | Refactor guard |
|------------|----------|--------------|---------------|----------------|
| 1a schema | DOCUMENT_SPEC | invalid spec passes | schema validator rejects bad fixture | 2nd fixture |
| 1b manifest | BLOCK_ID | render without manifest | manifest lists all block_ids | patch by id works |
| 1c render | DOCUMENT_SPEC | 113-paragraph path | render_document_spec ≤3 calls → docx | atomic still works as escape |
| 1d tx | APPLY_TX | retry duplicates content | same apply_id idempotent | rollback restores pre-image |
| 1e Gate S | VALIDATE | placeholder token in spec | validate_document_spec FAIL | fix spec → PASS |
| 1e Gate R | VALIDATE | missing section in docx | validate_rendered_document FAIL | manifest diff in report |
| 1f budget | MCP_BUDGET | baseline >20 calls | full pipeline ≤20 | second template |

## Contract Verification
| Contract | Verification | Evidence | Status |
|----------|--------------|----------|--------|
| DOCUMENT_SPEC.001 | schema tests + fixture render | 5/5 unittest OK | **PASS** |
| BLOCK_ID.001 | patch_block_by_id on known id | manifest before/after in test | **PASS** |
| APPLY_TX.001 | fail mid-render + restore | `test_restore_backup` PASS | **PASS** |
| VALIDATE.001 | Gate S + Gate R on baseline | Gate S/R in pipeline test | **PASS** |
| MCP_BUDGET.001 | smoke call counter | SOP updated; Guid smoke deferred | pending (manual) |
| BOUNDARY.001 | spec file review | `word-mcp-skill-boundary.md` | **PASS** |
| plan structure | lint_execution_plan.py | PASS | PASS |

## Verification profile and gate
**Selected:** Standard

1. Contract Verification（全部 touched contracts）
2. code-reviewer PASS
3. trellis-update-spec（DocumentSpec 附录 + boundary md）
4. implement.jsonl + check.jsonl + prd AC
5. commit if user asks

## Parallelization
- **Serial merge order:** 1a schema → 1b manifest design → 1c tools → 1d tx → 1e validate → 1f SOP → Phase 2 spec.
- 1c/1d can pair only after 1a/1b frozen.

## Conditional recovery
| Trigger | Return to | Re-approval? |
|---------|-----------|--------------|
| Bookmark 方案不可行 | 1b | try SDT or comment anchors |
| Gate R too slow | 1e | sample blocks only for P0 |
| Vendor MCP 拒收 patch | 1c | fork vendor or wrapper script |

## Manual steps
- [ ] Approve this revised plan（Phase 1 六项）
- [ ] Confirm baseline smoke doc（AI research report 或 business report 二选一）

## Defer
- PDF→image visual diff（P1，借 convert_to_pdf）
- document-template skill（Route B only）
- Full 54-tool reclass（Phase 2）

## Superseded
- ~~Phase 1 = bulk tool + SOP only~~
- ~~10× opaque bulk without DocumentSpec~~
