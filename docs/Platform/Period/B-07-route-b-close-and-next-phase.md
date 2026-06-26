# B-07: Route B 收口与下一阶段 — 架构评估 → 执行映射

**状态**: v0.1 📋 规划中（**当前执行：B-06b.C 人工 E2E**）
**日期**: 2026-06-11
**周期**: Period-07（Route B 闭环 + Phase 4 启动）
**前置依赖**:
- B-01 ✅ ~ B-06b ✅（自动化）
- [架构评估 §2.6 / Path B 结论](../../prd/ccb-wanding-aionui-architecture-evaluation.md) — 旧 `--acp` / `query.next()` 已证伪
- [可行性计划 Phase 3～4](../../ccb-runtime-acp-agent-feasibility-plan.md)

**关联文档**:
- [B-06b 人工 E2E](./B-06b-aionui-registry-e2e.md) — **本阶段硬门**
- [Period README](./README.md) — B-01～B-06b 索引
- [B-05 Path A 契约](./B-05-serve-wanding-runtime-aionui-contract.md) — 浏览器壳回归

---

## 1. 架构评估里的「三条路」现在在哪

[架构评估](../../prd/ccb-wanding-aionui-architecture-evaluation.md)（2026-06-11）归纳了三条可推进路径。Route B 落地后，结论如下：

| 评估 § | 原方案 | 2026-06-11 决策 | 当前状态 |
|--------|--------|-----------------|----------|
| **§4.1 Path A** | `cli.js web` → serve-wanding Stage 1→4 | **保留** — 浏览器 `localhost:3001` 验证壳 | B-05 ✅ runtime 薄化；B-05.C/D Stage 2/3 **待本地重跑** |
| **§4.2 旧 Path B** | `cli.js --acp` → QueryEngine / `query.next()` | **废弃主线** — 结构性挂起，补丁打错层 | 由 **`--ccb-acp` + ccb-runtime** 替代（B-06） |
| **§4.3 -p headless** | 新写 fast-path + stream-json | **非 AionUI 最短路径** | 未启动；仅作「通用 CLI 替代品」远期选项 |
| **§6 立即动作** | 选 Stage 2 或挖 query.next() | **已选：新 Route B** | B-01～B-06b 代码完成 |

**关键交叉结论**（评估文档 Path B 探索附录）：

- `print-yVmZ2ahJ.js` 的 `submitMessage` 与 `-p` headless **同路径** → 修旧 `--acp` 补丁无法根治。
- `verifyAutoModeGateAccess` / REPL gate **不属于** ccb-runtime 复刻范围（可行性计划 §0.1.1）。
- **正确替代**：`ccb-runtime` 大脑 + `ccb-acp-agent` 薄壳，**不**调用 SDK `query()`。

---

## 2. 下一步是什么（一句话）

> **先完成 B-06b.C 人工 AionUI E2E，签发 `PRD_ROUTE_B_COMPLETE`；再进入 B-07 收口与 Phase 4。**

这是架构评估 §4.2「查 query.next() 真因」的**正式结案方式**——不是去修 minified QueryEngine，而是用 Route B **绕开**该路径并在 AionUI 上验收。

---

## 3. 分阶段任务

### 3.1 B-07a — Route B 闭环（**现在做**，0.5～1 天）

| ID | 任务 | 负责人 | 通过条件 |
|----|------|--------|----------|
| **B-07a.A** | B-06b.C 人工 E2E | 人工 | AionUI 发「你好」30s 内回复；无 `--acp` 误 spawn |
| **B-07a.B** | 更新 B-06b DoD 勾选 | 文档 | B-06b §3 四项 `[x]` |
| **B-07a.C** | 签发承诺 | — | `CCB_RUNTIME_ACP_E2E_OK` + `PRD_ROUTE_B_COMPLETE` |

**操作清单**（与 B-06b §3 相同）：

```powershell
cd ccb-installer
bun scripts/build-ccb-acp-agent.mjs
.\scripts\sync-aionui-ccb-route-b.ps1 -RestartAionUiWeb
# 启动 AionUI → 选 CCB Wanding → 发「你好」
```

**可选加深**（同日可做）：

- 第二条业务消息：「三通50 库存」→ 回复含 `|` 表格
- DevTools 确认子进程为 `--ccb-acp`，非 `--acp`

**不做**：

- 不再投入 `entry-WG7IeDEv.js` / `query.next()` 根因修复
- 不以 localhost:3001 Path A 代替 registry ACP E2E（两条接入面验收分离）

---

### 3.2 B-07b — 双轨回归矩阵（闭环后，1～2 天）

架构评估 §4.1 的 Stage 2/3/4 在 Route B 架构下**映射为 runtime 回归**，不是再改 serve-wanding 内嵌 loop。

| ID | 验证 | 命令 / 条件 | 对应评估 |
|----|------|-------------|----------|
| **B-07b.A** | Path A WS 契约 | `CCB_STAGE=fake bun dist/cli.js web --port=3001` + `node test-turn-completed.mjs` | §2.2 Stage 1 事件序列 |
| **B-07b.B** | Stage 2 MiniMax | `test-stage2-minimax.mjs` PASS | §4.1 Stage 2 |
| **B-07b.C** | Stage 3 MCP agent | `test-stage3-agent.mjs` PASS | §4.1 Stage 3/4 quotation |
| **B-07b.D** | ccb-api 机器口 | `test-ccb-api-server.mjs` + `test-ccb-api-server-streaming.mjs` | B-04 双轨 |
| **B-07b.E** | 浏览器 Path A | `localhost:3001` 不白屏、可对话 | 评估 §2.2 已验项复跑 |

