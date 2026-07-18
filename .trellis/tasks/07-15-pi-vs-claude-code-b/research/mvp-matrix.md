# MVP Dispatch Matrix — D1 **LOCKED**

**Status:** locked 2026-07-15（执行 D1）  
**Benefit gate:** 见 `benefit-review.md` — 本文件不改运行时，只钉验收靶心。

## Environment pin

| Pin | Value |
|-----|--------|
| Install | `D:\CCB-Wanding` |
| Config | `%LOCALAPPDATA%\CCB-Wanding\.claude\settings.json` |
| Model | `minimax-m3`（settings `ANTHROPIC_DEFAULT_*_MODEL`） |
| Route | Route-B / ACP；CLI 测需 `CCB_TEST_ROUTE_ENTRY=1` |
| Outer timeout | **180000 ms**（评测墙）；记录三截不得只用 end_turn |
| Path B | **辅助**；自身报价线有 FAIL（07-04 Case3） |

## Timing（每行必填）

| Metric | Meaning |
|--------|---------|
| `t_dispatch` | 意图 → 首次 `Agent(` 或明确不委派 |
| `t_agent_first` | Agent 开始 → 子链首个业务工具 |
| `t_business` | → oracle 齐备 / fail 类判明 |
| `t_end` | end_turn（**不能**单独 PASS） |

## Oracle 总规则

- **PASS** = 目标工具发生 **且** 结果满足下表 **且** 行为类正确  
- 「仅出现 Agent / 仅 end_turn」= **FAIL**  
- Path B 对照可选；Path B FAIL **不自动**否决 Path A  

---

## Rows

### R1 — 报价（read）· **MVP 必过**

| Field | Spec |
|-------|------|
| Prompt (success) | `帮我查直接50价格` |
| Entry | Path A：`wande-orchestrator` |
| Target | `Agent` → `quotation-agent` |
| Business tool | `mcp__quotation__match_quotation`（子链，`parentToolUseId` OK） |
| Success oracle | 回复含可识别价格（数字+币种或「元」/档位价）或明确推荐物料码；**禁止**编造 |
| Clarify prompt | `50的价格` → 澄清类，不弱匹配硬报 |
| Fail prompt | （可选）`查一下不存在型号XYZ999的价格` → 无编造价 |
| Eval 映射 | Path A: `orchestrator-quote-delegates`；辅: `direct-quotation-card-no-delegation` / `quote-direct50-b` |
| 07-04 | Case1 曾 **FAIL timeout** → D2a；Case3 L0 bleed → D2b |
| Write? | No |

### R2 — 账务（read）· **MVP 必过**

| Field | Spec |
|-------|------|
| Prompt (success) | `帮我查1到5月销售汇总` |
| Entry | Path A：`wande-orchestrator` |
| Target | `Agent` → `accurate-agent` |
| Business tool | `mcp__accurate__accurate_summarize_records`（或合同内 search→clarify） |
| Success oracle | 非空汇总（月/总额等结构化内容）；禁止编造账务数字 |
| Eval 映射 | `orchestrator-accurate-delegates`；（严）`orchestrator-accurate-purchase-monthly-convergence` 可选加强 |
| 07-04 | Case2 pending → D3 必跑 |
| Write? | No |

### R3 — 工作任务（read-only）· **MVP 必过**

| Field | Spec |
|-------|------|
| Prompt (success) | `列出我当前的工作任务`（或当期 list 意图钉死句） |
| Entry | Path A：`wande-orchestrator` |
| Target | `Agent` → `work-tasks-agent` |
| Business tool | work-tasks **list/get** 类（禁止默认 create/update） |
| Success oracle | 任务列表或明确空列表；有条目则含 id/标题类字段 |
| Eval 映射 | 若无现成 case → D3 **手工 Guid**；创建 时补 eval |
| Write? | **No**（CRUD → W 轨） |

### R4 — Word · **MVP = DEFER**

| Field | Spec |
|-------|------|
| Decision | **DEFER 至 W 轨**（有文件副作用；07-04 Case5 曾 blocked） |
| 若强行拉入 | Prompt「做个 Word…」→ `word-creator` → 文件存在且字节 ≥ 1KB |
| Write? | Yes |

**D3 关门条：** R1+R2+R3 Path A oracle PASS；R4 不挡「可默认零卡」。

---

## Guid 零卡（G，不在 D1 改代码）

| Guid 露出 | Policy |
|-----------|--------|
| 全部助手卡（含价库、custom） | **隐藏**（用户锁） |
| 主入口 | 保留 → `wande-orchestrator` |
| 价库管理 | 侧栏 `#/price-library`（G 时验） |
| Team/Settings | **不删** |

---

## Sign-off

| Gate | Status | Date |
|------|--------|------|
| Benefit review | **PASS**（先 D1） | 2026-07-15 |
| Matrix lock (D1) | **LOCKED** | 2026-07-15 |
| D3 R1–R3 PASS | **PASS** | 2026-07-15 |
| G2 默认零卡 | **PASS**（G2 default on · registry + UI smoke） | 2026-07-15 |
| MVP closeout | **CLOSED**（`closeout.md`；W/B1/pi skip） | 2026-07-15 |
