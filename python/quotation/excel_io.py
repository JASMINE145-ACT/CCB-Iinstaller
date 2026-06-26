"""Shared Excel writable-path and workbook-save helpers."""
from __future__ import annotations

import logging
import stat
from pathlib import Path

logger = logging.getLogger(__name__)


def ensure_writable(path: Path) -> None:
    """清除 copy2 从只读模板继承的只读属性，避免 Windows 上 save 报 Permission denied。"""
    try:
        mode = path.stat().st_mode
        path.chmod(mode | stat.S_IWRITE)
    except OSError:
        logger.debug("chmod writable failed for %s", path, exc_info=True)


def save_workbook(wb, out_p: Path) -> None:
    """保存 workbook；先确保目标路径可写。"""
    ensure_writable(out_p)
    wb.save(out_p)
