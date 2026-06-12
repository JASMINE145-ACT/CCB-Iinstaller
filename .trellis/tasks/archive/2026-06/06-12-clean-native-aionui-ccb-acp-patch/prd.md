# Clean Native AionUI CCB ACP Patch Source

## Goal

Stabilize the repository source for Route B2:

```text
Native AionUI ACP -> native CCB-Wanding ACP shim
```

This task only edits files inside this repository. It must not change official Claude Code global configuration, Windows user environment variables, `C:\Users\m1774\.claude`, `D:\CCB-Wanding`, or installed AionUI runtime slots.

## Requirements

- Keep the official Claude Code boundary explicit:
  - Official Claude Code uses `C:\Users\m1774\.claude`.
  - CCB-Wanding/AionUI Route B2 uses `%LOCALAPPDATA%\CCB-Wanding\.claude` at process startup.
  - Do not require user-level `ANTHROPIC_*` or `CLAUDE_CONFIG_DIR`.
- Repair mojibake in the repository Route B2 source and documentation.
- Keep the shim compatible with AionUI ACP methods already proven:
  - `initialize`
  - `authenticate`
  - `session/new`
  - `session/set_mode`
  - `session/prompt`
  - `session/cancel`
- Preserve the working quotation shortcut flow:
  - detect Chinese price/quotation prompts
  - call `quotation.match_quotation`
  - ask for clarification when multiple candidates exist
  - handle follow-up choices such as `第一个`, `第二个`, `排水`, `PPR`, `给水`
- Improve maintainability without adding a broad generic tool loop in this task.

## Non-Goals

- Do not sync patches into `D:\CCB-Wanding` or AionUI installation directories.
- Do not modify global Claude Code config or user environment variables.
- Do not implement `accurate` conversation integration yet.
- Do not replace the shortcut bridge with a full model-driven tool loop yet.

## Verification

- `node --check ccb-installer/patches/native-ccb-wanding-acp/ccb-native-acp-agent.js`
- Local source inspection confirms Chinese strings are readable and template literals interpolate correctly.
- Canonical spec documents current progress and remaining issues in readable UTF-8.
