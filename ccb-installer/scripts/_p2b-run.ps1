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

# === ReplScreen ===
$chunkReplScreen = New-ReplacementMap
$chunkReplScreen['Add notes on this design\u2026'] = '\u4e3a\u8be5\u8bbe\u8ba1\u6dfb\u52a0\u5907\u6ce8\u2026'
$chunkReplScreen['Adding notification for ${n} failed installations'] = '\u6b63\u5728\u4e3a ${n} \u4e2a\u5931\u8d25\u7684\u5b89\u88c5\u6dfb\u52a0\u901a\u77e5'
$chunkReplScreen['Advanced multi-agent plan mode.'] = '\u9ad8\u7ea7\u591a\u4ee3\u7406\u8ba1\u5212\u6a21\u5f0f\u3002'
$chunkReplScreen['Alias definition in the form name=value'] = '\u522b\u540d\u5b9a\u4e49\u683c\u5f0f\uff1aname=value'
$chunkReplScreen['Allow network connection to ${e.host}?'] = '\u662f\u5426\u5141\u8bb8\u8fde\u63a5\u5230 ${e.host}\uff1f'
$chunkReplScreen['Analyze for platform'] = '\u5206\u6790\u76ee\u6807\u5e73\u53f0'
$chunkReplScreen['Analyze for Python version'] = '\u5206\u6790 Python \u7248\u672c'
$chunkReplScreen['API key helper did not return a valid key'] = 'API \u5bc6\u94a5\u52a9\u624b\u672a\u8fd4\u56de\u6709\u6548\u5bc6\u94a5'
$chunkReplScreen['Attempting to auto-install official marketplace'] = '\u6b63\u5728\u5c1d\u8bd5\u81ea\u52a8\u5b89\u88c5\u5b98\u65b9 marketplace'
$chunkReplScreen['Attribution: Failed to save snapshot: ${e}'] = '\u5f52\u56e0\uff1a\u4fdd\u5b58\u5feb\u7167\u5931\u8d25\uff1a${e}'
$chunkReplScreen['Authentication error \u00b7 Try again'] = '\u8ba4\u8bc1\u9519\u8bef \u00b7 \u8bf7\u91cd\u8bd5'
$chunkReplScreen['Auto mode gate check failed'] = '\u81ea\u52a8\u6a21\u5f0f\u95e8\u63a7\u68c0\u67e5\u5931\u8d25'
$chunkReplScreen['Automated permission check failed: ${String(e)}'] = '\u81ea\u52a8\u6743\u9650\u68c0\u67e5\u5931\u8d25\uff1a${String(e)}'
$chunkReplScreen['Auto-refresh failed, falling back to needsRefresh: ${t}'] = '\u81ea\u52a8\u5237\u65b0\u5931\u8d25\uff0c\u56de\u9000\u5230 needsRefresh\uff1a${t}'
$chunkReplScreen['Auto-run ${e} failed: ${Gr(t)}'] = '\u81ea\u52a8\u8fd0\u884c ${e} \u5931\u8d25\uff1a${Gr(t)}'
$chunkReplScreen['Background agent "${n[0]}" was stopped by the user.'] = '\u540e\u53f0\u4ee3\u7406 "${n[0]}" \u5df2\u88ab\u7528\u6237\u505c\u6b62\u3002'
$chunkReplScreen['Bash command (unsandboxed)'] = 'Bash \u547d\u4ee4\uff08\u672a\u6c99\u7bb1\u5316\uff09'
$chunkReplScreen['Can Anthropic look at your session transcript to help us improve Claude Code?'] = '\u662f\u5426\u5141\u8bb8 Anthropic \u67e5\u770b\u60a8\u7684\u4f1a\u8bdd\u8bb0\u5f55\u4ee5\u5e2e\u52a9\u6539\u8fdb Claude Code\uff1f'
$chunkReplScreen['Cannot set permission mode to auto: ${Ty(e)}'] = '\u65e0\u6cd5\u5c06\u6743\u9650\u6a21\u5f0f\u8bbe\u7f6e\u4e3a auto\uff1a${Ty(e)}'
$chunkReplScreen['Cannot set permission mode to auto'] = '\u65e0\u6cd5\u5c06\u6743\u9650\u6a21\u5f0f\u8bbe\u7f6e\u4e3a auto'
$chunkReplScreen['Cannot set permission mode to bypassPermissions because it is disabled by settings or configuration'] = '\u65e0\u6cd5\u5c06\u6743\u9650\u6a21\u5f0f\u8bbe\u7f6e\u4e3a bypassPermissions\uff0c\u56e0\u4e3a\u5df2\u88ab\u8bbe\u7f6e\u6216\u914d\u7f6e\u7981\u7528'
$chunkReplScreen['Cannot set permission mode to bypassPermissions because the session was not launched with --dangerously-skip-permissions'] = '\u65e0\u6cd5\u5c06\u6743\u9650\u6a21\u5f0f\u8bbe\u7f6e\u4e3a bypassPermissions\uff0c\u56e0\u4e3a\u4f1a\u8bdd\u542f\u52a8\u65f6\u672a\u4f7f\u7528 --dangerously-skip-permissions'
$chunkReplScreen['CHANGES_REQUESTED'] = '\u5df2\u8bf7\u6c42\u4fee\u6539'
$chunkReplScreen['Chrome extension not detected \u00b7 https://claude.ai/chrome to install'] = '\u672a\u68c0\u6d4b\u5230 Chrome \u6269\u5c55 \u00b7 \u8bbf\u95ee https://claude.ai/chrome \u5b89\u88c5'
$chunkReplScreen['Claude 3.5 Haiku'] = 'Claude 3.5 Haiku'
$chunkReplScreen['Claude 3.7 Sonnet'] = 'Claude 3.7 Sonnet'
$chunkReplScreen['Claude Code needs your approval for the plan'] = 'Claude Code \u9700\u8981\u60a8\u6279\u51c6\u8be5\u8ba1\u5212'
$chunkReplScreen['Claude Code needs your attention'] = 'Claude Code \u9700\u8981\u60a8\u7684\u5173\u6ce8'
$chunkReplScreen['Claude Code needs your input'] = 'Claude Code \u9700\u8981\u60a8\u7684\u8f93\u5165'
$chunkReplScreen['Claude Code wants to enter plan mode'] = 'Claude Code \u60f3\u8fdb\u5165\u8ba1\u5212\u6a21\u5f0f'
$chunkReplScreen['Claude in Chrome enabled \u00b7 /chrome'] = 'Chrome \u4e2d\u7684 Claude \u5df2\u542f\u7528 \u00b7 /chrome'
$chunkReplScreen['Claude in Chrome requires a claude.ai subscription'] = 'Chrome \u4e2d\u7684 Claude \u9700\u8981 claude.ai \u8ba2\u9605'
$chunkReplScreen['Claude is waiting for your input'] = 'Claude \u6b63\u5728\u7b49\u5f85\u60a8\u7684\u8f93\u5165'
$chunkReplScreen['Claude may use instructions, code, or files from this Skill.'] = 'Claude \u53ef\u4f7f\u7528\u6b64 Skill \u4e2d\u7684\u6307\u4ee4\u3001\u4ee3\u7801\u6216\u6587\u4ef6\u3002'
$chunkReplScreen['Claude needs your permission to use ${t}'] = 'Claude \u9700\u8981\u60a8\u6388\u6743\u4f7f\u7528 ${t}'
$chunkReplScreen['Claude will respond without extended thinking'] = 'Claude \u5c06\u5728\u65e0\u6269\u5c55\u601d\u8003\u7684\u60c5\u51b5\u4e0b\u56de\u5e94'
$chunkReplScreen['Claude will think before responding'] = 'Claude \u5c06\u5728\u56de\u5e94\u524d\u8fdb\u884c\u601d\u8003'
$chunkReplScreen['Clear conversation and start with only the plan'] = '\u6e05\u9664\u5bf9\u8bdd\uff0c\u4ec5\u4ece\u8ba1\u5212\u5f00\u59cb'
$chunkReplScreen['Cloud Authentication'] = '\u4e91\u8ba4\u8bc1'
$chunkReplScreen['Compacting conversation'] = '\u6b63\u5728\u538b\u7f29\u5bf9\u8bdd'
$chunkReplScreen['Compacting conversation\u2026'] = '\u6b63\u5728\u538b\u7f29\u5bf9\u8bdd\u2026'
$chunkReplScreen['Confirm you want to restore '] = '\u786e\u8ba4\u60a8\u8981\u6062\u590d '
$chunkReplScreen['Connect Claude to your IDE \u00b7 /ide'] = '\u5c06 Claude \u8fde\u63a5\u5230\u60a8\u7684 IDE \u00b7 /ide'
$chunkReplScreen['Continue to run and watch for changes'] = '\u7ee7\u7eed\u8fd0\u884c\u5e76\u76d1\u89c6\u66f4\u6539'
$chunkReplScreen['Continue without waiting'] = '\u7ee7\u7eed\uff0c\u4e0d\u7b49\u5f85'
$chunkReplScreen['Conversation compacted'] = '\u5bf9\u8bdd\u5df2\u538b\u7f29'
$chunkReplScreen['Create or list command aliases'] = '\u521b\u5efa\u6216\u5217\u51fa\u547d\u4ee4\u522b\u540d'
$chunkReplScreen['Create skills by adding .md files to .claude/skills/ in your project or ~/.claude/skills/ for skills that work in any project'] = '\u901a\u8fc7\u5411\u9879\u76ee\u4e2d\u7684 .claude/skills/ \u6216 ~/.claude/skills/\uff08\u9002\u7528\u4e8e\u4efb\u4f55\u9879\u76ee\u7684 skills\uff09\u6dfb\u52a0 .md \u6587\u4ef6\u6765\u521b\u5efa skills'
$chunkReplScreen['Create type stub file(s) for import'] = '\u4e3a\u5bfc\u5165\u521b\u5efa\u7c7b\u578b\u5b58\u6839\u6587\u4ef6'
$chunkReplScreen['Ctrl+d to show debug info'] = 'Ctrl+d \u663e\u793a\u8c03\u8bd5\u4fe1\u606f'
$chunkReplScreen['Ctrl-D to hide debug info'] = 'Ctrl-D \u9690\u85cf\u8c03\u8bd5\u4fe1\u606f'
$chunkReplScreen['Delay for a specified amount of time'] = '\u5ef6\u8fdf\u6307\u5b9a\u65f6\u957f'
$chunkReplScreen['Denied via channel ${e.fromServer}'] = '\u901a\u8fc7\u9891\u9053 ${e.fromServer} \u62d2\u7edd'
$chunkReplScreen['Directory that contains virtual environments'] = '\u5305\u542b\u865a\u62df\u73af\u5883\u7684\u76ee\u5f55'
$chunkReplScreen['Disable all LSP recommendations'] = '\u7981\u7528\u6240\u6709 LSP \u5efa\u8bae'
$chunkReplScreen['Disable remote control and launch in Claude Code on the web'] = '\u7981\u7528\u8fdc\u7a0b\u63a7\u5236\u5e76\u5728\u7f51\u9875\u7248 Claude Code \u4e2d\u542f\u52a8'
$chunkReplScreen['Do you want to make this edit to '] = '\u662f\u5426\u8981\u5bf9\u6b64\u8fdb\u884c\u7f16\u8f91\uff1a'
$chunkReplScreen['Do you want to proceed?'] = '\u662f\u5426\u7ee7\u7eed\uff1f'
$chunkReplScreen['Don''t ask me again'] = '\u4e0d\u518d\u8be2\u95ee'
$chunkReplScreen['Don''t implement \u2014 save plan and return'] = '\u4e0d\u5b9e\u73b0 \u2014 \u4fdd\u5b58\u8ba1\u5212\u5e76\u8fd4\u56de'
$chunkReplScreen['Duration to sleep (seconds or with suffix like 5s, 2m, 1h)'] = '\u4f11\u7720\u65f6\u957f\uff08\u79d2\u6216\u5e26\u540e\u7f00\uff0c\u5982 5s\u30012m\u30011h\uff09'
$chunkReplScreen['Duration to wait before timing out (e.g., 10, 5s, 2m)'] = '\u8d85\u65f6\u524d\u7b49\u5f85\u65f6\u957f\uff08\u4f8b\u5982 10\u30015s\u30012m\uff09'
$chunkReplScreen['Effort set to high for this turn'] = '\u672c\u8f6e\u52aa\u529b\u5ea6\u8bbe\u7f6e\u4e3a\u9ad8'
$chunkReplScreen['Emit import dependency information'] = '\u8f93\u51fa\u5bfc\u5165\u4f9d\u8d56\u4fe1\u606f'
$chunkReplScreen['Emit verbose diagnostics'] = '\u8f93\u51fa\u8be6\u7ec6\u8bca\u65ad\u4fe1\u606f'
$chunkReplScreen['Enter to continue \u00b7 '] = '\u6309 Enter \u7ee7\u7eed \u00b7 '
$chunkReplScreen['Enter to select \u00b7 '] = '\u6309 Enter \u9009\u62e9 \u00b7 '
$chunkReplScreen['Enter to select \u00b7'] = '\u6309 Enter \u9009\u62e9 \u00b7'
$chunkReplScreen['Error initiating background plugin installations: ${e}'] = '\u542f\u52a8\u540e\u53f0\u63d2\u4ef6\u5b89\u88c5\u65f6\u51fa\u9519\uff1a${e}'
$hits = Patch-AllChunks -DistDir $ChunksDir -Replacements $chunkReplScreen
Write-Host ("  {0} -> {1} hits" -f "ReplScreen", $hits)

Write-Host "Total chunks: 1" -ForegroundColor Cyan