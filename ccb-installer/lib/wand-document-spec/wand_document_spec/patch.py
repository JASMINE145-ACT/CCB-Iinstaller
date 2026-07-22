"""Micro patch — replace block content by block_id using manifest."""

from __future__ import annotations

import hashlib
import json
import os
from typing import Any

from docx import Document

from wand_document_spec.apply import ApplyEnvelope, prepare_mutate, record_apply
from wand_document_spec.gate_s import validate_document_spec
from wand_document_spec.models import parse_spec
from wand_document_spec.render import get_document_manifest, manifest_path_for


def _find_block_entry(manifest: dict[str, Any], block_id: str) -> dict[str, Any] | None:
    for entry in manifest.get("entries", []):
        if entry.get("block_id") == block_id:
            return entry
    return None


def _replace_paragraph_text(doc: Document, bookmark_name: str, new_text: str) -> bool:
    """Find paragraph containing bookmark and replace its text."""
    body = doc.element.body
    for p_el in body.iter("{http://schemas.openxmlformats.org/wordprocessingml/2006/main}p"):
        names = [
            el.get("{http://schemas.openxmlformats.org/wordprocessingml/2006/main}name")
            for el in p_el.iter("{http://schemas.openxmlformats.org/wordprocessingml/2006/main}bookmarkStart")
        ]
        if bookmark_name in names:
            # clear runs except bookmark markers
            for r in list(p_el.iter("{http://schemas.openxmlformats.org/wordprocessingml/2006/main}r")):
                for t in r.iter("{http://schemas.openxmlformats.org/wordprocessingml/2006/main}t"):
                    t.text = ""
            # set first text node or add run
            texts = list(p_el.iter("{http://schemas.openxmlformats.org/wordprocessingml/2006/main}t"))
            if texts:
                texts[0].text = new_text
            else:
                from docx.text.paragraph import Paragraph

                para = Paragraph(p_el, doc)
                para.add_run(new_text)
            return True
    return False


def patch_block_by_id(
    filename: str,
    block_id: str,
    block_payload: dict[str, Any],
    apply_envelope: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """
    Patch a single block by stable block_id.
    block_payload: {"type": "paragraph"|"heading", "text": "..."}
    """
    manifest = get_document_manifest(filename)
    if manifest.get("status") != "PASS":
        return manifest

    entry = _find_block_entry(manifest, block_id)
    if not entry:
        return {"status": "FAIL", "error": f"block_id not in manifest: {block_id}"}

    bname = entry.get("bookmark_name")
    if not bname:
        return {"status": "FAIL", "error": f"no bookmark for block_id: {block_id}"}

    block_type = block_payload.get("type")
    if block_type not in ("paragraph", "heading"):
        return {
            "status": "FAIL",
            "error": f"patch_block_by_id supports paragraph/heading only, got: {block_type}",
        }

    envelope = ApplyEnvelope.from_dict(apply_envelope)
    apply_id = envelope.apply_id if envelope else f"patch-{block_id}"

    # validate minimal payload via gate_s single-block spec
    mini_spec = {
        "spec_version": "1.0",
        "document_id": manifest.get("document_id", "patch"),
        "title": "patch",
        "sections": [
            {
                "section_id": "sec-patch",
                "level": 1,
                "title": "patch",
                "blocks": [{"block_id": block_id, **block_payload}],
            }
        ],
    }
    validate_document_spec(mini_spec)

    prepare_mutate(filename, envelope)

    doc = Document(filename)
    new_text = block_payload.get("text", "")
    if not _replace_paragraph_text(doc, bname, new_text):
        return {"status": "FAIL", "error": f"bookmark not found in docx: {bname}"}

    doc.save(filename)

    # update manifest entry hash
    import hashlib as _hl

    entry["content_hash"] = _hl.sha256(new_text.encode("utf-8")).hexdigest()[:16]
    mpath = manifest_path_for(filename)
    with open(mpath, encoding="utf-8") as f:
        data = json.load(f)
    for i, e in enumerate(data.get("entries", [])):
        if e.get("block_id") == block_id:
            data["entries"][i] = entry
            break
    with open(mpath, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

    result = {
        "status": "PASS",
        "block_id": block_id,
        "bookmark_name": bname,
        "filename": os.path.abspath(filename),
        "manifest_path": mpath,
    }
    record_apply(filename, apply_id, envelope, "PASS", result, mpath)
    return result
