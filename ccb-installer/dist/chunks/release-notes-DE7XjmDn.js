import{n as e}from"./chunk-DR8-3Aex.js";import{a as t,i as n,r,s as i,t as a}from"./releaseNotes-DsX94DJw.js";function o(e){return e.map(([e,t])=>`${`\u7248\u672c ${e}\uff1a`}\n${t.map(e=>`· ${e}`).join(`
`)}`).join(`

`)}async function s(){let e=[];try{let i=new Promise((e,t)=>{setTimeout(e=>e(Error(`Timeout`)),500,t)});await Promise.race([r(),i]),e=n(await t())}catch{}if(e.length>0)return{type:`text`,value:o(e)};let i=n(await t());return i.length>0?{type:`text`,value:o(i)}:{type:`text`,value:`\u5b8c\u6574\u66f4\u65b0\u65e5\u5fd7\u89c1\uff1a${a}`}}e((()=>{i()}))();export{s as call};