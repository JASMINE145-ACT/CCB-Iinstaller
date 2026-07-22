## Context

Task `07-14-precipitation-effectiveness` made idle precipitation **observable**: chip shows `沉淀已跳过：missing_session_id`, funnel writes `schedule_skipped`. That is Phase 2 observability succeeding — not a healthy schedule.

Scheduler (`useSessionPrecipitationSchedule` → `schedulePrecipitation`) requires Claude ACP agent UUID in `conversation.extra.acp_session_id` so worker can open `~/.claude/projects/**/{session_id}.jsonl`. Repo search (2026-07-15): **no TS/JS writer** assigns `acp_session_id` anywhere in `aionui-src` (only reads + clear-on-fork). Late-bind 500ms retry cannot help if the field is never persisted.

Stakeholder: Mixing / CCB Guid idle precipitation → Learning Inbox. Parent contracts: `WANd.LEARNING.IDLE.001`, `WANd.LEARNING.FUNNEL.001`, redaction HG1.

## Goals / Non-Goals

**Goals:**

- After a completed ACP turn + idle debounce, schedule reaches worker **with a real session id** when ACP runtime has one.
- Persist live ACP session id onto conversation.extra whenever session/new or force-warmup yields a new id.
- Fail closed with existing funnel code if unbound after resolve attempts.
- Keep funnel events desensitized (short/hash session id only).

**Non-Goals:**

- Personal habit auto-write / PROMOTION auto-merge.
- Changing worker LLM / debounce defaults (already 30s).
- Rewriting transcript discovery to use AionUI conversation_id as filename (wrong contract).

## Decisions

### D1 — Dual-path resolve (persist + runtime fallback)

**Choice:** Persist is primary; main-process resolve-by-`conversation_id` is fallback before `missing_session_id`.

**Why:** Persist alone matches original design and worker CLI args; runtime fallback covers race when turnCompleted fires before DB merge lands. Alternatives:

| Alt | Reject reason |
|-----|----------------|
| Only lengthen late-bind wait | Still empty if never written |
| Worker takes conversation_id only | Transcript keys are ACP session UUID |
| Pass session id on `turn.completed` event only | Event may map conversation_id as `session_id` today (see ipcBridge mapper) — ambiguous; still need durable bind |

### D2 — Write site: ACP session lifecycle hooks

**Choice:** Write `extra.acp_session_id` + `acp_session_updated_at` when:

1. ACP `session/new` / warmup response returns session UUID for a conversation
2. Idle force-warmup replaces stale id (overwrite)
3. CCB redirect-to-live-session updates id

Locate via aioncore/desktop conversation update path used by warmup (research during implement — likely bridge that today omits this field). **Do not** invent a second parallel key.

### D3 — Keep funnel skip reason

**Choice:** Retain `missing_session_id` when all resolve paths fail; optional add `workerDetail: resolve_exhausted` without new chip taxonomy unless product asks.

### D4 — Tests first

**Choice:** Unit tests for resolve helper (empty extra + mock runtime map) and schedule path; Mixing smoke AC remaining from parent task.

## Risks / Trade-offs

- [Stale id after idle kill] → Mitigation: force-warmup already renews agent; ensure overwrite of extra on new id (same as send-path mitigation in `AcpSendBox`).
- [Writing session id to wrong conversation] → Mitigation: always key by conversation_id from warmup/send context; never inherit on “new chat” fork (existing clear remains).
- [Runtime map unavailable on WebUI] → Mitigation: Electron Mixing is primary surface; WebUI browser mode may stay `missing_session_id` until WebUI parity — document as out-of-scope unless same IPC exists.
- [Security: logging full session id] → Mitigation: funnel whitelist already truncates/hashes; do not expand fields.

## Migration Plan

1. Ship aionui-src fix via Mixing `start-dev-full` / next installer sync.
2. No DB migration — JSON `extra` field already typed.
3. Rollback: revert bind writers; chip returns to `missing_session_id` (safe fail).

## Open Questions

1. Exact write hook file (bridge vs aioncore conversation update) — confirm at implement with one RED repro on Mixing.
2. Does `turn.completed` ever carry ACP agent UUID today, or only AionUI conversation_id? (ipcBridge maps `session_id` from conversation-shaped payload — verify before relying on event field.)
