# CCB Model Settings UI — Catalog & Descriptions

> **Settings → 模型** page when CCB-Wanding authority is active.  
> Read this when changing model cards, catalog entries, descriptions, or Guid/conversation model selectors.

**Related:** task `06-13-ccb-minimax-m3-thinking-models` (archived); runtime model switch → [`../backend/acp-session-flow.md`](../backend/acp-session-flow.md) § MiniMax variants; boundary → [`../integration/aionui-ccb-boundary.md`](../integration/aionui-ccb-boundary.md).

---

## Overview

CCB-Wanding owns **runtime** model ids (`minimax-m3`, `minimax-m3-thinking`) and request-body `thinking` mapping.  
AionUI owns **display catalog**: labels, per-model descriptions, and read-only settings cards.

| Concern | Owner | Storage |
|---------|-------|---------|
| Effective model id | CCB | `%LOCALAPPDATA%\CCB-Wanding\.claude\settings.json` (`env` / `model`) |
| Switchable variant ids + `thinking` body | CCB | `claude-code-B` model resolver + `agent.ts` session models |
| Display catalog (label + description) | AionUI | `ccbModelSettingsShared.ts` + i18n |
| Settings page cards | AionUI | `ModelModalContent.tsx` |
| Guid / conversation dropdown labels | AionUI | `ccbAcpModelInfo.ts` merge over ACP handshake |
| Guid model selector (input bar) | AionUI | `GuidModelSelector.tsx` — must not use `aionrs` provider path when CCB active |

AionUI must **not** inject MiniMax `thinking` or effort-tier controls — display and selection only.

### Delivery status (2026-06-26)

| Surface | Packaged 1.1.2 oracle | `aionui-src` dev source |
|---------|----------------------|---------------------------|
| Catalog + IPC (`ccbModelSettingsShared`, `ccbModelBridge`) | Present | Present |
| **Settings → 模型** cards | MiniMax cards | **Wired** — `CcbModelSettingsPanel.tsx` + `ModelModalContent` CCB branch (`useCcbModelInfo` + `enrichCcbModelCatalogEntries`) |
| Guid model dropdown (`GuidModelSelector`, `ccbAcpModelInfo`) | Works when CCB authority active | Works when `isAuthorityActive` |
| Settings → 助手 | CCB-filtered presets | **Wired** — `fetchAssistantsCatalog.ts` shared with Guid (`useAssistantList` + `useCustomAgentsLoader`) |
| Settings → Agents | CCB WanD agents | **Wired** — `CcbWandingAgentsPanel.tsx` when CCB active (replaces upstream CLI grid) |
| Preset prune on startup | Packaged behavior | **Wired** — `runBackendMigrations.ts` → `pruneBundledAgentsNotInKeepSetWithFlag` in `CCB_MIGRATION_STEPS` |

**Dev smoke:** Full restart via `ccb-installer/scripts/start-dev-full.ps1` (not Ctrl+R). Task: `06-26-aionui-source-level-recovery` → `dev-parity-wiring-2026-06-26.md` § Layer 2. **Uncommitted** in `aionui-src` working tree as of 2026-06-26.

---

## Two model UI surfaces (do not confuse)

| Surface | When | Model list source |
|---------|------|-------------------|
| **设置 → 模型** | Always (CCB install present) | Read-only `CCB_MINIMAX_M3_CATALOG` cards |
| **Guid input bar dropdown** | Before first message | `GuidModelSelector` → CCB merge or ACP handshake |
| **Conversation model dropdown** | In session | `useAcpModelInfo` + CCB merge |

Under **CCB authority**, MiniMax ids come from `ccbModelSettingsShared.ts` / IPC — **not** from AionUI `model.config` providers (`useProvidersQuery`).

---

## Product semantics (MiniMax M3)

| `model_id` | Label | Description (zh-CN) | Upstream | `thinking.type` |
|------------|-------|---------------------|----------|-----------------|
| `minimax-m3` | MiniMax M3 | 常规快速模式，适合报价、快速查询和工具密集型任务。 | `MiniMax-M3` | `disabled` |
| `minimax-m3-thinking` | MiniMax M3 (Thinking) | 深度分析模式，适合报告撰写、复杂推理和长上下文分析。 | `MiniMax-M3` | `adaptive` |

Default for **new** Guid/conversation sessions: `minimax-m3-thinking` (`DEFAULT_CCB_MINIMAX_M3_VARIANT_ID`).

---

## Settings UI layout (2026-06-15)

**Before:** One card titled「CCB-Wanding 大模型」with variant rows inside.

**After:** **One independent card per catalog entry:**

```
┌─ MiniMax M3 ─────────────────────────────┐
│  minimax-m3 · 默认          [ccb-wanding]   │
│  常规快速模式，适合报价…                    │
│  API 地址 / 请求协议                        │
└──────────────────────────────────────────┘

┌─ MiniMax M3 (Thinking) ──────────────────┐
│  minimax-m3-thinking      [ccb-wanding]   │
│  深度分析模式，适合报告…                    │
│  API 地址 / 请求协议                        │
└──────────────────────────────────────────┘
```

