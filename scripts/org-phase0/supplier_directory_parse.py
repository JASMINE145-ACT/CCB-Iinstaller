# -*- coding: utf-8 -*-
"""Parse WanDing supplier index.html into seed payloads (no network)."""
from __future__ import annotations

import hashlib
import json
import re
from pathlib import Path
from typing import Any

SEED_VERSION = 2
SOURCE = "html_seed_2026_07"

# HTML FIELD_KEYS — full 18-column parity (WANd.SUPPLIER.FIDELITY.001)
FIELD_MAP = {
    "供应商编码": "code",
    "工厂全称": "name_zh",
    "主营产品大类": "category",
    "产品名称": "products_text",
    "规格型号": "spec",
    "详细技术参数": "tech_params",
    "原材料材质": "material",
    "人民币单价/单位": "price_note",
    "MOQ最小起订量": "moq",
    "标准交期（天）": "lead_days",
    "工厂完整仓库地址": "address",
    "国内对接联系人": "contact",
    "联系电话": "phone",
    "WhatsApp账号": "whatsapp",
    "业务邮箱": "email",
    "工厂资质": "qualification",
    "供应商等级": "grade",
    "备注": "notes",
}

DISTANCE_RE = re.compile(r"距仓库约(\d+)km")

HASH_FIELDS = (
    "code",
    "name_zh",
    "category",
    "products_text",
    "spec",
    "tech_params",
    "material",
    "price_note",
    "moq",
    "lead_days",
    "address",
    "contact",
    "phone",
    "whatsapp",
    "email",
    "qualification",
    "grade",
    "notes",
    "distance_km",
    "products_json",
    "locations_json",
)


def normalize_name_key(name: str) -> str:
    collapsed = " ".join(name.split())
    return collapsed.lower()


