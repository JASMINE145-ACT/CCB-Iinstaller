# VPS 价格库部署 — 运维手册（PR2）

> **适用：** 在已有 org VPS（`aionorg` systemd）上启用 `/api/price-library/*`。  
> **依赖：** 自编译 AionCore 含 `aionui-price-library` crate（migration `016` + **`017` full schema** + **`018` supplier**）。  
> **v2 全列交接：** [`vps-price-library-v2-handoff.md`](./vps-price-library-v2-handoff.md)（2026-06-28）  
> **P-1 完整路线（018 + supplier + fleet revert）：** [`.trellis/tasks/07-01-price-library-admin-agent/p1-fleet-org-primary-done.md`](../../.trellis/tasks/07-01-price-library-admin-agent/p1-fleet-org-primary-done.md)（2026-07-01）
> **相关：** [`docs/org-knowledge-deploy.md`](../../docs/org-knowledge-deploy.md) · [`deploy-org-aioncore-vps.ps1`](../deploy-org-aioncore-vps.ps1) · [PRD](../../.trellis/tasks/06-27-remote-shared-price-library/prd.md)

**生产 VPS（2026-06）：**

| 项 | 值 |
|----|-----|
| Host | `67.216.206.3` |
| Org API | `http://67.216.206.3:13401` |
| SSH | `ssh -p 39222 root@67.216.206.3` |

---

## 0. 流程概览

```text
Windows: prepare-price-library-import.py → import_ready xlsx (42 列)
  → deploy-org-aioncore-vps.ps1 -ExtractOnRemote（或 scp 仅 ready 文件）
  → [若 scp 中断] VPS 手动 tar 解压 aioncore-upload.tgz — 不必重传 628MB
  → VPS: cargo build + systemctl restart（已有 data-org 勿跑 bootstrap.sh）
  → 验证 migration 018 + supplier 列（python3 / sqlite3）
  → PRICE_ADMIN_USERNAMES=admin
  → admin 登录 → import/preview → import/apply → draft/publish
  → GET /api/price-library/active 验收（v3+, supplier 行）
  → Windows: 移除 ensure-wanding-settings.ps1 中 PRICE_USE_BUNDLED_FIRST
```

**SSH 注意：** 关 VPN；连续 password scp 易触发 fail2ban → 大 tarball 传完后可 SSH 手动继续。

价格库 **内容** 不走 CCB hot-update；仅 org 服务部署变更。

---

## 1. Windows 上传（自动化）

在开发机 PowerShell：

```powershell
cd D:\Projects\claude-code-best
.\scripts\deploy-org-aioncore-vps.ps1 -ExtractOnRemote
```

上传内容：

- `AionCore/` 源码 tarball（含 `aionui-price-library`）
- `data/wanding_business_knowledge.md`
- `data/price_library_cleaned_2026_05_15.xlsx`（原始清洗表，非直接导入）
- `data/price_library_import_ready.xlsx`（列映射后可导入，见 §1.1）

### 1.1 本地生成 import-ready 工作簿（必须先做）

原始 `price_library_cleaned_2026_05_15.xlsx` 有 **581** 行 `price_a`–`price_d` 全空；解析器遇错即停，**不能**直接 import。

在开发机：

```powershell
cd D:\Projects\claude-code-best
python scripts/org-phase0/prepare-price-library-import.py
```

产出：

| 文件 | 说明 |
|------|------|
| `data/price_library_import_ready.xlsx` | **3082** 行可导入，**41 列**全字段（税价映射 + 去重） |
| `data/price_library_import_skipped.json` | **33** 行跳过 + **752** 行去重记录 |

映射规则（**仅当目标 abcd 单元格为空时**写入，不覆盖已有档位价）：

- `price_b` ← `local_inc_tax`，否则 `local_exc_tax`
- `price_c` ← `factory_inc_tax`，否则 `factory_exc_tax`
- 重复 `material`：**保留 `is_preferred_price=True` 行**（与 `data/data.Md`、报价 matcher 一致；被弃用的 LESSO 行带 `superseded_by_source=PE PIPA`）

仅更新 ready 文件时，可 `scp` 到 VPS：

```powershell
scp -P 39222 data/price_library_import_ready.xlsx root@67.216.206.3:/opt/aionorg/data/
```

---

## 2. VPS 编译与重启（手动 SSH）

