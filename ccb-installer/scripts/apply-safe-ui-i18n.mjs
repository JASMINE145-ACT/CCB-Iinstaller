/**
 * Apply file-scoped UI translations.
 *
 * This deliberately avoids loadAgentsDir-*.js and uses exact per-file
 * replacements only. Do not convert this into a global all-chunk replacer.
 */
import fs from 'fs';
import path from 'path';

const distDir = process.argv[2] || path.resolve('dist');
const chunksDir = path.join(distDir, 'chunks');

const replacementsByFile = {
  'REPL-Bbtw98TO.js': {
    "You've spent $5 on the Anthropic API this session.": '本次会话已在 Anthropic API 上花费 $5。',
    'Learn more about how to monitor your spending:': '了解如何监控你的使用支出：',
    'Restarting caffeinate to maintain sleep prevention': '正在重启 caffeinate 以保持防休眠',
    'to the point before you sent this message:': '回到你发送此消息之前的位置：',
    'Esc to exit': '按 Esc 退出',
    'Type something': '请输入内容',
    'Type something.': '请输入内容。',
    'Review your answers': '检查你的回答',
    'Pasted image': '已粘贴图片',
    'Number of tasks': '任务数量',
    'Number of nodes': '节点数量',
    'Requires permission to bypass sandbox': '需要权限才能绕过沙箱',
    'Analyze shell commands and explain what they do, why you\'re running them, and potential risks.': '分析 Shell 命令并说明其作用、运行原因和潜在风险。',
    'Provide an explanation of a shell command': '提供 Shell 命令说明',
    'What this command does (1-2 sentences)': '此命令的作用（1-2 句话）',
    'Why YOU are running this command. Start with "I" - e.g. "I need to check the file contents"': '你为什么要运行此命令。以“我”开头，例如“我需要检查文件内容”',
    'What could go wrong, under 15 words': '可能出错的地方，15 个词以内',
    'LOW (safe dev workflows), MEDIUM (recoverable changes), HIGH (dangerous/irreversible)': 'LOW（安全开发流程）、MEDIUM（可恢复更改）、HIGH（危险/不可逆）',
    'Not accepted': '未接受',
    'IDE client not available': 'IDE 客户端不可用',
    'Yes, during this session': '是，仅本次会话',
    'Yes, allow all edits during this session ': '是，允许本次会话中的所有编辑 ',
    'Esc to reject': '按 Esc 拒绝',
    'File does not exist': '文件不存在',
    'Edit file': '编辑文件',
    'Yes, allow reading from ': '是，允许读取 ',
    'Yes, and always allow access to ': '是，并始终允许访问 ',
    "Yes, and don't ask again for ": '是，并且不再询问 ',
    'Yes, and allow access to ': '是，并允许访问 ',
    'Yes, and allow ': '是，并允许 ',
    'Bash command': 'Bash 命令',
    'Plan being refined via Ultraplan — please wait for the result.': '正在通过 Ultraplan 优化计划，请等待结果。',
    'Plan saved!': '计划已保存！',
    'Yes, and use auto mode': '是，并使用自动模式',
    'Yes, and bypass permissions': '是，并绕过权限',
    'Overwrite file': '覆盖文件',
    'Create file': '创建文件',
    'Do you want to ': '你想要 ',
    'Edit notebook': '编辑 notebook',
    'Unable to parse date/time from input': '无法从输入中解析日期/时间',
    'Unable to parse date/time. Please enter in ISO 8601 format manually.': '无法解析日期/时间。请手动输入 ISO 8601 格式。',
    'search history': '搜索历史',
    'send message': '发送消息',
    'search prompts:': '搜索提示词：',
    'return to team lead': '返回团队负责人',
    'native select': '原生选择',
    'view tasks': '查看任务',
    'hide tasks': '隐藏任务',
    'show tasks': '显示任务',
    'stop agents': '停止 agents',
    'Remote Control reconnecting': '远程控制正在重连',
    'Session completed successfully': '会话已成功完成',
    'User aborted': '用户已中止',
    'User denied permission': '用户拒绝了权限',
    'Remote session ended.': '远程会话已结束。',
    'Collecting transcript for sharing': '正在收集用于分享的会话记录',
    ' for Quick Launch': ' 快速启动',
    ' to reference files or lines in your input': ' 引用文件或行号到输入框',
    '! for bash mode': '! 进入 bash 模式',
    ' · /plugin for details': ' · /plugin 查看详情',
    'Add notes on this design…': '在此设计上添加备注…',
    '? for shortcuts': '? 查看快捷键',
    'Analyze for Python version': '分析 Python 版本',
    'Analyze for platform': '分析运行平台',
    'The updated todo list': '更新后的待办列表',
    'The todo list before the update': '更新前的待办列表',
    'The todo list after the update': '更新后的待办列表',
  },
  'PluginSettings-BjaEkPqS.js': {
    'Install for you (user scope)': '为你安装（用户范围）',
    'Install for all collaborators on this repository (project scope)': '为此仓库的所有协作者安装（项目范围）',
    'Install for you, in this repo only (local scope)': '仅为你在此仓库安装（本地范围）',
    'Open homepage': '打开主页',
    'View on GitHub': '在 GitHub 查看',
    'Back to plugin list': '返回插件列表',
    'Failed to load marketplaces': '加载市场失败',
    'Failed to load plugins': '加载插件失败',
    'Select marketplace': '选择市场',
    'Plugin details': '插件详情',
    'Enable auto-update': '启用自动更新',
    'Remove marketplace': '移除市场',
    'Failed to update setting': '更新设置失败',
    'apply changes': '应用更改',
    'Configure SSH keys or use HTTPS URL instead': '配置 SSH 密钥，或改用 HTTPS URL',
    'Configure credentials or use SSH URL instead': '配置凭据，或改用 SSH URL',
    'Check your internet connection and try again': '检查网络连接后重试',
    'Check manifest file syntax in the plugin directory': '检查插件目录中的 manifest 文件语法',
    'Check manifest file follows the required schema': '检查 manifest 文件是否符合要求的 schema',
    'Add the marketplace first using /plugin marketplace add': '先使用 /plugin marketplace add 添加市场',
    'Check MCP server configuration in .mcp.json or manifest': '检查 .mcp.json 或 manifest 中的 MCP 服务器配置',
    'Check hooks.json file syntax and structure': '检查 hooks.json 文件语法和结构',
    'Check your internet connection and URL accessibility': '检查网络连接和 URL 可访问性',
    'Verify the MCPB file is valid and not corrupted': '确认 MCPB 文件有效且未损坏',
    'Contact the plugin author about the invalid manifest': '联系插件作者处理无效 manifest',
    'This marketplace source is explicitly blocked by your administrator': '此市场来源已被管理员明确阻止',
    'Contact your administrator to configure allowed marketplace sources': '联系管理员配置允许的市场来源',
    'Check LSP server configuration in the plugin manifest': '检查插件 manifest 中的 LSP 服务器配置',
    'Check LSP server logs with --debug for details': '使用 --debug 查看 LSP 服务器日志详情',
    'Run /plugins to refresh the plugin cache': '运行 /plugins 刷新插件缓存',
    'will enable': '将启用',
    'will disable': '将禁用',
    'Failed to load components': '加载组件失败',
    'Installed components:': '已安装组件：',
    'Plugin enabled. Configuration skipped — run /reload-plugins to apply.': '插件已启用。已跳过配置，运行 /reload-plugins 后生效。',
    'Run /reload-plugins to apply plugin changes.': '运行 /reload-plugins 应用插件更改。',
    'Removed from marketplace': '已从市场移除',
    'Built-in plugins cannot be updated or uninstalled.': '内置插件无法更新或卸载。',
    'This plugin is managed by your organization. Contact your admin to disable it.': '此插件由你的组织管理。请联系管理员禁用。',
    'Disable plugin': '禁用插件',
    'Enable plugin': '启用插件',
    'Unmark for update': '取消标记更新',
    'Mark for update': '标记为更新',
    'Failed to check plugin update availability': '检查插件更新可用性失败',
    'No MCPB file found in plugin': '插件中未找到 MCPB 文件',
    'Failed to load MCPB for configuration': '加载 MCPB 配置失败',
    'Configure options': '配置选项',
    'Update now': '立即更新',
    'View repository': '查看仓库',
    'No items match "': '没有匹配项 "',
    'Managed by your organization — contact your admin': '由你的组织管理，请联系管理员',
  },
  'prompt-CPOyObod.js': {
    'Schedule a prompt to run at a future time within this Claude session — either recurring on a cron schedule, or once at a specific time.': '在此 Claude 会话中安排未来运行的提示词，可以按 cron 周期运行，也可以在指定时间运行一次。',
    'Cancel a scheduled cron job by ID': '按 ID 取消已计划的 cron 任务',
    'List scheduled cron jobs': '列出已计划的 cron 任务',
  },
  'Settings-BCYarMU4.js': {
    'Extra usage': '额外用量',
  },
  'agents-DaLzXVa7.js': {
    'Built-in agents': '内置 agents',
    'Plugin agents': '插件 agents',
    'No JSON object found in response': '响应中未找到 JSON 对象',
    'Invalid agent configuration generated': '生成的 agent 配置无效',
    'No assistant message found': '未找到 assistant 消息',
  },
  'hooks-DZI4fYlI.js': {
    'When an instruction file (CLAUDE.md or rule) is loaded': '加载指令文件（CLAUDE.md 或规则）时',
    'When hooks are disabled:': '当 hooks 被禁用时：',
    'To re-enable hooks, remove "disableAllHooks" from settings.json or ask Claude.': '要重新启用 hooks，请从 settings.json 中移除 "disableAllHooks"，或询问 Claude。',
  },
  'validatePlugin-DFj-n7oe.js': {
    'Marketplace has no plugins defined': '市场未定义任何插件',
    'No manifest found in directory. Expected .claude-plugin/marketplace.json or .claude-plugin/plugin.json': '目录中未找到 manifest。应存在 .claude-plugin/marketplace.json 或 .claude-plugin/plugin.json',
  },
  'BackgroundTasksDialog-DRzDOlt_.js': {
    'awaiting approval': '等待批准',
    'setting up': '正在设置',
    'Remote session details dismissed': '已关闭远程会话详情',
    'Showing last ': '正在显示最近 ',
    'Teleport failed: ': 'Teleport 失败：',
    'Shell details': 'Shell 详情',
    'Viewing leader': '正在查看负责人',
    'Background tasks dialog dismissed': '已关闭后台任务对话框',
    'Viewing teammate': '正在查看队友',
    'active shells': '活动 shells',
    'active agents': '活动 agents',
    'stop all agents': '停止所有 agents',
    'Remote agents': '远程 agents',
    'Local agents': '本地 agents',
  },
  'chrome-BFG6mVNh.js': {
    'Install Chrome extension': '安装 Chrome 扩展',
    'Manage permissions': '管理权限',
    'Reconnect extension': '重新连接扩展',
  },
  'autonomyPanel-BXmtS4sp.js': {
    'Show run and flow counts plus the latest automatic activity': '显示运行和流程数量，以及最近的自动活动',
    'Full deep status': '完整深度状态',
    'Print every local autonomy surface in one diagnostic report': '在一份诊断报告中输出所有本地自动化界面',
    'Auto mode': '自动模式',
    'Check whether auto permission mode is available and why': '检查自动权限模式是否可用及原因',
    'Runs summary': '运行摘要',
    'Show queued/running/completed/failed run totals and latest run': '显示排队/运行中/已完成/失败的运行总数和最近一次运行',
    'Recent runs': '最近运行',
    'List recent autonomy run IDs, triggers, statuses, and prompts': '列出最近的自动运行 ID、触发器、状态和提示词',
    'Flows summary': '流程摘要',
    'Show managed flow totals across queued/running/waiting states': '显示排队/运行中/等待状态下的托管流程总数',
    'Recent flows': '最近流程',
    'List recent managed flow IDs, status, current step, and goal': '列出最近托管流程的 ID、状态、当前步骤和目标',
    'Show scheduled autonomy jobs, durability, recurrence, and next run': '显示计划的自动任务、持久性、重复规则和下次运行',
    'Workflow runs': '工作流运行',
    'Show persisted WorkflowTool runs and their current workflow step': '显示已持久化的 WorkflowTool 运行及当前工作流步骤',
    'Show Agent Teams, teammate backends, activity, and open tasks': '显示 Agent Teams、队友后端、活动和未完成任务',
    'Show UDS/named-pipe and LAN registry for terminal messaging': '显示用于终端消息的 UDS/命名管道和 LAN 注册表',
    'Show daemon state and live background or interactive sessions': '显示 daemon 状态以及实时后台/交互会话',
    'Remote Control': '远程控制',
    'Show bridge mode, base URL, token presence, and entitlement note': '显示 bridge 模式、base URL、token 状态和授权说明',
    'Show recent remote trigger audit records, failures, and latest call': '显示最近的远程触发审计记录、失败项和最新调用',
    'Resume waiting flow': '恢复等待中的流程',
    'Autonomy panel dismissed': '已关闭自动化面板',
  },
  'compact-DobNZBBb.js': {
    'No messages to compact': '没有可压缩的消息',
    'Compaction canceled.': '压缩已取消。',
    'Not enough messages to compact. Send a few more messages first, then try again.': '消息数量不足，无法压缩。请先多发送几条消息后重试。',
  },
  'context-BpIGbMwV.js': {
    'Autocompact is disabled. Use /compact to free space, or enable autocompact in /config.': '自动压缩已禁用。使用 /compact 释放空间，或在 /config 中启用自动压缩。',
    'Pipe output through head, tail, or grep to reduce result size. Avoid cat on large files — use Read with offset/limit instead.': '通过 head、tail 或 grep 管道处理输出以减少结果大小。避免对大文件使用 cat，请改用带 offset/limit 的 Read。',
    'Use offset and limit parameters to read only the sections you need. Avoid re-reading entire files when you only need a few lines.': '使用 offset 和 limit 参数仅读取需要的部分。只需要几行时，避免重新读取整个文件。',
    'Add more specific patterns or use the glob or type parameter to narrow file types. Consider Glob for file discovery instead of Grep.': '添加更具体的模式，或使用 glob/type 参数缩小文件类型范围。文件发现可考虑使用 Glob 而不是 Grep。',
    'Web page content can be very large. Consider extracting only the specific information needed.': '网页内容可能很大。请考虑只提取所需的具体信息。',
    'This tool is consuming a significant portion of context.': '此工具正在占用大量上下文。',
    'If you are re-reading files, consider referencing earlier reads. Use offset/limit for large files.': '如果正在重复读取文件，请考虑引用先前读取结果。读取大文件时使用 offset/limit。',
    'Free space': '释放空间',
  },
  'claudeDesktop-CdV8yz4i.js': {
    'Could not find Claude Desktop config file in Windows. Make sure Claude Desktop is installed on Windows.': '在 Windows 中找不到 Claude Desktop 配置文件。请确认已在 Windows 上安装 Claude Desktop。',
    'Unsupported platform - Claude Desktop integration only works on macOS and WSL.': '不支持的平台 - Claude Desktop 集成仅适用于 macOS 和 WSL。',
  },
  'cleanup-DvScn2q0.js': {
    'Claude is done using your computer': 'Claude 已完成对你电脑的使用',
  },
  'bridgeMain-C6B3gkfu.js': {
    'Spawn mode: ': '启动模式：',
    'Healthcheck received': '已收到健康检查',
    'Spawn mode: worktree (new sessions get isolated git worktrees)': '启动模式：worktree（新会话会获得隔离的 git worktree）',
    'Spawn mode: same-dir (new sessions share the current directory)': '启动模式：same-dir（新会话共享当前目录）',
    'Remote Control base URL uses HTTP. Only HTTPS or localhost HTTP is allowed.': '远程控制 base URL 使用了 HTTP。仅允许 HTTPS 或 localhost HTTP。',
  },
  'break-cache-C7aWO0cF.js': {
    'Break-cache was not active.': 'break-cache 未启用。',
    'Every API call will now append a random nonce to the system prompt,': '现在每次 API 调用都会向系统提示词追加随机 nonce，',
    'permanently preventing prompt-cache hits for this session.': '从而在本次会话中永久阻止命中 prompt-cache。',
    'The next API call will append a random nonce to the system prompt,': '下一次 API 调用会向系统提示词追加随机 nonce，',
    'causing a cache miss. The marker is removed automatically after use.': '从而导致缓存未命中。该标记会在使用后自动移除。',
    'How it works:': '工作原理：',
  },
  'buddy-BcZmfof6.js': {
    'Mysterious and code-savvy.': '神秘且精通代码。',
    'Your companion will now appear beside your input box!': '你的伙伴现在会显示在输入框旁边！',
  },
  'AssistantSessionChooser-Dq83wAfM.js': {
    'Select Assistant Session': '选择 Assistant 会话',
    'Multiple sessions found. Select one to attach:': '找到多个会话。请选择要附加的会话：',
  },
  'branch-vlwYMH6R.js': {
    'Branched conversation': '已创建分支会话',
    'Unknown error occurred': '发生未知错误',
  },
  'bg-VlR9Rz1m.js': {
    'No active sessions.': '没有活动会话。',
  },
  'ant-Bb9qk-hp.js': {
    'No recent sessions.': '没有最近会话。',
  },
  'autoMode-Dr6dAMVR.js': {
    'Failed to analyze rules: ': '分析规则失败：',
  },
  'autonomy-coa-z92p.js': {
    'Latest: none': '最近：无',
    'Workflow runs: 0': '工作流运行：0',
  },
  'btw-BWVNsOBj.js': {
    'No response received': '未收到响应',
    'Failed to get response': '获取响应失败',
  },
  'chromeNativeHost-Ct0ug6pP.js': {
    'Cleaned up socket file': '已清理 socket 文件',
    'Removed empty socket directory': '已移除空 socket 目录',
    'Invalid JSON from Chrome:': '来自 Chrome 的 JSON 无效：',
    'Invalid message format': '消息格式无效',
    'Invalid message from Chrome:': '来自 Chrome 的消息无效：',
  },
  'crossProjectResume-DfZTESja.js': {
    'Type to Search': '输入以搜索',
    'No text content in agentic search response': 'agentic 搜索响应中没有文本内容',
    'Could not find JSON in agentic search response': '无法在 agentic 搜索响应中找到 JSON',
  },
  'DevChannelsDialog-3jhaLVie.js': {
    'WARNING: Loading development channels': '警告：正在加载开发通道',
    'Please use --channels to run a list of approved channels.': '请使用 --channels 运行已批准的通道列表。',
  },
  'DiffDialog-BCwX08QD.js': {
    'Uncommitted changes': '未提交的更改',
    'No file changes in this turn': '本轮没有文件更改',
    'Too many files to display details': '文件过多，无法显示详细信息',
    'Working tree is clean': '工作区是干净的',
  },
  'createSSHSession-C47zdcS-.js': {
    'SSH process stdout is not available': 'SSH 进程 stdout 不可用',
    'No API credentials available on local machine': '本机没有可用的 API 凭据',
    'Creating remote directory...': '正在创建远程目录...',
    'Uploading binary...': '正在上传二进制文件...',
    'Installing wrapper script...': '正在安装包装脚本...',
  },
  'color-CINdebfn.js': {
    'Cannot set color: This session is a swarm teammate. Teammate colors are assigned by the team leader.': '无法设置颜色：此会话是 swarm 队友。队友颜色由团队负责人分配。',
  },
  'computerUseLock-GdO1odTI.js': {
    'Released computer-use lock': '已释放 computer-use 锁',
  },
  'backgroundHousekeeping-lXLyZuoH.js': {
    'Skipping cleanup: settings have validation errors but cleanupPeriodDays was explicitly set. Fix settings errors to enable cleanup.': '跳过清理：设置存在验证错误，但 cleanupPeriodDays 已显式设置。修复设置错误后才能启用清理。',
  },
  'banner-LOmz2isD.js': {
    'The prompt below was supplied by the link — review carefully before pressing Enter.': '下面的提示词由链接提供，请在按 Enter 前仔细检查。',
  },
  'promptEditor-SCsArCmu.js': {
    'Ink instance not found - cannot pause rendering': '未找到 Ink 实例，无法暂停渲染',
  },
  'replBridge-ifOcJ5R4.js': {
    'Work item lease expired, fetching fresh token': '工作项租约已过期，正在获取新的令牌',
    'Lost sync with Remote Control — events could not be delivered': '与远程控制失去同步，事件无法送达',
    'Environment deleted and re-registration limit reached': '环境已删除，且已达到重新注册上限',
    'Environment deleted and re-registration failed': '环境已删除，重新注册失败',
  },
  'assistant-ZBcNiEht.js': {
    'Assistant mode in-process team': 'Assistant 模式进程内团队',
  },
  'changeDetector-CraEGhVw.js': {
    'Detected MDM settings change via poll': '通过轮询检测到 MDM 设置变更',
  },
  'detectRepository-sf-157eI.js': {
    'No git remote URL found': '未找到 git 远程 URL',
  },
  'api-CTSzJoHl.js': {
    'Your workspace API key was cleared. ': '你的 workspace API key 已被清除。',
    'A workspace API key (sk-ant-api03-*) is required to use workspace endpoints (/v1/agents, /v1/vaults, /v1/memory_stores, /v1/skills). ': '使用 workspace 端点（/v1/agents、/v1/vaults、/v1/memory_stores、/v1/skills）需要 workspace API key（sk-ant-api03-*）。',
    'Press W in /login to save your key directly (no restart needed), or set ANTHROPIC_API_KEY=<key> and restart. Obtain a key from https://console.anthropic.com/settings/keys. Subscription OAuth (claude.ai login) cannot reach these endpoints.': '在 /login 中按 W 可直接保存密钥（无需重启），或设置 ANTHROPIC_API_KEY=<key> 后重启。可在 https://console.anthropic.com/settings/keys 获取密钥。订阅 OAuth（claude.ai 登录）无法访问这些端点。',
    'Workspace API key must start with sk-ant-api03-, got prefix "': 'Workspace API key 必须以 sk-ant-api03- 开头，当前前缀为 "',
    'Claude Code web sessions require authentication with a Claude.ai account. API key authentication is not sufficient. Please run /login to authenticate, or check your authentication status with /status.': 'Claude Code Web 会话需要使用 Claude.ai 账号认证。仅 API key 认证不够。请运行 /login 完成认证，或用 /status 检查认证状态。',
    'Unable to get organization UUID': '无法获取组织 UUID',
    'Failed to fetch code sessions: ': '获取 code sessions 失败：',
    'Session expired. Please run /login to sign in again.': '会话已过期。请运行 /login 重新登录。',
    'Failed to fetch session: ': '获取会话失败：',
  },
};

let total = 0;
for (const [file, replacements] of Object.entries(replacementsByFile)) {
  const fullPath = path.join(chunksDir, file);
  if (!fs.existsSync(fullPath)) {
    console.log(`[skip] ${file} not found`);
    continue;
  }
  let content = fs.readFileSync(fullPath, 'utf8');
  let hits = 0;
  for (const [from, to] of Object.entries(replacements)) {
    if (!content.includes(from)) continue;
    const before = content;
    content = content.split(from).join(to);
    hits += (before.length - content.length) === 0 ? 1 : before.split(from).length - 1;
  }
  if (hits > 0) {
    fs.writeFileSync(fullPath, content, 'utf8');
    total += hits;
    console.log(`[patch] ${file}: ${hits}`);
  }
}

console.log(`[done] safe UI i18n replacements: ${total}`);
