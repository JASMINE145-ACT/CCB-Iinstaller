# Uncoded inventory map (CODE_MAP) — contract draft

> **Status:** Locked for MVP (2026-07-14 system-review harden). Implement under task `07-14-uncoded-inventory-ai-assist`.  
> **Contracts:** `WANd.INV.CODE_MAP.001` · `WANd.INV.PROCURE_ENROLL.001`

## Authority path (MVP)

| Role | Path |
|------|------|
| **Live install** | `{CCB_INSTALL}/vendor/wanding/data/uncoded_inventory_map.jsonl` |
| **Repo seed / template** | `data/uncoded_inventory_map.jsonl` (+ `.example` fixtures under task or `data/`) |
| **Schema note** | This doc + unit tests — not Org API until Phase 3 productization |

**Not MVP:** Org center table, price-library published row as sole map (ENRICH is separate, opt-in).

## Row schema (jsonl, one object per line)

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `alias_zh` | string | yes* | Chinese display / query alias |
| `alias_id` | string | no | Indonesian alias |
| `accurate_code` | string | yes when `confirmed=true` | Accurate item code |
| `confirmed` | bool | yes | `false` = AI draft / incomplete; `true` = usable for stock lookup |
| `source` | enum | yes | `rubi` \| `procure` \| `aol_search` \| `manual` \| `import` |
| `updated_at` | ISO8601 | yes | |
| `updated_by` | string | yes | actor / agent id / `ops` |
| `notes` | string | no | |

\* At least one of `alias_zh` / `alias_id` required.

## Resolve rules

1. Exact match on normalized `alias_zh` / `alias_id` (trim, case-fold ID latin).
2. Prefer `confirmed=true`; if only draft rows → return candidates, do **not** auto-pick for qty.
3. Ambiguous multi-code → must human-select (same as quotation multi-candidate).

## Write / permission (MVP)

| Operation | Who | Gate |
|-----------|-----|------|
| Import / AI draft append (`confirmed=false`) | ops script / agent | any quotation session with map tools |
| Confirm / enroll (`confirmed=true`) | agent after user provides code **or** user says 确认 | same-turn evidence |
| Edit code on confirmed row | agent | conflict if another confirmed row same alias different code → return `conflict` |
| Delete | ops only (v1) | out of agent |

**Forbidden:** auto `confirmed=true` without code from user/AOL selection; invent `accurate_code`.

## Structured evidence (AC8 / PROCURE_ENROLL)

Every enroll/lookup attempt returns (tool JSON or agent-visible block):

```json
{
  "status": "enrolled" | "missing_fields" | "conflict" | "resolved" | "not_found",
  "missing": ["accurate_code"],
  "row": { "alias_zh": "...", "accurate_code": "...", "confirmed": true },
  "map_path": "D:\\CCB-Wanding\\vendor\\wanding\\data\\uncoded_inventory_map.jsonl",
  "message_zh": "已写入映射" 
}
```

Agent **must not** end with bare「知道了」when `status=missing_fields`.

## Agent SOP (until Phase 3)

- Price miss + stock ask → `resolve` CODE_MAP → if code → `get_inventory_by_code`.
- **Do not call** `search_inventory` / `mcp__quotation__search_inventory` until NAME_SEARCH.001 wired.
- No map + no code → list missing fields / ask for Accurate code; optional hint「找 Rubi/印尼同事要编码」.

## Packaging

Ship empty or seed jsonl under wanding `data/`; bootstrap/deploy must not wipe confirmed rows (merge/append policy). Release whitelist follow-up when tools ship.
