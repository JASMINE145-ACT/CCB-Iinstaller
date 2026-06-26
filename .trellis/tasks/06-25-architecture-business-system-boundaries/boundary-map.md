# Architecture Boundary Map

This task keeps architecture/business boundary knowledge in Trellis. Source trees should contain code; broad explanatory docs live here unless an existing project spec requires otherwise.

## Top-Level Zones

| Zone | Path | Owns | Do not put here |
| --- | --- | --- | --- |
| Desktop shell / AionUI | external `packages/desktop/`, local `AionCore/`, `ccb-wanding-web/` | UI, local app state, IPC/HTTP client boundaries, aioncore integration | Quotation/inventory business rules, MCP tool internals |
| CCB integration and packaging | `ccb-installer/patches/`, `ccb-installer/scripts/`, `ccb-installer/resources/` | route-b patch, installer, deployment, sync, runtime config templates | Business matching logic, renderer-only UX behavior |
| CCB-Wanding backend runtime | `ccb-installer/src/services/acp/`, upstream `D:\claude-code-B\src/` | ACP sessions, command capability manifest, permissions, backend event production | Frontend rendering fallback unless explicitly defensive |
| Business MCP and Python domain | `mcp_servers/`, `python/inventory/`, `python/quotation/`, `data/` | Quotation, inventory, matching, fill/enrich, business knowledge/data | UI state, launcher policy, package build decisions |
| Operations and docs | `.trellis/`, `docs/`, `spec/`, `eval/` | Architecture contracts, tasks, runbooks, regression cases | Runtime source-of-truth code |
| Generated/vendor/runtime payloads | `ccb-installer/dist/`, `ccb-installer/staging/`, `ccb-installer/vendor/`, `node_modules/`, `*_output/` | Build outputs and third-party payloads | Hand-authored permanent fixes |

## Business vs System Rule

Business code answers product/domain questions:

- Which product or price row matches an inquiry?
- How should quotation fields be extracted, enriched, and filled?
- Which specialist agent or MCP tool should handle a task?
- What stable business error code should be returned?

System code answers architecture/runtime questions:

- How does AionUI reach aioncore or CCB-Wanding?
- Which process owns the WebSocket, IPC channel, env var, config file, or installer step?
- How are sessions warmed up, rebuilt, deployed, synced, or packaged?
- How does the UI present a state it already received?

If a module needs both, split it into:

1. a `system` adapter for transport/config/process work,
2. a `business` module for domain decisions and contracts,
3. an `app` or integration layer that wires them together.

## ccb-wanding-web Reference Split

`ccb-wanding-web/src/` is the first cleaned-up reference structure:

| Path | Role |
| --- | --- |
| `src/system/` | runtime config, local identity, WebSocket client |
| `src/business/chat/` | chat/session types and HTTP API behavior |
| `src/app/` | React composition, app store, orchestration hooks |
| `src/ui/` | React rendering and interaction surfaces |

## AionUI / AionCore Boundary

The full AionUI Electron desktop renderer path referenced by Trellis specs (`packages/desktop/`) is not present in this repository checkout. Treat it as an external or separately checked-out source tree unless it appears in the current worktree.

Local AionUI-related code in this repository is mainly:

| Path | Role |
| --- | --- |
| `AionCore/` | Rust process manager and backend services used by AionUI |
| `AionCore/crates/aionui-api-types/` | shared API/request/response types across aioncore services |
| `AionCore/crates/aionui-ai-agent/` | ACP/session agent orchestration and passthrough behavior |
| `AionCore/crates/aionui-work-tasks/` | work-task business/system service inside AionCore |
| `AionCore/crates/aionui-auth/` | auth and work-task role user data |
| `AionCore/crates/aionui-db/` | database schema and migrations |
| `AionCore/crates/aionui-mcp/` | generic AionUI MCP functionality |
| `AionCore/crates/aionui-system/`, `aionui-runtime/`, `aionui-realtime/`, `aionui-shell/` | system/process/runtime/realtime/shell services |
| `ccb-wanding-web/` | lightweight web UI/reference frontend split |

