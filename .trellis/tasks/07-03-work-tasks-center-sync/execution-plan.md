# Execution Plan — `07-03-work-tasks-center-sync`

| Field | Value |
|-------|--------|
| **Status** | completed |
| **Scenario** | D（双仓：AionCore + aionui-src；VPS 运维串行） |
| **Active phase** | — (closed 2026-07-06) |
| **Approved** | 2026-07-01（explore 决策锁定） |
| **Code complete** | 2026-07-01（Phase 4-A 基础已落地） |

## Progress snapshot

| Phase | State | Delivery / evidence |
|-------|--------|---------------------|
| P4-A Org HTTP 接线 | **code done** | orgHttpBridge + ipcBridge.workTask + CSRF + org upload + useWorkTasks 轮询 |
| P4-A 自动化测试 | **pass** | cargo 87+8 tests；orgHttpBridge vitest 7/7 |
| P4-A code-review | **pass** | 二轮 review PASS（D7/密码校验/role 默认/CSRF 登出） |
| P4-A Dev smoke | **done** | UI `#/tasks` + org CRUD（用户验收 2026-07-06） |
| P4-B VPS 部署 | **done** | tarball upload + manual extract + cargo build + restart |
| P4-B VPS CRUD smoke | **done** | work-tasks=401, users=401; admin login + 建任务 |
| P4-C 用户 RBAC | **done** | `/api/users` VPS + listMembers org；TeamMembersPage 仍本地（defer） |
| P4-D 角标轮询 | **done** | 45s/60s SWR；已移除 WS 依赖 |
| P4-E 本机下线 | **defer** | 附件打开、local API 只读 — follow-up 非阻塞 |
| Trellis 收尾 | **done** | execution-plan + prd AC + task.json（2026-07-06） |

---

## Task: 07-03 — 工作任务中心化

**Repos:** `claude-code-best`（AionCore）+ `aionui-src`  
**Spec entry:** `.trellis/spec/integration/aioncore-work-tasks.md` · `.trellis/spec/integration/org-knowledge.md`

### Phase 0 — Activate & read

| Step | Tool / skill | Output |
|------|--------------|--------|
| Activate task | `python .trellis/scripts/task.py start 07-03-work-tasks-center-sync` | in_progress |
| Read spec + PRD | `trellis-before-dev` → integration specs | paths noted |
| Decisions | `research/decisions.md` | D1–D9 locked |

### Phase 1 — P4-A 验证（当前）

| Step | Priority | Workstream | Tool | Evidence |
|------|----------|------------|------|----------|
| 1.1 重跑自动化 | P0 | 回归 | Shell | `cargo test -p aionui-work-tasks --lib --test service_integration` |
| 1.2 AionUI 单测 | P0 | orgHttpBridge | `bun vitest run tests/unit/common-adapter/orgHttpBridge.test.ts` | 7 passed |
| 1.3 编译 AionCore | P0 | release binary | `cargo build --release -p aionui-app` | binary mtime |
| 1.4 Dev 栈 | P0 | 本地联调 | `start-dev-full.ps1`（含 BuildAioncore） | 进程启动无 panic |
| 1.5 Org API smoke | P0 | JWT | curl / Electron devtools | work-tasks 200 |
| 1.6 UI smoke | P0 | 人工 | 侧栏「任务」 | 见 §Manual |

**不在此阶段做：** VPS 全量验收（属 P4-B）；spec 更新（门禁通过后）。

### Phase 2 — P4-B VPS 部署（用户主导）

| Step | Priority | Workstream | Tool | Notes |
|------|----------|------------|------|-------|
| 2.1 上传编译 | P0 | deploy | `deploy-org-aioncore-vps.ps1 -ExtractOnRemote` | grep `work_tasks` + `/api/users` |
| 2.2 Migration | P0 | DB | VPS SSH | 013 work_tasks + 014 work_task_role |
| 2.3 systemd | P0 | restart | `systemctl restart aionorg` | 401 smoke 三路 |
| 2.4 员工账号 | P0 | bootstrap | `vps-create-employee-runbook.md` | admin=manager |
| 2.5 CRUD curl | P0 | smoke | curl + CSRF cookie | 见 §VPS smoke script |

### Phase 3 — P4-C/D/E 收尾（代码 + 验收）

| Step | Priority | Workstream | Tool | Files |
|------|----------|------------|------|-------|
| 3.1 跨设备 AC#1–3 | P0 | 验收 | UI manual 两台 | prd Acceptance |
| 3.2 附件打开 | P1 | org 下载 | trellis-implement | WorkTaskDetailPage |
| 3.3 TeamMembers | P1 | org users | ipcBridge auth → org | TeamMembersPage |
| 3.4 本机 API 降级 | P1 | 只读/404 | AionCore router | routes.rs local flag |
| 3.5 Spec 沉淀 | P0 | docs | `trellis-update-spec` | aioncore-work-tasks.md |
| 3.6 Trellis 收尾 | P0 | audit | jsonl + finish-work | implement/check.jsonl |

---

## Verification gate（单一链路 — §八）

