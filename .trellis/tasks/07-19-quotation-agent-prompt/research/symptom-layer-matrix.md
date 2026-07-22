# Symptom layer matrix — quotation failures (Phase 1a)

**Date:** 2026-07-21  
**Task:** `07-19-quotation-agent-prompt`  
**Method:** Map recent Guid/现场 + closeout evidence → H1/H2/H3/H4/Other.  
**Does not implement L1 slim.**

## Hypothesis legend

| Id | Layer | Meaning |
|----|-------|---------|
| **H1** | orch / relay | 子工具齐，父泡缺锁码+价（「交给专家」） |
| **H2** | quotation L1 overload / shape | 子正文空壳/BAD、决策表缺行、双教义；或 L1 过长导致忽略 |
| **H3** | hooks / modes / ROE | 查价被 gate 误伤或死循环 |
| **H4** | routing DIY | 未走 MCP / 未 `Agent(quotation-agent)` |
| **E** | engine / skill / data | matcher、skill 文本、价库召回 — **非**本 plan 2b 主刀 |

## Matrix (≥5)

| # | Date | Symptom (user-visible) | Evidence | Primary | Secondary | Notes |
|---|------|------------------------|----------|---------|-----------|-------|
| 1 | 2026-07-20 | 委派查价：工具 done，父泡只「交给报价专家」，无码无价 | prd §症状1；plan 背景图 | **H1** | H2 if 子正文也空 | 经典「缺斤少两」 |
| 2 | 2026-07-20/21 | 子工具齐但写「按 A 选项已交付」类空壳 | `07-21-quotation-relay-stale-fix` closeout；select-ok nudge 曾漏接线 | **H2** (子正文) | H1 if 父仍不转 | 修 **wiring + nudge**，非单纯砍行数 |
| 3 | 2026-07-20 | 「直接50」却 Bash/find/openpyxl 扫盘，零 `match_quotation` | `research/symptom-2026-07-20-mcp-bypass-diy.md` | **H4** | — | 先 NO_DIY / orch 委派；**不是** L1 太长 |
| 4 | 2026-07-20 | Accurate 只读查询却 Write/xlsx + ROE 误伤 | sibling `07-20-accurate-…` closeout | **H3** (accurate ROE) | — | 对照用；**勿并进 quotation 2b** |
| 5 | 2026-07-20 | ≥3 码「查库存」走 N× 单查 | `07-20-inventory-batch-multi-code` | **H2** (决策表缺 ≥2 batch 行) | — | **缺合同句**，不是「字太多」；已修并 Guid PASS |
| 6 | 2026-07-20 | learn-by-data thrash：错 KB 路径 + Bash + 残缺 select | `07-20-learn-by-data-select-first` | **E** (skill 双教义) | H2 弱相关 | 修 skill select-first；Guid「这次还不错」 |
| 7 | 2026-07-20 | Elbow 3" AW：价库有码、match 0 候选 | `07-20-elbow-3inch-aw-zero-candidate` | **E** (field-rule `/` 解析) | — | 非 L1；Approach B parser 已修 |
| 8 | 2026-06-28→07 | L1 451→~180 后又胀回 **399** | agents-unified L1 slim 注记；当前 linecount | **H2 pressure** | process | 瘦身**未制度化**（新合同不断塞回 L1）→ 再砍若无「锚点→maint」纪律会再胀 |

## Counts (by primary)

| Layer | Count in matrix | Share of “user thinks quotation broken” |
|-------|-----------------|----------------------------------------|
| H1 | 1 clear (+#2 secondary) | **高** for「看不到价」类 |
| H2 | 2–3 (#2 shape, #5 missing row, #8 inflation) | **中** — 但不等于「行数」是主因 |
| H3 | 1 (accurate sibling) | 低 for quotation query path |
| H4 | 1 | 偶发但致命 |
| E | 2 | 近期 Guid 实锤不少在此 |

## Attribution gate (recommended verdict)

### Q: 主因是不是 H2 / L1 过载？

**不能把「现在就执行三刀 / 腰斩到 120–180」建立在「主因=H2」上。**

| User pain class | Primary | What to do first |
|-----------------|---------|------------------|
| 工具齐、用户看不到码/价 | **H1** | Phase **2a** orch query relay（plan 原门禁） |
| 子空壳 / 缺决策行 / 双教义 skill | **H2 子集** | 补锚点或 skill；**不是**无差别删合同句 |
| DIY 扫盘 | **H4** | NO_DIY + orch 第一步 Agent |
| 0 候选 / 错召回 | **E** | matcher / KB parse（已有独立 task） |

### On 06-28 rebound (451→180→399)

这是 **H2 过程债**（新 WANd.* 全堆 L1），**不是**证明「再砍到 120–180 就能稳态」。  
上次瘦身没稳住，说明缺的是：**锚点注册表 + maint 分层纪律**（07-11 inventory），不是更激进的字数 KPI。

### Soft vs hard line target

| Target | Verdict |
|--------|---------|
| Hard **120–180** now | **拒绝作为批准条件** — 与十几条回归锚点冲突风险高；MiniMax 是否主动 Read maint **未证伪** |
| Soft「合同保全下分层」 | **可接受** — 先 1c 映射 07-11 inventory；迁出填单/learn/Org 长文；**行数结果事后量，不事前锁死腰斩** |

## Recommended serial path (after you confirm)

```text
Phase 1a ✅ (this file)
    → 你确认归因
    → 2a first（若仍关心「交给专家」）  OR  skip 2a if 你已有 Guid 证明父转发已稳
    → 2b only as contract-preserving slim（1c inventory 先行；无硬 120–180）
    → 2c optional（hooks 减负，小步）
```

**不建议：** 跳过本矩阵、直接「批准三刀执行到 120–180」。

## Open confirmation (need your one line)

请回一句主路径：

1. **「主因 H1，先 2a」**  
2. **「父转发已够稳，只做 2b 合同保全瘦身（不要硬 120–180）」**  
3. **「串行：先 2a 再 2b（推荐）」**  

确认前 **不** 改 `quotation-agent.md`。
