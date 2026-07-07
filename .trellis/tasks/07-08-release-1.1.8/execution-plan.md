# Execution Plan — `07-08-release-1.1.8`

| Field | Value |
|-------|--------|
| **Status** | approved |
| **Approved** | 2026-07-07 |
| **Scenario** | **J**（发布打包） |
| **Plan depth** | **Full** |
| **Verification profile** | **Release** |
| **Active phase** | P1 — build |
| **Baseline** | [`ccb-installer/delivery-1.1.7-2026-07-06.md`](../../../ccb-installer/delivery-1.1.7-2026-07-06.md) |

## Skills invoked (this planning session)

| Invocation | Type | Evidence |
|------------|------|----------|
| trellis-task-execution | Read: | Scenario J playbook; Step 3b template |
| trellis-before-dev | Read: | `get_context.py --mode packages` → integration layers |
| wanding-release-standard | Read: | §0 四链、§3.1 Full NSIS、§4.1 config_generation、§6 |
| packaging-backlog-1.1.7 | Read: | 1.1.7 门禁 + build 命令范式 |
| delivery-1.1.7 | Read: | sha256、gen 5、aioncore 0.1.29、smoke 9/15 |
| 07-07-quotation-drat | Read: | P0 drat + P2 org mapping scope |
| git status | Shell: | 未提交 python/MCP/SKILL/spec；VPS org 803 rows 已 publish |
| aionui-src | Shell: | HEAD `6c65cce`（晚于 1.1.7 的 `b7fc914`）→ 必须重打 AionUI |
| dev smoke | User: | org 历史报价 + match 测试 PASS |

---

## Task summary

**Goal:** 打出 **CCB-Wanding 1.1.8** Full NSIS，包含 dev 已验证的全部报价/映射改动，参照 1.1.7 门禁，**不破坏 VPS 其他数据库**。

**1.1.8 用户可见变化（草案）：**

1. **历史报价 org 优先** — `match_quotation` 读 VPS `/api/quotation-mapping/active`（803 条已 bootstrap）
2. **drat 螺纹弯头召回** — `Elbow drat` → 丝扣/内螺纹弯头（matcher 算法，非仅知识库）
3. **learn-by-data Section D org 路径** — SKILL + MCP `lookup/append/publish_quotation_mapping_*`
4. **AionUI** — `6c65cce` 起 delegation / work-tasks 等（相对 1.1.7 的增量）

**Explicit NOT in installer（运行时依赖）：**

| 项 | 说明 |
|----|------|
| VPS `qmap_*` SQLite | 已在 VPS publish；员工机靠 `org-server.json` + org 登录 |
| VPS migration 019 | 已部署；打包机不再跑 bootstrap.sh |
| `bootstrap-quotation-mapping.py` | 运维脚本，进 repo `scripts/org-phase0/`，非 fleet 必装组件 |

---

## Phase -1 — Capability matrix

| Capability | Preferred tool | Status | Fallback |
|------------|----------------|--------|----------|
| Release spec | `wanding-release-standard.md` | available | packaging-backlog-1.1.7 |
| Pre-flight health | `test-package-health-split.ps1` | available | manual manifest check |
| CCB overlay sync | `sync-claude-code-b-mcp-prefetch.ps1` | available | — |
| Full NSIS build | `build-wanding.ps1` | available | — |
| AionUI rebuild | electron-builder via build-wanding | available | **禁止** `-SkipAionUiBuild` |
| aioncore inject | `-AioncorePath` | **risk** | 复用 1.1.7 的 `0.1.29` release exe（见边界 §B3） |
| Agent eval gate | `run-agent-eval-suite.ps1 -Suite smoke` | available | 1.1.7 同门槛 ≥7/15 |
| Code review | code-reviewer | available | trellis-check |
| VPS publish | `publish-update-bundle.ps1` | deferred | 用户确认后再做 |

---

## 边界与注意点（探索结论）

### B1 — 必须 Full NSIS，不能 hot-only

| 变更 | 路径 | 原因 |
|------|------|------|
| AionUI | `aionui-src` `6c65cce` ≠ 1.1.7 `b7fc914` | [`wanding-build-path-decision.md`](../../spec/guides/wanding-build-path-decision.md) |
| python + MCP | `vendor/wanding/python`, `quotation-server/dist` | 可 hot，但本版含 UI → 统一 Full NSIS |

打包前：

```powershell
Test-Path D:\Projects\aionui-src\out\win-unpacked\AionUi.exe   # 若 False，禁止 SkipAionUiBuild
# 若上次 electron-builder 被 kill → 删 out\win-unpacked + out\.build-hash 后全量重打
```

### B2 — 四链验收（org 历史报价）

