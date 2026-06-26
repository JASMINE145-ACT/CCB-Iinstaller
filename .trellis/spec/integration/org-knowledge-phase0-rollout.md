# Org Knowledge — Phase 0 Rollout (Login Linkage)

> **Status:** Verified 2026-06-19 on VPS `67.216.206.3:13401` + AionUI dev login linkage (`aionui-src` Phase 0).
>
> **Scope:** Phase 0 only — **not** full SSO (`openspec/changes/unified-org-sso/`). Employees still have **two JWTs** (local + org); org login runs **silently** after local login succeeds.
>
> **Parent:** [`org-knowledge.md`](./org-knowledge.md) · **Deploy bible:** [`docs/org-knowledge-deploy.md`](../../docs/org-knowledge-deploy.md)

---

## 0. Reproducibility (start here)

**Scripts (repo):** [`scripts/org-phase0/README.md`](../../scripts/org-phase0/README.md) · **VPS 建号手册：** [`scripts/org-phase0/vps-create-employee-runbook.md`](../../scripts/org-phase0/vps-create-employee-runbook.md)

| Goal | Command |
|------|---------|
| Copy secrets template | `cp scripts/org-phase0/env.example scripts/org-phase0/env.local` → fill admin + employee creds (**gitignored**) |
| VPS smoke | `source env.local && bash scripts/org-phase0/vps-smoke.sh` |
| VPS create employee | Upload `env.local` → VPS `/root/org-phase0.env`, then `source /root/org-phase0.env && bash vps-create-employee.sh` |
| Windows verify | `.\scripts\org-phase0\verify-desktop.ps1 -Dev` |
| Dev login test (no bypass) | `.\scripts\org-phase0\start-aionui-dev-org-test.ps1` |
| Fresh VPS | `scripts/deploy-org-aioncore-vps.ps1` + `scripts/vps-org-aioncore-bootstrap.sh` (now promotes admin→manager after seed) |

**Secrets storage:** Admin/employee passwords live **only** in gitignored files — **never** in this spec or any tracked doc.

| Location | Purpose |
|----------|---------|
| `scripts/org-phase0/env.local` | Dev machine (copy from `env.example`; **gitignored**) |
| VPS `/root/org-phase0.env` | SSH ops (`chmod 600`); upload via `scp -P 39222 scripts/org-phase0/env.local root@67.216.206.3:/root/org-phase0.env` |
| Password manager | Team backup |

Bootstrap `reset-password` output should also be saved in password manager. **Do not commit** `env.local` or `/root/org-phase0.env`.

**Acceptance:** After employee login → `org-session.token` non-empty → **shadow md synced** (`wanding_business_knowledge.md` + `.org-meta.json`); Agent Read same path shows center content.

---

## 1. What Phase 0 solves

| Problem | Phase 0 fix |
|---------|-------------|
| MCP reads `vendor/.../wanding_business_knowledge.md` | After org login: **shadow sync** from org API → local md (Agent Read path unchanged); Python internal may log `[KNOWLEDGE_SOURCE] Org API` |
| User must open「组织知识库」and log in again | One login form; linkage is automatic when `org-server.json` is set |
| Full SSO (one token, shared `JWT_SECRET`, JIT) | **Out of scope** — see `unified-org-sso` OpenSpec |

### Runtime flow (employee desktop)

```text
AionUI login (local aioncore /login)  →  success
  → loginWithOrgLinkage()  →  POST {ORG_SERVER_URL}/login  (same username/password)
       ├─ success → sessionStorage aionui-org-session-token + disk org-session.token
       │            → await shadow sync → local wanding_business_knowledge.md + .org-meta.json
       │            → orgKnowledgeLinked only if shadowSyncOk
       └─ failure → Message.warning (chat still works; MCP file fallback)
```

**Code (aionui-src):**

| File | Role |
|------|------|
| `packages/desktop/src/common/auth/orgAuthLogin.ts` | `performOrgLogin`, `loginWithOrgLinkage` |
| `packages/desktop/src/renderer/hooks/context/AuthContext.tsx` | Calls linkage after local login when `isOrgServerConfigured()` |
| `packages/desktop/src/common/auth/orgKnowledgeShadowSync.ts` | Post-login org doc → IPC shadow write |
| `packages/desktop/src/process/utils/wandingBusinessKnowledgePath.ts` | Resolve shadow md path |
| `packages/desktop/src/process/bridge/orgServerBridge.ts` | IPC `org-auth-write-token`, `org-knowledge-sync-shadow` |

---

## 2. Prerequisites

