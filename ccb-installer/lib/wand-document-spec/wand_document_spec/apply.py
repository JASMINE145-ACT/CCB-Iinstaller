"""Apply envelope — backup, idempotency, run reports."""

from __future__ import annotations

import hashlib
import json
import os
import shutil
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any


@dataclass
class ApplyEnvelope:
    apply_id: str
    document_id: str
    mode: str = "upsert"
    spec_hash: str | None = None
    backup_before: bool = True

    @classmethod
    def from_dict(cls, raw: dict[str, Any] | None) -> ApplyEnvelope | None:
        if not raw:
            return None
        apply_id = raw["apply_id"]
        from wand_document_spec.models import APPLY_ID_RE

        if not APPLY_ID_RE.match(str(apply_id)):
            raise ValueError("apply_id must match ^[A-Za-z0-9_-]{1,64}$")
        return cls(
            apply_id=apply_id,
            document_id=raw["document_id"],
            mode=raw.get("mode", "upsert"),
            spec_hash=raw.get("spec_hash"),
            backup_before=bool(raw.get("backup_before", True)),
        )


def spec_hash(spec: dict[str, Any]) -> str:
    payload = json.dumps(spec, sort_keys=True, ensure_ascii=False)
    return "sha256:" + hashlib.sha256(payload.encode("utf-8")).hexdigest()


def _apply_dir(docx_path: str) -> str:
    base = os.path.dirname(os.path.abspath(docx_path))
    d = os.path.join(base, ".wand-apply")
    os.makedirs(d, exist_ok=True)
    return d


def _apply_record_path(docx_path: str, apply_id: str) -> str:
    return os.path.join(_apply_dir(docx_path), f"{apply_id}.json")


def backup_document(docx_path: str, apply_id: str) -> str | None:
    if not os.path.isfile(docx_path):
        return None
    bak = f"{docx_path}.bak.{apply_id}"
    shutil.copy2(docx_path, bak)
    return bak


def restore_document_backup(docx_path: str, apply_id: str) -> dict[str, Any]:
    bak = f"{docx_path}.bak.{apply_id}"
    if not os.path.isfile(bak):
        return {"status": "FAIL", "error": f"backup not found: {bak}"}
    shutil.copy2(bak, docx_path)
    return {"status": "PASS", "restored_from": bak, "docx_path": docx_path}


def check_idempotent(docx_path: str, apply_id: str, result_hash: str) -> dict[str, Any] | None:
    """If same apply_id already succeeded with same result, return cached result."""
    rec_path = _apply_record_path(docx_path, apply_id)
    if not os.path.isfile(rec_path):
        return None
    with open(rec_path, encoding="utf-8") as f:
        rec = json.load(f)
    if rec.get("status") == "PASS" and rec.get("result_hash") == result_hash:
        return rec
    return None


def record_apply(
    docx_path: str,
    apply_id: str,
    envelope: ApplyEnvelope | None,
    status: str,
    result: dict[str, Any],
    manifest_path: str | None = None,
) -> str:
    result_hash = hashlib.sha256(
        json.dumps(result, sort_keys=True, ensure_ascii=False).encode("utf-8")
    ).hexdigest()
    report = {
        "apply_id": apply_id,
        "document_id": envelope.document_id if envelope else None,
        "status": status,
        "result_hash": result_hash,
        "manifest_path": manifest_path,
        "docx_path": docx_path,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "result": result,
    }
    rec_path = _apply_record_path(docx_path, apply_id)
    with open(rec_path, "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2, ensure_ascii=False)
    run_report_path = os.path.join(_apply_dir(docx_path), "run-report.json")
    with open(run_report_path, "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2, ensure_ascii=False)
    return run_report_path


def prepare_mutate(docx_path: str, envelope: ApplyEnvelope | None) -> str | None:
    if envelope and envelope.backup_before and os.path.isfile(docx_path):
        return backup_document(docx_path, envelope.apply_id)
    return None
