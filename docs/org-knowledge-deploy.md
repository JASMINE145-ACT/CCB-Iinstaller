# 组织知识库 — 部署与迁移手册（独立版）

> **一份文档搞定**：架构说明 + 中心服务器部署 + 员工端配置 + 验收 + 排错。  
> 不依赖 Trellis / 其他 md；发给运维或同事直接按此操作即可。

**版本：** 2026-06-12  
**适用：** CCB-Wanding / AionUI，~10 人；中心机可为 **Windows 内网** 或 **Linux 云 VPS**。

---

## 1. 这是什么

把公司共用的 **Markdown 业务知识**（报价规则、万鼎业务说明等 8 篇文档）放到 **一台中心服务器** 上；员工电脑：

- **聊天、工作任务** → 仍用本机 aioncore（不变）
- **组织知识库 UI、报价 MCP** → 读写中心服务器

### 1.1 迁移前 vs 迁移后

| 维度 | 迁移前 | 迁移后 |
|------|--------|--------|
| 知识存在哪 | 每人本机 `data/*.md` | 中心机 SQLite |
| 怎么改 | 改文件 / Git | AionUI「组织知识库」页面 |
| 报价 MCP | 读本机 md | **优先读中心 API**，离线才读本机 md |
| 聊天 / 任务 | 本机 | **不变** |

### 1.2 架构简图

```text
员工电脑                              中心服务器 (:13401)
┌─────────────────────┐              ┌──────────────────────┐
│ 本机 aioncore       │              │ 组织 aioncore        │
│  · 聊天 / 会话      │              │  · 8 篇 MD 知识库    │
│  · /tasks 工作任务  │              │  · 组织用户账号      │
└─────────────────────┘              └──────────────────────┘
         │                                      ▲
         │ 本地登录                              │ 组织登录 (另一套密码)
         ▼                                      │
┌─────────────────────┐     ORG_SERVER_URL      │
│ 组织知识库 UI       │ ────────────────────────┘
│ 报价 MCP (Python)   │ ────────────────────────┘
└─────────────────────┘
```

### 1.3 两套登录（必知）

| | 本机 | 组织（中心） |
|---|------|----------------|
| 用途 | 聊天、任务 | 知识库、MCP 读知识 |
| 地址 | `127.0.0.1:本机端口` | `http://<中心IP>:13401` |
| 密码 | 本机 admin 密码 | **中心单独设的** admin/员工密码 |
| 互不影响 | 本机登出 ≠ 组织登出 | 各登各的 |

---

## 2. 选部署形态（先看这个）

| 形态 | 典型场景 | 二进制 | 员工 `ORG_SERVER_URL` 示例 |
|------|----------|--------|---------------------------|
| **路径 A：Windows 内网机** | 公司机房 / NAS 旁路 Windows 常开机 | `aioncore.exe`（Windows 编译） | `http://192.168.1.100:13401` |
| **路径 B：Linux 云 VPS** | Ubuntu 22.04 + SSH（如 `root@67.216.x.x`） | `aioncore`（**须在 Linux 上编译**） | `http://67.216.x.x:13401` |

**不能**把 Windows 的 `aioncore.exe` 拷到 Linux 上运行。

**安全：**

- 内网 Windows：13401 仅放行局域网（见路径 A 防火墙）。
- 公网 VPS：**不要**长期对 `0.0.0.0/0` 裸奔 HTTP；至少用 `ufw` 限制来源 IP，后续建议 Nginx + HTTPS。

以下 **§3 = 路径 A**，**§4 = 路径 B**；**§5 起** 两条路径共用（员工配置、验收等）。

---

## 3. 路径 A — Windows 内网中心机

### 3.1 要准备什么

