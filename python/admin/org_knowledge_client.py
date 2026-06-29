"""HTTP client for organization knowledge docs (center aioncore)."""
from __future__ import annotations

import http.cookiejar
import json
import logging
import os
import urllib.error
import urllib.request
from datetime import datetime
from pathlib import Path
from typing import Any
from urllib.parse import quote

from admin.org_http_csrf import ORG_CSRF_HEADER_NAME, ORG_CSRF_STATUS_PATH, bootstrap_org_csrf, build_cookie_opener

logger = logging.getLogger(__name__)

DEFAULT_SLUG = "wanding_business_knowledge"

# cache: slug -> {"version": int|None, "content": str, "source": str}
_doc_cache: dict[str, dict[str, Any]] = {}


def _appdata_roots() -> list[Path]:
    appdata = os.environ.get("APPDATA", "").strip()
    if not appdata:
        return []
    return [Path(appdata) / "AionUi", Path(appdata) / "AionUi-Dev"]


def _org_server_url() -> str:
    from_env = (os.environ.get("ORG_SERVER_URL") or "").strip().rstrip("/")
    if from_env:
        return from_env
    for root in _appdata_roots():
        config_path = root / "aionui" / "org-server.json"
        try:
            payload = json.loads(config_path.read_text(encoding="utf-8"))
            url = (payload.get("url") or "").strip().rstrip("/")
            if url:
                return url
        except (OSError, json.JSONDecodeError, AttributeError):
            continue
    return ""


def _org_session_token() -> str:
    direct = (os.environ.get("ORG_SESSION_TOKEN") or "").strip()
    if direct:
        return direct

    candidates: list[Path] = []
    token_file = (os.environ.get("ORG_SESSION_TOKEN_FILE") or "").strip()
    if token_file:
        candidates.append(Path(token_file))
    for root in _appdata_roots():
        candidates.append(root / "aionui" / "org-session.token")

    for path in candidates:
        try:
            token = path.read_text(encoding="utf-8").strip()
            if token:
                return token
        except OSError:
            continue
    return ""


def is_org_api_configured() -> bool:
    return bool(_org_server_url())


def invalidate_org_knowledge_cache(slug: str | None = None) -> None:
    """Clear cached org knowledge (all slugs or one slug)."""
    global _doc_cache
    if slug is None:
        _doc_cache = {}
    else:
        _doc_cache.pop(slug, None)


