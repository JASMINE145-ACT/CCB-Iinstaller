#!/usr/bin/env python3
"""Paths for session precipitation learning store."""
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


def learning_root(config_dir: Path | None = None) -> Path:
    root = config_dir or default_config_dir()
    return root / "learning"


def resolved_path(config_dir: Path | None = None) -> Path:
    return learning_root(config_dir) / "precipitation_resolved.jsonl"


def pending_path(config_dir: Path | None = None) -> Path:
    return learning_root(config_dir) / "precipitation_pending.jsonl"


def decisions_path(config_dir: Path | None = None) -> Path:
    return learning_root(config_dir) / "precipitation_decisions.jsonl"


def summary_path(config_dir: Path | None = None) -> Path:
    return learning_root(config_dir) / ".precipitation-summary.json"


def runs_dir(config_dir: Path | None = None) -> Path:
    return learning_root(config_dir) / "precipitation_runs"


def business_knowledge_shadow(config_dir: Path | None = None) -> Path:
    root = config_dir or default_config_dir()
    vendor = root.parent / "vendor" / "wanding" / "data" / "wanding_business_knowledge.md"
    if vendor.is_file():
        return vendor
    return root.parent / "vendor" / "wanding" / "data" / "wanding_business_knowledge.md"


def profile_path(config_dir: Path | None = None) -> Path:
    return (config_dir or default_config_dir()) / "memory" / "personal" / "profile.md"


def golden_path_promoted_path(config_dir: Path | None = None) -> Path:
    return learning_root(config_dir) / "golden_path_promoted.jsonl"


def eval_promoted_path(config_dir: Path | None = None) -> Path:
    return learning_root(config_dir) / "eval_precipitation_promoted.jsonl"


def business_rule_promoted_path(config_dir: Path | None = None) -> Path:
    return learning_root(config_dir) / "business_rule_promoted.jsonl"


def workflow_path(config_dir: Path | None = None) -> Path:
    return (config_dir or default_config_dir()) / "memory" / "personal" / "workflow.md"


def log_path(config_dir: Path | None = None) -> Path:
    return (config_dir or default_config_dir()) / "logs" / "precipitation-worker.log"
