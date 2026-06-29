# VPS 交接 — 价格库 full schema v2（你来操作）

> 本地已完成：代码 + migration `017`、41 列 import/export、AionUI 表格、`import_ready.xlsx`（3082 行 / 41 列头）、dev bundled aioncore 已 sync。  
> **你只需：** 部署新 binary → 重新 import/publish → 验收 v2。

---

## 0. 本地已就绪（无需重复）

| 项 | 状态 |
|----|------|
| `data/price_library_import_ready.xlsx` | ✅ 3082 行，**41 列**（`prepare-price-library-import.py` 已跑） |
| AionCore full schema | ✅ `cargo test -p aionui-price-library` 21 pass |
| Dev bundled binary | ✅ `D:\CCB-Wanding\...\bundled-aioncore\win32-x64\aioncore.exe`（alternate build `target-fullschema`） |
| AionUI 41 列 UI | ✅ `aionui-src` — 重启 `start-dev-full.ps1` 后看 `#/price-library` |

---

## 1. 上传（Windows）

```powershell
cd D:\Projects\claude-code-best
.\scripts\deploy-org-aioncore-vps.ps1 -ExtractOnRemote
```

**Extract 后必查（防 silent fail）：**

```bash
ssh -p 39222 root@67.216.206.3 "grep -c price_library_routes /opt/aionorg/AionCore/crates/aionui-app/src/router/routes.rs; grep 017_price_library /opt/aionorg/AionCore/crates/aionui-db/migrations/*.sql"
```

应看到 routes 命中 + `017_price_library_full_schema.sql`。

仅更新 xlsx 时：

```powershell
scp -P 39222 data/price_library_import_ready.xlsx root@67.216.206.3:/opt/aionorg/data/
```

---

## 2. VPS 编译重启

```bash
ssh -p 39222 root@67.216.206.3
source "$HOME/.cargo/env"
cd /opt/aionorg/AionCore
cargo build --release -p aionui-app    # ~15–20 min
systemctl restart aionorg
sleep 2
curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:13401/api/price-library/active
# 期望 401（不是 404）
```

systemd 二进制路径：`/opt/aionorg/AionCore/target/release/aioncore`（**不是** `/opt/aionorg/bin/`）。

首次启动会自动跑 migration **017**（在 016 之上 ADD COLUMN，v1 旧行扩展列为 NULL）。

---

## 3. 重新 import + publish v2

完整 CSRF 流程见 [`vps-price-library-runbook.md`](./vps-price-library-runbook.md) §3。

要点：

1. cookie jar + `x-csrf-token`（POST 必填）
2. `import/preview` → `import/apply` → `draft/publish`（reason 例：`full schema v2`）
3. v1 仍在 history；**active 应变为 v2**

---

## 4. 验收（v2 必须看扩展列，不能只看条数）

```bash
# 登录拿 TOKEN 后：
curl -s http://127.0.0.1:13401/api/price-library/active \
  -H "Authorization: Bearer ${TOKEN}" \
  | python3 -c "
import json,sys
d=json.load(sys.stdin)['data']
v=d['version']; p=d['products']
print('version', v['version_number'], 'count', len(p))
# RUCIKA 样例行 — 应有 product_type / factory / price_b 等
r=next(x for x in p if str(x.get('material_code','')).startswith('10012005'))
keys=['product_type','factory_inc_tax','price_b','price_d','description_cn']
print({k:r.get(k) for k in keys})
"
```

**Pass 标准：**

| 检查 | 期望 |
|------|------|
| `version_number` | **≥ 2** |
| `len(products)` | **3082** |
| RUCIKA 行 `product_type` | 非 null（如 `RUCIKA JIS`） |
| RUCIKA 行 `price_b` / `factory_inc_tax` | 至少一个有数 |
| AionUI `#/price-library` | 表头 **41 列**，横向滚动 |

若扩展列全 null → binary 太旧或 import 用了截断 xlsx；若仍 v1 → publish 未成功。

---

## 5. 常见问题

| 现象 | 处理 |
|------|------|
| POST `CSRF_INVALID` | cookie + `x-csrf-token` |
| `404` on `/active` | routes 未 wired → 重 deploy + grep |
| `skipped_unchanged_count: 3082` | 正常若 draft 已有相同数据；仍须 **publish** 才升 v2 |
| UI 仍 7 列 | 刷新 aionui-src dev；旧 Electron 缓存 |
| UI 41 列但全 `—` | VPS 仍 v1 数据 → 完成 §3 |

---

**完成后：** 在 `full-schema-2026-06-28.md` 勾选 VPS 项，或回复「v2 ok」关 task。
