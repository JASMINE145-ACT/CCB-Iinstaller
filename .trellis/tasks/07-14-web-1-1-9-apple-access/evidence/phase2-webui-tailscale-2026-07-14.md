# Phase 2 note — WebUI on · Tailscale blocked (2026-07-14)

## WebUI (PASS on host)

| Item | Evidence |
|------|----------|
| Enable WebUI | ON · status Running（用户截图） |
| Allow remote | ON |
| Listen | `0.0.0.0:25809` (PID owning process present) |
| Local smoke | `http://127.0.0.1:25809/` → **HTTP 200** |
| Username | `admin` |
| UI shown URL | `http://198.18.0.1:25809` — **do not use for Apple** |

### Why not `198.18.0.1`

`198.18.0.0/15` is commonly a virtual/meta interface (Clash / some VPN stacks). From host:

- `198.18.0.1:25809` → timeout
- Real LAN: `192.168.2.2` (WLAN)
- Correct remote URL will be `http://<Tailscale-100.x-or-MagicDNS>:25809` after Tailscale is Connected

Port is **25809** (not default 25808) — record in runbook.

## Tailscale (BLOCKED)

User browser flow:

1. Connect `jasmine` → tailnet **`umich.edu`** as `jiacheny@umich.edu`
2. Result: **Logged in, but device not connected** — needs **tailnet admin approval** for device `jasmine`

CLI on host at check time: still `NeedsLogin` / no 100.x IP (session may differ from browser tray app).

### Implications for company Apple users

- `umich.edu` managed tailnet is a **bad default** for WanD employee rollout unless everyone is on that tailnet and IT will approve `jasmine` + each Apple device.
- Prefer: personal Tailscale tailnet you admin, or a company-owned Tailscale — approve devices yourself; invite Apple users as shared users.

## Next actions (human)

1. Either get **umich.edu admin** to Approve device `jasmine`, **or** sign out and create/login a **self-owned** Tailscale account (recommended for MVP).
2. When `tailscale status` shows Connected + `100.x`, copy that IP / MagicDNS into runbook as the only shareable URL: `http://<ts>:25809`
3. Local browser check from another device on same Tailscale → login `admin`
4. Then Mac + iPhone smoke matrices
