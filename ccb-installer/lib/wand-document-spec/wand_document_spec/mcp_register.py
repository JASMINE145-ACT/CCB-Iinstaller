"""Register WANd DocumentSpec tools on FastMCP instance."""

from __future__ import annotations

import json
from typing import Any

from mcp.types import ToolAnnotations


def register_wand_document_spec_tools(mcp: Any) -> None:
    """Attach DocumentSpec tools to an existing FastMCP server."""

    @mcp.tool(
        annotations=ToolAnnotations(
            title="Validate DocumentSpec (Gate S)",
            readOnlyHint=True,
        ),
    )
    def validate_document_spec_tool(spec: str) -> str:
        """Validate DocumentSpec JSON structure before render. spec is JSON string."""
        from wand_document_spec.gate_s import validate_document_spec

        try:
            raw = json.loads(spec)
            result = validate_document_spec(raw)
            return json.dumps(result, ensure_ascii=False)
        except Exception as e:
            return json.dumps({"status": "FAIL", "error": str(e)}, ensure_ascii=False)

    @mcp.tool(
        annotations=ToolAnnotations(
            title="Render DocumentSpec to DOCX",
            destructiveHint=True,
        ),
    )
    def render_document_spec_tool(
        spec: str,
        filename: str,
        apply_envelope: str | None = None,
    ) -> str:
        """Render DocumentSpec to DOCX with manifest and bookmarks. apply_envelope is optional JSON."""
        from wand_document_spec.render import render_document_spec

        try:
            envelope = json.loads(apply_envelope) if apply_envelope else None
            result = render_document_spec(spec, filename, envelope)
            return json.dumps(result, ensure_ascii=False)
        except Exception as e:
            return json.dumps({"status": "FAIL", "error": str(e)}, ensure_ascii=False)

    @mcp.tool(
        annotations=ToolAnnotations(
            title="Get document manifest",
            readOnlyHint=True,
        ),
    )
    def get_document_manifest_tool(filename: str) -> str:
        """Read render manifest for a DOCX produced by render_document_spec."""
        from wand_document_spec.render import get_document_manifest

        return json.dumps(get_document_manifest(filename), ensure_ascii=False)

    @mcp.tool(
        annotations=ToolAnnotations(
            title="Patch block by ID",
            destructiveHint=True,
        ),
    )
    def patch_block_by_id_tool(
        filename: str,
        block_id: str,
        block_payload: str,
        apply_envelope: str | None = None,
    ) -> str:
        """Patch one block by stable block_id. block_payload is JSON {type, text}."""
        from wand_document_spec.patch import patch_block_by_id

        try:
            payload = json.loads(block_payload)
            envelope = json.loads(apply_envelope) if apply_envelope else None
            result = patch_block_by_id(filename, block_id, payload, envelope)
            return json.dumps(result, ensure_ascii=False)
        except Exception as e:
            return json.dumps({"status": "FAIL", "error": str(e)}, ensure_ascii=False)

    @mcp.tool(
        annotations=ToolAnnotations(
            title="Validate rendered document (Gate R)",
            readOnlyHint=True,
        ),
    )
    def validate_rendered_document_tool(
        spec: str,
        filename: str,
        manifest_path: str | None = None,
    ) -> str:
        """Gate R — validate DOCX + manifest against DocumentSpec."""
        from wand_document_spec.gate_r import validate_rendered_document

        try:
            raw = json.loads(spec)
            result = validate_rendered_document(raw, filename, manifest_path)
            return json.dumps(result, ensure_ascii=False)
        except Exception as e:
            return json.dumps({"status": "FAIL", "error": str(e)}, ensure_ascii=False)

    @mcp.tool(
        annotations=ToolAnnotations(
            title="Restore document backup",
            destructiveHint=True,
        ),
    )
    def restore_document_backup_tool(filename: str, apply_id: str) -> str:
        """Restore DOCX from .bak.<apply_id> backup."""
        from wand_document_spec.apply import restore_document_backup

        return json.dumps(restore_document_backup(filename, apply_id), ensure_ascii=False)
