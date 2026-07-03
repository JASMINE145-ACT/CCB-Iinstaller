# Plan Task Execution

Design a phased execution plan for the current Trellis task (workstream → tool mapping).

Read and follow:

- `.claude/skills/trellis-task-execution/SKILL.md`
- `.claude/skills/trellis-task-execution/examples.md` (multi-workstream tasks)

Reference: `docs/ai-tools-reference.md` §五 · §八

**Do not implement** until the user approves the plan.

```bash
python ./.trellis/scripts/task.py current --source
cat .trellis/tasks/<task-dir>/prd.md
```
