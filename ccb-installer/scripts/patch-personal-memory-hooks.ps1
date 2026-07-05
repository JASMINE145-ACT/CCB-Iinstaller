# Merge personal-memory Stop hooks into live CCB agent .md frontmatter (hooks only; body untouched).
# Usage:
#   .\ccb-installer\scripts\patch-personal-memory-hooks.ps1
#   .\ccb-installer\scripts\patch-personal-memory-hooks.ps1 -AgentsDir "$env:LOCALAPPDATA\CCB-Wanding\.claude\agents"

param(
    [string]$AgentsDir
)

$ErrorActionPreference = "Stop"

$utf8NoBom = [System.Text.UTF8Encoding]::new($false)

function Write-Utf8NoBom {
    param([string]$Path, [string]$Value)
    [System.IO.File]::WriteAllText($Path, $Value, $utf8NoBom)
}

if (-not $AgentsDir) {
    $AgentsDir = Join-Path $env:LOCALAPPDATA "CCB-Wanding\.claude\agents"
}

$memoryCommand = 'python "$LOCALAPPDATA/CCB-Wanding/.claude/skills/ccb-personal-memory/scripts/post-personal-memory-stop.py"'

$memoryHookBlock = @"
        - type: command
          command: $memoryCommand
          timeout: 30
"@.TrimEnd()

$orchestratorHooksYaml = @"
hooks:
  Stop:
    - hooks:
        - type: command
          command: $memoryCommand
          timeout: 30
"@.Trim()

$targetIds = @(
    "wande-orchestrator",
    "quotation-agent",
    "accurate-agent"
)

function Merge-MemoryHookIntoFrontmatter {
    param([string]$Content)

    if ($Content -match 'post-personal-memory-stop\.py') {
        Write-Host "  [skip] memory hook already present"
        return $Content
    }

    if ($Content -match '(?ms)^---\s*\r?\n(.*?)\r?\n---\s*\r?\n(.*)$') {
        $front = $Matches[1]
        $body = $Matches[2]
    }
    else {
        throw "No YAML frontmatter found"
    }

    if ($front -match '(?ms)(^hooks:\s*\r?\n  Stop:\s*\r?\n    - hooks:\s*\r?\n)') {
        $newFront = [regex]::Replace(
            $front,
            '(?ms)(^hooks:\s*\r?\n  Stop:\s*\r?\n    - hooks:\s*\r?\n)',
            "`${1}$memoryHookBlock`r`n",
            1
        )
    }
    elseif ($front -match '(?m)^hooks:\s*$') {
        $newFront = ($front.TrimEnd() + "`r`n  Stop:`r`n    - hooks:`r`n" + ($memoryHookBlock -replace "`n", "`r`n")).TrimEnd()
    }
    else {
        $newFront = ($front.TrimEnd() + "`r`n" + $orchestratorHooksYaml).TrimEnd()
    }

    return "---`r`n$newFront`r`n---`r`n$body"
}

if (-not (Test-Path -LiteralPath $AgentsDir)) {
    throw "Agents directory not found: $AgentsDir"
}

foreach ($id in $targetIds) {
    $mdPath = Join-Path $AgentsDir "$id.md"
    if (-not (Test-Path -LiteralPath $mdPath)) {
        Write-Host "[miss] $id.md" -ForegroundColor DarkYellow
        continue
    }
    $raw = [System.IO.File]::ReadAllText($mdPath, $utf8NoBom)
    if ($raw.StartsWith([char]0xFEFF)) {
        $raw = $raw.Substring(1)
    }
    try {
        $merged = Merge-MemoryHookIntoFrontmatter -Content $raw
        if ($merged -ne $raw) {
            Write-Utf8NoBom -Path $mdPath -Value $merged
            Write-Host "[ok]   $id.md"
        }
    }
    catch {
        Write-Host "[err]  $id.md — $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host "Done."
