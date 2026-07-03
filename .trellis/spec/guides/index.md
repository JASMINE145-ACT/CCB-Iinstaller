# Thinking Guides

> **Purpose**: Expand your thinking to catch things you might not have considered.

---

## Why Thinking Guides?

**Most bugs and tech debt come from "didn't think of that"**, not from lack of skill:

- Didn't think about what happens at layer boundaries → cross-layer bugs
- Didn't think about code patterns repeating → duplicated code everywhere
- Didn't think about edge cases → runtime errors
- Didn't think about future maintainers → unreadable code

These guides help you **ask the right questions before coding**.

---

## Layer entry docs (read before coding)

| Layer | Entry |
|-------|-------|
| CCB-Wanding backend (ACP, MCP, build) | [`../backend/index.md`](../backend/index.md) |
| AionUI frontend (renderer, IPC) | [`../frontend/index.md`](../frontend/index.md) |
| Integration boundary (route-b, sync) | [`../integration/index.md`](../integration/index.md) |
| Project strategy (Rule 0) | [`../outline.md`](../outline.md) — architecture + Primary strategy |

---

## Available Guides

| Guide | Purpose | When to Use |
|-------|---------|-------------|
| [**Mixing Meta-Repo & Source Recovery**](./mixing-meta-repo.md) | 三仓结构、git 快照、日常启动、push GitHub、org-server BOM | **clone 完整项目 / 恢复后 push / 新同事 onboarding** |
| [**WanD 更新发布维护手册**](./wanding-update-runbook.md) | 热更/全量发版、VPS 上传、回滚、排查 | **每次给员工推送更新时** |
| [WanD Build Path Decision](./wanding-build-path-decision.md) | Full NSIS vs hot zip vs incremental NSIS | **Before every WanD pack / ship** |
| [WanD Release Standard](../integration/wanding-release-standard.md) | 四层链验收、NSIS/热更双矩阵、防漏包 | **After build, before fleet push** |
| [Code Reuse Thinking Guide](./code-reuse-thinking-guide.md) | Identify patterns and reduce duplication | When you notice repeated patterns |
| [Cross-Layer Thinking Guide](./cross-layer-thinking-guide.md) | Think through data flow across layers | Features spanning multiple layers |

---

## Quick Reference: Thinking Triggers

### When to Think About Cross-Layer Issues

- [ ] Feature touches 3+ layers (API, Service, Component, Database)
- [ ] Data format changes between layers
- [ ] Multiple consumers need the same data
- [ ] You're not sure where to put some logic

→ Read [Cross-Layer Thinking Guide](./cross-layer-thinking-guide.md)

### When to Think About Repo / Recovery Layout

- [ ] New teammate needs full product clone
- [ ] `aionui-src` has uncommitted CCB files
- [ ] Unsure whether to use bundled vs dev UI
- [ ] Mixing login fails with「连接失败」

→ Read [Mixing Meta-Repo & Source Recovery](./mixing-meta-repo.md)

### When to Think About WanD Packaging

- [ ] About to run `build-wanding.ps1` or `build-wanding-hot.ps1`
- [ ] Unsure if colleagues need full NSIS or hot zip
- [ ] Install dir missing `AionUi\` or `vendor\bun`
- [ ] Changed `aionui-src` since last full pack

→ Read [WanD Build Path Decision](./wanding-build-path-decision.md) · contract: [`wanding-first-ship.md`](../integration/wanding-first-ship.md) §5.2.1

### When to Think About Code Reuse

- [ ] You're writing similar code to something that exists
- [ ] You see the same pattern repeated 3+ times
- [ ] You're adding a new field to multiple places
- [ ] **You're modifying any constant or config**
- [ ] **You're creating a new utility/helper function** ← Search first!

→ Read [Code Reuse Thinking Guide](./code-reuse-thinking-guide.md)

---

## Pre-Modification Rule (CRITICAL)

> **Before changing ANY value, ALWAYS search first!**

```bash
# Search for the value you're about to change
grep -r "value_to_change" .
```

This single habit prevents most "forgot to update X" bugs.

---

## How to Use This Directory

1. **Before coding**: Skim the relevant thinking guide
2. **During coding**: If something feels repetitive or complex, check the guides
3. **After bugs**: Add new insights to the relevant guide (learn from mistakes)

---

## Contributing

Found a new "didn't think of that" moment? Add it to the relevant guide.

---

**Core Principle**: 30 minutes of thinking saves 3 hours of debugging.
