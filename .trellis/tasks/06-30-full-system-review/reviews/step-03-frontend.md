# Step 3 — Frontend Layer 审查报告

> 日期: 2026-07-03  
> 方法: system-reviewer 子代理 + Trellis frontend spec 对照 + 基线复验  
> 范围: `D:\Projects\aionui-src\packages\desktop\src\renderer\`、共享 `common/` 模块、CCB IPC 桥、Settings/Guid 路由  
> **未深入:** Business Python/MCP 实现（Step 4）、Ship/Ops 冷构建（Step 5）、Layer 3 anchor session

---

## 成熟度

**7/10** — ACP 渲染主路径（`turn_id`、catalog 统一、startup readiness 管线、2026-07-03 能力扩展白屏修复）在代码层落地良好且有单测；但 spec 自评 Frontend **8.5/10** 偏高：AskUserQuestion UI 与 Backend deny 脱节（BE-P0-2）、FE-P0-1 五条 AC 尚无人工 smoke 证据、Guid 配置错误缺一键修复 CTA。Manual smoke A 全 pending（`baseline-2026-07-03.md`）。

---

## 1. 系统地图（Frontend 在 4 层链中的位置）

```text
User (Guid / Conversation / Settings)
  → renderer (React + SWR)
  → ccbIpcBridge / ccbMcpBridge (preload IPC)
  → main process (ccbStartupReadiness, ccbMcpHealth, wanDMcpWarmup trigger)
  → aioncore.exe → route-b → cli.js --acp (Step 2)
