import{n as e}from"./chunk-DR8-3Aex.js";import{Ec as t,Kc as n,Ld as r,kc as i,zd as a}from"./loadAgentsDir-BMosMfSG.js";import{T as o,j as s}from"./rcDebugLog-CgZYW8Ze.js";function c(e){let t=[],n=e.matchAll(d);for(let e of n)e.index!==void 0&&t.push({word:e[0],start:e.index,end:e.index+e[0].length});return t}async function l({question:e,cacheSafeParams:n}){let r=await a({promptMessages:[t({content:`<system-reminder>This is a side question from the user. You must answer this question directly in a single response.

IMPORTANT CONTEXT:
- You are a separate, lightweight agent spawned to answer this one question
- The main agent is NOT interrupted - it continues working independently in the background
- You share the conversation context but are a completely separate instance
- Do NOT reference being interrupted or what you were "previously doing" - that framing is incorrect

CRITICAL CONSTRAINTS:
- You have NO tools available - you cannot read files, run commands, search, or take any actions
- This is a one-off response - there will be no follow-up turns
- You can ONLY provide information based on what you already know from the conversation context
- NEVER say things like "Let me try...", "I'll now...", "Let me check...", or promise to take any action
- If you don't know the answer, say so - do not offer to look it up or investigate

Simply answer the question with the information you have.</system-reminder>

${e}`})],cacheSafeParams:n,canUseTool:async()=>({behavior:`deny`,message:`Side questions cannot use tools`,decisionReason:{type:`other`,reason:`side_question`}}),querySource:`side_question`,forkLabel:`side_question`,maxTurns:1,skipCacheWrite:!0});return{response:u(r.messages),usage:r.totalUsage}}function u(e){let t=e.flatMap(e=>e.type===`assistant`?e.message.content:[]);if(t.length>0){let e=i(t,`

`).trim();if(e)return e;let n=t.find(e=>e.type===`tool_use`);if(n)return`(The model tried to call ${`name`in n?n.name:`a tool`} instead of answering directly. Try rephrasing or ask in the main conversation.)`}let n=e.find(e=>e.type===`system`&&`subtype`in e&&e.subtype===`api_error`);return n?`(API error: ${s(n.error)})`:null}var d,f=e((()=>{o(),r(),n(),d=/^\/btw\b/gi}));export{f as n,l as r,c as t};