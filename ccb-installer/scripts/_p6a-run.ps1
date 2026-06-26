param([string]$ChunksDir)
$ErrorActionPreference = "Stop"
$utf8NoBom = [System.Text.UTF8Encoding]::new($false)

function New-ReplacementMap {
  return [System.Collections.Generic.Dictionary[string, string]]::new([System.StringComparer]::Ordinal)
}

function Patch-AllChunks {
  param([string]$DistDir, $Replacements)
  $hits = 0
  Get-ChildItem -LiteralPath $DistDir -Filter "*.js" -File | ForEach-Object {
    $content = [System.IO.File]::ReadAllText($_.FullName, $utf8NoBom)
    $changed = $false
    foreach ($kv in $Replacements.GetEnumerator()) {
      if ($content.Contains($kv.Key)) {
        $content = $content.Replace($kv.Key, $kv.Value)
        $changed = $true
        $hits++
      }
    }
    if ($changed) {
      [System.IO.File]::WriteAllText($_.FullName, $content, $utf8NoBom)
      Write-Host "  [updated] $($_.Name)" -ForegroundColor Green
    }
  }
  return $hits
}

if (-not $ChunksDir) { $ChunksDir = Join-Path (Split-Path -Parent (Split-Path -Parent $PSScriptRoot)) "dist\chunks" }

# === Agents ===
$chunkAgents = New-ReplacementMap
$chunkAgents['Agent file already exists: ${u}'] = '\u4ee3\u7406\u6587\u4ef6\u5df2\u5b58\u5728\uff1a${u}'
$chunkAgents['Agent has access to all tools'] = '\u4ee3\u7406\u53ef\u8bbf\u95ee\u6240\u6709\u5de5\u5177'
$chunkAgents['Agent type is required'] = '\u4ee3\u7406\u7c7b\u578b\u4e0d\u80fd\u4e3a\u7a7a'
$chunkAgents['Agent type must be at least 3 characters long'] = '\u4ee3\u7406\u7c7b\u578b\u81f3\u5c11\u9700\u8981 3 \u4e2a\u5b57\u7b26'
$chunkAgents['Agent type must be less than 50 characters'] = '\u4ee3\u7406\u7c7b\u578b\u4e0d\u80fd\u8d85\u8fc7 50 \u4e2a\u5b57\u7b26'
$chunkAgents['Agent type must start and end with alphanumeric characters and contain only letters, numbers, and hyphens'] = '\u4ee3\u7406\u7c7b\u578b\u5fc5\u987b\u4ee5\u5b57\u6bcd\u6570\u5b57\u5f00\u5934\u548c\u7ed3\u5c3e\uff0c\u4e14\u53ea\u80fd\u5305\u542b\u5b57\u6bcd\u3001\u6570\u5b57\u548c\u8fde\u5b57\u7b26'
$chunkAgents['Built-in (always available):'] = '\u5185\u7f6e\uff08\u59cb\u7ec8\u53ef\u7528\uff09\uff1a'
$chunkAgents['Cannot delete built-in agents'] = '\u65e0\u6cd5\u5220\u9664\u5185\u7f6e\u4ee3\u7406'
$chunkAgents['Cannot get directory path for ${e} agents'] = '\u65e0\u6cd5\u83b7\u53d6 ${e} \u4ee3\u7406\u7684\u76ee\u5f55\u8def\u5f84'
$chunkAgents['Cannot get file path for plugin agents'] = '\u65e0\u6cd5\u83b7\u53d6\u63d2\u4ef6\u4ee3\u7406\u7684\u6587\u4ef6\u8def\u5f84'
$chunkAgents['Cannot save built-in agents'] = '\u65e0\u6cd5\u4fdd\u5b58\u5185\u7f6e\u4ee3\u7406'
$chunkAgents['Cannot update built-in agents'] = '\u65e0\u6cd5\u66f4\u65b0\u5185\u7f6e\u4ee3\u7406'
$chunkAgents['Created agent: ${l.bold(r.finalAgent.agentType)} and opened in editor. If you made edits, restart to load the latest version.'] = '\u5df2\u521b\u5efa\u4ee3\u7406\uff1a${l.bold(r.finalAgent.agentType)} \u5e76\u5728\u7f16\u8f91\u5668\u4e2d\u6253\u5f00\u3002\u5982\u679c\u60a8\u505a\u4e86\u4fee\u6539\uff0c\u8bf7\u91cd\u542f\u4ee5\u52a0\u8f7d\u6700\u65b0\u7248\u672c\u3002'
$chunkAgents['Created agent: ${l.bold(r.finalAgent.agentType)}'] = '\u5df2\u521b\u5efa\u4ee3\u7406\uff1a${l.bold(r.finalAgent.agentType)}'
$chunkAgents['Deleted agent: ${l.bold(e.agentType)}'] = '\u5df2\u5220\u9664\u4ee3\u7406\uff1a${l.bold(e.agentType)}'
$chunkAgents['Describe what this agent should do and when it should be used (be comprehensive for best results)'] = '\u63cf\u8ff0\u6b64\u4ee3\u7406\u5e94\u505a\u4ec0\u4e48\u4ee5\u53ca\u4f55\u65f6\u4f7f\u7528\uff08\u8be6\u7ec6\u63cf\u8ff0\u4ee5\u83b7\u5f97\u6700\u4f73\u6548\u679c\uff09'
$chunkAgents['Description (description) is required'] = '\u63cf\u8ff0\uff08description\uff09\u4e0d\u80fd\u4e3a\u7a7a'
$chunkAgents['Description is required'] = '\u63cf\u8ff0\u4e0d\u80fd\u4e3a\u7a7a'
$hits = Patch-AllChunks -DistDir $ChunksDir -Replacements $chunkAgents
Write-Host "  $chunkAgents -> $hits hits"

