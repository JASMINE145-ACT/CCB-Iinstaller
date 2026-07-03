按数据学习 / 复盘报价：对用户已上传或工作区内的**已填写 VANTSING 报价单**执行报价复盘。

**第一步**：`Skill(quotation-learn-by-data)`（或 Read `%LOCALAPPDATA%\CCB-Wanding\.claude\skills\quotation-learn-by-data\SKILL.md`），严格按 SKILL 内 Steps 1–4 串行执行。

**硬约束**：
- 仅 MVP 支持 VANTSING 模板（固定列 B/C 关键词、F 料号、第 8 行起至 Total 前）
- 每批 `match_quotation_batch` 必须 `show_candidates=true`，≤10 行/批，走完 `remaining_keywords`
- 每批先输出对比表，再调下一批；最终输出 Section A（知识片段）与 Section B（料号未在候选中）

若用户尚未提供 Excel，请提示上传已填写的 VANTSING `.xlsx` 后再开始。
