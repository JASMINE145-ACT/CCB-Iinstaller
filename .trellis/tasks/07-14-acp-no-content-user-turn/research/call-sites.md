# Call-sites scaffold — createUserMessage / NO_CONTENT

> Phase 1 在 dump 证据后再把「falsy 入口」标全。本页先钉死定义与已知引用。

## Definition (confirmed)

| Item | Location |
|------|----------|
| Constant | `D:\claude-code-B\src\constants\messages.ts` → `NO_CONTENT_MESSAGE = '(no content)'` |
| Writer | `D:\claude-code-B\src\utils\messages.ts` → `createUserMessage` L509: `content: content \|\| NO_CONTENT_MESSAGE` |
| Also | same file L429 / L453：`content === '' ? NO_CONTENT_MESSAGE : content`（块路径） |

## Known callers (partial)

| Caller | Path | Note |
|--------|------|------|
| AgentTool | `…/AgentTool/runAgent.ts:654` | `createUserMessage({…})` — **Phase 1 必须读参看 content 是否可为空** |
| messages.ts internals | 大量 `createUserMessage({ content, isMeta: true })` | meta/stop/nudge — dump 后按时间序对照 |
| Dist evidence | `ccb-installer/dist/chunks/loadAgentsDir-*.js` | `um=\`(no content)\`` + UI `=== '(no content)'` hide |

## Dump checklist (硬门槛)

1. 复现：`001754` 库存 →（可选）追问  
2. 导出 session transcript / API-bound messages  
3. Grep：`"text":"(no content)"` 或 `NO_CONTENT` 在 **role=user**  
4. 记录：**是否在 tool_result / Agent 完成后出现**；序号相对真实用户气泡  

未完成 → **禁止**进入 Phase 2 代码修改。
