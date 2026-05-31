import{r as e,v as t}from"./git-CKATjpYy.js";import{join as n}from"path";import{readFileSync as r}from"fs";import{spawnSync as i}from"child_process";t();async function a(){let t=process.cwd(),a=e(t),s=a?[a,t]:[t],c=null;for(let e of s){let t=n(e,`CLAUDE.md`);try{if(c=o(r(t,`utf-8`)),c){console.log(`Found "# claude up" in ${t}`);break}}catch{}}if(!c){console.log(`No "# claude up" section found in CLAUDE.md.
Add a section like:

  # claude up
  \`\`\`bash
  npm install
  npm run build
  \`\`\``);return}console.log(`Running:
`),console.log(c),console.log();let l=i(`bash`,[`-c`,c],{cwd:t,stdio:`inherit`});l.status===0?console.log(`
claude up completed successfully.`):(console.error(`\nclaude up failed with exit code ${l.status}`),process.exitCode=l.status??1)}function o(e){let t=e.split(`
`),n=!1,r=[];for(let e of t){if(/^#\s+claude\s+up\b/i.test(e)){n=!0;continue}if(n&&/^#\s/.test(e))break;n&&r.push(e)}if(r.length===0)return null;let i=r.join(`
`).trim();return i=i.replace(/^```\w*\n?/,``).replace(/\n?```\s*$/,``),i.trim()||null}export{a as up};