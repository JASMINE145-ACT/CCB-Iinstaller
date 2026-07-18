# Smoke evidence — `07-15-kb-mutate-conversation-ux`

| Field | Value |
|-------|--------|
| Date | 2026-07-15 |
| Unit | `PYTHONPATH=python python -m unittest admin.test_org_knowledge_mutate` → **17/17 OK** |
| code-reviewer | round1 PASS+Important → fixed → round2 **PASS** ([re-review](0a37d713-119d-48ca-b9c7-2cd88a7cb05f)) |
| Deploy | `deploy-seed-agents.ps1 -ForceMd` + vendor python/MCP synced |

## Automated / substituted

| Check | Result |
|-------|--------|
| Prod slug + empty claims → FORBIDDEN 中文 | unit |
| Prod slug + is_admin → apply | unit |
| Prod slug + org_knowledge.write → apply | unit |
| /api/auth/user 403 → FORBIDDEN not raise | unit |
| CONFIRM vocab L1 | deployed to live agents (ForceMd) |

## Manual Guid（user）

- [ ] 新 Guid 报价专家：append preview → 回 `ok` → apply（优先 test slug）
- [ ] delete preview → 回 `删除` → admin 可 apply；非 admin 见中文 FORBIDDEN
- [ ] 清理生产残留 `test` / `f32f0e87002f`（admin 会话或 `#/org-knowledge`）

**Note:** MCP subprocess caches modules — **新对话** after vendor sync.
