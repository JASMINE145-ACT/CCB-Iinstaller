"""HTTP client for organization knowledge docs (center aioncore)."""
from __future__ import annotations

import http.cookiejar
import json
import logging
import re
import urllib.error
import urllib.request
from datetime import datetime
from pathlib import Path
from typing import Any
from urllib.parse import quote

from admin.org_http_csrf import ORG_CSRF_HEADER_NAME, ORG_CSRF_STATUS_PATH, bootstrap_org_csrf, build_cookie_opener
from admin.org_session import (
    AuthCandidate,
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

DEFAULT_SLUG = "wanding_business_knowledge"

_RULE_DEDUP_MIN_CHARS = 6


def _normalize_rule_text(text: str) -> str:
    return re.sub(r"\s+", "", (text or "").lower())


def rule_already_in_doc(rule_text: str, doc_content: str) -> bool:
    """True when an equivalent rule already exists in org doc content."""
    norm_rule = _normalize_rule_text(rule_text)
    if len(norm_rule) < _RULE_DEDUP_MIN_CHARS:
        return False
    norm_doc = _normalize_rule_text(doc_content)
    if norm_rule in norm_doc:
        return True
    for line in (doc_content or "").splitlines():
        stripped = line.strip().lstrip("-").strip()
        if len(stripped) < _RULE_DEDUP_MIN_CHARS:
            continue
        norm_line = _normalize_rule_text(stripped)
        if norm_rule in norm_line or norm_line in norm_rule:
            return True
    return False

# cache: slug -> {"version": int|None, "content": str, "source": str}
_doc_cache: dict[str, dict[str, Any]] = {}


def is_org_api_configured() -> bool:
    return bool(resolve_org_server_url())


def invalidate_org_knowledge_cache(slug: str | None = None) -> None:
    """Clear cached org knowledge (all slugs or one slug)."""
    global _doc_cache
    if slug is None:
        _doc_cache = {}
    else:
        _doc_cache.pop(slug, None)


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
        with urllib.request.urlopen(req, timeout=15) as resp:
            return _parse_json_response(resp.read())
    except urllib.error.HTTPError as e:
        if e.code in (401, 403, 409):
            raise classify_http_status(e.code, context=f"GET {path}") from e
        logger.warning("org knowledge API GET %s failed: HTTP %s", path, e.code)
        return None
    except (urllib.error.URLError, TimeoutError) as e:
        logger.warning("org knowledge API GET %s failed: %s", path, e)
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
            logger.warning("org knowledge API GET %s: 401 with no session token", path)
            return None

    saw_auth_error = False
    for index, candidate in enumerate(candidates):
        try:
            result = _make_get(base, path, candidate.token)
            if index > 0 and result is not None:
                logger.info(
                    "org_knowledge_client: org API OK using auth candidate %d/%d source=%s profile=%s",
                    index + 1,
                    len(candidates),
                    candidate.source,
                    candidate.profile,
                )
            return result
        except OrgAuthError:
            saw_auth_error = True
            continue

    if saw_auth_error:
        policy = resolve_auth_fallback_policy().value
        logger.warning(
            "org knowledge API GET %s failed: HTTP Error 401: Unauthorized "
            "(candidates=%d policy=%s)",
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
                f"org knowledge API CSRF bootstrap GET {ORG_CSRF_STATUS_PATH} failed: {e}"
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
            with opener.open(req, timeout=20) as resp:
                data = json.loads(resp.read().decode("utf-8"))
        except urllib.error.HTTPError as e:
            if e.code == 401:
                last_auth_error = OrgAuthError(401, f"HTTP 401 Unauthorized ({method} {path})")
                continue
            if e.code == 403:
                raw = e.read().decode("utf-8", errors="replace")
                raise OrgCsrfError(403, f"org knowledge API {method} {path} failed: HTTP 403 {raw}") from e
            if e.code == 409:
                raw = e.read().decode("utf-8", errors="replace")
                raise OrgVersionConflictError(
                    409,
                    f"org knowledge API {method} {path} failed: HTTP 409 {raw}",
                ) from e
            raw = e.read().decode("utf-8", errors="replace")
            raise RuntimeError(f"org knowledge API {method} {path} failed: HTTP {e.code} {raw}") from e
        except (urllib.error.URLError, TimeoutError, json.JSONDecodeError) as e:
            raise RuntimeError(f"org knowledge API {method} {path} failed: {e}") from e

        if isinstance(data, dict) and "data" in data and isinstance(data["data"], dict):
            return data["data"]
        if isinstance(data, dict):
            return data
        raise RuntimeError(f"org knowledge API {method} {path} returned invalid JSON")

    if last_auth_error is not None:
        raise RuntimeError(
            f"org knowledge API {method} {path} failed: HTTP 401 Unauthorized "
            f"(candidates={len(candidates)} policy={resolve_auth_fallback_policy().value})"
        ) from last_auth_error
    raise RuntimeError(f"org knowledge API {method} {path} failed: no auth candidates")


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
        "updated_by_id": data.get("updated_by_id"),
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
            "updated_by_id": data.get("updated_by_id"),
        }
    return data


def append_business_rule(
    rule_text: str,
    *,
    section: str | None = None,
    reason: str | None = None,
    slug: str = DEFAULT_SLUG,
    force_near_duplicate: bool = False,
) -> dict[str, Any]:
    """Append a confirmed business rule to the shared Wanding knowledge doc."""
    from admin.org_knowledge_mutate import (
        check_rule_budget,
        near_duplicate_matches,
        stamp_appended_block,
    )
    from admin.org_knowledge_payloads import build_org_mutate_envelope

    rule = (rule_text or "").strip()
    if not rule:
        raise ValueError("rule_text is required")

    budget_err = check_rule_budget(rule)
    if budget_err:
        return build_org_mutate_envelope(
            action="append",
            applied=False,
            requires_confirmation=False,
            target={"slug": slug},
            error_code=budget_err,
            message=f"rule_text exceeds {budget_err} hard cap",
            rule_text=rule,
        )

    doc = get_doc(slug, use_cache=False)
    if not doc:
        raise RuntimeError(f"org knowledge doc not available: {slug}")

    content = str(doc.get("content") or "").rstrip()
    title = str(doc.get("title") or slug)
    version = int(doc.get("version") or 0)
    if rule_already_in_doc(rule, content):
        return build_org_mutate_envelope(
            action="append",
            applied=False,
            requires_confirmation=False,
            target={"slug": slug},
            version={"doc_version": version},
            error_code=None,
            message="duplicate",
            skipped=True,
            reason="duplicate",
            rule_text=rule,
            slug=slug,
        )

    if not force_near_duplicate:
        near = near_duplicate_matches(rule, content)
        if near:
            return build_org_mutate_envelope(
                action="append",
                applied=False,
                requires_confirmation=True,
                target={"slug": slug},
                changes=near,
                version={"doc_version": version},
                error_code="NEAR_DUPLICATE",
                message="Near-duplicate of an existing rule",
                rule_text=rule,
                slug=slug,
            )

    section_text = (section or "业务规则补充").strip()
    reason_text = (reason or "").strip()
    today = datetime.now().strftime("%Y-%m-%d")
    stamped, block_id, block_hash = stamp_appended_block(rule, reason=reason_text or None, today=today)
    new_content = f"{content}\n\n## {section_text}\n\n{stamped}"

    response = update_doc(
        slug,
        title=title,
        content=new_content if content else f"## {section_text}\n\n{stamped}",
        expected_version=version,
    )
    return build_org_mutate_envelope(
        action="append",
        applied=True,
        requires_confirmation=False,
        target={
            "slug": slug,
            "section": section_text,
            "block_id": block_id,
            "content_hash": block_hash,
        },
        preview_after=stamped,
        version={"doc_version": response.get("version"), "previous": version},
        error_code=None,
        slug=slug,
        title=response.get("title") or title,
        previous_version=version,
        section=section_text,
        rule_text=rule,
        updated_at=response.get("updated_at"),
        updated_by_id=response.get("updated_by_id"),
    )


def fetch_org_user_claims() -> dict[str, Any]:
    """Load is_admin / capabilities from GET /api/auth/user (JWT alone has no is_admin claim).

    Returns empty dict on failure — callers must deny by default.
    """
    try:
        data = _api_get("/api/auth/user")
    except Exception:
        logger.warning("fetch_org_user_claims: /api/auth/user failed; deny-by-default", exc_info=True)
        return {}
    if not isinstance(data, dict):
        return {}
    user = data.get("user") if isinstance(data.get("user"), dict) else data
    if not isinstance(user, dict):
        return {}
    caps = user.get("capabilities")
    return {
        "is_admin": bool(user.get("is_admin")),
        "capabilities": caps if isinstance(caps, list) else [],
        "username": user.get("username"),
        "id": user.get("id"),
    }


def delete_business_rule(
    *,
    slug: str = DEFAULT_SLUG,
    block_id: str | None = None,
    content_hash_value: str | None = None,
    snippet: str | None = None,
    doc_version: int | None = None,
    confirmed: bool = False,
    allow_section_edit: bool = False,
) -> dict[str, Any]:
    """Preview or apply deletion of one rule block (auditable — history kept by org PUT)."""
    from admin.org_knowledge_mutate import (
        DELETE_FORBIDDEN_ZH,
        can_apply_knowledge_delete,
        find_blocks,
        remove_block,
    )
    from admin.org_knowledge_payloads import build_org_mutate_envelope

    has_id = bool(block_id and str(block_id).strip())
    has_hash = bool(content_hash_value and str(content_hash_value).strip())
    has_snippet = bool(snippet and str(snippet).strip())
    # Contract: block_id XOR (content_hash + snippet). Snippet-only = contains-only → forbidden.
    if not has_id and not (has_hash and has_snippet):
        return build_org_mutate_envelope(
            action="delete",
            applied=False,
            requires_confirmation=False,
            error_code="AMBIGUOUS_MATCH",
            message=(
                "Provide block_id, or content_hash + snippet together. "
                "Snippet-only / contains-only locators are not allowed."
            ),
            target={"slug": slug},
        )

    doc = get_doc(slug, use_cache=False)
    if not doc:
        raise RuntimeError(f"org knowledge doc not available: {slug}")

    content = str(doc.get("content") or "")
    title = str(doc.get("title") or slug)
    version = int(doc.get("version") or 0)

    if doc_version is not None and int(doc_version) != version:
        return build_org_mutate_envelope(
            action="delete",
            applied=False,
            requires_confirmation=True,
            target={"slug": slug, "block_id": block_id, "content_hash": content_hash_value},
            version={"doc_version": version, "requested": doc_version},
            error_code="CONFLICT",
            message="doc_version mismatch — refresh and re-preview",
        )

    matches = find_blocks(
        content,
        block_id=block_id,
        content_hash_value=content_hash_value,
        snippet=snippet,
    )
    if not matches:
        return build_org_mutate_envelope(
            action="delete",
            applied=False,
            requires_confirmation=True,
            target={"slug": slug, "block_id": block_id, "content_hash": content_hash_value},
            version={"doc_version": version},
            error_code="AMBIGUOUS_MATCH",
            message="0 blocks matched",
            changes=[],
        )
    if len(matches) > 1:
        return build_org_mutate_envelope(
            action="delete",
            applied=False,
            requires_confirmation=True,
            target={"slug": slug},
            version={"doc_version": version},
            error_code="AMBIGUOUS_MATCH",
            message="Multiple blocks matched — narrow locator",
            changes=[
                {
                    "block_id": b.block_id,
                    "content_hash": b.content_hash,
                    "snippet": b.text.strip()[:180],
                    "section": b.section,
                }
                for b in matches
            ],
        )

    block = matches[0]
    # Refuse deleting when the only hit is a lone ## heading misuse
    first_line = next((ln.strip() for ln in block.text.splitlines() if ln.strip()), "")
    if first_line.startswith("## ") and not allow_section_edit:
        return build_org_mutate_envelope(
            action="delete",
            applied=False,
            error_code="FORBIDDEN",
            message="Refusing to delete section heading without allow_section_edit=true",
            target={"slug": slug},
            version={"doc_version": version},
        )

    preview_after = remove_block(content, block)
    target = {
        "slug": slug,
        "block_id": block.block_id,
        "content_hash": block.content_hash,
        "section": block.section,
    }
    if not confirmed:
        return build_org_mutate_envelope(
            action="delete",
            requires_confirmation=True,
            applied=False,
            target=target,
            changes=[{"removed_preview": block.text.strip()[:500]}],
            preview_before=block.text,
            preview_after=preview_after[-2000:],
            version={"doc_version": version},
            message="Confirm delete with confirmed=true (history retained via org version).",
            removed_text=block.text,
        )

    claims = fetch_org_user_claims()
    if not can_apply_knowledge_delete(
        slug,
        is_admin=bool(claims.get("is_admin")),
        capabilities=claims.get("capabilities") if isinstance(claims.get("capabilities"), list) else None,
    ):
        return build_org_mutate_envelope(
            action="delete",
            requires_confirmation=False,
            applied=False,
            target=target,
            preview_before=block.text,
            version={"doc_version": version},
            error_code="FORBIDDEN",
            message=DELETE_FORBIDDEN_ZH,
            removed_text=block.text,
        )

    response = update_doc(
        slug,
        title=title,
        content=preview_after,
        expected_version=version,
    )
    return build_org_mutate_envelope(
        action="delete",
        applied=True,
        requires_confirmation=False,
        target=target,
        preview_before=block.text,
        version={
            "doc_version": response.get("version"),
            "previous": version,
        },
        message="Block removed; prior content remains in org knowledge history/revert.",
        removed_text=block.text,
        slug=slug,
        previous_version=version,
        updated_at=response.get("updated_at"),
        updated_by_id=response.get("updated_by_id"),
        actor=response.get("updated_by_id"),
    )


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
