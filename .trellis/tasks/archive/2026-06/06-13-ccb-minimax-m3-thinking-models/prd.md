# CCB MiniMax-M3 Thinking Model Variants

## Goal

Expose MiniMax-M3 as two selectable CCB-Wanding model variants:

```text
minimax-m3          -> thinking: { type: "disabled" }
minimax-m3-thinking -> thinking: { type: "adaptive" }
```

The user can switch between a fast/default MiniMax-M3 mode and a thinking-enabled MiniMax-M3 mode from AionUI/CCB model selection.

## Background

MiniMax-M3 does not provide true low/high thinking tiers. It supports the Anthropic-compatible `thinking` object:

```json
{
  "thinking": {
    "type": "disabled"
  }
}
```

and:

```json
{
  "thinking": {
    "type": "adaptive"
  }
}
```

If `thinking` is omitted, MiniMax's Anthropic-compatible API defaults to disabled. For clarity and debuggability, CCB-Wanding should send the field explicitly for MiniMax-M3 variants.

## Product Semantics

`minimax-m3`:

- display/selectable model id for normal fast use
- actual upstream model remains `MiniMax-M3`
- request body includes `thinking: { type: "disabled" }`
- recommended default for quotation, quick lookup, tool-heavy flows

`minimax-m3-thinking`:

- display/selectable model id for deeper analysis
- actual upstream model remains `MiniMax-M3`
- request body includes `thinking: { type: "adaptive" }`
- recommended for report assistant, analysis assistant, long reasoning

Do not expose `low`, `medium`, or `high` as actual MiniMax-M3 reasoning tiers. If a legacy alias is needed later, `minimax-m3-low` may alias to `minimax-m3`, but it must be documented as "thinking disabled", not a real low tier.

## Ownership Boundary

CCB-Wanding owns the real request body mapping.

AionUI may:

- display `minimax-m3`
- display `minimax-m3-thinking`
- store/select the visible model id

AionUI must not:

- inject MiniMax request-body fields directly
- send `reasoningEffort`, `reasoning_effort`, `reasoning_split`, or `service_tier` as thinking controls for MiniMax-M3

## Requirements

- Add a CCB model mapping for `minimax-m3` to upstream `MiniMax-M3` with `thinking.disabled`.
- Add a CCB model mapping for `minimax-m3-thinking` to upstream `MiniMax-M3` with `thinking.adaptive`.
- Ensure selected visible model id survives AionUI model selection and CCB ACP `setSessionModel`.
- Ensure CCB request construction sends actual upstream model as `MiniMax-M3`, not `minimax-m3-thinking`, unless the MiniMax endpoint explicitly accepts the alias.
- Ensure non-MiniMax models are unaffected.
- Ensure assistant profiles can use either id as their default model.

## Non-Goals

- Do not add fake MiniMax-M3 low/high thinking depth.
- Do not implement `reasoningEffort` for MiniMax-M3.
- Do not change MCP/tool registration.
- Do not change global MiniMax auth/base URL config.

## Implementation Notes

Likely code areas to inspect:

- CCB model catalog / alias resolution under `D:\claude-code-B\src\utils\model`.
- CCB Anthropic-compatible request body construction under `D:\claude-code-B\src\services\api`.
- AionUI CCB model read-only display/config under `D:\Projects\aionui-src\packages\desktop\src\common\config\ccbModelSettings.ts`.
- AionUI CCB model hook/display under `D:\Projects\aionui-src\packages\desktop\src\renderer\hooks\agent\useCcbModelInfo.ts`.

Suggested internal helper shape:

```ts
type MiniMaxM3ThinkingMode = "disabled" | "adaptive";

function resolveMiniMaxM3Variant(modelId: string):
  | { upstreamModel: "MiniMax-M3"; thinking: { type: MiniMaxM3ThinkingMode } }
  | null
```

## Acceptance Criteria

