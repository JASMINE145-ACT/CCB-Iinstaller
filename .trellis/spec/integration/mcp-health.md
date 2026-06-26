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
| `ccb-installer/lib/mcp-stdio-probe.mjs` | Single-server stdio initialize + tools/list |

**Session layer** writes the same handoff AionUI uses:

```text
%LOCALAPPDATA%\CCB-Wanding\.claude\.aionui-next-assistant-profile.json
  { "profile_id": "word-creator", "staged_at": "<ISO8601>" }  # max age 60s
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
| 完整探测 | `-Probe` | Reuses `listCcbMcpServersWithHealth({ test: true })` |
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

**2026-06-18 quotation note:** `quotation-agent` intentionally loads `quotation + excel`. Quotation matching and sheet generation use the `quotation` MCP (`match_quotation`, `fill_quotation_sheet`); Excel MCP is a post-fill supplement for workbook inspection/editing, not a replacement for quotation fill. The runtime authority is `agents/quotation-agent.md` frontmatter; sidecar `mcp_allowlist` and this manifest must match it or health checks will under-report drift.

**2026-06-18 warmup note:** runtime warmup is selective. Default router sessions warm `quotation + accurate`; direct `word-creator` warms `office-word`; direct `excel-creator` warms `excel`. Do not use the health probe latency as a direct proxy for chat latency: `-Probe` intentionally spawns every core server, while chat sessions use profile allowlists.

---

## Symptom → diagnosis

| Symptom | Layer | Likely cause | Fix |
|---------|-------|--------------|-----|
| Model says「MCP not configured」/ runs `claude mcp list` | — | Wrong mental model; ACP has no `claude mcp` CLI | Use health check; open **new** Guid card for specialist |
| `mcp:office-word not in settings.json` | config | Stale/missing settings | `-Repair` or `ensure-wanding-settings.ps1` |
| `vendor/.../server.py missing` | files | Incomplete install | Re-run vendor install scripts under `ccb-installer/scripts/` |
| `sidecar mcp_allowlist missing` | agents | Seed not deployed | `deploy-seed-agents.ps1 -ForceMd` |
| `office-word: connect failed` (probe) | probe | Cold start > timeout; broken python deps | Retry; `install-office-word-mcp.ps1`; manifest `probe_timeout_ms` is 90s |
| Session: `missing mcp: office-word` but probe PASS | session | Profile handoff not consumed at `session/new` | **New** Guid conversation from Word 文档助手 card; check `.aionui-next-assistant-profile.json` age ≤ 60s |
| Orchestrator session has business MCP tools | session | Wrong profile (default router leak) | Should not happen if `wande-orchestrator` allowlist empty — file session-health bug |

---

## Verification checklist

**After install / settings / agent seed change:**

```powershell
.\ccb-installer\scripts\test-mcp-health.ps1 -Probe -Session
# Expect: config PASS, 4/4 probe, 5/5 session profiles
```

**After aionui-src health UI change:**

```powershell
cd D:\Projects\aionui-src
bun test tests/unit/common-config/ccbMcpHealth.test.ts
# Dev: start-aionui-dev.ps1 → Settings → 工具 → health panel auto quick-check
```

---

## Related docs

- [`../backend/build-deploy-verify.md`](../backend/build-deploy-verify.md) §3.6 — smoke index
- [`../backend/route-b-status.md`](../backend/route-b-status.md) §2026-06-18e
- [`agents-unified-model.md`](./agents-unified-model.md) — specialist MCP allowlist + handoff
- [`aionui-config-inventory.md`](./aionui-config-inventory.md) — CCB MCP authority ownership
- [`../frontend/file-map.md`](../frontend/file-map.md) §4 — UI file map