# === Hooks ===
$chunkHooks = New-ReplacementMap
$chunkHooks['After a user responds to an MCP elicitation'] = '\u7528\u6237\u54cd\u5e94 MCP \u8be2\u95ee\u540e'
$chunkHooks['After auto mode classifier denies a tool call'] = '\u81ea\u52a8\u6a21\u5f0f\u5206\u7c7b\u5668\u62d2\u7edd\u5de5\u5177\u8c03\u7528\u540e'
$chunkHooks['After conversation compaction'] = '\u5bf9\u8bdd\u538b\u7f29\u540e'
$chunkHooks['After the working directory changes'] = '\u5de5\u4f5c\u76ee\u5f55\u66f4\u6539\u540e'
$chunkHooks['After tool execution fails'] = '\u5de5\u5177\u6267\u884c\u5931\u8d25\u540e'
$chunkHooks['After tool execution'] = '\u5de5\u5177\u6267\u884c\u540e'
$chunkHooks['All hooks are currently '] = '\u6240\u6709\u94a9\u5b50\u5f53\u524d '
$chunkHooks['Before conversation compaction'] = '\u5bf9\u8bdd\u538b\u7f29\u524d'
$chunkHooks['Before tool execution'] = '\u5de5\u5177\u6267\u884c\u524d'
$chunkHooks['Create an isolated worktree for VCS-agnostic isolation'] = '\u521b\u5efa\u72ec\u7acb worktree \u4ee5\u5b9e\u73b0\u4e0e\u7248\u672c\u63a7\u5236\u7cfb\u7edf\u65e0\u5173\u7684\u9694\u79bb'
$chunkHooks['Hook Configuration - Disabled'] = '\u94a9\u5b50\u914d\u7f6e - \u5df2\u7981\u7528'
$chunkHooks['Hooks dialog dismissed'] = '\u94a9\u5b50\u5bf9\u8bdd\u6846\u5df2\u5173\u95ed'
$chunkHooks['No hooks configured for this event.'] = '\u6b64\u4e8b\u4ef6\u672a\u914d\u7f6e\u94a9\u5b50\u3002'
$chunkHooks['Remove a previously created worktree'] = '\u79fb\u9664\u5148\u524d\u521b\u5efa\u7684 worktree'
$chunkHooks['Repo setup hooks for init and maintenance'] = '\u7528\u4e8e\u521d\u59cb\u5316\u548c\u7ef4\u62a4\u7684\u4ed3\u5e93\u8bbe\u7f6e\u94a9\u5b50'
$chunkHooks['Right before a subagent (Agent tool call) concludes its response'] = '\u5b50\u4ee3\u7406\uff08Agent \u5de5\u5177\u8c03\u7528\uff09\u7ed3\u675f\u56de\u5e94\u524d'
$chunkHooks['Right before Claude concludes its response'] = 'Claude \u7ed3\u675f\u56de\u5e94\u524d'
$chunkHooks['Status message: '] = '\u72b6\u6001\u6d88\u606f\uff1a'
$chunkHooks['To add hooks, edit settings.json directly or ask Claude.'] = '\u8981\u6dfb\u52a0\u94a9\u5b50\uff0c\u8bf7\u76f4\u63a5\u7f16\u8f91 settings.json \u6216\u8be2\u95ee Claude\u3002'
$hits = Patch-AllChunks -DistDir $ChunksDir -Replacements $chunkHooks
Write-Host "  $chunkHooks -> $hits hits"

