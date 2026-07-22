#!/usr/bin/env python3
"""Outbound policy + business-field redaction before FullReview LLM (D7).

Defaults: tenant allow, session deny override, fail-closed on redaction errors.
Funnel event redaction is separate — this gate runs on transcript/KB excerpts
sent to external models.
"""
from __future__ import annotations

import json
import os
import re
from pathlib import Path
from typing import Any


class OutboundDenied(Exception):
    """Session or tenant policy forbids outbound FullReview."""

    def __init__(self, reason: str = "outbound_denied") -> None:
        super().__init__(reason)
        self.reason = reason


class OutboundRedactionFailed(Exception):
    """Required redaction could not be applied — must not send raw payload."""

    def __init__(self, reason: str = "outbound_redaction_failed") -> None:
        super().__init__(reason)
        self.reason = reason


# Currency / amount patterns (CN + common symbols)
_AMOUNT_RE = re.compile(
    r"(?:"
    r"[¥￥$€£]\s*[\d,]+(?:\.\d{1,4})?"
    r"|[\d,]+(?:\.\d{1,4})?\s*(?:元|万元|千元|亿元|USD|CNY|RMB)"
    r"|\d+(?:\.\d+)?\s*万"
    r")",
    re.IGNORECASE,
)

# Project / contract / order style identifiers
_ID_RE = re.compile(
    r"(?:"
    r"(?:合同|项目|订单|报价单|PO|SO|HT|XM)[-_#]?\s*[A-Za-z0-9][-A-Za-z0-9_/]{3,}"
    r"|[A-Z]{2,5}-\d{4,}(?:-\d+)?"
    r")",
    re.IGNORECASE,
)

# Chinese / English company-like names (conservative substitution)
_COMPANY_RE = re.compile(
    r"(?:"
    r"[\u4e00-\u9fff]{2,20}(?:有限公司|股份有限公司|集团有限公司|科技有限公司|商贸有限公司)"
    r"|[A-Z][A-Za-z0-9&.\-]{1,40}\s+(?:Co\.?,?\s*Ltd\.?|Inc\.?|LLC|Corp\.?)"
    r")"
)

# Phone / email (also business-sensitive in outbound)
_PHONE_RE = re.compile(r"(?<!\d)(?:\+?86[-\s]?)?1[3-9]\d{9}(?!\d)")
_EMAIL_RE = re.compile(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}")


def _truthy(val: str | None) -> bool:
    return (val or "").strip().lower() in ("1", "true", "yes", "deny", "denied")


def tenant_outbound_allowed(config_dir: Path) -> bool:
    """Tenant default is allow; CCB_PRECIPITATION_OUTBOUND=deny or settings override."""
    env = (os.environ.get("CCB_PRECIPITATION_OUTBOUND") or "").strip().lower()
    if env in ("deny", "denied", "0", "false", "no"):
        return False
    if env in ("allow", "allowed", "1", "true", "yes"):
        return True

    settings_path = config_dir / "settings.json"
    if settings_path.is_file():
        try:
            data = json.loads(settings_path.read_text(encoding="utf-8"))
            if isinstance(data, dict):
                nested = data.get("env") if isinstance(data.get("env"), dict) else {}
                policy = data.get("precipitationOutbound") or nested.get("CCB_PRECIPITATION_OUTBOUND")
                if isinstance(policy, str) and policy.strip().lower() in ("deny", "denied"):
                    return False
        except (OSError, json.JSONDecodeError):
            pass
    return True


def session_outbound_denied(config_dir: Path, session_id: str, user_msgs: list[str] | None = None) -> str | None:
    """Return deny reason if session suppress overrides tenant allow."""
    if user_msgs:
        suppress_phrases = ("不要记录", "别学习", "不要学习", "不要沉淀", "别沉淀")
        if any(any(p in m for p in suppress_phrases) for m in user_msgs):
            return "user_suppressed"

    if not session_id:
        return None

    policy_path = config_dir / "learning" / "session_outbound_deny.json"
    if policy_path.is_file():
        try:
            data = json.loads(policy_path.read_text(encoding="utf-8"))
            if isinstance(data, dict):
                if data.get(session_id) is True or data.get(session_id) == "deny":
                    return "session_deny"
                sessions = data.get("sessions")
                if isinstance(sessions, list) and session_id in sessions:
                    return "session_deny"
                if isinstance(sessions, dict) and sessions.get(session_id) in (True, "deny"):
                    return "session_deny"
        except (OSError, json.JSONDecodeError):
            pass

    flag = config_dir / "learning" / "sessions" / session_id / "outbound_deny"
    if flag.is_file():
        return "session_deny"
    return None


def assert_outbound_allowed(
    config_dir: Path,
    session_id: str,
    user_msgs: list[str] | None = None,
) -> None:
    if not tenant_outbound_allowed(config_dir):
        raise OutboundDenied("tenant_outbound_deny")
    reason = session_outbound_denied(config_dir, session_id, user_msgs)
    if reason:
        raise OutboundDenied(reason)


def redact_business_fields(text: str) -> str:
    """Substitute sensitive business entities with placeholders."""
    if not text:
        return text
    out = text
    out = _EMAIL_RE.sub("[EMAIL]", out)
    out = _PHONE_RE.sub("[PHONE]", out)
    out = _AMOUNT_RE.sub("[AMOUNT]", out)
    out = _ID_RE.sub("[BIZ_ID]", out)
    out = _COMPANY_RE.sub("[ORG]", out)
    return out


def prepare_outbound_text(text: str, *, label: str = "payload") -> str:
    """Redact or fail-closed. Never return unredacted text on error."""
    try:
        redacted = redact_business_fields(text)
    except Exception as exc:  # noqa: BLE001
        raise OutboundRedactionFailed(f"outbound_redaction_failed:{label}") from exc
    if text and not isinstance(redacted, str):
        raise OutboundRedactionFailed(f"outbound_redaction_failed:{label}")
    return redacted


def prepare_outbound_bundle(
    *,
    config_dir: Path,
    session_id: str,
    transcript_excerpt: str,
    business_kb_excerpt: str = "",
    workflow_excerpt: str = "",
    profile_excerpt: str = "",
    user_msgs: list[str] | None = None,
) -> dict[str, Any]:
    """Policy check + redact all outbound excerpts. Raises OutboundDenied/Failed."""
    assert_outbound_allowed(config_dir, session_id, user_msgs)
    return {
        "transcript_excerpt": prepare_outbound_text(transcript_excerpt, label="transcript"),
        "business_kb_excerpt": prepare_outbound_text(business_kb_excerpt, label="kb"),
        "workflow_excerpt": prepare_outbound_text(workflow_excerpt, label="workflow"),
        "profile_excerpt": prepare_outbound_text(profile_excerpt, label="profile"),
        "chars_sent": len(transcript_excerpt or "") + len(business_kb_excerpt or ""),
        "outbound_model": "redacted",
    }
