# 从报价名称中抽取「报价产品规」用于与第二张图格式对齐（询价规格型号 / 报价产品规 分开）

from __future__ import annotations

import json
import logging
import re
from typing import Any, List, Optional

logger = logging.getLogger(__name__)

# 批量 LLM 行数上限，超过则跳过 LLM 仅用规则
EXTRACT_SPECS_BATCH_MAX_ROWS = 50

# 常见规格模式：DN200、(8")、4M/根、Φ25、PVC-U排水、(管径) 等
_QUOTE_SPEC_PATTERNS = [
    re.compile(r"DN\s*\d+\s*(?:\(\s*\d+\s*[\"']?\s*\))?", re.I),
    re.compile(r"\(\s*\d+\s*[\"']\s*\)"),  # (8") (6")
    re.compile(r"\d+\s*[\"']\s*(?:寸|英寸)?"),
    re.compile(r"\d+\s*[mM]\s*/\s*根"),
    re.compile(r"Φ\s*\d+", re.I),
    re.compile(r"\d+\s*/\s*\d+"),
    re.compile(r"\d+\s*[xX×]\s*\d+"),
    re.compile(r"\d+\s*\*\s*\d+(?:\.\d+)?"),
    # 括号内中文规格：(管径)、(排水)、（带检查口）、(管箍) 等
    re.compile(r"[（(][^）)\s]{1,20}[）)]"),
    # 材质/系列：PVC-U、PVC-UH、PVC-U排水、PPR、PE 等
    re.compile(r"PVC-?U(?:H|排水|给水)?", re.I),
    re.compile(r"PPR(?:\s*给水)?", re.I),
    re.compile(r"PE(?:\s*管)?", re.I),
    # 名称末尾或括号旁单数字规格（如 直通50、(管径) 后的 50）
    re.compile(r"(?<=[通径管\s])\d{2,4}(?=[\s/]|$)", re.I),
    # 末尾 dn/DN+数字（如 白色 dn50）、单独尾数
    re.compile(r"(?:^|[\s])dn\s*\d+(?=[\s/]|$)", re.I),
    re.compile(r"(?:^|[\s])\d{2,4}(?=[\s/]|$)"),
]


def _normalize_dn_spec(digits: str) -> str:
    return f"dn{digits}"


def _last_resort_quote_spec(quote_name: str) -> str:
    """规则未命中时，用名称末尾像规格的片段兜底（如最后一截含数字/dn）。"""
    s = (quote_name or "").strip()
    if not s or len(s) < 2:
        return ""
    tokens = [t for t in s.replace("(", " ").replace(")", " ").split() if t]
    if not tokens:
        return ""
    last = tokens[-1]
    if re.search(r"\d", last) or re.search(r"dn|Φ|mm|cm|m/", last, re.I):
        return last[:100]
    if len(tokens) >= 2:
        prev = tokens[-2]
        if re.search(r"\d", prev) or re.search(r"dn|Φ", prev, re.I):
            return f"{prev} {last}"[:100]
    return ""


def extract_spec_from_quote_name(quote_name: str) -> str:
    """
    从报价名称（长描述）中抽取规格部分，用于单独显示「报价产品规」列。
    优先输出口径类短规格（如 dn50），避免把 (管箍)、PVC-U 等品类片段拼进规格列。
    """
    s = (quote_name or "").strip()
    if not s:
        return ""

    dn_match = re.search(r"\bdn\s*(\d+)\b", s, re.I)
    if dn_match:
        return _normalize_dn_spec(dn_match.group(1))

    dn_upper = re.search(r"\bDN\s*(\d+)\b", s)
    if dn_upper:
        return _normalize_dn_spec(dn_upper.group(1))

    phi_match = re.search(r"Φ\s*(\d+)", s, re.I)
    if phi_match:
        return f"Φ{phi_match.group(1)}"

    length_root = re.search(r"(\d+)\s*[mM]\s*/\s*根", s)
    if length_root:
        return f"{length_root.group(1)}M/根"

    inch_paren = re.search(r"\(\s*(\d+)\s*[\"']\s*\)", s)
    if inch_paren:
        return f'{inch_paren.group(1)}"'

    # 中文配件名后的裸数字口径（如 直通50、三通50）
    bare_after_fitting = re.search(
        r"(?:直接|直通|三通|弯头|管箍|异径|补芯|活接)[^\d]{0,30}(\d{2,4})\b",
        s,
    )
    if bare_after_fitting:
        return _normalize_dn_spec(bare_after_fitting.group(1))

    return _last_resort_quote_spec(quote_name)