# === LaunchAgents ===
$chunkLaunchAgents = New-ReplacementMap
$chunkLaunchAgents['Agent ${n} deleted.'] = '\u5df2\u5220\u9664\u4ee3\u7406 ${n}\u3002'
$chunkLaunchAgents['Agent ${n} triggered. Run ID: ${e.run_id}'] = '\u5df2\u89e6\u53d1\u4ee3\u7406 ${n}\u3002\u8fd0\u884c ID\uff1a${e.run_id}'
$chunkLaunchAgents['Agent created: ${e.id}'] = '\u5df2\u521b\u5efa\u4ee3\u7406\uff1a${e.id}'
$chunkLaunchAgents['Agent not found.'] = '\u672a\u627e\u5230\u4ee3\u7406\u3002'
$chunkLaunchAgents['Authentication failed. Please run /login to re-authenticate.'] = '\u8ba4\u8bc1\u5931\u8d25\u3002\u8bf7\u8fd0\u884c /login \u91cd\u65b0\u8ba4\u8bc1\u3002'
$chunkLaunchAgents['Failed to create agent: ${n}'] = '\u521b\u5efa\u4ee3\u7406\u5931\u8d25\uff1a${n}'
$chunkLaunchAgents['Failed to delete agent ${n}: ${r}'] = '\u5220\u9664\u4ee3\u7406 ${n} \u5931\u8d25\uff1a${r}'
$chunkLaunchAgents['Failed to list agents: ${n}'] = '\u5217\u51fa\u4ee3\u7406\u5931\u8d25\uff1a${n}'
$chunkLaunchAgents['Failed to run agent ${n}: ${r}'] = '\u8fd0\u884c\u4ee3\u7406 ${n} \u5931\u8d25\uff1a${r}'
$chunkLaunchAgents['Invalid cron expression: "${n}". Expected 5 fields (minute hour day month weekday).'] = '\u65e0\u6548\u7684 cron \u8868\u8fbe\u5f0f\uff1a"${n}"\u3002\u9700\u8981 5 \u4e2a\u5b57\u6bb5\uff08\u5206 \u65f6 \u65e5 \u6708 \u5468\uff09\u3002'
$chunkLaunchAgents['No scheduled agents found.'] = '\u672a\u627e\u5230\u5df2\u8c03\u5ea6\u7684\u4ee3\u7406\u3002'
$chunkLaunchAgents['No scheduled agents. Use /agents-platform create <cron> <prompt> to create one.'] = '\u6ca1\u6709\u5df2\u8c03\u5ea6\u7684\u4ee3\u7406\u3002\u4f7f\u7528 /agents-platform create <cron> <prompt> \u521b\u5efa\u4e00\u4e2a\u3002'
$chunkLaunchAgents['Request failed after retries'] = '\u91cd\u8bd5\u540e\u8bf7\u6c42\u4ecd\u5931\u8d25'
$chunkLaunchAgents['Subscription required. Scheduled agents require a Claude Pro/Max/Team subscription.'] = '\u9700\u8981\u8ba2\u9605\u3002\u5df2\u8c03\u5ea6\u7684\u4ee3\u7406\u9700\u8981 Claude Pro/Max/Team \u8ba2\u9605\u3002'
$chunkLaunchAgents['Unknown sub-command "${r}". Use: list | create CRON PROMPT | delete ID | run ID'] = '\u672a\u77e5\u5b50\u547d\u4ee4 "${r}"\u3002\u4f7f\u7528\uff1alist | create CRON PROMPT | delete ID | run ID'
$hits = Patch-AllChunks -DistDir $ChunksDir -Replacements $chunkLaunchAgents
Write-Host "  $chunkLaunchAgents -> $hits hits"

# === McpDialog ===
$chunkMcpDialog = New-ReplacementMap
$chunkMcpDialog['Authenticating with '] = '\u6b63\u5728\u8ba4\u8bc1 '
$chunkMcpDialog['Authentication successful for ${e.name}. The server will connect when the agent runs.'] = '${e.name} \u8ba4\u8bc1\u6210\u529f\u3002\u670d\u52a1\u5668\u5c06\u5728\u4ee3\u7406\u8fd0\u884c\u65f6\u8fde\u63a5\u3002'
$chunkMcpDialog['Contains warnings'] = '\u5305\u542b\u8b66\u544a'
$chunkMcpDialog['Failed to reconnect to ${e}'] = '\u91cd\u65b0\u8fde\u63a5 ${e} \u5931\u8d25'
$chunkMcpDialog['Failed to reconnect to '] = '\u91cd\u65b0\u8fde\u63a5\u5931\u8d25\uff1a'
$chunkMcpDialog['For help configuring MCP servers, see:'] = '\u6709\u5173\u914d\u7f6e MCP \u670d\u52a1\u5668\u7684\u5e2e\u52a9\uff0c\u8bf7\u53c2\u9605\uff1a'
$chunkMcpDialog['If your browser doesn''t open automatically, copy this URL manually:'] = '\u5982\u679c\u6d4f\u89c8\u5668\u672a\u81ea\u52a8\u6253\u5f00\uff0c\u8bf7\u624b\u52a8\u590d\u5236\u6b64 URL\uff1a'
$chunkMcpDialog['Manage MCP servers'] = '\u7ba1\u7406 MCP \u670d\u52a1\u5668'
$chunkMcpDialog['MCP Config Diagnostics'] = 'MCP \u914d\u7f6e\u8bca\u65ad'
$chunkMcpDialog['MCP dialog dismissed'] = 'MCP \u5bf9\u8bdd\u6846\u5df2\u5173\u95ed'
$chunkMcpDialog['MCP server "${e}" not found'] = '\u672a\u627e\u5230 MCP \u670d\u52a1\u5668 "${e}"'
$chunkMcpDialog['MCP server "${t}" not found'] = '\u672a\u627e\u5230 MCP \u670d\u52a1\u5668 "${t}"'
$chunkMcpDialog['Reconnecting to '] = '\u6b63\u5728\u91cd\u65b0\u8fde\u63a5 '
$chunkMcpDialog['Return here after authenticating in your browser.'] = '\u5728\u6d4f\u89c8\u5668\u4e2d\u5b8c\u6210\u8ba4\u8bc1\u540e\u8fd4\u56de\u6b64\u5904\u3002'
$chunkMcpDialog['Successfully reconnected to ${e}'] = '\u5df2\u6210\u529f\u91cd\u65b0\u8fde\u63a5\u5230 ${e}'
$chunkMcpDialog['This server connects only when running the agent.'] = '\u6b64\u670d\u52a1\u5668\u4ec5\u5728\u8fd0\u884c\u4ee3\u7406\u65f6\u8fde\u63a5\u3002'
$hits = Patch-AllChunks -DistDir $ChunksDir -Replacements $chunkMcpDialog
Write-Host "  $chunkMcpDialog -> $hits hits"

