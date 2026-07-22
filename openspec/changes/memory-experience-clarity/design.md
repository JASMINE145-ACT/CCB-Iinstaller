## Context

万鼎记忆合同吸收 System Review ×2。目标主线：TurnHarvest（Checkpoint 无 LLM + Nudge FullReview → Inbox → verify applied）。Legacy：30s idle。

## Goals / Non-Goals

**Goals:** 关闭复审最小放行条件（watermark/lease/outcome/SHA/outbound/local-business/axes/N↔E2E/registry 四类）  
**Non-Goals:** I1 生产代码；mem0；免审进 KB；自动提案写 `memory/business/*`

## Decisions

### D1 — TurnHarvest 唯一自动主线（文档）；idle = legacy/fallback
### D2 — 三知识对象 + proposal_kind 两维；local = UI + **Agent 显式写**（非自动沉淀）
### D3 — P0 漏召 org KB；P1 提纯；多提案 + Inbox
### D4 — Session bind 前置
### D5 — Hermes 拆层；官方 SHA `1600008ab00e…`
### D6 — applied 晋升
### D7 — 出站默认（C0 锁）
| 项 | 默认 |
|----|------|
| 租户 | **allow**（可改 deny） |
| 会话 suppress | **覆盖为 deny** |
| 脱敏失败 | **fail-closed** |
| 字段 | 客户/供应商/项目号/价格/合同正文，不仅密钥电话 |

PO 可改为 deny-until-opt-in；未声明则本表生效。

### D8 — 参数
checkpoint coalesce **1s**；nudge **N=5**；idle fallback **10min**  
E2E：5 turns，或测试 N=3，或 force——禁止「3 turns + 默认 N=5」混写。

### D9 — Watermark / lease / outcome
见 `hermes-trigger-port.md` §4–5 与 `turn-harvest-runtime` spec。

## Risks / Trade-offs

| Risk | Mitigation |
|------|------------|
| Agent 本地写 vs 企业期望上云 | 路径 B 明确非 Org KB；上云仍走 Inbox |
| Detached orphan workers | lease + ignore stale |
| 出站仍泄露业务实体 | fail-closed + 字段清单 |

## Migration Plan

1. C0 v3 docs + registry four-kinds ✅  
2. PO ack 出站默认（本 D7）  
3. Phase 0 bind smoke  
4. 开 `precipitation-hermes-trigger`

## Open Questions

1. 漏召主因占比 → 待 bind smoke 数据  
2. ~~outbound 默认~~ → **D7 已锁且 PO ack（2026-07-16 执行）**  
3. ~~memory/business~~ → D2 路径 B  
4. ~~N / E2E~~ → D8
