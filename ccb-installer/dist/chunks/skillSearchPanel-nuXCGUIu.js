import{n as e,o as t}from"./chunk-DR8-3Aex.js";import{Rn as n,b as r,f as i,t as a,x as o,xt as s}from"./src-D6cE9Sc5.js";import{t as c}from"./jsx-runtime-BTgGEFjL.js";import{iS as l,lT as u,oT as d,rS as f}from"./loadAgentsDir-BMosMfSG.js";function p(){return[`Skill Search (\u81ea\u52a8\u6280\u80fd\u5339\u914d)`,`Status: ${l()?`enabled`:`disabled`}`,``,`When enabled, relevant skills are automatically matched and`,`injected into conversation context each turn.`].join(`
`)}async function m(){if(l()&&process.env.SKILL_SEARCH_ENABLED!==`0`)return`Skill Search: already enabled`;process.env.SKILL_SEARCH_ENABLED=`1`;let e=[`Skill Search: enabled (SKILL_SEARCH_ENABLED=1)`];try{let{clearSkillIndexCache:t}=await import(`./localSearch-B7oOG4rc.js`);t(),e.push(`Skill index cache: cleared (will rebuild on next search)`)}catch{e.push(`Skill index cache: clear skipped`)}return e.join(`
`)}async function h(){return l()?(process.env.SKILL_SEARCH_ENABLED=`0`,`Skill Search: disabled (SKILL_SEARCH_ENABLED=0)`):`Skill Search: already disabled`}function g({onDone:e}){u(`skill-search-panel`);let[t,n]=(0,v.useState)(0),a=(0,v.useMemo)(()=>[{label:`Status`,description:`\u663e\u793a\u81ea\u52a8 skill \u5339\u914d\u662f\u5426\u542f\u7528`,run:()=>Promise.resolve(p())},{label:`Start`,description:`\u672c\u6b21\u4f1a\u8bdd\u542f\u7528\u81ea\u52a8 skill \u5339\u914d`,run:m},{label:`Stop`,description:`\u672c\u6b21\u4f1a\u8bdd\u7981\u7528\u81ea\u52a8 skill \u5339\u914d`,run:h},{label:`About`,description:`\u81ea\u52a8 skill \u5339\u914d\u5de5\u4f5c\u539f\u7406`,run:()=>Promise.resolve(x)}],[]),c=()=>{let n=a[t];n&&n.run().then(t=>{e(t,{display:`system`})})};return s((e,t)=>{if(t.upArrow){n(e=>Math.max(0,e-1));return}if(t.downArrow){n(e=>Math.min(a.length-1,e+1));return}t.return&&c()}),(0,y.jsx)(i,{title:`Skill \u641c\u7d22`,subtitle:`${a.length} actions`,onCancel:()=>e(`\u5df2\u5173\u95ed Skill \u641c\u7d22\u9762\u677f`,{display:`system`}),color:`background`,hideInputGuide:!0,children:(0,y.jsxs)(o,{flexDirection:`column`,children:[a.map((e,n)=>(0,y.jsxs)(o,{flexDirection:`row`,children:[(0,y.jsx)(r,{children:`${n===t?`›`:` `} ${e.label}`.padEnd(b)}),(0,y.jsx)(r,{dimColor:!0,children:e.description})]},e.label)),(0,y.jsx)(o,{marginTop:1,children:(0,y.jsx)(r,{dimColor:!0,children:`↑/↓ select · Enter run · Esc close`})})]})})}async function _(e,t,n){let r=n?.trim()??``;return r===`start`?(e(await m(),{display:`system`}),null):r===`stop`?(e(await h(),{display:`system`}),null):r===`about`?(e(x,{display:`system`}),null):r===`status`?(e(p(),{display:`system`}),null):(0,y.jsx)(g,{onDone:e})}var v,y,b,x;e((()=>{v=t(n(),1),a(),d(),f(),y=c(),b=28,x=`# Skill Search (\u81ea\u52a8\u6280\u80fd\u5339\u914d)

Skill Search \u63a7\u5236\u5bf9\u8bdd\u4e2d\u7684\u81ea\u52a8\u6280\u80fd\u5339\u914d\u529f\u80fd\u3002

\u542f\u7528\u540e\uff0cClaude Code \u4f1a\u5728\u6bcf\u8f6e\u5bf9\u8bdd\u4e2d\u81ea\u52a8\u641c\u7d22\u5e76\u52a0\u8f7d\u4e0e\u5f53\u524d\u4efb\u52a1\u6700\u76f8\u5173\u7684 skill \u6587\u4ef6\uff0c
\u65e0\u9700\u624b\u52a8\u6307\u5b9a\u3002\u641c\u7d22\u57fa\u4e8e TF-IDF \u5411\u91cf\u4f59\u5f26\u76f8\u4f3c\u5ea6\uff0c\u652f\u6301\u82f1\u6587\u8bcd\u5e72\u5316\u548c CJK bi-gram \u5206\u8bcd\u3002

## \u5de5\u4f5c\u539f\u7406
1. \u5bf9\u8bdd\u5f00\u59cb\u65f6\uff0c\u81ea\u52a8\u7d22\u5f15 .claude/skills/ \u548c ~/.claude/skills/ \u4e0b\u7684 Markdown \u6587\u4ef6
2. \u6bcf\u8f6e\u5bf9\u8bdd\u6839\u636e\u4e0a\u4e0b\u6587\u81ea\u52a8\u5339\u914d\u6700\u76f8\u5173\u7684 skill
3. \u5339\u914d\u5230\u7684 skill \u5185\u5bb9\u4f1a\u4f5c\u4e3a\u4e0a\u4e0b\u6587\u6ce8\u5165\uff0c\u6307\u5bfc Claude Code \u7684\u884c\u4e3a

## \u63a7\u5236\u65b9\u5f0f
- /skill-search start  \u2014 \u542f\u7528\u81ea\u52a8\u5339\u914d
- /skill-search stop   \u2014 \u7981\u7528\u81ea\u52a8\u5339\u914d
- /skill-search status \u2014 \u67e5\u770b\u5f53\u524d\u72b6\u6001

\u5f53\u524d\u72b6\u6001: ${l()?`已启用`:`未启用`}
`}))();export{_ as call};