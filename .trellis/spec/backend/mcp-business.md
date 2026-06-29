# MCP Business Layer (Quotation + Inventory)

> Wanding quotation/inventory logic — **not** ACP wiring (see [`acp-session-flow.md`](./acp-session-flow.md)) and **not** AionUI UI (see [`../frontend/index.md`](../frontend/index.md)).

---

## Scope

| In scope | Out of scope |
|----------|--------------|
| `mcp_servers/quotation-server/` | `D:\claude-code-B` ACP session |
| `python/inventory/`, `python/quotation/` | route-b patch |
| Wanding `*.xlsx` / markdown data | Official Claude config |

---

## Quotation MCP tools (verified from `dist/index.js` — 2026-06-29)

| Tool | Purpose |
|------|---------|
| `match_quotation` | Natural-language product → candidates (`keywords`, `customer_level`) |
| `match_quotation_batch` | Multiple keywords in one call (≤50) |
| `get_inventory_by_code` | Stock by product code |
| `get_inventory_by_code_batch` | Up to 50 codes |
| `fill_quotation_sheet` | Write matched lines to Excel | Default: VANTSING blank template, IDR, today; inherit session match — see [`agents-unified-model.md`](../integration/agents-unified-model.md) § Quotation sheet fill defaults |
| `parse_excel_smart` | Parse uploaded quotation sheet |
| `ask_clarification` | Multi-match disambiguation payload (agent uses assistant text, not AskUserQuestion) |
| `get_product_price_tiers` | All non-zero price tiers for one code (org price library) |
| `append_business_rule` | Append confirmed rule to org `wanding_business_knowledge` (not local shadow) |

**Not MCP-exposed (agent must not call):**

| Name | Status |
|------|--------|
| `match_price_and_get_inventory` | **Retired from agent surface 2026-06-29** — never in `index.js`; L1 routes price+stock via `match_quotation` → `get_inventory_by_code`. Internal Python still used by fill flow. See [`agents-unified-model.md`](../integration/agents-unified-model.md) § Quotation price+stock routing. |
| `search_inventory` | Not in current `index.js`; maint may reference for legacy — use `match_quotation` → `get_inventory_by_code` until re-registered. |

Model-facing names in session: `mcp__quotation__<tool>` (e.g. `mcp__quotation__match_quotation`).

---

## File map

Path lookup: [`file-map.md`](./file-map.md) §3 (MCP business servers). **Currently shipped as prebuilt `quotation-server/dist/`** — no `src/` sibling in this repo.

---

## Config (how MCP is spawned)

Live spawn config: `%LOCALAPPDATA%\CCB-Wanding\.claude\settings.json` → `mcpServers.quotation`.

Installer default: `ccb-installer/scripts/ensure-wanding-settings.ps1`.

See [`config-layer.md`](./config-layer.md).

---

## Dev / test loop

### 1. MCP-only smoke (no AionUI)

```powershell
cd D:\Projects\claude-code-best\ccb-installer
node test-runtime-mcp.mjs
# Expect: quotation connected, tools.length > 0
```

### 2. Full ACP + quotation tool loop

```powershell
$env:CCB_TEST_PROMPT = "查询直接50价格"
node ccb-installer/test-native-acp-agent.mjs
# Any non-empty prompt works; longer "…必须使用报价工具" also OK (explicit tool nudge)
```

### 3. Python unit tests

```powershell
cd D:\Projects\claude-code-best\python
python -m pytest inventory/ -q
```

### 4. Wanding E2E (install + data)

```powershell
cd D:\Projects\claude-code-best\ccb-installer\scripts
.\smoke-wanding-e2e.ps1 -InstallDir D:\CCB-Wanding
```

---

## Symptom → layer

| Symptom | Likely layer | Fix |
|---------|--------------|-----|
| `No such tool available: match_price_and_get_inventory` | L1 / maint prompt drift | Agent prompt recommends unregistered tool — see [`agents-unified-model.md`](../integration/agents-unified-model.md) § Quotation price+stock routing; `deploy-seed-agents.ps1 -ForceMd`; new Guid session |
| Tool returns wrong candidates | MCP / Python / data xlsx | This doc + `python/inventory` |
| Tool not in model's tool list | ACP / `$buildMcp` | [`route-b-status.md`](./route-b-status.md), [`source-migration-mcp.md`](./source-migration-mcp.md) |
| Tool runs but UI doesn't show result | AionUI renderer | [`../frontend/chat-acp-flow.md`](../frontend/chat-acp-flow.md) |
| `accurate` pricing wrong | `D:\CCB-Wanding\vendor\mcp-servers\accurate-mcp\` | settings + Accurate server |

---

## Related

- Backend entry: [`index.md`](./index.md)
- File lookup: [`file-map.md`](./file-map.md) §3
- Live MCP registration: [`route-b-status.md`](./route-b-status.md)
