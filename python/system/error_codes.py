"""MCP error code constants and response normalization."""
from __future__ import annotations

from typing import Any

ERROR_CODE_NO_DATA = "NO_DATA"
ERROR_CODE_AMBIGUOUS_MATCH = "AMBIGUOUS_MATCH"
ERROR_CODE_FILE_NOT_FOUND = "FILE_NOT_FOUND"
ERROR_CODE_INVALID_INPUT = "INVALID_INPUT"
ERROR_CODE_TIMEOUT = "TIMEOUT"
ERROR_CODE_DEPENDENCY_MISSING = "DEPENDENCY_MISSING"
ERROR_CODE_PERMISSION_REQUIRED = "PERMISSION_REQUIRED"


def infer_error_code(error: Any) -> str:
    text = str(error or "").strip().lower()
    if not text:
        return ERROR_CODE_INVALID_INPUT
    if any(token in text for token in ("timed out", "timeout", "超时")):
        return ERROR_CODE_TIMEOUT
    if any(token in text for token in ("permission", "denied", "not allowed", "权限", "拒绝")):
        return ERROR_CODE_PERMISSION_REQUIRED
    if any(token in text for token in ("no such file", "file not found", "文件不存在", "模板不存在")):
        return ERROR_CODE_FILE_NOT_FOUND
    if any(token in text for token in ("install", "module", "dependency", "openpyxl", "请安装", "未安装")):
        return ERROR_CODE_DEPENDENCY_MISSING
    if any(token in text for token in ("missing required", "invalid", "unknown tool", "请提供", "非法")):
        return ERROR_CODE_INVALID_INPUT
    if any(token in text for token in ("not found", "no data", "unmatched", "未找到", "未匹配", "无数据")):
        return ERROR_CODE_NO_DATA
    if any(token in text for token in ("ambiguous", "multiple candidates", "needs selection", "多候选")):
        return ERROR_CODE_AMBIGUOUS_MATCH
    return ERROR_CODE_INVALID_INPUT


def normalize_error_codes(value: Any) -> Any:
    if isinstance(value, list):
        return [normalize_error_codes(item) for item in value]
    if not isinstance(value, dict):
        return value

    normalized = {key: normalize_error_codes(item) for key, item in value.items()}
    error = normalized.get("error")

    if normalized.get("success") is False and "error_code" not in normalized:
        normalized["error_code"] = infer_error_code(error)

    candidate_count = normalized.get("candidate_count")
    if normalized.get("unmatched") is True or normalized.get("found") is False:
        normalized.setdefault("error_code", ERROR_CODE_NO_DATA)
    elif normalized.get("needs_selection") is True and isinstance(candidate_count, int) and candidate_count > 1:
        normalized.setdefault("error_code", ERROR_CODE_AMBIGUOUS_MATCH)

    return normalized
