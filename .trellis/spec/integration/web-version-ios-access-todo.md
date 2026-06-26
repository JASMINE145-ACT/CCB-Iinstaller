# WanD Web Version / iOS Access Todo

> Status: Todo / rollout planning. Captured 2026-06-24 while packaging WanD 1.1.1.
> Scope: give an iOS employee browser access without interrupting the Windows installer release.

---

## 1. Scope / Trigger

Trigger:

- WanD 1.1.1 is being packaged as a Windows installer.
- One employee uses iOS, so a Windows `.exe` is not a suitable direct client.
- Two options were considered: build an iOS package, or provide a Web version.

Decision:

- Do **not** build a native iOS installer for this case.
- First pursue **AionUI built-in WebUI / PWA access** from a Windows host running CCB-Wanding.
- Treat the existing `ccb-wanding-web/` Vite app as a demo/prototype until a matching backend contract exists.

Why:

- Native iOS distribution needs Apple signing, TestFlight / enterprise deployment, and a separate release loop.
- AionCore already has WebUI auth, cookie/JWT, static WebUI/PWA resources, and default port `25808`.
- The current business runtime still depends on the four-layer local chain and local business MCP/data.

---

## 2. Current Assets

| Asset | Status | Notes |
|-------|--------|-------|
| AionCore WebUI | Exists | Default port `25808`; supports browser access, auth cookie/JWT, QR token endpoints. |
| PWA resources | Exists in packaged resources | `manifest.webmanifest` and `sw.js` are present under staged AionUI resources. |
| Unified org SSO | Exists for fleet pack `>=1.0.7` | One org JWT can seed local user through SSO/JIT. |
| Org knowledge center | Exists | Center aioncore at `:13401` handles org users and Markdown knowledge. |
| Business MCP runtime | Mostly local today | Quotation / Accurate / Excel / price data still run from employee install / local host. |
| `ccb-wanding-web/` | Prototype only | Uses `/api/sessions` and `/ws` -> `localhost:3000`; not the AionCore conversation/WebUI contract. |

---

## 3. Recommended MVP: WebUI From a Windows Host

Goal:

- Let the iOS employee use Safari/Chrome to access WanD through a browser.
- Avoid new native app distribution.
- Keep 1.1.1 Windows packaging as the main release path.

Runtime shape:

```text
iOS browser
  -> http://<windows-host-or-tailscale-ip>:25808
  -> AionCore WebUI on Windows host
  -> local aioncore conversation APIs
  -> route-b
  -> CCB-Wanding --acp
  -> local quotation / accurate / office MCP as configured on that Windows host
```

MVP assumptions:

- One designated Windows machine is always on when the iOS employee needs access.
- That machine has the full CCB-Wanding install and working MCP health.
- iOS user is allowed to use the host machine's local MCP/data context.
- Same-LAN or Tailscale access is preferred; do not expose raw `25808` publicly without a reverse proxy and auth review.

---

## 4. Todo Checklist

### P0 - 1.1.1 Release Safe Path

- [ ] Finish packaging CCB-Wanding 1.1.1 as the normal Windows installer.
- [ ] Install 1.1.1 on a designated Windows host.
- [ ] Start only through `ccb-launch-aionui.cmd` / desktop launcher, not raw `AionUi.exe`, so bootstrap/env are loaded.
- [ ] Run install health and MCP health on the host:

```powershell
.\ccb-installer\scripts\test-install-health.ps1 -InstallDir "$env:LOCALAPPDATA\Programs\CCB-Wanding"
.\ccb-installer\scripts\test-mcp-health.ps1 -Probe -Session
```

### P1 - WebUI Access Trial

- [ ] Enable AionUI WebUI on the Windows host.
- [ ] Prefer Tailscale for cross-network access; use LAN IP only when both devices are on the same trusted network.
- [ ] Verify browser login from iOS.
- [ ] Verify the iOS user can create a new conversation.
- [ ] Verify quotation agent response streams correctly.
- [ ] Verify required MCP tools work from browser-triggered sessions.
- [ ] Verify file upload/download behavior on iOS Safari.
- [ ] Verify idle/reconnect behavior by sending a second message after several minutes.

### P2 - Hardening If Used Beyond One Employee

