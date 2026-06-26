#!/usr/bin/env python3
"""
Accurate Online MCP Server — 只读数据抓取

提供对 Accurate Online 系统的只读查询工具，供 Agent 调用：
- 测试连接 / 数据库列表
- 按关键词搜索库存商品
- 查询任意表数据，日期区间可选，自动分页（单据/主数据通用）

环境变量 (必填):
  AOL_ACCESS_TOKEN     — Bearer 令牌
  AOL_SIGNATURE_SECRET — HMAC-SHA256 签名密钥
  AOL_DATABASE_ID      — 数据库实例 ID（子域名部分，如 "wanding"）

可选:
  AOL_BASE_URL         — 默认 https://account.accurate.id
"""

import asyncio
import hashlib
import hmac
import json
import logging
import os
import re
import sys
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import date, datetime
from typing import Any, Dict, List, Optional

import requests

try:
    from mcp.server import Server
    from mcp.server.stdio import stdio_server
    from mcp.types import Tool, TextContent
except ImportError:
    print("Error: mcp package not found. Install with: pip install mcp", file=sys.stderr)
    sys.exit(1)

try:
    from dotenv import load_dotenv, find_dotenv
    # Walk up from this file's location to find .env
    _env_path = find_dotenv(usecwd=True) or find_dotenv()
    load_dotenv(_env_path, override=False)
except ImportError:
    pass

logging.basicConfig(level=logging.WARNING, stream=sys.stderr)
logger = logging.getLogger("accurate_mcp")

app = Server("accurate-mcp")

# ---------------------------------------------------------------------------
# Accurate API 客户端（只读，自包含）
# ---------------------------------------------------------------------------

def _generate_signature(secret: str):
    ts = str(int(time.time()))
    sig = hmac.new(secret.encode(), ts.encode(), hashlib.sha256).hexdigest()
    return ts, sig


class AccurateClient:
    """只读 Accurate Online API 客户端。"""

    def __init__(self):
        self.access_token = os.getenv("AOL_ACCESS_TOKEN", "")
        self.signature_secret = os.getenv("AOL_SIGNATURE_SECRET", "")
        self.database_id = os.getenv("AOL_DATABASE_ID", "")
        self.base_url = os.getenv("AOL_BASE_URL", "https://account.accurate.id")

    def _check_creds(self):
        if not self.access_token:
            raise ValueError("AOL_ACCESS_TOKEN 未设置")
        if not self.signature_secret:
            raise ValueError("AOL_SIGNATURE_SECRET 未设置")

    def _headers(self) -> Dict[str, str]:
        ts, sig = _generate_signature(self.signature_secret)
        return {
            "Authorization": f"Bearer {self.access_token}",
            "X-Api-Timestamp": ts,
            "X-Api-Signature": sig,
        }

    def _db_url(self, endpoint: str) -> str:
        if not self.database_id:
            raise ValueError("AOL_DATABASE_ID 未设置")
        return f"https://{self.database_id}.accurate.id/accurate{endpoint}"

    def _global_url(self, endpoint: str) -> str:
        return f"{self.base_url}{endpoint}"

    def get(self, endpoint: str, params: Optional[Dict] = None,
            use_db_url: bool = True, timeout: int = 30) -> Dict[str, Any]:
        self._check_creds()
        url = self._db_url(endpoint) if use_db_url else self._global_url(endpoint)
        last_error: Optional[Exception] = None
        for attempt in range(1, 4):
            try:
                resp = requests.get(url, headers=self._headers(), params=params, timeout=timeout)
                resp.raise_for_status()
                return resp.json()
            except requests.exceptions.Timeout as e:
                last_error = e
            except requests.exceptions.RequestException as e:
                last_error = e
            if attempt < 3:
                time.sleep(0.8 * attempt)
        if isinstance(last_error, requests.exceptions.Timeout):
            raise TimeoutError(f"请求超时: {endpoint}")
        raise RuntimeError(f"请求失败: {endpoint} — {last_error}")

    # --- 便捷方法 ---

    def db_list(self) -> Dict[str, Any]:
        return self.get("/api/db-list.do", use_db_url=False)

    def item_list(self, keywords: Optional[str] = None,
                  item_code: Optional[str] = None,
                  fields: str = "id,no",
                  timeout: int = 30) -> List[dict]:
        params: Dict[str, Any] = {"fields": fields}
        if item_code is not None:
            params["filter.no"] = item_code
        elif keywords is not None:
            params["filter.keywords"] = keywords
        else:
            return []

        def _extract(result):
            if not result.get("s"):
                return []
            data = result.get("d", [])
            if isinstance(data, dict):
                data = data.get("r", [])
            return data if isinstance(data, list) else []

        rows = _extract(self.get("/api/item/list.do", params=params, use_db_url=True, timeout=timeout))

        # API 不支持多词搜索，fallback：用第一个有效 token 重试
        if not rows and keywords and " " in keywords.strip():
            tokens = [t for t in keywords.split() if len(t) >= 2]
            if tokens:
                params2 = {**params, "filter.keywords": tokens[0]}
                rows = _extract(self.get("/api/item/list.do", params=params2, use_db_url=True, timeout=timeout))

        # filter.keywords 可能对商品名无效，fallback：filter.name
        if not rows and keywords and item_code is None:
            params3 = {"fields": params["fields"], "filter.name": keywords}
            rows = _extract(self.get("/api/item/list.do", params=params3, use_db_url=True, timeout=timeout))

        return rows

    def item_detail(self, item_id: str, timeout: int = 30) -> Optional[Dict[str, Any]]:
        result = self.get("/api/item/detail.do", params={"id": item_id},
                          use_db_url=True, timeout=timeout)
        if not result.get("s"):
            return None
        return result.get("d")

    def get_detail(self, table_name: str, record_id: str,
                   fields: Optional[str] = None,
                   timeout: int = 30) -> Dict[str, Any]:
        params: Dict[str, Any] = {"id": record_id}
        if fields:
            params["fields"] = fields
        return self.get(f"/api/{table_name}/detail.do", params=params,
                        use_db_url=True, timeout=timeout)

    def fetch_list(self, table_name: str, params: Dict[str, Any],
                   timeout: int = 30) -> Dict[str, Any]:
        return self.get(f"/api/{table_name}/list.do", params=params,
                        use_db_url=True, timeout=timeout)

    def vendor_list(self, keywords: str, fields: str = "id,no,name",
                    timeout: int = 30) -> List[dict]:
        params: Dict[str, Any] = {"fields": fields, "filter.keywords": keywords}
        rows = _extract_rows(self.get("/api/vendor/list.do", params=params,
                                      use_db_url=True, timeout=timeout))
        if not rows:
            params = {"fields": fields, "filter.name": keywords}
            rows = _extract_rows(self.get("/api/vendor/list.do", params=params,
                                          use_db_url=True, timeout=timeout))
        return rows

    def master_list(self, table_name: str, keywords: str,
                    fields: str = "id,no,name", timeout: int = 30) -> List[dict]:
        table_name = _normalize_table_name(table_name)
        for filter_name in ("filter.keywords", "filter.name", "filter.no"):
            params: Dict[str, Any] = {"fields": fields, filter_name: keywords}
            rows = _extract_rows(self.get(f"/api/{table_name}/list.do", params=params,
                                          use_db_url=True, timeout=timeout))
            if rows:
                return rows
        return []

    def fetch_by_date(self, table_name: str,
                      start: Optional[str] = None, end: Optional[str] = None,
                      date_field: str = "transDate",
                      page: int = 1, page_size: int = 100,
                      fields: Optional[str] = None,
                      extra_params: Optional[Dict[str, Any]] = None,
                      timeout: int = 30) -> Dict[str, Any]:
        params: Dict[str, Any] = {"sp.page": page, "sp.pageSize": page_size}
        if start and end:
            params[f"filter.{date_field}.op"] = "BETWEEN"
            params[f"filter.{date_field}.val[0]"] = start
            params[f"filter.{date_field}.val[1]"] = end
        if fields:
            params["fields"] = fields
        if extra_params:
            params.update(extra_params)
        return self.get(f"/api/{table_name}/list.do", params=params,
                        use_db_url=True, timeout=timeout)



