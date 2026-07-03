#!/usr/bin/env python3
"""JSON-lines entry point used by the price-library MCP server."""
from __future__ import annotations

import json
import logging
import os
import sys
from pathlib import Path

_project_root = Path(__file__).resolve().parent.parent
_env_file = _project_root / ".env.accurate"
if _env_file.exists():
    try:
        from dotenv import load_dotenv
        load_dotenv(_env_file, override=True, encoding="utf-8-sig")
    except Exception:
        pass

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8")
if hasattr(sys.stdin, "reconfigure"):
    sys.stdin.reconfigure(encoding="utf-8")

PYTHON_ROOT = Path(__file__).resolve().parent
if str(PYTHON_ROOT) not in sys.path:
    sys.path.insert(0, str(PYTHON_ROOT))

_log_level = getattr(logging, os.getenv("PRICE_LIBRARY_LOG_LEVEL", "WARNING").upper(), logging.WARNING)
logging.basicConfig(level=_log_level, format="%(name)s: %(message)s", stream=sys.stderr)

from system.error_codes import infer_error_code  # noqa: E402
from system.price_library_tool_dispatch import handle_request  # noqa: E402


def main() -> None:
    for line in sys.stdin:
        if not line.strip():
            continue
        try:
            response = handle_request(json.loads(line.lstrip("\ufeff")))
        except ValueError as exc:
            response = {"success": False, "error": str(exc), "error_code": infer_error_code(exc)}
        print(json.dumps(response, ensure_ascii=False), flush=True)


if __name__ == "__main__":
    main()