- [ ] Decide whether the Windows host is a shared service account or a named employee account.
- [ ] Document who owns the host machine, updates, restarts, and credentials.
- [ ] Add HTTPS / reverse proxy only after auth and cookie behavior are reviewed.
- [ ] Add a WebUI smoke checklist to the 1.1.x release runbook if this becomes supported.
- [ ] Decide whether chat transcripts from iOS usage being stored on the host are acceptable.

### P3 - Real Web Product Track (Deferred)

- [ ] Do not promote `ccb-wanding-web/` until it is wired to AionCore/CCB contracts or a new backend is specified.
- [ ] Define a first-class Web API contract if building a separate Web app.
- [ ] Move business MCP and credentials toward center serviceization before browser-only users become common.
- [ ] Align with `platform-vertical-packages.md`: WanD should become `com.wanding.trade`, not a one-off hardcoded Web fork.

---

## 5. Validation & Error Matrix

| Condition | Expected result | Fix |
|-----------|-----------------|-----|
| iOS cannot reach `:25808` | Browser connection fails | Check WebUI enabled, firewall, LAN/Tailscale route, host awake. |
| Login works but chat fails | Conversation/API/ACP path issue | Check local aioncore logs, route-b sync, CCB-Wanding MCP health on host. |
| MCP missing in WebUI session | Backend config not loaded | Start via CCB launcher; verify `%LOCALAPPDATA%\CCB-Wanding\.claude\settings.json`. |
| File upload/download broken on iOS | Browser/mobile file handling gap | Test Safari behavior; keep desktop fallback documented. |
| `ccb-wanding-web/` starts but no backend responds | Prototype backend missing | Do not use for rollout; use AionCore WebUI path. |
| Public internet exposure requested | Security risk | Require HTTPS/reverse proxy/auth review; prefer Tailscale for MVP. |

---

## 6. Good / Base / Bad Cases

Good:

- Windows host runs full WanD install.
- iOS accesses through Tailscale.
- Login, chat, quotation MCP, and file flows pass.
- 1.1.1 Windows packaging remains unchanged.

Base:

- Same-LAN iOS access to `http://<LAN_IP>:25808`.
- One user, trusted network, manual host restart/update acceptable.

Bad:

- Shipping native iOS app for one employee.
- Opening `25808` directly to the public internet.
- Treating `ccb-wanding-web/` as production without its backend/API contract.
- Assuming iOS browser can replace local Office/Excel/file MCP capabilities.

---

## 7. Tests Required

Before calling the WebUI path usable for the iOS employee:

- Install health: `test-install-health.ps1` passes on the Windows host.
- MCP health: `test-mcp-health.ps1 -Probe -Session` passes.
- Browser smoke on iOS:
  - login succeeds,
  - new conversation creates,
  - quotation agent answers,
  - MCP tool call appears and completes,
  - upload/download behavior is understood,
  - reconnect/idle second message works.
- Network smoke:
  - LAN path if same WiFi,
  - Tailscale path if remote.

---

## 8. Wrong vs Correct

| Wrong | Correct |
|-------|---------|
| Build an iOS package first for one employee | Use WebUI/PWA access from a working Windows host first. |
| Stop 1.1.1 packaging to build a new Web app | Ship 1.1.1 Windows installer, then trial WebUI as a separate rollout check. |
| Use `ccb-wanding-web/` as if it is production | Treat it as prototype until its backend contract is implemented. |
| Expose `http://host:25808` publicly | Use Tailscale for MVP; add reverse proxy/HTTPS only after review. |
| Expect browser-only users to run local MCP | Keep MCP on the host for MVP; plan center MCP for real browser-first users. |

---

## Related Specs

- [`wanding-first-ship.md`](./wanding-first-ship.md) - Windows installer packaging and release path.
- [`wanding-mvp-v1.md`](./wanding-mvp-v1.md) - MVP ship contract and employee rollout.
- [`aionui-ccb-boundary.md`](./aionui-ccb-boundary.md) - four-layer runtime chain.
- [`org-knowledge.md`](./org-knowledge.md) - local vs org aioncore and auth boundary.
- [`unified-org-sso-rollout.md`](./unified-org-sso-rollout.md) - fleet SSO/JIT contract.
- [`platform-vertical-packages.md`](./platform-vertical-packages.md) - long-term WanD package/platform direction.
