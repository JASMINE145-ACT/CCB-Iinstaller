import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const repl = fs.readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), '../dist/chunks/REPL-Bbtw98TO.js'),
  'utf8'
);

function esc(s) {
  return s.replace(/\\/g, '\\\\').replace(/'/g, "''");
}

/** English substring in dist -> Chinese (will be stored as \\u in PS1) */
const map = {
  '`Use Plan Mode to prepare for a complex request before making changes. Press ${Bv(`chat:cycleMode`,`Chat`,`shift+tab`)} twice to enable.`':
    '`\\u590d\\u6742\\u4efb\\u52a1\\u524d\\u7528\\u8ba1\\u5212\\u6a21\\u5f0f\\u505a\\u51c6\\u5907\\uff0c\\u6309 ${Bv(`chat:cycleMode`,`Chat`,`shift+tab`)} \\u4e24\\u6b21\\u542f\\u7528\\u3002`',
  '`Use /memory to view and manage Claude memory`':
    '`\\u4f7f\\u7528 /memory \\u67e5\\u770b\\u548c\\u7ba1\\u7406 Claude \\u8bb0\\u5fc6`',
  '`Use /theme to change the color theme`':
    '`\\u4f7f\\u7528 /theme \\u66f4\\u6539\\u989c\\u8272\\u4e3b\\u9898`',
  '`Try setting environment variable COLORTERM=truecolor for richer colors`':
    '`\\u8bd5\\u7740\\u8bbe\\u7f6e\\u73af\\u5883\\u53d8\\u91cf COLORTERM=truecolor \\u4ee5\\u83b7\\u5f97\\u66f4\\u4e30\\u5bcc\\u7684\\u989c\\u8272`',
  '`Set CLAUDE_CODE_USE_POWERSHELL_TOOL=1 to enable the PowerShell tool (preview)`':
    '`\\u8bbe\\u7f6e CLAUDE_CODE_USE_POWERSHELL_TOOL=1 \\u4ee5\\u542f\\u7528 PowerShell \\u5de5\\u5177\\uff08\\u9884\\u89c8\\uff09`',
  '`Use /statusline to set up a custom status line that will display beneath the input box`':
    '`\\u4f7f\\u7528 /statusline \\u5728\\u8f93\\u5165\\u6846\\u4e0b\\u65b9\\u8bbe\\u7f6e\\u81ea\\u5b9a\\u4e49\\u72b6\\u6001\\u884c`',
  '`Hit Enter to queue up additional messages while Claude is working.`':
    '`Claude \\u5de5\\u4f5c\\u65f6\\u6309 Enter \\u53ef\\u5c06\\u6d88\\u606f\\u52a0\\u5165\\u961f\\u5217\\u3002`',
  '`Connect Claude to your IDE · /ide`':
    '`\\u8fde\\u63a5 Claude \\u5230 IDE \\xb7 /ide`',
  '`Connect Claude to your IDE \u00b7 /ide`':
    '`\\u8fde\\u63a5 Claude \\u5230 IDE \\xb7 /ide`',
  '`Run /install-github-app to tag @claude right from your Github issues and PRs`':
    '`\\u8fd0\\u884c /install-github-app\\uff0c\\u5728 Github Issue \\u548c PR \\u4e2d\\u76f4\\u63a5 @claude`',
  '`Run /install-slack-app to use Claude in Slack`':
    '`\\u8fd0\\u884c /install-slack-app \\u5728 Slack \\u4e2d\\u4f7f\\u7528 Claude`',
  '`Use /permissions to pre-approve and pre-deny bash, edit, and MCP tools`':
    '`\\u4f7f\\u7528 /permissions \\u9884\\u5148\\u6279\\u51c6\\u6216\\u62d2\\u7edd bash\\u3001edit \\u548c MCP \\u5de5\\u5177`',
  '`Paste images into Claude Code using control+v (not cmd+v!)`':
    '`\\u4f7f\\u7528 Ctrl+V \\u7c98\\u8d34\\u56fe\\u7247\\u5230 Claude Code\\uff08\\u4e0d\\u662f Cmd+V\\uff01\\uff09`',
  '`Use /agents to optimize specific tasks. Eg. Software Architect, Code Writer, Code Reviewer`':
    '`\\u4f7f\\u7528 /agents \\u4e3a\\u7279\\u5b9a\\u4efb\\u52a1\\u4f18\\u5316 agent\\uff0c\\u4f8b\\u5982\\u67b6\\u6784\\u5e08\\u3001\\u4ee3\\u7801\\u7f16\\u5199\\u3001\\u4ee3\\u7801\\u5ba1\\u67a5`',
  '`Run Claude Code locally or remotely using the Claude desktop app: clau.de/desktop`':
    '`\\u901a\\u8fc7 Claude \\u684c\\u9762\\u5e94\\u7528\\u5728\\u672c\\u5730\\u6216\\u8fdc\\u7a0b\\u8fd0\\u884c Claude Code\\uff1a clau.de/desktop`',
  '`Run tasks in the cloud while you keep coding locally · clau.de/web`':
    '`\\u5728\\u4e91\\u7aef\\u8fd0\\u884c\\u4efb\\u52a1\\uff0c\\u672c\\u5730\\u7ee7\\u7eed\\u7f16\\u7801 \\xb7 clau.de/web`',
  '`Run tasks in the cloud while you keep coding locally \u00b7 clau.de/web`':
    '`\\u5728\\u4e91\\u7aef\\u8fd0\\u884c\\u4efb\\u52a1\\uff0c\\u672c\\u5730\\u7ee7\\u7eed\\u7f16\\u7801 \\xb7 clau.de/web`',
  '`/mobile to use Claude Code from the Claude app on your phone`':
    '`\\u4f7f\\u7528 /mobile \\u5728\\u624b\\u673a Claude \\u5e94\\u7528\\u4e2d\\u4f7f\\u7528 Claude Code`',
  '`Your default model setting is Opus Plan Mode. Press ${Bv(`chat:cycleMode`,`Chat`,`shift+tab`)} twice to activate Plan Mode and plan with Claude Opus.`':
    '`\\u9ed8\\u8ba4\\u6a21\\u578b\\u4e3a Opus \\u8ba1\\u5212\\u6a21\\u5f0f\\u3002\\u6309 ${Bv(`chat:cycleMode`,`Chat`,`shift+tab`)} \\u4e24\\u6b21\\u542f\\u7528\\u8ba1\\u5212\\u6a21\\u5f0f\\u5e76\\u4f7f\\u7528 Claude Opus \\u89c4\\u5212\\u3002`',
  '`Use /feedback to help us improve!`':
    '`\\u4f7f\\u7528 /feedback \\u5e2e\\u52a9\\u6211\\u4eec\\u6539\\u8fdb\\uff01`',
  '`Press Option+Enter to send a multi-line message`':
    '`\\u6309 Option+Enter \\u53d1\\u9001\\u591a\\u884c\\u6d88\\u606f`',
  '`Press Shift+Enter to send a multi-line message`':
    '`\\u6309 Shift+Enter \\u53d1\\u9001\\u591a\\u884c\\u6d88\\u606f`',
  '`Hit ${Bv(`chat:cycleMode`,`Chat`,`shift+tab`)} to cycle between default, accept edits, plan, auto, and bypass modes`':
    '`\\u6309 ${Bv(`chat:cycleMode`,`Chat`,`shift+tab`)} \\u5728\\u9ed8\\u8ba4\\u3001\\u63a5\\u53d7\\u7f16\\u8f91\\u3001\\u8ba1\\u5212\\u3001\\u81ea\\u52a8\\u548c\\u8df3\\u8fc7\\u6743\\u9650\\u6a21\\u5f0f\\u4e4b\\u95f4\\u5207\\u6362`',
  '`Use ${Bv(`chat:imagePaste`,`Chat`,`ctrl+v`)} to paste images from your clipboard`':
    '`\\u4f7f\\u7528 ${Bv(`chat:imagePaste`,`Chat`,`ctrl+v`)} \\u4ece\\u526a\\u8d34\\u677f\\u7c98\\u8d34\\u56fe\\u7247`',
  '`Continue your session in Claude Code Desktop with ${ke(`suggestion`,e?.theme??`dark`)(`/desktop`)}`':
    '`\\u5728 Claude Code \\u684c\\u9762\\u7248\\u4e2d\\u7ee7\\u7eed\\u4f1a\\u8bdd\\uff1a${ke(`suggestion`,e?.theme??`dark`)(`/desktop`)}`',
  '`Working with HTML/CSS? Install the frontend-design plugin:\\n${ke(`suggestion`,e?.theme??`dark`)(`/plugin install frontend-design@${sc}`)}`':
    '`\\u5728\\u505a HTML/CSS\\uff1f\\u5b89\\u88c5 frontend-design \\u63d2\\u4ef6\\uff1a\\n${ke(`suggestion`,e?.theme??`dark`)(`/plugin install frontend-design@${sc}`)}`',
  '`Working with Vercel? Install the vercel plugin:\\n${ke(`suggestion`,e?.theme??`dark`)(`/plugin install vercel@${sc}`)}`':
    '`\\u5728\\u7528 Vercel\\uff1f\\u5b89\\u88c5 vercel \\u63d2\\u4ef6\\uff1a\\n${ke(`suggestion`,e?.theme??`dark`)(`/plugin install vercel@${sc}`)}`',
  '`Use ${t} for better one-shot answers. Claude thinks it through first.`':
    '`\\u4f7f\\u7528 ${t} \\u83b7\\u5f97\\u66f4\\u597d\\u7684\\u4e00\\u6b21\\u6027\\u56de\\u7b54\\u3002Claude \\u4f1a\\u5148\\u6df1\\u5165\\u601d\\u8003\\u3002`',
  '`Working on something tricky? ${t} gives better first answers`':
    '`\\u5728\\u5904\\u7406\\u96be\\u9898\\uff1f${t} \\u80fd\\u63d0\\u4f9b\\u66f4\\u597d\\u7684\\u9996\\u6b21\\u56de\\u7b54`',
  '`For big tasks, tell Claude to ${t(`use subagents`)}. They work in parallel and keep your main thread clean.`':
    '`\\u5927\\u578b\\u4efb\\u52a1\\u53ef\\u8ba9 Claude ${t(`use subagents`)}\\uff0c\\u5e76\\u884c\\u5904\\u7406\\u4e14\\u4e0d\\u5360\\u7528\\u4e3b\\u7ebf\\u7a0b\\u3002`',
  '`Say ${t(`"fan out subagents"`)} and Claude sends a team. Each one digs deep so nothing gets missed.`':
    '`\\u8bf4 ${t(`"fan out subagents"`)} \\u8ba9 Claude \\u6d3e\\u51fa\\u56e2\\u961f\\uff0c\\u5404\\u81ea\\u6df1\\u5165\\u5904\\u7406\\u4e0d\\u9057\\u6f0f\\u3002`',
  '`Use ${t(`/loop 5m check the deploy`)} to run any prompt on a schedule. Set it and forget it.`':
    '`\\u4f7f\\u7528 ${t(`/loop 5m check the deploy`)} \\u6309\\u65f6\\u95f4\\u8868\\u8fd0\\u884c\\u4efb\\u610f\\u63d0\\u793a\\u3002\\u8bbe\\u597d\\u5373\\u53ef\\u653e\\u4efb\\u3002`',
  '`${t(`/loop`)} runs any prompt on a recurring schedule. Great for monitoring deploys, babysitting PRs, or polling status.`':
    '`${t(`/loop`)} \\u53ef\\u6309\\u5468\\u671f\\u8fd0\\u884c\\u4efb\\u610f\\u63d0\\u793a\\uff0c\\u9002\\u5408\\u76d1\\u63a7\\u90e8\\u7f72\\u3001\\u5173\\u6ce8 PR \\u6216\\u8f6e\\u8be2\\u72b6\\u6001\\u3002`',
  '`Share Claude Code and earn ${t(iS(n))} of extra usage · ${t(`/passes`)}`':
    '`\\u5206\\u4eab Claude Code\\uff0c\\u53ef\\u83b7\\u5f97 ${t(iS(n))} \\u989d\\u5916\\u7528\\u91cf \\xb7 ${t(`/passes`)}`',
  '`You have free guest passes to share · ${t(`/passes`)}`':
    '`\\u60a8\\u6709\\u514d\\u8d39\\u5ba2\\u4eba\\u901a\\u884c\\u8bc1\\u53ef\\u5206\\u4eab \\xb7 ${t(`/passes`)}`',
  '`${t(`${r} in extra usage, on us`)} · third-party apps · ${t(`/extra-usage`)}`':
    '`${t(`${r} \\u989d\\u5916\\u7528\\u91cf\\uff0c\\u7531\\u6211\\u4eec\\u627f\\u62c5`)} \\xb7 \\u7b2c\\u4e09\\u65b9\\u5e94\\u7528 \\xb7 ${t(`/extra-usage`)}`',
};

const lines = [];
let hit = 0;
let miss = 0;
for (const [en, zh] of Object.entries(map)) {
  if (repl.includes(en)) {
    hit++;
    lines.push(`$chunkSpinnerTips['${esc(en)}'] = '${esc(zh)}'`);
  } else {
    miss++;
    console.error(`[miss] ${en.slice(0, 80)}...`);
  }
}

const outPs1 = lines.join('\n');
const outPath = join(dirname(fileURLToPath(import.meta.url)), '_spinner-tips-patch-lines.txt');
fs.writeFileSync(outPath, outPs1, 'utf8');
console.error(`hit=${hit} miss=${miss} -> ${outPath}`);