_FILL_SPEC_LLM_SYSTEM = """你为 WanD 报价单提取「报价规格」列（Excel I 列），与印尼名称/品牌/单位分列填写。

规则：
- 只输出口径/型号短文本，优先小写 dn+数字（如 dn50、dn110）。
- 也可输出 DN200、Φ25、4M/根、8" 等纯规格；不要输出产品类型、材质系列、中文括号内容（如 管箍、PVC-U排水、配件）。
- 若询价规格已是正确口径（如 dn50、50），可原样规范化后输出。
- 参考中文报价名称 matched_name 与英文 description_english 中的 DN/dn 信息。
- 只输出规格文本一行，无规格则输出空字符串。"""


def _normalize_spec_text(text: str) -> str:
    s = (text or "").strip()
    if not s:
        return ""
    m = re.search(r"\bdn\s*(\d+)\b", s, re.I)
    if m:
        return _normalize_dn_spec(m.group(1))
    return s[:200]


def extract_spec_from_quote_name_llm(
    quote_name: str,
    *,
    inquiry_spec: str = "",
    description_english: str = "",
    api_key: Optional[str] = None,
    base_url: Optional[str] = None,
    model: Optional[str] = None,
) -> str:
    """
    LLM 提取报价规格（服务端补全，与 agent 语义提取同一口径）。
    失败或无 API key 时退回规则 extract_spec_from_quote_name。
    """
    rule_result = extract_spec_from_quote_name(quote_name)
    inquiry_spec = (inquiry_spec or "").strip()
    if inquiry_spec and not re.search(r"[\u4e00-\u9fff]", inquiry_spec):
        normalized_inquiry = _normalize_spec_text(inquiry_spec)
        if normalized_inquiry:
            return normalized_inquiry

    try:
        from backend.config import Config
        _api_key = api_key or getattr(Config, "OPENAI_API_KEY", None)
        _base_url = base_url or getattr(Config, "OPENAI_BASE_URL", None) or ""
        _model = model or getattr(Config, "LLM_MODEL", "glm-4.5-air")
        use_llm = getattr(Config, "QUOTATION_SPEC_LLM", True)
    except Exception:
        return rule_result
    if not use_llm or not _api_key or len((quote_name or "").strip()) < 2:
        return rule_result

    user_lines = [
        f"中文报价名称: {quote_name.strip()}",
    ]
    if description_english.strip():
        user_lines.append(f"英文描述 description_english: {description_english.strip()}")
    if inquiry_spec.strip():
        user_lines.append(f"询价规格: {inquiry_spec.strip()}")

    try:
        from backend.core.llm_client import get_openai_client

        client = get_openai_client(api_key=_api_key, base_url=_base_url)
        resp = client.chat.completions.create(
            model=_model,
            messages=[
                {"role": "system", "content": _FILL_SPEC_LLM_SYSTEM},
                {"role": "user", "content": "\n".join(user_lines)},
            ],
            max_tokens=40,
            temperature=0,
        )
        content = (resp.choices[0].message.content or "").strip()
        if content:
            return _normalize_spec_text(content)
    except Exception as e:
        logger.debug("extract_spec_from_quote_name_llm 失败: %s，使用规则结果", e)
    return rule_result


EXTRACT_SPECS_BATCH_SYSTEM = """你为报价单表格做规格提取。输入是若干行，每行有「询价名称」「当前询价规格」「报价名称」。
对每一行输出两个字段：
- requested_spec：询价规格。若当前询价规格已有且正确则规范化为 dn+数字等小写口径（如 50 → dn50），无则空字符串。
- quoted_spec：仅从「报价名称」抽取的报价规格列文本，优先 dn50 这种口径，不要输出 PVC-U、管箍、配件等品类词。

只输出一个 JSON 数组，与输入行一一对应，不要其他说明。每项格式：{"requested_spec":"...","quoted_spec":"..."}
示例：[{"requested_spec":"dn50","quoted_spec":"dn50"},{"requested_spec":"dn20","quoted_spec":"dn20"}]"""


