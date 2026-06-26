# Platform Period — Route B 子任务索引

**路线**: CCB Runtime + 薄适配器 + AionUI / ACP 双入口  
**总计划**: [ccb-runtime-acp-agent-feasibility-plan.md](../../ccb-runtime-acp-agent-feasibility-plan.md)

| Spec | 主题 | 状态 | Promise |
|------|------|------|---------|
| [B-01](./B-01-ccb-runtime-skeleton-minimax-smoke.md) | runtime 骨架 + MiniMax smoke | ✅ | — |
| [B-02](./B-02-ccb-runtime-agent-loop-mcp-smoke.md) | AgentLoop + 双 MCP + PromptAssembler | ✅ | — |
| [B-03](./B-03-ccb-runtime-streaming-abort.md) | 真 SSE + AbortRegistry | ✅ | `B03_RUNTIME_STREAMING_ABORT_OK` |
| [B-04](./B-04-ccb-api-server-and-cli-entry.md) | `ccb-api-server` + `--ccb-api` | ✅ v0.2 | `B04_CCB_API_SERVER_OK` |
| [B-04c](./B-04c-code-review-triage.md) | 复审修补（WS pong、注释、测试） | ✅ | （归入 B-04） |
| [B-05](./B-05-serve-wanding-runtime-aionui-contract.md) | serve-wanding 薄化 + AionUI 契约 | ✅ | `B05_SERVE_WANDING_RUNTIME_AIONUI_OK` |
| [B-06](./B-06-ccb-acp-agent.md) | `ccb-acp-agent` + `--ccb-acp` | ✅ | `CCB_ACP_MOCK_OK` |
| [B-06b](./B-06b-aionui-registry-e2e.md) | AionUI registry + 人工 E2E | registry ✅ / E2E 待人工 | `CCB_RUNTIME_ACP_REGISTRY_OK` |
| **[B-07](./B-07-route-b-close-and-next-phase.md)** | **Route B 收口 + Phase 4 启动** | **📋 执行中（B-07a 人工 E2E）** | `PRD_ROUTE_B_COMPLETE` |

## 入口拓扑

```text
cli.js --ccb-api  → ccb-api-server  → ccb-runtime
cli.js --ccb-acp  → ccb-acp-agent    → ccb-runtime
cli.js web        → serve-wanding    → ccb-runtime
```

## 当前阻塞

**下一步（[B-07 §2](./B-07-route-b-close-and-next-phase.md)）**：完成 **B-06b.C 人工 AionUI E2E** → 签发 `PRD_ROUTE_B_COMPLETE` / `CCB_RUNTIME_ACP_E2E_OK`。

闭环后：**B-07b** 双轨回归（Stage 2/3 + turn.completed）→ **B-07c** Phase 4（CI、session/resume、生产 sync）。

架构评估 [§4.2 旧 Path B / query.next()](../../prd/ccb-wanding-aionui-architecture-evaluation.md) **不再继续排查** — 由 Route B 替代。
