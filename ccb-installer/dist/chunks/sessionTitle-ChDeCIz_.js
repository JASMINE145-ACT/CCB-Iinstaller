import{n as e}from"./chunk-DR8-3Aex.js";import{Ln as t,wn as n}from"./schemas-Bwt-7U5W.js";import{t as r}from"./v4-DLhvDPkt.js";import{Ht as i,N as a}from"./state-CUZTq6r0.js";import{d as o,s}from"./debug-2yq6p0y9.js";import{s as c,u as l}from"./types-Bbwuaq1E.js";import{n as u,r as d}from"./analytics-D-zPQVth.js";import{n as f,t as p}from"./lazySchema-B-84xi1K.js";import{Kc as m,X as h,Z as g,kc as _,vM as v}from"./loadAgentsDir-BMosMfSG.js";import{V as y}from"./rcDebugLog-CgZYW8Ze.js";function b(e){let t=[];for(let n of e){if(n.type!==`user`&&n.type!==`assistant`||`isMeta`in n&&n.isMeta||`origin`in n&&n.origin&&n.origin.kind!==`human`)continue;let e=n.message.content;if(typeof e==`string`)t.push(e);else if(Array.isArray(e))for(let n of e)`type`in n&&n.type===`text`&&`text`in n&&t.push(n.text)}let n=t.join(`
`);return n.length>S?n.slice(-S):n}async function x(e,t){let n=e.trim();if(!n)return null;try{let e=_((await g({systemPrompt:y([C]),userPrompt:n,outputFormat:{type:`json_schema`,schema:{type:`object`,properties:{title:{type:`string`}},required:[`title`],additionalProperties:!1}},signal:t,options:{querySource:`generate_session_title`,agents:[],isNonInteractiveSession:a(),hasAppendSystemPrompt:!1,mcpTools:[]}})).message.content),r=w().safeParse(l(e)),i=r.success&&r.data.title.trim()||null;return d(`tengu_session_title_generated`,{success:i!==null}),i}catch(e){return o(`generateSessionTitle failed: ${e}`,{level:`error`}),d(`tengu_session_title_generated`,{success:!1}),null}}var S,C,w,T=e((()=>{r(),i(),u(),h(),s(),c(),p(),m(),v(),S=1e3,C=`Generate a concise, sentence-case title (3-7 words) that captures the main topic or goal of this coding session. The title should be clear enough that the user recognizes the session in a list. Use sentence case: capitalize only the first word and proper nouns.

Return JSON with a single "title" field.

Good examples:
{"title": "Fix login button on mobile"}
{"title": "Add OAuth authentication"}
{"title": "Debug failing CI tests"}
{"title": "Refactor API client error handling"}

Bad (too vague): {"title": "Code changes"}
Bad (too long): {"title": "Investigate and fix the issue where the login button does not respond on mobile devices"}
Bad (wrong case): {"title": "Fix Login Button On Mobile"}`,w=f(()=>n({title:t()}))}));export{x as n,T as r,b as t};