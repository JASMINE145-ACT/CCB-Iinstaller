"""Org Mutate helpers for business knowledge — locator, budget, near-dup, RBAC."""
from __future__ import annotations

import hashlib
import os
import re
import uuid
from dataclasses import dataclass
from difflib import SequenceMatcher
from typing import Any

BLOCK_META_RE = re.compile(
    r"<!--\s*org_mutate_block\s+id=(?P<id>[^\s]+)\s+hash=(?P<hash>[a-f0-9]+)\s*-->",
    re.IGNORECASE,
)

MAX_RULE_CHARS = 16_000
SOFT_RULE_CHARS = 8_000
NEAR_DUP_THRESHOLD = 0.88
TEST_SLUG = "wanding_business_knowledge_test"
DEFAULT_SLUG = "wanding_business_knowledge"


def normalize_rule_text(text: str) -> str:
    return re.sub(r"\s+", "", (text or "").lower())


def content_hash(text: str) -> str:
    return hashlib.sha256(normalize_rule_text(text).encode("utf-8")).hexdigest()


ORG_KNOWLEDGE_WRITE_CAP = "org_knowledge.write"

DELETE_FORBIDDEN_ZH = (
    "删除未落库（FORBIDDEN）：当前会话无权对生产知识库执行 MCP 删除。"
    "请使用管理员账号（is_admin）、具备 org_knowledge.write、"
    "设置 ORG_KNOWLEDGE_MCP_DELETE=1，或改用测试 slug wanding_business_knowledge_test；"
    "也可在 #/org-knowledge 界面编辑/还原。"
)


def session_role_allows_knowledge_delete(
    *,
    is_admin: bool = False,
    capabilities: list[str] | tuple[str, ...] | None = None,
) -> bool:
    """True when caller role/capability matches DELETE.001 product gate."""
    if is_admin:
        return True
    caps = capabilities or ()
    return ORG_KNOWLEDGE_WRITE_CAP in caps


def can_apply_knowledge_delete(
    slug: str,
    *,
    is_admin: bool = False,
    capabilities: list[str] | tuple[str, ...] | None = None,
) -> bool:
    """Apply gate — preview always allowed; apply needs test slug / flag / admin role."""
    s = (slug or DEFAULT_SLUG).strip()
    if s == TEST_SLUG or s.endswith("_test"):
        return True
    if os.environ.get("ORG_KNOWLEDGE_MCP_DELETE", "").strip().lower() in ("1", "true", "yes"):
        return True
    if os.environ.get("ORG_KNOWLEDGE_DELETE_IS_ADMIN", "").strip().lower() in ("1", "true", "yes"):
        return True
    return session_role_allows_knowledge_delete(is_admin=is_admin, capabilities=capabilities)


@dataclass
class RuleBlock:
    block_id: str | None
    content_hash: str
    text: str
    start: int
    end: int
    section: str | None = None


def _is_rule_bullet(line: str) -> bool:
    s = line.strip()
    if not s.startswith("- "):
        return False
    body = s[2:].strip()
    if body.startswith("来源：") or body.startswith("来源:") or body.startswith("说明：") or body.startswith("说明:"):
        return False
    return True


def iter_rule_blocks(content: str) -> list[RuleBlock]:
    text = content or ""
    lines = text.splitlines(keepends=True)
    offsets: list[int] = []
    pos = 0
    for line in lines:
        offsets.append(pos)
        pos += len(line)

    blocks: list[RuleBlock] = []
    current_section: str | None = None
    i = 0
    n = len(lines)
    while i < n:
        stripped = lines[i].strip()
        if stripped.startswith("## "):
            current_section = stripped[3:].strip()
            i += 1
            continue

        start_idx = i
        meta_id: str | None = None
        meta_hash: str | None = None
        if BLOCK_META_RE.search(stripped):
            m = BLOCK_META_RE.search(stripped)
            assert m is not None
            if i + 1 < n and _is_rule_bullet(lines[i + 1]):
                meta_id = m.group("id")
                meta_hash = m.group("hash")
                i += 1
            else:
                i += 1
                continue

        if not _is_rule_bullet(lines[i]):
            i += 1
            continue

        j = i + 1
        while j < n and (lines[j].startswith("  ") or lines[j].startswith("\t")):
            j += 1

        start = offsets[start_idx]
        end = offsets[j - 1] + len(lines[j - 1])
        block_text = text[start:end]
        h = meta_hash or content_hash(block_text)
        blocks.append(
            RuleBlock(
                block_id=meta_id,
                content_hash=h,
                text=block_text,
                start=start,
                end=end,
                section=current_section,
            )
        )
        i = j
    return blocks


def find_blocks(
    content: str,
    *,
    block_id: str | None = None,
    content_hash_value: str | None = None,
    snippet: str | None = None,
) -> list[RuleBlock]:
    blocks = iter_rule_blocks(content)
    if block_id:
        return [b for b in blocks if b.block_id == block_id]
    matches = list(blocks)
    if content_hash_value:
        matches = [b for b in matches if b.content_hash == content_hash_value]
    if snippet and snippet.strip():
        sn = snippet.strip()
        matches = [b for b in matches if sn in b.text]
    return matches


def near_duplicate_matches(
    rule_text: str,
    content: str,
    *,
    threshold: float = NEAR_DUP_THRESHOLD,
) -> list[dict[str, Any]]:
    norm_new = normalize_rule_text(rule_text)
    if len(norm_new) < 6:
        return []
    out: list[dict[str, Any]] = []
    for block in iter_rule_blocks(content):
        first = ""
        for line in block.text.splitlines():
            if _is_rule_bullet(line):
                first = line.strip()[2:].strip()
                break
        ratio = SequenceMatcher(None, norm_new, normalize_rule_text(first)).ratio()
        if ratio >= threshold:
            out.append(
                {
                    "existing_hash": block.content_hash,
                    "block_id": block.block_id,
                    "similarity": round(ratio, 3),
                    "snippet": first[:200],
                }
            )
    return out


def stamp_appended_block(rule: str, *, reason: str | None, today: str) -> tuple[str, str, str]:
    block_id = uuid.uuid4().hex[:12]
    body_lines = [
        f"- {rule}",
        f"  - 来源：报价专家会话确认，{today}",
    ]
    if reason and reason.strip():
        body_lines.append(f"  - 说明：{reason.strip()}")
    body = "\n".join(body_lines) + "\n"
    h = content_hash(body)
    chunk = f"<!-- org_mutate_block id={block_id} hash={h} -->\n{body}"
    return chunk, block_id, h


def remove_block(content: str, block: RuleBlock) -> str:
    return (content[: block.start] + content[block.end :]).rstrip() + "\n"


def check_rule_budget(rule_text: str) -> str | None:
    if len(rule_text or "") > MAX_RULE_CHARS:
        return "LIMIT_EXCEEDED"
    return None
