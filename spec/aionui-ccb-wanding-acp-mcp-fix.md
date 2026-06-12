# AionUI + CCB-Wanding Native ACP Progress

Date: 2026-06-12

## Current Primary Goal

The current primary goal is no longer "prove AionUI can stream text". That is
already proven. The goal now is:

```text
Keep AionUI on the original CCB-Wanding ACP loop runtime,
then register quotation/accurate MCP into that native ACP session.
```

**Status as of 2026-06-12**: MCP registration is COMPLETE. The `--acp` runtime
now loads MCP servers from `settings.json` and exposes them as first-class
callable tools.

Primary target route:

```text
AionUI Web/Desktop
  -> AionUI Claude Code ACP slot
  -> route-b index.js
  -> D:\CCB-Wanding\dist\cli.js --acp
  -> CCB-Wanding original ACP loop runtime (entry-WG7IeDEv.js)
  -> $buildMcp() reads %LOCALAPPDATA%\CCB-Wanding\.claude\settings.json
  -> MiniMax + Wanding MCP tools (quotation, accurate, excel-mcp)
```

## Two ACP Runtimes — Critical Distinction

`D:\CCB-Wanding\dist\cli.js` routes on `process.argv[2]`:

| argv[2]            | Chunk                        | Type                                  |
|--------------------|------------------------------|---------------------------------------|
| `--acp`            | `entry-WG7IeDEv.js`          | Upstream Claude Code ACP (our target) |
| `--ccb-native-acp` | `ccb-native-acp-agent.js`    | Custom 21KB keyword-dispatch shim     |

`route-b/index.js` spawns `--acp` — the full upstream runtime with model-driven
tool calls. We do NOT use `--ccb-native-acp`.

## MCP Registration Patch

### Root Cause (before patch)

`entry-WG7IeDEv.js` `createSession()` hardcoded `mcpClients: []`. The `mcpServers`
field in `session/new` was accepted by the schema but only used for session
fingerprinting — never to initialize MCP clients.

The `lo` query engine was constructed with:
```js
mcpClients: []   // always empty — no MCP tools available
```

### Patch Applied to `D:\CCB-Wanding\dist\chunks\entry-WG7IeDEv.js`

Three surgical changes:

**1. Import (line ~1480)**
```js
// Added to existing import from loadAgentsDir-BMosMfSG.js:
su as $mi,   // z2 — MCP server connect function
cu as $ml    // V2 — MCP tool list function
```

**2. Module-level helper `$buildMcp()` (inserted before `var Lo=class{`)**
```js
async function $buildMcp(){
  try{
    const {readFileSync,existsSync}=await import('node:fs');
    const {join}=await import('node:path');
    const cfgDir=process.env.CLAUDE_CONFIG_DIR;
    if(!cfgDir)return{clients:[],tools:[]};
    const settingsPath=join(cfgDir,'settings.json');
    if(!existsSync(settingsPath))return{clients:[],tools:[]};
    const raw=readFileSync(settingsPath,'utf8').replace(/^﻿/,'');
    const settings=JSON.parse(raw);
    const mcpServers=settings.mcpServers||{};
    const entries=Object.entries(mcpServers);
    if(entries.length===0)return{clients:[],tools:[]};
    const clients=[];
    const tools=[];
    for(const[name,conf]of entries){
      if(!conf||!conf.command)continue;
      try{
        const client=await $mi(name,{type:'stdio',...conf});
        if(client.type==='connected'){
          clients.push(client);
          try{const t=await $ml(client);tools.push(...t);}
          catch(e){console.error('[ccb-acp-mcp] listTools failed for '+name+':',e?.message||e);}
        }else{
          console.error('[ccb-acp-mcp] connect failed for '+name+': type='+client.type);
        }
      }catch(e){
        console.error('[ccb-acp-mcp] init error for '+name+':',e?.message||e);
      }
    }
    console.error('[ccb-acp-mcp] loaded '+clients.length+' servers, '+tools.length+' tools: '+clients.map(c=>c.name).join(','));
    return{clients,tools};
  }catch(e){
    console.error('[ccb-acp-mcp] $buildMcp error:',e?.message||e);
    return{clients:[],tools:[]};
  }
}
```

**3. `createSession()` patch**

Before:
```js
p={..._t(),toolPermissionContext:{...}},
m=await it(r),
h=new lo({cwd:r,tools:a,commands:m,mcpClients:[],
```

After:
```js
_mcpBase={..._t(),toolPermissionContext:{...i,mode:u,isBypassPermissionsModeAvailable:f}},
{clients:_mcpClients,tools:_mcpTools}=await $buildMcp(),
p={..._mcpBase,mcp:{..._mcpBase.mcp,clients:_mcpClients,tools:_mcpTools}},
m=await it(r),
h=new lo({cwd:r,tools:[...a,..._mcpTools],commands:m,mcpClients:_mcpClients,
```

### Critical Insight: tools array vs mcpClients

**WRONG approach**: only pass `mcpClients:_mcpClients` and `p.mcp.tools=_mcpTools`
- Result: model calls `ExecuteExtraTool {tool_name:"mcp__quotation__match_quotation"}`
- `ExecuteExtraTool` returns "tool not available"
- Model loops searching for tools, times out

**CORRECT approach**: spread `_mcpTools` into the `tools:a` array
- `tools:[...a,..._mcpTools]` makes MCP tools first-class callable tools
- Model calls `mcp__quotation__match_quotation` DIRECTLY
- Tool executes, returns candidates, model processes results

