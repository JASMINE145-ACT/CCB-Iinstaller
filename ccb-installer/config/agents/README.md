# CCB seed agents (unified storage)

Bundled agent definitions for CCB-Wanding + AionUI Guid cards + `Agent()` delegation.

Each agent is stored as a pair:

- `{id}.md` — **L1 runtime authority**: frontmatter (`name`, `mcpServers`, `skills`, `model`, `hooks`, ...) plus the full system prompt body consumed by CCB.
- `{id}.aionui.json` — **L2 UI metadata only**: `display_name`, `avatar`, `guid_primary`, `sort_order`, `recommended_prompts`, and `mcp_allowlist` mirror. Do not put runtime persona in sidecar.

## Current Keep Set

| Agent | Guid card | `delegatable` | Runtime tools | Notes |
|-------|-----------|---------------|---------------|-------|
| `wande-orchestrator` | hidden default entry | no | none | Employee primary entry; delegates via `Agent()`; no business MCP in main session |
| `quotation-agent` | 万鼎报价专家 | yes | `quotation`, `excel` | Direct quotation workflow; quotation MCP matches/fills, Excel MCP is for post-fill workbook inspection/editing |
| `accurate-agent` | 万鼎账务专家 | yes | `accurate` | Direct accounting session |
| `word-creator` | Word 文档助手 | yes | `office-word` | MCP-only Word creation; delivery gate blocks invalid output |
| `excel-creator` | Excel 表格助手 | yes | `excel` | MCP-only Excel creation; delivery gate blocks invalid output |
| `ppt-creator` | PPT 演示助手 | yes | `ppt-master` skill | Skill-only PPT creation; delivery gate blocks invalid output; avatar **📽️** (not 📊 — reserved for 账务) |
| `research-agent` | 资料搜索助手 | yes | `exa`, `tavily` (+ optional `scrapling`) | Dual-source web research; skill `wanding-deep-research`; evidence `research/*.md` + `.sources.jsonl` |
| `price-library-agent` | 价格库管理 | yes (price_admin) | `price-library`, `excel` | Org draft/import/publish; Guid-only (`delegatable: false`); avatar **🏷️** (not 📊 — reserved for 账务) |

**Retired (2026-06-27):** `cowork`, `word-form-creator` removed from keep set and Guid cards — use `word-creator` / `ppt-creator` / `excel-creator` instead. Live prune list: `retired-agent-ids.json` (deployed automatically by `deploy-seed-agents.mjs`).

Runtime authority must stay aligned across:

1. `{id}.md` frontmatter (`mcpServers` / `skills`)
2. `{id}.aionui.json` (`mcp_allowlist` / `skills`)
3. `ccb-installer/config/mcp-health-manifest.json`
4. live `%LOCALAPPDATA%\CCB-Wanding\.claude\agents\`

## Encoding

Any script that writes `agents/*.md` must use UTF-8 without BOM.

- PowerShell: `[System.IO.File]::WriteAllText($path, $content, [System.Text.UTF8Encoding]::new($false))`
- Do not use Windows PowerShell 5.1 `Set-Content -Encoding UTF8` for agent markdown; it writes a BOM and can break frontmatter parsing.

## Specialist Persona

Guid cards for business specialists (`quotation-agent`, `accurate-agent`) open **specialist direct sessions**. Their L1 body must state:

- the current session is the specialist, not `wande-orchestrator`
- call the allowed MCP tools directly
- do not delegate via `Agent()`
- ignore global orchestrator rules that only apply to the default route

## Delivery Gate

Current `ccb-subagent-gate` policy:

| Agent class | Hook / mode |
|-------------|-------------|
| Office deliverable agents (`word-*`, `ppt-creator`, `excel-creator`) | hook enabled; `block` |
| `accurate-agent` | hook enabled; `warn` |
| `quotation-agent` | hook enabled; MCP check **off**; knowledge Read gate **warn** (`quotation-agent:knowledge`) |
| `research-agent` | hook enabled; **warn** (MD + sources.jsonl evidence) |
| `wande-orchestrator` | off/no-op |

Do not re-enable quotation gate without a delegated route-b smoke proving `Agent(quotation-agent)` returns to the orchestrator without timeout.

## Deploy

```powershell
cd D:\Projects\claude-code-best
.\ccb-installer\scripts\deploy-ccb-skills.ps1 -VendorPptMaster -InstallPipDeps
.\ccb-installer\scripts\deploy-seed-agents.ps1
.\ccb-installer\scripts\deploy-seed-agents.ps1 -ForceMd

# Research toolstack (Base = exa only; Extended adds Scrapling)
.\ccb-installer\scripts\install-research-toolstack.ps1
.\ccb-installer\scripts\probe-research-capabilities.ps1
```

Target: `%LOCALAPPDATA%\CCB-Wanding\.claude\agents\`

- Existing user `.md` files are not overwritten unless `-ForceMd` is used or GBK corruption is detected.
- Sidecars are refreshed on each deploy.
- **Retired agents** listed in `retired-agent-ids.json` are **removed** from the live agents directory on every deploy (pass `--no-prune` to skip).
- **Dev mainline:** `start-dev-full.ps1` runs `deploy-seed-agents.ps1 -ForceMd` every launch (including `-SkipBootstrap`).

## Health

```powershell
.\ccb-installer\scripts\test-mcp-health.ps1 -Probe -Session
```

Expected essentials:

- `quotation-agent expected=[quotation,excel] actual=[quotation,excel]`
- `accurate-agent expected=[accurate] actual=[accurate]`
- `word-creator expected=[office-word] actual=[office-word]`
- `excel-creator expected=[excel] actual=[excel]`
- `research-agent expected=[exa] actual=[exa]` (Extended: `actual=[exa,scrapling]` when installed)
- `wande-orchestrator expected=[] actual=[]`

UTF-8 smoke:

```powershell
Get-Content "$env:LOCALAPPDATA\CCB-Wanding\.claude\agents\quotation-agent.md" -Encoding UTF8 -TotalCount 6
```

Chinese text must be readable, not mojibake.