```

| 区域 | 职责 | 关键文件 | 判断 |
|------|------|----------|------|
| **ACP 消息流** | NDJSON → chat messages | `chatLib.ts`, `acpMapping.ts`, `hooks.ts`, `MessageList.tsx` | `turn_id` + stale filter 已接 |
| **权限 UI** | tool permission Allow/Reject | `MessageAcpPermission.tsx` | 通用卡片；**无 AUQ 路由** |
| **AUQ 组件** | 多轮问答卡片 | `MessageAskUserQuestionCard.tsx` | **零 import — 死代码** |
| **Catalog** | Guid / 会话 / preset 统一 | `fetchAssistantsCatalog.ts`, `useConversationAgents.ts`, `usePresetAssistantInfo.ts` | 统一 SWR key |
| **CCB authority** | 检测 + Settings 门控 | `useCcbAuthorityActive.ts`, `CapabilitiesSettings.tsx` | 白屏修复架构正确 |
| **MCP health UI** | Settings 工具页 | `CcbMcpHealthPanel.tsx`, `ccbMcpHealthShared.ts` | renderer 仅用 Shared |
| **Startup readiness** | Layer 1+2 门控 | `useCcbStartupReadiness.ts`, `CcbStartupReadinessBanner.tsx`, `useGuidSend.ts`, `AcpSendBox.tsx` | 代码齐全；AC 未验 |
| **Settings 路由** | 能力扩展合并 | `/settings/capabilities`, legacy redirect | Skills + Tools lazy load |

---

## 2. 做得好的地方

1. **Catalog 统一** — `fetchAssistantsCatalog` 为 Guid、Conversation、`usePresetAssistantInfo` 单一数据源；`fetchSkillsCatalog.test.ts` 有 vitest 覆盖。

2. **`turn_id` 与会话稳定性** — `hooks.ts` 消费 `turn_id`；`staleTurnStreamFilter.ts`、`postIdleWakeWindow.ts` 抑制 idle 后乱序 chunk。

3. **Startup readiness 管线（FE-P0-1 MVP）** — `ccbMcpBridge` 同步启动 `startCcbStartupReadinessPipeline()`；IPC `getStartupReadiness` / `ensureStartupReadiness`；`useCcbStartupReadiness` 轮询；Guid banner + `isCcbStartupSendAllowed` 门控 send / initial message。

4. **2026-07-03 能力扩展白屏修复** — renderer **0** 处 `from '@/common/config/ccbMcpHealth'`；`CcbMcpHealthPanel` → `ccbMcpHealthShared`；`CapabilitiesSettings` `React.lazy(ToolsModalContent)` + `Suspense`；`ccbMcpHealthDiagnosis.test.ts` **9/9 PASS**。

5. **Settings 路由合并** — `/settings/capabilities` 承载 Skills + Tools；`SkillsHubSettings` 保留 `?tab=` 当清除 `?highlight=`。

6. **Permission mode sync（07-01）** — send 路径与 spec 对齐（`chat-acp-flow.md`）。

---

## 3. Spec ↔ Code 差距表

| 优先级 | 差距 | Spec 说 | 代码现实 | 修复建议 | Owner |
|--------|------|---------|----------|----------|-------|
| **P0** | AskUserQuestion UI 脱节 | `chat-acp-flow.md` §3.5b：`MessageAcpPermission` → `MessageAskUserQuestionCard` | `MessageList.tsx` 仅渲染 `MessageAcpPermission`；**`MessageAskUserQuestionCard` 无任何 import** | 与 Backend 二选一：(A) 更新 spec 为「CCB 禁用 AUQ」并标组件 deprecated；(B) 恢复 Backend AUQ + 接线卡片 | Frontend + Backend (BE-P0-2) |
| **P0** | FE-P0-1 AC 未验收 | `06-28` AC 1–5 | 实现存在；**manual smoke 全 pending** | 执行 P2：`delivery-fe-p0-1-verify-*.md` + 日志顺序证明 | Frontend |
| **P0** | 配置错误缺修复 CTA | AC4 + `mcp-health.md` one-click repair | `CcbStartupReadinessBanner` 仅展示 error 文案，**无 `repairHealth` 按钮** | 从 `CcbMcpHealthPanel` 复用 repair IPC 或链到 Settings | Frontend (P3 候选) |
| **P1** | `scheduleWanDMcpWarmup` 仍在 session/new | `06-28` 设计：warm 在 app open | `progress-2026-06-28.md` 注明仍跑 session/new；app warm **减轻**但未移除 | 文档化或 Phase 2 移除重复 warm | Frontend + Integration |
| **P1** | 专用 startup smoke 脚本 | AC5 extend smoke | `test-mcp-health.ps1` PASS；**无 startup-readiness 专用脚本** | 增 `test-startup-readiness.ps1` 或文档化 manual 清单 | Integration |
| **P1** | Greeting 生产者 | `acp-session-flow.md` 事件序列 | Backend `newSession` 不 emit greeting；Frontend Guid/首条 prompt 产生 | spec 标明职责或统一契约 | Frontend + Backend |
| **P2** | `TODO(defensive)` renderer 扫描 | `defensive-fix-policy.md` | **0** 匹配 `TODO(defensive)` in renderer | 保持；定期 re-scan | Frontend |
| **P2** | Layer 3 anchor session | `06-28` 设计 Layer 3 deferred | 未实现 | 单独子任务 | Frontend |

---

## 4. FE-P0-1 vs `06-28` AC 对照

| AC | 要求 | 代码状态 | 验证状态 |
|----|------|----------|----------|
| **1** | 登录后 2 min 内 MCP warm **早于** conversation create | `ccbStartupReadiness.ts` Layer 2 + `wanDMcpWarmup` 复用 | ⏳ 需 main 日志顺序 |
| **2** | Guid 卡片/输入显示就绪；Layer 2 前不可发送 | `CcbStartupReadinessBanner`, `isCcbStartupSendAllowed`, `AcpSendBox` | ⏳ 需 UI smoke |
| **3** | 首条「查询 直接50 价格」无 Failed to fetch | send gate await readiness | ⏳ 需 E2E smoke |
| **4** | 配置错误可见 + 一键修复 | Banner 可见；**repair CTA 缺失** | ⚠️ 部分 |
| **5** | smoke 脚本仍 PASS | `test-mcp-health.ps1` exit 0 (51 checks) | ✅ CLI；startup 专用脚本无 |

**判定:** 实现约 **70–80%**；**不可 close FE-P0-1** 直至 P2 manual 证据 + AC4 缺口处理。

---

## 5. BE-P0-2 前端相关性

| 项 | 状态 |
|----|------|
| Backend `permissions.ts` deny AUQ | Step 2 已确认 |
| Frontend `MessageAskUserQuestionCard` | 完整实现，**未挂载** |
| `MessageAcpPermission` | 通用 Allow/Reject；需 `tool_call` |
| `askUserQuestionIds` / 相关测试 | 存在但无生产路径 |
| **建议** | P4 仅当决策为「恢复 AUQ」；否则 **spec 同步 + 标 orphan 组件** |

---

## 6. 2026-07-03 白屏修复复验

| 检查 | 结果 |
|------|------|
| `rg "from '@/common/config/ccbMcpHealth'" renderer` | **0** |
| `CcbMcpHealthPanel` imports | `ccbMcpHealthShared` only |
| `ccbMcpHealthDiagnosis.test.ts` | **9/9 PASS** |
| Live Settings → 能力扩展 | ⏳ pending（dev 未跑 smoke） |

---

## 7. 推荐下一步（仅建议，本 Step 不写代码）

1. **P2** — 跑 Manual smoke A + B；产出 `delivery-fe-p0-1-verify-2026-07-03.md`。
2. **BE-P0-2** — 产品决策：deny vs restore AUQ → 更新 `chat-acp-flow.md` §3.5b。
3. **P3（若 AC4 仍红）** — Guid banner 增加 `repairHealth` CTA（最小 diff + 门禁链）。
4. **P5** — `backlog.md` 刷新 FE-P0-1 / BE-P0-2；`trellis-update-spec`。

---

## 8. 明确延后

- SHIP-P0-1 Phase 4 冷构建  
- Track B P2+ (`07-03-platform-business-decoupling`)  
- Layer 3 anchor ACP session  
- AUQ Backend 恢复（无决策前）  
- Step 4 Business / Step 5 Ship-Ops 审查  

---

## 9. 与 Step 1–2 交叉项

| 交叉 | Step 2 结论 | Step 3 结论 |
|------|-------------|-------------|
| AskUserQuestion | Backend deny | Frontend AUQ 卡片 orphan |
| MCP warm 时机 | `wanDMcpWarmup.ts` 在 session 路径 | App-open pipeline 已加；session warm 仍并存 |
| route-b / CCB authority | Integration 7.5/10 | `useCcbAuthorityActive` UI 门控一致 |

---

*Reviewer: system-reviewer (2026-07-03). Baseline: `reviews/baseline-2026-07-03.md`.*
