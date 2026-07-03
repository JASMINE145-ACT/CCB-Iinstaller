@echo off
set ANTHROPIC_BASE_URL=https://api.minimaxi.com/anthropic
set ANTHROPIC_DEFAULT_SONNET_MODEL=minimax-m3
set ANTHROPIC_DEFAULT_OPUS_MODEL=minimax-m3
set ANTHROPIC_DEFAULT_HAIKU_MODEL=minimax-m3
set NODE_ENV=development
bun run dist/cli.js web --port=3001
