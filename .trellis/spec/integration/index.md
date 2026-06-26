# Integration Docs (AionUI ↔ aioncore ↔ CCB-Wanding)

> Read these when changing the **boundary** between AionUI and the backend chain. For pure UI work, see [`../frontend/index.md`](../frontend/index.md) instead.

---

## When to read which doc

| You are touching… | Read |
|-------------------|------|
| route-b patch (`ccb-installer/patches/aionui-ccb-route-b/`) | [`route-b-sync.md`](./route-b-sync.md) |
| `D:\CCB-Wanding\dist\` rebuild / claude-code-B source | [`../backend/index.md`](../backend/index.md) + [`aionui-ccb-boundary.md`](./aionui-ccb-boundary.md) |
| ACP / MCP / permission event correctness | [`../backend/acp-session-flow.md`](../backend/acp-session-flow.md) + [`aionui-ccb-boundary.md`](./aionui-ccb-boundary.md) |
| CCB authority config ownership (skills, MCP, commands, assistants) | [`aionui-config-inventory.md`](./aionui-config-inventory.md) |
| Cross-layer latency / warmup / session id issues | [`aionui-ccb-boundary.md`](./aionui-ccb-boundary.md) § CCB session warmup + § idle agent |
| CCB assistant profile handoff (preset cards → CCB sessions) | [`aionui-ccb-boundary.md`](./aionui-ccb-boundary.md) § CCB assistant profile handoff |
| Adding a defensive fix to renderer / chatLib | [`defensive-fix-policy.md`](./defensive-fix-policy.md) — must include `// TODO(defensive)` |
| Layer 1 (desktop) only | You do not need this index. Go to [`../frontend/index.md`](../frontend/index.md). |

## Project strategy (5 lines)

> Full version lives in [`../outline.md`](../outline.md) (Primary strategy / Rule 0).

1. **ACP / MCP / session bugs** → fix in `D:\claude-code-B\src/` (source), not in AionUI
2. **Pure UI / UX / hotkey** → fix in `packages/desktop/src/`
3. **route-b patch + sync script** → permanent integration glue (Layer 3)
4. **Desktop defensive fix** → only when backend fix is in flight; mark with `// TODO(defensive)` and target removal
5. **When unsure** → read `../outline.md` (Primary strategy / Rule 0) first
