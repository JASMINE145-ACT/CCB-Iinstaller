# MCP Health Check (CCB-Wanding)

> **When to use:** Specialist reports「MCP not configured」; model tries `claude mcp list` (invalid in ACP); Word/Excel/quotation tools missing in a Guid session.  
> **Canonical registry:** `ccb-installer/config/mcp-health-manifest.json` (CLI) · `aionui-src/.../ccbMcpHealthManifest.ts` (UI, mirrored).

---

## Two surfaces (same contract)

| Surface | Entry | Layers |
|---------|-------|--------|
| **CLI / CI** | `ccb-installer/scripts/test-mcp-health.ps1` | config + files + agents · `-Probe` · `-Session` · `-Repair` |
| **AionUI UI** | Settings → **能力扩展 → 工具** → **CCB MCP 健康检查** | 快速检查 · 完整探测 · **诊断 + 一键白名单修复** · MiniMax 深度分析 |

UI only appears when `ccbMcpService.isAuthorityActive` ( `%LOCALAPPDATA%\CCB-Wanding\.claude\settings.json` exists).

---

## CLI commands

```powershell
cd D:\Projects\claude-code-best

# Layer 1 — config, vendor files, agent sidecars (~5s)
.\ccb-installer\scripts\test-mcp-health.ps1

# Layer 2 — serial stdio spawn + tools/list (~1–3 min; office-word cold start up to ~90s)
.\ccb-installer\scripts\test-mcp-health.ps1 -Probe

# Quotation-only deep probe (tools/call match_quotation — Python path smoke)
node .\ccb-installer\scripts\test-mcp-probe-layer.mjs --server=quotation

# Layer 3 — ACP session/new per specialist profile via handoff file (~30s)
.\ccb-installer\scripts\test-mcp-health.ps1 -Session

# Full gate (recommended after install / route-b sync)
.\ccb-installer\scripts\test-mcp-health.ps1 -Probe -Session

# Repair settings + redeploy agent seeds
.\ccb-installer\scripts\test-mcp-health.ps1 -Repair
```

Run session probes **serially**. `-Session` writes the same one-shot handoff file that AionUI uses, so parallel session-health runs can overwrite each other's staged profile and produce a false failure such as `wande-orchestrator actual=[quotation]`.

**Supporting scripts**

| File | Role |
|------|------|
| `ccb-installer/scripts/test-mcp-probe-layer.mjs` | Stdio probe only (invoked by `-Probe`) |
| `ccb-installer/test-mcp-session-health.mjs` | ACP profile → `[ACP] session mcp servers:` parse |
| `ccb-installer/lib/mcp-health-manifest.mjs` | Manifest loader |
| `ccb-installer/lib/mcp-stdio-probe.mjs` | Single-server stdio initialize + tools/list + optional `tools/call` |

**Session layer** writes the same handoff AionUI uses:

```text
%LOCALAPPDATA%\CCB-Wanding\.claude\.aionui-next-assistant-profile.json
  { "profile_id": "word-creator", "staged_at": "<ISO8601>" }  # max age 300s
```

Profiles tested: `quotation-agent`, `accurate-agent`, `word-creator`, `excel-creator`, `wande-orchestrator` (MCP must be empty).

---

## AionUI implementation

| Layer | File |
|-------|------|
| Health logic (main process) | `aionui-src/packages/desktop/src/common/config/ccbMcpHealth.ts` |
| Diagnosis + repair whitelist | `aionui-src/packages/desktop/src/common/config/ccbMcpHealthDiagnosis.ts` |
| Manifest (TS mirror) | `aionui-src/packages/desktop/src/common/config/ccbMcpHealthManifest.ts` |
| Install / installer resolver | `ccbWandingRuntimeNode.ts` → `resolveCcbWandingInstallDir()`, `resolveCcbInstallerRoot()` |
| IPC bridge | `process/bridge/ccbMcpBridge.ts` |
| IPC contract | `ipcBridge.ts` → `ccbMcpService.runHealthCheck`, `repairHealth` |
| UI panel | `renderer/pages/settings/ToolsSettings/CcbMcpHealthPanel.tsx` |
| Wired in | `ToolsModalContent.tsx`, `McpManagement.tsx` |
| Unit test | `ccbMcpHealth.test.ts`, `ccbMcpHealthDiagnosis.test.ts` |

**Whitelisted repair actions** (UI one-click / `repairHealth({ actionIds })`):

