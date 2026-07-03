"""Guards for fill_quotation_sheet Path A vs Path C routing."""
from __future__ import annotations

from pathlib import Path
from typing import Any

_PLACEHOLDER_BASENAMES = frozenset({"blank", "template", "default"})


def is_invented_file_path(value: str) -> bool:
    """True when file_path looks like a placeholder or a not-yet-created output name."""
    stripped = value.strip()
    if not stripped:
        return True
    lower = stripped.lower().replace("\\", "/")
    base = Path(stripped).name.lower()
    if base in _PLACEHOLDER_BASENAMES:
        return True
    if lower.endswith("/blank"):
        return True
    if "wanding-quotation_" in lower:
        return True
    return False


def resolve_direct_template_path(params: dict[str, Any]) -> str:
    """Pick template for Path C; ignore invented file_path values."""
    from quotation.template_paths import default_blank_template

    for key in ("template_path", "template"):
        value = params.get(key)
        if isinstance(value, str) and value.strip() and not is_invented_file_path(value):
            return value.strip()
    for key in ("file_path", "path", "quotation_path", "file"):
        value = params.get(key)
        if not isinstance(value, str) or not value.strip():
            continue
        if is_invented_file_path(value):
            continue
        path = Path(value.strip())
        if path.exists():
            return str(path)
    return default_blank_template()


def guard_path_a_file_path(params: dict[str, Any]) -> None:
    """Reject Path A calls that use Path C placeholders instead of fill_items."""
    for key in ("file_path", "path", "quotation_path", "file"):
        value = params.get(key)
        if not isinstance(value, str) or not value.strip():
            continue
        if is_invented_file_path(value):
            raise ValueError(
                "查价后出单 (Path C): pass fill_items + require_exact_codes=true; omit file_path. "
                "file_path is only for Path A when an inquiry Excel already exists on disk. "
                "Do not use placeholder paths like 'blank' or Wanding-Quotation_*.xlsx output names."
            )
        return
    raise ValueError(
        "Missing required parameter 'file_path'. Accepted keys: file_path, path, quotation_path, file. "
        "For post-match fill use fill_items + require_exact_codes (Path C) without file_path."
    )
