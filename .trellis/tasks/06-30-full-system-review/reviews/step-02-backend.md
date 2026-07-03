# Step 2 — Backend Layer 审查报告

> 日期: 2026-07-02  
> 方法: system-reviewer 子代理 + Trellis backend spec 对照  
> 范围: `ccb-installer/claude-code-b-src/src/services/acp/`（主镜像）、`ccb-installer/src/services/acp/`（对照）、`ccb-installer/config/agents/`、`ccb-installer/config/skills/ccb-subagent-gate/`、route-b 边界只读交叉核对  
> **未深入:** Frontend UI（Step 3）、Business Python/MCP 工具实现（Step 4）、Ship/Ops（Step 5）

---

## 成熟度

**7/10** — ACP 运行时核心（MCP merge、lazy prefetch、profile handoff、orchestrator guard、session rehydrate、slash manifest）在 overlay 源码中实现完整且有单测；但 `route-b-status.md` 仍停在 2026-06-12、AskUserQuestion 与 spec 严重背离、`research-agent:roe-judge` 与 Integration seed 未对齐，且 repo 内 overlay 不含 `assistantProfiles.ts` / `bridge.ts` / `capabilities.ts`（依赖上游 `D:\claude-code-B`），低于 spec 自评 Backend **9/10**。

---

## 1. 系统地图（Backend 在 4 层链中的位置）

```text
AionUI renderer (Step 3)
  → aioncore.exe (Layer 2)
  → route-b/index.js (Step 1 — env + spawn only)
  → D:\CCB-Wanding\dist\cli.js --acp
  → agent.ts / permissions.ts / agentSessionProfile.ts (Step 2 — THIS LAYER)
  → quotation/accurate/… MCP (Step 4)
```

| 模块/目录 | 职责 | 关键文件 | 判断 |
|-----------|------|----------|------|
| **ACP 入口** | `--acp` stdio NDJSON | 上游 `entry.ts`；本 repo 无镜像 | 边界正确，改 ACP 须 sync 到 `D:\claude-code-B` |
| **Session 生命周期** | `session/new`、engine 接线、MCP/tools[] | `claude-code-b-src/.../agent.ts` L723–1069 | 与 `acp-session-flow.md` 主路径一致 |
| **MCP 注册** | settings + params merge → prefetch | `resolveSessionMcpConfigs` L183–195；`omitLazySessionMcpServers` | merge 正确；lazy + `keepForProfile` 已落地 |
| **Profile / Agent** | meta → handoff → default；keep-set | `agentSessionProfile.ts` L56–81, L200–229 | handoff 消费在 `resolveSessionProfileIdForCreate` |
| **Permission 桥** | `canUseTool` → ACP `requestPermission` | `permissions.ts` L44–120 | **AskUserQuestion 已禁用**（与 spec 冲突） |
| **Orchestrator 护栏** | 禁止直连业务 MCP / 后台 Agent | `agentSessionProfile.ts` L643–704 | 与 Integration agents-unified-model 一致 |
| **Capability manifest** | slash 命令权威 | `ccb-installer/src/.../capabilities.ts`；`agent.ts` L1305–1318 | 仅存在于 `src/` 镜像，**不在** `claude-code-b-src` overlay |
| **Subagent gate** | Stop hook 校验 | `config/skills/ccb-subagent-gate/` + agent `.md` frontmatter | seed 与 `modes.json` 部分漂移 |
| **Deploy 链** | overlay → claude-code-B → dist | `sync-claude-code-b-mcp-prefetch.ps1` | 只同步 10 个 overlay 文件 + 5 个测试 |

**Repo 内两套 ACP 镜像：**

- **Canonical overlay（写这里）:** `ccb-installer/claude-code-b-src/src/services/acp/` — 17 个 `.ts` 文件
- **扩展镜像（只读对照）:** `ccb-installer/src/services/acp/` — 多 `bridge.ts`、`capabilities.ts`、`entry.ts`、`utils.ts` 等；与 overlay 在 `agent.ts` / `mcpSessionPrefetch` 等关键路径上内容一致（`keepForProfile` 等同）

