#!/usr/bin/env python3
"""PostToolUse: after preview-only price-library writes, nudge user confirmation."""
from __future__ import annotations

import json
import sys
from typing import Any

PREVIEW_TOOL_NAMES = {
    "mcp__price-library__upsert_price_library_item",
    "mcp__price-library__delete_price_library_item",
    "mcp__price-library__restore_price_library_item",
    "mcp__price-library__publish_price_library_draft",
    "mcp__price-library__apply_price_library_import",
    "mcp__price-library__revert_price_library_version",
}


def _unwrap_tool_payload(raw: Any) -> dict[str, Any] | None:
    if isinstance(raw, str):
        text = raw.strip()
        if not text:
            return None
        try:
            raw = json.loads(text)
        except json.JSONDecodeError:
            return None
    if not isinstance(raw, dict):
        return None
    if isinstance(raw.get("result"), dict):
        return raw["result"]
    return raw


def main() -> int:
    try:
        hook_input = json.load(sys.stdin)
    except json.JSONDecodeError:
        return 0

    tool_name = str(hook_input.get("tool_name") or "")
    if tool_name not in PREVIEW_TOOL_NAMES:
        return 0

    payload = _unwrap_tool_payload(hook_input.get("tool_response"))
    if not payload or not payload.get("requires_confirmation"):
        return 0

    material = payload.get("material_code") or ""
    lines = [
        "【硬约束 — 价格库预览】",
        "上一步仅为 confirmed=false 预览，共享 draft **尚未**变更。",
        "向用户展示 markdown 对比表（字段 / 改前 / 改后 / change_type），并明确询问是否确认。",
        "用户明确同意前：**禁止**以 confirmed=true 重放；禁止声称已发布。",
    ]
    if material:
        lines.append(f"当前物料：{material}")
    if payload.get("draft_revision") is not None:
        lines.append(f"draft revision：{payload['draft_revision']}")
    for key in ("create_count", "update_count", "unchanged_count", "error_count"):
        if key in payload:
            lines.append(f"{key}：{payload[key]}")

    output = {
        "hookSpecificOutput": {
            "hookEventName": "PostToolUse",
            "additionalContext": "\n".join(lines),
        }
    }
    sys.stdout.write(json.dumps(output, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
