# 1.1.2 Baseline Inventory

Date: 2026-06-26

## Key Finding

`ccb-installer/staging/AionUi` matches the existing `D:/Projects/aionui-src/out/win-unpacked` build output for the core packaged application files checked below.

This means the current 1.1.2 AionUi runtime is not only recoverable from the NSIS installer. It already has a matching AionUi build output in the local `aionui-src` checkout.

## Hash Checks

| File | SHA256 |
| --- | --- |
| `ccb-installer/staging/AionUi/resources/app.asar` | `032783DA4A9DB0854905BB759B76287FFC16957A6A0558B2313ACB199BB2DFB6` |
| `D:/Projects/aionui-src/out/win-unpacked/resources/app.asar` | `032783DA4A9DB0854905BB759B76287FFC16957A6A0558B2313ACB199BB2DFB6` |
| `ccb-installer/staging/AionUi/AionUi.exe` | `0CD1CB3E1CBBBC7D07470697FE75377856812079078D7158ABC62AD65E937876` |
| `D:/Projects/aionui-src/out/win-unpacked/AionUi.exe` | `0CD1CB3E1CBBBC7D07470697FE75377856812079078D7158ABC62AD65E937876` |

## Source Checkout State

- `D:/Projects/aionui-src` exists.
- Current branch: `main`.
- Current HEAD: `f77c697`.
- `git status --short` reports 130 changed or untracked paths.
- The CCB/WanD AionUi integration appears mostly as untracked source files under `packages/desktop/src/common/config`, `packages/desktop/src/process/bridge`, `packages/desktop/src/renderer/pages/guid`, `packages/desktop/src/renderer/pages/orgKnowledge`, `packages/desktop/src/renderer/pages/workTasks`, and related tests.

## Risk

The runtime baseline is reproducible from a local build output, but not yet protected as source-level history. If the untracked `aionui-src` files are lost or overwritten, future source builds can regress back to a half-integrated AionUi even though `staging/AionUi` still runs.

## Do Not Delete Yet

Keep these until a clean rebuild from source is proven:

- `ccb-installer/staging/AionUi/`
- `D:/Projects/aionui-src/out/win-unpacked/`
- `D:/Projects/aionui-src/out/main/`
- `D:/Projects/aionui-src/out/preload/`
- `D:/Projects/aionui-src/out/renderer/`

These are generated artifacts, but they are currently the comparison oracle for 1.1.2.
