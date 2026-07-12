# -*- coding: utf-8 -*-
"""
Bootstrap Org supplier directory + logistics vehicles from HTML seed.

Requires running aioncore with JWT + CSRF (same pattern as quotation-mapping bootstrap).

Env:
  ORG_CENTER_URL   default http://127.0.0.1:13401
  ORG_USERNAME / ORG_PASSWORD  (must be on SUPPLIER_DIR_ADMIN_USERNAMES)
  SUPPLIER_HTML    optional path to index.html

Usage:
  python scripts/org-phase0/bootstrap-supplier-directory.py
"""
from __future__ import annotations

import json
import os
import sys
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(Path(__file__).resolve().parent))

from supplier_directory_parse import (  # noqa: E402
    default_html_path,
    load_html,
    parse_suppliers_from_html,
    parse_vehicles_from_html,
)


def env(name: str, default: str = "") -> str:
    return os.environ.get(name, default).strip()


def http_json(method: str, url: str, token: str | None, body: dict | None, csrf: str | None, cookie: str | None):
    data = None if body is None else json.dumps(body).encode("utf-8")
    req = urllib.request.Request(url, data=data, method=method)
    req.add_header("Content-Type", "application/json")
    if token:
        req.add_header("Authorization", f"Bearer {token}")
    if csrf:
        req.add_header("x-csrf-token", csrf)
    if cookie:
        req.add_header("Cookie", cookie)
    with urllib.request.urlopen(req, timeout=60) as resp:
        raw = resp.read().decode("utf-8")
        return json.loads(raw) if raw else {}


def main() -> int:
    base = env("ORG_CENTER_URL", "http://127.0.0.1:13401").rstrip("/")
    user = env("ORG_USERNAME", "admin")
    password = env("ORG_PASSWORD")
    if not password:
        print("ORG_PASSWORD required", file=sys.stderr)
        return 2

    html_path = Path(env("SUPPLIER_HTML") or str(default_html_path()))
    html = load_html(html_path)
    suppliers = parse_suppliers_from_html(html)
    vehicles = parse_vehicles_from_html(html)
    print(f"parsed suppliers={len(suppliers)} vehicles={len(vehicles)} from {html_path}")

    # CSRF cookie bootstrap
    cj_status = urllib.request.Request(f"{base}/api/auth/status")
    with urllib.request.urlopen(cj_status, timeout=30) as resp:
        cookies = resp.headers.get_all("Set-Cookie") or []
    cookie_header = "; ".join(c.split(";", 1)[0] for c in cookies)
    csrf = ""
    for part in cookie_header.split("; "):
        if part.startswith("aionui-csrf-token="):
            csrf = part.split("=", 1)[1]
            break

    login = http_json(
        "POST",
        f"{base}/login",
        None,
        {"username": user, "password": password},
        csrf or None,
        cookie_header or None,
    )
    token = (
        login.get("token")
        or (login.get("data") or {}).get("token")
        or (login.get("user") or {}).get("token")
    )
    if not token:
        # some builds return token at top after success envelope
        print("login response keys:", list(login.keys()), file=sys.stderr)
        print(json.dumps(login, ensure_ascii=False)[:500], file=sys.stderr)
        return 3

    # refresh CSRF after login if needed
    if not csrf:
        st = urllib.request.Request(
            f"{base}/api/auth/status",
            headers={"Authorization": f"Bearer {token}"},
        )
        with urllib.request.urlopen(st, timeout=30) as resp:
            cookies = resp.headers.get_all("Set-Cookie") or []
        cookie_header = "; ".join(c.split(";", 1)[0] for c in cookies)
        for part in cookie_header.split("; "):
            if part.startswith("aionui-csrf-token="):
                csrf = part.split("=", 1)[1]

    inserted = updated = skipped = 0
    for s in suppliers:
        payload = {k: v for k, v in s.items() if k not in ("products_summary", "name_key")}
        try:
            res = http_json(
                "POST",
                f"{base}/api/suppliers",
                token,
                payload,
                csrf,
                cookie_header,
            )
            data = res.get("data") or res
            action = data.get("action") or ""
            if action == "inserted":
                inserted += 1
            elif action == "updated":
                updated += 1
            elif action == "skipped_preserved_edit":
                skipped += 1
        except urllib.error.HTTPError as e:
            print(f"supplier {s['name_zh']} HTTP {e.code}: {e.read()[:200]}", file=sys.stderr)
            return 4

    v_ins = v_upd = v_skip = 0
    for v in vehicles:
        try:
            res = http_json(
                "POST",
                f"{base}/api/logistics-vehicles",
                token,
                v,
                csrf,
                cookie_header,
            )
            data = res.get("data") or res
            action = data.get("action") or ""
            if action == "inserted":
                v_ins += 1
            elif action == "updated":
                v_upd += 1
            elif action == "skipped_preserved_edit":
                v_skip += 1
        except urllib.error.HTTPError as e:
            print(f"vehicle {v['seed_key']} HTTP {e.code}: {e.read()[:200]}", file=sys.stderr)
            return 5

    listed = http_json("GET", f"{base}/api/suppliers", token, None, None, None)
    items = (listed.get("data") or listed).get("items") or []
    vlisted = http_json("GET", f"{base}/api/logistics-vehicles", token, None, None, None)
    vitems = (vlisted.get("data") or vlisted).get("items") or []

    print(
        f"suppliers insert={inserted} update={updated} skip={skipped} GET_total={len(items)}"
    )
    print(f"vehicles insert={v_ins} update={v_upd} skip={v_skip} GET_total={len(vitems)}")
    if len(items) < 27 or len(vitems) < 10:
        return 6
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
