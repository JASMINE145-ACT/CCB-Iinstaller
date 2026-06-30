# Integration Phase 2 — Vendor Sync Gate 交付（2026-06-30）

> Task: `06-30-full-system-review` · subtask: `integration-fix-vendor-gate` · INT-P0-2  
> 方案: **Option C** — 默认 vendor sync + `-SkipVendorSync`

## 变更

| 文件 | 内容 |
|------|------|
| `ccb-installer/scripts/start-dev-full.ps1` | route-b 之后调用 `sync-dev-wanding-vendor.ps1`；新增 `-SkipVendorSync`、`-VendorSmoke`、`-VendorUpdateSettings` |
| `integration/dev-sync-playbook.md` | Rule 0 链、§4.6、禁止表 |
| `integration/dev-runtime-layers.md` | §9 快捷命令 |

## 行为

```text
preflight → bootstrap? → route-b → 【vendor sync 默认】 → warm → aioncore → SSO → dev
                              ↑
                    -SkipVendorSync 跳过
```

## 验收

- [x] 默认路径调用 `sync-dev-wanding-vendor.ps1`
- [x] `-SkipVendorSync` 跳过并打印 yellow warn
- [x] 失败时 throw（与 route-b/aioncore 一致）
- [ ] 人工：改 `python/` 后 `start-dev-full -SkipBootstrap` → live vendor mtime 更新
- [ ] 人工：新 Guid 会话验证报价行为

## 未包含（→ Phase 2.1 / 3）

详见 [`reviews/phase-02-vendor-sync-optimization-review.md`](./reviews/phase-02-vendor-sync-optimization-review.md) 与 [`backlog.md`](./backlog.md) § Integration Phase 2.1。

- `-Strict` fingerprints fail-closed（INT-P1-6）
- dev data 白名单与 `build-wanding.ps1` 全量对齐（INT-P1-7）
- Option E mtime 门控 skip（INT-P2-3）
- `verify-installer.ps1`（Phase 3 / INT-P1-2）
