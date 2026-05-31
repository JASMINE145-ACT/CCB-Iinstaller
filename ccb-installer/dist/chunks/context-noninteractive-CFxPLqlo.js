import{n as e}from"./chunk-DR8-3Aex.js";import{Xl as t,Yl as n}from"./growthbook-B0CtxuiD.js";import{b as r,y as i}from"./startupProfiler-BIqisKor.js";import{Kc as a,Lc as o,cS as s,id as c,lS as l,nd as u}from"./loadAgentsDir-BMosMfSG.js";async function d(e){let{messages:t,getAppState:n,options:{mainLoopModel:r,tools:i,agentDefinitions:a,customSystemPrompt:s,appendSystemPrompt:c}}=e,d=o(t),{messages:f}=await l(d),p=n();return u(f,r,async()=>p.toolPermissionContext,i,a,void 0,{options:{customSystemPrompt:s,appendSystemPrompt:c}},void 0,d)}async function f(e,t){return{type:`text`,value:p(await d(t))}}function p(e){let{categories:t,totalTokens:r,rawMaxTokens:a,percentage:o,model:s,memoryFiles:c,mcpTools:l,agents:u,skills:d,messageBreakdown:f,systemTools:p,systemPromptSections:m}=e,h=`## Context Usage

`;h+=`**Model:** ${s}  \n`,h+=`**Tokens:** ${i(r)} / ${i(a)} (${o}%)\n`,h+=`
`;let g=t.filter(e=>e.tokens>0&&e.name!==`Free space`&&e.name!==`Autocompact buffer`);if(g.length>0){h+=`### Estimated usage by category

`,h+=`| Category | Tokens | Percentage |
`,h+=`|----------|--------|------------|
`;for(let e of g){let t=(e.tokens/a*100).toFixed(1);h+=`| ${e.name} | ${i(e.tokens)} | ${t}% |\n`}let e=t.find(e=>e.name===`Free space`);if(e&&e.tokens>0){let t=(e.tokens/a*100).toFixed(1);h+=`| Free space | ${i(e.tokens)} | ${t}% |\n`}let n=t.find(e=>e.name===`Autocompact buffer`);if(n&&n.tokens>0){let e=(n.tokens/a*100).toFixed(1);h+=`| Autocompact buffer | ${i(n.tokens)} | ${e}% |\n`}h+=`
`}if(l.length>0){h+=`### MCP Tools

`,h+=`| Tool | Server | Tokens |
`,h+=`|------|--------|--------|
`;for(let e of l)h+=`| ${e.name} | ${e.serverName} | ${i(e.tokens)} |\n`;h+=`
`}if(p&&p.length>0&&process.env.USER_TYPE===`ant`){h+=`### [ANT-ONLY] System Tools

`,h+=`| Tool | Tokens |
`,h+=`|------|--------|
`;for(let e of p)h+=`| ${e.name} | ${i(e.tokens)} |\n`;h+=`
`}if(m&&m.length>0&&process.env.USER_TYPE===`ant`){h+=`### [ANT-ONLY] System Prompt Sections

`,h+=`| Section | Tokens |
`,h+=`|---------|--------|
`;for(let e of m)h+=`| ${e.name} | ${i(e.tokens)} |\n`;h+=`
`}if(u.length>0){h+=`### Custom Agents

`,h+=`| Agent Type | Source | Tokens |
`,h+=`|------------|--------|--------|
`;for(let e of u){let t;switch(e.source){case`projectSettings`:t=`Project`;break;case`userSettings`:t=`User`;break;case`localSettings`:t=`Local`;break;case`flagSettings`:t=`Flag`;break;case`policySettings`:t=`Policy`;break;case`plugin`:t=`Plugin`;break;case`built-in`:t=`Built-in`;break;default:t=String(e.source)}h+=`| ${e.agentType} | ${t} | ${i(e.tokens)} |\n`}h+=`
`}if(c.length>0){h+=`### Memory Files

`,h+=`| Type | Path | Tokens |
`,h+=`|------|------|--------|
`;for(let e of c)h+=`| ${e.type} | ${e.path} | ${i(e.tokens)} |\n`;h+=`
`}if(d&&d.tokens>0&&d.skillFrontmatter.length>0){h+=`### Skills

`,h+=`| Skill | Source | Tokens |
`,h+=`|-------|--------|--------|
`;for(let e of d.skillFrontmatter)h+=`| ${e.name} | ${n(e.source)} | ${i(e.tokens)} |\n`;h+=`
`}if(f&&process.env.USER_TYPE===`ant`){if(h+=`### [ANT-ONLY] Message Breakdown

`,h+=`| Category | Tokens |
`,h+=`|----------|--------|
`,h+=`| Tool calls | ${i(f.toolCallTokens)} |\n`,h+=`| Tool results | ${i(f.toolResultTokens)} |\n`,h+=`| Attachments | ${i(f.attachmentTokens)} |\n`,h+=`| Assistant messages (non-tool) | ${i(f.assistantMessageTokens)} |\n`,h+=`| User messages (non-tool-result) | ${i(f.userMessageTokens)} |\n`,h+=`
`,f.toolCallsByType.length>0){h+=`#### Top Tools

`,h+=`| Tool | Call Tokens | Result Tokens |
`,h+=`|------|-------------|---------------|
`;for(let e of f.toolCallsByType)h+=`| ${e.name} | ${i(e.callTokens)} | ${i(e.resultTokens)} |\n`;h+=`
`}if(f.attachmentsByType.length>0){h+=`#### Top Attachments

`,h+=`| Attachment | Tokens |
`,h+=`|------------|--------|
`;for(let e of f.attachmentsByType)h+=`| ${e.name} | ${i(e.tokens)} |\n`;h+=`
`}}return h}e((()=>{s(),c(),r(),a(),t()}))();export{f as call,d as collectContextData};