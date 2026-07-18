# Execution Plan — 轻量主入口 + Dispatch（唯一真相）

| Field | Value |
|-------|--------|
| **Status** | **done** — MVP closed 2026-07-15（`closeout.md`） |
| **Scenario** | L done → **A/C**（dispatch harden） |
| **Plan depth** | **Full** |
| **Verification profile** | **UI** + agent eval/smoke + **业务 oracle** |
| **Repos** | aionui-src · CCB · agents · `eval/` · `07-04` matrix |
| **Active phase** | **closed** |
| **PRD sync** | 与 `prd.md` LD1–LD9 一致（**Guid 零卡**，用户 2026-07-15 改口） |

**Doctrine：** 业务交付完整 > 「调了 Agent」；Guid **零卡**；价库管理走侧栏/页面，不靠 Guid 卡。

---

## Skills invoked

| Invocation | Type | Evidence |
|------------|------|----------|
| trellis-before-dev | Read: | agents-unified · agent-team-architecture · Guid catalog |
| system-review adopt | Chat: | 2026-07-15 report → `research/system-review-adoption.md` |
| prior explore | research/ | phase3-dispatch-exploration · guid baseline |

---

## Progress snapshot

| Phase | State | Delivery |
|-------|-------|----------|
| R Pi research | **done** | `research/pi-vs-*` · safe-adoption · mcp-health |
| D0 四方面探查 | **done** | `phase3-dispatch-exploration.md` |
| G0 Guid 根因 | **done** | `research/guid/*` |
| Review 采纳 | **done** | `system-review-adoption.md` · PRD LD* |
| Benefit 复审 | **done** | `research/benefit-review.md` |
| **D1 MVP 矩阵** | **done** | `mvp-matrix.md` **LOCKED** · `p-d1-matrix-locked.md` |
| **D2 Harden 红项** | **done** | `research/d2-case1-case3-diagnosis.md` · `p-d2-harden-done.md` |
| **D3 计时 + 证据** | **done** | `research/d3-matrix-evidence.md` · `p-d3-matrix-evidence-done.md` |
| **G1 Flag（默认 off）** | **done** | `p-g1-zero-card-flag-done.md` · aionui `guidZeroCard.ts` |
| **G2 默认零卡** | **done** | `p-g2-default-zero-card-done.md` · default on · registry + UI smoke |
| **UI smoke** | **done** | Guid 零卡 + 侧栏价库（用户 2026-07-15） |
| **Closeout** | **done** | `closeout.md` |
| Write-ops track | deferred · user skip | 确认/幂等/产物 — **不做** |
| O pi packaging | docs-only | 永不本 MVP — **不做** |
| B1 View Steps meta | debt · user skip | P2；B0 已够 — **不做** |
| reopen 身份 | deferred | 不挡 MVP close |
| lint | **done** | lint_execution_plan.py **PASS** |

---

## Phase -1 — Capability matrix

| Capability | Status | Note |
|------------|--------|------|
| Agent() sync sidechain | available | 非 OS 独立进程 |
| smoke suite 委派 4 条 | available | **不足**证明四类完整交付 |
| 07-04 矩阵 | **partial FAIL** | Case1 timeout · Case3 L0 bleed · 2/4/5/6 pending |
| Path B 作真相 | **不可用** | 报价直连也 FAIL |
| price-library Guid-only card | **产品不要** | 改走侧栏 `#/price-library` |
| Guid 零卡 | **locked** | 用户：全去掉，不保留 |
| Parallel Agent | unavailable | 禁止 |

---

## Contract map

