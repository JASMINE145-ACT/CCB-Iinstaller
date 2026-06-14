# $buildMcp 源码迁移：agent.ts 替换 dist patch

## Goal

把 MCP 工具注册逻辑从 `D:\CCB-Wanding\dist\chunks\entry-WG7IeDEv.js` 里的手工 patch（`$buildMcp()`）迁移到 `D:\claude-code-B\src\services\acp\agent.ts` 的 TypeScript 源码里，使得每次 `bun run build` 后 MCP 工具自动包含，不再需要手工 patch。

## 背景

当前 live dist 能工作的原因：`entry-WG7IeDEv.js` 被注入了一个手工 patch 函数 `$buildMcp()`，它：
1. 读 `%LOCALAPPDATA%\CCB-Wanding\.claude\settings.json` 里的 `mcpServers`
2. 连接每个 server，list tools
3. `createSession()` 把 `tools:[...a, ..._mcpTools]` 传入 engine

但源码里 `agent.ts L571` 是 `mcpClients: []`，注释写着 "Parse MCP servers from ACP params" 但从未实现。结果：**每次从源码 rebuild 并 deploy，patch 丢失，MCP 工具消失**。

## Requirements

### 核心改动：agent.ts createSession() L539–571

1. 读取 `params.mcpServers`（已通过 ACP session/new 传入，L240/L750 可见）
2. 调用 `prefetchAllMcpResources(mcpConfigs)` 或同等函数，得到 `{clients, tools}`
3. 把 clients 填入 `mcpClients`
4. 把 tools **同时** 加入 `tools` 数组（传给 engine 的那个）

**Critical constraint**（不可回归）：MCP tools 必须出现在传给 engine 的 `tools` 数组里。只放在 `mcpClients` 或 `p.mcp.tools` 不够——模型会走 `ExecuteExtraTool` 路径，该路径在 ACP 模式下会报 "tool not available"。

### 类型

- `prefetchAllMcpResources` 接受 `Record<string, ScopedMcpServerConfig>`，返回 `{clients: MCPServerConnection[], tools: Tool[], commands: Command[]}`
- `params.mcpServers` 的格式需要确认（`NewSessionRequest['mcpServers']` 类型）

### 构建 & 部署

改完后：
1. `bun run build`（`D:\claude-code-B`，约 3-5 分钟）
2. 运行 `ccb-installer/scripts/deploy-claude-code-b-to-wanding.ps1`
3. smoke test：`node ccb-installer/test-native-acp-agent.mjs`

## Acceptance Criteria

- [ ] `agent.ts` 里不再有 `mcpClients: []` 硬编码
- [ ] `bun run build` 成功，无 TypeScript 编译错误
- [ ] deploy 脚本运行成功
- [ ] smoke test 输出：`[ccb-acp-mcp] loaded 3 servers, 41 tools: excel-mcp, quotation, accurate`
- [ ] 报价 prompt `查询直接50价格` 返回真实数据（模型直接调用 `mcp__quotation__match_quotation`，不走 ExecuteExtraTool）
- [ ] `D:\CCB-Wanding\dist\chunks\entry-WG7IeDEv.js` 的 `$buildMcp` patch 可以移除（或保留但标注已过时）

## Definition of Done

- TypeScript 编译无报错
- smoke test 通过（MCP tools 注册成功，quotation 返回真实数据）
- deploy 脚本正常执行
- dist patch 状态更新记录在 `spec/backend/route-b-status.md`

## Technical Approach

**目标文件**：`D:\claude-code-B\src\services\acp\agent.ts` L539–580 区域

**参考 pattern**：`src\services\mcp\client.ts` 里的 `prefetchAllMcpResources()` — 接受 `Record<string, ScopedMcpServerConfig>`，异步返回 `{clients, tools, commands}`。

**改动草图**：
```typescript
// agent.ts createSession() L539 附近
// 1. 把 params.mcpServers 转成 ScopedMcpServerConfig map
// 2. const { clients: mcpConnections, tools: mcpTools } =
//      await prefetchAllMcpResources(mcpConfigs)
// 3. engineConfig.mcpClients = mcpConnections  （替换 []）
// 4. tools 数组：[...getTools(permissionContext), ...mcpTools]
```

**注意**：`params.mcpServers` 的具体类型是 `NewSessionRequest['mcpServers']`，迁移前需确认字段格式与 `ScopedMcpServerConfig` 的映射关系。

## Out of Scope

- 不修改 AionUI 前端（aionui-src）
- 不修改 route-b
- 不改 fallback route（ccb-native-acp-agent.js）
- `entry-WG7IeDEv.js` 的 $buildMcp patch 迁移完成前**暂不删除**（保留作回滚用）

## Technical Notes

**目标源文件**：`D:\claude-code-B\src\services\acp\agent.ts`
- `createSession()` 方法从 L473 开始
- 待改区域：L539（注释 "Parse MCP servers"）到 L571（`mcpClients: []`）

**关键工具函数**：
- `prefetchAllMcpResources`：`src\services\mcp\client.ts:2420`
- `MCPServerConnection` 类型：`src\services\mcp\types.ts`

**构建命令**：`cd D:\claude-code-B && bun run build`
**部署脚本**：`ccb-installer/scripts/deploy-claude-code-b-to-wanding.ps1`
**Smoke test**：`node ccb-installer/test-native-acp-agent.mjs`

**Spec 参考**：
- `spec/backend/acp-session-flow.md` § "Source vs live dist" + § "Correct long-term fix"
- `spec/backend/route-b-status.md` § "Live main route" + § "Open" item 4
- `spec/integration/defensive-fix-policy.md` § 3（MCP tool registration 属于不该在前端修的范畴）
