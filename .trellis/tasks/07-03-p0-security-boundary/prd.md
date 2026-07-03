# P0 — Security & Boundary Freeze

**Parent epic:** [`07-03-platform-business-decoupling`](../07-03-platform-business-decoupling/prd.md)  
**Phase:** P0  
**Design source:** [`docs/platform-system-business-decoupling-optimization.md`](../../../docs/platform-system-business-decoupling-optimization.md) §4.5、§18 Phase 0、§21

## Goal

在继续 P1–P5 平台解耦前，建立 **安全红线** 与 **平台/业务边界冻结规则**：处理凭据暴露风险、补齐 secret 门禁、文档化禁止耦合清单与命名策略，并留下可核验基线证据。

**不目标：** 本 task 不完成 registry/manifest（属 P1）、不搬迁万鼎包（属 P3）。

## Workstreams

| ID | 交付物 | 类型 |
|----|--------|------|
| P0-A | 凭据轮换与暴露评估记录（**不进 git 明文**） | 运维 + 私有记录 |
| P0-B | Secret scanning 门禁（CI 或 pre-commit） | 实现 |
| P0-C | `.trellis/spec/integration/platform-forbidden-coupling.md` | spec |
| P0-D | `platform-identity-schema.md` — tenant/package/capability 命名 | spec |
| P0-E | 更新 `platform-vertical-packages.md` — 四层链不重写 + P0 红线 | spec |
| P0-F | `p0-security-boundary-done.md` — 基线审计 + 验证证据 | task 记录 |

## Baseline findings（探索 2026-07-03）

见 [`research/p0-baseline-audit-2026-07-03.md`](./research/p0-baseline-audit-2026-07-03.md)。

摘要：

| 项 | 状态 | 说明 |
|----|------|------|
| `.mcp.json` git 跟踪 | **FAIL** | 已入库，需移出 + 轮换 |
| `scripts/org-phase0/env.local` git 跟踪 | **FAIL** | 已入库，需移出 + 轮换 |
| CI secret scanning | **GAP** | 仅 `release-installer.yml`，无 gitleaks/detect-secrets |
| 平台 TS 万鼎硬编码 | **GAP** | `agentSessionProfile.ts` 等 |
| 安装健康万鼎必需 | **GAP** | `install-health-manifest.json` 含 quotation/wanding 路径 |
| MCP health probe | **PASS** | `test-mcp-health.ps1 -Probe` 5/5（当前万鼎装配下） |

## Acceptance criteria

- [ ] P0-A：凭据轮换完成（证据在私有渠道，PR 仅写「已轮换」）
- [ ] P0-A：`.mcp.json`、`env.local` 从 git 跟踪移除 + `.gitignore` / `.env.example` 模板
- [ ] P0-B：CI 或 pre-commit 拦截常见 secret 模式（至少 API key / JWT / connection string）
- [ ] P0-C：`platform-forbidden-coupling.md` 合并 §21 规则 + 平台路径禁止词表
- [ ] P0-D：命名策略文档（tenant_id / package_id / capability_id / schemaVersion）
- [ ] P0-E：`platform-vertical-packages.md` 增补 P0 红线与四层链声明
- [ ] P0-F：`p0-security-boundary-done.md` 含验证命令输出摘要
- [ ] 探索基线：`research/p0-baseline-audit-2026-07-03.md` 已落档

## Verification commands

```powershell
# 基线 MCP（万鼎装配环境下）
powershell -NoProfile -File ccb-installer\scripts\test-mcp-health.ps1 -Probe -Quiet

# secret 文件不得再被跟踪（实施后）
git ls-files --error-unmatch .mcp.json  # 应失败
git ls-files --error-unmatch scripts/org-phase0/env.local  # 应失败

# secret scan（实施后，示例）
# gitleaks detect --source . --redact
```

## Out of scope

- OIDC/JWKS 实现（P4）
- Package manifest schema（P1）
- 从 install-health 移除万鼎文件（P3-E）

## Parallel feature tasks

进行中的 `07-01-price-library-admin-agent` 等：**不得**在 `ccb-installer/src` 平台层新增万鼎固定 ID 分支；新 Agent 应只在 `ccb-installer/config/agents/` + manifest 侧声明。