```
已完成 code-review PASS
  → 重跑测试 + 贴证据（本计划 Phase 1.1–1.2）
  → Dev + VPS smoke（Phase 1.5 + 2.5）
  → UI manual AC（§Manual）
  → trellis-update-spec
  → implement.jsonl + check.jsonl + prd AC [x]
  → git commit（用户明确要求时）
  → /trellis:finish-work
```

**主审路径：** `code-reviewer`（已完成）→ 下一里程碑用 `trellis-check` 做 spec 合规。

---

## 推荐验证方法（按优先级）

### Tier 1 — 自动化（5 min，可重复）

```powershell
# AionCore
cd D:\Projects\claude-code-best\AionCore
cargo test -p aionui-work-tasks --lib --test service_integration
cargo test -p aionui-auth -p aionui-common --lib

# AionUI
cd D:\Projects\aionui-src
bun vitest run tests/unit/common-adapter/orgHttpBridge.test.ts
```

### Tier 2 — Dev 栈 + Org API（15 min）

```powershell
cd D:\Projects\claude-code-best
.\ccb-installer\scripts\start-dev-full.ps1 -SkipBootstrap -SkipVendorSync
# 若 AionCore 有改动，去掉 -BuildAioncore:$false
```

确认 `scripts/org-phase0/env.local` 中 `ORG_SERVER_URL` + JWT 与 VPS 一致，登录后：

| 检查 | 期望 |
|------|------|
| DevTools → org HTTP | `GET /api/work-tasks` → 200 + `data: []` 或任务列表 |
| `#/tasks` | 非「API 不可用」；经理可见创建按钮 |
| 创建任务 | POST 成功（非 CSRF_INVALID） |
| 指派下拉 | `GET /api/users` 返回 org 员工 |

### Tier 3 — VPS CLI smoke（用户 SSH，10 min）

在 VPS 上（含 CSRF 的 POST 需 cookie + header）：

```bash
# 1. 路由存在
curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:13401/api/work-tasks   # 401
curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:13401/api/users        # 401

# 2. 登录拿 token + 确认 admin role
curl -s -X POST http://127.0.0.1:13401/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"admin","password":"..."}' | python3 -m json.tool
# expect user.work_task_role == manager

# 3. 带 Bearer 列表
curl -s http://127.0.0.1:13401/api/work-tasks -H "Authorization: Bearer $TOKEN"
curl -s http://127.0.0.1:13401/api/users -H "Authorization: Bearer $TOKEN"
```

完整 CRUD + CSRF 可参考 `AionCore/crates/aionui-app/tests/file_e2e.rs` 的 `setup_and_login` 模式，或扩展 `scripts/org-phase0/vps-smoke.sh`。

### Tier 4 — UI 验收（prd Acceptance，需 2 台或 2 账号）

| AC# | 场景 | 方法 |
|-----|------|------|
| 1 | 经理 A 指派 → 员工 B 另一台可见 | 两台 dev + org 登录 |
| 2 | 经理团队概览全员 | manager query 页 |
| 3 | 员工不能 query 全员 | employee 403 或无入口 |
| 4 | 断网 | 关 VPS / 断网 → 空态「不可用」 |
| 5 | VPS deploy | 401 无 token；JWT 200 |

---

## Manual steps（人工 — 不可省略）

- [ ] VPS：部署 **含 `/api/users` 的新 binary** 并 restart
- [ ] VPS：migration 013/014 已应用
- [ ] Dev：登录 org SSO → `#/tasks` 可 CRUD
- [ ] 跨设备：AC#1 经理指派 / 员工接受
- [ ] 经理：团队概览看到全公司任务
- [ ] 附件：上传成功（打开附件可能失败 — 已知 P4-E）

---

## Parallelization

| 执行者 | Scope | 规则 |
|--------|-------|------|
| Agent（已完成） | AionCore + aionui-src Phase 4-A | 串行 merge |
| **用户** | VPS deploy + 员工账号 + Tier 3–4 smoke | 部署后再跑 UI 验收 |

**禁止：** VPS 未部署新 binary 前用 UI 验收判定 FAIL（会先看到 401/不可用）。

---

## Defer / out of scope

- org WebSocket 实时推送（D8 首版不做）
- 本机 work_tasks 数据迁移（D5 丢弃）
- 部门过滤
- TeamMembersPage → org（P4-C 可 follow-up，不阻塞 AC#1–2）

---

## 剩余工作摘要

| 负责人 | 项 | 阻塞 |
|--------|-----|------|
| **用户** | VPS 部署新 AionCore + migration + smoke | 全部 UI/org 验收 |
| **用户** | 员工账号 + env.local ORG/JWT 对齐 | Dev Tier 2 |
| **用户** | UI 跨设备验收 AC#1–4 | finish-work |
| Agent | Dev Tier 2 协助 / smoke 脚本扩展 | 可选 |
| Agent | P4-E：附件打开、本机 API 只读 | P4-B 通过后 |
| Agent | trellis-update-spec + jsonl + prd [x] | 验收通过后 |
