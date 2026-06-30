# Phase 2 Optimization Review — Vendor Sync Gate

> Task: `06-30-full-system-review` · subtask: `integration-fix-vendor-gate`（已实现 Option C）  
> 日期: 2026-06-30 · 方法: system-reviewer 只读复审（Phase 2 实现后）  
> 前置: [`phase-02-vendor-sync-exploration.md`](./phase-02-vendor-sync-exploration.md)、[`delivery-phase-02-integration-vendor.md`](../delivery-phase-02-integration-vendor.md)

---

## Verdict

**Structure clarity: 7.5/10** — Option C 实现正确、编排清晰；主要缺口在 `sync-dev-wanding-vendor.ps1` 内部语义（fingerprints 不 fail、data 白名单偏窄），而非 `start-dev-full.ps1` 的 vendor 块本身。

---

## Current structure (post Phase 2)

```text
start-dev-full.ps1 (~226 行)
  preflight (L63–97)      ← 只检查存在，不比对 repo
  bootstrap (L118–127)    ← -SkipBootstrap
  route-b sync (L129–133)
  vendor sync (L135–150)  ← Phase 2 ★
  warm mcp copy (L152–158)
  aioncore sync (L160–166)← -BuildAioncore
  SSO env → bun run dev
```

Vendor 块与 route-b / aioncore 同一模式：`@vendorArgs` 透传 → 调用子脚本 → `LASTEXITCODE` throw。

证据: `ccb-installer/scripts/start-dev-full.ps1` L135–150。

---

## What's clear / well-structured

| 点 | 说明 |
|----|------|
| 编排位置 | route-b → vendor → aioncore，符合七层链 ④→⑥ |
| 参数语义 | `SkipBootstrap` / `SkipVendorSync` 均为「默认做、显式跳过」 |
| 失败处理 | 与 route-b、aioncore 一致 throw on non-zero |
| 职责分离 | 同步逻辑在 `sync-dev-wanding-vendor.ps1`，launcher 只做编排 |
| Spec 对齐 | `dev-sync-playbook.md` Rule 0 + §4.6 与实现一致 |

---

## Gaps found

### 1. Fingerprints 只打印、不 fail

`sync-dev-wanding-vendor.ps1` L116–127：Red 指纹仍 exit 0 → 同步后可能仍 stale 但启动继续。

### 2. Dev data 白名单 ≠ ship

| 文件 | dev sync (5 files) | build-wanding |
|------|-------------------|---------------|
| price_library_cleaned | ✓ | ✓ required |
| mapping_table | ✓ optional | ✓ optional |
| wanding_business_knowledge | ✓ | ✓ required |
| ccb-wanding-quotation | ✓ | ✓ required |
| ccb-wanding-claude-index | ✓ | ✓ required |
| **wanding_price_lib.xlsx** | ✗ | ✓ required |
| **ccb-wanding-accurate.md** | ✗ | ✓ required |
| **data.Md** | ✗ | ✓ required |
| **blank template xlsx** | ✗ | ✓ required |

证据: `sync-dev-wanding-vendor.ps1` L61–67 vs `build-wanding.ps1` L326–341、L531–544（ship 用 md denylist + 全量 `*.xlsx` glob，dev 用硬编码 5 文件）。

**Subagent 评级 P0（Phase 2.1 内）** — 可 pass sync + HDPE smoke 但仍缺 tier-contract / accurate-agent / fill-template →「synced but wrong」。

### 3. Python robocopy 与 ship 不一致

`build-wanding.ps1` L523–525 排除 `/XD tools`；`sync-dev-wanding-vendor.ps1` L56–59 未排除。dev 用 `/E` 非 `/MIR`，repo 删除的文件可能残留在 vendor。

### 4. 无效参数组合无 warn

`-SkipVendorSync` + `-VendorSmoke` / `-VendorUpdateSettings` 时 smoke/settings 不会执行，无提示。

### 5. ensure-wanding-settings 未检 exit code

`sync-dev-wanding-vendor.ps1` L85–90 调用后无 `LASTEXITCODE` 检查。

### 6. Preflight 在 sync 之前（chicken-and-egg）

`start-dev-full.ps1` L88–95 断言 live vendor 路径存在，发生在 L135 vendor sync 之前 — 全新/残缺 install 可能在 sync 能修复前就 fail preflight。

### 7. Fingerprints 弱验证

size + mtime ±2s（L120），非 hash；无 quotation MCP dist 指纹 — dist 漂移不可见。

### 8. 重复 LASTEXITCODE / robocopy 模式

`start-dev-full.ps1` 中 bootstrap / route-b / vendor / aioncore 四处相同检查 — 可抽 helper，非必须。

`sync-dev-wanding-vendor.ps1`、`build-wanding.ps1` L137–168、`build-wanding-lib.ps1` 三处 robocopy 实现重复。