| Side | Requirement |
|------|-------------|
| **Center VPS** | `aionorg.service` active; `--cors-any`; **no** `--local`; port **13401** |
| **Knowledge seed** | `GET /api/org-knowledge` returns **8** slugs (see parent spec) |
| **Firewall** | Employee public IP allowed to `13401` (or VPN) |
| **Employee PC** | `org-server.json` with center URL; **full app restart** after edit |
| **Credentials** | Org user **username + password identical to local AionUI login** |
| **Dev** | Do **not** use `AIONUI_BYPASS_AUTH=1` when testing linkage (skips login) |

**Production center (2026-06-19):**

| Item | Value |
|------|--------|
| Host | `67.216.206.3` |
| Org API | `http://67.216.206.3:13401` |
| SSH | `ssh -p 39222 root@67.216.206.3` |
| Data dir | `/opt/aionorg/data-org/` |
| DB | `/opt/aionorg/data-org/aionui-backend.db` |
| Logs | `/opt/aionorg/logs/aioncore.log` |
| systemd | `aionorg.service` |

---

## 3. Center VPS — correct path (verified)

### 3.1 Health check

```bash
systemctl status aionorg --no-pager
curl -s http://127.0.0.1:13401/api/auth/status
tail -n 30 /opt/aionorg/logs/aioncore.log
```

Expect: service **active**; `needs_setup: false` after admin password set.

### 3.2 Admin login (get manager token)

`/login` is **CSRF-exempt**. Use admin credentials from initial bootstrap (`reset-password` output — **save once**).

```bash
LOGIN_JSON=$(curl -s -X POST http://127.0.0.1:13401/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"admin","password":"<ADMIN_PASSWORD>"}')

echo "$LOGIN_JSON"

export TOKEN=$(python3 -c "import json,sys; print(json.load(sys.stdin)['token'])" <<< "$LOGIN_JSON")
echo "TOKEN len=${#TOKEN}"   # expect ~200+, not a placeholder string
```

Verify knowledge:

```bash
curl -s http://127.0.0.1:13401/api/org-knowledge \
  -H "Authorization: Bearer ${TOKEN}" | head -c 200
```

### 3.3 Promote admin to `manager` (required for `POST /api/users`)

Org server runs **without** `--local`; migration may leave bootstrap admin as `employee`. **`POST /api/users` is manager-only.**

If login JSON shows `"work_task_role":"employee"`, fix DB then **re-login**:

```bash
python3 - <<'PY'
import sqlite3
db = "/opt/aionorg/data-org/aionui-backend.db"
con = sqlite3.connect(db)
con.execute("UPDATE users SET work_task_role='manager' WHERE username='admin'")
con.commit()
for row in con.execute("SELECT username, work_task_role FROM users"):
    print(row)
con.close()
PY
```

Re-run §3.2; login user must show `"work_task_role":"manager"`.

**Alternative (API, after manager token):**

```bash
curl -s -X PUT "http://127.0.0.1:13401/api/users/system_default_user/work-task-role" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H 'Content-Type: application/json' \
  -d '{"work_task_role":"manager"}'
```

**Wrong:** `PATCH /api/users/{id}` → `NOT_FOUND` (route does not exist).

### 3.4 Create employee org account (Phase 0 contract)

Use **the same username/password** the employee uses on **local** AionUI:

```bash
curl -s -X POST http://127.0.0.1:13401/api/users \
  -H "Authorization: Bearer ${TOKEN}" \
  -H 'Content-Type: application/json' \
  -d '{"username":"<LOCAL_USERNAME>","password":"<LOCAL_PASSWORD>","work_task_role":"employee"}'
```

Success: `{"success":true,"data":{"id":"user_...","username":"...","work_task_role":"employee"}}`

List users:

```bash
curl -s http://127.0.0.1:13401/api/users \
  -H "Authorization: Bearer ${TOKEN}"
```

Repeat §3.4 for each employee (~10 staff).

### 3.5 External reachability (from employee PC)

```powershell
curl.exe -s http://67.216.206.3:13401/api/auth/status
```

If blocked on VPS:

```bash
ufw allow from <EMPLOYEE_PUBLIC_IP>/32 to any port 13401
ufw status
```

---

## 4. Employee desktop — correct path

### 4.1 Configure org URL

**Dev:** `%APPDATA%\AionUi-Dev\aionui\org-server.json`  
**Prod:** `%APPDATA%\AionUi\aionui\org-server.json`

```json
{ "url": "http://67.216.206.3:13401" }
```

**Must be UTF-8 without BOM.** A BOM breaks preload JSON parse → linkage silently skipped. PowerShell safe write:

```powershell
$json = '{"url":"http://67.216.206.3:13401"}'
[System.IO.File]::WriteAllText("$env:APPDATA\AionUi-Dev\aionui\org-server.json", $json, (New-Object System.Text.UTF8Encoding $false))
```

### 4.1b Local user must match org user

Phase 0 requires **same username/password** on local AionUI and org VPS. If dev DB only has `admin` / `system_default_user`, create local employee (e.g. `yjc`) before testing — bypass mode does not create real users.

### 4.2 Restart + login

1. **Full restart** AionUI (preload reads `org-server.json` → `window.__orgServerUrl`).
2. Disable `AIONUI_BYPASS_AUTH=1` in dev launcher when testing linkage.
3. Log in with **local credentials** that match the org user created in §3.4.
4. On org failure: toast `login.orgKnowledgeUnavailable` (chat still OK).

### 4.3 Acceptance checks

| Check | Pass criterion |
|-------|----------------|
| Token file | `%APPDATA%\AionUi-Dev\aionui\org-session.token` exists and non-empty after login |
| Sidebar |「组织知识库」visible when `__orgServerUrl` set (DevTools) |
| Shadow sync | `wanding_business_knowledge.md` updated; sibling `.org-meta.json` with org `version` |
| MCP (optional) | Python stderr `[KNOWLEDGE_SOURCE] Org API` on internal loads |
| Manual org login | **Not required** for MCP after Phase 0 linkage |

### 4.4 Knowledge update SOP (center → each employee)

**Scope:** Phase 0 shadow sync — how authoritative org docs reach each desktop after center edits.

#### Two channels (do not conflate)

| Channel | Consumer | Source | Notes |
|---------|----------|--------|-------|
| **A — Agent Read** | `quotation-agent` on multi-candidate match | Local shadow `wanding_business_knowledge.md` | Path fixed in agent/MCP `selection_context.knowledge_source`; content must match center via shadow |
| **B — Python MCP internal** | `admin.org_knowledge_client.load_doc_content` | Org API first, file fallback | Logs `[KNOWLEDGE_SOURCE] Org API` on stderr when token + network OK |

Agent Read **does not** fetch org HTTP URLs. Phase 0 acceptance = shadow file bytes match center after login.

#### When shadow write runs

| Event | Writes local md? |
|-------|------------------|
| Local login → org login success (`performOrgLogin` + token) | **Yes** — `await syncOrgKnowledgeShadowAfterLogin()` |
| Each chat message / `match_quotation` | **No** |
| App open without login | **No** |
| Manual `scripts/org-phase0/sync-org-knowledge-shadow.ps1` | **Yes** |

**Write target:** `resolveWandingBusinessKnowledgeShadowPath()` — resolution order matches quotation MCP:

1. `WANDING_BUSINESS_KNOWLEDGE_PATH` env (override)
2. **`$INSTALL\vendor\wanding\data\wanding_business_knowledge.md`** via `resolveCcbWandingInstallDir()` (v2: `%LOCALAPPDATA%\Programs\CCB-Wanding\…`)
3. Dev / legacy fallback: `D:\CCB-Wanding\vendor\wanding\data\…` only when install dir unresolved

Sidecar: `{path}.org-meta.json` with `{ slug, version, synced_at }`. **Do not** document only `D:\CCB-Wanding\…` for fleet machines — use `$INSTALL` / install-dir resolution.

**UI signal:** `orgKnowledgeLinked` only when `shadowSyncOk`; else toast `orgKnowledgeUnavailable` (chat still works).

#### Center edit → fleet rollout

1. **Manager/admin (once):** Edit doc in center AionUI「组织知识库」→ save → center `version` increments.
2. **Each employee:** Re-login AionUI (same username/password as org account) **or** run manual sync PS1.
3. **Verify per machine:** `.org-meta.json` `version` matches center; optional Agent Read on multi-candidate quote shows updated text.

#### Per-employee one-time setup

| Step | Action |
|------|--------|
| 1 | `org-server.json` with center URL (UTF-8 **no BOM**); full app restart |
| 2 | VPS `POST /api/users` — username/password **match** local AionUI login |
| 3 | First real login → `org-session.token` + shadow md + `.org-meta.json` |

Repeat §3.4 / `vps-create-employee.sh` for each new hire (~10 staff).

#### Phase 0 out of scope (future)

- Background periodic sync without re-login
- Push notification from center to all clients
- Agent Read directly against org API URL

See also: `docs/org-knowledge-deploy.md` §12; `openspec/changes/unified-org-sso/` for single-token SSO.

### 4.5 Sidebar「组织知识库」entry (verified 2026-06-19)

