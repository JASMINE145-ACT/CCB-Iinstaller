# Step 1 — Integration Layer 审查报告

> 日期: 2026-06-30  
> 方法: system-reviewer 子代理 + Trellis spec 对照  
> 范围: `ccb-installer/`、`AionCore/` 注入、`scripts/org-phase0/`、Integration spec 全文  
> **未深入:** Frontend / Backend Layer 4 源码（留给 Step 2/3）

---

## 成熟度

**7.5/10** — Spec 自评 Integration **9/10**（`.trellis/spec/index.md`）；代码显示胶水层意图清晰、canonical 入口与 fail-closed 打包启动良好，但 doc/script 漂移、vendor sync 摩擦、Phase 4 冷 ship（`1.1.3-dev`）未完成，低于「handbook 可 ship」标准。

---

## 1. 系统地图

```text
Layer 1 AionUI.exe (aionui-src) — UI only
Layer 2 aioncore.exe (AionCore) — session/warmup/HTTP bridge
Layer 3 route-b patch (ccb-installer/patches/aionui-ccb-route-b/)
Layer 4 CCB-Wanding dist/cli.js --acp (claude-code-B → D:\CCB-Wanding\dist)
```

| 目录 | Integration 角色 | 关键文件 |
|------|------------------|----------|
| `ccb-installer/patches/` | Layer 3 ACP slot | `aionui-ccb-route-b/index.js`, `aionui-acp/acp-agent.js` |
| `ccb-installer/scripts/` | sync / dev / deploy / smoke | `start-dev-full.ps1`, `sync-aionui-ccb-route-b.ps1`, `build-wanding.ps1` |
| `ccb-installer/config/` | CCB authority seeds | `agents/*`, `mcp-health-manifest.json` |
| `ccb-installer/resources/` | 安装/构建 gate | `install-health-manifest.json` |
| `python/`, `data/`, `mcp_servers/` | 业务**源码**（需 sync 才 live） | → `vendor/wanding/` via `sync-dev-wanding-vendor.ps1` |
| `AionCore/` | Layer 2 fork（org API） | `sync-dev-aioncore.ps1` 注入 |
| `scripts/org-phase0/` | Org SSO / VPS ops | `env.local`, deploy checklists |

---

## 2. 做得好的地方

1. **Canonical dev 链 enforced** — `start-dev-full.ps1` 为唯一支持入口；`start-aionui-dev.ps1` 等 redirect
2. **route-b 边界编码清晰** — `index.js` 与 `aionui-ccb-boundary.md` §1 一致
3. **Build + field 共享 manifest** — `install-health-manifest.json`
4. **打包启动 fail-closed** — `ccb-launch-aionui.cmd`
5. **分层 integration smoke** — `test-native-acp-agent.mjs`、`test-mcp-health.ps1`、`smoke-wanding-e2e.ps1`

---

## 3. Spec ↔ Code 差距

| 优先级 | 差距 | Spec 说 | 代码现实 | 建议 |
|--------|------|---------|----------|------|
| **P0** | route-b 同步目标数 | 4 目标 | 脚本 3 目标 | 刷新 spec 或补目标 |
| **P0** | Phase 4 冷 ship | `1.1.3-dev` pending | oracle 1.1.2 | 执行 `06-26` Phase 4 |
| **P0** | vendor sync 不在 dev 链 | playbook 要求 awareness | `start-dev-full` 不调 vendor sync | `-SyncVendor` 或 hash gate |
| **P1** | Dev 入口 doc 漂移 | 旧 launcher 名 | Rule 0 要求 `start-dev-full` | doc sweep |
| **P1** | verify-installer 路径 | CCB-Wanding | 默认 `Programs\CCB` | 修复或弃用 |
| **P1** | ACP 0.39.0 硬编码 | 可变 | 多处 baked | 版本 helper |
| **P2** | CI 缺口 | smoke 文档化 | 未挂 workflow | post-build gate |

---

## 4. 风险 Top 5

1. route-b 三槽位 mixed state  
2. vendor drift  
3. stale agent files  
4. ACP version pin 漂移  
5. Phase 4 ship gap  

---

## 5. MVP 改进路线

1. route-b-sync 文档对齐（1–2h）  
2. dev vendor sync（~1d）  
3. verify-installer 修复（同日）  
4. doc sweep（~1d）  
5. `integration-smoke.ps1`（2–3d）  

---

## 6. 建议下一步

**Step 2 — Backend（`claude-code-B`）**
