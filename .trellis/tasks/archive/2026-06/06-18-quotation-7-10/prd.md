# quotation: 将默认候选数上限从7调为10

## Goal

将 `match_quotation` 默认返回候选数从 7 提高到 10，减少「14个候选只返7个」导致的截断频率，同时不改变用户显式请求（`show_candidates=true`）时的 15 上限。

## Requirements

* 将 `DEFAULT_SELECTION_CANDIDATE_LIMIT` 从 `7` 改为 `10`（`main.py:68`）
* `EXPLICIT_SELECTION_CANDIDATE_LIMIT = 15` 保持不变

## Acceptance Criteria

* [ ] `match_quotation("直接50")` 返回最多 10 个候选（14个时不截断到7）
* [ ] `show_candidates=true` 时仍返回最多 15 个

## Definition of Done

* 改动已同步到 `ccb-installer/config/` 对应文件（若有）
* smoke 测试通过

## Technical Approach

单行修改：`main.py` 第 68 行，`7` → `10`。

## Out of Scope

* 不改 `EXPLICIT_SELECTION_CANDIDATE_LIMIT`
* 不改 prompt 规则
* 不重构 `_build_selection_payload`

## Technical Notes

* 文件：`D:\CCB-Wanding\vendor\wanding\python\main.py:68`
* `EXPLICIT_SELECTION_CANDIDATE_LIMIT = 15`（第 69 行）不动
