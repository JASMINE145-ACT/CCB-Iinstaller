"""Compare Accurate store codes vs price library (WANd.ORG.PRICE_GAP_FILL.001)."""
from __future__ import annotations

from pathlib import Path
from typing import Iterable, List, Optional, Sequence, Set

from inventory.services.item_dump import normalize_item_code


def normalize_code_set(codes: Iterable[str]) -> Set[str]:
    return {normalize_item_code(c) for c in codes if normalize_item_code(c)}


def gap_codes(accurate_codes: Iterable[str], price_lib_codes: Iterable[str]) -> List[str]:
    """Accurate minus price library — sorted for stable reports."""
    gap = normalize_code_set(accurate_codes) - normalize_code_set(price_lib_codes)
    return sorted(gap)


def load_codes_from_slim_xlsx(path: Path) -> Set[str]:
    import pandas as pd

    df = pd.read_excel(path, sheet_name=0)
    col = "Item Code" if "Item Code" in df.columns else df.columns[0]
    return normalize_code_set(df[col].astype(str).tolist())


def _pick_material_column(columns, material_col_hint: str) -> Optional[str]:
    candidates = [c for c in columns if material_col_hint.lower() in str(c).lower()]
    if candidates:
        return candidates[0]
    for hint in ("料号", "编码", "Item Code", "material_code", "物料", "Material"):
        candidates = [c for c in columns if hint.lower() in str(c).lower()]
        if candidates:
            return candidates[0]
    return None


def load_codes_from_price_library_xlsx(
    path: Path,
    *,
    material_col_hint: str = "Material",
) -> Set[str]:
    """Best-effort: prefer sheet `price_library`, else first sheet with a material column."""
    import pandas as pd

    xl = pd.ExcelFile(path)
    sheet_order = []
    if "price_library" in xl.sheet_names:
        sheet_order.append("price_library")
    sheet_order.extend([s for s in xl.sheet_names if s not in sheet_order])

    last_cols: list = []
    for sheet in sheet_order:
        df = pd.read_excel(xl, sheet_name=sheet)
        last_cols = list(df.columns)
        col = _pick_material_column(df.columns, material_col_hint)
        if col is not None:
            return normalize_code_set(df[col].astype(str).tolist())
    raise ValueError(f"No material code column found in {path}; columns={last_cols[:20]}")


def write_gap_report_csv(gap: Sequence[str], dest: Path) -> Path:
    dest = Path(dest)
    dest.parent.mkdir(parents=True, exist_ok=True)
    lines = ["material_code,action"]
    for code in gap:
        lines.append(f"{code},insert_draft")
    dest.write_text("\n".join(lines) + "\n", encoding="utf-8")
    return dest
