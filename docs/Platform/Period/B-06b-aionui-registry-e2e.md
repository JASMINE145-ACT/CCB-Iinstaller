# B-06b: AionUI registry + Route B ACP 入口

**状态**: v0.2 — registry ✅ / 自动化 smoke ✅ / **人工 E2E 待确认**
**日期**: 2026-06-11（v0.2 验证记录）
**前置**: B-06 Phase 3.0 ✅ · [B-04c](./B-04c-code-review-triage.md) WS pong ✅

---

## 1. 目标

1. AionUI agent registry 指向 **Route B**：`bun dist/cli.js --ccb-acp`（或 patch `index.js` 引导）
2. 提供 sync 脚本 + registry fixture
3. `test-acp-agent-registry.mjs` 验证 patch 入口 mock client PASS

**不做**：自动化浏览器 E2E（需人工重启 AionUI 验证）

---

## 2. 验收

| ID | 验证 | 通过条件 |
|----|------|----------|
| B-06b.A | `test-acp-agent-registry.mjs` | patch index → mock client PASS | ✅ |
| B-06b.B | `deploy/setup-aionui.sh` | `--ccb-acp` 非 `--acp` | ✅ |
| B-06b.C | 人工 | AionUI 发「你好」30s 内回复 | 待人工 |
| B-06b.D | `test-turn-completed.mjs` | `has turn.completed: true` | ✅ 2026-06-11 |
| B-06b.E | `sync-aionui-ccb-route-b.ps1` | 3 目标 sync + `node --check` OK | ✅ 2026-06-11 |

---

## 3. 人工 E2E 步骤（B-06b.C）

**前置**：`ANTHROPIC_AUTH_TOKEN` 已配置（`start-aionui.cmd` / `load-smoke-env.mjs` 同源）。

```powershell
# 1. 构建（若 dist 未更新）
cd ccb-installer
bun scripts/build-ccb-acp-agent.mjs
bun scripts/build-ccb-api-server.mjs
bun scripts/build-serve-wanding.mjs

# 2. 同步 Route B ACP patch（覆盖 AionUI bundled index.js）
.\scripts\sync-aionui-ccb-route-b.ps1 -RestartAionUiWeb

# 3. 启动 AionUI（若未自动拉起）
#    使用现有 start-aionui.cmd 或桌面快捷方式

# 4. 在 UI 中选择 registry 中的 CCB Wanding / Route B agent
#    fixture: fixtures/aionui-agent-registry-ccb-wanding.json

# 5. 发送「你好」
#    期望：30s 内流式回复；无 ACP 握手失败、无空白 turn
```

**通过记录**（人工完成后勾选）：

```text
[ ] AionUI 重启后 agent 列表可见 CCB Wanding
[ ] 首条消息 30s 内收到 assistant 文本
[ ] DevTools / ACP 日志无 spawn --acp（旧路径）误用
[ ] 可选：第二条业务消息「三通50 库存」含表格
```

通过后签发：

```text
<promise>CCB_RUNTIME_ACP_E2E_OK</promise>
<promise>PRD_ROUTE_B_COMPLETE</promise>
```

---

## 4. 完成承诺

```text
<promise>CCB_RUNTIME_ACP_REGISTRY_OK</promise>
```

全闭环 E2E → `PRD_ROUTE_B_COMPLETE` / `CCB_RUNTIME_ACP_E2E_OK`（仅 B-06b.C 人工门）

**自动化已验**（2026-06-11）：

```text
sync-aionui-ccb-route-b.ps1 → 3 targets OK
test-acp-agent-registry.mjs → PASS direct + patch
test-turn-completed.mjs     → has turn.completed: true
```