The key: MCP tools must be in the `tools` array passed to `lo`, not just in
`mcpClients` or `p.mcp.tools`. Only first-class tools in `tools:a` are called
directly by the model API.

## Preserved Fallback Route

Do not delete the previous shim route. It remains useful as a fallback and as a
known-good reference for AionUI stream/history behavior:

```text
AionUI Web/Desktop
  -> AionUI Claude Code ACP slot
  -> route-b index.js
  -> D:\CCB-Wanding\dist\chunks\ccb-native-acp-agent.js
  -> MiniMax + quotation shortcut
```

That shim route proved:
- AionUI can show streamed assistant text.
- AionUI turns can finish and save history.
- MiniMax config isolation works.
- A quotation shortcut can answer `查询直接50价格`.

But it is not the final target because it bypasses the original Wanding loop
runtime and uses keyword detection not model-driven tool use.

## Config Boundary

Official Claude Code must stay independent:

```text
Official Claude Code:
  C:\Users\m1774\.claude

CCB-Wanding / AionUI:
  C:\Users\m1774\AppData\Local\CCB-Wanding\.claude
```

Rules:
- Do not write Windows user-level `ANTHROPIC_*`.
- Do not write Windows user-level `CLAUDE_CONFIG_DIR`.
- Do not modify `C:\Users\m1774\.claude` for CCB-Wanding.
- Only inject CCB config into the AionUI/CCB child process.

## What Changed

Updated file:
```text
D:\CCB-Wanding\dist\chunks\entry-WG7IeDEv.js
```

The `--acp` runtime now loads MCP servers from `settings.json` at session
creation time. Route-b spawns this runtime unchanged:

```text
D:\CCB-Wanding\vendor\bun\bun.exe D:\CCB-Wanding\dist\cli.js --acp
```

The route-b process injects only process-local env:

```text
CLAUDE_CONFIG_DIR=%LOCALAPPDATA%\CCB-Wanding\.claude
NODE_TLS_REJECT_UNAUTHORIZED=0
CLAUDE_CODE_DISABLE_FAST_MODE=1
CLAUDE_CODE_ENABLE_TELEMETRY=0
CLAUDE_CODE_ACP_ALLOW_BYPASS_PERMISSIONS=true
```

Route-b also loads `settings.json` env into that child process so MiniMax is
available. This does not write global env vars.

AionUI runtime slots that were synced previously (route-b index.js):
```text
C:\Users\m1774\.aionui-web\runtime\managed-tools\acp\claude-agent-acp\0.39.0\win32-x64\node_modules\@agentclientprotocol\claude-agent-acp\dist\index.js
D:\aionui-web\aionui-web\bundled-aioncore\win32-x64\managed-resources\acp\claude-agent-acp\0.39.0\win32-x64\node_modules\@agentclientprotocol\claude-agent-acp\dist\index.js
D:\Projects\claude-code-best\AionUi\resources\bundled-aioncore\win32-x64\managed-resources\acp\claude-agent-acp\0.39.0\win32-x64\node_modules\@agentclientprotocol\claude-agent-acp\dist\index.js
```

The `entry-WG7IeDEv.js` patch is live at `D:\CCB-Wanding\dist\chunks\` — no sync
needed for this file as it's already in the final runtime location.

## Verified

Native Wanding ACP smoke test:
```text
node ccb-installer/test-native-acp-agent.mjs
```

Result:
```text
init: claude-code protocol 1
session current model: minimax-m3
[ccb-acp-mcp] loaded 3 servers, 41 tools: excel-mcp,quotation,accurate
agent_message_chunk received
stopReason: end_turn
```

Quotation query via native ACP:
```text
CCB_TEST_ROUTE_ENTRY=1 CCB_TEST_BYPASS=1 CCB_TEST_PROMPT="查询直接50价格"
node ccb-installer/test-native-acp-agent.mjs
```

Result:
```text
[ccb-acp-mcp] loaded 3 servers, 41 tools: excel-mcp,quotation,accurate
tool_call: mcp__quotation__match_quotation {keywords:"直接50",customer_level:"B"}
tool returns 14 candidates
model: "过滤出 dn50 直通后剩 4 个"
model: calls AskUserQuestion to clarify which product
```

Notes:
- Tool is called DIRECTLY (not through ExecuteExtraTool)
- Tool returns real quotation data
- Loop prompts user for clarification — expected behavior for multi-match queries
- Test times out because test mock doesn't respond to AskUserQuestion

## Current Problem Points

- AionUI now points at original `D:\CCB-Wanding\dist\cli.js --acp`. ✓
- Native text streaming works. ✓
- Native bypass mode works. ✓
- Native loop emits tool_call events to AionUI. ✓
- Native quotation MCP is now callable as a registered first-class tool. ✓
- Quotation query returns candidates. ✓
- Test mock does not handle AskUserQuestion (clarification for multi-match results).
- `accurate` MCP connectivity verified (server loaded) but not end-to-end tested.
- AionUI UI-level testing still needed.

## Next Small Steps

1. Test AionUI UI with `查询直接50价格` prompt to see if the full user flow works.
2. Verify `accurate` tool (precise pricing) is callable the same way.
3. Test `AskUserQuestion` clarification flow in AionUI (user selects from 4 candidates).
4. Consider whether `test-native-acp-agent.mjs` should auto-respond to AskUserQuestion.