# === McpImport ===
$chunkMcpImport = New-ReplacementMap
$chunkMcpImport['Added ${o} MCP server ${e} to ${r} config'] = '\u5df2\u5c06 ${o} \u4e2a MCP \u670d\u52a1\u5668 ${e} \u6dfb\u52a0\u5230 ${r} \u914d\u7f6e'
$chunkMcpImport['Error: Directory ${n} does not exist'] = '\u9519\u8bef\uff1a\u76ee\u5f55 ${n} \u4e0d\u5b58\u5728'
$chunkMcpImport['Error: Failed to start MCP server: ${e}'] = '\u9519\u8bef\uff1a\u542f\u52a8 MCP \u670d\u52a1\u5668\u5931\u8d25\uff1a${e}'
$chunkMcpImport['File modified: ${W(n)}'] = '\u6587\u4ef6\u5df2\u4fee\u6539\uff1a${W(n)}'
$chunkMcpImport['File modified: ${W(t)}'] = '\u6587\u4ef6\u5df2\u4fee\u6539\uff1a${W(t)}'
$chunkMcpImport['Import MCP Servers from Claude Desktop'] = '\u4ece Claude Desktop \u5bfc\u5165 MCP \u670d\u52a1\u5668'
$chunkMcpImport['No MCP server found with name: "${e}"'] = '\u672a\u627e\u5230\u540d\u4e3a "${e}" \u7684 MCP \u670d\u52a1\u5668'
$chunkMcpImport['No MCP server found with name: ${e}'] = '\u672a\u627e\u5230\u540d\u4e3a ${e} \u7684 MCP \u670d\u52a1\u5668'
$chunkMcpImport['No MCP servers found in Claude Desktop configuration or configuration file does not exist.'] = '\u5728 Claude Desktop \u914d\u7f6e\u4e2d\u672a\u627e\u5230 MCP \u670d\u52a1\u5668\uff0c\u6216\u914d\u7f6e\u6587\u4ef6\u4e0d\u5b58\u5728\u3002'
$chunkMcpImport['Note: Some servers already exist with the same name. If selected, they will be imported with a numbered suffix.'] = '\u6ce8\u610f\uff1a\u67d0\u4e9b\u670d\u52a1\u5668\u5df2\u5b58\u5728\u540c\u540d\u3002\u5982\u679c\u9009\u62e9\uff0c\u5b83\u4eec\u5c06\u4ee5\u6570\u5b57\u540e\u7f00\u5bfc\u5165\u3002'
$chunkMcpImport['Please select the servers you want to import:'] = '\u8bf7\u9009\u62e9\u8981\u5bfc\u5165\u7684\u670d\u52a1\u5668\uff1a'
$hits = Patch-AllChunks -DistDir $ChunksDir -Replacements $chunkMcpImport
Write-Host "  $chunkMcpImport -> $hits hits"