| Chain | 1.1.8 检查点 |
|-------|----------------|
| ① 源码→staging | `staging\vendor\wanding\python\admin\org_mapping_client.py`；`staging\vendor\mcp-servers\quotation-server\dist\index.js` 含 3 个 mapping tools |
| ② staging→$INSTALL | NSIS robocopy vendor + MCP dist |
| ③ $INSTALL→$CONFIG | `config_generation` **5→6** + `deploy-ccb-skills` → `quotation-learn-by-data\SKILL.md`（Section D org 表） |
| ④ $INSTALL→$RUNTIME | `sync-aionui-ccb-route-b` + 完全退出重开（非 Ctrl+R） |

**Fleet 运行时前提（非安装包内容）：**

- `org-server.json` → `http://67.216.206.3:13401`
- VPS `GET /api/quotation-mapping/active` → **803 rows**（已完成）
- 员工 **org 登录** + **新建 Guid 会话**

### B3 — aioncore 策略

| 选项 | 建议 |
|------|------|
| 复用 1.1.7 嵌入的 `0.1.29` release exe | **推荐** — 1.1.8 匹配逻辑在 Python MCP；org API 在 VPS |
| 本地 `cargo build --release` | Windows 曾 `STATUS_STACK_BUFFER_OVERRUN`；若失败用 1.1.7 二进制 |
| 嵌入含 `quotation-mapping` crate 的新 aioncore | **非阻塞** — 仅 VPS org 服务需要；fleet 不依赖本地 crate |

### B4 — config_generation

`ccb-installer/seed/config-ship-manifest.json`：**5 → 6**

触发：`quotation-learn-by-data/SKILL.md` Section D org 路径变更 → 升级安装刷新 `$CONFIG/skills/`。

**不 bump 的后果：** 老用户 SKILL 仍是「仅 local pending + merge」文案。

### B5 — 工作区未提交

当前 `git status` 有大量 **未提交** 修改（python、MCP dist、SKILL、spec）。打包前 **二选一**：

1. **推荐：** 用户确认后 `git commit`（清晰 BUILD-INFO SHA）
2. **允许但须记录：** dirty build → `delivery-1.1.8-*.md` 标明 `dirty: true`

### B6 — 不影响其他数据库（硬约束）

| 允许 | 禁止 |
|------|------|
| 本地 staging / 测试机 silent install | VPS 跑 `bootstrap.sh` 覆盖 `JWT_SECRET` |
| 读 VPS org API 做 smoke | VPS 重 import 价格库 / 知识库 |
| 打包机 `bootstrap-quotation-mapping.py` 已跑完（803 active） | 打包脚本写 Neon / 本地 `data-org` |

### B7 — 1.1.7 继承门禁

| 门禁 | 1.1.8 沿用 |
|------|-----------|
| `Test-NsisPayloadCoverage` gen 6 | PASS |
| `Test-StagingWanDInstall` | PASS |
| Agent eval smoke | ≥7/15；Guid 报价路径全绿 |
| delivery + build log + sha256 | 必须 |
| orchestrator 4/4 绿 | **仍 defer**（不阻塞 Guid 发版） |

---

## Phase 0 — 落盘与 pre-flight

| Step | Tool | Output |
|------|------|--------|
| 0a | User approve plan | `Status: approved` |
| 0b | `git commit`（若用户同意） | 干净 SHA 或 documented dirty |
| 0c | Bump `config_generation` → **6** | `seed/config-ship-manifest.json` |
| 0d | `packaging-backlog-1.1.8.md` | 对照 1.1.7 清单 |
| 0e | `test-package-health-split.ps1` | 2/2 PASS |
| 0f | `node eval/run-agent-eval.mjs`（schema） | 72/72 PASS |

---

## Phase 1 — Sync & staging

| Step | Command | Output |
|------|---------|--------|
| 1a | `sync-claude-code-b-mcp-prefetch.ps1` | CCB overlay → claude-code-B |
| 1b | `build-wanding.ps1 -Version 1.1.8` | staging 完整 |
| 1b 参数 | `-AioncorePath D:\Projects\claude-code-best\AionCore\target\release\aioncore.exe` 或 1.1.7 缓存路径 | 注入 0.1.29+ |
| 1b 日志 | `Tee-Object build-1.1.8-staging-nsis.log` | 可追溯 |

**Normative build block:**

```powershell
cd D:\Projects\claude-code-best

.\ccb-installer\scripts\test-package-health-split.ps1
node eval\run-agent-eval.mjs

.\ccb-installer\scripts\sync-claude-code-b-mcp-prefetch.ps1

Push-Location .\ccb-installer\scripts
try {
  .\build-wanding.ps1 -Version 1.1.8 `
    -AioncorePath D:\Projects\claude-code-best\AionCore\target\release\aioncore.exe `
    2>&1 | Tee-Object -FilePath ..\build-1.1.8-staging-nsis.log
  if ($LASTEXITCODE -ne 0) { throw "build-wanding exit $LASTEXITCODE" }
} finally { Pop-Location }
```

若 `-AioncorePath` 不存在 → 从 1.1.7 staging/install 复制 `aioncore.exe` 或 VPS Linux build 产物。

---

## Phase 2 — Post-build verification（Release profile）

