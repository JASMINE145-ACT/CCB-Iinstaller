"""Shared MCP tool parameter coercion helpers."""
from __future__ import annotations

import re
from typing import Any


def require_text_param(params: dict[str, Any], name: str, aliases: tuple[str, ...] = ()) -> str:
    for key in (name, *aliases):
        value = params.get(key)
        if isinstance(value, str) and value.strip():
            return value.strip()
        if value is not None and not isinstance(value, (dict, list, tuple, set)):
            text = str(value).strip()
            if text:
                return text
    alias_text = ", ".join((name, *aliases))
    raise ValueError(
        f"Missing required parameter '{name}'. Accepted keys: {alias_text}. "
        'For example: {"tool":"match_quotation","params":{"keywords":"直接50","customer_level":"B"}}'
    )


def coerce_text_list(value: Any, *, nested_keys: tuple[str, ...] = ()) -> list[str]:
    """Accept common LLM shapes for list params and return non-empty strings."""
    if value is None:
        return []
    if isinstance(value, str):
        parts = re.split(r"[\n,，;；]+", value)
        return [part.strip() for part in parts if part and part.strip()]
    if isinstance(value, dict):
        for key in nested_keys:
            if key in value:
                found = coerce_text_list(value.get(key), nested_keys=nested_keys)
                if found:
                    return found
        values: list[str] = []
        for item in value.values():
            values.extend(coerce_text_list(item, nested_keys=nested_keys))
        return values
    if isinstance(value, (list, tuple, set)):
        values: list[str] = []
        for item in value:
            values.extend(coerce_text_list(item, nested_keys=nested_keys))
        return values
    text = str(value).strip()
    return [text] if text else []


def coerce_number(value: Any, default: float = 0.0) -> float:
    if value is None or value == "":
        return default
    try:
        return float(str(value).replace(",", "").strip())
    except (TypeError, ValueError):
        return default


def coerce_int(value: Any, default: int = 1) -> int:
    try:
        return int(float(str(value).replace(",", "").strip()))
    except (TypeError, ValueError):
        return default


def coerce_bool(value: Any) -> bool:
    if isinstance(value, bool):
        return value
    if value is None:
        return False
    if isinstance(value, (int, float)):
        return value != 0
    text = str(value).strip().lower()
    return text in {"1", "true", "yes", "y", "on", "confirmed", "locked"}