# === McpConnections ===
$chunkMcpConnections = New-ReplacementMap
$chunkMcpConnections['Channel notifications registered'] = '\u9891\u9053\u901a\u77e5\u5df2\u6ce8\u518c'
$chunkMcpConnections['Channels are not currently available'] = '\u9891\u9053\u5f53\u524d\u4e0d\u53ef\u7528'
$chunkMcpConnections['Channels are not enabled for your org · have an administrator set channelsEnabled: true in managed settings'] = '\u60a8\u7684\u7ec4\u7ec7\u672a\u542f\u7528\u9891\u9053 \u00b7 \u8bf7\u7ba1\u7406\u5458\u5728\u7ba1\u7406\u8bbe\u7f6e\u4e2d\u5c06 channelsEnabled \u8bbe\u4e3a true'
$chunkMcpConnections['Channels require claude.ai authentication · run /login'] = '\u9891\u9053\u9700\u8981 claude.ai \u8ba4\u8bc1 \u00b7 \u8fd0\u884c /login'
$chunkMcpConnections['Failed to get claude.ai MCP resources: ${C(e)}'] = '\u83b7\u53d6 claude.ai MCP \u8d44\u6e90\u5931\u8d25\uff1a${C(e)}'
$chunkMcpConnections['Failed to get MCP resources: ${C(e)}'] = '\u83b7\u53d6 MCP \u8d44\u6e90\u5931\u8d25\uff1a${C(e)}'
$chunkMcpConnections['Failed to initialize servers as pending: ${C(e)}'] = '\u5c06\u670d\u52a1\u5668\u521d\u59cb\u5316\u4e3a\u5f85\u5904\u7406\u5931\u8d25\uff1a${C(e)}'
$chunkMcpConnections['Failed to invalidate the server cache: ${e.name}'] = '\u4f7f\u670d\u52a1\u5668\u7f13\u5b58\u5931\u6548\u5931\u8d25\uff1a${e.name}'
$chunkMcpConnections['Max reconnection attempts (${Z}) reached, giving up'] = '\u5df2\u8fbe\u5230\u6700\u5927\u91cd\u8fde\u5c1d\u8bd5\u6b21\u6570 (${Z})\uff0c\u653e\u5f03\u91cd\u8fde'
$chunkMcpConnections['MCP server ${e} not found'] = '\u672a\u627e\u5230 MCP \u670d\u52a1\u5668 ${e}'
$chunkMcpConnections['Received prompts/list_changed notification, refreshing prompts'] = '\u6536\u5230 prompts/list_changed \u901a\u77e5\uff0c\u6b63\u5728\u5237\u65b0 prompts'
$chunkMcpConnections['Received resources/list_changed notification, refreshing resources'] = '\u6536\u5230 resources/list_changed \u901a\u77e5\uff0c\u6b63\u5728\u5237\u65b0 resources'
$chunkMcpConnections['Received tools/list_changed notification, refreshing tools'] = '\u6536\u5230 tools/list_changed \u901a\u77e5\uff0c\u6b63\u5728\u5237\u65b0 tools'
$chunkMcpConnections['Scheduling reconnection attempt ${t+1} in ${i}ms'] = '\u8ba1\u5212\u5728 ${i}ms \u540e\u8fdb\u884c\u7b2c ${t+1} \u6b21\u91cd\u8fde'
$chunkMcpConnections['Server disabled during reconnection, stopping retry'] = '\u91cd\u8fde\u671f\u95f4\u670d\u52a1\u5668\u5df2\u7981\u7528\uff0c\u505c\u6b62\u91cd\u8bd5'
$chunkMcpConnections['Server is disabled, skipping automatic reconnection'] = '\u670d\u52a1\u5668\u5df2\u7981\u7528\uff0c\u8df3\u8fc7\u81ea\u52a8\u91cd\u8fde'
$hits = Patch-AllChunks -DistDir $ChunksDir -Replacements $chunkMcpConnections
Write-Host "  $chunkMcpConnections -> $hits hits"

# === ManagePlugins ===
$chunkManagePlugins = New-ReplacementMap
$chunkManagePlugins['Error loading plugins: ${e}'] = '\u52a0\u8f7d\u63d2\u4ef6\u65f6\u51fa\u9519\uff1a${e}'
$chunkManagePlugins['Failed to load plugin agents: ${t}'] = '\u52a0\u8f7d\u63d2\u4ef6\u4ee3\u7406\u5931\u8d25\uff1a${t}'
$chunkManagePlugins['Failed to load plugin commands: ${t}'] = '\u52a0\u8f7d\u63d2\u4ef6\u547d\u4ee4\u5931\u8d25\uff1a${t}'
$chunkManagePlugins['Failed to load plugin hooks: ${t}'] = '\u52a0\u8f7d\u63d2\u4ef6\u94a9\u5b50\u5931\u8d25\uff1a${t}'
$chunkManagePlugins['Loaded plugins - Enabled: ${e.length}, Disabled: ${n.length}, Commands: ${s.length}, Agents: ${c.length}, Errors: ${r.length}'] = '\u5df2\u52a0\u8f7d\u63d2\u4ef6 - \u542f\u7528\uff1a${e.length}\uff0c\u7981\u7528\uff1a${n.length}\uff0c\u547d\u4ee4\uff1a${s.length}\uff0c\u4ee3\u7406\uff1a${c.length}\uff0c\u9519\u8bef\uff1a${r.length}'
$chunkManagePlugins['Plugins changed. Run /reload-plugins to activate.'] = '\u63d2\u4ef6\u5df2\u66f4\u6539\u3002\u8fd0\u884c /reload-plugins \u4ee5\u6fc0\u6d3b\u3002'
$chunkManagePlugins['Plugins flagged. Check /plugins'] = '\u63d2\u4ef6\u5df2\u6807\u8bb0\u3002\u68c0\u67e5 /plugins'
$hits = Patch-AllChunks -DistDir $ChunksDir -Replacements $chunkManagePlugins
Write-Host "  $chunkManagePlugins -> $hits hits"

