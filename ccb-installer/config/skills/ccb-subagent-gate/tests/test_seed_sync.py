#!/usr/bin/env python3
"""Guard: every paired agent L1 (staging/seed) must equal its source (packages/vertical/...).

Contract: WANd.AGENT.SEED.SYNC.001
Spec:     .trellis/spec/integration/agents-unified-model.md § Quotation multi-candidate

Why this exists (2026-07-19 regression):
- quotation-agent.md drifted: source 7/20 (31,219 B) vs staging 7/18 (23,989 B), -7,230 B
- Cause: 7/19 selection API refactor updated source but no one ran a build step
  to copy source -> staging. Other 4 paired agents (accurate / price-library /
  orchestrator / work-tasks) stayed in sync because they had no source edits.
- Result: ``deploy-seed-agents.ps1 -ForceMd`` shipped the stale 7/18 L1 to live
  installs, sub-agent produced forbidden "A 选项" replies because new GOOD/BAD
  contract (post-selection-API) was missing from the deployed L1.

This test scans ALL paired agents and fails on ANY drift, so future L1 edits
that update source but skip staging will fail CI before reaching a deploy.

Paired list is computed dynamically (every *.md that exists in BOTH sides);
no hardcoded list of 5 here.
"""
from __future__ import annotations

import hashlib
import sys
from pathlib import Path

# repo root = 5 levels up: tests/ -> ccb-subagent-gate/ -> skills/ -> config/ -> ccb-installer/ -> <repo>
ROOT = Path(__file__).resolve().parents[5]
SOURCE_DIR = ROOT / "ccb-installer" / "packages" / "vertical" / "com.wanding.trade" / "agents"
STAGING_DIR = ROOT / "ccb-installer" / "staging" / "seed" / "agents"


def _sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def paired_agents() -> list[tuple[Path, Path]]:
    """Return [(source, staging), ...] for every *.md that exists in BOTH dirs."""
    if not SOURCE_DIR.is_dir() or not STAGING_DIR.is_dir():
        return []
    pairs: list[tuple[Path, Path]] = []
    for src in sorted(SOURCE_DIR.glob("*.md")):
        dst = STAGING_DIR / src.name
        if dst.is_file():
            pairs.append((src, dst))
    return pairs


def test_source_dir_exists() -> None:
    assert SOURCE_DIR.is_dir(), f"missing source dir: {SOURCE_DIR}"


def test_staging_dir_exists() -> None:
    assert STAGING_DIR.is_dir(), f"missing staging dir: {STAGING_DIR}"


def test_at_least_one_paired_agent() -> None:
    pairs = paired_agents()
    assert pairs, (
        f"no paired agents found (source={SOURCE_DIR}, staging={STAGING_DIR})"
    )


def test_every_paired_agent_sha256_matches() -> None:
    """Per WANd.AGENT.SEED.SYNC.001: any drift fails the build."""
    pairs = paired_agents()
    failures: list[str] = []
    for src, dst in pairs:
        s_hash = _sha256(src)
        d_hash = _sha256(dst)
        if s_hash != d_hash:
            s_size = src.stat().st_size
            d_size = dst.stat().st_size
            failures.append(
                f"  {src.name}: src sha={s_hash[:12]} ({s_size}B) "
                f"!= dst sha={d_hash[:12]} ({d_size}B)  delta={s_size - d_size}B"
            )
    if failures:
        raise AssertionError(
            "L1 install seed drift detected (WANd.AGENT.SEED.SYNC.001):\n"
            + "\n".join(failures)
            + "\nFix: cp -f ccb-installer/packages/vertical/com.wanding.trade/agents/<name>.md"
            + "\n        ccb-installer/staging/seed/agents/<name>.md"
        )


def test_quotation_agent_specifically_synced() -> None:
    """Hard pin: the regression that motivated this guard must not reappear."""
    src = SOURCE_DIR / "quotation-agent.md"
    dst = STAGING_DIR / "quotation-agent.md"
    assert src.is_file() and dst.is_file(), "quotation-agent.md missing from one side"
    assert _sha256(src) == _sha256(dst), (
        f"quotation-agent.md drifted again: "
        f"src={_sha256(src)[:12]} dst={_sha256(dst)[:12]}"
    )


def test_quotation_agent_wires_relay_nudge_hook() -> None:
    """WANd.QUOTE.RELAY.GUARD.001: script alone is not enough — L1 must PostToolUse it.

    Gap found in 07-21 closeout review (2026-07-20): hook shipped but quotation-agent.md
    frontmatter never referenced it, so live sessions never ran the nudge.
    """
    needle = "post-quotation-relay-nudge.py"
    matcher = "mcp__quotation__select_quotation_candidates"
    for side, path in (
        ("source", SOURCE_DIR / "quotation-agent.md"),
        ("staging", STAGING_DIR / "quotation-agent.md"),
    ):
        text = path.read_text(encoding="utf-8")
        assert matcher in text, f"{side} L1 missing select matcher for relay nudge"
        assert needle in text, (
            f"{side} L1 missing PostToolUse → {needle} "
            "(WANd.QUOTE.RELAY.GUARD.001 wiring gap)"
        )


def main() -> int:
    """Allow running this as a script for CI pre-checks: ``python test_seed_sync.py``."""
    failures: list[str] = []
    pairs = paired_agents()
    if not pairs:
        print(f"FAIL: no paired agents (source={SOURCE_DIR}, staging={STAGING_DIR})", file=sys.stderr)
        return 1
    for src, dst in pairs:
        s_hash = _sha256(src)
        d_hash = _sha256(dst)
        if s_hash != d_hash:
            failures.append(f"  {src.name}: delta={src.stat().st_size - dst.stat().st_size}B")
        else:
            print(f"  OK  {src.name:30s}  sha={s_hash[:12]}  size={src.stat().st_size}B")
    if failures:
        print("\nDRIFT detected (WANd.AGENT.SEED.SYNC.001):", file=sys.stderr)
        for f in failures:
            print(f, file=sys.stderr)
        return 1
    print(f"\nAll {len(pairs)} paired agent L1 files in sync.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
