import{Jr as e,Kr as t,Us as n,Vr as r,ei as i,ks as a}from"./growthbook-B0CtxuiD.js";import{B as o,C as s,I as c,T as l}from"./debug-2yq6p0y9.js";import{DA as u,OA as d,bA as f,vA as p,yA as m}from"./loadAgentsDir-BMosMfSG.js";import{n as h,t as g}from"./poorMode-Dt9QVhdf.js";o(),e(),f(),n(),g(),u(),s();function _(e){process.stdout.write(l(e,null,2)+`
`)}function v(){_(m())}function y(){let e=a(),t=m();_({allow:e?.allow?.length?e.allow:t.allow,soft_deny:e?.soft_deny?.length?e.soft_deny:t.soft_deny,environment:e?.environment?.length?e.environment:t.environment})}var b=`You are an expert reviewer of auto mode classifier rules for Claude Code.

Claude Code has an "auto mode" that uses an AI classifier to decide whether tool calls should be auto-approved or require user confirmation. Users can write custom rules in three categories:

- **allow**: Actions the classifier should auto-approve
- **soft_deny**: Actions the classifier should block (require user confirmation)
- **environment**: Context about the user's setup that helps the classifier make decisions

Your job is to critique the user's custom rules for clarity, completeness, and potential issues. The classifier is an LLM that reads these rules as part of its system prompt.

For each rule, evaluate:
1. **Clarity**: Is the rule unambiguous? Could the classifier misinterpret it?
2. **Completeness**: Are there gaps or edge cases the rule doesn't cover?
3. **Conflicts**: Do any of the rules conflict with each other?
4. **Actionability**: Is the rule specific enough for the classifier to act on?

Be concise and constructive. Only comment on rules that could be improved. If all rules look good, say so.`;async function x(e){let n=a();if(!((n?.allow?.length??0)>0||(n?.soft_deny?.length??0)>0||(n?.environment?.length??0)>0)){process.stdout.write(`No custom auto mode rules found.

Add rules to your settings file under autoMode.{allow, soft_deny, environment}.
Run \`claude auto-mode defaults\` to see the default rules for reference.
`);return}let o=e.model?i(e.model):h()?t():r(),s=m(),l=p(),u=S(`allow`,n?.allow??[],s.allow)+S(`soft_deny`,n?.soft_deny??[],s.soft_deny)+S(`environment`,n?.environment??[],s.environment);process.stdout.write(`Analyzing your auto mode rules…

`);let f;try{f=await d({querySource:`auto_mode_critique`,model:o,system:b,skipSystemPromptPrefix:!0,max_tokens:4096,messages:[{role:`user`,content:`Here is the full classifier system prompt that the auto mode classifier receives:

<classifier_system_prompt>
`+l+`
</classifier_system_prompt>

Here are the user's custom rules that REPLACE the corresponding default sections:

`+u+`
Please critique these custom rules.`}]})}catch(e){process.stderr.write(`\u5206\u6790\u89c4\u5219\u5931\u8d25\uff1a`+c(e)+`
`),process.exitCode=1;return}let g=f.content.find(e=>e.type===`text`);g?.type===`text`?process.stdout.write(g.text+`
`):process.stdout.write(`No critique was generated. Please try again.
`)}function S(e,t,n){if(t.length===0)return``;let r=t.map(e=>`- `+e).join(`
`),i=n.map(e=>`- `+e).join(`
`);return`## `+e+` (custom rules replacing defaults)
Custom:
`+r+`

Defaults being replaced:
`+i+`

`}export{y as autoModeConfigHandler,x as autoModeCritiqueHandler,v as autoModeDefaultsHandler};