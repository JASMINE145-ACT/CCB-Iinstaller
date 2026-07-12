# Done — Org Knowledge History Updater Display

> **Task:** `07-11-org-knowledge-history-updater-display`  
> **Closed:** 2026-07-11 (user smoke OK)

## Delivered

### Plan A — AionCore (claude-code-best)
- `OrgKnowledgeRevisionResponse` / `OrgKnowledgeDocResponse`: optional `updated_by: PublicUser`
- `OrgKnowledgeService`: inject `IUserRepository`, `build_user_lookup()` on all read/mutation paths
- `build_org_knowledge_state`: pass `user_repo`

### Plan A+ — aionui fallback (org VPS not yet on new AionCore)
- `getOrgKnowledgeUpdaterLabel` + `useOrgKnowledgeUserLabelLookup` (`GET /api/users` when `updated_by` missing)
- Legacy map: `system_default_user` → `admin`
- i18n `unknownUser` zh/en

## Verification

| Gate | Result |
|------|--------|
| `cargo test -p aionui-api-types org_knowledge` | 2 PASS |
| `cargo test -p aionui-org-knowledge` | 6 PASS |
| `bun test orgKnowledgeDisplay.test.ts` | 7 PASS |
| code-reviewer ×2 | PASS (Layer A N/A · Layer B PASS) |
| Manual smoke | **PASS** — 第11版「更新人：admin」 |

## Deferred

- VPS AionCore deploy (API enrichment on `67.216.206.3:13401`) — frontend fallback covers until then
- Plan B denormalize `updated_by_username` on revision row
