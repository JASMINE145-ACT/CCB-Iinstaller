# Third-party reference projects (local learning)

Cloned or downloaded **for study only** — not part of CCB-Wanding / AionUI product code. Do not commit vendored trees; re-fetch when updating.

| Project | Source | Local path | Notes |
|---------|--------|------------|-------|
| **Rudder** | [Undertone0809/rudder](https://github.com/Undertone0809/rudder) | [`rudder/`](./rudder/) | Local Agent orchestration: run agents, review work, feedback → reusable skills |
| **Pi** | [earendil-works/pi](https://github.com/earendil-works/pi) | [`pi/`](./pi/) | Agent harness：统一 LLM API、agent loop、TUI、coding-agent CLI（`@earendil-works/pi-*`） |
| **Hermes Agent** | [NousResearch/hermes-agent](https://github.com/NousResearch/hermes-agent) | [`hermes-agent/`](./hermes-agent/) | Nous Research 自进化 agent：学习闭环、skills、gateway（Telegram/Discord/…）、MCP、cron、多终端后端；官网文档 [hermes-agent.nousresearch.com/docs](https://hermes-agent.nousresearch.com/docs/) |

Digest（中文速览，不全文）：[`hermes-agent-overview.md`](./hermes-agent-overview.md)

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

## Refresh Pi

Prefer local proxy if direct GitHub TLS is flaky (`http://127.0.0.1:7897` or your Clash port):

```powershell
$dest = "docs/reference"
$proxy = "http://127.0.0.1:7897"
Remove-Item -Recurse -Force "$dest/pi" -ErrorAction SilentlyContinue
curl.exe -L --proxy $proxy --proxy-insecure --ssl-no-revoke `
  -o "$dest/pi-main.zip" `
  "https://codeload.github.com/earendil-works/pi/zip/refs/heads/main"
Expand-Archive "$dest/pi-main.zip" -DestinationPath $dest -Force
Rename-Item "$dest/pi-main" "$dest/pi"
Remove-Item "$dest/pi-main.zip"
```

## Refresh Hermes Agent

```powershell
$dest = "docs/reference"
$proxy = "http://127.0.0.1:7897"
Remove-Item -Recurse -Force "$dest/hermes-agent" -ErrorAction SilentlyContinue
curl.exe -L --proxy $proxy --proxy-insecure --ssl-no-revoke `
  -o "$dest/hermes-agent-main.zip" `
  "https://codeload.github.com/NousResearch/hermes-agent/zip/refs/heads/main"
Expand-Archive "$dest/hermes-agent-main.zip" -DestinationPath $dest -Force
Rename-Item "$dest/hermes-agent-main" "$dest/hermes-agent"
Remove-Item "$dest/hermes-agent-main.zip"
```
