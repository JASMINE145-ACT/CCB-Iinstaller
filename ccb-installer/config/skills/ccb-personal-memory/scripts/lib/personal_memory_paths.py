#!/usr/bin/env python3
"""Resolve CCB-Wanding config paths for personal memory."""
from __future__ import annotations

import os
from pathlib import Path


def default_config_dir() -> Path:
    override = (os.environ.get("CCB_WANDING_CONFIG_DIR") or "").strip()
    if override:
        return Path(override)
    local = (os.environ.get("LOCALAPPDATA") or "").strip()
    if local:
        return Path(local) / "CCB-Wanding" / ".claude"
    return Path.home() / "AppData" / "Local" / "CCB-Wanding" / ".claude"


def memory_root(config_dir: Path | None = None) -> Path:
    root = config_dir or default_config_dir()
    return root / "memory"


def workflow_path(config_dir: Path | None = None) -> Path:
    return memory_root(config_dir) / "personal" / "workflow.md"


def profile_path(config_dir: Path | None = None) -> Path:
    return memory_root(config_dir) / "personal" / "profile.md"


def employee_profile_path(config_dir: Path | None = None) -> Path:
    root = config_dir or default_config_dir()
    return root / "employee-profile.json"


def log_path(config_dir: Path | None = None) -> Path:
    root = config_dir or default_config_dir()
    return root / "logs" / "personal-memory-stop.log"


def lock_path(config_dir: Path | None = None) -> Path:
    return workflow_path(config_dir).with_suffix(".md.lock")


def learning_status_path(config_dir: Path | None = None) -> Path:
    return memory_root(config_dir) / ".learning-status.json"


def jobs_dir(config_dir: Path | None = None) -> Path:
    return memory_root(config_dir) / "jobs"
