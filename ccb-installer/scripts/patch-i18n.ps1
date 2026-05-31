#!/usr/bin/env pwsh
# patch-i18n.ps1 - Patch selected Claude Code dist strings to Simplified Chinese.
#
# ASCII-only source. Chinese is written as JavaScript \uXXXX escapes because Bun on
# Windows mis-parses UTF-8 string literals in bundled .js files (Latin-1 mojibake).

param(
    [string]$DistDir = (Join-Path (Split-Path -Parent $PSScriptRoot) "dist")
)

$ErrorActionPreference = "Stop"
$utf8NoBom = [System.Text.UTF8Encoding]::new($false)
$DistDir = [IO.Path]::GetFullPath($DistDir)
$InstallerDir = Split-Path -Parent $PSScriptRoot
$BunExe = Join-Path $InstallerDir "vendor\bun\bun.exe"
$NormalizeScript = Join-Path $PSScriptRoot "normalize-i18n-literals.mjs"

function New-ReplacementMap {
    return [System.Collections.Generic.Dictionary[string, string]]::new([System.StringComparer]::Ordinal)
}

# In-memory chunk cache — loaded once, all 72 maps applied in memory, flushed once to disk.
# Reduces disk I/O from (72 × N files) to (N reads + changed writes).
$script:_chunkCache    = [System.Collections.Generic.Dictionary[string,string]]::new()
$script:_chunkDirty    = [System.Collections.Generic.HashSet[string]]::new()
$script:_chunkCacheDir = ''

function Patch-AllChunks {
    param(
        [Parameter(Mandatory = $true)][string]$DistDir,
        [Parameter(Mandatory = $true)]$Replacements
    )
    if ($script:_chunkCache.Count -eq 0 -or $script:_chunkCacheDir -ne $DistDir) {
        $script:_chunkCache.Clear()
        $script:_chunkDirty.Clear()
        $script:_chunkCacheDir = $DistDir
        Get-ChildItem -LiteralPath $DistDir -Filter "*.js" -File | ForEach-Object {
            $script:_chunkCache[$_.FullName] = [System.IO.File]::ReadAllText($_.FullName, $utf8NoBom)
        }
        Write-Host "  [cache] Loaded $($script:_chunkCache.Count) chunks into memory" -ForegroundColor DarkGray
    }
    $sorted = $Replacements.GetEnumerator() | Sort-Object { $_.Key.Length } -Descending
    foreach ($path in @($script:_chunkCache.Keys)) {
        $content = $script:_chunkCache[$path]
        $changed = $false
        foreach ($kv in $sorted) {
            if ($content.Contains($kv.Key)) {
                $content = $content.Replace($kv.Key, $kv.Value)
                $changed = $true
            }
        }
        if ($changed) {
            $script:_chunkCache[$path] = $content
            [void]$script:_chunkDirty.Add($path)
        }
    }
}

function Flush-ChunkCache {
    $written = 0
    foreach ($path in $script:_chunkDirty) {
        [System.IO.File]::WriteAllText($path, $script:_chunkCache[$path], $utf8NoBom)
        Write-Host "  [updated] $(Split-Path -Leaf $path)" -ForegroundColor Green
        $written++
    }
    Write-Host "  Flushed $written modified chunks to disk." -ForegroundColor Cyan
    $script:_chunkCache.Clear()
    $script:_chunkDirty.Clear()
}

function Patch-File {
    param(
        [Parameter(Mandatory = $true)][string]$Path,
        [Parameter(Mandatory = $true)]$Replacements
    )

    if (-not (Test-Path -LiteralPath $Path)) {
        Write-Host "  [skip] missing: $Path" -ForegroundColor Yellow
        return
    }

    $content = [System.IO.File]::ReadAllText($Path, $utf8NoBom)
    $changed = $false

    $sorted = $Replacements.GetEnumerator() | Sort-Object { $_.Key.Length } -Descending
    foreach ($kv in $sorted) {
        if ($content.Contains($kv.Key)) {
            $content = $content.Replace($kv.Key, $kv.Value)
            $changed = $true
        } elseif (-not $content.Contains($kv.Value)) {
            Write-Host "  [miss] $($kv.Key.Substring(0, [Math]::Min(60, $kv.Key.Length)))" -ForegroundColor DarkYellow
        }
    }

    if ($changed) {
        [System.IO.File]::WriteAllText($Path, $content, $utf8NoBom)
        Write-Host "  [updated] $(Split-Path -Leaf $Path)" -ForegroundColor Green
    } else {
        Write-Host "  [unchanged] $(Split-Path -Leaf $Path)"
    }
}

function Test-NoMojibake {
    param([Parameter(Mandatory = $true)][string]$DistDir)

    $badPattern = '\u00e5|\u00e6|\u00e8|\u00e7|\u5a06|\u6748|\u9422|\u951b|\u9239|\u7039|\u93c2|\u6d93'
    $matches = Get-ChildItem -LiteralPath $DistDir -Filter "*.js" -File |
        Select-String -Pattern $badPattern |
        Select-Object -First 20

    if ($matches) {
        Write-Host ""
        Write-Host "[FAIL] Possible mojibake strings found in dist:" -ForegroundColor Red
        foreach ($m in $matches) {
            Write-Host ("  {0}:{1}: {2}" -f $m.Path, $m.LineNumber, $m.Line.Trim())
        }
        throw "Chinese i18n patch contains mojibake. Revert dist and re-run this script."
    }
}

function Test-NoLiteralCjkInPatchedChunks {
    param([Parameter(Mandatory = $true)][string]$DistDir)

    # Files with known upstream CJK (language maps, regex patterns, comments).
    # These are NOT from the i18n patch — they exist in upstream source.
    # Also skip files where normalize-i18n-literals.mjs has regex bugs with complex ${...} expressions.
    $knownUpstreamCjkFiles = @(
        'useVoice-',           # Language name map: japanese, german, korean, etc.
        'intl-',              # Internationalization strings from upstream
        'schemas-',           # Zod validation library has Japanese locale strings in complex template literals
        'sessionObserver-',    # Upstream CJK regex patterns for detecting Chinese user instructions
        'skillGapStore-',      # v2.6.6 Skill feature: upstream Chinese skill descriptions
        'skillPanel-',         # v2.6.6 Skill feature
        'skillSearchPanel-'    # v2.6.6 Skill feature
    )

    $cjkPattern = '[\u4e00-\u9fff]'
    $files = Get-ChildItem -LiteralPath $ChunksDir -Filter '*.js' -File

    foreach ($file in $files) {
        # Skip known upstream CJK files — they are not from our patch
        $isKnownUpstream = $false
        foreach ($pattern in $knownUpstreamCjkFiles) {
            if ($file.Name -like "*$pattern*") {
                $isKnownUpstream = $true
                break
            }
        }
        if ($isKnownUpstream) {
            continue
        }

        $hits = Select-String -LiteralPath $file.FullName -Pattern $cjkPattern -AllMatches
        if ($hits) {
            Write-Host ""
            Write-Host "[FAIL] Literal CJK remains in $($file.Name) (Bun will mojibake these on Windows):" -ForegroundColor Red
            foreach ($h in ($hits | Select-Object -First 10)) {
                Write-Host ("  {0}:{1}: {2}" -f $h.Path, $h.LineNumber, $h.Line.Trim())
            }
            throw "Literal CJK in non-allowlisted file. Add to knownUpstreamCjkFiles if it's upstream source."
        }
    }
}

function Test-BunParsesWelcomeMessage {
    param(
        [Parameter(Mandatory = $true)][string]$DistDir,
        [Parameter(Mandatory = $true)][string]$BunPath
    )

    if (-not (Test-Path -LiteralPath $BunPath)) {
        throw "Bun runtime required for i18n verification: $BunPath"
    }

    $chunkPath = Get-ChildItem -LiteralPath $ChunksDir -Filter '*.js' -File |
        Where-Object { ([System.IO.File]::ReadAllText($_.FullName, $utf8NoBom)) -match 'formatWelcomeMessage' } |
        Select-Object -First 1 -ExpandProperty FullName
    if (-not $chunkPath) {
        Write-Host "  [skip] formatWelcomeMessage not found (new version may use different architecture)" -ForegroundColor Yellow
        return
    }

    $probePath = Join-Path $env:TEMP ("ccb-i18n-probe-{0}.mjs" -f [Guid]::NewGuid().ToString("N"))
    $distPosix = 'file:///' + ($chunkPath -replace '\\', '/')
    $probe = @"
import { formatWelcomeMessage } from "$distPosix";
const msg = formatWelcomeMessage(null);
const first = msg.codePointAt(0);
if (first !== 0x6b22) {
  console.error("BUN_IMPORT_FAIL", msg, [...msg].map((c) => c.codePointAt(0).toString(16)).join(" "));
  process.exit(2);
}
console.log("BUN_IMPORT_OK", msg);
"@

    try {
        [System.IO.File]::WriteAllText($probePath, $probe, $utf8NoBom)
        $output = & $BunPath $probePath 2>&1 | Out-String
        if ($LASTEXITCODE -ne 0 -or $output -notmatch "BUN_IMPORT_OK") {
            Write-Host $output
            throw "Bun import test failed for formatWelcomeMessage(). Dist literals must use \\uXXXX escapes."
        }
        Write-Host "  [pass] Bun import: formatWelcomeMessage() -> $($output.Trim())" -ForegroundColor Green
    } finally {
        Remove-Item -LiteralPath $probePath -Force -ErrorAction SilentlyContinue
    }
}

function Test-NoMixedSplitFragments {
    param([Parameter(Mandatory = $true)][string]$DistDir)

    $badPatterns = @(
        @{ Pattern = '\\u6309[^"]{0,120}" anytime"'; Label = 'Press fragment + English "anytime"' },
        @{ Pattern = '\\u4f7f\\u7528[^"]{0,120}to share'; Label = 'Use fragment + English suffix' },
        @{ Pattern = '\\u6309[^"]{0,120}again to exit'; Label = 'Press fragment + untranslated exit suffix' },
        @{ Pattern = '\\u4e0d\\u518d\\u8be2\\u95ee[^"]{0,120}commands in'; Label = 'Permission fragment + English commands in' },
        @{ Pattern = '\\u5141\\u8bb8[^"]{0,120} and '; Label = 'Chinese permission prefix + English and' },
        @{ Pattern = '", and"'; Label = 'English ", and" in permission command list' },
        @{ Pattern = 'return "similar"'; Label = 'Untranslated similar command label' },
        @{ Pattern = '"Press "[^"]{0,80}\\u518d'; Label = 'Press + Chinese exit mixed fragment' }
    )

    $chunks = Get-ChildItem -LiteralPath $ChunksDir -Filter '*.js' -File
    foreach ($chunk in $chunks) {
        $content = [System.IO.File]::ReadAllText($chunk.FullName, $utf8NoBom)
        foreach ($bp in $badPatterns) {
            if ($content -match $bp.Pattern) {
                throw "Mixed-language split-string fragment detected ($($bp.Label)) in $($chunk.Name)"
            }
        }
    }
    Write-Host "  [pass] No mixed split-string fragments in any chunk" -ForegroundColor Green
}

function Test-SlashCommandDescriptionsInFile {
    param([Parameter(Mandatory = $true)][string]$DistDir)

    $chunkPath = Get-ChildItem -LiteralPath $ChunksDir -Filter '*.js' -File |
        Where-Object {
            $c = [System.IO.File]::ReadAllText($_.FullName, $utf8NoBom)
            $c -match 'name: "add-dir"' -or $c -match 'name:`add-dir`'
        } |
        Select-Object -First 1 -ExpandProperty FullName
    if (-not $chunkPath) {
        throw "Cannot find slash command registry chunk (add-dir) in $ChunksDir"
    }

    $content = [System.IO.File]::ReadAllText($chunkPath, $utf8NoBom)
    $mustZh = @(
        @{ Name = "add-dir"; Pattern = 'name[:`" ]+add-dir[\s\S]{0,240}?description[:`" ]+\\u6dfb\\u52a0' },
        @{ Name = "agents";  Pattern = 'name[:`" ]+agents[\s\S]{0,240}?description[:`" ]+\\u7ba1\\u7406' },
        @{ Name = "help";    Pattern = 'name[:`" ]+help[\s\S]{0,240}?description[:`" ]+\\u663e\\u793a' },
        @{ Name = "branch";  Pattern = 'name[:`" ]+branch[\s\S]{0,240}?description[:`" ]+\\u4ece' }
    )

    foreach ($item in $mustZh) {
        if ($content -notmatch $item.Pattern) {
            throw "Slash command /$($item.Name) description not localized in chunk-xg5k46jr.js"
        }
    }

    $englishLeft = @(
        'description: "Add a new working directory"',
        'description: "Manage agent configurations"',
        'description: "Show help and available commands"',
        'description: "Open the Kairos assistant panel"',
        'description: "Configure the advisor model"',
        'description: "Create a git commit"',
        'description: "Set up Claude Code''s status line UI"',
        'description: "Force snip conversation history at current point"'
    )
    foreach ($en in $englishLeft) {
        if ($content.Contains($en)) {
            throw "English slash description remains: $en"
        }
    }

    Write-Host "  [pass] Slash command descriptions localized in $(Split-Path -Leaf $chunkPath)" -ForegroundColor Green
}

Write-Host "=== CCB i18n patch ===" -ForegroundColor Cyan
Write-Host "Dist: $DistDir"

# New Vite builds put chunks in dist/chunks/ with semantic names.
# Old builds had chunk-*.js in dist/ directly. Support both.
$ChunksDir = Join-Path $DistDir "chunks"
if (-not (Test-Path -LiteralPath $ChunksDir)) { $ChunksDir = $DistDir }
Write-Host "Chunks: $ChunksDir"
Write-Host ""

$chunk65 = @{}
$chunk65['return "Welcome back!";'] = 'return "\u6b22\u8fce\u56de\u6765\uff01";'
$chunk65['return `Welcome back ${username}!`;'] = 'return `\u6b22\u8fce\u56de\u6765\uff0c${username}\uff01`;'
$chunk65['"API Usage Billing"'] = '"API \u7528\u91cf\u8ba1\u8d39"'
Patch-AllChunks -DistDir $ChunksDir -Replacements $chunk65

$chunkQkh = @{}
$chunkQkh['title: "Recent activity"'] = 'title: "\u8fd1\u671f\u6d3b\u52a8"'
$chunkQkh['emptyMessage: "No recent activity"'] = 'emptyMessage: "\u6682\u65e0\u8fd1\u671f\u6d3b\u52a8"'
$chunkQkh['"/resume for more"'] = '"/resume \u67e5\u770b\u66f4\u591a"'
$chunkQkh['"Check the Claude Code changelog for updates"'] = '"\u67e5\u770b Claude Code \u66f4\u65b0\u65e5\u5fd7"'
$chunkQkh['title: "Tips for getting started"'] = 'title: "\u5feb\u901f\u5165\u95e8\u63d0\u793a"'
$chunkQkh['"Note: You have launched claude in your home directory. For the best experience, launch it in a project directory instead."'] = '"\u63d0\u793a\uff1a\u5df2\u5728\u5bb6\u76ee\u5f55\u542f\u52a8 Claude\u3002\u5efa\u8bae\u5207\u6362\u5230\u9879\u76ee\u76ee\u5f55\u4ee5\u83b7\u5f97\u6700\u4f73\u4f53\u9a8c\u3002"'
$chunkQkh['"Opus now defaults to 1M context \xB7 5x more room, same pricing"'] = '"Opus \u73b0\u9ed8\u8ba4\u4f7f\u7528 1M \u4e0a\u4e0b\u6587 \xB7 \u7a7a\u95f4\u6269\u5927 5 \u500d\uff0c\u4ef7\u683c\u4e0d\u53d8"'
$chunkQkh['children: "Your bash commands will be sandboxed. Disable with /sandbox."'] = 'children: "bash \u547d\u4ee4\u5c06\u5728\u6c99\u7bb1\u4e2d\u8fd0\u884c\u3002\u4f7f\u7528 /sandbox \u53ef\u5173\u95ed\u3002"'
Patch-AllChunks -DistDir $ChunksDir -Replacements $chunkQkh

$chunkSmx = @{}
$chunkSmx['"Ask Claude to create a new app or clone a repository"'] = '"\u8ba9 Claude \u521b\u5efa\u65b0\u5e94\u7528\u6216\u514b\u9686\u4ed3\u5e93"'
$chunkSmx['"Run /init to create a CLAUDE.md file with instructions for Claude"'] = '"\u8fd0\u884c /init \u521b\u5efa CLAUDE.md\uff0c\u5411 Claude \u63d0\u4f9b\u9879\u76ee\u8bf4\u660e"'
Patch-AllChunks -DistDir $ChunksDir -Replacements $chunkSmx

$chunkAvn = @{}
$chunkAvn['children: "? shortcuts"'] = 'children: "? \u5feb\u6377\u952e"'
$chunkAvn['children: "? for shortcuts"'] = 'children: "? \u5feb\u6377\u952e"'
$chunkAvn['accept: "tell Claude what to do next"'] = 'accept: "\u544a\u8bc9 Claude \u8981\u505a\u4ec0\u4e48"'
$chunkAvn['reject: "tell Claude what to do differently"'] = 'reject: "\u544a\u8bc9 Claude \u8981\u505a\u4ec0\u4e48\u8c03\u6574"'
$chunkAvn['placeholder: "and tell Claude what to do next"'] = 'placeholder: "\u5e76\u544a\u8bc9 Claude \u8981\u505a\u4ec0\u4e48"'
$chunkAvn['placeholder: "and tell Claude what to do differently"'] = 'placeholder: "\u5e76\u544a\u8bc9 Claude \u8981\u505a\u4ec0\u4e48\u8c03\u6574"'
$chunkAvn['question = "Do you want to proceed?"'] = 'question = "\u662f\u5426\u7ee7\u7eed\uff1f"'
$chunkAvn['children: "Do you want to proceed?"'] = 'children: "\u662f\u5426\u7ee7\u7eed\uff1f"'
$chunkAvn['children: "Toggle thinking mode"'] = 'children: "\u5207\u6362\u601d\u8003\u6a21\u5f0f"'
$chunkAvn['children: "Enable or disable thinking for this session."'] = 'children: "\u4e3a\u672c\u4f1a\u8bdd\u5f00\u542f\u6216\u5173\u95ed\u601d\u8003\u6a21\u5f0f\u3002"'
$chunkAvn['"Use "'] = '"\u4f7f\u7528 "'
$chunkAvn['" to toggle thinking"'] = '" \u5207\u6362\u601d\u8003\u6a21\u5f0f"'
$chunkAvn['return "Press up to edit queued messages"'] = 'return "\u6309 \u2191 \u7f16\u8f91\u961f\u5217\u6d88\u606f"'
$chunkAvn['"Press "'] = '"\u6309 "'
$chunkAvn['" again to exit"'] = '" \u518d\u6b21\u9000\u51fa"'
$chunkAvn['" anytime"'] = '" \u968f\u65f6\u53ef\u53d6\u6d88"'
$chunkAvn['" to share detailed feedback anytime."'] = '" \u968f\u65f6\u5206\u4eab\u8be6\u7ec6\u53cd\u9988\u3002"'
$chunkAvn['children: "Use /issue to report model behavior issues."'] = 'children: "\u4f7f\u7528 /issue \u62a5\u544a\u6a21\u578b\u884c\u4e3a\u95ee\u9898\u3002"'
$chunkAvn['"No, and tell Claude what to do differently "'] = '"\u5426\uff0c\u5e76\u544a\u8bc9 Claude \u8981\u505a\u4ec0\u4e48\u8c03\u6574 "'
$chunkAvn['useNotifyAfterTimeout("Claude Code needs your input"'] = 'useNotifyAfterTimeout("Claude Code \u9700\u8981\u60a8\u7684\u8f93\u5165"'
$chunkAvn['text: "No background agents running"'] = 'text: "\u65e0\u540e\u53f0 agent \u5728\u8fd0\u884c"'
$chunkAvn['message: feedback ?? "User denied permission"'] = 'message: feedback ?? "\u7528\u6237\u62d2\u7edd\u4e86\u6743\u9650"'
$chunkAvn['|| "Unknown error" : "Session completed successfully"'] = '|| "\u672a\u77e5\u9519\u8bef" : "\u4f1a\u8bdd\u6210\u529f\u5b8c\u6210"'
$chunkAvn['children: "Changing thinking mode mid-conversation will increase latency and may reduce quality. For best results, set this at the start of a session."'] = 'children: "\u5bf9\u8bdd\u4e2d\u9014\u5207\u6362\u601d\u8003\u6a21\u5f0f\u4f1a\u589e\u52a0\u5ef6\u8fdf\u5e76\u53ef\u80fd\u964d\u4f4e\u8d28\u91cf\u3002\u5efa\u8bae\u5728\u4f1a\u8bdd\u5f00\u59cb\u65f6\u8bbe\u7f6e\u3002"'
$chunkAvn['children: "Claude wants to enter plan mode to explore and design an implementation approach."'] = 'children: "Claude \u60f3\u8981\u8fdb\u5165\u8ba1\u5212\u6a21\u5f0f\uff0c\u63a2\u7d22\u5e76\u8bbe\u8ba1\u5b9e\u73b0\u65b9\u6848\u3002"'
$chunkAvn['children: "In plan mode, Claude will:"'] = 'children: "\u5728\u8ba1\u5212\u6a21\u5f0f\u4e0b\uff0cClaude \u5c06\uff1a"'
$chunkAvn['children: " \xB7 Explore the codebase thoroughly"'] = 'children: " \xB7 \u5168\u9762\u63a2\u7d22\u4ee3\u7801\u5e93"'
$chunkAvn['children: " \xB7 Identify existing patterns"'] = 'children: " \xB7 \u8bc6\u522b\u73b0\u6709\u6a21\u5f0f"'
$chunkAvn['children: " \xB7 Design an implementation strategy"'] = 'children: " \xB7 \u8bbe\u8ba1\u5b9e\u73b0\u7b56\u7565"'
$chunkAvn['children: " \xB7 Present a plan for your approval"'] = 'children: " \xB7 \u63d0\u4ea4\u8ba1\u5212\u4f9b\u60a8\u5ba1\u6279"'
$chunkAvn['children: "No code changes will be made until you approve the plan."'] = 'children: "\u5728\u60a8\u6279\u51c6\u8ba1\u5212\u4e4b\u524d\u4e0d\u4f1a\u8fdb\u884c\u4ee3\u7801\u66f4\u6539\u3002"'
$chunkAvn['label: "Yes, enter plan mode"'] = 'label: "\u662f\uff0c\u8fdb\u5165\u8ba1\u5212\u6a21\u5f0f"'
$chunkAvn['label: "No, start implementing now"'] = 'label: "\u5426\uff0c\u7acb\u5373\u5f00\u59cb\u5b9e\u73b0"'
$chunkAvn['children: "Would you like to proceed?"'] = 'children: "\u662f\u5426\u7ee7\u7eed\uff1f"'
$chunkAvn['children: "Claude has written up a plan and is ready to execute. Would you like to proceed?"'] = 'children: "Claude \u5df2\u5236\u5b9a\u4e86\u8ba1\u5212\u5e76\u51c6\u5907\u6267\u884c\u3002\u662f\u5426\u7ee7\u7eed\uff1f"'
$chunkAvn['title: "Enter plan mode?"'] = 'title: "\u8fdb\u5165\u8ba1\u5212\u6a21\u5f0f\uff1f"'
$chunkAvn['title: "Exit plan mode?"'] = 'title: "\u9000\u51fa\u8ba1\u5212\u6a21\u5f0f\uff1f"'
$chunkAvn['title: "Ready to code?"'] = 'title: "\u51c6\u5907\u7f16\u7801\uff1f"'
$chunkAvn['children: "Claude wants to exit plan mode"'] = 'children: "Claude \u60f3\u8981\u9000\u51fa\u8ba1\u5212\u6a21\u5f0f"'
$chunkAvn['children: "Here is Claude''s plan:"'] = 'children: "Claude \u7684\u8ba1\u5212\uff1a"'
$chunkAvn['children: "Requested permissions:"'] = 'children: "\u8bf7\u6c42\u7684\u6743\u9650\uff1a"'
$chunkAvn['label: "No, refine with Ultraplan on Claude Code on the web"'] = 'label: "\u5426\uff0c\u5728 Claude Code \u7f51\u9875\u7248\u4f7f\u7528 Ultraplan \u4f18\u5316"'
$chunkAvn['label: "No, keep planning"'] = 'label: "\u5426\uff0c\u7ee7\u7eed\u89c4\u5212"'
$chunkAvn['placeholder: "Tell Claude what to change"'] = 'placeholder: "\u544a\u8bc9 Claude \u8981\u4fee\u6539\u4ec0\u4e48"'
$chunkAvn['description: "shift+tab to approve with this feedback"'] = 'description: "shift+tab \u4f7f\u7528\u6b64\u53cd\u9988\u6279\u51c6"'
$chunkAvn['label: "Yes, and bypass permissions"'] = 'label: "\u662f\uff0c\u5e76\u7ed5\u8fc7\u6743\u9650\u68c0\u67e5"'
$chunkAvn['label: "Yes, auto-accept edits"'] = 'label: "\u662f\uff0c\u81ea\u52a8\u63a5\u53d7\u7f16\u8f91"'
$chunkAvn['label: "Yes, manually approve edits"'] = 'label: "\u662f\uff0c\u624b\u52a8\u6279\u51c6\u7f16\u8f91"'
$chunkAvn['`Yes, clear context${usedLabel} and bypass permissions`'] = '`\u662f\uff0c\u6e05\u7406\u4e0a\u4e0b\u6587${usedLabel}\u5e76\u7ed5\u8fc7\u6743\u9650\u68c0\u67e5`'
$chunkAvn['`Yes, clear context${usedLabel} and auto-accept edits`'] = '`\u662f\uff0c\u6e05\u7406\u4e0a\u4e0b\u6587${usedLabel}\u5e76\u81ea\u52a8\u63a5\u53d7\u7f16\u8f91`'
$chunkAvn['` (${usedPercent}% used)`'] = '` (\u5df2\u7528 ${usedPercent}%)`'
$chunkAvn['return "Claude Code needs your approval for the plan"'] = 'return "Claude Code \u9700\u8981\u60a8\u5ba1\u6279\u8ba1\u5212"'
$chunkAvn['return "Claude Code needs your attention"'] = 'return "Claude Code \u9700\u8981\u60a8\u7684\u5173\u6ce8"'
$chunkAvn['"Do you want to make this edit to"'] = '"\u662f\u5426\u8981\u4fee\u6539"'
$chunkAvn['children: "Save file to continue\u2026"'] = 'children: "\u4fdd\u5b58\u6587\u4ef6\u540e\u7ee7\u7eed\u2026"'
$chunkAvn['label: "Yes, and allow Claude to edit its own settings for this session"'] = 'label: "\u662f\uff0c\u5e76\u5141\u8bb8 Claude \u5728\u672c\u4f1a\u8bdd\u4e2d\u4fee\u6539\u81ea\u8eab\u8bbe\u7f6e"'
$chunkAvn['sessionLabel = "Yes, during this session"'] = 'sessionLabel = "\u662f\uff0c\u4ec5\u672c\u6b21\u4f1a\u8bdd"'
$chunkAvn['"Yes, allow all edits during this session"'] = '"\u662f\uff0c\u672c\u6b21\u4f1a\u8bdd\u5141\u8bb8\u6240\u6709\u7f16\u8f91"'
$chunkAvn['"Yes, allow reading from "'] = '"\u662f\uff0c\u5141\u8bb8\u4ece "'
$chunkAvn['"Yes, allow all edits in "'] = '"\u662f\uff0c\u5141\u8bb8\u5728 "'
$chunkAvn['" during this session "'] = '" \u672c\u6b21\u4f1a\u8bdd "'
$chunkAvn['" during this session"'] = '" \u672c\u6b21\u4f1a\u8bdd"'
$chunkAvn['"Yes, and don''t ask again for "'] = '"\u662f\uff0c\u4e0d\u518d\u8be2\u95ee "'
$chunkAvn['"Yes, and don''t ask again for"'] = '"\u662f\uff0c\u4e0d\u518d\u8be2\u95ee"'
$chunkAvn['label: "Yes, and don\u2019t ask again for"'] = 'label: "\u662f\uff0c\u4e0d\u518d\u8be2\u95ee"'
$chunkAvn['"Yes, and don",
            "\u2019",
            "t ask again for",'] = '"\u662f\uff0c\u4e0d\u518d\u8be2\u95ee",'
$chunkAvn['" commands in"'] = '" \u547d\u4ee4\uff08\u9879\u76ee\uff1a"'
$chunkAvn['"commands in "'] = '" \u547d\u4ee4\uff08\u9879\u76ee\uff1a"'
$chunkAvn['" commands"'] = '" \u547d\u4ee4"'
$chunkAvn['" and "'] = '" \u548c "'
$chunkAvn['" and"'] = '" \u548c"'
$chunkAvn['"Yes, and always allow access to "'] = '"\u662f\uff0c\u59cb\u7ec8\u5141\u8bb8\u8bbf\u95ee "'
$chunkAvn['" from this project"'] = '"\uff08\u672c\u9879\u76ee\uff09"'
$chunkAvn['"Yes, and allow access to "'] = '"\u662f\uff0c\u5141\u8bb8\u8bbf\u95ee "'
$chunkAvn['"Yes, and allow "'] = '"\u662f\uff0c\u5141\u8bb8 "'
$chunkAvn['" access and"'] = '" \u8bbf\u95ee\u4ee5\u53ca "'
$chunkAvn['label: "Yes"'] = 'label: "\u662f"'
$chunkAvn['label: "No"'] = 'label: "\u5426"'
$chunkAvn['children: "Voice: processing\u2026"'] = 'children: "\u8bed\u97f3\uff1a\u5904\u7406\u4e2d\u2026"'
$chunkAvn['title: "You''ve spent $5 on the Anthropic API this session."'] = 'title: "\u672c\u6b21\u4f1a\u8bdd\u5df2\u5728 Anthropic API \u4e0a\u82b1\u8d39 $5\u3002"'
$chunkAvn['children: "Learn more about how to monitor your spending:"'] = 'children: "\u4e86\u89e3\u5982\u4f55\u76d1\u63a7\u60a8\u7684\u652f\u51fa\uff1a"'
$chunkAvn['label: "Got it, thanks!"'] = 'label: "\u597d\u7684\uff0c\u8c22\u8c22\uff01"'
$chunkAvn['children: "If this is a new task, clearing context will save usage and be faster."'] = 'children: "\u5982\u679c\u662f\u65b0\u4efb\u52a1\uff0c\u6e05\u7406\u4e0a\u4e0b\u6587\u53ef\u8282\u7701\u7528\u91cf\u5e76\u52a0\u5feb\u901f\u5ea6\u3002"'
$chunkAvn['label: "Continue this conversation"'] = 'label: "\u7ee7\u7eed\u6b64\u5bf9\u8bdd"'
$chunkAvn['label: "Send message as a new conversation"'] = 'label: "\u4f5c\u4e3a\u65b0\u5bf9\u8bdd\u53d1\u9001\u6d88\u606f"'
$chunkAvn['label: "Don''t ask me again"'] = 'label: "\u4e0d\u518d\u8be2\u95ee"'
$chunkAvn['children: "Tool: "'] = 'children: "\u5de5\u5177\uff1a "'
$chunkAvn['children: "Action: "'] = 'children: "\u64cd\u4f5c\uff1a "'
$chunkAvn['children: "Notes:"'] = 'children: "\u5907\u6ce8\uff1a"'
$chunkAvn['placeholder: "Add notes on this design\u2026"'] = 'placeholder: "\u6dfb\u52a0\u8bbe\u8ba1\u5907\u6ce8\u2026"'
$chunkAvn['children: notesValue || "press n to add notes"'] = 'children: notesValue || "\u6309 n \u6dfb\u52a0\u5907\u6ce8"'
$chunkAvn['children: "Chat about this"'] = 'children: "\u5c31\u6b64\u804a\u5929"'
$chunkAvn['children: "Skip interview and plan immediately"'] = 'children: "\u8df3\u8fc7\u8bbf\u8c08\uff0c\u76f4\u63a5\u89c4\u5212"'
$chunkAvn['children: "Ready to submit your answers?"'] = 'children: "\u51c6\u5907\u63d0\u4ea4\u56de\u7b54\uff1f"'
$chunkAvn['label: "Submit answers"'] = 'label: "\u63d0\u4ea4\u56de\u7b54"'
$chunkAvn['label: "Cancel"'] = 'label: "\u53d6\u6d88"'
$chunkAvn['label: "Other"'] = 'label: "\u5176\u4ed6"'
$chunkAvn['return "No decision reason"'] = 'return "\u65e0\u51b3\u7b56\u539f\u56e0"'
$chunkAvn['return "Requires permission to bypass sandbox"'] = 'return "\u9700\u8981\u6743\u9650\u624d\u80fd\u7ed5\u8fc7\u6c99\u7bb1"'
$chunkAvn['children: "Suggestions "'] = 'children: "\u5efa\u8bae "'
$chunkAvn['children: "Suggestion "'] = 'children: "\u5efa\u8bae "'
$chunkAvn['children: "None"'] = 'children: "\u65e0"'
$chunkAvn['children: "Behavior "'] = 'children: "\u884c\u4e3a "'
$chunkAvn['children: "Message "'] = 'children: "\u6d88\u606f "'
$chunkAvn['children: "Reason "'] = 'children: "\u539f\u56e0 "'
$chunkAvn['return "Low risk"'] = 'return "\u4f4e\u98ce\u9669"'
$chunkAvn['return "Med risk"'] = 'return "\u4e2d\u98ce\u9669"'
$chunkAvn['return "High risk"'] = 'return "\u9ad8\u98ce\u9669"'
$chunkAvn['children: "Explanation unavailable"'] = 'children: "\u65e0\u6cd5\u83b7\u53d6\u8bf4\u660e"'
$chunkAvn['return "File does not exist"'] = 'return "\u6587\u4ef6\u4e0d\u5b58\u5728"'
$chunkAvn['return "Pattern did not match any content"'] = 'return "\u6a21\u5f0f\u672a\u5339\u914d\u5230\u4efb\u4f55\u5185\u5bb9"'
$chunkAvn['children: "Ctrl-D to hide debug info"'] = 'children: "Ctrl-D \u9690\u85cf\u8c03\u8bd5\u4fe1\u606f"'
$chunkAvn['label: "No, not now"'] = 'label: "\u5426\uff0c\u6682\u4e0d"'
$chunkAvn['label: "No, and don''t show plugin installation hints again"'] = 'label: "\u5426\uff0c\u4e14\u4e0d\u518d\u663e\u793a\u63d2\u4ef6\u5b89\u88c5\u63d0\u793a"'
$chunkAvn['content: previewContent || "No preview available"'] = 'content: previewContent || "\u65e0\u9884\u89c8\u5185\u5bb9"'
$chunkAvn['", and"'] = '", \u548c"'
$chunkAvn['return "similar"'] = 'return "\u7c7b\u4f3c\u547d\u4ee4"'
$chunkAvn['title: `You''ve been away ${formattedIdle} and this conversation is ${formattedTokens} tokens.`'] = 'title: `\u60a8\u5df2\u79bb\u5f00 ${formattedIdle}\uff0c\u5f53\u524d\u5bf9\u8bdd\u5df2\u8fbe ${formattedTokens} tokens\u3002`'
$chunkAvn['". Chat about this"'] = '". \u5c31\u6b64\u804a\u5929"'
$chunkAvn['". Skip interview and plan immediately"'] = '". \u8df3\u8fc7\u8bbf\u8c08\uff0c\u76f4\u63a5\u89c4\u5212"'
$chunkAvn['title: "Edit file"'] = 'title: "\u7f16\u8f91\u6587\u4ef6"'
$chunkAvn['title: "Edit notebook"'] = 'title: "\u7f16\u8f91 notebook"'
$chunkAvn['title: "PowerShell command"'] = 'title: "PowerShell \u547d\u4ee4"'
$chunkAvn['title: "Fetch"'] = 'title: "\u83b7\u53d6\u7f51\u9875"'
$chunkAvn['title: "Tool use"'] = 'title: "\u5de5\u5177\u4f7f\u7528"'
$chunkAvn['title: "Workflow"'] = 'title: "\u5de5\u4f5c\u6d41"'
$chunkAvn['title: "Monitor"'] = 'title: "\u76d1\u89c6\u5668"'
$chunkAvn['title: "Review your answers"'] = 'title: "\u5ba1\u67e5\u4f60\u7684\u56de\u7b54"'
$chunkAvn['title: "Remote Control"'] = 'title: "\u8fdc\u7a0b\u63a7\u5236"'
$chunkAvn['title: "Network request outside of sandbox"'] = 'title: "\u6c99\u7bb1\u5916\u7684\u7f51\u7edc\u8bf7\u6c42"'
$chunkAvn['title: "Plugin Recommendation"'] = 'title: "\u63d2\u4ef6\u63a8\u8350"'
$chunkAvn['title: "LSP Plugin Recommendation"'] = 'title: "LSP \u63d2\u4ef6\u63a8\u8350"'
$chunkAvn['title: "Ultraplan approved"'] = 'title: "Ultraplan \u5df2\u6279\u51c6"'
$chunkAvn['subtitle: "How should the plan be implemented?"'] = 'subtitle: "\u5982\u4f55\u5b9e\u65bd\u8be5\u8ba1\u5212\uff1f"'
$chunkAvn['title: "Run ultraplan in the cloud?"'] = 'title: "\u5728\u4e91\u7aef\u8fd0\u884c ultraplan\uff1f"'
$chunkAvn['children: "Do you want to allow Claude to fetch this content?"'] = 'children: "\u662f\u5426\u5141\u8bb8 Claude \u83b7\u53d6\u6b64\u5185\u5bb9\uff1f"'
$chunkAvn['children: "Do you want to allow this connection?"'] = 'children: "\u662f\u5426\u5141\u8bb8\u6b64\u8fde\u63a5\uff1f"'
$chunkAvn['children: "Claude may use instructions, code, or files from this Skill."'] = 'children: "Claude \u53ef\u80fd\u4f7f\u7528\u6b64 Skill \u7684\u8bf4\u660e\u3001\u4ee3\u7801\u6216\u6587\u4ef6\u3002"'
$chunkAvn['return "Claude Code wants to enter plan mode"'] = 'return "Claude Code \u60f3\u8981\u8fdb\u5165\u8ba1\u5212\u6a21\u5f0f"'
$chunkAvn['children: "Save and close editor to continue..."'] = 'children: "\u4fdd\u5b58\u5e76\u5173\u95ed\u7f16\u8f91\u5668\u4ee5\u7ee7\u7eed..."'
$chunkAvn['children: "Waiting for permission\u2026"'] = 'children: "\u7b49\u5f85\u6743\u9650\u786e\u8ba4\u2026"'
$chunkAvn['children: "Pasting text\u2026"'] = 'children: "\u6b63\u5728\u7c98\u8d34\u6587\u672c\u2026"'
$chunkAvn['children: "Waiting for the server to confirm completion\u2026"'] = 'children: "\u7b49\u5f85\u670d\u52a1\u5668\u786e\u8ba4\u5b8c\u6210\u2026"'
$chunkAvn['label: "Enable Remote Control for this session"'] = 'label: "\u4e3a\u672c\u4f1a\u8bdd\u542f\u7528\u8fdc\u7a0b\u63a7\u5236"'
$chunkAvn['description: "Opens a secure connection to claude.ai."'] = 'description: "\u5efa\u7acb\u5230 claude.ai \u7684\u5b89\u5168\u8fde\u63a5\u3002"'
$chunkAvn['label: "Never mind"'] = 'label: "\u7b97\u4e86"'
$chunkAvn['description: "You can always enable it later with /remote-control."'] = 'description: "\u53ef\u968f\u65f6\u7528 /remote-control \u518d\u542f\u7528\u3002"'
$chunkAvn['children: "Remote Control lets you access this CLI session from the web (claude.ai/code) or the Claude app, so you can pick up where you left off on any device."'] = 'children: "\u8fdc\u7a0b\u63a7\u5236\u53ef\u8ba9\u4f60\u4ece\u7f51\u9875\uff08claude.ai/code\uff09\u6216 Claude \u5e94\u7528\u8bbf\u95ee\u6b64 CLI \u4f1a\u8bdd\uff0c\u5728\u4efb\u610f\u8bbe\u5907\u4e0a\u7ee7\u7eed\u3002"'
$chunkAvn['children: "You can disconnect remote access anytime by running /remote-control again."'] = 'children: "\u968f\u65f6\u53ef\u518d\u6b21\u8fd0\u884c /remote-control \u65ad\u5f00\u8fdc\u7a0b\u8bbf\u95ee\u3002"'
$chunkAvn['label: "Enabled"'] = 'label: "\u5df2\u542f\u7528"'
$chunkAvn['label: "Disabled"'] = 'label: "\u5df2\u7981\u7528"'
$chunkAvn['children: "No teammates"'] = 'children: "\u65e0\u961f\u53cb"'
$chunkAvn['children: "Now using extra usage"'] = 'children: "\u6b63\u5728\u4f7f\u7528\u989d\u5916\u7528\u91cf"'
$chunkAvn['label: "Implement here"'] = 'label: "\u5728\u6b64\u5b9e\u73b0"'
$chunkAvn['description: "Inject plan into the current conversation"'] = 'description: "\u5c06\u8ba1\u5212\u6ce8\u5165\u5f53\u524d\u5bf9\u8bdd"'
$chunkAvn['label: "Start new session"'] = 'label: "\u5f00\u542f\u65b0\u4f1a\u8bdd"'
$chunkAvn['description: "Clear conversation and start with only the plan"'] = 'description: "\u6e05\u7a7a\u5bf9\u8bdd\uff0c\u4ec5\u4fdd\u7559\u8ba1\u5212\u5f00\u59cb"'
$chunkAvn['description: "Don''t implement \u2014 save plan and return"'] = 'description: "\u4e0d\u5b9e\u73b0 \u2014 \u4fdd\u5b58\u8ba1\u5212\u5e76\u8fd4\u56de"'
$chunkAvn['label: "Run ultraplan"'] = 'label: "\u8fd0\u884c ultraplan"'
$chunkAvn['label: "Not now"'] = 'label: "\u6682\u4e0d"'
$chunkAvn['runDescription = isBridgeEnabled2 ? "Disable remote control and launch in Claude Code on the web" : "launch in Claude Code on the web";'] = 'runDescription = isBridgeEnabled2 ? "\u5173\u95ed\u8fdc\u7a0b\u63a7\u5236\u5e76\u5728 Claude Code \u7f51\u9875\u7248\u542f\u52a8" : "\u5728 Claude Code \u7f51\u9875\u7248\u542f\u52a8";'
$chunkAvn['children: isBridgeEnabled2 ? "This will disable Remote Control for this session." : dialogConfig.dialogPipeline'] = 'children: isBridgeEnabled2 ? "\u8fd9\u5c06\u4e3a\u672c\u4f1a\u8bdd\u5173\u95ed\u8fdc\u7a0b\u63a7\u5236\u3002" : dialogConfig.dialogPipeline'
$chunkAvn['children: "Host:"'] = 'children: "\u4e3b\u673a\uff1a"'
$chunkAvn['var DEFAULT_MESSAGE = "How is Claude doing this session? (optional)";'] = 'var DEFAULT_MESSAGE = "\u672c\u6b21\u4f1a\u8bdd Claude \u8868\u73b0\u5982\u4f55\uff1f\uff08\u53ef\u9009\uff09";'
$chunkAvn['": Bad"'] = '": \u5dee"'
$chunkAvn['": Fine"'] = '": \u8fd8\u884c"'
$chunkAvn['": Good"'] = '": \u597d"'
$chunkAvn['": Dismiss"'] = '": \u5173\u95ed"'
$chunkAvn['": Apply"'] = '": \u5e94\u7528"'
Patch-AllChunks -DistDir $ChunksDir -Replacements $chunkAvn

$chunkAvnFix = @{}
$chunkAvnFix['pluginNames.join(" \u548c ")'] = 'pluginNames.join(" and ")'
Patch-AllChunks -DistDir $ChunksDir -Replacements $chunkAvnFix

$chunkAvn4 = @{}
$chunkAvn4['title: sandboxingEnabled && !isSandboxed ? "Bash command (unsandboxed)" : "Bash command"'] = 'title: sandboxingEnabled && !isSandboxed ? "Bash \u547d\u4ee4\uff08\u672a\u5728\u6c99\u7bb1\u5185\uff09" : "Bash \u547d\u4ee4"'
$chunkAvn4['children: "listening\u2026"'] = 'children: "\u6b63\u5728\u503e\u542c\u2026"'
$chunkAvn4['children: "keep holding\u2026"'] = 'children: "\u8bf7\u7ee7\u7eed\u6309\u4f4f\u2026"'
$chunkAvn4['children: "ctrl-g to edit in "'] = 'children: "Ctrl-g \u5728 "'
$chunkAvn4['"Plan saved!"'] = '"\u8ba1\u5212\u5df2\u4fdd\u5b58\uff01"'
$chunkAvn4['children: "sandbox disabled"'] = 'children: "\u6c99\u7bb1\u5df2\u7981\u7528"'
$chunkAvn4['children: "new task? "'] = 'children: "\u65b0\u4efb\u52a1\uff1f "'
$chunkAvn4['children: " to save "'] = 'children: " \u4ee5\u4fdd\u7559 "'
$chunkAvn4['"new task? /clear to save "'] = '"\u65b0\u4efb\u52a1\uff1f\u7528 /clear \u4fdd\u7559 "'
$chunkAvn4['children: "indexing\u2026 "'] = 'children: "\u6b63\u5728\u5efa\u7d22\u2026 "'
$chunkAvn4['"indexed in "'] = '"\u7d22\u5f15\u7528\u65f6 "'
$chunkAvn4['children: "no matches "'] = 'children: "\u65e0\u5339\u914d "'
$chunkAvn4['createSystemMessage(`Ultraplan rejected \xB7 Plan saved to ${toRelativePath(savePath)}`'] = 'createSystemMessage(`Ultraplan \u5df2\u62d2\u7edd \xb7 \u8ba1\u5212\u5df2\u4fdd\u5b58\u81f3 ${toRelativePath(savePath)}`'
Patch-AllChunks -DistDir $ChunksDir -Replacements $chunkAvn4

$chunkGbv = @{}
$chunkGbv['title: "Add directory to workspace"'] = 'title: "\u6dfb\u52a0\u5de5\u4f5c\u76ee\u5f55\u5230\u5de5\u4f5c\u533a"'
$chunkGbv['children: "Claude Code will be able to read files in this directory and make edits when auto-accept edits is on."'] = 'children: "Claude Code \u53ef\u8bfb\u53d6\u6b64\u76ee\u5f55\u4e2d\u7684\u6587\u4ef6\uff0c\u5f00\u542f\u81ea\u52a8\u63a5\u53d7\u7f16\u8f91\u65f6\u53ef\u4fee\u6539\u3002"'
$chunkGbv['children: "Enter the path to the directory:"'] = 'children: "\u8f93\u5165\u76ee\u5f55\u8def\u5f84\uff1a"'
$chunkGbv['label: "Yes, for this session"'] = 'label: "\u662f\uff0c\u4ec5\u672c\u6b21\u4f1a\u8bdd"'
$chunkGbv['label: "Yes, and remember this directory"'] = 'label: "\u662f\uff0c\u5e76\u8bb0\u4f4f\u6b64\u76ee\u5f55"'
$chunkGbv['label: "No"'] = 'label: "\u5426"'
$chunkGbv['"Press "'] = '"\u6309 "'
$chunkGbv['" again to exit"'] = '" \u518d\u6b21\u9000\u51fa"'
$chunkGbv['description: "cancel"'] = 'description: "\u53d6\u6d88"'
$chunkGbv['action: "complete"'] = 'action: "\u8865\u5168"'
$chunkGbv['shortcut: "Enter",
            action: "add"'] = 'shortcut: "Enter",
            action: "\u6dfb\u52a0"'
Patch-AllChunks -DistDir $ChunksDir -Replacements $chunkGbv

$chunkDjg = @{}
$chunkDjg['"For the optimal coding experience, enable the recommended settings"'] = '"\u4e3a\u83b7\u5f97\u6700\u4f73\u7f16\u7801\u4f53\u9a8c\uff0c\u8bf7\u542f\u7528\u63a8\u8350\u8bbe\u7f6e"'
$chunkDjg['"for your terminal:"'] = '"\uff1a"'
$chunkDjg['"Shift+Enter for newlines"'] = '"Shift+Enter \u6362\u884c"'
$chunkDjg['"Option+Enter for newlines and visual bell"'] = '"Option+Enter \u6362\u884c\u5e76\u542f\u7528\u89c6\u89c9\u63d0\u793a"'
$chunkDjg['label: "Yes, use recommended settings"'] = 'label: "\u662f\uff0c\u4f7f\u7528\u63a8\u8350\u8bbe\u7f6e"'
$chunkDjg['label: "No, maybe later with /terminal-setup"'] = 'label: "\u5426\uff0c\u4e4b\u540e\u53ef\u7528 /terminal-setup"'
$chunkDjg['children: "Enter to confirm \xB7 Esc to skip"'] = 'children: "Enter \u786e\u8ba4 \xb7 Esc \u8df3\u8fc7"'
$chunkDjg['"Press "'] = '"\u6309 "'
$chunkDjg['" again to exit"'] = '" \u518d\u6b21\u9000\u51fa"'
Patch-AllChunks -DistDir $ChunksDir -Replacements $chunkDjg

$chunkN7c = @{}
$chunkN7c['DEFAULT_OUTPUT_STYLE_LABEL = "Default"'] = 'DEFAULT_OUTPUT_STYLE_LABEL = "\u9ed8\u8ba4"'
$chunkN7c['DEFAULT_OUTPUT_STYLE_DESCRIPTION = "Claude completes coding tasks efficiently and provides concise responses"'] = 'DEFAULT_OUTPUT_STYLE_DESCRIPTION = "Claude \u9ad8\u6548\u5b8c\u6210\u7f16\u7801\u4efb\u52a1\uff0c\u56de\u590d\u7b80\u6d01\u660e\u4e86"'
$chunkN7c['label: `Fast mode (${FAST_MODE_MODEL_DISPLAY} only)`'] = 'label: `\u5feb\u901f\u6a21\u5f0f\uff08\u4ec5 ${FAST_MODE_MODEL_DISPLAY}\uff09`'
Patch-AllChunks -DistDir $ChunksDir -Replacements $chunkN7c

$chunkQkh2 = @{}
$chunkQkh2['title: "3 guest passes"'] = 'title: "3 \u5f20\u8bbf\u5ba2\u901a\u884c\u8bc1"'
$chunkQkh2['"3 guest passes at /passes"'] = '"3 \u5f20\u8bbf\u5ba2\u901a\u884c\u8bc1\uff0c\u8f93\u5165 /passes"'
$chunkQkh2['title: `${unseenDivider.count} new ${plural(unseenDivider.count, "message")}`'] = 'title: `\u6709 ${unseenDivider.count} \u6761\u65b0\u6d88\u606f`'
$chunkQkh2['title: `${toggleShowAllShortcut} to show ${source_default.bold(hiddenMessageCount)} previous messages`'] = 'title: `\u6309 ${toggleShowAllShortcut} \u663e\u793a\u4e4b\u524d ${source_default.bold(hiddenMessageCount)} \u6761\u6d88\u606f`'
$chunkQkh2['title: `${toggleShowAllShortcut} to hide ${source_default.bold(hiddenMessageCount)} previous messages`'] = 'title: `\u6309 ${toggleShowAllShortcut} \u9690\u85cf\u4e4b\u524d ${source_default.bold(hiddenMessageCount)} \u6761\u6d88\u606f`'
Patch-AllChunks -DistDir $ChunksDir -Replacements $chunkQkh2

$chunkMk2b = @{}
$chunkMk2b['title: "Default"'] = 'title: "\u9ed8\u8ba4"'
$chunkMk2b['shortTitle: "Default"'] = 'shortTitle: "\u9ed8\u8ba4"'
$chunkMk2b['title: "Plan Mode"'] = 'title: "\u8ba1\u5212\u6a21\u5f0f"'
$chunkMk2b['shortTitle: "Plan"'] = 'shortTitle: "\u8ba1\u5212"'
$chunkMk2b['title: "Accept edits"'] = 'title: "\u81ea\u52a8\u63a5\u53d7\u7f16\u8f91"'
$chunkMk2b['shortTitle: "Accept"'] = 'shortTitle: "\u63a5\u53d7"'
$chunkMk2b['title: "Bypass Permissions"'] = 'title: "\u7ed5\u8fc7\u6743\u9650"'
$chunkMk2b['shortTitle: "Bypass"'] = 'shortTitle: "\u7ed5\u8fc7"'
$chunkMk2b['title: "Don''t Ask"'] = 'title: "\u4e0d\u518d\u8be2\u95ee"'
$chunkMk2b['shortTitle: "DontAsk"'] = 'shortTitle: "\u4e0d\u8be2\u95ee"'
Patch-AllChunks -DistDir $ChunksDir -Replacements $chunkMk2b

$chunkAbs2 = @{}
$chunkAbs2['title: "Try Claude Code Desktop"'] = 'title: "\u8bd5\u7528 Claude Code \u684c\u9762\u7248"'
$chunkAbs2['children: "Same Claude Code with visual diffs, live app preview, parallel sessions, and more."'] = 'children: "Claude Code \u684c\u9762\u7248\u652f\u6301\u53ef\u89c6\u5316 diff\u3001\u5b9e\u65f6\u9884\u89c8\u3001\u5e76\u884c\u4f1a\u8bdd\u7b49\u3002"'
$chunkAbs2['label: "Open in Claude Code Desktop"'] = 'label: "\u5728 Claude Code \u684c\u9762\u7248\u4e2d\u6253\u5f00"'
$chunkAbs2['label: "Not now"'] = 'label: "\u6682\u4e0d"'
$chunkAbs2['label: "Don''t ask again"'] = 'label: "\u4e0d\u518d\u8be2\u95ee"'
Patch-AllChunks -DistDir $ChunksDir -Replacements $chunkAbs2

$chunk1gaj = @{}
$chunk1gaj['label: "User agents"'] = 'label: "\u7528\u6237 agent"'
$chunk1gaj['label: "Project agents"'] = 'label: "\u9879\u76ee agent"'
$chunk1gaj['label: "Local agents"'] = 'label: "\u672c\u5730 agent"'
$chunk1gaj['label: "Managed agents"'] = 'label: "\u6258\u7ba1 agent"'
$chunk1gaj['label: "Plugin agents"'] = 'label: "\u63d2\u4ef6 agent"'
$chunk1gaj['label: "CLI arg agents"'] = 'label: "CLI \u53c2\u6570 agent"'
$chunk1gaj['label: "Built-in agents"'] = 'label: "\u5185\u7f6e agent"'
Patch-AllChunks -DistDir $ChunksDir -Replacements $chunk1gaj

$chunkAxs = @{}
$chunkAxs['title: "Submit Feedback / Bug Report"'] = 'title: "\u63d0\u4ea4\u53cd\u9988 / \u7f3a\u9677\u62a5\u544a"'
$chunkAxs['children: "Describe the issue below:"'] = 'children: "\u8bf7\u5728\u4e0b\u65b9\u63cf\u8ff0\u95ee\u9898\uff1a"'
$chunkAxs['children: "This report will include:"'] = 'children: "\u672c\u62a5\u544a\u5c06\u5305\u542b\uff1a"'
$chunkAxs['"- Your feedback / bug description:"'] = '"- \u60a8\u7684\u53cd\u9988/\u7f3a\u9677\u63cf\u8ff0\uff1a"'
$chunkAxs['"- Environment info:"'] = '"- \u73af\u5883\u4fe1\u606f\uff1a"'
$chunkAxs['"- Git repo metadata:"'] = '"- Git \u4ed3\u5e93\u5143\u6570\u636e\uff1a"'
$chunkAxs['", not synced"'] = '", \u672a\u540c\u6b65"'
$chunkAxs['", has local changes"'] = '", \u6709\u672c\u5730\u66f4\u6539"'
$chunkAxs['children: "- Current session transcript"'] = 'children: "- \u5f53\u524d\u4f1a\u8bdd\u8bb0\u5f55"'
$chunkAxs['"We will use your feedback to debug related issues or to improve"'] = '"\u6211\u4eec\u5c06\u4f7f\u7528\u60a8\u7684\u53cd\u9988\u6765\u6392\u67e5\u76f8\u5173\u95ee\u9898\u6216\u6539\u8fdb"'
$chunkAxs['"Claude Code''s functionality (eg. to reduce the risk of bugs occurring in the future)."'] = '"Claude Code \u7684\u529f\u80fd\uff08\u4f8b\u5982\u964d\u4f4e\u672a\u6765\u51fa\u73b0 bug \u7684\u6982\u7387\uff09\u3002"'
$chunkAxs['" to confirm and submit."'] = '" \u786e\u8ba4\u5e76\u63d0\u4ea4\u3002"'
$chunkAxs['children: "Submitting report\u2026"'] = 'children: "\u6b63\u5728\u63d0\u4ea4\u62a5\u544a\u2026"'
$chunkAxs['children: "Thank you for your report!"'] = 'children: "\u611f\u8c22\u60a8\u7684\u62a5\u544a\uff01"'
$chunkAxs['"Feedback ID: "'] = '"\u53cd\u9988 ID\uff1a "'
$chunkAxs['children: "to open your browser and draft a GitHub issue, or any other key to close."'] = 'children: "\u6253\u5f00\u6d4f\u89c8\u5668\u8349\u521d GitHub Issue\uff0c\u6216\u6309\u5176\u4ed6\u952e\u5173\u95ed\u3002"'
$chunkAxs['"Press "'] = '"\u6309 "'
$chunkAxs['" again to exit"'] = '" \u518d\u6b21\u9000\u51fa"'
$chunkAxs['children: "Press "'] = 'children: "\u6309 "'
$chunkAxs['description: "cancel"'] = 'description: "\u53d6\u6d88"'
$chunkAxs['action: "continue"'] = 'action: "\u7ee7\u7eed"'
$chunkAxs['action: "submit"'] = 'action: "\u63d0\u4ea4"'
Patch-AllChunks -DistDir $ChunksDir -Replacements $chunkAxs

$chunkEgfc3 = @{}
$chunkEgfc3['return "CLI argument";'] = 'return "CLI \u53c2\u6570";'
$chunkEgfc3['return "All tools";'] = 'return "\u5168\u90e8\u5de5\u5177";'
$chunkEgfc3['return "None";'] = 'return "\u65e0";'
$chunkEgfc3['return "Agent type is required";'] = 'return "Agent \u6807\u8bc6\u7b26\u4e0d\u80fd\u4e3a\u7a7a";'
$chunkEgfc3['return "Agent type must start and end with alphanumeric characters and contain only letters, numbers, and hyphens";'] = 'return "Agent \u6807\u8bc6\u7b26\u987b\u4ee5\u5b57\u6bcd\u6216\u6570\u5b57\u5f00\u5934\u548c\u7ed3\u5c3e\uff0c\u4e14\u53ea\u80fd\u5305\u542b\u5b57\u6bcd\u3001\u6570\u5b57\u548c\u8fde\u5b57\u7b26";'
$chunkEgfc3['return "Agent type must be at least 3 characters long";'] = 'return "Agent \u6807\u8bc6\u7b26\u81f3\u5c11 3 \u4e2a\u5b57\u7b26";'
$chunkEgfc3['return "Agent type must be less than 50 characters";'] = 'return "Agent \u6807\u8bc6\u7b26\u4e0d\u80fd\u8d85\u8fc7 50 \u4e2a\u5b57\u7b26";'
Patch-AllChunks -DistDir $ChunksDir -Replacements $chunkEgfc3

$chunkEf7 = @{}
$chunkEf7['children: "Suggestions"'] = 'children: "\u5efa\u8bae"'
$chunkEf7['" save ~"'] = '" \u7ea6\u53ef\u8282\u7701 ~"'
$chunkEf7['children: "Context Usage"'] = 'children: "\u4e0a\u4e0b\u6587\u7528\u91cf"'
$chunkEf7['children: "Estimated usage by category"'] = 'children: "\u6309\u7c7b\u522b\u4f30\u7b97\u7528\u91cf"'
$chunkEf7['children: " Free space: "'] = 'children: " \u5269\u4f59\u7a7a\u95f4\uff1a "'
$chunkEf7['children: "MCP tools"'] = 'children: "MCP \u5de5\u5177"'
$chunkEf7[' hasDeferredMcpTools ? " (loaded on-demand)" : ""'] = ' hasDeferredMcpTools ? " (\u6309\u9700\u52a0\u8f7d)" : ""'
$chunkEf7['children: "Loaded"'] = 'children: "\u5df2\u52a0\u8f7d"'
$chunkEf7['children: "Available"'] = 'children: "\u53ef\u7528"'
$chunkEf7['children: "Custom agents"'] = 'children: "\u81ea\u5b9a\u4e49 agent"'
$chunkEf7['children: "Memory files"'] = 'children: "\u8bb0\u5fc6\u6587\u4ef6"'
$chunkEf7['children: "Skills"'] = 'children: "\u6280\u80fd"'
$chunkEf7['children: "Tool calls: "'] = 'children: "\u5de5\u5177\u8c03\u7528\uff1a "'
$chunkEf7['children: "Tool results: "'] = 'children: "\u5de5\u5177\u7ed3\u679c\uff1a "'
$chunkEf7['children: "Attachments: "'] = 'children: "\u9644\u4ef6\uff1a "'
$chunkEf7['children: "Assistant messages (non-tool): "'] = 'children: "\u52a9\u624b\u6d88\u606f\uff08\u975e\u5de5\u5177\uff09\uff1a "'
$chunkEf7['children: "User messages (non-tool-result): "'] = 'children: "\u7528\u6237\u6d88\u606f\uff08\u975e\u5de5\u5177\u7ed3\u679c\uff09\uff1a "'
$chunkEf7['title: "Autocompact is disabled"'] = 'title: "\u5df2\u7981\u7528\u81ea\u52a8\u538b\u7f29"'
$chunkEf7['title: `Context is ${data.percentage}% full`'] = 'title: `\u4e0a\u4e0b\u6587\u5df2\u4f7f\u7528 ${data.percentage}%`'
$chunkEf7['detail: "Without autocompact, you will hit context limits and lose the conversation. Enable it in /config or use /compact manually."'] = 'detail: "\u672a\u542f\u7528\u81ea\u52a8\u538b\u7f29\u65f6\u4f1a\u89e6\u53bb\u4e0a\u9650\u5e76\u4e22\u5931\u5bf9\u8bdd\u3002\u5728 /config \u4e2d\u542f\u7528\u6216\u624b\u52a8\u8fd0\u884c /compact\u3002"'
$chunkEf7['detail: data.isAutoCompactEnabled ? "Autocompact will trigger soon, which discards older messages. Use /compact now to control what gets kept." : "Autocompact is disabled. Use /compact to free space, or enable autocompact in /config."'] = 'detail: data.isAutoCompactEnabled ? "\u5373\u5c06\u89e6\u53d1\u81ea\u52a8\u538b\u7f29\uff0c\u65e7\u6d88\u606f\u5c06\u88ab\u820d\u5f03\u3002\u73b0\u5728\u8fd0\u884c /compact \u53ef\u63a7\u5236\u4fdd\u7559\u5185\u5bb9\u3002" : "\u5df2\u7981\u7528\u81ea\u52a8\u538b\u7f29\u3002\u8fd0\u884c /compact \u91ca\u653e\u7a7a\u95f4\uff0c\u6216\u5728 /config \u4e2d\u542f\u7528\u3002"'
$chunkEf7['detail: "Pipe output through head, tail, or grep to reduce result size. Avoid cat on large files \u2014 use Read with offset/limit instead."'] = 'detail: "\u7528 head\u3001tail \u6216 grep \u8fc7\u6ee4\u8f93\u51fa\u4ee5\u51cf\u5c0f\u7ed3\u679c\u3002\u5927\u6587\u4ef6\u52ff\u7528 cat\uff0c\u6539\u7528 Read \u7684 offset/limit\u3002"'
$chunkEf7['detail: "Use offset and limit parameters to read only the sections you need. Avoid re-reading entire files when you only need a few lines."'] = 'detail: "\u4f7f\u7528 offset \u548c limit \u53ea\u8bfb\u53d6\u6240\u9700\u90e8\u5206\u3002\u53ea\u9700\u51e0\u884c\u65f6\u52ff\u91cd\u590d\u8bfb\u6574\u4e2a\u6587\u4ef6\u3002"'
$chunkEf7['detail: "Add more specific patterns or use the glob or type parameter to narrow file types. Consider Glob for file discovery instead of Grep."'] = 'detail: "\u4f7f\u7528\u66f4\u5177\u4f53\u7684\u6a21\u5f0f\u6216 glob/type \u7f29\u5c0f\u8303\u56f4\u3002\u53d1\u73b0\u6587\u4ef6\u53ef\u4f18\u5148\u7528 Glob \u800c\u975e Grep\u3002"'
$chunkEf7['detail: "Web page content can be very large. Consider extracting only the specific information needed."'] = 'detail: "\u7f51\u9875\u5185\u5bb9\u53ef\u80fd\u5f88\u5927\uff0c\u5c3d\u91cf\u53ea\u63d0\u53d6\u6240\u9700\u4fe1\u606f\u3002"'
$chunkEf7['detail: `This tool is consuming a significant portion of context.`'] = 'detail: `\u6b64\u5de5\u5177\u5360\u7528\u4e86\u8f83\u591a\u4e0a\u4e0b\u6587\u3002`'
$chunkEf7['detail: "If you are re-reading files, consider referencing earlier reads. Use offset/limit for large files."'] = 'detail: "\u82e5\u91cd\u590d\u8bfb\u6587\u4ef6\uff0c\u53ef\u5f15\u7528\u65e9\u5148\u7684\u8bfb\u53d6\u7ed3\u679c\u3002\u5927\u6587\u4ef6\u8bf7\u7528 offset/limit\u3002"'
$chunkEf7['detail: `Largest: ${largestFiles}. Use /memory to review and prune stale entries.`'] = 'detail: `\u6700\u5927\uff1a${largestFiles}\u3002\u4f7f\u7528 /memory \u67e5\u770b\u5e76\u6e05\u7406\u8fc7\u671f\u6761\u76ee\u3002`'
$chunkEf7['title: `Bash results using ${tokenStr} tokens (${percent.toFixed(0)}%)`'] = 'title: `Bash \u7ed3\u679c\u5360\u7528 ${tokenStr} tokens\uff08${percent.toFixed(0)}%\uff09`'
$chunkEf7['title: `Read results using ${tokenStr} tokens (${percent.toFixed(0)}%)`'] = 'title: `\u8bfb\u53d6\u7ed3\u679c\u5360\u7528 ${tokenStr} tokens\uff08${percent.toFixed(0)}%\uff09`'
$chunkEf7['title: `Grep results using ${tokenStr} tokens (${percent.toFixed(0)}%)`'] = 'title: `Grep \u7ed3\u679c\u5360\u7528 ${tokenStr} tokens\uff08${percent.toFixed(0)}%\uff09`'
$chunkEf7['title: `WebFetch results using ${tokenStr} tokens (${percent.toFixed(0)}%)`'] = 'title: `WebFetch \u7ed3\u679c\u5360\u7528 ${tokenStr} tokens\uff08${percent.toFixed(0)}%\uff09`'
$chunkEf7['title: `${toolName} using ${tokenStr} tokens (${percent.toFixed(0)}%)`'] = 'title: `${toolName} \u5360\u7528 ${tokenStr} tokens\uff08${percent.toFixed(0)}%\uff09`'
$chunkEf7['title: `File reads using ${formatTokens(readTool.resultTokens)} tokens (${readPercent.toFixed(0)}%)`'] = 'title: `\u6587\u4ef6\u8bfb\u53d6\u5360\u7528 ${formatTokens(readTool.resultTokens)} tokens\uff08${readPercent.toFixed(0)}%\uff09`'
$chunkEf7['title: `Memory files using ${formatTokens(totalMemoryTokens)} tokens (${memoryPercent.toFixed(0)}%)`'] = 'title: `\u8bb0\u5fc6\u6587\u4ef6\u5360\u7528 ${formatTokens(totalMemoryTokens)} tokens\uff08${memoryPercent.toFixed(0)}%\uff09`'
Patch-AllChunks -DistDir $ChunksDir -Replacements $chunkEf7

$chunkDjg2 = @{}
$chunkDjg2['children: "Checking connectivity..."'] = 'children: "\u6b63\u5728\u68c0\u67e5\u8fde\u63a5\u2026"'
$chunkDjg2['children: "Unable to connect to Anthropic services"'] = 'children: "\u65e0\u6cd5\u8fde\u63a5 Anthropic \u670d\u52a1"'
$chunkDjg2['helpText: "To change this later, run /theme"'] = 'helpText: "\u4e4b\u540e\u53ef\u7528 /theme \u66f4\u6539"'
$chunkDjg2['children: "Security notes:"'] = 'children: "\u5b89\u5168\u63d0\u793a\uff1a"'
$chunkDjg2['children: "Claude can make mistakes"'] = 'children: "Claude \u53ef\u80fd\u4f1a\u51fa\u9519"'
$chunkDjg2['"You should always review Claude''s responses, especially when"'] = '"\u8bf7\u59cb\u7ec8\u68c0\u67e5 Claude \u7684\u56de\u590d\uff0c\u5c24\u5176\u662f"'
$chunkDjg2['"running code."'] = '"\u8fd0\u884c\u4ee3\u7801\u65f6\u3002"'
$chunkDjg2['children: "Due to prompt injection risks, only use it with code you trust"'] = 'children: "\u7531\u4e8e\u63d0\u793a\u6ce8\u5165\u98ce\u9669\uff0c\u8bf7\u53ea\u5728\u4fe1\u4efb\u7684\u4ee3\u7801\u4e0a\u4f7f\u7528"'
$chunkDjg2['"For more details see:"'] = '"\u8be6\u89c1\uff1a"'
$chunkDjg2['children: "Use Claude Code''s terminal setup?"'] = 'children: "\u662f\u5426\u914d\u7f6e Claude Code \u7ec8\u7aef\uff1f"'
$chunkDjg2['"For the optimal coding experience, enable the recommended settings"'] = '"\u4e3a\u83b7\u5f97\u6700\u4f73\u7f16\u7801\u4f53\u9a8c\uff0c\u8bf7\u542f\u7528\u63a8\u8350\u8bbe\u7f6e"'
Patch-AllChunks -DistDir $ChunksDir -Replacements $chunkDjg2

$chunkAvn5 = @{}
$chunkAvn5['return "Unknown reason"'] = 'return "\u672a\u77e5\u539f\u56e0"'
Patch-AllChunks -DistDir $ChunksDir -Replacements $chunkAvn5

$chunkAvn6 = New-ReplacementMap
$chunkAvn6['children: "not set"'] = 'children: "\u672a\u8bbe\u7f6e"'
$chunkAvn6['placeholder: question.multiSelect ? "Type something" : "Type something."'] = 'placeholder: question.multiSelect ? "\u8f93\u5165\u5185\u5bb9" : "\u8f93\u5165\u5185\u5bb9\u3002"'
$chunkAvn6['placeholder: `Type something\u2026`'] = 'placeholder: `\u8f93\u5165\u5185\u5bb9\u2026`'
$chunkAvn6['action: "navigate"'] = 'action: "\u5bfc\u822a"'
$chunkAvn6['action: "unset"'] = 'action: "\u6e05\u9664"'
$chunkAvn6['action: "toggle"'] = 'action: "\u5207\u6362"'
$chunkAvn6['action: "expand"'] = 'action: "\u5c55\u5f00"'
$chunkAvn6['action: "select"'] = 'action: "\u9009\u62e9"'
$chunkAvn6['action: "confirm"'] = 'action: "\u786e\u8ba4"'
$chunkAvn6['description: "cancel"'] = 'description: "\u53d6\u6d88"'
Patch-AllChunks -DistDir $ChunksDir -Replacements $chunkAvn6

$chunkAvn7 = New-ReplacementMap
$chunkAvn7['action: "switch"'] = 'action: "\u5207\u6362"'
$chunkAvn7['description: "exit"'] = 'description: "\u9000\u51fa"'
$chunkAvn7['description: "search history"'] = 'description: "\u641c\u7d22\u5386\u53f2"'
$chunkAvn7['description: "send message"'] = 'description: "\u53d1\u9001\u6d88\u606f"'
$chunkAvn7['description: status ? `send message \xB7 ${status}` : "send message"'] = 'description: status ? `\u53d1\u9001\u6d88\u606f \xb7 ${status}` : "\u53d1\u9001\u6d88\u606f"'
$chunkAvn7['action: "cycle"'] = 'action: "\u5207\u6362"'
$chunkAvn7['description: "stash"'] = 'description: "\u6682\u5b58"'
$chunkAvn7['"Tip:"'] = '"\u63d0\u793a\uff1a"'
Patch-AllChunks -DistDir $ChunksDir -Replacements $chunkAvn7

$chunkAvn8 = New-ReplacementMap
$chunkAvn8['warning: "Note: may discard uncommitted changes"'] = 'warning: "\u6ce8\u610f\uff1a\u53ef\u80fd\u4e22\u5f03\u672a\u63d0\u4ea4\u7684\u66f4\u6539"'
$chunkAvn8['warning: "Note: may overwrite remote history"'] = 'warning: "\u6ce8\u610f\uff1a\u53ef\u80fd\u8986\u76d6\u8fdc\u7a0b\u5386\u53f2"'
$chunkAvn8['warning: "Note: may permanently delete untracked files"'] = 'warning: "\u6ce8\u610f\uff1a\u53ef\u80fd\u6c38\u4e45\u5220\u9664\u672a\u8ddf\u8e2a\u6587\u4ef6"'
$chunkAvn8['warning: "Note: may discard all working tree changes"'] = 'warning: "\u6ce8\u610f\uff1a\u53ef\u80fd\u4e22\u5f03\u6240\u6709\u5de5\u4f5c\u533a\u66f4\u6539"'
$chunkAvn8['warning: "Note: may permanently remove stashed changes"'] = 'warning: "\u6ce8\u610f\uff1a\u53ef\u80fd\u6c38\u4e45\u6e05\u9664 stash"'
$chunkAvn8['warning: "Note: may force-delete a branch"'] = 'warning: "\u6ce8\u610f\uff1a\u53ef\u80fd\u5f3a\u5236\u5220\u9664\u5206\u652f"'
$chunkAvn8['warning: "Note: may skip safety hooks"'] = 'warning: "\u6ce8\u610f\uff1a\u53ef\u80fd\u8df3\u8fc7\u5b89\u5168\u94a9\u5b50"'
$chunkAvn8['warning: "Note: may rewrite the last commit"'] = 'warning: "\u6ce8\u610f\uff1a\u53ef\u80fd\u6539\u5199\u6700\u540e\u4e00\u6b21\u63d0\u4ea4"'
$chunkAvn8['warning: "Note: may recursively force-remove files"'] = 'warning: "\u6ce8\u610f\uff1a\u53ef\u80fd\u9012\u5f52\u5f3a\u5236\u5220\u9664\u6587\u4ef6"'
$chunkAvn8['warning: "Note: may recursively remove files"'] = 'warning: "\u6ce8\u610f\uff1a\u53ef\u80fd\u9012\u5f52\u5220\u9664\u6587\u4ef6"'
$chunkAvn8['warning: "Note: may force-remove files"'] = 'warning: "\u6ce8\u610f\uff1a\u53ef\u80fd\u5f3a\u5236\u5220\u9664\u6587\u4ef6"'
$chunkAvn8['warning: "Note: may drop or truncate database objects"'] = 'warning: "\u6ce8\u610f\uff1a\u53ef\u80fd\u5220\u9664\u6216\u622a\u65ad\u6570\u636e\u5e93\u5bf9\u8c61"'
$chunkAvn8['warning: "Note: may delete all rows from a database table"'] = 'warning: "\u6ce8\u610f\uff1a\u53ef\u80fd\u5220\u9664\u6570\u636e\u5e93\u8868\u5168\u90e8\u884c"'
$chunkAvn8['warning: "Note: may delete Kubernetes resources"'] = 'warning: "\u6ce8\u610f\uff1a\u53ef\u80fd\u5220\u9664 Kubernetes \u8d44\u6e90"'
$chunkAvn8['warning: "Note: may destroy Terraform infrastructure"'] = 'warning: "\u6ce8\u610f\uff1a\u53ef\u80fd\u9500\u6bc1 Terraform \u57fa\u7840\u8bbe\u65bd"'
$chunkAvn8['warning: "Note: may clear content of multiple files"'] = 'warning: "\u6ce8\u610f\uff1a\u53ef\u80fd\u6e05\u7a7a\u591a\u4e2a\u6587\u4ef6\u5185\u5bb9"'
$chunkAvn8['warning: "Note: may format a disk volume"'] = 'warning: "\u6ce8\u610f\uff1a\u53ef\u80fd\u683c\u5f0f\u5316\u78c1\u76d8\u5377"'
$chunkAvn8['warning: "Note: may clear a disk"'] = 'warning: "\u6ce8\u610f\uff1a\u53ef\u80fd\u6e05\u7a7a\u78c1\u76d8"'
$chunkAvn8['warning: "Note: will shut down the computer"'] = 'warning: "\u6ce8\u610f\uff1a\u5c06\u5173\u95ed\u8ba1\u7b97\u673a"'
$chunkAvn8['warning: "Note: will restart the computer"'] = 'warning: "\u6ce8\u610f\uff1a\u5c06\u91cd\u542f\u8ba1\u7b97\u673a"'
$chunkAvn8['warning: "Note: permanently deletes recycled files"'] = 'warning: "\u6ce8\u610f\uff1a\u5c06\u6c38\u4e45\u5220\u9664\u56de\u6536\u7ad9\u6587\u4ef6"'
$chunkAvn8['children: "Viewing "'] = 'children: "\u6b63\u5728\u67e5\u770b "'
$chunkAvn8['action: "return"'] = 'action: "\u8fd4\u56de"'
$chunkAvn8['" remote"'] = '" \u8fdc\u7a0b"'
$chunkAvn8['action: "copy"'] = 'action: "\u590d\u5236"'
$chunkAvn8['action: "native select"'] = 'action: "\u6846\u9009"'
$chunkAvn8['action: "view tasks"'] = 'action: "\u67e5\u770b\u4efb\u52a1"'
$chunkAvn8['action: "manage"'] = 'action: "\u7ba1\u7406"'
$chunkAvn8['action: "interrupt"'] = 'action: "\u4e2d\u65ad"'
$chunkAvn8['action: "stop agents"'] = 'action: "\u505c\u6b62 agent"'
$chunkAvn8['" on"'] = '" \u5df2\u5f00\u542f"'
$chunkAvn8['"hold "'] = '"\u6309\u4f4f "'
$chunkAvn8['" to speak"'] = '" \u8bf4\u8bdd"'
Patch-AllChunks -DistDir $ChunksDir -Replacements $chunkAvn8

$chunkAvn9 = @{}
$chunkAvn9['action: "return to team lead"'] = 'action: "\u8fd4\u56de\u961f\u957f"'
Patch-AllChunks -DistDir $ChunksDir -Replacements $chunkAvn9

$chunkTg = @{}
$chunkTg['children: "Keybinding Configuration Issues"'] = 'children: "\u5feb\u6377\u952e\u914d\u7f6e\u95ee\u9898"'
$chunkTg['children: "Location: "'] = 'children: "\u4f4d\u7f6e\uff1a "'
$chunkTg['children: "[Error]"'] = 'children: "[\u9519\u8bef]"'
$chunkTg['children: "[Warning]"'] = 'children: "[\u8b66\u544a]"'
$chunkTg['children: "Sandbox"'] = 'children: "\u6c99\u7bb1"'
$chunkTg['const statusText = hasErrors ? "Missing dependencies" : "Available (with warnings)";'] = 'const statusText = hasErrors ? "\u7f3a\u5c11\u4f9d\u8d56" : "\u53ef\u7528\uff08\u6709\u8b66\u544a\uff09";'
$chunkTg['"\u2514 Status: "'] = '"\u2514 \u72b6\u6001\uff1a "'
$chunkTg['children: "\u2514 Run /sandbox for install instructions"'] = 'children: "\u2514 \u8fd0\u884c /sandbox \u67e5\u770b\u5b89\u88c5\u8bf4\u660e"'
$chunkTg['children: "Checking installation status\u2026"'] = 'children: "\u6b63\u5728\u68c0\u67e5\u5b89\u88c5\u72b6\u6001\u2026"'
$chunkTg['children: "Diagnostics"'] = 'children: "\u8bca\u65ad"'
$chunkTg['"\u2514 Currently running: "'] = '"\u2514 \u5f53\u524d\u8fd0\u884c\uff1a "'
$chunkTg['"\u2514 Package manager: "'] = '"\u2514 \u5305\u7ba1\u7406\u5668\uff1a "'
$chunkTg['"\u2514 Path: "'] = '"\u2514 \u8def\u5f84\uff1a "'
$chunkTg['"\u2514 Invoked: "'] = '"\u2514 \u8c03\u7528\u8def\u5f84\uff1a "'
$chunkTg['"\u2514 Config install method: "'] = '"\u2514 \u914d\u7f6e\u5b89\u88c5\u65b9\u5f0f\uff1a "'
$chunkTg['"\u2514 Search: "'] = '"\u2514 \u641c\u7d22\uff1a "'
$chunkTg[': "Not working"'] = ': "\u4e0d\u53ef\u7528"'
$chunkTg['"Recommendation: "'] = '"\u5efa\u8bae\uff1a "'
$chunkTg['children: "Warning: Multiple installations found"'] = 'children: "\u8b66\u544a\uff1a\u68c0\u6d4b\u5230\u591a\u4e2a\u5b89\u88c5"'
$chunkTg['" at "'] = '" \u4e8e "'
$chunkTg['"Warning: "'] = '"\u8b66\u544a\uff1a "'
$chunkTg['"Fix: "'] = '"\u4fee\u590d\uff1a "'
$chunkTg['children: "Invalid Settings"'] = 'children: "\u65e0\u6548\u8bbe\u7f6e"'
$chunkTg['children: "Updates"'] = 'children: "\u66f4\u65b0"'
$chunkTg['"\u2514 Auto-updates:"'] = '"\u2514 \u81ea\u52a8\u66f4\u65b0\uff1a"'
$chunkTg['"Managed by package manager"'] = '"\u7531\u5305\u7ba1\u7406\u5668\u7ba1\u7406"'
$chunkTg['"\u2514 Update permissions:"'] = '"\u2514 \u66f4\u65b0\u6743\u9650\uff1a"'
$chunkTg['"No (requires sudo)"'] = '"\u5426\uff08\u9700\u8981 sudo\uff09"'
$chunkTg['? "Yes" : "No (requires sudo)"'] = '? "\u662f" : "\u5426\uff08\u9700\u8981 sudo\uff09"'
$chunkTg['diagnostic.hasUpdatePermissions ? "Yes" : "\u5426\uff08\u9700\u8981 sudo\uff09"'] = 'diagnostic.hasUpdatePermissions ? "\u662f" : "\u5426\uff08\u9700\u8981 sudo\uff09"'
$chunkTg['"\u2514 Auto-update channel: "'] = '"\u2514 \u81ea\u52a8\u66f4\u65b0\u6e20\u9053\uff1a "'
$chunkTg['children: "Environment Variables"'] = 'children: "\u73af\u5883\u53d8\u91cf"'
$chunkTg['children: "Version Locks"'] = 'children: "\u7248\u672c\u9501\u5b9a"'
$chunkTg['"\u2514 Cleaned "'] = '"\u2514 \u5df2\u6e05\u7406 "'
$chunkTg['" stale lock(s)"'] = '" \u4e2a\u8fc7\u671f\u9501"'
$chunkTg['children: "\u2514 No active version locks"'] = 'children: "\u2514 \u65e0\u6d3b\u52a8\u7248\u672c\u9501"'
$chunkTg['children: "(running)"'] = 'children: "(\u8fd0\u884c\u4e2d)"'
$chunkTg['children: "(stale)"'] = 'children: "(\u8fc7\u671f)"'
$chunkTg['children: "Agent Parse Errors"'] = 'children: "Agent \u89e3\u6790\u9519\u8bef"'
$chunkTg['"\u2514 Failed to parse "'] = '"\u2514 \u89e3\u6790\u5931\u8d25 "'
$chunkTg['" agent file(s):"'] = '" \u4e2a agent \u6587\u4ef6\uff1a"'
$chunkTg['children: "Plugin Errors"'] = 'children: "\u63d2\u4ef6\u9519\u8bef"'
$chunkTg['" plugin error(s) detected:"'] = '" \u4e2a\u63d2\u4ef6\u9519\u8bef\uff1a"'
$chunkTg['children: "Unreachable Permission Rules"'] = 'children: "\u4e0d\u53ef\u8fbe\u7684\u6743\u9650\u89c4\u5219"'
$chunkTg['children: "Context Usage Warnings"'] = 'children: "\u4e0a\u4e0b\u6587\u7528\u91cf\u8b66\u544a"'
$chunkTg['"\u2514 Files:"'] = '"\u2514 \u6587\u4ef6\uff1a"'
$chunkTg['"\u2514 Top contributors:"'] = '"\u2514 \u4e3b\u8981\u8d21\u732e\uff1a"'
$chunkTg['"\u2514 MCP servers:"'] = '"\u2514 MCP \u670d\u52a1\u5668\uff1a"'
$chunkTg['onDone("Claude Code diagnostics dismissed"'] = 'onDone("\u5df2\u5173\u95ed Claude Code \u8bca\u65ad"'
Patch-AllChunks -DistDir $ChunksDir -Replacements $chunkTg

$chunkQkh3 = @{}
$chunkQkh3['children: " Voice mode is now available \xB7 /voice to enable"'] = 'children: " \u8bed\u97f3\u6a21\u5f0f\u73b0\u5df2\u53ef\u7528 \xb7 /voice \u542f\u7528"'
Patch-AllChunks -DistDir $ChunksDir -Replacements $chunkQkh3

$chunkMa1 = @{}
$chunkMa1['" Hooks Restricted by Policy"'] = '" Hooks \u53d7\u7b56\u7565\u9650\u5236"'
$chunkMa1['children: "Only hooks from managed settings can run. User-defined hooks from ~/.claude/settings.json, .claude/settings.json, and .claude/settings.local.json are blocked."'] = 'children: "\u4ec5\u6258\u7ba1\u8bbe\u7f6e\u4e2d\u7684 hooks \u53ef\u8fd0\u884c\u3002\u6765\u81ea ~/.claude/settings.json\u3001.claude/settings.json \u548c .claude/settings.local.json \u7684\u7528\u6237 hooks \u5df2\u88ab\u963b\u6b62\u3002"'
$chunkMa1['" This menu is read-only. To add or modify hooks, edit settings.json directly or ask Claude."'] = '" \u6b64\u83dc\u5355\u4e3a\u53ea\u8bfb\u3002\u8981\u6dfb\u52a0\u6216\u4fee\u6539 hooks\uff0c\u8bf7\u76f4\u63a5\u7f16\u8f91 settings.json \u6216\u8be2\u95ee Claude\u3002"'
$chunkMa1['children: "Learn more"'] = 'children: "\u4e86\u89e3\u66f4\u591a"'
$chunkMa1['children: "No hooks configured for this event."'] = 'children: "\u6b64\u4e8b\u4ef6\u672a\u914d\u7f6e hooks\u3002"'
$chunkMa1['children: "To add hooks, edit settings.json directly or ask Claude."'] = 'children: "\u8981\u6dfb\u52a0 hooks\uff0c\u8bf7\u76f4\u63a5\u7f16\u8f91 settings.json \u6216\u8be2\u95ee Claude\u3002"'
$chunkMa1['children: "Esc to close"'] = 'children: "Esc \u5173\u95ed"'
$chunkMa1['title: "Hook Configuration - Disabled"'] = 'title: "Hook \u914d\u7f6e - \u5df2\u7981\u7528"'
$chunkMa1['"All hooks are currently "'] = '"\u6240\u6709 hooks \u5f53\u524d"'
$chunkMa1['children: "disabled"'] = 'children: "\u5df2\u7981\u7528"'
$chunkMa1['disabledByPolicy && " by a managed settings file"'] = 'disabledByPolicy && " \u7531\u6258\u7ba1\u8bbe\u7f6e\u6587\u4ef6\u7981\u7528"'
$chunkMa1['". You have"'] = '"\u3002\u5171"'
$chunkMa1['" configured",
                  " ",
                  plural(totalHooksCount, "hook"),
                  " that",
                  " ",
                  plural(totalHooksCount, "is", "are"),
                  " not running."'] = '" \u4e2a hook\uff0c",
                  " ",
                  plural(totalHooksCount, "\u5747", "\u5747"),
                  " \u672a\u8fd0\u884c\u3002"'
$chunkMa1['" \u4e2a hook",
                  " ",
                  ""
                  "\uff0c",'] = '" \u4e2a hook\uff0c",'
$chunkMa1['children: "When hooks are disabled:"'] = 'children: "hooks \u7981\u7528\u65f6\uff1a"'
$chunkMa1['children: "\xB7 No hook commands will execute"'] = 'children: "\xb7 \u4e0d\u4f1a\u6267\u884c\u4efb\u4f55 hook \u547d\u4ee4"'
$chunkMa1['children: "\xB7 StatusLine will not be displayed"'] = 'children: "\xb7 \u4e0d\u663e\u793a\u72b6\u6001\u884c"'
$chunkMa1['children: "\xB7 Tool operations will proceed without hook validation"'] = 'children: "\xb7 \u5de5\u5177\u64cd\u4f5c\u5c06\u8df3\u8fc7 hook \u9a8c\u8bc1"'
$chunkMa1["children: 'To re-enable hooks, remove `"disableAllHooks`" from settings.json or ask Claude.'"] = "children: '\u8981\u91cd\u65b0\u542f\u7528 hooks\uff0c\u8bf7\u4ece settings.json \u79fb\u9664 `"disableAllHooks`" \u6216\u8be2\u95ee Claude\u3002'"
$chunkMa1['children: "To modify or remove this hook, edit settings.json directly or ask Claude to help."'] = 'children: "\u8981\u4fee\u6539\u6216\u79fb\u9664\u6b64 hook\uff0c\u8bf7\u76f4\u63a5\u7f16\u8f91 settings.json \u6216\u8be2\u95ee Claude\u3002"'
$chunkMa1['const subtitle = `${totalHooksCount} ${plural(totalHooksCount, "hook")} configured`;'] = 'const subtitle = `\u5df2\u914d\u7f6e ${totalHooksCount} \u4e2a hook`;'
Patch-AllChunks -DistDir $ChunksDir -Replacements $chunkMa1

$chunkJfw = @{}
$chunkJfw['children: "Manage permissions"'] = 'children: "\u7ba1\u7406\u6743\u9650"'
$chunkJfw['children: "Reconnect extension"'] = 'children: "\u91cd\u65b0\u8fde\u63a5\u6269\u5c55"'
$chunkJfw['children: "Claude in Chrome works with the Chrome extension to let you control your browser directly from Claude Code. Navigate websites, fill forms, capture screenshots, record GIFs, and debug with console logs and network requests."'] = 'children: "Claude in Chrome \u914d\u5408 Chrome \u6269\u5c55\uff0c\u53ef\u4ece Claude Code \u76f4\u63a5\u63a7\u5236\u6d4f\u89c8\u5668\u3002\u6d4f\u89c8\u7f51\u9875\u3001\u586b\u5199\u8868\u5355\u3001\u622a\u56fe\u3001\u5f55\u5236 GIF\uff0c\u4ee5\u53ca\u901a\u8fc7\u63a7\u5236\u53f0\u65e5\u5fd7\u548c\u7f51\u7edc\u8bf7\u6c42\u8c03\u8bd5\u3002"'
$chunkJfw['children: "Claude in Chrome is not supported in WSL at this time."'] = 'children: "Claude in Chrome \u6682\u4e0d\u652f\u6301 WSL\u3002"'
$chunkJfw['children: "Claude in Chrome requires a claude.ai subscription."'] = 'children: "Claude in Chrome \u9700\u8981 claude.ai \u8ba2\u9605\u3002"'
$chunkJfw['children: "Enabled"'] = 'children: "\u5df2\u542f\u7528"'
$chunkJfw['children: "Disabled"'] = 'children: "\u5df2\u7981\u7528"'
$chunkJfw['children: "Installed"'] = 'children: "\u5df2\u5b89\u88c5"'
$chunkJfw['children: "Not detected"'] = 'children: "\u672a\u68c0\u6d4b\u5230"'
$chunkJfw['children: "Usage: "'] = 'children: "\u7528\u6cd5\uff1a "'
$chunkJfw['children: "Site-level permissions are inherited from the Chrome extension. Manage permissions in the Chrome extension settings to control which sites Claude can browse, click, and type on."'] = 'children: "\u7ad9\u70b9\u6743\u9650\u6765\u81ea Chrome \u6269\u5c55\u3002\u5728\u6269\u5c55\u8bbe\u7f6e\u4e2d\u7ba1\u7406\u6743\u9650\uff0c\u63a7\u5236 Claude \u53ef\u6d4f\u89c8\u3001\u70b9\u51fb\u548c\u8f93\u5165\u7684\u7f51\u7ad9\u3002"'
$chunkJfw['children: "Learn more: https://code.claude.com/docs/en/chrome"'] = 'children: "\u4e86\u89e3\u66f4\u591a\uff1a https://code.claude.com/docs/en/chrome"'
Patch-AllChunks -DistDir $ChunksDir -Replacements $chunkJfw

$chunkMa2 = @{}
$chunkMa2['summary: "Before tool execution"'] = 'summary: "\u5de5\u5177\u6267\u884c\u524d"'
$chunkMa2['summary: "After tool execution"'] = 'summary: "\u5de5\u5177\u6267\u884c\u540e"'
$chunkMa2['summary: "After tool execution fails"'] = 'summary: "\u5de5\u5177\u6267\u884c\u5931\u8d25\u540e"'
$chunkMa2['summary: "After auto mode classifier denies a tool call"'] = 'summary: "\u81ea\u52a8\u6a21\u5f0f\u5206\u7c7b\u5668\u62d2\u7edd\u5de5\u5177\u8c03\u7528\u540e"'
$chunkMa2['summary: "When notifications are sent"'] = 'summary: "\u53d1\u9001\u901a\u77e5\u65f6"'
$chunkMa2['summary: "When the user submits a prompt"'] = 'summary: "\u7528\u6237\u63d0\u4ea4\u63d0\u793a\u65f6"'
$chunkMa2['summary: "When a new session is started"'] = 'summary: "\u65b0\u4f1a\u8bdd\u542f\u52a8\u65f6"'
$chunkMa2['summary: "Right before Claude concludes its response"'] = 'summary: "Claude \u7ed3\u675f\u56de\u590d\u524d"'
$chunkMa2['summary: "When the turn ends due to an API error"'] = 'summary: "API \u9519\u8bef\u5bfc\u81f4\u56de\u5408\u7ed3\u675f\u65f6"'
$chunkMa2['summary: "When a subagent (Agent tool call) is started"'] = 'summary: "\u5b50 agent\uff08Agent \u5de5\u5177\u8c03\u7528\uff09\u542f\u52a8\u65f6"'
$chunkMa2['summary: "Right before a subagent (Agent tool call) concludes its response"'] = 'summary: "\u5b50 agent\uff08Agent \u5de5\u5177\u8c03\u7528\uff09\u7ed3\u675f\u56de\u590d\u524d"'
$chunkMa2['summary: "Before conversation compaction"'] = 'summary: "\u5bf9\u8bdd\u538b\u7f29\u524d"'
$chunkMa2['summary: "After conversation compaction"'] = 'summary: "\u5bf9\u8bdd\u538b\u7f29\u540e"'
$chunkMa2['summary: "When a session is ending"'] = 'summary: "\u4f1a\u8bdd\u7ed3\u675f\u65f6"'
$chunkMa2['summary: "When a permission dialog is displayed"'] = 'summary: "\u663e\u793a\u6743\u9650\u5bf9\u8bdd\u6846\u65f6"'
$chunkMa2['summary: "Repo setup hooks for init and maintenance"'] = 'summary: "\u4ed3\u5e93 init \u4e0e maintenance \u8bbe\u7f6e hooks"'
$chunkMa2['summary: "When a teammate is about to go idle"'] = 'summary: "\u961f\u53cb\u5373\u5c06\u7a7a\u95f2\u65f6"'
$chunkMa2['summary: "When a task is being created"'] = 'summary: "\u521b\u5efa\u4efb\u52a1\u65f6"'
$chunkMa2['summary: "When a task is being marked as completed"'] = 'summary: "\u6807\u8bb0\u4efb\u52a1\u5b8c\u6210\u65f6"'
$chunkMa2['summary: "When an MCP server requests user input (elicitation)"'] = 'summary: "MCP \u670d\u52a1\u5668\u8bf7\u6c42\u7528\u6237\u8f93\u5165\uff08elicitation\uff09\u65f6"'
$chunkMa2['summary: "After a user responds to an MCP elicitation"'] = 'summary: "\u7528\u6237\u54cd\u5e94 MCP elicitation \u540e"'
$chunkMa2['summary: "When configuration files change during a session"'] = 'summary: "\u4f1a\u8bdd\u4e2d\u914d\u7f6e\u6587\u4ef6\u53d8\u66f4\u65f6"'
$chunkMa2['summary: "When an instruction file (CLAUDE.md or rule) is loaded"'] = 'summary: "\u52a0\u8f7d\u6307\u4ee4\u6587\u4ef6\uff08CLAUDE.md \u6216 rule\uff09\u65f6"'
$chunkMa2['summary: "Create an isolated worktree for VCS-agnostic isolation"'] = 'summary: "\u521b\u5efa\u72ec\u7acb worktree\uff08\u4e0e VCS \u65e0\u5173\uff09"'
$chunkMa2['summary: "Remove a previously created worktree"'] = 'summary: "\u79fb\u9664\u6b64\u524d\u521b\u5efa\u7684 worktree"'
$chunkMa2['summary: "After the working directory changes"'] = 'summary: "\u5de5\u4f5c\u76ee\u5f55\u53d8\u66f4\u540e"'
$chunkMa2['summary: "When a watched file changes"'] = 'summary: "\u76d1\u89c6\u6587\u4ef6\u53d8\u66f4\u65f6"'
$chunkMa2['title: "Hook details"'] = 'title: "Hook \u8be6\u60c5"'
$chunkMa2['"Event: "'] = '"\u4e8b\u4ef6\uff1a "'
$chunkMa2['"Matcher: "'] = '"\u5339\u914d\u5668\uff1a "'
$chunkMa2['"(all)"'] = '"\uff08\u5168\u90e8\uff09"'
$chunkMa2['"Type: "'] = '"\u7c7b\u578b\uff1a "'
$chunkMa2['"Source:"'] = '"\u6765\u6e90\uff1a"'
$chunkMa2['"Plugin: "'] = '"\u63d2\u4ef6\uff1a "'
$chunkMa2['"Status message:"'] = '"\u72b6\u6001\u6d88\u606f\uff1a"'
$chunkMa2['return "Command";'] = 'return "\u547d\u4ee4";'
$chunkMa2['return "Prompt";'] = 'return "\u63d0\u793a\u8bcd";'
$chunkMa2[' - Matchers`'] = ' - \u5339\u914d\u5668`'
$chunkMa2[' - Matcher: '] = ' - \u5339\u914d\u5668\uff1a '
$chunkMa2['description: `${item.hookCount} ${plural(item.hookCount, "hook")}`'] = 'description: `${item.hookCount} \u4e2a hook`'
Patch-AllChunks -DistDir $ChunksDir -Replacements $chunkMa2

$chunk28d = @{}
$chunk28d['children: "Any Bash command"'] = 'children: "\u4efb\u610f Bash \u547d\u4ee4"'
$chunk28d['"Any Bash command starting with"'] = '"\u4ee5\u6b64\u5f00\u5934\u7684 Bash \u547d\u4ee4"'
$chunk28d['"The Bash command "'] = '"Bash \u547d\u4ee4 "'
$chunk28d['"Any use of the "'] = '"\u4efb\u610f\u4f7f\u7528 "'
$chunk28d['" tool"'] = '" \u5de5\u5177"'
$chunk28d['label: "Project settings (local)"'] = 'label: "\u9879\u76ee\u8bbe\u7f6e\uff08\u672c\u5730\uff09"'
$chunk28d['label: "Project settings"'] = 'label: "\u9879\u76ee\u8bbe\u7f6e"'
$chunk28d['label: "User settings"'] = 'label: "\u7528\u6237\u8bbe\u7f6e"'
$chunk28d['description: `Checked in at ${getRelativeSettingsFilePathForSource("projectSettings")}`'] = 'description: `\u68c0\u5165\u4e8e ${getRelativeSettingsFilePathForSource("projectSettings")}`'
$chunk28d['description: `Saved in ${getRelativeSettingsFilePathForSource("localSettings")}`'] = 'description: `\u4fdd\u5b58\u4e8e ${getRelativeSettingsFilePathForSource("localSettings")}`'
$chunk28d['description: `Saved in at ~/.claude/settings.json`'] = 'description: `\u4fdd\u5b58\u4e8e ~/.claude/settings.json`'
$chunk28d['children: ruleValues.length === 1 ? "Where should this rule be saved?" : "Where should these rules be saved?"'] = 'children: ruleValues.length === 1 ? "\u6b64\u89c4\u5219\u4fdd\u5b58\u5230\u54ea\u91cc\uff1f" : "\u8fd9\u4e9b\u89c4\u5219\u4fdd\u5b58\u5230\u54ea\u91cc\uff1f"'
$chunk28d['"Add "'] = '"\u6dfb\u52a0 "'
$chunk28d['" permission rule"'] = '" \u6743\u9650\u89c4\u5219"'
$chunk28d['"Permission rules are a tool name, optionally followed by a specifier in parentheses."'] = '"\u6743\u9650\u89c4\u5219\u4e3a\u5de5\u5177\u540d\uff0c\u53ef\u9009\u62ec\u53f7\u5185\u9650\u5b9a\u7b26\u3002"'
$chunk28d['"e.g.,"'] = '"\u4f8b\u5982\uff1a"'
$chunk28d['children: " or "'] = 'children: " \u6216 "'
$chunk28d['"Press "'] = '"\u6309 "'
$chunk28d['" again to exit"'] = '" \u518d\u6b21\u9000\u51fa"'
$chunk28d['children: "No recent denials. Commands denied by the auto mode classifier will appear here."'] = 'children: "\u6682\u65e0\u6700\u8fd1\u62d2\u7edd\u8bb0\u5f55\u3002\u81ea\u52a8\u6a21\u5f0f\u5206\u7c7b\u5668\u62d2\u7edd\u7684\u547d\u4ee4\u5c06\u663e\u793a\u5728\u6b64\u5904\u3002"'
$chunk28d['children: "Commands recently denied by the auto mode classifier."'] = 'children: "\u6700\u8fd1\u88ab\u81ea\u52a8\u6a21\u5f0f\u5206\u7c7b\u5668\u62d2\u7edd\u7684\u547d\u4ee4\u3002"'
$chunk28d['? " (retry)" : ""'] = '? " \uff08\u91cd\u8bd5\uff09" : ""'
$chunk28d['title: "Remove directory from workspace?"'] = 'title: "\u4ece\u5de5\u4f5c\u533a\u79fb\u9664\u76ee\u5f55\uff1f"'
$chunk28d['children: "Claude Code will no longer have access to files in this directory."'] = 'children: "Claude Code \u5c06\u65e0\u6cd5\u518d\u8bbf\u95ee\u6b64\u76ee\u5f55\u4e2d\u7684\u6587\u4ef6\u3002"'
$chunk28d['{ label: "Yes", value: "yes" }'] = '{ label: "\u662f", value: "yes" }'
$chunk28d['{ label: "No", value: "no" }'] = '{ label: "\u5426", value: "no" }'
$chunk28d['children: "(Original working directory)"'] = 'children: "\uff08\u539f\u59cb\u5de5\u4f5c\u76ee\u5f55\uff09"'
$chunk28d['label: `Add directory${figures_default.ellipsis}`'] = 'label: `\u6dfb\u52a0\u76ee\u5f55${figures_default.ellipsis}`'
$chunk28d['onExit("Workspace dialog dismissed"'] = 'onExit("\u5df2\u5173\u95ed\u5de5\u4f5c\u533a\u5bf9\u8bdd\u6846"'
$chunk28d['return "allowed";'] = 'return "\u5df2\u5141\u8bb8";'
$chunk28d['return "denied";'] = 'return "\u5df2\u62d2\u7edd";'
$chunk28d['return "ask";'] = 'return "\u8be2\u95ee";'
$chunk28d['children: "Rule details"'] = 'children: "\u89c4\u5219\u8be6\u60c5"'
$chunk28d['"This rule is configured by managed settings and cannot be modified."'] = '"\u6b64\u89c4\u5219\u7531\u6258\u7ba1\u8bbe\u7f6e\u914d\u7f6e\uff0c\u65e0\u6cd5\u4fee\u6539\u3002"'
$chunk28d['"Contact your system administrator for more information."'] = '"\u8bf7\u8054\u7cfb\u7cfb\u7edf\u7ba1\u7406\u5458\u4e86\u89e3\u66f4\u591a\u4fe1\u606f\u3002"'
$chunk28d['"Delete "'] = '"\u5220\u9664 "'
$chunk28d['" tool?"'] = '" \u5de5\u5177\uff1f"'
$chunk28d['children: "Are you sure you want to delete this permission rule?"'] = 'children: "\u786e\u5b9a\u8981\u5220\u9664\u6b64\u6743\u9650\u89c4\u5219\uff1f"'
$chunk28d['children: `From ${permissionRuleSourceDisplayString(rule.source)}`'] = 'children: `\u6765\u81ea ${permissionRuleSourceDisplayString(rule.source)}`'
$chunk28d['title: "Permissions:"'] = 'title: "\u6743\u9650\uff1a"'
$chunk28d['title: "Recently denied"'] = 'title: "\u6700\u8fd1\u62d2\u7edd"'
$chunk28d['title: "Workspace"'] = 'title: "\u5de5\u4f5c\u533a"'
$chunk28d['children: "Claude Code can read files in the workspace, and make edits when auto-accept edits is on."'] = 'children: "Claude Code \u53ef\u8bfb\u53d6\u5de5\u4f5c\u533a\u6587\u4ef6\uff0c\u5f00\u542f\u81ea\u52a8\u63a5\u53d7\u7f16\u8f91\u65f6\u53ef\u8fdb\u884c\u4fee\u6539\u3002"'
Patch-AllChunks -DistDir $ChunksDir -Replacements $chunk28d

$chunkTg2 = @{}
$chunkTg2['`Large CLAUDE.md file detected (${largeFiles[0].content.length.toLocaleString()} chars > ${MAX_MEMORY_CHARACTER_COUNT.toLocaleString()})`'] = '`\u68c0\u6d4b\u5230\u5927\u578b CLAUDE.md \u6587\u4ef6\uff08${largeFiles[0].content.length.toLocaleString()} \u5b57\u7b26 > ${MAX_MEMORY_CHARACTER_COUNT.toLocaleString()}\uff09`'
$chunkTg2['`${largeFiles.length} large CLAUDE.md files detected (each > ${MAX_MEMORY_CHARACTER_COUNT.toLocaleString()} chars)`'] = '`\u68c0\u6d4b\u5230 ${largeFiles.length} \u4e2a\u5927\u578b CLAUDE.md \u6587\u4ef6\uff08\u6bcf\u4e2a > ${MAX_MEMORY_CHARACTER_COUNT.toLocaleString()} \u5b57\u7b26\uff09`'
$chunkTg2['message: `Large agent descriptions (~${totalTokens.toLocaleString()} tokens > ${AGENT_DESCRIPTIONS_THRESHOLD.toLocaleString()})`'] = 'message: `agent \u63cf\u8ff0\u8fc7\u5927\uff08~${totalTokens.toLocaleString()} tokens > ${AGENT_DESCRIPTIONS_THRESHOLD.toLocaleString()}\uff09`'
$chunkTg2['message: `Large MCP tools context (~${mcpToolTokens.toLocaleString()} tokens > ${MCP_TOOLS_THRESHOLD.toLocaleString()})`'] = 'message: `MCP \u5de5\u5177\u4e0a\u4e0b\u6587\u8fc7\u5927\uff08~${mcpToolTokens.toLocaleString()} tokens > ${MCP_TOOLS_THRESHOLD.toLocaleString()}\uff09`'
$chunkTg2['message: `Large MCP tools context (~${estimatedTokens.toLocaleString()} tokens estimated > ${MCP_TOOLS_THRESHOLD.toLocaleString()})`'] = 'message: `MCP \u5de5\u5177\u4e0a\u4e0b\u6587\u8fc7\u5927\uff08~${estimatedTokens.toLocaleString()} tokens \u4f30\u7b97 > ${MCP_TOOLS_THRESHOLD.toLocaleString()}\uff09`'
$chunkTg2['message: `${unreachable.length} ${plural(unreachable.length, "unreachable permission rule")} detected`,'] = 'message: `\u68c0\u6d4b\u5230 ${unreachable.length} ${plural(unreachable.length, "\u4e0d\u53ef\u8fbe\u6743\u9650\u89c4\u5219")}`,'
$chunkTg2['`(${agentTokens.length - 5} more custom agents)`'] = '`\uff08\u8fd8\u6709 ${agentTokens.length - 5} \u4e2a\u81ea\u5b9a\u4e49 agent\uff09`'
$chunkTg2['`(${sortedServers.length - 5} more servers)`'] = '`\uff08\u8fd8\u6709 ${sortedServers.length - 5} \u4e2a\u670d\u52a1\u5668\uff09`'
Patch-AllChunks -DistDir $ChunksDir -Replacements $chunkTg2

$chunkH0g = @{}
$chunkH0g['title: "Manage MCP servers"'] = 'title: "\u7ba1\u7406 MCP \u670d\u52a1\u5668"'
$chunkH0g['subtitle: `${totalServers} ${plural(totalServers, "server")}`'] = 'subtitle: `\u5171 ${totalServers} \u4e2a\u670d\u52a1\u5668`'
$chunkH0g['label: "Project MCPs"'] = 'label: "\u9879\u76ee MCP"'
$chunkH0g['label: "User MCPs"'] = 'label: "\u7528\u6237 MCP"'
$chunkH0g['label: "Local MCPs"'] = 'label: "\u672c\u5730 MCP"'
$chunkH0g['label: "Enterprise MCPs"'] = 'label: "\u4f01\u4e1a MCP"'
$chunkH0g['label: "Built-in MCPs"'] = 'label: "\u5185\u7f6e MCP"'
$chunkH0g['path: "always available"'] = 'path: "\u59cb\u7ec8\u53ef\u7528"'
$chunkH0g['"Authenticating with "'] = '"\u6b63\u5728\u4e0e "'
$chunkH0g['children: " A browser window will open for authentication"'] = 'children: " \u5c06\u6253\u5f00\u6d4f\u89c8\u5668\u7a97\u53e3\u8fdb\u884c\u8ba4\u8bc1"'
$chunkH0g['children: "If your browser doesn''t open automatically, copy this URL manually:"'] = 'children: "\u82e5\u6d4f\u89c8\u5668\u672a\u81ea\u52a8\u6253\u5f00\uff0c\u8bf7\u624b\u52a8\u590d\u5236\u6b64 URL\uff1a"'
$chunkH0g['"Return here after authenticating in your browser."'] = '"\u8ba4\u8bc1\u540e\u8bf7\u8fd4\u56de\u6b64\u5904\u3002"'
$chunkH0g['label: agentServer.isAuthenticated ? "Re-authenticate" : "Authenticate"'] = 'label: agentServer.isAuthenticated ? "\u91cd\u65b0\u8ba4\u8bc1" : "\u8ba4\u8bc1"'
$chunkH0g['const statusText = agentServer.needsAuth ? "may need auth" : "agent-only";'] = 'const statusText = agentServer.needsAuth ? "\u53ef\u80fd\u9700\u8981\u8ba4\u8bc1" : "agent \u4e13\u7528";'
$chunkH0g['label: "Back"'] = 'label: "\u8fd4\u56de"'
$chunkH0g['subtitle: "agent-only"'] = 'subtitle: "agent \u4e13\u7528"'
$chunkH0g['children: "Type: "'] = 'children: "\u7c7b\u578b\uff1a "'
$chunkH0g['children: "URL: "'] = 'children: "URL\uff1a "'
$chunkH0g['children: "Command: "'] = 'children: "\u547d\u4ee4\uff1a "'
$chunkH0g['children: "Used by: "'] = 'children: "\u4f7f\u7528\u8005\uff1a "'
$chunkH0g['children: "Status: "'] = 'children: "\u72b6\u6001\uff1a "'
$chunkH0g['children: "Auth: "'] = 'children: "\u8ba4\u8bc1\uff1a "'
$chunkH0g['" not connected (agent-only)"'] = '" \u672a\u8fde\u63a5\uff08agent \u4e13\u7528\uff09"'
$chunkH0g['" authenticated"'] = '" \u5df2\u8ba4\u8bc1"'
$chunkH0g['" may need authentication"'] = '" \u53ef\u80fd\u9700\u8981\u8ba4\u8bc1"'
$chunkH0g['children: "This server connects only when running the agent."'] = 'children: "\u6b64\u670d\u52a1\u5668\u4ec5\u5728\u8fd0\u884c agent \u65f6\u8fde\u63a5\u3002"'
$chunkH0g['"Error: "'] = '"\u9519\u8bef\uff1a "'
$chunkH0g['statusText = "disabled"'] = 'statusText = "\u5df2\u7981\u7528"'
$chunkH0g['statusText = "connected"'] = 'statusText = "\u5df2\u8fde\u63a5"'
$chunkH0g['statusText = "connecting\u2026"'] = 'statusText = "\u8fde\u63a5\u4e2d\u2026"'
$chunkH0g['statusText = "needs authentication"'] = 'statusText = "\u9700\u8981\u8ba4\u8bc1"'
$chunkH0g['statusText = "failed"'] = 'statusText = "\u5931\u8d25"'
$chunkH0g['"Reconnecting to "'] = '"\u6b63\u5728\u91cd\u8fde "'
$chunkH0g['description: "cancel"'] = 'description: "\u53d6\u6d88"'
$chunkH0g['children: " Establishing connection to MCP server"'] = 'children: " \u6b63\u5728\u8fde\u63a5 MCP \u670d\u52a1\u5668"'
$chunkH0g['"Failed to reconnect to "'] = '"\u91cd\u8fde\u5931\u8d25 "'
$chunkH0g['"for help"'] = '"\u83b7\u53d6\u5e2e\u52a9"'
$chunkH0g['onComplete("MCP dialog dismissed"'] = 'onComplete("MCP \u5bf9\u8bdd\u6846\u5df2\u5173\u95ed"'
$chunkH0g['description: "go back"'] = 'description: "\u8fd4\u56de"'
$chunkH0g['"Press "'] = '"\u6309 "'
$chunkH0g['" again to exit"'] = '" \u518d\u6b21\u9000\u51fa"'
Patch-AllChunks -DistDir $ChunksDir -Replacements $chunkH0g

$chunk23wh = @{}
$chunk23wh['title: "Do you wish to enable auto-connect to IDE?"'] = 'title: "\u662f\u5426\u542f\u7528\u81ea\u52a8\u8fde\u63a5 IDE\uff1f"'
$chunk23wh['title: "Do you wish to disable auto-connect to IDE?"'] = 'title: "\u662f\u5426\u7981\u7528\u81ea\u52a8\u8fde\u63a5 IDE\uff1f"'
$chunk23wh['subtitle: "You can also configure this in /config"'] = 'subtitle: "\u4e5f\u53ef\u5728 /config \u4e2d\u914d\u7f6e"'
$chunk23wh['children: "You can also configure this in /config or with the --ide flag"'] = 'children: "\u4e5f\u53ef\u5728 /config \u4e2d\u914d\u7f6e\uff0c\u6216\u4f7f\u7528 --ide \u6807\u5fd7"'
$chunk23wh['title: "Select IDE"'] = 'title: "\u9009\u62e9 IDE"'
$chunk23wh['subtitle: "Connect to an IDE for integrated development features."'] = 'subtitle: "\u8fde\u63a5 IDE \u4ee5\u4f7f\u7528\u96c6\u6210\u5f00\u53d1\u529f\u80fd\u3002"'
$chunk23wh['children: "Note: Only one Claude Code instance can be connected to VS Code at a time."'] = 'children: "\u6ce8\u610f\uff1a\u540c\u4e00\u65f6\u95f4\u4ec5\u80fd\u6709\u4e00\u4e2a Claude Code \u5b9e\u4f8b\u8fde\u63a5 VS Code\u3002"'
$chunk23wh['children: "Tip: You can enable auto-connect to IDE in /config or with the --ide flag"'] = 'children: "\u63d0\u793a\uff1a\u53ef\u5728 /config \u4e2d\u542f\u7528\u81ea\u52a8\u8fde\u63a5 IDE\uff0c\u6216\u4f7f\u7528 --ide \u6807\u5fd7"'
$chunk23wh['title: "Select an IDE to open the project"'] = 'title: "\u9009\u62e9\u8981\u6253\u5f00\u9879\u76ee\u7684 IDE"'
$chunk23wh['title: "Select IDE to install extension"'] = 'title: "\u9009\u62e9\u8981\u5b89\u88c5\u6269\u5c55\u7684 IDE"'
$chunk23wh['{ label: "Yes", value: "yes" }'] = '{ label: "\u662f", value: "yes" }'
$chunk23wh['{ label: "No", value: "no" }'] = '{ label: "\u5426", value: "no" }'
$chunk23wh['{ label: "None", value: "None", description: undefined }'] = '{ label: "\u65e0", value: "None", description: undefined }'
Patch-AllChunks -DistDir $ChunksDir -Replacements $chunk23wh

$chunk8dbj = @{}
$chunk8dbj['title: "Skills"'] = 'title: "\u6280\u80fd"'
$chunk8dbj['subtitle: "No skills found"'] = 'subtitle: "\u672a\u627e\u5230\u6280\u80fd"'
$chunk8dbj['children: "Create skills in .claude/skills/ or ~/.claude/skills/"'] = 'children: "\u5728 .claude/skills/ \u6216 ~/.claude/skills/ \u4e2d\u521b\u5efa\u6280\u80fd"'
$chunk8dbj['return "Plugin skills";'] = 'return "\u63d2\u4ef6\u6280\u80fd";'
$chunk8dbj['return "MCP skills";'] = 'return "MCP \u6280\u80fd";'
$chunk8dbj['return `${capitalize_default(getSettingSourceName(source))} skills`;'] = 'return `${capitalize_default(getSettingSourceName(source))} \u6280\u80fd`;'
$chunk8dbj['" description tokens"'] = '" \u63cf\u8ff0 tokens"'
$chunk8dbj['subtitle: `${skills.length} ${plural(skills.length, "skill")}`'] = 'subtitle: `\u5171 ${skills.length} \u4e2a\u6280\u80fd`'
$chunk8dbj['onExit("Skills dialog dismissed"'] = 'onExit("\u6280\u80fd\u5bf9\u8bdd\u6846\u5df2\u5173\u95ed"'
$chunk8dbj['description: "close"'] = 'description: "\u5173\u95ed"'
$chunk8dbj['return { label: "local", color: "yellow" };'] = 'return { label: "\u672c\u5730", color: "yellow" };'
$chunk8dbj['return { label: "global", color: "cyan" };'] = 'return { label: "\u5168\u5c40", color: "cyan" };'
$chunk8dbj['return { label: "managed", color: "magenta" };'] = 'return { label: "\u6258\u7ba1", color: "magenta" };'
Patch-AllChunks -DistDir $ChunksDir -Replacements $chunk8dbj

$chunkT4w = @{}
$chunkT4w['title: "Memory"'] = 'title: "\u8bb0\u5fc6"'
$chunkT4w['"Learn more: "'] = '"\u4e86\u89e3\u66f4\u591a\uff1a "'
$chunkT4w['label = `User memory`;'] = 'label = `\u7528\u6237\u8bb0\u5fc6`;'
$chunkT4w['label = `Project memory`;'] = 'label = `\u9879\u76ee\u8bb0\u5fc6`;'
$chunkT4w['const existsLabel = file.exists ? "" : " (new)";'] = 'const existsLabel = file.exists ? "" : " \uff08\u65b0\u5efa\uff09";'
$chunkT4w['description = "Saved in ~/.claude/CLAUDE.md";'] = 'description = "\u4fdd\u5b58\u4e8e ~/.claude/CLAUDE.md";'
$chunkT4w['description = `${isGit ? "Checked in at" : "Saved in"} ./CLAUDE.md`;'] = 'description = `${isGit ? "\u68c0\u5165\u4e8e" : "\u4fdd\u5b58\u4e8e"} ./CLAUDE.md`;'
$chunkT4w['description = "@-imported";'] = 'description = "@ \u5bfc\u5165";'
$chunkT4w['description = "dynamically loaded";'] = 'description = "\u6309\u9700\u52a0\u8f7d";'
$chunkT4w['label: "Open auto-memory folder"'] = 'label: "\u6253\u5f00\u81ea\u52a8\u8bb0\u5fc6\u76ee\u5f55"'
$chunkT4w['label: `Open ${source_default.bold(agent.agentType)} agent memory`'] = 'label: `\u6253\u5f00 ${source_default.bold(agent.agentType)} agent \u8bb0\u5fc6`'
$chunkT4w['description: `${agent.memory} scope`'] = 'description: `${agent.memory} \u8303\u56f4`'
$chunkT4w['"Auto-memory: "'] = '"\u81ea\u52a8\u8bb0\u5fc6\uff1a "'
$chunkT4w['"Auto-dream: "'] = '"\u81ea\u52a8 dream\uff1a "'
$chunkT4w['autoMemoryOn ? "on" : "off"'] = 'autoMemoryOn ? "\u5f00" : "\u5173"'
$chunkT4w['autoDreamOn ? "on" : "off"'] = 'autoDreamOn ? "\u5f00" : "\u5173"'
$chunkT4w['dreamStatus = isDreamRunning ? "running"'] = 'dreamStatus = isDreamRunning ? "\u8fd0\u884c\u4e2d"'
$chunkT4w['lastDreamAt === 0 ? "never" : `last ran ${formatRelativeTimeAgo(new Date(lastDreamAt))}`'] = 'lastDreamAt === 0 ? "\u4ece\u672a" : `\u4e0a\u6b21\u8fd0\u884c ${formatRelativeTimeAgo(new Date(lastDreamAt))}`'
$chunkT4w['onDone("Cancelled memory editing"'] = 'onDone("\u5df2\u53d6\u6d88\u8bb0\u5fc6\u7f16\u8f91"'
$chunkT4w['onDone(`Opened memory file at ${getRelativeMemoryPath(memoryPath)}'] = 'onDone(`\u5df2\u6253\u5f00\u8bb0\u5fc6\u6587\u4ef6 ${getRelativeMemoryPath(memoryPath)}'
$chunkT4w['onDone(`\u5df2\u6253\u5f00\u8bb0\u5fc6\u6587\u4ef6 ${getRelativeMemoryPath(memoryPath)}`'] = 'onDone(`\u5df2\u6253\u5f00\u8bb0\u5fc6\u6587\u4ef6 ${getRelativeMemoryPath(memoryPath)}'
$chunkT4w['onDone(`Error opening memory file: ${error}`)'] = 'onDone(`\u6253\u5f00\u8bb0\u5fc6\u6587\u4ef6\u5931\u8d25\uff1a${error}`)'
$chunkT4w['? `> ${editorInfo} To change editor, set $EDITOR or $VISUAL environment variable.` : `> To use a different editor, set the $EDITOR or $VISUAL environment variable.`;'] = '? `> ${editorInfo} \u8981\u66f4\u6362\u7f16\u8f91\u5668\uff0c\u8bf7\u8bbe\u7f6e $EDITOR \u6216 $VISUAL \u73af\u5883\u53d8\u91cf\u3002` : `> \u8981\u4f7f\u7528\u5176\u4ed6\u7f16\u8f91\u5668\uff0c\u8bf7\u8bbe\u7f6e $EDITOR \u6216 $VISUAL \u73af\u5883\u53d8\u91cf\u3002`;'
$chunkT4w['? `Using ${editorSource}="${editorValue}".` : "";'] = '? `\u4f7f\u7528 ${editorSource}="${editorValue}"\u3002` : "";'
Patch-AllChunks -DistDir $ChunksDir -Replacements $chunkT4w

$chunkH0g2 = @{}
$chunkH0g2['onComplete(`MCP server "${serverName}" not found`);'] = 'onComplete(`\u672a\u627e\u5230 MCP \u670d\u52a1\u5668 "${serverName}"`);'
$chunkH0g2['onComplete(`Successfully reconnected to ${serverName}`);'] = 'onComplete(`\u5df2\u6210\u529f\u91cd\u8fde ${serverName}`);'
$chunkH0g2['onComplete(`${serverName} requires authentication. Use /mcp to authenticate.`);'] = 'onComplete(`${serverName} \u9700\u8981\u8ba4\u8bc1\u3002\u4f7f\u7528 /mcp \u8fdb\u884c\u8ba4\u8bc1\u3002`);'
$chunkH0g2['onComplete(`Failed to reconnect to ${serverName}`);'] = 'onComplete(`\u91cd\u8fde ${serverName} \u5931\u8d25`);'
$chunkH0g2['onComplete(`Error: ${errorMessage}`);'] = 'onComplete(`\u9519\u8bef\uff1a${errorMessage}`);'
$chunkH0g2['onComplete("No MCP servers configured. Please run /doctor if this is unexpected. Otherwise, run `claude mcp --help` or visit https://code.claude.com/docs/en/mcp to learn more.");'] = 'onComplete("\u672a\u914d\u7f6e MCP \u670d\u52a1\u5668\u3002\u82e5\u610f\u5916\u8bf7\u8fd0\u884c /doctor\u3002\u5426\u5219\u8fd0\u884c `claude mcp --help` \u6216\u8bbf\u95ee https://code.claude.com/docs/en/mcp \u4e86\u89e3\u66f4\u591a\u3002");'
$chunkH0g2['onComplete(target === "all" ? `All MCP servers are already ${isEnabling ? "enabled" : "disabled"}` : `MCP server "${target}" not found`);'] = 'onComplete(target === "all" ? `\u6240\u6709 MCP \u670d\u52a1\u5668\u5df2${isEnabling ? "\u542f\u7528" : "\u7981\u7528"}` : `\u672a\u627e\u5230 MCP \u670d\u52a1\u5668 "${target}"`);'
$chunkH0g2['onComplete(target === "all" ? `${isEnabling ? "Enabled" : "Disabled"} ${toToggle.length} MCP server(s)` : `MCP server "${target}" ${isEnabling ? "enabled" : "disabled"}`);'] = 'onComplete(target === "all" ? `${isEnabling ? "\u5df2\u542f\u7528" : "\u5df2\u7981\u7528"} ${toToggle.length} \u4e2a MCP \u670d\u52a1\u5668` : `MCP \u670d\u52a1\u5668 "${target}" \u5df2${isEnabling ? "\u542f\u7528" : "\u7981\u7528"}`);'
$chunkH0g2['statusText = `reconnecting (${reconnectAttempt}/${maxReconnectAttempts})\u2026`;'] = 'statusText = `\u91cd\u8fde\u4e2d (${reconnectAttempt}/${maxReconnectAttempts})\u2026`;'
Patch-AllChunks -DistDir $ChunksDir -Replacements $chunkH0g2

$chunkH0g3 = @{}
$chunkH0g3['action: "navigate"'] = 'action: "\u5bfc\u822a"'
$chunkH0g3['action: "confirm"'] = 'action: "\u786e\u8ba4"'
Patch-AllChunks -DistDir $ChunksDir -Replacements $chunkH0g3

$chunkD2s = @{}
$chunkD2s['action: "navigate"'] = 'action: "\u5bfc\u822a"'
$chunkD2s['action: "toggle"'] = 'action: "\u5207\u6362"'
$chunkD2s['action: "confirm"'] = 'action: "\u786e\u8ba4"'
$chunkD2s['description: "cancel"'] = 'description: "\u53d6\u6d88"'
Patch-AllChunks -DistDir $ChunksDir -Replacements $chunkD2s

$chunkEf8 = @{}
$chunkEf8['action: "select"'] = 'action: "\u9009\u62e9"'
$chunkEf8['action: "confirm"'] = 'action: "\u786e\u8ba4"'
$chunkEf8['description: "reject all"'] = 'description: "\u5168\u90e8\u62d2\u7edd"'
Patch-AllChunks -DistDir $ChunksDir -Replacements $chunkEf8

$chunkEf8b = @{}
$chunkEf8b['"MCP servers may execute code or access system resources. All tool calls require approval. Learn more in the"'] = '"MCP \u670d\u52a1\u5668\u53ef\u80fd\u6267\u884c\u4ee3\u7801\u6216\u8bbf\u95ee\u7cfb\u7edf\u8d44\u6e90\u3002\u6240\u6709\u5de5\u5177\u8c03\u7528\u5747\u9700\u6279\u51c6\u3002\u8be6\u89c1"'
$chunkEf8b['children: "MCP documentation"'] = 'children: "MCP \u6587\u6863"'
$chunkEf8b['title: `New MCP server found in .mcp.json: ${serverName}`'] = 'title: `\u5728 .mcp.json \u4e2d\u53d1\u73b0\u65b0 MCP \u670d\u52a1\u5668\uff1a${serverName}`'
$chunkEf8b['label: `Use this and all future MCP servers in this project`'] = 'label: `\u4f7f\u7528\u6b64\u670d\u52a1\u5668\u5e76\u5141\u8bb8\u672c\u9879\u76ee\u6240\u6709 MCP \u670d\u52a1\u5668`'
$chunkEf8b['{ label: `Use this MCP server`, value: "yes" }'] = '{ label: `\u4f7f\u7528\u6b64 MCP \u670d\u52a1\u5668`, value: "yes" }'
$chunkEf8b['{ label: `Continue without using this MCP server`, value: "no" }'] = '{ label: `\u4e0d\u4f7f\u7528\u6b64 MCP \u670d\u52a1\u5668\u5e76\u7ee7\u7eed`, value: "no" }'
$chunkEf8b['title: `${serverNames.length} new MCP servers found in .mcp.json`'] = 'title: `\u5728 .mcp.json \u4e2d\u53d1\u73b0 ${serverNames.length} \u4e2a\u65b0 MCP \u670d\u52a1\u5668`'
$chunkEf8b['subtitle: "Select any you wish to enable."'] = 'subtitle: "\u9009\u62e9\u8981\u542f\u7528\u7684\u670d\u52a1\u5668\u3002"'
Patch-AllChunks -DistDir $ChunksDir -Replacements $chunkEf8b

$chunkYxs = @{}
$chunkYxs['title: "Import MCP Servers from Claude Desktop"'] = 'title: "\u4ece Claude Desktop \u5bfc\u5165 MCP \u670d\u52a1\u5668"'
$chunkYxs['subtitle: `Found ${serverNames.length} MCP ${plural(serverNames.length, "server")} in Claude Desktop.`'] = 'subtitle: `\u5728 Claude Desktop \u4e2d\u53d1\u73b0 ${serverNames.length} \u4e2a MCP \u670d\u52a1\u5668\u3002`'
$chunkYxs['children: "Note: Some servers already exist with the same name. If selected, they will be imported with a numbered suffix."'] = 'children: "\u6ce8\u610f\uff1a\u90e8\u5206\u670d\u52a1\u5668\u540d\u5df2\u5b58\u5728\u3002\u82e5\u9009\u4e2d\uff0c\u5c06\u4ee5\u7f16\u53f7\u540e\u7f00\u5bfc\u5165\u3002"'
$chunkYxs['children: "Please select the servers you want to import:"'] = 'children: "\u8bf7\u9009\u62e9\u8981\u5bfc\u5165\u7684\u670d\u52a1\u5668\uff1a"'
$chunkYxs['${collisions.includes(server) ? " (already exists)" : ""}'] = '${collisions.includes(server) ? " \uff08\u5df2\u5b58\u5728\uff09" : ""}'
$chunkYxs['action: "select"'] = 'action: "\u9009\u62e9"'
$chunkYxs['action: "confirm"'] = 'action: "\u786e\u8ba4"'
$chunkYxs['description: "cancel"'] = 'description: "\u53d6\u6d88"'
$chunkYxs['`Successfully imported ${importedCount} MCP ${plural(importedCount, "server")} to ${scope} config.`'] = '`\u5df2\u6210\u529f\u5c06 ${importedCount} \u4e2a MCP \u670d\u52a1\u5668\u5bfc\u5165 ${scope} \u914d\u7f6e\u3002`'
$chunkYxs['No servers were imported.'] = '\u672a\u5bfc\u5165\u4efb\u4f55\u670d\u52a1\u5668\u3002'
Patch-AllChunks -DistDir $ChunksDir -Replacements $chunkYxs

$chunkZ512 = @{}
$chunkZ512['children: "Loading Claude Code sessions\u2026"'] = 'children: "\u6b63\u5728\u52a0\u8f7d Claude Code \u4f1a\u8bdd\u2026"'
$chunkZ512['retrying ? "Retrying\u2026" : "Fetching your Claude Code sessions\u2026"'] = 'retrying ? "\u6b63\u5728\u91cd\u8bd5\u2026" : "\u6b63\u5728\u83b7\u53d6 Claude Code \u4f1a\u8bdd\u2026"'
$chunkZ512['children: "Error loading Claude Code sessions"'] = 'children: "\u52a0\u8f7d Claude Code \u4f1a\u8bdd\u5931\u8d25"'
$chunkZ512['children: "Check your internet connection"'] = 'children: "\u8bf7\u68c0\u67e5\u7f51\u7edc\u8fde\u63a5"'
$chunkZ512['children: "Teleport requires a Claude account"'] = 'children: "Teleport \u9700\u8981 Claude \u8d26\u6237"'
$chunkZ512[''' and select "Claude account with subscription"'''] = ''' \u5e76\u9009\u62e9\u201cClaude account with subscription\u201d'''
$chunkZ512['children: "Sorry, Claude encountered an error"'] = 'children: "\u62b1\u6b49\uff0cClaude \u9047\u5230\u9519\u8bef"'
$chunkZ512['children: "Sorry, Claude Code encountered an error"'] = 'children: "\u62b1\u6b49\uff0cClaude Code \u9047\u5230\u9519\u8bef"'
$chunkZ512['"No Claude Code sessions found"'] = '"\u672a\u627e\u5230 Claude Code \u4f1a\u8bdd"'
$chunkZ512['children: [
                " for ",
                currentRepo
              ]'] = 'children: [
                " \uff08",
                currentRepo,
                "\uff09"
              ]'
$chunkZ512['"Select a session to resume"'] = '"\u9009\u62e9\u8981\u6062\u590d\u7684\u4f1a\u8bdd"'
$chunkZ512['children: "Resuming session\u2026"'] = 'children: "\u6b63\u5728\u6062\u590d\u4f1a\u8bdd\u2026"'
$chunkZ512['''Loading "'''] = '''\u6b63\u5728\u52a0\u8f7d\u201c'''
$chunkZ512['children: "Failed to resume session"'] = 'children: "\u6062\u590d\u4f1a\u8bdd\u5931\u8d25"'
$chunkZ512['"Press "'] = '"\u6309 "'
$chunkZ512['" to cancel"'] = '" \u53d6\u6d88"'
$chunkZ512['" to retry \xB7 Press"'] = '" \u91cd\u8bd5 \xb7 \u6309"'
$chunkZ512['"Run "'] = '"\u8fd0\u884c "'
$chunkZ512['action: "select"'] = 'action: "\u9009\u62e9"'
$chunkZ512['action: "confirm"'] = 'action: "\u786e\u8ba4"'
$chunkZ512['description: "cancel"'] = 'description: "\u53d6\u6d88"'
Patch-AllChunks -DistDir $ChunksDir -Replacements $chunkZ512

$chunkZ512b = @{}
$chunkZ512b['              " ",
              "(",
              focusedIndex,
              " of ",
              sessions.length,
              ")"'] = '              " ",
              "\uff08",
              focusedIndex,
              " / ",
              sessions.length,
              "\uff09"'
$chunkZ512b['children: [
              " (",
              currentRepo,
              ")"
            ]'] = 'children: [
              " \uff08",
              currentRepo,
              "\uff09"
            ]'
Patch-AllChunks -DistDir $ChunksDir -Replacements $chunkZ512b

$chunk4778 = @{}
$chunk4778['message: "Loading session\u2026"'] = 'message: "\u6b63\u5728\u52a0\u8f7d\u4f1a\u8bdd\u2026"'
$chunk4778['" messages"'] = '" \u6761\u6d88\u606f"'
$chunk4778['action: "resume"'] = 'action: "\u6062\u590d"'
$chunk4778['description: "cancel"'] = 'description: "\u53d6\u6d88"'
$chunk4778['description: "clear"'] = 'description: "\u6e05\u9664"'
$chunk4778['action: "select"'] = 'action: "\u9009\u62e9"'
$chunk4778['action: "search"'] = 'action: "\u641c\u7d22"'
$chunk4778['action: "skip"'] = 'action: "\u8df3\u8fc7"'
$chunk4778['action: "save"'] = 'action: "\u4fdd\u5b58"'
$chunk4778['action: "toggle branch"'] = 'action: "\u5207\u6362\u5206\u652f"'
$chunk4778['action: "preview"'] = 'action: "\u9884\u89c8"'
$chunk4778['action: "rename"'] = 'action: "\u91cd\u547d\u540d"'
$chunk4778['children: "Claude found these results:"'] = 'children: "Claude \u627e\u5230\u4ee5\u4e0b\u7ed3\u679c\uff1a"'
$chunk4778['children: "No matching sessions found."'] = 'children: "\u672a\u627e\u5230\u5339\u914d\u7684\u4f1a\u8bdd\u3002"'
$chunk4778['children: "Search deeply using Claude \u2192"'] = 'children: "\u4f7f\u7528 Claude \u6df1\u5ea6\u641c\u7d22 \u2192"'
$chunk4778['children: "Rename session:"'] = 'children: "\u91cd\u547d\u540d\u4f1a\u8bdd\uff1a"'
$chunk4778['children: "Searching with Claude\u2026"'] = 'children: "\u6b63\u5728\u4f7f\u7528 Claude \u641c\u7d22\u2026"'
$chunk4778['? "Searching\u2026" : "Type to Search"'] = '? "\u6b63\u5728\u641c\u7d22\u2026" : "\u8f93\u5165\u4ee5\u641c\u7d22"'
$chunk4778['children: "Type to search"'] = 'children: "\u8f93\u5165\u4ee5\u641c\u7d22"'
$chunk4778['"Resume Session"'] = '"\u6062\u590d\u4f1a\u8bdd"'
$chunk4778['const resumeLabel = showAllProjects ? "Resume (All Projects)" : "Resume";'] = 'const resumeLabel = showAllProjects ? "\u6062\u590d\uff08\u5168\u90e8\u9879\u76ee\uff09" : "\u6062\u590d";'
$chunk4778['children: " Searching\u2026"'] = 'children: " \u6b63\u5728\u641c\u7d22\u2026"'
$chunk4778['              " ",
                "(",
                focusedIndex,
                " of ",
                displayedLogs.length,
                ")"'] = '              " ",
                "\uff08",
                focusedIndex,
                " / ",
                displayedLogs.length,
                "\uff09"'
Patch-AllChunks -DistDir $ChunksDir -Replacements $chunk4778

$chunk4778b = @{}
$chunk4778b['filterIndicators.push("current worktree");'] = 'filterIndicators.push("\u5f53\u524d\u5de5\u4f5c\u6811");'
$chunk4778b['action: `show ${showAllProjects ? "current dir" : "all projects"}`'] = 'action: `${showAllProjects ? "\u663e\u793a\u5f53\u524d\u76ee\u5f55" : "\u663e\u793a\u5168\u90e8\u9879\u76ee"}`'
$chunk4778b['action: `show ${showAllWorktrees ? "current worktree" : "all worktrees"}`'] = 'action: `${showAllWorktrees ? "\u663e\u793a\u5f53\u524d\u5de5\u4f5c\u6811" : "\u663e\u793a\u5168\u90e8\u5de5\u4f5c\u6811"}`'
$chunk4778b['action: `show ${showAllProjects ? "\u5f53\u524d\u76ee\u5f55" : "\u5168\u90e8\u9879\u76ee"}`'] = 'action: `${showAllProjects ? "\u663e\u793a\u5f53\u524d\u76ee\u5f55" : "\u663e\u793a\u5168\u90e8\u9879\u76ee"}`'
$chunk4778b['action: `show ${showAllWorktrees ? "\u5f53\u524d\u5de5\u4f5c\u6811" : "\u5168\u90e8\u5de5\u4f5c\u6811"}`'] = 'action: `${showAllWorktrees ? "\u663e\u793a\u5f53\u524d\u5de5\u4f5c\u6811" : "\u663e\u793a\u5168\u90e8\u5de5\u4f5c\u6811"}`'
Patch-AllChunks -DistDir $ChunksDir -Replacements $chunk4778b

$chunkHphv = @{}
$chunkHphv['DIALOG_TITLE = "Select Remote Environment"'] = 'DIALOG_TITLE = "\u9009\u62e9\u8fdc\u7a0b\u73af\u5883"'
$chunkHphv['SETUP_HINT = `Configure environments at: https://claude.ai/code`'] = 'SETUP_HINT = `\u5728\u6b64\u914d\u7f6e\u73af\u5883\uff1a https://claude.ai/code`'
$chunkHphv['message: "Loading environments\u2026"'] = 'message: "\u6b63\u5728\u52a0\u8f7d\u73af\u5883\u2026"'
$chunkHphv['message: "Updating\u2026"'] = 'message: "\u6b63\u5728\u66f4\u65b0\u2026"'
$chunkHphv['"Error: "'] = '"\u9519\u8bef\uff1a "'
$chunkHphv['children: "No remote environments available."'] = 'children: "\u6682\u65e0\u53ef\u7528\u7684\u8fdc\u7a0b\u73af\u5883\u3002"'
$chunkHphv['onDone("Error: Selected environment not found")'] = 'onDone("\u6240\u9009\u73af\u5883\u672a\u627e\u5230")'
$chunkHphv['onDone(`Set default remote environment to ${source_default.bold(selectedEnv.name)} (${selectedEnv.environment_id})`)'] = 'onDone(`\u5df2\u5c06\u9ed8\u8ba4\u8fdc\u7a0b\u73af\u5883\u8bbe\u4e3a ${source_default.bold(selectedEnv.name)} (${selectedEnv.environment_id})`)'
$chunkHphv['" Using "'] = '" \u6b63\u5728\u4f7f\u7528 "'
$chunkHphv['"Currently using: "'] = '"\u5f53\u524d\u4f7f\u7528\uff1a "'
$chunkHphv['? ` (from ${getSettingSourceName(selectedEnvironmentSource)} settings)` : ""'] = '? ` \uff08\u6765\u81ea ${getSettingSourceName(selectedEnvironmentSource)} \u8bbe\u7f6e\uff09` : ""'
$chunkHphv['action: "select"'] = 'action: "\u9009\u62e9"'
$chunkHphv['description: "cancel"'] = 'description: "\u53d6\u6d88"'
Patch-AllChunks -DistDir $ChunksDir -Replacements $chunkHphv

$chunkAvn10 = @{}
$chunkAvn10['"Waiting for team lead approval"'] = '"\u7b49\u5f85\u961f\u957f\u6279\u51c6"'
$chunkAvn10['historyFailedMatch ? "no matching prompt:" : "search prompts:"'] = 'historyFailedMatch ? "\u65e0\u5339\u914d\u63d0\u793a\uff1a" : "\u641c\u7d22\u63d0\u793a\uff1a"'
$chunkAvn10['const subtitle = `${teammates.length} ${teammates.length === 1 ? "teammate" : "teammates"}`;'] = 'const subtitle = `${teammates.length} \u540d\u961f\u53cb`;'
$chunkAvn10['title: `Team ${teamName}`'] = 'title: `\u961f\u4f0d ${teamName}`'
$chunkAvn10['" select \xB7 Enter view \xB7 k kill \xB7 s shutdown \xB7 p prune idle"'] = '" \u9009\u62e9 \xb7 Enter \u67e5\u770b \xb7 k \u7ec8\u6b62 \xb7 s \u5173\u673a \xb7 p \u6e05\u7406\u7a7a\u95f2"'
$chunkAvn10['" \xB7 h hide/show \xB7 H hide/show all"'] = '" \xb7 h \u9690\u85cf/\u663e\u793a \xb7 H \u5168\u90e8\u9690\u85cf/\u663e\u793a"'
$chunkAvn10['" sync cycle modes for all \xB7 Esc close"'] = '" \u540c\u6b65\u5207\u6362\u6240\u6709\u6a21\u5f0f \xb7 Esc \u5173\u95ed"'
$chunkAvn10['children: "[hidden] "'] = 'children: "[\u9690\u85cf] "'
$chunkAvn10['children: "[idle] "'] = 'children: "[\u7a7a\u95f2] "'
$chunkAvn10['teammate.worktreePath ? `worktree: ${workingPath}` : workingPath'] = 'teammate.worktreePath ? `\u5de5\u4f5c\u6811\uff1a ${workingPath}` : workingPath'
$chunkAvn10['const statusText = `${totalTeammates} ${totalTeammates === 1 ? "teammate" : "teammates"}`;'] = 'const statusText = `${totalTeammates} \u540d\u961f\u53cb`;'
Patch-AllChunks -DistDir $ChunksDir -Replacements $chunkAvn10

$chunkZ512c = @{}
$chunkZ512c['var UPDATED_STRING = "Updated";'] = 'var UPDATED_STRING = "\u66f4\u65b0";'
$chunkZ512c['"Session Title"'] = '"\u4f1a\u8bdd\u6807\u9898"'
Patch-AllChunks -DistDir $ChunksDir -Replacements $chunkZ512c

$chunk4778c = @{}
$chunk4778c['message: error instanceof Error ? error.message : "Search failed"'] = 'message: error instanceof Error ? error.message : "\u641c\u7d22\u5931\u8d25"'
$chunk4778c['"Press "'] = '"\u6309 "'
$chunk4778c['" again to exit"'] = '" \u518d\u6b21\u9000\u51fa"'
Patch-AllChunks -DistDir $ChunksDir -Replacements $chunk4778c

$chunkP0tz = @{}
$chunkP0tz['title: "Login"'] = 'title: "\u767b\u5f55"'
$chunkP0tz['onDone(success ? "Login successful" : "Login interrupted")'] = 'onDone(success ? "\u767b\u5f55\u6210\u529f" : "\u767b\u5f55\u5df2\u4e2d\u65ad")'
$chunkP0tz['"Press "'] = '"\u6309 "'
$chunkP0tz['" again to exit"'] = '" \u518d\u6b21\u9000\u51fa"'
$chunkP0tz['description: "cancel"'] = 'description: "\u53d6\u6d88"'
Patch-AllChunks -DistDir $ChunksDir -Replacements $chunkP0tz

$chunkYet = @{}
$chunkYet['title: "Export Conversation"'] = 'title: "\u5bfc\u51fa\u5bf9\u8bdd"'
$chunkYet['subtitle: "Select export method:"'] = 'subtitle: "\u9009\u62e9\u5bfc\u51fa\u65b9\u5f0f\uff1a"'
$chunkYet['label: "Copy to clipboard"'] = 'label: "\u590d\u5236\u5230\u526a\u8d34\u677f"'
$chunkYet['label: "Save to file"'] = 'label: "\u4fdd\u5b58\u5230\u6587\u4ef6"'
$chunkYet['description: "Copy the conversation to your system clipboard"'] = 'description: "\u5c06\u5bf9\u8bdd\u590d\u5236\u5230\u7cfb\u7edf\u526a\u8d34\u677f"'
$chunkYet['description: "Save the conversation to a file in the current directory"'] = 'description: "\u5c06\u5bf9\u8bdd\u4fdd\u5b58\u5230\u5f53\u524d\u76ee\u5f55\u7684\u6587\u4ef6"'
$chunkYet['children: "Enter filename:"'] = 'children: "\u8f93\u5165\u6587\u4ef6\u540d\uff1a"'
$chunkYet['action: "save"'] = 'action: "\u4fdd\u5b58"'
$chunkYet['description: "go back"'] = 'description: "\u8fd4\u56de"'
$chunkYet['description: "cancel"'] = 'description: "\u53d6\u6d88"'
$chunkYet['"Press "'] = '"\u6309 "'
$chunkYet['" again to exit"'] = '" \u518d\u6b21\u9000\u51fa"'
$chunkYet['message: "Conversation copied to clipboard"'] = 'message: "\u5bf9\u8bdd\u5df2\u590d\u5236\u5230\u526a\u8d34\u677f"'
$chunkYet['message: `Conversation exported to: ${filepath}`'] = 'message: `\u5bf9\u8bdd\u5df2\u5bfc\u51fa\u81f3\uff1a ${filepath}`'
$chunkYet['message: `Failed to export conversation: ${error instanceof Error ? error.message : "Unknown error"}`'] = 'message: `\u5bfc\u51fa\u5bf9\u8bdd\u5931\u8d25\uff1a ${error instanceof Error ? error.message : "\u672a\u77e5\u9519\u8bef"}`'
$chunkYet['message: "Export cancelled"'] = 'message: "\u5bfc\u51fa\u5df2\u53d6\u6d88"'
$chunkYet['onDone(`Conversation exported to: ${filepath}`)'] = 'onDone(`\u5bf9\u8bdd\u5df2\u5bfc\u51fa\u81f3\uff1a ${filepath}`)'
$chunkYet['onDone(`Failed to export conversation: ${error instanceof Error ? error.message : "Unknown error"}`)'] = 'onDone(`\u5bfc\u51fa\u5bf9\u8bdd\u5931\u8d25\uff1a ${error instanceof Error ? error.message : "\u672a\u77e5\u9519\u8bef"}`)'
Patch-AllChunks -DistDir $ChunksDir -Replacements $chunkYet

$chunkCpmg = New-ReplacementMap
$chunkCpmg['title: "Plugins"'] = 'title: "\u63d2\u4ef6"'
$chunkCpmg['title: "Discover"'] = 'title: "\u53d1\u73b0"'
$chunkCpmg['title: "Installed"'] = 'title: "\u5df2\u5b89\u88c5"'
$chunkCpmg['title: "Marketplaces"'] = 'title: "\u5e02\u573a"'
$chunkCpmg['const errorsTabTitle = pluginErrorCount > 0 ? `Errors (${pluginErrorCount})` : "Errors";'] = 'const errorsTabTitle = pluginErrorCount > 0 ? `\u9519\u8bef (${pluginErrorCount})` : "\u9519\u8bef";'
$chunkCpmg['children: "Add Marketplace"'] = 'children: "\u6dfb\u52a0\u5e02\u573a"'
$chunkCpmg['children: "Enter marketplace source:"'] = 'children: "\u8f93\u5165\u5e02\u573a\u6765\u6e90\uff1a"'
$chunkCpmg['children: "Examples:"'] = 'children: "\u793a\u4f8b\uff1a"'
$chunkCpmg['children: "Tab: Next field \xB7 Enter: Save and continue"'] = 'children: "Tab \u4e0b\u4e00\u5b57\u6bb5 \xb7 Enter \u4fdd\u5b58\u5e76\u7ee7\u7eed"'
$chunkCpmg['children: "Enter: Save configuration"'] = 'children: "Enter \u4fdd\u5b58\u914d\u7f6e"'
$chunkCpmg['subtitle: "Plugin options"'] = 'subtitle: "\u63d2\u4ef6\u9009\u9879"'
$chunkCpmg['children: "Loading\u2026"'] = 'children: "\u52a0\u8f7d\u4e2d\u2026"'
$chunkCpmg['children: "Select marketplace"'] = 'children: "\u9009\u62e9\u5e02\u573a"'
$chunkCpmg['children: "No marketplaces configured."'] = 'children: "\u672a\u914d\u7f6e\u5e02\u573a\u3002"'
$chunkCpmg['children: "Plugin Details"'] = 'children: "\u63d2\u4ef6\u8be6\u60c5"'
$chunkCpmg['children: "Will install:"'] = 'children: "\u5c06\u5b89\u88c5\uff1a"'
$chunkCpmg['children: "Install plugins"'] = 'children: "\u5b89\u88c5\u63d2\u4ef6"'
$chunkCpmg['children: "No new plugins available to install."'] = 'children: "\u6ca1\u6709\u53ef\u5b89\u88c5\u7684\u65b0\u63d2\u4ef6\u3002"'
$chunkCpmg['children: "All plugins from this marketplace are already installed."'] = 'children: "\u6b64\u5e02\u573a\u7684\u63d2\u4ef6\u5df2\u5168\u90e8\u5b89\u88c5\u3002"'
$chunkCpmg['children: "Install Plugins"'] = 'children: "\u5b89\u88c5\u63d2\u4ef6"'
$chunkCpmg['children: "Plugin details"'] = 'children: "\u63d2\u4ef6\u8be6\u60c5"'
$chunkCpmg['children: "Discover plugins"'] = 'children: "\u53d1\u73b0\u63d2\u4ef6"'
$chunkCpmg['children: "type to search"'] = 'children: "\u8f93\u5165\u4ee5\u641c\u7d22"'
$chunkCpmg['children: "Git is required to install marketplaces."'] = 'children: "\u5b89\u88c5\u5e02\u573a\u9700\u8981 Git\u3002"'
$chunkCpmg['children: "Please install git and restart Claude Code."'] = 'children: "\u8bf7\u5b89\u88c5 git \u5e76\u91cd\u542f Claude Code\u3002"'
$chunkCpmg['children: "Your organization policy does not allow any external marketplaces."'] = 'children: "\u7ec4\u7ec7\u7b56\u7565\u4e0d\u5141\u8bb8\u4efb\u4f55\u5916\u90e8\u5e02\u573a\u3002"'
$chunkCpmg['children: "Contact your administrator."'] = 'children: "\u8bf7\u8054\u7cfb\u7ba1\u7406\u5458\u3002"'
$chunkCpmg['children: "Your organization restricts which marketplaces can be added."'] = 'children: "\u7ec4\u7ec7\u9650\u5236\u53ef\u6dfb\u52a0\u7684\u5e02\u573a\u3002"'
$chunkCpmg['children: "Switch to the Marketplaces tab to view allowed sources."'] = 'children: "\u8bf7\u5207\u6362\u5230\u300c\u5e02\u573a\u300d\u6807\u7b7e\u67e5\u770b\u5141\u8bb8\u7684\u6765\u6e90\u3002"'
$chunkCpmg['children: "Failed to load marketplace data."'] = 'children: "\u52a0\u8f7d\u5e02\u573a\u6570\u636e\u5931\u8d25\u3002"'
$chunkCpmg['children: "Check your network connection."'] = 'children: "\u8bf7\u68c0\u67e5\u7f51\u7edc\u8fde\u63a5\u3002"'
$chunkCpmg['children: "All available plugins are already installed."'] = 'children: "\u6240\u6709\u53ef\u7528\u63d2\u4ef6\u5df2\u5b89\u88c5\u3002"'
$chunkCpmg['children: "Check for new plugins later or add more marketplaces."'] = 'children: "\u7a0d\u540e\u518d\u67e5\u65b0\u63d2\u4ef6\uff0c\u6216\u6dfb\u52a0\u66f4\u591a\u5e02\u573a\u3002"'
$chunkCpmg['children: "No plugins available."'] = 'children: "\u65e0\u53ef\u7528\u63d2\u4ef6\u3002"'
$chunkCpmg['children: "Add a marketplace first using the Marketplaces tab."'] = 'children: "\u8bf7\u5148\u5728\u300c\u5e02\u573a\u300d\u6807\u7b7e\u6dfb\u52a0\u5e02\u573a\u3002"'
$chunkCpmg['children: "Loading marketplaces\u2026"'] = 'children: "\u6b63\u5728\u52a0\u8f7d\u5e02\u573a\u2026"'
$chunkCpmg['children: "Loading marketplaces..."'] = 'children: "\u6b63\u5728\u52a0\u8f7d\u5e02\u573a\u2026"'
$chunkCpmg['children: "Loading installed plugins\u2026"'] = 'children: "\u6b63\u5728\u52a0\u8f7d\u5df2\u5b89\u88c5\u63d2\u4ef6\u2026"'
$chunkCpmg['children: "No plugin errors"'] = 'children: "\u65e0\u63d2\u4ef6\u9519\u8bef"'
$chunkCpmg['children: "Installed components:"'] = 'children: "\u5df2\u5b89\u88c5\u7ec4\u4ef6\uff1a"'
$chunkCpmg['children: "Managed by your organization \u2014 contact your admin"'] = 'children: "\u7531\u7ec4\u7ec7\u7ba1\u7406 \u2014 \u8bf7\u8054\u7cfb\u7ba1\u7406\u5458"'
$chunkCpmg['? "Managed by your organization \u2014 contact your admin" :'] = '? "\u7531\u7ec4\u7ec7\u7ba1\u7406 \u2014 \u8bf7\u8054\u7cfb\u7ba1\u7406\u5458" :'
$chunkCpmg['children: "Manage marketplaces"'] = 'children: "\u7ba1\u7406\u5e02\u573a"'
$chunkCpmg['children: "Updating marketplace\u2026"'] = 'children: "\u6b63\u5728\u66f4\u65b0\u5e02\u573a\u2026"'
$chunkCpmg['children: "Auto-update enabled. Claude Code will automatically update this marketplace and its installed plugins."'] = 'children: "\u5df2\u542f\u7528\u81ea\u52a8\u66f4\u65b0\u3002Claude Code \u5c06\u81ea\u52a8\u66f4\u65b0\u6b64\u5e02\u573a\u53ca\u5df2\u5b89\u88c5\u63d2\u4ef6\u3002"'
$chunkCpmg['children: "Please wait\u2026"'] = 'children: "\u8bf7\u7a0d\u5019\u2026"'
$chunkCpmg['children: "Pending changes:"'] = 'children: "\u5f85\u5904\u7406\u66f4\u6539\uff1a"'
$chunkCpmg['children: "Enter to apply"'] = 'children: "Enter \u5e94\u7528"'
$chunkCpmg['children: "Processing changes\u2026"'] = 'children: "\u6b63\u5728\u5904\u7406\u66f4\u6539\u2026"'
$chunkCpmg['children: "Capabilities: "'] = 'children: "\u80fd\u529b\uff1a "'
$chunkCpmg['children: "This may take a few moments."'] = 'children: "\u53ef\u80fd\u9700\u8981\u7247\u523b\u3002"'
$chunkCpmg['children: "Manage plugins"'] = 'children: "\u7ba1\u7406\u63d2\u4ef6"'
$chunkCpmg['children: "No plugins or MCP servers installed."'] = 'children: "\u672a\u5b89\u88c5\u63d2\u4ef6\u6216 MCP \u670d\u52a1\u5668\u3002"'
$chunkCpmg['children: "If the redirect page shows a connection error, paste the URL from your browser''s address bar:"'] = 'children: "\u82e5\u91cd\u5b9a\u5411\u9875\u663e\u793a\u8fde\u63a5\u9519\u8bef\uff0c\u8bf7\u7c98\u8d34\u6d4f\u89c8\u5668\u5730\u5740\u680f\u4e2d\u7684 URL\uff1a"'
$chunkCpmg['children: "Status: "'] = 'children: "\u72b6\u6001\uff1a "'
$chunkCpmg['children: "Auth: "'] = 'children: "\u8ba4\u8bc1\uff1a "'
$chunkCpmg['children: "URL: "'] = 'children: "URL\uff1a "'
$chunkCpmg['children: "Config location: "'] = 'children: "\u914d\u7f6e\u4f4d\u7f6e\uff1a "'
$chunkCpmg['children: "Tools: "'] = 'children: "\u5de5\u5177\uff1a "'
$chunkCpmg['children: "Command: "'] = 'children: "\u547d\u4ee4\uff1a "'
$chunkCpmg['children: "Args: "'] = 'children: "\u53c2\u6570\uff1a "'
$chunkCpmg['children: "Tool name: "'] = 'children: "\u5de5\u5177\u540d\uff1a "'
$chunkCpmg['children: "Full name: "'] = 'children: "\u5b8c\u6574\u540d\u79f0\uff1a "'
$chunkCpmg['children: "Description:"'] = 'children: "\u63cf\u8ff0\uff1a"'
$chunkCpmg['children: "Parameters:"'] = 'children: "\u53c2\u6570\uff1a"'
$chunkCpmg['label: "Install for you (user scope)"'] = 'label: "\u4e3a\u4f60\u5b89\u88c5\uff08\u7528\u6237\u8303\u56f4\uff09"'
$chunkCpmg['label: "Install for all collaborators on this repository (project scope)"'] = 'label: "\u4e3a\u672c\u4ed3\u5e93\u6240\u6709\u534f\u4f5c\u8005\u5b89\u88c5\uff08\u9879\u76ee\u8303\u56f4\uff09"'
$chunkCpmg['label: "Install for you, in this repo only (local scope)"'] = 'label: "\u4ec5\u5728\u672c\u4ed3\u5e93\u4e3a\u4f60\u5b89\u88c5\uff08\u672c\u5730\u8303\u56f4\uff09"'
$chunkCpmg['label: "Open homepage"'] = 'label: "\u6253\u5f00\u4e3b\u9875"'
$chunkCpmg['label: "View on GitHub"'] = 'label: "\u5728 GitHub \u67e5\u770b"'
$chunkCpmg['label: "Back to plugin list"'] = 'label: "\u8fd4\u56de\u63d2\u4ef6\u5217\u8868"'
$chunkCpmg['label: "Update marketplace"'] = 'label: "\u66f4\u65b0\u5e02\u573a"'
$chunkCpmg['label: "Remove marketplace"'] = 'label: "\u79fb\u9664\u5e02\u573a"'
$chunkCpmg['label: "Enable"'] = 'label: "\u542f\u7528"'
$chunkCpmg['label: "Disable"'] = 'label: "\u7981\u7528"'
$chunkCpmg['label: "View tools"'] = 'label: "\u67e5\u770b\u5de5\u5177"'
$chunkCpmg['label: "Authenticate"'] = 'label: "\u8ba4\u8bc1"'
$chunkCpmg['label: "Re-authenticate"'] = 'label: "\u91cd\u65b0\u8ba4\u8bc1"'
$chunkCpmg['label: "Clear authentication"'] = 'label: "\u6e05\u9664\u8ba4\u8bc1"'
$chunkCpmg['label: "Reconnect"'] = 'label: "\u91cd\u8fde"'
$chunkCpmg['label: "Back"'] = 'label: "\u8fd4\u56de"'
$chunkCpmg['label: "Configure"'] = 'label: "\u914d\u7f6e"'
$chunkCpmg['label: "Configure options"'] = 'label: "\u914d\u7f6e\u9009\u9879"'
$chunkCpmg['label: "Update now"'] = 'label: "\u7acb\u5373\u66f4\u65b0"'
$chunkCpmg['label: "Uninstall"'] = 'label: "\u5378\u8f7d"'
$chunkCpmg['description: "go back"'] = 'description: "\u8fd4\u56de"'
$chunkCpmg['" more above"'] = '" \u4e0a\u65b9\u66f4\u591a"'
$chunkCpmg['" more below"'] = '" \u4e0b\u65b9\u66f4\u591a"'
$chunkCpmg['children: "Plugin"'] = 'children: "\u63d2\u4ef6"'
$chunkCpmg['children: "removed"'] = 'children: "\u5df2\u79fb\u9664"'
$chunkCpmg['children: "Removed"'] = 'children: "\u5df2\u79fb\u9664"'
$chunkCpmg['children: "Dismiss"'] = 'children: "\u5173\u95ed"'
$chunkCpmg['children: "Remove"'] = 'children: "\u79fb\u9664"'
$chunkCpmg['children: "Components:"'] = 'children: "\u7ec4\u4ef6\uff1a"'
$chunkCpmg['" is enabled in .claude/settings.json (shared with your team)"'] = '" \u5df2\u5728 .claude/settings.json \u4e2d\u542f\u7528\uff08\u4e0e\u56e2\u961f\u5171\u4eab\uff09"'
$chunkCpmg['children: "Disable it just for you in .claude/settings.local.json?"'] = 'children: "\u662f\u5426\u4ec5\u5728 .claude/settings.local.json \u4e2d\u4e3a\u4f60\u7981\u7528\uff1f"'
$chunkCpmg['children: "This has the same effect as uninstalling, without affecting other contributors."'] = 'children: "\u6548\u679c\u4e0e\u5378\u8f7d\u76f8\u540c\uff0c\u4f46\u4e0d\u5f71\u54cd\u5176\u4ed6\u534f\u4f5c\u8005\u3002"'
$chunkCpmg['children: "Disabling\u2026"'] = 'children: "\u6b63\u5728\u7981\u7528\u2026"'
$chunkCpmg['" has "'] = '" \u6709 "'
$chunkCpmg['" of persistent data"'] = '" \u6301\u4e45\u6570\u636e"'
$chunkCpmg['children: "Delete it along with the plugin?"'] = 'children: "\u662f\u5426\u8fde\u540c\u63d2\u4ef6\u4e00\u8d77\u5220\u9664\uff1f"'
$chunkCpmg['children: "Uninstalling\u2026"'] = 'children: "\u6b63\u5728\u5378\u8f7d\u2026"'
$chunkCpmg['" to delete \xB7 "'] = '" \u5220\u9664 \xb7 "'
$chunkCpmg['" to keep \xB7"'] = '" \u4fdd\u7559 \xb7"'
$chunkCpmg['" to cancel"'] = '" \u53d6\u6d88"'
$chunkCpmg['children: "Scope: "'] = 'children: "\u8303\u56f4\uff1a "'
$chunkCpmg['children: "Version: "'] = 'children: "\u7248\u672c\uff1a "'
$chunkCpmg['children: "Author: "'] = 'children: "\u4f5c\u8005\uff1a "'
$chunkCpmg['children: "Processing\u2026"'] = 'children: "\u6b63\u5728\u5904\u7406\u2026"'
$chunkCpmg['children: "Run /reload-plugins to apply changes"'] = 'children: "\u8fd0\u884c /reload-plugins \u4ee5\u5e94\u7528\u66f4\u6539"'
$chunkCpmg['children: "Return here after authenticating in your browser. Press Esc \u8fd4\u56de."'] = 'children: "\u6d4f\u89c8\u5668\u8ba4\u8bc1\u540e\u8bf7\u8fd4\u56de\u6b64\u5904\u3002\u6309 Esc \u8fd4\u56de\u3002"'
$chunkCpmg['label: "View repository"'] = 'label: "\u67e5\u770b\u4ed3\u5e93"'
$chunkCpmg['?? "Installation failed"'] = '?? "\u5b89\u88c5\u5931\u8d25"'
$chunkCpmg['failed to load \xB7 '] = '\u52a0\u8f7d\u5931\u8d25 \xb7 '
$chunkCpmg['description: "cancel"'] = 'description: "\u53d6\u6d88"'
$chunkCpmg['description: "back"'] = 'description: "\u8fd4\u56de"'
$chunkCpmg['description: "dismiss"'] = 'description: "\u5173\u95ed"'
$chunkCpmg['description: "disable"'] = 'description: "\u7981\u7528"'
$chunkCpmg['description: "remove"'] = 'description: "\u79fb\u9664"'
$chunkCpmg['children: "Plugin Command Usage:"'] = 'children: "\u63d2\u4ef6\u547d\u4ee4\u7528\u6cd5\uff1a"'
$chunkCpmg['children: "Installation:"'] = 'children: "\u5b89\u88c5\uff1a"'
$chunkCpmg['children: "Management:"'] = 'children: "\u7ba1\u7406\uff1a"'
$chunkCpmg['children: "Marketplaces:"'] = 'children: "\u5e02\u573a\uff1a"'
$chunkCpmg['children: "Validation:"'] = 'children: "\u9a8c\u8bc1\uff1a"'
$chunkCpmg['children: "Other:"'] = 'children: "\u5176\u4ed6\uff1a"'
$chunkCpmg['const message = `\u2713 Installed ${successCount} ${plural(successCount, "plugin")}. ` + `Run /reload-plugins to activate.`;'] = 'const message = `\u2713 \u5df2\u5b89\u88c5 ${successCount} \u4e2a\u63d2\u4ef6\u3002 ` + `\u8fd0\u884c /reload-plugins \u4ee5\u6fc0\u6d3b\u3002`;'
$chunkCpmg['setError(`Failed to install: ${formatFailureDetails(newFailedPlugins, true)}`);'] = 'setError(`\u5b89\u88c5\u5931\u8d25\uff1a${formatFailureDetails(newFailedPlugins, true)}`);'
$chunkCpmg['const message = `\u2713 Installed ${successCount} of ${successCount + failureCount} plugins. ` + `Failed: ${formatFailureDetails(newFailedPlugins, false)}. ` + `Run /reload-plugins to activate successfully installed plugins.`;'] = 'const message = `\u2713 \u5df2\u5b89\u88c5 ${successCount}/${successCount + failureCount} \u4e2a\u63d2\u4ef6\u3002 ` + `\u5931\u8d25\uff1a${formatFailureDetails(newFailedPlugins, false)}\u3002 ` + `\u8fd0\u884c /reload-plugins \u4ee5\u6fc0\u6d3b\u5df2\u6210\u529f\u5b89\u88c5\u7684\u63d2\u4ef6\u3002`;'
$chunkCpmg['message: `Reconnected to ${serverName}.`,'] = 'message: `\u5df2\u91cd\u8fde ${serverName}\u3002`,'
$chunkCpmg['message: `${serverName} requires authentication. Use the ''Authenticate'' option.`,'] = 'message: `${serverName} \u9700\u8981\u8ba4\u8bc1\u3002\u8bf7\u4f7f\u7528\u300c\u8ba4\u8bc1\u300d\u9009\u9879\u3002`,'
$chunkCpmg['message: `Failed to reconnect to ${serverName}.`,'] = 'message: `\u91cd\u8fde ${serverName} \u5931\u8d25\u3002`,'
$chunkCpmg['message: `Unknown result when reconnecting to ${serverName}.`,'] = 'message: `\u91cd\u8fde ${serverName} \u65f6\u8fd4\u56de\u672a\u77e5\u7ed3\u679c\u3002`,'

$chunkCpmg2 = New-ReplacementMap
$chunkCpmg2['finish(`\u2713 Installed and configured ${plugin.name}. Run /reload-plugins to apply.`);'] = 'finish(`\u2713 \u5df2\u5b89\u88c5\u5e76\u914d\u7f6e ${plugin.name}\u3002\u8fd0\u884c /reload-plugins \u4ee5\u5e94\u7528\u3002`);'
$chunkCpmg2['finish(`\u2713 Installed ${plugin.name}. Run /reload-plugins to apply.`);'] = 'finish(`\u2713 \u5df2\u5b89\u88c5 ${plugin.name}\u3002\u8fd0\u884c /reload-plugins \u4ee5\u5e94\u7528\u3002`);'
$chunkCpmg2['finish(`Installed but failed to save config: ${detail}`);'] = 'finish(`\u5df2\u5b89\u88c5\u4f46\u4fdd\u5b58\u914d\u7f6e\u5931\u8d25\uff1a${detail}`);'
$chunkCpmg2['finish(`\u2713 Enabled and configured ${selectedPlugin.plugin.name}. Run /reload-plugins to apply.`);'] = 'finish(`\u2713 \u5df2\u542f\u7528\u5e76\u914d\u7f6e ${selectedPlugin.plugin.name}\u3002\u8fd0\u884c /reload-plugins \u4ee5\u5e94\u7528\u3002`);'
$chunkCpmg2['finish(`\u2713 Enabled ${selectedPlugin.plugin.name}. Run /reload-plugins to apply.`);'] = 'finish(`\u2713 \u5df2\u542f\u7528 ${selectedPlugin.plugin.name}\u3002\u8fd0\u884c /reload-plugins \u4ee5\u5e94\u7528\u3002`);'
$chunkCpmg2['finish(`Failed to save configuration: ${detail}`);'] = 'finish(`\u4fdd\u5b58\u914d\u7f6e\u5931\u8d25\uff1a${detail}`);'
$chunkCpmg2['setResult("Configuration saved. Run /reload-plugins for changes to take effect.");'] = 'setResult("\u914d\u7f6e\u5df2\u4fdd\u5b58\u3002\u8fd0\u884c /reload-plugins \u4f7f\u66f4\u6539\u751f\u6548\u3002");'
$chunkCpmg2['title: `Configure ${'] = 'title: `\u914d\u7f6e ${'
$chunkCpmg2['onComplete?.(`Authentication successful. Connected to ${server.name}.`);'] = 'onComplete?.(`\u8ba4\u8bc1\u6210\u529f\uff0c\u5df2\u8fde\u63a5 ${server.name}\u3002`);'
$chunkCpmg2['onComplete?.("Authentication successful, but server still requires authentication. You may need to manually restart Claude Code.");'] = 'onComplete?.("\u8ba4\u8bc1\u6210\u529f\uff0c\u4f46\u670d\u52a1\u5668\u4ecd\u9700\u8ba4\u8bc1\u3002\u53ef\u80fd\u9700\u8981\u624b\u52a8\u91cd\u542f Claude Code\u3002");'
$chunkCpmg2['onComplete?.("Authentication successful, but server reconnection failed. You may need to manually restart Claude Code for the changes to take effect.");'] = 'onComplete?.("\u8ba4\u8bc1\u6210\u529f\uff0c\u4f46\u670d\u52a1\u5668\u91cd\u8fde\u5931\u8d25\u3002\u53ef\u80fd\u9700\u8981\u624b\u52a8\u91cd\u542f Claude Code \u4f7f\u66f4\u6539\u751f\u6548\u3002");'
$chunkCpmg2['const message = isEffectivelyAuthenticated ? `Authentication successful. Reconnected to ${server.name}.` : `Authentication successful. Connected to ${server.name}.`;'] = 'const message = isEffectivelyAuthenticated ? `\u8ba4\u8bc1\u6210\u529f\uff0c\u5df2\u91cd\u8fde ${server.name}\u3002` : `\u8ba4\u8bc1\u6210\u529f\uff0c\u5df2\u8fde\u63a5 ${server.name}\u3002`;'
$chunkCpmg2['"Remove marketplace "'] = '"\u79fb\u9664\u5e02\u573a "'
$chunkCpmg2['"This will also uninstall "'] = '"\u8fd8\u5c06\u5378\u8f7d\u6b64\u5e02\u573a\u7684 "'
$chunkCpmg2['" from this marketplace:"'] = '"\uff1a"'
$chunkCpmg2['plural(pluginCount, "plugin")'] = '"\u4e2a\u63d2\u4ef6"'
$chunkCpmg2['plural(marketplace.totalPlugins, "plugin")'] = '"\u4e2a\u63d2\u4ef6"'
$chunkCpmg2['" available"'] = '" \u53ef\u7528"'
$chunkCpmg2['` \xB7 ${marketplace.installedCount} already installed`'] = '` \xb7 ${marketplace.installedCount} \u5df2\u5b89\u88c5`'
$chunkCpmg2['selectedMarketplace.pluginCount || 0,
              " available",
              " ",
              plural(selectedMarketplace.pluginCount || 0, "plugin")'] = 'selectedMarketplace.pluginCount || 0,
              "\u4e2a\u53ef\u7528\u63d2\u4ef6"'
$chunkCpmg2['"Installed plugins ("'] = '"\u5df2\u5b89\u88c5\u63d2\u4ef6\uff08"'
$chunkCpmg2['label: `Browse plugins (${marketplace.pluginCount ?? 0})`'] = 'label: `\u6d4f\u89c8\u63d2\u4ef6\uff08${marketplace.pluginCount ?? 0}\uff09`'
$chunkCpmg2['label: marketplace.autoUpdate ? "Disable auto-update" : "Enable auto-update"'] = 'label: marketplace.autoUpdate ? "\u7981\u7528\u81ea\u52a8\u66f4\u65b0" : "\u542f\u7528\u81ea\u52a8\u66f4\u65b0"'
$chunkCpmg2['secondaryLabel: marketplace.lastUpdated ? `(last updated ${new Date(marketplace.lastUpdated).toLocaleDateString()})` : undefined'] = 'secondaryLabel: marketplace.lastUpdated ? `\uff08\u4e0a\u6b21\u66f4\u65b0 ${new Date(marketplace.lastUpdated).toLocaleDateString()}\uff09` : undefined'
$chunkCpmg2['"\u2022 Update "'] = '"\u2022 \u66f4\u65b0 "'
$chunkCpmg2['"\u2022 Remove "'] = '"\u2022 \u79fb\u9664 "'
$chunkCpmg2['plural(updateCount, "marketplace")'] = '"\u4e2a\u5e02\u573a"'
$chunkCpmg2['plural(removeCount, "marketplace")'] = '"\u4e2a\u5e02\u573a"'
$chunkCpmg2['const pluginPart = updatedPluginCount > 0 ? ` (${updatedPluginCount} ${plural(updatedPluginCount, "plugin")} bumped)` : "";'] = 'const pluginPart = updatedPluginCount > 0 ? `\uff08${updatedPluginCount} \u4e2a\u63d2\u4ef6\u5df2\u5347\u7ea7\uff09` : "";'
$chunkCpmg2['actions.push(`Updated ${updatedCount} ${plural(updatedCount, "marketplace")}${pluginPart}`);'] = 'actions.push(`\u5df2\u66f4\u65b0 ${updatedCount} \u4e2a\u5e02\u573a${pluginPart}`);'
$chunkCpmg2['actions.push(`Removed ${removedCount} ${plural(removedCount, "marketplace")}`);'] = 'actions.push(`\u5df2\u79fb\u9664 ${removedCount} \u4e2a\u5e02\u573a`);'
$chunkCpmg2['text: "Removed from marketplace"'] = 'text: "\u5df2\u4ece\u5e02\u573a\u79fb\u9664"'
$chunkCpmg2['"Removed from marketplace \xB7 reason: "'] = '"\u5df2\u4ece\u5e02\u573a\u79fb\u9664 \xb7 \u539f\u56e0\uff1a "'
$chunkCpmg2['setActionMessage(`${figures_default.tick} Removed "${action.name}" from ${scopes} settings`);'] = 'setActionMessage(`${figures_default.tick} \u5df2\u4ece ${scopes} \u8bbe\u7f6e\u4e2d\u79fb\u9664\u201c${action.name}\u201d`);'
$chunkCpmg2['setActionMessage(`${figures_default.tick} Removed marketplace "${action.name}"`);'] = 'setActionMessage(`${figures_default.tick} \u5df2\u79fb\u9664\u5e02\u573a\u201c${action.name}\u201d`);'
$chunkCpmg2['setActionMessage(`Failed to remove "${action.name}": ${err instanceof Error ? err.message : String(err)}`);'] = 'setActionMessage(`\u79fb\u9664\u201c${action.name}\u201d\u5931\u8d25\uff1a${err instanceof Error ? err.message : String(err)}`);'
$chunkCpmg2['"Press "'] = '"\u6309 "'
$chunkCpmg2['" to confirm or "'] = '" \u786e\u8ba4\u6216 "'
$chunkCpmg2['subtitle: `${serverTools.length} ${plural(serverTools.length, "tool")}`'] = 'subtitle: `${serverTools.length} \u4e2a\u5de5\u5177`'
$chunkCpmg2['statusText2 = `${item.errorCount} ${plural(item.errorCount, "error")}`;'] = 'statusText2 = `${item.errorCount} \u4e2a\u9519\u8bef`;'
$chunkCpmg2['const statusText2 = `failed to load \xB7 ${item.errorCount} ${plural(item.errorCount, "error")}`;'] = 'const statusText2 = `\u52a0\u8f7d\u5931\u8d25 \xb7 ${item.errorCount} \u4e2a\u9519\u8bef`;'
$chunkCpmg2['plural(filteredPluginErrors.length, "error")'] = '"\u9519\u8bef"'
$chunkCpmg2['output += `Validating ${result.fileType} manifest: ${result.filePath}'] = 'output += `\u6b63\u5728\u9a8c\u8bc1 ${result.fileType} \u6e05\u5355\uff1a${result.filePath}'
$chunkCpmg2['output += `${figures_default.cross} Found ${result.errors.length} ${plural(result.errors.length, "error")}:'] = 'output += `${figures_default.cross} \u53d1\u73b0 ${result.errors.length} \u4e2a\u9519\u8bef\uff1a'
$chunkCpmg2['output += `${figures_default.warning} Found ${result.warnings.length} ${plural(result.warnings.length, "warning")}:'] = 'output += `${figures_default.warning} \u53d1\u73b0 ${result.warnings.length} \u4e2a\u8b66\u544a\uff1a'
$chunkCpmg2['output += `${figures_default.tick} Validation passed with warnings'] = 'output += `${figures_default.tick} \u9a8c\u8bc1\u901a\u8fc7\uff08\u6709\u8b66\u544a\uff09'
$chunkCpmg2['output += `${figures_default.tick} Validation passed'] = 'output += `${figures_default.tick} \u9a8c\u8bc1\u901a\u8fc7'
$chunkCpmg2['output += `${figures_default.cross} Validation failed'] = 'output += `${figures_default.cross} \u9a8c\u8bc1\u5931\u8d25'
$chunkCpmg2['onComplete(`${figures_default.cross} Unexpected error during validation: ${errorMessage(error)}`);'] = 'onComplete(`${figures_default.cross} \u9a8c\u8bc1\u65f6\u53d1\u751f\u610f\u5916\u9519\u8bef\uff1a${errorMessage(error)}`);'
$chunkCpmg2['children: " /plugin install - Browse and install plugins"'] = 'children: " /plugin install - \u6d4f\u89c8\u5e76\u5b89\u88c5\u63d2\u4ef6"'
$chunkCpmg2['"/plugin install <marketplace> - Install from specific marketplace"'] = '"/plugin install <marketplace> - \u4ece\u6307\u5b9a\u5e02\u573a\u5b89\u88c5"'
$chunkCpmg2['children: " /plugin install <plugin> - Install specific plugin"'] = 'children: " /plugin install <plugin> - \u5b89\u88c5\u6307\u5b9a\u63d2\u4ef6"'
$chunkCpmg2['"/plugin install <plugin>@<market> - Install plugin from marketplace"'] = '"/plugin install <plugin>@<market> - \u4ece\u5e02\u573a\u5b89\u88c5\u6307\u5b9a\u63d2\u4ef6"'
$chunkCpmg2['children: " /plugin manage - Manage installed plugins"'] = 'children: " /plugin manage - \u7ba1\u7406\u5df2\u5b89\u88c5\u63d2\u4ef6"'
$chunkCpmg2['children: " /plugin enable <plugin> - Enable a plugin"'] = 'children: " /plugin enable <plugin> - \u542f\u7528\u63d2\u4ef6"'
$chunkCpmg2['children: " /plugin disable <plugin> - Disable a plugin"'] = 'children: " /plugin disable <plugin> - \u7981\u7528\u63d2\u4ef6"'
$chunkCpmg2['children: " /plugin uninstall <plugin> - Uninstall a plugin"'] = 'children: " /plugin uninstall <plugin> - \u5378\u8f7d\u63d2\u4ef6"'
$chunkCpmg2['children: " /plugin marketplace - Marketplace management menu"'] = 'children: " /plugin marketplace - \u5e02\u573a\u7ba1\u7406\u83dc\u5355"'
$chunkCpmg2['children: " /plugin marketplace add - Add a marketplace"'] = 'children: " /plugin marketplace add - \u6dfb\u52a0\u5e02\u573a"'
$chunkCpmg2['"/plugin marketplace add <path/url> - Add marketplace directly"'] = '"/plugin marketplace add <path/url> - \u76f4\u63a5\u6dfb\u52a0\u5e02\u573a"'
$chunkCpmg2['children: " /plugin marketplace update - Update marketplaces"'] = 'children: " /plugin marketplace update - \u66f4\u65b0\u5e02\u573a"'
$chunkCpmg2['"/plugin marketplace update <name> - Update specific marketplace"'] = '"/plugin marketplace update <name> - \u66f4\u65b0\u6307\u5b9a\u5e02\u573a"'
$chunkCpmg2['children: " /plugin marketplace remove - Remove a marketplace"'] = 'children: " /plugin marketplace remove - \u79fb\u9664\u5e02\u573a"'
$chunkCpmg2['"/plugin marketplace remove <name> - Remove specific marketplace"'] = '"/plugin marketplace remove <name> - \u79fb\u9664\u6307\u5b9a\u5e02\u573a"'
$chunkCpmg2['children: " /plugin marketplace list - List all marketplaces"'] = 'children: " /plugin marketplace list - \u5217\u51fa\u6240\u6709\u5e02\u573a"'
$chunkCpmg2['"/plugin validate <path> - Validate a manifest file or directory"'] = '"/plugin validate <path> - \u9a8c\u8bc1\u6e05\u5355\u6587\u4ef6\u6216\u76ee\u5f55"'
$chunkCpmg2['children: " /plugin - Main plugin menu"'] = 'children: " /plugin - \u63d2\u4ef6\u4e3b\u83dc\u5355"'
$chunkCpmg2['children: " /plugin help - Show this help"'] = 'children: " /plugin help - \u663e\u793a\u6b64\u5e2e\u52a9"'
$chunkCpmg2['children: " /plugins - Alias for /plugin"'] = 'children: " /plugins - /plugin \u522b\u540d"'

$chunkCpmg3 = New-ReplacementMap
$chunkCpmg3['setResult("Plugin enabled. Configuration skipped \u2014 run /reload-plugins to apply.");'] = 'setResult("\u63d2\u4ef6\u5df2\u542f\u7528\uff0c\u5df2\u8df3\u8fc7\u914d\u7f6e \u2014 \u8bf7\u8fd0\u884c /reload-plugins \u4ee5\u5e94\u7528\u3002");'
$chunkCpmg3['setResult("Run /reload-plugins to apply plugin changes.");'] = 'setResult("\u8bf7\u8fd0\u884c /reload-plugins \u4ee5\u5e94\u7528\u63d2\u4ef6\u66f4\u6539\u3002");'
$chunkCpmg3['setResult(`Successfully added marketplace: ${name}`);'] = 'setResult(`\u5df2\u6210\u529f\u6dfb\u52a0\u5e02\u573a\uff1a${name}`);'
$chunkCpmg3['setResult(`Error: ${error2.message}`);'] = 'setResult(`\u9519\u8bef\uff1a${error2.message}`);'
$chunkCpmg3['setError("Please enter a marketplace source");'] = 'setError("\u8bf7\u8f93\u5165\u5e02\u573a\u6765\u6e90");'
$chunkCpmg3['setError("Invalid marketplace source format. Try: owner/repo, https://..., or ./path");'] = 'setError("\u5e02\u573a\u6765\u6e90\u683c\u5f0f\u65e0\u6548\u3002\u8bd5\u8bd5\uff1aowner/repo\u3001https://...\u6216 ./path");'
$chunkCpmg3['children: progressMessage || "Adding marketplace to configuration\u2026"'] = 'children: progressMessage || "\u6b63\u5728\u5c06\u5e02\u573a\u6dfb\u52a0\u5230\u914d\u7f6e\u2026"'
$chunkCpmg3['setError(`Plugin ''${pluginId}'' is already installed globally. Use ''/plugin'' to manage existing plugins.`);'] = 'setError(`\u63d2\u4ef6 ''${pluginId}'' \u5df2\u5168\u5c40\u5b89\u88c5\u3002\u4f7f\u7528 ''/plugin'' \u7ba1\u7406\u5df2\u5b89\u88c5\u63d2\u4ef6\u3002`);'
$chunkCpmg3['setError(`Plugin ''${foundPlugin.pluginId}'' is already installed. Use ''/plugin'' to manage existing plugins.`);'] = 'setError(`\u63d2\u4ef6 ''${foundPlugin.pluginId}'' \u5df2\u5b89\u88c5\u3002\u4f7f\u7528 ''/plugin'' \u7ba1\u7406\u5df2\u5b89\u88c5\u63d2\u4ef6\u3002`);'
$chunkCpmg3['setError(`Plugin "${targetPlugin}" not found in any marketplace`);'] = 'setError(`\u5728\u4efb\u4f55\u5e02\u573a\u672a\u627e\u5230\u63d2\u4ef6 "${targetPlugin}"`);'
$chunkCpmg3['setError(`Marketplace "${targetMarketplace}" not found`);'] = 'setError(`\u672a\u627e\u5230\u5e02\u573a "${targetMarketplace}"`);'
$chunkCpmg3['setError(err instanceof Error ? err.message : "Failed to load marketplaces");'] = 'setError(err instanceof Error ? err.message : "\u52a0\u8f7d\u5e02\u573a\u5931\u8d25");'
$chunkCpmg3['setError(err instanceof Error ? err.message : "Failed to load plugins");'] = 'setError(err instanceof Error ? err.message : "\u52a0\u8f7d\u63d2\u4ef6\u5931\u8d25");'
$chunkCpmg3['setProcessError(err instanceof Error ? err.message : "Failed to load marketplaces");'] = 'setProcessError(err instanceof Error ? err.message : "\u52a0\u8f7d\u5e02\u573a\u5931\u8d25");'
$chunkCpmg3['setProcessError(err instanceof Error ? err.message : "Failed to update setting");'] = 'setProcessError(err instanceof Error ? err.message : "\u66f4\u65b0\u8bbe\u7f6e\u5931\u8d25");'
$chunkCpmg3['setResult(`Plugin "${targetPlugin}" is not installed in this project`);'] = 'setResult(`\u6b64\u9879\u76ee\u672a\u5b89\u88c5\u63d2\u4ef6 "${targetPlugin}"`);'
$chunkCpmg3['setResult(`${selectedPlugin.plugin.name} is already at the latest version (${result.newVersion}).`);'] = 'setResult(`${selectedPlugin.plugin.name} \u5df2\u662f\u6700\u65b0\u7248\u672c\uff08${result.newVersion}\uff09\u3002`);'
$chunkCpmg3['setResult(`\u2713 Disabled ${selectedPlugin.plugin.name} in .claude/settings.local.json. Run /reload-plugins to apply.`);'] = 'setResult(`\u2713 \u5df2\u5728 .claude/settings.local.json \u7981\u7528 ${selectedPlugin.plugin.name}\u3002\u8bf7\u8fd0\u884c /reload-plugins \u4ee5\u5e94\u7528\u3002`);'
$chunkCpmg3['const operationName = operation === "enable" ? "Enabled" : operation === "disable" ? "Disabled" : operation === "update" ? "Updated" : "Uninstalled";'] = 'const operationName = operation === "enable" ? "\u5df2\u542f\u7528" : operation === "disable" ? "\u5df2\u7981\u7528" : operation === "update" ? "\u5df2\u66f4\u65b0" : "\u5df2\u5378\u8f7d";'
$chunkCpmg3['const depWarn = reverseDependents && reverseDependents.length > 0 ? ` \xB7 required by ${reverseDependents.join(", ")}` : "";'] = 'const depWarn = reverseDependents && reverseDependents.length > 0 ? ` \xb7 \u88ab ${reverseDependents.join(", ")} \u4f9d\u8d56` : "";'
$chunkCpmg3['const message = `\u2713 ${operationName} ${selectedPlugin.plugin.name}${depWarn}. Run /reload-plugins to apply.`;'] = 'const message = `\u2713 ${operationName} ${selectedPlugin.plugin.name}${depWarn}\u3002\u8bf7\u8fd0\u884c /reload-plugins \u4ee5\u5e94\u7528\u3002`;'
$chunkCpmg3['setProcessError(`Failed to ${operation}: ${errorMessage2}`);'] = 'setProcessError(`\u64cd\u4f5c\u5931\u8d25\uff08${operation}\uff09\uff1a${errorMessage2}`);'
$chunkCpmg3['setProcessError("Built-in plugins cannot be updated or uninstalled.");'] = 'setProcessError("\u5185\u7f6e\u63d2\u4ef6\u65e0\u6cd5\u66f4\u65b0\u6216\u5378\u8f7d\u3002");'
$chunkCpmg3['setProcessError("This plugin is managed by your organization. Contact your admin to disable it.");'] = 'setProcessError("\u6b64\u63d2\u4ef6\u7531\u7ec4\u7ec7\u7ba1\u7406\u3002\u8981\u7981\u7528\u8bf7\u8054\u7cfb\u7ba1\u7406\u5458\u3002");'
$chunkCpmg3['setProcessError(`Failed to write settings: ${error.message}`);'] = 'setProcessError(`\u5199\u5165\u8bbe\u7f6e\u5931\u8d25\uff1a${error.message}`);'
$chunkCpmg3['setProcessError(`Failed to save configuration: ${errorMessage(err)}`);'] = 'setProcessError(`\u4fdd\u5b58\u914d\u7f6e\u5931\u8d25\uff1a${errorMessage(err)}`);'
$chunkCpmg3['setProcessError(`Failed to save configuration: ${errorMsg}`);'] = 'setProcessError(`\u4fdd\u5b58\u914d\u7f6e\u5931\u8d25\uff1a${errorMsg}`);'
$chunkCpmg3['setProcessError("No MCPB file found in plugin");'] = 'setProcessError("\u63d2\u4ef6\u4e2d\u672a\u627e\u5230 MCPB \u6587\u4ef6");'
$chunkCpmg3['setProcessError("Failed to load MCPB for configuration");'] = 'setProcessError("\u52a0\u8f7d MCPB \u914d\u7f6e\u5931\u8d25");'
$chunkCpmg3['setProcessError(`Failed to load configuration: ${errorMsg}`);'] = 'setProcessError(`\u52a0\u8f7d\u914d\u7f6e\u5931\u8d25\uff1a${errorMsg}`);'
$chunkCpmg3['setProcessError("No MCPB file found");'] = 'setProcessError("\u672a\u627e\u5230 MCPB \u6587\u4ef6");'
$chunkCpmg3['setProcessError(error instanceof Error ? error.message : "Failed to check plugin update availability");'] = 'setProcessError(error instanceof Error ? error.message : "\u68c0\u67e5\u63d2\u4ef6\u66f4\u65b0\u53ef\u7528\u6027\u5931\u8d25");'
$chunkCpmg3['onComplete?.(`Disconnected from ${server.name}.`);'] = 'onComplete?.(`\u5df2\u65ad\u5f00\u4e0e ${server.name} \u7684\u8fde\u63a5\u3002`);'
$chunkCpmg3['return `Error reconnecting to ${serverName}: ${errorMessage2}`;'] = 'return `\u91cd\u8fde ${serverName} \u9519\u8bef\uff1a${errorMessage2}`;'
$chunkCpmg3['guidance: "Restart to retry loading plugins"'] = 'guidance: "\u91cd\u542f\u540e\u91cd\u8bd5\u52a0\u8f7d\u63d2\u4ef6"'
$chunkCpmg3['statusText2 = item.pendingToggle === "will-enable" ? "will enable" : "will disable";'] = 'statusText2 = item.pendingToggle === "will-enable" ? "\u5c06\u542f\u7528" : "\u5c06\u7981\u7528";'
$chunkCpmg3['statusText = "connected";'] = 'statusText = "\u5df2\u8fde\u63a5";'
$chunkCpmg3['statusText = "disabled";'] = 'statusText = "\u5df2\u7981\u7528";'
$chunkCpmg3['statusText = "connecting\u2026";'] = 'statusText = "\u8fde\u63a5\u4e2d\u2026";'
$chunkCpmg3['statusText = "Enter to auth";'] = 'statusText = "Enter \u8ba4\u8bc1";'
$chunkCpmg3['statusText = "failed";'] = 'statusText = "\u5931\u8d25";'
$chunkCpmg3['" disabled"'] = '" \u5df2\u7981\u7528"'
$chunkCpmg3['" connected"'] = '" \u5df2\u8fde\u63a5"'
$chunkCpmg3['children: " connecting\u2026"'] = 'children: " \u8fde\u63a5\u4e2d\u2026"'
$chunkCpmg3['" needs authentication"'] = '" \u9700\u8981\u8ba4\u8bc1"'
$chunkCpmg3['" failed"'] = '" \u5931\u8d25"'
$chunkCpmg3['" authenticated"'] = '" \u5df2\u8ba4\u8bc1"'
$chunkCpmg3['" not authenticated"'] = '" \u672a\u8ba4\u8bc1"'
$chunkCpmg3['return `Local plugins cannot be updated remotely. To update, modify the source at: ${entry.source}`;'] = 'return `\u672c\u5730\u63d2\u4ef6\u65e0\u6cd5\u8fdc\u7a0b\u66f4\u65b0\u3002\u8981\u66f4\u65b0\u8bf7\u4fee\u6539\u6e90\uff1a${entry.source}`;'
$chunkCpmg3['return `${error.component} path not found: ${error.path}`;'] = 'return `\u672a\u627e\u5230 ${error.component} \u8def\u5f84\uff1a${error.path}`;'
$chunkCpmg3['return `Git ${error.authType.toUpperCase()} authentication failed for ${error.gitUrl}`;'] = 'return `Git ${error.authType.toUpperCase()} \u8ba4\u8bc1\u5931\u8d25\uff1a${error.gitUrl}`;'
$chunkCpmg3['return `Git ${error.operation} timed out for ${error.gitUrl}`;'] = 'return `Git ${error.operation} \u8d85\u65f6\uff1a${error.gitUrl}`;'
$chunkCpmg3['return `Network error accessing ${error.url}${error.details ? `: ${error.details}` : ""}`;'] = 'return `\u8bbf\u95ee ${error.url} \u7f51\u7edc\u9519\u8bef${error.details ? `\uff1a${error.details}` : ""}`;'
$chunkCpmg3['return `Failed to parse manifest at ${error.manifestPath}: ${error.parseError}`;'] = 'return `\u89e3\u6790\u6e05\u5355\u5931\u8d25 ${error.manifestPath}\uff1a${error.parseError}`;'
$chunkCpmg3['return `Invalid manifest at ${error.manifestPath}: ${error.validationErrors.join(", ")}`;'] = 'return `\u6e05\u5355\u65e0\u6548 ${error.manifestPath}\uff1a${error.validationErrors.join(", ")}`;'
$chunkCpmg3['return `Plugin "${error.pluginId}" not found in marketplace "${error.marketplace}"`;'] = 'return `\u5728\u5e02\u573a "${error.marketplace}" \u672a\u627e\u5230\u63d2\u4ef6 "${error.pluginId}"`;'
$chunkCpmg3['return `Marketplace "${error.marketplace}" not found`;'] = 'return `\u672a\u627e\u5230\u5e02\u573a "${error.marketplace}"`;'
$chunkCpmg3['return `Failed to load marketplace "${error.marketplace}": ${error.reason}`;'] = 'return `\u52a0\u8f7d\u5e02\u573a "${error.marketplace}" \u5931\u8d25\uff1a${error.reason}`;'
$chunkCpmg3['return `Invalid MCP server config for "${error.serverName}": ${error.validationError}`;'] = 'return `MCP \u670d\u52a1\u5668 "${error.serverName}" \u914d\u7f6e\u65e0\u6548\uff1a${error.validationError}`;'
$chunkCpmg3['const dup = error.duplicateOf.startsWith("plugin:") ? `server provided by plugin "${error.duplicateOf.split(":")[1] ?? "?"}"` : `already-configured "${error.duplicateOf}"`;'] = 'const dup = error.duplicateOf.startsWith("plugin:") ? `\u63d2\u4ef6 "${error.duplicateOf.split(":")[1] ?? "?"}" \u63d0\u4f9b\u7684\u670d\u52a1\u5668` : `\u5df2\u914d\u7f6e\u7684 "${error.duplicateOf}"`;'
$chunkCpmg3['return `MCP server "${error.serverName}" skipped \u2014 same command/URL as ${dup}`;'] = 'return `MCP \u670d\u52a1\u5668 "${error.serverName}" \u5df2\u8df3\u8fc7 \u2014 \u4e0e ${dup} \u547d\u4ee4/URL \u76f8\u540c`;'
$chunkCpmg3['return error.blockedByBlocklist ? `Marketplace "${error.marketplace}" is blocked by enterprise policy` : `Marketplace "${error.marketplace}" is not in the allowed marketplace list`;'] = 'return error.blockedByBlocklist ? `\u5e02\u573a "${error.marketplace}" \u88ab\u4f01\u4e1a\u7b56\u7565\u7981\u7528` : `\u5e02\u573a "${error.marketplace}" \u4e0d\u5728\u5141\u8bb8\u7684\u5e02\u573a\u5217\u8868\u4e2d`;'
$chunkCpmg3['return error.reason === "not-enabled" ? `Dependency "${error.dependency}" is disabled` : `Dependency "${error.dependency}" is not installed`;'] = 'return error.reason === "not-enabled" ? `\u4f9d\u8d56 "${error.dependency}" \u5df2\u7981\u7528` : `\u4f9d\u8d56 "${error.dependency}" \u672a\u5b89\u88c5`;'
$chunkCpmg3['return "Check that the path in your manifest or marketplace config is correct";'] = 'return "\u8bf7\u68c0\u67e5\u6e05\u5355\u6216\u5e02\u573a\u914d\u7f6e\u4e2d\u7684\u8def\u5f84\u662f\u5426\u6b63\u786e";'
$chunkCpmg3['return error.authType === "ssh" ? "Configure SSH keys or use HTTPS URL instead" : "Configure credentials or use SSH URL instead";'] = 'return error.authType === "ssh" ? "\u8bf7\u914d\u7f6e SSH \u5bc6\u94a5\u6216\u6539\u7528 HTTPS URL" : "\u8bf7\u914d\u7f6e\u51ed\u8bc1\u6216\u6539\u7528 SSH URL";'
$chunkCpmg3['return "Check your internet connection and try again";'] = 'return "\u8bf7\u68c0\u67e5\u7f51\u7edc\u8fde\u63a5\u540e\u91cd\u8bd5";'
$chunkCpmg3['return "Check manifest file syntax in the plugin directory";'] = 'return "\u8bf7\u68c0\u67e5\u63d2\u4ef6\u76ee\u5f55\u4e2d\u6e05\u5355\u6587\u4ef6\u8bed\u6cd5";'
$chunkCpmg3['return "Check manifest file follows the required schema";'] = 'return "\u8bf7\u68c0\u67e5\u6e05\u5355\u662f\u5426\u7b26\u5408\u6240\u9700\u67b6\u6784";'
$chunkCpmg3['return `Plugin may not exist in marketplace "${error.marketplace}"`;'] = 'return `\u63d2\u4ef6\u53ef\u80fd\u4e0d\u5b58\u5728\u4e8e\u5e02\u573a "${error.marketplace}"`;'
$chunkCpmg3['return error.availableMarketplaces.length > 0 ? `Available marketplaces: ${error.availableMarketplaces.join(", ")}` : "Add the marketplace first using /plugin marketplace add";'] = 'return error.availableMarketplaces.length > 0 ? `\u53ef\u7528\u5e02\u573a\uff1a${error.availableMarketplaces.join(", ")}` : "\u8bf7\u5148\u4f7f\u7528 /plugin marketplace add \u6dfb\u52a0\u5e02\u573a";'
$chunkCpmg3['return "Check MCP server configuration in .mcp.json or manifest";'] = 'return "\u8bf7\u68c0\u67e5 .mcp.json \u6216\u6e05\u5355\u4e2d\u7684 MCP \u670d\u52a1\u5668\u914d\u7f6e";'
$chunkCpmg3['return `Disable plugin "${winningPlugin}" if you want this plugin''s version instead`;'] = 'return `\u8981\u4f7f\u7528\u6b64\u63d2\u4ef6\u7248\u672c\uff0c\u8bf7\u7981\u7528\u63d2\u4ef6 "${winningPlugin}"`;'
$chunkCpmg3['return `Remove "${error.duplicateOf}" from your MCP config if you want the plugin''s version instead`;'] = 'return `\u8981\u4f7f\u7528\u63d2\u4ef6\u7248\u672c\uff0c\u8bf7\u4ece MCP \u914d\u7f6e\u4e2d\u79fb\u9664 "${error.duplicateOf}"`;'
$chunkCpmg3['return "Check hooks.json file syntax and structure";'] = 'return "\u8bf7\u68c0\u67e5 hooks.json \u6587\u4ef6\u8bed\u6cd5\u4e0e\u7ed3\u6784";'
$chunkCpmg3['return `Check ${error.component} directory structure and file permissions`;'] = 'return `\u8bf7\u68c0\u67e5 ${error.component} \u76ee\u5f55\u7ed3\u6784\u4e0e\u6587\u4ef6\u6743\u9650`;'
$chunkCpmg3['return "Check your internet connection and URL accessibility";'] = 'return "\u8bf7\u68c0\u67e5\u7f51\u7edc\u8fde\u63a5\u4e0e URL \u53ef\u8bbf\u95ee\u6027";'
$chunkCpmg3['return "Verify the MCPB file is valid and not corrupted";'] = 'return "\u8bf7\u786e\u8ba4 MCPB \u6587\u4ef6\u6709\u6548\u4e14\u672a\u635f\u574f";'
$chunkCpmg3['return "Contact the plugin author about the invalid manifest";'] = 'return "\u8bf7\u8054\u7cfb\u63d2\u4ef6\u4f5c\u8005\u5904\u7406\u65e0\u6548\u6e05\u5355";'
$chunkCpmg3['return "This marketplace source is explicitly blocked by your administrator";'] = 'return "\u6b64\u5e02\u573a\u6765\u6e90\u88ab\u7ba1\u7406\u5458\u660e\u786e\u7981\u7528";'
$chunkCpmg3['return error.allowedSources.length > 0 ? `Allowed sources: ${error.allowedSources.join(", ")}` : "Contact your administrator to configure allowed marketplace sources";'] = 'return error.allowedSources.length > 0 ? `\u5141\u8bb8\u7684\u6765\u6e90\uff1a${error.allowedSources.join(", ")}` : "\u8bf7\u8054\u7cfb\u7ba1\u7406\u5458\u914d\u7f6e\u5141\u8bb8\u7684\u5e02\u573a\u6765\u6e90";'
$chunkCpmg3['return error.reason === "not-enabled" ? `Enable "${error.dependency}" or uninstall "${error.plugin}"` : `Install "${error.dependency}" or uninstall "${error.plugin}"`;'] = 'return error.reason === "not-enabled" ? `\u8bf7\u542f\u7528 "${error.dependency}" \u6216\u5378\u8f7d "${error.plugin}"` : `\u8bf7\u5b89\u88c5 "${error.dependency}" \u6216\u5378\u8f7d "${error.plugin}"`;'
$chunkCpmg3['return "Check LSP server configuration in the plugin manifest";'] = 'return "\u8bf7\u68c0\u67e5\u63d2\u4ef6\u6e05\u5355\u4e2d\u7684 LSP \u670d\u52a1\u5668\u914d\u7f6e";'
$chunkCpmg3['return "Check LSP server logs with --debug for details";'] = 'return "\u8bf7\u4f7f\u7528 --debug \u67e5\u770b LSP \u670d\u52a1\u5668\u65e5\u5fd7\u4e86\u89e3\u8be6\u60c5";'
$chunkCpmg3['return "Run /plugins to refresh the plugin cache";'] = 'return "\u8bf7\u8fd0\u884c /plugins \u5237\u65b0\u63d2\u4ef6\u7f13\u5b58";'

$chunkCpmg4 = New-ReplacementMap
$chunkCpmg4['return `Failed to load hooks from ${error.hookPath}: ${error.reason}`;'] = 'return `\u4ece ${error.hookPath} \u52a0\u8f7d hooks \u5931\u8d25\uff1a${error.reason}`;'
$chunkCpmg4['return `Failed to load ${error.component} from ${error.path}: ${error.reason}`;'] = 'return `\u4ece ${error.path} \u52a0\u8f7d ${error.component} \u5931\u8d25\uff1a${error.reason}`;'
$chunkCpmg4['return `Failed to download MCPB from ${error.url}: ${error.reason}`;'] = 'return `\u4ece ${error.url} \u4e0b\u8f7d MCPB \u5931\u8d25\uff1a${error.reason}`;'
$chunkCpmg4['return `Failed to extract MCPB ${error.mcpbPath}: ${error.reason}`;'] = 'return `\u89e3\u538b MCPB ${error.mcpbPath} \u5931\u8d25\uff1a${error.reason}`;'
$chunkCpmg4['return `MCPB manifest invalid at ${error.mcpbPath}: ${error.validationError}`;'] = 'return `MCPB \u6e05\u5355\u65e0\u6548 ${error.mcpbPath}\uff1a${error.validationError}`;'
$chunkCpmg4['return `Invalid LSP server config for "${error.serverName}": ${error.validationError}`;'] = 'return `LSP \u670d\u52a1\u5668 "${error.serverName}" \u914d\u7f6e\u65e0\u6548\uff1a${error.validationError}`;'
$chunkCpmg4['return `LSP server "${error.serverName}" failed to start: ${error.reason}`;'] = 'return `LSP \u670d\u52a1\u5668 "${error.serverName}" \u542f\u52a8\u5931\u8d25\uff1a${error.reason}`;'
$chunkCpmg4['return error.signal ? `LSP server "${error.serverName}" crashed with signal ${error.signal}` : `LSP server "${error.serverName}" crashed with exit code ${error.exitCode ?? "unknown"}`;'] = 'return error.signal ? `LSP \u670d\u52a1\u5668 "${error.serverName}" \u5d29\u6e83\uff08\u4fe1\u53f7 ${error.signal}\uff09` : `LSP \u670d\u52a1\u5668 "${error.serverName}" \u5d29\u6e83\uff08\u9000\u51fa\u7801 ${error.exitCode ?? "unknown"}\uff09`;'
$chunkCpmg4['return `LSP server "${error.serverName}" timed out on ${error.method} after ${error.timeoutMs}ms`;'] = 'return `LSP \u670d\u52a1\u5668 "${error.serverName}" \u8c03\u7528 ${error.method} \u8d85\u65f6\uff08${error.timeoutMs}ms\uff09`;'
$chunkCpmg4['return `LSP server "${error.serverName}" ${error.method} failed: ${error.error}`;'] = 'return `LSP \u670d\u52a1\u5668 "${error.serverName}" ${error.method} \u5931\u8d25\uff1a${error.error}`;'
$chunkCpmg4['return `Plugin "${error.plugin}" not cached at ${error.installPath}`;'] = 'return `\u63d2\u4ef6 "${error.plugin}" \u672a\u7f13\u5b58\u4e8e ${error.installPath}`;'
$chunkCpmg4['setToolDescription("Failed to load description");'] = 'setToolDescription("\u52a0\u8f7d\u63cf\u8ff0\u5931\u8d25");'
$chunkCpmg4['setError(err instanceof Error ? err.message : "Failed to load components");'] = 'setError(err instanceof Error ? err.message : "\u52a0\u8f7d\u7ec4\u4ef6\u5931\u8d25");'
$chunkCpmg4['setError(`Built-in plugin ${plugin.name} not found`);'] = 'setError(`\u672a\u627e\u5230\u5185\u7f6e\u63d2\u4ef6 ${plugin.name}`);'
$chunkCpmg4['setError(`Plugin ${plugin.name} not found in marketplace`);'] = 'setError(`\u5728\u5e02\u573a\u672a\u627e\u5230\u63d2\u4ef6 ${plugin.name}`);'
$chunkCpmg4['setError(`Marketplace not found: ${targetMarketplace}`);'] = 'setError(`\u672a\u627e\u5230\u5e02\u573a\uff1a${targetMarketplace}`);'
$chunkCpmg4['throw new Error(`Failed to load marketplace: ${marketplaceName}`);'] = 'throw new Error(`\u52a0\u8f7d\u5e02\u573a\u5931\u8d25\uff1a${marketplaceName}`);'
$chunkCpmg4['const errorMessage2 = firstError ? formatErrorMessage(firstError) : "Failed to load";'] = 'const errorMessage2 = firstError ? formatErrorMessage(firstError) : "\u52a0\u8f7d\u5931\u8d25";'
$chunkCpmg4['label: isEnabled ? "Disable plugin" : "Enable plugin"'] = 'label: isEnabled ? "\u7981\u7528\u63d2\u4ef6" : "\u542f\u7528\u63d2\u4ef6"'
$chunkCpmg4['label: selectedPlugin.pendingUpdate ? "Unmark for update" : "Mark for update"'] = 'label: selectedPlugin.pendingUpdate ? "\u53d6\u6d88\u6807\u8bb0\u66f4\u65b0" : "\u6807\u8bb0\u66f4\u65b0"'
$chunkCpmg4['color: item.label.includes("Uninstall") ? "error" : item.label.includes("Update") ? "suggestion" : undefined,'] = 'color: item.label.includes("\u5378\u8f7d") ? "error" : item.label.includes("\u66f4\u65b0") ? "suggestion" : undefined,'
$chunkCpmg4['label: server.client.type !== "disabled" ? "Disable" : "Enable"'] = 'label: server.client.type !== "disabled" ? "\u7981\u7528" : "\u542f\u7528"'
$chunkCpmg4['title: `Tools for ${server.name}`'] = 'title: `${server.name} \u7684\u5de5\u5177`'
$chunkCpmg4['children: " [read-only]"'] = 'children: " [\u53ea\u8bfb]"'
$chunkCpmg4['children: " [destructive]"'] = 'children: " [\u7834\u574f\u6027]"'
$chunkCpmg4['children: " [open-world]"'] = 'children: " [\u5f00\u653e]"'
$chunkCpmg4['annotations.push("read-only");'] = 'annotations.push("\u53ea\u8bfb");'
$chunkCpmg4['annotations.push("destructive");'] = 'annotations.push("\u7834\u574f\u6027");'
$chunkCpmg4['annotations.push("open-world");'] = 'annotations.push("\u5f00\u653e");'
$chunkCpmg4['" again to exit"'] = '" \u518d\u6309\u4e00\u6b21\u9000\u51fa"'
$chunkCpmg4['const winningPlugin = error.duplicateOf.split(":")[1] ?? "the other plugin";'] = 'const winningPlugin = error.duplicateOf.split(":")[1] ?? "\u53e6\u4e00\u4e2a\u63d2\u4ef6";'
$chunkCpmg4['return "Project";'] = 'return "\u9879\u76ee";'
$chunkCpmg4['return "Local";'] = 'return "\u672c\u5730";'
$chunkCpmg4['return "User";'] = 'return "\u7528\u6237";'
$chunkCpmg4['return "Enterprise";'] = 'return "\u4f01\u4e1a";'
$chunkCpmg4['return "Managed";'] = 'return "\u6258\u7ba1";'
$chunkCpmg4['return "Built-in";'] = 'return "\u5185\u7f6e";'

$chunkCpmg5 = New-ReplacementMap
$chunkCpmg5['action: "navigate"'] = 'action: "\u5bfc\u822a"'
$chunkCpmg5['action: "select"'] = 'action: "\u9009\u62e9"'
$chunkCpmg5['action: "copy"'] = 'action: "\u590d\u5236"'
$chunkCpmg5['shortcut: "Enter",
                action: "add"'] = 'shortcut: "Enter",
                action: "\u6dfb\u52a0"'
$chunkCpmg5['return { type: "marketplace", action: "\u6dfb\u52a0", target };'] = 'return { type: "marketplace", action: "add", target };'
$chunkCpmg5['''No plugins match "'''] = '''\u65e0\u5339\u914d\u63d2\u4ef6 "'''
$chunkCpmg5['''No items match "'''] = '''\u65e0\u5339\u914d\u9879 "'''
$chunkCpmg5['return "Flagged";'] = 'return "\u5df2\u6807\u8bb0";'
$chunkCpmg5['"Flagged on "'] = '"\u6807\u8bb0\u4e8e "'
$chunkCpmg5['children: "\xB7 Component summary not available for remote plugin"'] = 'children: "\xb7 \u8fdc\u7a0b\u63d2\u4ef6\u65e0\u6cd5\u663e\u793a\u7ec4\u4ef6\u6458\u8981"'
$chunkCpmg5['children: "\xB7 Components will be discovered at installation"'] = 'children: "\xb7 \u5b89\u88c5\u540e\u5c06\u81ea\u52a8\u53d1\u73b0\u7ec4\u4ef6"'
$chunkCpmg5['"Field "'] = '"\u5b57\u6bb5 "'
$chunkCpmg5['"By:"'] = '"\u4f5c\u8005\uff1a"'
$chunkCpmg5['"Error: "'] = '"\u9519\u8bef\uff1a "'
$chunkCpmg5['"Add a marketplace first using "'] = '"\u8bf7\u5148\u4f7f\u7528 "'
$chunkCpmg5['''Add marketplace'''] = '''\u6dfb\u52a0\u5e02\u573a'''
$chunkCpmg5['Object.keys(selectedPlugin.entry.mcpServers).join(", ") : "configured"'] = 'Object.keys(selectedPlugin.entry.mcpServers).join(", ") : "\u5df2\u914d\u7f6e"'
$chunkCpmg5['"Authenticating with "'] = '"\u6b63\u5728\u4e0e "'
$chunkCpmg5['? " Authenticating via your identity provider" : " A browser window will open for authentication"'] = '? " \u901a\u8fc7\u8eab\u4efd\u63d0\u4f9b\u65b9\u8ba4\u8bc1\u4e2d" : " \u5c06\u6253\u5f00\u6d4f\u89c8\u5668\u8fdb\u884c\u8ba4\u8bc1"'
$chunkCpmg5['"If your browser doesn''t open automatically, copy this URL manually"'] = '"\u82e5\u6d4f\u89c8\u5668\u672a\u81ea\u52a8\u6253\u5f00\uff0c\u8bf7\u624b\u52a8\u590d\u5236\u6b64 URL"'
$chunkCpmg5['children: "(Copied!)"'] = 'children: "(\u5df2\u590d\u5236!)"'
$chunkCpmg5['"Clear authentication for "'] = '"\u6e05\u9664\u8ba4\u8bc1\uff1a "'
$chunkCpmg5['children: ''Find the MCP server in the browser and click "Disconnect".'''] = 'children: "\u5728\u6d4f\u89c8\u5668\u4e2d\u627e\u5230\u8be5 MCP \u670d\u52a1\u5668\u5e76\u70b9\u51fb\u201cDisconnect\u201d\u3002"'
$chunkCpmg5['children: ''This will open claude.ai in the browser. Find the MCP server in the list and click "Disconnect".'''] = 'children: "\u5c06\u5728\u6d4f\u89c8\u5668\u4e2d\u6253\u5f00 claude.ai\uff0c\u5728\u5217\u8868\u4e2d\u627e\u5230\u8be5 MCP \u670d\u52a1\u5668\u5e76\u70b9\u51fb\u201cDisconnect\u201d\u3002"'
$chunkCpmg5['" when done."'] = '" \u5b8c\u6210\u3002"'
$chunkCpmg5['" to open the browser."'] = '" \u6253\u5f00\u6d4f\u89c8\u5668\u3002"'
$chunkCpmg5['"Connecting to "'] = '"\u6b63\u5728\u8fde\u63a5 "'
$chunkCpmg5['"\u2022 Commands:"'] = '"\u2022 \u547d\u4ee4\uff1a"'
$chunkCpmg5['"\u2022 Agents:"'] = '"\u2022 Agent\uff1a"'
$chunkCpmg5['"\u2022 MCP Servers:"'] = '"\u2022 MCP \u670d\u52a1\uff1a"'

$chunkCpmg6 = New-ReplacementMap
$chunkCpmg6['"If your browser didn''t open automatically, copy this URL manually"'] = '"\u82e5\u6d4f\u89c8\u5668\u672a\u81ea\u52a8\u6253\u5f00\uff0c\u8bf7\u624b\u52a8\u590d\u5236\u6b64 URL"'
$chunkCpmg6['"Reconnecting to "'] = '"\u6b63\u5728\u91cd\u8fde "'
$chunkCpmg6['children: " Restarting MCP server process"'] = 'children: " \u6b63\u5728\u91cd\u542f MCP \u670d\u52a1\u5668\u8fdb\u7a0b"'
$chunkCpmg6['onComplete("No marketplaces configured")'] = 'onComplete("\u672a\u914d\u7f6e\u5e02\u573a")'
$chunkCpmg6['"Make sure you trust a plugin before installing, updating, or using it. Anthropic does not control what MCP servers, files, or other software are included in plugins and cannot verify that they will work as intended or that they won''t change. See each plugin''s homepage for more information."'] = '"\u5b89\u88c5\u3001\u66f4\u65b0\u6216\u4f7f\u7528\u524d\u8bf7\u786e\u8ba4\u4f60\u4fe1\u4efb\u8be5\u63d2\u4ef6\u3002Anthropic \u65e0\u6cd5\u63a7\u5236\u63d2\u4ef6\u4e2d\u5305\u542b\u54ea\u4e9b MCP \u670d\u52a1\u5668\u3001\u6587\u4ef6\u6216\u5176\u4ed6\u8f6f\u4ef6\uff0c\u4e5f\u65e0\u6cd5\u4fdd\u8bc1\u5176\u6309\u9884\u671f\u5de5\u4f5c\u6216\u4e0d\u4f1a\u53d8\u66f4\u3002\u8be6\u60c5\u8bf7\u89c1\u5404\u63d2\u4ef6\u4e3b\u9875\u3002"'

Patch-AllChunks -DistDir $ChunksDir -Replacements $chunkCpmg
Patch-AllChunks -DistDir $ChunksDir -Replacements $chunkCpmg2
Patch-AllChunks -DistDir $ChunksDir -Replacements $chunkCpmg3
Patch-AllChunks -DistDir $ChunksDir -Replacements $chunkCpmg4
Patch-AllChunks -DistDir $ChunksDir -Replacements $chunkCpmg5
Patch-AllChunks -DistDir $ChunksDir -Replacements $chunkCpmg6

$chunkMa3 = @{}
$chunkMa3['description: "Fires instead of Stop when an API error (rate limit, auth failure, etc.) ended the turn. Fire-and-forget \u2014 hook output and exit codes are ignored."'] = 'description: "API \u9519\u8bef\uff08\u9650\u901f\u3001\u8ba4\u8bc1\u5931\u8d25\u7b49\uff09\u7ed3\u675f\u56de\u5408\u65f6\u89e6\u53d1\uff0c\u66ff\u4ee3 Stop\u3002\u706b\u5e76\u5fd8\u8bb0\u2014hook \u8f93\u51fa\u4e0e\u9000\u51fa\u7801\u88ab\u5ffd\u7565\u3002"'
$chunkMa3['title: "Hooks"'] = 'title: "Hooks \u914d\u7f6e"'
Patch-AllChunks -DistDir $ChunksDir -Replacements $chunkMa3

$chunkAbs = @{}
$chunkAbs['return `Try "${sample_default(commands)}"`'] = 'return `\u8bd5\u8bd5\u201c${sample_default(commands)}\u201d`'
$chunkAbs['"fix lint errors"'] = '"\u4fee\u590d lint \u9519\u8bef"'
$chunkAbs['"fix typecheck errors"'] = '"\u4fee\u590d\u7c7b\u578b\u68c0\u67e5\u9519\u8bef"'
$chunkAbs['"how do I log an error?"'] = '"\u5982\u4f55\u8bb0\u5f55\u9519\u8bef\uff1f"'
$chunkAbs['content: async () => "Use /memory to view and manage Claude memory"'] = 'content: async () => "\u4f7f\u7528 /memory \u67e5\u770b\u548c\u7ba1\u7406 Claude \u8bb0\u5fc6"'
$chunkAbs['content: async () => "Use /theme to change the color theme"'] = 'content: async () => "\u4f7f\u7528 /theme \u66f4\u6539\u989c\u8272\u4e3b\u9898"'
$chunkAbs['content: async () => "Use /statusline to set up a custom status line that will display beneath the input box"'] = 'content: async () => "\u4f7f\u7528 /statusline \u5728\u8f93\u5165\u6846\u4e0b\u65b9\u8bbe\u7f6e\u81ea\u5b9a\u4e49\u72b6\u6001\u884c"'
$chunkAbs['content: async () => "Hit Enter to queue up additional messages while Claude is working."'] = 'content: async () => "Claude \u5de5\u4f5c\u65f6\u6309 Enter \u53ef\u5c06\u6d88\u606f\u52a0\u5165\u961f\u5217\u3002"'
$chunkAbs['content: async () => "Use /permissions to pre-approve and pre-deny bash, edit, and MCP tools"'] = 'content: async () => "\u4f7f\u7528 /permissions \u9884\u5148\u6279\u51c6\u6216\u62d2\u7edd bash\u3001edit \u548c MCP \u5de5\u5177"'
$chunkAbs['content: async () => "Use /agents to optimize specific tasks. Eg. Software Architect, Code Writer, Code Reviewer"'] = 'content: async () => "\u4f7f\u7528 /agents \u4e3a\u7279\u5b9a\u4efb\u52a1\u4f18\u5316 agent\uff0c\u4f8b\u5982\u67b6\u6784\u5e08\u3001\u4ee3\u7801\u7f16\u5199\u3001\u4ee3\u7801\u5ba1\u67e5"'
$chunkAbs['content: async () => "Use /feedback to help us improve!"'] = 'content: async () => "\u4f7f\u7528 /feedback \u5e2e\u52a9\u6211\u4eec\u6539\u8fdb\uff01"'
$chunkAbs['Run /terminal-setup to enable convenient terminal integration like Shift + Enter for new line and more'] = '\u8fd0\u884c /terminal-setup \u542f\u7528\u7ec8\u7aef\u96c6\u6210\uff08\u5982 Shift+Enter \u6362\u884c\u7b49\uff09'
$chunkAbs['Run /terminal-setup to enable Option+Enter for new lines'] = '\u8fd0\u884c /terminal-setup \u542f\u7528 Option+Enter \u6362\u884c'
$chunkAbs['Run /terminal-setup to enable Shift+Enter for new lines'] = '\u8fd0\u884c /terminal-setup \u542f\u7528 Shift+Enter \u6362\u884c'
$chunkAbs['Run /terminal-setup to enable convenient terminal integration like Option + Enter for new line and more'] = '\u8fd0\u884c /terminal-setup \u542f\u7528\u7ec8\u7aef\u96c6\u6210\uff08\u5982 Option+Enter \u6362\u884c\u7b49\uff09'
$chunkAbs['Start with small features or bug fixes, tell Claude to propose a plan, and verify its suggested edits'] = '\u4ece\u5c0f\u529f\u80fd\u6216 bug \u4fee\u590d\u5f00\u59cb\uff0c\u8ba9 Claude \u63d0\u51fa\u8ba1\u5212\u5e76\u9a8c\u8bc1\u5efa\u8bae\u7684\u4fee\u6539'
$chunkAbs['Use Plan Mode to prepare for a complex request before making changes. Press ${getShortcutDisplay("chat:cycleMode", "Chat", "shift+tab")} twice to enable.'] = '\u590d\u6742\u4efb\u52a1\u524d\u7528\u8ba1\u5212\u6a21\u5f0f\u505a\u51c6\u5907\uff0c\u6309 ${getShortcutDisplay("chat:cycleMode", "Chat", "shift+tab")} \u4e24\u6b21\u542f\u7528\u3002'
$chunkAbs['Use /config to change your default permission mode (including Plan Mode)'] = '\u4f7f\u7528 /config \u66f4\u6539\u9ed8\u8ba4\u6743\u9650\u6a21\u5f0f\uff08\u5305\u542b\u8ba1\u5212\u6a21\u5f0f\uff09'
$chunkAbs['Use git worktrees to run multiple Claude sessions in parallel.'] = '\u4f7f\u7528 git worktrees \u5e76\u884c\u8fd0\u884c\u591a\u4e2a Claude \u4f1a\u8bdd\u3002'
$chunkAbs['Running multiple Claude sessions? Use /color and /rename to tell them apart at a glance.'] = '\u8fd0\u884c\u591a\u4e2a Claude \u4f1a\u8bdd\uff1f\u4f7f\u7528 /color \u548c /rename \u533a\u5206\u5b83\u4eec\u3002'
$chunkAbs['Send messages to Claude while it works to steer Claude in real-time'] = '\u5728 Claude \u5de5\u4f5c\u65f6\u53d1\u9001\u6d88\u606f\uff0c\u5b9e\u65f6\u5f15\u5bfc\u5176\u884c\u4e3a\u3002'
$chunkAbs['Ask Claude to create a todo list when working on complex tasks to track progress and remain on track'] = '\u5904\u7406\u590d\u6742\u4efb\u52a1\u65f6\u8ba9 Claude \u521b\u5efa\u5f85\u529e\u6e05\u5355\uff0c\u8ddf\u8e2a\u8fdb\u5ea6\u4e0d\u8d70\u504f\u3002'
$chunkAbs['Connect Claude to your IDE \xB7 /ide'] = '\u8fde\u63a5 Claude \u5230 IDE \xb7 /ide'
$chunkAbs['Double-tap esc to rewind the conversation to a previous point in time'] = '\u53cc\u51fb Esc \u56de\u9000\u5230\u5bf9\u8bdd\u7684\u4e4b\u524d\u8282\u70b9'
$chunkAbs['Double-tap esc to rewind the code and/or conversation to a previous point in time'] = '\u53cc\u51fb Esc \u56de\u9000\u4ee3\u7801\u548c/\u6216\u5bf9\u8bdd\u5230\u4e4b\u524d\u8282\u70b9'
$chunkAbs['Run claude --continue or claude --resume to resume a conversation'] = '\u8fd0\u884c claude --continue \u6216 claude --resume \u6062\u590d\u4f1a\u8bdd'
$chunkAbs['Name your conversations with /rename to find them easily in /resume later'] = '\u7528 /rename \u547d\u540d\u4f1a\u8bdd\uff0c\u4fbf\u4e8e\u5728 /resume \u4e2d\u627e\u56de'
$chunkAbs['Did you know you can drag and drop image files into your terminal?'] = '\u53ef\u4ee5\u628a\u56fe\u7247\u6587\u4ef6\u62d6\u62fd\u5230\u7ec8\u7aef\u4e2d'
$chunkAbs['Use --agent <agent_name> to directly start a conversation with a subagent'] = '\u4f7f\u7528 --agent <agent_name> \u76f4\u63a5\u4e0e\u5b50 agent \u5f00\u59cb\u5bf9\u8bdd'
$chunkAbs['Hit ${getShortcutDisplay("chat:cycleMode", "Chat", "shift+tab")} to cycle between default mode, auto-accept edit mode, and plan mode'] = '\u6309 ${getShortcutDisplay("chat:cycleMode", "Chat", "shift+tab")} \u5728\u9ed8\u8ba4\u3001\u81ea\u52a8\u63a5\u53d7\u7f16\u8f91\u548c\u8ba1\u5212\u6a21\u5f0f\u4e4b\u95f4\u5207\u6362'
$chunkAbs['Use ${getShortcutDisplay("chat:imagePaste", "Chat", "ctrl+v")} to paste images from your clipboard'] = '\u4f7f\u7528 ${getShortcutDisplay("chat:imagePaste", "Chat", "ctrl+v")} \u4ece\u526a\u8d34\u677f\u7c98\u8d34\u56fe\u7247'
$chunkAbs['content: async () => "Try setting environment variable COLORTERM=truecolor for richer colors"'] = 'content: async () => "\u8bd5\u7740\u8bbe\u7f6e\u73af\u5883\u53d8\u91cf COLORTERM=truecolor \u4ee5\u83b7\u5f97\u66f4\u4e30\u5bcc\u7684\u989c\u8272"'
$chunkAbs['content: async () => "Set CLAUDE_CODE_USE_POWERSHELL_TOOL=1 to enable the PowerShell tool (preview)"'] = 'content: async () => "\u8bbe\u7f6e CLAUDE_CODE_USE_POWERSHELL_TOOL=1 \u4ee5\u542f\u7528 PowerShell \u5de5\u5177\uff08\u9884\u89c8\uff09"'
$chunkAbs['content: async () => "Run /install-github-app to tag @claude right from your Github issues and PRs"'] = 'content: async () => "\u8fd0\u884c /install-github-app\uff0c\u5728 Github Issue \u548c PR \u4e2d\u76f4\u63a5 @claude"'
$chunkAbs['content: async () => "Run /install-slack-app to use Claude in Slack"'] = 'content: async () => "\u8fd0\u884c /install-slack-app \u5728 Slack \u4e2d\u4f7f\u7528 Claude"'
$chunkAbs['content: async () => "Paste images into Claude Code using control+v (not cmd+v!)"'] = 'content: async () => "\u4f7f\u7528 Ctrl+V \u7c98\u8d34\u56fe\u7247\u5230 Claude Code\uff08\u4e0d\u662f Cmd+V\uff01\uff09"'
$chunkAbs['content: async () => "Create skills by adding .md files to .claude/skills/ in your project or ~/.claude/skills/ for skills that work in any project"'] = 'content: async () => "\u5728\u9879\u76ee .claude/skills/ \u6216 ~/.claude/skills/ \u6dfb\u52a0 .md \u6587\u4ef6\u5373\u53ef\u521b\u5efa skill"'
$chunkAbs['content: async () => "Run Claude Code locally or remotely using the Claude desktop app: clau.de/desktop"'] = 'content: async () => "\u901a\u8fc7 Claude \u684c\u9762\u5e94\u7528\u5728\u672c\u5730\u6216\u8fdc\u7a0b\u8fd0\u884c Claude Code\uff1a clau.de/desktop"'
$chunkAbs['return `Continue your session in Claude Code Desktop with ${blue("/desktop")}`;'] = 'return `\u5728 Claude Code \u684c\u9762\u7248\u4e2d\u7ee7\u7eed\u4f1a\u8bdd\uff1a${blue("/desktop")}`;'
$chunkAbs['content: async () => "Run tasks in the cloud while you keep coding locally \xB7 clau.de/web"'] = 'content: async () => "\u5728\u4e91\u7aef\u8fd0\u884c\u4efb\u52a1\uff0c\u672c\u5730\u7ee7\u7eed\u7f16\u7801 \xb7 clau.de/web"'
$chunkAbs['content: async () => "/mobile to use Claude Code from the Claude app on your phone"'] = 'content: async () => "\u4f7f\u7528 /mobile \u5728\u624b\u673a Claude \u5e94\u7528\u4e2d\u4f7f\u7528 Claude Code"'
$chunkAbs['content: async () => `Your default model setting is Opus Plan Mode. Press ${getShortcutDisplay("chat:cycleMode", "Chat", "shift+tab")} twice to activate Plan Mode and plan with Claude Opus.`'] = 'content: async () => `\u9ed8\u8ba4\u6a21\u578b\u4e3a Opus \u8ba1\u5212\u6a21\u5f0f\u3002\u6309 ${getShortcutDisplay("chat:cycleMode", "Chat", "shift+tab")} \u4e24\u6b21\u542f\u7528\u8ba1\u5212\u6a21\u5f0f\u5e76\u4f7f\u7528 Claude Opus \u89c4\u5212\u3002`'
$chunkAbs['return `Working with HTML/CSS? Install the frontend-design plugin:
${blue'] = 'return `\u5728\u505a HTML/CSS\uff1f\u5b89\u88c5 frontend-design \u63d2\u4ef6\uff1a
${blue'
$chunkAbs['return `Working with Vercel? Install the vercel plugin:
${blue'] = 'return `\u5728\u7528 Vercel\uff1f\u5b89\u88c5 vercel \u63d2\u4ef6\uff1a
${blue'
$chunkAbs['return variant === "copy_b" ? `Use ${cmd} for better one-shot answers. Claude thinks it through first.` : `Working on something tricky? ${cmd} gives better first answers`;'] = 'return variant === "copy_b" ? `\u4f7f\u7528 ${cmd} \u83b7\u5f97\u66f4\u597d\u7684\u4e00\u6b21\u6027\u56de\u7b54\u3002Claude \u4f1a\u5148\u6df1\u5165\u601d\u8003\u3002` : `\u5728\u5904\u7406\u96be\u9898\uff1f${cmd} \u80fd\u63d0\u4f9b\u66f4\u597d\u7684\u9996\u6b21\u56de\u7b54`;'
$chunkAbs['return variant === "copy_b" ? `For big tasks, tell Claude to ${blue("use subagents")}. They work in parallel and keep your main thread clean.` : `Say ${blue(''"fan out subagents"'')} and Claude sends a team. Each one digs deep so nothing gets missed.`;'] = 'return variant === "copy_b" ? `\u5927\u578b\u4efb\u52a1\u53ef\u8ba9 Claude ${blue("\u4f7f\u7528\u5b50 agent")}\uff0c\u5e76\u884c\u5904\u7406\u4e14\u4e0d\u5360\u7528\u4e3b\u7ebf\u7a0b\u3002` : `\u8bf4 ${blue(''\u201c\u6d3e\u51fa\u5b50 agent\u201d'')} \u8ba9 Claude \u6d3e\u51fa\u56e2\u961f\uff0c\u5404\u81ea\u6df1\u5165\u5904\u7406\u4e0d\u9057\u6f0f\u3002`;'
$chunkAbs['return variant === "copy_b" ? `Use ${blue("/loop 5m check the deploy")} to run any prompt on a schedule. Set it and forget it.` : `${blue("/loop")} runs any prompt on a recurring schedule. Great for monitoring deploys, babysitting PRs, or polling status.`;'] = 'return variant === "copy_b" ? `\u4f7f\u7528 ${blue("/loop 5m check the deploy")} \u6309\u65f6\u95f4\u8868\u8fd0\u884c\u4efb\u610f\u63d0\u793a\u3002\u8bbe\u597d\u5373\u53ef\u653e\u4efb\u3002` : `${blue("/loop")} \u53ef\u6309\u5468\u671f\u8fd0\u884c\u4efb\u610f\u63d0\u793a\uff0c\u9002\u5408\u76d1\u63a7\u90e8\u7f72\u3001\u5173\u6ce8 PR \u6216\u8f6e\u8be2\u72b6\u6001\u3002`;'
$chunkAbs['return reward ? `Share Claude Code and earn ${claude(formatCreditAmount(reward))} of extra usage \xB7 ${claude("/passes")}` : `You have free guest passes to share \xB7 ${claude("/passes")}`;'] = 'return reward ? `\u5206\u4eab Claude Code\uff0c\u53ef\u83b7\u5f97 ${claude(formatCreditAmount(reward))} \u989d\u5916\u7528\u91cf \xb7 ${claude("/passes")}` : `\u60a8\u6709\u514d\u8d39\u5ba2\u4eba\u901a\u884c\u8bc1\u53ef\u5206\u4eab \xb7 ${claude("/passes")}`;'
$chunkAbs['return `${claude(`${amount} in extra usage, on us`)} \xB7 third-party apps \xB7 ${claude("/extra-usage")}`;'] = 'return `${claude(`${amount} \u989d\u5916\u7528\u91cf\uff0c\u7531\u6211\u4eec\u627f\u62c5`)} \xb7 \u7b2c\u4e09\u65b9\u5e94\u7528 \xb7 ${claude("/extra-usage")}`;'
$chunkAbs['Open the Command Palette (Cmd+Shift+P) and run "Shell Command: Install '''] = '\u6253\u5f00\u547d\u4ee4\u9762\u677f\uff08Cmd+Shift+P\uff09\u5e76\u8fd0\u884c\u201cShell Command: Install '''
$chunkAbs[''' command in PATH" to enable IDE integration`'] = ''' \u547d\u4ee4\u5230 PATH\u201d\u4ee5\u542f\u7528 IDE \u96c6\u6210`'
Patch-AllChunks -DistDir $ChunksDir -Replacements $chunkAbs

$chunkEgfc = @{}
$chunkEgfc['description: "go back"'] = 'description: "\u8fd4\u56de"'
$chunkEgfc['description: "cancel"'] = 'description: "\u53d6\u6d88"'
$chunkEgfc['description: "submit"'] = 'description: "\u63d0\u4ea4"'
$chunkEgfc['description: "open in editor"'] = 'description: "\u5728\u7f16\u8f91\u5668\u4e2d\u6253\u5f00"'
$chunkEgfc['children: "All tools"'] = 'children: "\u5168\u90e8\u5de5\u5177"'
$chunkEgfc['children: "Description"'] = 'children: "\u63cf\u8ff0"'
$chunkEgfc['children: "Tools"'] = 'children: "\u5de5\u5177"'
$chunkEgfc['children: "Model"'] = 'children: "\u6a21\u578b"'
$chunkEgfc['children: "Permission mode"'] = 'children: "\u6743\u9650\u6a21\u5f0f"'
$chunkEgfc['children: "Memory"'] = 'children: "\u8bb0\u5fc6"'
$chunkEgfc['children: "Hooks"'] = 'children: "Hooks"'
$chunkEgfc['children: "Skills"'] = 'children: "Skills"'
$chunkEgfc['children: "Color"'] = 'children: "\u989c\u8272"'
$chunkEgfc['children: "System prompt"'] = 'children: "\u7cfb\u7edf\u63d0\u793a\u8bcd"'
$chunkEgfc['children: "Automatic color"'] = 'children: "\u81ea\u52a8\u989c\u8272"'
$chunkEgfc['children: "Preview: "'] = 'children: "\u9884\u89c8\uff1a "'
$chunkEgfc['children: "Model determines the agent''s reasoning capabilities and speed."'] = 'children: "Agent \u6240\u7528\u6a21\u578b\u51b3\u5b9a\u5176\u63a8\u7406\u80fd\u529b\u4e0e\u901f\u5ea6\u3002"'
$chunkEgfc['children: "Create new agent"'] = 'children: "\u521b\u5efa\u65b0 agent"'
$chunkEgfc['children: "No agents found. Create specialized subagents that Claude can delegate to."'] = 'children: "\u672a\u627e\u5230 agent\u3002\u521b\u5efa\u4e13\u95e8\u7684\u5b50 agent \u4f9b Claude \u59d4\u6258\u4efb\u52a1\u3002"'
$chunkEgfc['children: "Each subagent has its own context window, custom system prompt, and specific tools."'] = 'children: "\u6bcf\u4e2a\u5b50 agent \u6709\u72ec\u7acb\u4e0a\u4e0b\u6587\u3001\u81ea\u5b9a\u4e49\u7cfb\u7edf\u63d0\u793a\u8bcd\u548c\u6307\u5b9a\u5de5\u5177\u3002"'
$chunkEgfc['children: "Try creating: Code Reviewer, Code Simplifier, Security Reviewer, Tech Lead, or UX Reviewer."'] = 'children: "\u53ef\u5c1d\u8bd5\u521b\u5efa\uff1aCode Reviewer\u3001Code Simplifier\u3001Security Reviewer\u3001Tech Lead \u6216 UX Reviewer\u3002"'
$chunkEgfc['children: "Built-in agents"'] = 'children: "\u5185\u7f6e agent"'
$chunkEgfc['children: "Built-in agents are provided by default and cannot be modified."'] = 'children: "\u5185\u7f6e agent \u9ed8\u8ba4\u63d0\u4f9b\uff0c\u65e0\u6cd5\u4fee\u6539\u3002"'
$chunkEgfc['subtitle: "No agents found"'] = 'subtitle: "\u672a\u627e\u5230 agent"'
$chunkEgfc['subtitle: "Choose background color"'] = 'subtitle: "\u9009\u62e9\u80cc\u666f\u8272"'
$chunkEgfc['subtitle: "Confirm and save"'] = 'subtitle: "\u786e\u8ba4\u5e76\u4fdd\u5b58"'
$chunkEgfc['subtitle: "Description (tell Claude when to use this agent)"'] = 'subtitle: "\u63cf\u8ff0\uff08\u544a\u8bc9 Claude \u4f55\u65f6\u4f7f\u7528\u6b64 agent\uff09"'
$chunkEgfc['subtitle: "Choose location"'] = 'subtitle: "\u9009\u62e9\u4fdd\u5b58\u4f4d\u7f6e"'
$chunkEgfc['subtitle: "Configure agent memory"'] = 'subtitle: "\u914d\u7f6e agent \u8bb0\u5fc6"'
$chunkEgfc['subtitle: "Creation method"'] = 'subtitle: "\u521b\u5efa\u65b9\u5f0f"'
$chunkEgfc['subtitle: "Select model"'] = 'subtitle: "\u9009\u62a9\u6a21\u578b"'
$chunkEgfc['subtitle: "System prompt"'] = 'subtitle: "\u7cfb\u7edf\u63d0\u793a\u8bcd"'
$chunkEgfc['subtitle: "Select tools"'] = 'subtitle: "\u9009\u62e9\u5de5\u5177"'
$chunkEgfc['label: "Continue"'] = 'label: "\u7ee7\u7eed"'
$chunkEgfc['label: "Open in editor"'] = 'label: "\u5728\u7f16\u8f91\u5668\u4e2d\u6253\u5f00"'
$chunkEgfc['label: "Edit tools"'] = 'label: "\u7f16\u8f91\u5de5\u5177"'
$chunkEgfc['label: "Edit model"'] = 'label: "\u7f16\u8f91\u6a21\u578b"'
$chunkEgfc['label: "Edit color"'] = 'label: "\u7f16\u8f91\u989c\u8272"'
$chunkEgfc['label: "MCP Servers:"'] = 'label: "MCP \u670d\u52a1\uff1a"'
$chunkEgfc['label: "Individual Tools:"'] = 'label: "\u5355\u4e2a\u5de5\u5177\uff1a"'
$chunkEgfc['label: "Project (.claude/agents/)"'] = 'label: "\u9879\u76ee\uff08.claude/agents/\uff09"'
$chunkEgfc['label: "Personal (~/.claude/agents/)"'] = 'label: "\u4e2a\u4eba\uff08~/.claude/agents/\uff09"'
$chunkEgfc['label: "Generate with Claude (recommended)"'] = 'label: "\u7531 Claude \u751f\u6210\uff08\u63a8\u8350\uff09"'
$chunkEgfc['label: "Manual configuration"'] = 'label: "\u624b\u52a8\u914d\u7f6e"'
$chunkEgfc['label: "None (no persistent memory)"'] = 'label: "\u65e0\uff08\u65e0\u6301\u4e45\u8bb0\u5fc6\uff09"'
$chunkEgfc['label: "Project scope (.claude/agent-memory/)"'] = 'label: "\u9879\u76ee\u8303\u56f4\uff08.claude/agent-memory/\uff09"'
$chunkEgfc['label: "Local scope (.claude/agent-memory-local/)"'] = 'label: "\u672c\u5730\u8303\u56f4\uff08.claude/agent-memory-local/\uff09"'
$chunkEgfc['label: "User scope (~/.claude/agent-memory/) (Recommended)"'] = 'label: "\u7528\u6237\u8303\u56f4\uff08~/.claude/agent-memory/\uff09\uff08\u63a8\u8350\uff09"'
$chunkEgfc['label: "Project scope (.claude/agent-memory/) (Recommended)"'] = 'label: "\u9879\u76ee\u8303\u56f4\uff08.claude/agent-memory/\uff09\uff08\u63a8\u8350\uff09"'
$chunkEgfc['label: "User scope (~/.claude/agent-memory/)"'] = 'label: "\u7528\u6237\u8303\u56f4\uff08~/.claude/agent-memory/\uff09"'
$chunkEgfc['description: "Current model (custom ID)"'] = 'description: "\u5f53\u524d\u6a21\u578b\uff08\u81ea\u5b9a\u4e49 ID\uff09"'
$chunkEgfc['children: "Name"'] = 'children: "\u540d\u79f0"'
$chunkEgfc['children: "Location"'] = 'children: "\u4f4d\u7f6e"'
$chunkEgfc['title: "Create new agent"'] = 'title: "\u521b\u5efa\u65b0 agent"'
$chunkEgfc['return "Agents"'] = 'return "\u5168\u90e8 agent"'
$chunkEgfc['return "Built-in agents"'] = 'return "\u5185\u7f6e agent"'
$chunkEgfc['return "Plugin agents"'] = 'return "\u63d2\u4ef6 agent"'
$chunkEgfc['name: "Read-only tools"'] = 'name: "\u53ea\u8bfb\u5de5\u5177"'
$chunkEgfc['label: showIndividualTools ? "Hide advanced options" : "Show advanced options"'] = 'label: showIndividualTools ? "\u9690\u85cf\u9ad8\u7ea7\u9009\u9879" : "\u663e\u793a\u9ad8\u7ea7\u9009\u9879"'
$chunkEgfc['children: isAllSelected ? "All tools selected" : `${selectedSet.size} of ${customAgentTools.length} tools selected`'] = 'children: isAllSelected ? "\u5df2\u9009\u62e9\u5168\u90e8\u5de5\u5177" : `\u5df2\u9009 ${selectedSet.size}/${customAgentTools.length} \u4e2a\u5de5\u5177`'
$chunkEgfc['children: "None"'] = 'children: "\u65e0"'
$chunkEgfc['children: "When should Claude use this agent?"'] = 'children: "\u4f55\u65f6\u8ba9 Claude \u4f7f\u7528\u6b64 agent\uff1f"'
$chunkEgfc['children: "Enter the system prompt for your agent:"'] = 'children: "\u8f93\u5165 agent \u7684\u7cfb\u7edf\u63d0\u793a\u8bcd\uff1a"'
$chunkEgfc['children: "Be comprehensive for best results"'] = 'children: "\u5185\u5bb9\u8d8a\u8be6\u7ec6\u6548\u679c\u8d8a\u597d"'
$chunkEgfc['subtitle: "Agent type (identifier)"'] = 'subtitle: "Agent \u6807\u8bc6\u7b26"'
$chunkEgfc['children: "Enter a unique identifier for your agent:"'] = 'children: "\u8f93\u5165 agent \u7684\u552f\u4e00\u6807\u8bc6\u7b26\uff1a"'
$chunkEgfc['{ label: "View agent", value: "view" }'] = '{ label: "\u67e5\u770b agent", value: "view" }'
$chunkEgfc['{ label: "Edit agent", value: "edit" }'] = '{ label: "\u7f16\u8f91 agent", value: "edit" }'
$chunkEgfc['{ label: "Delete agent", value: "delete" }'] = '{ label: "\u5220\u9664 agent", value: "delete" }'
$chunkEgfc['{ label: "Back", value: "back" }'] = '{ label: "\u8fd4\u56de", value: "back" }'
$chunkEgfc['{ label: "Yes, delete", value: "yes" }'] = '{ label: "\u662f\uff0c\u5220\u9664", value: "yes" }'
$chunkEgfc['{ label: "No, cancel", value: "no" }'] = '{ label: "\u5426\uff0c\u53d6\u6d88", value: "no" }'
$chunkEgfc['children: "Warnings:"'] = 'children: "\u8b66\u544a\uff1a"'
$chunkEgfc['children: "Errors:"'] = 'children: "\u9519\u8bef\uff1a"'
$chunkEgfc['title: "Delete agent"'] = 'title: "\u5220\u9664 agent"'
$chunkEgfc['"Are you sure you want to delete the agent"'] = '"\u786e\u5b9a\u8981\u5220\u9664 agent"'
Patch-AllChunks -DistDir $ChunksDir -Replacements $chunkEgfc

$chunkN7 = @{}
$chunkN7['title: "Status"'] = 'title: "\u72b6\u6001"'
$chunkN7['title: "Config"'] = 'title: "\u914d\u7f6e"'
$chunkN7['title: "Usage"'] = 'title: "\u7528\u91cf"'
$chunkN7['placeholder: "Search settings\u2026"'] = 'placeholder: "\u641c\u7d22\u8bbe\u7f6e\u2026"'
$chunkN7['children: "Type to filter"'] = 'children: "\u8f93\u5165\u4ee5\u7b5b\u9009"'
$chunkN7['children: "/rename to add a name"'] = 'children: "/rename \u6dfb\u52a0\u540d\u79f0"'
$chunkN7['children: "System Diagnostics"'] = 'children: "\u7cfb\u7edf\u8bca\u65ad"'
$chunkN7['title: "Preferred output style"'] = 'title: "\u9996\u9009\u8f93\u51fa\u98ce\u683c"'
$chunkN7['children: "This changes how Claude Code communicates with you"'] = 'children: "\u8fd9\u5c06\u6539\u53d8 Claude Code \u4e0e\u4f60\u7684\u6c9f\u901a\u65b9\u5f0f"'
$chunkN7['children: "Loading output styles\u2026"'] = 'children: "\u6b63\u5728\u52a0\u8f7d\u8f93\u51fa\u98ce\u683c\u2026"'
$chunkN7['children: "Enter your preferred response and voice language:"'] = 'children: "\u8f93\u5165\u9996\u9009\u56de\u590d\u4e0e\u8bed\u97f3\u8bed\u8a00\uff1a"'
$chunkN7['children: "Leave empty for default (English)"'] = 'children: "\u7559\u7a7a\u5219\u4f7f\u7528\u9ed8\u8ba4\uff08\u82f1\u8bed\uff09"'
$chunkN7['title: "Enable Auto-Updates"'] = 'title: "\u542f\u7528\u81ea\u52a8\u66f4\u65b0"'
$chunkN7['label: "Enable with latest channel"'] = 'label: "\u4f7f\u7528 latest \u6e20\u9053"'
$chunkN7['label: "Enable with stable channel"'] = 'label: "\u4f7f\u7528 stable \u6e20\u9053"'
$chunkN7['label: "Auto-compact"'] = 'label: "\u81ea\u52a8\u538b\u7f29"'
$chunkN7['label: "Show tips"'] = 'label: "\u663e\u793a\u63d0\u793a"'
$chunkN7['label: "Reduce motion"'] = 'label: "\u51cf\u5c11\u52a8\u753b"'
$chunkN7['label: "Thinking mode"'] = 'label: "\u601d\u8003\u6a21\u5f0f"'
$chunkN7['label: "Prompt suggestions"'] = 'label: "\u63d0\u793a\u5efa\u8bae"'
$chunkN7['label: "Poor mode (save tokens)"'] = 'label: "\u7701 token \u6a21\u5f0f"'
$chunkN7['label: "Speculative execution"'] = 'label: "\u63a8\u6d4b\u6267\u884c"'
$chunkN7['label: "Rewind code (checkpoints)"'] = 'label: "\u56de\u9000\u4ee3\u7801\uff08\u68c0\u67e5\u70b9\uff09"'
$chunkN7['label: "Verbose output"'] = 'label: "\u8be6\u7ec6\u8f93\u51fa"'
$chunkN7['label: "Terminal progress bar"'] = 'label: "\u7ec8\u7aef\u8fdb\u5ea6\u6761"'
$chunkN7['label: "Show status in terminal tab"'] = 'label: "\u5728\u7ec8\u7aef\u6807\u7b7e\u663e\u793a\u72b6\u6001"'
$chunkN7['label: "Show turn duration"'] = 'label: "\u663e\u793a\u8f6e\u6b21\u65f6\u957f"'
$chunkN7['label: "Default permission mode"'] = 'label: "\u9ed8\u8ba4\u6743\u9650\u6a21\u5f0f"'
$chunkN7['label: "Respect .gitignore in file picker"'] = 'label: "\u6587\u4ef6\u9009\u62e9\u5668\u9075\u5faa .gitignore"'
$chunkN7['label: "Always copy full response (skip /copy picker)"'] = 'label: "\u59cb\u7ec8\u590d\u5236\u5b8c\u6574\u56de\u590d"'
$chunkN7['label: "Copy on select"'] = 'label: "\u9009\u4e2d\u5373\u590d\u5236"'
$chunkN7['label: "Auto-update channel"'] = 'label: "\u81ea\u52a8\u66f4\u65b0\u6e20\u9053"'
$chunkN7['label: "Theme"'] = 'label: "\u4e3b\u9898"'
$chunkN7['label: "Local notifications"'] = 'label: "\u672c\u5730\u901a\u77e5"'
$chunkN7['label: "Push when idle"'] = 'label: "\u7a7a\u95f2\u65f6\u63a8\u9001"'
$chunkN7['label: "Push when input needed"'] = 'label: "\u9700\u8981\u8f93\u5165\u65f6\u63a8\u9001"'
$chunkN7['label: "Push when Claude decides"'] = 'label: "Claude \u51b3\u5b9a\u65f6\u63a8\u9001"'
$chunkN7['label: "Output style"'] = 'label: "\u8f93\u51fa\u98ce\u683c"'
$chunkN7['label: "What you see by default"'] = 'label: "\u9ed8\u8ba4\u663e\u793a\u5185\u5bb9"'
$chunkN7['label: "Language"'] = 'label: "\u8bed\u8a00"'
$chunkN7['label: "Editor mode"'] = 'label: "\u7f16\u8f91\u5668\u6a21\u5f0f"'
$chunkN7['label: "Show PR status footer"'] = 'label: "\u663e\u793a PR \u72b6\u6001\u680f"'
$chunkN7['label: "Model"'] = 'label: "\u6a21\u578b"'
$chunkN7['label: "Diff tool"'] = 'label: "Diff \u5de5\u5177"'
$chunkN7['label: "Auto-connect to IDE (external terminal)"'] = 'label: "\u81ea\u52a8\u8fde\u63a5 IDE\uff08\u5916\u90e8\u7ec8\u7aef\uff09"'
$chunkN7['label: "Auto-install IDE extension"'] = 'label: "\u81ea\u52a8\u5b89\u88c5 IDE \u6269\u5c55"'
$chunkN7['label: "Claude in Chrome enabled by default"'] = 'label: "\u9ed8\u8ba4\u542f\u7528 Claude in Chrome"'
$chunkN7['title: "Current session"'] = 'title: "\u5f53\u524d\u4f1a\u8bdd"'
$chunkN7['title: "Current week (all models)"'] = 'title: "\u672c\u5468\uff08\u5168\u90e8\u6a21\u578b\uff09"'
$chunkN7['title: "Current week (Sonnet only)"'] = 'title: "\u672c\u5468\uff08\u4ec5 Sonnet\uff09"'
$chunkN7['children: "/usage is only available for subscription plans."'] = 'children: "/usage \u4ec5\u9002\u7528\u4e8e\u8ba2\u9605\u5957\u9910\u3002"'
$chunkN7['children: "Extra usage not enabled \xB7 /extra-usage to enable"'] = 'children: "\u672a\u542f\u7528\u989d\u5916\u7528\u91cf \xb7 /extra-usage \u542f\u7528"'
$chunkN7['children: "Unlimited"'] = 'children: "\u65e0\u9650\u5236"'
$chunkN7['children: "Loading usage data\u2026"'] = 'children: "\u6b63\u5728\u52a0\u8f7d\u7528\u91cf\u6570\u636e\u2026"'
$chunkN7['description: "cancel"'] = 'description: "\u53d6\u6d88"'
$chunkN7['label: "Session name"'] = 'label: "\u4f1a\u8bdd\u540d\u79f0"'
$chunkN7['title: "Switch to Stable Channel"'] = 'title: "\u5207\u6362\u5230 Stable \u6e20\u9053"'
$chunkN7['children: "How would you like to handle this?"'] = 'children: "\u5982\u4f55\u5904\u7406\uff1f"'
$chunkN7['label: "Allow possible downgrade to stable version"'] = 'label: "\u5141\u8bb8\u53ef\u80fd\u964d\u7ea7\u5230 stable \u7248\u672c"'
$chunkN7[' ? " \xB7 Billed as extra usage"'] = ' ? " \xb7 \u8ba1\u4e3a\u989d\u5916\u7528\u91cf"'
Patch-AllChunks -DistDir $ChunksDir -Replacements $chunkN7

$chunkAvn2 = @{}
$chunkAvn2['children: "Plugin:"'] = 'children: "\u63d2\u4ef6\uff1a"'
$chunkAvn2['children: "Triggered by:"'] = 'children: "\u89e6\u53d1\u6761\u4ef6\uff1a"'
$chunkAvn2['children: "Marketplace:"'] = 'children: "\u5e02\u573a\uff1a"'
$chunkAvn2['children: "Would you like to install this LSP plugin?"'] = 'children: "\u662f\u5426\u5b89\u88c5\u6b64 LSP \u63d2\u4ef6\uff1f"'
$chunkAvn2['children: "Would you like to install it?"'] = 'children: "\u662f\u5426\u5b89\u88c5\uff1f"'
$chunkAvn2['children: "LSP provides code intelligence like go-to-definition and error checking"'] = 'children: "LSP \u63d0\u4f9b\u8df3\u8f6c\u5b9a\u4e49\u3001\u9519\u8bef\u68c0\u67e5\u7b49\u4ee3\u7801\u667a\u80fd\u529f\u80fd"'
$chunkAvn2['label: "Disable all LSP recommendations"'] = 'label: "\u7981\u7528\u6240\u6709 LSP \u63a8\u8350"'
$chunkAvn2['" files"'] = '" \u6587\u4ef6"'
$chunkAvn2['"Yes, install "'] = '"\u662f\uff0c\u5b89\u88c5 "'
$chunkAvn2['"Never for "'] = '"\u6c38\u4e0d\u63a8\u8350 "'
$chunkAvn2['children: "Thanks for the feedback!"'] = 'children: "\u611f\u8c22\u53cd\u9988\uff01"'
$chunkAvn2['children: "Can Anthropic look at your session transcript to help us improve Claude Code?"'] = 'children: "Anthropic \u662f\u5426\u53ef\u4ee5\u67e5\u770b\u4f1a\u8bdd\u8bb0\u5f55\u4ee5\u6539\u8fdb Claude Code\uff1f"'
$chunkAvn2['children: "Learn more: https://code.claude.com/docs/en/data-usage#session-quality-surveys"'] = 'children: "\u4e86\u89e3\u66f4\u591a\uff1a https://code.claude.com/docs/en/data-usage#session-quality-surveys"'
$chunkAvn2['children: "Claude in Chrome requires a claude.ai subscription"'] = 'children: "Claude in Chrome \u9700\u8981 claude.ai \u8ba2\u9605"'
$chunkAvn2['children: "Chrome extension not detected \xB7 https://claude.ai/chrome to install"'] = 'children: "\u672a\u68c0\u6d4b\u5230 Chrome \u6269\u5c55 \xb7 https://claude.ai/chrome \u5b89\u88c5"'
$chunkAvn2['children: "Save and close editor to continue..."'] = 'children: "\u4fdd\u5b58\u5e76\u5173\u95ed\u7f16\u8f91\u5668\u4ee5\u7ee7\u7eed..."'
$chunkAvn2['children: "Debug mode"'] = 'children: "\u8c03\u8bd5\u6a21\u5f0f"'
$chunkAvn2['children: "No other pipes found. Start another instance."'] = 'children: "\u672a\u627e\u5230\u5176\u4ed6\u7ba1\u9053\u3002\u8bf7\u542f\u52a8\u53e6\u4e00\u5b9e\u4f8b\u3002"'
Patch-AllChunks -DistDir $ChunksDir -Replacements $chunkAvn2

$chunkAvn3 = @{}
$chunkAvn3['": Yes"'] = '": \u662f"'
$chunkAvn3['": No"'] = '": \u5426"'
$chunkAvn3['": Don''t ask again"'] = '": \u4e0d\u518d\u8be2\u95ee"'
$chunkAvn3['" Thanks for sharing your transcript!"'] = '" \u611f\u8c22\u5206\u4eab\u4f1a\u8bdd\u8bb0\u5f55\uff01"'
$chunkAvn3['"Sharing transcript"'] = '"\u6b63\u5728\u5206\u4eab\u4f1a\u8bdd\u8bb0\u5f55"'
$chunkAvn3['"(Optional) Press ["'] = '"\uff08\u53ef\u9009\uff09\u6309 ["'
$chunkAvn3['"] to tell us what went well "'] = '"] \u544a\u8bc9\u6211\u4eec\u54ea\u91cc\u505a\u5f97\u597d "'
$chunkAvn3['children: "Tasks"'] = 'children: "\u4efb\u52a1"'
$chunkAvn3['children: "Prompt"'] = 'children: "\u63d0\u793a\u8bcd"'
$chunkAvn3['children: " (p to expand)"'] = 'children: " \uff08p \u5c55\u5f00\uff09"'
$chunkAvn3['" back \xB7 Esc close \xB7 k kill \xB7 s shutdown"'] = '" \u8fd4\u56de \xb7 Esc \u5173\u95ed \xb7 k \u7ec8\u6b62 \xb7 s \u5173\u673a"'
$chunkAvn3['" \xB7 h hide/show"'] = '" \xb7 h \u663e\u793a/\u9690\u85cf"'
$chunkAvn3['" cycle mode"'] = '" \u5207\u6362\u6a21\u5f0f"'
$chunkAvn3['children: "Cloud Authentication"'] = 'children: "\u4e91\u7aef\u8ba4\u8bc1"'
$chunkAvn3['children: "Failed to save marketplace retry info \xB7 Check ~/.claude.json permissions"'] = 'children: "\u4fdd\u5b58\u5e02\u573a\u91cd\u8bd5\u4fe1\u606f\u5931\u8d25 \xb7 \u68c0\u67e5 ~/.claude.json \u6743\u9650"'
$chunkAvn3['children: "Failed to install Anthropic marketplace \xB7 Will retry on next startup"'] = 'children: "\u5b89\u88c5 Anthropic \u5e02\u573a\u5931\u8d25 \xb7 \u4e0b\u6b21\u542f\u52a8\u65f6\u91cd\u8bd5"'
$chunkAvn3['children: "\u2713 Anthropic marketplace installed \xB7 /plugin to see available plugins"'] = 'children: "\u2713 \u5df2\u5b89\u88c5 Anthropic \u5e02\u573a \xb7 /plugin \u67e5\u770b\u53ef\u7528\u63d2\u4ef6"'
$chunkAvn3['reasonString: `Permission rule ${source_default.bold(permissionRuleValueToString(reason.rule.ruleValue))} requires confirmation for this ${toolType}.`'] = 'reasonString: `\u6743\u9650\u89c4\u5219 ${source_default.bold(permissionRuleValueToString(reason.rule.ruleValue))} \u9700\u8981\u786e\u8ba4\u624d\u80fd\u6267\u884c\u6b64 ${toolType}\u3002`'
$chunkAvn3['configString: reason.rule.source === "policySettings" ? undefined : "/permissions to update rules"'] = 'configString: reason.rule.source === "policySettings" ? undefined : "/permissions \u66f4\u65b0\u89c4\u5219"'
$chunkAvn3['reasonString: `Hook ${source_default.bold(reason.hookName)} requires confirmation for this ${toolType}${hookReasonString}${sourceLabel}`'] = 'reasonString: `\u94a9\u5b50 ${source_default.bold(reason.hookName)} \u9700\u8981\u786e\u8ba4\u624d\u80fd\u6267\u884c\u6b64 ${toolType}${hookReasonString}${sourceLabel}`'
$chunkAvn3['configString: "/hooks to update"'] = 'configString: "/hooks \u66f4\u65b0"'
$chunkAvn3['configString: "/permissions to update rules"'] = 'configString: "/permissions \u66f4\u65b0\u89c4\u5219"'
$chunkAvn3['text: "Model updated to Sonnet 4.6"'] = 'text: "\u6a21\u578b\u5df2\u5207\u6362\u4e3a Sonnet 4.6"'
$chunkAvn3['text: isLegacyRemap ? "Model updated to Opus 4.6 \xB7 Set CLAUDE_CODE_DISABLE_LEGACY_MODEL_REMAP=1 to opt out" : "Model updated to Opus 4.6"'] = 'text: isLegacyRemap ? "\u6a21\u578b\u5df2\u5207\u6362\u4e3a Opus 4.6 \xb7 \u8bbe\u7f6e CLAUDE_CODE_DISABLE_LEGACY_MODEL_REMAP=1 \u53ef\u9000\u51fa" : "\u6a21\u578b\u5df2\u5207\u6362\u4e3a Opus 4.6"'
Patch-AllChunks -DistDir $ChunksDir -Replacements $chunkAvn3

$chunkN7b = @{}
$chunkN7b['label: "Default teammate model"'] = 'label: "\u961f\u53cb\u9ed8\u8ba4\u6a21\u578b"'
$chunkN7b['label: "External CLAUDE.md includes"'] = 'label: "\u5916\u90e8 CLAUDE.md \u5f15\u7528"'
Patch-AllChunks -DistDir $ChunksDir -Replacements $chunkN7b

$chunkN7d = @{}
$chunkN7d['action: "confirm"'] = 'action: "\u786e\u8ba4"'
$chunkN7d['action: "select"'] = 'action: "\u9009\u62e9"'
$chunkN7d['action: "switch"'] = 'action: "\u5207\u6362"'
$chunkN7d['action: "return"'] = 'action: "\u8fd4\u56de"'
$chunkN7d['action: "tabs"'] = 'action: "\u6807\u7b7e\u9875"'
$chunkN7d['description: "close"'] = 'description: "\u5173\u95ed"'
$chunkN7d['description: "clear"'] = 'description: "\u6e05\u9664"'
$chunkN7d['description: "change"'] = 'description: "\u66f4\u6539"'
$chunkN7d['description: "save"'] = 'description: "\u4fdd\u5b58"'
$chunkN7d['description: "search"'] = 'description: "\u641c\u7d22"'
$chunkN7d['description: "retry"'] = 'description: "\u91cd\u8bd5"'
$chunkN7d['description: "disable external includes"'] = 'description: "\u7981\u7528\u5916\u90e8\u5f15\u7528"'
$chunkN7d['children: "disabled"'] = 'children: "\u5df2\u7981\u7528"'
Patch-AllChunks -DistDir $ChunksDir -Replacements $chunkN7d

$chunkEpvn2 = @{}
$chunkEpvn2['"Press "'] = '"\u6309 "'
$chunkEpvn2['" again to exit"'] = '" \u518d\u6b21\u9000\u51fa"'
Patch-AllChunks -DistDir $ChunksDir -Replacements $chunkEpvn2

$chunkEpvn3 = @{}
$chunkEpvn3['action: "confirm"'] = 'action: "\u786e\u8ba4"'
Patch-AllChunks -DistDir $ChunksDir -Replacements $chunkEpvn3

$chunkEpvn4 = @{}
$chunkEpvn4['children: "ON"'] = 'children: "\u5f00\u542f"'
Patch-AllChunks -DistDir $ChunksDir -Replacements $chunkEpvn4

$chunkXg5 = @{}
$chunkXg5['label: "Default (recommended)"'] = 'label: "\u9ed8\u8ba4\uff08\u63a8\u8350\uff09"'
$chunkXg5['label: "Opus Plan Mode"'] = 'label: "Opus \u8ba1\u5212\u6a21\u5f0f"'
$chunkXg5['description: "Use Opus 4.6 in plan mode, Sonnet 4.6 otherwise"'] = 'description: "\u8ba1\u5212\u6a21\u5f0f\u7528 Opus 4.6\uff0c\u5176\u4f59\u7528 Sonnet 4.6"'
$chunkXg5['label: "Sonnet (1M context)"'] = 'label: "Sonnet\uff081M \u4e0a\u4e0b\u6587\uff09"'
$chunkXg5['label: "Opus (1M context)"'] = 'label: "Opus\uff081M \u4e0a\u4e0b\u6587\uff09"'
$chunkXg5[' \xB7 Legacy'] = ' \xb7 \u65e7\u7248'
$chunkXg5['`Use the default model (currently ${renderDefaultModelSetting(getDefaultMainLoopModelSetting())})'] = '`\u4f7f\u7528\u9ed8\u8ba4\u6a21\u578b\uff08\u5f53\u524d ${renderDefaultModelSetting(getDefaultMainLoopModelSetting())}\uff09'
$chunkXg5['`Use the default model for Ants (currently ${currentModel})`'] = '`\u4f7f\u7528 Ant \u9ed8\u8ba4\u6a21\u578b\uff08\u5f53\u524d ${currentModel}\uff09`'
$chunkXg5['`Newer version available \xB7 select ${familyInfo.alias} for ${familyInfo.currentVersionName}`'] = '`\u6709\u66f4\u65b0\u7248\u672c \xb7 \u9009\u62e9 ${familyInfo.alias} \u4ee5\u4f7f\u7528 ${familyInfo.currentVersionName}`'
$chunkXg5['description: `Opus 4.6 with 1M context \xB7 Most capable for complex work'] = 'description: `Opus 4.6\uff081M \u4e0a\u4e0b\u6587\uff09\xb7 \u590d\u6742\u4efb\u52a1\u6700\u5f3a'
$chunkXg5['descriptionForModel: "Sonnet 4.6 with 1M context window - \u9002\u5408\u957f\u4f1a\u8bdd with large codebases"'] = 'descriptionForModel: "Sonnet 4.6\uff081M \u4e0a\u4e0b\u6587\uff09\xb7 \u9002\u5408\u5927\u578b\u4ee3\u7801\u5e93\u957f\u4f1a\u8bdd"'
$chunkXg5['descriptionForModel: "Opus 4.6 with 1M context window - \u9002\u5408\u957f\u4f1a\u8bdd with large codebases"'] = 'descriptionForModel: "Opus 4.6\uff081M \u4e0a\u4e0b\u6587\uff09\xb7 \u9002\u5408\u5927\u578b\u4ee3\u7801\u5e93\u957f\u4f1a\u8bdd"'
$chunkXg5['descriptionForModel: "Haiku 3.5 - faster and lower cost, but less capable than Sonnet. Use \u9002\u5408\u7b80\u5355\u4efb\u52a1."'] = 'descriptionForModel: "Haiku 3.5 \xb7 \u66f4\u5feb\u66f4\u4fbf\u5b9c\uff0c\u80fd\u529b\u4f4e\u4e8e Sonnet\uff0c\u9002\u5408\u7b80\u5355\u4efb\u52a1"'
$chunkXg5['description: `Opus 4.6 with 1M context \xB7 \u590d\u6742\u4efb\u52a1\u6700\u5f3a'] = 'description: `Opus 4.6\uff081M \u4e0a\u4e0b\u6587\uff09\xb7 \u590d\u6742\u4efb\u52a1\u6700\u5f3a'
$chunkXg5['" \xB7 Billed as extra usage"'] = '" \xb7 \u989d\u5916\u7528\u91cf\u8ba1\u8d39"'
$chunkXg5['description: `Sonnet 4.6 with 1M context${billingInfo}${is3P ? "" : ` \xB7 ${formatModelPricing(COST_TIER_3_15)}`}`'] = 'description: `Sonnet 4.6\uff081M \u4e0a\u4e0b\u6587\uff09${billingInfo}${is3P ? "" : ` \xB7 ${formatModelPricing(COST_TIER_3_15)}`}`'
$chunkXg5['description: `Opus 4.6 with 1M context${billingInfo}${getOpus46PricingSuffix(fastMode)}`'] = 'description: `Opus 4.6\uff081M \u4e0a\u4e0b\u6587\uff09${billingInfo}${getOpus46PricingSuffix(fastMode)}`'
Patch-AllChunks -DistDir $ChunksDir -Replacements $chunkXg5

$chunkMk2 = @{}
$chunkMk2['return "Sonnet 4.6 \xB7 Best for everyday tasks";'] = 'return "Sonnet 4.6 \xb7 \u9002\u5408\u65e5\u5e38\u4efb\u52a1";'
$chunkMk2['return `Opus 4.6 with 1M context \xB7 \u590d\u6742\u4efb\u52a1\u6700\u5f3a'] = 'return `Opus 4.6\uff081M \u4e0a\u4e0b\u6587\uff09\xb7 \u590d\u6742\u4efb\u52a1\u6700\u5f3a'
$chunkMk2['return `Opus 4.6 \xB7 \u590d\u6742\u4efb\u52a1\u6700\u5f3a'] = 'return `Opus 4.6 \xb7 \u590d\u6742\u4efb\u52a1\u6700\u5f3a'
$chunkMk2['return "Opus 4.6 in plan mode, else Sonnet 4.6";'] = 'return "Opus 4.6 \u8ba1\u5212\u6a21\u5f0f\uff0c\u5176\u4f59 Sonnet 4.6";'
$chunkMk2['return "Opus Plan";'] = 'return "Opus \u8ba1\u5212";'
$chunkMk2['return `Default (${getClaudeAiUserDefaultModelDescription()})`;'] = 'return `\u9ed8\u8ba4\uff08${getClaudeAiUserDefaultModelDescription()}\uff09`;'
$chunkMk2['return `Default for Ants (${renderDefaultModelSetting(getDefaultMainLoopModelSetting())})`;'] = 'return `Ant \u9ed8\u8ba4\uff08${renderDefaultModelSetting(getDefaultMainLoopModelSetting())}\uff09`;'
Patch-AllChunks -DistDir $ChunksDir -Replacements $chunkMk2

$chunkEpvn = @{}
$chunkEpvn['children: "Select model"'] = 'children: "\u9009\u62e9\u6a21\u578b"'
$chunkEpvn['headerText ?? "Switch between Claude models. Applies to this session and future Claude Code sessions. For other/previous model names, specify with --model."'] = 'headerText ?? "\u5728 Claude \u6a21\u578b\u95f4\u5207\u6362\u3002\u5bf9\u672c\u4f1a\u8bdd\u53ca\u4e4b\u540e\u7684 Claude Code \u4f1a\u8bdd\u751f\u6548\u3002\u5176\u4ed6/\u65e7\u6a21\u578b\u540d\u8bf7\u7528 --model \u6307\u5b9a\u3002"'
$chunkEpvn['"Currently using "'] = '"\u5f53\u524d\u4f1a\u8bdd\u4f7f\u7528 "'
$chunkEpvn[' for this session (set by plan mode). Selecting a model will undo this."'] = ' \uff08\u7531\u8ba1\u5212\u6a21\u5f0f\u8bbe\u5b9a\uff09\u3002\u9009\u62e9\u6a21\u578b\u5c06\u53d6\u6d88\u6b64\u8bbe\u7f6e\u3002"'
$chunkEpvn['" effort",'] = '" \u529b\u5ea6",'
$chunkEpvn['` (default)`'] = '` (\u9ed8\u8ba4)`'
$chunkEpvn['" Effort not supported"'] = '" \u4e0d\u652f\u6301 effort"'
$chunkEpvn['" 1M context on"'] = '" 1M \u4e0a\u4e0b\u6587\u5df2\u5f00\u542f"'
$chunkEpvn['" \xB7 Space to toggle"'] = '" \xb7 \u7a7a\u683c\u5207\u6362"'
$chunkEpvn['" 1M context off"'] = '" 1M \u4e0a\u4e0b\u6587\u5df2\u5173\u95ed"'
$chunkEpvn['"Fast mode is "'] = '"\u5feb\u901f\u6a21\u5f0f\u5df2"'
$chunkEpvn['" and available with"'] = '" \uff0c\u4ec5\u652f\u6301"'
$chunkEpvn[' only (/fast). Switching to other models turn off fast mode."'] = ' \uff08/fast\uff09\u3002\u5207\u6368\u5176\u4ed6\u6a21\u578b\u4f1a\u5173\u95ed\u5feb\u901f\u6a21\u5f0f\u3002"'
$chunkEpvn['"Use "'] = '"\u4f7f\u7528 "'
$chunkEpvn['" to turn on Fast mode ("'] = '" \u5f00\u542f\u5feb\u901f\u6a21\u5f0f\uff08"'
$chunkEpvn['" only)."'] = '" \u4ec5\uff09\u3002"'
$chunkEpvn['"and "'] = '"\u8fd8\u6709 "'
$chunkEpvn['" more\u2026"'] = '" \u9879\u2026"'
$chunkEpvn['description: "exit"'] = 'description: "\u9000\u51fa"'
$chunkEpvn['description: "Current model"'] = 'description: "\u5f53\u524d\u6a21\u578b"'
Patch-AllChunks -DistDir $ChunksDir -Replacements $chunkEpvn

$chunkEgfc2 = @{}
$chunkEgfc2['name: "Edit tools"'] = 'name: "\u7f16\u8f91\u5de5\u5177"'
$chunkEgfc2['name: "Execution tools"'] = 'name: "\u6267\u884c\u5de5\u5177"'
$chunkEgfc2['name: "Other tools"'] = 'name: "\u5176\u4ed6\u5de5\u5177"'
$chunkEgfc2['return "Built-in";'] = 'return "\u5185\u7f6e";'
$chunkEgfc2['return `Plugin: ${agent.plugin || "Unknown"}`;'] = 'return `\u63d2\u4ef6\uff1a${agent.plugin || "Unknown"}`;'
$chunkEgfc2['const renderBuiltInAgentsSection = (title = "Built-in (always available):")'] = 'const renderBuiltInAgentsSection = (title = "\u5185\u7f6e\uff08\u59cb\u7ec8\u53ef\u7528\uff09\uff1a")'
Patch-AllChunks -DistDir $ChunksDir -Replacements $chunkEgfc2

$chunkEgfc4 = @{}
$chunkEgfc4['action: "navigate"'] = 'action: "\u5bfc\u822a"'
$chunkEgfc4['action: "select"'] = 'action: "\u9009\u62e9"'
$chunkEgfc4['action: "save"'] = 'action: "\u4fdd\u5b58"'
$chunkEgfc4['action: "edit in your editor"'] = 'action: "\u5728\u7f16\u8f91\u5668\u4e2d\u6253\u5f00"'
$chunkEgfc4['action: "enter text"'] = 'action: "\u8f93\u5165\u6587\u672c"'
$chunkEgfc4['action: "continue"'] = 'action: "\u7ee7\u7eed"'
$chunkEgfc4['action: "toggle selection"'] = 'action: "\u5207\u6362\u9009\u62e9"'
Patch-AllChunks -DistDir $ChunksDir -Replacements $chunkEgfc4

$chunkXbv = @{}
$chunkXbv['onDone("Did not add a working directory.");'] = 'onDone("\u672a\u6dfb\u52a0\u5de5\u4f5c\u76ee\u5f55\u3002");'
$chunkXbv['message = `Added ${source_default.bold(path)} as a working directory and saved to local settings`;'] = 'message = `\u5df2\u5c06 ${source_default.bold(path)} \u6dfb\u52a0\u4e3a\u5de5\u4f5c\u76ee\u5f55\u5e76\u4fdd\u5b58\u5230\u672c\u5730\u8bbe\u7f6e`;'
$chunkXbv['message = `Added ${source_default.bold(path)} as a working directory. Failed to save to local settings: ${error instanceof Error ? error.message : "Unknown error"}`;'] = 'message = `\u5df2\u5c06 ${source_default.bold(path)} \u6dfb\u52a0\u4e3a\u5de5\u4f5c\u76ee\u5f55\uff0c\u4f46\u4fdd\u5b58\u5230\u672c\u5730\u8bbe\u7f6e\u5931\u8d25\uff1a${error instanceof Error ? error.message : "\u672a\u77e5\u9519\u8bef"}`;'
$chunkXbv['message = `Added ${source_default.bold(path)} as a working directory for this session`;'] = 'message = `\u5df2\u5c06 ${source_default.bold(path)} \u6dfb\u52a0\u4e3a\u672c\u6b21\u4f1a\u8bdd\u7684\u5de5\u4f5c\u76ee\u5f55`;'
$chunkXbv['const messageWithHint = `${message} ${source_default.dim("\xB7 /permissions to manage")}`;'] = 'const messageWithHint = `${message} ${source_default.dim("\xb7 /permissions \u7ba1\u7406")}`;'
$chunkXbv['onDone(`Did not add ${source_default.bold(result.absolutePath)} as a working directory.`);'] = 'onDone(`\u672a\u5c06 ${source_default.bold(result.absolutePath)} \u6dfb\u52a0\u4e3a\u5de5\u4f5c\u76ee\u5f55\u3002`);'
Patch-AllChunks -DistDir $ChunksDir -Replacements $chunkXbv

# v2.6.6 new Vite output uses backtick format for UI strings.
# Old maps used double-quote format and no longer match.
# These new maps cover the most visible interactive UI strings.
# Values use \uXXXX ASCII escapes (safe for Bun on Windows).
$chunkUiV2 = New-ReplacementMap
# Thinking mode
$chunkUiV2['children:`Toggle thinking mode`'] = 'children:`\u5207\u6362\u601d\u8003\u6a21\u5f0f`'
$chunkUiV2['children:`Enable or disable thinking for this session.`'] = 'children:`\u4e3a\u672c\u6b21\u4f1a\u8bdd\u5f00\u542f\u6216\u5173\u95ed\u601d\u8003\u6a21\u5f0f\u3002`'
# Plan mode messages
$chunkUiV2['children:`Claude wants to enter plan mode to explore and design an implementation approach.`'] = 'children:`Claude \u60f3\u8fdb\u5165\u8ba1\u5212\u6a21\u5f0f\uff0c\u63a2\u7d22\u5e76\u8bbe\u8ba1\u5b9e\u73b0\u65b9\u6848\u3002`'
$chunkUiV2['children:`Claude wants to exit plan mode`'] = 'children:`Claude \u60f3\u9000\u51fa\u8ba1\u5212\u6a21\u5f0f`'
$chunkUiV2['children:`Claude has written up a plan and is ready to execute. Would you like to proceed?`'] = 'children:`Claude \u5df2\u5236\u5b9a\u4e86\u8ba1\u5212\u5e76\u51c6\u5907\u6267\u884c\u3002\u662f\u5426\u7ee7\u7eed\uff1f`'
$chunkUiV2['children:`Here is Claude''s plan:`'] = 'children:`Claude \u7684\u8ba1\u5212\uff1a`'
$chunkUiV2['children:`In plan mode, Claude will:`'] = 'children:`\u5728\u8ba1\u5212\u6a21\u5f0f\u4e0b\uff0cClaude \u5c06\uff1a`'
$chunkUiV2['children:`No code changes will be made until you approve the plan.`'] = 'children:`\u5728\u60a8\u6279\u51c6\u8ba1\u5212\u4e4b\u524d\u4e0d\u4f1a\u8fdb\u884c\u4ee3\u7801\u66f4\u6539\u3002`'
$chunkUiV2['` · Explore the codebase thoroughly`'] = '` \xb7 \u5168\u9762\u63a2\u7d22\u4ee3\u7801\u5e93`'
$chunkUiV2['` · Identify existing patterns`'] = '` \xb7 \u8bc6\u522b\u73b0\u6709\u6a21\u5f0f`'
$chunkUiV2['` · Design an implementation strategy`'] = '` \xb7 \u8bbe\u8ba1\u5b9e\u73b0\u7b56\u7565`'
$chunkUiV2['` · Present a plan for your approval`'] = '` \xb7 \u63d0\u4ea4\u8ba1\u5212\u4f9b\u60a8\u5ba1\u6279`'
$chunkUiV2['children:`Do you want to proceed?`'] = 'children:`\u662f\u5426\u7ee7\u7eed\uff1f`'
$chunkUiV2['children:`Would you like to proceed?`'] = 'children:`\u662f\u5426\u7ee7\u7eed\uff1f`'
$chunkUiV2['title:`Enter plan mode?`'] = 'title:`\u8fdb\u5165\u8ba1\u5212\u6a21\u5f0f\uff1f`'
$chunkUiV2['title:`Exit plan mode?`'] = 'title:`\u9000\u51fa\u8ba1\u5212\u6a21\u5f0f\uff1f`'
$chunkUiV2['title:`Ready to code?`'] = 'title:`\u51c6\u5907\u7f16\u7801\uff1f`'
$chunkUiV2['children:`How should the plan be implemented?`'] = 'children:`\u8ba1\u5212\u5e94\u5982\u4f55\u5b9e\u73b0\uff1f`'
# Plan mode labels
$chunkUiV2['label:`Yes, enter plan mode`'] = 'label:`\u662f\uff0c\u8fdb\u5165\u8ba1\u5212\u6a21\u5f0f`'
$chunkUiV2['label:`No, start implementing now`'] = 'label:`\u5426\uff0c\u7acb\u5373\u5f00\u59cb\u5b9e\u73b0`'
$chunkUiV2['label:`No, keep planning`'] = 'label:`\u5426\uff0c\u7ee7\u7eed\u89c4\u5212`'
$chunkUiV2['label:`Skip interview and plan immediately`'] = 'label:`\u8df3\u8fc7\u8bbf\u8c08\u7acb\u5373\u89c4\u5212`'
$chunkUiV2['label:`Don''t implement — save plan and return`'] = 'label:`\u4e0d\u5b9e\u73b0\u2014\u4fdd\u5b58\u8ba1\u5212\u5e76\u8fd4\u56de`'
# Permission / acceptance labels
$chunkUiV2['label:`Yes, auto-accept edits`'] = 'label:`\u662f\uff0c\u81ea\u52a8\u63a5\u53d7\u7f16\u8f91`'
$chunkUiV2['label:`Yes, manually approve edits`'] = 'label:`\u662f\uff0c\u624b\u52a8\u6279\u51c6\u7f16\u8f91`'
$chunkUiV2['label:`Yes, allow edits to .claude/ config for this session`'] = 'label:`\u662f\uff0c\u5141\u8bb8\u672c\u6b21\u4f1a\u8bdd\u7f16\u8f91 .claude/ \u914d\u7f6e`'
$chunkUiV2['label:`No, not now`'] = 'label:`\u5426\uff0c\u6682\u65f6\u4e0d`'
$chunkUiV2['label:`Start new session`'] = 'label:`\u5f00\u59cb\u65b0\u4f1a\u8bdd`'
$chunkUiV2['label:`Continue this conversation`'] = 'label:`\u7ee7\u7eed\u6b64\u5bf9\u8bdd`'
# Status / state strings
$chunkUiV2['text:`No background agents running`'] = 'text:`\u65e0\u540e\u53f0 agent \u5728\u8fd0\u884c`'
$chunkUiV2['children:`Waiting for permission…`'] = 'children:`\u7b49\u5f85\u6743\u9650\u2026`'
$chunkUiV2['children:`Summarizing…`'] = 'children:`\u6458\u8981\u4e2d\u2026`'
$chunkUiV2['children:`Debug mode`'] = 'children:`\u8c03\u8bd5\u6a21\u5f0f`'
$chunkUiV2['children:`Rewind`'] = 'children:`\u56de\u9000`'
# Context management
$chunkUiV2['children:`Summarize from here`'] = 'children:`\u4ece\u6b64\u5904\u6458\u8981`'
$chunkUiV2['children:`Summarize up to here`'] = 'children:`\u6458\u8981\u5230\u6b64\u5904`'
$chunkUiV2['children:`Restore code`'] = 'children:`\u6062\u590d\u4ee3\u7801`'
$chunkUiV2['children:`Restore conversation`'] = 'children:`\u6062\u590d\u5bf9\u8bdd`'
$chunkUiV2['children:`Restore code and conversation`'] = 'children:`\u6062\u590d\u4ee3\u7801\u548c\u5bf9\u8bdd`'
Patch-AllChunks -DistDir $ChunksDir -Replacements $chunkUiV2

# v2.6.6 backtick UI strings — iter 21 batch (settings/agents/skill/tag/hooks)
$chunkUiV3 = New-ReplacementMap
# InvalidSettingsDialog
$chunkUiV3['title:`Settings Error`'] = 'title:`\u8bbe\u7f6e\u9519\u8bef`'
$chunkUiV3['children:`Files with errors are skipped entirely, not just the invalid settings.`'] = 'children:`\u6709\u9519\u8bef\u7684\u6587\u4ef6\u5c06\u5b8c\u5168\u8df3\u8fc7\uff0c\u800c\u4e0d\u4ec5\u662f\u65e0\u6548\u8bbe\u7f6e\u9879\u3002`'
$chunkUiV3['label:`Exit and fix manually`'] = 'label:`\u9000\u51fa\u5e76\u624b\u52a8\u4fee\u590d`'
$chunkUiV3['label:`Continue without these settings`'] = 'label:`\u7ee7\u7eed\u4f46\u8df3\u8fc7\u8fd9\u4e9b\u8bbe\u7f6e`'
# Tag dialog
$chunkUiV3['title:`Remove tag?`'] = 'title:`\u79fb\u9664\u6807\u7b7e\uff1f`'
$chunkUiV3['subtitle:`Current tag: #'] = 'subtitle:`\u5f53\u524d\u6807\u7b7e\uff1a #'
$chunkUiV3['children:`This will remove the tag from the current session.`'] = 'children:`\u5c06\u4ece\u5f53\u524d\u4f1a\u8bdd\u4e2d\u79fb\u9664\u6b64\u6807\u7b7e\u3002`'
$chunkUiV3['label:`Yes, remove tag`'] = 'label:`\u662f\uff0c\u79fb\u9664\u6807\u7b7e`'
$chunkUiV3['label:`No, keep tag`'] = 'label:`\u5426\uff0c\u4fdd\u7559\u6807\u7b7e`'
# Agents wizard & menu (backtick format in agents-DaLzXVa7.js)
$chunkUiV3['label:`View agent`'] = 'label:`\u67e5\u770b agent`'
$chunkUiV3['label:`Edit agent`'] = 'label:`\u7f16\u8f91 agent`'
$chunkUiV3['label:`Delete agent`'] = 'label:`\u5220\u9664 agent`'
$chunkUiV3['label:`Back`'] = 'label:`\u8fd4\u56de`'
$chunkUiV3['subtitle:`Creation method`'] = 'subtitle:`\u521b\u5efa\u65b9\u5f0f`'
$chunkUiV3['subtitle:`Select model`'] = 'subtitle:`\u9009\u62e9\u6a21\u578b`'
$chunkUiV3['label:`Generate with Claude (recommended)`'] = 'label:`\u4f7f\u7528 Claude \u751f\u6210\uff08\u63a8\u8350\uff09`'
$chunkUiV3['label:`Manual configuration`'] = 'label:`\u624b\u52a8\u914d\u7f6e`'
$chunkUiV3['`Generation cancelled`'] = '`\u751f\u6210\u5df2\u53d6\u6d88`'
$chunkUiV3['`Please describe what the agent should do`'] = '`\u8bf7\u63cf\u8ff0\u8be5 agent \u5e94\u505a\u4ec0\u4e48`'
# Skill Search panel
$chunkUiV3['title:`Skill Search`'] = 'title:`Skill \u641c\u7d22`'
$chunkUiV3['description:`Show whether automatic skill matching is active`'] = 'description:`\u663e\u793a\u81ea\u52a8 skill \u5339\u914d\u662f\u5426\u542f\u7528`'
$chunkUiV3['description:`Enable automatic skill matching for this session`'] = 'description:`\u672c\u6b21\u4f1a\u8bdd\u542f\u7528\u81ea\u52a8 skill \u5339\u914d`'
$chunkUiV3['description:`Disable automatic skill matching for this session`'] = 'description:`\u672c\u6b21\u4f1a\u8bdd\u7981\u7528\u81ea\u52a8 skill \u5339\u914d`'
$chunkUiV3['description:`How automatic skill matching works`'] = 'description:`\u81ea\u52a8 skill \u5339\u914d\u5de5\u4f5c\u539f\u7406`'
$chunkUiV3['`Skill search panel dismissed`'] = '`\u5df2\u5173\u95ed Skill \u641c\u7d22\u9762\u677f`'
# Skill Learning panel
$chunkUiV3['title:`Skill Learning`'] = 'title:`Skill \u5b66\u4e60`'
$chunkUiV3['description:`Show skill learning status for current project`'] = 'description:`\u663e\u793a\u5f53\u524d\u9879\u76ee\u7684 skill \u5b66\u4e60\u72b6\u6001`'
$chunkUiV3['description:`Enable skill learning for this session`'] = 'description:`\u672c\u6b21\u4f1a\u8bdd\u542f\u7528 skill \u5b66\u4e60`'
$chunkUiV3['description:`Disable skill learning for this session`'] = 'description:`\u672c\u6b21\u4f1a\u8bdd\u7981\u7528 skill \u5b66\u4e60`'
$chunkUiV3['description:`Detailed description of skill learning features`'] = 'description:`skill \u5b66\u4e60\u529f\u80fd\u8be6\u7ec6\u8bf4\u660e`'
$chunkUiV3['`Skill panel dismissed`'] = '`\u5df2\u5173\u95ed Skill \u9762\u677f`'
# Hooks dialog (read-only menu)
$chunkUiV3['title:`Hooks`'] = 'title:`Hooks \u914d\u7f6e`'
# Fix iter-21 mistake: revert 钩子 → Hooks 配置 if already patched
$chunkUiV3['title:`\u94a9\u5b50`'] = 'title:`Hooks \u914d\u7f6e`'
$chunkUiV3[' Hooks Restricted by Policy'] = ' Hooks \u53d7\u7b56\u7565\u9650\u5236'
$chunkUiV3['`Only hooks from managed settings can run. User-defined hooks from ~/.claude/settings.json, .claude/settings.json, and .claude/settings.local.json are blocked.`'] = '`\u4ec5\u7ba1\u7406\u8bbe\u7f6e\u4e2d\u7684 hooks \u53ef\u8fd0\u884c\u3002\u6765\u81ea ~/.claude/settings.json\u3001.claude/settings.json \u548c .claude/settings.local.json \u7684\u7528\u6237\u81ea\u5b9a\u4e49 hooks \u5df2\u88ab\u963b\u6b62\u3002`'
$chunkUiV3['` This menu is read-only. To add or modify hooks, edit settings.json directly or ask Claude.`'] = '`\u6b64\u83dc\u5355\u4e3a\u53ea\u8bfb\u3002\u8981\u6dfb\u52a0\u6216\u4fee\u6539 hooks\uff0c\u8bf7\u76f4\u63a5\u7f16\u8f91 settings.json \u6216\u5411 Claude \u63d0\u51fa\u8bf7\u6c42\u3002`'
# Backtick "Press X again to exit" (install-github-app etc.)
$chunkUiV3['` again to exit`'] = '`\u518d\u6b21\u9000\u51fa`'
Patch-AllChunks -DistDir $ChunksDir -Replacements $chunkUiV3

# v2.6.6 backtick UI strings — iter 22 (trust/agents/github/config)
$chunkUiV4 = New-ReplacementMap
# TrustDialog (first-run folder trust)
$chunkUiV4['title:`Accessing workspace:`'] = 'title:`\u8bbf\u95ee\u5de5\u4f5c\u533a\uff1a`'
$chunkUiV4['`Is this a project you trust? (Your own code, a well-known open source project, or work from your team).`'] = '`\u662f\u5426\u4fe1\u4efb\u6b64\u9879\u76ee\uff1f\uff08\u60a8\u81ea\u5df1\u7684\u4ee3\u7801\u3001\u8457\u540d\u5f00\u6e90\u9879\u76ee\u6216\u56e2\u961f\u5de5\u4f5c\uff09\u3002`'
$chunkUiV4['`Once trusted, Claude Code can read, edit, and run commands in this folder.`'] = '`\u4fe1\u4efb\u540e\uff0cClaude Code \u53ef\u5728\u6b64\u6587\u4ef6\u5939\u4e2d\u8bfb\u53d6\u3001\u7f16\u8f91\u5e76\u8fd0\u884c\u547d\u4ee4\u3002`'
$chunkUiV4['label:`Yes, I trust this folder`'] = 'label:`\u662f\uff0c\u6211\u4fe1\u4efb\u6b64\u6587\u4ef6\u5939`'
$chunkUiV4['label:`No, exit`'] = 'label:`\u5426\uff0c\u9000\u51fa`'
$chunkUiV4['`Enter to confirm \u00b7 Esc to cancel`'] = '`\u6309 Enter \u786e\u8ba4 \u00b7 Esc \u53d6\u6d88`'
$chunkUiV4['`Enter to confirm · Esc to cancel`'] = '`\u6309 Enter \u786e\u8ba4 \u00b7 Esc \u53d6\u6d88`'
$chunkUiV4['`Security guide`'] = '`\u5b89\u5168\u6307\u5357`'
# InvalidConfigDialog
$chunkUiV4['title:`Configuration Error`'] = 'title:`\u914d\u7f6e\u9519\u8bef`'
$chunkUiV4['children:`Choose an option:`'] = 'children:`\u8bf7\u9009\u62e9\uff1a`'
$chunkUiV4['label:`Reset with default configuration`'] = 'label:`\u91cd\u7f6e\u4e3a\u9ed8\u8ba4\u914d\u7f6e`'
$chunkUiV4['`The configuration file at `'] = '`\u914d\u7f6e\u6587\u4ef6 `'
$chunkUiV4['` contains invalid JSON.`'] = '`\u5305\u542b\u65e0\u6548\u7684 JSON\u3002`'
# Agents list & wizard
$chunkUiV4['`Agents dialog dismissed`'] = '`\u5df2\u5173\u95ed Agents \u5bf9\u8bdd\u6846`'
$chunkUiV4['title:`Create new agent`'] = 'title:`\u521b\u5efa\u65b0 agent`'
$chunkUiV4['children:`Create new agent`'] = 'children:`\u521b\u5efa\u65b0 agent`'
$chunkUiV4['children:`No agents found`'] = 'children:`\u672a\u627e\u5230 agent`'
$chunkUiV4['children:`No agents found. Create specialized subagents that Claude can delegate to.`'] = 'children:`\u672a\u627e\u5230 agent\u3002\u521b\u5efa\u4e13\u7528\u5b50 agent \u4f9b Claude \u59d4\u6258\u4f7f\u7528\u3002`'
$chunkUiV4['children:`Built-in agents`'] = 'children:`\u5185\u7f6e agent`'
$chunkUiV4['children:`Built-in agents are provided by default and cannot be modified.`'] = 'children:`\u5185\u7f6e agent \u9ed8\u8ba4\u63d0\u4f9b\uff0c\u65e0\u6cd5\u4fee\u6539\u3002`'
$chunkUiV4['`Failed to save agent`'] = '`\u4fdd\u5b58 agent \u5931\u8d25`'
$chunkUiV4['label:`Edit tools`'] = 'label:`\u7f16\u8f91\u5de5\u5177`'
$chunkUiV4['label:`Edit model`'] = 'label:`\u7f16\u8f91\u6a21\u578b`'
$chunkUiV4['label:`Edit color`'] = 'label:`\u7f16\u8f91\u989c\u8272`'
$chunkUiV4['label:`open in editor`'] = 'label:`\u5728\u7f16\u8f91\u5668\u4e2d\u6253\u5f00`'
$chunkUiV4['label:`Continue`'] = 'label:`\u7ee7\u7eed`'
$chunkUiV4['label:`Confirm and save`'] = 'label:`\u786e\u8ba4\u5e76\u4fdd\u5b58`'
$chunkUiV4['title:`Delete agent`'] = 'title:`\u5220\u9664 agent`'
$chunkUiV4['subtitle:`System prompt`'] = 'subtitle:`\u7cfb\u7edf\u63d0\u793a\u8bcd`'
$chunkUiV4['subtitle:`Description`'] = 'subtitle:`\u63cf\u8ff0`'
$chunkUiV4['subtitle:`Tools`'] = 'subtitle:`\u5de5\u5177`'
$chunkUiV4['subtitle:`Model`'] = 'subtitle:`\u6a21\u578b`'
$chunkUiV4['subtitle:`Permission mode`'] = 'subtitle:`\u6743\u9650\u6a21\u5f0f`'
$chunkUiV4['subtitle:`Memory`'] = 'subtitle:`\u8bb0\u5fc6`'
$chunkUiV4['subtitle:`Color`'] = 'subtitle:`\u989c\u8272`'
$chunkUiV4['subtitle:`Location`'] = 'subtitle:`\u4f4d\u7f6e`'
$chunkUiV4['subtitle:`Choose location`'] = 'subtitle:`\u9009\u62e9\u4f4d\u7f6e`'
$chunkUiV4['subtitle:`Configure agent memory`'] = 'subtitle:`\u914d\u7f6e agent \u8bb0\u5fc6`'
$chunkUiV4['label:`Inherit from parent`'] = 'label:`\u7ee7\u627f\u7236\u7ea7`'
$chunkUiV4['description:`Balanced performance - best for most agents`'] = 'description:`\u6027\u80fd\u5747\u8861 \u2014 \u9002\u5408\u5927\u591a\u6570 agent`'
$chunkUiV4['description:`Most capable for complex reasoning tasks`'] = 'description:`\u6700\u5f3a\u80fd\u529b \u2014 \u9002\u5408\u590d\u6742\u63a8\u7406\u4efb\u52a1`'
$chunkUiV4['description:`Fast and efficient for simple tasks`'] = 'description:`\u5feb\u901f\u9ad8\u6548 \u2014 \u9002\u5408\u7b80\u5355\u4efb\u52a1`'
$chunkUiV4['description:`Use the same model as the main conversation`'] = 'description:`\u4f7f\u7528\u4e0e\u4e3b\u5bf9\u8bdd\u76f8\u540c\u7684\u6a21\u578b`'
$chunkUiV4['`Model determines the agent''s reasoning capabilities and speed.`'] = '`\u6a21\u578b\u51b3\u5b9a agent \u7684\u63a8\u7406\u80fd\u529b\u4e0e\u901f\u5ea6\u3002`'
$chunkUiV4['return`Built-in`'] = 'return`\u5185\u7f6e`'
$chunkUiV4['?`Built-in`:'] = '?`\u5185\u7f6e`:'
# install-github-app main flow
$chunkUiV4['children:`Install GitHub App`'] = 'children:`\u5b89\u88c5 GitHub App`'
$chunkUiV4['children:`Choose API key`'] = 'children:`\u9009\u62e9 API \u5bc6\u94a5`'
$chunkUiV4['children:`Select GitHub repository`'] = 'children:`\u9009\u62e9 GitHub \u4ed3\u5e93`'
$chunkUiV4['children:`Setup API key secret`'] = 'children:`\u8bbe\u7f6e API \u5bc6\u94a5`'
$chunkUiV4['title:`Existing Workflow Found`'] = 'title:`\u53d1\u73b0\u73b0\u6709\u5de5\u4f5c\u6d41`'
$chunkUiV4['children:`Install the Claude GitHub App`'] = 'children:`\u5b89\u88c5 Claude GitHub App`'
$chunkUiV4['children:`Select GitHub workflows to install`'] = 'children:`\u9009\u62e9\u8981\u5b89\u88c5\u7684 GitHub \u5de5\u4f5c\u6d41`'
$chunkUiV4['children:`Create GitHub Actions workflow`'] = 'children:`\u521b\u5efa GitHub Actions \u5de5\u4f5c\u6d41`'
$chunkUiV4['label:`Update workflow file with latest version`'] = 'label:`\u66f4\u65b0\u5de5\u4f5c\u6d41\u6587\u4ef6\u81f3\u6700\u65b0\u7248`'
$chunkUiV4['label:`Skip workflow update (configure secrets only)`'] = 'label:`\u8df3\u8fc7\u5de5\u4f5c\u6d41\u66f4\u65b0\uff08\u4ec5\u914d\u7f6e\u5bc6\u94a5\uff09`'
$chunkUiV4['label:`Exit without making changes`'] = 'label:`\u9000\u51fa\u4e0d\u505a\u4fee\u6539`'
Patch-AllChunks -DistDir $ChunksDir -Replacements $chunkUiV4

# v2.6.6 backtick UI strings — iter 23 (permissions/agents/github)
$chunkUiV5 = New-ReplacementMap
# permissions-BVvJQBEO (backtick ports from $chunk28d)
$chunkUiV5['children:`Any Bash command`'] = 'children:`\u4efb\u610f Bash \u547d\u4ee4`'
$chunkUiV5['title:`Remove directory from workspace?`'] = 'title:`\u4ece\u5de5\u4f5c\u533a\u79fb\u9664\u76ee\u5f55\uff1f`'
$chunkUiV5['children:`Claude Code will no longer have access to files in this directory.`'] = 'children:`Claude Code \u5c06\u65e0\u6cd5\u518d\u8bbf\u95ee\u6b64\u76ee\u5f55\u4e2d\u7684\u6587\u4ef6\u3002`'
$chunkUiV5['children:`No recent denials. Commands denied by the auto mode classifier will appear here.`'] = 'children:`\u6682\u65e0\u6700\u8fd1\u62d2\u7edd\u8bb0\u5f55\u3002\u81ea\u52a8\u6a21\u5f0f\u5206\u7c7b\u5668\u62d2\u7edd\u7684\u547d\u4ee4\u5c06\u663e\u793a\u5728\u6b64\u5904\u3002`'
$chunkUiV5['children:`Commands recently denied by the auto mode classifier.`'] = 'children:`\u6700\u8fd1\u88ab\u81ea\u52a8\u6a21\u5f0f\u5206\u7c7b\u5668\u62d2\u7edd\u7684\u547d\u4ee4\u3002`'
$chunkUiV5['children:`Are you sure you want to delete this permission rule?`'] = 'children:`\u786e\u5b9a\u8981\u5220\u9664\u6b64\u6743\u9650\u89c4\u5219\uff1f`'
$chunkUiV5['children:`Rule details`'] = 'children:`\u89c4\u5219\u8be6\u60c5`'
$chunkUiV5['title:`Permissions:`'] = 'title:`\u6743\u9650\uff1a`'
$chunkUiV5['title:`Recently denied`'] = 'title:`\u6700\u8fd1\u62d2\u7edd`'
$chunkUiV5['title:`Workspace`'] = 'title:`\u5de5\u4f5c\u533a`'
$chunkUiV5['title:`Allow`'] = 'title:`\u5141\u8bb8`'
$chunkUiV5['title:`Deny`'] = 'title:`\u62d2\u7edd`'
$chunkUiV5['title:`Ask`'] = 'title:`\u8be2\u95ee`'
$chunkUiV5['children:`Claude Code can read files in the workspace, and make edits when auto-accept edits is on.`'] = 'children:`Claude Code \u53ef\u8bfb\u53d6\u5de5\u4f5c\u533a\u6587\u4ef6\uff0c\u5f00\u542f\u81ea\u52a8\u63a5\u53d7\u7f16\u8f91\u65f6\u53ef\u8fdb\u884c\u4fee\u6539\u3002`'
$chunkUiV5['label:`Project settings (local)`'] = 'label:`\u9879\u76ee\u8bbe\u7f6e\uff08\u672c\u5730\uff09`'
$chunkUiV5['label:`Project settings`'] = 'label:`\u9879\u76ee\u8bbe\u7f6e`'
$chunkUiV5['label:`User settings`'] = 'label:`\u7528\u6237\u8bbe\u7f6e`'
$chunkUiV5['label:`Yes`'] = 'label:`\u662f`'
$chunkUiV5['label:`No`'] = 'label:`\u5426`'
$chunkUiV5['text:`Settings`'] = 'text:`\u8bbe\u7f6e`'
$chunkUiV5['children:`Enter to submit \u00b7 Esc to cancel`'] = 'children:`\u6309 Enter \u63d0\u4ea4 \u00b7 Esc \u53d6\u6d88`'
$chunkUiV5['children:`Enter to submit · Esc to cancel`'] = 'children:`\u6309 Enter \u63d0\u4ea4 \u00b7 Esc \u53d6\u6d88`'
$chunkUiV5['`Permissions dialog dismissed`'] = '`\u5df2\u5173\u95ed\u6743\u9650\u5bf9\u8bdd\u6846`'
$chunkUiV5['label:`Add directory${r.ellipsis}`'] = 'label:`\u6dfb\u52a0\u76ee\u5f55${r.ellipsis}`'
$chunkUiV5['label:`Add a new rule${r.ellipsis}`'] = 'label:`\u6dfb\u52a0\u65b0\u89c4\u5219${r.ellipsis}`'
$chunkUiV5['children:`(Original working directory)`'] = 'children:`\uff08\u539f\u59cb\u5de5\u4f5c\u76ee\u5f55\uff09`'
# agents-DaLzXVa7 wizard (backtick ports from $chunkEgfc)
$chunkUiV5['children:`All tools`'] = 'children:`\u5168\u90e8\u5de5\u5177`'
$chunkUiV5['children:`None`'] = 'children:`\u65e0`'
$chunkUiV5['children:`Description`'] = 'children:`\u63cf\u8ff0`'
$chunkUiV5['children:`Tools`'] = 'children:`\u5de5\u5177`'
$chunkUiV5['children:`Model`'] = 'children:`\u6a21\u578b`'
$chunkUiV5['children:`Permission mode`'] = 'children:`\u6743\u9650\u6a21\u5f0f`'
$chunkUiV5['children:`Memory`'] = 'children:`\u8bb0\u5fc6`'
$chunkUiV5['children:`Color`'] = 'children:`\u989c\u8272`'
$chunkUiV5['children:`System prompt`'] = 'children:`\u7cfb\u7edf\u63d0\u793a\u8bcd`'
$chunkUiV5['children:`Automatic color`'] = 'children:`\u81ea\u52a8\u989c\u8272`'
$chunkUiV5['children:`Preview: `'] = 'children:`\u9884\u89c8\uff1a `'
$chunkUiV5['children:`When should Claude use this agent?`'] = 'children:`\u4f55\u65f6\u8ba9 Claude \u4f7f\u7528\u6b64 agent\uff1f`'
$chunkUiV5['children:`Each subagent has its own context window, custom system prompt, and specific tools.`'] = 'children:`\u6bcf\u4e2a\u5b50 agent \u6709\u72ec\u7acb\u4e0a\u4e0b\u6587\u3001\u81ea\u5b9a\u4e49\u7cfb\u7edf\u63d0\u793a\u8bcd\u548c\u6307\u5b9a\u5de5\u5177\u3002`'
$chunkUiV5['children:`Try creating: Code Reviewer, Code Simplifier, Security Reviewer, Tech Lead, or UX Reviewer.`'] = 'children:`\u53ef\u5c1d\u8bd5\u521b\u5efa\uff1aCode Reviewer\u3001Code Simplifier\u3001Security Reviewer\u3001Tech Lead \u6216 UX Reviewer\u3002`'
$chunkUiV5['subtitle:`Choose background color`'] = 'subtitle:`\u9009\u62e9\u80cc\u666f\u8272`'
$chunkUiV5['subtitle:`Description (tell Claude when to use this agent)`'] = 'subtitle:`\u63cf\u8ff0\uff08\u544a\u8bc9 Claude \u4f55\u65f6\u4f7f\u7528\u6b64 agent\uff09`'
$chunkUiV5['subtitle:`Select tools`'] = 'subtitle:`\u9009\u62e9\u5de5\u5177`'
$chunkUiV5['label:`Open in editor`'] = 'label:`\u5728\u7f16\u8f91\u5668\u4e2d\u6253\u5f00`'
$chunkUiV5['label:`MCP Servers:`'] = 'label:`MCP \u670d\u52a1\uff1a`'
$chunkUiV5['label:`Individual Tools:`'] = 'label:`\u5355\u4e2a\u5de5\u5177\uff1a`'
$chunkUiV5['label:`None (no persistent memory)`'] = 'label:`\u65e0\uff08\u65e0\u6301\u4e45\u8bb0\u5fc6\uff09`'
$chunkUiV5['label:`Project (.claude/agents/)`'] = 'label:`\u9879\u76ee\uff08.claude/agents/\uff09`'
$chunkUiV5['label:`Personal (~/.claude/agents/)`'] = 'label:`\u4e2a\u4eba\uff08~/.claude/agents/\uff09`'
$chunkUiV5['label:`Yes, delete`'] = 'label:`\u662f\uff0c\u5220\u9664`'
$chunkUiV5['label:`No, cancel`'] = 'label:`\u5426\uff0c\u53d6\u6d88`'
$chunkUiV5['children:` Generating agent from description...`'] = 'children:` \u6b63\u5728\u6839\u636e\u63cf\u8ff0\u751f\u6210 agent\u2026`'
$chunkUiV5['children:`Name`'] = 'children:`\u540d\u79f0`'
$chunkUiV5['children:`Location`'] = 'children:`\u4f4d\u7f6e`'
$chunkUiV5['children:`Warnings:`'] = 'children:`\u8b66\u544a\uff1a`'
$chunkUiV5['children:`Errors:`'] = 'children:`\u9519\u8bef\uff1a`'
# install-github-app remaining flow
$chunkUiV5['children:`You must select at least one workflow to continue`'] = 'children:`\u81f3\u5c11\u9009\u62e9\u4e00\u4e2a\u5de5\u4f5c\u6d41\u624d\u80fd\u7ee7\u7eed`'
$chunkUiV5['children:`We''ll create a workflow file in your repository for each one you select.`'] = 'children:`\u6211\u4eec\u4f1a\u4e3a\u60a8\u9009\u62e9\u7684\u6bcf\u4e2a\u5de5\u4f5c\u6d41\u5728\u4ed3\u5e93\u4e2d\u521b\u5efa\u5de5\u4f5c\u6d41\u6587\u4ef6\u3002`'
$chunkUiV5['children:`Claude Code Review - Automated code review on new PRs`'] = 'children:`Claude Code Review \u2014 \u65b0 PR \u81ea\u52a8\u4ee3\u7801\u5ba1\u67e5`'
$chunkUiV5['children:`Would you like to:`'] = 'children:`\u60a8\u60f3\u8981\uff1a`'
$chunkUiV5['children:`What would you like to do?`'] = 'children:`\u60a8\u60f3\u8981\u600e\u4e48\u505a\uff1f`'
$chunkUiV5['children:`ANTHROPIC_API_KEY already exists in repository secrets!`'] = 'children:`\u4ed3\u5e93 secrets \u4e2d\u5df2\u5b58\u5728 ANTHROPIC_API_KEY\uff01`'
$chunkUiV5['children:`GitHub CLI not found`'] = 'children:`\u672a\u627e\u5230 GitHub CLI`'
$chunkUiV5['children:`GitHub CLI not authenticated`'] = 'children:`GitHub CLI \u672a\u8ba4\u8bc1`'
$chunkUiV5['children:`GitHub CLI (gh) does not appear to be installed or accessible.`'] = 'children:`GitHub CLI (gh) \u4f3c\u4e4e\u672a\u5b89\u88c5\u6216\u65e0\u6cd5\u8bbf\u95ee\u3002`'
$chunkUiV5['children:`GitHub CLI does not appear to be authenticated.`'] = 'children:`GitHub CLI \u4f3c\u4e4e\u672a\u8ba4\u8bc1\u3002`'
$chunkUiV5['children:`Press Enter to try again, or any other key to cancel`'] = 'children:`\u6309 Enter \u91cd\u8bd5\uff0c\u6216\u6309\u5176\u4ed6\u952e\u53d6\u6d88`'
$chunkUiV5['children:`Press Enter to continue anyway, or Ctrl+C to exit and fix issues`'] = 'children:`\u6309 Enter \u7ee7\u7eed\uff0c\u6216 Ctrl+C \u9000\u51fa\u5e76\u4fee\u590d\u95ee\u9898`'
$chunkUiV5['children:`We found some potential issues, but you can continue anyway`'] = 'children:`\u53d1\u73b0\u4e00\u4e9b\u6f5c\u5728\u95ee\u9898\uff0c\u4f46\u60a8\u4ecd\u53ef\u7ee7\u7eed`'
$chunkUiV5['children:`Success`'] = 'children:`\u6210\u529f`'
$chunkUiV5['children:`Next steps:`'] = 'children:`\u4e0b\u4e00\u6b65\uff1a`'
$chunkUiV5['children:`Create Authentication Token`'] = 'children:`\u521b\u5efa\u8ba4\u8bc1\u4ee4\u724c`'
$chunkUiV5['children:`Please enter a repository name to continue`'] = 'children:`\u8bf7\u8f93\u5165\u4ed3\u5e93\u540d\u624d\u80fd\u7ee7\u7edd`'
$chunkUiV5['title:`Invalid GitHub URL format`'] = 'title:`GitHub URL \u683c\u5f0f\u65e0\u6548`'
$chunkUiV5['title:`Repository format warning`'] = 'title:`\u4ed3\u5e93\u683c\u5f0f\u8b66\u544a`'
Patch-AllChunks -DistDir $ChunksDir -Replacements $chunkUiV5

# v2.6.6 backtick UI strings — iter 24 (permissions/agents/github remaining)
$chunkUiV6 = New-ReplacementMap
# permissions-BVvJQBEO remaining (backtick ports from $chunk28d)
$chunkUiV6['`Contact your system administrator for more information.`'] = '`\u8bf7\u8054\u7cfb\u7cfb\u7edf\u7ba1\u7406\u5458\u4e86\u89e3\u66f4\u591a\u4fe1\u606f\u3002`'
$chunkUiV6['`This rule is configured by managed settings and cannot be modified.`'] = '`\u6b64\u89c4\u5219\u7531\u6258\u7ba1\u8bbe\u7f6e\u914d\u7f6e\uff0c\u65e0\u6cd5\u4fee\u6539\u3002`'
$chunkUiV6['`Delete `'] = '`\u5220\u9664 `'
$chunkUiV6['` tool?`'] = '` \u5de5\u5177\uff1f`'
$chunkUiV6['`Any Bash command starting with `'] = '`\u4ee5\u6b64\u5f00\u5934\u7684 Bash \u547d\u4ee4 `'
$chunkUiV6['`The Bash command `'] = '`Bash \u547d\u4ee4 `'
$chunkUiV6['`Any use of the `'] = '`\u4efb\u610f\u4f7f\u7528 `'
$chunkUiV6['` tool`'] = '` \u5de5\u5177`'
$chunkUiV6['`Where should this rule be saved?`'] = '`\u6b64\u89c4\u5219\u4fdd\u5b58\u5230\u54ea\u91cc\uff1f`'
$chunkUiV6['`Where should these rules be saved?`'] = '`\u8fd9\u4e9b\u89c4\u5219\u4fdd\u5b58\u5230\u54ea\u91cc\uff1f`'
$chunkUiV6['`Permission rules are a tool name, optionally followed by a specifier in parentheses.`'] = '`\u6743\u9650\u89c4\u5219\u4e3a\u5de5\u5177\u540d\uff0c\u53ef\u9009\u62ec\u53f7\u5185\u9650\u5b9a\u7b26\u3002`'
$chunkUiV6['`e.g., `'] = '`\u4f8b\u5982\uff1a `'
$chunkUiV6['` or `'] = '` \u6216 `'
$chunkUiV6['placeholder:`Enter permission rule${r.ellipsis}`'] = 'placeholder:`\u8f93\u5165\u6743\u9650\u89c4\u5219${r.ellipsis}`'
$chunkUiV6['` (retry)`'] = '` \uff08\u91cd\u8bd5\uff09`'
$chunkUiV6['`Esc to cancel`'] = '`Esc \u53d6\u6d88`'
$chunkUiV6['`Claude Code won''t ask before using allowed tools.`'] = '`Claude Code \u4f7f\u7528\u5df2\u5141\u8bb8\u5de5\u5177\u524d\u4e0d\u4f1a\u8be2\u95ee\u3002`'
$chunkUiV6['`Claude Code will always ask for confirmation before using these tools.`'] = '`Claude Code \u4f7f\u7528\u8fd9\u4e9b\u5de5\u5177\u524d\u603b\u662f\u4f1a\u8be2\u95ee\u786e\u8ba4\u3002`'
$chunkUiV6['`Claude Code will always reject requests to use denied tools.`'] = '`Claude Code \u603b\u662f\u62d2\u7edd\u4f7f\u7528\u5df2\u62d2\u7edd\u5de5\u5177\u7684\u8bf7\u6c42\u3002`'
$chunkUiV6['`←/→ tab switch · ↓ return · Esc cancel`'] = '`\u2190/\u2192 \u5207\u6362\u6807\u7b7e \u00b7 \u2193 \u8fd4\u56de \u00b7 Esc \u53d6\u6d88`'
$chunkUiV6['`Type to filter · Enter/↓ select · ↑ tabs · Esc clear`'] = '`\u8f93\u5165\u7b5b\u9009 \u00b7 Enter/\u2193 \u9009\u62e9 \u00b7 \u2191 \u6807\u7b7e \u00b7 Esc \u6e05\u9664`'
$chunkUiV6['`Enter approve · r retry · ↑↓ navigate · ←/→ switch · Esc cancel`'] = '`Enter \u6279\u51c6 \u00b7 r \u91cd\u8bd5 \u00b7 \u2191\u2193 \u5bfc\u822a \u00b7 \u2190/\u2192 \u5207\u6362 \u00b7 Esc \u53d6\u6d88`'
$chunkUiV6['`↑↓ navigate · Enter select · Type to search · ←/→ switch · Esc cancel`'] = '`\u2191\u2193 \u5bfc\u822a \u00b7 Enter \u9009\u62e9 \u00b7 \u8f93\u5165\u641c\u7d22 \u00b7 \u2190/\u2192 \u5207\u6362 \u00b7 Esc \u53d6\u6d88`'
$chunkUiV6['`Workspace dialog dismissed`'] = '`\u5df2\u5173\u95ed\u5de5\u4f5c\u533a\u5bf9\u8bdd\u6846`'
$chunkUiV6['`From ${le(e.source)}`'] = '`\u6765\u81ea ${le(e.source)}`'
# agents-DaLzXVa7 wizard remaining (backtick ports from $chunkEgfc)
$chunkUiV6['description:`go back`'] = 'description:`\u8fd4\u56de`'
$chunkUiV6['description:`cancel`'] = 'description:`\u53d6\u6d88`'
$chunkUiV6['description:`submit`'] = 'description:`\u63d0\u4ea4`'
$chunkUiV6['description:`open in editor`'] = 'description:`\u5728\u7f16\u8f91\u5668\u4e2d\u6253\u5f00`'
$chunkUiV6['action:`navigate`'] = 'action:`\u5bfc\u822a`'
$chunkUiV6['action:`select`'] = 'action:`\u9009\u62e9`'
$chunkUiV6['action:`enter text`'] = 'action:`\u8f93\u5165\u6587\u672c`'
$chunkUiV6['action:`continue`'] = 'action:`\u7ee7\u7eed`'
$chunkUiV6['action:`toggle selection`'] = 'action:`\u5207\u6362\u9009\u62e9`'
$chunkUiV6['action:`save`'] = 'action:`\u4fdd\u5b58`'
$chunkUiV6['action:`edit in your editor`'] = 'action:`\u5728\u7f16\u8f91\u5668\u4e2d\u7f16\u8f91`'
$chunkUiV6['subtitle:`Agent type (identifier)`'] = 'subtitle:`Agent \u6807\u8bc6\u7b26`'
$chunkUiV6['subtitle:`Confirm and save`'] = 'subtitle:`\u786e\u8ba4\u5e76\u4fdd\u5b58`'
$chunkUiV6['subtitle:`No agents found`'] = 'subtitle:`\u672a\u627e\u5230 agent`'
$chunkUiV6['children:`Enter the system prompt for your agent:`'] = 'children:`\u8f93\u5165 agent \u7684\u7cfb\u7edf\u63d0\u793a\u8bcd\uff1a`'
$chunkUiV6['children:`Be comprehensive for best results`'] = 'children:`\u5185\u5bb9\u8d8a\u8be6\u7ec6\u6548\u679c\u8d8a\u597d`'
$chunkUiV6['children:`Enter a unique identifier for your agent:`'] = 'children:`\u8f93\u5165 agent \u7684\u552f\u4e00\u6807\u8bc6\u7b26\uff1a`'
$chunkUiV6['label:`Hide advanced options`'] = 'label:`\u9690\u85cf\u9ad8\u7ea7\u9009\u9879`'
$chunkUiV6['label:`Show advanced options`'] = 'label:`\u663e\u793a\u9ad8\u7ea7\u9009\u9879`'
$chunkUiV6['u?`Hide advanced options`:`Show advanced options`'] = 'u?`\u9690\u85cf\u9ad8\u7ea7\u9009\u9879`:`\u663e\u793a\u9ad8\u7ea7\u9009\u9879`'
$chunkUiV6['`[ Continue ]`'] = '`[\u7ee7\u7eed]`'
$chunkUiV6['children:`All tools selected`'] = 'children:`\u5df2\u9009\u62e9\u5168\u90e8\u5de5\u5177`'
$chunkUiV6['h?`All tools selected`:`${m.size} of ${i.length} tools selected`'] = 'h?`\u5df2\u9009\u62e9\u5168\u90e8\u5de5\u5177`:`\u5df2\u9009 ${m.size}/${i.length} \u4e2a\u5de5\u5177`'
$chunkUiV6['label:`User scope (~/.claude/agent-memory/) (Recommended)`'] = 'label:`\u7528\u6237\u8303\u56f4\uff08~/.claude/agent-memory/\uff09\uff08\u63a8\u8350\uff09`'
$chunkUiV6['label:`Project scope (.claude/agent-memory/) (Recommended)`'] = 'label:`\u9879\u76ee\u8303\u56f4\uff08.claude/agent-memory/\uff09\uff08\u63a8\u8350\uff09`'
$chunkUiV6['label:`Project scope (.claude/agent-memory/)`'] = 'label:`\u9879\u76ee\u8303\u56f4\uff08.claude/agent-memory/\uff09`'
$chunkUiV6['label:`Local scope (.claude/agent-memory-local/)`'] = 'label:`\u672c\u5730\u8303\u56f4\uff08.claude/agent-memory-local/\uff09`'
$chunkUiV6['label:`User scope (~/.claude/agent-memory/)`'] = 'label:`\u7528\u6237\u8303\u56f4\uff08~/.claude/agent-memory/\uff09`'
$chunkUiV6['`Are you sure you want to delete the agent `'] = '`\u786e\u5b9a\u8981\u5220\u9664 agent `'
$chunkUiV6['`Source: `'] = '`\u6765\u6e90\uff1a `'
$chunkUiV6['`(always available)`'] = '`\uff08\u59cb\u7ec8\u53ef\u7528\uff09`'
$chunkUiV6['` (tells Claude when to use this agent):`'] = '`\uff08\u544a\u8bc9 Claude \u4f55\u65f6\u4f7f\u7528\u6b64 agent\uff09\uff1a`'
$chunkUiV6['`Inherit from parent`'] = '`\u7ee7\u627f\u7236\u7ea7`'
$chunkUiV6['`Inherit from parent (default)`'] = '`\u7ee7\u627f\u7236\u7ea7\uff08\u9ed8\u8ba4\uff09`'
$chunkUiV6['` Unrecognized: `'] = '` \u672a\u8bc6\u522b\uff1a `'
$chunkUiV6['instructions:`Press Enter or Esc to go back`'] = 'instructions:`\u6309 Enter \u6216 Esc \u8fd4\u56de`'
$chunkUiV6['instructions:`Press ↑↓ to navigate · Enter to select · Esc to go back`'] = 'instructions:`\u6309 \u2191\u2193 \u5bfc\u822a \u00b7 Enter \u9009\u62e9 \u00b7 Esc \u8fd4\u56de`'
$chunkUiV6['instructions:`Press ↑↓ to navigate, Enter to select, Esc to cancel`'] = 'instructions:`\u6309 \u2191\u2193 \u5bfc\u822a\u3001Enter \u9009\u62e9\u3001Esc \u53d6\u6d88`'
$chunkUiV6['description:`Current model (custom ID)`'] = 'description:`\u5f53\u524d\u6a21\u578b\uff08\u81ea\u5b9a\u4e49 ID\uff09`'
$chunkUiV6['name:`Read-only tools`'] = 'name:`\u53ea\u8bfb\u5de5\u5177`'
$chunkUiV6['name:`Edit tools`'] = 'name:`\u7f16\u8f91\u5de5\u5177`'
$chunkUiV6['name:`Execution tools`'] = 'name:`\u6267\u884c\u5de5\u5177`'
$chunkUiV6['name:`MCP tools`'] = 'name:`MCP \u5de5\u5177`'
$chunkUiV6['name:`Other tools`'] = 'name:`\u5176\u4ed6\u5de5\u5177`'
$chunkUiV6['${h?c.checkboxOn:c.checkboxOff} All tools'] = '${h?c.checkboxOn:c.checkboxOff} \u5168\u90e8\u5de5\u5177'
# install-github-app remaining (title/subtitle/OAuth/repo warnings)
$chunkUiV6['title:`Select GitHub workflows to install`'] = 'title:`\u9009\u62e9\u8981\u5b89\u88c5\u7684 GitHub \u5de5\u4f5c\u6d41`'
$chunkUiV6['subtitle:`We''ll create a workflow file in your repository for each one you select.`'] = 'subtitle:`\u6211\u4eec\u4f1a\u4e3a\u60a8\u9009\u62e9\u7684\u6bcf\u4e2a\u5de5\u4f5c\u6d41\u5728\u4ed3\u5e93\u4e2d\u521b\u5efa\u5de5\u4f5c\u6d41\u6587\u4ef6\u3002`'
$chunkUiV6['message:`The repository URL format appears to be invalid.`'] = 'message:`\u4ed3\u5e93 URL \u683c\u5f0f\u65e0\u6548\u3002`'
$chunkUiV6['message:`Repository should be in format "owner/repo"`'] = 'message:`\u4ed3\u5e93\u683c\u5f0f\u5e94\u4e3a "owner/repo"`'
$chunkUiV6['`Use format: owner/repo or https://github.com/owner/repo`'] = '`\u683c\u5f0f\uff1aowner/repo \u6216 https://github.com/owner/repo`'
$chunkUiV6['`Use format: owner/repo`'] = '`\u683c\u5f0f\uff1aowner/repo`'
$chunkUiV6['`Example: anthropics/claude-cli`'] = '`\u793a\u4f8b\uff1aanthropics/claude-cli`'
$chunkUiV6['`Use your existing Claude Code API key`'] = '`\u4f7f\u7528\u73b0\u6709 Claude Code API \u5bc6\u94a5`'
$chunkUiV6['`Create a long-lived token with your Claude subscription`'] = '`\u4f7f\u7528 Claude \u8ba2\u9605\u521b\u5efa\u957f\u671f\u4ee4\u724c`'
$chunkUiV6['children:`Enter new API key`'] = 'children:`\u8f93\u5165\u65b0 API \u5bc6\u94a5`'
$chunkUiV6['`Use current repository: `'] = '`\u4f7f\u7528\u5f53\u524d\u4ed3\u5e93\uff1a `'
$chunkUiV6['placeholder:`Enter repository`'] = 'placeholder:`\u8f93\u5165\u4ed3\u5e93`'
$chunkUiV6['placeholder:`Enter a different repository`'] = 'placeholder:`\u8f93\u5165\u5176\u4ed6\u4ed3\u5e93`'
$chunkUiV6['children:`Opening browser to install the Claude GitHub App…`'] = 'children:`\u6b63\u5728\u6253\u5f00\u6d4f\u89c8\u5668\u5b89\u88c5 Claude GitHub App\u2026`'
$chunkUiV6['`Press Enter once you''ve installed the app`'] = '`\u5b89\u88c5\u5b8c\u6210\u540e\u6309 Enter`'
$chunkUiV6['children:`Starting authentication…`'] = 'children:`\u6b63\u5728\u542f\u52a8\u8ba4\u8bc1\u2026`'
$chunkUiV6['children:`Processing authentication…`'] = 'children:`\u6b63\u5728\u5904\u7406\u8ba4\u8bc1\u2026`'
$chunkUiV6['children:`Opening browser to sign in with your Claude account…`'] = 'children:`\u6b63\u5728\u6253\u5f00\u6d4f\u89c8\u5668\u767b\u5f55 Claude \u8d26\u6237\u2026`'
$chunkUiV6['children:`Authentication token created successfully!`'] = 'children:`\u8ba4\u8bc1\u4ee4\u724c\u521b\u5efa\u6210\u529f\uff01`'
$chunkUiV6['children:`Retrying…`'] = 'children:`\u6b63\u5728\u91cd\u8bd5\u2026`'
$chunkUiV6['`↑/↓ to select · Enter to continue`'] = '`\u2191/\u2193 \u9009\u62e9 \u00b7 Enter \u7ee7\u7eed`'
$chunkUiV6['title:`Repository not found`'] = 'title:`\u672a\u627e\u5230\u4ed3\u5e93`'
$chunkUiV6['children:`Creating authentication token…`'] = 'children:`\u6b63\u5728\u521b\u5efa\u8ba4\u8bc1\u4ee4\u724c\u2026`'
$chunkUiV6['`Press any key to exit`'] = '`\u6309\u4efb\u610f\u952e\u9000\u51fa`'
Patch-AllChunks -DistDir $ChunksDir -Replacements $chunkUiV6

# Fix v2.6.6 upstream React context bug:
# loadAgentsDir chunk has two AppState implementations (mA: Z2e, EA: wA).
# AppStateProvider provides wA but h5e uses hA->uA->Z2e, causing crash.
# Make Z2e reuse wA (EA always initializes before mA in the render order).
$chunkReactCtxFix = New-ReplacementMap
$chunkReactCtxFix['Z2e=pA.createContext(null),pA.createContext(!1)'] = 'Z2e=wA||pA.createContext(null),pA.createContext(!1)'
Patch-AllChunks -DistDir $ChunksDir -Replacements $chunkReactCtxFix

# Fix v2.6.6 upstream config guard bug:
# growthbook chunk has two config-read implementations (cv: ov flag, Tk: wk flag).
# enable_configs() only sets ov=!0 but never sets wk, so pk() always throws
# "Config accessed before allowed." Make pk() use ov (same flag L_ uses).
$chunkConfigFix = New-ReplacementMap
$chunkConfigFix['if(!wk)throw Error(`Config accessed before allowed.`)'] = 'if(!ov)throw Error(`Config accessed before allowed.`)'
Patch-AllChunks -DistDir $ChunksDir -Replacements $chunkConfigFix

# Tool action labels (Ve object in bridgeMain — visible in status bar on every tool call)
$chunkVe = New-ReplacementMap
$chunkVe['Ve={Read:`Reading`,Write:`Writing`,Edit:`Editing`,MultiEdit:`Editing`,Bash:`Running`,Glob:`Searching`,Grep:`Searching`,WebFetch:`Fetching`,WebSearch:`Searching`,Task:`Running task`,FileReadTool:`Reading`,FileWriteTool:`Writing`,FileEditTool:`Editing`,GlobTool:`Searching`,GrepTool:`Searching`,BashTool:`Running`,NotebookEditTool:`Editing notebook`,LSP:`LSP`}'] = 'Ve={Read:`读取中`,Write:`写入中`,Edit:`编辑中`,MultiEdit:`编辑中`,Bash:`执行中`,Glob:`搜索中`,Grep:`搜索中`,WebFetch:`获取中`,WebSearch:`搜索中`,Task:`执行任务中`,FileReadTool:`读取中`,FileWriteTool:`写入中`,FileEditTool:`编辑中`,GlobTool:`搜索中`,GrepTool:`搜索中`,BashTool:`执行中`,NotebookEditTool:`编辑 notebook中`,LSP:`LSP`}'
Patch-AllChunks -DistDir $ChunksDir -Replacements $chunkVe

# Status bar agent progress hints, bypass warning, and empty state messages
$chunkSb = New-ReplacementMap
$chunkSb['` · enter to view`'] = '` · 回车查看`'
$chunkSb['B8e=`shift + ↑/↓ to select`'] = 'B8e=`shift + ↑/↓ 选择`'
$chunkSb['` · ${_} tool ${_===1?`use`:`uses`} · ${rc(v)} tokens`'] = '` · ${_} 次工具调用 · ${rc(v)} tokens`'
$chunkSb['children:`(esc to interrupt `'] = 'children:`(Esc 中断 `'
$chunkSb['`Waiting for team lead approval`'] = '`等待队长批准`'
$chunkSb['label:`Remote Control failed`'] = 'label:`远程控制失败`'
$chunkSb['title:`WARNING: Claude Code running in Bypass Permissions mode`'] = 'title:`警告：Claude Code 运行在绕过权限模式`'
$chunkSb['emptyMessage:g=`No results`'] = 'emptyMessage:g=`无结果`'
$chunkSb['{type:`text`,value:`No files in context`}'] = '{type:`text`,value:`无上下文文件`}'
Patch-AllChunks -DistDir $ChunksDir -Replacements $chunkSb

# Compacting completed system message (template literal contains literal newlines)
$chunkCompact = New-ReplacementMap
$chunkCompact['text:`' + ([char]10) + ([char]10) + 'Compacting completed.`'] = 'text:`' + ([char]10) + ([char]10) + '压缩完成。`'
Patch-AllChunks -DistDir $ChunksDir -Replacements $chunkCompact

# Help improve Claude / privacy settings section (Grove chunk - first-run dialog)
$chunkGrove = New-ReplacementMap
$chunkGrove['children:`Help improve Claude`'] = 'children:`帮助改进 Claude`'
$chunkGrove['children:`Allow the use of your chats and coding sessions to train and improve Anthropic AI models. You can change this anytime in Privacy Settings`'] = 'children:`允许使用您的对话和编程会话训练并改进 Anthropic AI 模型。可随时在隐私设置中更改。`'
$chunkGrove['children:`How this affects data retention`'] = 'children:`这如何影响数据保留`'
$chunkGrove['children:`Turning ON the improve Claude setting extends data retention from 30 days to 5 years. Turning it OFF keeps the default 30-day data retention. Delete data anytime.`'] = 'children:`开启「改进 Claude」将数据保留从 30 天延长至 5 年。关闭则保持默认 30 天。可随时删除数据。`'
Patch-AllChunks -DistDir $ChunksDir -Replacements $chunkGrove

Write-Host ""
Flush-ChunkCache

Write-Host "Applying slash command description translations..." -ForegroundColor Cyan
$ApplySlashScript = Join-Path $PSScriptRoot "apply-slash-command-i18n.mjs"
if (-not (Test-Path -LiteralPath $ApplySlashScript)) {
    throw "Missing slash command i18n script: $ApplySlashScript"
}
& $BunExe $ApplySlashScript $DistDir
if ($LASTEXITCODE -ne 0) {
    throw "apply-slash-command-i18n.mjs failed with exit code $LASTEXITCODE"
}

Write-Host ""
Write-Host "Normalizing UTF-8 literals to \\uXXXX (Bun Windows fix)..." -ForegroundColor Cyan
if (-not (Test-Path -LiteralPath $NormalizeScript)) {
    throw "Missing normalizer: $NormalizeScript"
}
$normalizeExit = 0
try {
    # Run normalize; capture output and exit code before ForEach-Object pipeline to avoid
    # PS5.1 $LASTEXITCODE corruption when bun writes to stderr (NativeCommandError objects).
    $normalizeOut = & $BunExe $NormalizeScript $DistDir 2>&1
    $normalizeExit = $LASTEXITCODE
    $normalizeOut | ForEach-Object { Write-Host $_ }
} catch {
    # NativeCommandError from bun stderr WARNs — not fatal
    Write-Host "  [note] normalize warning: $_" -ForegroundColor Yellow
}
if ($normalizeExit -ne 0) {
    throw "normalize-i18n-literals.mjs failed with exit code $normalizeExit"
}

Test-NoMojibake -DistDir $DistDir
Test-NoLiteralCjkInPatchedChunks -DistDir $DistDir
Test-NoMixedSplitFragments -DistDir $DistDir
Test-BunParsesWelcomeMessage -DistDir $DistDir -BunPath $BunExe
Test-SlashCommandDescriptionsInFile -DistDir $DistDir

Write-Host ""
Write-Host "Done." -ForegroundColor Cyan
exit 0