Routing rules:

1. Renderer UI behavior belongs in AionUI desktop renderer source when that source tree is available; do not patch AionCore or CCB-Wanding for pure rendering issues.
2. AionCore owns process/backend services, REST/WS APIs, DB, auth, work tasks, and ACP metadata passthrough. It should not own Wanding quotation/inventory business rules.
3. Work-task behavior is AionCore domain/service code, not CCB-Wanding MCP business logic.
4. ACP event correctness from CCB-Wanding still belongs in CCB-Wanding backend source; AionCore should pass through contract fields, not paper over producer bugs.
5. Keep generated `AionCore/target/` out of architecture decisions and cleanup only as build output.

Use the same naming when cleaning other areas:

- `system`: adapters, transports, process/config/runtime concerns.
- `business`: domain rules, contracts, use-case behavior.
- `app`: composition and state wiring.
- `ui`: rendering.

## CCB Installer Boundary

`ccb-installer/` is an integration and packaging workspace, not a business-domain package.

| Path | Role |
| --- | --- |
| `patches/` | permanent integration patch inputs |
| `src/services/acp/` | repo-owned ACP helper source |
| `src/ccb-runtime/`, `src/serve-wanding/`, `src/ccb-api-server/`, `src/ccb-acp-agent/` | legacy runtime source retained for compatibility/tests |
| `scripts/` | build, deploy, sync, smoke, repair, update automation |
| `lib/` | shared automation helpers |
| `resources/`, `config/`, `seed/` | packaged defaults and templates |
| `tests/`, `test-*.mjs`, `test-*.ps1` | smoke and regression entry points |
| `dist/`, `staging/`, `out/`, `vendor/`, `*.exe` | generated or vendored payloads, not permanent edit targets |

Routing rules:

1. ACP/MCP/session correctness belongs in CCB-Wanding backend source, not UI or generated chunks.
2. route-b launch/env/policy belongs in `patches/aionui-ccb-route-b/`, then sync with `scripts/sync-aionui-ccb-route-b.ps1`.
3. Installer contents and default packaged config belong in `resources/`, `config/`, `seed/`, and NSIS scripts.
4. Runtime packaging behavior belongs in `scripts/` and `installer*.nsi`.
5. Business logic belongs in `mcp_servers/`, `python/`, and `data/`, not under `ccb-installer/`.

Generated payload rule: if you are tempted to edit `dist/`, `staging/`, `out/`, `vendor/`, or a release `.exe`, stop and find the source. Emergency generated edits must be documented as temporary and backported to source before being treated as complete.

## MCP / Python Business Boundary

The MCP/Python area is a thin adapter plus business-domain packages.

