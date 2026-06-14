# Electron Architecture & Source Tree

> Where the four Electron processes live, what runs in each, and the source tree beneath them.

---

## 1. Three-process architecture (Electron)

```
process (Node main)  ─IPC──▶  preload (bridge)  ─contextBridge──▶  renderer (React UI)
   ↑                                                                      │
   └──────────── reads / writes (via window.api / ipcRenderer.invoke) ────┘
```

| Process | What runs there | Trust level | Source location |
|---------|----------------|-------------|-----------------|
| **process** (Node main) | Windows, system APIs, aioncore launch, SQLite, MCP servers, auto-update, IPC handlers | Trusted | `packages/desktop/src/process/` |
| **preload** | Thin context bridge. Exposes a narrow `window.api` surface to renderer. Renderer can **only** call what's exposed here. | Trusted (sandboxed bridge) | `packages/desktop/src/preload/` |
| **renderer** | Browser-like React UI. **Cannot** import Node APIs. Talks to main via `window.api`. | Untrusted (sandbox) | `packages/desktop/src/renderer/` |
| **common** | Pure TypeScript shared between process and renderer (e.g., `chatLib.ts` dedup). No Node or DOM imports. | n/a | `packages/desktop/src/common/` |

**Why this matters for Claude Code:** AI can easily break the boundary (e.g., import `fs` from renderer → silent failure in dev, build failure in prod). See [`coding-rules.md`](./coding-rules.md) §1 (no Node imports in renderer).

---

## 2. Primary code (executable behavior)

Use ripgrep / `wc -l` to find the current entry point — file sizes below are illustrative, not load-bearing.

| Path | Role |
|------|------|
| `packages/desktop/src/index.ts` | Electron main-process entry |
| `packages/desktop/src/process/backend/binaryResolver.ts` | Resolves `aioncore.exe` path (bundled → system PATH) |
| `packages/desktop/src/process/startup/backendStartup.ts` | Wraps aioncore launch; captures failure |
| `packages/desktop/src/sentry.ts` | Sentry instrumentation |
| `packages/desktop/src/renderer/` | React UI: `main.tsx` + `pages/` + `components/` + `hooks/` + `services/` + `theme/` + `styles/` + `assets/` |
| `packages/desktop/src/renderer/index.html` | HTML entry |
| `packages/desktop/src/preload/main.ts` + 3 pet preload files | Secure IPC API exposed to renderer |
| `packages/desktop/src/common/` | Code shared between main + renderer |
| `packages/desktop/src/process/bridge/` | 12 IPC bridges (application, dialog, feedback, notification, systemSettings, theme, update, webui, windowControls + 3 helpers) |

---

## 3. `packages/web-host` — when to consider it

**Default: do not touch `packages/web-host/` for exe-only work.** It is a workspace dependency of `desktop` but is consumed as an embedded UI runtime, not edited in lockstep.

### Source vs install (verified 2026-06-12)

| Role | Path | What's there |
|------|------|--------------|
| **Source** | `D:\Projects\aionui-src\packages\web-host\` | `src/`, `tests/`, `tsconfig.json`, `vitest.config.ts` — TypeScript project |
| **Install slot** | `D:\aionui-web\aionui-web\` | `aionui-web.exe` (~98 MB), `bundled-aioncore/`, `static/`, `package.json` — built artifacts |

Parallel to the desktop flow: `packages/desktop` (source) → build → `D:\Projects\claude-code-best\AionUi\` (install). **Editing source alone does not change running behavior — rebuild and redeploy.**

### Exception — check it when

- Your change touches `packages/desktop/src/common/chat/`, `types/`, or `utils/`
- You suspect the same module is re-exported from `packages/web-host/`
- A QA report describes behavior that the desktop app **and** the web variant both show incorrectly

### How to verify

```sh
rg -l "<ModuleName>" packages/web-host/src 2>/dev/null
```

If a match exists, decide whether the web variant needs the same fix.

`packages/web-cli/` and `packages/mobile/` are independent and out of scope.

---

## 4. `builtinMcp` vs CCB-Wanding MCP — they do not conflict

| Source | What it ships with | Examples |
|--------|--------------------|----------|
| `packages/desktop/src/process/resources/builtinMcp/` | Generic AionUI MCP servers (run inside Electron main process) | `imageGenServer.ts` (image generation for any assistant) |
| `D:\CCB-Wanding\dist\…\mcp\…` | Business-specific CCB-Wanding MCP servers (run inside the Claude Code backend) | `quotation`, `accurate` inventory, etc. |

They run in **different processes** and **different lifecycles**; no port or namespace conflict. The decision rule:

- **Generic to AionUI** (any assistant user could want) → `desktop/.../builtinMcp/`
- **Specific to CCB-Wanding business** → CCB-Wanding's MCP layer (`D:\claude-code-B\src/.../mcp/`)

If unsure, ask: "would a non-CCB AionUI user benefit from this MCP server?" Yes → desktop. No → CCB-Wanding.

---

## 5. Build & tooling config (touch when needed, not casually)

| Path | Role | When to edit |
|------|------|--------------|
| `packages/desktop/electron.vite.config.ts` | vite + sentry + icon-park + path aliases + `build-mcp-servers` closeBundle hook | Adding path aliases, new vite plugins, new build steps |
| `packages/desktop/electron-builder.yml` | exe packaging (includes `bundled-aioncore` resources layout) | Changing packaging target, code signing, resources |
| `packages/desktop/package.json` | Declares `@aionui/web-host: workspace:*`; main = `../../out/main/index.js` | Rarely |
| `uno.config.ts` (repo root) | UnoCSS config | Theme changes, atomic CSS utilities |
| `package.json` (repo root) | All npm scripts (`dev` / `start` / `dist:win` / `lint` / `test` / `e2e`) | Adding new npm scripts |
| `playwright.config.ts` | E2E test config | Changing E2E setup |
| `justfile` | Task runner wrapping npm scripts | Adding `just` commands |
| `.oxlintrc.json` / `.oxfmtrc.json` | lint + format rules | Changing code-style rules |
| `bun.lock` | Dependency lock | Never edit by hand |