**Code:** `SiderOrgKnowledgeEntry.tsx` returns `null` unless `isOrgServerConfigured()` (`window.__orgServerUrl` from preload).

| Item | Detail |
|------|--------|
| **When visible** | After **full Electron restart** with valid `org-server.json` (or `ORG_SERVER_URL` env) |
| **Dev config** | `%APPDATA%\AionUi-Dev\aionui\org-server.json` — UTF-8 **no BOM** |
| **Prod config** | `%APPDATA%\AionUi\aionui\org-server.json` |
| **Sidebar order** | Below「工作任务」; collapsed sider = book icon only |
| **Route** | `#/org-knowledge` → `OrgKnowledgePage` (list, editor, history, revert) |
| **Quick check** | DevTools: `window.__orgServerUrl` should match center URL |

**Verified:** Employee dev machine — user confirmed entry visible after kill-all + `start-aionui-dev-org-test.ps1`.

**Edit flow:** Open entry → select slug → edit markdown → Save (`PUT` with `expected_version`) → center DB updates; other desktops need re-login shadow sync (§4.4).

**Launcher:** `scripts/org-phase0/start-aionui-dev-org-test.ps1` ensures dev `org-server.json` exists and unsets bypass.

---

## 5. Error matrix (gotchas from 2026-06-19 session)

| Symptom | Cause | Fix |
|---------|--------|-----|
| `CSRF_INVALID` on `POST /api/users` | `TOKEN` unset, placeholder (`新返回的token`), or missing `Authorization: Bearer` | Re-login; export real JWT via python3 (§3.2); verify `TOKEN len` ~200+ |
| `CSRF_INVALID` on `POST /api/webui/reset-password` | Org server enforces CSRF on non-exempt POSTs without Bearer | Use saved admin password + `/login`; or cookie+`x-csrf-token` flow |
| `Route not found` / `NOT_FOUND` | Used `PATCH /api/users/{id}` | Use `PUT /api/users/{id}/work-task-role` or `POST /api/users` |
| `403 Only managers can create users` | Admin still `employee` in DB | §3.3 SQLite/python promote → re-login |
| MCP still file fallback | No org token; bypass auth; org user missing; firewall | §3.4 matching account; §4.2 real login; §3.5 firewall |
| Org menu hidden | `org-server.json` added without restart | Full app restart |
| Org menu hidden | `org-server.json` **UTF-8 BOM** (prod path) → preload URL empty | Rewrite UTF-8 no BOM; verify `window.__orgServerUrl` in DevTools |
| Org menu hidden | Sider collapsed | Look for book icon below「工作任务」; expand sider for「组织知识库」text |
| Org menu hidden | Old Electron build without org-knowledge UI | Use current `aionui-src` dev or rebuild installer |
| Linkage never runs | `AIONUI_BYPASS_AUTH=1` | Turn off bypass for test |
| Linkage never runs | `org-server.json` **UTF-8 BOM** → preload parse 失败 | 重写为 UTF-8 **无 BOM**；用 `start-aionui-dev-org-test.ps1` 创建 |
| UI「正在处理中」+ 空白聊天 | WS 丢失 `turn.completed`；后端已 finish | Ctrl+R 临时恢复；**fix:** runtime reconcile（`conversationRuntimeReconcile.ts`） |
| 看不到旧报价会话 | 登录从 `system_default_user` 换成 `yjc` | 预期：用户隔离；旧数据仍在 DB 旧 user_id 下 |
| 本地无 yjc 用户 | 仅 bypass 时 seed 了 admin | 在本机 `%APPDATA%\AionUi-Dev\aionui\aionui-backend.db` 建 yjc 或管理端创建 |

**CSRF rule (org aioncore):** State-changing routes require CSRF **unless** `Authorization: Bearer …` is present (`aionui-auth/src/csrf.rs`). `/login` is always exempt.

**UI runtime reconcile (2026-06-19):** If backend `runtime.is_processing === false` but UI still processing, renderer polls every 3–5s and applies `turnCompleted`; logs `runtime_reconciled`. See `chat-acp-flow.md`.

---

## 6. API quick reference (user admin)

| Method | Path | Auth | Notes |
|--------|------|------|-------|
| POST | `/login` | — | CSRF-exempt; returns `token` |
| GET | `/api/auth/status` | — | Setup flag |
| GET | `/api/org-knowledge` | Bearer | List 8 docs |
| GET | `/api/users` | Bearer | Member directory |
| POST | `/api/users` | Bearer + **manager** | Create employee |
| PUT | `/api/users/{id}/work-task-role` | Bearer + **manager** | Promote/demote |

