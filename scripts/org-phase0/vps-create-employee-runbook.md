# VPS 员工账号创建 — 运维手册

> **适用：** 在 org VPS 上为 CCB-Wanding 员工创建登录账号（统一 SSO / Phase 0 共用）。  
> **密码：** 仅存 `env.local`（gitignored）、VPS `/root/org-phase0.env`、团队密码管理器 — **勿写入本仓库其它 tracked 文件**。  
> **相关：** [`README.md`](./README.md) · [`vps-create-employee.sh`](./vps-create-employee.sh) · [`.trellis/spec/integration/unified-org-sso-rollout.md`](../../.trellis/spec/integration/unified-org-sso-rollout.md) · [`docs/org-knowledge-deploy.md`](../../docs/org-knowledge-deploy.md) §13

**生产 VPS（2026-06）：**

| 项 | 值 |
|----|-----|
| Host | `67.216.206.3` |
| Org API | `http://67.216.206.3:13401` |
| SSH | `ssh -p 39222 root@67.216.206.3` |

---

## 0. 流程概览

```text
SSH 登录 VPS
  → admin /login 取 manager TOKEN
  → POST /api/users 创建员工
  → 员工 /login 冒烟
  → 本地 env.local 登记（追加，不覆盖已有员工）
  → 员工装 1.0.7+ exe，用 VPS 账号登录一次（SSO JIT）
```

运维**只需在 VPS 建号**；已分发的 exe（≥ 1.0.7）员工用该账号登录即可，本机用户由 JIT 自动创建。

---

## 1. SSH 登录

```bash
ssh -p 39222 -o PreferredAuthentications=password -o PubkeyAuthentication=no root@67.216.206.3
```

可选健康检查：

```bash
systemctl status aionorg --no-pager
curl -s http://127.0.0.1:13401/api/auth/status
```

期望：`aionorg` **active**；`needs_setup: false`。

---

## 2. Admin 登录并导出 TOKEN

从密码管理器或本机 `scripts/org-phase0/env.local` 读取 `ORG_ADMIN_PASSWORD`（**不要**在命令里写尖括号占位符）。

```bash
# 密码含 #、$ 等特殊字符时，必须用单引号包住 JSON 里的 password 值
LOGIN_JSON=$(curl -s -X POST http://127.0.0.1:13401/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"admin","password":"c#fFGRM54hy81BCZ"}')

echo "RAW LOGIN_JSON: $LOGIN_JSON"
```

**成功：** JSON 含 `"success":true` 且 `"token":"eyJ..."`；`user.work_task_role` 应为 **`manager`**。

```bash
export TOKEN=$(echo "$LOGIN_JSON" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('token') or d.get('data',{}).get('token') or '')")
echo "TOKEN len=${#TOKEN}"
```

期望：`TOKEN len=200` 左右（例如 244）。若为 `0` 或 `KeyError: 'token'`，见 §6 排错。

确认 admin 是 manager（否则 `POST /api/users` 会 403）：

```bash
curl -s http://127.0.0.1:13401/api/users \
  -H "Authorization: Bearer ${TOKEN}" | python3 -m json.tool | head -20
```

若 admin 仍是 `employee`，见 [Phase 0 spec §3.3](../../.trellis/spec/integration/org-knowledge-phase0-rollout.md)。

---

## 3. 创建员工账号

将 `NEW_USERNAME`、`NEW_PASSWORD` 换成实际值（创建后发给员工的密码须与此处一致）。

```bash
curl -s -X POST http://127.0.0.1:13401/api/users \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"username":"qps","password":"qps123456789","work_task_role":"employee"}'
```

**成功：**

```json
{"success":true,"data":{"id":"user_...","username":"NEW_USERNAME","work_task_role":"employee"}}
```

**已存在：** `success:false` 且 error 含 `already exists` — 无需重复创建，用 `GET /api/users` 核对即可。

---

## 4. 验证员工能 org 登录

```bash
curl -s -X POST http://127.0.0.1:13401/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"NEW_USERNAME","password":"NEW_PASSWORD"}'
```

