param(
  [string]$Server = 'root@67.216.206.3',
  [int]$SshPort = 39222,
  [string]$RepoRoot = 'D:\Projects\claude-code-best',
  [string]$RemoteRoot = '/opt/aionorg',
  [switch]$MvpSeedOnly,
  [switch]$ExtractOnRemote
)

$ErrorActionPreference = 'Stop'

$SshOpts = @(
  '-o', 'ConnectTimeout=15',
  '-o', 'PreferredAuthentications=password',
  '-o', 'PubkeyAuthentication=no'
)

function Invoke-Ssh {
  param([string[]]$RemoteCmd)
  & ssh -p $SshPort @SshOpts $Server @RemoteCmd
  if ($LASTEXITCODE -ne 0) { throw "ssh failed (exit $LASTEXITCODE)" }
}

function Invoke-Scp {
  param([string]$LocalPath, [string]$RemotePath)
  & scp -P $SshPort @SshOpts $LocalPath "${Server}:${RemotePath}"
  if ($LASTEXITCODE -ne 0) { throw "scp failed (exit $LASTEXITCODE)" }
}

$AionCore = Join-Path $RepoRoot 'AionCore'
$TmpDir = Join-Path $RepoRoot '_tmp'
$Tarball = Join-Path $TmpDir 'aioncore-upload.tgz'
$BootstrapSh = Join-Path $RepoRoot 'scripts\vps-org-aioncore-bootstrap.sh'

if (-not (Test-Path (Join-Path $AionCore 'Cargo.toml'))) {
  Write-Error "AionCore not found: $AionCore"
}
if (-not (Test-Path $BootstrapSh)) {
  Write-Error "Missing server script: $BootstrapSh"
}

$SeedFile = Join-Path $RepoRoot 'data\wanding_business_knowledge.md'
if (-not (Test-Path $SeedFile)) {
  Write-Error "Seed file not found: $SeedFile"
}

New-Item -ItemType Directory -Force -Path $TmpDir | Out-Null

Write-Host ''
Write-Host 'Packaging AionCore source (excluding target/ ~9GB, data-org/)...' -ForegroundColor Cyan
Push-Location $AionCore
try {
  & tar --exclude=target --exclude=data-org -czf $Tarball .
  if ($LASTEXITCODE -ne 0) { throw "tar failed (exit $LASTEXITCODE)" }
} finally {
  Pop-Location
}

$tarMb = [math]::Round((Get-Item $Tarball).Length / 1MB, 1)
Write-Host "  tarball: $Tarball ($tarMb MB)" -ForegroundColor DarkGray

if ($MvpSeedOnly) {
  Write-Host '  seed: only wanding_business_knowledge.md' -ForegroundColor Cyan
} else {
  Write-Host '  seed: full data/ directory' -ForegroundColor Cyan
}

Write-Host ''
Write-Host 'Uploading to VPS org knowledge center...' -ForegroundColor Cyan
Write-Host "  server: $Server (port $SshPort)" -ForegroundColor DarkGray
Write-Host "  remote: $RemoteRoot" -ForegroundColor DarkGray
Write-Host ''

Invoke-Ssh @("mkdir -p $RemoteRoot/data $RemoteRoot/data-org $RemoteRoot/logs")
Invoke-Scp $Tarball "$RemoteRoot/aioncore-upload.tgz"
Invoke-Scp $SeedFile "$RemoteRoot/data/wanding_business_knowledge.md"
Invoke-Scp $BootstrapSh "$RemoteRoot/bootstrap.sh"

if (-not $MvpSeedOnly) {
  $DataDir = Join-Path $RepoRoot 'data'
  Get-ChildItem $DataDir -File | ForEach-Object {
    if ($_.Name -ne 'wanding_business_knowledge.md') {
      Invoke-Scp $_.FullName "$RemoteRoot/data/$($_.Name)"
    }
  }
}

if ($ExtractOnRemote) {
  Write-Host ''
  Write-Host 'Extracting on VPS...' -ForegroundColor Cyan
  Invoke-Ssh @(
    "set -e",
    "cd $RemoteRoot",
    "rm -rf AionCore",
    "mkdir -p AionCore",
    "tar -xzf aioncore-upload.tgz -C AionCore",
    "chmod +x $RemoteRoot/bootstrap.sh"
  )
}

Write-Host ''
Write-Host 'Upload done. Next on VPS (SSH):' -ForegroundColor Green
Write-Host "  ssh -p $SshPort @SshOpts $Server" -ForegroundColor Yellow
if (-not $ExtractOnRemote) {
  Write-Host "  cd $RemoteRoot && rm -rf AionCore && mkdir -p AionCore && tar -xzf aioncore-upload.tgz -C AionCore" -ForegroundColor Yellow
  Write-Host "  chmod +x $RemoteRoot/bootstrap.sh" -ForegroundColor Yellow
}
Write-Host "  $RemoteRoot/bootstrap.sh" -ForegroundColor Yellow
Write-Host ''
Write-Host 'Employee org-server.json:' -ForegroundColor Green
Write-Host '  { "url": "http://67.216.206.3:13401" }' -ForegroundColor Yellow
Write-Host ''
