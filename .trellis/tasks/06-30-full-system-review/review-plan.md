# 全项目系统审查 — 主规划

> Task: `06-30-full-system-review` · 创建: 2026-06-30  
> 方法: system-reviewer 分模块只读审计 + Trellis spec 对照

---

## 1. 项目四层/七层心智模型

```text
                    ┌─────────────────────────────────────┐
                    │  Step 5: Ship/Ops                   │
                    │  build / NSIS / hot-update / CI     │
                    └──────────────────┬──────────────────┘
                                       │
┌──────────────┐  ┌──────────────┐  ┌─┴────────────┐  ┌──────────────┐
│ Step 3       │  │ Step 1       │  │ Step 2       │  │ Step 4       │
│ Frontend     │◄─┤ Integration  ├─►│ Backend      │  │ Business     │
│ AionUI       │  │ ccb-installer│  │ claude-code-B│  │ python/data  │
└──────┬───────┘  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘
       │                 │                  │                 │
       └─────────────────┴──────────────────┴─────────────────┘
                              4-layer runtime chain
```

**运行时链（发一条聊天）：**

```text
AionUI renderer → aioncore → route-b patch → CCB-Wanding --acp → quotation MCP → vendor python/data
     Step 3           L2         Step 1              Step 2              Step 4
```

**Rule 0（改哪里）：**

| 场景 | 层 |
|------|-----|
| ACP/MCP/session/greeting | Backend (claude-code-B) |
| UI/UX/IPC/chat 渲染 | Frontend (aionui-src) |
| route-b/seed/scripts/sync | Integration (ccb-installer) |
| 报价/价库/库存 Python | Business (python/data) |
| 打包/安装/更新 | Ship/Ops |

---

## 2. 五步审查执行表

| Step | 模块 | 状态 | Artifact | 成熟度 | 下一步触发 |
|------|------|------|----------|--------|------------|
| 1 | Integration | ✅ 完成 | `reviews/step-01-integration.md` | **7.5/10** | — |
| 2 | Backend | ✅ 完成 | `reviews/step-02-backend.md` | **7/10** | — |
| 3 | Frontend | ⏳ 待审 | `reviews/step-03-frontend.md` | — | Step 2 后或并行若只关心 UI |
| 4 | Business | ⏳ 待审 | `reviews/step-04-business.md` | — | Step 2 后（与 Backend 强相关） |
| 5 | Ship/Ops | ⏳ 待审 | `reviews/step-05-ship-ops.md` | — | Phase 4 冷构建前必做 |

### 每步 system-reviewer prompt 模板

```
Focus ONLY on [MODULE] layer.
Read: .trellis/spec/[layer]/index.md + [listed docs]
Cross-check: [repo paths]
Output: maturity, working well, spec↔code gaps (P0/P1/P2), risks, MVP roadmap, suggested next module.
Read-only; cite file paths.
```

---

## 3. Step 1 已确认发现（Integration）

### 3.1 成熟度

**7.5/10** — 胶水层设计成熟（canonical dev launcher、fail-closed packaged launch、共享 install-health manifest），但 spec 自评 9/10 偏高；doc/script 漂移、vendor sync 摩擦、Phase 4 未 ship 拉低分数。

### 3.2 做得好的

1. `start-dev-full.ps1` 唯一 canonical dev 入口；废弃脚本 redirect
2. route-b `index.js` spawn 链与 `aionui-ccb-boundary.md` 一致
3. `install-health-manifest.json` 被 build + field test 共用
4. `ccb-launch-aionui.cmd` bootstrap 失败即阻断 + route-b marker 校验
5. 分层 smoke：`test-native-acp-agent.mjs`、`test-mcp-health.ps1`、`smoke-wanding-e2e.ps1`

### 3.3 P0 差距

| # | 差距 | Spec | Code | 修复 |
|---|------|------|------|------|
| 1 | route-b 同步目标数 | `route-b-sync.md` §2 列 **4** 目标 | `sync-aionui-ccb-route-b.ps1` 实际 **3** 目标 | 更新 spec 或补第 4 目标；注明 legacy `sync-aionui-ccb-patch.ps1` |
| 2 | Phase 4 冷 ship | `1.1.3-dev` pending | build 管线存在；oracle 仍 1.1.2 | 执行 `06-26` Phase 4 |
| 3 | vendor sync 不在 dev 链 | `dev-sync-playbook.md`：repo python/data ≠ live | `start-dev-full.ps1` 不调 `sync-dev-wanding-vendor.ps1` | `-SyncVendor` 或 hash preflight |

