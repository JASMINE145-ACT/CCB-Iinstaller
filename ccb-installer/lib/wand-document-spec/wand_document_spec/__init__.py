"""WANd DocumentSpec — structured compose/render/validate for office-word MCP."""

from wand_document_spec.gate_s import validate_document_spec
from wand_document_spec.gate_r import validate_rendered_document
from wand_document_spec.render import render_document_spec
from wand_document_spec.patch import patch_block_by_id
from wand_document_spec.apply import restore_document_backup

__all__ = [
    "validate_document_spec",
    "validate_rendered_document",
    "render_document_spec",
    "patch_block_by_id",
    "restore_document_backup",
]
