# CCB-Wanding Command Capability Manifest

## Goal

实现 CCB-Wanding 权威 command/capability manifest，并让 AionUI 的 `/` 面板以 CCB-Wanding manifest 为主。

## Requirements

- CCB-Wanding 生成完整 command capability manifest。
- `prompt` / `local` 命令标记为 `ready`。
- `local-jsx` / TUI / renderer-required 命令不再静默隐藏，标记为 `needs_mapping` 或 `unsupported`。
- ACP 发送 capability manifest，保留旧 `available_commands_update` 兼容路径。
- AionUI `/` 面板展示 CCB ready + unsupported/needs_mapping 能力。
- AionUI shell-only 命令必须标记为 `aionui-shell`，不能覆盖 CCB 同名命令。

## Acceptance Criteria

- [x] 后端 manifest 覆盖 CCB-Wanding command registry 的用户可见命令。
- [x] ACP test 覆盖 capability event。
- [x] AionUI unit test 覆盖 CCB 优先、unsupported 可见不可执行、shell-only 不覆盖。
- [x] 新会话 `/` 展示 CCB command/capability 状态。
- [x] `/env` 或 `/version` 后端执行正常。
- [x] quotation MCP 主流程仍正常。

## Implementation Notes — 2026-06-13 (Phase 2, DONE)

- `capabilities.ts` + `agent.ts` `sendAvailableCommandsUpdate()` → `buildAvailableCommandsUpdatePayload(session.commands)`
- Exposure rule: `prompt`/`local` → `ready`; `local-jsx` → `needs_mapping`; hidden → `status: hidden`
- AionUI `acpMapping.ts` maps capability status; shell commands (`source: aionui-shell`) supplement only; non-ready items visible but blocked in menu/send
- On name conflict: CCB backend command wins

**Verification (2026-06-13):**

- `bun test src/services/acp/__tests__/capabilities.test.ts` + `agent.test.ts` → 70 pass
- AionUI `slashCommandsMerge.test.ts` → 4 pass; `bunx tsc --noEmit` → 0 errors
- `bun run build` → deploy → `sync-aionui-ccb-route-b.ps1` (5 targets)
- Deployed dist contains `needs_mapping` + `buildAvailableCommandsUpdatePayload` (verified in chunk)
- `node ccb-installer/test-native-acp-agent.mjs` → `available_commands_update` received, `stopReason=end_turn`

## Out of Scope

- 不处理 skills/MCP/assistant template 配置归属；这些由兄弟任务处理。
