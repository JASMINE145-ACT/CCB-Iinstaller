# Dev / Test / Ship

> How to run, test, and package AionUI exe. The symptom → diagnosis table is here.

**Principle (dev-first):** Iterate renderer/UI fixes with `bun run dev` (save → HMR). Run `bun run dist:win` and copy into `AppData\Roaming\AionUi\` **only after** dev verification passes — not on every UI tweak.

---

## 1. Dev mode (hot reload, no packaging)

### One-time prep

```powershell
cd D:\Projects\aionui-src
bun install
```

If `bun run dev` fails with **`Error: Electron uninstall`**, the Electron binary was not downloaded. Re-run the postinstall download (mirror helps on slow networks):

```powershell
cd D:\Projects\aionui-src
$env:ELECTRON_MIRROR = "https://npmmirror.com/mirrors/electron/"
node "node_modules\.bun\electron@*\node_modules\electron\install.js"
# Or: bun install again after setting ELECTRON_MIRROR
```

> **Don't use `bun run webui` for desktop chat UI work.** Webui uses `packages/web-host` — different entry path than `packages/desktop` renderer components (`chatLib.ts`, `hooks.ts`, `MessageThinking.tsx`, `MessageAcpPermission.tsx`, etc.).

### Daily loop

```powershell
# 1. aioncore must be on PATH (dev mode cannot find bundled resources)
$env:PATH += ";D:\Projects\claude-code-best\AionUi\resources\bundled-aioncore\win32-x64"

