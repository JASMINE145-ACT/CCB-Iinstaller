# AionUI Legacy Config Migration To CCB-Wanding

## Goal

盘点 AionUI 当前本地配置，并把 runtime-authoritative 的 skills / MCP / agent / assistant template 配置迁移到 CCB-Wanding。AionUI 只保留壳子体验配置。

## Configuration Ownership

CCB-Wanding owns:

- skills
- MCP servers/tools
- agents/subagents
- assistant templates that affect session behavior
- slash commands/capabilities
- permissions/runtime policy that affects backend execution

AionUI owns:

- theme
- language
- font/zoom/window layout
- desktop notification preferences
- file picker / drag upload shell behavior
- UI cache that can be rebuilt from CCB-Wanding

## Requirements

- 建立 AionUI config inventory 表：
  - current key/path
  - current owner
  - target owner
  - migration action: migrate / read-only legacy / delete / keep-shell
  - CCB-Wanding target path/API
- 增加一次性迁移逻辑或显式导入向导。
- 迁移后，新会话 runtime 行为必须以 CCB-Wanding 配置为准。
- AionUI legacy keys 不再参与 backend session 能力决策。
- 对无法自动迁移的配置，显示明确提示和导出路径。

## Acceptance Criteria

- [x] 完成 AionUI config inventory。
- [x] skills/MCP/assistant template 的 runtime-authoritative keys 有迁移策略。
- [x] AionUI 壳子配置明确保留。
- [x] 新会话不再从 AionUI legacy config 决定 CCB-Wanding 能力。
- [x] 有回滚/备份策略。
- [x] 迁移状态写入 Trellis spec。
- [x] Crazy-Version docs updated.

## Review Fixes (2026-06-13)

- Reserved and existing MCP names are normalized before merge checks, so CCB-owned MCP names cannot be duplicated by case variants.
- Skill folder names are sanitized before copying into CCB-Wanding `.claude/skills`.
- Agent switch flow resolves full agent metadata before CCB detection.
- Preset assistant creation strips AionUI-local skill overrides for CCB-Wanding agents.
- Main export path is covered with a temp-directory test for `settings.json` backup, report writing, reserved MCP protection, imported MCP merge, and sanitized skill copy.
- Verification:
  - `D:\Projects\aionui-src\node_modules\.bin\vitest.exe run tests/unit/common-config/ccbConfigMigration.test.ts --reporter=dot` — 10 tests passed.
  - `bunx tsc --noEmit --pretty false` — passed.

## Out of Scope

- 不迁移纯 UI 偏好设置。
- 不删除用户数据，除非有明确备份和确认。
