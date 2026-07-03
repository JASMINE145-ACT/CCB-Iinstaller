"""Path guard for price library import xlsx files."""
from __future__ import annotations

import os
from pathlib import Path

from system.workspace_paths import resolve_workspace_dir

MAX_IMPORT_FILE_BYTES = 10 * 1024 * 1024


def _safe_resolve(path: Path) -> Path:
    return path.resolve(strict=True)


def _is_relative_to(path: Path, parent: Path) -> bool:
    try:
        path.relative_to(parent)
        return True
    except ValueError:
        return False


def _allowed_roots() -> list[Path]:
    roots: list[Path] = []
    try:
        roots.append(_safe_resolve(resolve_workspace_dir()))
    except Exception:
        pass
    active = os.getenv("WANDING_WORKSPACE", "").strip()
    if active:
        try:
            roots.append(_safe_resolve(Path(active)))
        except Exception:
            pass
    # Common AionUI upload location under user-local storage.
    local = os.getenv("LOCALAPPDATA", "").strip()
    if local:
        attachments = Path(local) / "AionUi" / "attachments"
        try:
            roots.append(_safe_resolve(attachments))
        except Exception:
            pass
    unique: list[Path] = []
    seen: set[str] = set()
    for root in roots:
        key = str(root).lower()
        if key in seen:
            continue
        seen.add(key)
        unique.append(root)
    return unique


def validate_import_file_path(raw_path: str) -> Path:
    text = (raw_path or "").strip()
    if not text:
        raise ValueError("Missing required file_path for import xlsx")
    candidate = Path(text)
    if not candidate.is_absolute():
        candidate = resolve_workspace_dir() / candidate

    try:
        resolved = _safe_resolve(candidate)
    except FileNotFoundError as exc:
        raise ValueError(f"Import file not found: {candidate}") from exc

    if resolved.suffix.lower() != ".xlsx":
        raise ValueError("Import file must be .xlsx")
    if not resolved.is_file():
        raise ValueError(f"Import path is not a file: {resolved}")
    size = resolved.stat().st_size
    if size > MAX_IMPORT_FILE_BYTES:
        raise ValueError(
            f"Import file too large: {size} bytes exceeds {MAX_IMPORT_FILE_BYTES} bytes limit"
        )

    roots = _allowed_roots()
    if not roots:
        raise ValueError(
            "No allowed import roots configured. Set WANDING_WORKSPACE or WANDING_WORKSPACE_POINTER."
        )
    if not any(_is_relative_to(resolved, root) for root in roots):
        roots_display = ", ".join(str(root) for root in roots)
        raise ValueError(
            "Import file path is outside allowed roots. "
            f"Allowed roots: {roots_display}. Got: {resolved}"
        )
    return resolved
