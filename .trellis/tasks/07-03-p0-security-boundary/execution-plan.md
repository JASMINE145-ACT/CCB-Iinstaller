# Execution Plan — `07-03-p0-security-boundary`

| Field | Value |
|-------|--------|
| **Status** | in_progress |
| **Scenario** | A（标准 spec + 门禁，跨 integration/backend） |
| **Parent** | `07-03-platform-business-decoupling` |
| **Active phase** | P0 implement done — pending ops rotation + git commit |

## Progress snapshot

| Step | State | Evidence |
|------|--------|----------|
| P0-Explore 基线审计 | **done** | `research/p0-baseline-audit-2026-07-03.md` |
| P0-Explore MCP probe | **done** | `test-mcp-health.ps1 -Probe` PASS 5/5 |
| P0-A 凭据移出 git | **done** | `.gitignore`, examples, `git rm --cached` |
| P0-B secret scanning | **done** | `secret-scan.yml`, `.gitleaks.toml` |
| P0-C forbidden-coupling spec | **done** | `platform-forbidden-coupling.md` |
| P0-D identity schema spec | **done** | `platform-identity-schema.md` |
| P0-E platform-vertical-packages 更新 | **done** | §10 |
| P0-F done 记录 | **done** | `p0-security-boundary-done.md` |
| Ops 凭据轮换 | pending | 人工 |
| Atomic git commit | pending | 人工 |

---

## Scenario: **A**

安全与 spec 门禁为主；少量脚本/CI 改动；无 AionUI 双仓并行。

**Spec entry:**

- `docs/platform-system-business-decoupling-optimization.md`
- `.trellis/spec/integration/platform-vertical-packages.md`
- `.trellis/spec/backend/config-layer.md`

---

## Phase 0 — Explore（已完成）

| Step | Tool | Output |
|------|------|--------|
| 读 parent P0 + 设计 §4、§12、§21 | `openspec-explore` | 基线审计文档 |
| 扫描 git 跟踪的 secret 文件 | `git ls-files` | `.mcp.json`, `env.local` **已跟踪** |
| 扫描平台层万鼎硬编码 | `grep` | `agentSessionProfile.ts` 等 |
| 运行 MCP 基线 | `test-mcp-health.ps1 -Probe` | 5/5 PASS |

---

## Phase 1 — Implement（待用户批准「执行 task」）

| Priority | Workstream | Tool | Files |
|----------|------------|------|-------|
| P0 | P0-A 移出 secret 文件 | 人工轮换 + `trellis-implement` | `.gitignore`, `.mcp.json.example`, `scripts/org-phase0/env.local.example` |
| P0 | P0-B secret scan | `trellis-implement` | `.github/workflows/secret-scan.yml` 或 pre-commit |
| P0 | P0-C 禁止清单 | `trellis-update-spec` | `integration/platform-forbidden-coupling.md` |
| P1 | P0-D 命名策略 | `trellis-update-spec` | `integration/platform-identity-schema.md` |
| P1 | P0-E ADR 补丁 | `trellis-update-spec` | `platform-vertical-packages.md` |
| — | P0-F 收尾 | 文档 | `p0-security-boundary-done.md` |

**禁止在本 phase 做：** 修改 `install-health-manifest.json` 移除万鼎（属 P3）；不改 `agentSessionProfile.ts` 大重构（属 P1/P3）。

---

## Verification gate

```
P0 实现改动
  → code-reviewer（secret 移除 + CI 配置 + spec）
  → test-mcp-health.ps1 -Probe（回归）
  → secret scan 命令（新 CI job 本地 dry-run）
  → trellis-update-spec
  → implement.jsonl + check.jsonl + prd AC
  → p0-security-boundary-done.md
```

---

## Manual steps

- [ ] **人工：** 在秘钥管理平台轮换 `.mcp.json` / `env.local` 中已暴露凭据（不进 PR 正文）
- [ ] **人工：** 确认 Git 历史暴露范围（是否需 BFG / 新 repo 策略）

---

## 批准前禁止

- 将 P0 标 completed 而无 secret 移出 git 证据
- 在 spec 中写入 secret 明文
