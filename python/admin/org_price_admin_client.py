"""HTTP client for organization price library admin APIs (center aioncore)."""
from __future__ import annotations

import http.cookiejar
import json
import logging
import mimetypes
import urllib.error
import urllib.request
from typing import Any

from admin.org_http_csrf import ORG_CSRF_HEADER_NAME, ORG_CSRF_STATUS_PATH, bootstrap_org_csrf, build_cookie_opener
from admin.org_session import (
    OrgAuthError,
    OrgCsrfError,
    OrgHttpError,
    OrgVersionConflictError,
    classify_http_status,
    get_auth_candidates,
    resolve_auth_fallback_policy,
    resolve_org_server_url,
)

logger = logging.getLogger(__name__)

_API_PREFIX = "/api/price-library"


def is_org_api_configured() -> bool:
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


def _friendly_http_error(exc: OrgHttpError) -> OrgHttpError:
    if exc.status_code == 403 and "price_admin" not in str(exc).lower():
        return OrgCsrfError(
            403,
            "HTTP 403 Forbidden — price_admin permission required or CSRF invalid",
        )
    return exc


def _make_get(base: str, path: str, token: str) -> dict[str, Any] | None:
    headers = {"Accept": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    req = urllib.request.Request(f"{base}{path}", headers=headers, method="GET")
    try:
        with urllib.request.urlopen(req, timeout=20) as resp:
            return _parse_json_response(resp.read())
    except urllib.error.HTTPError as e:
        raise _friendly_http_error(classify_http_status(e.code, context=f"GET {path}")) from e
    except (urllib.error.URLError, TimeoutError) as e:
        logger.warning("org price admin API GET %s failed: %s", path, e)
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
            logger.warning("org price admin API GET %s: 401 with no session token", path)
            return None

    saw_auth_error = False
    for index, candidate in enumerate(candidates):
        try:
            result = _make_get(base, path, candidate.token)
            if index > 0 and result is not None:
                logger.info(
                    "org_price_admin_client: org API OK using auth candidate %d/%d source=%s profile=%s",
                    index + 1,
                    len(candidates),
                    candidate.source,
                    candidate.profile,
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
            "org price admin API GET %s failed: HTTP 401 (candidates=%d policy=%s)",
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
        except (urllib.error.HTTPError, urllib.error.URLError, TimeoutError, RuntimeError) as e:
            raise RuntimeError(
                f"org price admin API CSRF bootstrap GET {ORG_CSRF_STATUS_PATH} failed: {e}"
            ) from e

        headers = {
            "Accept": "application/json",
            "Authorization": f"Bearer {candidate.token}",
            "Content-Type": "application/json",
            ORG_CSRF_HEADER_NAME: csrf_token,
        }
        req = urllib.request.Request(
            f"{base}{path}",
            data=json.dumps(payload, ensure_ascii=False).encode("utf-8"),
            headers=headers,
            method=method,
        )
        try:
            with opener.open(req, timeout=30) as resp:
                data = json.loads(resp.read().decode("utf-8"))
        except urllib.error.HTTPError as e:
            if e.code == 401:
                last_auth_error = OrgAuthError(401, f"HTTP 401 Unauthorized ({method} {path})")
                continue
            if e.code == 403:
                raw = e.read().decode("utf-8", errors="replace")
                raise _friendly_http_error(
                    OrgCsrfError(403, f"org price admin API {method} {path} failed: HTTP 403 {raw}")
                ) from e
            if e.code == 409:
                raw = e.read().decode("utf-8", errors="replace")
                raise OrgVersionConflictError(
                    409,
                    f"org price admin API {method} {path} failed: HTTP 409 {raw}",
                ) from e
            raw = e.read().decode("utf-8", errors="replace")
            raise RuntimeError(f"org price admin API {method} {path} failed: HTTP {e.code} {raw}") from e
        except (urllib.error.URLError, TimeoutError, json.JSONDecodeError) as e:
            raise RuntimeError(f"org price admin API {method} {path} failed: {e}") from e

        if isinstance(data, dict) and "data" in data and isinstance(data["data"], dict):
            return data["data"]
        if isinstance(data, dict):
            return data
        raise RuntimeError(f"org price admin API {method} {path} returned invalid JSON")

    if last_auth_error is not None:
        raise RuntimeError(
            f"org price admin API {method} {path} failed: HTTP 401 Unauthorized "
            f"(candidates={len(candidates)} policy={resolve_auth_fallback_policy().value})"
        ) from last_auth_error
    raise RuntimeError(f"org price admin API {method} {path} failed: no auth candidates")


def _api_multipart_post(path: str, fields: dict[str, str], files: dict[str, tuple[str, bytes, str]]) -> dict[str, Any]:
    base = resolve_org_server_url()
    if not base:
        raise RuntimeError("ORG_SERVER_URL is not configured")

    candidates = get_auth_candidates()
    if not candidates:
        raise RuntimeError("ORG_SESSION_TOKEN or profile org-session.token is not configured")

    boundary = "----CCBPriceLibraryBoundary7MA4YWxkTrZu0gW"
    body = bytearray()
    for name, value in fields.items():
        body.extend(f"--{boundary}\r\n".encode("utf-8"))
        body.extend(f'Content-Disposition: form-data; name="{name}"\r\n\r\n'.encode("utf-8"))
        body.extend(value.encode("utf-8"))
        body.extend(b"\r\n")
    for name, (filename, content, content_type) in files.items():
        body.extend(f"--{boundary}\r\n".encode("utf-8"))
        body.extend(
            f'Content-Disposition: form-data; name="{name}"; filename="{filename}"\r\n'.encode("utf-8")
        )
        body.extend(f"Content-Type: {content_type}\r\n\r\n".encode("utf-8"))
        body.extend(content)
        body.extend(b"\r\n")
    body.extend(f"--{boundary}--\r\n".encode("utf-8"))
    payload = bytes(body)

    last_auth_error: OrgAuthError | None = None
    for candidate in candidates:
        jar = http.cookiejar.CookieJar()
        opener = build_cookie_opener(jar)
        try:
            csrf_token = bootstrap_org_csrf(base, jar, opener_factory=lambda _: opener)
        except (urllib.error.HTTPError, urllib.error.URLError, TimeoutError, RuntimeError) as e:
            raise RuntimeError(
                f"org price admin API CSRF bootstrap GET {ORG_CSRF_STATUS_PATH} failed: {e}"
            ) from e

        headers = {
            "Accept": "application/json",
            "Authorization": f"Bearer {candidate.token}",
            "Content-Type": f"multipart/form-data; boundary={boundary}",
            ORG_CSRF_HEADER_NAME: csrf_token,
        }
        req = urllib.request.Request(
            f"{base}{path}",
            data=payload,
            headers=headers,
            method="POST",
        )
        try:
            with opener.open(req, timeout=60) as resp:
                data = json.loads(resp.read().decode("utf-8"))
        except urllib.error.HTTPError as e:
            if e.code == 401:
                last_auth_error = OrgAuthError(401, f"HTTP 401 Unauthorized (POST {path})")
                continue
            if e.code == 403:
                raw = e.read().decode("utf-8", errors="replace")
                raise _friendly_http_error(
                    OrgCsrfError(403, f"org price admin API POST {path} failed: HTTP 403 {raw}")
                ) from e
            if e.code == 409:
                raw = e.read().decode("utf-8", errors="replace")
                raise OrgVersionConflictError(
                    409,
                    f"org price admin API POST {path} failed: HTTP 409 {raw}",
                ) from e
            raw = e.read().decode("utf-8", errors="replace")
            raise RuntimeError(f"org price admin API POST {path} failed: HTTP {e.code} {raw}") from e
        except (urllib.error.URLError, TimeoutError, json.JSONDecodeError) as e:
            raise RuntimeError(f"org price admin API POST {path} failed: {e}") from e

        if isinstance(data, dict) and "data" in data and isinstance(data["data"], dict):
            return data["data"]
        if isinstance(data, dict):
            return data
        raise RuntimeError(f"org price admin API POST {path} returned invalid JSON")

    if last_auth_error is not None:
        raise RuntimeError(
            f"org price admin API POST {path} failed: HTTP 401 Unauthorized "
            f"(candidates={len(candidates)} policy={resolve_auth_fallback_policy().value})"
        ) from last_auth_error
    raise RuntimeError(f"org price admin API POST {path} failed: no auth candidates")


def get_active() -> dict[str, Any] | None:
    """Fetch published active library (any authenticated org user)."""
    return _api_get(f"{_API_PREFIX}/active")


def get_draft() -> dict[str, Any] | None:
    """Fetch open draft + revision (price_admin only)."""
    return _api_get(f"{_API_PREFIX}/draft")


def list_versions() -> list[dict[str, Any]]:
    """Fetch published version history (any authenticated org user)."""
    data = _api_get(f"{_API_PREFIX}/versions")
    if not data:
        return []
    versions = data.get("versions")
    if isinstance(versions, list):
        return [item for item in versions if isinstance(item, dict)]
    if isinstance(data, list):
        return [item for item in data if isinstance(item, dict)]
    return []


def export_active_bytes() -> bytes:
    """Download active library as xlsx bytes (authenticated read)."""
    base = resolve_org_server_url()
    if not base:
        raise RuntimeError("ORG_SERVER_URL is not configured")

    candidates = get_auth_candidates()
    if not candidates:
        raise RuntimeError("ORG_SESSION_TOKEN is not configured")

    last_auth_error: OrgAuthError | None = None
    for candidate in candidates:
        headers = {"Accept": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"}
        if candidate.token:
            headers["Authorization"] = f"Bearer {candidate.token}"
        req = urllib.request.Request(f"{base}{_API_PREFIX}/export", headers=headers, method="GET")
        try:
            with urllib.request.urlopen(req, timeout=60) as resp:
                return resp.read()
        except urllib.error.HTTPError as e:
            if e.code == 401:
                last_auth_error = OrgAuthError(401, "HTTP 401 Unauthorized (GET export)")
                continue
            raise _friendly_http_error(classify_http_status(e.code, context="GET export")) from e

    if last_auth_error is not None:
        raise RuntimeError("org price admin export failed: HTTP 401 Unauthorized") from last_auth_error
    raise RuntimeError("org price admin export failed: no auth candidates")


def apply_draft_item(
    *,
    product_id: str | None,
    change_type: str,
    fields: dict[str, Any],
) -> None:
    """POST /draft/items (price_admin + CSRF). Mutates shared draft immediately."""
    payload: dict[str, Any] = {"change_type": change_type, **fields}
    if product_id:
        payload["product_id"] = product_id
    _api_json("POST", f"{_API_PREFIX}/draft/items", payload)


def publish_draft(*, reason: str, revision: int) -> dict[str, Any]:
    """POST /draft/publish (price_admin + CSRF). Binds revision; 409 on stale revision."""
    payload = {"reason": reason, "revision": int(revision)}
    return _api_json("POST", f"{_API_PREFIX}/draft/publish", payload)


def preview_import(*, filename: str, content: bytes) -> dict[str, Any]:
    """POST /import/preview with xlsx multipart file."""
    file_type = mimetypes.guess_type(filename)[0] or (
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    )
    return _api_multipart_post(
        f"{_API_PREFIX}/import/preview",
        fields={},
        files={"file": (filename, content, file_type)},
    )


def apply_import(*, filename: str, content: bytes) -> dict[str, Any]:
    """POST /import/apply with xlsx multipart file."""
    file_type = mimetypes.guess_type(filename)[0] or (
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    )
    return _api_multipart_post(
        f"{_API_PREFIX}/import/apply",
        fields={},
        files={"file": (filename, content, file_type)},
    )


def revert_version(*, version_id: str, reason: str) -> dict[str, Any]:
    """POST /versions/:id/revert (price_admin + CSRF)."""
    return _api_json("POST", f"{_API_PREFIX}/versions/{version_id}/revert", {"reason": reason})
