"""One-off: verify org JWT against JWT_SECRET from env.local."""
from __future__ import annotations

import json
import os
import sys
import urllib.request

import jwt

ENV_LOCAL = os.path.join(os.path.dirname(__file__), "env.local")


def load_env_local() -> dict[str, str]:
    out: dict[str, str] = {}
    with open(ENV_LOCAL, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            k, v = line.split("=", 1)
            out[k.strip()] = v.strip()
    return out


def main() -> int:
    env = load_env_local()
    org_url = env["ORG_CENTER_URL"].rstrip("/")
    secret = env["JWT_SECRET"]
    body = json.dumps({"username": env["EMPLOYEE_USERNAME"], "password": env["EMPLOYEE_PASSWORD"]}).encode()
    req = urllib.request.Request(
        f"{org_url}/login",
        data=body,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=20) as resp:
        data = json.loads(resp.read())
    token = data.get("token") or data.get("data", {}).get("token")
    if not token:
        print("FAIL: no token in org login response")
        return 1
    try:
        jwt.decode(
            token,
            secret,
            algorithms=["HS256"],
            issuer="aionui",
            audience="aionui-webui",
        )
        print("CRYPTO PASS: env.local JWT_SECRET validates org-issued token")
        print(f"  secret len={len(secret)} first8={secret[:8]}...")
        return 0
    except jwt.InvalidSignatureError:
        print("CRYPTO FAIL: org token NOT signed with env.local JWT_SECRET")
        print("  => VPS /etc/aionorg/env still wrong OR aionorg not restarted / env not loaded")
        print(f"  env.local secret len={len(secret)} first8={secret[:8]}...")
        return 1
    except Exception as e:
        print(f"CRYPTO FAIL: {e}")
        return 1


if __name__ == "__main__":
    sys.exit(main())