**上游-only 依赖（overlay import 但本 repo 无文件）：** `assistantProfiles.js`、`bridge.js`、`mcpManifest.js`、`capabilities.js`（overlay `agent.ts` L57–75, L107–111 引用）。

---

## 2. 做得好的地方

1. **MCP merge 契约正确实现** — `resolveSessionMcpConfigs` 先 `filterMcpConfigsForAssistantProfile(loadMcpConfigsFromSettings())` 再 overlay `params.mcpServers`（dynamic scope），符合 `acp-session-flow.md` § Scenario AionUI `guide_mcp`（`agent.ts` L183–195）。

2. **Lazy MCP + profile 例外（research-agent / exa）** — `mcpSessionPrefetch.ts` 将 `excel-mcp`/`exa` 默认延后；`createSession` 传入 `keepForProfile: assistantProfile?.defaults.mcp.enabled`（`agent.ts` L813–816）；单测覆盖 research-agent 场景（`mcpSessionPrefetch.test.ts` L19–27）。

3. **Specialist 直连会话与 orchestrator 分离** — `isSpecialistDirectSession` + 空 `sessionDelegatableAgents`（`agent.ts` L892–902）；`evaluateOrchestratorToolGuard` 阻断 orchestrator 直连 `mcp__quotation__*`（`agentSessionProfile.ts` L643–660）。

4. **Idle resume / profile drift 缓解** — `tryRehydrateStaleSession` 重建时 **清空 `_meta`**，避免 stale `appliedProfileId` 覆盖 handoff（`agent.ts` L322–333）；与 `acp-session-flow.md` § 2026-06-29 一致。

5. **Route-B 关键 env 与 Integration 对齐** — `patches/aionui-ccb-route-b/index.js` L79–81 强制 `ENABLE_SEARCH_EXTRA_TOOLS=false`（非 `??`），防止 MCP 走 `ExecuteExtraTool` 失败链。

6. **Keep-set 与 price-library-agent** — `CCB_WANDING_KEEP_AGENT_IDS` 含 `research-agent`、`price-library-agent`；后者在 `CCB_GUID_ONLY_AGENT_IDS`（`agentSessionProfile.ts` L60–74），与 seed `price-library-agent.md` 一致。

---

## 3. Spec ↔ Code 差距表

