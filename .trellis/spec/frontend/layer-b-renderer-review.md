# Layer B — Renderer loadability review

> **Companion to** [`coding-rules.md` §2](./coding-rules.md#2-ui-change-verification-checklist-run-before-declaring-done).  
> Applies when **any** `aionui-src/packages/desktop/src/renderer/**` file changes, especially Settings / Channels UI.

Layer A (semantic review) asks: *Is the logic correct and wired to the canonical contract?* — see [`../code-review-layer-a.md`](../code-review-layer-a.md).  
Layer B asks: *Will the module actually load in Electron/Vite without white-screening the route?*

**PASS requires Layer A** for picker/settings/routing changes.  
**PASS requires both Layer A and Layer B** for renderer UI work.

---

## When Layer B is mandatory

| Trigger | Examples |
|---------|----------|
| New or changed `.tsx` under `renderer/` | `WecomAibotExtensionPanel.tsx` |
| New named imports from icon libraries | `@icon-park/react`, `@heroicons/react` |
| Static import of a previously lazy module | `WebuiModalContent` → `ChannelModalContent` |
| Settings route content | `/settings/webui`, `/settings/capabilities`, etc. |

---

## Reviewer checklist (code-reviewer / trellis-check)

### B1 — Icon / third-party named exports

For every **new** symbol in:

```ts
import { Foo, Bar } from '@icon-park/react';
```

Do **one** of:

1. **Smoke verify** (preferred):

   ```powershell
   cd D:\Projects\aionui-src
   bun -e "import { Foo, Bar } from '@icon-park/react'; console.log('ok')"
   ```

2. **Reuse grep** — symbol already imported elsewhere in `packages/desktop/src`:

   ```powershell
   rg "Foo" D:\Projects\aionui-src\packages\desktop\src --glob "*.tsx"
   ```

**Do not** guess icon names from semantics (`Warning`, `PlugsConnected`, etc.). `@icon-park/react` typings do not prove export existence.

### B2 — Changed renderer module import smoke

For each changed `.tsx` / `.ts` under `renderer/`:

```powershell
cd D:\Projects\claude-code-best
$env:AIONUI_SRC = 'D:\Projects\aionui-src'
node scripts/review/smoke-renderer-imports.mjs --file D:\Projects\aionui-src\packages\desktop\src\renderer\path\to\Changed.tsx
```

Default mode verifies **icon named exports** (fast). Add `--full-module` for full bun import (slower; optional).

Or from git diff:

```powershell
node scripts/review/smoke-renderer-imports.mjs --git-diff
```

**FAIL review** if any smoke exits non-zero — even when Layer A logic looks correct.

### B3 — Static import blast radius

If a **lazy route entry** (e.g. `WebuiSettings`) now **static-imports** a heavy or risky subtree:

| Question | Action if yes |
|----------|----------------|
| Can one bad child module white-screen the whole settings page? | Require B2 on the full static chain **or** restore `React.lazy` for the child **or** add ErrorBoundary |
| Was lazy removed only to fix Suspense hang? | Prefer lazy + local Suspense boundary over eager static import |

See also [`coding-rules.md` §6](./coding-rules.md#6-ccb-shared-config-browser-safe-vs-main-only-split) (Node-in-renderer white screen).

### B4 — Evidence in review verdict

Review PASS must cite Layer B output, e.g.:

```
Layer B PASS
  script: node scripts/review/smoke-renderer-imports.mjs --file .../WecomAibotExtensionPanel.tsx
  output: OK packages/desktop/src/renderer/.../WecomAibotExtensionPanel.tsx
  icons: LinkOne, Caution @icon-park/react verified
```

Record in task `check.jsonl` when applicable:

```json
{"check":"renderer-layer-b-smoke","result":"pass","note":"smoke-renderer-imports.mjs --file ... PASS"}
```

---

## code-reviewer Custom Instructions (copy-paste)

```text
Layer A (universal): read .trellis/spec/code-review-layer-a.md when diff touches pickers, settings bindings, or routing identity.
  FAIL if canonical path reused incorrectly, multi-surface parity broken, identity vs capability confused, or persist-read chain untraced.

Layer B mandatory for aionui-src packages/desktop/src/renderer/** changes:
1. Read .trellis/spec/frontend/layer-b-renderer-review.md
2. Run: node scripts/review/smoke-renderer-imports.mjs --git-diff (or --file per changed tsx)
3. FAIL if smoke fails or new @icon-park/react names lack bun import proof
4. Include Layer A rule ids + Layer B command output in verdict
```

---

## Incident reference (2026-07-07)

Settings → **远程连接** white screen:

- `WecomAibotExtensionPanel` imported non-existent `PlugsConnected`, `Warning` from `@icon-park/react`
- Static chain: `WebuiModalContent` → `ChannelModalContent` → panel
- Layer A code-review PASS did not run module import smoke
- Fix: `LinkOne` + `Caution`; add Layer B gate (this doc)
