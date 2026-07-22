#!/usr/bin/env python3
"""Idle session precipitation worker — unified learning mainline (LLM + gates)."""
from __future__ import annotations

import argparse
import json
import os
import sys
import time
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(SCRIPT_DIR / "lib"))

from parse_transcript_precipitation import (  # noqa: E402
    find_transcript,
    iter_user_messages,
    merge_transcript_lines,
    user_acknowledged_idle,
)
from precipitation_excerpt import build_full_transcript_excerpt  # noqa: E402
from outbound_redaction import (  # noqa: E402
    OutboundDenied,
    OutboundRedactionFailed,
    prepare_outbound_bundle,
)
from precipitation_gates import bundle_to_proposals  # noqa: E402
from precipitation_paths import (  # noqa: E402
    business_knowledge_shadow,
    default_config_dir,
    log_path,
    profile_path,
    workflow_path,
)
from precipitation_store import (  # noqa: E402
    append_proposals,
    list_pending,
    run_already_processed,
    write_run_artifact,
    write_summary,
)
from precipitation_outcome import write_run_outcome  # noqa: E402
from precipitation_thinking_client import (  # noqa: E402
    build_user_prompt,
    call_precipitation_llm,
    load_api_settings,
    load_mock_bundle,
)


def _log(config_dir: Path, message: str) -> None:
    path = log_path(config_dir)
    path.parent.mkdir(parents=True, exist_ok=True)
    stamp = time.strftime("%Y-%m-%d %H:%M:%S")
    with path.open("a", encoding="utf-8", newline="\n") as handle:
        handle.write(f"[{stamp}] {message}\n")


def _load_kb_text(config_dir: Path) -> str:
    """Org API first (fresh read), shadow MD fallback — same contract as MCP Read."""
    try:
        repo_python = _repo_python_dir()
        if repo_python:
            sys.path.insert(0, str(repo_python))
            from admin.org_knowledge_client import load_doc_content  # noqa: E402

            text = load_doc_content(
                fallback_path=business_knowledge_shadow(config_dir),
                use_cache=False,
            )
            if text.strip():
                return text
    except Exception as exc:  # noqa: BLE001
        _log(config_dir, f"org KB read failed: {exc}; shadow fallback")
    return _read_text(business_knowledge_shadow(config_dir))


def _repo_python_dir() -> Path | None:
    override = (os.environ.get("CCB_PROJECT_ROOT") or "").strip()
    if override:
        candidate = Path(override) / "python"
        return candidate if candidate.is_dir() else None
    for parent in SCRIPT_DIR.parents:
        candidate = parent / "python"
        if candidate.is_dir() and (candidate / "admin" / "org_knowledge_client.py").is_file():
            return candidate
    return None


def _read_text(path: Path) -> str:
    if not path.is_file():
        return ""
    try:
        return path.read_text(encoding="utf-8", errors="replace")
    except OSError:
        return ""


def _extract_proposals_llm(
    *,
    config_dir: Path,
    lines: list[str],
    session_id: str,
    conversation_id: str,
    kb_text: str,
    workflow_text: str,
    profile_text: str,
    user_acknowledged: bool,
    user_msgs: list[str] | None = None,
) -> tuple[list[dict[str, object]], str]:
    mock = (os.environ.get("CCB_PRECIPITATION_MOCK") or "").strip()
    if mock:
        # Still enforce deny policy even for mock (no external send, but skip learning).
        from outbound_redaction import assert_outbound_allowed

        assert_outbound_allowed(config_dir, session_id, user_msgs)
        bundle = load_mock_bundle(mock)
        if bundle:
            return (
                bundle_to_proposals(
                    bundle,
                    session_id=session_id,
                    conversation_id=conversation_id,
                    kb_text=kb_text,
                    workflow_text=workflow_text,
                    user_acknowledged=user_acknowledged,
                ),
                "mock",
            )

    force_heuristic = (os.environ.get("CCB_PRECIPITATION_FORCE_HEURISTIC") or "").strip() in (
        "1",
        "true",
        "yes",
    )
    if force_heuristic:
        raise RuntimeError("heuristic disabled in production; unset CCB_PRECIPITATION_FORCE_HEURISTIC")

    base, token, model = load_api_settings(config_dir)
    excerpt = build_full_transcript_excerpt(lines)
    if not excerpt.strip():
        return [], "empty"

    # D7: session/tenant deny + fail-closed business-field redaction before LLM.
    outbound = prepare_outbound_bundle(
        config_dir=config_dir,
        session_id=session_id,
        transcript_excerpt=excerpt,
        business_kb_excerpt=kb_text[:4000],
        workflow_excerpt=workflow_text[:2000],
        profile_excerpt=profile_text[:1000],
        user_msgs=user_msgs,
    )
    prompt = build_user_prompt(
        transcript_excerpt=outbound["transcript_excerpt"],
        business_kb_excerpt=outbound["business_kb_excerpt"],
        workflow_excerpt=outbound["workflow_excerpt"],
        profile_excerpt=outbound["profile_excerpt"],
    )
    bundle = call_precipitation_llm(base_url=base, token=token, model=model, user_prompt=prompt)
    if not bundle:
        raise RuntimeError("empty LLM bundle")
    return (
        bundle_to_proposals(
            bundle,
            session_id=session_id,
            conversation_id=conversation_id,
            kb_text=kb_text,
            workflow_text=workflow_text,
            user_acknowledged=user_acknowledged,
        ),
        "llm",
    )


