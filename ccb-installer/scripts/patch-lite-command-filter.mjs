import { readFileSync, writeFileSync } from "node:fs";

const files = process.argv.slice(2);
if (files.length === 0) {
  console.error("Usage: node patch-lite-command-filter.mjs <loadAgentsDir.js> [...]");
  process.exit(2);
}

const oldText = "async function o6(e){let t=await ign(e),n=x0t(),r=t.filter(e=>Lhn(e)&&t6(e));if(n.length===0)return r;let i=new Set(r.map(e=>e.name)),a=n.filter(e=>!i.has(e.name)&&Lhn(e)&&t6(e));if(a.length===0)return r;let o=new Set(c6().map(e=>e.name)),s=r.findIndex(e=>o.has(e.name));return s===-1?[...r,...a]:[...r.slice(0,s),...a,...r.slice(s)]}";
const newText = "function ccbLiteFilterCommands(e){if(process.env.CCB_LITE_MODE!==`1`)return e;let t=new Set([`help`,`status`,`exit`,`quit`,`clear`,`compact`,`memory`,`init`,`add-dir`,`model`,`modo`,`permissions`,`config`,`mcp`,`skills`,`plugin`,`plugins`,`agents`,`tasks`,`coordinator`,`usage`,`cost`,`login`,`logout`,`lang`]);return e.filter(e=>{let n=String(e.name||``);return t.has(n)||n.includes(`:`)||e.isMcp===!0||e.source&&e.source!==`builtin`&&e.source!==`bundled`||/[\\u4e00-\\u9fff]/.test(n)})}async function o6(e){let t=await ign(e),n=x0t(),r=t.filter(e=>Lhn(e)&&t6(e));if(n.length===0)return ccbLiteFilterCommands(r);let i=new Set(r.map(e=>e.name)),a=n.filter(e=>!i.has(e.name)&&Lhn(e)&&t6(e));if(a.length===0)return ccbLiteFilterCommands(r);let o=new Set(c6().map(e=>e.name)),s=r.findIndex(e=>o.has(e.name)),c=s===-1?[...r,...a]:[...r.slice(0,s),...a,...r.slice(s)];return ccbLiteFilterCommands(c)}";

for (const file of files) {
  let text = readFileSync(file, "utf8");
  if (text.includes("function ccbLiteFilterCommands(e)")) {
    console.log(`${file}: already patched`);
    continue;
  }
  if (!text.includes(oldText)) {
    console.error(`${file}: target function not found`);
    process.exitCode = 1;
    continue;
  }
  text = text.replace(oldText, newText);
  writeFileSync(file, text, "utf8");
  console.log(`${file}: patched`);
}
