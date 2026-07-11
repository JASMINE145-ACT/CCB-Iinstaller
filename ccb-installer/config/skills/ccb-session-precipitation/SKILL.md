---
name: ccb-session-precipitation
description: >
  Unified learning mainline: after conversation idle 60s, LLM reads full transcript,
  extracts five lanes (business KB, personal habits, golden paths, eval cases),
  dedupes against KB/workflow, queues for Memory Inbox approval, then promotes.
  Replaces ccb-personal-memory Stop auto-append (Stop hook is no-op).
---

# ccb-session-precipitation

**Single mainline** — not dual-track with `ccb-personal-memory` Stop.

| Stage | Mechanism |
|-------|-----------|
| Trigger | AionUI `turnCompleted` + 60s debounce |
| Extract | `precipitation_worker.py` → MiniMax HTTP (**LLM only**; fail = no record) |
| Dedup | Read business KB shadow + personal workflow/profile before LLM |
| Gate | Memory → 待沉淀 → approve/deny |
| Promote | personal → workflow/profile; **business → org API** (`append_business_rule`); golden/eval → jsonl |

Entry: `scripts/precipitation_worker.py`

See Trellis task `07-09-idle-session-precipitation`.