# 2. Start dev
cd D:\Projects\aionui-src
bun run dev
# Equivalent: electron-vite dev --config packages/desktop/electron.vite.config.ts
# Renderer HMR: http://localhost:5173/ — pure renderer edits usually need no restart
```

| | `bun run dev` | `bun run dist:win` |
|---|---|---|
| Use for | UI/renderer iteration | Final deploy to Roaming slot |
| Hot reload | Yes (renderer) | No — full build ~3–5 min |
| Data dir | Dev profile (e.g. `~/.aionui-dev`) | `AppData\Roaming\AionUi\` |
| UI scenario checks | Sufficient during dev | Re-run once before ship |

Dev and production exe **data directories differ** — sessions and agent config may not match; that is expected.

**When to restart dev:** main process, preload, or native deps changed → Ctrl+C and `bun run dev` again. Pure `renderer/` / `common/` saves usually HMR without restart.

---

## 2. Which backend does dev mode actually use?

**This is the most common source of "I changed it but nothing happened" reports.**

1. Dev mode's aioncore resolution: falls through to `PATH` (no `resourcesPath` in dev)
2. The aioncore on `PATH` is the one in `D:\Projects\claude-code-best\AionUi\resources\bundled-aioncore\win32-x64\aioncore.exe`
3. That aioncore spawns the ACP slot via a hardcoded relative path inside `managed-resources\acp\claude-agent-acp\<ver>\…\dist\index.js`
4. **That `index.js` is what route-b patches.** If the patch is stale, dev mode runs vanilla Claude Code ACP — not CCB-Wanding.

**Therefore:**

- If you change **only desktop source** → just `bun run dev` is enough.
- If you change **route-b patch** OR **CCB-Wanding backend** → you must re-sync and restart (see `../integration/route-b-sync.md`).
- If you change **aioncore-side env injection** → restart aioncore (kill all `aioncore` processes; dev mode re-spawns).

---

## 3. Tests

| Command | What it runs |
|---------|--------------|
| `bun test` (root) | All unit tests (vitest) |
| `bun run test` (root) | Same — vitest run |
| `bun test packages/desktop/src/process/backend/binaryResolver.test.ts` | Single file |
| `bun run test:integration` | Integration suite |
| `bun run test:contract` | Contract tests (passes when no tests exist) |
| `bun run test:e2e` | Playwright E2E |
| `bun run lint` | oxlint (root) |
| `bun run lint:fix` | oxlint --fix |
| `bun run format` | oxfmt |
| `bun run format:check` | oxfmt --check (CI gate) |

---

## 4. Symptom → Diagnosis (when "I changed it but nothing happens")

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| I changed desktop code, dev window doesn't update | Vite HMR not picked up | Touch the file to force reload, or restart dev |
| I changed route-b, dev still shows old behavior | Forgot to run `sync-aionui-ccb-route-b.ps1` | See `../integration/route-b-sync.md` |
| Dev mode shows "Claude Code" not "CCB-Wanding" | The `index.js` at the active ACP slot is not route-b-patched | Run `../integration/route-b-sync.md` sync, then restart aioncore |
| I see MCP tools but quotation/accurate missing | CCB-Wanding rebuild not synced, or MCP env stale | Rebuild `D:\CCB-Wanding\dist\` then run sync |
| `mcp__quotation__*` Tool not found in AionUI (shell/officecli fallback) | AionUI injects `guide_mcp`; backend must **merge** settings MCP + params (not either/or). Stale aioncore or old session | Deploy `agent.ts` fix → sync route-b → kill all aioncore → **new conversation**. See [`../backend/acp-session-flow.md`](../backend/acp-session-flow.md) |
| Two windows appear, one is vanilla Claude Code | Mixed sync state — some locations patched, others not | Sync all 4 targets; verify version |
| I edited `packages/web-host/src/` but web variant unchanged | Source edit alone doesn't propagate | Rebuild web-host and deploy to `D:\aionui-web\aionui-web\` |
| `bun run dev` can't find aioncore | PATH not set for this shell | Re-export `$env:PATH` per §1 |
| `bun run dev` → `Error: Electron uninstall` | Electron binary never downloaded (bun postinstall skip / network) | Set `ELECTRON_MIRROR`, run `electron/install.js` — see §1 |
| Dev shows **「AionUi 安装不完整」** / AionCore cannot start | Dev has no `resourcesPath`; aioncore not on PATH | Prepend bundled dir to PATH **before** `bun run dev` (§1) — not a reinstall issue |
| Dev window opens but `fetch failed` / no backend | aioncore or web-host backend not running | Set PATH per §1; sync route-b if testing CCB-Wanding; restart dev |
| Validated in dev but prod exe differs | Shipped old exe or Roaming slot not updated | `dist:win` then deploy; re-run three scenarios on installed exe |
| `/` menu only shows `/btw` `/copy` `/open` (no CCB commands) | Slash list fetched before `available_commands_update`, or stale session after dev restart | Restart dev → **new CCB conversation** → wait warmup (~10–15s) → type `/`. See `chat-acp-flow.md` § Slash Command Flow |
| `USER_LLM_PROVIDER_ENDPOINT_NOT_FOUND` after dev restart / error recovery | Stale ACP session id (`Session … not found` in aioncore log); UI mislabels as provider 404 | **New conversation** (do not reuse old id); full dev restart if needed |
| `bunx tsc --noEmit` fails on `MessageAcpPermission.tsx` | AskUserQuestion UI types out of sync with `AcpPermissionOption` | Fix per `chat-acp-flow.md` §3.5b; re-run tsc before ship |
| **Electron dev 白屏**（窗口空白，无 UI） | Renderer 打包了 `node:fs` 等 Node-only 模块 → Vite bundle 崩溃；或 Vite/Electron 缓存仍是旧 bundle | 见 **§8 White screen playbook**；优先用 `ccb-installer/scripts/start-aionui-dev.ps1`（已含杀进程 + 清缓存） |
| **设置 → 能力扩展** 一点就白屏 | 懒加载 `SkillsHubSettings` 曾直接 import `ccbSkills.ts`（含 fs） | 已改 IPC `ccbSkillsService`；若复现，查 renderer 是否又 direct-import 了 `ccbSkills.ts` |
| 多题 AskUserQuestion 答完 Q1 后一直 spinner | 点了 Cancel 但前端误设 `isAwaitingNextQuestion`；或 backend 未发下一题 permission | Cancel 应显示「已取消」；确认路径 30s 后显示超时警告。见 `chat-acp-flow.md` §3.5b |
| multiSelect 选了多项但 backend 只收到一项 | Backend dist 未部署 `auqm:` 解析 | Rebuild `claude-code-B` → deploy → route-b sync |
| 侧栏仍显示 WanD/AionUi 而非 minimax-m3 | `ccbModelBridge` 未加载（main process 未重启） | `ccb-installer/scripts/start-aionui-dev.ps1` 整 app 重启 |
| Guid 模型下拉全是 **Default (recommended) (default/low/…)** | ACP handshake 返回 effort tier，非 MiniMax 变体 | **2026-06-14 已修**：`mergeCcbMiniMaxAcpModelInfo` 用 CCB `available_variants` 替换列表 → 仅 **MiniMax M3** / **MiniMax M3 (Thinking)**；deploy + `start-aionui-dev.ps1` 重启 |
| **Guid 白屏**（`useGuidAgentSelection` 改动后） | `selectedAgent` 在声明前被 `useCcbModelInfo(...)` 引用 → `ReferenceError` | 改用 `selectedAgentKey`；见 task `06-13-ccb-minimax-m3-thinking-models` § 2026-06-14 |
| **Electron dev 白屏**（Thinking 模型 auto-apply 改动后） | 错误 `ipcBridge` import → esbuild `No matching export for import "ipcBridge"`；renderer bundle 未生成 | 见 **§8** Wave 3；`ensureCcbSessionPreferredModel` 用 `acpConversation` named export；renderer 用 `import { ipcBridge } from '@/common'` |
| **Electron 窗口长时间空白**（~40s 后恢复） | 首次 Vite dep optimize + backend migration 未完成；窗口在 `did-finish-load` 前已 show | **非 bundle 崩溃**；等 migration + `[AionUi] Renderer did-finish-load`；或见 §8 清缓存重启 |
| **会话内模型切换失败**（「模型切换失败」） | UI 合并了 CCB 变体，但 ACP session `available_models` 仍是 effort tier；aioncore 拒绝 `minimax-m3-thinking` | 部署含 `agent.ts` `buildMiniMaxM3SessionModels` 的 CCB dist；旧会话首次切换也会刷新列表 |
| **Guid 选 Thinking 进会话仍像 m3 / 无 PUT model** | CCB authority strip 了 `current_model_id`；未写 `ccb_preferred_model_id` | **2026-06-14 已修**：新建会话带 `ccb_preferred_model_id` + auto `setModel`；须 **新建** 会话 smoke |
| **`USER_LLM_PROVIDER_ENDPOINT_NOT_FOUND` 隔几分钟第二条消息** | 误报；实为 idle kill 后 stale `acp_session_id` | **2026-06-14 缓解**：send 前 `force` warmup；可调大 Agent 空闲超时；aioncore 待修 session 同步 |
| **Preset 助手卡片**（Word/Excel）仍像 WanD 报价助手 / 不像 preset | profile 已 seed 但 aioncore 未传 `ccbAssistantProfileId` 到 `session/new`；会话仍用默认 WanD CLAUDE.md | **2026-06-14 已修**：warmup 前 handoff 文件 `.aionui-next-assistant-profile.json` + `preset_context`；CCB `consumeNextAssistantProfileId` + `userContextOverride`。需 **AionUI dev 重启 + CCB deploy**；**新建** preset 会话 smoke |
| **Preset 助手卡片**（Word/Excel）点选后发不出 | preset 仍绑 `aionrs`；无 CCB profile JSON | seed migration（`readAssistantRule` fallback）→ 21 profiles 已落盘；见上行 Layer 3 handoff |
| `bun run build` 在 claude-code-B OOM | Bun sourcemap 分配失败 | 见 `../backend/build-deploy-verify.md` §1 `BUN_JSC_forceRAMSize` |

---

## 5. Verify UI fixes in dev (example: 06-12-aionui-exe)

Archived PRD: `tasks/archive/2026-06/06-12-aionui-exe/prd.md`. Renderer-only fixes — validate in dev before packaging.

**Backend (separate terminal)** — UI HMR does not refresh CCB / route-b:

```powershell
cd D:\Projects\claude-code-best\ccb-installer
.\scripts\sync-aionui-ccb-route-b.ps1
# Restart aioncore or the whole dev app if ACP slot was stale
```

**Three manual scenarios (dev is enough until ship):**

1. **Greeting dedup** — New CCB-Wanding session; first assistant message appears once only.
2. **Thinking default collapsed** — Block starts collapsed (streaming and history); user can expand via header; no forced collapse on `isDone`.
3. **AskUserQuestion** — Permission request shows options + confirm button (not blank).

---

## 6. Minimal "modify + test" loop

```bash
# 1. Edit code (locate via file-map.md first, then with rg if not in the table)
$EDITOR D:\Projects\aionui-src\packages\desktop\src\renderer\pages\...   # UI changes
$EDITOR D:\Projects\aionui-src\packages\desktop\src\process\bridge\...   # IPC changes
$EDITOR D:\Projects\aionui-src\packages\desktop\src\common\...          # Cross-process shared

