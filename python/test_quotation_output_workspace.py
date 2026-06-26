# -*- coding: utf-8 -*-
"""Tests for session workspace output path resolution."""
from __future__ import annotations

import os
import sys
import tempfile
from pathlib import Path

PYTHON_ROOT = Path(__file__).resolve().parent
if str(PYTHON_ROOT) not in sys.path:
    sys.path.insert(0, str(PYTHON_ROOT))

from system.workspace_paths import (  # noqa: E402
    coerce_write_path,
    default_output_path,
    read_active_workspace_file,
    resolve_workspace_dir,
)


def test_resolve_workspace_dir_prefers_workspace_param() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        assert resolve_workspace_dir(tmp) == Path(tmp)


def test_resolve_workspace_dir_reads_env() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        old = os.environ.get("WANDING_WORKSPACE")
        os.environ["WANDING_WORKSPACE"] = tmp
        try:
            assert resolve_workspace_dir() == Path(tmp)
        finally:
            if old is None:
                os.environ.pop("WANDING_WORKSPACE", None)
            else:
                os.environ["WANDING_WORKSPACE"] = old


def test_resolve_workspace_dir_reads_pointer_file() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        pointer = Path(tmp) / "active-workspace.txt"
        workspace = Path(tmp) / "session-workspace"
        workspace.mkdir()
        pointer.write_text(str(workspace), encoding="utf-8")
        old = os.environ.get("WANDING_WORKSPACE_POINTER")
        os.environ["WANDING_WORKSPACE_POINTER"] = str(pointer)
        try:
            assert read_active_workspace_file() == str(workspace)
            assert resolve_workspace_dir() == workspace
        finally:
            if old is None:
                os.environ.pop("WANDING_WORKSPACE_POINTER", None)
            else:
                os.environ["WANDING_WORKSPACE_POINTER"] = old


def test_default_output_path_joins_filename() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        out = default_output_path("export.xlsx", workspace_path=tmp)
        assert out == Path(tmp) / "export.xlsx"


def test_coerce_write_path_relative_goes_under_workspace() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        resolved = coerce_write_path("reports/out.xlsx", workspace_path=tmp, unique=False)
        assert Path(resolved) == Path(tmp) / "reports" / "out.xlsx"


def test_coerce_write_path_default_filename_in_workspace() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        resolved = coerce_write_path(None, workspace_path=tmp, default_filename="memo.docx", unique=False)
        assert Path(resolved) == Path(tmp) / "memo.docx"


def test_coerce_write_path_strict_default_requires_workspace() -> None:
    old_workspace = os.environ.get("WANDING_WORKSPACE")
    old_pointer = os.environ.get("WANDING_WORKSPACE_POINTER")
    os.environ.pop("WANDING_WORKSPACE", None)
    os.environ.pop("WANDING_WORKSPACE_POINTER", None)
    try:
        try:
            coerce_write_path(None, default_filename="memo.docx", unique=False, require_workspace=True)
        except ValueError as exc:
            assert "Missing required workspace_path" in str(exc)
        else:
            raise AssertionError("strict default output should require workspace")
    finally:
        if old_workspace is not None:
            os.environ["WANDING_WORKSPACE"] = old_workspace
        if old_pointer is not None:
            os.environ["WANDING_WORKSPACE_POINTER"] = old_pointer


def test_coerce_write_path_strict_relative_requires_workspace() -> None:
    old_workspace = os.environ.get("WANDING_WORKSPACE")
    old_pointer = os.environ.get("WANDING_WORKSPACE_POINTER")
    os.environ.pop("WANDING_WORKSPACE", None)
    os.environ.pop("WANDING_WORKSPACE_POINTER", None)
    try:
        try:
            coerce_write_path("reports/out.xlsx", unique=False, require_workspace=True)
        except ValueError as exc:
            assert "Missing required workspace_path" in str(exc)
        else:
            raise AssertionError("strict relative output should require workspace")
    finally:
        if old_workspace is not None:
            os.environ["WANDING_WORKSPACE"] = old_workspace
        if old_pointer is not None:
            os.environ["WANDING_WORKSPACE_POINTER"] = old_pointer


def test_coerce_write_path_strict_absolute_does_not_require_workspace() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        target = Path(tmp) / "absolute.xlsx"
        resolved = coerce_write_path(target, unique=False, require_workspace=True)
        assert Path(resolved) == target


if __name__ == "__main__":
    for fn in (
        test_resolve_workspace_dir_prefers_workspace_param,
        test_resolve_workspace_dir_reads_env,
        test_resolve_workspace_dir_reads_pointer_file,
        test_default_output_path_joins_filename,
        test_coerce_write_path_relative_goes_under_workspace,
        test_coerce_write_path_default_filename_in_workspace,
        test_coerce_write_path_strict_default_requires_workspace,
        test_coerce_write_path_strict_relative_requires_workspace,
        test_coerce_write_path_strict_absolute_does_not_require_workspace,
    ):
        fn()
    print("workspace output path tests passed")