### 3.4 P1 差距

- `dev-runtime-layers.md` 仍引用 `start-aionui-dev.ps1`
- `verify-installer.ps1` 默认 `$LOCALAPPDATA\Programs\CCB`（应为 CCB-Wanding）
- `deploy-seed-agents` skip 语义 vs doc「copy-only」
- 内网更新 VPS manifest ops pending
- ACP 版本 `0.39.0` 硬编码多处

### 3.5 P2 差距

- CI 未挂 `test-mcp-health.ps1` / `build-wanding.ps1` v2
- `sync-aionui-ccb-patch.ps1` 与 route-b sync 职责重叠

### 3.6 Top 5 风险

1. route-b 三槽位不同步 → 一窗 vanilla Claude、一窗 CCB
2. 改 `python/` 未 sync vendor → 报价「随机」错
3. keep-set 变更后 live agents 未 prune → 旧助手残留
4. ACP 版本 pin 与 aioncore 升级不同步 → silent spawn 失败
5. Phase 4 ship gap → handbook 成熟度 > 可证明的冷构建 oracle

---

## 4. Step 2–5 预审检查清单（审查时用）

### Step 2 Backend

- [ ] `acp-session-flow.md` vs `agent.ts` 事件序列
- [ ] MCP `resolveSessionMcpConfigs` merge 行为
- [ ] greeting / permission / AskUserQuestion payload
- [ ] `route-b-status.md` 刷新需求清单
- [ ] assistant profile handoff（`.aionui-next-assistant-profile.json`）
- [ ] slash command capability manifest
- [ ] subagent gate / ROE / Gate-J 与 Integration seed 对齐

### Step 3 Frontend

- [ ] `chat-acp-flow.md` vs `acpMapping.ts` / `chatLib.ts`
- [ ] `turn_id` stale replay 拒绝
- [ ] `usePresetAssistantInfo` / `useConversationAgents` catalog 统一
- [ ] CCB MCP/settings/models authority UI
- [ ] startup readiness gate UI（task `06-28`）
- [ ] 侧栏 org entries 扁平化（task `06-30-sider` 修订后）
- [ ] `TODO(defensive)` 审计

### Step 4 Business

- [ ] `tool_dispatch.py` 薄入口 vs 各 `*_dispatch.py`
- [ ] `org_price_client.py` LKG_MIN_PRODUCTS + 三档 fallback
- [ ] `match_quotation_union` 并行价+库存
- [ ] `quotation-agent.md` L1 硬约束完整性
- [ ] `python/tests/` 覆盖矩阵
- [ ] `mcp_servers/quotation` 工具注册 vs `mcp-health-manifest.json`

### Step 5 Ship/Ops

- [ ] `build-wanding.ps1` 全参数路径 smoke
- [ ] `wanding-packaging-whitelist.md` vs staging 实际
- [ ] `internal-update.md` §12 VPS ops
- [ ] GitHub workflow vs v2 installer
- [ ] `mixing-meta-repo.md` Phase 4 checklist
- [ ] 安装后 `ccb-launch-aionui.cmd` 端到端

---

## 5. Integration 修复路线（审查衍生 workstream）

```text
Phase 1 (doc)     route-b-sync 对齐 + dev 入口 doc sweep     ~1–2h
Phase 2 (dev)     start-dev-full -SyncVendor / hash gate      ~1d
Phase 3 (gate)    verify-installer 修复 + integration-smoke   ~2–3d
Phase 4 (ship)    06-26 Phase 4 冷构建                         数天
Phase 5 (CI)      post-build integration-smoke in workflow      ~1d
```

---

## 6. 完成定义（整个 task）

1. 五步 `reviews/step-0N-*.md` 齐全
2. `backlog.md` 全项目 P0/P1 按 layer 排序
3. `.trellis/spec/index.md` 成熟度表更新（含各层评分与日期）
4. 可选：Integration Phase 1–3 代码/脚本修复 + spec 回写

---

## 7. Spec 交叉引用

| 文档 | 审查角色 |
|------|----------|
| `.trellis/spec/index.md` | 总索引；最终成熟度回写 |
| `.trellis/spec/outline.md` | Rule 0 + 4 层架构 |
| `integration/index.md` | Step 1 决策树 |
| `backend/index.md` | Step 2 入口 |
| `frontend/index.md` | Step 3 入口 |
| `integration/wanding-first-ship.md` | Step 5 入口 |
| `integration/dev-runtime-layers.md` | 全步 dev 心智模型 |
| `integration/mcp-health.md` | Step 1/2/4 健康基线 |
