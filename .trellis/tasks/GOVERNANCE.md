# Trellis Task Governance

> How we keep `.trellis/tasks/` honest when code moves faster than `task.json`.

## Principles

1. **One active pointer per session** — `task.py start <dir>`; finish when context-switching.
2. **Status follows reality** — `in_progress` only while you are working; `completed` when done.
3. **Archive closes the loop** — completed tasks leave the active tree via `task.py archive`.
4. **Dashboard weekly** — regenerate [DASHBOARD.md](./DASHBOARD.md) and clear archive candidates.

## Lifecycle

```text
create → planning
start  → in_progress
done   → set-status completed  OR  archive (sets completed + moves to archive/)
```

| Command | When |
|---------|------|
| `task.py create` | New feature / audit / spike |
| `task.py start` | Begin work in this session |
| `task.py finish` | Clear session pointer (status unchanged) |
| `task.py set-status <dir> completed` | Done but keep dir for reference |
| `task.py archive <dir>` | Done — move to `archive/YYYY-MM/` |
| `task.py report --write` | Refresh dashboard |

## Hygiene rules

### Archive candidates

`task.py list --status completed` — if status is `completed`/`done` and still under `tasks/`, run `archive`.

### Stale parents

Parent shows `[N/N done]` but parent still `in_progress` → archive parent or `set-status completed`.

### Stale active tasks

`report` flags `stale-active` when `in_progress` with no file mtime change for 14+ days. Either resume, archive, or set `pending`.

### Missing `prd.md`

Every task should have `prd.md`. Create retroactively before marking complete.

### Code ahead of task

When git WIP outpaces `task.json` (e.g. `pending` but files changed):

```bash
python .trellis/scripts/task.py set-status 06-30-foo in_progress
python .trellis/scripts/task.py start 06-30-foo
```

## Strategic tasks (meta)

| Task | Role |
|------|------|
| [`06-30-full-system-review`](./06-30-full-system-review/) | Layer-by-layer spec↔code audit + Integration fix phases |
| [`06-30-task-system-governance`](./06-30-task-system-governance/) | This playbook + `task.py report` tooling |

## spec/index.md Task logs

High-signal tasks only (P0/P1 + recent ship). Full list: **DASHBOARD.md** or `task.py list`.

## Suggested weekly ritual (15 min)

```bash
python .trellis/scripts/task.py report --write
python .trellis/scripts/task.py list --status completed
# archive each completed row
python .trellis/scripts/task.py archive <name>
```

Update `spec/index.md` Task logs table if a P0/P1 task closed or a new strategic task opened.
