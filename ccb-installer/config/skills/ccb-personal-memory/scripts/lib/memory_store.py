#!/usr/bin/env python3
"""Locked append + dedup for personal memory files."""
from __future__ import annotations

import json
import os
import re
import time
from datetime import date
from difflib import SequenceMatcher
from pathlib import Path

from personal_memory_paths import (
    employee_profile_path,
    lock_path,
    log_path,
    profile_path,
    workflow_path,
)

MAX_APPENDS_PER_STOP = 3
LOCK_TIMEOUT_SEC = 25.0
LOCK_POLL_SEC = 0.05
NEAR_DUPLICATE_RATIO = 0.85

_BULLET_DATE_PREFIX = re.compile(r"^-\s*(?:\[\d{4}-\d{2}-\d{2}\]\s*)?")


class MemoryStoreError(Exception):
    """Non-recoverable IO error during memory append."""


def normalize_compare(text: str) -> str:
    return " ".join(text.casefold().split())


def _read_employee_profile_values(config_dir: Path | None) -> set[str]:
    path = employee_profile_path(config_dir)
    if not path.is_file():
        return set()
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return set()
    if not isinstance(data, dict):
        return set()
    values: set[str] = set()
    for key in ("displayName", "department", "jobTitle", "employeeId", "email", "phone", "notes"):
        raw = data.get(key)
        if raw is None:
            continue
        text = str(raw).strip()
        if text:
            values.add(normalize_compare(text))
    return values


def _target_path(target: str, config_dir: Path | None) -> Path:
    if target == "profile":
        return profile_path(config_dir)
    return workflow_path(config_dir)


def _line_exists(file_text: str, bullet_body: str) -> bool:
    norm = normalize_compare(bullet_body)
    return norm in normalize_compare(file_text)


def bullet_bodies(file_text: str) -> list[str]:
    """Bullet texts with the '- [YYYY-MM-DD] ' prefix stripped (normalized list)."""
    bodies: list[str] = []
    for raw in file_text.splitlines():
        line = raw.strip()
        if not line.startswith("-"):
            continue
        body = _BULLET_DATE_PREFIX.sub("", line).strip()
        if body:
            bodies.append(body)
    return bodies


def read_bullets(target: str, config_dir: Path | None = None) -> list[str]:
    """All existing bullet bodies for a target file — full dedup hint (R4)."""
    path = _target_path(target, config_dir)
    if not path.is_file():
        return []
    return bullet_bodies(path.read_text(encoding="utf-8", errors="replace"))


def is_near_duplicate(candidate_text: str, existing_bodies: list[str]) -> bool:
    """Semantic near-dup (R4): SequenceMatcher ratio >= 0.85 vs any existing bullet."""
    norm = normalize_compare(candidate_text)
    if not norm:
        return False
    for body in existing_bodies:
        other = normalize_compare(body)
        if not other:
            continue
        if SequenceMatcher(None, norm, other).ratio() >= NEAR_DUPLICATE_RATIO:
            return True
    return False


def _format_bullet(body: str, *, day: date | None = None) -> str:
    stamp = (day or date.today()).isoformat()
    return f"- [{stamp}] {body}"


def _append_log(config_dir: Path | None, message: str) -> None:
    path = log_path(config_dir)
    path.parent.mkdir(parents=True, exist_ok=True)
    stamp = time.strftime("%Y-%m-%d %H:%M:%S")
    with path.open("a", encoding="utf-8", newline="\n") as handle:
        handle.write(f"[{stamp}] {message}\n")


class _FileLock:
    def __init__(self, path: Path, *, timeout: float = LOCK_TIMEOUT_SEC) -> None:
        self._path = path
        self._timeout = timeout
        self._handle = None

    def __enter__(self) -> "_FileLock":
        self._path.parent.mkdir(parents=True, exist_ok=True)
        deadline = time.monotonic() + self._timeout
        while True:
            try:
                self._handle = self._path.open("x", encoding="utf-8")
                self._handle.write(str(os.getpid()))
                self._handle.flush()
                return self
            except FileExistsError:
                if time.monotonic() >= deadline:
                    raise MemoryStoreError(f"lock timeout: {self._path}") from None
                time.sleep(LOCK_POLL_SEC)

    def __exit__(self, exc_type, exc, tb) -> None:
        if self._handle is not None:
            self._handle.close()
        try:
            self._path.unlink(missing_ok=True)
        except OSError:
            pass


def should_skip_candidate(
    candidate_text: str,
    *,
    target: str,
    config_dir: Path | None,
    existing_file_text: str,
    employee_values: set[str] | None = None,
) -> bool:
    norm = normalize_compare(candidate_text)
    if _line_exists(existing_file_text, candidate_text):
        return True
    if is_near_duplicate(candidate_text, bullet_bodies(existing_file_text)):
        return True
    employee = employee_values if employee_values is not None else _read_employee_profile_values(config_dir)
    if target == "profile":
        for value in employee:
            if value and (value in norm or norm in value):
                return True
    else:
        for value in employee:
            if value and len(value) >= 4 and value in norm:
                return True
    return False


def append_candidate(
    target: str,
    body: str,
    *,
    config_dir: Path | None = None,
) -> bool:
    """Append one bullet if not duplicate. Returns True when appended."""
    dest = _target_path(target, config_dir)
    dest.parent.mkdir(parents=True, exist_ok=True)
    lock = lock_path(config_dir)
    employee_values = _read_employee_profile_values(config_dir)

    with _FileLock(lock):
        existing = dest.read_text(encoding="utf-8") if dest.is_file() else ""
        if should_skip_candidate(
            body,
            target=target,
            config_dir=config_dir,
            existing_file_text=existing,
            employee_values=employee_values,
        ):
            return False
        bullet = _format_bullet(body)
        updated = existing.rstrip("\n")
        if updated:
            updated += "\n"
        updated += bullet + "\n"
        tmp = dest.with_suffix(dest.suffix + ".tmp")
        tmp.write_text(updated, encoding="utf-8", newline="\n")
        tmp.replace(dest)
        _append_log(config_dir, f"append {dest.name}: {body}")
        return True


def append_candidates(
    candidates: list[tuple[str, str]],
    *,
    config_dir: Path | None = None,
) -> list[tuple[str, str]]:
    """Append up to MAX_APPENDS_PER_STOP candidates. Returns the appended pairs."""
    appended: list[tuple[str, str]] = []
    for target, body in candidates[:MAX_APPENDS_PER_STOP]:
        try:
            if append_candidate(target, body, config_dir=config_dir):
                appended.append((target, body))
        except MemoryStoreError:
            raise
        except OSError as exc:
            raise MemoryStoreError(str(exc)) from exc
    return appended