**通过条件**：B-07b.A～D 全 PASS；E 人工抽测或截图留档。

---

### 3.3 B-07c — Phase 4 启动（2～4 周，可迭代）

可行性计划 Phase 3 完成门在 B-07a 满足；**Phase 4** 为完整度提升，建议优先级：

| 优先级 | 能力 | 说明 | 建议 spec |
|--------|------|------|-----------|
| **P0** | CI 门禁 | `no-sdk-query-import` + runtime/acp smoke 进 pipeline | B-07c 或独立 CI spec |
| **P1** | `session/list` + resume | ACP / api-server 会话列表与恢复 | 待拆 B-08 |
| **P1** | ACP `usage_update` + 真流式对齐 | 体验贴近原生 Claude Code | 待拆 B-08 |
| **P1** | 生产包同步 | `D:\CCB-Wanding\dist\` ← runtime + acp-agent + serve-wanding | deploy 脚本 |
| **P2** | quotation **表格 tool 卡片** | 评估 R3；至少 1 个 rich 卡片 | AionUI E2E 加深 |
| **P3** | 废弃旧 `--acp` | 文档 + grep 门禁标记 `entry-WG7IeDEv` deprecated | 文档-only 先行 |
| **P3** | `-p` headless | 仅当需要「非 AionUI 通用 CLI」 | 评估 §4.3，独立项目 |

**明确不做**（与评估 §5 开放问题对齐）：

| 项 | 原因 |
|----|------|
| 继续 acp-agent.js 四层补丁修 QueryEngine | 评估 Path B 附录：打错层 |
| fork AionUI React 改 provider | 可行性计划 §7 Non-Goals |
| MVP 做 PDF/diff rich 卡片 | Phase 4 P2 以后 |

---

## 4. 与架构评估 §6 对照（ supersede 表）

| 评估 §6 原动作 | B-07 处置 |
|----------------|-----------|
| 6.1 决定路线 Stage vs query.next() | ✅ 已决：**新 Route B** |
| 6.1 设 `CCB_AIONUI_STAGE=minimax` | → B-07b.B（env 现为 `CCB_STAGE`） |
| 6.2 MCP framing 分歧 | ✅ B-02 McpTransport ndjson；accurate 场景 B-07b.C 回归 |
| 6.2 quotation 工具调用 | ✅ B-02/B-03 smoke；B-07a 可选 E2E 加深 |
| 6.3 读 entry-WG7IeDEv query.next() | ❌ **关闭** — 归档诊断，不修复 |
| 6.3 verifyAutoModeGateAccess 深挖 | ❌ **关闭** — 不在 runtime 复刻范围 |
| 6.3 自定义后端 + AionUI 壳 | ✅ 即 Path A（B-05）+ 新 B registry（B-06b） |

---

## 5. 验收

| ID | 阶段 | 通过条件 |
|----|------|----------|
| **B-07.A** | B-07a | B-06b.C 人工 E2E + 双 promise 签发 |
| **B-07.B** | B-07b | §3.2 回归矩阵 A～D PASS |
| **B-07.C** | B-07c | CI smoke + 生产 sync 脚本至少 1 次成功 |

---

## 6. 完成定义 (DoD)

### B-07a（当前）

```text
[ ] B-06b.C 人工「你好」E2E PASS
[ ] B-06b §3 勾选更新
[ ] PRD_ROUTE_B_COMPLETE 可对外声明
```

### B-07b

```text
[ ] test-turn-completed.mjs PASS（web server 运行中）
[ ] test-stage2-minimax.mjs PASS
[ ] test-stage3-agent.mjs PASS
[ ] test-ccb-api-server*.mjs PASS
```

### B-07c（Phase 4 启动）

```text
[ ] CI 门禁草案或首条 pipeline job
[ ] B-08 spec 草稿（session/resume + usage）或 trellis task
[ ] 旧 --acp deprecated 说明写入可行性计划 §9 文件地图
```

---

## 7. 完成承诺

```text
<promise>PRD_ROUTE_B_COMPLETE</promise>        // B-07a 人工 E2E 后
<promise>CCB_RUNTIME_ACP_E2E_OK</promise>      // 同上
<promise>B07_REGRESSION_MATRIX_OK</promise>    // B-07b 全矩阵 PASS 后（可选单独签发）
```

---

## 8. 决策记录

| 日期 | 决策 | 依据 |
|------|------|------|
| 2026-06-11 | 下一步 = B-06b.C 人工 E2E，非继续挖 query.next() | 架构评估 Path B 附录 + B-06 mock 已 PASS |
| 2026-06-11 | B-07b 复跑 Stage 2/3 作为 Path A 回归，非新功能 | 评估 §4.1 未完成项在 runtime 架构下仍有效 |
| 2026-06-11 | Phase 4 从 P0 CI + P1 session/resume 启动 | 可行性计划 §Phase 4 |

**版本**: v0.1  
**下次更新**: B-07a 人工 E2E 完成后 → v0.2 勾选 DoD + 启动 B-07b
