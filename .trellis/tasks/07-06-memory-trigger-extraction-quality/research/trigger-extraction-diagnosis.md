# Diagnosis — personal memory 触发与提取缺陷（代码实读）

**Task:** `07-06-memory-trigger-extraction-quality`
**Date:** 2026-07-06
**Origin:** 用户对 `07-06-ccb-memory-auto-accumulation`（1.1.7 personal memory 自动沉淀）的触发逻辑与提取逻辑不满：
「不知道什么时候触发，然后提取一些没用信息」。

**Method:** 直接精读已落地实现（非猜测），全部指认到 file:line。
代码位置：`ccb-installer/config/skills/ccb-personal-memory/scripts/`

---

## 一、触发侧缺陷（不可感知 / 不可控）

### T1 每次 Stop 必调 LLM，无信号预筛

`post-personal-memory-stop.py:81` — 唯一门槛是 `transcript_has_user_content()`（transcript 有任意用户消息即过）。
纯查询会话、零偏好信号也会：写 job → `status=learning`（横幅弹出）→ spawn worker → 全量 excerpt 打 `minimax-m3-thinking`。

- 启发式 `extract_candidates()`（纯正则、毫秒级）明明存在，却只在 thinking **失败后**做降级（`personal-memory-worker.py:122-126`），从不做前置门槛。
- 后果：API 成本白花 + 「Agent 正在学习」横幅每场会话必闪 → 用户感知「不知道什么时候触发」其实是「一直在触发」。

### T2 无增量、无冷却

- 同一会话多次 Stop（继续聊→再结束）→ **同一份全量 transcript 反复重提**（`build_transcript_excerpt` 每次从头扫，`parse_transcript_personal_memory.py:191-213`）。
- 无任何 per-session 已处理位点记录；无最小间隔冷却。
- SubagentStop 一轮可触发多次（quotation-agent / accurate-agent 各自挂钩），worker 各起各的，互不知晓。

### T3 决策不可观测

- 日志只有 `enqueue: spawned job` / `worker: … appended N`（`post-personal-memory-stop.py:33-38`, `personal-memory-worker.py:36-41`）——**没有 skip 原因、没有本次学到了什么内容**。
- status 文件（`.learning-status.json`）只有 idle/learning/done/error + entriesAppended 计数，看不到条目内容与跳过原因。
- 用户侧没有任何「何时学 / 学了什么 / 为什么没学」的可见面。

### T4 job 文件泄漏

`personal-memory-worker.py:run_job` 完成后**不删除** job manifest；`jobs/` 目录无限堆积（每次 Stop 一个 `{uuid}.json`）。

---

## 二、提取侧缺陷（提取无用信息）

### E1 profile 提取是死代码

`personal-memory-worker.py:129-131`：

```python
to_append = [(t, b) for t, b in candidates if t == "workflow" and ...]
```

- 启发式路径能产出 `target="profile"` 候选（`parse_transcript_personal_memory.py:126-127`），全被此过滤丢弃。
- thinking 路径 system prompt 也只允许 `"workflow"`（`thinking_client.py:24`）。
- PRD 宣称的「档案层自动沉淀」实际永远不发生。

### E2 提取无落地校验 → 无用信息直通

thinking 返回的 entry 只查四件事（`thinking_client.py:98-115`）：target=workflow、非空、confidence≥0.7、业务正则。
**没有**：

- 证据锚定 —— 不要求 entry 能对应回 transcript 里的原话，模型编的/过度泛化的条目照收（「用户偏好高效工作」这种废话可直通）。
- 琐碎过滤 —— 无最小信息量约束。
- confidence 是模型自报，0.7 阈值无校准，形同摆设。

### E3 去重只有字面级

- append 去重 = 整行文本 normalize 比对（memory_store，P4 逻辑）。
- 语义近重复挡不住：「先查库存再报价」vs「报价前习惯先看库存」→ 两条都进。
- 给模型的 dedup hint 只有 workflow.md **尾部 2000 字**（`personal-memory-worker.py:62-66`），文件一长即失效。
- 结果：同类习惯反复堆积 = 用户看到一堆重复的「没用信息」。

### E4 业务过滤正则双向误伤

`parse_transcript_personal_memory.py:34-38` `BUSINESS_DOMINANT` = 单关键词命中即算业务：

- **假阳性（误杀个人习惯）**：「我习惯先查**供应商**库存再报价」→ 含「供应商」整条丢弃（`classify_message:117-118`）。
- **假阴性（业务规则漏进）**：不含这 8 个关键词的业务规则照样通过。
- worker 对 thinking 输出再套一次同一正则（`personal-memory-worker.py:130`），双倍误杀。

### E5 只进不出（本 task 仅记录，主体 defer）

workflow.md 无上限、无合并整理、无老化 —— 长期必然流水账化。用户本轮痛点未点名此项，
列为 defer 候选（见 execution-plan）。

---

## 三、既有资产（修复时保留）

| 资产 | 结论 |
|------|------|
| 非阻塞架构（hook <200ms 入队 + detached worker） | 正确，保留 |
| status 文件契约 + AionUI 横幅（90s stale fail-open） | 保留，扩展需向后兼容 |
| memory_store append（file lock + atomic + 字面去重） | 保留，叠加语义近重 |
| pytest fixtures（6 个 transcript 场景） | 保留并扩展 |
| `CCB_PERSONAL_MEMORY_SYNC` / `_THINKING_MOCK` / `_FORCE_FALLBACK` 测试开关 | 保留 |

## 四、修复方向裁定

| 缺陷 | 方向 |
|------|------|
| T1 | 启发式前移为**入队门槛**：hook 内跑 `extract_candidates`（毫秒级），无信号 → 不写 status、不弹横幅、不起 worker，只记 skip 日志 |
| T2 | `.claude/memory/.learning-state.json`：per-session 已处理行位点 + 冷却；只对**新增轮次**提取 |
| T3 | skip/learn 全量记因；status 增加 `lastEntries`（最近学到的条目文本）与 `skippedReason`（向后兼容新增字段） |
| T4 | worker 结束时删除 job 文件 + 启动时清理 >7d 陈旧 job |
| E1 | 打通 profile：thinking prompt 允许 `profile` target + worker 过滤放行（或砍掉 profile 路径——PRD 决策点，默认打通） |
| E2 | prompt v2（证据引用字段 + 负例 + 「必须是可执行的稳定偏好」）+ 落地校验：entry.evidence 必须在 transcript 中可定位（模糊匹配），琐碎条目拒收 |
| E3 | 全量 bullets 送 dedup hint（归一化列表而非尾 2000 字）+ append 前 difflib 近重比对（ratio ≥0.85 拒收） |
| E4 | 业务 veto 收紧为「≥2 个业务关键词或明确定价句式」且只作用于启发式 fallback；thinking 主路径靠 prompt 负例约束 |
