import{n as e,o as t}from"./chunk-DR8-3Aex.js";import{Rn as n,b as r,f as i,t as a,x as o,xt as s}from"./src-D6cE9Sc5.js";import{t as c}from"./jsx-runtime-BTgGEFjL.js";import{lT as l,oT as u}from"./loadAgentsDir-BMosMfSG.js";import{r as d,t as f}from"./featureCheck-DlUz4YOM.js";async function p(){let{readObservations:e,loadInstincts:t,resolveProjectContext:n}=await import(`./skillLearning-DGqszjCo.js`),r=n(process.cwd()),[i,a]=await Promise.all([e({project:r}),t({project:r})]);return[`Skill Learning status for ${r.projectName} (${r.projectId})`,`Observations: ${i.length}`,`Instincts: ${a.length}`,``,`Skill Learning: ${d()?`enabled`:`disabled`}`].join(`
`)}async function m(){let e=[];d()?e.push(`Skill Learning: already enabled`):(process.env.SKILL_LEARNING_ENABLED=`1`,e.push(`Skill Learning: enabled (SKILL_LEARNING_ENABLED=1)`));try{let{initSkillLearning:t}=await import(`./runtimeObserver-BgpZSU94.js`);t(),e.push(`Runtime observer: initialized`)}catch{e.push(`Runtime observer: init skipped (not available)`)}return e.join(`
`)}async function h(){let e=[];return d()?(process.env.SKILL_LEARNING_ENABLED=`0`,process.env.CLAUDE_SKILL_LEARNING_DISABLE=`1`,e.push(`Skill Learning: disabled (SKILL_LEARNING_ENABLED=0)`)):e.push(`Skill Learning: already disabled`),e.join(`
`)}function g({onDone:e}){l(`skill-panel`);let[t,n]=(0,v.useState)(0),a=(0,v.useMemo)(()=>[{label:`Status`,description:`\u663e\u793a\u5f53\u524d\u9879\u76ee\u7684 skill \u5b66\u4e60\u72b6\u6001`,run:p},{label:`Start`,description:`\u672c\u6b21\u4f1a\u8bdd\u542f\u7528 skill \u5b66\u4e60`,run:m},{label:`Stop`,description:`\u672c\u6b21\u4f1a\u8bdd\u7981\u7528 skill \u5b66\u4e60`,run:h},{label:`About`,description:`skill \u5b66\u4e60\u529f\u80fd\u8be6\u7ec6\u8bf4\u660e`,run:()=>Promise.resolve(x)}],[]),c=()=>{let n=a[t];n&&n.run().then(t=>{e(t,{display:`system`})})};return s((e,t)=>{if(t.upArrow){n(e=>Math.max(0,e-1));return}if(t.downArrow){n(e=>Math.min(a.length-1,e+1));return}t.return&&c()}),(0,y.jsx)(i,{title:`Skill \u5b66\u4e60`,subtitle:`${a.length} actions`,onCancel:()=>e(`\u5df2\u5173\u95ed Skill \u9762\u677f`,{display:`system`}),color:`background`,hideInputGuide:!0,children:(0,y.jsxs)(o,{flexDirection:`column`,children:[a.map((e,n)=>(0,y.jsxs)(o,{flexDirection:`row`,children:[(0,y.jsx)(r,{children:`${n===t?`›`:` `} ${e.label}`.padEnd(b)}),(0,y.jsx)(r,{dimColor:!0,children:e.description})]},e.label)),(0,y.jsx)(o,{marginTop:1,children:(0,y.jsx)(r,{dimColor:!0,children:`↑/↓ select · Enter run · Esc close`})})]})})}async function _(e,t,n){let r=n?.trim()??``;if(r===`start`)return e(await m(),{display:`system`}),null;if(r===`stop`)return e(await h(),{display:`system`}),null;if(r===`about`)return e(x,{display:`system`}),null;if(r===`status`)return e(await p(),{display:`system`}),null;if(r){let{call:t}=await import(`./skill-learning-CuNDp5_G.js`),n=await t(r,{});return n&&typeof n==`object`&&`value`in n&&e(n.value,{display:`system`}),null}return(0,y.jsx)(g,{onDone:e})}var v,y,b,x;e((()=>{v=t(n(),1),a(),u(),f(),y=c(),b=28,x=`# Skill Learning (\u81ea\u52a8\u5b66\u4e60)

Skill Learning \u662f\u4e00\u4e2a\u95ed\u73af\u5b66\u4e60\u7cfb\u7edf\uff0c\u901a\u8fc7\u89c2\u5bdf\u7528\u6237\u7684\u64cd\u4f5c\u6a21\u5f0f\u81ea\u52a8\u63d0\u53d6\u76f4\u89c9(instinct)\uff0c
\u5e76\u5728\u8fbe\u5230\u9608\u503c\u540e\u751f\u6210\u53ef\u590d\u7528\u7684 skill \u6587\u4ef6\u3001agent \u548c command\u3002

## \u5de5\u4f5c\u6d41\u7a0b
1. **Observe** \u2014 \u8bb0\u5f55\u6bcf\u8f6e\u5bf9\u8bdd\u4e2d\u7684\u5de5\u5177\u8c03\u7528\u3001\u7528\u6237\u7ea0\u6b63\u3001\u9519\u8bef\u89e3\u51b3\u6a21\u5f0f
2. **Analyze** \u2014 \u4f7f\u7528\u542f\u53d1\u5f0f\u6216 LLM \u540e\u7aef\u5206\u6790\u89c2\u5bdf\u6570\u636e\uff0c\u63d0\u53d6 instinct candidate
3. **Evolve** \u2014 \u5c06\u9ad8\u7f6e\u4fe1\u5ea6 instinct \u805a\u7c7b\uff0c\u751f\u6210 skill/agent/command \u5019\u9009
4. **Lifecycle** \u2014 \u5bf9\u751f\u6210\u7684 skill \u8fdb\u884c\u53bb\u91cd\u3001\u7248\u672c\u6bd4\u8f83\u3001\u5f52\u6863\u6216\u66ff\u6362

## \u5b50\u547d\u4ee4
- /skill-learning status       \u2014 \u67e5\u770b\u5f53\u524d\u9879\u76ee\u7684\u89c2\u5bdf\u548c\u76f4\u89c9\u6570\u91cf
- /skill-learning ingest       \u2014 \u4ece transcript \u5bfc\u5165\u89c2\u5bdf\u6570\u636e
- /skill-learning evolve       \u2014 \u751f\u6210 skill \u5019\u9009 (--generate \u5199\u5165\u78c1\u76d8)
- /skill-learning export       \u2014 \u5bfc\u51fa instinct \u4e3a JSON
- /skill-learning import       \u2014 \u5bfc\u5165 instinct JSON
- /skill-learning prune        \u2014 \u6e05\u7406\u8fc7\u671f\u7684 pending instinct
- /skill-learning promote      \u2014 \u5c06 instinct/gap \u63d0\u5347\u4e3a\u5168\u5c40\u8303\u56f4
- /skill-learning projects     \u2014 \u5217\u51fa\u6240\u6709\u5df2\u77e5\u7684\u9879\u76ee\u8303\u56f4

## \u542f\u7528\u65b9\u5f0f
- SKILL_LEARNING_ENABLED=1 \u6216 FEATURE_SKILL_LEARNING=1
- \u72b6\u6001: ${d()?`已启用`:`未启用`}
`}))();export{_ as call};