| Action id | What it runs |
|-----------|----------------|
| `ensure-wanding-settings` | `ccb-installer/scripts/ensure-wanding-settings.ps1` |
| `deploy-seed-agents` | `ccb-installer/scripts/deploy-seed-agents.mjs --force-md` |
| `repair-word-creator` | `repairWordCreatorOfficeWordMcp` |
| `repair-excel-creator` | `repairExcelCreatorExcelMcp` |
| `repair-subagent-mcp` | `repairWanDSubagentMcpServers` |

**UI vs CLI**

| UI button | CLI equivalent | Notes |
|-----------|----------------|-------|
| 快速检查 | `test-mcp-health.ps1` (no flags) | Config + files + agents only |
| 完整探测 | `-Probe` | Reuses `listCcbMcpServersWithHealth({ test: true })` **plus** `quotation:python` deep probe (`tools/call match_quotation` via installer script) |
| 一键修复（N 步） | `-Repair` (subset) | Runs **diagnosis.repair_plan** only — skips irrelevant steps |
| 完整修复 | `-Repair` | All five whitelisted actions in order |
| MiniMax 分析并修复 | — | **先** `repair_plan` 白名单修复 + 完整探测复检，**再**打开 Guid（预填含修复日志的 prompt） |

**Not in UI (CLI only):** `-Session` ACP live profile probe. Use CLI after UI quick/full check passes but Guid still lacks tools.

---

## Manifest contract

**Core MCP servers (must register + probe):** `quotation`, `accurate`, `office-word`, `excel`

**Lazy (probe skipped):** `excel-mcp`, `exa`

**Specialist → required MCP**

| Agent profile | Required MCP |
|---------------|--------------|
| `quotation-agent` | `quotation`, `excel` |
| `accurate-agent` | `accurate` |
| `word-creator` | `office-word` |
| `excel-creator` | `excel` |
| `wande-orchestrator` | *(none — allowlist empty)* |

Skill-only agents (`ppt-creator`, `word-form-creator`, `cowork`) are `optional: true` in manifest — not gated.

When updating agent `mcp_allowlist` or adding a new specialist MCP, update **both** manifest files (ccb-installer JSON + aionui TS).

**2026-06-28 AOL inventory credentials:** `ensure-wanding-settings.ps1` writes `{install}/vendor/wanding/.env.accurate` (loaded by `python/main.py` with `override=True`, `encoding=utf-8-sig`) so inventory works even when MCP spawn omits empty `AOL_*` env. **BOM trap (fixed):** PowerShell `Set-Content -Encoding UTF8` wrote UTF-8 BOM → python-dotenv read `\ufeffAOL_ACCESS_TOKEN` → `aol_configured()` false while health passed (settings.json had full `AOL_*`). Fix: `WriteAllText` UTF-8 no BOM; health now checks BOM + `dotenv_values` parse; `python-spawner.js` deletes empty `AOL_*` keys before spawn. `-Probe` calls `get_inventory_by_code` and fails on `inventory_unavailable`.