# === PluginsMarketplace ===
$chunkPluginsMarketplace = New-ReplacementMap
$chunkPluginsMarketplace['Adding marketplace...'] = '\u6b63\u5728\u6dfb\u52a0 marketplace...'
$chunkPluginsMarketplace['Cannot use --all with a specific plugin'] = '\u4e0d\u80fd\u5c06 --all \u4e0e\u6307\u5b9a\u63d2\u4ef6\u4e00\u8d77\u4f7f\u7528'
$chunkPluginsMarketplace['Cannot use --scope with --all'] = '\u4e0d\u80fd\u5c06 --scope \u4e0e --all \u4e00\u8d77\u4f7f\u7528'
$chunkPluginsMarketplace['No marketplaces configured'] = '\u672a\u914d\u7f6e marketplace'
$chunkPluginsMarketplace['Please specify a plugin name or use --all to disable all plugins'] = '\u8bf7\u6307\u5b9a\u63d2\u4ef6\u540d\u79f0\u6216\u4f7f\u7528 --all \u7981\u7528\u6240\u6709\u63d2\u4ef6'
$chunkPluginsMarketplace['Updating ${n.length} marketplace(s)...'] = '\u6b63\u5728\u66f4\u65b0 ${n.length} \u4e2a marketplace...'
$chunkPluginsMarketplace['Updating marketplace: ${e}...'] = '\u6b63\u5728\u66f4\u65b0 marketplace\uff1a${e}...'
$hits = Patch-AllChunks -DistDir $ChunksDir -Replacements $chunkPluginsMarketplace
Write-Host "  $chunkPluginsMarketplace -> $hits hits"

# === PluginOps ===
$chunkPluginOps = New-ReplacementMap
$chunkPluginOps['Cannot install local plugin "${e.pluginName}" without marketplace install location'] = '\u65e0\u6cd5\u5728\u6ca1\u6709 marketplace \u5b89\u88c5\u4f4d\u7f6e\u7684\u60c5\u51b5\u4e0b\u5b89\u88c5\u672c\u5730\u63d2\u4ef6 "${e.pluginName}"'
$chunkPluginOps['Failed to update settings: ${e.message}'] = '\u66f4\u65b0\u8bbe\u7f6e\u5931\u8d25\uff1a${e.message}'
$chunkPluginOps['Marketplace directory not found at ${r}'] = '\u5728 ${r} \u627e\u4e0d\u5230 marketplace \u76ee\u5f55'
$chunkPluginOps['No enabled plugins to disable'] = '\u6ca1\u6709\u53ef\u7981\u7528\u7684\u542f\u7528\u63d2\u4ef6'
$chunkPluginOps['Plugin "${e.pluginName}" depends on "${e.blockedDependency}", which is blocked by your organization''s policy'] = '\u63d2\u4ef6 "${e.pluginName}" \u4f9d\u8d56\u4e8e "${e.blockedDependency}"\uff0c\u800c\u540e\u8005\u88ab\u60a8\u6240\u5728\u7ec4\u7ec7\u7684\u7b56\u7565\u963b\u6b62'
$chunkPluginOps['Plugin "${e.pluginName}" is blocked by your organization''s policy and cannot be installed'] = '\u63d2\u4ef6 "${e.pluginName}" \u88ab\u60a8\u6240\u5728\u7ec4\u7ec7\u7684\u7b56\u7565\u963b\u6b62\uff0c\u65e0\u6cd5\u5b89\u88c5'
$chunkPluginOps['Plugin "${e}" is enabled at project scope (.claude/settings.json, shared with your team). To disable just for you: claude plugin disable ${e} --scope local'] = '\u63d2\u4ef6 "${e}" \u5df2\u5728\u9879\u76ee\u8303\u56f4\u542f\u7528\uff08.claude/settings.json\uff0c\u4e0e\u56e2\u961f\u5171\u4eab\uff09\u3002\u8981\u4ec5\u4e3a\u60a8\u81ea\u5df1\u7981\u7528\uff1aclaude plugin disable ${e} --scope local'
$chunkPluginOps['Plugin "${e}" is installed at ${c.scope} scope, not ${n}. Use --scope ${c.scope} or omit --scope to auto-detect.'] = '\u63d2\u4ef6 "${e}" \u5df2\u5728 ${c.scope} \u8303\u56f4\u5b89\u88c5\uff0c\u800c\u4e0d\u662f ${n}\u3002\u4f7f\u7528 --scope ${c.scope} \u6216\u7701\u7565 --scope \u4ee5\u81ea\u52a8\u68c0\u6d4b\u3002'
$chunkPluginOps['Plugin "${e}" is installed in ${n} scope, not ${t}. Use --scope ${n} to uninstall.'] = '\u63d2\u4ef6 "${e}" \u5df2\u5728 ${n} \u8303\u56f4\u5b89\u88c5\uff0c\u800c\u4e0d\u662f ${t}\u3002\u4f7f\u7528 --scope ${n} \u5378\u8f7d\u3002'
$chunkPluginOps['Plugin "${e}" is not installed in ${t} scope. Use --scope to specify the correct scope.'] = '\u63d2\u4ef6 "${e}" \u672a\u5728 ${t} \u8303\u56f4\u5b89\u88c5\u3002\u4f7f\u7528 --scope \u6307\u5b9a\u6b63\u786e\u8303\u56f4\u3002'
$chunkPluginOps['Plugin "${e}" not found in any editable settings scope. Use plugin@marketplace format.'] = '\u5728\u4efb\u4f55\u53ef\u7f16\u8f91\u8bbe\u7f6e\u8303\u56f4\u4e2d\u627e\u4e0d\u5230\u63d2\u4ef6 "${e}"\u3002\u4f7f\u7528 plugin@marketplace \u683c\u5f0f\u3002'
$chunkPluginOps['Plugin "${e}" not found in installed plugins'] = '\u5728\u5df2\u5b89\u88c5\u63d2\u4ef6\u4e2d\u627e\u4e0d\u5230 "${e}"'
$chunkPluginOps['Plugin "${e}" not found in settings. Use plugin@marketplace format.'] = '\u5728\u8bbe\u7f6e\u4e2d\u627e\u4e0d\u5230\u63d2\u4ef6 "${e}"\u3002\u4f7f\u7528 plugin@marketplace \u683c\u5f0f\u3002'
$chunkPluginOps['Plugin "${n}" is not installed'] = '\u63d2\u4ef6 "${n}" \u672a\u5b89\u88c5'
$hits = Patch-AllChunks -DistDir $ChunksDir -Replacements $chunkPluginOps
Write-Host "  $chunkPluginOps -> $hits hits"

