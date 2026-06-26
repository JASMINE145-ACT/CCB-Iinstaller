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

# === ReplScreen3 ===
$chunkReplScreen3 = New-ReplacementMap
$chunkReplScreen3['Showing marketplace config save failure notification'] = '\u6b63\u5728\u663e\u793a marketplace \u914d\u7f6e\u4fdd\u5b58\u5931\u8d25\u901a\u77e5'
$chunkReplScreen3['Showing marketplace installation failure notification'] = '\u6b63\u5728\u663e\u793a marketplace \u5b89\u88c5\u5931\u8d25\u901a\u77e5'
$chunkReplScreen3['Showing marketplace installation success notification'] = '\u6b63\u5728\u663e\u793a marketplace \u5b89\u88c5\u6210\u529f\u901a\u77e5'
$chunkReplScreen3['Skill "${r.skillName}" updated with improvements.'] = '\u6280\u80fd "${r.skillName}" \u5df2\u6539\u8fdb\u66f4\u65b0\u3002'
$chunkReplScreen3['Skip type analysis of unannotated functions'] = '\u8df3\u8fc7\u672a\u6ce8\u89e3\u51fd\u6570\u7684\u7c7b\u578b\u5206\u6790'
$chunkReplScreen3['Skipping raw transcript read: file too large (${t} bytes)'] = '\u8df3\u8fc7\u539f\u59cb\u8bb0\u5f55\u8bfb\u53d6\uff1a\u6587\u4ef6\u8fc7\u5927\uff08${t} \u5b57\u8282\uff09'
$chunkReplScreen3['SSH connection dropped \u2014 reconnecting (attempt ${e}/${r})...'] = 'SSH \u8fde\u63a5\u65ad\u5f00 \u2014 \u6b63\u5728\u91cd\u8fde\uff08\u7b2c ${e}/${r} \u6b21\u5c1d\u8bd5\uff09...'
$chunkReplScreen3['SSH session failed before connecting.'] = 'SSH \u4f1a\u8bdd\u5728\u8fde\u63a5\u524d\u5931\u8d25\u3002'
$chunkReplScreen3['Started caffeinate to prevent sleep'] = '\u5df2\u542f\u52a8 caffeinate \u9632\u6b62\u4f11\u7720'
$chunkReplScreen3['Starting background plugin installations'] = '\u6b63\u5728\u542f\u52a8\u540e\u53f0\u63d2\u4ef6\u5b89\u88c5'
$chunkReplScreen3['Status line command skipped: workspace trust not accepted'] = '\u5df2\u8df3\u8fc7\u72b6\u6001\u884c\u547d\u4ee4\uff1a\u5de5\u4f5c\u533a\u4fe1\u4efb\u672a\u88ab\u63a5\u53d7'
$chunkReplScreen3['Status line is configured but disableAllHooks is true'] = '\u5df2\u914d\u7f6e\u72b6\u6001\u884c\u4f46 disableAllHooks \u4e3a true'
$chunkReplScreen3['Stopped caffeinate, allowing sleep'] = '\u5df2\u505c\u6b62 caffeinate\uff0c\u5141\u8bb8\u4f11\u7720'
$chunkReplScreen3['Successfully auto-installed official marketplace'] = '\u5df2\u6210\u529f\u81ea\u52a8\u5b89\u88c5\u5b98\u65b9 marketplace'
$chunkReplScreen3['Suggested rules: '] = '\u5efa\u8bae\u89c4\u5219\uff1a'
$chunkReplScreen3['Summarize from here'] = '\u4ece\u8fd9\u91cc\u5f00\u59cb\u6458\u8981'
$chunkReplScreen3['Summarize up to here'] = '\u6458\u8981\u5230\u8fd9\u91cc'
$chunkReplScreen3['Tab/Arrow keys to navigate'] = 'Tab/\u65b9\u5411\u952e\u5bfc\u822a'
$chunkReplScreen3['Teammate ${t.agentId} exited before the scheduled message could be delivered.'] = '\u961f\u53cb ${t.agentId} \u5728\u9884\u5b9a\u6d88\u606f\u9001\u8fbe\u524d\u5df2\u9000\u51fa\u3002'
$chunkReplScreen3['Tell Claude what to change'] = '\u544a\u8bc9 Claude \u9700\u8981\u4fee\u6539\u4ec0\u4e48'
$chunkReplScreen3['That message is no longer in the active context (snipped or pre-compact). Choose a more recent message.'] = '\u8be5\u6d88\u606f\u5df2\u4e0d\u5728\u6d3b\u8dc3\u4e0a\u4e0b\u6587\u4e2d\uff08\u5df2\u88c1\u526a\u6216\u538b\u7f29\u524d\uff09\u3002\u8bf7\u9009\u62e9\u66f4\u8fd1\u7684\u6d88\u606f\u3002'
$chunkReplScreen3['The code has not changed (nothing will be restored).'] = '\u4ee3\u7801\u672a\u66f4\u6539\uff08\u5c06\u4e0d\u4f1a\u6062\u590d\u4efb\u4f55\u5185\u5bb9\uff09\u3002'
$chunkReplScreen3['The code will be restored '] = '\u4ee3\u7801\u5c06\u88ab\u6062\u590d '
$chunkReplScreen3['The code will be unchanged.'] = '\u4ee3\u7801\u5c06\u4fdd\u6301\u4e0d\u53d8\u3002'
$chunkReplScreen3['The conversation will be forked.'] = '\u5bf9\u8bdd\u5c06\u88ab\u5206\u53c9\u3002'
$chunkReplScreen3['The conversation will be unchanged.'] = '\u5bf9\u8bdd\u5c06\u4fdd\u6301\u4e0d\u53d8\u3002'
$chunkReplScreen3['The terminal is unfocused \u2014 the user is not actively watching.'] = '\u7ec8\u7aef\u672a\u83b7\u5f97\u7126\u70b9 \u2014 \u7528\u6237\u5e76\u672a\u4e3b\u52a8\u67e5\u770b\u3002'
$chunkReplScreen3['The user approved this plan in the remote session. Give them a brief summary, then start implementing.'] = '\u7528\u6237\u5df2\u5728\u8fdc\u7a0b\u4f1a\u8bdd\u4e2d\u6279\u51c6\u6b64\u8ba1\u5212\u3002\u7ed9\u51fa\u7b80\u8981\u6458\u8981\uff0c\u7136\u540e\u5f00\u59cb\u5b9e\u73b0\u3002'
$chunkReplScreen3['This field is required'] = '\u6b64\u5b57\u6bb5\u4e3a\u5fc5\u586b\u9879'
$chunkReplScreen3['This prompt will launch an ultraplan session in Claude Code on the web'] = '\u6b64\u63d0\u793a\u5c06\u5728\u7f51\u9875\u7248 Claude Code \u4e2d\u542f\u52a8 ultraplan \u4f1a\u8bdd'
$chunkReplScreen3['This will disable Remote Control for this session.'] = '\u8fd9\u5c06\u7981\u7528\u672c\u6b21\u4f1a\u8bdd\u7684\u8fdc\u7a0b\u63a7\u5236\u3002'
$chunkReplScreen3['This will modify ${a} (outside working directory) via a symlink'] = '\u8fd9\u5c06\u901a\u8fc7\u7b26\u53f7\u94fe\u63a5\u4fee\u6539 ${a}\uff08\u5728\u5de5\u4f5c\u76ee\u5f55\u4e4b\u5916\uff09'
$chunkReplScreen3['This will modify ${g} (outside working directory) via a symlink'] = '\u8fd9\u5c06\u901a\u8fc7\u7b26\u53f7\u94fe\u63a5\u4fee\u6539 ${g}\uff08\u5728\u5de5\u4f5c\u76ee\u5f55\u4e4b\u5916\uff09'
$chunkReplScreen3['Tool ${e.tool_name} running for ${e.elapsed_time_seconds}s\u2026'] = '\u5de5\u5177 ${e.tool_name} \u5df2\u8fd0\u884c ${e.elapsed_time_seconds} \u79d2\u2026'
$chunkReplScreen3['Transcript shared successfully'] = '\u8bb0\u5f55\u5206\u4eab\u6210\u529f'
$chunkReplScreen3['Trust not accepted for current directory - skipping plugin installations'] = '\u5f53\u524d\u76ee\u5f55\u7684\u4fe1\u4efb\u672a\u88ab\u63a5\u53d7 - \u8df3\u8fc7\u63d2\u4ef6\u5b89\u88c5'
$chunkReplScreen3['Try Claude Code Desktop'] = '\u8bd5\u8bd5 Claude Code \u684c\u9762\u7248'
$chunkReplScreen3['Try setting environment variable COLORTERM=truecolor for richer colors'] = '\u5c1d\u8bd5\u8bbe\u7f6e\u73af\u5883\u53d8\u91cf COLORTERM=truecolor \u4ee5\u83b7\u5f97\u66f4\u4e30\u5bcc\u7684\u989c\u8272'
$chunkReplScreen3['Type checker for Python'] = 'Python \u7c7b\u578b\u68c0\u67e5\u5668'
$chunkReplScreen3['Ultraplan approved in browser. Here is the plan:'] = 'Ultraplan \u5df2\u5728\u6d4f\u89c8\u5668\u4e2d\u6279\u51c6\u3002\u8ba1\u5212\u5982\u4e0b\uff1a'
$chunkReplScreen3['Ultraplan approved'] = 'Ultraplan \u5df2\u6279\u51c6'
$hits = Patch-AllChunks -DistDir $ChunksDir -Replacements $chunkReplScreen3
Write-Host ("  {0} -> {1} hits" -f "ReplScreen3", $hits)

