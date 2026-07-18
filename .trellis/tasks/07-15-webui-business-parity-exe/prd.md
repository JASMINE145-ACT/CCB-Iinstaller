# PRD — WebUI business parity with WanD exe

| Field | Value |
|-------|--------|
| **Task ID** | `07-15-webui-business-parity-exe` |
| **Created** | 2026-07-15 |
| **Status** | **done** — host WebUI parity verified 2026-07-15（本机 + Tailscale） |
| **Depends on** | `07-14-web-1-1-9-apple-access` (host WebUI + Tailscale reachable) |
| **Repos** | primarily `aionui-src` (desktop renderer + web-host); may touch `ccb-installer` if catalog API needs seed |

## Problem

苹果/浏览器打开 Mixing WebUI 后，布局与 exe 不同可接受；但 **exe 已配置的业务入口缺失或错误**：助手目录、知识库、价格库、供应商、记忆等，导致远程使用的不是同一套业务产品。

## Goal

**Business-config parity** on WebUI:

1. Org data libraries sider：知识库 / 价格库 / 供应商 — 在 org server 已配置时**可见可进**
2. Guid / 助手目录 — **CCB WanD seed agents 身份**与 exe 一致（Layer A：picker identity）
3. `ccbAuthorityActive` 业务门在 Web 上为真（或等价 HTTP 门），使依赖该门的表面可用
4. Memory：HTTP  parity **延期** — Web v1 **exe-only**（侧栏隐藏 Memory；见 `p5-memory-deferred.md`）

## Non-goals

- Pixel / visual shell parity with Electron
- Redesign Mixing brand or global typography
- Native Mac package
- Replacing Tailscale access work (`07-14-web…`)

## Acceptance criteria

- [x] WebUI（浏览器）侧栏出现与 exe 同等条件的 **数据库** 组：知识库、价格库、供应商 — 用户验收 2026-07-15（127.0.0.1 + Tailscale UI 齐全）
- [x] 三页 / 业务调用 smoke — 用户验收：可正常调用（报价「直接50」→ 万鼎报价专家 / 查价 MCP）
- [x] Guid 助手列表含核心 WanD agents（同上会话身份：万鼎报价专家）
- [x] Layer A：Web 业务身份可用（与上同验）
- [x] 本机验收：`127.0.0.1:25809` + 本机 Tailscale `100.93.152.114:25809`（无需远端苹果设备）；Safari 非本机门禁
- [x] 记忆：**Web v1 deferred（exe-only）** — `p5-memory-deferred.md` + runbook；侧栏 Memory 在 Web 隐藏
- [x] code-reviewer PASS + deploy smoke + **manual host PASS** 2026-07-15

## User doctrine (locked)

> 可以有 UI 差异，但业务已经配置好的逻辑必须复刻。
