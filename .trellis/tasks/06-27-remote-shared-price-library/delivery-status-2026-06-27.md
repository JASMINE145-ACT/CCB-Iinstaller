# Org API parity + price library — delivery status (2026-06-27)

## Milestone summary

| Area | Result |
|------|--------|
| AionCore router | `work_tasks` + `org_knowledge` + `price_library` merged in `aionui-app` |
| Local dev | `start-dev-full.ps1` + `sync-dev-aioncore` 3-route smoke **401** |
| VPS `67.216.206.3:13401` | `cargo build --release -p aionui-app` ~18 min → 3-route smoke **401** |
| AionUI org knowledge | Error state (not infinite spin); org HTTP IPC |
| AionUI price library | Read-only `#/price-library` MVP |
| Deploy script | `deploy-org-aioncore-vps.ps1` extract `&&` + grep gate |

---

## Task gap matrix

| Task | Status | Gap / next |
|------|--------|------------|
| `06-11-org-knowledge-aioncore` | completed | None for core feature; VPS rewire was ops follow-up (done) |
| `06-19-org-knowledge-vps-deploy` | completed | **Pending ops:** ufw restrict 13401; formal employee E2E sign-off doc |
| `06-15-aionui-work-tasks` | completed | Notes stale (old dev script); local `/tasks` needs employee smoke after dev restart |
| `06-27-remote-shared-price-library` | **in_progress** | See PR breakdown below |
| `06-26-aionui-source-level-recovery` | open | Phase 4 cold build NSIS; aionui-src commits pending |

---

## `06-27-remote-shared-price-library` PR progress

| PR | Scope | Status |
|----|--------|--------|
| PR0 | Canonical xlsx path + spec stubs | Partial — `wanding-first-ship.md` amended; full smoke path normalization TBD |
| PR1 | AionCore crate + VPS routes | **Done** — smoke 401 |
| PR2 | Import / publish / history / admin APIs | Backend largely in crate; **VPS import/publish ops** may be undone |
| PR3 | `org_price_client` + LKG + quotation pinning | **Not started** — quotation still uses local Excel authority |
| PR4 | AionUI Price Library UI | **Read-only MVP done**; draft/edit/import/publish UI **not done** |
| PR5 | Fleet rollout + multi-client publish smoke | **Not started** |

### PRD acceptance (high level)

- **Done:** org JWT price read API; read-only AionUI table; VPS route smoke; `price_admin` env contract documented
- **Open:** all draft/publish/import acceptance items; outage/LKG/bootstrap quotation; multi-client publish; Playwright `base: 'org'` for price library
- **Spec DoD from PRD:** several listed specs still need PR3/PR5 depth (`internal-update.md` NSIS checklist entry, full `wanding-packaging-whitelist` gate wording)

---

## Recommended next actions (priority)

**最小目标（共享远端查价 + publish 共同更新）：** 见 [`scripts/org-phase0/minimal-shared-price-closure.md`](../../../scripts/org-phase0/minimal-shared-price-closure.md)

1. **VPS publish** — `import_ready` → import/apply → publish（用户 SSH）
2. **Employee desktop** — `sync-dev-wanding-vendor` + `start-dev-full` → `#/price-library` + 新会话报价
3. **Commit** — `AionCore/` + `aionui-src/` wiring (nested repos)
4. **Later** — admin UI、quotation stale 落盘、PR0 legacy smoke

---

## Spec updated (2026-06-27)

- `.trellis/spec/integration/price-library.md` (new)
- `.trellis/spec/integration/org-knowledge.md` — VPS rewire status
- `.trellis/spec/integration/aioncore-work-tasks.md` — router rewire
- `.trellis/spec/integration/dev-sync-playbook.md` — VPS verified
- `.trellis/spec/integration/index.md` — price-library + VPS checklist links
- `scripts/org-phase0/vps-org-api-deploy-checklist.md` — extract gate + verified banner
- `scripts/deploy-org-aioncore-vps.ps1` — extract bugfix