def _parse_batch_specs_json(raw: str) -> List[dict]:
    raw = (raw or "").strip()
    if "```" in raw:
        for part in re.split(r"```\w*\s*", raw):
            part = part.strip()
            if part.startswith("["):
                try:
                    return json.loads(part)
                except json.JSONDecodeError:
                    continue
    if raw.startswith("["):
        try:
            return json.loads(raw)
        except json.JSONDecodeError as e:
            logger.warning("extract_specs_batch_llm JSON 解析失败: %s", e)
    return []


def extract_specs_batch_llm(
    rows: List[dict],
    *,
    api_key: Optional[str] = None,
    base_url: Optional[str] = None,
    model: Optional[str] = None,
) -> List[dict]:
    """
    一次批量 LLM 调用，为每行产出 requested_spec 与 quoted_spec。
    入参 rows 每项至少含 product_name, specification, quote_name。
    返回与 rows 等长的 list，每项 {"requested_spec": str, "quoted_spec": str}；失败或超行数时返回空列表。
    """
    if not rows or len(rows) > EXTRACT_SPECS_BATCH_MAX_ROWS:
        logger.debug(f"Skipping LLM spec extraction: rows={len(rows) if rows else 0}, max={EXTRACT_SPECS_BATCH_MAX_ROWS}")
        return []
    try:
        from backend.config import Config
        if not getattr(Config, "QUOTATION_SPEC_LLM", True):
            logger.info("QUOTATION_SPEC_LLM is False, skipping LLM extraction")
            return []
        _api_key = api_key or getattr(Config, "OPENAI_API_KEY", None)
        _base_url = base_url or getattr(Config, "OPENAI_BASE_URL", None) or ""
        _model = model or getattr(Config, "LLM_MODEL", "glm-4.5-air")
        logger.info(f"LLM spec extraction: model={_model}, api_key={'***' if _api_key else 'None'}")
    except Exception:
        return []
    if not _api_key:
        logger.warning("No API key for LLM spec extraction")
        return []
    # 构建紧凑输入：每行一行文本，便于模型按行输出
    lines_text = []
    for i, r in enumerate(rows):
        name = (r.get("product_name") or "").strip() or "-"
        spec = (r.get("specification") or "").strip() or "-"
        quote = (r.get("quote_name") or "").strip() or "-"
        lines_text.append(f"{i + 1}. 询价名称:{name} 当前询价规格:{spec} 报价名称:{quote}")
    user_content = "请为以下每行输出 requested_spec 和 quoted_spec（JSON 数组）：\n" + "\n".join(lines_text)
    try:
        from backend.core.llm_client import get_openai_client
        client = get_openai_client(api_key=_api_key, base_url=_base_url)
        resp = client.chat.completions.create(
            model=_model,
            messages=[
                {"role": "system", "content": EXTRACT_SPECS_BATCH_SYSTEM},
                {"role": "user", "content": user_content},
            ],
            max_tokens=min(2048, 80 * len(rows) + 200),
            temperature=0,
        )
        content = (resp.choices[0].message.content or "").strip()
        logger.info(f"LLM spec extraction response length: {len(content)}")
        parsed = _parse_batch_specs_json(content)
        if len(parsed) != len(rows):
            logger.warning("extract_specs_batch_llm 返回条数 %s 与输入 %s 不一致", len(parsed), len(rows))
            logger.debug(f"LLM response: {content[:500]}")
            return []
        out = []
        for i, p in enumerate(parsed):
            if not isinstance(p, dict):
                out.append({"requested_spec": "", "quoted_spec": ""})
                continue
            req = (p.get("requested_spec") or "").strip()[:500]
            quo = (p.get("quoted_spec") or "").strip()[:500]
            out.append({"requested_spec": req, "quoted_spec": quo})
        return out
    except Exception as e:
        logger.warning("extract_specs_batch_llm 调用失败: %s", e, exc_info=True)
        return []
