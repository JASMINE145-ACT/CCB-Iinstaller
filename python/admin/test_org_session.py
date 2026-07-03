"""Unit tests for admin.org_session."""
from __future__ import annotations

import os
import tempfile
import unittest
from pathlib import Path
from unittest import mock

from admin.org_session import (
    PROFILE_AIONUI,
    PROFILE_AIONUI_DEV,
    AuthFallbackPolicy,
    get_auth_candidates,
    resolve_auth_fallback_policy,
    resolve_org_profile,
)


class OrgSessionTests(unittest.TestCase):
    def test_resolve_org_profile_defaults_to_aionui(self) -> None:
        with mock.patch.dict(os.environ, {}, clear=True):
            self.assertEqual(resolve_org_profile(), PROFILE_AIONUI)

    def test_resolve_org_profile_from_env(self) -> None:
        with mock.patch.dict(os.environ, {"AIONUI_APPDATA_PROFILE": PROFILE_AIONUI_DEV}, clear=True):
            self.assertEqual(resolve_org_profile(), PROFILE_AIONUI_DEV)

    def test_strict_policy_when_profile_env_set(self) -> None:
        with mock.patch.dict(os.environ, {"AIONUI_APPDATA_PROFILE": PROFILE_AIONUI_DEV}, clear=True):
            self.assertEqual(resolve_auth_fallback_policy(), AuthFallbackPolicy.STRICT)

    def test_strict_profile_reads_only_that_token_file(self) -> None:
        with tempfile.TemporaryDirectory() as tmpdir:
            prod = Path(tmpdir) / PROFILE_AIONUI / "aionui"
            dev = Path(tmpdir) / PROFILE_AIONUI_DEV / "aionui"
            prod.mkdir(parents=True)
            dev.mkdir(parents=True)
            (prod / "org-session.token").write_text("prod-jwt", encoding="utf-8")
            (dev / "org-session.token").write_text("dev-jwt", encoding="utf-8")

            env = {
                "APPDATA": tmpdir,
                "AIONUI_APPDATA_PROFILE": PROFILE_AIONUI_DEV,
                "ORG_SESSION_TOKEN": "",
                "ORG_SESSION_TOKEN_FILE": "",
            }
            with mock.patch.dict(os.environ, env, clear=True):
                candidates = get_auth_candidates()

        self.assertEqual(len(candidates), 1)
        self.assertEqual(candidates[0].token, "dev-jwt")
        self.assertEqual(candidates[0].profile, PROFILE_AIONUI_DEV)

    def test_legacy_scan_returns_both_profiles_when_unset(self) -> None:
        with tempfile.TemporaryDirectory() as tmpdir:
            prod = Path(tmpdir) / PROFILE_AIONUI / "aionui"
            dev = Path(tmpdir) / PROFILE_AIONUI_DEV / "aionui"
            prod.mkdir(parents=True)
            dev.mkdir(parents=True)
            (prod / "org-session.token").write_text("prod-jwt", encoding="utf-8")
            (dev / "org-session.token").write_text("dev-jwt", encoding="utf-8")

            with mock.patch.dict(
                os.environ,
                {"APPDATA": tmpdir, "ORG_SESSION_TOKEN": "", "ORG_SESSION_TOKEN_FILE": ""},
                clear=True,
            ):
                candidates = get_auth_candidates()

        self.assertEqual([c.token for c in candidates], ["prod-jwt", "dev-jwt"])

    def test_org_session_token_env_is_single_strict_candidate(self) -> None:
        with mock.patch.dict(os.environ, {"ORG_SESSION_TOKEN": "explicit-jwt"}, clear=True):
            candidates = get_auth_candidates()
        self.assertEqual(len(candidates), 1)
        self.assertEqual(candidates[0].token, "explicit-jwt")
        self.assertEqual(candidates[0].source, "env:ORG_SESSION_TOKEN")


if __name__ == "__main__":
    unittest.main()
