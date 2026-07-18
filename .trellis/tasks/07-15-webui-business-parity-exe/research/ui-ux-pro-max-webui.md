# ui-ux-pro-max notes — WanD WebUI business parity (2026-07-15)

## Doctrine (from user)

- Visual/layout difference vs exe is **allowed**
- Do **not** invent a new marketing landing UI for this task
- Goal: same **business surfaces** reachable and usable on Safari / Chrome WebUI

## Design system snapshot (skill run)

Command:

```text
python .../ui-ux-pro-max/scripts/search.py "B2B AI assistant productivity agent chat knowledge base Chinese enterprise tool" --design-system -p "WanD WebUI" -f markdown
```

Applied constraints for this task:

| Area | Guidance |
|------|----------|
| Style | Keep Mixing shell; prefer Accessible & Ethical density over cosmetic redesign |
| Mobile Safari | Touch targets ≥44px; gap ≥8px between sider entries |
| Nav | Sticky/sider must not hide content; preserve browser back |
| Anti-pattern | Do not “fix missing nav” by restyling home; fix gates + data plane |

## Out of scope for UX workstream

- Rebrand Mixing → looking like Electron chrome
- Pixel-matching exe spacing/colors
- New fonts across the product (unless already Mixing tokens)

## In scope UX checks (manual smoke)

- Org DB group visible when org server configured
- Assistsants/Guid catalog matches exe identity labels (Layer A)
- Knowledge / price / suppliers pages usable on ≈375px width
