import{n as e}from"./chunk-DR8-3Aex.js";import{a as t,i as n,r,s as i,t as a}from"./releaseNotes-DsX94DJw.js";function o(e){return e.map(([e,t])=>`${`Version ${e}:`}\n${t.map(e=>`· ${e}`).join(`
`)}`).join(`

`)}async function s(){let e=[];try{let i=new Promise((e,t)=>{setTimeout(e=>e(Error(`Timeout`)),500,t)});await Promise.race([r(),i]),e=n(await t())}catch{}if(e.length>0)return{type:`text`,value:o(e)};let i=n(await t());return i.length>0?{type:`text`,value:o(i)}:{type:`text`,value:`See the full changelog at: ${a}`}}e((()=>{i()}))();export{s as call};