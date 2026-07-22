## Why

Mixing chip 显示「沉淀已跳过：`missing_session_id`」说明 `07-14-precipitation-effectiveness` 的漏斗观测已生效，但空闲沉淀仍无法进 worker。根因是调度只读 `conversation.extra.acp_session_id`，而当前 `aionui-src` **没有任何写入该字段的路径**（仅有类型声明与清空间拷），故 30s debounce 后几乎必 skip。不修写入/解析则 Inbox 永远空，FUNNEL AC5 也无法绿。

## What Changes

- Restore（或重建）ACP 会话 UUID → `conversation.extra.acp_session_id` 的 **authoritative persist**（session/new、idle force-warmup 新 id、redirect-to-live-id）。
- Schedule path：**多源 resolve** — `extra.acp_session_id` → main-process ACP runtime map by `conversation_id` → 仍缺才 `schedule_skipped: missing_session_id`。
- 单元测：无 writer → skip；有 persist / runtime fallback → `scheduled`；脱敏 funnel 不变。
- Mixing 手工 smoke：真实 ACP 回合 + 30s idle → chip 非 `missing_session_id`，events 含 `scheduled` 或 worker skip reason（非缺 id）。

## Capabilities

### New Capabilities

- `session-precipitation-bind`: ACP session UUID binding for idle precipitation schedule (persist + resolve + funnel skip taxonomy when unbound)

### Modified Capabilities

- _(none in `openspec/specs/` yet — none to delta)_

## Impact

- **Repos:** `aionui-src` (`useSessionPrecipitationSchedule.ts`, `ccbPrecipitation.ts`, ACP warmup/agent bridge), possibly `ccb-installer/patches/aionui-acp` if runtime lookup needs session↔conversation map exposure
- **Trellis:** follow-on of `07-14-precipitation-effectiveness` (Phase 4b blocked by this)
- **Worker:** `precipitation_worker.py` unchanged contract (`--session-id` still Claude `~/.claude/projects/**/{id}.jsonl`)
- **Non-goals:** personal habit auto-write; PROMOTION bypass; lengthening debounce alone; logging transcript bodies
