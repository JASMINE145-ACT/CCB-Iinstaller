#!/usr/bin/env python3
"""Promote an approved precipitation business rule to org knowledge (shared KB)."""
from __future__ import annotations

import argparse
import json
import os
import sys
from pathlib import Path


def _repo_python_dir() -> Path:
    override = (os.environ.get("CCB_PROJECT_ROOT") or "").strip()
    if override:
        candidate = Path(override) / "python"
        if candidate.is_dir():
            return candidate
    here = Path(__file__).resolve()
    for parent in here.parents:
        candidate = parent / "python"
        if candidate.is_dir() and (candidate / "admin" / "org_knowledge_client.py").is_file():
            return candidate
    raise RuntimeError("python admin package not found (set CCB_PROJECT_ROOT)")


def _sync_shadow(slug: str, shadow_path: Path) -> None:
    from admin.org_knowledge_client import get_doc  # noqa: E402

    doc = get_doc(slug, use_cache=False)
    if not doc or not str(doc.get("content") or "").strip():
        return
    shadow_path.parent.mkdir(parents=True, exist_ok=True)
    shadow_path.write_text(str(doc["content"]).strip() + "\n", encoding="utf-8")


def main() -> int:
    parser = argparse.ArgumentParser(description="Append confirmed business rule to org KB")
    parser.add_argument("--rule-text", required=True)
    parser.add_argument("--reason", default="precipitation inbox approve")
    parser.add_argument("--slug", default="wanding_business_knowledge")
    parser.add_argument("--sync-shadow", default="", help="Local shadow md path to refresh after write")
    args = parser.parse_args()

    sys.path.insert(0, str(_repo_python_dir()))
    from admin.org_knowledge_client import append_business_rule, is_org_api_configured  # noqa: E402

    if not is_org_api_configured():
        print(json.dumps({"ok": False, "error": "org_api_not_configured"}, ensure_ascii=False))
        return 1

    try:
        result = append_business_rule(
            args.rule_text,
            reason=args.reason,
            slug=args.slug.strip(),
        )
    except Exception as exc:  # noqa: BLE001
        print(json.dumps({"ok": False, "error": str(exc)}, ensure_ascii=False))
        return 1

    shadow = args.sync_shadow.strip()
    if shadow and not result.get("skipped"):
        try:
            _sync_shadow(args.slug.strip(), Path(shadow))
        except OSError:
            pass

    if result.get("skipped"):
        print(json.dumps({"ok": True, "skipped": True, "result": result}, ensure_ascii=False))
        return 0

    print(json.dumps({"ok": True, "result": result}, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
