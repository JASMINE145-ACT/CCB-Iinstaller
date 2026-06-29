"""Unit tests for admin.org_http_csrf."""
from __future__ import annotations

import http.cookiejar
import unittest
from http.cookiejar import Cookie

from admin.org_http_csrf import ORG_CSRF_COOKIE_NAME, ORG_CSRF_STATUS_PATH, bootstrap_org_csrf


def _set_csrf_cookie(jar: http.cookiejar.CookieJar, value: str) -> None:
    jar.set_cookie(
        Cookie(
            version=0,
            name=ORG_CSRF_COOKIE_NAME,
            value=value,
            port=None,
            port_specified=False,
            domain="127.0.0.1",
            domain_specified=True,
            domain_initial_dot=False,
            path="/",
            path_specified=True,
            secure=False,
            expires=None,
            discard=True,
            comment=None,
            comment_url=None,
            rest={},
            rfc2109=False,
        )
    )


class OrgHttpCsrfTests(unittest.TestCase):
    def test_bootstrap_org_csrf_reads_cookie_from_status_response(self) -> None:
        jar = http.cookiejar.CookieJar()
        seen_urls: list[str] = []

        class FakeResp:
            def __enter__(self):
                return self

            def __exit__(self, *args):
                return False

            def read(self):
                return b"{}"

        class FakeOpener:
            def open(self, req, timeout=15):
                seen_urls.append(req.full_url)
                _set_csrf_cookie(jar, "abc123")
                return FakeResp()

        token = bootstrap_org_csrf(
            "http://127.0.0.1:13401",
            jar,
            opener_factory=lambda _: FakeOpener(),  # type: ignore[return-value]
        )
        self.assertEqual(token, "abc123")
        self.assertEqual(len(seen_urls), 1)
        self.assertTrue(seen_urls[0].endswith(ORG_CSRF_STATUS_PATH))

    def test_bootstrap_org_csrf_raises_when_cookie_missing(self) -> None:
        jar = http.cookiejar.CookieJar()

        class FakeResp:
            def __enter__(self):
                return self

            def __exit__(self, *args):
                return False

            def read(self):
                return b"{}"

        class FakeOpener:
            def open(self, req, timeout=15):
                return FakeResp()

        with self.assertRaisesRegex(RuntimeError, ORG_CSRF_COOKIE_NAME):
            bootstrap_org_csrf(
                "http://127.0.0.1:13401",
                jar,
                opener_factory=lambda _: FakeOpener(),  # type: ignore[return-value]
            )


if __name__ == "__main__":
    unittest.main()
