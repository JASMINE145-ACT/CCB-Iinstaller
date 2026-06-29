#!/usr/bin/env python3
"""PostToolUse hook: after get_product_price_tiers success, nudge tier table synthesis."""
from __future__ import annotations

import json
import os
import re
import sys
import time
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(SCRIPT_DIR / "lib"))
from match_selection_payload import unwrap_tool_payload  # noqa: E402

TIER_TOOL_NAME = "mcp__quotation__get_product_price_tiers"
DEDUPE_WINDOW_SEC = 45
DATA_MD_FALLBACK = r"D:\CCB-Wanding\vendor\wanding\data\data.Md"


def _log_dir() -> Path:
    base = os.environ.get("SUBAGENT_GATE_LOG_DIR") or os.environ.get("LOCALAPPDATA")
    if base:
        return Path(base) / "post-price-tiers-nudge"
    return Path.home() / ".claude" / "logs" / "post-price-tiers-nudge"


def _safe_session_id(session_id: str) -> str:
    cleaned = re.sub(r"[^A-Za-z0-9._-]+", "_", session_id.strip())
    return cleaned or "unknown"


def _should_emit_nudge(session_id: str) -> bool:
    if not session_id:
        return True
    flag_dir = _log_dir()
    flag_dir.mkdir(parents=True, exist_ok=True)
    flag_file = flag_dir / f"{_safe_session_id(session_id)}.flag"
    now = time.time()
    if flag_file.is_file():
        try:
            data = json.loads(flag_file.read_text(encoding="utf-8"))
            if now - float(data.get("ts", 0)) < DEDUPE_WINDOW_SEC:
                return False
        except (OSError, json.JSONDecodeError, TypeError, ValueError):
            pass
    flag_file.write_text(json.dumps({"ts": now}), encoding="utf-8")
    return True


def _payload_has_tiers(payload: dict[str, object]) -> bool:
    if payload.get("found") is False:
        return False
    tier_count = payload.get("tier_count")
    if isinstance(tier_count, int) and tier_count > 0:
        return True
    tiers = payload.get("tiers")
    return isinstance(tiers, list) and len(tiers) > 0


def main() -> int:
    try:
        hook_input = json.load(sys.stdin)
    except json.JSONDecodeError:
        return 0

    tool_name = str(hook_input.get("tool_name") or "")
    if tool_name != TIER_TOOL_NAME:
        return 0

    payload = unwrap_tool_payload(hook_input.get("tool_response"))
    if not payload or not _payload_has_tiers(payload):
        return 0

    session_id = str(hook_input.get("session_id") or "")
    if not _should_emit_nudge(session_id):
        return 0

    data_md_path = str(payload.get("data_md_path") or DATA_MD_FALLBACK).strip()
    code = str(payload.get("code") or payload.get("material_code") or "").strip()
    price_source = str(payload.get("price_source") or "").strip()
    price_stale = bool(payload.get("price_stale"))
    tier_count = payload.get("tier_count")

    context_lines = [
        "【硬约束 — 多档价格回复】",
        "get_product_price_tiers 已成功返回 tiers[]。",
        f"本轮必须先 Read 档位字段契约：{data_md_path}",
        "Read 后下一条 assistant 回复必须包含：",
        "  1) 产品编码、名称、product_type；",
        "  2) markdown 表格列出 tiers[] 的 label + price（+ profit_rate 若有）；",
        "  3) 用 data.Md §来源映射解释本产品各档含义（勿套全局 LESSO 口径）。",
        "禁止：",
        "  - 声称「你最后一条消息没有内容」或把空回复归咎于用户；",
        "  - 只有 tool_result 而无面向用户的价格表；",
        "  - 未 Read data.Md 就解释档位业务含义。",
    ]
    if code:
        context_lines.insert(3, f"物料编码：{code}。")
    if isinstance(tier_count, int):
        context_lines.insert(4, f"tier_count={tier_count}。")
    if price_source in ("bundled_seed", "lkg_snapshot") or price_stale:
        context_lines.append(
            f"数据来源 {price_source or 'unknown'}（stale={price_stale}）— 在表下注明离线/缓存来源，"
            "并提示 org 登录可获中心库 v2 全量。"
        )

    output = {
        "hookSpecificOutput": {
            "hookEventName": "PostToolUse",
            "additionalContext": "\n".join(context_lines),
        }
    }
    sys.stdout.write(json.dumps(output, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
