"""Shared org API session resolution (profile, server URL, JWT candidates).

Design contract (2026-07-02):
- Explicit profile (AIONUI_APPDATA_PROFILE) selects AppData root — no cross-profile identity guessing.
- ORG_SESSION_TOKEN / ORG_SESSION_TOKEN_FILE are strict overrides (single candidate; 401 = fail).
- Legacy scan (no profile, no explicit token env) is deprecated: may try multiple profile token files on 401.
"""
from __future__ import annotations

import json
import logging
import os
from dataclasses import dataclass
from enum import Enum
from pathlib import Path
from typing import Iterator

logger = logging.getLogger(__name__)

PROFILE_AIONUI = "AionUi"
PROFILE_AIONUI_DEV = "AionUi-Dev"
_VALID_PROFILES = frozenset({PROFILE_AIONUI, PROFILE_AIONUI_DEV})

_ENV_PROFILE = "AIONUI_APPDATA_PROFILE"
_ENV_SERVER_URL = "ORG_SERVER_URL"
_ENV_SESSION_TOKEN = "ORG_SESSION_TOKEN"
_ENV_SESSION_TOKEN_FILE = "ORG_SESSION_TOKEN_FILE"


class AuthFallbackPolicy(str, Enum):
    STRICT = "strict"
    LEGACY_SCAN = "legacy_scan"


class OrgHttpError(Exception):
    def __init__(self, status_code: int, message: str) -> None:
        super().__init__(message)
        self.status_code = status_code


class OrgAuthError(OrgHttpError):
    """HTTP 401 — authentication failed for the current candidate."""


class OrgCsrfError(OrgHttpError):
    """HTTP 403 — CSRF or RBAC; do not rotate JWT."""


class OrgVersionConflictError(OrgHttpError):
    """HTTP 409 — optimistic concurrency; re-read at business layer."""


def classify_http_status(status_code: int, *, context: str = "") -> OrgHttpError:
    suffix = f" ({context})" if context else ""
    if status_code == 401:
        return OrgAuthError(401, f"HTTP 401 Unauthorized{suffix}")
    if status_code == 403:
        return OrgCsrfError(403, f"HTTP 403 Forbidden{suffix}")
    if status_code == 409:
        return OrgVersionConflictError(409, f"HTTP 409 Conflict{suffix}")
    return OrgHttpError(status_code, f"HTTP {status_code}{suffix}")


def _appdata_base() -> Path | None:
    raw = (os.environ.get("APPDATA") or "").strip()
    return Path(raw) if raw else None


def profile_data_dir(profile: str) -> Path | None:
    base = _appdata_base()
    if not base:
        return None
    return base / profile / "aionui"


def resolve_org_profile() -> str:
    """Return active AppData profile name (default packaged install: AionUi)."""
    raw = (os.environ.get(_ENV_PROFILE) or "").strip()
    if raw:
        if raw not in _VALID_PROFILES:
            logger.warning(
                "org_session: unknown %s=%r; falling back to %s",
                _ENV_PROFILE,
                raw,
                PROFILE_AIONUI,
            )
            return PROFILE_AIONUI
        return raw
    return PROFILE_AIONUI


def resolve_auth_fallback_policy() -> AuthFallbackPolicy:
    if (os.environ.get(_ENV_SESSION_TOKEN) or "").strip():
        return AuthFallbackPolicy.STRICT
    if (os.environ.get(_ENV_SESSION_TOKEN_FILE) or "").strip():
        return AuthFallbackPolicy.STRICT
    if (os.environ.get(_ENV_PROFILE) or "").strip():
        return AuthFallbackPolicy.STRICT
    return AuthFallbackPolicy.LEGACY_SCAN


@dataclass(frozen=True)
class AuthCandidate:
    token: str
    source: str
    profile: str | None = None


def _read_token_file(path: Path) -> str:
    try:
        return path.read_text(encoding="utf-8").strip()
    except OSError:
        return ""


def _profile_token_path(profile: str) -> Path | None:
    data_dir = profile_data_dir(profile)
    if not data_dir:
        return None
    return data_dir / "org-session.token"


def resolve_org_server_url(*, profile: str | None = None) -> str:
    from_env = (os.environ.get(_ENV_SERVER_URL) or "").strip().rstrip("/")
    if from_env:
        return from_env

    active = profile or resolve_org_profile()
    data_dir = profile_data_dir(active)
    if data_dir:
        config_path = data_dir / "org-server.json"
        try:
            payload = json.loads(config_path.read_text(encoding="utf-8"))
            url = (payload.get("url") or "").strip().rstrip("/")
            if url:
                return url
        except (OSError, json.JSONDecodeError, AttributeError):
            pass

    if resolve_auth_fallback_policy() == AuthFallbackPolicy.LEGACY_SCAN:
        for legacy_profile in (PROFILE_AIONUI, PROFILE_AIONUI_DEV):
            if legacy_profile == active:
                continue
            data_dir = profile_data_dir(legacy_profile)
            if not data_dir:
                continue
            config_path = data_dir / "org-server.json"
            try:
                payload = json.loads(config_path.read_text(encoding="utf-8"))
                url = (payload.get("url") or "").strip().rstrip("/")
                if url:
                    logger.warning(
                        "org_session: org-server.json resolved via legacy profile %s",
                        legacy_profile,
                    )
                    return url
            except (OSError, json.JSONDecodeError, AttributeError):
                continue
    return ""


def get_auth_candidates(
    *,
    profile: str | None = None,
    policy: AuthFallbackPolicy | None = None,
) -> list[AuthCandidate]:
    """Return JWT candidates in try order. Never logs token content."""
    active_policy = policy or resolve_auth_fallback_policy()
    active_profile = profile or resolve_org_profile()

    direct = (os.environ.get(_ENV_SESSION_TOKEN) or "").strip()
    if direct:
        return [AuthCandidate(token=direct, source="env:ORG_SESSION_TOKEN", profile=active_profile)]

    token_file = (os.environ.get(_ENV_SESSION_TOKEN_FILE) or "").strip()
    if token_file:
        path = Path(token_file)
        token = _read_token_file(path)
        if token:
            return [
                AuthCandidate(
                    token=token,
                    source=f"file:{path}",
                    profile=active_profile,
                )
            ]
        return []

    profiles_to_scan: list[str]
    if active_policy == AuthFallbackPolicy.STRICT:
        profiles_to_scan = [active_profile]
    else:
        logger.warning(
            "org_session: LEGACY_SCAN auth fallback (set %s for strict profile binding)",
            _ENV_PROFILE,
        )
        profiles_to_scan = [PROFILE_AIONUI, PROFILE_AIONUI_DEV]

    candidates: list[AuthCandidate] = []
    seen: set[str] = set()
    for prof in profiles_to_scan:
        path = _profile_token_path(prof)
        if not path:
            continue
        token = _read_token_file(path)
        if not token or token in seen:
            continue
        seen.add(token)
        candidates.append(
            AuthCandidate(
                token=token,
                source=f"profile:{prof}/org-session.token",
                profile=prof,
            )
        )
    return candidates


def iter_auth_tokens(
    *,
    profile: str | None = None,
    policy: AuthFallbackPolicy | None = None,
) -> Iterator[AuthCandidate]:
    yield from get_auth_candidates(profile=profile, policy=policy)