def main() -> int:
    parser = argparse.ArgumentParser(description="Session precipitation worker")
    parser.add_argument("--config-dir", default="")
    parser.add_argument("--session-id", default="")
    parser.add_argument("--conversation-id", default="")
    parser.add_argument("--run-id", default="")
    parser.add_argument("--agent-id", default="")
    parser.add_argument("--lease-id", default="")
    parser.add_argument("--review-through-turn-id", default="")
    args = parser.parse_args()

    config_dir = Path(args.config_dir) if args.config_dir else default_config_dir()
    session_id = args.session_id.strip()
    conversation_id = args.conversation_id.strip()
    run_id = args.run_id.strip()
    lease_id = args.lease_id.strip()
    review_through = args.review_through_turn_id.strip() or run_id

    def _outcome(
        kind: str,
        *,
        proposal_count: int = 0,
        error_code: str | None = None,
    ) -> None:
        if not run_id:
            return
        try:
            write_run_outcome(
                config_dir,
                run_id=run_id,
                session_id=session_id or "",
                conversation_id=conversation_id,
                lease_id=lease_id,
                review_through_turn_id=review_through,
                outcome=kind,
                proposal_count=proposal_count,
                error_code=error_code,
            )
        except Exception as exc:  # noqa: BLE001
            _log(config_dir, f"outcome write failed: {exc}")

    write_summary(
        config_dir,
        status="running",
        session_id=session_id,
        conversation_id=conversation_id,
    )

    if not session_id:
        write_summary(config_dir, status="skipped", skipped_reason="missing_session_id")
        _log(config_dir, "skip: missing session id")
        _outcome("permanent_skip", error_code="missing_session_id")
        return 0

    if not run_id:
        write_summary(config_dir, status="skipped", skipped_reason="missing_run_id")
        _log(config_dir, "skip: missing run id")
        return 0

    if run_already_processed(config_dir, session_id, run_id):
        write_summary(config_dir, status="skipped", skipped_reason="already_processed")
        _log(config_dir, f"skip: already processed session={session_id} run={run_id}")
        _outcome("no_proposals", error_code="already_processed")
        return 0

    transcript = find_transcript(session_id, None, config_dir=config_dir)
    if not transcript:
        write_summary(config_dir, status="skipped", skipped_reason="transcript_not_found")
        _log(config_dir, f"skip: transcript not found session={session_id}")
        _outcome("permanent_skip", error_code="transcript_not_found")
        return 0

    lines = merge_transcript_lines(transcript, session_id)
    user_msgs = iter_user_messages(lines)
    if len(user_msgs) < 1:
        write_summary(config_dir, status="skipped", skipped_reason="empty_transcript")
        _log(config_dir, f"skip: empty transcript session={session_id}")
        _outcome("permanent_skip", error_code="empty_transcript")
        return 0

    suppress_phrases = ("不要记录", "别学习", "不要学习", "不要沉淀", "别沉淀")
    if any(any(p in m for p in suppress_phrases) for m in user_msgs):
        write_summary(config_dir, status="skipped", skipped_reason="user_suppressed")
        _log(config_dir, f"skip: user suppressed session={session_id}")
        _outcome("permanent_skip", error_code="user_suppressed")
        return 0

    kb_text = _load_kb_text(config_dir)
    workflow_text = _read_text(workflow_path(config_dir))
    profile_text = _read_text(profile_path(config_dir))
    ack = user_acknowledged_idle(user_msgs)

    try:
        proposals, source = _extract_proposals_llm(
            config_dir=config_dir,
            lines=lines,
            session_id=session_id,
            conversation_id=conversation_id,
            kb_text=kb_text,
            workflow_text=workflow_text,
            profile_text=profile_text,
            user_acknowledged=ack,
            user_msgs=user_msgs,
        )
    except OutboundDenied as exc:
        reason = getattr(exc, "reason", None) or "outbound_denied"
        write_summary(config_dir, status="skipped", skipped_reason=reason)
        _log(config_dir, f"skip: outbound denied session={session_id} reason={reason}")
        _outcome("permanent_skip", error_code=reason)
        return 0
    except OutboundRedactionFailed as exc:
        reason = getattr(exc, "reason", None) or "outbound_redaction_failed"
        write_summary(config_dir, status="skipped", skipped_reason="outbound_redaction_failed")
        _log(config_dir, f"skip: outbound redaction failed session={session_id}: {exc}")
        _outcome("permanent_skip", error_code="outbound_redaction_failed")
        return 0
    except Exception as exc:  # noqa: BLE001
        _log(config_dir, f"precipitation LLM failed: {exc}; skip (no record)")
        write_summary(
            config_dir,
            status="error",
            session_id=session_id,
            conversation_id=conversation_id,
            error=str(exc)[:300],
        )
        _outcome("retryable_error", error_code="llm_failed")
        return 0

    if not proposals:
        write_summary(
            config_dir,
            status="skipped",
            skipped_reason="no_proposals",
            session_id=session_id,
            conversation_id=conversation_id,
        )
        _log(config_dir, f"skip: no proposals session={session_id} run={run_id}")
        _outcome("no_proposals")
        return 0

    bundle = {
        "sessionId": session_id,
        "conversationId": conversation_id,
        "runId": run_id,
        "transcriptPath": str(transcript),
        "extractionSource": source,
        "proposalCount": len(proposals),
        "proposals": proposals,
    }
    write_run_artifact(config_dir, session_id, bundle, run_id=run_id)
    added = append_proposals(config_dir, proposals)
    write_summary(
        config_dir,
        status="done",
        pending_count=len(list_pending(config_dir)),
        session_id=session_id,
        conversation_id=conversation_id,
    )
    _outcome("proposals", proposal_count=added)
    _log(config_dir, f"done session={session_id} run={run_id} source={source} proposals={added}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