# ---------------------------------------------------------------------------
# 解析 Item 详情
# ---------------------------------------------------------------------------

def _parse_item(data: Dict[str, Any]) -> Dict[str, Any]:
    def _s(keys):
        for k in keys:
            v = data.get(k)
            if v:
                return str(v).strip()
        return ""

    item_type = _s(["itemType", "itemTypeName"])
    if not item_type and isinstance(data.get("type"), dict):
        item_type = data["type"].get("name", "")

    unit = _s(["unit1Name"])
    if not unit and isinstance(data.get("vendorUnit"), dict):
        unit = data["vendorUnit"].get("name", "")
    if not unit and isinstance(data.get("unit"), dict):
        unit = data["unit"].get("name", "")

    qty_wh = data.get("balance") or data.get("quantityOnHand") or 0.0
    qty_avail = data.get("availableToSell") or data.get("quantityAvailable") or 0.0

    wh_list = data.get("detailWarehouseData") or []
    if isinstance(wh_list, list) and wh_list and qty_wh == 0.0:
        total = sum(
            float(wh.get("balance") or wh.get("unit1Quantity") or wh.get("quantity") or 0)
            for wh in wh_list if isinstance(wh, dict)
        )
        qty_wh = total
        if qty_avail == 0.0:
            qty_avail = total

    warehouses = []
    for wh in (wh_list or []):
        if isinstance(wh, dict):
            warehouses.append({
                "warehouse": wh.get("warehouseName") or wh.get("name", ""),
                "qty": float(wh.get("balance") or wh.get("unit1Quantity") or 0),
            })

    return {
        "item_no": _s(["no"]),
        "item_name": _s(["name"]),
        "item_type": item_type,
        "unit": unit,
        "qty_warehouse": float(qty_wh),
        "qty_available": float(qty_avail),
        "warehouses": warehouses,
    }


def _normalize_table_name(table_name: str) -> str:
    value = str(table_name).strip().lstrip("/")
    if value.startswith("api/"):
        value = value[4:]
    return value


def _extract_rows(result: Dict[str, Any]) -> List[dict]:
    if not result.get("s"):
        return []
    data = result.get("d", [])
    if isinstance(data, dict):
        data = data.get("r", [])
    return data if isinstance(data, list) else []


def _parse_ddmmyyyy(value: Any) -> Optional[date]:
    if value in (None, ""):
        return None
    text = str(value).strip()
    for fmt in ("%d/%m/%Y", "%Y-%m-%d", "%d-%m-%Y"):
        try:
            return datetime.strptime(text[:10], fmt).date()
        except ValueError:
            pass
    return None


def _first_text(data: Dict[str, Any], keys: List[str]) -> str:
    for key in keys:
        value = data.get(key)
        if isinstance(value, dict):
            nested = _first_text(value, ["name", "no", "number", "code", "id"])
            if nested:
                return nested
        elif isinstance(value, str) and value.strip():
            return value.strip()
        elif value not in (None, ""):
            return str(value).strip()
    return ""


def _vendor_text(data: Dict[str, Any]) -> str:
    parts = []
    for key in (
        "vendorName",
        "vendorNo",
        "vendorId",
        "vendor",
        "supplierName",
        "supplier",
        "customerName",
        "name",
    ):
        value = data.get(key)
        if isinstance(value, dict):
            parts.extend(
                str(value.get(k, "")).strip()
                for k in ("name", "no", "number", "code", "id")
                if value.get(k)
            )
        elif value not in (None, ""):
            parts.append(str(value).strip())
    return " ".join(p for p in parts if p)


def _amount_value(data: Dict[str, Any]) -> float:
    for key in (
        "totalAmount",
        "total",
        "amount",
        "grandTotal",
        "subTotal",
        "inclusiveTaxAmount",
        "taxableAmount",
    ):
        value = data.get(key)
        if value in (None, ""):
            continue
        try:
            return float(str(value).replace(",", ""))
        except ValueError:
            continue
    return 0.0


def _record_date(data: Dict[str, Any], preferred_field: str = "transDate") -> Optional[date]:
    fields = [preferred_field, "transDate", "date", "invoiceDate", "shipDate", "createdDate"]
    for field in dict.fromkeys(fields):
        parsed = _parse_ddmmyyyy(data.get(field))
        if parsed:
            return parsed
    return None


def _compact_detail(data: Dict[str, Any], fields: Optional[List[str]]) -> Dict[str, Any]:
    if not fields:
        return data
    return {field: data.get(field) for field in fields if field in data}


def _batch_get_details(
    client: AccurateClient,
    table_name: str,
    ids: List[str],
    fields: Optional[str] = None,
    concurrency: int = 8,
) -> Dict[str, Any]:
    clean_ids = []
    seen = set()
    for record_id in ids:
        value = str(record_id).strip()
        if value and value not in seen:
            seen.add(value)
            clean_ids.append(value)

    field_list = [part.strip() for part in fields.split(",") if part.strip()] if fields else None
    workers = max(1, min(int(concurrency or 8), 16, len(clean_ids) or 1))
    rows: List[Dict[str, Any]] = []
    errors: List[Dict[str, Any]] = []

    def fetch_one(record_id: str) -> Dict[str, Any]:
        result = client.get_detail(table_name=table_name, record_id=record_id, fields=fields)
        if not result.get("s"):
            return {"id": record_id, "ok": False, "error": result}
        detail = result.get("d")
        if not isinstance(detail, dict):
            return {"id": record_id, "ok": False, "error": result}
        compact = _compact_detail(detail, field_list)
        if "id" not in compact:
            compact = {"id": record_id, **compact}
        return {"id": record_id, "ok": True, "data": compact}

    with ThreadPoolExecutor(max_workers=workers) as executor:
        future_map = {executor.submit(fetch_one, record_id): record_id for record_id in clean_ids}
        for future in as_completed(future_map):
            record_id = future_map[future]
            try:
                item = future.result()
            except Exception as exc:
                errors.append({"id": record_id, "error": f"{type(exc).__name__}: {exc}"})
                continue
            if item.get("ok"):
                rows.append(item["data"])
            else:
                errors.append({"id": record_id, "error": item.get("error")})

    order = {record_id: idx for idx, record_id in enumerate(clean_ids)}
    rows.sort(key=lambda item: order.get(str(item.get("id")), len(order)))
    return {
        "table_name": table_name,
        "requested_count": len(clean_ids),
        "success_count": len(rows),
        "error_count": len(errors),
        "concurrency": workers,
        "records": rows,
        "errors": errors[:20],
    }


def _vendor_candidates(client: AccurateClient, vendor_keyword: str) -> List[Dict[str, str]]:
    candidates = []
    for row in client.vendor_list(vendor_keyword):
        if not isinstance(row, dict):
            continue
        vendor_id = str(row.get("id") or "").strip()
        text = _vendor_text(row) or _first_text(row, ["name", "no"])
        if vendor_id or text:
            candidates.append({"id": vendor_id, "text": text})
    return candidates[:20]


