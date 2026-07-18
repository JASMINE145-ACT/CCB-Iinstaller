# brainstorm: WanD 1.1.9 Web for Apple users

| Field | Value |
|-------|--------|
| **Task ID** | `07-14-web-1-1-9-apple-access` |
| **Created** | 2026-07-14 |
| **Status** | in_progress — Phase 1 host parity PASS; Tailscale login + WebUI + Apple smoke pending |
| **Trigger** | 公司有苹果用户装不了 Windows 安装包；需要 Web，目标对齐 **1.1.9** 能力 |
| **Runbook** | [`docs/wanding-web-apple-access-1.1.9.md`](../../../docs/wanding-web-apple-access-1.1.9.md) |
| **Smoke** | [`smoke.md`](./smoke.md) |

## User understanding (locked 2026-07-14)

**苹果同事怎么用：装 Tailscale → 浏览器打开网址 → 登录后使用宿主上的 WanD。**  
不装 Mac App、不装 iOS App、不双击 `.exe`。

这不是独立 Web 产品，而是 **远程使用宿主 Windows 上的 1.1.9 WanD**。

## Problem

Windows 员工用 `CCB-Wanding-1.1.9.exe`；苹果端无法安装同一 NSIS 包，需要在浏览器里远程使用对齐 **1.1.9** 的宿主能力。

## What already exists

| Artifact | Kind | Meaning |
|----------|------|---------|
| [`.trellis/spec/integration/web-version-ios-access-todo.md`](../../spec/integration/web-version-ios-access-todo.md) | Spec todo (1.1.1 时代) | 推荐 Windows 宿主 WebUI；本任务 rebase → **1.1.9** |
| [`docs/mac-support-plan.md`](../../../docs/mac-support-plan.md) | Docs | 原生 Mac `.pkg` — **deferred** |
| `07-12-release-1.1.9` | Done | Windows Full NSIS；**不能替代**目标宿主现场 health |

## MVP architecture (locked)

```text
Mac / iPhone / iPad → Safari / Chrome
  -> http://<host-Tailscale-name-or-100.x>:25808   # Tailscale only
  -> Windows host WebUI (CCB-Wanding 1.1.9)
  -> aioncore → route-b → CCB-Wanding --acp → host-local MCP/data
```

| Decision | Choice |
|----------|--------|
| Client | 浏览器（Mac **和** iPhone/iPad 均须 P0 smoke） |
| Network | **Tailscale**；禁止裸公网 `:25808` |
| Product claim | 「远程使用宿主 WanD」；**不说**「独立网页版 / 与桌面字节级一摸一样」 |
| Account (MVP) | **允许共用宿主 WebUI 账号**；必须记录 owner 与风险（见 Host lock） |
| Forbidden entry | 不用 `ccb-wanding-web/` |

## Host lock (fill before smoke — P0 gate)

| Field | Value |
|-------|--------|
| Host machine name / who owns it | **JASMINE**（临时宿主 = 本开发机） |
| Owner (updates / reboot / credentials) | m1774 |
| Install dir | `D:\CCB-Wanding` |
| `dist/VERSION` expected | `1.1.9` ✅ restored 2026-07-14（曾被 start-dev 误标 `1.1.6-dev`） |
| Tailscale MagicDNS / 100.x | **Connected** — `jasmine` · **`100.93.152.114`** · owner `JASMINE145-ACT@github` · Tailscale 1.98.8 |
| WebUI URL | **`http://100.93.152.114:25809`** 或 **`http://jasmine.taila87242.ts.net:25809`**（curl 已 200）。本机自测用 `http://127.0.0.1:25809`。勿用 `198.18.0.1`；浏览器打不开时关掉 Clash/系统代理对 `100.x` / `*.ts.net` 的劫持 |
| Account mode | shared WebUI login（MVP） |
| Shared-account risk acknowledged | 聊天/文件/凭证归宿主；审计混淆 — owner 知情 ☑ |

## Acceptance criteria

### Host parity

- [x] Host lock 表已填（机器、owner、install dir；Tailscale 名待登录后补）
- [x] 宿主 `dist/VERSION` = **1.1.9**（`evidence/host-identity.txt`）
- [x] `test-install-health.ps1` PASS（`evidence/install-health-2026-07-14.txt`）
- [x] `test-mcp-health.ps1` config PASS（`evidence/mcp-health-after-node-patch-2026-07-14.txt`）；Probe+Session 5/5 · 8/8（同会话 repair log）
- [x] 已通过 `ccb-launch-aionui.cmd` 启动（AionUi + aioncore 在跑）

### WebUI + Tailscale

- [x] Settings 开启 WebUI；`allowRemote` ON；本机 `127.0.0.1:25809` → 200（端口 **25809**）
- [ ] Tailscale **Connected**（非 umich 待批状态）并记下 MagicDNS / 100.x
- [ ] 苹果端经 Tailscale 打开 `http://<ts>:25809` 登录页（**禁止**把 `198.18.0.1` 当对外地址）
- [ ] **宿主重启后** WebUI 自动恢复，同一 Tailscale URL 仍可访问

### Apple smoke（两端都要）

见 [`smoke.md`](./smoke.md)：

- [ ] **Mac 浏览器** 一轮 PASS
- [ ] **iPhone Safari** 一轮 PASS  
  （login → 新建会话 → Guid/报价流式回复 → tool 完成 → idle 第二句）

### Docs / spec

- [ ] 员工 runbook：[`docs/wanding-web-apple-access-1.1.9.md`](../../../docs/wanding-web-apple-access-1.1.9.md) 填好 URL / Tailscale / 账号 / 已知差距 / 联系人
- [ ] `web-version-ios-access-todo.md` 基线 rebase 1.1.1 → **1.1.9**，已验项勾选

## Explicit non-goals (MVP)

- 原生 Mac `.pkg` / iOS / Apple 公证
- `ccb-wanding-web/` 生产入口
- 公网裸暴露 `:25808`
- 浏览器本机 Excel/Office MCP
- 命名用户隔离 / HTTPS 反代 / 中心化 MCP（人变多 → Phase 3）

## Known non-parity (must stay in runbook)

- MCP/数据/凭证 = **宿主机器**环境，不是苹果本机文件
- Safari 上传下载、PWA 能力可能弱于桌面
- 共用账号时会话与审计归属宿主
