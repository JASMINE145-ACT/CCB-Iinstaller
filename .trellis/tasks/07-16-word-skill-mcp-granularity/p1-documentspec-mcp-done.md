# Phase 1 — DocumentSpec MCP pipeline (done)

> Date: 2026-07-16 · Route A

## Delivered

| Item | Path |
|------|------|
| Python package | `ccb-installer/lib/wand-document-spec/wand_document_spec/` |
| MCP registration | `word_document_server/main.py` + `mcp_register.py` |
| Install sync | `install-office-word-mcp.ps1` copies to site-packages |
| SOP | `ccb-installer/config/agents/word-creator.md` § DocumentSpec |
| Design | `research/documentspec-ast-design.md` |

## MCP tools added

- `validate_document_spec_tool` (Gate S)
- `render_document_spec_tool`
- `get_document_manifest_tool`
- `patch_block_by_id_tool`
- `validate_rendered_document_tool` (Gate R)
- `restore_document_backup_tool`

## Tests (GREEN)

```text
python -m unittest discover -s ccb-installer/lib/wand-document-spec/tests -v
Ran 4 tests — OK (0.390s)
```

## Remaining (Phase 2)

- `word-mcp-skill-boundary.md` (54-tool inventory)
- orchestrator delegate DocumentSpec template
- Guid smoke with call-count evidence
