# Architecture / Business Boundary Refactor

> Consolidation note, 2026-07-11: this completed task has been absorbed into
> `../06-30-full-system-review/` as the architecture/business boundary baseline.
> Keep this directory as historical evidence and source material. Continue new
> system-review findings, backlog items, and roadmap updates in
> `06-30-full-system-review`.

## Goal

在功能不变的前提下，把代码按职责切清楚，让后续 AI 和人类维护者能快速判断：

- 哪些代码是软件架构、运行时、集成、打包、配置、传输。
- 哪些代码是业务规则、报价、库存、匹配、Agent/MCP 行为。
- 哪些代码只是 UI 渲染或应用状态编排。

## Problem

当前仓库同时包含 AionUI、AionCore fork、CCB-Wanding 集成补丁、installer、vendor、dist、MCP server、Python 业务逻辑、Web 前端、Trellis 文档和测试数据。很多目录的名字不能直接表达“系统层”还是“业务层”，AI 进入后容易：

- 把后端事件正确性补丁塞进前端 UI。
- 把业务报价逻辑混进 installer 或 route-b patch。
- 把 generated/vendor/dist 当成永久修改位置。
- 在小功能里继续扩大耦合。

## Boundary Model

### System / Architecture

负责运行时和平台能力：

- AionUI 到 aioncore 到 route-b 到 CCB-Wanding 的链路。
- IPC、HTTP、WebSocket、env、localStorage、settings、installer、sync、deploy。
- ACP session、permission、capability manifest、warmup、packaging。

### Business / Domain

负责产品和行业语义：

- 报价、库存、匹配、询价解析、Excel 填充。
- MCP tool 行为和稳定 error_code。
- Agent 业务角色、专业助手、业务知识数据。

### App / Composition

负责把 system 和 business 接起来：

- React app state。
- hooks 编排。
- 会话 API + WebSocket + store 的组合。

### UI

负责渲染和交互：

- React 组件、布局、输入框、消息气泡、侧边栏。
- 不直接拥有 endpoint、WebSocket 构造、localStorage key、运行时路径。

## Already Done

### Repo-wide map

Added:

- `.trellis/tasks/06-25-architecture-business-system-boundaries/boundary-map.md`

This document records top-level zones:

- Desktop shell / AionUI
- CCB integration and packaging
- CCB-Wanding backend runtime
- Business MCP and Python domain
- Operations and docs
- Generated/vendor/runtime payloads

### ccb-wanding-web reference layout

Refactored `ccb-wanding-web/src` from flat components/hooks/store/types into:

```text
src/
  app/
    App.tsx
    store.ts
    chat/
      useChatStream.ts
      useSessions.ts
  business/
    chat/
      sessionApi.ts
      types.ts
  system/
    config/runtime.ts
    identity/localUser.ts
    realtime/chatSocketClient.ts
  ui/
    chat/
    empty/
    shell/
```

Boundary guidance is centralized in:

- `.trellis/tasks/06-25-architecture-business-system-boundaries/boundary-map.md`

Behavior was kept the same:

- Session list/load/create/delete/rename still uses the same endpoints.
- WebSocket stream protocol still uses the same message types.
- Store state fields and UI behavior are preserved.

### ccb-installer boundary map

Boundary guidance is centralized in:

- `.trellis/tasks/06-25-architecture-business-system-boundaries/boundary-map.md`

The installer workspace is now explicitly split into:

- permanent integration patch inputs,
- repo-owned ACP helper source,
- build/deploy/sync/smoke automation,
- packaged defaults,
- generated outputs,
- vendored runtime payloads.

No runtime file moves were made in this phase. The goal was to make edit ownership obvious without breaking existing scripts, NSIS paths, or package assembly assumptions.

### MCP/Python business boundary map

Boundary guidance is centralized in:

- `.trellis/tasks/06-25-architecture-business-system-boundaries/boundary-map.md`

The MCP/Python area is now explicitly split into:

- MCP adapter packages (`mcp_servers/`),
- JSON-lines dispatch adapter (`python/main.py`),
- quotation business package (`python/quotation/`),
- inventory business package (`python/inventory/`),
- business data (`data/`).

No runtime code was moved in this phase. The goal was to prevent future changes from mixing protocol/process concerns with matching, pricing, inventory, and Excel-fill business behavior.

## Verification Completed

Commands run from `ccb-wanding-web`:

```powershell
.\node_modules\.bin\tsc.exe -b --pretty false
npm run build
```

Result:

