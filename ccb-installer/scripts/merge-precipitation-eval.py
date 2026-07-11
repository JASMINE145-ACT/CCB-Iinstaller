#!/usr/bin/env python3
"""Merge approved precipitation eval rows into eval/agent_eval_cases.jsonl (git-shared corpus).

Path A (stable/simple): run after Inbox approvals, then git commit + push + CI smoke.

Usage:
  python ccb-installer/scripts/merge-precipitation-eval.py
  python ccb-installer/scripts/merge-precipitation-eval.py --dry-run
"""
from __future__ import annotations

import argparse
import json
import os
import re
from pathlib import Path


def _default_config_dir() -> Path:
    override = (os.environ.get("CCB_WANDING_CONFIG_DIR") or "").strip()
    if override:
        return Path(override)
    local = (os.environ.get("LOCALAPPDATA") or "").strip()
    if local:
        return Path(local) / "CCB-Wanding" / ".claude"
    return Path.home() / "AppData" / "Local" / "CCB-Wanding" / ".claude"


def _repo_root() -> Path:
    override = (os.environ.get("CCB_PROJECT_ROOT") or "").strip()
    if override:
        return Path(override)
    here = Path(__file__).resolve()
    for parent in here.parents:
        if (parent / "eval" / "agent_eval_cases.jsonl").is_file():
            return parent
    raise SystemExit("Cannot find eval/agent_eval_cases.jsonl (set CCB_PROJECT_ROOT)")


def _normalize(text: str) -> str:
    return re.sub(r"\s+", "", (text or "").lower())


def _read_jsonl(path: Path) -> list[dict]:
    if not path.is_file():
        return []
    rows: list[dict] = []
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line:
            continue
        try:
            obj = json.loads(line)
        except json.JSONDecodeError:
            continue
        if isinstance(obj, dict):
            rows.append(obj)
    return rows


def main() -> int:
    parser = argparse.ArgumentParser(description="Merge precipitation eval promotions into agent_eval_cases.jsonl")
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--config-dir", default="")
    args = parser.parse_args()

    config = Path(args.config_dir) if args.config_dir else _default_config_dir()
    promoted = config / "learning" / "eval_precipitation_promoted.jsonl"
    target = _repo_root() / "eval" / "agent_eval_cases.jsonl"

    promo_rows = _read_jsonl(promoted)
    if not promo_rows:
        print("No rows in eval_precipitation_promoted.jsonl")
        return 0

    existing = _read_jsonl(target)
    existing_ids = {str(r.get("id") or "") for r in existing}
    existing_inputs = {_normalize(str(r.get("input") or "")) for r in existing}

    added = 0
    skipped = 0
    for row in promo_rows:
        case_id = str(row.get("id") or f"precip-{row.get('proposalId', 'unknown')}")
        inp = str(row.get("input") or "")
        norm_inp = _normalize(inp)
        if case_id in existing_ids or (norm_inp and norm_inp in existing_inputs):
            skipped += 1
            continue
        out = {
            "id": case_id,
            "category": row.get("category") or "routing",
            "agent": row.get("agent") or "quotation-agent",
            "input": inp,
            "expected_tools": row.get("expected_tools") or [],
            "must_not": row.get("must_not") or [],
            "risk_level": "read_only",
            "source": "precipitation_inbox",
        }
        if args.dry_run:
            print(f"would add: {case_id}")
        else:
            with target.open("a", encoding="utf-8", newline="\n") as handle:
                handle.write(json.dumps(out, ensure_ascii=False) + "\n")
            existing_ids.add(case_id)
            if norm_inp:
                existing_inputs.add(norm_inp)
        added += 1

    print(f"promoted={len(promo_rows)} added={added} skipped={skipped} target={target}")
    if added and not args.dry_run:
        print("Next: git add eval/agent_eval_cases.jsonl && commit && push && CI smoke")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