- **默认** tag: `ccbModelInfo.model_id` from `settings.json` (not session preference).
- Page is **read-only**; banner uses `settings.ccbModelAuthorityNote`.
- Shared `base_url` / `model_type` shown on each card (same env for all MiniMax variants).

---

## Code map (`D:\Projects\aionui-src`)

| File | Role |
|------|------|
| `common/config/ccbModelSettingsShared.ts` | `CcbModelCatalogEntry`, `CCB_MINIMAX_M3_CATALOG`, `listCcbMiniMaxM3Variants()` — **renderer-safe** |
| `common/config/ccbModelSettings.ts` | Main-only `readCcbModelInfo()` → IPC payload with `available_variants` |
| `process/bridge/ccbModelBridge.ts` | IPC `ccbModelService.getModelInfo` |
| `renderer/utils/ccbModelCatalogDisplay.ts` | `enrichCcbModelCatalogEntries`, `resolveCcbModelDescription` |
| `renderer/components/settings/SettingsModal/contents/ModelModalContent.tsx` | Settings → 模型 cards |
| `renderer/pages/settings/ModeSettings.tsx` | Page wrapper for `ModelModalContent` |
| `common/config/ccbAcpModelInfo.ts` | Merge CCB variants into ACP model dropdown (label only; no description in dropdown) |
| `renderer/hooks/agent/useCcbModelInfo.ts` | SWR over IPC |
| `renderer/pages/guid/components/GuidModelSelector.tsx` | Guid input-bar model menu; `useAcpModelPath` when CCB active |
| `renderer/pages/guid/hooks/useGuidAgentSelection.ts` | Agent key restore; **redirect `aionrs` → `claude`** under CCB |
| `renderer/pages/guid/GuidPage.tsx` | `isGeminiMode` only for `aionrs` (`PROVIDER_BASED_AGENTS`) |

**Import rule:** Renderer imports `ccbModelSettingsShared.ts` only — never `ccbModelSettings.ts` (pulls `node:fs` / `node:os`). See [`coding-rules.md`](./coding-rules.md).

---

## Catalog type

```ts
type CcbModelCatalogEntry = {
  model_id: string
  model_label: string
  description_i18n_key: string  // flat key under settings namespace
}
```

`CCB_MINIMAX_M3_CATALOG` is the single source of truth. `readCcbModelInfo()` attaches it as `available_variants` when `isCcbMiniMaxM3Settings()`.

### Add a future model

1. Add CCB runtime mapping in `claude-code-B` (variant id + request body).
2. Append entry to `CCB_MINIMAX_M3_CATALOG` (or a new catalog array if non-MiniMax).
3. Add flat i18n keys in `locales/zh-CN/settings.json` and `en-US/settings.json`:
   - Prefer `ccbModel<Name>Description` (top-level under `settings` module).
4. Extend `DESCRIPTION_KEY_BY_MODEL_ID` / `DESCRIPTION_DEFAULT_ZH` in `ccbModelCatalogDisplay.ts` if using the same enrich path.
5. Update unit tests: `ccbModelSettings.test.ts`, `ccbModelCatalogDisplay.test.ts`.
6. Deploy CCB dist before expecting session `setModel` to accept the new id.

---

## i18n (flat keys — 2026-06-15 fix)

Nested keys (`settings.ccbModels.minimaxM3.description`) were unreliable at runtime. Use **flat** keys:

| Key | zh-CN |
|-----|-------|
| `settings.ccbModelMinimaxM3Description` | 常规快速模式，适合报价、快速查询和工具密集型任务。 |
| `settings.ccbModelMinimaxM3ThinkingDescription` | 深度分析模式，适合报告撰写、复杂推理和长上下文分析。 |
| `settings.ccbModelGenericDescription` | 由 CCB-Wanding settings.json 配置的模型。 |

**Resolution order** in `resolveCcbModelDescription(modelId, t)`:

1. Flat i18n key via `t(key, { defaultValue: zh fallback })`
2. `defaultValue` ensures text even when bundle cache is stale or IPC omits `description_i18n_key`

`enrichCcbModelCatalogEntries()` merges IPC variants with local `CCB_MINIMAX_M3_CATALOG` so descriptions work even if main process was not restarted.

---

## Verification

```powershell
cd D:\Projects\aionui-src
.\node_modules\.bin\vitest.exe run `
  tests/unit/common-config/ccbModelSettings.test.ts `
  tests/unit/common-config/ccbAcpModelInfo.test.ts `
  tests/unit/renderer/ccbModelCatalogDisplay.test.ts `
  --reporter=dot
```

### Manual smoke

