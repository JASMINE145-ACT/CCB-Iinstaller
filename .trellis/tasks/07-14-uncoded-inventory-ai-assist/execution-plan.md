# Execution Plan — Accurate Item 同步价库（抓取 → 存放 → 查缺补漏）

| Field | Value |
|-------|--------|
| **Status** | **in_progress** — Phase 1–2 done；Phase 3 report done，draft upsert/publish 待续 |
| **Active phase** | **Phase 3b** — Org price-library draft import（手闸 publish） |
| **Scenario** | **L→A**（API 能力需新建分页 dump） |
| **Plan depth** | **Full** |
| **Verification profile** | **Cross-repo** |
| **Repos** | Python AOL client；`item-list-slim.xlsx`；Org price-library draft/import/publish |
| **Related** | 原 CODE_MAP / PROCURE_ENROLL 仍有效，排在 **存量全量同步之后**（Phase 4+） |

---

## Skills invoked (this planning session)

| Invocation | Type | Evidence |
|------------|------|----------|
| trellis-before-dev | Read: | packages single-repo；integration price-library + inventory |
| trellis-task-execution | Read: | Contract→TDD→Verify |
| Accurate dump explore | Agent: explore | `research/accurate-item-dump-gap-fill.md` — 无全量 dump；list.do 需关键词；slim xlsx 为离线样板；价库 draft→publish 已有 |
| User lock 2026-07-14 | — | **1 API 抓 2 存放好 3 对比价库查缺补漏** |

---

## Product spine（业务口径）

```text
Accurate Item（API）
    → 本地权威快照（存放）
    → 与价格库按 material_code / Item Code 对比
    → 缺的增补进价格库 draft（查缺补漏）
    → 人工确认后 publish
```

**不是：** AI 猜库存；无确认 publish；全量覆盖已有档位价。

---

## Locked decisions

| # | Decision | Locked |
|---|----------|--------|
| D1 | 抓取源 | Accurate Online **`/api/item/list.do`**（+ 必要 `detail.do`）；凭证既有 `AOL_*` / `.env.accurate` |
| D1b | **分页/分批** | **明确允许且推荐**：按 `sp.page` / `sp.pageSize`（或等价）分批拉全表；支持 checkpoint 续跑。不必单次无过滤「一枪打完」 |
| D2 | 今日缺口 | 现网 list 常需关键词 → dump 脚本用**分批策略**覆盖全集（空关键词分页 / 分类分批 / UI 导出降级，择一可证明完备） |
| D3 | 存放格式 MVP | **`item-list-slim.xlsx` 兼容 schema**（`Item Code` / `Item Name` / `Chinese name`…）于 `{INSTALL}/vendor/wanding/data/`；另存带时间戳的 raw jsonl 审计包 |
| D4 | 价库补洞 | 仅 **draft upsert / xlsx import**；`confirmed` 预览；**publish 单独一步**（price_admin） |
| D5 | 对比键 | Accurate `Item Code` ↔ 价库 `material_code`（大小写/空白规范化） |
| D6 | 覆盖策略 | **缺则插**；已存在码：**不覆盖售价/档位**（除非显式 `--update-names-only` 类开关，默认关） |
| D7 | 增量采完即登记 | **Phase 4+**（PROCURE_ENROLL）；本轮主路径 = **一波全量同步** |

---

## Phase -1 — Capability matrix

| Capability | Status | Fallback |
|------------|--------|----------|
| Item list by keywords/code | **available** | table_agent |
| **Unfiltered full Item dump** | **unavailable** → **to build** | Manual export from Accurate UI → xlsx |
| Local slim xlsx | **available** (stale possible) | Refresh via dump |
| Price library draft import | **available** | MCP / VPS |
| Auto publish | **available but gated** | Never auto in script default |

**Risk tags:** `external-api` · `packaging` · `security`（creds）· `ui`（publish）

---

## Progress snapshot

