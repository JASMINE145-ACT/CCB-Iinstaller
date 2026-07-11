# Security & boundary sign-off — 2026-07-11

**Tasks:** `07-01-price-library-admin-agent` · `07-11-price-library-row-edit-ui`  
**Verdict:** **可收口** — 无 Critical/Important 安全问题；已知边界为产品设计内 accept。

---

## 三层权限（已落地）

| 层 | 机制 | P4 状态 |
|----|------|---------|
| **AionCore** | `PRICE_ADMIN_USERNAMES` → 写 API **403** | ✅ 最终权威；UI/MCP 均不可绕过 |
| **UI** | `resolveIsOrgPriceAdmin()` + 抽屉 `isPriceAdmin` | ✅ 已 smoke（admin 有编辑 / non-admin 无） |
| **Agent** | Guid 卡片隐藏 + `delegatable: false` | ✅ P1；P1.5 orchestrator 委派仍 **defer** |

> 正确模式：**不靠 UI 隐藏当唯一防线** — 非 admin 即使手调 IPC/MCP，服务端仍 403。

---

## 写路径安全

| 项 | 评估 |
|----|------|
| **CSRF** | POST 走 main `orgHttpProxy` 注入 cookie + `x-csrf-token` — ✅ 与 org-knowledge/work-tasks 同模式 |
| **JWT** | Bearer 由 Electron session / org token 提供 — ✅ 现有 org 栈 |
| **两阶段确认** | diff Modal → 写 draft；publish 二次确认 + revision — ✅ |
| **409 revision** | 冲突停、不 silent replay — ✅ UI + Agent 一致 |
| **字段白名单** | `PRICE_LIBRARY_EDIT_FIELDS` 仅 P0 9 字段；`change_type` 固定 `update` — ✅ 无 UI 删行/新增/import |
| **共享 draft** | 多 admin 后写覆盖 + publish 409 — ⚠️ **已知设计**，非漏洞 |

---

## 已知边界（accept / defer，不阻塞收口）

| 边界 | 级别 | 说明 |
|------|------|------|
| 无 maker-checker | 产品 | 单 `price_admin` 可写+发布；PRD out of scope |
| 无 per-field audit UI | 产品 | 版本级 `list_versions` + Agent；`GET /audit` MCP 未做 |
| `isPriceAdmin` SWR 缓存 | 低 | 换账号后建议刷新页；写 API 仍 403 兜底 |
| P1.5 orchestrator 委派 | defer | 未开 — 非 admin 不能经主路由改价 |
| 双 admin 409 并发 | defer | 低频；409 文案已有 |
| MCP 直调写工具 | 低 | 需本机 MCP + token；403 兜底；与 Agent 路径相同 |

---

## 未发现的 Critical / Important 项

- ❌ 无客户端-only RBAC（服务端始终校验）
- ❌ 无 renderer 自造 CSRF
- ❌ 无跳过确认的写路径
- ❌ 无 UI 暴露 delete/import/revert/schema 变更

---

## 收口结论

**P4 + Agent 双路径在现有 org 权限模型下可安全收口。**  
后续增强（非阻塞）：P1.5 委派门控、audit MCP、maker-checker、换账号时 invalidate `price-library.is-admin` SWR。