def _vendor_filter_options(vendor: Dict[str, str]) -> List[Dict[str, Any]]:
    options: List[Dict[str, Any]] = []
    vendor_id = vendor.get("id")
    if vendor_id:
        options.extend(
            [
                {"filter.vendorId": vendor_id},
                {"filter.vendor.id": vendor_id},
                {"filter.vendor": vendor_id},
            ]
        )
    text = vendor.get("text")
    if text:
        options.extend(
            [
                {"filter.vendorName": text},
                {"filter.vendor.name": text},
            ]
        )
    return options


def _fetch_purchase_rows(
    client: AccurateClient,
    table_name: str,
    start_date: str,
    end_date: str,
    date_field: str,
    page_size: int,
    max_pages: int,
    fields: str,
    extra_params: Optional[Dict[str, Any]] = None,
) -> List[Dict[str, Any]]:
    rows_out: List[Dict[str, Any]] = []
    last_ids: Optional[set] = None
    for page in range(1, max_pages + 1):
        result = client.fetch_by_date(
            table_name=table_name,
            start=start_date,
            end=end_date,
            date_field=date_field,
            page=page,
            page_size=page_size,
            fields=fields,
            extra_params=extra_params,
        )
        rows = _extract_rows(result)
        if not rows:
            break
        current_ids = {row.get("id") for row in rows if isinstance(row, dict)}
        if last_ids is not None and current_ids == last_ids:
            break
        rows_out.extend(row for row in rows if isinstance(row, dict))
        if len(rows) < page_size:
            break
        last_ids = current_ids
    return rows_out


def _month_ranges(start_date: Optional[str], end_date: Optional[str]) -> List[Dict[str, str]]:
    start = _parse_ddmmyyyy(start_date)
    end = _parse_ddmmyyyy(end_date)
    if not start or not end or start > end:
        return []
    ranges = []
    cursor = date(start.year, start.month, 1)
    while cursor <= end:
        if cursor.month == 12:
            next_month = date(cursor.year + 1, 1, 1)
        else:
            next_month = date(cursor.year, cursor.month + 1, 1)
        chunk_start = max(start, cursor)
        chunk_end = min(end, date.fromordinal(next_month.toordinal() - 1))
        ranges.append({
            "start": chunk_start.strftime("%d/%m/%Y"),
            "end": chunk_end.strftime("%d/%m/%Y"),
        })
        cursor = next_month
    return ranges


