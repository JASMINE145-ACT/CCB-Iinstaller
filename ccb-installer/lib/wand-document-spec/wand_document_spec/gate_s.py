"""Gate S — structural validation of DocumentSpec JSON."""

from __future__ import annotations

import json
from typing import Any

from wand_document_spec.models import (
    BLOCK_ID_RE,
    BLOCK_TYPES,
    PLACEHOLDER_RE,
    SECTION_ID_RE,
    SPEC_VERSION,
    DocumentSpec,
    parse_spec,
)


class ValidationError(Exception):
    def __init__(self, message: str, path: str = "") -> None:
        self.path = path
        super().__init__(f"{path}: {message}" if path else message)


def validate_document_spec(spec: dict[str, Any] | str) -> dict[str, Any]:
    """
    Gate S — validate DocumentSpec structure.

    Returns {"status": "PASS", "document_id": ..., "section_count": ..., "block_count": ...}
    Raises ValidationError on failure.
    """
    raw = json.loads(spec) if isinstance(spec, str) else spec
    _validate_root(raw)
    doc = parse_spec(raw)
    section_ids: set[str] = set()
    block_ids: set[str] = set()
    block_count = 0

    for si, section in enumerate(doc.sections):
        sp = f"sections[{si}]"
        if section.section_id in section_ids:
            raise ValidationError("duplicate section_id", sp)
        section_ids.add(section.section_id)
        if not SECTION_ID_RE.match(section.section_id):
            raise ValidationError("section_id must match sec-*", sp)
        if section.level < 1 or section.level > 3:
            raise ValidationError("level must be 1-3", sp)
        if not section.title.strip():
            raise ValidationError("title required", sp)
        _check_placeholders(section.title, f"{sp}.title")

        for bi, block in enumerate(section.blocks):
            bp = f"{sp}.blocks[{bi}]"
            if block.block_id in block_ids:
                raise ValidationError("duplicate block_id", bp)
            block_ids.add(block.block_id)
            block_count += 1
            if not BLOCK_ID_RE.match(block.block_id):
                raise ValidationError("block_id must match blk-*", bp)
            if block.type not in BLOCK_TYPES:
                raise ValidationError(f"type must be one of {sorted(BLOCK_TYPES)}", bp)
            _validate_block(block, bp)

    return {
        "status": "PASS",
        "document_id": doc.document_id,
        "title": doc.title,
        "section_count": len(doc.sections),
        "block_count": block_count,
    }


def _validate_root(raw: dict[str, Any]) -> None:
    for key in ("document_id", "title", "sections"):
        if key not in raw:
            raise ValidationError(f"missing required field '{key}'", key)
    version = raw.get("spec_version", SPEC_VERSION)
    if version != SPEC_VERSION:
        raise ValidationError(f"unsupported spec_version '{version}'", "spec_version")
    if not isinstance(raw["sections"], list):
        raise ValidationError("sections must be array", "sections")


def _validate_block(block: Any, path: str) -> None:
    if block.type == "paragraph":
        if not block.text or not str(block.text).strip():
            raise ValidationError("paragraph requires non-empty text", path)
        _check_placeholders(block.text, f"{path}.text")
    elif block.type == "heading":
        if not block.text or not str(block.text).strip():
            raise ValidationError("heading requires text", path)
        level = block.level or 2
        if level < 1 or level > 3:
            raise ValidationError("heading level must be 1-3", path)
        _check_placeholders(block.text, f"{path}.text")
    elif block.type == "table":
        if not block.headers or not block.rows:
            raise ValidationError("table requires headers and rows", path)
        width = len(block.headers)
        if width == 0:
            raise ValidationError("table headers must be non-empty", path)
        for ri, row in enumerate(block.rows):
            if len(row) != width:
                raise ValidationError(
                    f"row {ri} width {len(row)} != header width {width}",
                    f"{path}.rows[{ri}]",
                )
            for ci, cell in enumerate(row):
                _check_placeholders(str(cell), f"{path}.rows[{ri}][{ci}]")
    elif block.type == "list":
        if not block.items:
            raise ValidationError("list requires items", path)
        for ii, item in enumerate(block.items):
            _check_placeholders(item, f"{path}.items[{ii}]")
    elif block.type == "page_break":
        pass


def _check_placeholders(text: str, path: str) -> None:
    if PLACEHOLDER_RE.search(text):
        raise ValidationError("placeholder token not allowed in finished content", path)
