# VPS Org API 部署清单（知识库 + 价格库 + 工作任务路由）

> **你做 VPS 端时按此执行。** 本地 dev 已接好 UI 与自编译 aioncore；Org 数据与 API 在 `67.216.206.3:13401`。

**前置：** Windows 已 `cargo build --release -p aionui-app`（或 `sync-dev-aioncore.ps1 -Build` 通过三路 smoke）。

**Verified 2026-06-27:** VPS build → 三路 **401**。  
**Verified 2026-06-28:** Price library active **v2 / 3082 products**（41-field full schema；import 用 `price_library_import_ready.xlsx`；POST 需 CSRF；验收 `version_number >= 2`）。

**Code-spec：** [`.trellis/spec/integration/price-library.md`](../../.trellis/spec/integration/price-library.md) — canonical paths, CSRF, wrong vs correct.

---

## 1. 上传并编译（Windows → VPS）

```powershell
cd D:\Projects\claude-code-best

# 生成价格库 import-ready（若尚未生成）
python scripts\org-phase0\prepare-price-library-import.py

# 上传 AionCore 源码 + data + bootstrap 脚本
.\scripts\deploy-org-aioncore-vps.ps1 -ExtractOnRemote
```

脚本在解压后会 **grep `org_knowledge_routes`**；失败则不要继续 build。

### 1.1 解压门禁（必做）

`deploy-org-aioncore-vps.ps1 -ExtractOnRemote` 在 2026-06-27 之前曾用错误 SSH 参数（无 `&&`），tarball 上传了但 **AionCore 未替换**。若 VPS 上：

```bash
grep org_knowledge_routes /opt/aionorg/AionCore/crates/aionui-app/src/router/routes.rs
```

**无输出** → 手动解压（无需重传）：

```bash
cd /opt/aionorg
rm -rf AionCore && mkdir -p AionCore
tar -xzf aioncore-upload.tgz -C AionCore
# SCHILY.fflags 警告可忽略
grep -n "org_knowledge\|work_tasks" AionCore/crates/aionui-app/src/router/routes.rs
```

有输出后再 `cargo build`。

---

## 2. VPS SSH 编译与重启

```bash
ssh -p 39222 root@67.216.206.3

# 若 tarball 已解压到 /opt/aionorg/AionCore：
cd /opt/aionorg/AionCore
cargo build --release -p aionui-app
# systemd 直接指向 target/release（无需 cp 到 bin/）：
#   /opt/aionorg/AionCore/target/release/aioncore
systemctl restart aionorg
systemctl status aionorg --no-pager | head -15
```

**已有 `data-org` 用户库时勿跑** `/opt/aionorg/bootstrap.sh`（会覆盖 `/etc/aionorg/env`，可能清掉 `JWT_SECRET`）。仅全新机用 bootstrap。

---

## 3. 环境变量（`/etc/aionorg/env`）

```bash
cat >> /etc/aionorg/env << 'EOF'
JWT_SECRET=<与员工 sso.env 相同 64 字符>
PRICE_ADMIN_USERNAMES=admin
AIONUI_ORG_KNOWLEDGE_SEED_DIR=/opt/aionorg/data
EOF
systemctl restart aionorg
```

`JWT_SECRET` 必须与员工机 `scripts/org-phase0/env.local` / `sso.env` 一致。

---

## 4. 路由 smoke（VPS 本机）

```bash
# 未登录应 401，不能 404
curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:13401/api/org-knowledge
curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:13401/api/price-library/active
curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:13401/api/work-tasks
```

期望：**401**（不是 404）。

---

## 5. 管理员登录后验收

```bash
LOGIN_JSON=$(curl -s -X POST http://127.0.0.1:13401/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"admin","password":"<密码>"}')
TOKEN=$(echo "$LOGIN_JSON" | python3 -c "import sys,json; print(json.load(sys.stdin).get('token',''))")

# 知识库列表
curl -s http://127.0.0.1:13401/api/org-knowledge \
  -H "Authorization: Bearer $TOKEN" | head -c 200

# 价格库：若尚未 publish，active 可能 version=null
curl -s http://127.0.0.1:13401/api/price-library/active \
  -H "Authorization: Bearer $TOKEN" | head -c 300
```

### 价格库首次导入（admin / price_admin）

详见 [`vps-price-library-runbook.md`](./vps-price-library-runbook.md) §2–§3：

1. `import/preview` + `import/apply`（`data/price_library_import_ready.xlsx`）
2. `draft/publish`
3. `GET /api/price-library/active` 应返回 `version` + `products` 数组

---

## 6. 员工桌面验收

员工机（已跑 canonical dev）：

```powershell
.\ccb-installer\scripts\start-dev-full.ps1 -SkipBootstrap
```

登录 **yjc** 后：

| 页面 | 期望 |
|------|------|
| `#/tasks` | 任务列表（非「服务未就绪」） |
| `#/org-knowledge` | 万鼎业务知识库正文（非 404） |
| `#/price-library` | 侧栏「价格库」+ 产品表格（VPS 已 publish 后） |

---

## 6.1 Behavior smoke（必做 — 服务 up ≠ 功能通）

`systemctl is-active`、源码 `grep`、甚至 `GET /api/auth/status` **不等于**新路由已可用。

每发布带新 mutation 的 aioncore 后，至少做 **一条** 真实成功路径，例如：

| 本次变更 | 最低冒烟 |
|----------|----------|
| `DELETE /api/org-users` | admin 删一个 smoke 用户 → **200**，列表消失 |
| `POST /api/org-users` | admin 建号 → **200/201** |
| 仅改 list 过滤 | `GET /api/org-users` 含 `admin` / `system_default_user` |

SQLite 多语句事务：见 [`.trellis/spec/integration/aioncore-sqlite-transactions.md`](../../.trellis/spec/integration/aioncore-sqlite-transactions.md)。

---

## 7. 回滚

- 恢复上一版 `/opt/aionorg/AionCore/target/release/aioncore`（或从备份复制）+ `systemctl restart aionorg`
- SQLite 向前兼容；价格库 draft 可丢弃后重新 import

**相关：** [`vps-price-library-runbook.md`](./vps-price-library-runbook.md) · [`minimal-shared-price-closure.md`](./minimal-shared-price-closure.md) · [`vps-create-employee-runbook.md`](./vps-create-employee-runbook.md) · [`deploy-org-aioncore-vps.ps1`](../deploy-org-aioncore-vps.ps1)
