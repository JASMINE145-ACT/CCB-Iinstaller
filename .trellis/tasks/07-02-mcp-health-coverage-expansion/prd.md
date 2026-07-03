# MCP 健康检查覆盖扩展 + Agent 辅助修复

## Goal

在现有 **CCB MCP 健康检查**（Settings → 能力扩展 → 工具）基础上，补齐「看起来全绿、Guid 仍有问题」的盲区，并把 **Agent 辅助修复** 从「仅配置层白名单」扩展到可处理更多失败类型。

**Explore 结论（2026-07-02）：** 用户截图 24/24 通过的是 **Layer 1 配置+文件+agents**；这不等于「所有 MCP / 所有专家会话 / 所有业务路径」都健康。

## 现状快照

```
┌─────────────────────────────────────────────────────────────┐
│              CCB MCP Health — 当前覆盖地图                    │
├─────────────────────────────────────────────────────────────┤
│  Layer 1 配置+文件+agents   │ UI 快速检查 ✅  │ CLI ✅       │
│  Layer 2 stdio probe        │ UI 完整探测 ✅  │ CLI -Probe ✅│
│  Layer 3 ACP session        │ UI ❌           │ CLI -Session ✅│
│  Skills (ppt-master 等)     │ ❌              │ ❌           │
│  ROE / subagent-gate hooks  │ ❌              │ smoke-roe 单独│
│  Org price library VPS      │ ❌              │ 手动          │
└─────────────────────────────────────────────────────────────┘
```

**Manifest 已登记 MCP（`mcp-health-manifest.json`）：**

| MCP | Probe | 说明 |
|-----|-------|------|
| `quotation` | ✅ deep | `match_quotation` + `get_inventory_by_code` |
| `accurate` | ✅ deep | `accurate_summarize_records` |
| `office-word` | ⚠️ shallow | 仅 `tools/list` |
| `excel` | ⚠️ shallow | 仅 `tools/list` |
| `excel-mcp` (COM) | ⏭️ lazy | 需本机 Excel |
| `exa` | ⏭️ optional | HTTP，需网络 |
| `scrapling` | ⏭️ optional | research 扩展 |

**Agent keep-set 专家（`agents/README.md`）：** 7 个；health 只 gate 5 个 session profile（不含 `ppt-creator` / `research-agent` 的 skill/MCP 探针）。

## Problem

1. **UI 与 CLI 不对等：** `-Session`（ACP 实际加载的 MCP allowlist）只在 CLI，UI 无入口 → 用户「完整探测 PASS」但 Guid 卡片仍缺工具时无法自助定位。
2. **浅探针盲区：** `office-word` / `excel` 冷启动或 Python deps 损坏时，`tools/list` 可能 PASS 但 `tools/call` 失败（历史类同 accurate summarize 问题）。
3. **Optional MCP 无信号：** `research-agent` 的 `exa`、`excel-mcp` 注册与否 health 不报告 → 用户不知道「资料搜索助手」是否可用。
4. **Agent 修复边界窄：**
   - ✅ 已有：白名单 5 步（`ensure-wanding-settings`、`deploy-seed-agents`、word/excel repair、subagent-mcp）
   - ✅ 已有：MiniMax 分析 → Guid 预填 prompt
   - ❌ 缺口：`probe` 失败多标 `manual`；vendor 缺失无自动 reinstall 脚本；Session 层失败无诊断文案

## Scope

### In scope

#### Workstream A — UI 覆盖透明化（P0）

1. **Health Panel 增加「覆盖说明」折叠区：** 列出 manifest 中 core / lazy / optional MCP 及当前 UI/CLI 各层是否检测（对齐 `mcp-health.md` § MCP + Skill coverage 表）。
2. **UI 展示 agents 层检查结果：** CLI Layer 1 已含 agent sidecar / `mcp_allowlist`；UI 目前只展示 config+probe 两层 → 把 `agents` 层纳入 `CcbMcpHealthPanel` Collapse（与 config 同级或子层）。
3. **失败时显示「建议下一步」：** 区分「新开专家 Guid 卡片」vs「运行 Repair」vs「CLI -Session」。

#### Workstream B — Session 探针进 UI（P1）

4. **可选按钮「会话探针」：** 等价 CLI `-Session`（串行，~30s）；写 handoff 文件 → `test-mcp-session-health.mjs`。
5. **Session 失败诊断：** `missing mcp: office-word` → 文案指向 handoff 过期（300s）或需新开 Word 文档助手卡片。

#### Workstream C — 深探针补齐（P1）

6. **`office-word` probe_tool_call：** 轻量只读调用（如 list templates / health ping tool，需 spike 选最小无副作用 tool）。
7. **`excel` probe_tool_call：** 同理（如 list sheets on temp empty workbook 或 server health tool）。
8. **Manifest + TS mirror 同步更新。**

#### Workstream D — Optional MCP 与 Skill 登记（P2）

9. **`research-agent` / `exa`：** 当 `settings.json` 已注册时，可选 HTTP probe（短超时，network fail → WARN 非 FAIL）。
10. **`ppt-creator` skill 存在性：** config 层检查 `$CONFIG/skills/ppt-master/SKILL.md` + vendor tree（不 spawn）。
11. **与 `07-01-price-library-admin-agent` 协调：** 若该 task 已登记 `price-library` MCP，本 task 追加 manifest 条目（dependency note，不阻塞 A–C）。