---

## 7. Tests (repo)

```powershell
# aionui-src — Phase 0 unit tests
cd D:\Projects\aionui-src
bun test tests/unit/common-auth/orgAuthLogin.test.ts
bun test tests/unit/common-adapter/orgHttpBridge.test.ts

# Python MCP client
cd D:\Projects\claude-code-best\python
python -m unittest admin.test_org_knowledge_client
```

---

## 8. Next phase

Full SSO (one JWT, shared `JWT_SECRET`, JIT provisioning): **`openspec/changes/unified-org-sso/`** — Phase 0 ops (VPS accounts, `org-server.json`) carries forward.

---

## Wrong vs correct (summary)

| Wrong | Correct |
|-------|---------|
| Employee uses local login only; expect MCP to hit org API | Create **matching** org user; linkage sends same password to org `/login` |
| `export TOKEN='新返回的token'` placeholder | Parse real JWT from login JSON (§3.2) |
| Second manual login on「组织知识库」page for MCP | Phase 0: one local login writes `org-session.token` automatically |
| `PATCH /api/users/...` | `POST /api/users` or `PUT .../work-task-role` |
| Edit `org-server.json` without restart | Full Electron restart |
| Save `org-server.json` with UTF-8 BOM (Notepad default) | UTF-8 **no BOM**; verify linkage after login |
| Expect old `system_default_user` chats under new employee login | User-scoped DB; use bypass dev or migrate conversations |
| UI stuck「正在处理中」after send | Backend may be done; refresh or wait for runtime reconcile (~3–8s post-fix) |
| Expect shadow sync on every chat message | Shadow sync runs **only on org login success** (or manual PS1) |
| Expect Agent Read to hit org HTTP URL | Agent Read uses **local shadow path**; content must match center via login sync |
| Center doc updated but employee still sees old Read content | Employee has not re-logged in since center save; check `.org-meta.json` `version` |

---

## 9. Session changelog (2026-06-19)

| Date | Item |
|------|------|
| 2026-06-19 | VPS: admin→manager; employee `yjc`; org knowledge 8 docs OK |
| 2026-06-19 | Windows: BOM fix; local yjc; `org-session.token` verified |
| 2026-06-19 | aionui-src: runtime reconcile fix for lost WS `turn.completed` |
| 2026-06-19 | Trellis runbook + journal; OpenSpec `unified-org-sso` drafted (not built) |
| 2026-06-19 | §4.4 知识更新 SOP（中心改 → 每人重登/manual sync）；双通道 A/B 说明 |
| 2026-06-19 | §4.5 侧栏「组织知识库」入口 — 杀进程 + dev 重启后用户确认可见 |
| Pending | Quote-session MCP `[KNOWLEDGE_SOURCE] Org API` acceptance |

---

## 10. 2026-06-19 Update: Agent Writes + Automatic Shadow Sync

This section supersedes the older "re-login or manual sync only" rule for clients that include the 2026-06-19 AionUI changes.

### Chat-driven shared rule write

Quotation MCP now exposes `append_business_rule`:

- First call without `confirmed=true` returns `requires_confirmation: true` and does not write.
- After the user explicitly confirms, call with `confirmed=true`.
- The tool reads center `wanding_business_knowledge`, appends a dated rule block, and PUTs with `expected_version`.
- The agent must not directly edit local `wanding_business_knowledge.md` for shared rules.

### Automatic shadow sync triggers

| Trigger | Writes local md? |
|---------|------------------|
| Local login -> org login success | Yes |
| `/org-knowledge` save/revert of `wanding_business_knowledge` | Yes, immediately on the editor machine |
| Org WS `org-knowledge.updated` for `wanding_business_knowledge` | Yes, online employees sync immediately |
| Window returns to foreground | Yes |
| 60s fallback interval while org-authenticated | Yes |
| Each chat message / `match_quotation` | No |
| App open without org-authenticated session | No |
| Manual `scripts/org-phase0/sync-org-knowledge-shadow.ps1` | Yes |

### Rollout

1. Manager/admin edits in `/org-knowledge`, or quotation-agent writes through `append_business_rule` after explicit confirmation.
2. Center version increments.
3. Editor's local shadow updates immediately.
4. Other online employees receive `org-knowledge.updated` over org WS and sync; 60s polling is fallback.
5. Offline employees sync on next org login / foreground sync / manual sync.

### Still Out Of Scope

- Server-side manager-only org knowledge write enforcement.
- Full production package of the AionUI sync changes.
- Agent Read directly against org HTTP URL; Agent Read continues to use local shadow.