| 优先级 | 差距 | Spec 说 | 代码现实 | 修复建议 | Owner |
|--------|------|---------|----------|----------|-------|
| **P0** | `route-b-status.md` 严重滞后 | Snapshot 2026-06-12；Open 项仍写 AionUI E2E pending | 此后已有 profile、MiniMax、lazy MCP、image prompt、permission sync、resume drift 等大量更新（`acp-session-flow.md`） | 按 `route-b-status.md` § Refresh policy 全量刷新；关闭已完成 Open 项 | Backend + Integration |
| **P0** | AskUserQuestion ACP 往返 | `acp-session-flow.md` § AskUserQuestion：`handleAskUserQuestion()`、`auq:`/`auqm:` 多轮 permission | `permissions.ts` L68–71 **直接 deny**，引导模型用聊天追问（`askUserQuestionPermissionResolve.ts` L7–8） | **二选一：** (A) 更新 spec 为「CCB 禁用 AUQ，chat fallback」并删 Open 项；或 (B) 恢复 `handleAskUserQuestion` + 与 Frontend 联调 | Backend (+ Frontend if B) |
| **P1** | `research-agent:roe-judge` 缺失 | `agents-unified-model.md`：所有 Stop-hook agent 的 `{agent}:roe-judge` → `block` | `modes.json` 无 `research-agent:roe-judge`（默认 `off`）；`research-agent.md` 有 Stop hook | 在 `modes.json` 增加 `"research-agent:roe-judge": "block"`；跑 `ccb-subagent-gate/tests/run-tests.sh` | Backend (config) + Integration (deploy skill) |
| **P1** | `registerSessionGateHooks` 无代码 | `agents-unified-model.md` L405：`agent.ts createSession → registerSessionGateHooks` | 全 repo **无** `registerSessionGateHooks` / `sessionGateHooks.ts`（仅 task `06-15` 计划） | 验证上游 `D:\claude-code-B` 是否已有；若无，实现或改 spec 为「仅 frontmatter Stop + Claude hook 引擎」 | Backend |
| **P1** | `resolveSessionMcpConfigs` 无 overlay 回归测 | `acp-session-flow.md` §6：可选单测 params+settings merge | overlay `__tests__/` **无** `agent.test.ts` / `resolveSessionMcpConfigs` 用例 | 在 `claude-code-b-src` 增加 merge 单测；纳入 `sync-claude-code-b-mcp-prefetch.ps1 -Build` | Backend |
| **P1** | Overlay 同步清单不完整 | `file-map.md` 列完整 ACP 面 | `sync-claude-code-b-mcp-prefetch.ps1` 仅 10 个 `.ts`；**不含** `askUserQuestionPermissionResolve.ts`、`capabilities.ts` | 扩展 sync 列表或文档标明「capabilities/bridge 仅上游维护」 | Backend + Integration |
| **P1** | `mcp-health.md` Session 探针列表过时 | 列 5 个 profile | `mcp-health-manifest.json` 已含 `research-agent`、`price-library-agent`；`test-mcp-session-health.mjs` L49–54 动态遍历 `required_mcp` | 更新 `mcp-health.md` Session 层说明 | Backend + Integration |
| **P2** | `agent.test.ts` / `bridge.test.ts` 不在 repo | Spec 称 71 pass `agent.test.ts` | overlay 仅 6 个测试文件；无 MCP wiring / tool_result 桥接测 | 从上游同步关键测试或 CI 指向上游 `bun test` | Backend |
| **P2** | Greeting 生产者职责不清 | `acp-session-flow.md` 事件序列含 greeting | `newSession` 仅返回 `sessionId/models/modes/configOptions`（`agent.ts` L1059–1064），**无**主动 greeting chunk | 在 spec 标明 greeting 由 Frontend Guid/首条 prompt 产生；或 Backend 显式 emit | Backend + Frontend |
| **P2** | `price-library-agent` 无 Stop hook | ROE universal 模式 | `price-library-agent.md` 无 `hooks.Stop`；admin 写路径靠两阶段 `confirmed` | 评估是否需 `:roe-judge`；若需要则补 frontmatter + modes | Backend (config) |

---

## 4. Top 5 风险

| 优先级 | 风险 | 证据 | 影响 | 建议 |
|--------|------|------|------|------|
| **P0** | Spec 仍描述 AskUserQuestion UI 流，生产已禁用 | `permissions.ts` L68–71 vs `acp-session-flow.md` L342–356 | 多候选报价澄清走聊天 fallback，与 Frontend AUQ 卡片/测试预期脱节 | 统一契约文档 + 端到端冒烟「多候选 → 用户选项」 |
| **P0** | `route-b-status.md` 误导部署/验收 | 标题 Snapshot 2026-06-12；Open「AionUI UI integration pending」 | 新成员按旧 snapshot 判断「未验证」或漏测已修复项 | 立即刷新 snapshot |
| **P1** | research-agent ROE 缺口 | `research-agent.md` Stop hook + `modes.json` 无 `:roe-judge` | 调研助手可空话交付而无 universal ROE block | 补 `research-agent:roe-judge: block` |
| **P1** | 改 overlay 未 sync 上游 → live dist 漂移 | `sync-claude-code-b-mcp-prefetch.ps1` 需手动 `-Build -Deploy` | AionUI 仍跑旧 `D:\CCB-Wanding\dist` 行为 | dev 链文档化「改 overlay 必 sync」；考虑 `start-dev-full` 钩子 |
| **P1** | Specialist idle resume 仍依赖 Frontend handoff | CCB 侧仅 `tryRehydrateStaleSession` 清 meta（`agent.ts` L322–326） | extra 为空且未 stage 时仍可能绑 orchestrator | 保持 Frontend `stageCcbAssistantProfileFromConversation`；Backend 加 session-health 告警日志 |