# === PluginAutoupdate ===
$chunkPluginAutoupdate = New-ReplacementMap
$chunkPluginAutoupdate['Plugin autoupdate: ${t.length} marketplace refresh(es) failed'] = '\u63d2\u4ef6\u81ea\u52a8\u66f4\u65b0\uff1a${t.length} \u4e2a marketplace \u5237\u65b0\u5931\u8d25'
$chunkPluginAutoupdate['Plugin autoupdate: checking installed plugins'] = '\u63d2\u4ef6\u81ea\u52a8\u66f4\u65b0\uff1a\u6b63\u5728\u68c0\u67e5\u5df2\u5b89\u88c5\u63d2\u4ef6'
$chunkPluginAutoupdate['Plugin autoupdate: error updating ${e}: ${o(t)}'] = '\u63d2\u4ef6\u81ea\u52a8\u66f4\u65b0\uff1a\u66f4\u65b0 ${e} \u65f6\u51fa\u9519\uff1a${o(t)}'
$chunkPluginAutoupdate['Plugin autoupdate: failed to refresh marketplace ${e}: ${o(t)}'] = '\u63d2\u4ef6\u81ea\u52a8\u66f4\u65b0\uff1a\u5237\u65b0 marketplace ${e} \u5931\u8d25\uff1a${o(t)}'
$chunkPluginAutoupdate['Plugin autoupdate: failed to update ${e}: ${t.message}'] = '\u63d2\u4ef6\u81ea\u52a8\u66f4\u65b0\uff1a\u66f4\u65b0 ${e} \u5931\u8d25\uff1a${t.message}'
$chunkPluginAutoupdate['Plugin autoupdate: skipped (auto-updater disabled)'] = '\u63d2\u4ef6\u81ea\u52a8\u66f4\u65b0\uff1a\u5df2\u8df3\u8fc7\uff08\u81ea\u52a8\u66f4\u65b0\u5df2\u7981\u7528\uff09'
$chunkPluginAutoupdate['Plugin autoupdate: updated ${e} from ${t.oldVersion} to ${t.newVersion}'] = '\u63d2\u4ef6\u81ea\u52a8\u66f4\u65b0\uff1a\u5df2\u5c06 ${e} \u4ece ${t.oldVersion} \u66f4\u65b0\u5230 ${t.newVersion}'
$hits = Patch-AllChunks -DistDir $ChunksDir -Replacements $chunkPluginAutoupdate
Write-Host "  $chunkPluginAutoupdate -> $hits hits"

