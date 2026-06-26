"""Quotation template discovery and workspace-aware output path coercion."""
from __future__ import annotations

import os
from datetime import datetime
from pathlib import Path

from system.workspace_paths import coerce_write_path

_PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
PYTHON_ROOT = Path(__file__).resolve().parent.parent


def default_blank_template() -> str:
    candidates: list[Path] = []
    data_dir = os.getenv("WANDING_DATA_DIR", "").strip()
    if data_dir:
        candidates.append(Path(data_dir))
    price_lib = os.getenv("WANDING_PRICE_LIB_PATH", "").strip()
    if price_lib:
        candidates.append(Path(price_lib).parent)
    candidates.extend([
        _PROJECT_ROOT / "data",
        PYTHON_ROOT.parent / "data",
        PYTHON_ROOT.parent / "vendor" / "wanding" / "data",
    ])
    for root in candidates:
        if not root.exists():
            continue
        for path in sorted(root.glob("*.xlsx")):
            if "空白" in path.name and "标准" in path.name:
                return str(path)
    raise ValueError(
        "Missing required parameter 'file_path' or 'template_path', and no bundled blank standard quotation template was found."
    )


def coerce_direct_fill_output_path(
    output_path: str | None,
    workspace_path: str | None = None,
) -> str:
    if not output_path:
        stamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        return coerce_write_path(
            None,
            workspace_path=str(workspace_path) if workspace_path else None,
            default_filename=f"Wanding-Quotation_{stamp}.xlsx",
            require_workspace=True,
        )
    return coerce_write_path(
        str(output_path),
        workspace_path=str(workspace_path) if workspace_path else None,
        require_workspace=not Path(str(output_path)).is_absolute(),
    )


def coerce_flow_fill_output_path(
    file_path: str,
    output_path: str | None,
    workspace_path: str | None = None,
) -> str:
    if not output_path:
        src = Path(file_path)
        return coerce_write_path(
            None,
            workspace_path=str(workspace_path) if workspace_path else None,
            default_filename=f"{src.stem}_filled{src.suffix}",
            require_workspace=True,
        )
    return coerce_write_path(
        str(output_path),
        workspace_path=str(workspace_path) if workspace_path else None,
        require_workspace=not Path(str(output_path)).is_absolute(),
    )