| 项 | 说明 |
|----|------|
| 机器 | Windows，常开机，固定内网 IP（例 `192.168.1.100`） |
| 磁盘 | 20GB+ |
| 端口 | TCP **13401**（仅内网） |
| 程序 | 自编译 `aioncore.exe`（含 org-knowledge） |
| 种子 | 仓库 `data\` 下 8 个 `.md` |

目录：

```text
C:\AionOrg\
  aioncore.exe
  data\              ← 8 篇种子 md
  data-org\          ← SQLite（要备份）
```

### 3.2 在开发机构建并拷贝

```powershell
cd D:\Projects\claude-code-best\scripts
.\build-aioncore-work-tasks.cmd
# 产物: AionCore\target\release\aioncore.exe → C:\AionOrg\
# 种子:  data\ → C:\AionOrg\data\
```

### 3.3 首次建库（bootstrap，只做一次）

生产 **不能长期 `--local`**；首次需短暂 `--local` + 只监听 `127.0.0.1`。

**步骤 A — 临时启动**

```powershell
$env:AIONUI_ORG_KNOWLEDGE_SEED_DIR = 'C:\AionOrg\data'
New-Item -ItemType Directory -Force -Path 'C:\AionOrg\data-org' | Out-Null

C:\AionOrg\aioncore.exe `
  --host 127.0.0.1 `
  --port 13401 `
  --data-dir C:\AionOrg\data-org `
  --cors-any `
  --local
```

`data-org` **空库**首次启动会从 `data\` 导入 8 篇；已有库不覆盖。

**步骤 B — 生成 admin 密码（新 PowerShell）**

```powershell
$r = Invoke-RestMethod -Method POST -Uri 'http://127.0.0.1:13401/api/webui/reset-password'
$adminPass = if ($r.data.new_password) { $r.data.new_password } else { $r.new_password }
Write-Host "【保存】组织中心 admin 密码: $adminPass"

$login = Invoke-RestMethod -Method POST -Uri 'http://127.0.0.1:13401/login' `
  -ContentType 'application/json' `
  -Body (@{ username = 'admin'; password = $adminPass } | ConvertTo-Json)
$token = $login.token

Invoke-RestMethod -Uri 'http://127.0.0.1:13401/api/org-knowledge' `
  -Headers @{ Authorization = "Bearer $token" }
```

应返回 **8 条**文档。

**步骤 C — 可选建员工账号**

```powershell
Invoke-RestMethod -Method POST -Uri 'http://127.0.0.1:13401/api/users' `
  -Headers @{ Authorization = "Bearer $token" } `
  -ContentType 'application/json' `
  -Body (@{ username = 'zhangsan'; password = 'YourStrongPass1'; work_task_role = 'employee' } | ConvertTo-Json)
```

**步骤 D** — 关闭步骤 A 的进程。

### 3.4 正式运行

```powershell
$env:AIONUI_ORG_KNOWLEDGE_SEED_DIR = 'C:\AionOrg\data'

C:\AionOrg\aioncore.exe `
  --host 0.0.0.0 `
  --port 13401 `
  --data-dir C:\AionOrg\data-org `
  --cors-any
```

| 必须有 | 禁止 |
|--------|------|
| `--cors-any` | `--local`（生产） |
| `--host 0.0.0.0` | `AIONUI_BYPASS_AUTH=1` |

**防火墙：**

```powershell
New-NetFirewallRule -DisplayName 'AionOrg Knowledge' `
  -Direction Inbound -Protocol TCP -LocalPort 13401 `
  -RemoteAddress 192.168.0.0/16 -Action Allow
```

**开机自启：** 任务计划程序 → 程序 `C:\AionOrg\aioncore.exe`，参数 `--host 0.0.0.0 --port 13401 --data-dir C:\AionOrg\data-org --cors-any`，环境变量 `AIONUI_ORG_KNOWLEDGE_SEED_DIR=C:\AionOrg\data`。

---

## 4. 路径 B — Linux Ubuntu VPS（SSH 部署）

适用于已 `ssh root@<公网IP>` 登录的 Ubuntu 22.04（示例主机名 `hot-snap-1`）。

### 4.1 第一步：SSH 里装依赖 + 建目录

```bash
apt update
apt install -y curl git build-essential pkg-config libssl-dev clang

