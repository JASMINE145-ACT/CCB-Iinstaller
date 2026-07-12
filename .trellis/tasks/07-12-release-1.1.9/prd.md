# PRD — CCB-Wanding 1.1.9 Full NSIS 发布

| Field | Value |
|-------|--------|
| **Task ID** | `07-12-release-1.1.9` |
| **Baseline** | [`ccb-installer/delivery-1.1.8-2026-07-07.md`](../../../ccb-installer/delivery-1.1.8-2026-07-07.md) |
| **Trigger** | User `/trellis-plan-execution 打包新的版本 1.1.9 要求囊括目前所有的更新 dev的测试内容` |
| **Parent feature** | [`07-12-supplier-directory-vs-price-library`](../07-12-supplier-directory-vs-price-library/prd.md) + dev 增量 since 1.1.8 |

## Goal

打出 **CCB-Wanding 1.1.9** Full NSIS，将 **1.1.8 之后 dev 已验** 的全部 fleet 可见能力打进安装包，员工升级后无需手工 sync vendor/MCP/agent。

## User-visible scope (1.1.9 vs 1.1.8)

| 区域 | 内容 |
|------|------|
| **供应商名录** | Org SQLite `suppliers` + `logistics_vehicles`；REST + MCP + `supplier-directory-agent`；orchestrator 委派；`#/suppliers` UI |
| **NL 查询硬化** | `normalize_product_query` / `normalize_supplier_search_query`；MCP CSRF retry；agent `q` 契约 |
| **Field fidelity (Phase 8)** | migration 023 + 距离/结构化 products/locations JSON + UI 列对齐 |
| **Work tasks v2** | RBAC、assignee roster MCP、dashboard/detail UI、admin ACL 修复 |
| **Price library** | L2 行编辑 drawer；knowledge vs price-library 路由 |
| **Employee / org context** | profile staging、org knowledge 展示增量 |
| **WeCom** | channel enable 错误透传、extension UI、SDK 测试路径 |
| **ACP / agents** | supplier-directory 委派 guard；禁止 ExecuteExtraTool；direct `mcp__` 调用策略 |
| **config_generation** | **6 → 7**（supplier-directory MCP + agent seeds + ensure-wanding-settings） |

## Explicit NOT in installer (runtime / ops)

| 项 | 说明 |
|----|------|
| VPS org SQLite 数据 | migration 022/023 + `bootstrap-supplier-directory.py` 在 VPS 运维执行 |
| VPS quotation mapping 803 rows | 1.1.8 已 publish；1.1.9 不重复 bootstrap |
| Neon / 其他 DB | 禁止打包脚本写入 |

## Acceptance

1. `CCB-Wanding-1.1.9.exe` + sha256 + `delivery-1.1.9-*.md`
2. Silent/覆盖安装后 `dist/VERSION = 1.1.9`，`config_generation = 7`
3. `test-mcp-health.ps1 -Probe` PASS（含 `supplier-directory-agent`）
4. Agent eval smoke ≥7/15；1.1.8 回归（org 历史报价、Guid 报价）仍绿
5. Manual：Guid 找厂/地址/产品 → orchestrator 委派 supplier agent；`#/suppliers` 三模式可用

## Out of scope (defer)

- VPS `publish-update-bundle.ps1` + manifest（用户确认后 Phase 4）
- orchestrator eval 4/4 全绿
- manufacturing pilot
