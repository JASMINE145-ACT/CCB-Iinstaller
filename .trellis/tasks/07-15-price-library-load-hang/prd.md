# PRD — 万鼎共享价格库页面打不开（无限转圈）

## Cancellation

**Cancelled 2026-07-15 by user:** 症状当时是**网络问题**，不是需修复的产品 hang。本 task 不做实现。

OpenSpec `fix-price-library-load-hang` 搁置不 apply；若日后真卡在稳定网络上，可再 reopen。

---

Admin opens **万鼎共享价格库**（Mixing `#/price-library`）后，标题栏与「价格管理员」标签正常，正文永久 `Spin`，刷新无效。无法浏览/编辑线上价库（用户侧约 3765 条）。

## Root cause (Phase 1 — confirmed 2026-07-15)

See `research/root-cause.md`.

- UI waits on unbounded `GET /api/price-library/active` (full `products[]`).
- Authenticated response **Content-Length ≈ 5.65 MB**; body download/IPC/parse stalls WebUI/exe; SWR has **no timeout** → infinite spinner.
- Not JWT/CSRF/CORS (those surface Alert).

## Goals

1. Documented, reproducible root-cause evidence (done in research).
2. P0: client timeout + error/Retry — never hang forever.
3. P1: scalable first paint (paged/slim API); keep full `/active` for MCP.

## Non-goals

Accurate dump / gap-fill; SSO redesign; LKG quotation pollution.

## Acceptance

- [ ] `#/price-library` shows table or timeout error within ≤30s
- [ ] With ≥3k products, first page usable within a few seconds (after P1)
- [ ] Quotation full `/active` consumers still work
- [ ] Spec triage updated in `price-library.md`

## Links

- OpenSpec: `openspec/changes/fix-price-library-load-hang/`
- Spec: `.trellis/spec/integration/price-library.md`
