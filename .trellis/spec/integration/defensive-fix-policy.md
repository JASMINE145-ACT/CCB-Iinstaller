# Defensive Fix Policy

> When the backend misbehaves (greeting emitted twice, permission payload missing fields, etc.), a **short-term desktop guard** is sometimes acceptable. This doc governs when and how.

---

## 1. When a desktop defensive fix is allowed

Use one only when **all** of the following hold:

1. **Backend root cause is in a slow-moving codebase** (`D:\claude-code-B\src/`)
2. **A release is blocked** on visible UX
3. **A backend tracking item exists** with a named removal date

Pure UI issues (thinking auto-collapse, layout, hotkey preference) are **not** defensive fixes — they belong in desktop by default. See `../frontend/coding-rules.md` §1 (Rule 0: decide the layer first).

---

## 2. Hard rules for an acceptable defensive fix

1. **Always paired with a backend issue** — must reference a tracking issue in the backend repo
   ```ts
   // TODO(defensive): ccb-wanding#<id> — root cause is greeting emitted twice without replace:true
   if (last.content?.content === message.content?.content) return list;
   ```
2. **Visible as tech debt** — every defensive fix carries a `// TODO` comment
3. **6-month rule** — if a defensive fix has been in place for more than 6 months without a backend fix landing, escalate the backend issue; do NOT silently extend the defensive fix's life
4. **Removed when fixed upstream** — once the backend ships the root-cause fix, the desktop guard must be deleted in a follow-up PRD

---

## 3. Do NOT patch in frontend (unless explicitly approved)

```
Do not fix these in frontend:

- Backend emits duplicate greeting
- Backend sends incomplete permission payload (e.g. tool_call missing)
- MCP tool registration missing
- ACP session state wrong
- CCB-Wanding tool call failed (network / exec error)
- Environment variables missing for backend
- route-b patch stale (use sync script instead)
```

**Frontend may only:** display, normalize minor optional fields, show safe fallback UI.

**Root-cause fixes must go to:** `D:\claude-code-B\src/` (per project strategy in `../outline.md` § Primary strategy).

---

## 4. Example: correct vs wrong

### ✅ Correct (greeting duplicate, interim)

```ts
// packages/desktop/src/common/chat/chatLib.ts
// TODO(defensive): ccb-wanding#142 — backend emits greeting twice during session/new.
// Root cause: missing replace:true. Remove this guard when ccb-wanding#142 ships.
if (
  last.type === 'text' &&
  message.type === 'text' &&
  last.msg_id !== message.msg_id &&
  last.content?.content === message.content?.content &&
  (message.content?.content?.length ?? 0) > 0
) {
  return list;
}
```

### ❌ Wrong (just dedup, no tracking, no comment)

```ts
if (last.content?.content === message.content?.content) return list;
```

This rots silently. After 6 months, no one knows whether the backend is fixed or whether the guard is still needed.

---

## 5. Removal checklist (when backend ships the fix)

In the follow-up PRD that lands after the backend fix:

- [ ] Remove the desktop guard
- [ ] Delete the `// TODO(defensive)` comment
- [ ] Update the `tasks/.../prd.md` Out of Scope section to mark the issue resolved
- [ ] Add a one-line test to lock the fix in `chatLib` (or wherever) so the regression cannot return
