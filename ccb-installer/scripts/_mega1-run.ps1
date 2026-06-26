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

# === ReplScreen2 ===
$chunkReplScreen2 = New-ReplacementMap
$chunkReplScreen2['Message not found.'] = '\u672a\u627e\u5230\u6d88\u606f\u3002'
$chunkReplScreen2['Messages after this point will be summarized.'] = '\u6b64\u70b9\u4e4b\u540e\u7684\u6d88\u606f\u5c06\u88ab\u6458\u8981\u3002'
$chunkReplScreen2['Minimum diagnostic level'] = '\u6700\u5c0f\u8bca\u65ad\u7ea7\u522b'
$chunkReplScreen2['Model set to ${an(e)}'] = '\u6a21\u578b\u5df2\u8bbe\u7f6e\u4e3a ${an(e)}'
$chunkReplScreen2['Model updated to Opus 4.7'] = '\u6a21\u578b\u5df2\u66f4\u65b0\u5230 Opus 4.7'
$chunkReplScreen2['Model updated to Opus 4.7 \u00b7 Set CLAUDE_CODE_DISABLE_LEGACY_MODEL_REMAP=1 to opt out'] = '\u6a21\u578b\u5df2\u66f4\u65b0\u5230 Opus 4.7 \u00b7 \u8bbe\u7f6e CLAUDE_CODE_DISABLE_LEGACY_MODEL_REMAP=1 \u53ef\u9000\u51fa'
$chunkReplScreen2['Model updated to Sonnet 4.6'] = '\u6a21\u578b\u5df2\u66f4\u65b0\u5230 Sonnet 4.6'
$chunkReplScreen2['Must be a valid date, e.g. 2024-03-15, today, next Monday'] = '\u5fc5\u987b\u662f\u6709\u6548\u65e5\u671f\uff0c\u4f8b\u5982 2024-03-15\u3001\u4eca\u5929\u3001\u4e0b\u5468\u4e00'
$chunkReplScreen2['Must be a valid date-time, e.g. 2024-03-15T14:30:00Z, tomorrow at 3pm'] = '\u5fc5\u987b\u662f\u6709\u6548\u7684\u65e5\u671f\u65f6\u95f4\uff0c\u4f8b\u5982 2024-03-15T14:30:00Z\u3001\u660e\u5929\u4e0b\u5348 3 \u70b9'
$chunkReplScreen2['Must be a valid email address, e.g. user@example.com'] = '\u5fc5\u987b\u662f\u6709\u6548\u7684\u7535\u5b50\u90ae\u4ef6\u5730\u5740\uff0c\u4f8b\u5982 user@example.com'
$chunkReplScreen2['Must be a valid URI, e.g. https://example.com'] = '\u5fc5\u987b\u662f\u6709\u6548\u7684 URI\uff0c\u4f8b\u5982 https://example.com'
$chunkReplScreen2['Network request outside of sandbox'] = '\u6c99\u7bb1\u5916\u7684\u7f51\u7edc\u8bf7\u6c42'
$chunkReplScreen2['No CLAUDE.md/rules files found'] = '\u672a\u627e\u5230 CLAUDE.md/\u89c4\u5219\u6587\u4ef6'
$chunkReplScreen2['No decision reason'] = '\u65e0\u51b3\u7b56\u539f\u56e0'
$chunkReplScreen2['No feedback provided'] = '\u672a\u63d0\u4f9b\u53cd\u9988'
$chunkReplScreen2['No image found in clipboard. Use ${e} to paste images.'] = '\u526a\u8d34\u677f\u4e2d\u672a\u627e\u5230\u56fe\u50cf\u3002\u4f7f\u7528 ${e} \u7c98\u8d34\u56fe\u50cf\u3002'
$chunkReplScreen2['No image found in clipboard. You''re SSH''d; try scp?'] = '\u526a\u8d34\u677f\u4e2d\u672a\u627e\u5230\u56fe\u50cf\u3002\u60a8\u5728 SSH \u4e2d\uff1b\u8bd5\u8bd5 scp\uff1f'
$chunkReplScreen2['No installation status to monitor'] = '\u65e0\u5b89\u88c5\u72b6\u6001\u53ef\u76d1\u89c6'
$chunkReplScreen2['No plan found. Please write your plan to the plan file first.'] = '\u672a\u627e\u5230\u8ba1\u5212\u3002\u8bf7\u5148\u5199\u5165\u8ba1\u5212\u6587\u4ef6\u3002'
$chunkReplScreen2['No preview available'] = '\u65e0\u9884\u89c8\u53ef\u7528'
$chunkReplScreen2['No, and don''t show plugin installation hints again'] = '\u5426\uff0c\u4e14\u4e0d\u518d\u663e\u793a\u63d2\u4ef6\u5b89\u88c5\u63d0\u793a'
$chunkReplScreen2['No, and tell Claude what to do differently '] = '\u5426\uff0c\u5e76\u544a\u8bc9 Claude \u5e94\u8be5\u5982\u4f55\u4e0d\u540c\u5730\u64cd\u4f5c '
$chunkReplScreen2['No, refine with Ultraplan on Claude Code on the web'] = '\u5426\uff0c\u5728\u7f51\u9875\u7248 Claude Code \u4e0a\u7528 Ultraplan \u6539\u8fdb'
$chunkReplScreen2['Not logged in \u00b7 Run /login'] = '\u672a\u767b\u5f55 \u00b7 \u8fd0\u884c /login'
$chunkReplScreen2['Note: may clear a disk'] = '\u6ce8\u610f\uff1a\u53ef\u80fd\u6e05\u9664\u78c1\u76d8'
$chunkReplScreen2['Note: may clear content of multiple files'] = '\u6ce8\u610f\uff1a\u53ef\u80fd\u6e05\u9664\u591a\u4e2a\u6587\u4ef6\u7684\u5185\u5bb9'
$chunkReplScreen2['Note: may delete all rows from a database table'] = '\u6ce8\u610f\uff1a\u53ef\u80fd\u5220\u9664\u6570\u636e\u5e93\u8868\u4e2d\u7684\u6240\u6709\u884c'
$chunkReplScreen2['Note: may delete Kubernetes resources'] = '\u6ce8\u610f\uff1a\u53ef\u80fd\u5220\u9664 Kubernetes \u8d44\u6e90'
$chunkReplScreen2['Note: may destroy Terraform infrastructure'] = '\u6ce8\u610f\uff1a\u53ef\u80fd\u9500\u6bc1 Terraform \u57fa\u7840\u8bbe\u65bd'
$chunkReplScreen2['Note: may discard all working tree changes'] = '\u6ce8\u610f\uff1a\u53ef\u80fd\u4e22\u5f03\u5de5\u4f5c\u6811\u7684\u6240\u6709\u66f4\u6539'
$chunkReplScreen2['Note: may discard uncommitted changes'] = '\u6ce8\u610f\uff1a\u53ef\u80fd\u4e22\u5f03\u672a\u63d0\u4ea4\u7684\u66f4\u6539'
$chunkReplScreen2['Note: may drop or truncate database objects'] = '\u6ce8\u610f\uff1a\u53ef\u80fd\u5220\u9664\u6216\u622a\u65ad\u6570\u636e\u5e93\u5bf9\u8c61'
$chunkReplScreen2['Note: may force-delete a branch'] = '\u6ce8\u610f\uff1a\u53ef\u80fd\u5f3a\u5236\u5220\u9664\u5206\u652f'
$chunkReplScreen2['Note: may force-remove files'] = '\u6ce8\u610f\uff1a\u53ef\u80fd\u5f3a\u5236\u5220\u9664\u6587\u4ef6'
$chunkReplScreen2['Note: may format a disk volume'] = '\u6ce8\u610f\uff1a\u53ef\u80fd\u683c\u5f0f\u5316\u78c1\u76d8\u5377'
$chunkReplScreen2['Note: may overwrite remote history'] = '\u6ce8\u610f\uff1a\u53ef\u80fd\u8986\u76d6\u8fdc\u7a0b\u5386\u53f2'
$chunkReplScreen2['Note: may permanently delete untracked files'] = '\u6ce8\u610f\uff1a\u53ef\u80fd\u6c38\u4e45\u5220\u9664\u672a\u8ddf\u8e2a\u7684\u6587\u4ef6'
$chunkReplScreen2['Note: may permanently remove stashed changes'] = '\u6ce8\u610f\uff1a\u53ef\u80fd\u6c38\u4e45\u79fb\u9664\u6682\u5b58\u66f4\u6539'
$chunkReplScreen2['Note: may recursively force-remove files'] = '\u6ce8\u610f\uff1a\u53ef\u80fd\u9012\u5f52\u5f3a\u5236\u5220\u9664\u6587\u4ef6'
$chunkReplScreen2['Note: may recursively remove files'] = '\u6ce8\u610f\uff1a\u53ef\u80fd\u9012\u5f52\u5220\u9664\u6587\u4ef6'
$chunkReplScreen2['Note: may rewrite the last commit'] = '\u6ce8\u610f\uff1a\u53ef\u80fd\u91cd\u5199\u4e0a\u4e00\u6b21\u63d0\u4ea4'
$chunkReplScreen2['Note: may skip safety hooks'] = '\u6ce8\u610f\uff1a\u53ef\u80fd\u8df3\u8fc7\u5b89\u5168\u94a9\u5b50'
$chunkReplScreen2['Note: permanently deletes recycled files'] = '\u6ce8\u610f\uff1a\u6c38\u4e45\u5220\u9664\u56de\u6536\u7ad9\u4e2d\u7684\u6587\u4ef6'
$chunkReplScreen2['Note: will restart the computer'] = '\u6ce8\u610f\uff1a\u5c06\u91cd\u542f\u8ba1\u7b97\u673a'
$chunkReplScreen2['Note: will shut down the computer'] = '\u6ce8\u610f\uff1a\u5c06\u5173\u95ed\u8ba1\u7b97\u673a'
$chunkReplScreen2['Number of nodes to allocate'] = '\u8981\u5206\u914d\u7684\u8282\u70b9\u6570'
$chunkReplScreen2['Number of tasks to run'] = '\u8981\u8fd0\u884c\u7684\u4efb\u52a1\u6570'
$chunkReplScreen2['Official marketplace ''${sc}'' already installed, skipping'] = '\u5b98\u65b9 marketplace ''${sc}'' \u5df2\u5b89\u88c5\uff0c\u8df3\u8fc7'
$chunkReplScreen2['Official marketplace auto-install disabled via env var, skipping'] = '\u5b98\u65b9 marketplace \u81ea\u52a8\u5b89\u88c5\u5df2\u901a\u8fc7\u73af\u5883\u53d8\u91cf\u7981\u7528\uff0c\u8df3\u8fc7'
$chunkReplScreen2['Official marketplace auto-install skipped: ${t}'] = '\u5b98\u65b9 marketplace \u81ea\u52a8\u5b89\u88c5\u5df2\u8df3\u8fc7\uff1a${t}'
$chunkReplScreen2['Official marketplace auto-install: git is a non-functional macOS xcrun shim, treating as git_unavailable'] = '\u5b98\u65b9 marketplace \u81ea\u52a8\u5b89\u88c5\uff1agit \u662f macOS \u4e0a\u4e0d\u6b63\u5e38\u7684 xcrun shim\uff0c\u6309 git \u4e0d\u53ef\u7528\u5904\u7406'
$chunkReplScreen2['Official marketplace blocked by enterprise policy, skipping'] = '\u5b98\u65b9 marketplace \u88ab\u4f01\u4e1a\u7b56\u7565\u963b\u6b62\uff0c\u8df3\u8fc7'
$chunkReplScreen2['Official marketplace GCS failed; git fallback disabled by flag \u2014 skipping install'] = '\u5b98\u65b9 marketplace GCS \u5931\u8d25\uff1bgit \u56de\u9000\u5df2\u88ab\u6807\u5fd7\u7981\u7528 \u2014 \u8df3\u8fc7\u5b89\u88c5'
$chunkReplScreen2['Open in Claude Code Desktop'] = '\u5728 Claude Code \u684c\u9762\u7248\u4e2d\u6253\u5f00'
$chunkReplScreen2['Opened changes in '] = '\u5df2\u5728\u4ee5\u4e0b\u4f4d\u7f6e\u6253\u5f00\u66f4\u6539\uff1a'
$chunkReplScreen2['Other: ${e.reason}'] = '\u5176\u4ed6\uff1a${e.reason}'
$chunkReplScreen2['Output results in JSON format'] = '\u4ee5 JSON \u683c\u5f0f\u8f93\u51fa\u7ed3\u679c'
$chunkReplScreen2['Paste images into Claude Code using control+v (not cmd+v!)'] = '\u4f7f\u7528 control+v\uff08\u4e0d\u662f cmd+v\uff01\uff09\u5c06\u56fe\u50cf\u7c98\u8d34\u5230 Claude Code'
$chunkReplScreen2['Path to the Python interpreter'] = 'Python \u89e3\u91ca\u5668\u8def\u5f84'
$chunkReplScreen2['Pattern did not match any content'] = '\u6a21\u5f0f\u672a\u5339\u914d\u4efb\u4f55\u5185\u5bb9'
$chunkReplScreen2['Permission denied by hook'] = '\u94a9\u5b50\u62d2\u7edd\u6743\u9650'
$chunkReplScreen2['Permission explainer error: ${Gr(t)}'] = '\u6743\u9650\u89e3\u91ca\u5668\u9519\u8bef\uff1a${Gr(t)}'
$chunkReplScreen2['Permission explainer: ${n.riskLevel} risk for ${e} (${u}ms)'] = '\u6743\u9650\u89e3\u91ca\u5668\uff1a${e} \u98ce\u9669\u7b49\u7ea7 ${n.riskLevel}\uff08${u}ms\uff09'
$chunkReplScreen2['Permission explainer: API returned in ${u}ms, stop_reason=${l.stop_reason}'] = '\u6743\u9650\u89e3\u91ca\u5668\uff1aAPI \u5728 ${u}ms \u8fd4\u56de\uff0cstop_reason=${l.stop_reason}'
$chunkReplScreen2['Permission explainer: no parsed output in response'] = '\u6743\u9650\u89e3\u91ca\u5668\uff1a\u54cd\u5e94\u4e2d\u65e0\u89e3\u6790\u8f93\u51fa'
$chunkReplScreen2['Permission explainer: request aborted for ${e}'] = '\u6743\u9650\u89e3\u91ca\u5668\uff1a${e} \u7684\u8bf7\u6c42\u5df2\u4e2d\u6b62'
$chunkReplScreen2['Permission explainer: tool input: ${qr(d.input).slice(0,500)}'] = '\u6743\u9650\u89e3\u91ca\u5668\uff1a\u5de5\u5177\u8f93\u5165\uff1a${qr(d.input).slice(0,500)}'
$chunkReplScreen2['Permission request sent to team '] = '\u6743\u9650\u8bf7\u6c42\u5df2\u53d1\u9001\u7ed9\u56e2\u961f '
$chunkReplScreen2['Permission request was aborted locally in sub.'] = '\u6743\u9650\u8bf7\u6c42\u5df2\u5728\u5b50\u4f1a\u8bdd\u4e2d\u672c\u5730\u4e2d\u6b62\u3002'
$chunkReplScreen2['Permission request was approved locally in sub.'] = '\u6743\u9650\u8bf7\u6c42\u5df2\u5728\u5b50\u4f1a\u8bdd\u4e2d\u672c\u5730\u6279\u51c6\u3002'
$chunkReplScreen2['Permission request was rejected locally in sub.'] = '\u6743\u9650\u8bf7\u6c42\u5df2\u5728\u5b50\u4f1a\u8bdd\u4e2d\u672c\u5730\u62d2\u7edd\u3002'
$chunkReplScreen2['Permission request was resolved by bridge before pipe response.'] = '\u6743\u9650\u8bf7\u6c42\u5df2\u5728\u7ba1\u9053\u54cd\u5e94\u524d\u7531 bridge \u89e3\u51b3\u3002'
$chunkReplScreen2['Permission request was resolved by channel before pipe response.'] = '\u6743\u9650\u8bf7\u6c42\u5df2\u5728\u7ba1\u9053\u54cd\u5e94\u524d\u7531\u9891\u9053\u89e3\u51b3\u3002'
$hits = Patch-AllChunks -DistDir $ChunksDir -Replacements $chunkReplScreen2
Write-Host ("  {0} -> {1} hits" -f "ReplScreen2", $hits)

