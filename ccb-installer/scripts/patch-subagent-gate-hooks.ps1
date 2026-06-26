# Merge subagent-gate Stop hooks into live CCB agent .md frontmatter (hooks only; body untouched).
# Usage:
#   .\ccb-installer\scripts\patch-subagent-gate-hooks.ps1
#   .\ccb-installer\scripts\patch-subagent-gate-hooks.ps1 -AgentsDir "$env:LOCALAPPDATA\CCB-Wanding\.claude\agents"

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

$gateCommand = 'bash "$LOCALAPPDATA/CCB-Wanding/.claude/skills/ccb-subagent-gate/scripts/subagent-gate.sh"'

$targetIds = @(
    "ppt-creator",
    "excel-creator",
    "word-form-creator",
    "cowork",
    "word-creator",
    "quotation-agent",
    "accurate-agent"
)

$hooksYaml = @"
hooks:
  Stop:
    - hooks:
        - type: command
          command: $gateCommand
          timeout: 120
"@.Trim()

function Merge-HooksIntoFrontmatter {
    param([string]$Content)

    if ($Content -match '(?ms)^---\s*\r?\n(.*?)\r?\n---\s*\r?\n(.*)$') {
        $front = $Matches[1]
        $body = $Matches[2]
    } else {
        throw "No YAML frontmatter found"
    }

    if ($front -match '(?m)^hooks:\s*$') {
        Write-Host "  [skip] hooks already present"
        return $Content
    }

    $newFront = ($front.TrimEnd() + "`n" + $hooksYaml).TrimEnd()
    return "---`n$newFront`n---`n$body"
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
        $merged = Merge-HooksIntoFrontmatter -Content $raw
        if ($merged -ne $raw) {
            Write-Utf8NoBom -Path $mdPath -Value $merged
            Write-Host "[ok]   $id.md"
        }
    } catch {
        Write-Host "[err]  $id.md — $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host "Done."