- TypeScript passed.
- Vite production build passed.
- Non-blocking warning remains: `postcss.config.js` is reparsed as ESM because package module type is not declared.

## Next Plan

### Phase 2 - ccb-installer cleanup

Completed as a documentation and local-boundary pass. Runtime-critical files were not moved. Future work can incrementally separate:

- `patches/`: integration patch inputs.
- `scripts/`: build/deploy/sync/ops automation.
- `src/services/acp/`: source-level backend runtime code.
- `dist/`, `staging/`, `vendor/`: generated or packaged payloads.

Acceptance:

- An AI can tell permanent source from generated/runtime output.
- New permanent fixes are routed to source or patch input, not generated chunks.

### Phase 3 - MCP/Python business cleanup

Completed as a documentation and local-boundary pass. Runtime-critical files were not moved. Future work can incrementally clarify boundaries across:

- `mcp_servers/quotation-server`
- `python/quotation`
- `python/inventory`
- `data/`

Suggested target split:

- `business`: matching, pricing, quote assembly, fill/enrich, error contract.
- `system`: MCP stdio transport, process spawning, config resolution, file IO adapters.
- `tests`: regression cases grouped by business behavior and adapter behavior.

Acceptance:

- Business functions can be tested without MCP transport.
- MCP adapters become thin wrappers around business functions.

### Phase 4 - AionUI desktop touchpoints

Apply the same rule only when editing those areas:

- UI rendering stays in renderer components.
- IPC/process adapters stay in process/preload/bridge.
- CCB backend event correctness stays in CCB-Wanding producer code.
- Defensive frontend fixes must remain explicitly temporary.

Current repository finding:

- `packages/desktop/` is not present in this checkout.
- Local AionUI-related source is mainly `AionCore/` and `ccb-wanding-web/`.
- AionCore should be treated as system/backend service code: process manager, REST/WS APIs, DB, auth, work tasks, ACP metadata passthrough.
- AionCore must not absorb Wanding quotation/inventory business rules; those remain in `mcp_servers/`, `python/`, and `data/`.

Boundary guidance is centralized in:

- `.trellis/tasks/06-25-architecture-business-system-boundaries/boundary-map.md`

### Phase 5 - unrelated file cleanup

Add a cleanup pass after boundaries are documented. This must be audit-first, because the current worktree contains many unrelated tracked modifications and untracked files.

Cleanup candidates:

- generated/package artifacts: `dist/`, `staging/`, `out/`, release `.exe`, build reports,
- dependency payloads committed or copied into the workspace: `node_modules/`, vendored runtime directories,
- temporary/debug outputs: `_tmp/`, `$tmp/`, `*_output/`, `_tmp_*.txt`, generated scan/spec files,
- duplicate or stale docs that are superseded by Trellis/spec docs,
- local experiment files that should move to an archive or be ignored.

Required workflow:

1. Inventory candidates with path, size, tracked/untracked state, and likely owner.
2. Classify each item as `keep`, `archive`, `ignore`, or `delete`.
3. Update `.gitignore` only for repeatable generated outputs.
4. Delete only after classification is reviewed or clearly safe.
5. Re-run relevant build/test smoke after any deletion that could affect packaging or runtime.

Acceptance:

- A cleanup report exists before deletion.
- Generated/vendor/runtime payloads are not removed if current packaging scripts still require them.
- User or task-owned dirty changes are not reverted.
- `.gitignore` covers recurring clutter where appropriate.

## Non-Goals

- Do not rewrite the whole repo in one pass.
- Do not change product behavior as part of structural moves.
- Do not touch unrelated dirty worktree changes.
- Do not hand-edit generated dist/vendor payloads for permanent fixes.
- Do not delete ambiguous files during cleanup without first classifying ownership and risk.

## Acceptance Criteria

- [x] Repo-wide architecture boundary document exists.
- [x] `ccb-wanding-web` has a concrete reference layout.
- [x] `ccb-wanding-web` TypeScript passes.
- [x] `ccb-wanding-web` production build passes.
- [x] `ccb-installer` has a documented source/generated/vendor boundary.
- [x] MCP/Python business functions are clearly separated from transport/runtime adapters at the documentation/boundary level.
- [x] AionUI/AionCore touchpoints in this checkout are mapped at the documentation/boundary level.
- [x] Future touched frontend/backend files follow the same ownership model.
- [x] Unrelated-file cleanup audit report exists.
- [x] Safe cleanup actions are applied or explicitly deferred.