> **已有 `data-org` 用户库：** 只跑本节 `cargo build` + `systemctl restart`。**不要**跑 `/opt/aionorg/bootstrap.sh`（会覆盖 `/etc/aionorg/env` 中的 `JWT_SECRET`）。

```bash
ssh -p 39222 root@67.216.206.3
cd /opt/aionorg
# 若 deploy 在 scp 阶段中断但 aioncore-upload.tgz 已在：
# rm -rf AionCore && mkdir -p AionCore && tar -xzf aioncore-upload.tgz -C AionCore

source "$HOME/.cargo/env"
cd /opt/aionorg/AionCore
cargo build --release -p aionui-app

# 追加 env（勿 cat > 覆盖整个文件）
grep -E 'JWT_SECRET|PRICE_ADMIN' /etc/aionorg/env
grep -q PRICE_ADMIN_USERNAMES /etc/aionorg/env || echo 'PRICE_ADMIN_USERNAMES=admin' >> /etc/aionorg/env

systemctl restart aionorg
sleep 2
systemctl status aionorg --no-pager | head -15
curl -s http://127.0.0.1:13401/api/auth/status

# migration 018（无 sqlite3 CLI 时）
python3 << 'PY'
import sqlite3
db="/opt/aionorg/data-org/aionui-backend.db"
c=sqlite3.connect(db)
print([r[0] for r in c.execute("SELECT version FROM _sqlx_migrations ORDER BY version")])
print("supplier:", "supplier" in [r[1] for r in c.execute("PRAGMA table_info(price_products)")])
PY
```

日志应含：`startup: price-library price_admin count resolved` 且 `admin_count >= 1`。

---

## 3. 初始 Excel 导入（手动）

> **CSRF：** 所有 `POST`（import/preview、import/apply、draft/publish）除 `/login` 外必须带 **cookie jar + `x-csrf-token`**。仅 `Authorization: Bearer` 会 `CSRF_INVALID`。见 [`.trellis/spec/integration/price-library.md`](../../.trellis/spec/integration/price-library.md) § VPS CSRF contract。

从密码管理器取 admin 密码，在 VPS 上：

```bash
CJ=/tmp/aionorg.cookies
IMPORT_FILE=/opt/aionorg/data/price_library_import_ready.xlsx

# 0) CSRF cookie
curl -s -c "$CJ" http://127.0.0.1:13401/api/auth/status -o /dev/null
CSRF=$(grep aionui-csrf-token "$CJ" | awk '{print $NF}')
echo "CSRF len=${#CSRF}"

# 1) 登录（密码用单引号包 JSON，避免 # 等被 shell 吃掉）
LOGIN_JSON=$(curl -s -X POST http://127.0.0.1:13401/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"admin","password":"YOUR_ADMIN_PASS"}')

TOKEN=$(echo "$LOGIN_JSON" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('token') or '')")
echo "TOKEN len=${#TOKEN}"

# 2) 预览（不修改 draft）
curl -s -X POST http://127.0.0.1:13401/api/price-library/import/preview \
  -b "$CJ" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "x-csrf-token: ${CSRF}" \
  -F "file=@${IMPORT_FILE}" \
  | python3 -m json.tool | head -40

# 3) 应用到 draft（仍不发布）
curl -s -X POST http://127.0.0.1:13401/api/price-library/import/apply \
  -b "$CJ" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "x-csrf-token: ${CSRF}" \
  -F "file=@${IMPORT_FILE}" \
  | python3 -m json.tool

# 4) 查看 draft revision
DRAFT_JSON=$(curl -s http://127.0.0.1:13401/api/price-library/draft \
  -H "Authorization: Bearer ${TOKEN}")
echo "$DRAFT_JSON" | python3 -m json.tool | head -20
REV=$(echo "$DRAFT_JSON" | python3 -c "import json,sys; d=json.load(sys.stdin); print((d.get('data') or {}).get('revision',''))")
echo "draft revision=$REV"

# 5) 发布 draft（revision 必填；reason 建议注明 schema，如 "full schema v2"）
curl -s -X POST http://127.0.0.1:13401/api/price-library/draft/publish \
  -b "$CJ" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "x-csrf-token: ${CSRF}" \
  -H 'Content-Type: application/json' \
  -d "{\"reason\":\"initial migration from production workbook\",\"revision\":${REV}}" \
  | python3 -m json.tool

# 6) 验收 active（看 version_number，不要只数 JSON 里别的字段）
curl -s http://127.0.0.1:13401/api/price-library/active \
  -H "Authorization: Bearer ${TOKEN}" \
  | python3 -c "import json,sys; d=json.load(sys.stdin).get('data') or {}; v=d.get('version') or {}; print('version_number', v.get('version_number')); print('products', len(d.get('products') or []))"
```