---

## 5. 与 Integration 契约

### 已对齐

| 契约 | Integration / Spec | Backend 证据 |
|------|-------------------|--------------|
| route-b spawn + env | `aionui-ccb-boundary.md` | `index.js` L70–81：`CLAUDE_CONFIG_DIR`、`ENABLE_SEARCH_EXTRA_TOOLS=false` |
| MCP settings + guide_mcp merge | `acp-session-flow.md` | `resolveSessionMcpConfigs` L183–195 |
| Handoff 文件路径 + 300s TTL | `mcp-health.md` L56–58 | `test-mcp-session-health.mjs` L66–80；消费在 `resolveSessionProfileIdForCreate` |
| Orchestrator 不得直连业务 MCP | `agents-unified-model.md` | `wrapCanUseToolForWandeOrchestrator` + `evaluateOrchestratorToolGuard` |
| ENABLE_SEARCH_EXTRA_TOOLS | `route-b-status.md` | route-b 强制 `false` |
| Vendor sync / dev 链 | Step 1 已修 Phase 2/2.1 | Backend 不阻塞；MCP 读 live `vendor/wanding` |

### 已漂移

| 契约 | Integration 说法 | Backend 现实 |
|------|-----------------|--------------|
| AskUserQuestion | Step 1 Open + `acp-session-flow.md` 完整 AUQ 流 | Backend **deny**；Integration「UI render untested」已过时 |
| Gate-J 全覆盖 | 所有 Stop-hook agent `:roe-judge: block` | `research-agent` 有 hook 但 modes 缺项 |
| `registerSessionGateHooks` | `agents-unified-model.md` architecture 表 | 代码不存在；依赖 agent frontmatter + 上游 hook 引擎（未在本 repo 验证） |
| Backend 成熟度 | `.trellis/spec/index.md` Backend **9/10** | 本审查 **7/10**（文档与 AUQ 缺口） |
| Permission mode 全自动 | `acp-session-flow.md` § 2026-07-01 | **Frontend 权威**（`ensureCcbSessionPreferredMode`）；Backend `permissions.ts` 仅 honor `bypassPermissions` via pipeline — **无额外 Backend 缺口** |

---

## 6. Step 2 检查清单核对

| 项 | 状态 | 备注 |
|----|------|------|
| `acp-session-flow.md` vs `agent.ts` 事件序列 | ⚠️ 部分 | prompt 链正确（L498–555）；greeting 非 Backend 产出；AUQ 背离 |
| MCP `resolveSessionMcpConfigs` merge | ✅ | L183–195；缺单测 |
| greeting / permission / AskUserQuestion payload | ⚠️ | permission 桥存在；AUQ disabled；greeting → Frontend |
| `route-b-status.md` 刷新 | ❌ | 仍 2026-06-12 |
| assistant profile handoff | ✅ | `resolveSessionProfileIdForCreate` + handoff consume |
| `agentSessionProfile.ts` keep-set / delegation | ✅ | L60–81, L503+ `filterDelegatableCustomAgents` |
| lazy MCP `keepForProfile` (research-agent exa) | ✅ | `mcpSessionPrefetch.ts` + test |
| slash command capability manifest | ✅ | `capabilities.ts` + `sendAvailableCommandsUpdate` |
| subagent gate / ROE / Gate-J vs seed | ⚠️ | quotation/office/accurate 对齐；**research-agent:roe-judge 缺** |
| permission mode sync (07-01) | ✅ 交叉 | Backend 侧已支持 `bypassPermissions`；sync 在 Frontend |
| specialist session resume (06-29) | ✅ | `tryRehydrateStaleSession` 清 meta；trim transcript（L1150–1154） |

---

## 7. MVP 改进路线（有序、可执行）

### Phase 1 — 立即（1–2 天）

