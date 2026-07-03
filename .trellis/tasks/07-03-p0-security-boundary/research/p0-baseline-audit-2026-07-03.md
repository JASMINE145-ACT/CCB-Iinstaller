# P0 Baseline Audit — 2026-07-03

**Task:** `07-03-p0-security-boundary`  
**Mode:** explore + test（无产品代码改动）  
**Skills used:** `openspec-explore`, `/trellis-plan-execution`, `test-mcp-health.ps1`

---

## 1. Executive summary

| Area | Verdict | Notes |
|------|---------|-------|
| Secret 入库 | **FAIL** | `.mcp.json`、`scripts/org-phase0/env.local` 被 git 跟踪 |
| Secret scanning CI | **GAP** | 无 gitleaks / detect-secrets workflow |
| 平台层万鼎硬编码 | **GAP** | 预期内；P0 文档化 + P1/P3 消除 |
| 安装健康万鼎耦合 | **GAP** | `install-health-manifest.json` OOTB 要求万鼎路径 |
| 当前 MCP 运行健康 | **PASS** | Probe 5/5（在万鼎完整装配前提下） |

**P0 结论：** 探索与基线测试已完成；**实施阶段必须先处理 tracked secrets**，再落 spec 门禁。

---

## 2. Security — tracked secret files

```powershell
git ls-files --error-unmatch .mcp.json
git ls-files --error-unmatch scripts/org-phase0/env.local
# 均返回路径 → 文件在版本库中
```

| File | Risk | Git history |
|------|------|-------------|
| `.mcp.json` | MCP 启动配置常含 token/path | 见于 `d02a8806`, `b8a61048` 等 |
| `scripts/org-phase0/env.local` | org 部署环境变量 | 同上 |

**处理原则（设计文档 §12.3）：**

- 立即轮换（不进 spec/PR 明文）
- 从 index 移除，改 `.example` 模板
- 评估 history 暴露（BFG 或接受风险并轮换）

**未读取文件内容** — 本审计不记录任何 secret 值。

---

## 3. CI / scanning gap

| Asset | Finding |
|-------|---------|
| `.github/workflows/` | 仅 `release-installer.yml` |
| pre-commit | 仓库根无项目级 pre-commit 配置 |
| 设计文档 P0-B | 要求 CI 或等效 gate — **未实现** |

**建议实施（P0-B）：** `gitleaks` 或 `detect-secrets` on PR + 自定义 allowlist for false positives。

---

## 4. Platform coupling inventory（样本）

### 4.1 `ccb-installer/src/services/acp/agentSessionProfile.ts`

- `CCB_DEFAULT_SESSION_AGENT_ID = 'wande-orchestrator'`
- `CCB_WANDING_KEEP_AGENT_IDS` 含 `wande-orchestrator`, `quotation-agent`, `accurate-agent`, …
- 路由/守卫文案硬编码 quotation/accurate/wanding 路径
- **粗计：** ~42 处 wande/quotation/accurate/wanding 相关匹配

**分类：** 平台运行时中的 **业务身份** — P3 应收口到 registry + 业务包；P0 仅 **禁止新增**。

### 4.2 `ccb-installer/resources/install-health-manifest.json`

- OOTB 必需：`vendor/wanding/*`, `quotation-agent.md`, `run-wanding-bootstrap.ps1`, …
- **粗计：** ~20 处 wanding/quotation/accurate 相关条目

**分类：** P3-E「平台健康不依赖万鼎文件」的直接证据。

### 4.3 配置层（预期位置，非平台 core 缺陷）

- `ccb-installer/config/agents/*` — 业务 Agent 定义（将来 `com.wanding.trade`）
- `mcp-health-manifest.json` — 健康 + allowlist（将来由 manifest 生成）

---

## 5. Test evidence — MCP health probe

**Command:**

```powershell
powershell -NoProfile -File ccb-installer\scripts\test-mcp-health.ps1 -Probe -Quiet
```

**Result:** exit 0

| Check | Result |
|-------|--------|
| Agent allowlists (8 agents incl. wande/quotation/accurate/price-library) | PASS |
| stdio probe quotation | PASS (9 tools, ~14.8s) |
| stdio probe accurate | PASS |
| stdio probe office-word / excel / price-library | PASS |
| Summary | **PASS 5/5 servers** |

**解读：**

- 证明 **当前万鼎装配** 下 MCP 链健康 — 可作为 P3 回归对照基线
- **不能** 证明「空平台无万鼎包可启动」— 那是 P3 验收标准

---

## 6. P0 workstream readiness

| WS | Explore | Implement ready? |
|----|---------|------------------|
| P0-A 凭据 | 已定位 tracked files | 需用户批准 + 人工轮换 |
| P0-B secret scan | 已确认 gap | 可加 workflow |
| P0-C 禁止清单 | 已从 §21 提取要点 | 可写 spec |
| P0-D 命名策略 | 设计文档 §6 有草案 | 可写 spec |
| P0-E 四层链声明 | platform-vertical-packages 已有部分 | 补丁即可 |

---

## 7. Recommended next steps

1. 用户批准 `execution-plan.md` → `Status: approved`
2. `python ./.trellis/scripts/task.py start 07-03-p0-security-boundary`
3. 实施顺序：**P0-A（secret 移出）→ P0-B（scan）→ P0-C/D/E（spec）→ P0-F**
4. 父 epic `status.md` 将 P0 标为 `explore done`

---

## 8. Forbidden in P0 implement

- 修改 `install-health-manifest.json` 删除万鼎条目（P3）
- 重构 `agentSessionProfile.ts` 去硬编码（P1 alias / P3 包）
- 在审计文档中粘贴任何凭据明文
