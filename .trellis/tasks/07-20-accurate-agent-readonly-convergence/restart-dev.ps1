$ErrorActionPreference = "Stop"
Set-Location "D:\Projects\claude-code-best"
& "D:\Projects\claude-code-best\ccb-installer\scripts\start-dev-full.ps1" -SkipBootstrap -SkipVendorSync -BuildAioncore:$false
