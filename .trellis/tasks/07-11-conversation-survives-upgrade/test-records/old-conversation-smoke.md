# Old conversation smoke — all types (D1)

**Date:** _fill_  
**App version:** _e.g. 1.1.6 → 1.1.7_  
**Policy:** D3 能用好 · D4 失败必报错 · D2 首次 open refresh 一次

## Per-type old sessions (each ≥3 days old)

| Type | conversation_id | created | Typical prompt | Result |
|------|-----------------|---------|----------------|--------|
| S-Q 报价 Guid | | | 查价 | |
| S-A 账务 Guid | | | 账务查询 | |
| S-O 总调度 | | | 委派/路由 | |
| S-W Office | | | word/excel/ppt | |

## Cross-cutting

| ID | Check | PASS/FAIL | Notes |
|----|-------|-----------|-------|
| S-FA | 全自动旧会话：无 permission 或 D4 报错 | | |
| S-UP | 升级后不删 AppData，上表重测 | | |
| S-RE | 关 App 再开 | | |
| S-REF | 升级后首次 open 有 refresh log | | |
| S-REF2 | 同版本第二次 open 无 refresh | | |
| S-FAIL | 断 config-options → 阻断 + 文案 | | |
| S-RB | ccb-check-install route-b | | |

## D4 failure capture

- Error text shown to user:
- Send blocked? Y/N
- Silent fallback observed? **must be N**