def _source_hash(payload: dict[str, Any]) -> str:
    canonical = json.dumps(payload, ensure_ascii=False, sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(canonical.encode("utf-8")).hexdigest()


def _js_string_field(obj: str, key: str) -> str:
    m = re.search(rf"'{re.escape(key)}':'((?:\\'|[^'])*)'", obj)
    if not m:
        return ""
    return m.group(1).replace("\\'", "'")


def extract_distance_km(notes: str) -> tuple[int | None, str]:
    """Split 距仓库约Xkm from 备注; return (km, cleaned_notes)."""
    m = DISTANCE_RE.search(notes)
    if not m:
        return None, notes.strip()
    km = int(m.group(1))
    clean = DISTANCE_RE.sub("", notes).strip()
    clean = re.sub(r"^[、，,;\s]+|[、，,;\s]+$", "", clean)
    return km, clean


def split_products_grouped(products_text: str) -> list[dict[str, Any]]:
    """Port of HTML splitProductsGrouped — ;;cat;;prods;;…"""
    str_ = (products_text or "").strip()
    if not str_ or not str_.startswith(";;"):
        return []
    body = str_.lstrip(";")
    parts = body.split(";;")
    out: list[dict[str, Any]] = []
    for i in range(0, len(parts) - 1, 2):
        cat = parts[i].strip().lstrip("0123456789.").strip()
        prods_str = parts[i + 1].strip() if i + 1 < len(parts) else ""
        if not cat or not prods_str:
            continue
        prods = [p.strip() for p in re.split(r"[、，·]", prods_str) if p.strip()]
        if prods:
            out.append({"category": cat, "products": prods})
    return out


def flat_products(products_text: str) -> list[str]:
    """Port of HTML flatProducts for flat or grouped encoding."""
    str_ = (products_text or "").strip()
    if not str_:
        return []
    if str_.startswith(";;"):
        items: list[str] = []
        for grp in split_products_grouped(str_):
            items.extend(grp["products"])
        return items
    normalized = (
        str_.replace("、、", "、")
        .replace("，，", "、")
        .replace(";;", "；")
        .replace("；；", "；")
    )
    items = []
    for part in re.split(r"[；]", normalized):
        for sub in re.split(r"[、，]", part):
            t = sub.strip()
            if t:
                items.append(t)
    if len(items) <= 1:
        items = [s.strip() for s in re.split(r"[、，；]", normalized) if s.strip()]
    return items


def products_summary(products_text: str, products_json: list[dict[str, Any]]) -> str:
    """Human-readable product line for browse table (no ;; delimiters)."""
    if products_json:
        chunks: list[str] = []
        for grp in products_json:
            cat = grp.get("category") or ""
            prods: list[str] = grp.get("products") or []
            if not prods:
                continue
            head = ", ".join(prods[:3])
            if len(prods) > 3:
                head += "…"
            chunks.append(f"{cat}: {head}" if cat else head)
        return " | ".join(chunks)
    items = flat_products(products_text)
    if not items:
        return ""
    head = "、".join(items[:6])
    return head + ("…" if len(items) > 6 else "")


def default_overlays_path() -> Path:
    return (
        Path(__file__).resolve().parents[2]
        / ".trellis"
        / "tasks"
        / "07-12-supplier-directory-vs-price-library"
        / "research"
        / "seed-overlays.json"
    )


def load_seed_overlays(path: Path | None = None) -> dict[str, Any]:
    p = path or default_overlays_path()
    if not p.is_file():
        return {}
    return json.loads(p.read_text(encoding="utf-8"))


def apply_seed_overlay(item: dict[str, Any], overlays: dict[str, Any]) -> None:
    name = item["name_zh"]
    ov = overlays.get(name)
    if not ov:
        return
    if ov.get("notes"):
        item["notes"] = str(ov["notes"]).strip()
    locs_in: list[dict[str, Any]] = ov.get("locations") or []
    if not locs_in:
        return
    locs_out: list[dict[str, Any]] = []
    distances: list[int] = []
    for loc in locs_in:
        entry = {
            "type": loc.get("type", ""),
            "type_id": loc.get("type_id", ""),
            "address": item["address"] if loc.get("address_from_field") else loc.get("address", ""),
            "distance_km": loc.get("distance_km"),
            "phone": loc.get("phone", ""),
            "contact": loc.get("contact", ""),
        }
        if entry["distance_km"] is not None:
            distances.append(int(entry["distance_km"]))
        locs_out.append(entry)
    item["locations_json"] = json.dumps(locs_out, ensure_ascii=False)
    if distances and item.get("distance_km") is None:
        item["distance_km"] = min(distances)


def parse_suppliers_from_html(text: str, overlays: dict[str, Any] | None = None) -> list[dict[str, Any]]:
    m = re.search(r"let allData = (\[[\s\S]*?\]);\s*\n", text)
    if not m:
        raise ValueError("allData array not found")
    raw = m.group(1)
    objects = re.findall(r"\{[^{}]*\}", raw)
    overlay_map = overlays if overlays is not None else load_seed_overlays()
    out: list[dict[str, Any]] = []
    for obj in objects:
        item: dict[str, Any] = {v: "" for v in FIELD_MAP.values()}
        for zh, en in FIELD_MAP.items():
            item[en] = _js_string_field(obj, zh).strip()

        if not item["name_zh"]:
            continue

        notes_raw = item["notes"]
        km, notes_clean = extract_distance_km(notes_raw)
        item["notes"] = notes_clean
        item["distance_km"] = km

        grouped = split_products_grouped(item["products_text"])
        item["products_json"] = json.dumps(grouped, ensure_ascii=False)
        item["products_summary"] = products_summary(item["products_text"], grouped)
        item["locations_json"] = "[]"

        apply_seed_overlay(item, overlay_map)

        item["name_key"] = normalize_name_key(item["name_zh"])
        item["source"] = SOURCE
        item["seed_version"] = SEED_VERSION
        item["from_seed"] = True

        hash_payload = {k: item.get(k) for k in HASH_FIELDS}
        if hash_payload.get("distance_km") is None:
            hash_payload["distance_km"] = None
        item["source_hash"] = _source_hash(hash_payload)
        out.append(item)
    return out


def _js_field_any(obj: str, key: str) -> str:
    m = re.search(rf"{re.escape(key)}:'((?:\\'|[^'])*)'", obj)
    if m:
        return m.group(1).replace("\\'", "'")
    m = re.search(rf"{re.escape(key)}:(\d+)", obj)
    if m:
        return m.group(1)
    return ""


def parse_vehicles_from_html(text: str) -> list[dict[str, Any]]:
    m = re.search(r"const VEHICLE_DATA = (\[[\s\S]*?\]);\s*\n", text)
    if not m:
        raise ValueError("VEHICLE_DATA not found")
    raw = m.group(1)
    objects = re.findall(r"\{[^{}]*\}", raw)
    out: list[dict[str, Any]] = []
    for obj in objects:
        no_s = _js_field_any(obj, "no")
        if not no_s.isdigit():
            continue
        no = int(no_s)
        item = {
            "seed_key": f"lalamove:{no}",
            "sort_no": no,
            "name_zh": _js_field_any(obj, "zh"),
            "name_id": _js_field_any(obj, "id"),
            "load_zh": _js_field_any(obj, "load"),
            "load_id": _js_field_any(obj, "loadId"),
            "size_zh": _js_field_any(obj, "size"),
            "size_id": _js_field_any(obj, "sizeId"),
            "use_zh": _js_field_any(obj, "use"),
            "use_id": _js_field_any(obj, "useId"),
            "source": SOURCE,
            "seed_version": SEED_VERSION,
            "from_seed": True,
        }
        base = {k: item[k] for k in item if k not in ("from_seed", "source_hash")}
        item["source_hash"] = _source_hash(base)
        out.append(item)
    out.sort(key=lambda r: r["sort_no"])
    return out


def load_html(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def default_html_path() -> Path:
    return (
        Path(__file__).resolve().parents[2]
        / ".trellis"
        / "tasks"
        / "07-12-supplier-directory-vs-price-library"
        / "research"
        / "index-supplier-directory.html"
    )


if __name__ == "__main__":
    html = load_html(default_html_path())
    suppliers = parse_suppliers_from_html(html)
    vehicles = parse_vehicles_from_html(html)
    print(f"suppliers={len(suppliers)} vehicles={len(vehicles)}")
    gsm = next((r for r in suppliers if r["name_zh"] == "GSMI"), None)
    if gsm:
        print(f"GSMI distance_km={gsm.get('distance_km')} notes={gsm.get('notes')!r}")
