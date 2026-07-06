# PRD — 07-06 memory-trigger-extraction-quality

**Origin:** 用户对 1.1.7 personal memory 自动沉淀（`07-06-ccb-memory-auto-accumulation`）不满：
「不知道什么时候触发，然后提取一些没用信息」。
诊断证据（file:line 实锤）见 [`research/trigger-extraction-diagnosis.md`](./research/trigger-extraction-diagnosis.md)。

## Problem

1. **触发不可感知不可控**：每次 Stop/SubagentStop 只要有用户消息就调 LLM + 弹「正在学习」横幅（T1）；同一 transcript 反复全量重提、无冷却（T2）；skip/learn 决策零可观测（T3）；job 文件泄漏（T4）。
2. **提取无用信息**：无证据锚定、无琐碎过滤、confidence 摆设（E2）；语义近重复堆积（E3）；业务正则双向误伤（E4）；profile 提取是死代码（E1）。

## Requirements (AC)

- [x] **R1 触发门槛**：hook 内前置启发式信号预筛（毫秒级正则，含扩充的偏好标记 + 「记住」类显式指令必过）——无信号 → 不写 status、不弹横幅、不起 worker、不调 LLM，仅记 skip 日志（含原因）。有信号才入队。
- [x] **R2 增量与冷却**：新增 `.claude/memory/.learning-state.json`（per-session 已处理行位点 + lastRunAt）；同一会话再次 Stop 只提取**新增轮次**；无新增或距上次 <60s → skip。多 SubagentStop 并发用位点 + 文件锁避免重复提取。
- [x] **R3 提取质量（prompt v2 + 落地校验）**：thinking prompt 要求每条 entry 附 `evidence`（transcript 原话引用）与「稳定、可执行的工作偏好」定义 + 负例清单（一次性任务事实/泛化废话/礼貌用语不算）；worker 校验 evidence 能在 transcript 中定位（模糊匹配），校验失败或琐碎条目拒收。
- [x] **R4 语义去重**：dedup hint 改为送全量归一化 bullets 列表（非尾部 2000 字）；append 前 `difflib.SequenceMatcher` 近重比对（ratio ≥ 0.85 拒收）。
- [x] **R5 业务过滤修复**：个人标记命中时，单个业务关键词不再一票否决（收紧为 ≥2 个业务关键词或明确定价句式才 veto）；修复「我习惯先查供应商库存」类误杀；对应 fixture 更新。
- [x] **R6 profile 路径裁定并落实**（已按默认打通）：打通 profile 自动沉淀（thinking prompt 允许 `target:"profile"` + worker 放行 + memory_store 支持），或 PRD 级明确砍掉并清理死代码——二选一，不允许维持死代码现状。**默认：打通。**
- [x] **R7 可观测**：status 文件向后兼容新增 `skippedReason` 与 `lastEntries`（最近 append 的条目文本）；日志覆盖每次触发决策（learn/skip + 原因 + 学到内容）。AionUI 横幅契约不破坏（只在真正调 LLM 时出现 learning 状态）。
- [x] **R8 hygiene**：worker 完成后删除 job 文件；启动时清理 >7 天陈旧 job。
- [x] **R9 测试**（30 passed：12 旧 + 18 新；原 6 fixture 全部保持通过）：pytest 覆盖 R1–R8（新 fixtures：无信号 skip、增量位点、冷却、evidence 校验拒收、近重拒收、供应商误杀回归、profile 打通）；现有 6 fixture 全部保持通过。
- [ ] **R10 部署与实测**：部署后真实会话 smoke——(a) 纯查询会话结束：无横幅、日志记 skip；(b) 说出「我习惯先查供应商库存再报价」后结束：横幅出现一次、workflow.md 新增一条含义正确的 bullet、再次结束同会话不重复。

## Non-goals

- workflow.md 合并整理/老化淘汰（E5，defer——单独 task 再议）
- business 记忆自动沉淀（仍属原 PRD 后续 phase）
- AionUI Memory 页 UI 改版（`07-06-memory-page-ui-redesign` 另有 task）
- 换模型 / 改 Stop-hook 非阻塞架构（架构保留）

## Canonical files

- `ccb-installer/config/skills/ccb-personal-memory/scripts/post-personal-memory-stop.py`
- `ccb-installer/config/skills/ccb-personal-memory/scripts/personal-memory-worker.py`
- `ccb-installer/config/skills/ccb-personal-memory/scripts/lib/parse_transcript_personal_memory.py`
- `ccb-installer/config/skills/ccb-personal-memory/scripts/lib/thinking_client.py`
- `ccb-installer/config/skills/ccb-personal-memory/scripts/lib/learning_status.py`（+ 新 `learning_state.py`）
- `ccb-installer/config/skills/ccb-personal-memory/tests/`

## References

- 诊断：[`research/trigger-extraction-diagnosis.md`](./research/trigger-extraction-diagnosis.md)
- 原设计：`../07-06-ccb-memory-auto-accumulation/research/{stop-hook-design,thinking-extract-design}.md`
- Plan：[`execution-plan.md`](./execution-plan.md)
