"""Org quotation-mapping client (fleet-shared historical quote mappings)."""
from __future__ import annotations

import http.cookiejar
import json
import logging
import urllib.error
import urllib.request
from typing import Any

from admin.org_http_csrf import ORG_CSRF_HEADER_NAME, bootstrap_org_csrf, build_cookie_opener
from admin.org_session import (
    OrgAuthError,
    OrgHttpError,
    classify_http_status,
    get_auth_candidates,
    resolve_auth_fallback_policy,
    resolve_org_server_url,
)

logger = logging.getLogger(__name__)

_API_PREFIX = "/api/quotation-mapping"

_mapping_cache: dict[str, Any] = {}


def is_org_mapping_configured() -> bool:
    return bool(resolve_org_server_url())


def _parse_json_response(payload: bytes) -> dict[str, Any] | None:
    try:
        data = json.loads(payload.decode("utf-8"))
    except json.JSONDecodeError:
        return None
    if isinstance(data, dict) and "data" in data:
        inner = data["data"]
        return inner if isinstance(inner, dict) else None
    return data if isinstance(data, dict) else None


def _make_get(base: str, path: str, token: str) -> dict[str, Any] | None:
    headers = {"Accept": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    req = urllib.request.Request(f"{base}{path}", headers=headers, method="GET")
    try:
        with urllib.request.urlopen(req, timeout=20) as resp:
            return _parse_json_response(resp.read())
    except urllib.error.HTTPError as e:
        raise classify_http_status(e.code, context=f"GET {path}") from e
    except (urllib.error.URLError, TimeoutError) as e:
        logger.warning("org mapping API GET %s failed: %s", path, e)
        return None


def _api_get(path: str) -> dict[str, Any] | None:
    base = resolve_org_server_url()
    if not base:
        return None

    candidates = get_auth_candidates()
    if not candidates:
        try:
            return _make_get(base, path, "")
        except OrgAuthError:
            return None

    saw_auth_error = False
    for index, candidate in enumerate(candidates):
        try:
            result = _make_get(base, path, candidate.token)
            if index > 0 and result is not None:
                logger.info(
                    "org_mapping_client: OK using auth candidate %d/%d source=%s",
                    index + 1,
                    len(candidates),
                    candidate.source,
                )
            return result
        except OrgAuthError:
            saw_auth_error = True
            continue
        except OrgHttpError:
            raise

    if saw_auth_error:
        policy = resolve_auth_fallback_policy().value
        logger.warning(
            "org mapping API GET %s failed: HTTP 401 (candidates=%d policy=%s)",
            path,
            len(candidates),
            policy,
        )
    return None


def _api_json(method: str, path: str, payload: dict[str, Any]) -> dict[str, Any]:
    base = resolve_org_server_url()
    if not base:
        raise RuntimeError("ORG_SERVER_URL is not configured")

    candidates = get_auth_candidates()
    if not candidates:
        raise RuntimeError("ORG_SESSION_TOKEN or profile org-session.token is not configured")

    last_auth_error: OrgAuthError | None = None
    for candidate in candidates:
        jar = http.cookiejar.CookieJar()
        opener = build_cookie_opener(jar)
        try:
            csrf_token = bootstrap_org_csrf(base, jar, opener_factory=lambda _: opener)
        except (urllib.error.URLError, TimeoutError, RuntimeError) as e:
            raise RuntimeError(f"org mapping API CSRF bootstrap failed: {e}") from e

        try:
            headers = {
                "Accept": "application/json",
                "Content-Type": "application/json",
                "Authorization": f"Bearer {candidate.token}",
                ORG_CSRF_HEADER_NAME: csrf_token,
            }
            body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
            req = urllib.request.Request(
                f"{base}{path}",
                data=body,
                headers=headers,
                method=method,
            )
            with opener.open(req, timeout=30) as resp:
                parsed = _parse_json_response(resp.read())
                return parsed or {}
        except OrgAuthError as exc:
            last_auth_error = exc
            continue
        except urllib.error.HTTPError as e:
            raise classify_http_status(e.code, context=f"{method} {path}") from e

    if last_auth_error:
        raise last_auth_error
    raise RuntimeError("org mapping API mutation failed")


def invalidate_mapping_org_cache() -> None:
    global _mapping_cache
    _mapping_cache = {}
    try:
        from inventory.services.mapping_table_matcher import invalidate_mapping_cache

        invalidate_mapping_cache()
    except Exception as e:
        logger.debug("org_mapping_client: could not invalidate mapping cache: %s", e)


def fetch_active_rows() -> list[dict[str, Any]] | None:
    data = _api_get(f"{_API_PREFIX}/active")
    if not data or not isinstance(data, dict):
        return None
    rows = data.get("rows") or []
    if not isinstance(rows, list):
        return None
    return rows


def get_product_mapping_rows() -> list[dict[str, Any]]:
    """Adapter for mapping_table_matcher — org-primary rows."""
    rows = fetch_active_rows()
    if not rows:
        return []

    records: list[dict[str, Any]] = []
    for row in rows:
        if not isinstance(row, dict):
            continue
        records.append(
            {
                "inquiry_name": str(row.get("inquiry_name") or "").strip(),
                "spec": str(row.get("inquiry_spec") or "").strip(),
                "product_code": str(row.get("product_code") or "").strip(),
                "quotation_name": str(row.get("quotation_name") or "").strip(),
                "norm_key": str(row.get("norm_key") or "").strip(),
            }
        )
    return [r for r in records if r.get("product_code")]


def lookup_mapping_rows(*, search_text: str = "", norm_key: str = "") -> dict[str, Any] | None:
    from urllib.parse import urlencode

    query: dict[str, str] = {}
    if norm_key.strip():
        query["norm_key"] = norm_key.strip()
    elif search_text.strip():
        query["search_text"] = search_text.strip()
    else:
        return None
    return _api_get(f"{_API_PREFIX}/lookup?{urlencode(query)}")


def append_mapping_draft_item(fields: dict[str, Any]) -> dict[str, Any]:
    payload = {
        "inquiry_name": str(fields.get("inquiry_name") or "").strip(),
        "inquiry_spec": str(fields.get("inquiry_spec") or "").strip(),
        "product_code": str(fields.get("product_code") or "").strip(),
        "quotation_name": str(fields.get("quotation_name") or "").strip(),
        "source_file": fields.get("source_file"),
        "source_sheet": fields.get("source_sheet"),
        "source_row": fields.get("source_row"),
        "allow_overwrite": bool(fields.get("allow_overwrite")),
        "norm_key": fields.get("norm_key"),
    }
    return _api_json("POST", f"{_API_PREFIX}/draft/items", payload)


def publish_mapping_draft(*, reason: str, revision: int) -> dict[str, Any]:
    return _api_json(
        "POST",
        f"{_API_PREFIX}/draft/publish",
        {"reason": reason, "revision": revision},
    )


def get_mapping_draft() -> dict[str, Any] | None:
    return _api_get(f"{_API_PREFIX}/draft")