期望：`"success":true` 且返回 `token`。  
**常见失误：** 验证时用了错误密码（例如创建时用 `lkx123456789`，验证却写 `123456`）。

列出全部成员：

```bash
curl -s http://127.0.0.1:13401/api/users \
  -H "Authorization: Bearer ${TOKEN}" | python3 -m json.tool
```

---

## 5. 登记到本机 `env.local`（追加，勿覆盖）

文件路径：`scripts/org-phase0/env.local`（**gitignored**）。

- `EMPLOYEE_USERNAME` / `EMPLOYEE_PASSWORD`：给 `vps-create-employee.sh` 等脚本用的**当前默认**员工（通常保留 pilot 账号如 `yjc`）。
- 每新增一人，**额外**增加一组变量，不要删掉已有员工：

```bash
# yjc — pilot（脚本默认槽位）
EMPLOYEE_USERNAME=yjc
EMPLOYEE_PASSWORD=...

# 新员工 — 创建日期 + VPS user id（可选注释）
EMPLOYEE_NEWUSERNAME_USERNAME=NEW_USERNAME
EMPLOYEE_NEWUSERNAME_PASSWORD=NEW_PASSWORD
```

同步到 VPS（可选，便于在 VPS 上跑脚本）：

```powershell
# Windows 项目根目录
scp -P 39222 scripts/org-phase0/env.local root@67.216.206.3:/root/org-phase0.env
```

在 VPS 上：`chmod 600 /root/org-phase0.env`

---

## 6. 员工电脑（统一 SSO，≥ 1.0.7）

1. 安装 **CCB-Wanding 1.0.7+**（推荐 **1.0.8+**；勿用 1.0.6 做 SSO 全量分发）。
2. 从开始菜单 **CCB-Wanding** 启动（`AionUiLauncher.exe` → `ccb-launch-aionui.cmd` 加载 `sso.env`）。
3. 登录页输入 **VPS 用户名 / 密码**（与 §3 一致）**一次**。
4. 验收（运维或员工机）：

```powershell
cd D:\Projects\claude-code-best
python scripts/org-phase0/_verify_jwt_crypto.py
.\scripts\org-phase0\verify-sso-jit.ps1
.\scripts\org-phase0\verify-desktop.ps1
```

详见 [`unified-org-sso-rollout.md`](../../.trellis/spec/integration/unified-org-sso-rollout.md)。

### 6.1 全量安装（NSIS）注意

| 项 | 建议 |
|----|------|
| **安装路径** | 默认 `%LOCALAPPDATA%\Programs\CCB-Wanding`；新机勿随意改 `D:\CCB-Wanding` |
| **装前** | 完全退出 WanD（任务管理器结束 `AionUi.exe`、`AionUiLauncher.exe`） |
| **D 盘已有旧目录** | 先备份后删除 `D:\CCB-Wanding`，或换默认路径安装 |

安装包下载：`http://67.216.206.3/updates/ccb/CCB-Wanding-{version}.exe`（以 manifest 为准）。

### 6.2 安装报错：`无法打开要写入的文件 ccb.ico`

**原因：** `ccb.ico` 被占用（WanD 未关、资源管理器打开安装目录、旧半截安装、杀毒锁定）。**不是** VPS 或 manifest 问题。

**处理（让员工按顺序）：**

1. 任务管理器结束 `AionUi.exe`、`AionUiLauncher.exe`、`electron`
2. 安装器点 **重试(R)**；仍失败则 **中止(A)**
3. PowerShell：

```powershell
Get-Process AionUi, AionUiLauncher, electron -ErrorAction SilentlyContinue | Stop-Process -Force
attrib -R "D:\CCB-Wanding\ccb.ico" 2>$null
Remove-Item -Recurse -Force "D:\CCB-Wanding" -ErrorAction SilentlyContinue
```

4. 重新运行安装包；或改用默认路径 `%LOCALAPPDATA%\Programs\CCB-Wanding`