1. Full dev restart (no Ctrl+R): `ccb-installer/scripts/start-aionui-dev.ps1 -Clean`
2. **设置 → 模型** — two independent cards with Chinese descriptions under each title
3. **Guid** — placeholder must **not** start with `aionrs,`; model dropdown shows **MiniMax M3** / **MiniMax M3 (Thinking)** (not「暂无可用模型」)
4. Conversation model dropdown — still **MiniMax M3** / **MiniMax M3 (Thinking)** only (no effort tiers)
5. Switch to Thinking in conversation — no「模型切换失败」toast (requires CCB dist with `buildMiniMaxM3SessionModels`)

---

## Symptom → fix

| Symptom | Cause | Fix |
|---------|-------|-----|
| Guid **暂无可用模型** but Settings has MiniMax cards | Stale `guid.lastSelectedAgent=aionrs` → provider path | See § Guid —「暂无可用模型」; redirect to `claude` |
| Single「CCB-Wanding 大模型」card | Old `ModelModalContent` bundle | Restart dev from `aionui-src`; `-Clean` if needed |
| Two cards but **no description** | Nested i18n keys or missing `description_i18n_key` from IPC | Fixed 2026-06-15: flat keys + `ccbModelCatalogDisplay.ts`; full restart |
| Description shows raw key string | i18n miss, no `defaultValue` | Use `resolveCcbModelDescription`; confirm zh-CN `settings.json` has flat keys |
| Dropdown shows effort tiers | CCB merge not active or old session | `mergeCcbMiniMaxAcpModelInfo`; deploy CCB; new session |
|「模型切换失败」on Thinking | Session `available_models` still effort tiers | Deploy `agent.ts` MiniMax session models — see backend acp-session-flow |

### Guid —「暂无可用模型」

**Symptom:** Guid input bar model menu shows `settings.noAvailableModels`（暂无可用模型）and「+ 添加模型」, placeholder prefix `aionrs, …`.

**Not a missing CCB catalog bug.** Settings → 模型 may still show two MiniMax cards while Guid shows empty — different code paths.

#### Why it happens

```
guid.lastSelectedAgent = "aionrs"  (stale shell config)
        ↓
GuidPage: effectiveAgentType = "aionrs"
        ↓
isGeminiMode = true  (PROVIDER_BASED_AGENTS)
        ↓
GuidModelSelector → useProvidersQuery() legacy provider list
        ↓
(empty — CCB models live in settings.json, not AionUI DB)
        ↓
「暂无可用模型」+「+ 添加模型」
```

Correct path under CCB:

```
selectedAgentKey = "claude"
        ↓
isGeminiMode = false
        ↓
useCcbModelInfo + mergeCcbMiniMaxAcpModelInfo
        ↓
MiniMax M3 / MiniMax M3 (Thinking)
```

#### Fix (2026-06-15)

| Layer | File | Change |
|-------|------|--------|
| Render guard | `GuidModelSelector.tsx` | `useCcbModelInfo(ccbAuthorityActive \|\| !isGeminiMode)`; `useAcpModelPath` runs **before** `isGeminiMode` provider branch |
| Agent selection | `useGuidAgentSelection.ts` | Do not restore saved `aionrs` when CCB active; `useEffect` redirects `aionrs` → `claude`; `setSelectedAgentKey` persists migration |
| Default key | `useGuidAgentSelection.ts` | `defaultAgentKey` prefers `findGuidClaudeCodeAgent` when CCB active |

**Diagnose:**

| Check | Expected (CCB) |
|-------|----------------|
| Placeholder prefix | Not `aionrs,` |
| `configService.get('guid.lastSelectedAgent')` | `claude` (after one restart) |
| Settings → 模型 | Two MiniMax cards with descriptions |
| Guid model dropdown | MiniMax M3 / MiniMax M3 (Thinking) |

**Manual check:** Full restart `ccb-installer/scripts/start-aionui-dev.ps1 -Clean` (no Ctrl+R).

Also listed in [`dev-test-ship.md`](./dev-test-ship.md) symptom table.

---

## Changelog

| Date | Change |
|------|--------|
| 2026-06-13 | CCB MiniMax variants + read-only settings card (`ccbModelSettings`, task `06-13-ccb-minimax-m3-thinking-models`) |
| 2026-06-14 | ACP merge + session switch fix; effort tier replacement in dropdown |
| 2026-06-15 | Independent per-model cards; `CCB_MINIMAX_M3_CATALOG`; flat i18n + `ccbModelCatalogDisplay.ts` description fix |
| 2026-06-15 | Guid empty model menu fix: CCB authority bypasses `aionrs` provider path; migrate `guid.lastSelectedAgent` to `claude` |
| 2026-06-26 | **Layer 2 dev wiring:** `CcbModelSettingsPanel` + `ModelModalContent` CCB branch; `fetchAssistantsCatalog` for Settings 助手; prune via `runBackendMigrations` |