def _api_get(path: str) -> dict[str, Any] | None:
    base = _org_server_url()
    if not base:
        return None
    token = _org_session_token()
    headers = {"Accept": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    req = urllib.request.Request(f"{base}{path}", headers=headers, method="GET")
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            payload = json.loads(resp.read().decode("utf-8"))
            if isinstance(payload, dict) and "data" in payload:
                return payload["data"]  # type: ignore[return-value]
            return payload if isinstance(payload, dict) else None
    except (urllib.error.URLError, urllib.error.HTTPError, TimeoutError, json.JSONDecodeError) as e:
        logger.warning("org knowledge API GET %s failed: %s", path, e)
        return None


def _api_json(method: str, path: str, payload: dict[str, Any]) -> dict[str, Any]:
    base = _org_server_url()
    if not base:
        raise RuntimeError("ORG_SERVER_URL is not configured")
    token = _org_session_token()
    if not token:
        raise RuntimeError("ORG_SESSION_TOKEN or ORG_SESSION_TOKEN_FILE is not configured")

    jar = http.cookiejar.CookieJar()
    opener = build_cookie_opener(jar)
    try:
        csrf_token = bootstrap_org_csrf(base, jar, opener_factory=lambda _: opener)
    except (urllib.error.HTTPError, urllib.error.URLError, TimeoutError, RuntimeError) as e:
        raise RuntimeError(f"org knowledge API CSRF bootstrap GET {ORG_CSRF_STATUS_PATH} failed: {e}") from e

    headers = {
        "Accept": "application/json",
        "Authorization": f"Bearer {token}",
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
        with opener.open(req, timeout=20) as resp:
            data = json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        raw = e.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"org knowledge API {method} {path} failed: HTTP {e.code} {raw}") from e
    except (urllib.error.URLError, TimeoutError, json.JSONDecodeError) as e:
        raise RuntimeError(f"org knowledge API {method} {path} failed: {e}") from e

    if isinstance(data, dict) and "data" in data and isinstance(data["data"], dict):
        return data["data"]
    if isinstance(data, dict):
        return data
    raise RuntimeError(f"org knowledge API {method} {path} returned invalid JSON")


def get_doc(slug: str = DEFAULT_SLUG, *, use_cache: bool = True) -> dict[str, Any] | None:
    """Fetch one org knowledge document. Returns None when API unavailable."""
    if use_cache:
        cached = _doc_cache.get(slug)
        if cached and cached.get("content"):
            return cached

    data = _api_get(f"/api/org-knowledge/{slug}")
    if not data or not isinstance(data, dict):
        return None

    content = (data.get("content") or "").strip()
    if not content:
        return None

    entry = {
        "slug": slug,
        "content": content,
        "version": data.get("version"),
        "title": data.get("title"),
        "source": "org-api",
    }
    _doc_cache[slug] = entry
    logger.info("[KNOWLEDGE_SOURCE] Org API — slug: %s, length: %d", slug, len(content))
    return entry


def update_doc(
    slug: str,
    *,
    title: str,
    content: str,
    expected_version: int,
) -> dict[str, Any]:
    """Update one org knowledge doc using optimistic concurrency."""
    data = _api_json(
        "PUT",
        f"/api/org-knowledge/{quote(slug, safe='')}",
        {
            "title": title,
            "content": content,
            "expected_version": expected_version,
        },
    )
    updated_content = str(data.get("content") or "")
    if updated_content:
        _doc_cache[slug] = {
            "slug": slug,
            "content": updated_content,
            "version": data.get("version"),
            "title": data.get("title"),
            "source": "org-api",
        }
    return data


def append_business_rule(
    rule_text: str,
    *,
    section: str | None = None,
    reason: str | None = None,
    slug: str = DEFAULT_SLUG,
) -> dict[str, Any]:
    """Append a confirmed business rule to the shared Wanding knowledge doc."""
    rule = (rule_text or "").strip()
    if not rule:
        raise ValueError("rule_text is required")

    doc = get_doc(slug, use_cache=False)
    if not doc:
        raise RuntimeError(f"org knowledge doc not available: {slug}")

    content = str(doc.get("content") or "").rstrip()
    title = str(doc.get("title") or slug)
    version = int(doc.get("version") or 0)
    section_text = (section or "业务规则补充").strip()
    reason_text = (reason or "").strip()
    today = datetime.now().strftime("%Y-%m-%d")

    lines = [
        "",
        f"## {section_text}",
        "",
        f"- {rule}",
        f"  - 来源：报价专家会话确认，{today}",
    ]
    if reason_text:
        lines.append(f"  - 说明：{reason_text}")

    response = update_doc(
        slug,
        title=title,
        content=f"{content}\n" + "\n".join(lines) + "\n",
        expected_version=version,
    )
    return {
        "slug": slug,
        "title": response.get("title") or title,
        "previous_version": version,
        "version": response.get("version"),
        "section": section_text,
        "rule_text": rule,
        "updated_at": response.get("updated_at"),
    }


def load_doc_content(
    slug: str = DEFAULT_SLUG,
    *,
    fallback_path: Path | str | None = None,
    use_cache: bool = True,
) -> str:
    """
    API-first load with optional local file fallback (read-only offline).
    """
    api_doc = get_doc(slug, use_cache=use_cache)
    if api_doc and api_doc.get("content"):
        return str(api_doc["content"])

    if fallback_path is not None:
        path = Path(fallback_path)
        if path.is_file():
            try:
                text = path.read_text(encoding="utf-8").strip()
                if text:
                    logger.info("[KNOWLEDGE_SOURCE] File fallback — path: %s, length: %d", path, len(text))
                    return text
            except OSError as e:
                logger.debug("org knowledge file fallback failed: %s", e)

    return ""
