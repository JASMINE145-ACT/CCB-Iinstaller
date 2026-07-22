# Frontend Coding Rules

> Code-level rules for AionUI frontend. **Read this before writing any non-trivial renderer / process code.** If a rule is broken by a code generation, reject the change.

---

## 1. Hard rules (enforced by review, not by tooling)

1. **Renderer code must not import Node APIs** — no `fs`, `path`, `child_process`, `os`, `net`, etc. Renderer talks to main **only** through `window.api`.
2. **New IPC APIs must be typed in `common/` and exposed through `preload/main.ts`** — never call `ipcRenderer.invoke` directly from a component.
3. **Message merge semantics live in two places — change BOTH together**:
   - `common/chat/chatLib.ts#composeMessage` — base impl (exported, used for `tool_group`)
   - `Messages/hooks.ts#composeMessageWithIndex` — O(1)-indexed local wrapper (used for everything else)
   - Entry: `hooks.ts#useAddOrUpdateMessage`
   - See `chat-acp-flow.md` §2. If you only change one, `tool_group` and other types diverge in dedup/merge behavior.
4. **Do not create duplicate state for chat messages in components** — read from the chat state, do not mirror it into component-local state. If you need a derived value, use a hook.
5. **Keep message-rendering components mostly presentational** — they receive props and render. No `useEffect` for business logic, no async fetches, no state transitions.
6. **Avoid business logic inside TSX components** — if a component is doing more than rendering + local UI state, extract to a hook or service.
7. **Use hooks for side effects and state transitions** — `useEffect` for I/O, `useState` for local UI, `useReducer` for complex state machines.
8. **Use `common/types` for shared event payloads** — never inline-type a chat event in a component. Type it once in `common/types/platform/acpTypes.ts`.
9. **Add fallback UI for unknown ACP event types** — render the raw JSON in a `<details>` block, do not throw or hide. Future backend changes are debuggable this way.
10. **All defensive fixes must carry `// TODO(defensive): ccb-wanding#<id>`** — see `../integration/defensive-fix-policy.md`.

---

## 2. UI change verification checklist (run before declaring done)

For every non-trivial frontend change, mentally walk this list. **Layer A** (semantic / data-source parity) is in [`../code-review-layer-a.md`](../code-review-layer-a.md). **Layer B** (renderer module loadability) is in [`layer-b-renderer-review.md`](./layer-b-renderer-review.md).

```
- [ ] Layer A (picker / settings / routing identity) — see code-review-layer-a.md:
        A1 canonical path reused (not narrower duplicate fetch)
        A2 multi-surface parity if same user decision exists elsewhere
        A3 identity vs capability — persist profile id when consumer routes on it
        A4 persist ↔ read symmetry traced
        A5 mapper/restore test or backend cite — not "dropdown renders" alone
- [ ] Does this change belong to renderer, preload, process, or common?
        (See electron-architecture.md §1)
- [ ] Does it introduce new IPC? If yes, are preload + bridge + type definitions updated?
        (preload/main.ts + process/bridge/<name>Bridge.ts + common/adapter/ipcBridge.ts)
- [ ] Does renderer import any Node-only module? It must not.
- [ ] Does the change affect ACP event shape? If yes, backend must be updated too.
        (See ../integration/aionui-ccb-boundary.md)
- [ ] Does it affect chat message merging? If yes, update chatLib.ts tests.
- [ ] Does it require route-b sync? If yes, run sync-aionui-ccb-route-b.ps1.
- [ ] Does it require aioncore restart? If yes, kill old aioncore first.
- [ ] Can the change be verified in bun run dev? (not webui — see dev-test-ship.md §1)
- [ ] For chat UI fixes: three dev scenarios pass before dist:win? (dev-test-ship.md §5)
- [ ] Is the change covered by a unit test? (bun test)
- [ ] Does lint pass? (bun run lint, bun run format:check)
- [ ] Does full TypeScript pass? (`cd D:\Projects\aionui-src && bunx tsc --noEmit -p tsconfig.json`) — required before `dist:win` / PR
- [ ] Slash menu change? If yes, agent commands come from ACP — use `mergeSlashCommands`, do not override backend names in SendBox builtins
- [ ] Layer B (renderer loadability) — see layer-b-renderer-review.md:
        NEW @icon-park/react icons: bun import verify or grep existing usage
        Changed renderer files: node scripts/review/smoke-renderer-imports.mjs --file <path>
        Static import under lazy route: document blast radius or re-lazy / ErrorBoundary
        Review verdict must include Layer B command output
```

If any answer is unclear, stop and clarify before merging.

---

## 3. Task template: adding a new IPC channel

```
1. Add the request / response type in common
   - In common/types/<domain>.ts (or extend existing)
   - Both sides of the channel must use the same type

2. Expose method in preload
   - In preload/main.ts
   - window.api.<namespace>.<method> = (args) => ipcRenderer.invoke('<channel>', args)
   - Type the args + return

3. Add bridge handler in process
   - In process/bridge/<name>Bridge.ts
   - Register handler for '<channel>' that returns the result

4. Register bridge (if new file)
   - In common/adapter/ipcBridge.ts
   - Add the channel name to the registry

5. Call through window.api from renderer
   - const result = await window.api.<namespace>.<method>(args)
   - Never call ipcRenderer.invoke directly

6. Add error handling
   - Bridge handler should return { ok: true, data } or { ok: false, error }
   - Caller checks result.ok before using result.data
   - Use assertBridgeSuccess.ts helper (in platforms/) to narrow the type

7. Test
   - Add a mock for the bridge in renderer test
   - Add a test for the bridge handler in process test
```

