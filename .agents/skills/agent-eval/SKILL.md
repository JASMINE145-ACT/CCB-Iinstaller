---
name: agent-eval
description: Create, confirm, run, review, report, and baseline evidence-based Agent evals through the repository's canonical Agent Eval Plugin.
---

# Agent Eval project loader

This file is a thin project-discovery loader for hosts that scan `.agents/skills/`.
It does not own evaluation behavior.

Before taking any Agent Eval action:

1. Read `../../../agent-eval-plugin/skills/agent-eval/SKILL.md` completely,
   resolving the path relative to this loader.
2. Follow that canonical Skill without copying or changing its Case, grading,
   Judgment, privacy, or baseline rules.
3. Resolve the deterministic host interface from
   `../../../agent-eval-plugin/scripts/agent-eval.mjs`, also relative to this
   loader.

If either canonical file is unavailable, stop and report that the plugin source
is incomplete. Do not recreate its behavior in the host wrapper.