| Phase | State | Delivery |
|-------|-------|----------|
| -1 / 0 | **done** | capability + research dump note |
| 0.5 | **done** | 旧 blocker（task.json / 禁 search_inventory）仍成立 |
| **1** | **done** | ITEM_DUMP：分页 API；live **8316**；`p1-item-dump-done.md` |
| **2** | **done** | ITEM_STORE：slim + jsonl；`p2-item-store-done.md` |
| **3** | **partial** | GAP **report** done（7074 insert_draft）；**draft upsert/publish 仍 open** |
| 4 | pending | Agent CODE_MAP / PROCURE_ENROLL（原路径） |
| 5 | pending | 可选 search_inventory MCP |
| lint | pending | 本文件 lint |

---

## Contract map

| Contract | Behavior protected | Primary code | Tests / smoke | Risk |
|----------|--------------------|--------------|---------------|------|
| **WANd.ACCURATE.ITEM_DUMP.001** | 可分页拉取 Item 全表（或可证明的完备子集）；失败可重试 | `python/inventory/...` dump script | unit mock list pages + live smoke（有凭据时） | external-api |
| **WANd.ACCURATE.ITEM_STORE.001** | 快照可复现、不丢码；刷新路径明确 | write `item-list-slim.xlsx` + `accurate-item-dump-*.jsonl` | schema columns assert | packaging |
| **WANd.ORG.PRICE_GAP_FILL.001** | Accurate∖价库 → draft 行；不静默改价；publish 显式 | price-library import/upsert | dry-run report + draft count | security |
| WANd.INV.CODE_MAP.001（后续） | 名↔码查询辅助 | jsonl map | later | ui |
| WANd.INV.PROCURE_ENROLL.001（后续） | 采完同轮登记 | agent | later | ui |

### Contract: WANd.ACCURATE.ITEM_DUMP.001

**Behavior protected:** Ops 能用 API **分批**拉齐 Accurate Item 集（分页 + checkpoint）；单批失败可续跑。  
**Primary code:** new `python/inventory/scripts/dump_accurate_items.py`（或 `services/item_dump.py`）基于 `AccurateOnlineAPIClient`.  
**Tests:** mock multi-page / multi-batch list merged without dup codes.  
**Smoke:** live dump row_count > 0（dev `.env.accurate`）.  
**Risk:** AOL 限流 / 超时 — 用更小 pageSize、backoff.

### Contract: WANd.ACCURATE.ITEM_STORE.001

**Behavior protected:** dump 结果落到 slim xlsx + 带版本/时间戳 raw；resolver 可读新文件。  
**Primary code:** writer aligning `ITEM_LIST_SLIM_PATH` columns.  
**Tests:** round-trip N rows → xlsx → read codes set.  
**Risk:** 覆盖 slim 导致 resolver 空窗 → 写临时文件再 atomic replace.

### Contract: WANd.ORG.PRICE_GAP_FILL.001

**Behavior protected:** `codes(store) - codes(price_lib_active)` → import draft；报告 inserted/skipped；**default 不 publish**.  
**Primary code:** gap script + `preview_price_library_import` / `apply` 或批量 upsert.  
**Tests:** fixture store vs fixture price lib → expected insert set.  
**Smoke:** draft diff count；人工抽 3 个堵漏王/杂项码.  
**Risk:** 错表覆盖 draft；publish 误点.

---

## Workstreams