def _fetch_rows_resilient(
    client: AccurateClient,
    table_name: str,
    start_date: Optional[str],
    end_date: Optional[str],
    date_field: str,
    page_size: int,
    max_pages: int,
    fields: str,
    extra_params: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    try:
        rows = _fetch_purchase_rows(
            client=client,
            table_name=table_name,
            start_date=start_date,
            end_date=end_date,
            date_field=date_field,
            page_size=page_size,
            max_pages=max_pages,
            fields=fields,
            extra_params=extra_params,
        )
        return {"rows": rows, "split_by_month": False, "errors": []}
    except (TimeoutError, RuntimeError) as exc:
        chunks = _month_ranges(start_date, end_date)
        if len(chunks) <= 1:
            raise
        rows_out: List[Dict[str, Any]] = []
        errors = []
        for chunk in chunks:
            try:
                rows_out.extend(_fetch_purchase_rows(
                    client=client,
                    table_name=table_name,
                    start_date=chunk["start"],
                    end_date=chunk["end"],
                    date_field=date_field,
                    page_size=page_size,
                    max_pages=max_pages,
                    fields=fields,
                    extra_params=extra_params,
                ))
            except (TimeoutError, RuntimeError) as chunk_exc:
                errors.append({"range": chunk, "error": str(chunk_exc)})
        if not rows_out and errors:
            raise RuntimeError(f"请求失败，按月拆分后仍无可用数据: {errors[:3]}") from exc
        return {"rows": rows_out, "split_by_month": True, "errors": errors}


def _search_records(
    client: AccurateClient,
    table_name: str,
    keyword: str,
    search_fields: Optional[List[str]] = None,
    fields: Optional[str] = None,
    page_size: int = 100,
    max_pages: int = 10,
) -> Dict[str, Any]:
    table_name = _normalize_table_name(table_name)
    search_fields = search_fields or ["keywords", "name", "no"]
    page_size = _clamp_int(page_size, default=100, minimum=1, maximum=200)
    max_pages = _clamp_int(max_pages, default=10, minimum=1, maximum=100)
    keyword_norm = keyword.strip().lower()
    filter_attempts = []
    records: List[Dict[str, Any]] = []
    seen_ids = set()

    for field in search_fields:
        filter_key = field if field.startswith("filter.") else f"filter.{field}"
        params_base: Dict[str, Any] = {filter_key: keyword, "fields": fields or "id,no,name"}
        found_for_field = 0
        last_ids: Optional[set] = None
        for page in range(1, max_pages + 1):
            params = {**params_base, "sp.page": page, "sp.pageSize": page_size}
            result = client.fetch_list(table_name, params=params)
            rows = _extract_rows(result)
            if not rows:
                break
            current_ids = {row.get("id") for row in rows if isinstance(row, dict)}
            if last_ids is not None and current_ids == last_ids:
                break
            for row in rows:
                if not isinstance(row, dict):
                    continue
                if keyword_norm and keyword_norm not in _flatten_text(row).lower():
                    continue
                marker = str(row.get("id") or json.dumps(row, sort_keys=True, ensure_ascii=False))
                if marker in seen_ids:
                    continue
                seen_ids.add(marker)
                records.append(row)
                found_for_field += 1
            if len(rows) < page_size:
                break
            last_ids = current_ids
        filter_attempts.append({"filter": filter_key, "matched": found_for_field})
        if records:
            break

    return {
        "table_name": table_name,
        "keyword": keyword,
        "search_fields": search_fields,
        "filter_attempts": filter_attempts,
        "count": len(records),
        "records": records,
    }


def _as_string_list(value: Any, default: List[str]) -> List[str]:
    if value in (None, ""):
        return default
    if isinstance(value, str):
        stripped = value.strip()
        if stripped.startswith("[") and stripped.endswith("]"):
            try:
                parsed = json.loads(stripped)
                if isinstance(parsed, list):
                    return [str(part).strip() for part in parsed if str(part).strip()]
            except json.JSONDecodeError:
                pass
        return [part.strip() for part in value.split(",") if part.strip()]
    if isinstance(value, list):
        return [str(part).strip() for part in value if str(part).strip()]
    return default


def _clamp_int(value: Any, default: int, minimum: int, maximum: int) -> int:
    try:
        parsed = int(value)
    except (TypeError, ValueError):
        parsed = default
    return max(minimum, min(parsed, maximum))


def _string_or_array_schema(description: str) -> Dict[str, Any]:
    return {
        "oneOf": [
            {"type": "array", "items": {"type": "string"}},
            {"type": "string"},
        ],
        "description": description,
    }


def _int_or_string_schema(description: str, default: int, minimum: int, maximum: int) -> Dict[str, Any]:
    return {
        "oneOf": [
            {"type": "integer", "minimum": minimum, "maximum": maximum},
            {"type": "string"},
        ],
        "description": description,
        "default": default,
    }


def _id_list_schema(description: str) -> Dict[str, Any]:
    return {
        "oneOf": [
            {"type": "array", "items": {"type": "string"}},
            {"type": "string"},
            {"type": "object"},
        ],
        "description": description,
    }


def _as_id_list(value: Any) -> List[str]:
    if value in (None, ""):
        return []
    if isinstance(value, list):
        ids: List[str] = []
        for item in value:
            if isinstance(item, dict):
                candidate = item.get("id") or item.get("record_id") or item.get("recordId")
                if candidate not in (None, ""):
                    ids.append(str(candidate).strip())
            elif item not in (None, ""):
                ids.append(str(item).strip())
        return [record_id for record_id in ids if record_id]
    if isinstance(value, dict):
        for key in ("ids", "items", "item", "records", "data"):
            if key in value:
                parsed = _as_id_list(value.get(key))
                if parsed:
                    return parsed
        candidate = value.get("id") or value.get("record_id") or value.get("recordId")
        return [str(candidate).strip()] if candidate not in (None, "") else []
    if isinstance(value, str):
        text = value.strip()
        if not text:
            return []
        try:
            parsed = json.loads(text)
            parsed_ids = _as_id_list(parsed)
            if parsed_ids:
                return parsed_ids
        except json.JSONDecodeError:
            pass
        cleaned = text.strip("[]")
        parts = re.split(r"[\s,]+", cleaned)
        return [part.strip().strip("'\"") for part in parts if part.strip().strip("'\"")]
    return [str(value).strip()]


def _flatten_text(value: Any) -> str:
    parts: List[str] = []
    if isinstance(value, dict):
        for nested in value.values():
            text = _flatten_text(nested)
            if text:
                parts.append(text)
    elif isinstance(value, list):
        for nested in value:
            text = _flatten_text(nested)
            if text:
                parts.append(text)
    elif value not in (None, ""):
        parts.append(str(value).strip())
    return " ".join(parts)


def _text_from_fields(data: Dict[str, Any], fields: List[str]) -> str:
    parts = []
    for field in fields:
        if "." in field:
            current: Any = data
            for part in field.split("."):
                if isinstance(current, dict):
                    current = current.get(part)
                else:
                    current = None
                    break
            if isinstance(current, dict):
                parts.append(_first_text(current, ["name", "no", "number", "code", "id"]))
            elif current not in (None, ""):
                parts.append(str(current).strip())
        else:
            value = data.get(field)
            if isinstance(value, dict):
                parts.append(_first_text(value, ["name", "no", "number", "code", "id"]))
            elif value not in (None, ""):
                parts.append(str(value).strip())
    return " ".join(part for part in parts if part)


def _values_from_field(data: Dict[str, Any], field: str) -> List[str]:
    current: Any = data
    for part in field.split("."):
        if isinstance(current, dict):
            current = current.get(part)
        else:
            current = None
            break
    if isinstance(current, dict):
        values = []
        for key in ("id", "name", "no", "number", "code"):
            value = current.get(key)
            if value not in (None, ""):
                values.append(str(value).strip())
        return values
    if isinstance(current, list):
        values = []
        for item in current:
            if isinstance(item, dict):
                values.extend(_values_from_field(item, "id"))
            elif item not in (None, ""):
                values.append(str(item).strip())
        return values
    if current not in (None, ""):
        return [str(current).strip()]
    return []


def _id_like_values(value: Any) -> List[str]:
    values: List[str] = []
    if isinstance(value, dict):
        for key, nested in value.items():
            key_lower = str(key).lower()
            if key_lower == "id" or key_lower.endswith("id"):
                if nested not in (None, "") and not isinstance(nested, (dict, list)):
                    values.append(str(nested).strip())
            values.extend(_id_like_values(nested))
    elif isinstance(value, list):
        for nested in value:
            values.extend(_id_like_values(nested))
    return values


def _amount_from_fields(data: Dict[str, Any], fields: List[str]) -> float:
    for field in fields:
        value = data.get(field)
        if value in (None, ""):
            continue
        try:
            return float(str(value).replace(",", ""))
        except ValueError:
            continue
    return _amount_value(data)


def _build_filter_options(
    client: AccurateClient,
    keyword: str,
    master_table: Optional[str],
    master_id_filter_fields: List[str],
    master_text_filter_fields: List[str],
    direct_filter_fields: List[str],
) -> Dict[str, Any]:
    options: List[Dict[str, Any]] = []
    master_candidates: List[Dict[str, Any]] = []
    if not keyword or keyword.strip() in ("*", "ALL", "all"):
        return {"options": options, "master_candidates": master_candidates}

    for field in direct_filter_fields:
        filter_name = field if field.startswith("filter.") else f"filter.{field}"
        options.append({filter_name: keyword})

    if master_table:
        for row in client.master_list(master_table, keyword):
            if not isinstance(row, dict):
                continue
            candidate = {
                "table": master_table,
                "id": str(row.get("id") or "").strip(),
                "text": _first_text(row, ["name", "no", "number", "code", "id"]),
            }
            master_candidates.append(candidate)
            if candidate["id"]:
                for field in master_id_filter_fields:
                    filter_name = field if field.startswith("filter.") else f"filter.{field}"
                    options.append({filter_name: candidate["id"]})
            if candidate["text"]:
                for field in master_text_filter_fields:
                    filter_name = field if field.startswith("filter.") else f"filter.{field}"
                    options.append({filter_name: candidate["text"]})

    deduped: List[Dict[str, Any]] = []
    seen = set()
    for option in options:
        marker = json.dumps(option, sort_keys=True, ensure_ascii=False)
        if marker not in seen:
            seen.add(marker)
            deduped.append(option)
    return {"options": deduped, "master_candidates": master_candidates[:20]}


def _match_terms_for_summary(keyword: str, master_candidates: List[Dict[str, Any]]) -> List[str]:
    if not keyword or keyword.strip() in ("*", "ALL", "all"):
        return []
    terms = [keyword]
    for candidate in master_candidates:
        for key in ("id", "text"):
            value = str(candidate.get(key) or "").strip()
            if value:
                terms.append(value)
    deduped: List[str] = []
    seen = set()
    for term in terms:
        marker = term.lower()
        if marker and marker not in seen:
            seen.add(marker)
            deduped.append(term)
    return deduped


def _record_matches_summary(data: Dict[str, Any], fields: List[str], terms: List[str]) -> bool:
    if not terms:
        return True
    field_text = _text_from_fields(data, fields).lower()
    all_text = _flatten_text(data).lower()
    for term in terms:
        needle = str(term).strip().lower()
        if needle and (needle in field_text or needle in all_text):
            return True
    return False


def _master_ids_for_summary(keyword: str, master_candidates: List[Dict[str, Any]]) -> List[str]:
    keyword_norm = str(keyword or "").strip().lower()
    exact_candidates = [
        candidate
        for candidate in master_candidates
        if keyword_norm and str(candidate.get("text") or "").strip().lower() == keyword_norm
    ]
    candidates = exact_candidates or master_candidates
    ids: List[str] = []
    seen = set()
    for candidate in candidates:
        value = str(candidate.get("id") or "").strip()
        marker = value.lower()
        if value and marker not in seen:
            seen.add(marker)
            ids.append(value)
    return ids


def _record_master_match_status(
    data: Dict[str, Any],
    master_ids: List[str],
    fields: List[str],
) -> Optional[bool]:
    if not master_ids:
        return None
    wanted = {str(master_id).strip().lower() for master_id in master_ids if str(master_id).strip()}
    values: List[str] = []
    for field in fields:
        field_lower = field.lower()
        if field_lower == "id" or field_lower.endswith("id") or ".id" in field_lower:
            values.extend(_values_from_field(data, field))
        elif "." not in field_lower and field_lower in ("vendor", "customer", "supplier", "project", "department", "employee"):
            nested = data.get(field)
            if isinstance(nested, dict) and nested.get("id") not in (None, ""):
                values.append(str(nested.get("id")).strip())
    normalized = {str(value).strip().lower() for value in values if str(value).strip()}
    if not normalized:
        return None
    return bool(wanted.intersection(normalized))


def _summarize_diagnostic_hints(
    *,
    keyword: str,
    master_table: Optional[str],
    master_id_filter_fields: List[str],
    scanned_records: int,
    matched_count: int,
    master_candidates: List[Dict[str, Any]],
) -> List[str]:
    hints: List[str] = []
    if matched_count == 0 and scanned_records > 0:
        hints.append(
            "matched_count=0 但 scanned_records>0：检查 master_id_filter_fields 是否为 JSON 数组 "
            '["vendorId","vendor.id"] 或逗号字符串 vendorId,vendor.id；勿传字符串化 JSON 如 \'["vendorId"]\'。'
        )
        hints.append(
            "对每个 vendor/customer 分别调用 accurate_summarize_records；禁止用「整体汇总 − 子公司汇总」相减。"
        )
        if master_table and not master_id_filter_fields:
            hints.append(
                f"已设置 master_table={master_table} 但未提供 master_id_filter_fields；"
                "采购/销售汇总应包含 vendorId 或 customerId 等 ID 字段。"
            )
        if master_candidates and len(master_candidates) > 1:
            hints.append(
                "master_candidates 有多条：同名前缀主体（如 LESSO vs LESSO TRADING）必须分别汇总，"
                "keyword 使用完整法定名称，最终归属按 ID 精确匹配。"
            )
    if keyword.strip().isdigit() and master_table:
        hints.append(
            "keyword 是纯数字 ID；应先用 accurate_search_records 确认主体，"
            "summarize 的 keyword 使用完整法定名称，由 master_id_filter_fields 负责 ID 归属。"
        )
    return hints


def _summarize_records(
    client: AccurateClient,
    table_name: str,
    keyword: str,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    date_field: str = "transDate",
    text_fields: Optional[List[str]] = None,
    amount_fields: Optional[List[str]] = None,
    group_by: str = "month",
    fields: Optional[str] = None,
    page_size: int = 100,
    max_pages: int = 50,
    detail_when_missing: bool = True,
    concurrency: int = 8,
    master_table: Optional[str] = None,
    master_id_filter_fields: Optional[List[str]] = None,
    master_text_filter_fields: Optional[List[str]] = None,
    direct_filter_fields: Optional[List[str]] = None,
) -> Dict[str, Any]:
    keyword_norm = keyword.strip().lower()
    page_size = _clamp_int(page_size, default=100, minimum=1, maximum=200)
    max_pages = _clamp_int(max_pages, default=50, minimum=1, maximum=500)
    concurrency = _clamp_int(concurrency, default=8, minimum=1, maximum=16)
    text_fields = text_fields or [
        "vendorName", "vendorNo", "vendor", "vendor.name", "vendor.no",
        "customerName", "customerNo", "customer", "customer.name", "customer.no",
        "supplierName", "supplier", "name", "description",
    ]
    amount_fields = amount_fields or [
        "totalAmount", "total", "amount", "grandTotal", "subTotal",
        "inclusiveTaxAmount", "taxableAmount",
    ]
    master_id_filter_fields = master_id_filter_fields or []
    master_text_filter_fields = master_text_filter_fields or []
    direct_filter_fields = direct_filter_fields or []
    list_fields = fields or ",".join(dict.fromkeys(["id", "number", "no", date_field, *amount_fields, *[f for f in text_fields if "." not in f]]))

    filter_info = _build_filter_options(
        client=client,
        keyword=keyword,
        master_table=master_table,
        master_id_filter_fields=master_id_filter_fields,
        master_text_filter_fields=master_text_filter_fields,
        direct_filter_fields=direct_filter_fields,
    )
    match_terms = _match_terms_for_summary(keyword, filter_info["master_candidates"])
    master_ids = _master_ids_for_summary(keyword, filter_info["master_candidates"])
    master_match_fields = list(dict.fromkeys([*master_id_filter_fields, *text_fields]))

    source_rows: List[Dict[str, Any]] = []
    server_filter_used: Optional[Dict[str, Any]] = None
    split_by_month = False
    fetch_errors: List[Dict[str, Any]] = []
    for filter_params in filter_info["options"]:
        fetch_result = _fetch_rows_resilient(
            client=client,
            table_name=table_name,
            start_date=start_date,
            end_date=end_date,
            date_field=date_field,
            page_size=page_size,
            max_pages=max_pages,
            fields=list_fields,
            extra_params=filter_params,
        )
        rows = fetch_result["rows"]
        if rows:
            source_rows = rows
            server_filter_used = filter_params
            split_by_month = bool(fetch_result["split_by_month"])
            fetch_errors.extend(fetch_result["errors"])
            break

    full_table_scan = False
    if not source_rows:
        full_table_scan = True
        fetch_result = _fetch_rows_resilient(
            client=client,
            table_name=table_name,
            start_date=start_date,
            end_date=end_date,
            date_field=date_field,
            page_size=page_size,
            max_pages=max_pages,
            fields=list_fields,
        )
        source_rows = fetch_result["rows"]
        split_by_month = bool(fetch_result["split_by_month"])
        fetch_errors.extend(fetch_result["errors"])

    detail_fetches = 0
    detail_rows_by_id: Dict[str, Dict[str, Any]] = {}
    if detail_when_missing:
        needs_detail = [
            str(row.get("id"))
            for row in source_rows
            if match_terms and row.get("id") and (
                _record_master_match_status(row, master_ids, master_match_fields) is None
                if master_ids
                else not _record_matches_summary(row, text_fields, match_terms)
            )
        ]
        if needs_detail:
            detail_result = _batch_get_details(
                client=client,
                table_name=table_name,
                ids=needs_detail,
                fields=None,
                concurrency=concurrency,
            )
            detail_fetches = int(detail_result["success_count"]) + int(detail_result["error_count"])
            detail_rows_by_id = {
                str(row.get("id")): row
                for row in detail_result["records"]
                if isinstance(row, dict) and row.get("id")
            }

    buckets: Dict[str, Dict[str, Any]] = {}
    matched_records: List[Dict[str, Any]] = []
    for row in source_rows:
        candidate = detail_rows_by_id.get(str(row.get("id")), row)
        text = _text_from_fields(candidate, text_fields) or _text_from_fields(row, text_fields)
        if master_ids:
            candidate_status = _record_master_match_status(candidate, master_ids, master_match_fields)
            row_status = _record_master_match_status(row, master_ids, master_match_fields)
            if candidate_status is not True and row_status is not True:
                continue
        elif not _record_matches_summary(candidate, text_fields, match_terms):
            continue
        trans_date = _record_date(candidate, date_field) or _record_date(row, date_field)
        if group_by == "month" and trans_date:
            key = trans_date.strftime("%Y-%m")
        elif group_by == "date" and trans_date:
            key = trans_date.strftime("%Y-%m-%d")
        else:
            key = "total"
        amount = _amount_from_fields(candidate, amount_fields) or _amount_from_fields(row, amount_fields)
        bucket = buckets.setdefault(key, {"group": key, "amount": 0.0, "count": 0})
        bucket["amount"] += amount
        bucket["count"] += 1
        matched_records.append({
            "id": candidate.get("id") or row.get("id"),
            "number": _first_text(candidate, ["number", "no"]) or _first_text(row, ["number", "no"]),
            "date": trans_date.strftime("%d/%m/%Y") if trans_date else "",
            "matched_text": text,
            "amount": amount,
        })

    groups = [buckets[key] for key in sorted(buckets)]
    total = sum(float(row["amount"]) for row in groups)
    hints = _summarize_diagnostic_hints(
        keyword=keyword,
        master_table=master_table,
        master_id_filter_fields=master_id_filter_fields,
        scanned_records=len(source_rows),
        matched_count=len(matched_records),
        master_candidates=filter_info["master_candidates"],
    )
    if full_table_scan and keyword.strip() not in ("", "*", "ALL", "all"):
        hints.insert(0,
            f"警告：服务端过滤选项均未返回结果，已 fallback 拉取全表 {table_name} 进行客户端过滤。"
            "如果 scanned_records 很大（>500），建议先用 accurate_search_records 确认主体 ID，"
            "再以完整法定名称为 keyword 重新调用，以启用服务端 ID 过滤减少流量。"
        )
    return {
        "table_name": table_name,
        "keyword": keyword,
        "date_range": {"start": start_date, "end": end_date, "date_field": date_field},
        "group_by": group_by,
        "scanned_records": len(source_rows),
        "full_table_scan": full_table_scan,
        "detail_fetches": detail_fetches,
        "split_by_month": split_by_month,
        "fetch_errors": fetch_errors[:12],
        "server_filter_used": server_filter_used,
        "master_candidates": filter_info["master_candidates"],
        "matched_count": len(matched_records),
        "groups": groups,
        "total_amount": total,
        "sample_records": matched_records[:20],
        "hints": hints,
    }


def _summarize_purchase_by_vendor(
    client: AccurateClient,
    vendor_keyword: str,
    start_date: str,
    end_date: str,
    table_name: str = "purchase-invoice",
    date_field: str = "transDate",
    page_size: int = 100,
    max_pages: int = 50,
) -> Dict[str, Any]:
    result = _summarize_records(
        client=client,
        table_name=table_name,
        keyword=vendor_keyword,
        start_date=start_date,
        end_date=end_date,
        date_field=date_field,
        text_fields=["vendorName", "vendorNo", "vendor", "vendor.name", "vendor.no"],
        amount_fields=["totalAmount", "total", "amount", "grandTotal"],
        group_by="month",
        page_size=page_size,
        max_pages=max_pages,
        detail_when_missing=True,
        concurrency=8,
        master_table="vendor",
        master_id_filter_fields=["vendorId", "vendor.id", "vendor"],
        master_text_filter_fields=["vendorName", "vendor.name"],
    )
    result["vendor_keyword"] = vendor_keyword
    result["monthly"] = [
        {"month": row["group"], "amount": row["amount"], "count": row["count"]}
        for row in result.get("groups", [])
    ]
    return result


# ---------------------------------------------------------------------------
# Tool 注册
# ---------------------------------------------------------------------------

@app.list_tools()
async def list_tools() -> list[Tool]:
    return [
        Tool(
            name="accurate_ping",
            description=(
                "测试 Accurate API 连接，返回可访问的数据库列表。"
                "用于检查凭据是否有效。"
            ),
            inputSchema={"type": "object", "properties": {}, "required": []},
        ),
        Tool(
            name="accurate_search_items",
            description=(
                "按关键词搜索 Accurate 系统中的库存商品。"
                "返回商品编码、名称、类型、单位、仓库数量和可售数量。"
                "支持模糊匹配，例如 'pvc dn20'、'Tee With Cover dn40'。"
                "max_results 限制返回数量（默认 10，最大 50）。"
            ),
            inputSchema={
                "type": "object",
                "properties": {
                    "keywords": {
                        "type": "string",
                        "description": "搜索关键词，支持产品名称或规格，例如 'dn20 pvc' 或 'Gate Valve'",
                    },
                    "max_results": _int_or_string_schema("最多返回条数（默认 10，最大 50）；可写 10 或 \"10\"", 10, 1, 50),
                    "include_warehouses": {
                        "type": "boolean",
                        "description": "是否包含各仓库明细（默认 false）",
                        "default": False,
                    },
                },
                "required": ["keywords"],
            },
        ),
        Tool(
            name="accurate_get_detail",
            description=(
                "按 ID 获取 Accurate 任意表的单条完整记录（调用 /api/{table}/detail.do）。\n"
                "通常配合 accurate_fetch_by_date 使用：先列表拿 ID，再用此工具取明细行、附件等完整数据。\n"
                "适用所有支持 detail.do 的表，例如：\n"
                "  sales-invoice → 含发票明细行、税额、备注\n"
                "  purchase-order → 含采购行、交货地址\n"
                "  delivery-order → 含出货明细\n"
                "  item → 含完整库存、仓库分布、BOM\n"
                "  customer / vendor → 含地址、联系人、账期"
            ),
            inputSchema={
                "type": "object",
                "properties": {
                    "table_name": {
                        "type": "string",
                        "description": "Accurate 表名，不含 /api/ 前缀，例如 'sales-invoice'、'customer'",
                    },
                    "id": {
                        "type": "string",
                        "description": "记录 ID，从列表接口的 id 字段获取",
                    },
                    "fields": {
                        "type": "string",
                        "description": "只返回指定字段，逗号分隔；不填则返回全部字段",
                    },
                },
                "required": ["table_name", "id"],
            },
        ),
        Tool(
            name="accurate_batch_get_detail",
            description=(
                "Fetch multiple Accurate detail records by IDs in one MCP call. "
                "Use this instead of calling accurate_get_detail repeatedly. "
                "The tool runs bounded parallel API requests internally and returns compact JSON. "
                "ids should be an array, but stringified JSON arrays and objects such as {\"item\":[...]} are accepted."
            ),
            inputSchema={
                "type": "object",
                "properties": {
                    "table_name": {
                        "type": "string",
                        "description": "Accurate table name without /api/, e.g. purchase-invoice, sales-invoice, item",
                    },
                    "ids": _id_list_schema("Record IDs from list API results. Prefer [\"123\",\"456\"]; also accepts stringified arrays or objects with ids/items/item/records."),
                    "fields": {
                        "type": "string",
                        "description": "Optional comma-separated fields to keep in returned detail records",
                    },
                    "max_records": _int_or_string_schema("Maximum IDs to fetch in this batch; default 100, hard limit 200. Accepts 100 or \"100\".", 100, 1, 200),
                    "concurrency": _int_or_string_schema("Internal parallel detail requests; default 8, hard limit 16. Accepts 8 or \"8\".", 8, 1, 16),
                },
                "required": ["table_name", "ids"],
            },
        ),
        Tool(
            name="accurate_fetch_by_date",
            description=(
                "查询 Accurate 任意表数据，自动分页。\n"
                "start_date / end_date 可选：填则按日期区间过滤，不填则返回全部记录（适合主数据表）。\n"
                "日期格式：DD/MM/YYYY，例如 '01/06/2026'。\n"
                "date_field 默认 transDate，适用于大多数单据表；主数据表无需填写。\n\n"
                "可用 table_name（不含 /api/ 前缀）：\n"
                "  单据类：sales-invoice, sales-order, sales-quotation, sales-receipt, sales-return,\n"
                "          purchase-invoice, purchase-order, purchase-payment, purchase-return,\n"
                "          purchase-requisition, delivery-order, receive-item, shipment,\n"
                "          exchange-invoice, expense, journal-voucher, bank-transfer,\n"
                "          other-deposit, other-payment, customer-claim, vendor-claim,\n"
                "          sales-checkin, salesman-commission\n"
                "  库存类：item-adjustment, item-transfer, material-adjustment, material-slip,\n"
                "          finished-good-slip, stock-opname-order, stock-opname-result,\n"
                "          job-order, work-order, manufacture-order, wo-pic\n"
                "  主数据：customer, vendor, item, employee, warehouse, branch, department,\n"
                "          glaccount, currency, tax, unit, payment-term, price-category,\n"
                "          customer-category, vendor-category, item-category, project,\n"
                "          fixed-asset, bill-of-material, standard-product-cost,\n"
                "          vendor-price, sellingprice-adjustment, fob, freeonboard,\n"
                "          data-classification, bom-process-category, process-stages,\n"
                "          roll-over, report, access-privilege, auto-number,\n"
                "          pos/customer, pos/item, pos/transaction"
            ),
            inputSchema={
                "type": "object",
                "properties": {
                    "table_name": {
                        "type": "string",
                        "description": "Accurate 表名，不含 /api/ 前缀，例如 'sales-invoice'、'customer'",
                    },
                    "start_date": {
                        "type": "string",
                        "description": "开始日期，格式 DD/MM/YYYY，例如 '01/06/2026'；不填则不过滤日期",
                    },
                    "end_date": {
                        "type": "string",
                        "description": "结束日期，格式 DD/MM/YYYY，例如 '05/06/2026'；不填则不过滤日期",
                    },
                    "date_field": {
                        "type": "string",
                        "description": "日期过滤字段名，默认 transDate；主数据表可忽略",
                        "default": "transDate",
                    },
                    "fields": {
                        "type": "string",
                        "description": "返回字段列表，逗号分隔，例如 'id,number,transDate,totalAmount'；不填则返回全部字段",
                    },
                    "page_size": _int_or_string_schema("每页条数（默认 100，最大 200）；可写 100 或 \"100\"", 100, 1, 200),
                    "max_pages": _int_or_string_schema("最多抓取页数（默认 10，最大 500）；可写 10 或 \"10\"", 10, 1, 500),
                },
                "required": ["table_name"],
            },
        ),
        Tool(
            name="accurate_search_records",
            description=(
                "Generic Accurate record search for master data or documents. "
                "Use it to find vendor/customer/item/project entities before aggregating. "
                "search_fields may be an array or comma-separated string."
            ),
            inputSchema={
                "type": "object",
                "properties": {
                    "table_name": {"type": "string", "description": "Accurate table name, e.g. vendor, customer, item, project"},
                    "keyword": {"type": "string", "description": "Keyword to search"},
                    "search_fields": _string_or_array_schema("Fields to try as list filters, e.g. keywords,name,no"),
                    "fields": {"type": "string", "description": "Returned fields, e.g. id,no,name"},
                    "page_size": _int_or_string_schema("Page size; default 100, max 200. Accepts 100 or \"100\".", 100, 1, 200),
                    "max_pages": _int_or_string_schema("Max pages; default 10, max 100. Accepts 10 or \"10\".", 10, 1, 100),
                },
                "required": ["table_name", "keyword"],
            },
        ),
        Tool(
            name="accurate_summarize_records",
            description=(
                "Generic Accurate aggregation tool for business summaries. "
                "Use it for purchase, sales, expense, or other table totals by keyword and date range. "
                "Standard workflow: accurate_search_records (get vendor/customer IDs) -> "
                "accurate_summarize_records once per entity with full legal name keyword + master_id_filter_fields. "
                "LESSO example: summarize separately for 'PT LESSO TECHNOLOGY INDONESIA' (26852) and "
                "'PT LESSO TECHNOLOGY INDONESIA TRADING' (37100); never subtract one from the other. "
                "master_id_filter_fields accepts JSON array or comma string; do NOT pass stringified JSON like "
                "'[\"vendorId\"]'. Response includes hints when matched_count=0 but scanned_records>0."
            ),
            inputSchema={
                "type": "object",
                "properties": {
                    "table_name": {"type": "string", "description": "Accurate table name, e.g. purchase-invoice, sales-invoice, expense"},
                    "keyword": {"type": "string", "description": "Optional keyword to match in text_fields, e.g. supplier/customer/project name. Omit or use * to summarize all records."},
                    "start_date": {"type": "string", "description": "Start date DD/MM/YYYY"},
                    "end_date": {"type": "string", "description": "End date DD/MM/YYYY"},
                    "date_field": {"type": "string", "description": "Date filter field, default transDate", "default": "transDate"},
                    "text_fields": _string_or_array_schema("Fields used for keyword matching, supports dotted fields like vendor.name"),
                    "amount_fields": _string_or_array_schema("Amount fields in priority order, e.g. totalAmount,total,amount"),
                    "group_by": {
                        "type": "string",
                        "enum": ["month", "date", "total"],
                        "description": "Aggregation bucket; default month",
                        "default": "month",
                    },
                    "master_table": {
                        "type": "string",
                        "description": "Optional master table to resolve keyword first, e.g. vendor or customer",
                    },
                    "master_id_filter_fields": _string_or_array_schema("Record list filter fields that accept master id, e.g. vendorId,vendor.id,customerId"),
                    "master_text_filter_fields": _string_or_array_schema("Record list filter fields that accept master name/text, e.g. vendorName,customerName"),
                    "direct_filter_fields": _string_or_array_schema("Record list fields to filter directly with keyword before scanning, e.g. projectName"),
                    "fields": {"type": "string", "description": "Optional list API fields to request"},
                    "detail_when_missing": {"type": "boolean", "description": "Use bounded batch detail if list rows lack text fields", "default": True},
                    "page_size": _int_or_string_schema("Page size; default 100, max 200. Accepts 100 or \"100\".", 100, 1, 200),
                    "max_pages": _int_or_string_schema("Max pages; default 50, max 500. Accepts 50 or \"50\".", 50, 1, 500),
                    "concurrency": _int_or_string_schema("Internal batch detail concurrency; default 8, max 16. Accepts 8 or \"8\".", 8, 1, 16),
                },
                "required": ["table_name"],
            },
        ),
        Tool(
            name="accurate_purchase_summary",
            description=(
                "Compatibility wrapper for purchase invoice summaries. "
                "Prefer accurate_summarize_records for new workflows because it is generic across purchase, sales, expense, and master-data use cases. "
                "This wrapper maps vendor_keyword to purchase-invoice defaults and keeps backward compatibility. "
                "page_size and max_pages are JSON integers, e.g. 100, not strings."
            ),
            inputSchema={
                "type": "object",
                "properties": {
                    "vendor_keyword": {
                        "type": "string",
                        "description": "供应商关键词，例如 '联塑'、'LESSO'",
                    },
                    "start_date": {
                        "type": "string",
                        "description": "开始日期，格式 DD/MM/YYYY，例如 '01/01/2026'",
                    },
                    "end_date": {
                        "type": "string",
                        "description": "结束日期，格式 DD/MM/YYYY，例如 '31/05/2026'",
                    },
                    "table_name": {
                        "type": "string",
                        "description": "采购单据表，默认 purchase-invoice",
                        "default": "purchase-invoice",
                    },
                    "date_field": {
                        "type": "string",
                        "description": "日期过滤字段，默认 transDate",
                        "default": "transDate",
                    },
                    "page_size": _int_or_string_schema("每页条数（默认 100，最大 200）；可写 100 或 \"100\"", 100, 1, 200),
                    "max_pages": _int_or_string_schema("最多页数（默认 50，最大 500）；可写 50 或 \"50\"", 50, 1, 500),
                },
                "required": ["vendor_keyword", "start_date", "end_date"],
            },
        ),
    ]


# ---------------------------------------------------------------------------
# Tool 执行
# ---------------------------------------------------------------------------

@app.call_tool()
async def call_tool(name: str, arguments: Any) -> list[TextContent]:
    client = AccurateClient()

    try:
        if name == "accurate_ping":
            result = client.db_list()
            if result.get("s"):
                dbs = result.get("d", [])
                lines = ["[OK] Accurate API 连接正常\n", f"可访问数据库数量: {len(dbs)}\n"]
                for db in dbs[:20]:
                    if isinstance(db, dict):
                        lines.append(f"  - {db.get('alias') or db.get('name') or json.dumps(db)}")
                return [TextContent(type="text", text="\n".join(lines))]
            else:
                return [TextContent(type="text", text=f"[FAIL] API 连接失败\n{json.dumps(result, indent=2)}")]

        elif name == "accurate_search_items":
            keywords = arguments["keywords"]
            max_results = _clamp_int(arguments.get("max_results", 10), default=10, minimum=1, maximum=50)
            include_wh = bool(arguments.get("include_warehouses", False))

            list_rows = client.item_list(keywords=keywords)
            if not list_rows:
                return [TextContent(type="text", text=f"未找到匹配 '{keywords}' 的商品")]

            items = []
            for row in list_rows[:max_results]:
                item_id = row.get("id")
                if not item_id:
                    continue
                detail = client.item_detail(str(item_id))
                if detail:
                    parsed = _parse_item(detail)
                    if not include_wh:
                        parsed.pop("warehouses", None)
                    items.append(parsed)

            if not items:
                return [TextContent(type="text", text=f"未能获取 '{keywords}' 的商品详情")]

            output = f"搜索 '{keywords}' 找到 {len(items)} 条商品:\n\n"
            output += json.dumps(items, ensure_ascii=False, indent=2)
            return [TextContent(type="text", text=output)]

        elif name == "accurate_get_detail":
            table_name = _normalize_table_name(arguments["table_name"])
            if table_name.startswith("api/"):
                table_name = table_name[4:]
            record_id = str(arguments["id"]).strip()
            fields = arguments.get("fields") or None

            result = client.get_detail(table_name=table_name, record_id=record_id, fields=fields)
            if not result.get("s"):
                return [TextContent(type="text", text=f"[FAIL] 未找到记录 {table_name}#{record_id}\n{json.dumps(result, ensure_ascii=False, indent=2)}")]
            return [TextContent(type="text", text=json.dumps(result.get("d"), ensure_ascii=False, indent=2))]

        elif name == "accurate_batch_get_detail":
            table_name = _normalize_table_name(arguments["table_name"])
            ids_arg = _as_id_list(arguments["ids"])
            if not ids_arg:
                raise ValueError("ids must contain at least one record id")
            max_records = _clamp_int(arguments.get("max_records", 100), default=100, minimum=1, maximum=200)
            concurrency = _clamp_int(arguments.get("concurrency", 8), default=8, minimum=1, maximum=16)
            fields = arguments.get("fields") or None
            result = _batch_get_details(
                client=client,
                table_name=table_name,
                ids=ids_arg[:max_records],
                fields=fields,
                concurrency=concurrency,
            )
            return [TextContent(type="text", text=json.dumps(result, ensure_ascii=False, indent=2))]

        elif name == "accurate_fetch_by_date":
            table_name = _normalize_table_name(arguments["table_name"])
            start_date = arguments.get("start_date") or None
            end_date = arguments.get("end_date") or None
            date_field = arguments.get("date_field", "transDate") or "transDate"
            fields = arguments.get("fields") or None
            page_size = _clamp_int(arguments.get("page_size", 100), default=100, minimum=1, maximum=200)
            max_pages = _clamp_int(arguments.get("max_pages", 10), default=10, minimum=1, maximum=500)

            all_rows: List[Dict] = []
            last_ids: Optional[set] = None

            for page in range(1, max_pages + 1):
                result = client.fetch_by_date(
                    table_name=table_name,
                    start=start_date, end=end_date,
                    date_field=date_field,
                    page=page, page_size=page_size,
                    fields=fields,
                )
                rows = _extract_rows(result)
                if not rows:
                    break
                current_ids = {r.get("id") for r in rows if isinstance(r, dict)}
                if last_ids is not None and current_ids == last_ids:
                    break
                all_rows.extend(rows)
                if len(rows) < page_size:
                    break
                last_ids = current_ids

            date_info = f"{start_date} ~ {end_date}" if start_date else "不限日期"
            output = (
                f"表: {table_name} | {date_info}\n"
                f"共 {len(all_rows)} 条记录\n\n"
            )
            output += json.dumps(all_rows, ensure_ascii=False, indent=2)
            return [TextContent(type="text", text=output)]

        elif name == "accurate_search_records":
            result = _search_records(
                client=client,
                table_name=_normalize_table_name(arguments["table_name"]),
                keyword=str(arguments["keyword"]).strip(),
                search_fields=_as_string_list(arguments.get("search_fields"), []),
                fields=arguments.get("fields") or None,
                page_size=_clamp_int(arguments.get("page_size", 100), default=100, minimum=1, maximum=200),
                max_pages=_clamp_int(arguments.get("max_pages", 10), default=10, minimum=1, maximum=100),
            )
            return [TextContent(type="text", text=json.dumps(result, ensure_ascii=False, indent=2))]

        elif name == "accurate_summarize_records":
            table_name = _normalize_table_name(arguments["table_name"])
            result = _summarize_records(
                client=client,
                table_name=table_name,
                keyword=str(arguments.get("keyword") or "*").strip(),
                start_date=arguments.get("start_date") or None,
                end_date=arguments.get("end_date") or None,
                date_field=str(arguments.get("date_field", "transDate") or "transDate").strip(),
                text_fields=_as_string_list(arguments.get("text_fields"), []),
                amount_fields=_as_string_list(arguments.get("amount_fields"), []),
                group_by=str(arguments.get("group_by", "month") or "month").strip(),
                fields=arguments.get("fields") or None,
                page_size=_clamp_int(arguments.get("page_size", 100), default=100, minimum=1, maximum=200),
                max_pages=_clamp_int(arguments.get("max_pages", 50), default=50, minimum=1, maximum=500),
                detail_when_missing=bool(arguments.get("detail_when_missing", True)),
                concurrency=_clamp_int(arguments.get("concurrency", 8), default=8, minimum=1, maximum=16),
                master_table=arguments.get("master_table") or None,
                master_id_filter_fields=_as_string_list(arguments.get("master_id_filter_fields"), []),
                master_text_filter_fields=_as_string_list(arguments.get("master_text_filter_fields"), []),
                direct_filter_fields=_as_string_list(arguments.get("direct_filter_fields"), []),
            )
            return [TextContent(type="text", text=json.dumps(result, ensure_ascii=False, indent=2))]

        elif name == "accurate_purchase_summary":
            vendor_keyword = str(arguments["vendor_keyword"]).strip()
            start_date = str(arguments["start_date"]).strip()
            end_date = str(arguments["end_date"]).strip()
            table_name = _normalize_table_name(arguments.get("table_name", "purchase-invoice") or "purchase-invoice")
            date_field = str(arguments.get("date_field", "transDate") or "transDate").strip()
            page_size = _clamp_int(arguments.get("page_size", 100), default=100, minimum=1, maximum=200)
            max_pages = _clamp_int(arguments.get("max_pages", 50), default=50, minimum=1, maximum=500)

            result = _summarize_purchase_by_vendor(
                client=client,
                vendor_keyword=vendor_keyword,
                start_date=start_date,
                end_date=end_date,
                table_name=table_name,
                date_field=date_field,
                page_size=page_size,
                max_pages=max_pages,
            )
            return [TextContent(type="text", text=json.dumps(result, ensure_ascii=False, indent=2))]

        else:
            raise ValueError(f"未知工具: {name}")

    except (ValueError, KeyError) as e:
        return [TextContent(type="text", text=f"[参数错误] {e}")]
    except (TimeoutError, RuntimeError) as e:
        return [TextContent(type="text", text=f"[API 错误] {e}")]
    except Exception as e:
        logger.exception("Unexpected error in %s", name)
        return [TextContent(type="text", text=f"[系统错误] {type(e).__name__}: {e}")]


# ---------------------------------------------------------------------------
# 入口
# ---------------------------------------------------------------------------

async def main():
    async with stdio_server() as (read_stream, write_stream):
        await app.run(read_stream, write_stream, app.create_initialization_options())


if __name__ == "__main__":
    asyncio.run(main())
