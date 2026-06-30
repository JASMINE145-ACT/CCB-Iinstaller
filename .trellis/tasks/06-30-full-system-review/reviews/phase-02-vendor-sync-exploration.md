# Phase 2 Exploration — Vendor Sync Gate

> Task: `06-30-full-system-review` · subtask: `integration-fix-vendor-gate` · INT-P0-2  
> 日期: 2026-06-30 · 方法: system-reviewer 探索 + 脚本/spec 对照（只读，未改代码）

---

## Problem statement

`start-dev-full.ps1` 是 Rule 0 唯一 dev 入口，会 preflight 检查 `vendor\` 下文件**是否存在**（`quotation-server\dist\index.js`、`vendor\wanding\data\ccb-wanding-quotation.md` 等），但**从不**把 repo 的 `python/`、`data/`、`mcp_servers/quotation-server/dist` 同步到 `D:\CCB-Wanding\vendor\`。开发者改 `claude-code-best\python\` 后只跑 `start-dev-full.ps1 -SkipBootstrap`，MCP 仍执行旧 vendor 代码 — playbook 已多次记录为「随机报价 bug」根因（`dev-sync-playbook.md` §3.1、§7）。`dev-sync-playbook.md` L23 写「vendor 变更 → `start-dev-full.ps1`」，但脚本链 L39 **未含** vendor sync — **文档意图与实现脱节**。

---

## Current state

### Dev 启动链（today）

```text
start-dev-full.ps1
  ├─ preflight（检查 vendor 路径存在，不比对 repo）
  ├─ run-wanding-bootstrap.ps1 Quick（可选 -SkipBootstrap）
  ├─ sync-aionui-ccb-route-b.ps1
  ├─ warm-wanding-mcp.mjs copy
  ├─ sync-dev-aioncore.ps1（-Build + smoke）
  ├─ org SSO env
  └─ bun run dev

  ✗ sync-dev-wanding-vendor.ps1  ← 缺失
