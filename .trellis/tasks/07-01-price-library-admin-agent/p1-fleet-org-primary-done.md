# P-1 完成记录 — Fleet org-primary + VPS supplier (018)

> **完成日期：** 2026-07-01  
> **阻塞解除：** P3 E2E（quotation 读 org v3 + supplier）可开始  
> **VPS 验收：** `version_number=3`，3299 products，294 with `supplier`

---

## 目标

1. VPS 部署含 migration **018** 的 AionCore，发布 42 列 `price_library_import_ready.xlsx`
2. 本地 fleet/dev 移除 `PRICE_USE_BUNDLED_FIRST`，quotation MCP 走 org API

---

## 正确操作路线（下次按此顺序）

### Phase A — Windows 准备

```powershell
cd D:\Projects\claude-code-best

# 1) 生成 import-ready（若 xlsx 已是最新可跳过）
python scripts/org-phase0/prepare-price-library-import.py
# 产出: data/price_library_import_ready.xlsx (42 列, ~3299 行)

# 2) 上传 AionCore 源码 + data（关 VPN 再 SSH/scp，避免 fail2ban）
.\scripts\deploy-org-aioncore-vps.ps1 -ExtractOnRemote
```

**若 deploy 在中途 scp 断线（常见）：**

- 628MB `aioncore-upload.tgz` 通常已上传成功
- **不必重传 tarball**；VPS 上手动解压即可（见 Phase B §1）

**仅更新 xlsx 时：**

```powershell
scp -P 39222 -o PreferredAuthentications=password -o PubkeyAuthentication=no `
  data/price_library_import_ready.xlsx root@67.216.206.3:/opt/aionorg/data/
```

### Phase B — VPS SSH（`ssh -p 39222 root@67.216.206.3`，关 VPN）

**已有 `data-org` 用户库 → 勿跑 `bootstrap.sh`**（会覆盖 `/etc/aionorg/env` 里的 `JWT_SECRET`）。

#### 1. 解压（若 `-ExtractOnRemote` 未完成）

```bash
cd /opt/aionorg
ls -lh aioncore-upload.tgz          # 应 ~629M
rm -rf AionCore && mkdir -p AionCore
tar -xzf aioncore-upload.tgz -C AionCore
ls AionCore/crates/aionui-db/migrations/018_price_library_supplier.sql
grep -q org_knowledge_routes AionCore/crates/aionui-app/src/router/routes.rs && echo routes OK
```

#### 2. 编译 + 重启

```bash
source "$HOME/.cargo/env"
cd /opt/aionorg/AionCore
cargo build --release -p aionui-app

grep -q PRICE_ADMIN_USERNAMES /etc/aionorg/env || echo 'PRICE_ADMIN_USERNAMES=admin' >> /etc/aionorg/env
# 勿 cat > 覆盖整个 env 文件

systemctl restart aionorg
systemctl status aionorg --no-pager | head -15
```

#### 3. 验证 migration 018（无 sqlite3 CLI 时用 python3）

```bash
python3 << 'PY'
import sqlite3
db="/opt/aionorg/data-org/aionui-backend.db"
c=sqlite3.connect(db)
print("migrations:", [r[0] for r in c.execute("SELECT version FROM _sqlx_migrations ORDER BY version")])
cols=[r[1] for r in c.execute("PRAGMA table_info(price_products)")]
print("supplier column:", "supplier" in cols)
PY

curl -s -o /dev/null -w "active => %{http_code}\n" http://127.0.0.1:13401/api/price-library/active
# 期望 401（不是 404）
```

#### 4. Import preview → apply → publish（admin + CSRF）

```bash
CJ=/tmp/aionorg.cookies
IMPORT_FILE=/opt/aionorg/data/price_library_import_ready.xlsx

curl -s -c "$CJ" http://127.0.0.1:13401/api/auth/status -o /dev/null
CSRF=$(grep aionui-csrf-token "$CJ" | awk '{print $NF}')

LOGIN_JSON=$(curl -s -X POST http://127.0.0.1:13401/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"admin","password":"YOUR_ADMIN_PASS"}')
TOKEN=$(echo "$LOGIN_JSON" | python3 -c "import json,sys; print(json.load(sys.stdin).get('token') or '')")

# preview → apply → publish（revision 从 apply 响应取）
curl -s -X POST .../import/preview -b "$CJ" -H "Authorization: Bearer $TOKEN" -H "x-csrf-token: $CSRF" -F "file=@${IMPORT_FILE}" | python3 -m json.tool | head -20
curl -s -X POST .../import/apply   ...  # 同上
curl -s -X POST .../draft/publish -H 'Content-Type: application/json' \
  -d '{"reason":"full schema v2 with supplier","revision":REVISION_FROM_APPLY}' ...
```

完整 curl 见 [`scripts/org-phase0/vps-price-library-runbook.md`](../../../scripts/org-phase0/vps-price-library-runbook.md) §3。

**2026-07-01 实测 publish 结果：**

| 字段 | 值 |
|------|-----|
| `version_number` | 3 |
| `item_count` | 3299 |
| `with_supplier` (API + DB) | 294 |

### Phase C — Windows fleet revert

1. `ccb-installer/scripts/ensure-wanding-settings.ps1` — 移除 `PRICE_USE_BUNDLED_FIRST=1` ✅ 2026-07-01
2. `ccb-installer/scripts/sync-dev-wanding-vendor.ps1` — smoke 改验 `source=org_api` + supplier ✅
3. 员工：刷新 settings / 新 Guid 会话
4. 烟测：

```powershell
$env:PYTHONPATH = "D:\Projects\claude-code-best\python"
$env:AIONUI_APPDATA_PROFILE = "AionUi-Dev"
python -c "from admin.org_price_client import get_price_data, invalidate_price_cache; invalidate_price_cache(); d=get_price_data(force_refresh=True); print('source', d.get('source')); print('products', len(d.get('products') or [])); print('with_supplier', sum(1 for p in (d.get('products') or []) if p.get('supplier')))"
```

期望：`source org_api`，products 3299，with_supplier 294。

---

## 运维坑位（本次踩过）

| 现象 | 原因 | 处理 |
|------|------|------|
| deploy 628MB 成功后 scp 小文件 `Connection closed` | 连续 password scp + fail2ban / VPN | 关 VPN；VPS 手动解压；不必重传 tarball |
| `sqlite3: command not found` | VPS 未装 CLI | 用 `python3` + sqlite3 模块 |
| `bootstrap.sh` 误跑 | 已有 data-org | 只用 `cargo build` + `systemctl restart` |
| preview 大量 `unchanged` | VPS 已有旧 publish | 正常；看 `create`/`update` + `error_count:0` |
| quotation 仍读 bundled | MCP env 未刷新 / 旧会话 | 跑 `ensure-wanding-settings -UpdateSettings` + **新开会话** |

---

## 相关文档

- Spec：`.trellis/spec/integration/price-library.md`
- Runbook：`scripts/org-phase0/vps-price-library-runbook.md`
- 员工验收：`scripts/org-phase0/minimal-shared-price-closure.md` §C
- **UI supplier 列：** `.trellis/tasks/07-03-price-library-supplier-ui-column/`（2026-07-02 完成）
