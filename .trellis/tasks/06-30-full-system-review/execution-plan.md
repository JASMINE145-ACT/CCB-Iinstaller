# Execution Plan — `06-30-full-system-review` (Step 3 + 严格验证)

| Field | Value |
|-------|--------|
| **Status** | approved |
| **Scenario** | **D-lite** — Step 3 只读审计（无代码）+ FE-P0-1 收口（有代码，严格门禁） |
| **Active phase** | P5 — backlog + spec sync |
| **Approved** | 2026-07-03 |
| **Repos** | `claude-code-best`（审计/脚本/spec）+ `aionui-src`（FE-P0-1 与 Step 3 发现修复） |
| **Spec entry** | `.trellis/spec/frontend/index.md` · `chat-acp-flow.md` · `coding-rules.md` §6 · `integration/mcp-health.md` § App startup readiness gate |
| **Parent PRD** | `prd.md` Step 3 · `review-plan.md` §4 · `backlog.md` FE-P0-1 / BE-P0-2 |
| **Related child** | `06-28-app-startup-readiness-gate`（FE-P0-1 实现载体） |

## 用户约束

> **严格 test** — 不因修改导致运行出问题。  
> 原则：**先基线 → 再审计 → 小步改 → 每步门禁 → 失败即回滚**，禁止「审计 + 大改 + 一起测」。

## Progress snapshot

| Phase | State | Delivery / evidence |
|-------|--------|---------------------|
| P0 | **done** | `reviews/baseline-2026-07-03.md` |
| P1 | **done** | `reviews/step-03-frontend.md` |
| P2 | **done** | `delivery-fe-p0-1-verify-2026-07-03.md` — operator ✅ |
| P3 | **skipped** | No blocking gaps; AC4 repair CTA deferred |
| P4 | pending | BE-P0-2 前端契约（若 Step 3 标 P0） |
| P5 | **done** (Step 3 scope) | backlog + frontend spec AUQ sync |

---

## Scenario classification

| 标签 | 适用段 | 说明 |
|------|--------|------|
| **E（探索 only）** | Phase P1 Step 3 审计 | system-reviewer 只读；**不写应用代码** |
| **C（Bug/回归）** | Phase P3 修复 | `systematic-debugging` → TDD repro → 最小 diff |
| **D-lite** | 整体 | 审计与 `aionui-src` 修复 **串行**；同一文件不并行 agent |

---

## Phase 0 — Activate & baseline（**零代码改动**）

| Step | Tool / skill | Output |
|------|--------------|--------|
| `task.py start 06-30-full-system-review` | Trellis | `in_progress` |
| `trellis-before-dev` | skill | frontend + integration spec 路径确认 |
| 读 PRD + `06-28` progress | read-only | AC 对照表草稿 |
| **基线环境** | `start-dev-full.ps1 -SkipBootstrap -BuildAioncore:$false` | 日志路径记下 |
| **基线 CLI** | `test-mcp-health.ps1`（无 flag → 快速） | exit 0 截图/摘要 |
| **基线单元** | 见 §测试矩阵 A | 全部 PASS 记录 |
| **基线 renderer 安全** | `rg "node:fs|from '@/common/config/ccbMcpHealth'" aionui-src/.../renderer` | 应为 0 value-import |
| **基线 UI** | §Manual smoke A | 勾选表 |

**Gate P0：** 基线全绿才进入 P1。任一失败 → `systematic-debugging` 记 `reviews/baseline-YYYY-MM-DD.md`，**不开始 Step 3 修复**。

---

## Phase P1 — Step 3 Frontend 只读审计

| Priority | Workstream | Tool / agent | Canonical files | Notes |
|----------|------------|--------------|-----------------|-------|
| P0 | ACP/chat 渲染契约 | **system-reviewer**（只读） | `chat-acp-flow.md`, `acpMapping.ts`, `chatLib.ts` | `turn_id`、AUQ、greeting |
| P0 | CCB authority UI | system-reviewer | `useCcbAuthorityActive`, Settings 路由, `CapabilitiesSettings.tsx` | 含 2026-07-03 白屏已修项 |
| P0 | Catalog 统一 | system-reviewer | `fetchAssistantsCatalog`, `useConversationAgents`, `usePresetAssistantInfo` | |
| P1 | `TODO(defensive)` 审计 | system-reviewer | `rg TODO(defensive)` renderer | 对照 `defensive-fix-policy.md` |
| P1 | Startup readiness UI | system-reviewer | `useCcbStartupReadiness`, `CcbStartupReadinessBanner`, `06-28` AC | 输出 gap 表 |