| Phase | Priority | Workstream | touches | Risk | Tool | Files | Required output | Profile |
|-------|----------|------------|---------|------|------|-------|-----------------|---------|
| 1 | **P0** | Item **分批/分页** 拉取（pageSize 可配；checkpoint 续跑；必要时按类目/字母分批） | ITEM_DUMP.001 | external-api | TDD | python/inventory | dump CLI exit 0 + count | Cross-repo |
| 1 | P0 | 限流 backoff + 失败重试（单批失败不丢已拉批次） | ITEM_DUMP.001 | external-api | — | same | 可中断续跑 | Cross-repo |
| 2 | **P0** | 写入 **slim xlsx** + raw jsonl 快照目录 | ITEM_STORE.001 | packaging | TDD | vendor/wanding/data | 文件存在 + schema | Cross-repo |
| 2 | P1 | 文档：路径、刷新命令、勿提交含 raw 机密 | docs-only | — | — | spec / runbook | runbook § | Fast |
| 3 | **P0** | Diff：store codes vs price-library active | PRICE_GAP_FILL.001 | — | TDD | scripts/gap_fill | report.csv（缺码列表） | Cross-repo |
| 3 | **P0** | 生成价库 import xlsx / batch upsert **draft only** | PRICE_GAP_FILL.001 | security | — | price-library MCP/API | draft 增加 N 行 | Cross-repo |
| 3 | P0 | **手闸 publish** + 回滚说明 | PRICE_GAP_FILL.001 | security | — | runbook | publish checklist | UI |
| 4 | P1 | （原）CODE_MAP / 采完 enroll / agent miss 路径 | CODE_MAP + ENROLL | ui | — | agents | 增量闭环 | UI |
| 5 | P2 | （可选）search_inventory MCP | NAME_SEARCH | packaging | — | quotation-server | 需另批 | Cross-repo |

**Close rule（本轮 MVP）：** Phase 1–3 PASS → 一波 Accurate→存放→价库 draft 查缺补漏完成；publish 由人确认。Phase 4 防回潮。

---

## TDD contract

| Workstream | Contract | RED evidence | GREEN command | Refactor guard |
|------------|----------|--------------|---------------|----------------|
| paginated dump | ITEM_DUMP.001 | 无 keywords 只能空列表 | unit：fake 3 pages merged | 同 |
| slim writer | ITEM_STORE.001 | 缺列 / 空码 | round-trip test | 同 |
| gap diff | PRICE_GAP_FILL.001 | 交集算错 | fixture diff assert | 同 |
| no price overwrite | PRICE_GAP_FILL.001 | 已存在码仍改价 | skipped_unchanged | 同 |

---

## Contract Verification

| Contract | Verification | Evidence | Status |
|----------|--------------|----------|--------|
| ITEM_DUMP.001 | dump CLI + row_count | live 8316；unit 8 passed | **PASS** |
| ITEM_STORE.001 | slim xlsx schema + resolver 可读 | `data/item-list-slim.xlsx` | **PASS** |
| PRICE_GAP_FILL.001 | report + draft only（未自动 publish） | gap CSV 7074；upsert API **pending** | **partial** |
| plan structure | `lint_execution_plan.py` | PASS | pending |

---

## Verification profile and gate

**Selected:** Cross-repo

```text
1. code-reviewer（dump/import 脚本 + 不写死密钥）
2. 真实产物：raw 快照行数、slim xlsx、gap report、draft 增量（非 tools/list）
3. publish 不进默认脚本；需手闸
4. 更新 Progress + 本 research / price-library 交叉引用
```

---

## Recovery / re-approval

| 触发 | 动作 |
|------|------|
| AOL 无法无过滤 list（API 限制） | Fallback：Accurate UI 导出 → 仍走 STORE + GAP_FILL；DUMP 合同改「导入适配器」 |
| 要求脚本自动 publish | **re-approve** |
| 全量覆盖已有售价 | **reject** 默认；仅显式 flag |
| 跳过存放直接写价库 | **re-approve** — 违反「先存放再对比」 |

---

## Manual smoke checklist

- [ ] Dev 凭据下 dump 行数合理（与 Accurate 品数同級）
- [ ] slim xlsx 含已知杂项码（抽查）
- [ ] gap report 含「价库无、Accurate 有」样例
- [ ] apply → **draft** 可见；**未**自动 publish
- [ ] publish 后报价能 `match_quotation` 命中新码并可 `get_inventory_by_code`

---

## 执行口令

用户说 **「执行 task」** → 从 **Phase 1 ITEM_DUMP** 起，严格顺序 **抓取 → 存放 → 对比补洞（draft）**。  
Publish 与 Phase 4 Agent 增量另确认。