# Rust（若未安装）
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
source "$HOME/.cargo/env"
rustc --version

mkdir -p /opt/aionorg/{data,data-org,logs}
```

> 若系统提示 *minimized*，不影响编译；需要交互包时可 `apt install unminimize`（可选）。

### 4.2 第二步：从 Windows 上传源码与种子

在 **Windows PowerShell**（非 SSH 内）执行，把 `<IP>` 换成 VPS 地址：

```powershell
scp -r D:\Projects\claude-code-best\AionCore root@<IP>:/opt/aionorg/
scp -r D:\Projects\claude-code-best\data root@<IP>:/opt/aionorg/
```

上传后服务器上应有：

```text
/opt/aionorg/
  AionCore/          ← 含 Cargo.toml、crates/
  data/              ← 8 个 .md
  data-org/          ← 空
  logs/
```

### 4.3 第三步：在服务器上编译

回到 **SSH**：

```bash
source "$HOME/.cargo/env"
cd /opt/aionorg/AionCore
cargo build --release -p aionui-app
# 首次约 10～30 分钟，视 CPU/内存而定
```

验证：

```bash
/opt/aionorg/AionCore/target/release/aioncore --help
```

二进制路径：`/opt/aionorg/AionCore/target/release/aioncore`（无 `.exe`）。

### 4.4 第四步：首次建库（bootstrap）

```bash
export AIONUI_ORG_KNOWLEDGE_SEED_DIR=/opt/aionorg/data

/opt/aionorg/AionCore/target/release/aioncore \
  --host 127.0.0.1 \
  --port 13401 \
  --data-dir /opt/aionorg/data-org \
  --cors-any \
  --local &
sleep 3

# 生成 admin 密码 — 务必保存输出
curl -s -X POST http://127.0.0.1:13401/api/webui/reset-password