#### Workstream E — Agent 辅助修复增强（P1）

12. **Diagnosis 扩展：** 将以下模式从 `manual` 升为 `fixable`（若官方脚本存在）：
    - `quotation.env.CCB_PROJECT_ROOT` 错误 → `ensure-wanding-settings`
    - `.env.accurate` BOM / parse fail → `ensure-wanding-settings`
    - probe `disabled in settings` → 已有，保持
13. **MiniMax prompt 模板增强：** Session 层失败项、probe deep-call 失败、skill 缺失 — 纳入 `buildMinimaxPromptForReport`。
14. **（可选）Config FAIL 时启动 banner CTA：** 对齐 `mcp-health.md` § App startup readiness gate「Still open」— 若本 task 时间紧可 defer。

### Out of scope

- 重写整个 health 架构或合并 `install-health-manifest.json`（安装树 gate 保持独立）
- `excel-mcp` COM 自动化探针（需本机 Excel + COM，仅文档化 WARN）
- Org price library VPS 在线 probe（另 task / manual）
- `smoke-roe-deploy.ps1` 并入 UI（ROE 保持 CI/脚本 gate）
- Agent 自动执行非白名单 shell（安全边界不变）

## Architecture

```
用户点击「完整探测」
        │
        ├─ Layer 1: config + files + agents  ← Workstream A 补 UI agents 层
        │
        ├─ Layer 2: stdio probe (+ deep call) ← Workstream C 补 word/excel
        │
        └─ Layer 3: session probe (optional)  ← Workstream B 新增 UI 按钮
                │
                ▼
        diagnoseCcbMcpHealth()
                │
        ├─ fixable → 一键白名单 repair
        └─ manual/remaining → MiniMax Guid prompt (Workstream E)
```

**Canonical files（改动预期）：**

| 文件 | 变更 |
|------|------|
| `ccb-installer/config/mcp-health-manifest.json` | word/excel probe_tool_call; optional exa |
| `aionui-src/.../ccbMcpHealthManifest.ts` | mirror |
| `aionui-src/.../ccbMcpHealth.ts` | agents layer in report; session probe IPC |
| `aionui-src/.../ccbMcpHealthDiagnosis.ts` | 扩展 fixable 模式 + prompt |
| `aionui-src/.../CcbMcpHealthPanel.tsx` | agents 层 UI + session 按钮 + 覆盖说明 |
| `ccb-installer/scripts/test-mcp-health.ps1` | 与 UI 对齐（若 session 参数化） |
| `.trellis/spec/integration/mcp-health.md` | 更新覆盖表 |

## Acceptance criteria

- [x] UI 健康面板可见 **agents 层**检查结果（与 CLI Layer 1 agents 项一致）
- [x] UI 有 **覆盖说明**（core 4 / lazy / optional / skills / session-only CLI）
- [x] **Session 探针**可选运行；失败有 handoff/新开会话诊断文案
- [x] `office-word` / `excel` manifest 含 `probe_tool_call`；`-Probe` 失败时能定位到 call 层
- [x] `exa` 已注册时 probe 为 WARN/PASS（网络不可达 WARN，不阻塞 core 4）
- [x] Diagnosis：`CCB_PROJECT_ROOT` / `.env.accurate` BOM 类失败 → `repair_plan` 含 `ensure-wanding-settings`
- [x] MiniMax prompt 含 Session / deep-probe / skill 失败上下文
- [x] `bun test ccbMcpHealth*.test.ts` PASS
- [x] `test-mcp-health.ps1 -Probe -Session` 仍 PASS（dev `D:\CCB-Wanding`）
- [x] `mcp-health.md` 覆盖表更新

## Verification

```powershell
# CLI full gate
cd D:\Projects\claude-code-best
.\ccb-installer\scripts\test-mcp-health.ps1 -Probe -Session

# Unit
cd D:\Projects\aionui-src
bun test tests/unit/common-config/ccbMcpHealth.test.ts
bun test tests/unit/common-config/ccbMcpHealthDiagnosis.test.ts

# UI manual
# start-dev-full.ps1 → Settings → 工具 → 快速检查 / 完整探测 / 会话探针
# 故意删 sidecar → 一键修复 → 复检 PASS
```

## Phasing

| Phase | 内容 | 优先级 |
|-------|------|--------|
| A | UI agents 层 + 覆盖说明 | P0 |
| B | Session 探针 UI | P1 |
| C | word/excel deep probe | P1 |
| E | Diagnosis + MiniMax prompt | P1 |
| D | exa + ppt skill 登记 | P2 |

## Related

- Spec: [`.trellis/spec/integration/mcp-health.md`](../../spec/integration/mcp-health.md)
- Prior: explore 2026-07-02（24/24 快速检查 vs 全面性）
- Related task: `07-01-price-library-admin-agent`（新 MCP 登记）
- Agent repair whitelist: `ccbMcpHealthDiagnosis.ts` `CCB_MCP_HEALTH_REPAIR_ACTION_IDS`
