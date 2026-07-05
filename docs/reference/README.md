# Third-party reference projects (local learning)

Cloned or downloaded **for study only** — not part of CCB-Wanding / AionUI product code. Do not commit vendored trees; re-fetch when updating.

| Project | Source | Local path | Notes |
|---------|--------|------------|-------|
| **Rudder** | [Undertone0809/rudder](https://github.com/Undertone0809/rudder) | [`rudder/`](./rudder/) | Local Agent orchestration: run agents, review work, feedback → reusable skills |

## Refresh Rudder

```powershell
# From repo root — removes and re-downloads main branch zip
$dest = "docs/reference"
Remove-Item -Recurse -Force "$dest/rudder" -ErrorAction SilentlyContinue
curl.exe -L -o "$dest/rudder-main.zip" "https://github.com/Undertone0809/rudder/archive/refs/heads/main.zip"
Expand-Archive "$dest/rudder-main.zip" -DestinationPath $dest -Force
Rename-Item "$dest/rudder-main" "$dest/rudder"
Remove-Item "$dest/rudder-main.zip"
```

Or with git (if network stable):

```powershell
git clone --depth 1 https://github.com/Undertone0809/rudder.git docs/reference/rudder
```
