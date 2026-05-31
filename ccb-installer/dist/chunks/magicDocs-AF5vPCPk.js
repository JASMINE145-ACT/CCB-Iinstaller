import{n as e}from"./chunk-DR8-3Aex.js";import{n as t,s as n}from"./envUtils-DGIx59wW.js";import{Jr as r,Vr as i,Xo as a,Yo as o}from"./growthbook-B0CtxuiD.js";import{B as s,U as c,f as l,m as u}from"./debug-2yq6p0y9.js";import{$s as d,Df as f,Ec as p,Kc as m,Of as h,Qs as g,Wc as _,Zs as v,ew as y,hj as b,mj as x,ow as S}from"./loadAgentsDir-BMosMfSG.js";import{Vn as C,Wn as w}from"./prompt-CPOyObod.js";import{i as T,o as E}from"./fileStateCache-BIZMEy8Y.js";import{join as D}from"path";function O(){return`IMPORTANT: This message and these instructions are NOT part of the actual user conversation. Do NOT include any references to "documentation updates", "magic docs", or these update instructions in the document content.

Based on the user conversation above (EXCLUDING this documentation update instruction message), update the Magic Doc file to incorporate any NEW learnings, insights, or information that would be valuable to preserve.

The file {{docPath}} has already been read for you. Here are its current contents:
<current_doc_content>
{{docContents}}
</current_doc_content>

Document title: {{docTitle}}
{{customInstructions}}

Your ONLY task is to use the Edit tool to update the documentation file if there is substantial new information to add, then stop. You can make multiple edits (update multiple sections as needed) - make all Edit tool calls in parallel in a single message. If there's nothing substantial to add, simply respond with a brief explanation and do not call any tools.

CRITICAL RULES FOR EDITING:
- Preserve the Magic Doc header exactly as-is: # MAGIC DOC: {{docTitle}}
- If there's an italicized line immediately after the header, preserve it exactly as-is
- Keep the document CURRENT with the latest state of the codebase - this is NOT a changelog or history
- Update information IN-PLACE to reflect the current state - do NOT append historical notes or track changes over time
- Remove or replace outdated information rather than adding "Previously..." or "Updated to..." notes
- Clean up or DELETE sections that are no longer relevant or don't align with the document's purpose
- Fix obvious errors: typos, grammar mistakes, broken formatting, incorrect information, or confusing statements
- Keep the document well organized: use clear headings, logical section order, consistent formatting, and proper nesting

DOCUMENTATION PHILOSOPHY - READ CAREFULLY:
- BE TERSE. High signal only. No filler words or unnecessary elaboration.
- Documentation is for OVERVIEWS, ARCHITECTURE, and ENTRY POINTS - not detailed code walkthroughs
- Do NOT duplicate information that's already obvious from reading the source code
- Do NOT document every function, parameter, or line number reference
- Focus on: WHY things exist, HOW components connect, WHERE to start reading, WHAT patterns are used
- Skip: detailed implementation steps, exhaustive API docs, play-by-play narratives

What TO document:
- High-level architecture and system design
- Non-obvious patterns, conventions, or gotchas
- Key entry points and where to start reading code
- Important design decisions and their rationale
- Critical dependencies or integration points
- References to related files, docs, or code (like a wiki) - help readers navigate to relevant context

What NOT to document:
- Anything obvious from reading the code itself
- Exhaustive lists of files, functions, or parameters
- Step-by-step implementation details
- Low-level code mechanics
- Information already in CLAUDE.md or other project docs

Use the Edit tool with file_path: {{docPath}}

REMEMBER: Only update if there is substantial new information. The Magic Doc header (# MAGIC DOC: {{docTitle}}) must remain unchanged.`}async function k(){let e=l(),n=D(t(),`magic-docs`,`prompt.md`);try{return await e.readFile(n,{encoding:`utf-8`})}catch{return O()}}function A(e,t){return e.replace(/\{\{(\w+)\}\}/g,(e,n)=>Object.hasOwn(t,n)?t[n]:e)}async function j(e,t,n,r){let a=await k(),o=r?`

DOCUMENT-SPECIFIC UPDATE INSTRUCTIONS:
The document author has provided specific instructions for how this file should be updated. Pay extra attention to these instructions and follow them carefully:

"${r}"

These instructions take priority over the general rules below. Make sure your updates align with these specific guidelines.`:``,s=i();return A(a,{docContents:e,docPath:t,docTitle:n,customInstructions:o,CLAUDE_EFFORT:y(s,void 0),CLAUDE_MODEL:s,CLAUDE_CWD:process.cwd()})}var M=e((()=>{n(),u(),S(),r()}));function N(){V.clear()}function P(e){let t=e.match(z);if(!t||!t[1])return null;let n=t[1].trim(),r=t.index+t[0].length,i=e.slice(r).match(/^\s*\n(?:\s*\n)?(.+?)(?:\n|$)/);if(i&&i[1]){let e=i[1].match(B);if(e&&e[1])return{title:n,instructions:e[1].trim()}}return{title:n}}function F(e){V.has(e)||V.set(e,{path:e})}function I(){return{agentType:`magic-docs`,whenToUse:`Update Magic Docs`,tools:[C],model:`sonnet`,source:`built-in`,baseDir:`built-in`,getSystemPrompt:()=>``}}async function L(e,t){let{messages:n,systemPrompt:r,userContext:i,systemContext:a,toolUseContext:o}=t,s=T(o.readFileState);s.delete(e.path);let l={...o,readFileState:s},u=``;try{let t=(await v.call({file_path:e.path},l)).data;t.type===`text`&&(u=t.file.content)}catch(t){if(c(t)||t instanceof Error&&t.message.startsWith(`File does not exist`)){V.delete(e.path);return}throw t}let d=P(u);if(!d){V.delete(e.path);return}let f=await j(u,e.path,d.title,d.instructions),m=async(t,n)=>{if(t.name===`Edit`&&typeof n==`object`&&n&&`file_path`in n){let t=n.file_path;if(typeof t==`string`&&t===e.path)return{behavior:`allow`,updatedInput:n}}return{behavior:`deny`,message:`only ${C} is allowed for ${e.path}`,decisionReason:{type:`other`,reason:`only ${C} is allowed`}}};for await(let e of h({agentDefinition:I(),promptMessages:[p({content:f})],toolUseContext:l,canUseTool:m,isAsync:!0,forkContextMessages:n,querySource:`magic_docs`,override:{systemPrompt:r,userContext:i,systemContext:a},availableTools:l.options.tools}));}async function R(){process.env.USER_TYPE===`ant`&&(d((e,t)=>{P(t)&&F(e)}),b(H))}var z,B,V,H,U=e((()=>{f(),w(),g(),s(),E(),x(),m(),o(),M(),z=/^#\s*MAGIC\s+DOC:\s*(.+)$/im,B=/^[_*](.+?)[_*]\s*$/m,V=new Map,H=a(async function(e){let{messages:t,querySource:n}=e;if(n===`repl_main_thread`&&!_(t)&&V.size!==0)for(let t of Array.from(V.values()))await L(t,e)})}));export{R as n,U as r,N as t};