**2026-06-27 quotation Python path (#20):** Config layer now requires `vendor/wanding/python/main.py` and validates `settings.json` → `mcpServers.quotation.env.CCB_PROJECT_ROOT` points at a tree containing `python/main.py`. `-Probe` / UI 完整探测 call `match_quotation` (not just `tools/list`) so missing `main.py` fails before Guid. `quotation-server/dist/config.js` falls back to bundled `vendor/wanding` when env root is wrong. Manifest field: `probe_tool_call`.

**2026-06-18 quotation note:** `quotation-agent` intentionally loads `quotation + excel`. Quotation matching and sheet generation use the `quotation` MCP (`match_quotation`, `fill_quotation_sheet`); Excel MCP is a post-fill supplement for workbook inspection/editing, not a replacement for quotation fill. The runtime authority is `agents/quotation-agent.md` frontmatter; sidecar `mcp_allowlist` and this manifest must match it or health checks will under-report drift.

**2026-06-18 warmup note:** runtime warmup is selective. Default router sessions warm `quotation + accurate`; direct `word-creator` warms `office-word`; direct `excel-creator` warms `excel`. Do not use the health probe latency as a direct proxy for chat latency: `-Probe` intentionally spawns every core server, while chat sessions use profile allowlists.

**2026-06-28 app startup readiness (task `06-28-app-startup-readiness-gate`, in progress):** MCP/config warm moved from first conversation to app open. Canonical: **§ App startup readiness gate** below.

**2026-06-28 Accurate summarize deep probe:** `accurate` health now includes `tools/call accurate_summarize_records` (not just `tools/list`). Symptom「高级工具暂时不可用」is usually **model disclaimer**, not missing tools — see **§ Accurate summarize — closed root cause** below.

---

## Symptom → diagnosis

| Symptom | Layer | Likely cause | Fix |
|---------|-------|--------------|-----|
| Model says「MCP not configured」/ runs `claude mcp list` | — | Wrong mental model; ACP has no `claude mcp` CLI | Use health check; open **new** Guid card for specialist |
| `can't open ... claude-temp-*\python\main.py` | config / probe | Wrong `CCB_PROJECT_ROOT` or missing bundled wanding | `ensure-wanding-settings.ps1`; deploy fixed `config.js` (#20); `-Probe` should FAIL on `match_quotation` |
| 库存「AOL 凭证未配置」/ `inventory_unavailable` | config / probe | **Expected** if no AOL secrets (smoke/CI). **Bug** if `-Probe` passes but Guid fails → BOM/spawner § | Smoke: ignore for price match. Live: `ensure-wanding-settings.ps1`; sync spawner; **new Guid session** |
| `mcp:office-word not in settings.json` | config | Stale/missing settings | `-Repair` or `ensure-wanding-settings.ps1` |
| `vendor/.../server.py missing` | files | Incomplete install | Re-run vendor install scripts under `ccb-installer/scripts/` |
| `sidecar mcp_allowlist missing` | agents | Seed not deployed | `deploy-seed-agents.ps1 -ForceMd` |
| `office-word: connect failed` (probe) | probe | Cold start > timeout; broken python deps | Retry; `install-office-word-mcp.ps1`; manifest `probe_timeout_ms` is 90s |
| Session: `missing mcp: office-word` but probe PASS | session | Profile handoff not consumed at `session/new` | **New** Guid conversation from Word 文档助手 card; check `.aionui-next-assistant-profile.json` age ≤ **300s** |
| Resume specialist chat → `wande-orchestrator 不得直接调用业务 MCP` | session | Profile drift after idle reopen (2026-06-29 class) | Deploy resume fix; reopen quotation/accurate Guid — log must show `agent session profile applied: quotation-agent`; else new Guid session |
| Accurate 助手说「summarize / purchase_summary 暂时不可用」| session / agent | **通常不是缺工具** — `tools/list` 有 8 个工具；模型未调用或误报 | 新开 **万鼎账务专家** Guid；直接问「2026 年 1 月采购总额」；`-Probe` 应含 `accurate_summarize_records` deep call；见 § Accurate summarize |
| 首条 Guid 消息 `Failed to fetch (127.0.0.1:*)` / `AIONUI_INTERNAL_ERROR` | session / startup | MCP cold start + send raced warmup (pre-gate) or main crash on init | **Fixed path:** app startup readiness § below — wait for banner; dev: `start-dev-full.ps1` (syncs warm script). **Init crash:** `isCcbMcpAuthorityActive()` is sync boolean — never `.then()` in `ccbMcpBridge.ts` |

## AOL inventory — closed root cause (do not re-debug)

**Status:** Fixed **2026-06-28**. If Guid still says「AOL 凭证未配置 / 库存暂不可查 / `inventory_unavailable`」while `test-mcp-health.ps1 -Probe` passes, follow this section — **do not** treat as「credentials never configured」.

### Smoke / CI: AOL absent is expected (not a quotation bug)

| Context | Behavior |
|---------|----------|
| Fresh dev install, CI, smoke without secrets | `aol_configured()` false → `inventory_unavailable` with explicit English message |
| Price match (`match_fuzzy`, tiers) | **Unaffected** — uses org / LKG / bundled price library, not AOL |
| When you want stock in Guid | Run `ensure-wanding-settings.ps1` (writes `.env.accurate`); **new Guid session** |

This is **by design**: inventory is optional enrichment, not a hard dependency for quoting. Contrast with § below (BOM/spawner): health **passed** config check but Guid still got `inventory_unavailable` — that was a **misconfig bug**, not intentional smoke degradation.

Cross-ref triage table: [`price-library.md`](./price-library.md) § Dev / smoke: expected degradations vs real bugs.

### Why health passed but Guid failed

```
                    ┌─────────────────────────────────────┐
                    │  test-mcp-health.ps1 (config layer)   │
                    │  reads settings.json quotation.env    │
                    │  AOL_* full → PASS                    │
                    └─────────────────────────────────────┘
                                      ≠
                    ┌─────────────────────────────────────┐
                    │  Guid / quotation MCP spawn         │
                    │  python-spawner.js                  │
                    │  AOL_* = "" (empty string)          │
                    │       ↓                             │
                    │  blocks .env.accurate dotenv        │
                    │  OR file had UTF-8 BOM →            │
                    │  key = \ufeffAOL_ACCESS_TOKEN       │
                    │       ↓                             │
                    │  aol_configured() = false           │
                    │  → inventory_unavailable            │
                    └─────────────────────────────────────┘
```

Two independent bugs stacked:

| # | Bug | Effect |
|---|-----|--------|
| 1 | `ensure-wanding-settings.ps1` once used `Set-Content -Encoding UTF8` → **UTF-8 BOM** in `vendor/wanding/.env.accurate` | python-dotenv reads `\ufeffAOL_ACCESS_TOKEN`, not `AOL_ACCESS_TOKEN` |
| 2 | `python-spawner.js` set `AOL_*: process.env.AOL_* ?? ""` | Empty string in child env **overrides** dotenv even with `override=True` |

### Permanent fix (in repo)

| File | Change |
|------|--------|
| `ccb-installer/scripts/ensure-wanding-settings.ps1` | `WriteAllText` with UTF-8 **no BOM** for `.env.accurate` |
| `python/main.py` | `load_dotenv(..., encoding="utf-8-sig")` |
| `python/inventory/lib/api/client.py` | same `utf-8-sig` (defense in depth) |
| `mcp_servers/quotation-server/dist/python-spawner.js` | **Delete** empty/whitespace `AOL_*` keys before spawn (do not pass `""`) |
| `ccb-installer/scripts/test-mcp-health.ps1` | BOM byte check + bundled-python `dotenv_values` parse (`AOL_ACCESS_TOKEN` len > 100) |

### One-shot repair (employee / dev install)

```powershell
cd D:\Projects\claude-code-best

# 1) Rewrite settings + .env.accurate (no BOM)
.\ccb-installer\scripts\ensure-wanding-settings.ps1 -InstallDir D:\CCB-Wanding

# 2) Sync fixed spawner + python (dev tree → live install)
Copy-Item -Force mcp_servers\quotation-server\dist\python-spawner.js `
  D:\CCB-Wanding\vendor\mcp-servers\quotation-server\dist\python-spawner.js
Copy-Item -Force python\main.py D:\CCB-Wanding\vendor\wanding\python\main.py
Copy-Item -Force python\inventory\lib\api\client.py `
  D:\CCB-Wanding\vendor\wanding\python\inventory\lib\api\client.py

# 3) Gate — must PASS incl. ".env.accurate parsed (len=484)" + probe inventory
.\ccb-installer\scripts\test-mcp-health.ps1 -InstallDir D:\CCB-Wanding -Probe
```

Then open a **new** Guid 万鼎报价专家 card (MCP subprocess is per-session).

### Verify inventory works (not just health green)

```powershell
# dotenv parse (expect len ~484, not 0)
D:\CCB-Wanding\vendor\python-wanding\python.exe -c `
  "from dotenv import dotenv_values; v=dotenv_values(r'D:\CCB-Wanding\vendor\wanding\.env.accurate'); print(len(v.get('AOL_ACCESS_TOKEN') or ''))"

# Simulate Guid worst-case: strip AOL env, rely on .env.accurate only
# Expect JSON with qty_available / name — NOT inventory_unavailable
$env:AOL_ACCESS_TOKEN=''; $env:AOL_SIGNATURE_SECRET=''; $env:AOL_DATABASE_ID=''
cd D:\CCB-Wanding\vendor\wanding
'{"tool":"get_inventory_by_code","params":{"code":"8020020755","customer_level":"B"}}' |
  D:\CCB-Wanding\vendor\python-wanding\python.exe python\main.py
```

**Success:** `"success": true` with `qty_available` (may be 0 — that is valid stock data).  
**Failure:** `"inventory_unavailable"` or「AOL 未配置」→ re-run repair; confirm spawner synced; new Guid session.

### Hot zip / NSIS must include

- `vendor/mcp-servers/quotation-server/dist/python-spawner.js` (empty-AOL fix)
- Post-install or `-Repair`: `ensure-wanding-settings.ps1` (rewrites `.env.accurate` without BOM)

Task snapshot: [`progress-2026-06-28.md`](../../tasks/06-27-quotation-mcp-health/progress-2026-06-28.md) § AOL BOM fix.

---

## Accurate summarize — closed root cause (do not re-debug as「缺工具」)

**Status:** Diagnosed **2026-06-28**. User-facing「`accurate_summarize_records` / `accurate_purchase_summary` 暂时不可用」is **usually false** — infrastructure has all 8 tools and summarize works when called correctly.

### Why summarize fails with「AOL_ACCESS_TOKEN 未设置」while health passes

Same stacked bug class as **§ AOL inventory** — settings.json / probe pass, Guid session fails:

| # | Bug | Effect |
|---|-----|--------|
| 1 | Parent MCP spawn passes **empty string** `AOL_*` in env | Blocks `load_dotenv(..., override=False)` |
| 2 | `server.py` used `find_dotenv(usecwd=True)` only | cwd-dependent; misses `vendor/wanding/.env.accurate` |

**Fix (server.py):** `_sanitize_aol_env()` drop empty keys → `_load_bundled_aol_env()` load `{install}/vendor/wanding/.env.accurate` with `utf-8-sig` + `override=True` (mirrors `python/main.py`).

**One-shot sync to live install:**

```powershell
Copy-Item -Force D:\Projects\claude-code-best\ccb-installer\vendor\mcp-servers\accurate-mcp\server.py `
  D:\CCB-Wanding\vendor\mcp-servers\accurate-mcp\server.py
# New Guid 万鼎账务专家 card (MCP subprocess is per-session)
```

**Verify empty-env fallback:**

```powershell
$env:AOL_ACCESS_TOKEN=''; $env:AOL_SIGNATURE_SECRET=''; $env:AOL_DATABASE_ID=''
node .\ccb-installer\scripts\probe-accurate-summarize.mjs
# Expect: isError=false
```

### What we verified

| Check | Result |
|-------|--------|
| `server.py` (repo + `D:\CCB-Wanding`) | **8 tools** incl. `accurate_summarize_records`, `accurate_purchase_summary` |
| `test-mcp-probe-layer.mjs --server=accurate` | **PASS** tools/list |
| `probe-accurate-summarize.mjs` (tools/call) | **PASS** — real `purchase-invoice` Jan 2026 monthly total (~90s) |

### Actual root causes (stacked)

```
用户看到「高级工具不可用」
        │
        ├─ (1) 模型误报 — 未调用就 disclaimer（种子 prompt 无此句）
        │
        ├─ (2) 健康检查盲区 — accurate 仅 tools/list，不 call summarize
        │       → 运维误以为「探针过了 = 汇总可用」
        │
        ├─ (3) warmup 参数错误 — keywords 而非 table_name/keyword
        │       → 首次预热未真正 exercise 汇总路径
        │
        └─ (4) AionUI acp-agent 路径 ENABLE_SEARCH_EXTRA_TOOLS=auto:100
                → 部分会话 MCP 走 ExecuteExtraTool（已改为默认 false）
```

### Permanent fix (in repo)

| Artifact | Change |
|----------|--------|
| `ccb-installer/config/mcp-health-manifest.json` | `probe_tool_call`: `accurate_summarize_records` + reject AOL/参数/API 错误 |
| `wanDMcpWarmup.ts` / `warm-wanding-mcp.mjs` | warmup 使用正确 `table_name` + 日期区间 |
| `patches/aionui-acp/acp-agent.js` | `ENABLE_SEARCH_EXTRA_TOOLS` 默认 `false`（对齐 route-b） |
| `config/agents/accurate-agent.md` | 禁止未调用就声称汇总工具不可用 |
| `scripts/probe-accurate-summarize.mjs` | 手工 deep probe（~90s） |

### Gate command

```powershell
cd D:\Projects\claude-code-best
node .\ccb-installer\scripts\test-mcp-probe-layer.mjs --server=accurate
# Expect: PASS ... tool_call=accurate_summarize_records

node .\ccb-installer\scripts\probe-accurate-summarize.mjs
# Expect: isError=false, JSON with groups/total_amount
```

Then open a **new** Guid **万鼎账务专家** card (MCP subprocess is per-session).

### Agent SOP reminder

- 全公司月报：**1 次** `accurate_summarize_records`（`group_by: month`），禁止用 `fetch_by_date` 做金额汇总
- 指定主体：先 `accurate_search_records` → 每主体 1 次 summarize
- 同工具连续最多 **2 次**（第 3 次 repeat guard 拒绝）

---

## Cross-MCP credential fallback audit (2026-06-28)

**Question:** Besides `accurate-mcp`, do other WanD MCP servers share the「parent spawn passes empty `*_` env → dotenv `override=False` cannot recover from `vendor/wanding/.env.accurate`」bug class?

**Conclusion:** **No other core MCP needs the same fix.** Only `accurate-mcp` had the broken pattern; `quotation` was already hardened in the AOL inventory incident.

### Audit matrix

| MCP server | Reads AOL / org secrets? | Fallback mechanism | Same bug class? | Status |
|------------|--------------------------|--------------------|-----------------|--------|
| **accurate** | `AOL_*` required | `vendor/wanding/.env.accurate` via `_sanitize_aol_env` + `_load_bundled_aol_env` | **Was yes** | **Fixed 2026-06-28** (`accurate-mcp/server.py`) |
| **quotation** | `AOL_*` for inventory; `ORG_*` for org price lib | `python-spawner.js` **deletes** empty `AOL_*`; `python/main.py` + `inventory/lib/api/client.py` load `.env.accurate` `override=True` `utf-8-sig`; org token uses `.strip()` + multi-path file candidates | Was yes (AOL only) | **Closed 2026-06-28** — § AOL inventory |
| **office-word** | No external API creds | Launcher only sets `PYTHONPATH`; upstream docx server | No | N/A |
| **excel** (haris) | No external API creds | Launcher only sets `PYTHONPATH` | No | N/A |
| **excel-mcp** (COM) | Local Excel automation | Bundled `.exe`; lazy optional | No | N/A |
| **exa** | HTTP API key in settings | Remote HTTP MCP; not stdio dotenv | No | N/A |
| **ccb-deploy-mcp** | `CCB_DEPLOY_SSH_PASSWORD` (dev-only) | Direct `os.environ.get` only; no bundled `.env` fallback file | Different pattern | Out of health manifest scope; fail-fast if unset |

### Shared credential file

```
{install}/vendor/wanding/.env.accurate
  ├── quotation python/main.py      (override=True, utf-8-sig)  ✅
  ├── inventory client.py           (override=True, utf-8-sig)  ✅
  └── accurate-mcp/server.py        (override=True, utf-8-sig)  ✅ fixed 2026-06-28
```

Written by `ensure-wanding-settings.ps1` (UTF-8 **no BOM**). Health config layer checks BOM + `dotenv_values` parse for this file.

### Pattern to enforce for **new** Python stdio MCPs

If a future MCP reads secrets from env **and** should survive empty parent spawn:

1. `_sanitize_*_env()` — `pop` keys whose value is blank after strip
2. Load bundled `{install}/vendor/wanding/.env.*` or server-specific env with `override=True`, `encoding="utf-8-sig"`
3. Add `probe_tool_call` in `mcp-health-manifest.json` that exercises the credential path (not only `tools/list`)
4. Add stripped-env probe script or manifest `reject_patterns` for「未设置 / not configured」

**Do not** use `find_dotenv(usecwd=True)` + `override=False` for production WanD MCPs — cwd varies between Guid, AionUI temp dirs, and probe CLI.

---

## App startup readiness gate (task `06-28-app-startup-readiness-gate`)

**Problem (2026-06-28):** First Guid send paid MCP cold start (~120s) + `warmupConversation` (~9s) while renderer fetched aioncore → `Failed to fetch (127.0.0.1:53121)`. Health `-Probe` passed because it runs before chat.

**Goal:** Layer 1 config + Layer 2 MCP warm at **app open** (CCB detected), not first conversation. Guid send gated until ready.

```
App open (CCB authority)
    │
    ├─ Layer 1: runCcbMcpHealthCheck({ probe: false })  ~5s
    │
    ├─ Layer 2: warm-wanding-mcp.mjs (quotation + accurate)  ~30s–120s
    │       └── 120s timeout → soft_ready (warn + allow send)
    │
    └─ Guid: banner + send disabled until isCcbStartupSendAllowed
```

### Artifacts

| Layer | File | Role |
|-------|------|------|
| Warm script | `ccb-installer/lib/warm-wanding-mcp.mjs` | stdio spawn; mirrors `wanDMcpWarmup.ts` |
| Main pipeline | `aionui-src/.../ccbStartupReadiness.ts` | orchestrates L1+L2; kills warm child on timeout |
| Shared | `ccbStartupReadinessShared.ts` | renderer-safe types + `isCcbStartupSendAllowed` |
| IPC | `ccbMcpBridge.ts` | `getStartupReadiness`, `ensureStartupReadiness`; **sync** `if (isCcbMcpAuthorityActive()) startPipeline()` |
| UI | `useCcbStartupReadiness`, `CcbStartupReadinessBanner`, `GuidPage`, `useGuidSend`, `AcpSendBox`, `useAcpInitialMessage` | banner + send gate |
| Dev sync | `start-dev-full.ps1` | copies warm script → `{install}/lib/warm-wanding-mcp.mjs` |

### Init trap (fixed 2026-06-28)

`isCcbMcpAuthorityActive()` returns **`boolean`**, not `Promise`. Wrong: `isCcbMcpAuthorityActive().then(...)` → main process crash on load. Right: synchronous `if (isCcbMcpAuthorityActive()) { startCcbStartupReadinessPipeline(); }`.

### Dev verify

```powershell
.\ccb-installer\scripts\start-dev-full.ps1 -SkipBootstrap
# Expect log: [ok] Synced startup MCP warm script -> D:\CCB-Wanding\lib
# Login → Guid: 「正在检查配置…」→「正在预热报价 MCP…」→ send enabled
# bun test tests/unit/common-config/ccbStartupReadinessShared.test.ts  # 4/4
```

### Still open (not MVP)

- Layer 3 anchor ACP session (deferred)
- NSIS/hot zip: ship `{install}/lib/warm-wanding-mcp.mjs` on employee machines
- Config error banner → one-click `repairHealth` CTA
- Remove duplicate warm: `scheduleWanDMcpWarmup` still runs at `session/new`

Task: [`progress-2026-06-28.md`](../../tasks/06-28-app-startup-readiness-gate/progress-2026-06-28.md) · PRD: [`prd.md`](../../tasks/06-28-app-startup-readiness-gate/prd.md).

---

## Verification checklist

**After install / settings / agent seed change:**

```powershell
.\ccb-installer\scripts\test-mcp-health.ps1 -Probe -Session
# Expect: config PASS (24 items incl. quotation.env.CCB_PROJECT_ROOT + vendor/wanding/python/main.py)
#         4/4 probe (quotation includes tools/call match_quotation)
#         5/5 session profiles
```

**2026-06-28 baseline (dev `D:\CCB-Wanding`):** config **29/29** · probe **4/4** (`quotation` = `match_quotation+get_inventory_by_code`) · session **5/5** · ROE smoke **8/8**. Task snapshot: [`progress-2026-06-28.md`](../../tasks/06-27-quotation-mcp-health/progress-2026-06-28.md).

---

## MCP + Skill coverage (what health proves)

| Component | `-Probe -Session` | Separate check |
|-----------|-------------------|----------------|
| quotation / accurate / office-word / excel | ✅ spawn + tools/list (+ quotation deep calls) | — |
| excel-mcp (COM) | ⏭️ lazy | Needs Microsoft Excel |
| exa (HTTP) | ⏭️ optional | Needs network |
| ccb-subagent-gate + ROE hooks | — | `smoke-roe-deploy.ps1` |
| ppt-master skill | — | `$CONFIG/skills/ppt-master` + vendor tree |
| Org price library VPS | — | `price-library.md` / manual UI |

**After aionui-src health UI change:**

```powershell
cd D:\Projects\aionui-src
bun test tests/unit/common-config/ccbMcpHealth.test.ts
# Dev: start-dev-full.ps1 → Settings → 工具 → health panel auto quick-check
```

---

## Related docs

- [`../backend/build-deploy-verify.md`](../backend/build-deploy-verify.md) §3.6 — smoke index
- [`../backend/route-b-status.md`](../backend/route-b-status.md) §2026-06-18e
- [`agents-unified-model.md`](./agents-unified-model.md) — specialist MCP allowlist + handoff
- [`aionui-config-inventory.md`](./aionui-config-inventory.md) — CCB MCP authority ownership
- [`../frontend/file-map.md`](../frontend/file-map.md) §4 — UI file map
