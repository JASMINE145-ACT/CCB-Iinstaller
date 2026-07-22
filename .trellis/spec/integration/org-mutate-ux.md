# Org Mutate UX — unified org write protocol

> **Contract:** `WANd.ORG.MUTATE.UX.001`  
> **Related:** `WANd.ORG.MUTATE.CONFIRM.001` · `WANd.ORG.MUTATE.PARITY.001` · `WANd.KB.MCP.DELETE.001`  
> **Family:** price-library · business knowledge · supplier-directory  
> **First implementer (2026-07-14):** knowledge domain (`append_business_rule` / `delete_business_rule`)  
> **Conversation UX (2026-07-15):** confirm vocab + delete same-turn preview + JWT admin gate — task `07-15-kb-mutate-conversation-ux`

## Spine

```text
preview (confirmed=false) → user confirm → apply (confirmed=true)
  → audit / revision history → shadow or cache sync
```

Precipitation / Inbox may only emit an **Org Mutate Proposal**; they do **not** own write rights. Apply still goes through the same confirmed MCP tools (`WANd.LEARNING.PROMOTION.001`).

**UI may differ** (Save button vs chat confirm) — **business gates must not**: envelope `error_code`, delete apply RBAC, locator, append budget (`WANd.ORG.MUTATE.PARITY.001`).

## Confirm vocabulary (`WANd.ORG.MUTATE.CONFIRM.001`)

| Accept (one round → apply) | Reject / re-preview |
|----------------------------|---------------------|
| `确认` `同意` `落库` `确认写入` `确认删除` | 改文案 / 取消 / 换 slug |
| `删除` (only while delete preview pending) | 含糊「看着办」 |
| `ok` `OK` `好的` `可以` `是` `执行` | |

Agents must not reject `ok`/`好的` and re-ask. Preview + same-turn synthesis is mandatory for **append and delete**.

## Envelope (canonical)

Every knowledge mutate tool returns at least:

| Field | Meaning |
|-------|---------|
| `action` | `append` \| `update` \| `delete` \| `restore` \| `publish` \| `revert` |
| `domain` | `knowledge` \| `price` \| `supplier` |
| `requires_confirmation` | true on preview |
| `applied` | false until successful mutate |
| `target` | locator / slug / ids |
| `changes` | structured diffs or candidate list |
| `preview_before` / `preview_after` | human-readable |
| `version` | e.g. `{ doc_version }` / revision |
| `error_code` | see below or `null` |

### Compatible aliases (do not hard-cut peers)

| Domain | Keep working | Map toward |
|--------|--------------|------------|
| Knowledge (legacy) | `rule_text`, `section`, `message` | envelope fields above |
| Price | existing preview `diff` / `requires_confirmation` | progressive alias |
| Supplier | `changes[]` / `applied` | already close |

## error_code

| Code | When |
|------|------|
| `AUTH_REQUIRED` | 401 / missing org JWT |
| `FORBIDDEN` | 403 RBAC / CSRF-as-authz / delete apply without gate |
| `CONFLICT` | 409 version / revision |
| `AMBIGUOUS_MATCH` | delete locator matched >1 block |
| `LIMIT_EXCEEDED` | rule_text over hard cap (no silent truncate) |
| `NEAR_DUPLICATE` | highly similar append blocked pending explicit force |

## Knowledge delete (`WANd.KB.MCP.DELETE.001`)

- Remove Markdown **block** only; org **revision history** retained (UI/REST revert).
- Locator: `block_id` **or** (`content_hash` + `snippet`). Optional `doc_version` → `CONFLICT` if mismatched. Not snippet-only / contains-only.
- Apply RBAC (any one):
  1. slug is `wanding_business_knowledge_test` (or `*_test`)
  2. env `ORG_KNOWLEDGE_MCP_DELETE=1` / `ORG_KNOWLEDGE_DELETE_IS_ADMIN=1`
  3. **session** `is_admin` from `GET /api/auth/user` (JWT alone has no admin claim — DB-backed)
  4. capability `org_knowledge.write` on that user
- Else preview OK, apply → `FORBIDDEN` with **Chinese** recovery message (UI / admin / test slug).

## Knowledge append budget (`WANd.KB.MCP.APPEND_BUDGET.001`)

1. Hard cap → `LIMIT_EXCEEDED`  
2. L1 forbids splitting one semantic rule into multiple appends  
3. Near-duplicate → `NEAR_DUPLICATE` (see task research)

## Parity — UI vs MCP (`WANd.ORG.MUTATE.PARITY.001`)

| Concern | MCP (Guid / quotation) | UI `#/org-knowledge` | Must match? |
|---------|------------------------|----------------------|-------------|
| Preview envelope | yes (`confirmed=`) | Save UI (no chat envelope) | No — **UI chrome may differ** |
| Append/delete locator + budget | MCP enforced | full-doc editor | Append/delete via MCP keeps MCP rules |
| Delete apply RBAC | gate above | currently any org JWT can PUT full doc | **Business intent:** privileged writers for shared KB; UI ACL tightening is follow-up if REST still open |
| Audit / history | org version++ | same REST history | Yes |
| Shadow sync after write | invalidate hook | save/WS/login sync | Yes |

Doctrine: **UI 可差异，业务已配置逻辑必须复刻** — document gaps; converge RBAC when product hardens REST.

## Related

- [`org-knowledge.md`](./org-knowledge.md)  
- [`price-library.md`](./price-library.md)  
- [`supplier-directory.md`](./supplier-directory.md)  
- Registry: `contracts/agent-runtime-registry.yml`
- Tasks: `07-14-kb-business-completeness` · `07-15-kb-mutate-conversation-ux`