期望：`version_number >= 2`（full schema fleet；**v3** 含 supplier 2026-07-01），`products` ≈ **3299**；spot-check `supplier`（约 **294** 行非空）。

**已 publish 后重跑 apply：** 常见 `skipped_unchanged_count: 3082`；再 `publish` 可能 `draft has no items` — 用 step 6 确认 active 即可，不必重复 publish。

---

## 4. API 速查（PR2）

| 方法 | 路径 | 权限 |
|------|------|------|
| GET | `/api/price-library/active` | 任意已登录 org 用户 |
| GET | `/api/price-library/versions` | 任意已登录 |
| GET | `/api/price-library/versions/:id` | 任意已登录 |
| GET | `/api/price-library/audit?limit=100` | 任意已登录 |
| GET | `/api/price-library/export` | 任意已登录（下载 xlsx） |
| GET | `/api/price-library/draft` | `price_admin` |
| POST | `/api/price-library/draft/items` | `price_admin` |
| POST | `/api/price-library/draft/publish` | `price_admin` |
| POST | `/api/price-library/versions/:id/revert` | `price_admin` |
| POST | `/api/price-library/import/preview` | `price_admin`，multipart `file` |
| POST | `/api/price-library/import/apply` | `price_admin`，multipart `file` |

`price_admin` 由环境变量 `PRICE_ADMIN_USERNAMES`（逗号分隔）配置，**不可**通过 AionUI 授予。

---

## 5. 排错

| 现象 | 处理 |
|------|------|
| `403 price_admin permission required` | 检查 `/etc/aionorg/env` 中 `PRICE_ADMIN_USERNAMES`，`systemctl restart aionorg` |
| `admin_count: 0` 启动日志 | 同上；未配置则无人能 publish/import |
| `import validation failed` | 先调 `import/preview`，查看 `errors` 数组（重复 material、缺列等） |
| `row N: at least one price column required` | 用了原始 xlsx；改跑 `prepare-price-library-import.py` 并用 `*_import_ready.xlsx` |
| `import validation failed with 752 error(s)` | ready 文件未去重；重新跑 prepare 脚本并 scp 新 xlsx（应 `error_count: 0`） |
| `409 revision conflict` on publish | 重新 `GET /draft` 取最新 `revision` |
| `CSRF_INVALID` on import/publish | POST 缺 cookie + `x-csrf-token`；见 §3 与 `price-library.md` |
| `draft has no items` on publish | 常表示已 publish；`GET /active` 查 `version_number` + `products` |
| `skipped_unchanged_count: 3082` on apply | 数据已在库；非失败 |
| `404` on `/api/price-library/*` | VPS 二进制过旧，需 `cargo build` 含 price-library crate |
| deploy scp 中断 exit 255 | tarball 可能已上传；SSH 手动解压，不必重传 628MB |
| `Connection closed` SSH | VPN/fail2ban；关 VPN，必要时 VPS 解 ban |
| 已有 `data-org` 库 | migration 自动应用；**勿 bootstrap**；016–018 在启动时跑 |

---

## 6. 回滚

- **内容回滚：** `POST /api/price-library/versions/:id/revert`（创建新版本，不删历史）
- **服务回滚：** 恢复上一版 `aioncore` 二进制 + `systemctl restart aionorg`（SQLite 向前兼容）
- **客户端：** 报价运行时仍可用 bundled seed / LKG（PR3）；org 不可达时见 PRD §Bootstrap

---

## 变更记录

| 日期 | 说明 |
|------|------|
| 2026-06-27 | PR2：Excel import preview/apply、export、audit API + VPS runbook |
| 2026-06-27 | 迁移脚本 `prepare-price-library-import.py`；import 改用 `price_library_import_ready.xlsx` |
| 2026-06-28 | §3 CSRF cookie jar；验收 `version_number >= 2` + `products`；fleet **v2** 3082 full schema verified |
| 2026-07-01 | migration **018** + supplier publish **v3/3299**；deploy 中断恢复；P-1 fleet revert 记录见 task `p1-fleet-org-primary-done.md` |