# 登录（把 YOUR_PASS 换成上一步密码）
TOKEN=$(curl -s -X POST http://127.0.0.1:13401/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"admin","password":"YOUR_PASS"}' | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

# 验证 8 篇种子
curl -s http://127.0.0.1:13401/api/org-knowledge \
  -H "Authorization: Bearer $TOKEN"

# 停掉 bootstrap 进程
kill %1
# 若 job 已丢，用: pkill -f 'aioncore.*13401'
```

可选建员工账号：

```bash
curl -s -X POST http://127.0.0.1:13401/api/users \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"username":"zhangsan","password":"YourStrongPass1","work_task_role":"employee"}'
```

### 4.5 第五步：正式运行

**临时前台 / nohup：**

```bash
export AIONUI_ORG_KNOWLEDGE_SEED_DIR=/opt/aionorg/data

nohup /opt/aionorg/AionCore/target/release/aioncore \
  --host 0.0.0.0 \
  --port 13401 \
  --data-dir /opt/aionorg/data-org \
  --cors-any \
  > /opt/aionorg/logs/aioncore.log 2>&1 &
```

自测：

```bash
curl -s http://127.0.0.1:13401/api/auth/status
```

### 4.6 防火墙（公网 VPS 必做）

```bash
ufw allow OpenSSH
# 仅放行已知来源（把 203.0.113.10 换成办公室或你家公网 IP）
ufw allow from 203.0.113.10/32 to any port 13401
ufw enable
ufw status
```

员工 IP 分散时，需多次 `ufw allow from ...` 或后续改 Nginx + HTTPS + 认证。

### 4.7 开机自启（systemd）

```bash
cat > /etc/systemd/system/aionorg.service << 'EOF'
[Unit]
Description=AionOrg knowledge center (aioncore)
After=network.target

[Service]
Type=simple
Environment=AIONUI_ORG_KNOWLEDGE_SEED_DIR=/opt/aionorg/data
WorkingDirectory=/opt/aionorg
ExecStart=/opt/aionorg/AionCore/target/release/aioncore \
  --host 0.0.0.0 \
  --port 13401 \
  --data-dir /opt/aionorg/data-org \
  --cors-any
Restart=on-failure
RestartSec=5
StandardOutput=append:/opt/aionorg/logs/aioncore.log
StandardError=append:/opt/aionorg/logs/aioncore.log

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable --now aionorg
systemctl status aionorg
```

升级二进制后：`systemctl restart aionorg`。

### 4.8 本机开发机快速试验（不配 VPS）

Windows 上另开终端：

```powershell
D:\Projects\claude-code-best\scripts\start-org-aioncore.ps1
```

员工 dev 配置 `%APPDATA%\AionUi-Dev\aionui\org-server.json`：

```json
{ "url": "http://127.0.0.1:13401" }
```

---

## 5. 员工电脑配置

把 `<中心IP>` 换成内网 IP 或 VPS 公网 IP。

### 5.1 写 org-server.json

**CCB-Wanding 安装包（推荐）：** 安装后 `ensure-wanding-settings.ps1` 会在 **首次安装** 时把 `vendor\wanding\config\org-server.json` 种子写入 `%APPDATA%\AionUi\aionui\org-server.json`（已存在则不改）。改中心地址：编辑 `ccb-installer\resources\org-server.json` 后重打安装包。

| 环境 | 路径 |
|------|------|
| 正式 | `%APPDATA%\AionUi\aionui\org-server.json` |
| 开发 | `%APPDATA%\AionUi-Dev\aionui\org-server.json` |

```json
{
  "url": "http://<中心IP>:13401"
}
```

URL **不要**末尾 `/`。保存后 **完全退出并重启 AionUI**。

### 5.2 组织登录

1. 侧栏 **「组织知识库」**（未配置 URL 则不显示）
2. 用**中心** admin / 员工账号登录（≠ 本机登录密码）
3. 登录后 MCP 才能从中心 API 读知识

### 5.3 报价 MCP

改完 `org-server.json` 后执行（路径按安装目录调整）：

```powershell
& 'D:\CCB-Wanding\ccb-installer\scripts\ensure-wanding-settings.ps1'
```

### 5.4 本机 md

保留作离线回退；权威数据在中心。

---

## 6. 验收清单

### 中心机

- [ ] `http://<IP>:13401/api/auth/status` → 200，`needs_setup: false`
- [ ] `POST /login` 拿到 token
- [ ] `GET /api/org-knowledge` + Bearer → 8 篇
- [ ] 防火墙符合预期（内网仅 LAN / VPS 非全网开放）

### 员工机（≥1 台）

- [ ] 重启后有「组织知识库」
- [ ] 组织登录成功
- [ ] 保存后版本 +1，另一台可见
- [ ] 离线只读、不可保存

---

## 7. 备份与升级

| 操作 | Windows | Linux |
|------|---------|-------|
| 备份 | 复制 `C:\AionOrg\data-org\` | 复制 `/opt/aionorg/data-org/` |
| 升级 | 停服务 → 换 `aioncore.exe` → 启 | `cargo build` 或上传新二进制 → `systemctl restart aionorg` |
| 员工回滚 | 清空 `org-server.json` 的 `url` | 同左 |

---

## 8. 常见问题

| 现象 | 处理 |
|------|------|
| Linux 上无法运行 `.exe` | 必须在 Linux `cargo build`，见 §4.3 |
| `cargo build` 内存不足 | 加 swap 或换更大 VPS（建议 ≥2GB RAM） |
| 没有「组织知识库」菜单 | 检查 `org-server.json`，重启 AionUI |
| 组织登录失败 | 中心是否运行；IP/端口；防火墙 / ufw |
| PUT 409 | 版本冲突，刷新后重试 |
| MCP 仍读本机文件 | UI 先组织登录一次 |
| 种子 0 篇 | `data-org` 非空或 `AIONUI_ORG_KNOWLEDGE_SEED_DIR` 错误 |

---

## 9. 安全提醒

1. **内网优先**；公网 VPS 限制 13401 来源 IP，后续上 HTTPS。
2. **`--local` 仅 bootstrap**，生产禁止。
3. 组织密码 ≠ 本机密码。
4. 勿将 `org-session.token`、admin 密码提交 Git。
5. 公网 HTTP 传输 JWT 有风险；员工分散时尽快 Nginx + TLS。

---

## 10. 技术附录

### 10.1 种子 slug（8 个）

`wanding_business_knowledge`、`ccb-wanding-claude-index`、`ccb-wanding-pricing-system`、`ccb-wanding-update-server`、`ccb-wanding-quotation`、`ccb-wanding-accurate`、`data-md`、`wanding-matching-architecture`

### 10.2 中心 API（Bearer JWT）

| 方法 | 路径 |
|------|------|
| GET | `/api/org-knowledge` |
| GET | `/api/org-knowledge/{slug}` |
| PUT | `/api/org-knowledge/{slug}` |
| GET | `/api/org-knowledge/{slug}/history` |
| POST | `/api/org-knowledge/{slug}/revert` |

### 10.3 仓库路径

| 路径 | 说明 |
|------|------|
| `scripts/build-aioncore-work-tasks.cmd` | Windows 构建 |
| `scripts/start-org-aioncore.ps1` | Windows 本地试验 |
| `data/` | 种子 md |
| `AionCore/crates/aionui-org-knowledge/` | 后端 crate |

### 10.4 员工端文件

| 路径 | 作用 |
|------|------|
| `%APPDATA%\AionUi\aionui\org-server.json` | 中心 URL |
| `%APPDATA%\AionUi\aionui\org-session.token` | MCP JWT |
| `sessionStorage` `aionui-org-session-token` | UI JWT |

Dev 配置（`AIONUI_APPDATA_PROFILE=AionUi-Dev`）对应 `%APPDATA%\AionUi-Dev\aionui\…`。

### 10.5 排查：supplier-directory / Org MCP 返回 401

**现象**：报价 dual-call 调 `suppliers_hybrid_match`（或其它 Org MCP）返回 `HTTP 401` / `Invalid or expired token`，或带前缀 `ORG_SESSION_EXPIRED` / `ORG_AUTH_FAILED`。

**含义**：不是供应商搜索算法坏了，而是磁盘上的 Org JWT（`org-session.token`）缺失或已过期（常见 ~24h TTL）。

**处理**：

1. 打开对应 AppData 配置的 AionUI，完成 **Org SSO 登录**（会重写 `org-session.token`）。
2. 确认 token 文件 mtime 已更新；可选解码 JWT 检查 `exp` 仍在未来。
3. 无需重启 MCP 进程（supplier-directory 每次请求重读 token 文件）；再调一次供应商工具验证。

**勿**：把 401 当成「货源库宕机」去改 match 逻辑；勿用长期静态 `AIONCORE_JWT` 顶生产会话。

---

## 变更记录

| 日期 | 说明 |
|------|------|
| 2026-06-11 | 初版（Windows 内网） |
| 2026-06-12 | 增加路径 B：Linux Ubuntu VPS（SSH、scp、cargo、ufw、systemd） |
| 2026-06-19 | §11 Phase 1 JWT_SECRET；§12 登录 shadow sync（中心知识 → 本地 md） |
| 2026-06-22 | §13 统一 SSO 员工 onboarding（一次登录、sso.env、launcher） |
| 2026-07-19 | §10.5 supplier-directory / Org MCP 401 → 重新登录刷新 `org-session.token` |

---

## 11. Phase 1 — 统一 JWT（SSO 前置，运维）

详见 [`scripts/org-phase0/phase1-jwt-secret-runbook.md`](../scripts/org-phase0/phase1-jwt-secret-runbook.md) 与 OpenSpec `unified-org-sso` tasks §2。

要点：

- VPS 与员工本机 local aioncore 使用 **同一 `JWT_SECRET`**
- Org `/login` 签发的 JWT 应能被本机 aioncore 验签（Phase 2 再加 JIT 用户行）
- **勿提交** secret 到 git

## 12. 登录后知识 shadow 同步（Phase 0 闭环）

中心改 `wanding_business_knowledge` 后，员工机应通过 **shadow 文件** 让 Agent Read 与 MCP 本地回退读到同一内容：

| 机制 | 说明 |
|------|------|
| **AionUI 自动** | org 登录成功后拉 `GET /api/org-knowledge/wanding_business_knowledge` → 写入 `WANDING_BUSINESS_KNOWLEDGE_PATH` 或 `D:\CCB-Wanding\vendor\wanding\data\wanding_business_knowledge.md` |
| **手动** | `.\scripts\org-phase0\sync-org-knowledge-shadow.ps1 -Username … -Password …` |
| **验收** | 同路径旁生成 `.org-meta.json`（含 `version`）；VPS 改字 → 重登 → Agent Read 内容更新 |

Agent 仍 Read **本地路径**（设计如此）；内容与中心一致即视为 Org 知识生效。

## 13. 统一 SSO 员工 onboarding（v1.1）

运维 **只需在 VPS 建账号**，员工 **只登录一次**，无需在本机单独建 local 用户。

### 13.1 运维（每台新员工 PC 一次）

1. VPS 创建员工：[`scripts/org-phase0/vps-create-employee-runbook.md`](../scripts/org-phase0/vps-create-employee-runbook.md)（手动 curl 全流程）或 `vps-create-employee.sh`（单员工脚本）
2. 确认 VPS `/etc/aionorg/env` 含与员工机相同的 `JWT_SECRET`（见 §11、`configure-vps-jwt-secret.sh`）
3. 员工机填写（**勿提交 git**）：

   ```text
   %LOCALAPPDATA%\CCB-Wanding\config\sso.env
   AIONUI_SSO_MODE=org-idp
   JWT_SECRET=<与公司 VPS 相同>
   ```

   首次安装时 bootstrap 会从 `sso.env.example` 复制空模板；运维填入 secret 后再发账号。

4. 发送：安装包 + 用户名/密码 + 说明 **必须用开始菜单「CCB-Wanding」启动器**（`ccb-launch-aionui.cmd`），不要双击裸 `AionUi.exe`（否则子进程拿不到 `JWT_SECRET`）。

### 13.2 员工

1. 安装 CCB-Wanding
2. 从开始菜单启动（加载 `sso.env`）
3. 登录页输入 VPS 账号密码 **一次**
4. 聊天、组织知识库、报价 MCP 共用同一 JWT

### 13.3 验收

```powershell
cd D:\Projects\claude-code-best
.\scripts\org-phase0\verify-desktop.ps1          # 或 -Dev
# 应看到 org-session.token len>50、center reachable
python -m unittest admin.test_org_knowledge_client  # 在 python/ 目录
```

Dev SSO 测试：`.\scripts\org-phase0\start-aionui-dev-org-test.ps1`（读 `env.local`，无 bypass）。

### 13.4 与 Phase 0 双登录的关系

| 模式 | 何时 |
|------|------|
| **SSO** | 生产：`sso.env` 中 `AIONUI_SSO_MODE=org-idp` |
| **Phase 0** | 开发回退：未设 SSO 或 `AIONUI_SSO_MODE=off` — 先 local 再 silent org |

SSO 模式下 org 不可达时 **不会** 静默回退 local 登录（硬失败，需 VPN/防火墙放行 `:13401`）。

