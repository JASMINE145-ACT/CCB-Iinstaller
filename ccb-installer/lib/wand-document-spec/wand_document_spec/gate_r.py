"""Gate R — validate rendered DOCX against DocumentSpec and manifest."""

from __future__ import annotations

import json
import os
from typing import Any

from docx import Document

from wand_document_spec.gate_s import validate_document_spec
from wand_document_spec.models import parse_spec
from wand_document_spec.render import manifest_path_for


def validate_rendered_document(
    spec: dict[str, Any] | str,
    docx_path: str,
    manifest_path: str | None = None,
) -> dict[str, Any]:
    """
    Gate R — manifest alignment + outline headings + non-empty blocks.
    """
    raw = json.loads(spec) if isinstance(spec, str) else spec
    gate_s = validate_document_spec(raw)
    doc_spec = parse_spec(raw)

    if not os.path.isfile(docx_path):
        return {"status": "FAIL", "gate_s": gate_s, "error": f"docx not found: {docx_path}"}

    mpath = manifest_path or manifest_path_for(docx_path)
    if not os.path.isfile(mpath):
        return {"status": "FAIL", "gate_s": gate_s, "error": f"manifest not found: {mpath}"}

    with open(mpath, encoding="utf-8") as f:
        manifest = json.load(f)

    if manifest.get("document_id") != doc_spec.document_id:
        return {
            "status": "FAIL",
            "gate_s": gate_s,
            "error": f"document_id mismatch: manifest={manifest.get('document_id')} spec={doc_spec.document_id}",
        }

    missing_blocks: list[str] = []
    manifest_block_ids = {
        e["block_id"] for e in manifest.get("entries", []) if e.get("block_id")
    }
    for section in doc_spec.sections:
        for block in section.blocks:
            if block.block_id not in manifest_block_ids:
                missing_blocks.append(block.block_id)

    if missing_blocks:
        return {
            "status": "FAIL",
            "gate_s": gate_s,
            "error": "manifest missing block_ids",
            "missing_blocks": missing_blocks,
        }

    doc = Document(docx_path)
    full_text = "\n".join(p.text for p in doc.paragraphs)
    if not full_text.strip():
        return {"status": "FAIL", "gate_s": gate_s, "error": "docx is empty"}

    # outline: section titles must appear in document text
    missing_titles: list[str] = []
    for section in doc_spec.sections:
        if section.title not in full_text:
            missing_titles.append(section.title)

    if missing_titles:
        return {
            "status": "FAIL",
            "gate_s": gate_s,
            "error": "section titles missing from docx text",
            "missing_titles": missing_titles,
        }

    return {
        "status": "PASS",
        "gate_s": gate_s,
        "document_id": doc_spec.document_id,
        "docx_path": os.path.abspath(docx_path),
        "manifest_path": mpath,
        "block_count": gate_s["block_count"],
        "manifest_entries": len(manifest.get("entries", [])),
    }
