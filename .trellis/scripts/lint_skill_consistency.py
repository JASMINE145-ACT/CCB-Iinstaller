#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Cross-file consistency lint for the trellis-plan-execution skill family.

Checks (all read from disk, repo-root-relative):
1. Every file in the canonical reference list exists.
2. Required section anchors (headings) exist in key files.
3. Scenario enumeration is consistent: SKILL.md Step 1 defines rows A-L,
   and the stale ``A | B | C | D`` pattern is absent from all files.

Exit 0 on PASS, 1 on FAIL (same protocol as lint_execution_plan.py).
"""

from __future__ import annotations

import re
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[2]

COMMAND_FILE = ".cursor/commands/trellis-plan-execution.md"
SKILL_FILE = ".cursor/skills/trellis-task-execution/SKILL.md"
SELECTION_FILE = ".cursor/skills/trellis-task-execution/skill-selection.md"
REFERENCE_FILE = "docs/ai-tools-reference.md"

CANONICAL_FILES = [
    COMMAND_FILE,
    SKILL_FILE,
    SELECTION_FILE,
    ".cursor/skills/trellis-task-execution/examples.md",
    ".cursor/skills/trellis-execute-plan/SKILL.md",
    ".cursor/skills/trellis-contract-verify/SKILL.md",
    ".cursor/skills/trellis-debug-route/SKILL.md",
    ".cursor/skills/trellis-parallel-route/SKILL.md",
    REFERENCE_FILE,
    ".trellis/scripts/lint_execution_plan.py",
]

# file -> list of (label, heading regex fragment matched after "^#+\s+")
REQUIRED_ANCHORS: dict[str, list[tuple[str, str]]] = {
    SKILL_FILE: [
        ("Operating doctrine", r".*Operating doctrine"),
        ("Contract map (lite)", r".*Contract map \(lite"),
        ("Step 1", r".*Step 1 "),
        ("Step 3b", r".*Step 3b"),
        ("Step 5", r".*Step 5 "),
        ("Step 6", r".*Step 6 "),
    ],
    SELECTION_FILE: [
        ("一、", r"一、"),
        ("二、", r"二、"),
        ("三、", r"三、"),
        ("四、", r"四、"),
    ],
    REFERENCE_FILE: [
        ("五、(协作场景)", r"五、"),
        ("八、(验证)", r"八、"),
    ],
}

SCENARIO_LETTERS = "ABCDEFGHIJKL"

# Stale four-letter enumeration ("A | B | C | D") in plain and table-escaped
# ("A \| B \| C \| D") forms. Negative lookahead keeps a legitimate longer
# enumeration (…| D | E …) out of scope; "A/B/C/D" and "A–L" never match.
STALE_PATTERNS = [
    ("A | B | C | D", re.compile(r"A \| B \| C \| D(?!\s*\|\s*E)")),
    ("A \\| B \\| C \\| D", re.compile(r"A \\\| B \\\| C \\\| D(?!\s*\\\|\s*E)")),
]


def read_text(rel_path: str) -> str:
    return (REPO_ROOT / rel_path).read_text(encoding="utf-8")


def check_files_exist() -> tuple[list[str], list[str]]:
    """Return (errors, existing files) for the canonical reference list."""
    errors: list[str] = []
    existing: list[str] = []
    for rel_path in CANONICAL_FILES:
        if (REPO_ROOT / rel_path).is_file():
            existing.append(rel_path)
        else:
            errors.append(f"missing referenced file: {rel_path}")
    return errors, existing


def check_anchors(existing: list[str]) -> list[str]:
    errors: list[str] = []
    for rel_path, anchors in REQUIRED_ANCHORS.items():
        if rel_path not in existing:
            continue  # missing-file error already reported
        text = read_text(rel_path)
        for label, fragment in anchors:
            pattern = re.compile(rf"^#+\s+{fragment}", re.MULTILINE | re.IGNORECASE)
            if pattern.search(text) is None:
                errors.append(f"{rel_path}: missing section anchor: {label}")
    return errors


def check_scenarios(existing: list[str]) -> list[str]:
    errors: list[str] = []

    if SKILL_FILE in existing:
        skill_text = read_text(SKILL_FILE)
        for letter in SCENARIO_LETTERS:
            row = re.compile(rf"^\|\s*\*\*{letter}\*\*", re.MULTILINE)
            if row.search(skill_text) is None:
                errors.append(
                    f"{SKILL_FILE}: Step 1 table missing scenario row **{letter}**"
                )

    for rel_path in existing:
        text = read_text(rel_path)
        for label, pattern in STALE_PATTERNS:
            if pattern.search(text) is not None:
                errors.append(f"{rel_path}: stale scenario enumeration: {label}")

    return errors


def main() -> int:
    errors, existing = check_files_exist()
    errors.extend(check_anchors(existing))
    errors.extend(check_scenarios(existing))

    if errors:
        print("FAIL trellis-plan-execution skill family consistency")
        for error in errors:
            print(f"- {error}")
        return 1

    print(
        f"PASS {len(CANONICAL_FILES)} files, "
        f"{sum(len(v) for v in REQUIRED_ANCHORS.values())} anchors, "
        f"scenarios A-{SCENARIO_LETTERS[-1]} consistent"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
