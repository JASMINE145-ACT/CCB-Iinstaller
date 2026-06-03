import{n as e,o as t,r as n}from"./chunk-DR8-3Aex.js";import{n as r,t as i}from"./memoize-DNnuA2aU.js";import{l as a,s as o,u as s}from"./envUtils-DGIx59wW.js";import{n as ee,t as te}from"./defineProperty-CaCI0a5T.js";import{Ln as ne,wn as re}from"./schemas-Bwt-7U5W.js";import{t as ie}from"./v4-DLhvDPkt.js";import{t as ae}from"./ajv-CDrSAj3O.js";import{Ht as oe,Xt as se,Y as ce,it as le,n as ue}from"./state-CUZTq6r0.js";import{Fc as de,Ic as fe,Jr as pe,Lc as me,Rc as he,Uc as ge,Vr as _e,ar as ve,or as ye,sr as be,zc as c}from"./growthbook-B0CtxuiD.js";import{B as xe,C as Se,T as Ce,U as we,d as Te,f as Ee,m as De,s as Oe}from"./debug-2yq6p0y9.js";import{t as ke}from"./sdk-Drp69kIx.js";import{o as Ae,s as je}from"./log-F2-rKanI.js";import{i as Me,o as Ne}from"./platform-CWDCzuy5.js";import{s as Pe,u as Fe}from"./types-Bbwuaq1E.js";import{f as Ie,m as Le}from"./oauth-CgY3ufiz.js";import{a as Re,i as ze,r as Be,t as Ve}from"./slowOperations-CnCjHlQk.js";import{i as He,r as Ue,t as We}from"./cron-DbwlOqRc.js";import{join as l}from"path";import"fs";import{randomUUID as Ge}from"crypto";import{mkdir as Ke,writeFile as qe}from"fs/promises";var u,d=e((()=>{u=`Bash`}));function Je(){return`A powerful search tool built on ripgrep

  Usage:
  - ALWAYS use ${f} for search tasks. NEVER invoke \`grep\` or \`rg\` as a ${u} command. The ${f} tool has been optimized for correct permissions and access.
  - Supports full regex syntax (e.g., "log.*Error", "function\\s+\\w+")
  - Filter files with glob parameter (e.g., "*.js", "**/*.tsx") or type parameter (e.g., "js", "py", "rust")
  - Output modes: "content" shows matching lines, "files_with_matches" shows only file paths (default), "count" shows match counts
  - Use ${c} tool for open-ended searches requiring multiple rounds
  - Pattern syntax: Uses ripgrep (not grep) - literal braces need escaping (use \`interface\\{\\}\` to find \`interface{}\` in Go code)
  - Multiline matching: By default patterns match within single lines only. For cross-line patterns like \`struct \\{[\\s\\S]*?field\`, use \`multiline: true\`
`}var f,Ye=e((()=>{ge(),d(),f=`Grep`})),p,Xe,Ze,Qe,$e=e((()=>{p=`Edit`,Xe=`/.claude/**`,Ze=`~/.claude/**`,Qe=`File has been unexpectedly modified. Read it again before attempting to write it.`}));function et(e){let t=e.trim();if(!t)return null;if(t.endsWith(`-`)){let e=parseInt(t.slice(0,-1),10);return isNaN(e)||e<1?null:{firstPage:e,lastPage:1/0}}let n=t.indexOf(`-`);if(n===-1){let e=parseInt(t,10);return isNaN(e)||e<1?null:{firstPage:e,lastPage:e}}let r=parseInt(t.slice(0,n),10),i=parseInt(t.slice(n+1),10);return isNaN(r)||isNaN(i)||r<1||i<1||i<r?null:{firstPage:r,lastPage:i}}function tt(){return!_e().toLowerCase().includes(`claude-3-haiku`)}function nt(e){let t=e.startsWith(`.`)?e.slice(1):e;return rt.has(t.toLowerCase())}var rt,it=e((()=>{pe(),rt=new Set([`pdf`])}));function at(e,t,n){return`Reads a file from the local filesystem. You can access any file directly by using this tool.
Assume this tool is able to read all files on the machine. If the User provides a path to a file assume that path is valid. It is okay to read a file that does not exist; an error will be returned.

Usage:
- The file_path parameter must be an absolute path, not a relative path
- By default, it reads up to ${st} lines starting from the beginning of the file${t}
${n}
${e}
- This tool allows Claude Code to read images (eg PNG, JPG, etc). When reading an image file the contents are presented visually as Claude Code is a multimodal LLM.${tt()?`
- This tool can read PDF files (.pdf). For large PDFs (more than 10 pages), you MUST provide the pages parameter to read specific page ranges (e.g., pages: "1-5"). Reading a large PDF without the pages parameter will fail. Maximum 20 pages per request.`:``}
- This tool can read Jupyter notebooks (.ipynb files) and returns all cells with their outputs, combining code, text, and visualizations.
- This tool can only read files, not directories. To read a directory, use an ls command via the ${u} tool.
- You will regularly be asked to read screenshots. If the user provides a path to a screenshot, ALWAYS use this tool to view the file at the path. This tool will work with all temporary file paths.
- If you read a file that exists but has empty contents you will receive a system reminder warning in place of file contents.`}var m,ot,st,ct,lt,ut,dt,h=e((()=>{it(),d(),m=`Read`,ot=`File unchanged since last read. The content from the earlier Read tool_result in this conversation is still current — refer to that instead of re-reading.`,st=2e3,ct=`\u4ece\u672c\u5730\u6587\u4ef6\u7cfb\u7edf\u8bfb\u53d6\u6587\u4ef6\u3002`,lt=`- Results are returned using cat -n format, with line numbers starting at 1`,ut=`- You can optionally specify a line offset and limit (especially handy for long files), but it's recommended to read the whole file by not providing these parameters`,dt=`- When you already know which part of the file you need, only read that part. This can be important for larger files.`}));function ft(){return`\n- If this is an existing file, you MUST use the ${m} tool first to read the file's contents. This tool will fail if you did not read the file first.`}function pt(){return`Writes a file to the local filesystem.

Usage:
- This tool will overwrite the existing file if there is one at the provided path.${ft()}
- Prefer the Edit tool for modifying existing files \u2014 it only sends the diff. Only use this tool to create new files or for complete rewrites.
- NEVER create documentation files (*.md) or README files unless explicitly requested by the User.
- Only use emojis if the user explicitly requests it. Avoid writing emojis to files unless asked.`}var g,mt=e((()=>{h(),g=`Write`})),_,ht,gt=e((()=>{_=`Glob`,ht=`- Fast file pattern matching tool that works with any codebase size
- Supports glob patterns like "**/*.js" or "src/**/*.ts"
- Returns matching file paths sorted by modification time
- Use this tool when you need to find files by name patterns
- When you are doing an open ended search that may require multiple rounds of globbing and grepping, use the Agent tool instead`})),v,_t=e((()=>{v=`NotebookEdit`}));function vt(e,t,n){return`
Web page content:
---
${e}
---

${t}

${n?`\u8bf7\u57fa\u4e8e\u4e0a\u8ff0\u5185\u5bb9\u63d0\u4f9b\u7b80\u6d01\u7684\u56de\u5e94\u3002\u5305\u542b\u76f8\u5173\u7ec6\u8282\u3001\u4ee3\u7801\u793a\u4f8b\u548c\u6587\u6863\u6458\u5f55\u3002`:`\u8bf7\u57fa\u4e8e\u4e0a\u8ff0\u5185\u5bb9\u63d0\u4f9b\u7b80\u6d01\u7684\u56de\u5e94\u3002\u5728\u56de\u5e94\u4e2d\uff1a
 - Enforce a strict 125-character maximum for quotes from any source document. Open Source Software is ok as long as we respect the license.
 - Use quotation marks for exact language from articles; any language outside of the quotation should never be word-for-word the same.
 - You are not a lawyer and never comment on the legality of your own prompts and responses.
 - Never produce or reproduce exact song lyrics.`}
`}var y,yt,bt=e((()=>{y=`WebFetch`,yt=`
- Fetches content from a specified URL and processes it using an AI model
- Takes a URL and a prompt as input
- Fetches the URL content, converts HTML to markdown
- Processes the content with the prompt using a small, fast model
- Returns the model's response about the content
- Use this tool when you need to retrieve and analyze web content

Usage notes:
  - IMPORTANT: If an MCP-provided web fetch tool is available, prefer using that tool instead of this one, as it may have fewer restrictions.
  - The URL must be a fully-formed valid URL
  - HTTP URLs will be automatically upgraded to HTTPS
  - The prompt should describe what information you want to extract from the page
  - This tool is read-only and does not modify any files
  - Results may be summarized if the content is very large
  - Includes a self-cleaning 15-minute cache for faster responses when repeatedly accessing the same URL
  - When a URL redirects to a different host, the tool will inform you and provide the redirect URL in a special format. You should then make a new WebFetch request with the redirect URL to fetch the content.
  - For GitHub URLs, prefer using the gh CLI via Bash instead (e.g., gh pr view, gh issue view, gh api).
`})),b,xt=e((()=>{b=`TodoWrite`})),x,St=e((()=>{x=`TaskCreate`})),S,Ct=e((()=>{S=`TaskUpdate`})),C,wt=e((()=>{C=`Skill`})),w,T,E=e((()=>{w=`ExitPlanMode`,T=`ExitPlanMode`}));function Tt(e,t){return e.name===t||(e.aliases?.includes(t)??!1)}function Et(e,t){return e.find(e=>Tt(e,t))}function Dt(e){return{...kt,userFacingName:()=>e.name,...e}}var Ot,kt,At=e((()=>{Ot=()=>({mode:`default`,additionalWorkingDirectories:new Map,alwaysAllowRules:{},alwaysDenyRules:{},alwaysAskRules:{},isBypassPermissionsModeAvailable:!0}),kt={isEnabled:()=>!0,isConcurrencySafe:e=>!1,isReadOnly:e=>!1,isDestructive:e=>!1,checkPermissions:(e,t)=>Promise.resolve({behavior:`allow`,updatedInput:e}),toAutoClassifierInput:e=>``,userFacingName:e=>``}})),D,jt=e((()=>{D=`EnterPlanMode`})),O,Mt,Nt,Pt,Ft=e((()=>{E(),O=`AskUserQuestion`,Mt=`Asks the user multiple choice questions to gather information, clarify ambiguity, understand preferences, make decisions or offer them choices.`,Nt={markdown:`
Preview feature:
Use the optional \`preview\` field on options when presenting concrete artifacts that users need to visually compare:
- ASCII mockups of UI layouts or components
- Code snippets showing different implementations
- Diagram variations
- Configuration examples

Preview content is rendered as markdown in a monospace box. Multi-line text with newlines is supported. When any option has a preview, the UI switches to a side-by-side layout with a vertical option list on the left and preview on the right. Do not use previews for simple preference questions where labels and descriptions suffice. Note: previews are only supported for single-select questions (not multiSelect).
`,html:`
Preview feature:
Use the optional \`preview\` field on options when presenting concrete artifacts that users need to visually compare:
- HTML mockups of UI layouts or components
- Formatted code snippets showing different implementations
- Visual comparisons or diagrams

Preview content must be a self-contained HTML fragment (no <html>/<body> wrapper, no <script> or <style> tags — use inline style attributes instead). Do not use previews for simple preference questions where labels and descriptions suffice. Note: previews are only supported for single-select questions (not multiSelect).
`},Pt=`Use this tool when you need to ask the user questions during execution. This allows you to:
1. Gather user preferences or requirements
2. Clarify ambiguous instructions
3. Get decisions on implementation choices as you work
4. Offer choices to the user about what direction to take.

Usage notes:
- Users will always be able to select "Other" to provide custom text input
- Use multiSelect: true to allow multiple answers to be selected for a question
- If you recommend a specific option, make that the first option in the list and add "(Recommended)" at the end of the label

Plan mode note: In plan mode, use this tool to clarify requirements or choose between approaches BEFORE finalizing your plan. Do NOT use this tool to ask "Is my plan ready?" or "Should I proceed?" - use ${w} for plan approval. IMPORTANT: Do not reference "the plan" in your questions (e.g., "Do you have feedback about the plan?", "Does the plan look good?") because the user cannot see the plan in the UI until you call ${w}. If you need plan approval, use ${w} instead.
`}));function It(){if(process.env.CLAUDE_CODE_OVERRIDE_DATE)return process.env.CLAUDE_CODE_OVERRIDE_DATE;let e=new Date;return`${e.getFullYear()}-${String(e.getMonth()+1).padStart(2,`0`)}-${String(e.getDate()).padStart(2,`0`)}`}function Lt(){return(process.env.CLAUDE_CODE_OVERRIDE_DATE?new Date(process.env.CLAUDE_CODE_OVERRIDE_DATE):new Date).toLocaleString(`en-US`,{month:`long`,year:`numeric`})}var Rt=e((()=>{i(),r(It)}));function zt(){return`
- Allows Claude to search the web and use the results to inform responses
- Provides up-to-date information for current events and recent data
- Returns search result information formatted as search result blocks, including links as markdown hyperlinks
- Use this tool for accessing information beyond Claude's knowledge cutoff
- Searches are performed automatically within a single API call

CRITICAL REQUIREMENT - You MUST follow this:
  - After answering the user's question, you MUST include a "Sources:" section at the end of your response
  - In the Sources section, list all relevant URLs from the search results as markdown hyperlinks: [Title](URL)
  - This is MANDATORY - never skip including sources in your response
  - Example format:

    [Your answer here]

    Sources:
    - [Source Title 1](https://example.com/1)
    - [Source Title 2](https://example.com/2)

Usage notes:
  - Domain filtering is supported to include or block specific websites
  - Web search is only available in the US

IMPORTANT - Use the correct year in search queries:
  - The current month is ${Lt()}. You MUST use this year when searching for recent information, documentation, or current events.
  - Example: If the user asks for "latest React docs", search for "React documentation" with the current year, NOT last year
`}var k,Bt=e((()=>{Rt(),k=`WebSearch`})),A,Vt=e((()=>{A=`PowerShell`}));function Ht(){return Me()===`windows`?process.env.USER_TYPE===`ant`?!a(process.env.CLAUDE_CODE_USE_POWERSHELL_TOOL):s(process.env.CLAUDE_CODE_USE_POWERSHELL_TOOL):!1}var j,Ut=e((()=>{d(),Vt(),o(),Ne(),j=[u,A]})),M,Wt=e((()=>{M=`SendMessage`})),N,Gt=e((()=>{N=`TaskGet`})),P,Kt=e((()=>{P=`TaskList`})),F,qt=e((()=>{F=`SearchExtraTools`}));function Jt(e){return e instanceof Error?e:Error(String(e))}function Yt(e){return e instanceof Error?e.message:String(e)}function Xt(e){if(e&&typeof e==`object`&&`code`in e&&typeof e.code==`string`)return e.code}function Zt(e){return Xt(e)===`ENOENT`}var Qt,$t,en,tn,nn=e((()=>{ke(),ee(),Qt=class extends Error{constructor(e){super(e),this.name=`AbortError`}},$t=class extends Error{constructor(e,t,n,r){super(`Shell \u547d\u4ee4\u6267\u884c\u5931\u8d25`),this.stdout=e,this.stderr=t,this.code=n,this.interrupted=r,this.name=`ShellError`}},en=class extends Error{constructor(e,t){super(e),this.formattedMessage=t,this.name=`TeleportOperationError`}},tn=class extends Error{constructor(e,t){super(e),te(this,`telemetryMessage`,void 0),this.name=`TelemetrySafeError`,this.telemetryMessage=t??e}}}));function rn(e){return e.isNonInteractiveSession}function an(e){let t=R.get(e);if(t)return t;let n=on(e);return R.set(e,n),n}function on(e){try{let t=new sn.Ajv({allErrors:!0});if(!t.validateSchema(e))return{error:t.errorsText(t.errors)};let n=t.compile(e);return{tool:{...L,inputJSONSchema:e,async call(e){if(!n(e)){let e=n.errors?.map(e=>`${e.instancePath||`root`}: ${e.message}`).join(`, `);throw new tn(`\u8f93\u51fa\u4e0e\u8981\u6c42\u7684\u6a21\u5f0f\u4e0d\u5339\u914d\uff1a${e}`,`StructuredOutput schema mismatch: ${(e??``).slice(0,150)}`)}return{data:`\u7ed3\u6784\u5316\u8f93\u51fa\u5df2\u6210\u529f\u63d0\u4f9b`,structured_output:e}}}}}catch(e){return{error:e instanceof Error?e.message:String(e)}}}var sn,cn,ln,I,L,R,un=e((()=>{sn=t(ae(),1),ie(),At(),nn(),ze(),Ve(),cn=Re(()=>re({}).passthrough()),ln=Re(()=>ne().describe(`\u7ed3\u6784\u5316\u8f93\u51fa\u5de5\u5177\u7ed3\u679c`)),I=`StructuredOutput`,L=Dt({isMcp:!1,isEnabled(){return!0},isConcurrencySafe(){return!0},isReadOnly(){return!0},isOpenWorld(){return!1},name:I,searchHint:`return the final response as structured JSON`,maxResultSizeChars:1e5,async description(){return`\u6309\u8981\u6c42\u683c\u5f0f\u8fd4\u56de\u7ed3\u6784\u5316\u8f93\u51fa`},async prompt(){return`\u4f7f\u7528\u6b64\u5de5\u5177\u4ee5\u8981\u6c42\u7684\u7ed3\u6784\u5316\u683c\u5f0f\u8fd4\u56de\u6700\u7ec8\u56de\u5e94\u3002\u5fc5\u987b\u5728\u56de\u5e94\u672b\u5c3e\u6070\u597d\u8c03\u7528\u6b64\u5de5\u5177\u4e00\u6b21\u4ee5\u63d0\u4f9b\u7ed3\u6784\u5316\u8f93\u51fa\u3002`},get inputSchema(){return cn()},get outputSchema(){return ln()},async call(e){return{data:`\u7ed3\u6784\u5316\u8f93\u51fa\u5df2\u6210\u529f\u63d0\u4f9b`,structured_output:e}},async checkPermissions(e){return{behavior:`allow`,updatedInput:e}},renderToolUseMessage(e){let t=Object.keys(e);return t.length===0?null:t.length<=3?t.map(t=>`${t}: ${Be(e[t])}`).join(`, `):`${t.length} fields: ${t.slice(0,3).join(`, `)}…`},renderToolUseRejectedMessage(){return`\u7ed3\u6784\u5316\u8f93\u51fa\u5df2\u62d2\u7edd`},renderToolUseErrorMessage(){return`\u7ed3\u6784\u5316\u8f93\u51fa\u9519\u8bef`},renderToolUseProgressMessage(){return null},renderToolResultMessage(e){return e},mapToolResultToToolResultBlockParam(e,t){return{tool_use_id:t,type:`tool_result`,content:e}}}),R=new WeakMap})),dn,fn,pn,mn,z,hn,gn,_n,vn,yn=e((()=>{dn=`command-name`,fn=`command-message`,pn=`local-command-stdout`,mn=`local-command-stderr`,z=`tick`,hn=`teammate-message`,gn=`channel`,_n=`fork-boilerplate`,vn=`\u60a8\u7684\u6307\u4ee4\uff1a`})),B,bn,xn,Sn=e((()=>{yn(),B=`Sleep`,bn=`\u7b49\u5f85\u6307\u5b9a\u65f6\u957f`,xn=`\u7b49\u5f85\u6307\u5b9a\u65f6\u957f. The user can interrupt the sleep at any time.

Use this when the user tells you to sleep or rest, when you have nothing to do, or when you're waiting for something.

You may receive <${z}> prompts — these are periodic check-ins. Look for useful work to do before sleeping.

You can call this concurrently with other tools — it won't interfere with them.

Prefer this over \`Bash(sleep ...)\` — it doesn't hold a shell process.

Each wake-up costs an API call, but the prompt cache expires after 5 minutes of inactivity — balance accordingly.`})),Cn,wn=e((()=>{Cn=`Interact with Language Server Protocol (LSP) servers to get code intelligence features.

Supported operations:
- goToDefinition: Find where a symbol is defined
- findReferences: Find all references to a symbol
- hover: Get hover information (documentation, type info) for a symbol
- documentSymbol: Get all symbols (functions, classes, variables) in a document
- workspaceSymbol: Search for symbols across the entire workspace
- goToImplementation: Find implementations of an interface or abstract method
- prepareCallHierarchy: Get call hierarchy item at a position (functions/methods)
- incomingCalls: Find all functions/methods that call the function at a position
- outgoingCalls: Find all functions/methods called by the function at a position

All operations require:
- filePath: The file to operate on
- line: The line number (1-based, as shown in editors)
- character: The character offset (1-based, as shown in editors)

Note: LSP servers must be configured for the file type. If no server is available, an error will be returned.`})),Tn=n({VERIFY_PLAN_EXECUTION_TOOL_NAME:()=>V}),V,En=e((()=>{V=`VerifyPlanExecution`})),H,Dn=e((()=>{H=`ExecuteExtraTool`})),U,On=e((()=>{U=`EnterWorktree`})),W,kn=e((()=>{W=`ExitWorktree`})),An=n({WORKFLOW_DIR_NAME:()=>K,WORKFLOW_FILE_EXTENSIONS:()=>q,WORKFLOW_TOOL_NAME:()=>G}),G,K,q,jn=e((()=>{G=`workflow`,K=`.claude/workflows`,q=[`.yml`,`.yaml`,`.md`]}));function J(e){return l(e??ce(),Ln)}async function Y(e){let t=Ee(),n;try{n=await t.readFile(J(e),{encoding:`utf-8`})}catch(e){return we(e)||je(e),[]}let r=Fe(n,!1);if(!r||typeof r!=`object`)return[];let i=r;if(!Array.isArray(i.tasks))return[];let a=[];for(let e of i.tasks){if(!e||typeof e.id!=`string`||typeof e.cron!=`string`||typeof e.prompt!=`string`||typeof e.createdAt!=`number`){Te(`[ScheduledTasks] skipping malformed task: ${Ce(e)}`);continue}if(!He(e.cron)){Te(`[ScheduledTasks] skipping task ${e.id} with invalid cron '${e.cron}'`);continue}a.push({id:e.id,cron:e.cron,prompt:e.prompt,createdAt:e.createdAt,...typeof e.lastFiredAt==`number`?{lastFiredAt:e.lastFiredAt}:{},...e.recurring?{recurring:!0}:{},...e.permanent?{permanent:!0}:{}})}return a}async function Mn(e,t){let n=t??ce();await Ke(l(n,`.claude`),{recursive:!0});let r={tasks:e.map(({durable:e,...t})=>t)};await qe(J(n),Ce(r,null,2)+`
`,`utf-8`)}async function Nn(e,t,n,r,i){let a=Ge().slice(0,8),o={id:a,cron:e,prompt:t,createdAt:Date.now(),...n?{recurring:!0}:{}};if(!r)return ue({...o,...i?{agentId:i}:{}}),a;let s=await Y();return s.push(o),await Mn(s),a}async function Pn(e,t){if(e.length===0||t===void 0&&se(e)===e.length)return;let n=new Set(e),r=await Y(t),i=r.filter(e=>!n.has(e.id));i.length!==r.length&&await Mn(i,t)}async function Fn(e){let t=await Y(e);if(e!==void 0)return t;let n=le().map(e=>({...e,durable:!1}));return[...t,...n]}function In(e,t){let n=He(e);if(!n)return null;let r=We(n,new Date(t));return r?r.getTime():null}var Ln,Rn,zn=e((()=>{oe(),Ue(),Oe(),xe(),De(),Pe(),Ae(),Se(),Ln=l(`.claude`,`scheduled_tasks.json`),Rn={recurringFrac:.1,recurringCapMs:900*1e3,oneShotMaxMs:90*1e3,oneShotFloorMs:0,oneShotMinuteMod:30,recurringMaxAgeMs:10080*60*1e3}})),Bn=n({CRON_CREATE_TOOL_NAME:()=>Z,CRON_DELETE_DESCRIPTION:()=>Jn,CRON_DELETE_TOOL_NAME:()=>Q,CRON_LIST_DESCRIPTION:()=>Yn,CRON_LIST_TOOL_NAME:()=>$,DEFAULT_MAX_AGE_DAYS:()=>X,buildCronCreateDescription:()=>Un,buildCronCreatePrompt:()=>Wn,buildCronDeletePrompt:()=>Gn,buildCronListPrompt:()=>Kn,isDurableCronEnabled:()=>Hn,isKairosCronEnabled:()=>Vn});function Vn(){return!Le(process.env.CLAUDE_CODE_DISABLE_CRON)}function Hn(){return ye(`tengu_kairos_cron_durable`,!0,qn)}function Un(e){return e?`Schedule a prompt to run at a future time — either recurring on a cron schedule, or once at a specific time. Pass durable: true to persist to .claude/scheduled_tasks.json; otherwise session-only.`:`\u5728\u6b64 Claude \u4f1a\u8bdd\u4e2d\u5b89\u6392\u672a\u6765\u8fd0\u884c\u7684\u63d0\u793a\u8bcd\uff0c\u53ef\u4ee5\u6309 cron \u5468\u671f\u8fd0\u884c\uff0c\u4e5f\u53ef\u4ee5\u5728\u6307\u5b9a\u65f6\u95f4\u8fd0\u884c\u4e00\u6b21\u3002`}function Wn(e){return`Schedule a prompt to be enqueued at a future time. Use for both recurring schedules and one-shot reminders.

Uses standard 5-field cron in the user's local timezone: minute hour day-of-month month day-of-week. "0 9 * * *" means 9am local — no timezone conversion needed.

## One-shot tasks (recurring: false)

For "remind me at X" or "at <time>, do Y" requests — fire once then auto-delete.
Pin minute/hour/day-of-month/month to specific values:
  "remind me at 2:30pm today to check the deploy" → cron: "30 14 <today_dom> <today_month> *", recurring: false
  "tomorrow morning, run the smoke test" → cron: "57 8 <tomorrow_dom> <tomorrow_month> *", recurring: false

## Recurring jobs (recurring: true, the default)

For "every N minutes" / "every hour" / "weekdays at 9am" requests:
  "*/5 * * * *" (every 5 min), "0 * * * *" (hourly), "0 9 * * 1-5" (weekdays at 9am local)

## Avoid the :00 and :30 minute marks when the task allows it

Every user who asks for "9am" gets \`0 9\`, and every user who asks for "hourly" gets \`0 *\` — which means requests from across the planet land on the API at the same instant. When the user's request is approximate, pick a minute that is NOT 0 or 30:
  "every morning around 9" → "57 8 * * *" or "3 9 * * *" (not "0 9 * * *")
  "hourly" → "7 * * * *" (not "0 * * * *")
  "in an hour or so, remind me to..." → pick whatever minute you land on, don't round

Only use minute 0 or 30 when the user names that exact time and clearly means it ("at 9:00 sharp", "at half past", coordinating with a meeting). When in doubt, nudge a few minutes early or late — the user will not notice, and the fleet will.

${e?`## Durability

By default (durable: false) the job lives only in this Claude session — nothing is written to disk, and the job is gone when Claude exits. Pass durable: true to write to .claude/scheduled_tasks.json so the job survives restarts. Only use durable: true when the user explicitly asks for the task to persist ("keep doing this every day", "set this up permanently"). Most "remind me in 5 minutes" / "check back in an hour" requests should stay session-only.`:`## Session-only

Jobs live only in this Claude session — nothing is written to disk, and the job is gone when Claude exits.`}

## Runtime behavior

Jobs only fire while the REPL is idle (not mid-query). ${e?`Durable jobs persist to .claude/scheduled_tasks.json and survive session restarts — on next launch they resume automatically. One-shot durable tasks that were missed while the REPL was closed are surfaced for catch-up. Session-only jobs die with the process. `:``}The scheduler adds a small deterministic jitter on top of whatever you pick: recurring tasks fire up to 10% of their period late (max 15 min); one-shot tasks landing on :00 or :30 fire up to 90 s early. Picking an off-minute is still the bigger lever.

Recurring tasks auto-expire after ${X} days — they fire one final time, then are deleted. This bounds session lifetime. Tell the user about the ${X}-day limit when scheduling recurring jobs.

Returns a job ID you can pass to ${Q}.`}function Gn(e){return e?`Cancel a cron job previously scheduled with ${Z}. Removes it from .claude/scheduled_tasks.json (durable jobs) or the in-memory session store (session-only jobs).`:`Cancel a cron job previously scheduled with ${Z}. Removes it from the in-memory session store.`}function Kn(e){return e?`List all cron jobs scheduled via ${Z}, both durable (.claude/scheduled_tasks.json) and session-only.`:`List all cron jobs scheduled via ${Z} in this session.`}var qn,X,Z,Q,$,Jn,Yn,Xn=e((()=>{be(),zn(),Ie(),qn=300*1e3,X=Rn.recurringMaxAgeMs/(1440*60*1e3),Z=`CronCreate`,Q=`CronDelete`,$=`CronList`,Jn=`\u6309 ID \u53d6\u6d88\u5df2\u8ba1\u5212\u7684 cron \u4efb\u52a1`,Yn=`\u5217\u51fa\u5df2\u8ba1\u5212\u7684 cron \u4efb\u52a1`})),Zn,Qn,$n,er,tr,nr,rr=e((()=>{Zn=`LocalMemoryRecall`,Qn=100*1024,$n=2*1024,er=50*1024,tr=4*1024,nr=8*1024})),ir,ar,or,sr=e((()=>{ir=`VaultHttpFetch`,ar=1048576,or=3e4})),cr,lr,ur,dr,fr,pr=e((()=>{he(),E(),jt(),ge(),Ft(),fe(),h(),Bt(),xt(),Ye(),bt(),gt(),Ut(),$e(),mt(),_t(),wt(),Wt(),St(),Gt(),Kt(),Ct(),qt(),un(),Sn(),wn(),En(),Dn(),On(),kn(),jn(),Xn(),rr(),sr(),cr=new Set([me,T,D,...process.env.USER_TYPE===`ant`?[]:[c],O,de,...[G],Zn,ir]),lr=new Set([...cr]),ur=new Set([m,k,b,f,y,_,...j,p,g,v,C,I,F,H,U,W]),dr=new Set([x,N,P,S,M,Z,Q,$]),fr=new Set([...j,m,p,g,_,f,v,c,O,me,de,x,N,P,S,b,D,T,V,y,k,`LSP`,C,B,F,H,I])}));function mr(){return process.env.USER_TYPE===`ant`||ve(`tengu_glacier_2xr`,!1)?`Deferred tools appear by name in <system-reminder> messages.`:`Deferred tools appear by name in <available-deferred-tools> messages.`}function hr(e){return!(e.alwaysLoad===!0||fr.has(e.name))}function gr(e){return e.name}function _r(){return vr+mr()+yr}var vr,yr,br=e((()=>{be(),pr(),qt(),vr=`Search for deferred tools by name or keyword. LOW PRIORITY — only use this tool when no core tool can accomplish the task. Core tools (Read, Edit, Write, Bash, Glob, Grep, Agent, WebFetch, WebSearch, Skill) are always available and should be used directly. This tool is for discovering additional capabilities like MCP tools, cron scheduling, worktree management, agent teams (TeamCreate, TeamDelete, SendMessage), etc.

`,yr=` Returns matching tool names.

## Two-step workflow (MUST follow exactly)

Deferred tools CANNOT be called directly. You MUST use this two-step pattern:

Step 1 — Search: Call this tool (SearchExtraTools) to discover the target tool.
  Input: {"query": "select:CronCreate"}
  Response: "Found 1 deferred tool(s): CronCreate. Use ExecuteExtraTool with {"tool_name": "<name>", "params": {...}} to invoke."

Step 2 — Execute: Call ExecuteExtraTool to run the discovered tool.
  Input: {"tool_name": "CronCreate", "params": {"cron": "*/5 * * * *", "prompt": "check the deploy"}}
  Response: the actual tool result.

## Example: user asks "schedule a cron to check deploy every 5 minutes"

1. SearchExtraTools({"query": "select:CronCreate"})
   → Response: Found deferred tool CronCreate
2. ExecuteExtraTool({"tool_name": "CronCreate", "params": {"cron": "*/5 * * * *", "prompt": "check the deploy"}})
   → Response: Cron job created successfully

If you don't know the exact tool name, use keyword search first:
1. SearchExtraTools({"query": "cron schedule"})
   → Response: Found deferred tool(s): CronCreate
2. ExecuteExtraTool({"tool_name": "CronCreate", "params": {...}})

## Query forms
- "select:CronCreate" — exact tool name (fastest, preferred when you know the name from <available-deferred-tools>)
- "select:CronCreate,CronList" — comma-separated multi-select
- "discover:schedule cron job" — returns tool name + description + schema without loading. Use to understand a tool before calling it.
- "notebook jupyter" — keyword search, up to max_results best matches
- "+slack send" — require "slack" in the name, rank by remaining terms

## Failure policy
If ExecuteExtraTool fails, do NOT re-search for the same tool — it will loop. Stop and tell the user what failed.`}));export{Tn as $,Dt as $t,Kn as A,lt as An,F as At,Pn as B,Xe as Bn,Ht as Bt,Q as C,gt as Cn,$t as Ct,Un as D,ct as Dn,nn as Dt,X as E,mt as En,Xt as Et,Nn as F,at as Fn,Gt as Ft,jn as G,f as Gn,Bt as Gt,q as H,Qe as Hn,Vt as Ht,J as I,it as In,M as It,U as J,u as Jn,Mt as Jt,W as K,Je as Kn,O as Kt,zn as L,nt as Ln,Wt as Lt,Hn as M,ut as Mn,P as Mt,Vn as N,dt as Nn,Kt as Nt,Wn as O,m as On,Zt as Ot,Bn as P,h as Pn,N as Pt,V as Q,jt as Qt,Fn as R,tt as Rn,j as Rt,Jn as S,_ as Sn,Qt as St,$ as T,pt as Tn,Yt as Tt,G as U,Ze as Un,k as Ut,K as V,p as Vn,A as Vt,An as W,$e as Wn,zt as Wt,H as X,Ft as Xt,On as Y,d as Yn,Nt as Yt,Dn as Z,D as Zt,Zn as _,bt as _n,I as _t,cr as a,T as an,xn as at,rr as b,_t as bn,un as bt,dr as c,wt as cn,fn as ct,ar as d,x as dn,vn as dt,Et as en,En as et,ir as f,St as fn,mn as ft,tr as g,y as gn,yn as gt,nr as h,yt as hn,z as ht,hr as i,w as in,B as it,Xn as j,st as jn,qt as jt,Gn as k,ot as kn,Jt as kt,pr as l,S as ln,dn as lt,er as m,xt as mn,hn as mt,_r as n,At as nn,wn as nt,ur as o,E as on,Sn as ot,sr as p,b as pn,pn as pt,kn as q,Ye as qn,Pt as qt,br as r,Tt as rn,bn as rt,lr as s,C as sn,gn as st,gr as t,Ot as tn,Cn as tt,or as u,Ct as un,_n as ut,Qn as v,vt as vn,L as vt,Yn as w,g as wn,en as wt,Z as x,ht as xn,rn as xt,$n as y,v as yn,an as yt,In as z,et as zn,Ut as zt};