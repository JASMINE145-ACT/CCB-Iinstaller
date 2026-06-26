# _p1-test.ps1 — isolated P1 translation test
$ErrorActionPreference = "Stop"
$utf8NoBom = [System.Text.UTF8Encoding]::new($false)
$ChunksDir = "D:\Projects\claude-code-best\ccb-installer\dist\chunks"

function New-ReplacementMap {
    return [System.Collections.Generic.Dictionary[string, string]]::new([System.StringComparer]::Ordinal)
}

function Patch-AllChunks {
    param(
        [Parameter(Mandatory = $true)][string]$DistDir,
        [Parameter(Mandatory = $true)]$Replacements
    )
    Get-ChildItem -LiteralPath $DistDir -Filter "*.js" -File | ForEach-Object {
        $content = [System.IO.File]::ReadAllText($_.FullName, $utf8NoBom)
        $changed = $false
        foreach ($kv in $Replacements.GetEnumerator()) {
            if ($content.Contains($kv.Key)) {
                $content = $content.Replace($kv.Key, $kv.Value)
                $changed = $true
                Write-Host "  [hit] $($_.Name): $($kv.Key.Substring(0, [Math]::Min(60, $kv.Key.Length)))..."
            }
        }
        if ($changed) {
            [System.IO.File]::WriteAllText($_.FullName, $content, $utf8NoBom)
            Write-Host "  [updated] $($_.Name)" -ForegroundColor Green
        }
    }
}

# === P1: Onboarding / Welcome / Startup profiler ===
$chunkOnboarding = New-ReplacementMap
$chunkOnboarding['To change this later, run /theme'] = '\u7a0d\u540e\u53ef\u901a\u8fc7 /theme \u4fee\u6539'
$chunkOnboarding['Option+Enter for newlines and visual bell'] = 'Option+Enter \u6362\u884c\u5e76\u89e6\u53d1\u89c6\u89c9\u63d0\u793a'
$chunkOnboarding['Shift+Enter for newlines'] = 'Shift+Enter \u6362\u884c'
Patch-AllChunks -DistDir $ChunksDir -Replacements $chunkOnboarding

$chunkWelcomeV2 = New-ReplacementMap
$chunkWelcomeV2['Welcome to Claude Code'] = '\u6b22\u8fce\u4f7f\u7528 Claude Code'
Patch-AllChunks -DistDir $ChunksDir -Replacements $chunkWelcomeV2

$chunkStartupProfiler = New-ReplacementMap
$chunkStartupProfiler['Startup profiling not enabled'] = '\u672a\u542f\u7528\u542f\u52a8\u6027\u80fd\u5206\u6790'
$chunkStartupProfiler['No profiling checkpoints recorded'] = '\u672a\u8bb0\u5f55\u542f\u52a8\u6027\u80fd\u5206\u6790\u68c0\u67e5\u70b9'
Patch-AllChunks -DistDir $ChunksDir -Replacements $chunkStartupProfiler

Write-Host ""
Write-Host "P1 translations applied." -ForegroundColor Cyan