| Gate | Command / check | Pass criteria |
|------|---------------|---------------|
| Staging chain A | `Test-Path staging\vendor\wanding\python\admin\org_mapping_client.py` | True |
| Staging chain A | `Select-String lookup_quotation_mapping staging\vendor\mcp-servers\quotation-server\dist\index.js` | hit |
| Staging chain A | `staging\seed\skills\quotation-learn-by-data\SKILL.md` 含 org 表 | True |
| NSIS | `CCB-Wanding-1.1.8.exe` + sha256 | 记录 delivery |
| gen | `config_generation` = 6 in seed | True |
| Silent install | `/S /D=D:\CCB-Wanding-test` 或覆盖 D:\CCB-Wanding | `dist/VERSION = 1.1.8` |
| MCP health | `test-mcp-health.ps1 -InstallDir ... -Repair` | PASS |
| Agent eval | `run-agent-eval-suite.ps1 -Suite smoke -Run -Json` | ≥7/15 |
| **1.1.8 feature** | 新会话 `match_quotation` 历史报价 | org source；drat 行可选 |
| Route B | `ccb-check-install.cmd` | runtime markers OK |

---

## Phase 3 — Delivery artifacts

| Artifact | Path |
|----------|------|
| Installer | `ccb-installer/CCB-Wanding-1.1.8.exe` |
| Delivery note | `ccb-installer/delivery-1.1.8-2026-07-07.md` |
| Build log | `ccb-installer/build-1.1.8-staging-nsis.log` |
| Dev checklist | `ccb-installer/dev-test-checklist-1.1.8.md` |
| Employee notes | `ccb-installer/release-notes-员工.md`（追加 1.1.8 段） |
| Ops notes | `ccb-installer/release-notes-ops.md` |

---

## Feature matrix — Full NSIS 1.1.8

| Feature | Source | Staging artifact | $INSTALL | $CONFIG | Verified |
|---------|--------|------------------|----------|---------|----------|
| Org 历史报价 read | `org_mapping_client.py`, `cache.py` | vendor python | ✅ | — | ☐ |
| Mapping MCP tools | `quotation-server/dist`, `tool_dispatch.py` | MCP dist | ✅ | — | ☐ |
| drat 螺纹弯头 | `wanding_fuzzy_matcher.py` | vendor python | ✅ | — | ☐ |
| learn-by-data §D org | `quotation-learn-by-data/SKILL.md` | seed/skills | seed | skills (gen 6) | ☐ |
| AionUI delegation/tasks | `aionui-src` 6c65cce | AionUi.exe in staging | ✅ | — | ☐ |
| VPS org 803 rows | VPS（已部署） | — | — | org login | ☐ |

`config_generation`: **5 → 6**  
`AionUI rebuilt`: **yes**  
`aioncore`: **0.1.29**（复用或同版本）

---

## TDD contract

| Workstream | Test level | RED/GREEN | Notes |
|------------|------------|-----------|-------|
| Packaging gates | smoke | N/A | health split + staging tests in build-wanding |
| drat matcher | unit | `pytest test_drat_elbow_aw.py` — **21 pass**（dev 已验） | 打包前再跑 |
| org mapping MCP | unit | `pytest test_org_mapping_dispatch.py` | 打包前再跑 |
| Agent eval | integration | smoke suite ≥7/15 | post-install |

---

## Verification gate (fixed chain)

1. **code-reviewer** — packaging scope + config_generation bump + 四链矩阵
2. **Release smoke** — Phase 2 全部命令 + 证据写入 delivery
3. **trellis-update-spec** — `wanding-release-standard` 示例版本号（可选）
4. **delivery-1.1.8-*.md** 完成
5. `git commit` — **仅用户明确要求**
6. VPS manifest — **用户明确要求后** `publish-update-bundle.ps1`

---

## Manual steps (human)

- [ ] 批准本 execution-plan
- [ ] 确认是否先 `git commit` 再打包
- [ ] 打包完成后：完全退出 AionUI → silent/覆盖安装 → org 登录 → **新建 Guid 会话**
- [ ] 验收：`match_quotation` 出现 `历史报价`；可选 `Elbow drat ½" AW`
- [ ] 确认不触碰 VPS 知识库 / 价格库 / 用户表

---

## Recovery

| Trigger | Action | Re-approval |
|---------|--------|-------------|
| `build-wanding` FAIL | 读 log；NSIS coverage / AionUI build | 若改 scope |
| aioncore release 本地失败 | 复用 1.1.7 0.1.29 exe | no |
| Agent eval <7/15 | 对照 1.1.7 defer 列表；仅 Guid 路径红则阻塞 | yes if lowering gate |
| upgrade 后 SKILL 旧 | 确认 gen 6 + bootstrap reset | no |
| dirty tree | commit 或 delivery 标注 | no |

---

## Defer / out of scope

- VPS `publish-update-bundle` + manifest 行（Phase 4，用户确认后）
- `mapping_table.xlsx` 再次 bootstrap（803 已有）
- AionCore 本地嵌入 quotation-mapping crate
- orchestrator eval 4/4 全绿
- manufacturing pilot