- [ ] AionUI/CCB can display/select `minimax-m3`.
- [ ] AionUI/CCB can display/select `minimax-m3-thinking`.
- [ ] Selecting `minimax-m3` sends MiniMax request body with `model: "MiniMax-M3"` and `thinking: { type: "disabled" }`.
- [ ] Selecting `minimax-m3-thinking` sends MiniMax request body with `model: "MiniMax-M3"` and `thinking: { type: "adaptive" }`.
- [ ] No MiniMax-M3 request uses `reasoningEffort`, `reasoning_effort`, `reasoning_split`, or `service_tier` as thinking controls.
- [ ] Existing model tests pass.
- [ ] CCB ACP smoke still initializes and can call quotation MCP.
- [ ] Assistant profile default model can be set to `minimax-m3-thinking`.

## Verification Plan

Backend:

- Focused unit tests for MiniMax-M3 variant resolution/request body.
- `bunx tsc --noEmit --pretty false`.
- Existing ACP/session model tests.

AionUI:

- Focused test for model display/config if the visible model list is changed.
- `bunx tsc --noEmit --pretty false`.

Manual smoke:

1. Set CCB model to `minimax-m3`.
2. Start CCB session and confirm request body includes `thinking.disabled`.
3. Set CCB model to `minimax-m3-thinking`.
4. Start CCB session and confirm request body includes `thinking.adaptive`.
5. Run quotation smoke to confirm tools still work.

## Implementation Notes — 2026-06-13 (initial)

Backend + AionUI first pass: variant resolver, `paramsFromContext`, `modelOptions.appendMiniMaxM3Variants`, `ccbModelSettings.available_variants`, settings page + initial GuidModelSelector hook-up.

Deploy: `claude-code-B` build → `deploy-claude-code-b-to-wanding.ps1` → `sync-aionui-ccb-route-b.ps1` → restart AionUI.

## Implementation Notes — 2026-06-14 (UI merge + white screen)

### Problem observed

After deploy, Guid/conversation model dropdown still showed ACP **effort tiers** (`Default (recommended) (default/low/…)`), not `minimax-m3` / `minimax-m3-thinking`. Follow-up dev restart caused **white screen**.

### Root cause

1. `handshake.available_models` is effort-tier expansion for the resolved model, not CCB variant ids.
2. `useGuidAgentSelection.ts` referenced `selectedAgent` before declaration → runtime `ReferenceError` → blank renderer.

### Fix

**AionUI (`D:\Projects\aionui-src`):**

| File | Change |
|------|--------|
| `common/config/ccbAcpModelInfo.ts` | `mergeCcbMiniMaxAcpModelInfo`, `normalizeCcbMiniMaxModelId` |
| `useGuidAgentSelection.ts` | Merge CCB variants into `currentAcpCachedModelInfo`; use `selectedAgentKey` for `useCcbModelInfo` |
| `GuidModelSelector.tsx` | `effectiveAcpModelInfo` from merge |
| `useAcpModelInfo.ts` | Merge for conversation model dropdown |
| `createConversationParams.ts` | Normalize legacy `preferredModelId` / handshake ids |

**CCB (`D:\claude-code-B`):**

- `minimaxM3.ts` — `shouldExposeMiniMaxM3Variants()` also reads `settings.json` env via `getSettings_DEPRECATED()`.

### Verification

- `ccbAcpModelInfo.test.ts` → 4 pass
- `ccbModelSettings.test.ts` → 4 pass
- `minimaxM3.test.ts` → 4 pass (empty-settings fixture for variant exposure)
- code-review PASS

### Manual smoke (remaining)

1. Guid + conversation dropdown shows exactly two labels: **MiniMax M3**, **MiniMax M3 (Thinking)**.
2. Switch to thinking variant → send message → confirm upstream body uses `thinking.adaptive`.
3. Quotation MCP smoke unchanged.

## Implementation Notes — 2026-06-14 (model switch failure)

### Problem observed

Conversation model dropdown shows CCB variants (UI merge OK), but selecting **MiniMax M3 (Thinking)** toast **「模型切换失败」** (`agent.model.switchFailed`).

### Root cause

UI merge (`ccbAcpModelInfo.ts`) is display-only. ACP session `available_models` / config option `model.options` still came from `getModelOptions()` effort tiers (`minimax-m3/default`, …). aioncore validates `PUT /api/conversations/:id/model` against the session list — `minimax-m3-thinking` was not a valid option.

### Fix (CCB `D:\claude-code-B\src\services\acp\agent.ts`)

