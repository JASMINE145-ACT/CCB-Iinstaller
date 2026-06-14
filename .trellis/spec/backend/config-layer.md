# Config Layer

> Where CCB-Wanding reads business MCP, MiniMax env, and Wanding knowledge — separate from official Claude.

---

## Two Claude configs (never mix)

| Profile | Path | Use |
|---------|------|-----|
| **CCB-Wanding** | `%LOCALAPPDATA%\CCB-Wanding\.claude\` | MiniMax, quotation MCP, Wanding CLAUDE.md |
| **Official Claude** | `C:\Users\m1774\.claude\` | Claude Pro — do not modify for CCB work |

Route B sets `CLAUDE_CONFIG_DIR` to the CCB path for the ACP child process only.

---

## `settings.json` (CCB-Wanding)

**Live file:** `%LOCALAPPDATA%\CCB-Wanding\.claude\settings.json`

**Installer template:** `ccb-installer/resources/settings/settings.json`

**Bootstrap script:** `ccb-installer/scripts/ensure-wanding-settings.ps1` — writes quotation MCP args, env, Wanding data paths into install + user config.

Typical blocks:

| Key | Purpose |
|-----|---------|
| `env` | `ANTHROPIC_BASE_URL`, `ANTHROPIC_AUTH_TOKEN`, model overrides |
| `mcpServers.excel-mcp` | `D:\CCB-Wanding\vendor\mcp-servers\excel-mcp\mcp-excel.exe` |
| `mcpServers.quotation` | Bun spawns `vendor/mcp-servers/quotation-server/dist/index.js` (`command`: bundled `bun.exe`, `args`: dist entry); env: `DATA_DIR`, `CCB_PROJECT_ROOT`, etc. |
| `mcpServers.accurate` | Python Accurate MCP under `D:\CCB-Wanding\vendor\mcp-servers\` |
| `mcpServers.exa` | Optional search MCP (installer default) |

Schema reference in source: `D:\claude-code-B\src\utils\settings\types.ts` (`mcpServers`).

---

## Business knowledge files

| File | Role |
|------|------|
| `D:\CCB-Wanding\vendor\wanding\data\ccb-wanding-quotation.md` | Quotation business rules |
| `D:\CCB-Wanding\vendor\wanding\data\wanding_business_knowledge.md` | General Wanding context |
| `*.xlsx` in same folder | Price / mapping tables for MCP tools |

Copied / referenced by `ensure-wanding-settings.ps1` and quotation MCP `DATA_DIR`.

---

## `CLAUDE.md`

- CCB project instructions: `%LOCALAPPDATA%\CCB-Wanding\.claude\CLAUDE.md`
- Source index (same content block): `D:\CCB-Wanding\vendor\wanding\data\ccb-wanding-claude-index.md`
- **Knowledge layering** (memory / SOP / code): see index §「知识分层」— user corrections must hit memory first; SOP §5 only after org-wide confirmation.
- Loaded by CCB config system on `--acp` startup (`enableConfigs()`)

Do not merge Wanding instructions into official `C:\Users\m1774\.claude\CLAUDE.md`.

---

## Environment variables

| Variable | Set by | Notes |
|----------|--------|-------|
| `CLAUDE_CONFIG_DIR` | route-b launcher | Must point to CCB-Wanding `.claude` |
| `ANTHROPIC_BASE_URL` | settings `env` | MiniMax endpoint for CCB |
| `ANTHROPIC_AUTH_TOKEN` | settings `env` | CCB API key |
| `CCB_PROJECT_ROOT` | quotation MCP config | Repo / data root for tools |

**Anti-pattern:** `setx ANTHROPIC_*` at user level — pollutes official Claude sessions.

---

## When to edit what

| Change | Edit |
|--------|------|
| New MCP server entry | `settings.json` + spawn script if installer default |
| MiniMax key / URL | `settings.json` `env` only |
| Quotation tool data paths | `mcp_servers/quotation-server/dist/config.js` + Wanding `data\` |
| Installer first-run defaults | `ensure-wanding-settings.ps1` + `resources/settings/` |

After settings-only changes: restart ACP child (AionUI new chat or aioncore restart). No `bun run build` unless TypeScript spawn logic changed.
