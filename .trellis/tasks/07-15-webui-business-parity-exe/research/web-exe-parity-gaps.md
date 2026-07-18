# Research — WebUI vs exe business gaps (2026-07-15)

## User doctrine

- **UI 壳可以不一样**（Mixing 网页布局 ≠ Electron exe）
- **已配置的业务逻辑必须复刻**：助手目录、知识库、价格库、供应商、记忆（若 exe 侧已启用）

## Root cause (not "different SPA")

Same Mixing React Sider/routes. Web fails because **host bootstrap plane is Electron-only**:

| Gate | Desktop | WebUI today |
|------|---------|-------------|
| Org sider 知识库/价格库/供应商 | `window.__orgServerUrl` via preload | unset → `OrgDatabaseSiderSection` returns null |
| `ccbAuthorityActive` | IPC `ccb.model.isAuthorityActive` | no electronAPI → false |
| Assistants catalog | IPC `ccbAgentsService.listAgents` (disk agents) | falls back `GET /api/assistants` (may miss WanD seed set) |
| Memory | Sider `visible={ccbAuthorityActive}` + IPC memory APIs | hidden + IPC missing |

## Primary files

- `aionui-src/packages/desktop/src/common/adapter/orgHttpBridge.ts` — `isOrgServerConfigured` / `__orgServerUrl`
- `aionui-src/packages/desktop/src/renderer/components/layout/Sider/OrgDatabaseSiderSection.tsx`
- `aionui-src/packages/desktop/src/renderer/hooks/agent/useCcbModelInfo.ts` — `useCcbAuthorityActive`
- `aionui-src/packages/desktop/src/common/assistants/fetchAssistantsCatalog.ts`
- `aionui-src/packages/desktop/src/preload/main.ts` — injects `__orgServerUrl`
- `aionui-src/packages/web-host/` — browser host (no preload inject today)
- Routes: `Router.tsx` `/org-knowledge` `/price-library` `/suppliers` `/memory`

## Related

- Access task: `07-14-web-1-1-9-apple-access` (Tailscale + WebUI enable) — **prerequisite**
- Spec: `.trellis/spec/frontend/dev-test-ship.md` (web-host ≠ desktop entry)
- Spec: `.trellis/spec/code-review-layer-a.md` (assistant picker identity)

## Sources

- Explore agent aafef2e1-76fe-481d-a0c0-e17ff6cc24f1
- Live user screenshots: Mixing WebUI missing org DB group vs exe