**产出：** `reviews/step-03-frontend.md`（成熟度分 + P0/P1/P2 + **仅建议、不实施**）

**Gate P1：** 审计完成；`status.md` 更新；**仍不写代码**（除非 P0 基线已红且属 production blocker — 须单开 hotfix 子阶段）。

---

## Phase P2 — FE-P0-1 验证（对照 06-28 AC，仍优先少改）

| Priority | Workstream | Tool | Notes |
|----------|------------|------|-------|
| P0 | AC 1–5 逐条验证 | manual + logs | `06-28-app-startup-readiness-gate/prd.md` |
| P0 | 能力扩展页 smoke | manual | Settings → 能力扩展 Skills/Tools（7/3 修复） |
| P1 | 缺口清单 | 文档 | `delivery-fe-p0-1-verify-YYYY-MM-DD.md` |

**判定：**

- **全 AC 通过** → FE-P0-1 **close**，跳过 P3，仅 spec 同步
- **有缺口** → 进入 P3，**一项一项**修（禁止批量）

---

## Phase P3 — FE-P0-1 修复（**严格：一改一门禁**）

每个缺口 = **独立子循环**（Scenario C）：

```
systematic-debugging（根因，写 task notes）
  → TDD：先写/改 *.test.ts（复现或守卫）
  → 最小 diff（aionui-src 或 ccb-installer）
  → code-reviewer agent → PASS
  → §测试矩阵 B（该缺口相关子集）→ PASS
  → Manual smoke B（该缺口相关子集）→ PASS
  → 失败 → git checkout 该文件，不进入下一缺口
```

| 典型文件 | 测试 |
|----------|------|
| `ccbStartupReadiness*.ts` | `bun test ccbStartupReadinessShared.test.ts` |
| `CapabilitiesSettings` / MCP health UI | `ccbMcpHealthDiagnosis.test.ts` + esbuild 无 `node:fs` |
| Guid send gate | manual：首条「查询 直接50 价格」 |

**禁止：** 与 Step 3 审计发现的其他 P2 项同批修改。

---

## Phase P4 — BE-P0-2 前端半（**仅当 P1 审计标 P0**）

| Workstream | Tool | Files |
|------------|------|-------|
| AskUserQuestion UI 契约 | TDD → `chat-acp-flow.md` 对齐 | `MessageAcpPermission.tsx` 等 |

同 P3 门禁链；**defer** 若 Backend 已 deny 且 UI 仅文档漂移。

---

## Phase P5 — 收尾

| Step | Tool |
|------|------|
| 更新 `backlog.md` FE-P0-1 / BE-P0-2 状态 |
| `trellis-update-spec` → frontend spec |
| `implement.jsonl` + `check.jsonl`（若动代码） |
| `status.md` Step 3 ✅ |
| **不** `finish-work` 全任务（Step 4–5 未做） |

---

## 测试矩阵（严格）

### A — 基线（Phase 0，改代码前必跑）

```powershell
cd D:\Projects\aionui-src

# 1. Frontend 单元（CCB / startup / MCP diagnosis）
bun test tests/unit/common-config/ccbMcpHealthDiagnosis.test.ts
bun test tests/unit/common-config/ccbStartupReadinessShared.test.ts
bun test tests/unit/common-skills/fetchSkillsCatalog.test.ts

# 2. Renderer 不得 value-import Node 健康模块
rg "from '@/common/config/ccbMcpHealth'" packages/desktop/src/renderer
# 期望：0 匹配（仅 ccbMcpHealthShared）

# 3. 集成健康 CLI
cd D:\Projects\claude-code-best\ccb-installer\scripts
.\test-mcp-health.ps1
```

### B — 每处代码改动后（子集 + 全量二选一）

