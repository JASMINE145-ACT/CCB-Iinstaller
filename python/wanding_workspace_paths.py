# -*- coding: utf-8 -*-
"""Session workspace defaults for all Wanding file outputs (quotation, Excel, exports)."""
from __future__ import annotations

import os
from pathlib import Path


def read_active_workspace_file() -> str:
    pointer = os.getenv("WANDING_WORKSPACE_POINTER", "").strip()
    if not pointer:
        return ""
    try:
        return Path(pointer).read_text(encoding="utf-8").strip()
    except OSError:
        return ""


def resolve_workspace_dir(workspace_path: str | None = None, *, require_explicit: bool = False) -> Path:
    """AionUI session workspace, then optional legacy output fallback."""
    for raw in (
        workspace_path,
        os.getenv("WANDING_WORKSPACE", ""),
        read_active_workspace_file(),
    ):
        text = (raw or "").strip()
        if not text:
            continue
        candidate = Path(text)
        if candidate.is_absolute():
            return candidate
    if require_explicit:
        raise ValueError(
            "Missing required workspace_path for file output. "
            "AionUI must inject workspace_path or WANDING_WORKSPACE; refusing to write to a hidden fallback path."
        )
    local = os.getenv("LOCALAPPDATA", "").strip()
    if local:
        return Path(local) / "CCB-Wanding" / "output"
    install = os.getenv("CCB_INSTALL_DIR", "").strip()
    if install:
        return Path(install) / "output"
    return Path.cwd() / "output"


def unique_output_path(path: str | Path) -> str:
    p = Path(path)
    if not p.is_absolute():
        p = resolve_workspace_dir() / p
    p.parent.mkdir(parents=True, exist_ok=True)
    if not p.exists():
        return str(p)
    from datetime import datetime

    stamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    candidate = p.with_name(f"{p.stem}_{stamp}{p.suffix}")
    index = 2
    while candidate.exists():
        candidate = p.with_name(f"{p.stem}_{stamp}_{index}{p.suffix}")
        index += 1
    return str(candidate)


def default_output_path(
    filename: str,
    workspace_path: str | None = None,
    *,
    require_workspace: bool = False,
) -> Path:
    return resolve_workspace_dir(workspace_path, require_explicit=require_workspace) / filename


def coerce_write_path(
    path: str | Path | None,
    *,
    workspace_path: str | None = None,
    default_filename: str | None = None,
    unique: bool = True,
    require_workspace: bool = False,
) -> str:
    """
  Resolve a user/tool write path.

  - Absolute explicit path → use as given (optionally uniquified).
  - Relative explicit path → under session workspace.
  - Empty / missing → workspace + default_filename (required).
  """
    text = (str(path).strip() if path is not None else "")
    if text:
        candidate = Path(text)
        if not candidate.is_absolute():
            candidate = resolve_workspace_dir(workspace_path, require_explicit=require_workspace) / candidate
        return unique_output_path(candidate) if unique else str(candidate)
    if not default_filename:
        raise ValueError("output path is required when no default_filename is provided")
    target = default_output_path(
        default_filename,
        workspace_path=workspace_path,
        require_workspace=require_workspace,
    )
    return unique_output_path(target) if unique else str(target)
