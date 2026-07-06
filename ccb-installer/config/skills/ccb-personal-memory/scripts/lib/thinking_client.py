#!/usr/bin/env python3
"""Headless minimax-m3-thinking via Anthropic-compatible Messages API."""
from __future__ import annotations

import json
import os
import re
import urllib.error
import urllib.request
from pathlib import Path
from typing import Any

DEFAULT_MODEL = "minimax-m3-thinking"
DEFAULT_BASE = "https://api.minimaxi.com/anthropic"
TIMEOUT_SEC = 45

SYSTEM_PROMPT = """You extract STABLE, REUSABLE, ACTIONABLE personal work preferences of the user from a chat transcript.

Return ONLY valid JSON (no markdown fences):
{"entries":[{"target":"workflow","text":"one-line habit","evidence":"verbatim quote of the user's words","confidence":0.0}]}

Field rules:
- target: "workflow" = how the user prefers to work (ordering, defaults, output format) and will want again in FUTURE sessions; "profile" = the user's identity/role/how to address them (never business data)
- text: concise one-line statement in the user's language, 6-120 chars, no date prefix
- evidence: REQUIRED — copy the user's original wording from the transcript that proves this entry; an entry whose evidence cannot be found in the transcript is invalid and must be omitted
- confidence 0.0-1.0; omit entries below 0.7
- max 3 entries

NOT worth remembering — return no entry for any of these:
- one-off task facts, e.g. "这次帮我查5月数据" / "查一下三通50的价格"
- generic filler, e.g. "用户偏好高效工作" / "用户使用中文" / "用户希望结果准确"
- politeness or small talk, e.g. "谢谢" / "辛苦了"
- business rules: customer discounts, pricing/tax caliber, quotation corrections, org knowledge-base content
- name/department/job title already present in the employee profile
- anything already covered by an existing bullet below (do not repeat or rephrase)

If nothing qualifies, return {"entries":[]}
"""


def load_api_settings(config_dir: Path) -> tuple[str, str, str]:
    """Return (base_url, auth_token, model)."""
    base = (os.environ.get("ANTHROPIC_BASE_URL") or "").strip() or DEFAULT_BASE
    token = (os.environ.get("ANTHROPIC_AUTH_TOKEN") or os.environ.get("ANTHROPIC_API_KEY") or "").strip()
    model = (os.environ.get("CCB_PERSONAL_MEMORY_MODEL") or DEFAULT_MODEL).strip()

    settings_path = config_dir / "settings.json"
    if settings_path.is_file():
        try:
            settings = json.loads(settings_path.read_text(encoding="utf-8"))
            env = settings.get("env") if isinstance(settings, dict) else None
            if isinstance(env, dict):
                base = str(env.get("ANTHROPIC_BASE_URL") or base).strip() or DEFAULT_BASE
                token = str(
                    env.get("ANTHROPIC_AUTH_TOKEN") or env.get("ANTHROPIC_API_KEY") or token
                ).strip()
        except (OSError, json.JSONDecodeError):
            pass
    return base.rstrip("/"), token, model


def build_user_prompt(
    *,
    transcript_excerpt: str,
    existing_workflow: str,
    employee_profile_summary: str,
    existing_profile: str = "",
) -> str:
    return (
        "## Employee profile (do not duplicate)\n"
        f"{employee_profile_summary or '(none)'}\n\n"
        "## Existing workflow bullets (do not repeat or rephrase)\n"
        f"{existing_workflow or '(empty)'}\n\n"
        "## Existing profile bullets (do not repeat or rephrase)\n"
        f"{existing_profile or '(empty)'}\n\n"
        "## Transcript excerpt\n"
        f"{transcript_excerpt}\n"
    )


def _extract_json_object(text: str) -> dict[str, Any] | None:
    text = text.strip()
    if not text:
        return None
    try:
        data = json.loads(text)
        return data if isinstance(data, dict) else None
    except json.JSONDecodeError:
        pass
    match = re.search(r"\{[\s\S]*\}", text)
    if not match:
        return None
    try:
        data = json.loads(match.group(0))
        return data if isinstance(data, dict) else None
    except json.JSONDecodeError:
        return None


VALID_TARGETS = ("workflow", "profile")


def parse_entries(payload: dict[str, Any] | None) -> list[tuple[str, str, str]]:
    """Structural parse: (target, text, evidence) triples; entries without evidence
    are invalid (R3). Semantic validation (business veto, evidence anchoring,
    length, near-dup) happens in the worker where the transcript is available."""
    if not payload:
        return []
    entries = payload.get("entries")
    if not isinstance(entries, list):
        return []
    out: list[tuple[str, str, str]] = []
    for item in entries:
        if not isinstance(item, dict):
            continue
        target = str(item.get("target") or "").strip()
        text = str(item.get("text") or "").strip()
        evidence = str(item.get("evidence") or "").strip()
        try:
            confidence = float(item.get("confidence") or 0)
        except (TypeError, ValueError):
            confidence = 0.0
        if target not in VALID_TARGETS or not text or not evidence:
            continue
        if confidence < 0.7:
            continue
        out.append((target, text, evidence))
        if len(out) >= 3:
            break
    return out


def call_thinking(
    *,
    base_url: str,
    token: str,
    model: str,
    user_prompt: str,
    timeout: float = TIMEOUT_SEC,
) -> list[tuple[str, str, str]]:
    if not token:
        raise RuntimeError("missing ANTHROPIC_AUTH_TOKEN")

    url = f"{base_url}/v1/messages"
    body = {
        "model": model,
        "max_tokens": 512,
        "temperature": 0.2,
        "system": SYSTEM_PROMPT,
        "messages": [{"role": "user", "content": user_prompt}],
    }
    req = urllib.request.Request(
        url,
        data=json.dumps(body).encode("utf-8"),
        headers={
            "Content-Type": "application/json",
            "x-api-key": token,
            "Authorization": f"Bearer {token}",
            "anthropic-version": "2023-06-01",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            raw = resp.read().decode("utf-8", errors="replace")
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace")[:300]
        raise RuntimeError(f"thinking HTTP {exc.code}: {detail}") from exc
    except urllib.error.URLError as exc:
        raise RuntimeError(f"thinking network: {exc}") from exc

    data = json.loads(raw)
    content = data.get("content")
    text_parts: list[str] = []
    if isinstance(content, list):
        for block in content:
            if isinstance(block, dict) and block.get("type") == "text":
                text_parts.append(str(block.get("text") or ""))
    elif isinstance(content, str):
        text_parts.append(content)
    return parse_entries(_extract_json_object("".join(text_parts)))


def load_mock_entries(mock_path: str | Path) -> list[tuple[str, str, str]]:
    path = Path(mock_path)
    data = json.loads(path.read_text(encoding="utf-8"))
    if isinstance(data, dict):
        return parse_entries(data)
    return []