| 改动触达 | 必跑 |
|----------|------|
| `ccbMcpHealth*` / Panel | `ccbMcpHealthDiagnosis.test.ts` + `test-mcp-health.ps1 -Probe` |
| `ccbStartupReadiness*` | `ccbStartupReadinessShared.test.ts` + Guid manual |
| `chat-acp-flow` / permission | `bun test` 对应用例 + tsc 相关包 |
| `ccb-installer` 脚本 | `test-sync-wanding-data.ps1` 等对应 tests |

**全量回归（P3 批次结束前）：** 矩阵 A 全部重跑 + `test-mcp-health.ps1 -Probe`（时间紧可 `-Probe` 跳过 `-Session`，但发版前须 `-Session`）。

### C — 静态检查（有 aionui 改动时）

```powershell
cd D:\Projects\aionui-src
bun run lint
bunx tsc --noEmit -p packages/desktop/tsconfig.json  # 或 monorepo 约定命令
```

---

## Manual smoke（人工 — **不可省略**）

### Smoke A — 基线（Phase 0）

- [ ] `start-dev-full.ps1` 启动无 main 255 / renderer 白屏
- [ ] 登录 Guid 页可渲染
- [ ] Settings → **能力扩展**：Skills + Tools 两 Tab 有内容
- [ ] Settings → 模型 / Agents 可打开

### Smoke B — FE-P0-1 / 改动后

- [ ] 冷启动登录后 Guid 横幅：配置检查 → MCP 预热 → 就绪
- [ ] 就绪前发送框 disabled
- [ ] 就绪后首条「查询 直接50 价格」无 `Failed to fetch`
- [ ] 日志：MCP warm **早于** 首个 conversation create
- [ ] Settings → 工具 → MCP 健康面板可跑快速检查

**注意：** 不要 Ctrl+R；用导航或重启脚本。

---

## Verification gate（单一链条 — 对齐 `docs/ai-tools-reference.md` §八）

**本计划采用：**

1. **code-reviewer** agent（主审，每处代码 diff）
2. **测试矩阵 A/B/C** + 命令输出摘要（证据）
3. **Manual smoke B**（WanD 集成不可省）
4. **trellis-update-spec**（仅门禁全过后）
5. **implement.jsonl + check.jsonl**
6. `git commit` — **仅用户明确要求**
7. **不** 在本计划内跑完整 `finish-work`（全项目审查未结束）

**不混用：** 同一 turn 不并行 trellis-check + code-review 作主审；以 **code-reviewer** 为准。

---

## Parallelization

| 可并行 | 不可并行 |
|--------|----------|
| P1 审计（只读）与 P0 基线脚本收集 | P3 多处缺口同时改同一 repo |
| Track B ADR 文档审阅 | `ccbMcpHealthManifest` JSON/TS 双 agent |
| | 审计未完成即改 FE-P0-1 以外大功能 |

---

## Defer / out of scope（本计划）

| 项 | 原因 |
|----|------|
| Step 4 Business / Step 5 Ship | 后续 execution-plan 切片 |
| SHIP-P0-1 Phase 4 冷构建 | 需 Step 5 先审 |
| Track B P1+ 实施 | epic draft + ADR open |
| AskUserQuestion **恢复** backend 行为 | 高风险；仅文档/前端契约 |
| INT-P2-3 Option E robocopy | backlog deferred |
| 能力扩展白屏 **再改**（已修） | 仅验证 smoke；无 PASS 再开 hotfix |

---

## 批准后开始

用户回复 **「批准执行计划」** 或 **「执行 task」** 后：

1. `execution-plan.md` → `Status: approved`
2. 从 **Phase P0 基线** 开始（先跑测试，不改代码）
3. 每阶段更新本表 Progress snapshot

---

## 参考

- `docs/ai-tools-reference.md` §五 · §八
- `.cursor/skills/trellis-task-execution/SKILL.md` Step 5
- `07-02-mcp-health-coverage-expansion` 集成范例（`examples.md` Example 1；`execution-plan.md` 2026-07-03 追溯补档）
- `06-28-app-startup-readiness-gate/progress-2026-06-28.md`
