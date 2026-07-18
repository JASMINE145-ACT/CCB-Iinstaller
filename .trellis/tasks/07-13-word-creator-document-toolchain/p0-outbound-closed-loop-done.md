# P0 — Outbound closed loop (done 2026-07-13)

## Delivered

| File | Change |
|------|--------|
| `ccb-installer/config/agents/word-creator.md` | 意图决策表；出站闭环 DOCX→校验→`convert_to_pdf`；P0 交付前读回；MS Word 失败话术；Stage2 PDF 入站勿调用 |
| `ccb-installer/packages/vertical/com.wanding.trade/agents/wande-orchestrator.md` | Office 路由表 + 主路由表 PDF 出站；委派 task 不写「再问要不要 PDF」 |

## Contracts

- **WANd.OFFICE.WORD.CLOSED_LOOP.001** — md contract
- **WANd.OFFICE.DOC_VALIDATE.001** — P0 minimal (office-word readback)
- **WANd.OFFICE.LANES.001** — excel/ppt lanes preserved

## Verification

| Gate | Result |
|------|--------|
| code-reviewer | PASS (Layer A/B N/A) |
| `test_roe_judge_gate.py` | 16/16 PASS (incl. word-creator universal block) |

## Pending (not P0)

- Guid smoke: 「写方案并发客户」→ `.docx` + `.pdf` on machine with MS Word
- Stage 2: `mcp_servers/pdf-toolkit` + inbound workflow
