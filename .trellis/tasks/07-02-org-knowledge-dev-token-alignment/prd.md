# Org knowledge Dev/Prod JWT 对齐 — append 落库 401 长久修复 (v2)

## Goal

在 **Dev + Prod 双 AppData** 并存的 Windows 机器上，quotation MCP 通过 **显式 profile 绑定** 使用正确 JWT，使 `append_business_rule` 落库成功；price + knowledge 共用 `org_session.py`，行为一致、可测。

## Problem (2026-07-02 repro)

`append_business_rule`（`confirmed=true`）失败 401；同机 `AionUi-Dev` token → 200，`AionUi` (Prod) token → 401。MCP env 固定 `ORG_SESSION_TOKEN_FILE` → Prod 路径。

## Root causes (revised)

| # | Layer | Mechanism |
|---|-------|-----------|
| R1 | `org_knowledge_client.py` | 单 token、401 不重试 |
| R2 | 无共享 session 模块 | price 已修 knowledge 未对齐 |
| R3 | `ensure-wanding-settings.ps1` | 按「第一个存在文件」选 Prod，非 profile |
| R4 | Dev workflow | `start-dev-full` 写 Dev token；MCP 读 Prod |

**v1 方案不足：** 盲扫双 profile + mtime 选 token 会掩盖身份错配；PUT 需 per-token CSRF；验收不能只看 HTTP 200。

## Design (v2 — agreed)

### 1. Explicit profile (P0)

```
start-dev-full.ps1
  → $env:AIONUI_APPDATA_PROFILE = 'AionUi-Dev'

ensure-wanding-settings.ps1
  → quotation MCP env:
       AIONUI_APPDATA_PROFILE = <profile>
       ORG_SESSION_TOKEN_FILE   = %APPDATA%\<profile>\aionui\org-session.token
```

Packaged prod：默认 `AionUi`（无 env 时 `org_session.resolve_org_profile()` 回退）。

### 2. Shared `org_session.py` (P0 — mandatory)

| API | Contract |
|-----|----------|
| `resolve_org_profile()` | `AIONUI_APPDATA_PROFILE` → `AionUi` \| `AionUi-Dev` |
| `resolve_auth_fallback_policy()` | `ORG_SESSION_TOKEN` / `ORG_SESSION_TOKEN_FILE` / profile set → **STRICT** |
| `get_auth_candidates()` | STRICT：仅当前 profile 单文件；LEGACY_SCAN：双 profile（deprecated + WARN） |
| `classify_http_status()` | 401 auth / 403 CSRF / 409 version |

**禁止：** mtime 选 token；cross-profile 身份猜测（STRICT 模式下）。

### 3. Client behavior

```
GET:  for candidate in candidates:
        try → 200 return
        401 → next (LEGACY_SCAN only multi-profile)
PUT:  per-candidate CSRF jar
        401 → next token
        403 → OrgCsrfError (no token rotate)
        409 → OrgVersionConflictError (business re-read)
```

`org_price_client` + `org_knowledge_client` 均迁移至 `org_session`。

### 4. Acceptance (identity-aware)

1. Dev 登录后 **新 Guid 会话** `append_business_rule` confirmed=true → 200，`version` 递增。
2. 日志 `[KNOWLEDGE_SOURCE] Org API`（非仅 shadow）。
3. STRICT + `AIONUI_APPDATA_PROFILE=AionUi-Dev`：**不**尝试 Prod token。
4. Unit: `test_org_session`, knowledge 401→第二 token, price 回归。
5. `sync-dev-wanding-vendor -UpdateSettings -Smoke` 后 vendor 含修复。

## Task phases

- [x] P0: `org_session.py` + profile contract
- [x] P0: `org_knowledge_client` GET/PUT multi-candidate + typed errors
- [x] P0: `org_price_client` migrate to `org_session`
- [x] P1: `ensure-wanding-settings` + `start-dev-full` profile injection
- [x] P1: tests green + spec + vendor sync smoke
- [ ] Close: manual append e2e on dev machine

## Dependencies

- [`06-28-org-knowledge-agent-write-path`](../06-28-org-knowledge-agent-write-path/)
- Pattern: [`price-library.md`](../../spec/integration/price-library.md) § dual-token (2026-06-29), superseded by profile-strict v2
