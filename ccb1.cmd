@echo off
REM Isolated dev instance — use with profile function `ccb1` or double-click from Explorer.
set "CLAUDE_CONFIG_DIR=%USERPROFILE%\.claude-ccb1"
set "CLAUDE_DATA_DIR="
set "CLAUDE_COWORK_MEMORY_PATH_OVERRIDE="
set "CLAUDE_CODE_REMOTE_MEMORY_DIR="
set "CLAUDE_CODE_REMOTE="
cd /d D:\Projects\claude-code-best
bun run dev
