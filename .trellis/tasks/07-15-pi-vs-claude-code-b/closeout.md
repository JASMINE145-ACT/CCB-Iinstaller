# Closeout — 07-15-pi-vs-claude-code-b

**Date:** 2026-07-15  
**Verdict:** **MVP CLOSED**（用户收口）

## Shipped

| Track | Evidence |
|-------|----------|
| D1–D3 | `mvp-matrix` R1–R3 Path A oracle PASS；Case1/Case3 harden |
| G1–G2 | Guid 默认零卡；`p-g1` / `p-g2` |
| UI smoke | Guid 无卡 ✅；侧栏「价格库」→ 万鼎共享价格库 v5 ✅（用户截图 2026-07-15） |

## Explicitly not in this closeout

| Item | Disposition | User decision |
|------|-------------|-----------------|
| 历史会话 reopen 身份不漂移 | **deferred**（非本批回归；另开可验） | 收口时不挡 |
| Write-ops / R4 Word | **deferred**（非本 MVP） | **不做** |
| B1 `_meta.delegationRun` | **debt P2**（B0 View Steps 已够） | **不做** |
| pi packaging | **docs-only / 永不本 MVP** | **不做** |

## Product boundary after close

- Guid = 单主入口对话（零卡）
- 价库管理 = 侧栏 `#/price-library`
- 业务真相 = Path A oracle（只读 R1–R3），不是「出现了 Agent」
- 「全自动」权限产品 = **另线**；与 Write-ops 轨无关，不因本 closeout 自动交付写产物验收

## Pointers

- Plan SoT: `execution-plan.md`
- Matrix: `research/mvp-matrix.md` · D3: `research/d3-matrix-evidence.md`
- aionui: `guidZeroCard.ts`（default on；opt-out `ccb_guid_zero_card=0`）
