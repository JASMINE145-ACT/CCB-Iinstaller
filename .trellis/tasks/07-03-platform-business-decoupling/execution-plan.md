# Execution Plan — `07-03-platform-business-decoupling`

| Field | Value |
|-------|--------|
| **Status** | in_progress |
| **Scenario** | B（大型规格 + 多 Phase epic） |
| **Plan depth** | Full |
| **Verification profile** | Standard |
| **Active phase** | P1 complete — awaiting P2 approval |
| **Approved** | 2026-07-03 (user) |
| **Parent doc** | `docs/platform-system-business-decoupling-optimization.md` |

## Progress snapshot

| Phase | State | Delivery / evidence |
|-------|--------|---------------------|
| P0 Security & boundary freeze | **done** (ops rotation pending) | `07-03-p0-security-boundary` · commit `6d81848f` · `p0-security-boundary-done.md` |
| P1 Meta-model & read-only registry | **done** | `p1-registry-snapshot-done.md` · tests 3/3 · lint 0 errors / 10 warnings · MCP probe 5/5 |
| P2 Config compiler & single source | pending | — |
| P3 Extract `com.wanding.trade` | pending | — |
| P4 Control plane & tenant governance | pending | — |
| P5 Second vertical pilot | pending | — |

---

## Phase -1 — P1 capability matrix

| Capability | Preferred tool | Status | Fallback |
|------------|----------------|--------|----------|
| Spec/context loading | `trellis-before-dev` | available | Direct read of integration specs |
| Implementation | Main session (Codex inline) | available | — |
| TDD | Node `node:test` | available | Exact CLI assertions without framework dependency |
| Review | `trellis-check` guidance | available | Diff/spec review in main session |
| Registry JSON validation | Node runtime | available | Manual structural validator aligned to JSON Schema |

## P1 execution contract

| WS | Risk | Canonical files | Required output | Profile |
|----|------|-----------------|-----------------|---------|
| P1-A/B/F Schema + descriptors + capability IDs | `cross-layer` | `ccb-installer/config/schemas/`, `ccb-installer/config/packages/` | JSON Schema + valid WanD example | Standard |
| P1-C Legacy aliases | `cross-layer` | WanD package manifest | Alias edges resolved without platform hardcoded branches | Standard |
| P1-D Registry snapshot | `long-running` | `ccb-installer/scripts/build-package-registry.mjs` | Deterministic read-only snapshot | Standard |
| P1-E Registry lint | `cross-layer` | builder + Node tests | Duplicate/missing/orphan diagnostics; errors fail CLI | Standard |
| P1 record | — | task plan/PRD/done record | Commands, counts, warnings, sample output path | Standard |

### P1 TDD contract

| Workstream | Test level | RED evidence | GREEN command | Regression target |
|------------|------------|--------------|---------------|-------------------|
| Schema/example | unit | Import/build test fails before builder exists | `node --test ccb-installer/scripts/__tests__/build-package-registry.test.mjs` | Invalid IDs/references rejected |
| Snapshot/lint | integration | Real fixture build unavailable before implementation | same targeted test + CLI build | Existing assets produce deterministic graph and traceable warnings |

### P1 recovery

| Trigger | Return to | Evidence/update | Re-approval? |
|---------|-----------|-----------------|--------------|
| Existing asset cannot map without inventing ownership | P1 manifest design | WARN diagnostic + done-record defer | No, if runtime unchanged |
| Schema requires runtime/config migration | Epic planning | PRD/plan scope change | Yes |
| Registry generation mutates source assets | P1 implementation | Stop; restore read-only design | Yes |

---

## Scenario classification

**Scenario B** — 多周 epic，需设计 artifact + 分 Phase Trellis 子交付；与 OpenSpec/Trellis 同步。

**Repos:** 主仓 `claude-code-best`；触及 `ccb-installer`、`AionCore`、`aionui-src`（按 Phase 分 workstream，不默认并行改双仓）。

**Spec entry:**

- `.trellis/spec/integration/platform-vertical-packages.md`
- `.trellis/spec/integration/platform-architecture.md`
- `.trellis/spec/backend/config-layer.md`
- `docs/platform-system-business-decoupling-optimization.md`

---

## Phase 0 — Activate & read（每个 Phase 重复）

| Step | Tool / skill | Output |
|------|--------------|--------|
| Read design + ADR | `trellis-before-dev` → integration + backend index | checklist |
| Phase kickoff | `task.py set-status` + 更新本表 Active phase | in_progress |
| 大改前 | `/opsx:explore` 或 `trellis-brainstorm` | phase 级 decisions.md（可选） |

---

## Workstream → tool mapping（按 Phase）