| Path | Role |
| --- | --- |
| `mcp_servers/` | MCP adapters, tool schemas/metadata, transport, process invocation |
| `mcp_servers/quotation-server/` | quotation MCP adapter; currently ships a prebuilt `dist/` package |
| `mcp_servers/work-tasks-query-server/` | read-only MCP access to work-task data |
| `python/main.py` | JSON-lines adapter/dispatcher used by quotation MCP |
| `python/system/` | runtime/system adapters shared by Python entrypoints, such as workspace output paths and MCP error normalization |
| `python/system/tool_dispatch.py` | MCP JSON tool dispatch, adapter parameter coercion, top-level request error wrapping |
| `python/system/workspace_paths.py` | workspace path resolution shared by tool execution |
| `python/quotation/` | quotation business rules, parsing, fill/enrich, Excel behavior |
| `python/quotation/fill_dispatch.py` | fill_quotation_sheet business tool parameter aliases, direct/flow fill branching, and fill result mode metadata |
| `python/quotation/fill_items.py` | direct-fill row normalization, selected-row enrichment, and deterministic fill candidate ranking |
| `python/quotation/excel_edit.py` | generic Excel cell/range edit tool behavior and A1 cell-reference parsing |
| `python/quotation/excel_io.py` | shared Excel writable-path and workbook-save helpers |
| `python/quotation/layout.py` | quotation template layout dataclass and standard Lingwei/VANTSING column maps |
| `python/quotation/match_dispatch.py` | match_quotation, match_quotation_batch, and match_price_and_get_inventory business tool parameter aliases and branching |
| `python/quotation/parse_dispatch.py` | parse_excel_smart business tool parameter aliases and quotation parsing call dispatch |
| `python/quotation/selection_payloads.py` | match selection payload shape, price+inventory multi-candidate selection payloads, clarification tool dispatch/payloads, candidate caps, knowledge-source pointer, and batch quotation continuation payload |
| `python/quotation/template_paths.py` | quotation template discovery, fill output default naming, and workspace-aware output path coercion |
| `python/quotation/tool_adapter.py` | OpenAI-style quotation tool execution adapter and response envelope normalization |
| `python/quotation/tool_schema.py` | OpenAI-style quotation tool schema metadata, access/risk metadata, and tool parameter schemas |
| `python/inventory/` | inventory matching, resolver services, stock tools, Accurate behavior |
| `python/inventory/services/inventory_dispatch.py` | get_inventory_by_code, get_inventory_by_code_batch, and search_inventory business tool parameter aliases and inventory Agent branching |
| `python/inventory/services/inventory_payloads.py` | inventory lookup/search result normalization, no-credential/no-data payloads, and batch response stats/formatting |
| `python/admin/` | org knowledge repository/client/cache helpers |
| `python/admin/org_knowledge_dispatch.py` | append_business_rule tool parameter aliases, confirmation coercion, and org knowledge write dispatch |
| `python/admin/org_knowledge_payloads.py` | org knowledge write confirmation payloads and defaults |
| `data/` | Wanding business knowledge and pricing/mapping data |

MCP adapters own:

- MCP server startup,
- tool schema/metadata,
- stdio/http transport,
- Python process invocation,
- error wrapping for MCP clients.
  In Python, JSON-lines stdin/stdout belongs in `python/main.py`; tool dispatch and request normalization belong in `python/system/tool_dispatch.py`.

Business packages own:

- inquiry and Excel parsing,
- fill_quotation_sheet business tool routing and confirmed-fill guards,
- quotation match business tool routing and match parameter aliases,
- product/spec extraction,
- quotation parse tool routing and parse parameter aliases,
- price-library and fuzzy matching,
- match selection, price+inventory selection, clarification tool routing, clarification payloads, and batch continuation payloads,
- quotation template discovery, fill output filenames, and quotation output path defaults,
- quotation template layout definitions and column maps,
- generic Excel editing behavior that is exposed as a quotation tool but is not quote-fill business logic,
- shared Excel I/O helpers used by quotation and generic edit tools,
- quotation tool execution adapters and tool response envelopes,
- quotation tool schema metadata and OpenAI function declarations,
- locked line and fill item behavior,
- VANTSING row/header safety,
- inventory business tool routing and inventory parameter aliases,
- inventory resolver services,
- Accurate stock/inventory behavior.
  Inventory result and search payload builders belong under `python/inventory/services/`; `python/main.py` should not keep business compatibility aliases.
- organization knowledge write confirmation payloads, confirmation coercion, and write dispatch.

Business functions should remain testable without MCP stdio. MCP adapters should be thin wrappers around Python business modules.

`python/main.py` is an entrypoint, not the domain model. It owns JSON-lines stdin/stdout, encoding setup, and packaged path bootstrap. Shared runtime adapter utilities should live under `python/system/`; root-level compatibility adapter files should be removed once callers are migrated.

## Cleanup Notes

Likely generated/debug artifacts that require audit before deletion:

- `__pycache__/`, `.pytest_cache/`
- `test_output/`
- `_tmp_*.txt`
- `_test_*.xlsx`
- `*_report.json` when reproducible from tests
