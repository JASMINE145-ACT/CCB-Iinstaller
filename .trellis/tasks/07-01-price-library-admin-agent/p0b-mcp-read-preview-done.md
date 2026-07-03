# P0B 完成记录 — price-library MCP 只读 + confirmed 预览

> **完成日期：** 2026-07-02  
> **下一里程碑：** P0C — `publish_price_library_draft`（revision 两阶段 + 409）  
> **任务：** `07-01-price-library-admin-agent`

---

## 目标

1. 独立 `price-library` MCP（不扩 `quotation-server`）
2. Python admin client：GET active/draft/export；POST draft/items + CSRF
3. `confirmed=false` 本地 preview（不 mutate 共享 draft）
4. 单元测试 + code-review + vendor sync

---

## 交付文件

| 层 | 路径 |
|----|------|
| Client | `python/admin/org_price_admin_client.py` |
| Preview | `python/admin/org_price_admin_preview.py`, `org_price_admin_payloads.py` |
| Dispatch | `python/admin/org_price_admin_dispatch.py` |
| MCP entry | `python/price_library_main.py`, `system/price_library_tool_dispatch.py` |
| MCP server | `mcp_servers/price-library-server/dist/` |
| Tests | `python/tests/test_org_price_admin_client.py` |
| Registry | `ccb-installer/ccb-mcp.json`, `ensure-wanding-settings.ps1`, `sync-dev-wanding-vendor.ps1` |

---

## MCP 工具（P0B 已注册）

| Tool | 状态 |
|------|------|
| `get_price_library_active` | ✅ |
| `get_price_library_draft` | ✅（price_admin） |
| `export_price_library` | ✅ |
| `upsert_price_library_item` | ✅ preview + apply |
| `delete_price_library_item` | ✅ preview + apply |
| `restore_price_library_item` | ✅ preview + apply |
| `publish_price_library_draft` | ❌ P0C |
| `preview_price_library_import` / `apply` | ❌ P0D |
| `revert_price_library_version` | ❌ P0D |

---

## 验证凭据

| 检查 | 结果 |
|------|------|
| `python -m pytest python/tests/test_org_price_admin_client.py` | **10 passed** |
| code-reviewer | **PASS**（confirmed 预览、CSRF、403 映射、MCP 分离） |
| Live `get_price_library_active` | **v3 / 3299 products** |
| `sync-dev-wanding-vendor.ps1 -UpdateSettings` | ✅ |

---

## 开发烟测

```powershell
cd D:\Projects\claude-code-best
.\ccb-installer\scripts\sync-dev-wanding-vendor.ps1 -UpdateSettings

# Python dispatch（需 AionUi-Dev org 登录 token）
$env:PYTHONPATH = "D:\Projects\claude-code-best\python"
$env:ORG_SERVER_URL = "http://67.216.206.3:13401"
$env:AIONUI_APPDATA_PROFILE = "AionUi-Dev"
$env:ORG_SESSION_TOKEN_FILE = "$env:APPDATA\AionUi-Dev\aionui\org-session.token"
python -c "from system.price_library_tool_dispatch import handle_request; r=handle_request({'tool':'get_price_library_active','params':{}}); print(r['success'], r['result'].get('version_number'), len(r['result'].get('products') or []))"
```

期望：`True 3 3299`

**注意：** `get_price_library_draft` 需 **admin** 账号 JWT；非 admin 返回 403（`PERMISSION_REQUIRED`）。

---

## 顺带完成（原 P0C 一部分）

`confirmed=true` → `POST /draft/items` 已在 P0B 接通。P0C 剩余：**publish** + 409 处理。

---

## Spec 落盘

`.trellis/spec/integration/price-library.md` § **Agent write path (price-library MCP — P0B+)**
