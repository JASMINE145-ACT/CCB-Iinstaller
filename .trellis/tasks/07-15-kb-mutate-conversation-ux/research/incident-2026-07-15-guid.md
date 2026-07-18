# Research — Guid KB mutate conversation incident 2026-07-15

## Source

User Guid dialogue with quotation-agent（append `test` → delete blocked）+ explore of gate/L1/UI.

## Findings

1. **Interrupt ≠ only ACP crash** — product spine forces a stop after preview; users feel「中断」when (a) preview reply thin, (b) rejection of soft confirm, (c) delete re-asks after user already said 删除.
2. **Confirm vocab** — L1 hardcodes 「确认/同意」 for append; rejects `ok`. Delete has weaker text and agent over-asks.
3. **FORBIDDEN on admin** — expected under MVP: `can_apply_knowledge_delete` ignores JWT; only env / `*_test`. Spec promised `is_admin` earlier → trust bug.
4. **Parity hole** — UI `#/org-knowledge` PUT has no MCP delete gate; append MCP open, delete MCP locked. Doctrine: UI chrome may differ; write ACL must converge.
5. **Prod pollution** — easy append + hard delete encourages orphan junk (`f32f0e87002f`) until UI cleanup.

## Recommendation

New task `07-15-kb-mutate-conversation-ux`（not stretch parent MVP closure）. Ship CONFIRM vocab + delete synthesis + real JWT RBAC before claiming Guid delete works for admins.