# === AddWorkspaceDir ===
$chunkAddWorkspaceDir = New-ReplacementMap
$chunkAddWorkspaceDir['Add directory to workspace'] = '\u5c06\u76ee\u5f55\u6dfb\u52a0\u5230\u5de5\u4f5c\u533a'
$chunkAddWorkspaceDir['Claude Code will be able to read files in this directory and make edits when auto-accept edits is on.'] = 'Claude Code \u5c06\u80fd\u591f\u8bfb\u53d6\u6b64\u76ee\u5f55\u4e2d\u7684\u6587\u4ef6\uff0c\u5e76\u5728\u81ea\u52a8\u63a5\u53d7\u7f16\u8f91\u5f00\u542f\u65f6\u8fdb\u884c\u7f16\u8f91\u3002'
$chunkAddWorkspaceDir['Directory path${r.ellipsis}'] = '\u76ee\u5f55\u8def\u5f84${r.ellipsis}'
$chunkAddWorkspaceDir['Enter the path to the directory:'] = '\u8f93\u5165\u76ee\u5f55\u8def\u5f84\uff1a'
$chunkAddWorkspaceDir['Yes, and remember this directory'] = '\u662f\uff0c\u5e76\u8bb0\u4f4f\u6b64\u76ee\u5f55'
$chunkAddWorkspaceDir['Yes, for this session'] = '\u662f\uff0c\u4ec5\u672c\u6b21\u4f1a\u8bdd'
$hits = Patch-AllChunks -DistDir $ChunksDir -Replacements $chunkAddWorkspaceDir
Write-Host "  $chunkAddWorkspaceDir -> $hits hits"

# === ValidatePlugin ===
$chunkValidatePlugin = New-ReplacementMap
$chunkValidatePlugin['Cannot access path: ${e} (${n??t})'] = '\u65e0\u6cd5\u8bbf\u95ee\u8def\u5f84\uff1a${e} (${n??t})'
$chunkValidatePlugin['Duplicate plugin name "${n.name}" found in marketplace'] = '\u5728 marketplace \u4e2d\u53d1\u73b0\u91cd\u590d\u7684\u63d2\u4ef6\u540d\u79f0 "${n.name}"'
$chunkValidatePlugin['Failed to fetch install counts: ${p(e)}'] = '\u83b7\u53d6\u5b89\u88c5\u8ba1\u6570\u5931\u8d25\uff1a${p(e)}'
$chunkValidatePlugin['Failed to load install counts cache: ${p(e)}'] = '\u52a0\u8f7d\u5b89\u88c5\u8ba1\u6570\u7f13\u5b58\u5931\u8d25\uff1a${p(e)}'
$chunkValidatePlugin['Failed to read file: ${p(e)}'] = '\u8bfb\u53d6\u6587\u4ef6\u5931\u8d25\uff1a${p(e)}'
$chunkValidatePlugin['Failed to read file: ${p(t)}'] = '\u8bfb\u53d6\u6587\u4ef6\u5931\u8d25\uff1a${p(t)}'
$chunkValidatePlugin['Failed to read: ${p(n)}'] = '\u8bfb\u53d6\u5931\u8d25\uff1a${p(n)}'
$chunkValidatePlugin['Fetching install counts from ${U}'] = '\u6b63\u5728\u4ece ${U} \u83b7\u53d6\u5b89\u88c5\u8ba1\u6570'
$chunkValidatePlugin['File not found: ${i}'] = '\u672a\u627e\u5230\u6587\u4ef6\uff1a${i}'
$chunkValidatePlugin['File not found: ${r}'] = '\u672a\u627e\u5230\u6587\u4ef6\uff1a${r}'
$chunkValidatePlugin['File not found: ${t}'] = '\u672a\u627e\u5230\u6587\u4ef6\uff1a${t}'
$chunkValidatePlugin['File path must point to a .json file (marketplace.json), but got: ${e}'] = '\u6587\u4ef6\u8def\u5f84\u5fc5\u987b\u6307\u5411 .json \u6587\u4ef6\uff08marketplace.json\uff09\uff0c\u4f46\u5f97\u5230\uff1a${e}'
$chunkValidatePlugin['Install counts cache has invalid fetchedAt timestamp'] = '\u5b89\u88c5\u8ba1\u6570\u7f13\u5b58\u7684 fetchedAt \u65f6\u95f4\u6233\u65e0\u6548'
$chunkValidatePlugin['Install counts cache has invalid structure'] = '\u5b89\u88c5\u8ba1\u6570\u7f13\u5b58\u7ed3\u6784\u65e0\u6548'
$chunkValidatePlugin['Install counts cache has malformed entries'] = '\u5b89\u88c5\u8ba1\u6570\u7f13\u5b58\u6761\u76ee\u683c\u5f0f\u9519\u8bef'
$chunkValidatePlugin['Install counts cache is stale (>24h old)'] = '\u5b89\u88c5\u8ba1\u6570\u7f13\u5b58\u5df2\u8fc7\u671f\uff08\u8d85\u8fc7 24 \u5c0f\u65f6\uff09'
$chunkValidatePlugin['Install counts cache saved successfully'] = '\u5b89\u88c5\u8ba1\u6570\u7f13\u5b58\u4fdd\u5b58\u6210\u529f'
$chunkValidatePlugin['Invalid response format from install counts API'] = '\u5b89\u88c5\u8ba1\u6570 API \u54cd\u5e94\u683c\u5f0f\u65e0\u6548'
$hits = Patch-AllChunks -DistDir $ChunksDir -Replacements $chunkValidatePlugin
Write-Host "  $chunkValidatePlugin -> $hits hits"

Write-Host "Total chunks: 12" -ForegroundColor Cyan