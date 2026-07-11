#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Validate the required structure of a Trellis execution-plan.md file."""

from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path


COMMON_SECTIONS = [
    "Progress snapshot",
    "Skills invoked",
    "Contract Verification",
]

FULL_SECTIONS = [
    "Contract map",
    "Workstreams",
    "TDD contract",
]

REQUIRED_TERMS = [
    "Status",
    "Scenario",
    "Plan depth",
    "Verification profile",
    "Active phase",
]

TOUCHES_PATTERN = re.compile(
    r"\btouches\b|WANd\.[A-Z0-9_]+\.[A-Z0-9_]+\.\d{3}|docs-only/no-runtime-contract"
)
INVOCATION_PATTERN = re.compile(r"\b(Skill:|Agent:|Read:)")
GREEN_PATTERN = re.compile(r"\bGREEN\b", re.IGNORECASE)
RED_PATTERN = re.compile(r"\bRED\b", re.IGNORECASE)


def resolve_plan_path(raw: str | None) -> Path:
    if raw:
        path = Path(raw)
        if path.is_dir():
            return path / "execution-plan.md"
        return path
    return Path(".trellis/tasks").resolve()


def find_current_plan(tasks_dir: Path) -> Path | None:
    candidates = sorted(
        tasks_dir.glob("*/execution-plan.md"),
        key=lambda p: p.stat().st_mtime,
        reverse=True,
    )
    return candidates[0] if candidates else None


def check_plan(path: Path) -> list[str]:
    errors: list[str] = []
    text = path.read_text(encoding="utf-8")
    is_lite = re.search(r"^.*Plan depth.*Lite.*$", text, re.IGNORECASE | re.MULTILINE) is not None

    for term in REQUIRED_TERMS:
        if term not in text:
            errors.append(f"missing header field: {term}")

    for section in COMMON_SECTIONS:
        if re.search(rf"^#+\s+{re.escape(section)}\b", text, re.MULTILINE) is None:
            errors.append(f"missing section: {section}")

    if is_lite:
        if re.search(r"^#+\s+Contract map \(lite\)", text, re.MULTILINE) is None:
            errors.append("missing Lite section: Contract map (lite)")
    else:
        for section in FULL_SECTIONS:
            if re.search(rf"^#+\s+{re.escape(section)}\b", text, re.MULTILINE) is None:
                errors.append(f"missing section: {section}")

    if TOUCHES_PATTERN.search(text) is None:
        errors.append("missing contract touch marker: touches / WANd.* / docs-only")

    if INVOCATION_PATTERN.search(text) is None:
        errors.append("missing real invocation evidence: Skill: / Agent: / Read:")

    is_docs_only = "docs-only/no-runtime-contract" in text
    if not is_docs_only and RED_PATTERN.search(text) is None:
        errors.append("missing RED evidence marker")

    if GREEN_PATTERN.search(text) is None:
        errors.append("missing GREEN command marker")

    status_terms = ("pending", "pass", "fail", "blocked", "complete")
    if not any(term in text.lower() for term in status_terms):
        errors.append("Contract Verification table lacks a visible status value")

    return errors


def main(argv: list[str]) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("path", nargs="?", help="Path to execution-plan.md or a task directory")
    args = parser.parse_args(argv)

    path = resolve_plan_path(args.path)
    if path.is_dir():
        # No explicit plan path: pick the most recently modified plan.
        found = find_current_plan(path)
        if found is None:
            print(f"FAIL no execution-plan.md found under {path}", file=sys.stderr)
            return 2
        path = found

    if not path.exists():
        print(f"FAIL missing {path}", file=sys.stderr)
        return 2

    errors = check_plan(path)
    if errors:
        print(f"FAIL {path}")
        for error in errors:
            print(f"- {error}")
        return 1

    print(f"PASS {path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
