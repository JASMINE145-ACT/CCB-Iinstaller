# Source-of-truth — `(no content)` / createUserMessage

**Date:** 2026-07-14  
**Review gate:** 执行前必须确认 source / dist / mirror 三者关系（Codex 审查 P0）。

## Triad

| Layer | Path | Role |
|-------|------|------|
| **Edit SoT** | `D:\claude-code-B\src\utils\messages.ts` | `createUserMessage` — `content \|\| NO_CONTENT_MESSAGE` |
| **Constant** | `D:\claude-code-B\src\constants\messages.ts` (or `.js`) | `NO_CONTENT_MESSAGE = '(no content)'` |
| **Caller (Agent)** | `ccb-installer/claude-code-b-src/packages/builtin-tools/.../AgentTool/runAgent.ts:654` | imports `src/utils/messages.js` at **runtime SoT**（打包进 live dist） |
| **Live ship** | `ccb-installer/dist/chunks/loadAgentsDir-*.js` | 含 `um=\`(no content)\``；UI hide + API 保留 |
| **Workspace mirror gap** | `ccb-installer/claude-code-b-src/` **无** `src/utils/messages.ts` | 不可在 mirror 里「找不到定义就改假文件」 |

## Spec pointers

- `.trellis/spec/backend/index.md` — ACP/MCP 修 **claude-code-B source**，再 build → live dist  
- `.trellis/spec/backend/acp-session-flow.md` — producer 优先  
- `.trellis/spec/integration/route-b-sync.md` — 部署闭包  

## Do not

- 只改 `ccb-installer/src/services/acp/agent.ts` 空 prompt guard 即宣称修好  
- 手改 minified dist 而不回写 `D:\claude-code-B\src`（除非紧急 hotfix + migration 票）  
- 用库存 ROE 掩盖历史污染  

## Phase 1 deliverable

`research/call-sites.md`：列出 `createUserMessage({ content: … })` 在工具/Agent/Stop/nudge 路径上 **可能传入 falsy** 的调用点（从 `messages.ts` + AgentTool 起）。