> 用户配置在 `%LOCALAPPDATA%\CCB-Wanding\.claude`，删 `D:\CCB-Wanding` **不会**丢 Claude 设置。  
> **不要点「忽略」** — 缺 `ccb.ico` 快捷方式图标异常。

仍失败：`ccb-installer\scripts\repair-wanding-install-dir.ps1 -InstallDir "D:\CCB-Wanding" -Force` 后重装。

更多发版/更新排错： [`.trellis/spec/guides/wanding-update-runbook.md`](../../.trellis/spec/guides/wanding-update-runbook.md) §8。

---

## 7. 脚本化替代（单员工一键）

适合 `env.local` 里已写好**一名** `EMPLOYEE_USERNAME` / `EMPLOYEE_PASSWORD`：

```bash
source /root/org-phase0.env
bash /path/to/vps-create-employee.sh
```

脚本会：确保 admin 为 manager → admin login → `POST /api/users` → 员工 org login 冒烟。

---

## 8. 错误对照

| 现象 | 原因 | 处理 |
|------|------|------|
| `KeyError: 'token'` / `TOKEN len=0` | admin 密码错；或 JSON 里密码被 shell 解析（`<>`、`#` 等） | 用**单引号**包 password；勿复制 `<YOUR_PASSWORD>` 尖括号 |
| `CSRF_INVALID` on `POST /api/users` | `TOKEN` 未设置或为占位字符串 | 重做 §2；确认 `Authorization: Bearer ${TOKEN}` |
| `403 Only managers can create users` | admin 在 DB 里仍是 `employee` | Phase 0 spec §3.3 提升为 manager 后重登 |
| `already exists` | 用户名已存在 | `GET /api/users` 确认；改密需另走改密流程 |
| 员工 exe 登录弹回 / 本地 401 | `JWT_SECRET` 不一致或 1.0.6 空 secret | 见 `unified-org-sso-rollout.md` § Pack |
| NSIS 无法写入 `ccb.ico` | WanD 未关 / `D:\CCB-Wanding` 旧目录占用 | §6.2 |

---

## 9. Wrong vs Correct

| Wrong | Correct |
|-------|---------|
| `"password":"<c#xxx>"` 带尖括号 | `"password":"c#xxx"` 单引号包整段 JSON |
| 更新 `env.local` 时覆盖掉 `yjc` | 保留 `EMPLOYEE_*`，新人用 `EMPLOYEE_<name>_*` 追加 |
| 创建密码与验证密码不一致 | §3 与 §4 使用同一 `NEW_PASSWORD` |
| 把真实密码写进本 markdown 或 commit | 仅 `env.local` / 密码管理器 |
| 安装时选 `D:\CCB-Wanding` 且未清旧目录 | 用默认路径，或装前退出 WanD 并删旧目录（§6.2） |

---

## 10. 快速复制块（填变量后执行）

```bash
# --- 变量（在 VPS 上 export，勿提交 git）---
# export NEW_USERNAME=...
# export NEW_PASSWORD=...
# export ADMIN_PASSWORD=...   # 从密码管理器读取

LOGIN_JSON=$(curl -s -X POST http://127.0.0.1:13401/login \
  -H 'Content-Type: application/json' \
  -d "{\"username\":\"admin\",\"password\":\"${ADMIN_PASSWORD}\"}")

export TOKEN=$(echo "$LOGIN_JSON" | python3 -c "import json,sys; print(json.load(sys.stdin).get('token',''))")
echo "TOKEN len=${#TOKEN}"

curl -s -X POST http://127.0.0.1:13401/api/users \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"${NEW_USERNAME}\",\"password\":\"${NEW_PASSWORD}\",\"work_task_role\":\"employee\"}"

curl -s -X POST http://127.0.0.1:13401/login \
  -H 'Content-Type: application/json' \
  -d "{\"username\":\"${NEW_USERNAME}\",\"password\":\"${NEW_PASSWORD}\"}"
```

---

*Last updated: 2026-06-23 — liankexin 建号流程 + §6.2 ccb.ico 安装占用排错。*
