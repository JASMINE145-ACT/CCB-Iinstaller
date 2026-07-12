# Dev test checklist — CCB-Wanding 1.1.9 (supplier directory + dev delta)

Release focus: **供应商名录全栈** + **1.1.8 以来 dev 增量**（work-tasks、price-library UI、WeCom、ACP guards）。

## P0 — Install / version

- [ ] `dist/VERSION` = `1.1.9`
- [ ] `.config-generation.json` → generation **7** after bootstrap/upgrade
- [ ] `ccb-check-install.cmd` — route-b + acp-agent markers OK
- [ ] 完全退出 AionUI（含托盘）后重装/覆盖，**非** Ctrl+R

## P1 — Supplier directory (new in 1.1.9)

- [ ] Settings → MCP 含 `supplier-directory`（`ensure-wanding-settings`）
- [ ] `test-mcp-health.ps1 -Probe` → `agents/supplier-directory-agent` PASS
- [ ] Guid **新建会话** →「土工布谁有货？」→ orchestrator 委派 supplier agent（非 direct MCP）
- [ ]「双林仓库地址是什么？」→ 归一化搜索命中
- [ ] `#/suppliers` — 列表 / 产品匹配 / 车型匹配三模式；表头不换行、刷新按钮完整
- [ ] Admin 账号：`SUPPLIER_DIR_ADMIN_USERNAMES` 写路径 preview + confirmed
- [ ] VPS org API：`GET /api/suppliers?q=` 有 seed 数据（需 VPS migration 022 + bootstrap）

## P2 — Work tasks v2 (dev since 1.1.8)

- [ ] Work tasks dashboard 加载；manager 可见 assignee roster
- [ ] `/api/auth/user` envelope 解包 → admin 识别为 manager
- [ ] 任务 detail → understand-agent 打开（auto permissions）

## P3 — Price library / knowledge

- [ ] Admin L2 row edit drawer：draft/publish IPC
- [ ] 报价路径仍走 quotation-agent（非 supplier-directory）

## P4 — Regression (1.1.8)

- [ ] org 登录 + `match_quotation` → `历史报价` source
- [ ] Optional: `Elbow drat ½" AW` drat matcher
- [ ] Personal memory Stop hook
- [ ] Guid 报价 direct50 路径仍绿

## P5 — Agent eval

- [ ] `run-agent-eval-suite.ps1 -Suite smoke -Run -Json` ≥7/15

## P6 — WeCom (fleet vs dev machine)

- [ ] 员工机：Settings → Channels → 企微面板 **无**「企业微信开发文档」外链按钮
- [ ] 本机：`CCB_WANDING_WECOM_DEV_DOCS=1` 启动后 **可见** 该按钮并可打开
- [ ] 企微渠道开关默认 **关**（未配置 Bot ID/Secret 时不自动连接）

- Build log: `ccb-installer/build-1.1.9-staging-nsis.log`
- Delivery: `ccb-installer/delivery-1.1.9-2026-07-12.md`
- Unit: `cargo test -p aionui-supplier-directory` (9 pass)
- MCP: `bun test preview.test.mjs` (4 pass)
