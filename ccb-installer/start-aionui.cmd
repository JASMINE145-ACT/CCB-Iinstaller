@echo off
chcp 65001 > NUL
set ANTHROPIC_BASE_URL=https://api.minimaxi.com/anthropic
set ANTHROPIC_DEFAULT_SONNET_MODEL=minimax-m3
set ANTHROPIC_DEFAULT_OPUS_MODEL=minimax-m3
set ANTHROPIC_DEFAULT_HAIKU_MODEL=minimax-m3
set CLAUDE_CONFIG_DIR=%LOCALAPPDATA%\CCB-Wanding\.claude
set CCB_STAGE=minimax
set NODE_ENV=production
cd /d "%~dp0"
bun run dist/cli.js web --port=3001
