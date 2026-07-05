# ui-smoke memory sider — 2026-07-06 (automated portion)

| Field | Value |
|-------|--------|
| Phase | P6 |
| Automated | `bunx vitest run tests/unit/ccbMemoryFiles.test.ts` — **4/4 PASS** (path jail, list, read/write, empty business) |
| Manual | OPEN — restart AionUI with aionui-src; click 记忆 |

## Manual checklist

- [ ] Sider shows 记忆 between 知识库 and 价格库 (CCB authority)
- [ ] Personal lists profile.md / workflow.md
- [ ] Edit + save persists on disk
- [ ] Business empty state when no business files
- [ ] Stop auto-learn still works; refresh shows new lines
