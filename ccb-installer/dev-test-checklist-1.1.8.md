# Dev test checklist — CCB-Wanding 1.1.8 (org historical mapping)

Release focus: **org-primary 历史报价** + **drat matcher** + **learn-by-data Section D org path**.

## P1 — Install / version

- [ ] `dist/VERSION` = `1.1.8`
- [ ] `.config-generation.json` → generation **6** after bootstrap
- [ ] `skills/quotation-learn-by-data/SKILL.md` 含 org 表

## P2 — Org mapping (fleet)

- [ ] `org-server.json` → VPS `http://67.216.206.3:13401`
- [ ] Org 登录成功
- [ ] **新建 Guid 会话**
- [ ] `match_quotation` → `历史报价` source（非仅本地 xlsx）
- [ ] Optional: `Elbow drat ½" AW` → 8010024875 类弯头

## P3 — MCP tools

- [ ] Settings → quotation MCP 含 `lookup_quotation_mapping`
- [ ] `test-mcp-health.ps1 -Probe` PASS

## P4 — Regression (1.1.7)

- [ ] Guid 报价 direct50 路径仍绿
- [ ] Personal memory Stop hook 仍工作
- [ ] Route B runtime markers (`ccb-check-install.cmd`)

## Evidence

- Build log: `ccb-installer/build-1.1.8-staging-nsis.log`
- Delivery: `ccb-installer/delivery-1.1.8-2026-07-07.md`
