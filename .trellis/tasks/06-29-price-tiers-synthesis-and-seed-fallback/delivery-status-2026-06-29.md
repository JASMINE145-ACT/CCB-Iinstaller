# 06-29 price tiers — deploy closure

**Date:** 2026-06-29  
**Task:** [`06-29-price-tiers-synthesis-and-seed-fallback`](./prd.md)  
**Machine:** JASMINE145-ACT (local dev)

## Deploy commands run

| Command | Result |
|---------|--------|
| `sync-dev-wanding-vendor.ps1 -RepoRoot d:\Projects\claude-code-best` | OK — python `price_tiers.py`, `org_price_client.py` synced to `D:\CCB-Wanding\vendor\wanding\python` |
| `deploy-subagent-gate-skill.ps1` | OK → `%LOCALAPPDATA%\CCB-Wanding\.claude\skills\ccb-subagent-gate\` |
| `deploy-seed-agents.ps1 -ForceMd` | OK — `quotation-agent.md` forced overwrite |

## Live verify

| Check | Pass |
|-------|------|
| `quotation-agent.md` frontmatter `PostToolUse` (match + tiers matchers) | ✅ |
| `post-price-tiers-nudge.py` on disk under ccb-subagent-gate | ✅ |
| `post-match-knowledge-nudge.py` on disk | ✅ (pre-existing) |

## Unit tests (pre-deploy)

| Suite | Result |
|-------|--------|
| `tests.test_price_tiers` | 7/7 OK |
| `test_knowledge_read_gate.py` | 10/10 OK |

## User E2E (pending)

1. Restart AionUI dev (`start-dev-full.ps1` or equivalent)
2. Open **new** 万鼎报价专家 session (L1 + hooks reload)
3. Ask:「8020020755 全部价格」
4. Expect: Read `data.Md` + markdown tier table; `price_source=org_api` if org logged in; **no**「你最后一条消息没有内容」

## Spec pointers

- `.trellis/spec/integration/price-library.md` — § Multi-tier, Org JWT, Recorded 2026-06-29
- `.trellis/spec/integration/agents-unified-model.md` — PostToolUse rows + deploy verify
