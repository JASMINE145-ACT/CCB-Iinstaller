"""DocumentSpec data model and parsing."""

from __future__ import annotations

import json
import re
from dataclasses import dataclass, field
from typing import Any

SPEC_VERSION = "1.0"
SECTION_ID_RE = re.compile(r"^sec-[a-z0-9][a-z0-9-]*$")
BLOCK_ID_RE = re.compile(r"^blk-[a-z0-9][a-z0-9-]*$")
APPLY_ID_RE = re.compile(r"^[A-Za-z0-9_-]{1,64}$")
PLACEHOLDER_RE = re.compile(
    r"(\$[a-zA-Z_][a-zA-Z0-9_]*\$|\{\{[^}]+\}\}|<TODO>|lorem ipsum|xxxx)",
    re.IGNORECASE,
)

BLOCK_TYPES = frozenset({"paragraph", "heading", "table", "page_break", "list"})


@dataclass
class Block:
    block_id: str
    type: str
    text: str | None = None
    level: int | None = None
    headers: list[str] | None = None
    rows: list[list[str]] | None = None
    items: list[str] | None = None
    ordered: bool = False

    @classmethod
    def from_dict(cls, raw: dict[str, Any]) -> Block:
        return cls(
            block_id=raw["block_id"],
            type=raw["type"],
            text=raw.get("text"),
            level=raw.get("level"),
            headers=raw.get("headers"),
            rows=raw.get("rows"),
            items=raw.get("items"),
            ordered=bool(raw.get("ordered", False)),
        )


@dataclass
class Section:
    section_id: str
    level: int
    title: str
    blocks: list[Block] = field(default_factory=list)

    @classmethod
    def from_dict(cls, raw: dict[str, Any]) -> Section:
        blocks = [Block.from_dict(b) for b in raw.get("blocks", [])]
        return cls(
            section_id=raw["section_id"],
            level=int(raw["level"]),
            title=raw["title"],
            blocks=blocks,
        )


@dataclass
class DocumentSpec:
    spec_version: str
    document_id: str
    title: str
    sections: list[Section] = field(default_factory=list)

    @classmethod
    def from_dict(cls, raw: dict[str, Any]) -> DocumentSpec:
        sections = [Section.from_dict(s) for s in raw.get("sections", [])]
        return cls(
            spec_version=raw.get("spec_version", SPEC_VERSION),
            document_id=raw["document_id"],
            title=raw["title"],
            sections=sections,
        )

    @classmethod
    def load(cls, path: str) -> DocumentSpec:
        with open(path, encoding="utf-8") as f:
            return cls.from_dict(json.load(f))

    def to_dict(self) -> dict[str, Any]:
        return {
            "spec_version": self.spec_version,
            "document_id": self.document_id,
            "title": self.title,
            "sections": [
                {
                    "section_id": s.section_id,
                    "level": s.level,
                    "title": s.title,
                    "blocks": [_block_to_dict(b) for b in s.blocks],
                }
                for s in self.sections
            ],
        }


def _block_to_dict(block: Block) -> dict[str, Any]:
    out: dict[str, Any] = {"block_id": block.block_id, "type": block.type}
    if block.text is not None:
        out["text"] = block.text
    if block.level is not None:
        out["level"] = block.level
    if block.headers is not None:
        out["headers"] = block.headers
    if block.rows is not None:
        out["rows"] = block.rows
    if block.items is not None:
        out["items"] = block.items
    if block.ordered:
        out["ordered"] = True
    return out


def parse_spec(spec: dict[str, Any] | str) -> DocumentSpec:
    if isinstance(spec, str):
        return DocumentSpec.from_dict(json.loads(spec))
    return DocumentSpec.from_dict(spec)