# 2. Static checks
cd D:\Projects\aionui-src
bun run lint
bun run format:check
bunx tsc --noEmit -p tsconfig.json

# 3. Unit tests
bun test
# or single file:
bun test packages/desktop/src/process/backend/binaryResolver.test.ts

# 4. Manual dev verification
$env:PATH += ";D:\Projects\claude-code-best\AionUi\resources\bundled-aioncore\win32-x64"
bun run dev
# Manually click through the changed UI in the Electron window

# 5. (Conditional) Re-sync ACP slot
# ONLY if you also changed route-b or CCB-Wanding in this loop.
cd D:\Projects\claude-code-best
.\ccb-installer\scripts\sync-aionui-ccb-route-b.ps1 -RestartAionUiWeb
# Then re-run step 4.

# 6. E2E (optional, for cross-page flows)
bun run test:e2e

# 7. Package (only after dev scenarios pass)
bun run dist:win
# Copy out/AionUi Setup *.exe → AppData\Roaming\AionUi\ (or D:\Projects\claude-code-best\AionUi\ slot)
```

---

## 7. Package exe (3-5 min, only when shipping)

```powershell
cd D:\Projects\aionui-src
bun run dist:win      # or dist:mac / dist:linux
# Equivalent: node scripts/build-with-builder.js auto --win
```

After packaging, the new exe lives in `out/` (per `electron-builder.yml`); copy it into `D:\Projects\claude-code-best\AionUi\` to update the running slot.

---

## 8. White screen playbook (白屏纠错路线)

> **Recorded:** 2026-06-13, task `06-13-ccb-mcp-authority` + legacy config migration. Symptom: Electron dev window opens but stays blank; external browser at `http://localhost:5173/` may also fail until bundle is fixed.