---

## 4. Task template: writing a new message-rendering component

This template covers the **render-side** of a new message type. For the **type/normalizer/dispatcher/fallback** side (steps 1, 2, 4, 5 of the cross-layer flow), see [`chat-acp-flow.md` §4](./chat-acp-flow.md#4-task-template-adding-a-new-chat-message-type).

```
1. Receive props only — do not call useChat / useMessages directly
2. Pure render: given props, return JSX
3. Local UI state only (e.g., expanded/collapsed, hover)
4. No useEffect for data fetching — that's the parent's job
5. Style with UnoCSS atomic classes (or theme tokens)
6. Wrap unknown ACP fields in <details> for fallback
7. Add a Storybook-style fixture or unit test if non-trivial

Bad pattern (do not copy):
  const [messages, setMessages] = useState<Message[]>([])  // duplicate state
  useEffect(() => { fetchMessages().then(setMessages) }, [])  // business logic in component
  if (message.type === 'tool_call') return <ToolCall ... />  // special-casing outside dispatcher

Good pattern:
  function MessageToolCall({ message }: { message: ToolCallMessage }) {
    const [expanded, setExpanded] = useState(false)
    return <div onClick={() => setExpanded(!expanded)}>...</div>
  }
```

---

## 5. When the rules conflict

If two rules conflict (e.g., "share state in common" vs "don't add code to common for one component"), prefer:

1. **The rule that prevents cross-process leakage** (no Node in renderer, single source of truth in chatLib)
2. **The rule that prevents duplicate state** (single source of truth for messages)
3. **The rule that's enforced by tooling** (lint, typecheck) over one enforced by review

If still unclear, ask before merging.

---

## 6. CCB shared config: browser-safe vs main-only split

**Problem:** CCB-Wanding integration added helpers under `common/config/` that both main and renderer need. Putting `node:fs` in the same file as shared logic causes **Electron white screen** — Vite bundles the import graph for renderer and crashes on `fs`.

**Convention:** For any `common/config/ccb*.ts` module:

| Suffix / file | Contains | Imported by |
|---------------|----------|-------------|
| `*Shared.ts` or base file without fs | Pure functions, types, string paths | renderer + main |
| `*Node.ts` or full migration file | `existsSync`, `readFile`, spawn, backup | process / bridge only |

**Existing splits (2026-06-13; updated 2026-07-03):**

- `ccbWandingRuntime.ts` ↔ `ccbWandingRuntimeNode.ts`
- `ccbConfigMigrationShared.ts` ↔ `ccbConfigMigration.ts`
- `ccbMcpSettings.ts` — main-only; renderer uses `ccbMcpBridge` IPC
- `ccbSkills.ts` — main-only; renderer uses `ccbSkillsService` IPC (`ccbSkillsBridge.ts`)
- `ccbMcpHealthShared.ts` ↔ `ccbMcpHealth.ts` — **types + `collectCcbMcpHealth*`** in Shared; fs/spawn/probe in main-only module. `ccbMcpHealthDiagnosis.ts` must import collectors from Shared, never from `ccbMcpHealth.ts`, or any renderer importing `buildMinimaxPromptForReport` will pull `node:fs` (Settings → 能力扩展 white screen — see [`dev-test-ship.md` §8 Wave 4](./dev-test-ship.md#8-white-screen-playbook-白屏纠错路线))

**Settings → 能力扩展:** route `#/settings/capabilities` merges Skills + Tools tabs. Do **not** statically import `ToolsModalContent` in the page shell — use `React.lazy` + `Suspense` so the skills tab does not eagerly load the MCP health graph.

**Check before merge:**

```powershell
rg "node:fs|node:path|child_process" D:\Projects\aionui-src\packages\desktop\src\common\config\
# Then trace: is any renderer file (directly or via common/) importing a hit?
rg "ccbConfigMigration[^S]|ccbWandingRuntimeNode|ccbMcpSettings|ccbSkills|from '@/common/config/ccbMcpHealth'" D:\Projects\aionui-src\packages\desktop\src\renderer\
# ccbMcpHealth.ts is main-only — renderer may import types from ccbMcpHealthShared.ts only
```

**IPC pattern when renderer needs disk truth:** expose read/write/probe on `process/bridge/*Bridge.ts`, register in `ipcBridge.ts`, call from renderer hook — same as `ccbMcpService.isAuthorityActive`.

**ipcBridge import pattern (2026-06-14):** `common/index.ts` re-exports `export * as ipcBridge from './adapter/ipcBridge'`. Renderer code that needs the namespace must use `import { ipcBridge } from '@/common'`. Files under `common/config/` imported by renderer must use **named** exports from `@/common/adapter/ipcBridge` (e.g. `acpConversation`), never `import { ipcBridge } from '@/common/adapter/ipcBridge'` — esbuild fails and causes white screen. See [`dev-test-ship.md` §8 Wave 3](./dev-test-ship.md#8-white-screen-playbook-白屏纠错路线).

---

## 7. Server-validated identity fields (org / auth forms)

When the backend enforces username/password (or similar) rules (e.g. AionCore `validate_username` / `validate_password`):

1. **Show the rules in the form** — `Form.Item` `extra` (or equivalent help text), not only a toast after submit.
2. **Blur validate** client-side with the same charset/length/weak-list constraints (server remains authoritative).
3. **Error toasts** must prefer `BackendHttpError.backendMessage` (or equivalent body `error`), not status codes alone (`保存失败（状态 400）`).

Org Users create form: `orgUsers` i18n `usernameHint` / `passwordHint` + `orgUserFormRules.ts`.
