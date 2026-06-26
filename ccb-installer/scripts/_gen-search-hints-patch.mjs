#!/usr/bin/env node
/** Generate $chunkToolSearchHints lines for patch-i18n.ps1 */
const hints = {
  'authenticated HTTPS request using a vault-stored secret':
    '\\u4f7f\\u7528\\u4fdd\\u9669\\u5e93\\u5bc6\\u94a5\\u53d1\\u8d77\\u7ecf\\u8eab\\u4efd\\u9a8c\\u8bc1\\u7684 HTTPS \\u8bf7\\u6c42',
  'cancel a scheduled cron job': '\\u53d6\\u6d88\\u5df2\\u8ba1\\u5212\\u7684 cron \\u4efb\\u52a1',
  'code intelligence (definitions, references, symbols, hover)':
    '\\u4ee3\\u7801\\u667a\\u80fd\\uff08\\u5b9a\\u4e49\\u3001\\u5f15\\u7528\\u3001\\u7b26\\u53f7\\u3001\\u60ac\\u505c\\u4fe1\\u606f\\uff09',
  'create a task in the task list': '\\u5728\\u4efb\\u52a1\\u5217\\u8868\\u4e2d\\u521b\\u5efa\\u4efb\\u52a1',
  'create an isolated git worktree and switch into it':
    '\\u521b\\u5efa\\u9694\\u79bb\\u7684 git worktree \\u5e76\\u5207\\u6362\\u8fdb\\u5165',
  'create multi-agent swarm team, collaborate, parallel agents, task distribution, agent coordination, team management':
    '\\u521b\\u5efa\\u591a agent \\u8702\\u7fa4\\u56e2\\u961f\\u3001\\u534f\\u4f5c\\u3001\\u5e76\\u884c\\u4e0e\\u4efb\\u52a1\\u5206\\u914d',
  'create or overwrite files': '\\u521b\\u5efa\\u6216\\u8986\\u76d6\\u6587\\u4ef6',
  'delegate work to a subagent': '\\u5c06\\u5de5\\u4f5c\\u59d4\\u6258\\u7ed9\\u5b50 agent',
  'disband delete swarm team cleanup, remove team, end team collaboration, cleanup team resources':
    '\\u89e3\\u6563\\u8702\\u7fa4\\u56e2\\u961f\\u5e76\\u6e05\\u7406\\u8d44\\u6e90',
  'edit Jupyter notebook cells (.ipynb)': '\\u7f16\\u8f91 Jupyter notebook \\u5355\\u5143\\u683c\\uff08.ipynb\\uff09',
  'execute Windows PowerShell commands': '\\u6267\\u884c Windows PowerShell \\u547d\\u4ee4',
  'execute shell commands': '\\u6267\\u884c shell \\u547d\\u4ee4',
  'execute user-defined workflow scripts': '\\u6267\\u884c\\u7528\\u6237\\u81ea\\u5b9a\\u4e49\\u5de5\\u4f5c\\u6d41\\u811a\\u672c',
  'exit a worktree session and return to the original directory':
    '\\u9000\\u51fa worktree \\u4f1a\\u8bdd\\u5e76\\u8fd4\\u56de\\u539f\\u76ee\\u5f55',
  'fetch and extract content from a URL': '\\u4ece URL \\u83b7\\u53d6\\u5e76\\u63d0\\u53d6\\u5185\\u5bb9',
  'find files by name pattern or wildcard': '\\u6309\\u6587\\u4ef6\\u540d\\u6a21\\u5f0f\\u6216\\u901a\\u914d\\u7b26\\u67e5\\u627e\\u6587\\u4ef6',
  'find search discover skills commands tools capabilities':
    '\\u67e5\\u627e\\u3001\\u641c\\u7d22\\u5e76\\u53d1\\u73b0 skill\\u3001\\u547d\\u4ee4\\u4e0e\\u5de5\\u5177',
  'get or set Claude Code settings (theme, model)': '\\u83b7\\u53d6\\u6216\\u8bbe\\u7f6e Claude Code \\u9009\\u9879\\uff08\\u4e3b\\u9898\\u3001\\u6a21\\u578b\\uff09',
  'invoke a slash-command skill': '\\u8c03\\u7528\\u659c\\u6760\\u547d\\u4ee4 skill',
  'kill a running background task': '\\u7ec8\\u6b62\\u6b63\\u5728\\u8fd0\\u884c\\u7684\\u540e\\u53f0\\u4efb\\u52a1',
  'list active cron jobs': '\\u5217\\u51fa\\u6d3b\\u8dc3\\u7684 cron \\u4efb\\u52a1',
  'list all tasks': '\\u5217\\u51fa\\u6240\\u6709\\u4efb\\u52a1',
  'list resources from connected MCP servers': '\\u5217\\u51fa\\u5df2\\u8fde\\u63a5 MCP \\u670d\\u52a1\\u5668\\u7684\\u8d44\\u6e90',
  'manage scheduled remote agent triggers': '\\u7ba1\\u7406\\u5df2\\u8ba1\\u5212\\u7684\\u8fdc\\u7a0b agent \\u89e6\\u53d1\\u5668',
  'manage the session task checklist': '\\u7ba1\\u7406\\u4f1a\\u8bdd\\u5f85\\u529e\\u6e05\\u5355',
  'modify file contents in place': '\\u5c31\\u5730\\u4fee\\u6539\\u6587\\u4ef6\\u5185\\u5bb9',
  'present plan for approval and start coding (plan mode only)':
    '\\u63d0\\u4ea4\\u8ba1\\u5212\\u4f9b\\u5ba1\\u6279\\u5e76\\u5f00\\u59cb\\u7f16\\u7801\\uff08\\u4ec5\\u8ba1\\u5212\\u6a21\\u5f0f\\uff09',
  'prompt the user with a multiple-choice question': '\\u5411\\u7528\\u6237\\u63d0\\u51fa\\u591a\\u9009\\u95ee\\u9898',
  'push notification mobile alert notify user': '\\u5411\\u624b\\u673a\\u63a8\\u9001\\u901a\\u77e5',
  'read a specific MCP resource by URI': '\\u6309 URI \\u8bfb\\u53d6\\u6307\\u5b9a MCP \\u8d44\\u6e90',
  'read files, images, PDFs, notebooks': '\\u8bfb\\u53d6\\u6587\\u4ef6\\u3001\\u56fe\\u7247\\u3001PDF \\u548c notebook',
  'read output/logs from a background task': '\\u8bfb\\u53d6\\u540e\\u53f0\\u4efb\\u52a1\\u7684\\u8f93\\u51fa/\\u65e5\\u5fd7',
  'recall user\'s local cross-session notes by store/key':
    '\\u6309\\u5b58\\u50a8\\u4f4d\\u7f6e/\\u952e\\u56de\\u8c03\\u7528\\u6237\\u672c\\u5730\\u8de8\\u4f1a\\u8bdd\\u7b14\\u8bb0',
  'repl execute batch code read write edit glob grep bash':
    'REPL \\u6279\\u91cf\\u6267\\u884c\\u4ee3\\u7801\\uff08\\u8bfb\\u5199\\u7f16\\u8f91\\u3001glob\\u3001grep\\u3001bash\\uff09',
  'retrieve a task by ID': '\\u6309 ID \\u83b7\\u53d6\\u4efb\\u52a1',
  'schedule a recurring or one-shot prompt': '\\u5b89\\u6392\\u5468\\u671f\\u6027\\u6216\\u4e00\\u6b21\\u6027\\u63d0\\u793a',
  'search file contents with regex (ripgrep)': '\\u7528\\u6b63\\u5219\\u641c\\u7d22\\u6587\\u4ef6\\u5185\\u5bb9\\uff08ripgrep\\uff09',
  'search the web for current information': '\\u5728\\u7f51\\u4e0a\\u641c\\u7d22\\u5f53\\u524d\\u4fe1\\u606f',
  'send a message to the user — your primary visible output channel':
    '\\u5411\\u7528\\u6237\\u53d1\\u9001\\u6d88\\u606f\\uff08\\u4e3b\\u8981\\u53ef\\u89c1\\u8f93\\u51fa\\u901a\\u9053\\uff09',
  'send file to user mobile device upload share': '\\u5411\\u7528\\u6237\\u624b\\u673a\\u53d1\\u9001/\\u4e0a\\u4f20\\u6587\\u4ef6',
  'send message to teammate agent, broadcast, inter-agent communication, swarm messaging, agent coordination':
    '\\u5411\\u961f\\u53cb agent \\u53d1\\u9001\\u6d88\\u606f\\u3001\\u5e7f\\u64ad\\u4e0e\\u8702\\u7fa4\\u534f\\u8c03',
  'start long-running background monitor for streaming events':
    '\\u542f\\u52a8\\u957f\\u65f6\\u540e\\u53f0\\u76d1\\u542c\\u6d41\\u5f0f\\u4e8b\\u4ef6',
  'suggest background pr pull request create': '\\u5efa\\u8bae\\u5728\\u540e\\u53f0\\u521b\\u5efa PR',
  'switch to plan mode to design an approach before coding':
    '\\u5207\\u6362\\u5230\\u8ba1\\u5212\\u6a21\\u5f0f\\uff0c\\u5148\\u8bbe\\u8ba1\\u65b9\\u6848\\u518d\\u7f16\\u7801',
  'update a task': '\\u66f4\\u65b0\\u4efb\\u52a1',
  'verify plan execution check completion': '\\u9a8c\\u8bc1\\u8ba1\\u5212\\u6267\\u884c\\u5e76\\u68c0\\u67e5\\u5b8c\\u6210\\u60c5\\u51b5',
  'wait pause sleep rest idle duration timer': '\\u7b49\\u5f85/\\u6682\\u505c/\\u8ba1\\u65f6',
};

const lines = [];
lines.push('$chunkToolSearchHints = New-ReplacementMap');
for (const [en, zh] of Object.entries(hints)) {
  const em = '[char]0x2014';
  const enKey = en.includes('—')
    ? `[string]::Concat('searchHint:\`', '${en.split('—').join("' + " + em + " + '")}', '\`')`
    : null;
  if (enKey) {
    lines.push(`$chunkToolSearchHints[${enKey}] = 'searchHint:\`${zh}\`'`);
  } else {
    const esc = en.replace(/'/g, "''");
    lines.push(`$chunkToolSearchHints['searchHint:\`${esc}\`'] = 'searchHint:\`${zh}\`'`);
  }
}
lines.push('Patch-AllChunks -DistDir $ChunksDir -Replacements $chunkToolSearchHints');
console.log(lines.join('\n'));