| Phase | Priority | Workstream | Tool / agent | Canonical files |
|-------|----------|------------|--------------|-----------------|
| **P0** | P0 | 安全与边界 | `security-review` / 人工轮换 | `scripts/org-phase0/`, CI, spec |
| **P0** | P0 | 禁止清单 ADR | `trellis-update-spec` | `integration/platform-vertical-packages.md` |
| **P1** | P0 | JSON Schema + descriptors | `trellis-implement` + TDD | `openspec/` 或 `spec/integration/` |
| **P1** | P0 | Registry snapshot + lint | `trellis-implement` | `ccb-installer/config/`, 新 `scripts/registry/` |
| **P2** | P0 | 配置编译器 | TDD 优先 → `code-reviewer` | `ccb-installer/scripts/`, config-layer spec |
| **P2** | P1 | Provenance / drift | `trellis-check` | 生成物 vs manifest |
| **P3** | P0 | 万鼎包抽取 | `trellis-implement`（分多个子 task） | `ccb-installer/`, agents, MCP, python |
| **P3** | P0 | 平台健康拆分 | TDD + `test-mcp-health.ps1` | `install-health-manifest.json` |
| **P4** | P0 | OIDC/JWKS | `trellis-implement` | `AionCore/`, org service |
| **P4** | P1 | 控制面 MVP | phased PRs | org admin API, optional AionUI |
| **P5** | P0 | 第二垂直包 | 新 package + `trellis-check` | 新 `com.*` manifest |

---

## Verification gate（每个 Phase 结束时 — 单一链路）

```
Phase 代码/文档改动
  → code-reviewer agent（或 trellis-check — 二选一作主审）
  → 运行验证 + 贴证据（phase 对应 pytest / vitest / test-mcp-health / smoke）
  → trellis-update-spec（+.trellis/spec/）
  → implement.jsonl + check.jsonl + prd Phase AC [x]
  → 写入 pN-*-done.md
  → git commit（仅用户明确要求时）
```

**WanD 集成 Phase（P3）额外：** UI manual — Settings → 工具 → 健康面板；装卸万鼎包 smoke。

---

## Parallelization rules

| 可并行 | 必须串行 |
|--------|----------|
| P0-A 凭据轮换 ∥ P0-C 文档 | P1 在 P0 红线成立后 |
| P1-A schema ∥ P1-F capability 命名表 | P2 编译器依赖 P1 descriptor |
| P3 包内 Agent 迁移子流（不同文件） | P3-E 健康拆分 在 P2 投影可用后 |
| P4 文档/IaC ∥ P4-C OIDC spike | P5 依赖 P3 包格式 + P4 租户最小集 |

**禁止：** 两 agent 同时改同一 manifest 或 `mcp-health-manifest` JSON + TS mirror（参照 `07-02` 串行合并规则）。

---

## 子 Task 拆分建议（Phase 落地时 `task.py create --parent`）

| 建议子 task slug | Phase | 说明 |
|------------------|-------|------|
| `07-03-p0-security-boundary` | P0 | 凭据 + scanning + 禁止清单 |
| `07-03-p1-package-manifest-schema` | P1 | Schema + descriptor 类型 |
| `07-03-p1-registry-snapshot-lint` | P1 | 只读 registry 生成与 lint |
| `07-03-p2-config-compiler-v1` | P2 | 编译器 + settings 投影 |
| `07-03-p2-provenance-drift` | P2 | provenance + drift 检测 |
| `07-03-p3-wanding-package-extract` | P3 | 万鼎包主体（可再拆 Agent/MCP/health） |
| `07-03-p3-platform-health-split` | P3 | 安装健康与万鼎解绑 |
| `07-03-p4-oidc-jwks-tenant` | P4 | 身份 + tenant 贯穿 |
| `07-03-p4-control-plane-mvp` | P4 | lock、drift、审计 MVP |
| `07-03-p5-second-vertical-pilot` | P5 | 第二家公司包 + 验收 |

> Epic 本体保持 **planning/coordination**；具体编码在子 task 中 `start` + `finish`。

---

## Manual steps

- [ ] P0：确认凭据轮换完成（运维记录，不进 git）
- [ ] P3：electron-demo / 安装包 UI smoke（装卸万鼎包）
- [ ] P4：VPS 或分租户环境部署验证（若适用）
- [ ] P5：业务方验收第二垂直场景

---

## Defer / out of scope

- 重写四层运行链
- 共享 DB 多租户
- 完整商业包仓库

---

## 用户批准前禁止

- 将本 epic 标为 `completed`
- 未写 `pN-*-done.md` 即勾选 Phase 完成
- 跳过 P0 直接做 P3 代码搬迁