```

### `sync-dev-wanding-vendor.ps1` 行为（已有，手动）

| 步骤 | 源 | 目标 |
|------|-----|------|
| robocopy `/E` | `{RepoRoot}\python\` | `{InstallDir}\vendor\wanding\python\`（排除 tests、`__pycache__`、`test_*.py`） |
| copy 5 files | `data\` 白名单 xlsx/md | `vendor\wanding\data\` |
| robocopy `/E` | `mcp_servers\quotation-server\dist\` | `vendor\mcp-servers\quotation-server\dist\` |
| 可选 | `-UpdateSettings` | `ensure-wanding-settings.ps1` |
| 可选 | `-Smoke` | live python 跑 HDPE 用例 → `8010036693` |

脚本末尾有 **fingerprints**（4 个关键文件 size + mtime 对比），但**仅打印颜色，不 exit 非零**。

证据：`ccb-installer/scripts/sync-dev-wanding-vendor.ps1` L56–127；`start-dev-full.ps1` L55–202（无 vendor 调用）。

### 七层链中的位置（layer ⑥）

```text
⑥ vendor python + data  ← Save ≠ Deploy；必须 sync-dev-wanding-vendor
⑤ quotation MCP dist
④ CCB-Wanding dist
```

见 `dev-runtime-layers.md` §2 layer ⑥、`dev-sync-playbook.md` §4.3。

### 现有 hash/fingerprint 能力（repo 内）

| 位置 | 行为 |
|------|------|
| `sync-dev-wanding-vendor.ps1` § fingerprints | 4 文件 mtime/size，不 fail |
| `dev-sync-playbook.md` §5 | acp-agent hash 手动对比 |
| `smoke-roe-deploy.ps1` | live python hash spot-check |
| `start-dev-full.ps1` preflight | **无** repo↔live 比对 |

---

## Options comparison

| 选项 | 描述 | 优点 | 缺点 | 工作量 |
|------|------|------|------|--------|
| **A** | 每次 `start-dev-full` **强制** vendor sync | 零遗忘；与 playbook「vendor 变更跑 full」一致 | 每次 dev 启动多 robocopy（通常数秒～十几秒） | 低 |
| **B** | `-SyncVendor` **opt-in** | UI-only 启动最快 | **不解决 INT-P0-2**；多数人仍会忘 | 低 |
| **C** | **默认 sync** + `-SkipVendorSync` 跳过 | 默认正确；UI 专用可加速 | 需文档 `-SkipVendorSync`；首次仍可能误用 skip | 低～中 |
| **D1** | 仅 **hash preflight warn**（不同步） | 启动快 | 仍须人工跑 sync；warn 易被忽略 | 中 |
| **D2** | preflight **fail-closed**（漂移则 exit + 提示 sync） | 强制觉察 | 不自动修复；多一步命令 | 中 |
| **E**（混合，推荐细化） | **C + 智能**：默认 sync；或 mtime 漂移时 sync、否则 skip | 日常快、漂移自动修 | 实现稍复杂；需维护 fingerprint 列表与 sync 脚本一致 | 中 |

---

## Recommended approach

**Option C（默认 sync + `-SkipVendorSync`）**，首版不做法 E 智能跳过。

**理由：**

1. INT-P0-2 是「Save ≠ Deploy」— 默认必须对齐 repo→vendor，不能 opt-in。
2. robocopy 排除 tests，体量可控；比「随机报价 bug」调试成本低得多。
3. `-SkipBootstrap` 日常路径也应带上 vendor sync（python 改动与 bootstrap 无关）。
4. `-Smoke` **不要**默认开启（慢、依赖 vendor python.exe）；保留 `-VendorSmoke` 可选或文档化手动 smoke。
5. `-UpdateSettings` 首版**不**默认（bootstrap/ensure 另有路径）；可加 `-VendorUpdateSettings` 透传。

**插入顺序：** `route-b sync` **之后**、`sync-dev-aioncore` **之前**（layer ③ 胶水就绪后同步 ⑤⑥，再注入 layer ②）。

```text
bootstrap → route-b → 【vendor sync】 → aioncore → SSO → dev
```

---

## Implementation sketch（实现阶段，非本次）

1. **`start-dev-full.ps1`**
   - 新增 `[switch]$SkipVendorSync`（默认 `$false` = 执行 sync）
   - 可选 `[switch]$VendorSmoke`、`[switch]$VendorUpdateSettings`
   - 在 L127 后调用：
     ```powershell
     if (-not $SkipVendorSync) {
       & ...\sync-dev-wanding-vendor.ps1 -InstallDir $InstallDir -RepoRoot $repoRoot
       (+ -Smoke / -UpdateSettings if flags)
     }
     ```
   - 更新头部 Usage + COMPLETENESS CHECKLIST 注释

2. **`sync-dev-wanding-vendor.ps1`（可选增强）**
   - fingerprints 不匹配时 `exit 1`（仅当新 `-Strict`）— 可 Phase 2.1
   - 或导出函数供 preflight 只读比对

3. **不改** bootstrap Quick 对 vendor wanding python 的假设（bootstrap 不覆盖 `vendor\wanding\python` 业务树）

---

## Spec / docs to update（实现后）

| 文件 | 变更 |
|------|------|
| `integration/dev-sync-playbook.md` §1 Rule 0 链 | 加入 vendor sync 步骤；`-SkipVendorSync` |
| `integration/dev-runtime-layers.md` | layer ⑥ 注明 dev 默认自动 sync |
| `integration/dev-sync-playbook.md` L23–28 | 「vendor 变更」与脚本行为一致 |
| `outline.md` dev 表 | 提及 `-SkipVendorSync` |
| `frontend/dev-test-ship.md` | symptom「查价缺编码」→ 先确认未 `-SkipVendorSync` |
| `delivery-phase-02-integration-vendor.md`（新建） | 实现交付记录 |
| `task.json` | `integration-fix-vendor-gate` → completed |

---

## Acceptance criteria（Phase 2 done）

- [ ] `start-dev-full.ps1` 默认调用 `sync-dev-wanding-vendor.ps1`（`-SkipVendorSync` 可跳过）
- [ ] 改 `python/admin/org_price_client.py` 后 **仅** `start-dev-full -SkipBootstrap`，live vendor 文件 mtime/hash 与 repo 一致
- [ ] `-SkipVendorSync` 不跑 robocopy（可用日志或 mtime 验证）
- [ ] `dev-sync-playbook.md` Rule 0 链与脚本一致
- [ ] `backlog.md` INT-P0-2 → closed
- [ ] （可选）`sync-dev-wanding-vendor.ps1 -Smoke` 在 CI/手动 checklist 保留，非每次 dev 默认

---

## Risks & open questions

| 风险 | 缓解 |
|------|------|
| 覆盖 `vendor\` 上本地实验性手改 | vendor 是 deploy 目标，非编辑面；文档强调只改 repo |
| `mcp_servers/quotation-server/dist` 未 build 则 robocopy 旧 dist | playbook 保留「改 TS 先 build quotation-server」；可选 preflight 检查 repo dist mtime |
| 每次 sync 增加启动延迟 | `-SkipVendorSync`；后续可做 E（mtime gate） |
| `dataFiles` 白名单漏新文件 | dev sync 硬编码 5 文件；`build-wanding.ps1` 同步全部 `data\*.xlsx` + `*.md`（denylist 除外）— Phase 2.1 可对齐 | 与 `wanding-packaging-whitelist.md` §5.4 联动 |
| MCP 子进程不热加载 | 文档保留「新会话」；vendor sync 后杀 aioncore（start-dev-full 已 kill stale） |

**Open questions:**

1. 是否在 preflight **之前**做轻量 fingerprint compare，漂移时打印醒目 warn（即使即将 sync）？
2. `-UpdateSettings` 是否应跟 `-SkipBootstrap` 绑定（去掉 LEGACY_PRICE_LIBRARY_PATH）？
3. Phase 2 是否同时修 `verify-installer.ps1`（Phase 3）还是严格拆分？

---

## 与 Phase 1 / Step 1 关系

- Phase 1 已对齐 route-b 文档与 dev 入口；**未**解决 vendor 链。
- Step 1 审查 INT-P0-2 仍为 open；本探索为 Phase 2 实现的前置 artifact。
- 实现需**退出 explore**，按本稿 sketch 改 `start-dev-full.ps1` + spec。

---

## Next step

**退出 explore → Agent 模式** 实现 Option C，或先 user 确认 `-VendorSmoke` / `-UpdateSettings` 默认值。
