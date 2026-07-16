# Root cause — Outcome Relay（2026-07-15）

## Symptom

父气泡空壳；「查看执行」中 `fill_quotation_sheet` 已 success + `output_path` + `filled_count`。

## Verdict table（用户诊断锁，非推测）

| Hyp | Status | Evidence / rationale |
|-----|--------|----------------------|
| H1 报价子代理未交付 | **排除** | 本次复现工具链完整；不必优先 quotation nudge |
| H2 父级未强制回传 | **P0** | L1 `EXECUTION.001` 有文无运行时；orch Stop historically `off` |
| H3 UI/renderer 绑定 | **排除** | 不改 AionUI；证据在父合成行为，非列表绑不上 |
| H4 缺父泡回归 | **P0** | 现有 orch eval ≈「Agent 出现」≠ 交付字段 |

## Taxonomy

| Rank | Class | Detail |
|------|-------|--------|
| 1 | **跨层合同缺口** | 子 artifact 成功 ≠ 父用户可见最小交付；合同停在 Prompt |
| 2 | 测试覆盖缺口 | 无父泡 `.xlsx` + 成功项数断言 |
| 3 | 隐含假设错误 | 「Prompt = 强约束」不成立 |

## Implication for MVP

- **做：** 父 `end_turn` Outcome Relay 门禁（nudge×1 和/或确定性转发）+ 父泡 eval。
- **不做：** quotation fill nudge；renderer；纯 Prompt 加戏当完成。

## Product lock

**A 已锁（2026-07-16 执行）**：nudge×1 → 仍缺则 REJECT 内嵌确定性转发片段；第 3 次 escalate pass 防死循环。
