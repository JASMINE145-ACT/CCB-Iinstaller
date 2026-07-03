# Trellis Task 体系治理

## Goal

让 `.trellis/tasks/` **可观测、可清理、与代码现实同步**，避免 45+ active task 堆积且 status 滞后。

## Delivered

| Item | Path |
|------|------|
| Hygiene report CLI | `task.py report [--write]` |
| Status without archive | `task.py set-status <dir> <status>` |
| Auto dashboard | `.trellis/tasks/DASHBOARD.md` |
| Playbook | `.trellis/tasks/GOVERNANCE.md` |

## Acceptance

- [x] `task.py report` prints summary counts
- [x] `task.py report --write` regenerates DASHBOARD.md
- [x] `task.py set-status` updates task.json
- [x] GOVERNANCE.md documents weekly ritual
- [ ] First hygiene pass: archive ≥10 completed candidates (manual)
- [x] supplier-remark task status aligned to `in_progress`

## Next

1. Weekly `report --write` + archive sweep
2. Link DASHBOARD from `spec/index.md`
3. Optional: `task.py batch-archive --dry-run` (future)
