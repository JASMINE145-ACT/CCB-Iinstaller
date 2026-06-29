"""Org VPS double-submit CSRF helpers (see price-library.md § VPS CSRF contract)."""
from __future__ import annotations

import http.cookiejar
import urllib.request
from typing import Callable
from urllib.parse import urlparse

ORG_CSRF_COOKIE_NAME = "aionui-csrf-token"
ORG_CSRF_HEADER_NAME = "x-csrf-token"
ORG_CSRF_STATUS_PATH = "/api/auth/status"


def _csrf_token_from_jar(jar: http.cookiejar.CookieJar) -> str:
    for cookie in jar:
        if cookie.name == ORG_CSRF_COOKIE_NAME and cookie.value:
            return str(cookie.value)
    return ""


def build_cookie_opener(jar: http.cookiejar.CookieJar) -> urllib.request.OpenerDirector:
    return urllib.request.build_opener(urllib.request.HTTPCookieProcessor(jar))


def bootstrap_org_csrf(
    base_url: str,
    jar: http.cookiejar.CookieJar,
    *,
    opener_factory: Callable[[http.cookiejar.CookieJar], urllib.request.OpenerDirector] | None = None,
    timeout: float = 15,
) -> str:
    """Seed cookie jar via GET /api/auth/status and return the CSRF token value."""
    base = base_url.rstrip("/")
    opener = (opener_factory or build_cookie_opener)(jar)
    req = urllib.request.Request(
        f"{base}{ORG_CSRF_STATUS_PATH}",
        headers={"Accept": "application/json"},
        method="GET",
    )
    with opener.open(req, timeout=timeout) as resp:
        resp.read()
    token = _csrf_token_from_jar(jar)
    if not token:
        host = urlparse(base).netloc or base
        raise RuntimeError(
            f"org API CSRF cookie {ORG_CSRF_COOKIE_NAME!r} missing after GET {ORG_CSRF_STATUS_PATH} ({host})"
        )
    return token