1. **刷新 `route-b-status.md`** — 日期、MCP baseline（含 lazy exa）、已关闭 Open 项、MiniMax/profile/smoke 证据。
2. **AskUserQuestion 契约裁决** — 更新 `acp-session-flow.md` 反映 `denyAskUserQuestionUseChat`，或恢复 AUQ 并标记 breaking change。
3. **`modes.json` 补 `research-agent:roe-judge: block`** + deploy subagent-gate skill。

### Phase 2 — 结构（3–7 天）

4. **Overlay 测试补强** — `resolveSessionMcpConfigs` merge 单测；可选从上游同步 `bridge.test.ts` tool_result 用例。
5. **文档化 overlay ↔ upstream 边界** — `file-map.md` / `build-deploy-verify.md` 列出「repo 有 / 仅 upstream」文件表。
6. **验证 `registerSessionGateHooks`** — 上游 `D:\claude-code-B` 审计；实现或删 spec 引用。
7. **扩展 `sync-claude-code-b-mcp-prefetch.ps1`** — 含 `askUserQuestionPermissionResolve.ts` 等 WanD 改动文件。

### Phase 3 — 产品化（1–3 周）

8. **Backend 集成冒烟入 CI** — `test-native-acp-agent.mjs` + `test-mcp-session-health.mjs -Session`（含 research-agent / price-library-agent）。
9. **AskUserQuestion 端到端（若选恢复路径）** — Backend permission 多轮 + Frontend `MessageAskUserQuestionCard`。
10. **price-library-agent** — Session health + 写操作 ROE 策略文档化。

---

## 8. 建议下一步审查模块

**推荐 Step 3 — Frontend（AionUI）**

理由：本层发现的最大契约断点都在 **生产者 ↔ 消费者** 边界——AskUserQuestion 已 disable 但 spec/Frontend 仍按 AUQ 设计；greeting / `turn_id` replay / permission mode sync（07-01）均在 Frontend；specialist resume 的 handoff **写入**在 AionUI。Backend MCP 注册与 profile 绑定已较稳，继续深挖 Business Python（Step 4）前应先闭合 UI 对 Backend 事件的消费与 seed 一致性。

备选：**Step 4 Business** — 若当前目标是「报价工具是否真返回正确数据」而非「聊天为何不像预期」。

---

## 附录：关键代码证据索引

```183:195:ccb-installer/claude-code-b-src/src/services/acp/agent.ts
export function resolveSessionMcpConfigs(
  params: Pick<NewSessionRequest, 'mcpServers'>,
  assistantProfile?: CcbAssistantProfile | null,
): Record<string, ScopedMcpServerConfig> {
  const paramServers = (params.mcpServers ?? []) as AcpParamMcpServer[]
  return {
    ...filterMcpConfigsForAssistantProfile(
      loadMcpConfigsFromSettings(),
      assistantProfile ?? null,
    ),
    ...loadMcpConfigsFromParams(paramServers),
  }
}
```

```813:816:ccb-installer/claude-code-b-src/src/services/acp/agent.ts
  const mcpConfigs = omitLazySessionMcpServers(
    resolveSessionMcpConfigs(params, assistantProfile),
    { keepForProfile: assistantProfile?.defaults.mcp.enabled ?? [] },
  )
```

```68:71:ccb-installer/claude-code-b-src/src/services/acp/permissions.ts
  if (tool.name === ASK_USER_QUESTION_TOOL_NAME) {
    return denyAskUserQuestionUseChat(toolUseID)
  }
```

```322:326:ccb-installer/claude-code-b-src/src/services/acp/agent.ts
    const bootstrap = {
      mcpServers: activeSession.sessionCreateParams?.mcpServers ?? [],
      _meta: undefined,
    }
```

```60:74:ccb-installer/claude-code-b-src/src/services/acp/agentSessionProfile.ts
export const CCB_WANDING_KEEP_AGENT_IDS = new Set([
  'wande-orchestrator',
  'quotation-agent',
  'accurate-agent',
  'research-agent',
  'price-library-agent',
  ...
])
export const CCB_GUID_ONLY_AGENT_IDS = new Set(['price-library-agent'])
```