### Symptom signature

| Signal | Meaning |
|--------|---------|
| Electron window white / empty chrome | Renderer process crashed or never painted first frame |
| DevTools console: `Module "fs" has been externalized` / `node:fs` import error | **Root cause** — renderer imported Node-only code |
| DevTools console: `ReferenceError: Cannot access 'selectedAgent' before initialization` | **Root cause (2026-06-14)** — hook used derived state before declaration; fix: use earlier key (e.g. `selectedAgentKey`) |
| Terminal / DevTools: `No matching export in .../ipcBridge.ts for import "ipcBridge"` | **Root cause (2026-06-14)** — `ipcBridge` is a **namespace re-export** from `@/common`, not a named export in `adapter/ipcBridge.ts` |
| Electron window white ~30–45s then UI appears | Slow first load (Vite optimize + MCP migration); log shows `Showing main window` before `Renderer did-finish-load` | Wait or use `start-aionui-dev.ps1`; not the same as bundle crash |
| External browser shows login UI but Electron still white | Stale Electron/Vite cache serving old broken bundle |
| External browser `/api/*` 404 | **Expected** — APIs proxy through Electron preload + aioncore, not Vite alone |

### Correction route (what we did, in order)

```
1. Suspect stale cache
   └── Kill electron + aioncore; delete packages/desktop/out + node_modules/.vite
   └── Restart via start-aionui-dev.ps1
   └── If still white → not cache alone; go to step 2

2. Find Node imports on renderer startup path
   └── rg "node:fs|ccbConfigMigration|ccbWandingRuntime|ccbMcpSettings" in renderer/ + common/ imported by renderer
   └── Guid page (/guid) is critical — useGuidSend, AgentSetupCard, createConversationParams load early

3. Wave 1 — runtime detection split (MCP authority work)
   ├── ccbWandingRuntime.ts        → browser-safe (isCcbWandingAgent, paths as strings only)
   ├── ccbWandingRuntimeNode.ts    → main-only (existsSync, read settings dir)
   └── Renderer checks CCB install via IPC ccbMcpService.isAuthorityActive (ccbMcpAuthority.ts)

4. Wave 2 — migration helpers split (still white after wave 1)
   ├── ccbConfigMigrationShared.ts → stripLegacyMcpFromParams, merge helpers (no fs)
   ├── ccbConfigMigration.ts       → main-only export + backup (node:fs)
   └── Renderer imports ONLY *Shared.ts; never ccbConfigMigration.ts

5. Verify
   ├── http://localhost:5173/ → redirects #/login, login form renders, no fs errors in console
   └── Electron window → same (after cache clear + full dev restart)

6. Harden dev launcher
   └── ccb-installer/scripts/start-aionui-dev.ps1 now: stop stale processes + clear cache + bun run dev

7. Wave 3 — ipcBridge import pattern (2026-06-14, Thinking auto-apply)
   ├── Symptom: esbuild ERROR `No matching export ... "ipcBridge"` → renderer never loads → white screen
   ├── Wrong: `import { ipcBridge } from '@/common/adapter/ipcBridge'`
   ├── Wrong: `import { ipcBridge, ccbModelService } from '@/common/adapter/ipcBridge'` (mixed namespace + named)
   ├── Correct (renderer IPC calls): `import { ipcBridge } from '@/common'`
   ├── Correct (named bridge): `import { acpConversation, ccbModelService } from '@/common/adapter/ipcBridge'`
   └── Trigger file: `common/config/ensureCcbSessionPreferredModel.ts` (renderer + main shared)
```

