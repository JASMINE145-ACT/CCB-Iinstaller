# 共享远端价格 — 最小闭环（查价 + 共同更新）

> **目标：** 所有人「价格查」走 VPS org 同一份 active；管理员 VPS publish 后，大家下次查价自动变。  
> **不做：** AionUI 改价界面、报价单 stale 水印、legacy smoke 清理。

---

## 分工

| 谁 | 做什么 |
|----|--------|
| **Agent / Windows 本机** | 生成 `import_ready` xlsx、`sync-dev-wanding-vendor`、dev 启动说明 |
| **你（VPS SSH）** | import → apply → publish、改价验收 |
| **你（员工机）** | `start-dev-full` 登录、UI + 报价对拍 |

---

## A. 本机（Agent 或你 PowerShell）

### A1. 生成可导入工作簿（若尚无）

```powershell
cd D:\Projects\claude-code-best
python scripts\org-phase0\prepare-price-library-import.py
# 产出: data\price_library_import_ready.xlsx
```

### A2. 同步报价 Python（含 org_price_client）

```powershell
.\ccb-installer\scripts\sync-dev-wanding-vendor.ps1
# 可选烟测: -Smoke
```

### A3. 上传到 VPS

```powershell
scp -P 39222 data\price_library_import_ready.xlsx root@67.216.206.3:/opt/aionorg/data/
```

### A4. 员工 dev

```powershell
.\ccb-installer\scripts\start-dev-full.ps1 -SkipBootstrap
```

登录 org 账号（如 yjc）后：

- `#/price-library` — 应有产品行（VPS publish 后）
- 新会话报价查价 — 应走 org（见 §C）

---

## B. VPS（仅你能做 — SSH）

```bash
ssh -p 39222 root@67.216.206.3
```

确认 env（**保留已有 JWT_SECRET**，只补缺失项）：

```bash
grep -E 'JWT_SECRET|PRICE_ADMIN' /etc/aionorg/env
# 缺则: PRICE_ADMIN_USERNAMES=admin
```

### B1. 首次灌库 + publish

> **CSRF：** 见 [`vps-price-library-runbook.md`](./vps-price-library-runbook.md) §3。仅 Bearer → `CSRF_INVALID`。

```bash
CJ=/tmp/aionorg.cookies
IMPORT_FILE=/opt/aionorg/data/price_library_import_ready.xlsx

curl -s -c "$CJ" http://127.0.0.1:13401/api/auth/status -o /dev/null
CSRF=$(grep aionui-csrf-token "$CJ" | awk '{print $NF}')

LOGIN_JSON=$(curl -s -X POST http://127.0.0.1:13401/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"admin","password":"YOUR_ADMIN_PASS"}')
TOKEN=$(echo "$LOGIN_JSON" | python3 -c "import json,sys; print(json.load(sys.stdin).get('token',''))")

curl -s -X POST http://127.0.0.1:13401/api/price-library/import/apply \
  -b "$CJ" -H "Authorization: Bearer ${TOKEN}" -H "x-csrf-token: ${CSRF}" \
  -F "file=@${IMPORT_FILE}" | python3 -m json.tool | head -20

DRAFT_JSON=$(curl -s http://127.0.0.1:13401/api/price-library/draft -H "Authorization: Bearer ${TOKEN}")
REV=$(echo "$DRAFT_JSON" | python3 -c "import json,sys; print((json.load(sys.stdin).get('data') or {}).get('revision',''))")

curl -s -X POST http://127.0.0.1:13401/api/price-library/draft/publish \
  -b "$CJ" -H "Authorization: Bearer ${TOKEN}" -H "x-csrf-token: ${CSRF}" \
  -H 'Content-Type: application/json' \
  -d "{\"reason\":\"initial fleet publish\",\"revision\":${REV}}" | python3 -m json.tool
```

验收：

```bash
curl -s http://127.0.0.1:13401/api/price-library/active \
  -H "Authorization: Bearer ${TOKEN}" | python3 -c "
import json,sys
d=json.load(sys.stdin).get('data') or {}
v=d.get('version') or {}
print('version_number', v.get('version_number'))
print('products', len(d.get('products') or []))
"
```

期望：`version_number >= 1`，`products` ≈ **3082**。

### B2. 证明「共同更新」

1. 记下某 `material_code` 的 `price_b`
2. 用 draft API 改价 → `draft/publish`（或 re-import 小表）
3. 员工机刷新 `#/price-library` 或 **新开对话** 再查同一物料 — 单价应变化

改价细节见 [`vps-price-library-runbook.md`](./vps-price-library-runbook.md) §3–§4。

---

## C. 员工机验收（共同远端查价）

**UI 路径：** `#/price-library` → 数据来自 `GET /api/price-library/active`（已是共同远端）。

**报价查价路径：** MCP → `vendor/wanding/python` → `org_price_client.get_price_data()`  
前提：§A2 vendor 已同步 + 已 org 登录 + VPS 已 publish。

快速自检（本机 PowerShell，已登录 dev）：

```powershell
cd D:\Projects\claude-code-best
$env:PYTHONPATH = "D:\CCB-Wanding\vendor\wanding\python;D:\Projects\claude-code-best\python"
python -c "
from admin.org_price_client import get_price_data
d = get_price_data()
print('source', d.get('source'))
print('products', len(d.get('products') or []))
print('stale', d.get('stale'))
"
```

期望：`source=org_api`，`products` > 0。

报价 MCP：**必须新开会话**（子进程才加载新 python）。

---

## 故障速查

| 现象 | 原因 | 处理 |
|------|------|------|
| 价格库页空 | VPS 未 publish | §B1 |
| `source=bundled_seed` | 未登录 / 无 token / VPS 无 active | org 登录 + §B1 |
| UI 有价、报价无价 | vendor 未 sync | §A2 + 新会话 |
| import 失败 | 用了未清洗 xlsx | 必须用 `import_ready` |
| `CSRF_INVALID` | POST 无 cookie/header | runbook §3 CSRF 模式 |
| `draft has no items` | 已 publish | 查 `GET /active` 的 `version_number` |

---

**相关：** [`vps-price-library-runbook.md`](./vps-price-library-runbook.md) · [`.trellis/spec/integration/price-library.md`](../../.trellis/spec/integration/price-library.md)
