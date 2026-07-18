# PRD — 沉淀触发可观测性与效果提升

> **Task:** `07-14-precipitation-effectiveness`  
> **Status:** planning  
> **Priority:** P1  
> **Date:** 2026-07-14  
> **Parent:** `07-09-work-routing-execution-contracts` / follow-up of `07-09-idle-session-precipitation`  
> **Security absorb:** 2026-07-14 — 脱敏漏斗 + PROMOTION 负向自动测；禁 habit auto-write

## One-line

先让空闲沉淀成为 **可观测闭环**（脱敏），修掉静默失败，再用指标决定是否调参；业务晋升门 **自动化验证**，永不靠「看起来没泄密」。

## Problem

| 今天 | 痛点 |
|------|------|
| Idle 60s 主线已 shipped | 日常几乎看不到 Inbox / skip |
| `!acp_session_id` 在 renderer **直接 return** | worker 的 `missing_session_id` 永远触达不到 |
| `schedulePrecipitation` 已返回 `ok/detail` | renderer **不持久化/不展示** →「没触发」vs「触发失败」不可分 |
| Prompt 偏好 skip | 即便触发也偏无提案 |
| 若加 raw log | 易泄 transcript / KB / 习惯正文 |

## Goal

1. **脱敏漏斗闭环**：append-only `precipitation_events.jsonl` + summary 聚合；chip 显示「为什么没沉淀」。  
2. **静默失败清零**：缺 sessionId、config/worker/spawn 失败全部变成可观测 `schedule_skipped` / detail。  
3. **效果杠杆**：默认 debounce **30s**；**不做** personal auto-write；Inbox 可做轻批准 UX。  
4. **PROMOTION 自动测**：无 approve 不得 promote 业务规则。  
5. 不回到 Stop 双 LLM；不先放宽 LLM。

## Non-goals

- 业务 KB / eval / golden **自动**写入（`WANd.LEARNING.PROMOTION.001`）  
- personal habit **auto-write**（本任务明确不做）  
- 恢复 Stop personal-memory 全量 LLM  
- eval 云端 API  

## Acceptance criteria

### AC1 — Funnel visibility（脱敏）
- [x] `learning/precipitation_events.jsonl` append-only；事件含 armed/cancelled/schedule_skipped/scheduled/…  
- [x] 字段白名单 — **无** transcript/规则正文/价格/token/完整路径  
- [x] summary = 最后状态 + 计数；UI 读 summary；排障读 events  
- [x] chip：已调度 / 已取消 / 跳过:reason / 待审核 N  

### AC2 — Silent schedule fixed
- [x] `!acp_session_id` → 可观测 `schedule_skipped`  
- [x] schedule detail 落 events  
- [x] 单元测覆盖无 sessionId → 可观测 skip  

### AC3 — Effectiveness lever
- [x] Debounce 默认 30s  
- [ ] 调 LLM **仅**当指标显示偏低（本任务 defer）  

### AC4 — Promotion invariant（**自动化**）
- [x] 负向合同测：deny → 不调用 promote  
- [x] 正路径（mock）：approve + business_rule → promote 1 次  
- [x] 手工 smoke **不能**单独充当本 AC  

### AC5 — Manual smoke（真实 session）
- [ ] ACP 对话 → debounce → events/summary **非** `smoke-session`  
- [ ] 有可学信号 → pending；无信号 → skip reason **可见**且脱敏  

### AC6 — Session bind（2026-07-15 增补 — 解锁 AC5）
- [ ] ACP session/new（及 force-warmup 换 id）**写入** `conversation.extra.acp_session_id`  
- [ ] Schedule resolve：extra → runtime map → 否则才 `missing_session_id`  
- [ ] Mixing：完成后 chip **不得**仅因缺绑定而永久停在 `missing_session_id`  
- [ ] OpenSpec companion：`fix-precipitation-missing-session-id`  

## Related contracts

- `WANd.LEARNING.IDLE.001`  
- `WANd.LEARNING.PROMOTION.001`  
- `WANd.LEARNING.FUNNEL.001`（provisional）  
- `WANd.LEARNING.REDACTION.001`（provisional）  
- `WANd.LEARNING.SESSION_BIND.001`（provisional — Phase 5）
