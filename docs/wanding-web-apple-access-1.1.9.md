# WanD 远程浏览器接入（Apple）— 1.1.9

> **这是什么：** 用 Mac / iPhone / iPad 的浏览器，通过 Tailscale **远程使用**一台已装 CCB-Wanding **1.1.9** 的 Windows 上的 WanD。  
> **这不是什么：** 不是独立网页产品；不要用仓库里的 `ccb-wanding-web/` 原型。

| Field | Value |
|-------|--------|
| **Baseline** | CCB-Wanding 1.1.9 |
| **Task** | `.trellis/tasks/07-14-web-1-1-9-apple-access` |
| **Smoke** | `.trellis/tasks/07-14-web-1-1-9-apple-access/smoke.md` |
| **Status** | host ready — waiting Tailscale login + WebUI enable |

---

## 员工怎么用（三步）

1. 安装并登录公司 **Tailscale**（与宿主同一账号/团队）。
2. 浏览器打开（任选其一）：  
   - **`http://100.93.152.114:25809`**  
   - **`http://jasmine.taila87242.ts.net:25809`**  
   本机自测请用 `http://127.0.0.1:25809`。  
   **不要**用 `198.18.0.1`。若浏览器打不开但别人/curl 可以：关掉 Clash / 系统代理对 `100.x`、`*.ts.net` 的代理。
3. 用户名 `admin` + 运维给的初始密码 → 新建会话 → 正常问 Guid / 报价。

**不要：** 把 `:25808` 填进公网 IP、路由器端口映射、或裸暴露到互联网。

---

## 运维 / 宿主（必填）

| Item | Value |
|------|--------|
| Host machine | **JASMINE**（临时） |
| Owner | m1774（升级、重启、账号保管） |
| Install dir | `D:\CCB-Wanding` |
| `dist/VERSION` | `1.1.9` ✅ |
| Tailscale name / 100.x | **`100.93.152.114`** · machine `jasmine` · `JASMINE145-ACT@github` · Connected |
| WebUI port | **25809** — 对外：`http://100.93.152.114:25809` |
| Account mode | shared WebUI login（MVP） |
| Start command | `ccb-launch-aionui.cmd` / 桌面启动器 — **不要**裸跑 `AionUi.exe` |

健康检查（宿主本机）：

```powershell
.\ccb-installer\scripts\test-install-health.ps1 -InstallDir "<InstallDir>"
.\ccb-installer\scripts\test-mcp-health.ps1 -Probe -Session
```

重启验收：宿主重启后，同一 URL 仍能打开登录页。

---

## 能力边界（请先读）

你用的是 **宿主电脑上的** WanD / MCP / 本地文件与凭证，不是苹果本机：

| 场景 | 预期 |
|------|------|
| 聊天、助手、报价会话 | 应能工作（以 smoke PASS 为准） |
| 侧栏 知识库 / 价格库 / 供应商 | 需 **重建并部署含 WebUI 业务对齐的 AionUI**（task `07-15-webui-business-parity-exe`）；旧包不会有 `/api/webui/*` |
| Guid 助手目录（WanD CCB agents） | 同上；与 exe **同 id** 为目标 |
| 记忆（Memory / 沉淀） | **Web v1 不做** — 请用 Windows exe；浏览器侧栏不显示 Memory |
| Excel / Office / 本机路径 MCP | 作用在 **Windows 宿主**；苹果本地文件不在其内 |
| 会话 / 上传文件归属 | MVP 共用账号时 → 存在宿主；审计可能混淆 |
| 上传下载（尤其 iOS Safari） | 可能弱于桌面；以实测为准 |

---

## 故障找谁

| 现象 | 先查 | 联系人 |
|------|------|--------|
| 打不开网址 | Tailscale 是否在线、宿主是否开机、WebUI 是否开 | Owner: _TBD_ |
| 能登录不能聊 | 宿主 MCP health / 是否用启动器启动 | Owner: _TBD_ |
| 重启后挂了 | WebUI 开关是否恢复 | Owner: _TBD_ |

---

## 明确禁止

- 使用 `ccb-wanding-web/` 当作入口  
- 公网裸开 WebUI 端口  
- 对外宣传为「完整独立网页版 WanD」  

---

## Related

- Spec todo: `.trellis/spec/integration/web-version-ios-access-todo.md`  
- Native Mac installer plan (deferred): `docs/mac-support-plan.md`  
- Release baseline: `ccb-installer/delivery-1.1.9-2026-07-12.md`  
- Business parity (org sider / CCB catalog): `.trellis/tasks/07-15-webui-business-parity-exe/`（代码在 `aionui-src`；需重建宿主 AionUI）  