| Contract | Behavior protected | Primary | Verification |
|----------|--------------------|---------|--------------|
| **WANd.ORCH.DISPATCH.001** | 主入口意图→正确委派→**业务 oracle PASS**（非仅 Agent 出现） | L1 · runAgent · gates | `mvp-matrix.md` 行 |
| **WANd.ORCH.ORACLE.001** *(prov)* | 每行：目标工具 + 结果字段/产物 + 成功/澄清/失败类 | eval/harness | 矩阵列定义 |
| **WANd.GUID.SINGLE_ENTRY.001** | Guid **零卡**（无助手 shortcut） | `filterGuidCatalogAgents` → 空（仅 Guid 面） | vitest：Guid 列表空；Team 仍有数据 |
| **WANd.GUID.ADMIN_ESCAPE.001** | ~~保留 Guid 价库卡~~ → **改：** 价库经 `#/price-library` / 侧栏可达 | OrgDatabase / PriceLibraryPage | UI smoke |
| Specialist resume | 历史直连不漂移 | warmup | reopen |
| docs-only pi | 不换装 | research | N/A |

---

## Workstreams

| Phase | Pri | Workstream | touches | Output |
|-------|-----|------------|---------|--------|
| R/D0/G0 | — | 研究 | docs | **done** |
| **D1** | **P0** | 锁四行矩阵 + oracle + 环境钉（模型/安装/超时） | ORACLE.001 | `mvp-matrix.md` 填满 |
| **D2a** | **P0** | Case1：未委派/超时 — 计时+根因（非碰运气改 prompt） | DISPATCH.001 | research + fix |
| **D2b** | **P0** | Case3：L0 bleed — 与 D2a **分开** | DISPATCH.001 | specialist L0 isolation |
| **D3** | **P0** | 四行跑绿；记录 latency 三截 | DISPATCH.001 | smoke-evidence |
| **G1** | P1 | Guid **零卡** flag（默认 off）；只伤 Guid 面 | SINGLE_ENTRY | Guid 空列表 |
| **G2** | P1 | 默认零卡；侧栏价库仍可用 | ADMIN_ESCAPE 改路径 | smoke |
| W | P2 | 写操作轨 | 另合同 | deferred |
| B1 | P2 | delegation meta | OBSERVE | debt |
| O | — | pi pin | docs-only | no-op |

**Serial:** D1 → D2a∥D2b（可并行调研，合并前各自证据）→ D3 → G1 →（批准）G2。

---

## TDD contract

| WS | RED | GREEN |
|----|-----|-------|
| D1 | 矩阵缺 oracle / 环境钉 | `mvp-matrix.md` 四行完整可执行 |
| D2a | Case1 timeout 无 Agent | 同题：Agent+oracle 在预算内 |
| D2b | Guid 报价 L0 bleed | 直连：`match_quotation` 无 orchestrator 禁令 |
| G1 | Guid 仍有卡 / Team 被误清空 | Guid=[] 且 Team catalog 非空；`#/price-library` 可开 |

---

## Contract Verification

| Contract | Verification | Status |
|----------|--------------|--------|
| Research + review 采纳 | memos | **PASS** |
| ORACLE.001 / DISPATCH.001 | `mvp-matrix` 行证据 | **D3 PASS**（R1–R3） |
| ADMIN_ESCAPE / SINGLE_ENTRY | Guid 零卡 + 侧栏价库 | **G2 PASS**（default on · registry）；UI smoke optional |
| plan lint | `lint_execution_plan.py` 本文件 | **PASS** |

```powershell
python ./.trellis/scripts/lint_execution_plan.py .trellis/tasks/07-15-pi-vs-claude-code-b/execution-plan.md
```

---

## Manual steps

- [x] D1：填满 `research/mvp-matrix.md`（评审锁的四行）  
- [x] D3：R1–R3 success PASS（clarify/fail **N/A this run**；见 `d3-matrix-evidence.md`）  
- [x] 可默认单入口：R1–R3 oracle PASS + 零卡 + 侧栏价库签字（UI smoke 2026-07-15）  

## Recovery

| Trigger | Action |
|---------|--------|
| 某 specialist 长期不可修 | 保留该 shortcut；缩小「可隐藏」集合 |
| 写操作被误拉进 MVP | 打回 W 轨；read-only 边界 |

## Approval

- **已完成 / 收口：** D1–D3；G1–G2；UI smoke；用户确认 Write-ops / B1 / pi **不做**  
- **Out of MVP：** reopen 身份（另验）；「全自动」权限产品另线  