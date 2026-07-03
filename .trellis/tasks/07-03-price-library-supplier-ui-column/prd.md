# 价格库 UI — 第 42 列 supplier

## Goal

`#/price-library` 只读表格展示 org API 返回的 `supplier` 字段（migration 018 / v3+），与 xlsx 42 列对齐。

## 背景

- VPS v3 已 publish，294 行含 supplier
- API / quotation MCP 已有 supplier
- AionUI `PRICE_LIBRARY_COLUMNS` 仅 41 列，缺 `supplier`

## 验收

- [x] `PriceProductFields` 含 `supplier?: string | null`
- [x] `PRICE_LIBRARY_COLUMNS` 在 `volume` 与 `raw_json` 之间增加 supplier（共 42 列）
- [x] zh-CN / en-US i18n：`priceLibrary.column.supplier`
- [x] 搜索可匹配 supplier 文本
- [x] UI 手动：显示「42 列」；物料 `8010012697` 行可见 supplier（2026-07-02 用户确认）
- [x] `bun test tests/unit/priceLibrary/` — 7 pass

## 完成记录（2026-07-02）

- Task：`07-03-price-library-supplier-ui-column` — **completed**
- 父任务：`07-01-price-library-admin-agent`（P-1 后续 UX 收口）
- Spec：`.trellis/spec/integration/price-library.md` § AionUI + changelog

## 范围外

- price_admin 编辑 UI
- 其他 locale 全量 42 列翻译（fallback en-US 即可）

## Canonical files（aionui-src）

- `packages/desktop/src/common/types/priceLibrary/priceLibraryTypes.ts`
- `packages/desktop/src/renderer/services/i18n/locales/zh-CN/priceLibrary.json`
- `packages/desktop/src/renderer/services/i18n/locales/en-US/priceLibrary.json`
- `packages/desktop/src/renderer/pages/priceLibrary/filterProducts.ts`