### 9. Spec 残余缺口（post-Phase 2 doc）

| 文件 | 缺口 |
|------|------|
| `outline.md` | 无 `-SkipVendorSync` |
| `frontend/dev-test-ship.md` | 无 vendor-sync 症状 / skip flag 指引 |
| `dev-sync-playbook.md` §4.3 | 手动 robocopy 列表缺 ship 必需文件 |
| `dev-sync-playbook.md` §4.5 | 仍引用 retired work-tasks launcher |

### 10. 交付验收仍 open

`delivery-phase-02-integration-vendor.md` L26–27：人工 mtime + Guid 会话 smoke 未勾选。

---

## Optimization candidates

| 优先级 | ID | 项 | 文件 | 工作量 | 收益 |
|--------|-----|-----|------|--------|------|
| **P0†** | INT-P1-7 | dev data 对齐 build glob（md denylist + 全 xlsx） | `sync-dev-wanding-vendor.ps1`; ref `build-wanding.ps1` L531–544 | 低–中 | 消除 dev/ship data 漂移；新 SOP md 自动 sync |
| P1 | INT-P1-6 | `-Strict` fingerprints + `-VendorStrict` 透传 | `sync-dev-wanding-vendor.ps1`; `start-dev-full.ps1` | 低 | 同步后 Red 应 exit 1 |
| P1 | INT-P1-8 | Spec 症状/入口补全（outline、dev-test-ship、playbook §4.3/4.5） | spec 仅 doc | 低 | 关闭 doc 残余缺口 |
| P2 | INT-P2-4 | Warn `-SkipVendorSync` + `-VendorSmoke`/`-VendorUpdateSettings` | `start-dev-full.ps1` | 极低 | 避免无效参数 |
| P2 | INT-P2-3 | Option E: drift-only skip robocopy | `sync-dev-wanding-vendor.ps1` | 中 | 日常启动省数秒 |
| P2 | INT-P2-7 | Python robocopy `/XD tools` 与 ship 对齐 | `sync-dev-wanding-vendor.ps1` | 低 | 减少 vendor 孤儿文件 |
| P2 | INT-P2-5 | `ensure-wanding-settings` exit 检查 | `sync-dev-wanding-vendor.ps1` | 极低 | settings 失败不静默 |
| P2 | INT-P2-8 | Vendor sync 写入 `dev-full-bootstrap.log` | `start-dev-full.ps1` | 极低 | 链失败 post-mortem |
| P3 | INT-P2-6 | `Invoke-ChildScript` helper | `start-dev-full.ps1` | 低 | 减重复 |
| P3 | INT-P2-9 | Preflight vs sync 顺序（warn-only 或 sync-then-assert） | `start-dev-full.ps1` | 低 | 残缺 install 可自愈 |
| P3 | — | 共享 robocopy/fingerprint 模块 | `ccb-installer/scripts/lib/` | 中 | 三处 robocopy 去重 |
| P3 | — | 编排自动化测试 | `tests/` | 中 | INT-P0-2 回归 guard |

† P0 为 Phase 2.1 子域最高优先，非全项目 P0。

---

## Recommended Phase 2.1 mini-roadmap

1. **Data whitelist parity** — 移植 `build-wanding.ps1` L531–544（md denylist + 全 xlsx）；更新 playbook §4.3
2. **`-Strict`** + 可选 `-VendorStrict` 透传
3. **Invalid flag combo guard** — `SkipVendorSync` + smoke/settings → warn
4. **Option E (lightweight)** — 4 指纹 drift 检查；全绿则 skip robocopy
5. **Spec closure** — outline / dev-test-ship 症状行 + playbook 清理

---

## Do NOT change now vs worth doing

| 现在不动（Phase 2 已够用） | 值得做（Phase 2.1） |
|---------------------------|---------------------|
| 默认全量 robocopy（数秒可接受） | `-Strict` fingerprints |
| 不抽 vendor 子脚本（15 行） | data 白名单补齐 |
| 不共享 robocopy 模块 | Option E mtime 门控 |
| preflight 仍只查存在 | 无效参数组合 warn |
| Phase 3（verify-installer、integration-smoke） | ensure-wanding-settings exit 检查 |

---

## 参数命名备注

- `SkipBootstrap` / `SkipVendorSync` — 一致 ✓
- `VendorSmoke` / `VendorUpdateSettings` — 正向 opt-in，仅 sync 路径生效 ✓
- `BuildAioncore` 为 bool，vendor 为 switch — 风格略混，可接受

---

## 关联

- 探索（Option C 决策）: [`phase-02-vendor-sync-exploration.md`](./phase-02-vendor-sync-exploration.md)
- 交付: [`delivery-phase-02-integration-vendor.md`](../delivery-phase-02-integration-vendor.md)
- Backlog: [`backlog.md`](../backlog.md) § Integration Phase 2.1
