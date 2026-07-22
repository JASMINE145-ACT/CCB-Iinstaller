$p = 'D:\Projects\claude-code-best\AionCore\target\release\aioncore.exe'
Write-Output ("exists=" + (Test-Path -LiteralPath $p))
if (Test-Path -LiteralPath $p) {
  Write-Output ("length=" + (Get-Item -LiteralPath $p).Length)
  Write-Output ("mtime=" + (Get-Item -LiteralPath $p).LastWriteTime)
}
