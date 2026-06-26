# Sync org wanding_business_knowledge to local CCB-Wanding shadow file (manual / CI).
# AionUI also runs this automatically after org login linkage (aionui-src orgKnowledgeShadowSync).
#
# Usage:
#   .\scripts\org-phase0\sync-org-knowledge-shadow.ps1 -Dev -Username yjc -Password '***'
#   $env:WANDING_BUSINESS_KNOWLEDGE_PATH = 'D:\CCB-Wanding\vendor\wanding\data\wanding_business_knowledge.md'

param(
  [switch]$Dev,
  [string]$OrgUrl = 'http://67.216.206.3:13401',
  [Parameter(Mandatory = $true)]
  [string]$Username,
  [Parameter(Mandatory = $true)]
  [string]$Password,
  [string]$ShadowPath = ''
)

$ErrorActionPreference = 'Stop'
$base = $OrgUrl.TrimEnd('/')

Write-Host "==> Org login $base" -ForegroundColor Cyan
$loginBody = @{ username = $Username; password = $Password } | ConvertTo-Json -Compress
$login = Invoke-RestMethod -Method POST -Uri "$base/login" -ContentType 'application/json' -Body $loginBody
if (-not $login.success -or -not $login.token) {
  throw "Org login failed: $($login.message)"
}
$token = $login.token
Write-Host "[OK] org token len=$($token.Length)" -ForegroundColor Green

Write-Host "==> Fetch wanding_business_knowledge" -ForegroundColor Cyan
$headers = @{ Authorization = "Bearer $token"; Accept = 'application/json' }
$raw = Invoke-RestMethod -Method GET -Uri "$base/api/org-knowledge/wanding_business_knowledge" -Headers $headers
$doc = if ($raw.data) { $raw.data } else { $raw }
if (-not $doc.content) {
  throw 'Org doc has no content'
}
Write-Host "[OK] org version=$($doc.version) content len=$($doc.content.Length)" -ForegroundColor Green

if (-not $ShadowPath) {
  if ($env:WANDING_BUSINESS_KNOWLEDGE_PATH) {
    $ShadowPath = $env:WANDING_BUSINESS_KNOWLEDGE_PATH
  } elseif ($Dev -and (Test-Path 'D:\Projects\claude-code-best\ccb-installer\vendor\wanding\data\wanding_business_knowledge.md')) {
    $ShadowPath = 'D:\Projects\claude-code-best\ccb-installer\vendor\wanding\data\wanding_business_knowledge.md'
  } elseif (Test-Path 'D:\CCB-Wanding\vendor\wanding\data\wanding_business_knowledge.md') {
    $ShadowPath = 'D:\CCB-Wanding\vendor\wanding\data\wanding_business_knowledge.md'
  } elseif (Test-Path 'D:\Projects\claude-code-best\ccb-installer\vendor\wanding\data\wanding_business_knowledge.md') {
    $ShadowPath = 'D:\Projects\claude-code-best\ccb-installer\vendor\wanding\data\wanding_business_knowledge.md'
  } else {
    throw 'Set -ShadowPath or WANDING_BUSINESS_KNOWLEDGE_PATH'
  }
}

$dir = Split-Path -Parent $ShadowPath
if (-not (Test-Path $dir)) {
  New-Item -ItemType Directory -Force -Path $dir | Out-Null
}

$tmp = "$ShadowPath.org-sync.tmp"
[System.IO.File]::WriteAllText($tmp, $doc.content.Trim(), (New-Object System.Text.UTF8Encoding $false))
Move-Item -Force $tmp $ShadowPath

$meta = @{
  slug       = 'wanding_business_knowledge'
  version    = $doc.version
  synced_at  = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
} | ConvertTo-Json -Compress
$metaTmp = "$ShadowPath.org-meta.json.org-sync.tmp"
[System.IO.File]::WriteAllText($metaTmp, $meta, (New-Object System.Text.UTF8Encoding $false))
Move-Item -Force $metaTmp "$ShadowPath.org-meta.json"

Write-Host "[OK] shadow written: $ShadowPath" -ForegroundColor Green
Write-Host "     Agent Read this path should match org center content after re-login or manual sync." -ForegroundColor DarkGray