# === LoadAgentsDir2 ===
$chunkLoadAgentsDir2 = New-ReplacementMap
$chunkLoadAgentsDir2['Allowed by config rule: ${t}:${e}'] = '\u5df2\u7531\u914d\u7f6e\u89c4\u5219\u5141\u8bb8\uff1a${t}:${e}'
$chunkLoadAgentsDir2['Allowed by fast classifier'] = '\u5df2\u7531\u5feb\u901f\u5206\u7c7b\u5668\u5141\u8bb8'
$chunkLoadAgentsDir2['Almost done! Enable the Python API in iTerm2:'] = '\u5feb\u5b8c\u6210\u4e86\uff01\u5728 iTerm2 \u4e2d\u542f\u7528 Python API\uff1a'
$chunkLoadAgentsDir2['Already in a worktree session'] = '\u5df2\u5728 worktree \u4f1a\u8bdd\u4e2d'
$chunkLoadAgentsDir2['Always quote file paths that contain spaces with double quotes in your command (e.g., cd "path with spaces/file.txt")'] = '\u5728\u547d\u4ee4\u4e2d\u59cb\u7ec8\u7528\u53cc\u5f15\u53f7\u5f15\u7528\u5305\u542b\u7a7a\u683c\u7684\u6587\u4ef6\u8def\u5f84\uff08\u4f8b\u5982 cd "path with spaces/file.txt"\uff09'
$chunkLoadAgentsDir2['Amazon Bedrock, Microsoft Foundry, or Vertex AI'] = 'Amazon Bedrock\u3001Microsoft Foundry \u6216 Vertex AI'
$chunkLoadAgentsDir2['An image in the conversation exceeds the dimension limit for many-image requests (2000px). Run /compact to remove old images from context, or start a new session.'] = '\u5bf9\u8bdd\u4e2d\u7684\u56fe\u50cf\u8d85\u8fc7\u591a\u56fe\u50cf\u8bf7\u6c42\u7684\u5c3a\u5bf8\u9650\u5236\uff082000px\uff09\u3002\u8fd0\u884c /compact \u4ece\u4e0a\u4e0b\u6587\u4e2d\u79fb\u9664\u65e7\u56fe\u50cf\uff0c\u6216\u5f00\u59cb\u65b0\u4f1a\u8bdd\u3002'
$chunkLoadAgentsDir2['An image in the conversation exceeds the dimension limit for many-image requests (2000px). Start a new session with fewer images.'] = '\u5bf9\u8bdd\u4e2d\u7684\u56fe\u50cf\u8d85\u8fc7\u591a\u56fe\u50cf\u8bf7\u6c42\u7684\u5c3a\u5bf8\u9650\u5236\uff082000px\uff09\u3002\u8bf7\u7528\u66f4\u5c11\u7684\u56fe\u50cf\u5f00\u59cb\u65b0\u4f1a\u8bdd\u3002'
$chunkLoadAgentsDir2['An invalid or illegal string was specified'] = '\u6307\u5b9a\u4e86\u65e0\u6548\u6216\u975e\u6cd5\u7684\u5b57\u7b26\u4e32'
$chunkLoadAgentsDir2['Anchor cannot be an empty string'] = '\u951a\u70b9\u4e0d\u80fd\u4e3a\u7a7a\u5b57\u7b26\u4e32'
$chunkLoadAgentsDir2['Anchor ending in : is ambiguous'] = '\u4ee5 : \u7ed3\u5c3e\u7684\u951a\u70b9\u6709\u6b67\u4e49'
$chunkLoadAgentsDir2['Anchor must not contain whitespace or control characters: ${JSON.stringify(e)}'] = '\u951a\u70b9\u4e0d\u80fd\u5305\u542b\u7a7a\u767d\u6216\u63a7\u5236\u5b57\u7b26\uff1a${JSON.stringify(e)}'
$chunkLoadAgentsDir2['Anchors and tags must be after the ${i.source} indicator'] = '\u951a\u70b9\u548c\u6807\u7b7e\u5fc5\u987b\u5728 ${i.source} \u6307\u793a\u7b26\u4e4b\u540e'
$chunkLoadAgentsDir2['Another process already refreshed tokens (expires in ${Math.floor(t)}s)'] = '\u53e6\u4e00\u4e2a\u8fdb\u7a0b\u5df2\u5237\u65b0\u4ee4\u724c\uff08${Math.floor(t)} \u79d2\u540e\u8fc7\u671f\uff09'
$chunkLoadAgentsDir2['Another process refreshed tokens, using those'] = '\u53e6\u4e00\u4e2a\u8fdb\u7a0b\u5df2\u5237\u65b0\u4ee4\u724c\uff0c\u6b63\u5728\u4f7f\u7528'
$chunkLoadAgentsDir2['Answer questions?'] = '\u56de\u7b54\u95ee\u9898\uff1f'
$chunkLoadAgentsDir2['Anthropic base URL'] = 'Anthropic \u57fa\u7840 URL'
$chunkLoadAgentsDir2['Anthropic Compatible Setup'] = 'Anthropic \u517c\u5bb9\u8bbe\u7f6e'
$chunkLoadAgentsDir2['Anthropic''s agentic coding tool'] = 'Anthropic \u7684\u4ee3\u7406\u5f0f\u7f16\u7801\u5de5\u5177'
$chunkLoadAgentsDir2['API error (attempt ${l}/${r+1}): ${e instanceof S?'] = 'API \u9519\u8bef\uff08\u7b2c ${l}/${r+1} \u6b21\u5c1d\u8bd5\uff09\uff1a${e instanceof S?'
$chunkLoadAgentsDir2['API error x-client-request-id=${c} (give this to the API team for server-log lookup)'] = 'API \u9519\u8bef x-client-request-id=${c}\uff08\u63d0\u4f9b\u7ed9 API \u56e2\u961f\u7528\u4e8e\u670d\u52a1\u5668\u65e5\u5fd7\u67e5\u8be2\uff09'
$chunkLoadAgentsDir2['API error: ${e.message}'] = 'API \u9519\u8bef\uff1a${e.message}'
$chunkLoadAgentsDir2['API Error: 400 due to tool use concurrency issues.'] = 'API \u9519\u8bef\uff1a400\uff0c\u7531\u4e8e\u5de5\u5177\u4f7f\u7528\u5e76\u53d1\u95ee\u9898\u3002'
$chunkLoadAgentsDir2['API Error: 400 duplicate tool_use ID in conversation history.'] = 'API \u9519\u8bef\uff1a400\uff0c\u5bf9\u8bdd\u5386\u53f2\u4e2d\u5b58\u5728\u91cd\u590d\u7684 tool_use ID\u3002'
$chunkLoadAgentsDir2['API Error: Request was aborted.'] = 'API \u9519\u8bef\uff1a\u8bf7\u6c42\u5df2\u4e2d\u6b62\u3002'
$chunkLoadAgentsDir2['API provider cleared (will use environment variables).'] = 'API \u63d0\u4f9b\u5546\u5df2\u6e05\u9664\uff08\u5c06\u4f7f\u7528\u73af\u5883\u53d8\u91cf\uff09\u3002'
$chunkLoadAgentsDir2['API provider set to ${n} (via environment variable).'] = 'API \u63d0\u4f9b\u5546\u5df2\u8bbe\u7f6e\u4e3a ${n}\uff08\u901a\u8fc7\u73af\u5883\u53d8\u91cf\uff09\u3002'
$chunkLoadAgentsDir2['API provider set to ${n}.'] = 'API \u63d0\u4f9b\u5546\u5df2\u8bbe\u7f6e\u4e3a ${n}\u3002'
$chunkLoadAgentsDir2['API usage billing'] = 'API \u7528\u91cf\u8ba1\u8d39'
$chunkLoadAgentsDir2['Application Support'] = 'Application Support'
$chunkLoadAgentsDir2['Applied original permissions to temp file'] = '\u5df2\u5c06\u539f\u59cb\u6743\u9650\u5e94\u7528\u5230\u4e34\u65f6\u6587\u4ef6'
$chunkLoadAgentsDir2['Applied queued notification handler for ${e}.${t}'] = '\u5df2\u5e94\u7528\u6392\u961f\u7684\u901a\u77e5\u5904\u7406\u5668 ${e}.${t}'
$chunkLoadAgentsDir2['Applied queued request handler for ${e}.${t}'] = '\u5df2\u5e94\u7528\u6392\u961f\u7684\u8bf7\u6c42\u5904\u7406\u5668 ${e}.${t}'
$chunkLoadAgentsDir2['Applying mask function failed due to error, fully masking property. Error: ${e}'] = '\u5e94\u7528\u63a9\u7801\u51fd\u6570\u56e0\u9519\u8bef\u5931\u8d25\uff0c\u5c06\u5b8c\u5168\u63a9\u7801\u5c5e\u6027\u3002\u9519\u8bef\uff1a${e}'
$chunkLoadAgentsDir2['Applying permission update: Setting mode to ''${t.mode}'''] = '\u6b63\u5728\u5e94\u7528\u6743\u9650\u66f4\u65b0\uff1a\u5c06\u6a21\u5f0f\u8bbe\u7f6e\u4e3a ''${t.mode}'''
$hits = Patch-AllChunks -DistDir $ChunksDir -Replacements $chunkLoadAgentsDir2
Write-Host ("  {0} -> {1} hits" -f "LoadAgentsDir2", $hits)

Write-Host "Total chunks: 2" -ForegroundColor Cyan