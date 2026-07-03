"""MCP JSON dispatch for price-library-server only."""
from __future__ import annotations

import logging
from typing import Any

from system.error_codes import (
    ERROR_CODE_PERMISSION_REQUIRED,
    ERROR_CODE_REVISION_CONFLICT,
    infer_error_code,
    normalize_error_codes,
)

logger = logging.getLogger(__name__)


def dispatch(tool: str, params: dict[str, Any]) -> Any:
    if tool == "get_price_library_active":
        from admin.org_price_admin_dispatch import handle_get_price_library_active

        return handle_get_price_library_active(params)

    if tool == "get_price_library_draft":
        from admin.org_price_admin_dispatch import handle_get_price_library_draft

        return handle_get_price_library_draft(params)

    if tool == "list_price_library_versions":
        from admin.org_price_admin_dispatch import handle_list_price_library_versions

        return handle_list_price_library_versions(params)

    if tool == "export_price_library":
        from admin.org_price_admin_dispatch import handle_export_price_library

        return handle_export_price_library(params)

    if tool == "upsert_price_library_item":
        from admin.org_price_admin_dispatch import handle_upsert_price_library_item

        return handle_upsert_price_library_item(params)

    if tool == "delete_price_library_item":
        from admin.org_price_admin_dispatch import handle_delete_price_library_item

        return handle_delete_price_library_item(params)

    if tool == "restore_price_library_item":
        from admin.org_price_admin_dispatch import handle_restore_price_library_item

        return handle_restore_price_library_item(params)

    if tool == "publish_price_library_draft":
        from admin.org_price_admin_dispatch import handle_publish_price_library_draft

        return handle_publish_price_library_draft(params)

    if tool == "preview_price_library_import":
        from admin.org_price_admin_dispatch import handle_preview_price_library_import

        return handle_preview_price_library_import(params)

    if tool == "apply_price_library_import":
        from admin.org_price_admin_dispatch import handle_apply_price_library_import

        return handle_apply_price_library_import(params)

    if tool == "revert_price_library_version":
        from admin.org_price_admin_dispatch import handle_revert_price_library_version

        return handle_revert_price_library_version(params)

    raise ValueError(f"Unknown tool: {tool}")


def handle_request(request: dict[str, Any]) -> dict[str, Any]:
    tool = str(request.get("tool", ""))
    params = request.get("params", {}) or {}
    logger.info("Price library dispatch: %s", tool)
    try:
        return {"success": True, "result": normalize_error_codes(dispatch(tool, params))}
    except ValueError as exc:
        return {"success": False, "error": str(exc), "error_code": infer_error_code(exc)}
    except Exception as exc:
        logger.exception("Price library tool dispatch failed")
        error_code = infer_error_code(exc)
        try:
            from admin.org_session import OrgHttpError, OrgVersionConflictError

            if isinstance(exc, OrgVersionConflictError):
                error_code = ERROR_CODE_REVISION_CONFLICT
            elif isinstance(exc, OrgHttpError) and exc.status_code == 403:
                error_code = ERROR_CODE_PERMISSION_REQUIRED
        except Exception:
            pass
        return {"success": False, "error": str(exc), "error_code": error_code}