# === LoadAgentsDir1 ===
$chunkLoadAgentsDir1 = New-ReplacementMap
$chunkLoadAgentsDir1['A 5-10 word summary shown as a preview in the UI (required when message is a string)'] = '5-10 \u5b57\u6458\u8981\uff0c\u4f5c\u4e3a\u9884\u89c8\u663e\u793a\u5728 UI \u4e2d\uff08\u5f53 message \u4e3a\u5b57\u7b26\u4e32\u65f6\u5fc5\u586b\uff09'
$chunkLoadAgentsDir1['A block sequence may not be used as an implicit map key'] = '\u5757\u5e8f\u5217\u4e0d\u80fd\u7528\u4f5c\u9690\u5f0f\u6620\u5c04\u952e'
$chunkLoadAgentsDir1['A brief title for the task'] = '\u4efb\u52a1\u7684\u7b80\u77ed\u6807\u9898'
$chunkLoadAgentsDir1['A document argument is required'] = '\u9700\u8981 document \u53c2\u6570'
$chunkLoadAgentsDir1['A draft learned skill candidate was created: ${e.gap.draftName} (${e.gap.draftPath}).'] = '\u5df2\u521b\u5efa\u8349\u7a3f\u5b66\u4e60\u6280\u80fd\u5019\u9009\uff1a${e.gap.draftName}\uff08${e.gap.draftPath}\uff09\u3002'
$chunkLoadAgentsDir1['A learned skill was promoted for future turns: ${e.gap.activeName} (${e.gap.activePath}).'] = '\u5df2\u4e3a\u672a\u6765\u56de\u5408\u63d0\u5347\u5b66\u4e60\u6280\u80fd\uff1a${e.gap.activeName}\uff08${e.gap.activePath}\uff09\u3002'
$chunkLoadAgentsDir1['A memory that names a specific function, file, or flag is a claim that it existed *when the memory was written*. It may have been renamed, removed, or never merged. Before recommending it:'] = '\u547d\u540d\u7279\u5b9a\u51fd\u6570\u3001\u6587\u4ef6\u6216\u6807\u5fd7\u7684\u8bb0\u5fc6\u662f\u5173\u4e8e\u8be5\u8bb0\u5fc6\u5199\u5165\u65f6\u5b83\u5b58\u5728\u7684\u58f0\u660e\u3002\u5b83\u53ef\u80fd\u5df2\u88ab\u91cd\u547d\u540d\u3001\u79fb\u9664\u6216\u4ece\u672a\u5408\u5e76\u3002\u5728\u63a8\u8350\u4e4b\u524d\uff1a'
$chunkLoadAgentsDir1['A node can have at most one anchor'] = '\u4e00\u4e2a\u8282\u70b9\u6700\u591a\u53ea\u80fd\u6709\u4e00\u4e2a\u951a\u70b9'
$chunkLoadAgentsDir1['A node can have at most one tag'] = '\u4e00\u4e2a\u8282\u70b9\u6700\u591a\u53ea\u80fd\u6709\u4e00\u4e2a\u6807\u7b7e'
$chunkLoadAgentsDir1['A plan file already exists at ${e.planFilePath}. You can read it and make incremental edits using the ${KB.name} tool if you need to.'] = '\u8ba1\u5212\u6587\u4ef6\u5df2\u5b58\u5728\u4e8e ${e.planFilePath}\u3002\u5982\u9700\u8981\uff0c\u60a8\u53ef\u4ee5\u8bfb\u53d6\u5b83\u5e76\u4f7f\u7528 ${KB.name} \u5de5\u5177\u8fdb\u884c\u589e\u91cf\u7f16\u8f91\u3002'
$chunkLoadAgentsDir1['A short (3-5 word) description of the task'] = '\u4efb\u52a1\u7684\u7b80\u77ed\uff083-5 \u5b57\uff09\u63cf\u8ff0'
$chunkLoadAgentsDir1['A short description of the search result'] = '\u641c\u7d22\u7ed3\u679c\u7684\u7b80\u77ed\u63cf\u8ff0'
$chunkLoadAgentsDir1['A specific command just failed and you see evidence of sandbox restrictions causing the failure. Note that commands can fail for many reasons unrelated to the sandbox (missing files, wrong arguments, network issues, etc.).'] = '\u7279\u5b9a\u547d\u4ee4\u521a\u5931\u8d25\uff0c\u60a8\u770b\u5230\u6c99\u7bb1\u9650\u5236\u5bfc\u81f4\u5931\u8d25\u7684\u8bc1\u636e\u3002\u8bf7\u6ce8\u610f\uff0c\u547d\u4ee4\u53ef\u80fd\u56e0\u8bb8\u591a\u4e0e\u6c99\u7bb1\u65e0\u5173\u7684\u539f\u56e0\u5931\u8d25\uff08\u7f3a\u5c11\u6587\u4ef6\u3001\u53c2\u6570\u9519\u8bef\u3001\u7f51\u7edc\u95ee\u9898\u7b49\uff09\u3002'
$chunkLoadAgentsDir1['A summary of the plan that was executed.'] = '\u5df2\u6267\u884c\u8ba1\u5212\u7684\u6458\u8981\u3002'
$chunkLoadAgentsDir1['A tool for editing files'] = '\u7528\u4e8e\u7f16\u8f91\u6587\u4ef6\u7684\u5de5\u5177'
$chunkLoadAgentsDir1['Absolute or relative path to the plugin directory'] = '\u63d2\u4ef6\u76ee\u5f55\u7684\u7edd\u5bf9\u6216\u76f8\u5bf9\u8def\u5f84'
$chunkLoadAgentsDir1['Absolute path to the file to send to the user.'] = '\u8981\u53d1\u9001\u7ed9\u7528\u6237\u7684\u6587\u4ef6\u7684\u7edd\u5bf9\u8def\u5f84\u3002'
$chunkLoadAgentsDir1['Absolute paths to watch for FileChanged hooks'] = '\u8981\u4e3a FileChanged \u94a9\u5b50\u76d1\u89c6\u7684\u7edd\u5bf9\u8def\u5f84'
$chunkLoadAgentsDir1['Access denied for upload'] = '\u4e0a\u4f20\u88ab\u62d2\u7edd'
$chunkLoadAgentsDir1['Access denied to file: ${e}'] = '\u8bbf\u95ee\u6587\u4ef6\u88ab\u62d2\u7edd\uff1a${e}'
$chunkLoadAgentsDir1['Access denied to specific paths outside allowed directories'] = '\u8bbf\u95ee\u5141\u8bb8\u76ee\u5f55\u4e4b\u5916\u7684\u7279\u5b9a\u8def\u5f84\u88ab\u62d2\u7edd'
$chunkLoadAgentsDir1['Access to ${e} is blocked by the network egress proxy.'] = '\u5bf9 ${e} \u7684\u8bbf\u95ee\u88ab\u7f51\u7edc\u51fa\u53e3\u4ee3\u7406\u963b\u6b62\u3002'
$chunkLoadAgentsDir1['Accesses /proc/*/environ which may expose secrets'] = '\u8bbf\u95ee /proc/*/environ\uff08\u53ef\u80fd\u66b4\u9732\u5bc6\u94a5\uff09'
$chunkLoadAgentsDir1['Acquired mtime-based lock on running version: ${t}'] = '\u5df2\u83b7\u53d6\u8fd0\u884c\u7248\u672c\u7684 mtime \u9501\uff1a${t}'
$chunkLoadAgentsDir1['Acquired PID lock for ${r} (PID ${process.pid})'] = '\u5df2\u4e3a ${r} \u83b7\u53d6 PID \u9501\uff08PID ${process.pid}\uff09'
$chunkLoadAgentsDir1['Acquired PID lock on running version: ${t}'] = '\u5df2\u83b7\u53d6\u8fd0\u884c\u7248\u672c\u7684 PID \u9501\uff1a${t}'
$chunkLoadAgentsDir1['Acquired refresh lock'] = '\u5df2\u83b7\u53d6\u5237\u65b0\u9501'
$chunkLoadAgentsDir1['Acquiring refresh lock (attempt ${e+1})'] = '\u6b63\u5728\u83b7\u53d6\u5237\u65b0\u9501\uff08\u7b2c ${e+1} \u6b21\u5c1d\u8bd5\uff09'
$chunkLoadAgentsDir1['Activate pending plugin changes in the current session'] = '\u5728\u5f53\u524d\u4f1a\u8bdd\u4e2d\u6fc0\u6d3b\u5f85\u5b9a\u7684\u63d2\u4ef6\u66f4\u6539'
$chunkLoadAgentsDir1['Active API backend. Anthropic OAuth login only applies when "firstParty"; for 3P providers the other fields are absent and auth is external (AWS creds, gcloud ADC, etc.).'] = '\u6d3b\u8dc3\u7684 API \u540e\u7aef\u3002Anthropic OAuth \u767b\u5f55\u4ec5\u5728 "firstParty" \u65f6\u9002\u7528\uff1b\u5bf9\u4e8e 3P \u63d0\u4f9b\u5546\uff0c\u5176\u4ed6\u5b57\u6bb5\u4e0d\u5b58\u5728\uff0c\u8ba4\u8bc1\u662f\u5916\u90e8\u7684\uff08AWS \u51ed\u636e\u3001gcloud ADC \u7b49\uff09\u3002'
$chunkLoadAgentsDir1['Active form cannot be empty'] = '\u6d3b\u52a8\u5f62\u5f0f\u4e0d\u80fd\u4e3a\u7a7a'
$chunkLoadAgentsDir1['Add a description of what you were doing when the perf issue surfaced:'] = '\u6dfb\u52a0\u60a8\u9047\u5230\u6027\u80fd\u95ee\u9898\u65f6\u7684\u64cd\u4f5c\u63cf\u8ff0\uff1a'
$chunkLoadAgentsDir1['Added ${e} with scope ${t.scope}'] = '\u5df2\u6dfb\u52a0 ${e}\uff0c\u8303\u56f4 ${t.scope}'
$chunkLoadAgentsDir1['Added ${lt.bold(e.absolutePath)} as a working directory.'] = '\u5df2\u5c06 ${lt.bold(e.absolutePath)} \u6dfb\u52a0\u4e3a\u5de5\u4f5c\u76ee\u5f55\u3002'
$chunkLoadAgentsDir1['Added marketplace source: ${i.name}'] = '\u5df2\u6dfb\u52a0 marketplace \u6e90\uff1a${i.name}'
$chunkLoadAgentsDir1['Added session hook for event ${n} in session ${t}'] = '\u5df2\u5728\u4f1a\u8bdd ${t} \u4e2d\u4e3a\u4e8b\u4ef6 ${n} \u6dfb\u52a0\u4f1a\u8bdd\u94a9\u5b50'
$chunkLoadAgentsDir1['Additional arguments to pass before ripgrep args'] = '\u5728 ripgrep \u53c2\u6570\u4e4b\u524d\u4f20\u9012\u7684\u9644\u52a0\u53c2\u6570'
$chunkLoadAgentsDir1['Additional CA cert(s)'] = '\u9644\u52a0 CA \u8bc1\u4e66'
$chunkLoadAgentsDir1['Additional directories to include in the permission scope'] = '\u8981\u5305\u542b\u5728\u6743\u9650\u8303\u56f4\u5185\u7684\u9644\u52a0\u76ee\u5f55'
$chunkLoadAgentsDir1['Additional marketplaces to make available for this repository. Typically used in repository .claude/settings.json to ensure team members have required plugin sources.'] = '\u4e3a\u6b64\u4ed3\u5e93\u63d0\u4f9b\u7684\u5176\u4ed6 marketplace\u3002\u901a\u5e38\u5728\u4ed3\u5e93\u7684 .claude/settings.json \u4e2d\u4f7f\u7528\uff0c\u4ee5\u786e\u4fdd\u56e2\u961f\u6210\u5458\u62e5\u6709\u6240\u9700\u7684\u63d2\u4ef6\u6e90\u3002'
$chunkLoadAgentsDir1['Additional user input: '] = '\u9644\u52a0\u7528\u6237\u8f93\u5165\uff1a'
$chunkLoadAgentsDir1['Advisor already unset.'] = 'Advisor \u5df2\u53d6\u6d88\u8bbe\u7f6e\u3002'
$chunkLoadAgentsDir1['Advisor disabled (was ${e}).'] = 'Advisor \u5df2\u7981\u7528\uff08\u66fe\u4e3a ${e}\uff09\u3002'
$chunkLoadAgentsDir1['Advisor model for the server-side advisor tool.'] = '\u670d\u52a1\u5668\u7aef advisor \u5de5\u5177\u7684 Advisor \u6a21\u578b\u3002'
$chunkLoadAgentsDir1['Advisor set to ${i}.'] = 'Advisor \u5df2\u8bbe\u7f6e\u4e3a ${i}\u3002'
$chunkLoadAgentsDir1['After enabling, you may need to restart iTerm2.'] = '\u542f\u7528\u540e\uff0c\u60a8\u53ef\u80fd\u9700\u8981\u91cd\u542f iTerm2\u3002'
$chunkLoadAgentsDir1['Agent "${e.to}" is registered but has no transcript to resume. It may have been cleaned up. (${_l(t)})'] = '\u4ee3\u7406 "${e.to}" \u5df2\u6ce8\u518c\u4f46\u6ca1\u6709\u53ef\u6062\u590d\u7684\u8bb0\u5f55\u3002\u5b83\u53ef\u80fd\u5df2\u88ab\u6e05\u7406\u3002\uff08${_l(t)}\uff09'
$chunkLoadAgentsDir1['Agent "${e.to}" had no active task; resumed from transcript in the background with your message. You''ll be notified when it finishes. Output: ${i.outputFile}'] = '\u4ee3\u7406 "${e.to}" \u6ca1\u6709\u6d3b\u8dc3\u4efb\u52a1\uff1b\u5df2\u4f7f\u7528\u60a8\u7684\u6d88\u606f\u5728\u540e\u53f0\u4ece\u8bb0\u5f55\u6062\u590d\u3002\u5b8c\u6210\u540e\u4f1a\u901a\u77e5\u60a8\u3002\u8f93\u51fa\uff1a${i.outputFile}'
$chunkLoadAgentsDir1['Agent "${t}" completed'] = '\u4ee3\u7406 "${t}" \u5df2\u5b8c\u6210'
$chunkLoadAgentsDir1['Agent "${t}" was stopped'] = '\u4ee3\u7406 "${t}" \u5df2\u505c\u6b62'
$hits = Patch-AllChunks -DistDir $ChunksDir -Replacements $chunkLoadAgentsDir1
Write-Host ("  {0} -> {1} hits" -f "LoadAgentsDir1", $hits)

Write-Host "Total chunks: 2" -ForegroundColor Cyan