| Area | Change |
|------|--------|
| `createSession` | When `shouldExposeMiniMaxM3Variants()`, build `availableModels` from `getMiniMaxM3ModelOptions()` (2 ids), not effort tiers |
| `unstable_setSessionModel` | On MiniMax variant switch, call `applyMiniMaxM3SessionModels` to refresh session list + configOptions |
| `setSessionConfigOption` (model) | Same refresh path |
| Helpers | `normalizeMiniMaxM3SessionModelId`, `buildMiniMaxM3SessionModels`, `applyMiniMaxM3SessionModels` |

Legacy sessions with effort-tier lists are upgraded on first switch to a MiniMax variant id.

### Verification

- `bun test src/services/acp/__tests__/agent.test.ts` → 71 pass (incl. legacy effort-tier + setSessionConfigOption)
- `bun test src/utils/model/__tests__/minimaxM3.test.ts` → 4 pass
- code-review PASS
- Deploy: `deploy-claude-code-b-to-wanding.ps1 -Backup` → dist chunk contains `buildMiniMaxM3SessionModels`

### Manual smoke (remaining)

1. **New or existing** CCB session → switch to **MiniMax M3 (Thinking)** → no「模型切换失败」toast.
2. Send a message → confirm request body `thinking.adaptive`.

See also: `workspace/JASMINE145-ACT/journal-1.md` § 2026-06-14 模型切换.

## Implementation Notes — 2026-06-14 (ensure preferred model + renderer white screen)

### Problem observed

1. Guid 选 **MiniMax M3 (Thinking)** 进会话后，backend session 仍为 `minimax-m3`；日志 `auto_apply_preferred_model_skipped`（误判已匹配）。
2. 引入 `ensureCcbSessionPreferredModel` 后 dev 重启 → **Electron 白屏**；终端 esbuild：`No matching export in ipcBridge.ts for import "ipcBridge"`。

### Root cause

1. `preserveCcbUserModelSelection()` 把 session 显示 id 对齐到 UI 偏好，`auto_apply` 用合并后的 id 比较 → 跳过 `setModel`。
2. `ensureCcbSessionPreferredModel.ts` 误写 `import { ipcBridge } from '@/common/adapter/ipcBridge'`；`useAcpInitialMessage.ts` 混用 namespace + named 从 adapter 路径 import → renderer bundle 构建失败。

### Fix (AionUI `D:\Projects\aionui-src`)

| File | Change |
|------|--------|
| `common/config/ccbAcpModelInfo.ts` | `resolveBackendSessionModelId()` — raw backend id |
| `common/config/ensureCcbSessionPreferredModel.ts` | **NEW** — GET/compare/setModel；import `acpConversation` only |
| `renderer/hooks/agent/useAcpModelInfo.ts` | auto-apply 改调 `ensureCcbSessionPreferredModel` |
| `renderer/pages/conversation/platforms/acp/useAcpInitialMessage.ts` | warmup 后 ensure；`ipcBridge` from `@/common` |
| `renderer/pages/conversation/platforms/acp/AcpSendBox.tsx` | send 前 ensure；补全 `useCallback` deps |
| Tests | `ensureCcbSessionPreferredModel.test.ts` + 相关用例更新 |

### Verification

- Vitest（ensure + ccbAcpModelInfo + useAcpModelInfo DOM）→ 23 pass
- Dev restart via `start-aionui-dev.ps1` → 无 esbuild ERROR；`Renderer did-finish-load` + API 200
- **Manual UI load:** user confirmed 2026-06-14 — exe 窗口正常显示（白屏已消除）

### Manual smoke (remaining — Thinking block)

1. **新建**会话，Guid 选 **MiniMax M3 (Thinking)** → 日志 `auto_apply_preferred_model_confirmed` 或 `ensure_preferred_model status: applied`
2. 发消息 → UI 出现 Brain / Thinking 折叠块（非仅 View Steps）；aioncore 有 `agent_thought_chunk`
3. Quotation MCP smoke unchanged

See also: `spec/backend/acp-session-flow.md` (ensure preferred model); `spec/frontend/dev-test-ship.md` §8 Wave 3.