### Files involved (aionui-src)

| Module | Renderer-safe? | Who imports |
|--------|----------------|-------------|
| `common/config/ccbWandingRuntime.ts` | Yes | renderer hooks, guid |
| `common/config/ccbWandingRuntimeNode.ts` | **No** (fs) | process/bridge only |
| `common/config/ccbConfigMigrationShared.ts` | Yes | renderer guid + assistant create |
| `common/config/ccbConfigMigration.ts` | **No** (fs) | runBackendMigrations (main) |
| `common/config/ccbMcpSettings.ts` | **No** (fs) | process/bridge/ccbMcpBridge only |
| `common/config/ccbSkills.ts` | **No** (fs) | `process/bridge/ccbSkillsBridge.ts` → renderer `ccbSkillsService` IPC |
| `common/config/ccbAcpModelInfo.ts` | Yes | renderer guid + `useAcpModelInfo` (MiniMax variant merge) |
| `common/config/ensureCcbSessionPreferredModel.ts` | Yes | renderer `useAcpInitialMessage`, `AcpSendBox`, `useAcpModelInfo` — **must** import `acpConversation` only (not `ipcBridge` namespace) |

### Quick recovery command

```powershell
# Preferred: script does kill + cache clear + PATH + dev
Start-Process powershell -ArgumentList '-NoExit','-File','D:\Projects\claude-code-best\ccb-installer\scripts\start-aionui-dev.ps1'
```

Manual equivalent:

```powershell
Get-Process -Name electron,aioncore -ErrorAction SilentlyContinue | Stop-Process -Force
Remove-Item -Recurse -Force -ErrorAction SilentlyContinue `
  D:\Projects\aionui-src\packages\desktop\out, `
  D:\Projects\aionui-src\node_modules\.vite, `
  D:\Projects\aionui-src\packages\desktop\node_modules\.vite
$env:PATH = "D:\Projects\claude-code-best\AionUi\resources\bundled-aioncore\win32-x64;$env:PATH"
cd D:\Projects\aionui-src; bun run dev
```

### Prevention (when adding CCB integration code)

1. **Never** add top-level `import from 'node:fs'` in any file under `common/` that renderer might import — split into `*Shared.ts` + main-only sibling (see `coding-rules.md` §6).
2. Before declaring dev done, open DevTools (Ctrl+Shift+I) in Electron and confirm no module externalization errors.
3. Pure renderer edits usually HMR; **structural import changes** need full restart + cache clear.
4. Do not launch Electron from Cursor background terminal if it exits `-1` — use visible PowerShell via `start-aionui-dev.ps1`.

### Wrong vs correct

#### Wrong — renderer pulls fs on startup

```typescript
// useGuidSend.ts
import { stripLegacyMcpFromParams } from '@/common/config/ccbConfigMigration';
// ccbConfigMigration.ts top-level: import { readFile } from 'node:fs/promises'
```

#### Correct — shared strip logic, fs only in main

```typescript
// useGuidSend.ts
import { stripLegacyMcpFromParams } from '@/common/config/ccbConfigMigrationShared';

// runBackendMigrations.ts (main)
import { migrateAionUiRuntimeConfigToCcb } from '@/common/config/ccbConfigMigration';
```

#### Wrong — ipcBridge namespace from adapter path

```typescript
// ensureCcbSessionPreferredModel.ts — breaks Vite renderer bundle
import { ipcBridge } from '@/common/adapter/ipcBridge';
await ipcBridge.acpConversation.getModel.invoke(...);
```

#### Correct — namespace from @/common; named exports from adapter

```typescript
// useAcpInitialMessage.ts (renderer)
import { ipcBridge } from '@/common';
import { ccbModelService } from '@/common/adapter/ipcBridge';

// ensureCcbSessionPreferredModel.ts (shared — safe in renderer graph)
import { acpConversation } from '@/common/adapter/ipcBridge';
await acpConversation.getModel.invoke(...);
```

> **Verified 2026-06-14:** After Wave 3 import fix + `start-aionui-dev.ps1` restart, Electron window renders normally (`Renderer did-finish-load` + `/api/agents` 200). User confirmed exe UI visible (not white screen).
